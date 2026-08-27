import generated from '@/content/images/generated.json';
import type { PlateImage } from '@/components/ui/machine-plate';
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
  cut: { src: string; width: number; height: number; transparent: boolean };
};

const groups = (generated as { series: Record<string, { images: GeneratedImage[] }> }).series;

const all: SeriesImage[] = Object.values(groups).flatMap((entry) => entry.images);

/**
 * The variant to put on the page field.
 *
 * The knockout is a background *removal*, not a retouch — it keys on the studio
 * white and leaves anything else alone, which is the right rule: no pixel of the
 * machine is ever altered. The consequence is that a render shot on a black or
 * coloured ground comes back from the knockout unchanged and fully opaque. Nine
 * of the twenty-nine are like that.
 *
 * On the old dark field nobody noticed: an opaque black photograph blended into
 * a black page. On paper the same file is a black slab in the middle of a light
 * product grid, which is exactly how it was reported.
 *
 * So the choice is made per image rather than per component, and it decides two
 * things at once: which file, and how it is presented. A real knockout floats on
 * the field with a pool of light under it. One that still carries its own
 * background is shown as the studio plate inside a hairline frame — because a
 * silhouette and a photograph are both legitimate treatments, and the thing that
 * looks broken is a photograph pretending to be a silhouette. Neither is
 * retouched.
 */
export function displayImage(image: SeriesImage): PlateImage {
  return image.cut.transparent
    ? { ...image.cut, framed: false }
    : { ...image.plate, framed: true };
}

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
