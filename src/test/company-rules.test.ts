import { describe, expect, it } from "vitest";
import { companyCanPublish, PAYMENT_STATUSES, validProductPrice } from "@/lib/company-rules";

describe("Company products and order payments", () => {
  it("publishes directly after fee verification without per-product approval", () => {
    expect(companyCanPublish("paid")).toBe(true);
    expect(companyCanPublish("approved")).toBe(true);
    expect(companyCanPublish("pending")).toBe(false);
    expect(companyCanPublish("rejected")).toBe(false);
  });
  it("accepts only unpaid, paid and refunded payment states", () => {
    expect([...PAYMENT_STATUSES]).toEqual(["unpaid", "paid", "refunded"]);
  });
  it("rejects negative and non-finite product prices", () => {
    expect(validProductPrice(1299)).toBe(true);
    expect(validProductPrice(-1)).toBe(false);
    expect(validProductPrice(NaN)).toBe(false);
  });
});