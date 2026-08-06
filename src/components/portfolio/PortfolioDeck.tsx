// Cinematic horizontal portfolio deck — one project per viewport, wheel /
// keyboard / swipe driven, spring-animated Apple-style transitions.
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { RotateCcw, Grid3x3, Boxes, Maximize2, ChevronLeft, ChevronRight } from "lucide-react";
import { BlueprintBackground } from "./BlueprintBackground";
import type { Project } from "./projects";

const ModelStage = lazy(() => import("./ModelStage"));

const SPRING = { type: "spring", stiffness: 90, damping: 20, mass: 1.1 } as const;
const SOFT = { type: "spring", stiffness: 120, damping: 22 } as const;

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="border-b border-white/8 pb-2">
      <div className="font-mono text-[9px] uppercase tracking-[0.22em] text-white/30">{k}</div>
      <div className="mt-1 text-sm text-white/80">{v}</div>
    </div>
  );
}

function Ctrl({ active, onClick, icon: Icon, label }: { active?: boolean; onClick: () => void; icon: typeof Boxes; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-pressed={active}
      className={`flex items-center gap-2 rounded-full border px-3 py-2 font-mono text-[9px] uppercase tracking-[0.18em] backdrop-blur transition-colors ${
        active
          ? "border-[#5aa9ff]/60 bg-[#5aa9ff]/15 text-[#9cccff]"
          : "border-white/12 bg-white/[0.04] text-white/50 hover:border-white/30 hover:text-white/85"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden md:inline">{label}</span>
    </button>
  );
}

export function PortfolioDeck({
  projects,
  onOpenDetails,
}: {
  projects: Project[];
  onOpenDetails: (p: Project) => void;
}) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [wireframe, setWireframe] = useState(false);
  const [exploded, setExploded] = useState(false);
  const [assembling, setAssembling] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [mounted, setMounted] = useState(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const lock = useRef(0);
  const wheelAcc = useRef(0);
  const touchX = useRef<number | null>(null);

  const project = projects[Math.min(index, projects.length - 1)];

  useEffect(() => setMounted(true), []);

  const go = useCallback(
    (d: 1 | -1) => {
      const now = performance.now();
      if (now < lock.current) return;
      lock.current = now + 950;
      setDir(d);
      setExploded(false);
      setAssembling(true);
      setIndex((i) => (i + d + projects.length) % projects.length);
    },
    [projects.length],
  );

  const jump = useCallback(
    (target: number) => {
      if (target === index) return;
      const now = performance.now();
      if (now < lock.current) return;
      lock.current = now + 950;
      setDir(target > index ? 1 : -1);
      setExploded(false);
      setAssembling(true);
      setIndex(target);
    },
    [index],
  );

  // new model assembles from an exploded state, then settles
  useEffect(() => {
    if (!assembling) return;
    const t = window.setTimeout(() => setAssembling(false), 420);
    return () => window.clearTimeout(t);
  }, [assembling, index]);

  // vertical wheel drives horizontal navigation (non-passive)
  useEffect(() => {
    const el = shellRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement | null)?.closest("[data-deck-scroll]")) return;
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const dx = e.deltaX * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
      wheelAcc.current += delta;
      if (Math.abs(wheelAcc.current) > 60) {
        go(wheelAcc.current > 0 ? 1 : -1);
        wheelAcc.current = 0;
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [go]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const enter = reduced
    ? { opacity: 0 }
    : { opacity: 0, x: dir * 320, rotateY: dir * 16, scale: 0.82, filter: "blur(6px)" };
  const exit = reduced
    ? { opacity: 0 }
    : { opacity: 0, x: -dir * 320, rotateY: -dir * 16, scale: 0.86, filter: "blur(8px)" };

  return (
    <div
      ref={shellRef}
      className="relative h-[100svh] w-full overflow-hidden overscroll-none"
      style={{ backgroundColor: "#0B0F14" }}
      onTouchStart={(e) => {
        touchX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchX.current;
        const end = e.changedTouches[0]?.clientX;
        touchX.current = null;
        if (start == null || end == null) return;
        if (Math.abs(end - start) > 55) go(end < start ? 1 : -1);
      }}
    >
      {/* blueprint backdrop cross-fade */}
      <AnimatePresence mode="sync">
        <motion.div
          key={`bp-${project.slug}`}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        >
          <BlueprintBackground project={project} />
        </motion.div>
      </AnimatePresence>

      {/* hero model */}
      <div className="absolute inset-0 flex items-center justify-center" style={{ perspective: 1400 }}>
        <AnimatePresence mode="sync" initial={false}>
          <motion.div
            key={`model-${project.slug}`}
            className="absolute h-[58vh] w-full max-w-[900px] sm:h-[72vh] lg:translate-x-[9%]"
            initial={enter}
            animate={{ opacity: 1, x: 0, rotateY: 0, scale: 1, filter: "blur(0px)" }}
            exit={exit}
            transition={reduced ? { duration: 0.2 } : SPRING}
          >
            {mounted && (
              <Suspense fallback={null}>
                <ModelStage
                  parts={project.parts}
                  exploded={exploded || assembling}
                  wireframe={wireframe}
                  section={false}
                  autoRotate
                  showGrid={false}
                  brightLighting={false}
                  accent={project.accent}
                  resetSignal={resetSignal}
                  reducedMotion={!!reduced}
                  dpr={[1, 1.5]}
                  transparent
                />
              </Suspense>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* left: identity */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 top-0 flex items-end sm:items-center">
        <AnimatePresence mode="sync" initial={false}>
          <motion.div
            key={`left-${project.slug}`}
            className="pointer-events-auto absolute left-4 w-[min(92vw,360px)] sm:left-10 lg:left-14"
            initial={reduced ? { opacity: 0 } : { opacity: 0, x: dir * 70 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, x: -dir * 70 }}
            transition={{ ...SOFT, delay: 0.05 }}
            style={{ bottom: undefined }}
          >
            <div className="font-mono text-[10px] tracking-[0.34em] text-[#5aa9ff]">
              {project.fileKind} · {project.fileName}
            </div>
            <h2 className="mt-3 font-display text-3xl leading-[1.05] text-white sm:text-5xl">{project.title}</h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/50">{project.summary}</p>

            <div className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3">
              <Stat k="Material" v={project.material} />
              <Stat k="Process" v={project.process} />
              <Stat k="Software" v={project.software} />
              <Stat k="Year" v={String(project.year)} />
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onOpenDetails(project)}
                className="rounded-full border border-white/15 bg-white/[0.05] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-white/80 backdrop-blur transition-colors hover:border-white/40 hover:text-white"
              >
                View Details
              </button>
              <Link
                to="/request"
                className="rounded-full bg-[#5aa9ff] px-5 py-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#06121f] transition-opacity hover:opacity-90"
              >
                Request Quote
              </Link>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* right: engineering specs */}
      <div className="pointer-events-none absolute inset-y-0 right-16 hidden items-center lg:flex">
        <AnimatePresence mode="sync" initial={false}>
          <motion.div
            key={`right-${project.slug}`}
            className="absolute right-0 w-[220px]"
            initial={reduced ? { opacity: 0 } : { opacity: 0, x: dir * 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, x: -dir * 50 }}
            transition={{ ...SOFT, delay: 0.12 }}
          >
            <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/25">Specifications</div>
            <div className="mt-4 space-y-3">
              <Stat k="Weight" v={project.weight} />
              <Stat k="Thickness" v={project.thickness} />
              <Stat k="Tolerance" v={project.tolerance} />
              <Stat k="Machine" v={project.machine} />
              <Stat k="Finish" v={project.finish} />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* navigation dots */}
      <div className="absolute right-4 top-1/2 z-20 hidden -translate-y-1/2 flex-col items-center gap-3 sm:flex">
        {projects.map((p, i) => (
          <button
            key={p.slug}
            type="button"
            onClick={() => jump(i)}
            aria-label={`Go to ${p.title}`}
            aria-current={i === index}
            className="group relative flex h-3 w-3 items-center justify-center"
          >
            <span
              className="block rounded-full transition-all duration-500"
              style={{
                width: i === index ? 10 : 5,
                height: i === index ? 10 : 5,
                background: i === index ? project.accent : "rgba(255,255,255,0.28)",
                boxShadow: i === index ? `0 0 14px ${project.accent}` : "none",
              }}
            />
          </button>
        ))}
      </div>

      {/* model controls */}
      <div className="absolute bottom-24 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        <Ctrl icon={RotateCcw} label="Reset" onClick={() => setResetSignal((s) => s + 1)} />
        <Ctrl icon={Grid3x3} label="Wireframe" active={wireframe} onClick={() => setWireframe((v) => !v)} />
        <Ctrl icon={Boxes} label="Exploded" active={exploded} onClick={() => setExploded((v) => !v)} />
        <Ctrl
          icon={Maximize2}
          label="Fullscreen"
          onClick={() => {
            if (document.fullscreenElement) document.exitFullscreen();
            else shellRef.current?.requestFullscreen?.();
          }}
        />
      </div>

      {/* progress */}
      <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between gap-4 px-4 pb-6 sm:px-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous project"
            className="rounded-full border border-white/12 p-2 text-white/50 backdrop-blur transition-colors hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next project"
            className="rounded-full border border-white/12 p-2 text-white/50 backdrop-blur transition-colors hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/30">
            Scroll · drag · ← →
          </span>
        </div>

        <div className="flex flex-1 items-center gap-4">
          <div className="relative h-px flex-1 bg-white/10">
            <motion.div
              className="absolute left-0 top-0 h-px"
              style={{ background: project.accent }}
              animate={{ width: `${((index + 1) / projects.length) * 100}%` }}
              transition={SOFT}
            />
          </div>
          <div className="font-mono text-[11px] tracking-[0.24em] text-white/60">
            {String(index + 1).padStart(2, "0")} <span className="text-white/25">/ {String(projects.length).padStart(2, "0")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PortfolioDeck;
