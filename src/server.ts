import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => ((m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry)),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

// Permanent (301) redirects from old NL URLs to new EN URLs.
// Handled at the edge so search engines see a real HTTP 301.
const PERMANENT_REDIRECTS: Record<string, string> = {
  "/bestellen": "/order",
  "/bestellen/bedankt": "/order/thanks",
  "/gestolen": "/stolen",
  "/bikesearch": "/bike-check",
  "/fiets-controleren": "/bike-check",
  "/al-een-sticker": "/#already-have-one",
};

const SUPPORTED_DOCUMENT_LANGS = new Set(["en", "nl", "fr", "de"]);
const ROBOTS_TXT = "User-agent: *\nAllow: /\nSitemap: https://velopass.com/sitemap.xml\n";

function langFromRequest(request: Request): string {
  const pathname = new URL(request.url).pathname;
  const segment = pathname.match(/^\/([a-z]{2})(?:\/|$)/)?.[1];
  return segment && SUPPORTED_DOCUMENT_LANGS.has(segment) ? segment : "nl";
}

function maybeRobotsTxt(request: Request): Response | null {
  const url = new URL(request.url);
  if (url.pathname !== "/robots.txt") return null;

  return new Response(ROBOTS_TXT, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}

function withDocumentLang(html: string, lang: string): string {
  return html.replace(/<html\b([^>]*)>/i, (_match, attrs: string) => {
    if (/\slang=(['"]).*?\1/i.test(attrs)) {
      return `<html${attrs.replace(/\slang=(['"]).*?\1/i, ` lang="${lang}"`)}>`;
    }

    return `<html lang="${lang}"${attrs}>`;
  });
}

async function ensureDocumentLang(request: Request, response: Response): Promise<Response> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html")) return response;

  const html = await response.text();
  const headers = new Headers(response.headers);
  headers.delete("content-length");

  return new Response(withDocumentLang(html, langFromRequest(request)), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function maybeRedirect(request: Request): Response | null {
  const url = new URL(request.url);
  const target = PERMANENT_REDIRECTS[url.pathname];
  if (!target) return null;
  const [targetPath, targetHash] = target.split("#");
  const location = `${targetPath}${url.search}${targetHash ? `#${targetHash}` : ""}`;
  return new Response(null, { status: 301, headers: { Location: location } });
}

// TEMPORARY: interim scan→register redirect while AWS-level fix is pending (Daniël).
// Turn off TEMP_SCAN_REDIRECT_ENABLED once the CloudFront redirect is live and verified.
// Added 2026-06-23. Scanned stickers hit https://www.velopass.com/scan?code={code}
// (and the apex without www), which currently 404s. Forward to app.velopass.com/register.
const TEMP_SCAN_REDIRECT_ENABLED = true;

function maybeScanRedirect(request: Request): Response | null {
  if (!TEMP_SCAN_REDIRECT_ENABLED) return null;
  const url = new URL(request.url);
  if (url.pathname !== "/scan") return null;
  const code = url.searchParams.get("code")?.trim();
  const location = code
    ? `https://app.velopass.com/register?code=${encodeURIComponent(code)}`
    : "https://app.velopass.com/register";
  return new Response(null, { status: 302, headers: { Location: location, "cache-control": "no-store" } });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const robotsResponse = maybeRobotsTxt(request);
      if (robotsResponse) return robotsResponse;
      const scanRedirectResponse = maybeScanRedirect(request);
      if (scanRedirectResponse) return scanRedirectResponse;
      const redirectResponse = maybeRedirect(request);
      if (redirectResponse) return redirectResponse;

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalizedResponse = await normalizeCatastrophicSsrResponse(response);
      return await ensureDocumentLang(request, normalizedResponse);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};
