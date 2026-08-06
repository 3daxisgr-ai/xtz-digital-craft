// Cinematic CAD intro — rebuilt from scratch as a pure Three.js timeline.
// No Framer Motion transforms, no React state during playback: every frame is
// driven by spring integrators inside useFrame, so React never re-renders.
//
// Beat sheet (~6.4s):
//   0.0–1.0  close hero push-in on the assembled part
//   1.0–3.0  parts break apart along curved 3D paths, camera dollies back
//   3.0–4.2  slow orbit around the exploded assembly
//   4.2–6.0  parts spring home with weight + inertia, camera settles hero angle
import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, ContactShadows } from "@react-three/drei";
import { EffectComposer, SSAO, SMAA, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";

const DURATION = 6400; // ms of scene playback
const FADE_AT = 5950;

type IntroPart = {
  geom: () => THREE.BufferGeometry;
  home: [number, number, number];
  rot?: [number, number, number];
  /** direction + distance the part travels when the assembly breaks apart */
  blow: [number, number, number];
  /** perpendicular bow of the flight path (arc, never a straight translate) */
  bow: [number, number, number];
  spin: [number, number, number];
  color: string;
  metalness: number;
  roughness: number;
  /** heavier parts accelerate slower and settle later */
  mass: number;
  delay: number;
};

/** A small welded bracket assembly — plate, ribs, gusset, boss, collar, bolts. */
function buildParts(): IntroPart[] {
  const steel = "#b9c4d2";
  const dark = "#8d99a8";
  const bolts: IntroPart[] = [-1, 1].flatMap((sx) =>
    [-1, 1].map((sz, i) => ({
      geom: () => new THREE.CylinderGeometry(0.16, 0.16, 0.38, 32),
      home: [sx * 1.55, -0.72, sz * 0.78] as [number, number, number],
      blow: [sx * 2.8, -2.0, sz * 2.4] as [number, number, number],
      bow: [0, 1.7, sx * 0.9] as [number, number, number],
      spin: [Math.PI * 1.4 * sx, Math.PI * 2.2, 0] as [number, number, number],
      color: "#d7dde6",
      metalness: 0.95,
      roughness: 0.22,
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
      color: steel,
      metalness: 0.92,
      roughness: 0.3,
      mass: 2.4,
      delay: 0,
    },
    {
      geom: () => new THREE.BoxGeometry(0.34, 2.6, 2.2),
      home: [-1.6, 0.6, 0],
      blow: [-3.6, 1.2, -0.5],
      bow: [0, 1.6, 1.5],
      spin: [0.3, -0.9, 0.4],
      color: dark,
      metalness: 0.9,
      roughness: 0.32,
      mass: 1.5,
      delay: 0.08,
    },
    {
      geom: () => new THREE.BoxGeometry(0.3, 2.2, 1.6),
      home: [1.55, 0.4, 0],
      blow: [3.5, 0.9, 0.7],
      bow: [0, 1.9, -1.4],
      spin: [-0.25, 1.1, -0.35],
      color: dark,
      metalness: 0.9,
      roughness: 0.32,
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
      color: "#a7b3c2",
      metalness: 0.88,
      roughness: 0.35,
      mass: 1.0,
      delay: 0.18,
    },
    {
      geom: () => new THREE.CylinderGeometry(0.62, 0.62, 1.25, 64),
      home: [0.9, 0.35, 0],
      rot: [Math.PI / 2, 0, 0],
      blow: [1.4, 2.1, 2.8],
      bow: [-1.6, 0.6, 0],
      spin: [0.9, 1.8, 0.2],
      color: "#b4913f",
      metalness: 1,
      roughness: 0.28,
      mass: 0.9,
      delay: 0.24,
    },
    {
      geom: () => new THREE.TorusGeometry(0.86, 0.12, 24, 96),
      home: [0.9, 0.35, 0],
      rot: [Math.PI / 2, 0, 0],
      blow: [1.8, -1.4, 3.0],
      bow: [-1.2, -1.4, 0],
      spin: [1.6, 0.4, 1.2],
      color: "#dde4ec",
      metalness: 0.96,
      roughness: 0.2,
      mass: 0.5,
      delay: 0.3,
    },
    ...bolts,
  ];
}

/** Critically-tuned spring integrator — mass, stiffness and damping per part. */
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
    // fixed sub-stepping keeps the spring stable at any framerate (no jitter)
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

function PartMesh({
  part,
  clock,
}: {
  part: IntroPart;
  clock: { t: number };
}) {
  const ref = useRef<THREE.Mesh>(null);
  const geom = useMemo(() => part.geom(), [part]);
  useEffect(() => () => geom.dispose(), [geom]);

  const home = useMemo(() => new THREE.Vector3(...part.home), [part]);
  const away = useMemo(
    () => new THREE.Vector3(...part.home).add(new THREE.Vector3(...part.blow)),
    [part],
  );
  // Curved flight path: quadratic bezier bowed off the straight line so no two
  // parts ever travel through each other.
  const curve = useMemo(() => {
    const mid = home.clone().lerp(away, 0.5).add(new THREE.Vector3(...part.bow));
    return new THREE.QuadraticBezierCurve3(home.clone(), mid, away.clone());
  }, [home, away, part]);

  const spring = useMemo(
    () => new Spring(120 + 40 / part.mass, 17 + 6 * part.mass, part.mass),
    [part],
  );
  const baseRot = useMemo(
    () => new THREE.Euler(...(part.rot ?? [0, 0, 0])),
    [part],
  );
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    const m = ref.current;
    if (!m) return;
    const dt = Math.min(delta, 1 / 30);
    const t = clock.t / 1000;
    // target: 0 = assembled, 1 = exploded
    const open = t > 1.0 + part.delay && t < 4.2 + part.delay;
    spring.target = open ? 1 : 0;
    const p = THREE.MathUtils.clamp(spring.step(dt), -0.05, 1.12);

    curve.getPoint(THREE.MathUtils.clamp(p, 0, 1), tmp);
    if (p > 1) tmp.lerp(away.clone().add(away.clone().sub(home).setLength(0.6)), p - 1);
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
      <meshPhysicalMaterial
        color={part.color}
        metalness={part.metalness}
        roughness={part.roughness}
        anisotropy={0.6}
        anisotropyRotation={Math.PI / 2}
        clearcoat={0.1}
        clearcoatRoughness={0.4}
        envMapIntensity={1.2}
      />
    </mesh>
  );
}

function easeInOut(x: number) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

/** Camera dolly: close push-in → pull back on explode → orbit → hero settle. */
function CameraRig({ clock }: { clock: { t: number } }) {
  const { camera } = useThree();
  const look = useMemo(() => new THREE.Vector3(0, 0.1, 0), []);
  const smoothed = useMemo(() => new THREE.Vector3(8.5, 2.9, 5.4), []);
  const desired = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    const t = clock.t / 1000;
    // keyframed spherical path — radius, azimuth, elevation
    const keys = [
      { t: 0.0, r: 10.5, a: 0.55, e: 0.2 },
      { t: 1.0, r: 11.5, a: 0.78, e: 0.28 },
      { t: 2.2, r: 18.1, a: 1.35, e: 0.52 },
      { t: 3.2, r: 19.0, a: 1.85, e: 0.58 },
      { t: 4.2, r: 18.0, a: 2.4, e: 0.48 },
      { t: 5.3, r: 14.0, a: 2.9, e: 0.4 },
      { t: 6.4, r: 13.0, a: 3.3, e: 0.34 },
    ];
    let k0 = keys[0];
    let k1 = keys[keys.length - 1];
    for (let i = 0; i < keys.length - 1; i++) {
      if (t >= keys[i].t && t <= keys[i + 1].t) {
        k0 = keys[i];
        k1 = keys[i + 1];
        break;
      }
    }
    const span = Math.max(0.0001, k1.t - k0.t);
    const f = easeInOut(THREE.MathUtils.clamp((t - k0.t) / span, 0, 1));
    const r = THREE.MathUtils.lerp(k0.r, k1.r, f);
    const a = THREE.MathUtils.lerp(k0.a, k1.a, f);
    const e = THREE.MathUtils.lerp(k0.e, k1.e, f);

    desired.set(
      r * Math.cos(e) * Math.cos(a),
      r * Math.sin(e) + 0.6,
      r * Math.cos(e) * Math.sin(a),
    );
    // critically damped follow removes any keyframe popping
    smoothed.lerp(desired, 1 - Math.pow(0.000002, Math.min(delta, 0.25)));
    camera.position.copy(smoothed);
    camera.lookAt(look); // model stays centred for the whole shot
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

function Scene({ clock, onReady }: { clock: { t: number }; onReady: () => void }) {
  const parts = useMemo(buildParts, []);
  const { gl } = useThree();
  useEffect(() => {
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    gl.toneMappingExposure = 0.95;
  }, [gl]);

  return (
    <>
      <color attach="background" args={["#0B0F14"]} />
      <fog attach="fog" args={["#0B0F14", 18, 46]} />

      <ambientLight intensity={0.2} />
      <directionalLight
        position={[7, 10, 6]}
        intensity={2.3}
        color="#fff6ea"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <directionalLight position={[-8, 3.5, 5]} intensity={0.8} color="#dbe7f5" />
      <spotLight position={[-4, 7, -9]} angle={0.6} penumbra={1} intensity={30} color="#eaf2ff" />

      {parts.map((p, i) => (
        <PartMesh key={i} part={p} clock={clock} />
      ))}
      <Suspense fallback={null}>
        <Environment preset="studio" environmentIntensity={0.95} />
      </Suspense>

      <ContactShadows position={[0, -2.4, 0]} opacity={0.45} scale={30} blur={3.2} far={11} resolution={1024} />
      <CameraRig clock={clock} />
      <FirstFrame onReady={onReady} />

      <EffectComposer enableNormalPass multisampling={4}>
        <SSAO
          samples={16}
          radius={0.12}
          intensity={20}
          luminanceInfluence={0.5}
          worldDistanceThreshold={14}
          worldDistanceFalloff={2}
          worldProximityThreshold={2}
          worldProximityFalloff={1}
          color={new THREE.Color("#04070b")}
          blendFunction={BlendFunction.MULTIPLY}
        />
        <Vignette offset={0.26} darkness={0.66} blendFunction={BlendFunction.NORMAL} />
        <SMAA />
      </EffectComposer>
    </>
  );
}

const PHASES: Array<{ at: number; label: string }> = [
  { at: 0, label: "ASSEMBLY" },
  { at: 1000, label: "RELEASING CONSTRAINTS" },
  { at: 2000, label: "EXPLODED VIEW" },
  { at: 3000, label: "INSPECTION ORBIT" },
  { at: 4200, label: "REASSEMBLY" },
  { at: 5400, label: "PRODUCTION READY" },
];

export function PortfolioIntro({ onDone }: { onDone: () => void }) {
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  const clock = useMemo(() => ({ t: 0 }), []);
  const rootRef = useRef<HTMLDivElement>(null);
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
    let start = performance.now();
    let raf = 0;
    let phase = -1;
    let began = false;
    // Hold on frame zero until the GPU has actually presented the first frame,
    // so the timeline never starts mid-shot behind a shader compile.
    startRef.current = () => {
      if (began) return;
      began = true;
      start = performance.now();
    };
    const tick = () => {
      const t = began ? performance.now() - start : 0;
      clock.t = t; // drives Three.js only — no React state, no re-render
      const next = PHASES.reduce((acc, p, i) => (t >= p.at ? i : acc), 0);
      if (next !== phase) {
        phase = next;
        if (labelRef.current) labelRef.current.textContent = PHASES[next].label;
      }
      if (barRef.current)
        barRef.current.style.transform = `scaleX(${Math.min(1, t / DURATION)})`;
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
      <Canvas
        shadows="soft"
        dpr={[1, 2]}
        frameloop="always"
        camera={{ position: [8.5, 2.9, 5.4], fov: 40, near: 0.1, far: 200 }}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
      >
        <Scene clock={clock} onReady={() => startRef.current?.()} />
      </Canvas>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 100% at 50% 50%, transparent 40%, rgba(3,6,10,0.6) 100%)",
        }}
      />

      <div className="pointer-events-none absolute bottom-16 left-1/2 -translate-x-1/2 text-center">
        <div ref={labelRef} className="font-mono text-[10px] tracking-[0.5em] text-white/55">
          ASSEMBLY
        </div>
        <div className="mt-3 h-px w-56 overflow-hidden bg-white/10">
          <div
            ref={barRef}
            className="h-full w-full origin-left bg-white/50"
            style={{ transform: "scaleX(0)", willChange: "transform" }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onDone}
        className="absolute bottom-6 right-6 font-mono text-[10px] tracking-[0.3em] text-white/35 transition-colors hover:text-white/70"
      >
        SKIP
      </button>
    </div>
  );
}

export default PortfolioIntro;
