// Per-project blueprint backdrop. Deterministic drawing derived from the
// project's own parts so every slide has its own technical background.
import { useMemo } from "react";
import type { Project } from "./projects";

export function BlueprintBackground({ project }: { project: Project }) {
  const accent = project.accent;

  const shapes = useMemo(() => {
    return project.parts.slice(0, 10).map((p, i) => {
      const x = p.position[0] * 26 + (i % 3) * 14;
      const y = -p.position[1] * 26 + ((i * 37) % 40) - 20;
      const w = Math.max(18, (p.args[0] ?? 1) * 34);
      const h = Math.max(14, (p.args[1] ?? p.args[0] ?? 1) * 30);
      return { key: p.name, kind: p.kind, x, y, w, h };
    });
  }, [project]);

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
      <svg viewBox="-260 -150 520 300" className="absolute inset-0 h-full w-full opacity-[0.5]" preserveAspectRatio="xMidYMid slice">
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

        {/* drawing frame + title block */}
        <g stroke={accent} fill="none" strokeWidth="0.6" opacity="0.22">
          <rect x="-248" y="-140" width="496" height="280" />
          <rect x="128" y="96" width="120" height="44" />
          <line x1="128" y1="110" x2="248" y2="110" />
          <line x1="128" y1="124" x2="248" y2="124" />
        </g>
        <g fill={accent} opacity="0.42" fontSize="6" fontFamily="ui-monospace, monospace" letterSpacing="1.4">
          <text x="133" y="106">{project.fileName}</text>
          <text x="133" y="120">{project.material}</text>
          <text x="133" y="134">SCALE 1:2 · {project.year}</text>
        </g>
      </svg>

      {/* atmospheric grading */}
      <div className="absolute inset-0" style={{ background: `radial-gradient(60% 50% at 50% 45%, ${accent}12, transparent 70%)` }} />
      <div className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 50% 50%, transparent 40%, rgba(4,7,11,0.82) 100%)" }} />
    </div>
  );
}

export default BlueprintBackground;
