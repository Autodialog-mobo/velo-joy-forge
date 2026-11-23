import { describe, it, expect } from "vitest";
import { interpretCreateBikeShopResponse, isValidLocation, velopassCountry } from "./velopass-bikeshops";

describe("bike-shops push rules", () => {
  it("blocks a (0, 0) or missing location", () => {
    expect(isValidLocation({ lat: 0, lng: 0 })).toBe(false);
    expect(isValidLocation(null)).toBe(false);
    expect(isValidLocation({ lat: 51.2, lng: 3.22 })).toBe(true);
  });
  it("201 stores organisationId, publicId and proUserId", () => {
    expect(interpretCreateBikeShopResponse(201, { organisationId: "o1", publicId: "shop1", proUserId: "u1" }))
      .toEqual({ kind: "created", organisationId: "o1", publicId: "shop1", proUserId: "u1" });
  });
  it("409 organisation conflict reuses the existing ids", () => {
    const r = interpretCreateBikeShopResponse(409, { conflicts: [{ code: "bike-shops/vat-number-taken", organisationId: "o9", organisationPublicId: "p9" }] });
    expect(r).toMatchObject({ kind: "conflict", organisationId: "o9", organisationPublicId: "p9", userEmailTaken: false });
  });
  it("409 user-email-taken means the user exists", () => {
    const r = interpretCreateBikeShopResponse(409, { conflicts: [{ code: "bike-shops/user-email-taken" }] });
    expect(r).toMatchObject({ kind: "conflict", userEmailTaken: true, organisationId: null });
  });
  it("400 is a validation error", () => {
    expect(interpretCreateBikeShopResponse(400, { errors: { Lat: ["required"] } }).kind).toBe("validation");
  });
  it("country stays ISO code or maps to ISO", () => {
    expect(velopassCountry("be")).toBe("BE");
    expect(velopassCountry("België")).toBe("BE");
  });
});
