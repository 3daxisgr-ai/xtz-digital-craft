// Pure, client-safe rules for the three design-input paths of a request.

export type DesignInputType = "file" | "photo" | "ai_design";
export type Uncertainty = "low" | "medium" | "high";

export const AI_DESIGN_NOTE = "Βασισμένο σε ενδεικτική γεωμετρική παραδοχή — όχι τελικό σχέδιο.";

export const DESIGN_INPUT_OPTIONS: { id: DesignInputType; label: string; hint: string }[] = [
  { id: "file", label: "Έχω σχέδιο / αρχείο", hint: "PDF, DXF, DWG, STEP, STL, 3MF ή εικόνα σχεδίου" },
  { id: "photo", label: "Έχω φωτογραφία", hint: "Φωτογραφίες του υπάρχοντος αντικειμένου / εξαρτήματος" },
  { id: "ai_design", label: "Δεν έχω σχέδιο — θέλω να με βοηθήσει το AI", hint: "Περιγράψτε τι χρειάζεστε" },
];

/** Every request category that must expose all three options. */
export const DESIGN_INPUT_CATEGORIES = ["3d", "laser", "bending", "welding", "replacement", "design"] as const;

export const FILE_ACCEPT = ".dxf,.dwg,.step,.stp,.stl,.3mf,.pdf,.jpg,.jpeg,.png,.webp,.zip";
export const PHOTO_ACCEPT = ".jpg,.jpeg,.png,.webp,.heic";

export function isDesignInputType(v: unknown): v is DesignInputType {
  return v === "file" || v === "photo" || v === "ai_design";
}

export function fileKind(name: string): "image" | "pdf" | "dxf" | "cad" | "other" {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "webp", "heic"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (ext === "dxf") return "dxf";
  if (["dwg", "step", "stp", "stl", "3mf"].includes(ext)) return "cad";
  return "other";
}

/** Validation for the chosen path. Uploads are never forced. Returns an error message or null. */
export function validateDesignInput(type: unknown, input: { files: string[]; description?: string | null }): string | null {
  if (!isDesignInputType(type)) return "Επιλέξτε πώς θα μας δώσετε το σχέδιο (αρχείο, φωτογραφία ή βοήθεια).";
  const desc = String(input.description ?? "").trim();
  if (type === "photo" && input.files.some((f) => fileKind(f) !== "image")) return "Στην επιλογή «Έχω φωτογραφία» ανεβάστε μόνο εικόνες.";
  if (type === "ai_design" && desc.length < 10) return "Περιγράψτε τι χρειάζεστε (τουλάχιστον μία πρόταση).";
  if (type === "photo" && input.files.length === 0 && desc.length < 10) return "Ανεβάστε φωτογραφία ή γράψτε μια σύντομη περιγραφή.";
  return null;
}

/** Which source the geometry came from, given the path and what was actually available. */
export function geometrySourceFor(type: DesignInputType, has: { customerDims: boolean; drawingDims: boolean }): "customer" | "drawing" | "photo" | "ai_draft" {
  if (has.customerDims) return "customer";
  if (type === "file" && has.drawingDims) return "drawing";
  if (type === "photo") return "photo";
  return "ai_draft";
}

/** Confidence cap per path: photos without scale and AI concepts never count as precise. */
export function confidenceCap(type: DesignInputType | null, customerDims: boolean): number {
  if (customerDims) return 1;
  if (type === "photo") return 0.5;
  if (type === "ai_design") return 0.6;
  return 1;
}

export function uncertaintyFrom(confidence: number): Uncertainty {
  return confidence >= 0.8 ? "low" : confidence >= 0.5 ? "medium" : "high";
}
