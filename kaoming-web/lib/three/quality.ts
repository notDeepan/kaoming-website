'use client';

import { createContext, use } from 'react';
import type { ModelTier } from './models';

/**
 * QualityManager (Part C.3, Part O).
 *
 * Two jobs. It picks a starting tier from what the device says about itself,
 * and it walks the degradation ladder when the frame budget is actually missed:
 *
 *   grain -> bloom -> DPR step -> lower LOD -> static render
 *
 * The ladder is deliberately ordered by what the visitor loses least. Grain and
 * bloom are grade; DPR is sharpness; LOD is detail; the static render is the
 * admission that this device should not be running a 3D scene at all. Part O
 * says budgets are limits, not aspirations — so this is the thing that enforces
 * it, rather than hoping the machine is fast enough.
 */

export type QualityTier = ModelTier;

export type QualityStep =
  | 'full'
  | 'no-grain'
  | 'no-bloom'
  | 'dpr-1.5'
  | 'dpr-1.25'
  | 'lod-down'
  | 'static';

/** In order. The watchdog only ever moves one step at a time. */
export const LADDER: QualityStep[] = [
  'full',
  'no-grain',
  'no-bloom',
  'dpr-1.5',
  'dpr-1.25',
  'lod-down',
  'static',
];

export type QualityState = {
  tier: QualityTier;
  step: QualityStep;
  /** Device pixel ratio cap, already stepped by the ladder. */
  dpr: number;
  grain: boolean;
  bloom: boolean;
  /** True once the watchdog has given up on WebGL for this device. */
  fellBack: boolean;
  /** Set by the viewer UI. Pins the tier and stops the watchdog demoting it. */
  pinned: boolean;
};

export type QualityApi = QualityState & {
  setTier: (tier: QualityTier) => void;
  reset: () => void;
};

export const QualityContext = createContext<QualityApi | null>(null);

export function useQuality(): QualityApi {
  const context = use(QualityContext);
  if (!context) throw new Error('useQuality must be used inside <MachineViewer>');
  return context;
}

/**
 * Starting tier, from what the browser will tell us. Deliberately pessimistic:
 * a machine that turns out to be fast loses nothing by starting at MED for a
 * second, but a phone that starts at HIGH drops frames in front of a buyer.
 */
export function detectTier(): QualityTier {
  if (typeof navigator === 'undefined') return 'med';

  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency ?? 4;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const saveData =
    (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData ??
    false;

  if (saveData) return 'low';
  // A coarse pointer is the most reliable "this is a phone or tablet" signal
  // available without UA sniffing, and Part H.3 caps mobile at the LOW tier.
  if (coarse) return memory >= 6 && cores >= 8 ? 'med' : 'low';
  if (memory >= 8 && cores >= 8) return 'high';
  if (memory >= 4 && cores >= 4) return 'med';
  return 'low';
}

/** Part 0.4: cap at 2 on desktop, 1.5 on the mobile tier. */
export function baseDprFor(tier: QualityTier): number {
  return tier === 'low' ? 1.5 : 2;
}

export function stateFor(tier: QualityTier, step: QualityStep, pinned: boolean): QualityState {
  const index = LADDER.indexOf(step);
  const base = baseDprFor(tier);

  const dpr =
    index >= LADDER.indexOf('dpr-1.25')
      ? Math.min(base, 1.25)
      : index >= LADDER.indexOf('dpr-1.5')
        ? Math.min(base, 1.5)
        : base;

  return {
    tier: index >= LADDER.indexOf('lod-down') ? 'low' : tier,
    step,
    dpr,
    grain: index < LADDER.indexOf('no-grain'),
    bloom: index < LADDER.indexOf('no-bloom'),
    fellBack: step === 'static',
    pinned,
  };
}

/**
 * Rolling frame-rate watchdog.
 *
 * Samples over a window rather than reacting to single frames — one slow frame
 * during a texture upload is normal and must not cost the visitor their grade.
 * Only demotes; a scene that keeps oscillating between tiers looks broken.
 */
export function createWatchdog({
  floorFps,
  windowMs = 2000,
  onDemote,
}: {
  floorFps: number;
  windowMs?: number;
  onDemote: () => void;
}) {
  let frames = 0;
  let elapsed = 0;
  let cooldown = 0;

  return {
    /** Call once per frame with the frame delta in seconds. */
    tick(delta: number) {
      if (cooldown > 0) {
        cooldown -= delta * 1000;
        return;
      }

      frames += 1;
      elapsed += delta * 1000;
      if (elapsed < windowMs) return;

      const fps = (frames * 1000) / elapsed;
      frames = 0;
      elapsed = 0;

      if (fps < floorFps) {
        // Give the next step time to take effect before judging again.
        cooldown = windowMs;
        onDemote();
      }
    },
    reset() {
      frames = 0;
      elapsed = 0;
      cooldown = 0;
    },
  };
}
