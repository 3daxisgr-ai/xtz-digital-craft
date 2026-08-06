// Per-project blueprint backdrop. Deterministic drawing derived from the
// project's own parts so every slide has its own technical background.
import { useMemo } from "react";
import type { Project } from "./projects";

export function BlueprintBackground({ project }: { project: Project }) {
  const accent = project.accent;

  // Projects backed by a real CAD file have no procedural parts to project,
  // so they get a neutral drafting frame instead of a stale part silhouette.
  const generic = Boolean(project.modelUrl);

  const shapes = useMemo(() => {
    if (generic) return [];
    return project.parts.slice(0, 10).map((p, i) => {
      const x = p.position[0] * 26 + (i % 3) * 14;
      const y = -p.position[1] * 26 + ((i * 37) % 40) - 20;
      const w = Math.max(18, (p.args[0] ?? 1) * 34);
      const h = Math.max(14, (p.args[1] ?? p.args[0] ?? 1) * 30);
      return { key: p.name, kind: p.kind, x, y, w, h };
    });
  }, [project, generic]);


  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* fine + coarse grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(${accent}18 1px, transparent 1px), linear-gradient(90deg, ${accent}18 1px, transparent 1px)`,
          backgroundSize: "168px 168px",
        }}
      />

      {/* project-specific orthographic sketch */}
      <svg viewBox="-260 -150 520 300" className="absolute inset-0 h-full w-full opacity-[0.5]" preserveAspectRatio="xMidYMid meet">
        <g stroke={accent} fill="none" strokeWidth="0.5" opacity="0.32">
          {shapes.map((s, i) =>
            s.kind === "cylinder" || s.kind === "sphere" || s.kind === "torus" || s.kind === "tube" ? (
              <g key={s.key}>
                <circle cx={s.x} cy={s.y} r={s.w / 2} />
                <circle cx={s.x} cy={s.y} r={s.w / 3.4} strokeDasharray="4 3" />
                <line x1={s.x - s.w / 1.6} y1={s.y} x2={s.x + s.w / 1.6} y2={s.y} strokeDasharray="8 3 2 3" opacity="0.6" />
                <line x1={s.x} y1={s.y - s.w / 1.6} x2={s.x} y2={s.y + s.w / 1.6} strokeDasharray="8 3 2 3" opacity="0.6" />
              </g>
            ) : (
              <g key={s.key}>
                <rect x={s.x - s.w / 2} y={s.y - s.h / 2} width={s.w} height={s.h} rx="1.5" />
                <rect
                  x={s.x - s.w / 2 + 4}
                  y={s.y - s.h / 2 + 4}
                  width={Math.max(4, s.w - 8)}
                  height={Math.max(4, s.h - 8)}
                  strokeDasharray="3 3"
                  opacity="0.55"
                />
                {i % 2 === 0 && (
                  <line x1={s.x - s.w / 2 - 10} y1={s.y + s.h / 2 + 8} x2={s.x + s.w / 2 + 10} y2={s.y + s.h / 2 + 8} opacity="0.5" />
                )}
              </g>
            ),
          )}
        </g>

        {generic && (
          <g stroke={accent} fill="none" strokeWidth="0.5" opacity="0.26">
            {/* drafting frame + centre datum for CAD-file projects */}
            <rect x="-190" y="-104" width="380" height="208" rx="2" strokeDasharray="6 4" />
            <line x1="-190" y1="0" x2="190" y2="0" strokeDasharray="14 4 3 4" opacity="0.7" />
            <line x1="0" y1="-104" x2="0" y2="104" strokeDasharray="14 4 3 4" opacity="0.7" />
            <circle cx="0" cy="0" r="86" strokeDasharray="3 5" opacity="0.5" />
            <circle cx="0" cy="0" r="52" opacity="0.4" />
            <line x1="-190" y1="-72" x2="190" y2="-72" opacity="0.25" />
            <line x1="-190" y1="72" x2="190" y2="72" opacity="0.25" />
            <line x1="-124" y1="-104" x2="-124" y2="104" opacity="0.25" />
            <line x1="124" y1="-104" x2="124" y2="104" opacity="0.25" />
          </g>
        )}



      </svg>

      {/* corner title block */}
      <div className="absolute bottom-24 right-6 hidden w-[220px] rounded-md border p-3 sm:block" style={{ borderColor: `${accent}33` }}>
        <div className="font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: `${accent}99` }}>{project.fileName}</div>
        <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-white/25">{project.material}</div>
        <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-white/20">Scale 1:2 · {project.year}</div>
      </div>

      {/* atmospheric grading */}
      <div className="absolute inset-0" style={{ background: `radial-gradient(60% 50% at 50% 45%, ${accent}12, transparent 70%)` }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 50% 50%, transparent 40%, rgba(4,7,11,0.82) 100%)" }} />
    </div>
  );
}

export default BlueprintBackground;
