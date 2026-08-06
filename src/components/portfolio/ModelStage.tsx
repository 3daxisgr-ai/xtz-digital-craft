// Interactive engineering model stage — procedural assemblies with exploded,
// wireframe, section and auto-rotate modes. Client-only (lazy loaded).
// Studio-grade PBR: brushed metal, 3-point lighting, HDR env, AO, ACES tonemap.
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, Lightformer, Grid, ContactShadows, Bounds, Center, Edges } from "@react-three/drei";
import { EffectComposer, SSAO, SMAA, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import { roughnessMap, microNormalMap } from "./materials";
import type { Part } from "./projects";

type Props = {
  parts: Part[];
  exploded: boolean;
  wireframe: boolean;
  section: boolean;
  autoRotate: boolean;
  showGrid: boolean;
  brightLighting: boolean;
  accent: string;
  resetSignal: number;
  reducedMotion?: boolean;
  dpr?: [number, number];
};

function geometryFor(part: Part) {
  const a = part.args;
  switch (part.kind) {
    case "box":
      return new THREE.BoxGeometry(a[0], a[1], a[2]);
    case "cylinder":
      return new THREE.CylinderGeometry(a[0], a[1], a[2], a[3] ?? 64);
    case "tube":
      return new THREE.CylinderGeometry(a[0], a[1], a[2], a[3] ?? 64, 1, true);
    case "sphere":
      return new THREE.SphereGeometry(a[0], a[1] ?? 48, a[2] ?? 32);
    case "cone":
      return new THREE.ConeGeometry(a[0], a[1], a[2] ?? 48);
    case "torus":
      return new THREE.TorusGeometry(a[0], a[1], a[2] ?? 24, a[3] ?? 64);
  }
}

const NORMAL_SCALE = new THREE.Vector2(0.28, 0.28);

function PartMesh({
  part,
  exploded,
  wireframe,
  clipPlane,
  reducedMotion,
  brushMap,
}: {
  part: Part;
  exploded: boolean;
  wireframe: boolean;
  clipPlane: THREE.Plane | null;
  reducedMotion?: boolean;
  brushMap: THREE.Texture | null;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const geom = useMemo(() => geometryFor(part), [part]);
  useEffect(() => () => geom.dispose(), [geom]);

  const target = useMemo(
    () =>
      new THREE.Vector3(
        part.position[0] + part.explode[0],
        part.position[1] + part.explode[1],
        part.position[2] + part.explode[2],
      ),
    [part],
  );
  const home = useMemo(() => new THREE.Vector3(...part.position), [part]);

  useFrame((_, delta) => {
    const m = ref.current;
    if (!m) return;
    const goal = exploded ? target : home;
    if (reducedMotion) {
      m.position.copy(goal);
      return;
    }
    m.position.lerp(goal, 1 - Math.pow(0.005, delta));
  });

  return (
    <mesh
      ref={ref}
      position={part.position}
      rotation={part.rotation ?? [0, 0, 0]}
      castShadow
      receiveShadow
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <primitive object={geom} attach="geometry" />
      <meshPhysicalMaterial
        color={part.color}
        metalness={wireframe ? 0 : (part.metalness ?? 0.9)}
        roughness={wireframe ? 1 : (part.roughness ?? 0.3)}
        roughnessMap={wireframe ? null : brushMap}
        normalMap={wireframe ? null : microNormalMap()}
        normalScale={NORMAL_SCALE}
        anisotropy={wireframe ? 0 : 0.85}
        anisotropyRotation={Math.PI / 2}
        clearcoat={wireframe ? 0 : 0.12}
        clearcoatRoughness={0.4}
        wireframe={wireframe}
        envMapIntensity={1.15}
        side={THREE.DoubleSide}
        clippingPlanes={clipPlane ? [clipPlane] : null}
        clipShadows
      />
      {/* Contour lines only on hover — barely-there, never a game-style outline */}
      {hovered && !wireframe && (
        <Edges threshold={28} color="#c8d6e5" transparent opacity={0.18} />
      )}
    </mesh>
  );
}

function Assembly({ parts, exploded, wireframe, section, autoRotate, reducedMotion }: Omit<Props, "showGrid" | "brightLighting" | "accent" | "resetSignal" | "dpr">) {
  const group = useRef<THREE.Group>(null);
  const { gl } = useThree();
  const brushMap = useMemo(() => roughnessMap(), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0.15), []);

  useEffect(() => {
    gl.localClippingEnabled = true;
    gl.shadowMap.type = THREE.PCFSoftShadowMap;
    gl.toneMappingExposure = 1.0;
  }, [gl]);



  useFrame((_, delta) => {
    if (autoRotate && group.current && !reducedMotion) group.current.rotation.y += delta * 0.3;
  });

  return (
    <group ref={group}>
      {parts.map((p) => (
        <PartMesh
          key={p.name}
          part={p}
          exploded={exploded}
          wireframe={wireframe}
          clipPlane={section ? plane : null}
          reducedMotion={reducedMotion}
          brushMap={brushMap}
        />
      ))}
    </group>
  );
}

/** Smoothly eases the camera back to the framing pose instead of snapping. */
function CameraRig({ signal, reducedMotion }: { signal: number; reducedMotion?: boolean }) {
  const { camera, controls } = useThree();
  const goal = useRef<THREE.Vector3 | null>(null);
  const home = useMemo(() => new THREE.Vector3(6.2, 3.9, 7.8), []);

  useEffect(() => {
    if (reducedMotion) {
      camera.position.copy(home);
      camera.lookAt(0, 0, 0);
      return;
    }
    goal.current = home.clone().setLength(camera.position.length() || home.length());
  }, [signal, camera, home, reducedMotion]);

  useFrame((_, delta) => {
    if (!goal.current) return;
    camera.position.lerp(goal.current, 1 - Math.pow(0.0015, delta));
    const c = controls as { target?: THREE.Vector3; update?: () => void } | null;
    if (c?.target) {
      c.target.lerp(new THREE.Vector3(0, 0, 0), 1 - Math.pow(0.0015, delta));
      c.update?.();
    }
    if (camera.position.distanceTo(goal.current) < 0.02) goal.current = null;
  });
  return null;
}

export function ModelStage({
  parts,
  exploded,
  wireframe,
  section,
  autoRotate,
  showGrid,
  brightLighting,
  accent,
  resetSignal,
  reducedMotion,
  dpr = [1, 1.75],
}: Props) {
  return (
    <div className="relative h-full w-full">
      <Canvas
        shadows="soft"
        dpr={dpr}
        camera={{ position: [6.2, 3.9, 7.8], fov: 46, near: 0.1, far: 200 }}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
          toneMapping: THREE.ACESFilmicToneMapping,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
      >
        <color attach="background" args={["#0B0F14"]} />
        <fog attach="fog" args={["#0B0F14", 20, 52]} />

        {/* 3-point studio setup: key / fill / rim */}
        <ambientLight intensity={brightLighting ? 0.45 : 0.18} />
        <directionalLight
          position={[7, 10, 6]}
          intensity={brightLighting ? 2.6 : 1.7}
          color="#fff6ea"
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0004}
          shadow-normalBias={0.02}
        />
        <directionalLight position={[-8, 3.5, 5]} intensity={brightLighting ? 1.1 : 0.7} color="#dbe7f5" />
        <spotLight
          position={[-4, 7, -9]}
          angle={0.6}
          penumbra={1}
          intensity={brightLighting ? 42 : 26}
          color="#eaf2ff"
        />

        <Suspense fallback={null}>
          <Bounds fit clip observe margin={1.45}>
            <Center>
              <Assembly
                parts={parts}
                exploded={exploded}
                wireframe={wireframe}
                section={section}
                autoRotate={autoRotate}
                reducedMotion={reducedMotion}
              />
            </Center>
          </Bounds>
          <Environment resolution={512} frames={1} environmentIntensity={brightLighting ? 1.25 : 0.95}>
            <color attach="background" args={["#10151b"]} />
            <Lightformer form="rect" intensity={5} color="#ffffff" scale={[12, 7, 1]} position={[0, 7, 2]} rotation={[-Math.PI / 2, 0, 0]} />
            <Lightformer form="rect" intensity={2.2} color="#dfeaf7" scale={[9, 6, 1]} position={[-9, 2.5, 4]} rotation={[0, Math.PI / 2, 0]} />
            <Lightformer form="rect" intensity={1.3} color="#cddcec" scale={[8, 5, 1]} position={[9, 1.5, -2]} rotation={[0, -Math.PI / 2, 0]} />
            <Lightformer form="rect" intensity={3.4} color="#f4f8ff" scale={[10, 1.6, 1]} position={[0, 3.5, -9]} />
            <Lightformer form="circle" intensity={1.6} color="#ffe7c9" scale={[5, 5, 1]} position={[5, 5, 6]} rotation={[-0.6, 0.5, 0]} />
          </Environment>
        </Suspense>

        <ContactShadows position={[0, -2.6, 0]} opacity={0.42} scale={26} blur={3.4} far={9} resolution={512} frames={1} />
        {showGrid && (
          <Grid
            args={[60, 60]}
            cellSize={0.5}
            cellThickness={0.5}
            cellColor="#0f151c"
            sectionSize={2.5}
            sectionThickness={0.8}
            sectionColor="#141d27"
            fadeDistance={34}
            fadeStrength={1.6}
            infiniteGrid
            position={[0, -2.6, 0]}
          />
        )}

        <CameraRig signal={resetSignal} reducedMotion={reducedMotion} />
        <OrbitControls
          makeDefault
          enableDamping
          dampingFactor={0.06}
          rotateSpeed={0.75}
          zoomSpeed={0.8}
          minDistance={3}
          maxDistance={30}
        />

        <EffectComposer enableNormalPass multisampling={0}>
          <SSAO
            samples={12}
            radius={0.12}
            intensity={22}
            luminanceInfluence={0.55}
            worldDistanceThreshold={12}
            worldDistanceFalloff={2}
            worldProximityThreshold={2}
            worldProximityFalloff={1}
            color={new THREE.Color("#04070b")}
            blendFunction={BlendFunction.MULTIPLY}
          />
          <Vignette offset={0.28} darkness={0.62} eskil={false} blendFunction={BlendFunction.NORMAL} />
          <SMAA />
        </EffectComposer>
      </Canvas>

      {/* Soft radial key-glow behind the model + edge falloff, purely atmospheric */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(58% 48% at 50% 44%, ${accent}14, transparent 70%)`,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 100% at 50% 50%, transparent 42%, rgba(3,6,10,0.55) 100%)",
        }}
      />
    </div>
  );
}

export default ModelStage;
