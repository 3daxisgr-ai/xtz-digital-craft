// Renders a real uploaded CAD model (GLB) with the same studio metal finish
// used by the procedural assemblies, so it drops straight into ModelStage.
import { useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import { roughnessMap, microNormalMap } from "./materials";

export function GltfModel({
  url,
  wireframe,
  autoRotate,
  reducedMotion,
  color = "#b9c4d1",
}: {
  url: string;
  wireframe: boolean;
  autoRotate: boolean;
  reducedMotion?: boolean;
  color?: string;
}) {
  const { scene } = useGLTF(url);
  const group = useRef<THREE.Group>(null);

  // Recentre on its own bounding-box centre so auto-rotation spins about the
  // part, not about the exporter's arbitrary origin.
  const cloned = useMemo(() => {
    const c = scene.clone(true);
    const box = new THREE.Box3().setFromObject(c);
    const centre = box.getCenter(new THREE.Vector3());
    c.position.sub(centre);
    return c;
  }, [scene]);

  const material = useMemo(() => {
    const rough = roughnessMap();
    const norm = microNormalMap();
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(color),
      metalness: 0.92,
      roughness: 0.34,
      roughnessMap: rough,
      normalMap: norm,
      normalScale: new THREE.Vector2(0.25, 0.25),
      clearcoat: 0.18,
      clearcoatRoughness: 0.45,
      envMapIntensity: 1.1,
    });
  }, [color]);

  useEffect(() => {
    cloned.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.material = material;
      m.castShadow = true;
      m.receiveShadow = true;
    });
  }, [cloned, material]);

  useEffect(() => {
    material.wireframe = wireframe;
    material.needsUpdate = true;
  }, [material, wireframe]);

  useEffect(
    () => () => {
      material.dispose();
    },
    [material],
  );

  useFrame((_, delta) => {
    if (autoRotate && group.current && !reducedMotion) group.current.rotation.y += delta * 0.3;
  });

  return (
    <group ref={group}>
      <primitive object={cloned} />
    </group>
  );
}

export default GltfModel;
