// Shared performance helpers for the portfolio WebGL scenes.
// - quality tier: picks DPR caps and which expensive passes to run
// - render gate: pauses a Canvas while it is off-screen, the tab is hidden,
//   or the caller asks (e.g. an overlay covers it), and resumes cleanly.
import { useEffect, useState, type RefObject } from "react";

export type Tier = "low" | "mid" | "high";

let cached: Tier | null = null;

export function qualityTier(): Tier {
  if (cached) return cached;
  if (typeof window === "undefined") return "mid";
  const nav = navigator as Navigator & { deviceMemory?: number };
  const cores = nav.hardwareConcurrency ?? 4;
  const mem = nav.deviceMemory ?? 8;
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const small = window.innerWidth < 768;
  if ((coarse && small) || cores <= 4 || mem <= 4) cached = coarse || cores <= 2 ? "low" : "mid";
  else cached = "high";
  return cached;
}

/** DPR cap per tier, never above the caller's own cap. */
export function dprFor(tier: Tier, cap: [number, number] = [1, 1.75]): [number, number] {
  const max = tier === "low" ? 1 : tier === "mid" ? 1.25 : 1.6;
  return [Math.min(cap[0], max), Math.min(cap[1], max)];
}

/** true while the element is on-screen, the tab is visible and not paused. */
export function useRenderActive(ref: RefObject<Element | null>, paused = false) {
  const [onScreen, setOnScreen] = useState(true);
  const [tabVisible, setTabVisible] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.01 });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);

  useEffect(() => {
    const on = () => setTabVisible(document.visibilityState !== "hidden");
    on();
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);

  return onScreen && tabVisible && !paused;
}

/** Clamp frame delta so a resumed loop never jumps. */
export const clampDelta = (d: number) => Math.min(d, 1 / 20);
