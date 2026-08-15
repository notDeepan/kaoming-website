import type { Object3D } from 'three';
import { Vector3 } from 'three';

/**
 * The explode rig reader (Part G.4, H.2).
 *
 * H.2 is the contract between the 3D artist and this code: every component in
 * the GLB carries `explodeVec`, `explodeDist`, `explodeOrder`, `group` and
 * `conceptual` as custom properties, which arrive here as `object.userData`.
 *
 * There is exactly one code path. The scale blockout writes the same properties
 * onto its own meshes, so when the artist's GLB replaces it nothing in this file
 * or in Scene 04 changes — the rig simply comes from the file instead.
 */

export const COMPONENT_GROUPS = [
  'structure',
  'spindle',
  'axis',
  'control',
  'coolant',
  'enclosure',
] as const;

export type ComponentGroup = (typeof COMPONENT_GROUPS)[number];

export type RigPart = {
  /** The KM_* object this drives. */
  name: string;
  object: Object3D;
  /** Unit vector the part travels along, in the model's own space. */
  vector: Vector3;
  /** Metres of travel at full explosion. */
  distance: number;
  /** Disassembly order; 0 is the anchor and never moves. */
  order: number;
  group: ComponentGroup;
  /** True where the geometry is a plausible stand-in, never engineering truth. */
  conceptual: boolean;
  /** Rest position, captured once so the part can always return exactly. */
  rest: Vector3;
};

type RawRig = {
  explodeVec?: [number, number, number] | { x: number; y: number; z: number };
  explodeDist?: number;
  explodeOrder?: number;
  group?: string;
  conceptual?: boolean;
};

function toVector(value: RawRig['explodeVec']): Vector3 | null {
  if (!value) return null;
  const vector = Array.isArray(value)
    ? new Vector3(value[0], value[1], value[2])
    : new Vector3(value.x, value.y, value.z);
  return vector.lengthSq() > 0 ? vector.normalize() : null;
}

/**
 * Walks a loaded model and returns everything that declares an explode vector,
 * sorted into disassembly order. Objects without one are structure that stays
 * put — the base is the anchor (Part G.4) and simply carries no vector.
 */
export function readRig(root: Object3D): RigPart[] {
  const parts: RigPart[] = [];

  root.traverse((object) => {
    const raw = object.userData as RawRig | undefined;
    if (!raw) return;

    const vector = toVector(raw.explodeVec);
    if (!vector) return;

    const group = (COMPONENT_GROUPS as readonly string[]).includes(raw.group ?? '')
      ? (raw.group as ComponentGroup)
      : 'structure';

    parts.push({
      name: object.name,
      object,
      vector,
      distance: typeof raw.explodeDist === 'number' ? raw.explodeDist : 1,
      order: typeof raw.explodeOrder === 'number' ? raw.explodeOrder : 0,
      group,
      conceptual: raw.conceptual === true,
      rest: object.position.clone(),
    });
  });

  return parts.sort((a, b) => a.order - b.order);
}

/**
 * How far through the explosion a given part is, at overall progress `t`.
 *
 * Parts do not all move together — Part G.4 asks for a per-component stagger so
 * the machine comes apart in the order an engineer would take it apart, rather
 * than bursting. Each part gets a window of the timeline based on its order,
 * with the windows overlapping so the motion stays continuous.
 *
 * `tighten` compresses those windows towards each other. Reassembly (Scene 06)
 * uses it so putting the machine back together reads slightly faster and more
 * confident than taking it apart, which is what the spec asks for.
 */
export function partProgress(
  t: number,
  order: number,
  maxOrder: number,
  tighten = 1,
): number {
  if (maxOrder <= 0) return t;

  const span = 1 / (maxOrder + 1);
  // Overlap: each window is wider than its slot, so parts are always in motion.
  const width = Math.min(1, span * 2.2 * tighten);
  const start = (order / (maxOrder + 1)) * (1 - width) * tighten;

  const local = (t - start) / width;
  return Math.min(Math.max(local, 0), 1);
}

/** `power3.inOut`, inlined so the scene does not need GSAP inside the loop. */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Scenes 04 → 06 as one function of one scroll range.
 *
 * The three scenes are a single movement, not three animations: the machine
 * comes apart (04), stands open while its components are read (05), and closes
 * again (06). Making that one piecewise function of progress rather than three
 * timelines keeps the M4 property that M5 must not break — the machine's state
 * is derived from where the page is, so scrolling back up puts every part
 * exactly where it was on the way down.
 *
 * `tighten` is 1 coming apart and higher going back together: Part G.8 asks for
 * the reassembly to read faster and more decisive than the disassembly, and
 * compressing the per-part windows is what produces that without changing the
 * scroll distance it occupies.
 */
export const EXPLODE_PHASES = { open: 0.32, hold: 0.72 } as const;

export type ExplodeState = {
  /** 0 assembled, 1 fully apart. */
  amount: number;
  phase: 'opening' | 'open' | 'closing';
  tighten: number;
};

export function explodeState(progress: number): ExplodeState {
  const p = Math.min(Math.max(progress, 0), 1);
  const { open, hold } = EXPLODE_PHASES;

  if (p < open) {
    return { amount: easeInOutCubic(p / open), phase: 'opening', tighten: 1 };
  }
  if (p < hold) {
    return { amount: 1, phase: 'open', tighten: 1 };
  }
  return {
    amount: 1 - easeInOutCubic((p - hold) / (1 - hold)),
    phase: 'closing',
    tighten: 1.35,
  };
}
