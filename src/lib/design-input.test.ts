import { describe, expect, it } from "vitest";
import {
  confidenceCap, DESIGN_INPUT_CATEGORIES, DESIGN_INPUT_OPTIONS, geometrySourceFor, uncertaintyFrom, validateDesignInput,
} from "./design-input";
import { computeEstimate } from "./material-estimate";

const m304 = { code: "SH-304-0.8", name: "Inox 304", price_per_kg: 3.35, density_g_cm3: 7.93 };

describe("design input", () => {
  it("exposes the three exact options for every category", () => {
    expect(DESIGN_INPUT_OPTIONS.map((o) => o.label)).toEqual([
      "Έχω σχέδιο / αρχείο", "Έχω φωτογραφία", "Δεν έχω σχέδιο — θέλω να με βοηθήσει το AI",
    ]);
    expect([...DESIGN_INPUT_CATEGORIES].sort()).toEqual(["3d", "bending", "design", "laser", "replacement", "welding"]);
  });
  it("file path: upload optional", () => {
    expect(validateDesignInput("file", { files: [] })).toBeNull();
    expect(validateDesignInput("file", { files: ["part.dxf"] })).toBeNull();
  });
  it("photo path: images only, upload or description", () => {
    expect(validateDesignInput("photo", { files: ["a.jpg"] })).toBeNull();
    expect(validateDesignInput("photo", { files: ["a.step"] })).not.toBeNull();
    expect(validateDesignInput("photo", { files: [], description: "σπασμένος βραχίονας από μέταλλο" })).toBeNull();
    expect(validateDesignInput("photo", { files: [] })).not.toBeNull();
  });
  it("ai_design path: needs description", () => {
    expect(validateDesignInput("ai_design", { files: [], description: "" })).not.toBeNull();
    expect(validateDesignInput("ai_design", { files: [], description: "Κουτί 300×200×100 mm με καπάκι" })).toBeNull();
    expect(validateDesignInput(undefined, { files: [] })).not.toBeNull();
  });
  it("geometry source and uncertainty per path", () => {
    expect(geometrySourceFor("file", { customerDims: false, drawingDims: true })).toBe("drawing");
    expect(geometrySourceFor("photo", { customerDims: false, drawingDims: false })).toBe("photo");
    expect(geometrySourceFor("ai_design", { customerDims: false, drawingDims: false })).toBe("ai_draft");
    expect(geometrySourceFor("photo", { customerDims: true, drawingDims: false })).toBe("customer");
    expect(uncertaintyFrom(0.9)).toBe("low");
    expect(uncertaintyFrom(0.6)).toBe("medium");
    expect(uncertaintyFrom(0.3)).toBe("high");
  });
  it("photo without scale never yields an exact price; pricing stays deterministic", () => {
    const cap = confidenceCap("photo", false);
    const e = computeEstimate({ geometry: { kind: "sheet", area_mm2: 250000, thickness_mm: 0.8 }, quantity: 1, material: m304, markup_pct: 30, confidence: Math.min(0.9, cap) });
    expect(e.mode).toBe("range");
    const exact = computeEstimate({ geometry: { kind: "sheet", area_mm2: 250000, thickness_mm: 0.8 }, quantity: 1, material: m304, markup_pct: 30, confidence: confidenceCap("photo", true) * 0.9 });
    expect(exact.mode).toBe("exact");
    expect(exact.price!).toBeCloseTo(250000 * 0.8 / 1000 * 7.93 / 1000 * 3.35 * 1.3, 6);
  });
});
