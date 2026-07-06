// Presentation card for a project_analyses row. Renders the extended
// engineering report from Part 2.2A/B when those fields are present.
type Props = { a: any | null; loading?: boolean; className?: string; adminView?: boolean };

function Score({ label, value, tone = "sky" }: { label: string; value: number; tone?: "sky" | "emerald" | "amber" }) {
  const bar = tone === "emerald" ? "bg-emerald-400" : tone === "amber" ? "bg-amber-400" : "bg-sky-400";
  return (
    <div>
      <div className="flex justify-between items-baseline">
        <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-white/40">{label}</div>
        <div className="text-lg font-semibold tabular-nums">{Math.round(value)}<span className="text-white/40 text-xs">/100</span></div>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className={`h-full ${bar}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

function LevelChip({ level }: { level?: string }) {
  const cls =
    level === "high" ? "bg-red-500/15 text-red-200 border-red-400/30" :
    level === "medium" ? "bg-amber-500/15 text-amber-200 border-amber-400/30" :
    level === "low" ? "bg-emerald-500/15 text-emerald-200 border-emerald-400/30" :
    "bg-white/5 text-white/60 border-white/10";
  return <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase border ${cls}`}>{level ?? "—"}</span>;
}

function LevelRow({ items }: { items: Record<string, { level: string; note?: string }> }) {
  const entries = Object.entries(items ?? {});
  if (!entries.length) return null;
  return (
    <ul className="space-y-1.5 text-xs">
      {entries.map(([k, v]) => (
        <li key={k} className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <span className="text-white/80 capitalize">{k.replace(/_/g, " ")}</span>
            {v?.note && <span className="text-white/40 ml-1.5">— {v.note}</span>}
          </div>
          <LevelChip level={v?.level} />
        </li>
      ))}
    </ul>
  );
}

const CONF_LABEL: Record<string, string> = {
  very_high: "Very High Confidence",
  high: "High Confidence",
  medium: "Medium Confidence",
  review_recommended: "Administrator Review Recommended",
};
const CPX_LABEL: Record<string, string> = {
  very_simple: "Very Simple",
  simple: "Simple",
  medium: "Medium",
  complex: "Complex",
  very_complex: "Very Complex",
};

export function AIAnalysisCard({ a, loading, className, adminView }: Props) {
  if (loading) {
    return (
      <div className={"border border-white/10 rounded-lg p-5 md:p-6 bg-white/[0.02] " + (className ?? "")}>
        <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/40">AI Engineering Analysis</div>
        <div className="mt-4 flex items-center gap-3 text-white/60 text-sm">
          <div className="w-4 h-4 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
          Analysing your part…
        </div>
      </div>
    );
  }
  if (!a) return null;

  const price = Number(a.quote_price_eur ?? 0);
  const est = Number(a.estimated_print_hours ?? 0);
  const grams = Number(a.estimated_material_g ?? 0);
  const cb = a.cost_breakdown ?? {};
  const cbEntries = Object.entries(cb).filter(([, v]) => typeof v === "number" && v > 0) as Array<[string, number]>;

  return (
    <div className={"border border-white/10 rounded-lg p-5 md:p-6 bg-gradient-to-b from-white/[0.03] to-white/[0.01] " + (className ?? "")}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/50">AI Engineering Analysis</div>
        <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest">
          {a.complexity_band && (
            <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-400/30 text-amber-200">{CPX_LABEL[a.complexity_band] ?? a.complexity_band}</span>
          )}
          <span className="text-sky-300/80">{CONF_LABEL[a.confidence_band ?? ""] ?? `Confidence · ${Math.round(a.confidence ?? 0)}%`}</span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-5">
        <Score label="DFM Score" value={a.dfm_score ?? 0} tone="emerald" />
        <Score label="Printability" value={a.printability_score ?? 0} tone="sky" />
        <Score label="Complexity" value={a.complexity_score ?? 0} tone="amber" />
      </div>

      {a.ai_summary && <p className="mt-5 text-sm text-white/80 leading-relaxed">{a.ai_summary}</p>}

      <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div><div className="text-[10px] font-mono uppercase tracking-widest text-white/40">Material</div><div className="mt-0.5 text-white">{a.recommended_material ?? "—"}</div></div>
        <div><div className="text-[10px] font-mono uppercase tracking-widest text-white/40">Print Time</div><div className="mt-0.5 text-white tabular-nums">{est.toFixed(1)} h</div></div>
        <div><div className="text-[10px] font-mono uppercase tracking-widest text-white/40">Material Use</div><div className="mt-0.5 text-white tabular-nums">{grams.toFixed(0)} g</div></div>
        <div><div className="text-[10px] font-mono uppercase tracking-widest text-white/40">Est. Quote</div><div className="mt-0.5 text-white font-semibold tabular-nums">€{price.toFixed(2)}</div></div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-mono">
        {a.recommended_nozzle && <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white/80">Nozzle {a.recommended_nozzle}</span>}
        {a.recommended_layer_height_mm && <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white/80">Layer {a.recommended_layer_height_mm}mm</span>}
        {a.recommended_infill_pct != null && <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white/80">Infill {a.recommended_infill_pct}%</span>}
        {a.recommended_orientation && <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white/80">↺ {a.recommended_orientation}</span>}
        {a.estimated_layers != null && <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white/60">{a.estimated_layers} layers</span>}
      </div>

      {(a.quality_predictions && Object.keys(a.quality_predictions).length > 0) && (
        <div className="mt-5">
          <div className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-2">Quality Predictions</div>
          <LevelRow items={a.quality_predictions} />
        </div>
      )}

      {(a.risk_analysis && Object.keys(a.risk_analysis).length > 0) && (
        <div className="mt-5">
          <div className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-2">Risk Analysis</div>
          <LevelRow items={a.risk_analysis} />
        </div>
      )}

      {(a.support_volume_cm3 != null || a.support_hours != null || a.support_difficulty) && (
        <div className="mt-5 grid grid-cols-3 gap-3 text-xs">
          <div><div className="text-[10px] font-mono uppercase tracking-widest text-white/40">Support Vol</div><div className="text-white/80">{a.support_volume_cm3 ?? "—"} cm³</div></div>
          <div><div className="text-[10px] font-mono uppercase tracking-widest text-white/40">Support Time</div><div className="text-white/80">{a.support_hours ?? "—"} h</div></div>
          <div><div className="text-[10px] font-mono uppercase tracking-widest text-white/40">Removal</div><div className="text-white/80 capitalize">{a.support_difficulty ?? "—"}</div></div>
        </div>
      )}

      {adminView && cbEntries.length > 0 && (
        <div className="mt-5 border-t border-white/10 pt-4">
          <div className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-2">Cost Breakdown (admin)</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            {cbEntries.map(([k, v]) => (
              <div key={k} className="flex justify-between bg-white/[0.02] border border-white/5 rounded px-2 py-1.5">
                <span className="text-white/50 capitalize">{k.replace(/_eur$/, "").replace(/_/g, " ")}</span>
                <span className="text-white tabular-nums">€{Number(v).toFixed(2)}</span>
              </div>
            ))}
          </div>
          {a.price_explanation && <p className="mt-3 text-xs text-white/60 italic">{a.price_explanation}</p>}
        </div>
      )}

      {Array.isArray(a.ai_warnings) && a.ai_warnings.length > 0 && (
        <div className="mt-5">
          <div className="text-[10px] font-mono uppercase tracking-widest text-amber-300/80">Warnings</div>
          <ul className="mt-2 space-y-1 text-sm text-amber-100/90 list-disc list-inside">
            {a.ai_warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      {Array.isArray(a.ai_recommendations) && a.ai_recommendations.length > 0 && (
        <div className="mt-5">
          <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-300/80">Recommendations</div>
          <ul className="mt-2 space-y-1 text-sm text-white/80 list-disc list-inside">
            {a.ai_recommendations.map((w: string, i: number) => <li key={i}>{w}</li>)}
          </ul>
        </div>
      )}

      <div className="mt-5 text-[10px] font-mono uppercase tracking-widest text-white/30">
        Powered by TOREO Factory OS · AI-generated estimate — final quote confirmed by our engineering team.
      </div>
    </div>
  );
}

export default AIAnalysisCard;
