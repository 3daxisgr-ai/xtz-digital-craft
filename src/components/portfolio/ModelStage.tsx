// Interactive engineering model stage — procedural assemblies with exploded,
// wireframe, section and auto-rotate modes. Client-only (lazy loaded).
import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Environment, Grid, ContactShadows, Bounds, Center } from "@react-three/drei";
import * as THREE from "three";
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
      return new THREE.CylinderGeometry(a[0], a[1], a[2], a[3] ?? 32);
    case "tube":
      return new THREE.CylinderGeometry(a[0], a[1], a[2], a[3] ?? 32, 1, true);
    case "sphere":
      return new THREE.SphereGeometry(a[0], a[1] ?? 32, a[2] ?? 24);
    case "cone":
      return new THREE.ConeGeometry(a[0], a[1], a[2] ?? 32);
    case "torus":
      return new THREE.TorusGeometry(a[0], a[1], a[2] ?? 16, a[3] ?? 48);
  }
}

function PartMesh({
  part,
  exploded,
  wireframe,
  clipPlane,
  reducedMotion,
}: {
  part: Part;
  exploded: boolean;
  wireframe: boolean;
  clipPlane: THREE.Plane | null;
  reducedMotion?: boolean;
}) {
  const ref = useRef<THREE.Mesh>(null);
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
    <mesh ref={ref} position={part.position} rotation={part.rotation ?? [0, 0, 0]} castShadow receiveShadow>
      <primitive object={geom} attach="geometry" />
      <meshStandardMaterial
        color={part.color}
        metalness={wireframe ? 0 : (part.metalness ?? 0.85)}
        roughness={wireframe ? 1 : (part.roughness ?? 0.35)}
        wireframe={wireframe}
        envMapIntensity={1.1}
        side={THREE.DoubleSide}
        clippingPlanes={clipPlane ? [clipPlane] : null}
        clipShadows
      />
    </mesh>
  );
}

function Assembly({ parts, exploded, wireframe, section, autoRotate, reducedMotion }: Omit<Props, "showGrid" | "brightLighting" | "accent" | "resetSignal" | "dpr">) {
  const group = useRef<THREE.Group>(null);
  const { gl } = useThree();
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0.15), []);

  useEffect(() => {
    gl.localClippingEnabled = true;
  }, [gl]);

  useFrame((_, delta) => {
    if (autoRotate && group.current && !reducedMotion) group.current.rotation.y += delta * 0.35;
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
        />
      ))}
    </group>
  );
}

function CameraReset({ signal }: { signal: number }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(6.5, 4.2, 7.5);
    camera.lookAt(0, 0, 0);
  }, [signal, camera]);
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
    <Canvas
      shadows
      dpr={dpr}
      camera={{ position: [6.5, 4.2, 7.5], fov: 42 }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      <color attach="background" args={["#0B0F14"]} />
      <fog attach="fog" args={["#0B0F14", 16, 42]} />
      <ambientLight intensity={brightLighting ? 0.9 : 0.35} />
      <directionalLight
        position={[8, 12, 6]}
        intensity={brightLighting ? 2.4 : 1.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-9, -3, -6]} intensity={0.5} color={accent} />
      <Suspense fallback={null}>
        <Bounds fit clip observe margin={1.5}>
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
        <Environment preset="warehouse" />
      </Suspense>
      <ContactShadows position={[0, -2.6, 0]} opacity={0.5} scale={26} blur={2.6} far={9} />
      {showGrid && (
        <Grid
          args={[60, 60]}
          cellSize={0.5}
          cellThickness={0.5}
          cellColor="#16202b"
          sectionSize={2.5}
          sectionThickness={1}
          sectionColor="#22354a"
          fadeDistance={40}
          fadeStrength={1.3}
          infiniteGrid
          position={[0, -2.6, 0]}
        />
      )}
      <CameraReset signal={resetSignal} />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.07}
        minDistance={3}
        maxDistance={30}
      />
    </Canvas>
  );
}

export default ModelStage;
