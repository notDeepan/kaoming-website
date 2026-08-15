import generated from '@/content/catalogue/generated.json';
import { catalogueDocuments } from './images';
import { seriesBySlug, seriesSlugForModel } from './machines';

/**
 * The digital catalogue (Part I).
 *
 * Spreads are rasterized at build time by `scripts/rasterize-catalogues.py`;
 * this joins them to the document manifest so a catalogue knows its own title,
 * size, language and version, and to the machine data so a spread can offer the
 * machine it shows.
 *
 * **What the search index can and cannot do.** Two of the three PDFs are placed
 * artwork with no text layer at all, so 34 of 48 spreads contribute nothing to
 * the index and name no models. That is a fact about the files KAO MING
 * supplied, and the reader says so rather than presenting an empty result as
 * "no matches". OCR is deliberately not used: CLAUDE.md forbids re-deriving a
 * model code, and a misread `KMC-436HMA` is exactly the defect that rule exists
 * to prevent.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = Record<string, any>;

export type Spread = {
  page: number;
  src: string;
  thumb: string;
  width: number;
  height: number;
  text: string;
  /** Catalogue model codes found in this page's text, if it has any. */
  models: string[];
  /** Series routes for those models, ready to link. */
  machines: { model: string; slug: string; name: string; category: string }[];
};

export type Catalogue = {
  id: string;
  /** Route segment: `cat-gn-gm-2026-en` → `gn-gm-2026-en`. */
  slug: string;
  pdf: string;
  fileType: string;
  sizeBytes: number;
  language: string;
  version: string;
  /** Series slugs this catalogue covers, from the document manifest. */
  covers: string[];
  pageCount: number;
  spreads: Spread[];
  /** True when at least one page exposed extractable text. */
  searchable: boolean;
};

function machinesFor(models: string[]) {
  return models.flatMap((model) => {
    const slug = seriesSlugForModel(model);
    const series = slug ? seriesBySlug.get(slug) : undefined;
    if (!series) return [];
    return [{ model, slug: series.slug, name: series.name, category: series.categorySlug }];
  });
}

export const catalogues: Catalogue[] = ((generated as Loose).documents as Loose[]).flatMap(
  (document) => {
    const manifest = catalogueDocuments.find((entry) => entry.id === document.id);
    if (!manifest) return [];

    const spreads: Spread[] = (document.pages as Loose[]).map((page) => ({
      page: page.page as number,
      src: page.src as string,
      thumb: page.thumb as string,
      width: page.width as number,
      height: page.height as number,
      text: page.text as string,
      models: page.models as string[],
      machines: machinesFor(page.models as string[]),
    }));

    return [
      {
        id: document.id as string,
        slug: (document.id as string).replace(/^cat-/, ''),
        pdf: document.pdf as string,
        fileType: manifest.fileType,
        sizeBytes: manifest.sizeBytes,
        language: manifest.language,
        version: manifest.version,
        covers: document.covers as string[],
        pageCount: document.pageCount as number,
        spreads,
        searchable: spreads.some((spread) => spread.text.length > 0),
      },
    ];
  },
);

export function catalogueBySlug(slug: string): Catalogue | undefined {
  return catalogues.find((catalogue) => catalogue.slug === slug);
}

/** The machines a catalogue covers, for the reader's side rail. */
export function machinesInCatalogue(catalogue: Catalogue) {
  return catalogue.covers.flatMap((slug) => {
    const series = seriesBySlug.get(slug);
    return series ? [series] : [];
  });
}
