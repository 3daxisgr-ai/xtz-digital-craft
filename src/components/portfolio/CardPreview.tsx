// Lightweight hover preview of a project's assembly.
//
// Deliberately cheap: no shadows, no post-processing, dpr 1, a tiny two-light
// rig and shared standard materials. It is mounted only while the card is
// hovered or focused and fully unmounted (and disposed) afterwards, so a grid
// of cards never keeps a dozen WebGL contexts alive.
import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bounds, Center } from "@react-three/drei";
import * as THREE from "three";
import type { Part } from "./projects";

function geometryFor(part: Part) {
  const a = part.args;
  switch (part.kind) {
    case "box":
      return new THREE.BoxGeometry(a[0], a[1], a[2]);
    case "cylinder":
      return new THREE.CylinderGeometry(a[0], a[1], a[2], 28);
    case "tube":
      return new THREE.CylinderGeometry(a[0], a[1], a[2], 28, 1, true);
    case "sphere":
      return new THREE.SphereGeometry(a[0], 20, 14);
    case "cone":
      return new THREE.ConeGeometry(a[0], a[1], 24);
    case "torus":
      return new THREE.TorusGeometry(a[0], a[1], 12, 32);
  }
}

function Rig({ parts }: { parts: Part[] }) {
  const group = useRef<THREE.Group>(null);
  const built = useMemo(
    () =>
      parts.slice(0, 10).map((p) => ({
        part: p,
        geom: geometryFor(p),
        mat: new THREE.MeshStandardMaterial({
          color: new THREE.Color(p.color),
          metalness: p.metalness ?? 0.9,
          roughness: p.roughness ?? 0.32,
          envMapIntensity: 0.6,
        }),
      })),
    [parts],
  );

  useEffect(
    () => () => {
      built.forEach((b) => {
        b.geom.dispose();
        b.mat.dispose();
      });
    },
    [built],
  );

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.y += delta * 0.55;
  });

  return (
    <group ref={group}>
      {built.map((b, i) => (
        <mesh key={i} position={b.part.position} rotation={b.part.rotation ?? [0, 0, 0]}>
          <primitive object={b.geom} attach="geometry" />
          <primitive object={b.mat} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

export function CardPreview({ parts }: { parts: Part[] }) {
  return (
    <Canvas
      dpr={1}
      frameloop="always"
      camera={{ position: [5.4, 3.2, 6.8], fov: 42 }}
      gl={{ antialias: false, powerPreference: "low-power", toneMapping: THREE.ACESFilmicToneMapping }}
      style={{ pointerEvents: "none" }}
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[6, 8, 5]} intensity={2.1} color="#fff4e6" />
      <directionalLight position={[-6, 2, -4]} intensity={0.9} color="#cfe2f7" />
      <Bounds fit clip observe margin={1.5}>
        <Center>
          <Rig parts={parts} />
        </Center>
      </Bounds>
    </Canvas>
  );
}

export default CardPreview;
