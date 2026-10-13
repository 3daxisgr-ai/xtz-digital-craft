import { describe, it, expect } from "vitest";
import { offerTotals, orderTotals, documentNumber, canSend, canEdit } from "./admin-docs";

describe("admin documents", () => {
  it("offer: discount applied before 24% VAT", () => {
    expect(offerTotals({ quantity: 2, unit_price: 100, discount_percent: 10, vat_percent: 24 })).toEqual({
      subtotal: 180, vat_amount: 43.2, final_total: 223.2,
    });
  });
  it("order form: lines summed, VAT on net", () => {
    const t = orderTotals({ vat_percent: 24, lines: [
      { description: "a", quantity: 3, unit: "ΤΕΜ", unit_price: 10 },
      { description: "b", quantity: 1, unit: "ΤΕΜ", unit_price: 5.5 },
    ] });
    expect(t.net).toBe(35.5);
    expect(t.vat).toBe(8.52);
    expect(t.total).toBe(44.02);
  });
  it("order form keeps at most 6 lines (template has 6 rows)", () => {
    const lines = Array.from({ length: 8 }, () => ({ description: "x", quantity: 1, unit: "ΤΕΜ", unit_price: 1 }));
    expect(orderTotals({ vat_percent: 0, lines }).net).toBe(6);
  });
  it("numbering uses the order code, revisions get -R2", () => {
    expect(documentNumber("TR-2026-0012", 0)).toBe("TR-2026-0012");
    expect(documentNumber("TR-2026-0012", 1)).toBe("TR-2026-0012-R2");
  });
  it("a draft can never be sent; only approved (or failed retry)", () => {
    expect(canSend("draft")).toBe(false);
    expect(canSend("sending")).toBe(false);
    expect(canSend("sent")).toBe(false);
    expect(canSend("approved")).toBe(true);
    expect(canSend("failed")).toBe(true);
    expect(canEdit("sent")).toBe(false);
  });
});
