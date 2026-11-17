import { describe, it, expect, vi } from "vitest";
import { langlessRedirectTarget } from "./lang-redirect";
import { fetchBranding } from "./shop-branding.server";

describe("langless order link", () => {
  it("redirects /order to the browser language and keeps shopID", () => {
    const u = new URL("https://velopass.com/order?shopID=tomsfrenchstoresoultzhautrhin7647");
    expect(langlessRedirectTarget(u, null, "nl-BE,nl;q=0.9")).toBe("/nl/order?shopID=tomsfrenchstoresoultzhautrhin7647");
  });
  it("ignores other paths", () => {
    expect(langlessRedirectTarget(new URL("https://velopass.com/nl/order"), null, "nl")).toBeNull();
  });
});

const resp = (status: number, body: unknown = null) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
describe("branding lookup", () => {
  it("200 returns name, city, logo", async () => {
    expect(await fetchBranding("x", "k", resp(200, { publicId: "x", name: "Tom's", city: "Soultz", logoUrl: "https://a/l.png" })))
      .toEqual({ name: "Tom's", city: "Soultz", logoUrl: "https://a/l.png" });
  });
  it("404 returns null", async () => { expect(await fetchBranding("x", "k", resp(404))).toBeNull(); });
  it("401 returns null", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await fetchBranding("x", "k", resp(401))).toBeNull();
  });
});
