'use client';

import { AdaptiveDpr, PerformanceMonitor, useProgress } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef, useState, type Ref } from 'react';
import { ACESFilmicToneMapping, SRGBColorSpace, type Group } from 'three';
import { CameraRig, type CameraRigHandle } from './camera-rig';
import { ExplodeRig } from './explode-rig';
import { MachineModel } from './machine-model';
import { PostFx } from './post-fx';
import { Stage } from './stage';
import {
  createWatchdog,
  LADDER,
  QualityContext,
  stateFor,
  type QualityStep,
  type QualityTier,
} from '@/lib/three/quality';

/**
 * The persistent Canvas (Part C.3). One per 3D page, never two fighting for a
 * context, and it only runs while it is actually on screen.
 *
 * Everything in Part 0.4 that concerns the renderer is set here: ACESFilmic
 * tone mapping, sRGB output, exposure inside 1.0–1.2, and a pixel ratio the
 * QualityManager owns.
 */

export function MachineScene({
  slug,
  tier,
  step,
  pinned,
  interactive,
  autoRotate,
  reducedMotion,
  active,
  activeObject,
  onDemote,
  rigRef,
  onReady,
  onProgress,
  onScrubbedChange,
}: {
  slug: string;
  tier: QualityTier;
  step: QualityStep;
  pinned: boolean;
  interactive: boolean;
  autoRotate: boolean;
  reducedMotion: boolean;
  /** False when off-screen or the tab is hidden: the loop stops entirely. */
  active: boolean;
  /** KM_* object the visitor is reading in Scene 05, or null (Part G.6). */
  activeObject: string | null;
  onDemote: () => void;
  rigRef?: Ref<CameraRigHandle>;
  onReady?: () => void;
  /** 0–100 loading progress, reported outward so the page never imports drei. */
  onProgress?: (progress: number) => void;
  /** Fires when Scene 03's scripted path takes the camera from the visitor. */
  onScrubbedChange?: (scrubbed: boolean) => void;
}) {
  const quality = stateFor(tier, step, pinned);
  const machine = useRef<Group>(null);

  return (
    <Canvas
      // `demand` would be right for a still scene, but Scene 01 drifts and
      // Scene 02 damps — both need a loop. It stops when `active` goes false.
      frameloop={active ? 'always' : 'never'}
      dpr={quality.dpr}
      shadows
      gl={{
        antialias: quality.tier !== 'low',
        powerPreference: 'high-performance',
        // The page behind the canvas is the same black; no need to composite.
        alpha: false,
      }}
      camera={{ fov: 38, near: 0.5, far: 120 }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.1;
        gl.outputColorSpace = SRGBColorSpace;
        scene.matrixWorldAutoUpdate = true;
        onReady?.();
      }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <QualityContext value={{ ...quality, setTier: () => {}, reset: () => {} }}>
        <color attach="background" args={['#0c0b0a']} />

        <Stage />
        <MachineModel slug={slug} tier={quality.tier} groupRef={machine} />
        <ExplodeRig root={machine} activeObject={activeObject} />

        <CameraRig
          interactive={interactive}
          autoRotate={autoRotate}
          reducedMotion={reducedMotion}
          handleRef={rigRef}
          onScrubbedChange={onScrubbedChange}
        />

        <PostFx bloom={quality.bloom} grain={quality.grain} />

        {/* Drei's own adaptive DPR handles momentary dips; our watchdog handles
            a device that is simply too slow, and walks the Part O ladder. */}
        <AdaptiveDpr pixelated={false} />
        <FrameWatchdog
          floorFps={tier === 'low' ? 30 : 60}
          enabled={!pinned && step !== 'static'}
          onDemote={onDemote}
        />
        <ContextLossGuard onLost={onDemote} />
        <LoadProgress onProgress={onProgress} />
        <SceneProbe />
      </QualityContext>
    </Canvas>
  );
}

/**
 * A read-only window onto the running scene.
 *
 * Part O calls for a dev overlay carrying `renderer.info` and frame stats; this
 * is the seam that will feed it, and in the meantime it is how the camera can be
 * observed from outside the canvas — by the M4 scrub test, and by anyone
 * debugging a camera path without stopping to add instrumentation first.
 *
 * One object, mutated in place: no allocation per frame (Part O).
 */
declare global {
  interface Window {
    __kmScene?: { x: number; y: number; z: number; frames: number };
  }
}

function SceneProbe() {
  const camera = useThree((state) => state.camera);
  const handle = useRef<NonNullable<Window['__kmScene']>>({ x: 0, y: 0, z: 0, frames: 0 });

  useEffect(() => {
    window.__kmScene = handle.current;
    return () => {
      delete window.__kmScene;
    };
  }, []);

  useFrame(() => {
    const value = handle.current;
    value.x = camera.position.x;
    value.y = camera.position.y;
    value.z = camera.position.z;
    value.frames += 1;
  });

  return null;
}

/**
 * drei's loading progress, reported out of the canvas.
 *
 * It lives here rather than in the page because `useProgress` is a drei import,
 * and a drei import in the page is 600 KB of three in the initial bundle for a
 * page whose first paint is a photograph (Part O).
 */
function LoadProgress({ onProgress }: { onProgress?: (progress: number) => void }) {
  const progress = useProgress((state) => state.progress);

  useEffect(() => {
    onProgress?.(progress);
  }, [progress, onProgress]);

  return null;
}

/** Walks the ladder when the rolling frame rate misses the floor (Part O). */
function FrameWatchdog({
  floorFps,
  enabled,
  onDemote,
}: {
  floorFps: number;
  enabled: boolean;
  onDemote: () => void;
}) {
  const watchdog = useRef(createWatchdog({ floorFps, onDemote }));

  useEffect(() => {
    watchdog.current = createWatchdog({ floorFps, onDemote });
  }, [floorFps, onDemote]);

  useFrame((_, delta) => {
    if (!enabled) return;
    watchdog.current.tick(delta);
  });

  return null;
}

/**
 * A lost WebGL context is not recoverable mid-session on many devices. Rather
 * than leave a black rectangle where a machine was, fall all the way down the
 * ladder to the static render.
 */
function ContextLossGuard({ onLost }: { onLost: () => void }) {
  const gl = useThree((state) => state.gl);

  useEffect(() => {
    const canvas = gl.domElement;
    const handle = (event: Event) => {
      event.preventDefault();
      onLost();
    };
    canvas.addEventListener('webglcontextlost', handle);
    return () => canvas.removeEventListener('webglcontextlost', handle);
  }, [gl, onLost]);

  return null;
}

/** Re-exported so the viewer can drive the ladder without importing internals. */
export function nextStep(step: QualityStep): QualityStep {
  const index = LADDER.indexOf(step);
  return LADDER[Math.min(index + 1, LADDER.length - 1)];
}

/** Small helper for the viewer: is WebGL available at all? */
export function useWebglSupported(): boolean | null {
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const context =
        canvas.getContext('webgl2') ?? canvas.getContext('webgl');
      setSupported(Boolean(context));
    } catch {
      setSupported(false);
    }
  }, []);

  return supported;
}

export { PerformanceMonitor };
