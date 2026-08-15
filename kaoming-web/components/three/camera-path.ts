import { CatmullRomCurve3, Vector3 } from 'three';
import { KMC_325GM_DIMENSIONS as D } from '@/lib/three/models';

/**
 * Scene 03's camera orbit (Part G.3).
 *
 * The spec's table walks front, front-right 45°, side, rear, and finally a high
 * angle that hands over to the exploded view in M5. These are those five stops
 * as world positions around a machine 9.3 m long and 5.8 m tall, laid on a
 * CatmullRom curve so the path between them is a continuous arc rather than five
 * linear hops.
 *
 * The camera's position is read from this curve as a pure function of scroll
 * progress. Nothing accumulates, so scrubbing backwards retraces exactly the
 * path it drew going forwards — which is the M4 gate.
 */

const RADIUS = 11.5;
const TARGET_HEIGHT = D.heightM * 0.45;

/** Stop k is at k/(n-1) along the curve, so the info cards can key to them. */
export const CAMERA_STOPS = [
  { key: 'front', azimuth: 0, height: 4.6, radius: RADIUS },
  { key: 'frontRight', azimuth: Math.PI * 0.25, height: 4.9, radius: RADIUS * 0.96 },
  { key: 'side', azimuth: Math.PI * 0.5, height: 4.2, radius: RADIUS * 1.05 },
  { key: 'rear', azimuth: Math.PI * 0.92, height: 5.0, radius: RADIUS },
  { key: 'high', azimuth: Math.PI * 1.35, height: 9.2, radius: RADIUS * 0.88 },
] as const;

export const CAMERA_PATH = new CatmullRomCurve3(
  CAMERA_STOPS.map(
    (stop) =>
      new Vector3(
        Math.sin(stop.azimuth) * stop.radius,
        stop.height,
        Math.cos(stop.azimuth) * stop.radius,
      ),
  ),
  false,
  'catmullrom',
  0.4,
);

export const CAMERA_TARGET = new Vector3(0, TARGET_HEIGHT, 0);

/** Where along the path a given stop sits, for syncing the info cards. */
export function progressForStop(index: number): number {
  return CAMERA_STOPS.length < 2 ? 0 : index / (CAMERA_STOPS.length - 1);
}

/** Position on the orbit for a progress value. Pure — no state, no history. */
export function pointAt(progress: number, out: Vector3): Vector3 {
  return CAMERA_PATH.getPointAt(Math.min(Math.max(progress, 0), 1), out);
}

/* ------------------------------------------------- Scenes 04–06: the explode */

/**
 * The exploded view's camera (Part G.4: "the camera rises and orbits ~30°").
 *
 * It picks up exactly where Scene 03's path ends — the `high` stop — so the
 * handover between the two is not a cut. Two inputs, deliberately:
 *
 *   `progress` is raw scroll through the whole Scenes 04–06 range, and drives
 *   the azimuth. It only ever advances, so the orbit never doubles back.
 *
 *   `amount` is how far apart the machine actually is, and drives height and
 *   distance. The camera therefore rises as the machine opens, stays high while
 *   its components are being read, and comes back down as it closes — without
 *   the orbit stuttering, because the two are separate.
 *
 * Still a pure function of scroll: nothing accumulates, so this scrubs in both
 * directions the same way Scene 03 does.
 */
const EXPLODE_ORBIT = Math.PI / 6;
const HIGH = CAMERA_STOPS[CAMERA_STOPS.length - 1];

export function explodePointAt(progress: number, amount: number, out: Vector3): Vector3 {
  const p = Math.min(Math.max(progress, 0), 1);
  const a = Math.min(Math.max(amount, 0), 1);

  const azimuth = HIGH.azimuth + EXPLODE_ORBIT * p;
  // Parts spread to about 1.4x the bounding box, so the camera has to give them
  // room or the machine walks out of frame as it comes apart.
  const radius = HIGH.radius * (1 + 0.4 * a);
  const height = HIGH.height + 2.4 * a;

  return out.set(Math.sin(azimuth) * radius, height, Math.cos(azimuth) * radius);
}

/** The look-at rises with the machine, since the parts move up as well as out. */
export function explodeTargetAt(amount: number, out: Vector3): Vector3 {
  const a = Math.min(Math.max(amount, 0), 1);
  return out.set(0, TARGET_HEIGHT + 1.1 * a, 0);
}
