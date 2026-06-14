import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

export type VisitorCountry = "BE" | "NL" | "FR" | "DE" | "OTHER";

export const getVisitorCountry = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ country: VisitorCountry }> => {
    const cf = (getRequestHeader("cf-ipcountry") ?? "").toUpperCase();
    if (cf === "BE" || cf === "NL" || cf === "FR" || cf === "DE") {
      return { country: cf };
    }
    return { country: "OTHER" };
  },
);
