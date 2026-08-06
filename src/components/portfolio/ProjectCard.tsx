// Floating glass "engineering file" card with cursor-tracked 3D tilt.
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";
import type { Project } from "./projects";

const KIND_TINT: Record<string, string> = {
  STEP: "#5aa9ff",
  STL: "#f59e0b",
  DXF: "#34d399",
  SLDPRT: "#a78bfa",
  SLDASM: "#67e8f9",
  PDF: "#f472b6",
  RENDER: "#facc15",
};

export function ProjectCard({
  project,
  index,
  onOpen,
}: {
  project: Project;
  index: number;
  onOpen: (p: Project) => void;
}) {
  const reduced = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), { stiffness: 220, damping: 20 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-10, 10]), { stiffness: 220, damping: 20 });
  const tint = KIND_TINT[project.fileKind] ?? project.accent;

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
      onMouseLeave={() => {
        mx.set(0);
        my.set(0);
      }}
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 20, delay: Math.min(index * 0.05, 0.4) }}
      whileHover={reduced ? undefined : { y: -10, transition: { duration: 0.3 } }}
      style={{ rotateX: reduced ? 0 : rx, rotateY: reduced ? 0 : ry, transformPerspective: 1000 }}
      className="group relative w-full text-left"
      aria-label={`Open ${project.title}`}
    >
      <div
        className="relative overflow-hidden rounded-2xl border border-white/10 p-px transition-shadow duration-300 group-hover:shadow-[0_30px_70px_-30px_rgba(0,0,0,0.9)]"
        style={{ background: "linear-gradient(160deg, rgba(255,255,255,0.10), rgba(255,255,255,0.02) 45%, rgba(255,255,255,0.06))" }}
      >
        <div
          className="relative rounded-2xl backdrop-blur-xl"
          style={{ background: "linear-gradient(165deg, rgba(17,24,33,0.92), rgba(11,15,20,0.96))" }}
        >
          {/* preview */}
          <div className="relative h-44 overflow-hidden rounded-t-2xl">
            <div
              className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.06]"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)",
                backgroundSize: "22px 22px",
              }}
            />
            <div
              className="absolute inset-0 opacity-70 transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: `radial-gradient(ellipse at 30% 20%, ${tint}33, transparent 62%)` }}
            />
            <motion.svg
              viewBox="-60 -40 120 80"
              className="absolute inset-0 h-full w-full"
              animate={reduced ? undefined : { y: [0, -5, 0] }}
              transition={{ duration: 6 + (index % 3), repeat: Infinity, ease: "easeInOut" }}
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
            <div className="absolute left-3 top-3 flex items-center gap-2">
              <motion.span
                className="rounded-md border px-2 py-0.5 font-mono text-[10px] tracking-[0.18em]"
                style={{ borderColor: `${tint}66`, color: tint, background: `${tint}14` }}
                whileHover={{ scale: 1.06 }}
              >
                {project.fileKind}
              </motion.span>
              {project.featured && (
                <span className="rounded-md border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-[10px] tracking-[0.18em] text-white/60">
                  FEATURED
                </span>
              )}
            </div>
            <div className="absolute bottom-3 left-3 font-mono text-[10px] text-white/35">{project.fileName}</div>
            {/* hover engineering details */}
            <div className="pointer-events-none absolute bottom-3 right-3 translate-y-2 font-mono text-[10px] text-white/0 transition-all duration-300 group-hover:translate-y-0 group-hover:text-white/45">
              {project.tolerance} · {project.thickness}
            </div>
          </div>

          <div className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-base leading-tight text-white">{project.title}</h3>
              <span className="mt-1 flex shrink-0 items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-white/45">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: project.status === "Delivered" ? "#34d399" : project.status === "In production" ? "#f59e0b" : "#5aa9ff" }}
                />
                {project.status}
              </span>
            </div>
            <p className="line-clamp-2 text-sm text-white/50">{project.summary}</p>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 border-t border-white/8 pt-3 font-mono text-[10px] uppercase tracking-[0.12em]">
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

export default ProjectCard;
