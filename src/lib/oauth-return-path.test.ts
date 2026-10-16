import { describe, expect, it } from "vitest";
import { oauthReturnPath } from "./oauth-return-path";

describe("OAuth login return", () => {
  it("preserves the authorization ID, query and fragment", () => {
    expect(oauthReturnPath("/.lovable/oauth/consent?authorization_id=abc#review")).toBe("/.lovable/oauth/consent?authorization_id=abc#review");
  });
  it("rejects external and network paths", () => {
    for (const value of ["https://outside.invalid", "//outside.invalid", "/\\outside.invalid", "/\noutside.invalid", "/a/..//outside.invalid"]) expect(oauthReturnPath(value)).toBe("/");
  });
});