/**
 * The 3D model registry (Part C.2, H.3).
 *
 * THERE IS NO MODEL YET. The kit supplies dimensioned drawings and product
 * renders for the KMC-325GM, not geometry, and Appendix 2 leaves the modelling
 * route — contracted hard-surface artist versus in-house Blender build — as a
 * decision due at this milestone.
 *
 * So the viewer is built against this registry rather than against a filename.
 * When a GLB arrives it is dropped into public/models/<slug>/ and listed here;
 * nothing else in the viewer changes. Until then every scene renders the scale
 * blockout, which is labelled as such on screen and can never be mistaken for
 * the machine.
 */

export type ModelTier = 'high' | 'med' | 'low';

export type ModelEntry = {
  /** Series slug the model belongs to. */
  slug: string;
  /** Catalogue model code the geometry actually represents. */
  model: string;
  /** Draco-compressed, KTX2-textured GLB per tier (Part H.3). */
  files: Record<ModelTier, string>;
  /** Explode rig, read from the GLB's userData or a sibling JSON (Part G.4). */
  rig?: string;
};

export const MODEL_REGISTRY: Record<string, ModelEntry> = {
  // 'kmc-gm': {
  //   slug: 'kmc-gm',
  //   model: 'KMC-325GM',
  //   files: {
  //     high: '/models/kmc-gm/high.glb',
  //     med: '/models/kmc-gm/med.glb',
  //     low: '/models/kmc-gm/low.glb',
  //   },
  //   rig: '/models/kmc-gm/rig.json',
  // },
};

export function modelFor(slug: string): ModelEntry | null {
  return MODEL_REGISTRY[slug] ?? null;
}

/** Self-hosted decoders — no runtime CDN dependency in production (Part C.1). */
export const DRACO_DECODER_PATH = '/decoders/draco/';
export const BASIS_TRANSCODER_PATH = '/decoders/basis/';

/**
 * Verified dimensions of the flagship, from the GM catalogue table. These drive
 * the scale blockout and, once a model exists, the sanity check that the GLB was
 * exported at real-world scale (H.2: 1 unit = 1 m).
 *
 * Every figure is transcribed. Nothing here is estimated.
 */
export const KMC_325GM_DIMENSIONS = {
  model: 'KMC-325GM',
  /** floor_space_mm "6500x9300" — width across, length along X. */
  floorWidthM: 6.5,
  floorLengthM: 9.3,
  /** machine_height_mm 5800 */
  heightM: 5.8,
  /** working_table_mm "3000x2000" */
  tableLengthM: 3.0,
  tableWidthM: 2.0,
  /** distance_between_columns_mm 2500 */
  columnGapM: 2.5,
  travel: { xM: 3.0, yM: 2.5, zM: 1.0 },
} as const;
