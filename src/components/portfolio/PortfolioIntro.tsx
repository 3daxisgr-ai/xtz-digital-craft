// Cinematic CAD intro: a live engineering drawing that becomes a real part.
//
// Act I  (0.0–3.3s)  the sheet is drafted live — construction lines, outlines,
//                    hidden lines, centre lines, dimensions, callouts, section
//                    hatching, detail circle, title block (2D canvas engine).
// Act II (2.95–4.2s) the drawing dissolves as the part extrudes out of the
//                    sheet plane in real depth: no cut, no pop, one continuous
//                    move with the camera already on the front elevation.
// Act III(4.2–8.8s)  product-film beat — the assembly breaks apart along curved
//                    3D paths, the camera drifts around it, the parts spring
//                    home with weight, and it settles on the hero angle.
//
// Everything after mount is driven by a shared clock object inside useFrame /
// rAF. React never re-renders during playback.
import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, ContactShadows } from "@react-three/drei";
import { EffectComposer, SSAO, SMAA, Vignette, Bloom } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import { BlueprintDraft } from "./BlueprintDraft";
import { createFinishMaterial, type FinishKey } from "./materials";

const SCENE_T0 = 2950; // ms — when the 3D part starts extruding out of the sheet
const DURATION = 8850;
const FADE_AT = 8420;

type IntroPart = {
  geom: () => THREE.BufferGeometry;
  home: [number, number, number];
  rot?: [number, number, number];
  /** direction + distance the part travels when the assembly breaks apart */
  blow: [number, number, number];
  /** perpendicular bow of the flight path (arc, never a straight translate) */
  bow: [number, number, number];
  spin: [number, number, number];
  finish: FinishKey;
  /** heavier parts accelerate slower and settle later */
  mass: number;
  delay: number;
};

/** The bracket from the drawing — plate, ribs, gusset, boss, collar, bolts. */
function buildParts(): IntroPart[] {
  const bolts: IntroPart[] = [-1, 1].flatMap((sx) =>
    [-1, 1].map((sz, i) => ({
      geom: () => new THREE.CylinderGeometry(0.16, 0.16, 0.38, 40),
      home: [sx * 1.55, -0.72, sz * 0.78] as [number, number, number],
      blow: [sx * 2.8, -2.0, sz * 2.4] as [number, number, number],
      bow: [0, 1.7, sx * 0.9] as [number, number, number],
      spin: [Math.PI * 1.4 * sx, Math.PI * 2.2, 0] as [number, number, number],
      finish: "steel" as FinishKey,
      mass: 0.55,
      delay: 0.02 * i + (sx > 0 ? 0.05 : 0),
    })),
  );

  return [
    {
      geom: () => new THREE.BoxGeometry(4.2, 0.34, 2.4),
      home: [0, -0.9, 0],
      blow: [0, -2.6, 0],
      bow: [0.9, 0, 0.6],
      spin: [0.18, 0.5, -0.12],
      finish: "aluminum",
      mass: 2.4,
      delay: 0,
    },
    {
      geom: () => new THREE.BoxGeometry(0.34, 2.6, 2.2),
      home: [-1.6, 0.6, 0],
      blow: [-3.6, 1.2, -0.5],
      bow: [0, 1.6, 1.5],
      spin: [0.3, -0.9, 0.4],
      finish: "black",
      mass: 1.5,
      delay: 0.08,
    },
    {
      geom: () => new THREE.BoxGeometry(0.3, 2.2, 1.6),
      home: [1.55, 0.4, 0],
      blow: [3.5, 0.9, 0.7],
      bow: [0, 1.9, -1.4],
      spin: [-0.25, 1.1, -0.35],
      finish: "black",
      mass: 1.35,
      delay: 0.12,
    },
    {
      geom: () => new THREE.CylinderGeometry(0.78, 0.78, 0.26, 3),
      home: [-1.05, 0.32, 0],
      rot: [Math.PI / 2, 0, Math.PI / 6],
      blow: [-1.1, 2.9, -2.0],
      bow: [1.8, 0, 1.2],
      spin: [1.1, 0.6, 0.8],
      finish: "aluminum",
      mass: 1.0,
      delay: 0.18,
    },
    {
      geom: () => new THREE.CylinderGeometry(0.62, 0.62, 1.25, 72),
      home: [0.9, 0.35, 0],
      rot: [Math.PI / 2, 0, 0],
      blow: [1.4, 2.1, 2.8],
      bow: [-1.6, 0.6, 0],
      spin: [0.9, 1.8, 0.2],
      finish: "brass",
      mass: 0.9,
      delay: 0.24,
    },
    {
      geom: () => new THREE.TorusGeometry(0.86, 0.12, 32, 128),
      home: [0.9, 0.35, 0],
      rot: [Math.PI / 2, 0, 0],
      blow: [1.8, -1.4, 3.0],
      bow: [-1.2, -1.4, 0],
      spin: [1.6, 0.4, 1.2],
      finish: "steel",
      mass: 0.5,
      delay: 0.3,
    },
    ...bolts,
  ];
}

/** Spring integrator — mass, stiffness and damping per part (weight/inertia). */
class Spring {
  value = 0;
  velocity = 0;
  target = 0;
  constructor(
    private stiffness: number,
    private damping: number,
    private mass: number,
  ) {}
  step(dt: number) {
    const steps = Math.min(6, Math.max(1, Math.ceil(dt / 0.008)));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      const a = (this.stiffness * (this.target - this.value) - this.damping * this.velocity) / this.mass;
      this.velocity += a * h;
      this.value += this.velocity * h;
    }
    return this.value;
  }
}

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function easeInOut(x: number) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function PartMesh({ part, index, clock }: { part: IntroPart; index: number; clock: { t: number } }) {
  const ref = useRef<THREE.Mesh>(null);
  const geom = useMemo(() => part.geom(), [part]);
  const material = useMemo(
    () => createFinishMaterial(part.finish, { transparent: true, opacity: 0 }),
    [part],
  );
  useEffect(
    () => () => {
      geom.dispose();
      material.dispose();
    },
    [geom, material],
  );

  const home = useMemo(() => new THREE.Vector3(...part.home), [part]);
  const away = useMemo(
    () => new THREE.Vector3(...part.home).add(new THREE.Vector3(...part.blow)),
    [part],
  );
  // Curved flight path so no two parts ever travel through each other.
  const curve = useMemo(() => {
    const mid = home.clone().lerp(away, 0.5).add(new THREE.Vector3(...part.bow));
    return new THREE.QuadraticBezierCurve3(home.clone(), mid, away.clone());
  }, [home, away, part]);

  const spring = useMemo(
    () => new Spring(120 + 40 / part.mass, 17 + 6 * part.mass, part.mass),
    [part],
  );
  const birth = useMemo(() => new Spring(90, 19, 1), []);
  const baseRot = useMemo(() => new THREE.Euler(...(part.rot ?? [0, 0, 0])), [part]);
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    const m = ref.current;
    if (!m) return;
    const dt = Math.min(delta, 1 / 30);
    const s = (clock.t - SCENE_T0) / 1000; // seconds inside the 3D act

    // ---- Act II: extrude out of the drawing plane with real depth
    const bt = clamp01((s - index * 0.055) / 0.9);
    birth.target = bt > 0 ? 1 : 0;
    const b = clamp01(birth.step(dt));
    material.opacity = clamp01(b * 1.25);
    material.transparent = material.opacity < 0.995;
    // the sheet is flat: parts grow their real thickness out of it
    m.scale.set(0.965 + 0.035 * b, 0.04 + 0.96 * b, 0.965 + 0.035 * b);

    // ---- Act III: explode / orbit / reassemble
    const open = s > 1.95 + part.delay && s < 4.35 + part.delay;
    spring.target = open ? 1 : 0;
    const p = THREE.MathUtils.clamp(spring.step(dt), -0.05, 1.12);

    curve.getPoint(THREE.MathUtils.clamp(p, 0, 1), tmp);
    if (p > 1) tmp.lerp(away.clone().add(away.clone().sub(home).setLength(0.6)), p - 1);
    // during birth the part still lies in the drawing plane
    tmp.y = THREE.MathUtils.lerp(tmp.y * 0.15 - 0.9, tmp.y, easeInOut(b));
    m.position.copy(tmp);

    m.rotation.set(
      baseRot.x + part.spin[0] * p,
      baseRot.y + part.spin[1] * p,
      baseRot.z + part.spin[2] * p,
    );
  });

  return (
    <mesh ref={ref} position={part.home} rotation={part.rot ?? [0, 0, 0]} castShadow receiveShadow>
      <primitive object={geom} attach="geometry" />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

/** Product-video camera: front elevation → slow reveal → hero three-quarter. */
function CameraRig({ clock }: { clock: { t: number } }) {
  const { camera } = useThree();
  const look = useMemo(() => new THREE.Vector3(0, 0.05, 0), []);
  const smoothed = useMemo(() => new THREE.Vector3(0.4, 0.9, 10.6), []);
  const desired = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    const s = (clock.t - SCENE_T0) / 1000;
    // keyframed spherical path — radius, azimuth, elevation (no sudden moves)
    const keys = [
      { t: -1.0, r: 10.6, a: 1.5708, e: 0.02 }, // locked to the drawing view
      { t: 0.9, r: 10.5, a: 1.49, e: 0.05 },
      { t: 1.9, r: 10.9, a: 1.24, e: 0.2 },
      { t: 2.9, r: 14.6, a: 0.98, e: 0.4 },
      { t: 3.9, r: 15.2, a: 0.66, e: 0.46 },
      { t: 4.7, r: 14.4, a: 0.34, e: 0.38 },
      { t: 5.4, r: 11.6, a: 0.06, e: 0.3 },
      { t: 6.2, r: 11.0, a: -0.16, e: 0.26 },
    ];
    let k0 = keys[0];
    let k1 = keys[keys.length - 1];
    for (let i = 0; i < keys.length - 1; i++) {
      if (s >= keys[i].t && s <= keys[i + 1].t) {
        k0 = keys[i];
        k1 = keys[i + 1];
        break;
      }
    }
    const span = Math.max(0.0001, k1.t - k0.t);
    const f = easeInOut(clamp01((s - k0.t) / span));
    const r = THREE.MathUtils.lerp(k0.r, k1.r, f);
    const a = THREE.MathUtils.lerp(k0.a, k1.a, f);
    const e = THREE.MathUtils.lerp(k0.e, k1.e, f);

    desired.set(r * Math.cos(e) * Math.cos(a), r * Math.sin(e) + 0.5, r * Math.cos(e) * Math.sin(a));
    smoothed.lerp(desired, 1 - Math.pow(0.000002, Math.min(delta, 0.25)));
    camera.position.copy(smoothed);
    camera.lookAt(look); // the model stays perfectly framed for the whole shot
  });
  return null;
}

function FirstFrame({ onReady }: { onReady: () => void }) {
  const fired = useRef(false);
  useFrame(() => {
    if (fired.current) return;
    fired.current = true;
    onReady();
  });
  return null;
}

/** Studio softbox rig built as an environment — no HDR download, instant. */
function StudioEnvironment() {
  return (
    <Environment resolution={512} frames={1} background={false}>
      <color attach="background" args={["#10151b"]} />
      {/* large soft key overhead */}
      <Lightformer form="rect" intensity={5} color="#ffffff" scale={[12, 7, 1]} position={[0, 7, 2]} rotation={[-Math.PI / 2, 0, 0]} />
      {/* fill from camera left */}
      <Lightformer form="rect" intensity={2.2} color="#dfeaf7" scale={[9, 6, 1]} position={[-9, 2.5, 4]} rotation={[0, Math.PI / 2, 0]} />
      {/* softer bounce from camera right */}
      <Lightformer form="rect" intensity={1.3} color="#cddcec" scale={[8, 5, 1]} position={[9, 1.5, -2]} rotation={[0, -Math.PI / 2, 0]} />
      {/* rim strip behind for the metal edge highlight */}
      <Lightformer form="rect" intensity={3.4} color="#f4f8ff" scale={[10, 1.6, 1]} position={[0, 3.5, -9]} rotation={[0, 0, 0]} />
      {/* subtle warm kicker so aluminium is not clinically grey */}
      <Lightformer form="circle" intensity={1.6} color="#ffe7c9" scale={[5, 5, 1]} position={[5, 5, 6]} rotation={[-0.6, 0.5, 0]} />
    </Environment>
  );
}

function Scene({ clock, onReady }: { clock: { t: number }; onReady: () => void }) {
  const parts = useMemo(buildParts, []);
  const { gl } = useThree();
  useEffect(() => {
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    gl.toneMappingExposure = 1.02;
  }, [gl]);

  return (
    <>
      <fog attach="fog" args={["#0B0F14", 20, 52]} />

      {/* physically plausible three-point rig on top of the environment */}
      <ambientLight intensity={0.16} />
      <directionalLight
        position={[6.5, 9.5, 5.5]}
        intensity={1.5}
        color="#fff5e9"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <directionalLight position={[-8, 3.5, 5]} intensity={0.55} color="#dce9f8" />
      <directionalLight position={[-2, 4.5, -9]} intensity={0.9} color="#eaf2ff" />

      {parts.map((p, i) => (
        <PartMesh key={i} part={p} index={i} clock={clock} />
      ))}

      <Suspense fallback={null}>
        <StudioEnvironment />
      </Suspense>

      <ContactShadows position={[0, -2.35, 0]} opacity={0.5} scale={30} blur={3.4} far={12} resolution={1024} />
      <CameraRig clock={clock} />
      <FirstFrame onReady={onReady} />

      <EffectComposer enableNormalPass multisampling={4}>
        <SSAO
          samples={20}
          radius={0.1}
          intensity={16}
          luminanceInfluence={0.6}
          worldDistanceThreshold={16}
          worldDistanceFalloff={2}
          worldProximityThreshold={2}
          worldProximityFalloff={1}
          color={new THREE.Color("#05080c")}
          blendFunction={BlendFunction.MULTIPLY}
        />
        <Bloom intensity={0.18} luminanceThreshold={0.85} luminanceSmoothing={0.3} mipmapBlur />
        <Vignette offset={0.3} darkness={0.58} blendFunction={BlendFunction.NORMAL} />
        <SMAA />
      </EffectComposer>
    </>
  );
}

const PHASES: Array<{ at: number; label: string }> = [
  { at: 0, label: "DRAFTING · CONSTRUCTION GEOMETRY" },
  { at: 950, label: "PROFILE · OUTLINE" },
  { at: 2000, label: "HIDDEN LINES · CENTRE LINES" },
  { at: 2340, label: "DIMENSIONING · GD&T" },
  { at: 2950, label: "SOLID BODY · EXTRUDE" },
  { at: 4400, label: "EXPLODED VIEW" },
  { at: 6100, label: "ASSEMBLY" },
  { at: 7600, label: "PRODUCTION READY" },
];

export function PortfolioIntro({ onDone }: { onDone: () => void }) {
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  const clock = useMemo(() => ({ t: 0 }), []);
  const rootRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const startRef = useRef<(() => void) | null>(null);

  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (reduced) {
      doneRef.current();
      return;
    }
    let raf = 0;
    let phase = -1;
    let elapsed = 0;
    let last = performance.now();
    let gpuReady = false;
    // The drafting act is pure 2D and starts instantly. If the GPU has not
    // presented its first frame by the time the solid should appear, the
    // timeline holds there rather than skipping into the middle of the shot.
    const HOLD = SCENE_T0 - 220;
    startRef.current = () => {
      gpuReady = true;
    };
    const tick = () => {
      const now = performance.now();
      const dt = Math.min(120, now - last);
      last = now;
      if (gpuReady || elapsed < HOLD) elapsed = Math.min(gpuReady ? Infinity : HOLD, elapsed + dt);
      const t = elapsed;
      clock.t = t; // drives Three.js + the canvas — no React state, no re-render

      const next = PHASES.reduce((acc, ph, i) => (t >= ph.at ? i : acc), 0);
      if (next !== phase) {
        phase = next;
        if (labelRef.current) labelRef.current.textContent = PHASES[next].label;
      }
      if (barRef.current) barRef.current.style.transform = `scaleX(${Math.min(1, t / DURATION)})`;

      // Act II crossfade: the sheet dissolves into the solid, no hard cut
      const morph = clamp01((t - SCENE_T0 + 250) / 1250);
      if (sheetRef.current) {
        const sh = sheetRef.current;
        sh.style.opacity = String(1 - morph);
        sh.style.transform = `scale(${1 + morph * 0.06})`;
        sh.style.filter = `blur(${morph * 7}px)`;
      }
      if (stageRef.current) stageRef.current.style.opacity = String(clamp01(morph * 1.6));

      if (t > FADE_AT && rootRef.current) rootRef.current.style.opacity = "0";
      if (t < DURATION) raf = requestAnimationFrame(tick);
      else doneRef.current();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced, clock]);

  if (reduced) return null;

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[70] overflow-hidden bg-[#0B0F14] transition-opacity duration-500"
      style={{ willChange: "opacity" }}
    >
      {/* soft radial spotlight behind the subject */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(58% 52% at 50% 46%, rgba(122,168,214,0.16) 0%, rgba(12,17,23,0) 62%)",
        }}
      />

      {/* Act I — the drawing sheet */}
      <div
        ref={sheetRef}
        className="absolute inset-0"
        style={{ willChange: "opacity, transform, filter" }}
      >
        <BlueprintDraft clock={clock} />
      </div>

      {/* Act II/III — the solid */}
      <div ref={stageRef} className="absolute inset-0" style={{ opacity: 0, willChange: "opacity" }}>
        <Canvas
          shadows="soft"
          dpr={[1, 2]}
          frameloop="always"
          camera={{ position: [0.4, 0.9, 10.6], fov: 34, near: 0.1, far: 200 }}
          gl={{
            antialias: true,
            powerPreference: "high-performance",
            toneMapping: THREE.ACESFilmicToneMapping,
            outputColorSpace: THREE.SRGBColorSpace,
          }}
        >
          <Scene clock={clock} onReady={() => startRef.current?.()} />
        </Canvas>
      </div>

      {/* very subtle vignette on top of everything */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(125% 100% at 50% 50%, transparent 42%, rgba(3,6,10,0.62) 100%)",
        }}
      />

      <div className="pointer-events-none absolute bottom-16 left-1/2 -translate-x-1/2 text-center">
        <div ref={labelRef} className="font-mono text-[10px] tracking-[0.42em] text-white/55">
          DRAFTING · CONSTRUCTION GEOMETRY
        </div>
        <div className="mt-3 h-px w-64 overflow-hidden bg-white/10">
          <div
            ref={barRef}
            className="h-full w-full origin-left bg-white/50"
            style={{ transform: "scaleX(0)", willChange: "transform" }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => doneRef.current()}
        className="absolute bottom-6 right-6 font-mono text-[10px] tracking-[0.4em] text-white/40 transition-colors hover:text-white/80"
      >
        SKIP
      </button>
    </div>
  );
}
