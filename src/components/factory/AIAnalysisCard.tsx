// Presentation card for a project_analyses row.
type Props = { a: any | null; loading?: boolean; className?: string };

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

export function AIAnalysisCard({ a, loading, className }: Props) {
  if (loading) {
    return (
      <div className={"border border-white/10 rounded-lg p-5 md:p-6 bg-white/[0.02] " + (className ?? "")}>
        <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/40">AI Engineering Analysis</div>
        <div className="mt-4 flex items-center gap-3 text-white/60 text-sm">
          <div className="w-4 h-4 rounded-full border-2 border-sky-400 border-t-transparent animate-spin" />
          Analysing your part…
        </div>
        <div className="mt-3 text-[11px] text-white/40">
          Reviewing geometry, materials, machine catalogue and DFM rules.
        </div>
      </div>
    );
  }
  if (!a) return null;

  const price = Number(a.quote_price_eur ?? 0);
  const est = Number(a.estimated_print_hours ?? 0);
  const grams = Number(a.estimated_material_g ?? 0);

  return (
    <div className={"border border-white/10 rounded-lg p-5 md:p-6 bg-gradient-to-b from-white/[0.03] to-white/[0.01] " + (className ?? "")}>
      <div className="flex items-center justify-between">
        <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-white/50">AI Engineering Analysis</div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-sky-300/80">
          Confidence · {Math.round(a.confidence ?? 0)}%
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-5">
        <Score label="DFM Score" value={a.dfm_score ?? 0} tone="emerald" />
        <Score label="Printability" value={a.printability_score ?? 0} tone="sky" />
        <Score label="Complexity" value={a.complexity_score ?? 0} tone="amber" />
      </div>

      {a.ai_summary && (
        <p className="mt-5 text-sm text-white/80 leading-relaxed">{a.ai_summary}</p>
      )}

      <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-white/40">Material</div>
          <div className="mt-0.5 text-white">{a.recommended_material ?? "—"}</div>
        </div>
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-white/40">Print Time</div>
          <div className="mt-0.5 text-white tabular-nums">{est.toFixed(1)} h</div>
        </div>
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-white/40">Material Use</div>
          <div className="mt-0.5 text-white tabular-nums">{grams.toFixed(0)} g</div>
        </div>
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-white/40">Est. Quote</div>
          <div className="mt-0.5 text-white font-semibold tabular-nums">€{price.toFixed(2)}</div>
        </div>
      </div>

      {(a.recommended_nozzle || a.recommended_layer_height_mm || a.recommended_infill_pct != null) && (
        <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-mono">
          {a.recommended_nozzle && (
            <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white/80">Nozzle {a.recommended_nozzle}</span>
          )}
          {a.recommended_layer_height_mm && (
            <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white/80">Layer {a.recommended_layer_height_mm}mm</span>
          )}
          {a.recommended_infill_pct != null && (
            <span className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white/80">Infill {a.recommended_infill_pct}%</span>
          )}
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
