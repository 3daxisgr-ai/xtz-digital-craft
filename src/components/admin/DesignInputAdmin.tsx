import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { panelGetDesignInput } from "@/lib/api/material-estimate.functions";

const LABEL: Record<string, string> = { file: "Customer provided a FILE / drawing", photo: "Customer provided a PHOTO", ai_design: "Customer requested AI DESIGN (no drawing)" };

/** Admin-only: which design input the customer chose, plus the internal analysis. */
export function DesignInputAdmin({ orderId, metadata }: { orderId: string; metadata: any }) {
  const get = useServerFn(panelGetDesignInput);
  const [row, setRow] = useState<any | null>(null);
  useEffect(() => { get({ data: { order_id: orderId } }).then(setRow).catch(() => setRow(null)); }, [orderId]); // eslint-disable-line
  const type = row?.design_input_type ?? metadata?.design_input_type;
  if (!type) return null;
  const ai = row?.ai_output ?? {};
  const list = (k: string, v: any) => Array.isArray(v) && v.length > 0 && (
    <div><div className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40">{k}</div>
      <ul className="list-disc ml-5 text-xs text-white/80">{v.map((x: string, i: number) => <li key={i}>{x}</li>)}</ul></div>
  );
  return (
    <div className="border border-amber-300/30 bg-amber-300/5 rounded-sm p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-amber-300">Design input (internal)</div>
        <span className="text-xs font-mono px-2 py-0.5 border border-amber-300/50 text-amber-200" data-testid="design-input-type">{type}</span>
      </div>
      <div className="text-sm text-white">{LABEL[type] ?? type}</div>
      {row && (
        <dl className="grid sm:grid-cols-2 gap-2 text-xs">
          <div><dt className="text-white/40">Geometry source</dt><dd>{row.geometry_source ?? "—"}</dd></div>
          <div><dt className="text-white/40">Uncertainty</dt><dd>{row.uncertainty ?? "—"}</dd></div>
          <div><dt className="text-white/40">Files analyzed (content)</dt><dd>{row.analyzed_file_count} / {(row.files ?? []).length}</dd></div>
          <div><dt className="text-white/40">Supplied dimensions</dt><dd>{row.supplied_dimensions ?? "—"}</dd></div>
          <div className="sm:col-span-2"><dt className="text-white/40">Customer description</dt><dd className="whitespace-pre-wrap">{row.customer_description ?? "—"}</dd></div>
          {ai.identified_part && <div className="sm:col-span-2"><dt className="text-white/40">Identified part</dt><dd>{ai.identified_part}</dd></div>}
          {ai.concept && <div className="sm:col-span-2"><dt className="text-white/40">AI concept</dt><dd>{ai.concept}</dd></div>}
        </dl>
      )}
      {list("Customer-provided", ai.customer_provided)}
      {list("AI assumptions", ai.ai_assumptions)}
      {list("Dimensions found", ai.dimensions_found)}
      {list("Manufacturing notes", ai.manufacturing_notes)}
      {list("Missing", ai.missing)}
      {row?.error && <div className="text-xs text-red-300">Analysis unavailable: {String(row.error).slice(0, 160)}</div>}
    </div>
  );
}
