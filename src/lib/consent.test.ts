import { describe, expect, it } from "vitest";
import { addMonths, allows, makeRecord, parseRecord, POLICY_VERSION } from "./consent";

const NOW = new Date("2026-11-02T09:30:00.000Z");

describe("cookie consent record", () => {
  it("expires six months after the choice", () => {
    expect(makeRecord("accept_all", { functional: false, analytics: false }, NOW).expiresAt).toBe("2027-05-02T09:30:00.000Z");
  });

  it("clamps month-end dates", () => {
    expect(addMonths(new Date("2026-08-31T00:00:00.000Z"), 6).toISOString()).toBe("2027-02-28T00:00:00.000Z");
  });

  it("reject optional turns every optional category off, whatever was toggled", () => {
    const rec = makeRecord("reject_optional", { functional: true, analytics: true }, NOW);
    expect(rec.categories).toEqual({ necessary: true, functional: false, analytics: false });
  });

  it("accept all turns every optional category on", () => {
    const rec = makeRecord("accept_all", { functional: false, analytics: false }, NOW);
    expect(rec.categories).toEqual({ necessary: true, functional: true, analytics: true });
  });

  it("custom keeps exactly the chosen categories", () => {
    const rec = makeRecord("custom", { functional: true, analytics: false }, NOW);
    expect(allows(rec, "functional")).toBe(true);
    expect(allows(rec, "analytics")).toBe(false);
  });

  it("no record means no optional consent", () => {
    expect(allows(null, "analytics")).toBe(false);
    expect(allows(null, "functional")).toBe(false);
  });

  it("a stored choice stays valid within the six months", () => {
    const raw = JSON.stringify(makeRecord("accept_all", { functional: false, analytics: false }, NOW));
    expect(parseRecord(raw, new Date("2027-05-01T00:00:00.000Z"))?.categories.analytics).toBe(true);
  });

  it("an expired choice asks again", () => {
    const raw = JSON.stringify(makeRecord("accept_all", { functional: false, analytics: false }, NOW));
    expect(parseRecord(raw, new Date("2027-05-02T09:30:00.001Z"))).toBeNull();
  });

  it("a choice made under an older policy asks again", () => {
    const rec = { ...makeRecord("accept_all", { functional: false, analytics: false }, NOW), policy: "2000-01-01" };
    expect(POLICY_VERSION).not.toBe("2000-01-01");
    expect(parseRecord(JSON.stringify(rec), NOW)).toBeNull();
  });

  it("malformed storage asks again", () => {
    expect(parseRecord("{not json", NOW)).toBeNull();
    expect(parseRecord(JSON.stringify({ v: 1 }), NOW)).toBeNull();
  });

  it("only a literal true grants a category", () => {
    const rec = { ...makeRecord("custom", { functional: false, analytics: false }, NOW), categories: { necessary: true, functional: "yes", analytics: 1 } };
    const parsed = parseRecord(JSON.stringify(rec), NOW);
    expect(parsed?.categories.functional).toBe(false);
    expect(parsed?.categories.analytics).toBe(false);
  });
});
