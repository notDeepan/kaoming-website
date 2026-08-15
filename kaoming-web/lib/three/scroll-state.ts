'use client';

import { createContext, use, useRef } from 'react';

/**
 * The bridge between the DOM's scroll and the canvas's render loop.
 *
 * ScrollTrigger writes `target` from outside the canvas; `useFrame` reads it
 * inside. Deliberately a mutable ref rather than React state: scroll fires at
 * up to the refresh rate, and re-rendering a React tree that often would cost
 * more than the scene it is driving (Part O — zero per-frame allocations).
 *
 * `current` is the eased value the camera actually uses. Keeping the two apart
 * is what makes the scrub smooth without making it lag behind the scroll.
 */

export type SceneScroll = {
  /** Raw 0–1 progress through Scene 03's pinned range, written by ScrollTrigger. */
  target: number;
  /** Eased 0–1 progress, advanced by the render loop. */
  current: number;
  /** True while the visitor is driving the camera by hand (Scene 02). */
  manual: boolean;
  /** Raw 0–1 progress through the Scenes 04–06 range (Part G.4, G.6, G.8). */
  explodeTarget: number;
  /** Eased counterpart, read by the explode rig and the camera. */
  explodeCurrent: number;
  /**
   * Where each rig part currently sits on screen, in fractions of the stage
   * (0–1 on each axis) with `visible` false when it is behind the camera.
   *
   * Written by the canvas, read by the DOM leader lines. Fractions rather than
   * pixels so the reader does not need to know the canvas size, and a mutated
   * record rather than state so a full-rate projection costs no React work.
   */
  projections: Record<string, { x: number; y: number; visible: boolean }>;
};

export const ScrollStateContext = createContext<{ current: SceneScroll } | null>(null);

export function useSceneScroll() {
  const context = use(ScrollStateContext);
  if (!context) throw new Error('useSceneScroll must be used inside the product experience');
  return context;
}

export function useCreateSceneScroll() {
  return useRef<SceneScroll>({
    target: 0,
    current: 0,
    manual: false,
    explodeTarget: 0,
    explodeCurrent: 0,
    projections: {},
  });
}

/**
 * Framerate-independent easing, the formula the spec fixes in prime directive 6.
 *
 * A plain `current += (target - current) * ease` converges at whatever rate the
 * display happens to run, so the same scroll feels different at 60Hz and 120Hz
 * and the scrub is not reproducible. Correcting by delta makes the eased value a
 * function of elapsed time instead of frame count — which is what "smooth and
 * framerate-independent in both directions" in the M4 gate actually requires.
 */
export function damp(current: number, target: number, ease: number, delta: number): number {
  const factor = 1 - Math.pow(1 - ease, delta * 60);
  return current + (target - current) * factor;
}
