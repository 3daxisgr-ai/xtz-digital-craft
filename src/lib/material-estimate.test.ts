import { describe, expect, it } from "vitest";
import {
  applyMarkup, computeEstimate, manualSheetCalc, materialCost, nearestThickness, sheetKg, toCustomerDTO, volumeKg,
} from "./material-estimate";

const m304 = { code: "SH-304-0.8", name: "Inox 304", price_per_kg: 3.35, density_g_cm3: 7.93 };

describe("material estimate", () => {
  it("sheet area × thickness × density → kg", () => {
    // 1000×2000×0.8 mm = 1,600 cm³ × 7.93 = 12.688 kg
    expect(sheetKg(1000 * 2000, 0.8, 7.93)).toBeCloseTo(12.688, 6);
    expect(volumeKg(1000, 7.85)).toBeCloseTo(7.85, 6);
  });
  it("kg × €/kg and +30% markup on cost", () => {
    expect(materialCost(10, 3.35)).toBeCloseTo(33.5, 6);
    expect(applyMarkup(33.5, 30)).toBeCloseTo(43.55, 6);
  });
  it("quantity multiplies mass and price", () => {
    const one = computeEstimate({ geometry: { kind: "sheet", area_mm2: 500 * 500, thickness_mm: 0.8 }, quantity: 1, material: m304, markup_pct: 30, confidence: 0.9 });
    const ten = computeEstimate({ geometry: { kind: "sheet", area_mm2: 500 * 500, thickness_mm: 0.8 }, quantity: 10, material: m304, markup_pct: 30, confidence: 0.9 });
    expect(one.mode).toBe("exact");
    expect(ten.kg!).toBeCloseTo(one.kg! * 10, 6);
    expect(ten.price!).toBeCloseTo(one.price! * 10, 6);
    expect(one.price!).toBeCloseTo(sheetKg(250000, 0.8, 7.93) * 3.35 * 1.3, 6);
  });
  it("nearest available thickness", () => {
    expect(nearestThickness([0.5, 0.7, 0.8, 1.2], 0.9)).toBe(0.8);
    expect(nearestThickness([0.5, 0.7, 0.8, 1.2], 1.1)).toBe(1.2);
    expect(nearestThickness([0.5, 0.7], 0.6)).toBe(0.7);
    expect(nearestThickness([], 1)).toBeNull();
  });
  it("low confidence gives range or asks for info", () => {
    const mid = computeEstimate({ geometry: { kind: "sheet", area_mm2: 1e6, thickness_mm: 0.8 }, quantity: 1, material: m304, markup_pct: 30, confidence: 0.6 });
    expect(mid.mode).toBe("range");
    const low = computeEstimate({ geometry: { kind: "sheet", area_mm2: 1e6, thickness_mm: 0.8 }, quantity: 1, material: m304, markup_pct: 30, confidence: 0.2 });
    expect(low.mode).toBe("needs_info");
    const bad = computeEstimate({ geometry: { kind: "sheet", area_mm2: 1e6, thickness_mm: 99 }, quantity: 1, material: m304, markup_pct: 30, confidence: 0.9 });
    expect(bad.mode).toBe("needs_info");
  });
  it("customer DTO has no internal fields", () => {
    const e = computeEstimate({ geometry: { kind: "sheet", area_mm2: 1e6, thickness_mm: 0.8 }, quantity: 2, material: m304, markup_pct: 30, confidence: 0.9 });
    const dto = toCustomerDTO(e, { material_label: "Inox AISI 304", thickness_mm: 0.8, quantity: 2, is_assumption: false, geometry_note: null, notes: [], missing: [] });
    const s = JSON.stringify(dto);
    for (const k of ["cost_per_kg", "material_cost", "markup", "price_per_kg", "confidence", "ai_", "errors", "density", "profit"]) {
      expect(s).not.toContain(k);
    }
    expect(dto.price).toBeGreaterThan(0);
  });
  it("manual admin calculator example", () => {
    expect(manualSheetCalc(10, 3.35, 30)).toEqual({ cost: 33.5, sale: 43.55, profit: 10.05 });
  });
});
