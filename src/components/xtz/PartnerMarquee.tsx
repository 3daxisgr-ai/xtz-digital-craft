// Slow, seamless, infinite partner strip.
//
// Motion runs in one requestAnimationFrame loop that writes a transform to the
// track directly — no React re-render per frame. The strip pauses on hover,
// keyboard focus, while dragging, when off-screen or the tab is hidden, and
// never auto-scrolls for visitors who prefer reduced motion.
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Client, ClientProject } from "./clients";
import { LogoPlate } from "./LogoPlate";

type Lang = "EN" | "GR";

const SPEED = 28; // px per second
const STEP = 260; // px per arrow press
const DRAG_THRESHOLD = 6;

type Item =
  | { kind: "partner"; key: string; client: Client }
  | { kind: "project"; key: string; client: Client; project: ClientProject };

export function PartnerMarquee({
  clients,
  L,
  activeId,
  onPartner,
  onProject,
}: {
  clients: Client[];
  L: Lang;
  activeId: string;
  onPartner: (c: Client) => void;
  onProject: (c: Client, p: ClientProject) => void;
}) {
  const items: Item[] = clients.flatMap((c) => [
    { kind: "partner" as const, key: c.id, client: c },
    ...(c.projects ?? []).map((p) => ({ kind: "project" as const, key: `${c.id}:${p.id}`, client: c, project: p })),
  ]);

  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const setRef = useRef<HTMLUListElement>(null);
  const [copies, setCopies] = useState(2);
  const st = useRef({
    x: 0,
    setW: 0,
    hover: false,
    focus: false,
    down: false,
    dragging: false,
    suppressClick: false,
    startX: 0,
    startOff: 0,
    pointerId: -1,
    visible: true,
    reduced: false,
    tween: null as null | { from: number; to: number; t0: number; dur: number },
    raf: 0,
    last: 0,
  });

  const render = useCallback(() => {
    const s = st.current;
    const el = trackRef.current;
    if (!el || s.setW <= 0) return;
    const w = s.setW;
    const x = (((s.x % w) + w) % w) - w; // always in (-w, 0]
    el.style.transform = `translate3d(${x}px,0,0)`;
  }, []);

  const tick = useCallback(
    (now: number) => {
      const s = st.current;
      const dt = s.last ? Math.min((now - s.last) / 1000, 0.05) : 0;
      s.last = now;
      if (s.tween) {
        const t = Math.min(1, (now - s.tween.t0) / s.tween.dur);
        const e = 1 - Math.pow(1 - t, 3);
        s.x = s.tween.from + (s.tween.to - s.tween.from) * e;
        if (t >= 1) s.tween = null;
      } else if (!s.hover && !s.focus && !s.down && !s.reduced) {
        s.x -= SPEED * dt;
      }
      if (!s.tween && s.setW > 0 && Math.abs(s.x) > s.setW * 4) s.x %= s.setW;
      render();
      s.raf = requestAnimationFrame(tick);
    },
    [render],
  );

  const start = useCallback(() => {
    const s = st.current;
    if (s.raf || !s.visible || document.hidden) return;
    s.last = 0;
    s.raf = requestAnimationFrame(tick);
  }, [tick]);

  const stop = useCallback(() => {
    const s = st.current;
    if (s.raf) cancelAnimationFrame(s.raf);
    s.raf = 0;
  }, []);

  // Measure one set; render enough copies to always cover the viewport.
  useEffect(() => {
    const vp = viewportRef.current;
    const set = setRef.current;
    if (!vp || !set) return;
    const measure = () => {
      const w = set.getBoundingClientRect().width;
      st.current.setW = w;
      if (w > 0) setCopies(Math.max(2, Math.ceil(vp.clientWidth / w) + 1));
      render();
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(vp);
    ro.observe(set);
    return () => ro.disconnect();
  }, [render, items.length]);

  // Reduced motion, visibility and off-screen pausing.
  useEffect(() => {
    const s = st.current;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMq = () => { s.reduced = mq.matches; };
    onMq();
    mq.addEventListener("change", onMq);
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);
    const io = new IntersectionObserver(([e]) => {
      s.visible = e.isIntersecting;
      if (s.visible) start();
      else stop();
    });
    if (viewportRef.current) io.observe(viewportRef.current);
    start();
    return () => {
      mq.removeEventListener("change", onMq);
      document.removeEventListener("visibilitychange", onVis);
      io.disconnect();
      stop();
    };
  }, [start, stop]);

  const nudge = (dir: 1 | -1) => {
    const s = st.current;
    const from = s.x;
    s.tween = { from, to: from - dir * STEP, t0: performance.now(), dur: s.reduced ? 1 : 520 };
    start();
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const s = st.current;
    s.down = true;
    s.dragging = false;
    s.tween = null;
    s.startX = e.clientX;
    s.startOff = s.x;
    s.pointerId = e.pointerId;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const s = st.current;
    if (!s.down || e.pointerId !== s.pointerId) return;
    const dx = e.clientX - s.startX;
    if (!s.dragging && Math.abs(dx) > DRAG_THRESHOLD) {
      s.dragging = true;
      viewportRef.current?.setPointerCapture(e.pointerId);
    }
    if (s.dragging) {
      s.x = s.startOff + dx;
      render();
    }
  };
  const endDrag = (e: React.PointerEvent) => {
    const s = st.current;
    if (e.pointerId !== s.pointerId) return;
    if (s.dragging) s.suppressClick = true;
    s.down = false;
    s.dragging = false;
    s.pointerId = -1;
    if (viewportRef.current?.hasPointerCapture(e.pointerId)) viewportRef.current.releasePointerCapture(e.pointerId);
  };

  const label = (it: Item) =>
    it.kind === "partner"
      ? `${it.client.name} — ${L === "GR" ? "δείτε τη συνεργασία" : "view collaboration"}`
      : `${it.client.name}: ${it.project.title[L]}`;

  const renderSet = (copy: number) => (
    <ul
      key={copy}
      ref={copy === 0 ? setRef : undefined}
      aria-hidden={copy > 0 || undefined}
      className="flex shrink-0 items-center gap-6 pr-6 md:gap-10 md:pr-10"
    >
      {items.map((it) => (
        <li key={it.key} className="shrink-0">
          <button
            type="button"
            tabIndex={copy > 0 ? -1 : undefined}
            aria-label={label(it)}
            onClick={() => (it.kind === "partner" ? onPartner(it.client) : onProject(it.client, it.project))}
            className={`group block rounded-lg p-1 transition-[opacity,box-shadow] duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none ${
              it.client.id === activeId ? "opacity-100 ring-1 ring-primary/60" : "opacity-60 hover:opacity-100"
            }`}
          >
            {it.kind === "partner" ? (
              <LogoPlate client={it.client} className="h-12 md:h-14" />
            ) : (
              <span className="flex h-12 items-center gap-3 rounded-md border border-border/60 bg-card/60 pr-4 md:h-14">
                <img
                  src={it.project.photos[0]?.src}
                  alt=""
                  draggable={false}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-9 rounded-l-md object-cover md:w-11"
                />
                <span className="flex flex-col text-left leading-tight">
                  <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-primary">{it.client.name}</span>
                  <span className="max-w-[12rem] truncate text-xs text-foreground/85 md:text-sm">{it.project.title[L]}</span>
                </span>
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => nudge(-1)}
        aria-label={L === "GR" ? "Προηγούμενος" : "Previous"}
        className="shrink-0 rounded-full border border-border/60 p-3 transition-colors hover:border-primary hover:text-primary"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div
        ref={viewportRef}
        role="region"
        aria-label={L === "GR" ? "Συνεργάτες" : "Partners"}
        className="relative min-w-0 flex-1 cursor-grab touch-pan-y select-none overflow-hidden py-1 active:cursor-grabbing [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)]"
        onPointerEnter={(e) => { if (e.pointerType === "mouse") st.current.hover = true; }}
        onPointerLeave={(e) => { if (e.pointerType === "mouse") st.current.hover = false; }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onFocus={() => { st.current.focus = true; }}
        onBlur={() => { st.current.focus = false; }}
        onClickCapture={(e) => {
          if (st.current.suppressClick) {
            st.current.suppressClick = false;
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        onDragStart={(e) => e.preventDefault()}
      >
        <div ref={trackRef} className="flex w-max will-change-transform">
          {Array.from({ length: copies }, (_, c) => renderSet(c))}
        </div>
      </div>
      <button
        type="button"
        onClick={() => nudge(1)}
        aria-label={L === "GR" ? "Επόμενος" : "Next"}
        className="shrink-0 rounded-full border border-border/60 p-3 transition-colors hover:border-primary hover:text-primary"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
