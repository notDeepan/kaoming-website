import generated from '@/content/images/generated.json';
import type { SeriesImage } from './machines';

/**
 * Machine imagery, keyed by the catalogue model code the kit manifest records.
 *
 * Two derivatives exist for every render (scripts/prepare-images.mjs):
 *  - `plate` — the studio original on white, for light surfaces and galleries.
 *  - `cut`   — the same render with the studio background removed, for the dark
 *              field. Nothing about the machine itself is altered.
 *
 * Filenames in the kit ARE catalogue model codes (CLAUDE.md). Series membership
 * is derived from the code, never from the folder a file happens to sit in.
 */

type GeneratedImage = {
  model: string;
  view: string;
  bestFor: string;
  plate: { src: string; width: number; height: number };
  cut: { src: string; width: number; height: number };
};

const groups = (generated as { series: Record<string, { images: GeneratedImage[] }> }).series;

const all: SeriesImage[] = Object.values(groups).flatMap((entry) => entry.images);

export function imagesForModel(model: string): SeriesImage[] {
  return all.filter((image) => image.model === model);
}

/**
 * Ordered so the first image is the one the kit manifest nominates as a hero or
 * primary card image, because that is the one a page leads with. The manifest's
 * own `best_for` note is the authority; nothing here judges the photographs.
 */
function heroScore(image: SeriesImage): number {
  const best = image.bestFor.toLowerCase();
  let score = 0;
  if (best.includes('hero')) score += 3;
  if (best.includes('primary')) score += 2;
  if (best.includes('product card')) score += 1;
  if (best.includes('gallery')) score -= 1;
  return score;
}

export function imagesForSeries(slug: string, forModel: (model: string) => string | null): SeriesImage[] {
  return all
    .filter((image) => forModel(image.model) === slug)
    .sort((a, b) => heroScore(b) - heroScore(a));
}

export const factoryImages = (
  generated as { factory: { src: string; width: number; height: number }[] }
).factory;

export type CatalogueDocument = {
  id: string;
  path: string;
  fileType: string;
  sizeBytes: number;
  language: string;
  version: string;
  covers: string[];
};

export const catalogueDocuments = (generated as { documents: CatalogueDocument[] }).documents;
