import { describe, expect, it } from "vitest";
import { hasRecoveryLink, passwordError, recoveryRedirect } from "@/lib/password-recovery";

describe("Company password recovery", () => {
  it("sends the recovery link to the public reset page", () => {
    expect(recoveryRedirect("https://utl-shop-express.lovable.app")).toBe("https://utl-shop-express.lovable.app/reset-password");
  });
  it("recognizes recovery links but not ordinary sign-in links", () => {
    expect(hasRecoveryLink("#type=recovery&access_token=sample")).toBe(true);
    expect(hasRecoveryLink("#type=signup")).toBe(false);
    expect(hasRecoveryLink("")).toBe(false);
  });
  it("requires matching passwords", () => {
    expect(passwordError("company-password", "different-password")).toBe("Passwords do not match.");
    expect(passwordError("company-password", "company-password")).toBe(null);
  });
});