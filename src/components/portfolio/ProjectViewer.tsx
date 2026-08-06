// Cinematic fullscreen project viewer: 3D stage + engineering data + timeline.
import { lazy, Suspense, useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link } from "@tanstack/react-router";
import {
  X, RotateCcw, Boxes, Grid3x3, Box, Scissors, RefreshCw, Maximize2, Sun,
  ChevronLeft, ChevronRight, Download,
} from "lucide-react";
import { STAGES, type Project } from "./projects";

const ModelStage = lazy(() => import("./ModelStage"));

function Toggle({
  active, onClick, icon: Icon, label,
}: { active?: boolean; onClick: () => void; icon: typeof Box; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-pressed={active}
      className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors ${
        active
          ? "border-[#5aa9ff]/60 bg-[#5aa9ff]/15 text-[#9cccff]"
          : "border-white/10 bg-white/[0.03] text-white/50 hover:border-white/25 hover:text-white/80"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function Spec({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2">
      <dt className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/30">{k}</dt>
      <dd className="mt-0.5 text-sm text-white/80">{v}</dd>
    </div>
  );
}

export function ProjectViewer({
  project, onClose, onPrev, onNext,
}: { project: Project; onClose: () => void; onPrev: () => void; onNext: () => void }) {
  const reduced = useReducedMotion();
  const [exploded, setExploded] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [section, setSection] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [bright, setBright] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, onPrev, onNext]);

  return (
    <motion.div
      className="fixed inset-0 z-[80] overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={{ background: "rgba(6,9,13,0.86)", backdropFilter: "blur(18px)" }}
    >
      <motion.div
        initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 180, damping: 24 }}
        className="mx-auto min-h-full w-full max-w-[1500px] px-3 py-4 sm:px-6 sm:py-8"
      >
        <div className="overflow-hidden rounded-2xl border border-white/10" style={{ background: "linear-gradient(165deg,rgba(16,22,30,0.96),rgba(11,15,20,0.98))" }}>
          {/* header */}
          <div className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
            <div className="min-w-0">
              <div className="font-mono text-[10px] tracking-[0.24em] text-[#5aa9ff]">{project.fileKind} · {project.fileName}</div>
              <h2 className="truncate font-display text-lg text-white sm:text-2xl">{project.title}</h2>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button type="button" onClick={onPrev} className="rounded-lg border border-white/10 p-2 text-white/60 hover:text-white" aria-label="Previous project"><ChevronLeft className="h-4 w-4" /></button>
              <button type="button" onClick={onNext} className="rounded-lg border border-white/10 p-2 text-white/60 hover:text-white" aria-label="Next project"><ChevronRight className="h-4 w-4" /></button>
              <button type="button" onClick={onClose} className="rounded-lg border border-white/10 p-2 text-white/60 hover:text-white" aria-label="Close viewer"><X className="h-4 w-4" /></button>
            </div>
          </div>

          <div className="grid gap-0 lg:grid-cols-[1.35fr_1fr]">
            {/* left: 3D */}
            <div className="border-white/8 lg:border-r">
              <div className="relative h-[46vh] min-h-[320px] lg:h-[62vh]">
                {mounted ? (
                  <Suspense fallback={<div className="flex h-full items-center justify-center font-mono text-[10px] tracking-[0.3em] text-white/30">LOADING MODEL…</div>}>
                    <ModelStage
                      parts={project.parts}
                      exploded={exploded}
                      wireframe={wireframe}
                      section={section}
                      autoRotate={autoRotate}
                      showGrid={showGrid}
                      brightLighting={bright}
                      accent={project.accent}
                      resetSignal={resetSignal}
                      reducedMotion={!!reduced}
                    />
                  </Suspense>
                ) : null}
                <div className="pointer-events-none absolute left-3 top-3 font-mono text-[10px] tracking-[0.24em] text-white/30">
                  ORBIT · PAN · ZOOM
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 border-t border-white/8 p-3">
                <Toggle icon={RotateCcw} label="Reset" onClick={() => setResetSignal((s) => s + 1)} />
                <Toggle icon={Boxes} label="Exploded" active={exploded} onClick={() => setExploded((v) => !v)} />
                <Toggle icon={Grid3x3} label="Wireframe" active={wireframe} onClick={() => setWireframe((v) => !v)} />
                <Toggle icon={Box} label="Solid" active={!wireframe && !section} onClick={() => { setWireframe(false); setSection(false); }} />
                <Toggle icon={Scissors} label="Section" active={section} onClick={() => setSection((v) => !v)} />
                <Toggle icon={RefreshCw} label="Auto rotate" active={autoRotate} onClick={() => setAutoRotate((v) => !v)} />
                <Toggle icon={Grid3x3} label="Grid" active={showGrid} onClick={() => setShowGrid((v) => !v)} />
                <Toggle icon={Sun} label="Lighting" active={bright} onClick={() => setBright((v) => !v)} />
                <Toggle
                  icon={Maximize2}
                  label="Fullscreen"
                  onClick={() => {
                    const el = document.documentElement;
                    if (document.fullscreenElement) document.exitFullscreen();
                    else el.requestFullscreen?.();
                  }}
                />
              </div>
            </div>

            {/* right: info */}
            <div className="relative flex flex-col">
              <div className="space-y-5 p-5">
                <p className="text-sm leading-relaxed text-white/60">{project.description}</p>

                <dl className="grid grid-cols-2 gap-2">
                  <Spec k="Industry" v={project.industry} />
                  <Spec k="Process" v={project.process} />
                  <Spec k="Material" v={project.material} />
                  <Spec k="Thickness" v={project.thickness} />
                  <Spec k="Weight" v={project.weight} />
                  <Spec k="Technology" v={project.technology} />
                  <Spec k="Software" v={project.software} />
                  <Spec k="Machines" v={project.machine} />
                  <Spec k="Lead time" v={project.leadTime} />
                  <Spec k="Tolerance" v={project.tolerance} />
                  <Spec k="Surface finish" v={project.finish} />
                  <Spec k="Completed" v={String(project.year)} />
                </dl>

                <div>
                  <div className="font-mono text-[9px] uppercase tracking-[0.24em] text-white/30">Gallery</div>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-16 rounded-lg border border-white/8"
                        style={{
                          backgroundImage:
                            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
                          backgroundSize: "14px 14px",
                          boxShadow: `inset 0 0 40px ${project.accent}22`,
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {project.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-white/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-white/45">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="sticky bottom-0 mt-auto flex gap-2 border-t border-white/8 bg-[#0B0F14]/90 p-4 backdrop-blur">
                <Link
                  to="/request"
                  className="flex-1 rounded-lg bg-[#5aa9ff] px-4 py-3 text-center font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-[#06121f] transition-opacity hover:opacity-90"
                >
                  Upload CAD &amp; Request a Quote
                </Link>
                <button
                  type="button"
                  disabled
                  title="Source files are shared under NDA on request"
                  className="flex cursor-not-allowed items-center gap-2 rounded-lg border border-white/10 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-white/25"
                >
                  <Download className="h-3.5 w-3.5" /> Files
                </button>
              </div>
            </div>
          </div>

          {/* manufacturing timeline */}
          <div className="border-t border-white/8 px-5 py-5">
            <div className="font-mono text-[9px] uppercase tracking-[0.28em] text-white/30">Manufacturing route</div>
            <div className="mt-4 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {STAGES.map((stage, i) => {
                const done = i <= project.stage;
                return (
                  <div key={stage} className="flex shrink-0 items-center gap-2">
                    <div
                      className="rounded-lg border px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors"
                      style={{
                        borderColor: done ? "#5aa9ff66" : "rgba(255,255,255,0.08)",
                        color: done ? "#9cccff" : "rgba(255,255,255,0.3)",
                        background: done ? "rgba(90,169,255,0.10)" : "transparent",
                        boxShadow: done ? "0 0 22px rgba(90,169,255,0.18)" : "none",
                      }}
                    >
                      {stage}
                    </div>
                    {i < STAGES.length - 1 && <div className="h-px w-4 bg-white/10" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function ProjectViewerHost({
  project, onClose, onPrev, onNext,
}: { project: Project | null; onClose: () => void; onPrev: () => void; onNext: () => void }) {
  return (
    <AnimatePresence>
      {project && <ProjectViewer key={project.slug} project={project} onClose={onClose} onPrev={onPrev} onNext={onNext} />}
    </AnimatePresence>
  );
}

export default ProjectViewerHost;
