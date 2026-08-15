import type { Series } from './machines';

/**
 * Which of a series' catalogue features Scene 03 carries, and how many.
 *
 * This lives in a plain module, and that is the whole point of the file.
 *
 * It used to be exported from `components/three/feature-cards.tsx`, which is a
 * `'use client'` module, and imported from there by the product page, which is a
 * Server Component. Next does not error on that — it replaces the export with a
 * client-reference stub, and the stub is an object. So `String(index + 1 +
 * MAX_FEATURE_CARDS)` printed the stub's own error message as the card number,
 * and `features.slice(MAX_FEATURE_CARDS)` coerced it to 0 and returned every
 * feature, duplicating Scene 03's cards underneath Scene 03. Both were visible
 * on the flagship product page.
 *
 * A constant and a pure function have no business in a client module. Here they
 * can be imported from either side without a boundary being crossed.
 */

/** The spec's range (Part G.3: 3–6). More and the scroll becomes a corridor. */
export const MAX_FEATURE_CARDS = 6;

/** The features Scene 03 shows, in catalogue order. */
export function featuresForScene(series: Series) {
  return series.features.filter((feature) => feature.title).slice(0, MAX_FEATURE_CARDS);
}

/** Everything Scene 03 did not reach — Neptunus states nine. */
export function overflowFeatures(series: Series) {
  return series.features.filter((feature) => feature.title).slice(MAX_FEATURE_CARDS);
}
