// Renders category-specific request details from an order's `metadata` blob.
// Shared between admin OrderDetail and the customer portal so both surfaces
// show the same information without duplicating layout logic.
type Meta = Record<string, unknown> | null | undefined;

const CATEGORY_LABEL: Record<string, string> = {
  laser: "Fiber Laser Cutting",
  bending: "Sheet Metal Bending / Forming",
  welding: "Welding / Complete Fabrication",
  replacement: "Replacement Part",
  design: "Product Design / Idea",
};

function toPairs(obj: unknown): [string, unknown][] {
  if (!obj || typeof obj !== "object") return [];
  return Object.entries(obj as Record<string, unknown>).filter(
    ([, v]) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0),
  );
}

function fmt(v: unknown): string {
  if (v === true) return "Yes";
  if (v === false) return "No";
  if (Array.isArray(v)) return v.join(", ");
  if (v && typeof v === "object") return JSON.stringify(v);
  return String(v);
}

const LABELS: Record<string, string> = {
  project_name: "Project name",
  material: "Material",
  material_thickness: "Material thickness",
  material_grade: "Material grade",
  quantity: "Quantity",
  quantity_kind: "Quantity type",
  parts_count: "Different parts",
  overall_dimensions: "Overall dimensions",
  max_part_length: "Max part length",
  max_part_width: "Max part width",
  surface_finish: "Surface finish",
  deburring: "Deburring required",
  tolerances: "Tolerances",
  bend_count: "Number of bends",
  bend_angles: "Bend angles",
  bend_radius: "Inside bend radius",
  part_length: "Part length",
  part_width: "Part width",
  construction_type: "Construction type",
  welding_process: "Welding process",
  expected_load: "Expected load / use",
  environment: "Indoor / outdoor use",
  assembly_required: "Assembly required",
  processes: "Requested processes",
  use_case: "Intended use",
  vehicle_model: "Vehicle / machine model",
  original_available: "Original part available",
  original_condition: "Original part condition",
  exposure: "Environmental exposure",
  moving_part: "Moving / rotating part",
  project_stage: "Project stage",
  manufacturing_interest: "Manufacturing interest",
  target_budget: "Target budget",
  similar_product: "Similar existing product",
  additional_notes: "Additional notes",
  delivery_date: "Required delivery date",
  preferred_contact: "Preferred contact",
  location: "Delivery location",
  material_unsure: "Material / thickness unsure",
  dimensions_approximate: "Dimensions approximate",
  needs_drawing: "TOREO to prepare drawing",
  needs_design: "TOREO design required",
  needs_manufacturability: "Manufacturability check requested",
  sketch_only: "Only a sketch / photograph",
  bend_radius_unknown: "Bend radius unknown",
  extras: "Additional options",
  flags: "Flags",
};

export function RequestSummary({ metadata, className = "" }: { metadata: Meta; className?: string }) {
  const m = (metadata ?? {}) as Record<string, unknown>;
  const category = typeof m.request_category === "string" ? m.request_category : null;
  const details = (m.request_details ?? null) as Meta;
  const contact = (m.contact ?? null) as Meta;
  const flags = Array.isArray(m.flags) ? (m.flags as string[]) : [];

  if (!category && !details && !contact && flags.length === 0) return null;

  const detailPairs = toPairs(details);
  const contactPairs = toPairs(contact);

  return (
    <div className={`border border-white/10 rounded-sm bg-white/[0.02] ${className}`}>
      <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[10px] font-mono tracking-[0.3em] uppercase text-white/40">Request Summary</div>
          <div className="text-sm text-white mt-1">
            {category ? CATEGORY_LABEL[category] ?? category : "Project Inquiry"}
          </div>
        </div>
        {flags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {flags.map((f) => (
              <span key={f} className="text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-sm border border-amber-300/40 text-amber-200 bg-amber-300/5">
                {f.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="p-4 grid gap-6 md:grid-cols-2">
        {detailPairs.length > 0 && (
          <Section title="Project Details" pairs={detailPairs} />
        )}
        {contactPairs.length > 0 && (
          <Section title="Contact & Delivery" pairs={contactPairs} />
        )}
      </div>
    </div>
  );
}

function Section({ title, pairs }: { title: string; pairs: [string, unknown][] }) {
  return (
    <div>
      <div className="text-[10px] font-mono tracking-[0.3em] uppercase text-white/40 mb-2">{title}</div>
      <dl className="text-xs divide-y divide-white/5">
        {pairs.map(([k, v]) => (
          <div key={k} className="flex gap-3 py-2">
            <dt className="text-white/50 min-w-[9rem] shrink-0">{LABELS[k] ?? k.replace(/_/g, " ")}</dt>
            <dd className="text-white break-words">{fmt(v)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
