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
 * What the GPU calls itself, via WEBGL_debug_renderer_info, or null.
 *
 * Reading it costs a throwaway WebGL context, so the result is memoised. There
 * is exactly one caller: `detectTier`, through `isWeakGpu`. `detectLowPower` is
 * GPU-blind on purpose — see its own note — so it is not one.
 *
 * The extension is unmasked in Chromium and Firefox and absent in Safari, which
 * is fine — Safari only runs on Apple silicon and Apple integrated graphics,
 * neither of which is the machine this check exists for.
 */
let cachedRenderer: string | null | undefined;

export function gpuRenderer(): string | null {
  if (cachedRenderer !== undefined) return cachedRenderer;
  cachedRenderer = null;

  if (typeof document === 'undefined') return null;
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') ??
      canvas.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return null;

    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const raw = info
      ? (gl.getParameter(info.UNMASKED_RENDERER_WEBGL) as string)
      : (gl.getParameter(gl.RENDERER) as string);
    cachedRenderer = typeof raw === 'string' ? raw : null;

    gl.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    cachedRenderer = null;
  }
  return cachedRenderer;
}

/**
 * A GPU with no dedicated memory and no business rendering a bloom pass at
 * DPR 2, matched by name.
 *
 * This is the check that was missing, and it is the one that matters most on
 * the machines this site is actually opened on. A typical office desktop
 * reports eight cores and eight gigabytes and therefore scored HIGH — while
 * drawing through Intel UHD integrated graphics, where HIGH is nowhere near
 * sustainable. Cores and memory describe the CPU; the whole 3D budget in Part O
 * is spent on the GPU.
 *
 * Matched on the family name rather than the model, because the model string is
 * a moving target and getting it wrong in this direction is cheap: the
 * QualityManager's ladder only ever demotes, so a machine wrongly started low
 * stays low, and one wrongly started high jitters in front of a buyer.
 */
const WEAK_GPU =
  /swiftshader|llvmpipe|basic render|microsoft basic|software|mesa offscreen|intel.*(hd|uhd|iris\s*(plus|xe)?\s*graphics\b(?!.*(a[3-7]|arc))|gma)|vmware|virtualbox|parallels|apple paravirtual/i;

export function isWeakGpu(): boolean {
  const renderer = gpuRenderer();
  return renderer !== null && WEAK_GPU.test(renderer);
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
  // Ahead of the CPU checks on purpose — see isWeakGpu. An integrated or
  // software renderer caps the tier no matter how many cores sit behind it.
  if (isWeakGpu()) return 'low';
  // A coarse pointer is the most reliable "this is a phone or tablet" signal
  // available without UA sniffing, and Part H.3 caps mobile at the LOW tier.
  if (coarse) return memory >= 6 && cores >= 8 ? 'med' : 'low';
  if (memory >= 8 && cores >= 8) return 'high';
  if (memory >= 4 && cores >= 4) return 'med';
  return 'low';
}

/**
 * "This machine should not be asked to composite a smooth-scrolled document."
 *
 * About the CPU, not the GPU, because it gates Lenis: smooth scroll re-runs
 * ScrollTrigger against every trigger on the page on every frame, and on a
 * four-core office machine that is the difference between scrolling and
 * stuttering. The visitor still gets every scene, every reveal and every pinned
 * section — they get them driven by native scroll.
 *
 * Deliberately does NOT consult `isWeakGpu`. Every headless browser renders
 * through SwiftShader, so folding the GPU check in here would put the entire
 * test suite on the native-scroll path and stop it covering the path almost
 * every real visitor takes.
 */
export function detectLowPower(): boolean {
  if (typeof navigator === 'undefined') return false;

  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency ?? 4;
  const saveData =
    (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData ??
    false;

  return saveData || cores <= 4 || memory <= 4;
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
  warmupMs = 1500,
  onDemote,
}: {
  floorFps: number;
  windowMs?: number;
  /**
   * Grace period before the first judgement. A scene's opening seconds are
   * geometry parsing and texture upload, which are slow on every machine — a
   * fast one included. Without this, the collapse lane below reads the load and
   * demotes hardware that would have held 60 fps a moment later.
   */
  warmupMs?: number;
  onDemote: () => void;
}) {
  let frames = 0;
  let elapsed = 0;
  let cooldown = 0;
  let warmup = warmupMs;

  return {
    /** Call once per frame with the frame delta in seconds. */
    tick(delta: number) {
      if (warmup > 0) {
        warmup -= delta * 1000;
        return;
      }
      if (cooldown > 0) {
        cooldown -= delta * 1000;
        return;
      }

      frames += 1;
      elapsed += delta * 1000;

      /*
       * Two windows, not one.
       *
       * A machine that is merely a little short of the floor deserves the long
       * window: one texture upload should not cost a visitor their grade, which
       * is what `windowMs` is for.
       *
       * A machine running at a third of the floor does not need two seconds of
       * evidence, and giving it two seconds per rung is the actual complaint —
       * six rungs at a two-second window plus a two-second cooldown is
       * twenty-four seconds of visible stutter before the ladder reaches the
       * bottom. Below half the floor the sample closes early, so the descent
       * takes a quarter of the time.
       */
      const collapsing = elapsed >= windowMs / 4 && (frames * 1000) / elapsed < floorFps / 2;
      if (elapsed < windowMs && !collapsing) return;

      const fps = (frames * 1000) / elapsed;
      frames = 0;
      elapsed = 0;

      if (fps < floorFps) {
        // Give the next step time to take effect before judging again — and no
        // longer than the sample that triggered it, or a collapsing machine
        // spends the cooldown stuttering at the rung it just left.
        cooldown = collapsing ? windowMs / 4 : windowMs;
        onDemote();
      }
    },
    reset() {
      frames = 0;
      elapsed = 0;
      cooldown = 0;
      warmup = warmupMs;
    },
  };
}
