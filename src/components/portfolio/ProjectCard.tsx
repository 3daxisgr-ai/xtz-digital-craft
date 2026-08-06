// Premium floating "engineering file" card.
//
// Appearance only — the data, filters and open behaviour are unchanged.
// Built from several depth layers: an outer glow, a gradient hairline frame,
// a frosted glass body, an inner blueprint plate, and a specular sweep that
// tracks the cursor. On hover (or keyboard focus) the flat blueprint preview
// hands over to a real, lazily-loaded 3D preview of the same assembly.
import { Suspense, lazy, memo, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";
import type { Project } from "./projects";

const CardPreview = lazy(() => import("./CardPreview"));

const KIND_TINT: Record<string, string> = {
  STEP: "#5aa9ff",
  STL: "#f59e0b",
  DXF: "#34d399",
  SLDPRT: "#a78bfa",
  SLDASM: "#67e8f9",
  PDF: "#f472b6",
  RENDER: "#facc15",
};

function ProjectCardBase({
  project,
  index,
  onOpen,
}: {
  project: Project;
  index: number;
  onOpen: (p: Project) => void;
}) {
  const reduced = useReducedMotion();
  const [live, setLive] = useState(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [7, -7]), { stiffness: 220, damping: 22 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-9, 9]), { stiffness: 220, damping: 22 });
  const sheenX = useTransform(mx, [-0.5, 0.5], ["18%", "82%"]);
  const sheenY = useTransform(my, [-0.5, 0.5], ["12%", "88%"]);
  const sheen = useTransform(
    [sheenX, sheenY],
    ([x, y]: string[]) => `radial-gradient(38% 46% at ${x} ${y}, rgba(255,255,255,0.13), transparent 70%)`,
  );
  const tint = KIND_TINT[project.fileKind] ?? project.accent;

  // 3D preview only spins up after a short dwell, so scrubbing the grid with
  // the mouse never creates and destroys contexts.
  const arm = () => {
    if (reduced) return;
    hoverTimer.current = setTimeout(() => setLive(true), 180);
  };
  const disarm = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = null;
    setLive(false);
  };

  return (
    <motion.button
      type="button"
      onClick={() => onOpen(project)}
      onMouseMove={(e) => {
        if (reduced) return;
        const r = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onMouseEnter={arm}
      onFocus={arm}
      onBlur={disarm}
      onMouseLeave={() => {
        mx.set(0);
        my.set(0);
        disarm();
      }}
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 20, delay: Math.min(index * 0.05, 0.4) }}
      whileHover={reduced ? undefined : { y: -12, transition: { duration: 0.3 } }}
      style={{ rotateX: reduced ? 0 : rx, rotateY: reduced ? 0 : ry, transformPerspective: 1100 }}
      className="group relative w-full text-left [transform-style:preserve-3d]"
      aria-label={`Open ${project.title}`}
    >
      {/* depth layer 1 — coloured bloom that lifts the card off the page */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-3 rounded-[26px] opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: `radial-gradient(60% 60% at 50% 30%, ${tint}2e, transparent 72%)` }}
      />

      {/* depth layer 2 — gradient hairline frame */}
      <div
        className="relative overflow-hidden rounded-[22px] p-px shadow-[0_18px_40px_-28px_rgba(0,0,0,0.9)] transition-shadow duration-500 group-hover:shadow-[0_44px_90px_-34px_rgba(0,0,0,0.95)]"
        style={{
          background:
            "linear-gradient(150deg, rgba(255,255,255,0.20), rgba(255,255,255,0.03) 42%, rgba(255,255,255,0.02) 62%, rgba(255,255,255,0.12))",
        }}
      >
        {/* depth layer 3 — frosted glass body */}
        <div
          className="relative overflow-hidden rounded-[21px] backdrop-blur-2xl"
          style={{ background: "linear-gradient(168deg, rgba(19,26,36,0.90), rgba(10,14,19,0.97))" }}
        >
          {/* cursor-tracked specular sweep */}
          {!reduced && (
            <motion.div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: sheen }}
            />
          )}

          {/* preview plate */}
          <div className="relative h-48 overflow-hidden">
            <div
              aria-hidden
              className="absolute inset-0 transition-transform duration-700 group-hover:scale-[1.05]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
                backgroundSize: "22px 22px",
              }}
            />
            <div
              aria-hidden
              className="absolute inset-0 opacity-70 transition-opacity duration-500 group-hover:opacity-100"
              style={{ background: `radial-gradient(ellipse at 32% 18%, ${tint}30, transparent 64%)` }}
            />

            {/* static blueprint silhouette (always cheap) */}
            <motion.svg
              viewBox="-60 -40 120 80"
              className={`absolute inset-0 h-full w-full transition-opacity duration-500 ${live ? "opacity-0" : "opacity-100"}`}
              animate={reduced ? undefined : { y: [0, -4, 0] }}
              transition={{ duration: 7 + (index % 3), repeat: Infinity, ease: "easeInOut" }}
            >
              <g stroke={tint} strokeWidth="0.9" fill="none" opacity="0.9">
                <path d="M-34,14 L34,14 L34,22 L-34,22 Z" />
                <path d="M-34,-18 L-26,-18 L-26,14 L-34,14 Z" />
                <path d="M-26,-2 L-6,14 L-26,14 Z" />
                <rect x="8" y="-14" width="22" height="20" rx="2" />
                <circle cx="19" cy="-4" r="5" />
              </g>
              <g stroke={tint} strokeWidth="0.35" opacity="0.4">
                <line x1="-40" y1="28" x2="40" y2="28" />
                <line x1="-40" y1="25" x2="-40" y2="31" />
                <line x1="40" y1="25" x2="40" y2="31" />
              </g>
            </motion.svg>

            {/* live 3D preview — mounted on hover only, unmounted on leave */}
            {live && (
              <div className="absolute inset-0 animate-fade-in">
                <Suspense fallback={null}>
                  <CardPreview parts={project.parts} />
                </Suspense>
              </div>
            )}

            <div className="absolute left-3 top-3 flex items-center gap-2">
              <span
                className="rounded-md border px-2 py-0.5 font-mono text-[10px] tracking-[0.18em] backdrop-blur-sm"
                style={{ borderColor: `${tint}66`, color: tint, background: `${tint}18` }}
              >
                {project.fileKind}
              </span>
              {project.featured && (
                <span className="rounded-md border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-[10px] tracking-[0.18em] text-white/60 backdrop-blur-sm">
                  FEATURED
                </span>
              )}
            </div>
            <div className="absolute bottom-3 left-3 font-mono text-[10px] text-white/35">{project.fileName}</div>
            <div className="pointer-events-none absolute bottom-3 right-3 translate-y-2 font-mono text-[10px] text-white/0 transition-all duration-300 group-hover:translate-y-0 group-hover:text-white/45">
              {project.tolerance} · {project.thickness}
            </div>
            {/* plate edge, catches the light like a bevel */}
            <div aria-hidden className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>

          <div className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-base leading-tight text-white">{project.title}</h3>
              <span className="mt-1 flex shrink-0 items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    background:
                      project.status === "Delivered" ? "#34d399" : project.status === "In production" ? "#f59e0b" : "#5aa9ff",
                  }}
                />
                {project.status}
              </span>
            </div>
            <p className="line-clamp-2 text-sm text-white/50">{project.summary}</p>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-white/10 pt-3 font-mono text-[10px] uppercase tracking-[0.12em]">
              <div><dt className="text-white/30">Material</dt><dd className="text-white/70">{project.material}</dd></div>
              <div><dt className="text-white/30">Process</dt><dd className="truncate text-white/70">{project.technology}</dd></div>
              <div><dt className="text-white/30">Software</dt><dd className="text-white/70">{project.software}</dd></div>
              <div><dt className="text-white/30">Year</dt><dd className="text-white/70">{project.year}</dd></div>
            </dl>
          </div>
        </div>
      </div>
    </motion.button>
  );
}

export const ProjectCard = memo(ProjectCardBase);

export default ProjectCard;
