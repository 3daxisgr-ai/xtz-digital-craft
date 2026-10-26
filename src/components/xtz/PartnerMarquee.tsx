// Slow, seamless, infinite partner strip.
//
// Motion runs in one requestAnimationFrame loop that writes a transform to the
// track directly — no React re-render per frame. The strip pauses on hover,
// keyboard focus, while dragging, when off-screen or the tab is hidden, and
// never auto-scrolls for visitors who prefer reduced motion.
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Client } from "./clients";
import { LogoPlate } from "./LogoPlate";

type Lang = "EN" | "GR";

const SPEED = 28; // px per second
const STEP = 260; // px per arrow press
const DRAG_THRESHOLD = 6;

export function PartnerMarquee({
  clients,
  L,
  onPartner,
}: {
  clients: Client[];
  L: Lang;
  onPartner: (c: Client) => void;
}) {
  const items = clients;

  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const setRef = useRef<HTMLUListElement>(null);
  const [copies, setCopies] = useState(2);
  const [stopped, setStopped] = useState(false); // drives the hint text only
  const st = useRef({
    x: 0,
    setW: 0,
    hover: false,
    focus: false,
    down: false,
    dragging: false,
    suppressClick: false,
    tapPaused: false, // first click/tap stops the strip; the next one on a logo opens it
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
      } else if (!s.hover && !s.focus && !s.down && !s.tapPaused && !s.reduced) {
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
    const onMq = () => {
      s.reduced = mq.matches;
    };
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
    if (viewportRef.current?.hasPointerCapture(e.pointerId))
      viewportRef.current.releasePointerCapture(e.pointerId);
  };

  const renderSet = (copy: number) => (
    <ul
      key={copy}
      ref={copy === 0 ? setRef : undefined}
      aria-hidden={copy > 0 || undefined}
      className="flex shrink-0 items-center gap-6 pr-6 md:gap-10 md:pr-10"
    >
      {items.map((c) => (
        <li key={c.id} className="shrink-0">
          <button
            type="button"
            tabIndex={copy > 0 ? -1 : undefined}
            aria-label={`${c.name} — ${L === "GR" ? "δείτε τη συνεργασία" : "view collaboration"}`}
            onClick={() => {
              // Opening resumes the strip, so it is moving again when the card closes.
              st.current.tapPaused = false;
              setStopped(false);
              onPartner(c);
            }}
            className={`group block rounded-lg p-1 transition-[opacity,box-shadow] duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary motion-reduce:transition-none ${
              stopped
                ? "opacity-100 hover:ring-1 hover:ring-primary/60"
                : "opacity-60 hover:opacity-100"
            }`}
          >
            <LogoPlate client={c} className="h-12 md:h-14" />
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div>
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
          onPointerEnter={(e) => {
            if (e.pointerType === "mouse") st.current.hover = true;
          }}
          onPointerLeave={(e) => {
            if (e.pointerType === "mouse") st.current.hover = false;
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          // Only keyboard focus pauses; a tap also focuses the button and must not.
          onFocus={(e) => {
            st.current.focus = (e.target as HTMLElement).matches(":focus-visible");
          }}
          onBlur={() => {
            st.current.focus = false;
          }}
          onClickCapture={(e) => {
            const s = st.current;
            if (s.suppressClick) {
              s.suppressClick = false;
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            if (e.detail === 0) return; // keyboard Enter/Space opens directly
            if (!s.tapPaused) {
              // First click/tap: stop right here, open nothing.
              s.tapPaused = true;
              setStopped(true);
              e.preventDefault();
              e.stopPropagation();
            } else if (!(e.target as HTMLElement).closest("button")) {
              // Second click on empty space: just restart.
              s.tapPaused = false;
              setStopped(false);
            }
            // Second click on a logo: the button's own handler opens the partner.
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
      <p
        aria-live="polite"
        className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground"
      >
        {stopped
          ? L === "GR"
            ? "Πατήστε ένα λογότυπο για να δείτε τη συνεργασία"
            : "Tap a logo to view the collaboration"
          : L === "GR"
            ? "Πατήστε για να σταματήσει η κίνηση"
            : "Tap to stop the strip"}
      </p>
    </div>
  );
}
