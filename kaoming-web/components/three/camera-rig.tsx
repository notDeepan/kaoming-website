'use client';

import { CameraControls } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import { Vector3 } from 'three';
import { BLOCKOUT_BOUNDS } from './blockout';
import { CAMERA_TARGET, explodePointAt, explodeTargetAt, pointAt } from './camera-path';
import { explodeState } from '@/lib/three/rig';
import { damp, useSceneScroll } from '@/lib/three/scroll-state';

/**
 * One camera, three scenes (Part G.1, G.2, G.3).
 *
 * Scene 01 holds a scripted hero angle with a slow idle drift. Scene 02 hands
 * control to the visitor — the sanctioned exception in Part 0.3, using
 * `CameraControls` with damped inertia, clamped polar angle and hard zoom
 * limits, never raw OrbitControls. Scene 03 takes control back and drives the
 * camera along the orbit as a function of scroll.
 *
 * The scrubbed camera is deliberately *not* an animation. Its position is read
 * from the curve at the eased scroll progress every frame, so it holds no
 * history: scrolling back up retraces the same path, and the same scroll
 * distance produces the same movement at any refresh rate.
 */

export const HERO = {
  /** Front-three-quarter, the angle the catalogue photographs from. */
  position: [7.6, 4.8, 9.0] as const,
  target: [0, BLOCKOUT_BOUNDS.heightM * 0.45, 0] as const,
};

const HERO_DISTANCE = Math.hypot(
  HERO.position[0],
  HERO.position[1] - HERO.target[1],
  HERO.position[2],
);

/** Part G.1: 0.02 rad/s. Slow enough to read as a machine, not a turntable. */
const IDLE_RATE = 0.02;
/** Part G.2: idle 8s, then auto-rotate resumes. */
const IDLE_RESUME_MS = 8000;
/** How hard the scrub eases. Lower is smoother and lags more. */
const SCRUB_EASE = 0.12;

export type CameraRigHandle = {
  reset: () => void;
};

export function CameraRig({
  interactive,
  autoRotate,
  reducedMotion,
  handleRef,
  onScrubbedChange,
}: {
  interactive: boolean;
  autoRotate: boolean;
  reducedMotion: boolean;
  handleRef?: Ref<CameraRigHandle>;
  /** Fires when the scripted path takes over from the visitor, and back. */
  onScrubbedChange?: (scrubbed: boolean) => void;
}) {
  const controls = useRef<CameraControls>(null);
  const idleSince = useRef(0);
  const scroll = useSceneScroll();
  const wasScrubbed = useRef(false);
  const point = useRef(new Vector3());
  const look = useRef(new Vector3());

  // CameraControls takes ownership of the camera on mount, so the hero framing
  // has to go through it — mutating camera.position is silently discarded.
  useEffect(() => {
    controls.current?.setLookAt(...HERO.position, ...HERO.target, false);
  }, []);

  useImperativeHandle(
    handleRef,
    () => ({
      reset: () => {
        controls.current?.setLookAt(...HERO.position, ...HERO.target, !reducedMotion);
      },
    }),
    [reducedMotion],
  );

  useEffect(() => {
    const instance = controls.current;
    if (!instance) return;
    const onStart = () => {
      idleSince.current = Number.POSITIVE_INFINITY;
    };
    const onEnd = () => {
      idleSince.current = performance.now();
    };
    instance.addEventListener('controlstart', onStart);
    instance.addEventListener('controlend', onEnd);
    return () => {
      instance.removeEventListener('controlstart', onStart);
      instance.removeEventListener('controlend', onEnd);
    };
  }, []);

  useFrame((_, delta) => {
    const instance = controls.current;
    if (!instance) return;

    const state = scroll.current;

    // Reduced motion pins the camera at the hero angle and leaves it there:
    // no drift, no scrub, no scroll-driven rotation (Part P). The exploded view
    // still works, because it is a button the visitor pressed rather than
    // something the page did to them — it simply arrives without the sweep.
    if (reducedMotion) {
      state.explodeCurrent = state.explodeTarget;
      return;
    }

    state.current = damp(state.current, state.target, SCRUB_EASE, delta);
    state.explodeCurrent = damp(state.explodeCurrent, state.explodeTarget, SCRUB_EASE, delta);

    // Below a hair of progress the visitor still owns the camera; past it, the
    // scripted path does. Crossing that line is what ends Scene 02.
    const scrubbed = state.target > 0.001 || state.explodeTarget > 0.001;
    if (scrubbed !== wasScrubbed.current) {
      wasScrubbed.current = scrubbed;
      onScrubbedChange?.(scrubbed);
    }

    if (scrubbed) {
      // Scenes 04–06 take the camera from Scene 03 at the point Scene 03 leaves
      // it, so the two ranges read as one continuous move rather than a cut.
      if (state.explodeTarget > 0.001) {
        const explode = explodeState(state.explodeCurrent);
        explodePointAt(state.explodeCurrent, explode.amount, point.current);
        explodeTargetAt(explode.amount, look.current);
      } else {
        pointAt(state.current, point.current);
        look.current.copy(CAMERA_TARGET);
      }

      // `setLookAt` with enableTransition false writes the pose directly, which
      // is what makes this a pure function of progress rather than a chase.
      instance.setLookAt(
        point.current.x,
        point.current.y,
        point.current.z,
        look.current.x,
        look.current.y,
        look.current.z,
        false,
      );
      return;
    }

    if (!autoRotate) return;
    if (interactive && performance.now() - idleSince.current < IDLE_RESUME_MS) return;

    instance.rotate(IDLE_RATE * delta, 0, false);
  });

  return (
    <CameraControls
      ref={controls}
      enabled={interactive}
      smoothTime={0.35}
      draggingSmoothTime={0.18}
      minPolarAngle={0.35}
      maxPolarAngle={Math.PI / 2 - 0.06}
      minDistance={HERO_DISTANCE * 0.6}
      maxDistance={HERO_DISTANCE * 2.5}
      truckSpeed={interactive ? 1 : 0}
    />
  );
}
