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

function maybeRedirect(request: Request): Response | null {
  const url = new URL(request.url);
  const target = PERMANENT_REDIRECTS[url.pathname];
  if (!target) return null;
  const [targetPath, targetHash] = target.split("#");
  const location = `${targetPath}${url.search}${targetHash ? `#${targetHash}` : ""}`;
  return new Response(null, { status: 301, headers: { Location: location } });
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const redirectResponse = maybeRedirect(request);
      if (redirectResponse) return redirectResponse;
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};
