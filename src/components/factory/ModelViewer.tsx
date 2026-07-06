// Interactive 3D model viewer (STL / OBJ). Client-only, lazy-friendly.
import { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Center, Bounds, Environment, Grid } from "@react-three/drei";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

type Props = {
  /** File instance (client-side) or absolute URL (signed URL). */
  file?: File | null;
  url?: string | null;
  fileName?: string | null;
  className?: string;
  height?: number;
};

type Loaded =
  | { kind: "stl"; geom: THREE.BufferGeometry }
  | { kind: "obj"; group: THREE.Group }
  | { kind: "unsupported"; ext: string }
  | { kind: "error"; message: string };

function inferExt(nameOrUrl: string | null | undefined) {
  if (!nameOrUrl) return "";
  const clean = nameOrUrl.split("?")[0].split("#")[0];
  const dot = clean.lastIndexOf(".");
  return dot >= 0 ? clean.slice(dot + 1).toLowerCase() : "";
}

export function ModelViewer({ file, url, fileName, className, height = 360 }: Props) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [progress, setProgress] = useState(0);

  const ext = useMemo(
    () => inferExt(fileName ?? file?.name ?? url ?? ""),
    [fileName, file, url],
  );

  useEffect(() => {
    let cancelled = false;
    setLoaded(null);
    setProgress(0);

    async function run() {
      try {
        if (!file && !url) return;
        if (ext !== "stl" && ext !== "obj") {
          setLoaded({ kind: "unsupported", ext });
          return;
        }

        let buffer: ArrayBuffer | string;
        if (file) {
          buffer = ext === "obj" ? await file.text() : await file.arrayBuffer();
          setProgress(100);
        } else {
          const res = await fetch(url!);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          buffer = ext === "obj" ? await res.text() : await res.arrayBuffer();
          setProgress(100);
        }
        if (cancelled) return;

        if (ext === "stl") {
          const loader = new STLLoader();
          const geom = loader.parse(buffer as ArrayBuffer);
          geom.computeVertexNormals();
          setLoaded({ kind: "stl", geom });
        } else {
          const loader = new OBJLoader();
          const group = loader.parse(buffer as string);
          setLoaded({ kind: "obj", group });
        }
      } catch (e) {
        if (!cancelled)
          setLoaded({ kind: "error", message: e instanceof Error ? e.message : String(e) });
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [file, url, ext]);

  return (
    <div
      className={
        "relative w-full rounded-lg overflow-hidden bg-gradient-to-b from-[#0b0d12] to-[#050608] border border-white/10 " +
        (className ?? "")
      }
      style={{ height }}
    >
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center text-white/40 text-xs font-mono tracking-widest uppercase">
          {file || url ? `Loading model… ${progress}%` : "No model loaded"}
        </div>
      )}
      {loaded?.kind === "unsupported" && (
        <div className="absolute inset-0 flex flex-col gap-2 items-center justify-center text-white/50 text-xs font-mono tracking-widest uppercase text-center px-4">
          <div className="text-white/70">.{loaded.ext || "?"} preview unavailable</div>
          <div className="text-[10px] normal-case tracking-normal text-white/40">
            Upload .stl or .obj to see a live 3D preview. Your file will still be reviewed by our engineering team.
          </div>
        </div>
      )}
      {loaded?.kind === "error" && (
        <div className="absolute inset-0 flex items-center justify-center text-red-300/70 text-xs font-mono uppercase tracking-widest px-4 text-center">
          Preview failed: {loaded.message}
        </div>
      )}
      {(loaded?.kind === "stl" || loaded?.kind === "obj") && (
        <Canvas camera={{ position: [80, 80, 80], fov: 45 }} dpr={[1, 2]}>
          <color attach="background" args={["#07080b"]} />
          <ambientLight intensity={0.55} />
          <directionalLight position={[50, 80, 40]} intensity={1.1} castShadow />
          <directionalLight position={[-60, -40, -30]} intensity={0.35} color="#7aa8ff" />
          <Suspense fallback={null}>
            <Bounds fit clip observe margin={1.4}>
              <Center>
                {loaded.kind === "stl" ? (
                  <mesh geometry={loaded.geom} castShadow receiveShadow>
                    <meshStandardMaterial color="#c9d3e0" metalness={0.35} roughness={0.55} />
                  </mesh>
                ) : (
                  <primitive object={loaded.group} />
                )}
              </Center>
            </Bounds>
            <Environment preset="city" />
          </Suspense>
          <Grid
            args={[400, 400]}
            cellSize={5}
            cellThickness={0.5}
            cellColor="#1e2530"
            sectionSize={25}
            sectionThickness={1}
            sectionColor="#2a3648"
            fadeDistance={220}
            fadeStrength={1.4}
            infiniteGrid
            position={[0, -0.01, 0]}
          />
          <OrbitControls
            enableDamping
            dampingFactor={0.08}
            makeDefault
            minDistance={20}
            maxDistance={400}
          />
        </Canvas>
      )}
      <div className="absolute top-2 left-3 text-[10px] font-mono tracking-[0.25em] uppercase text-white/40 pointer-events-none">
        Model · {ext || "—"}
      </div>
    </div>
  );
}

export default ModelViewer;
