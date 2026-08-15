import taxonomyJson from '../content/machines/_taxonomy.json';

/**
 * The product taxonomy is read from `content/machines/_taxonomy.json`, which is
 * a verbatim copy of the kit file transcribed from the 2026 catalogues.
 *
 * SOURCE AUTHORITY (CLAUDE.md): series names, types and model codes come from
 * that file and nowhere else. This module may reformat a name for display —
 * the catalogue's em dash becomes the `·` the naming policy specifies — but it
 * never invents, translates or abbreviates one.
 */

type TaxonomySeries = {
  name_2026: string;
  type_2026: string;
  models_2026: string[] | string;
  legacy_aliases_for_search_only?: string[];
  flagship?: boolean;
  note?: string;
};

type TaxonomyCategory = {
  id: string;
  name_2026: string;
  source?: string;
  series: TaxonomySeries[];
  WARNING?: string;
};

const taxonomy = taxonomyJson as unknown as {
  categories: TaxonomyCategory[];
  naming_policy_for_the_website: Record<string, string>;
};

/**
 * Categories that have a 2026 catalogue behind them, i.e. everything that may
 * carry a specification table. The fifth group in the source file
 * ("website-only-no-2026-catalogue") is an internal bucket whose `name_2026` is
 * a note to the build, not a customer-facing label — it is deliberately not
 * navigable until sales confirms a public name (Appendix 2, due M1).
 */
const CATALOGUE_CATEGORY_IDS = [
  'gantry-machining-center',
  'double-column-machining-center',
  'multi-face-machining-center',
  'vertical-machining-center',
] as const;

export type SeriesEntry = {
  /** e.g. "KMC-GM · Gantry Mercury" — the naming policy's primary label. */
  name: string;
  /** e.g. "Intelligent Five-axis Gantry Machining Center". */
  type: string;
  /** e.g. "kmc-gm". Route segment under /products/[category]/. */
  slug: string;
  /** Catalogue model codes, or null where the catalogue page is still to be transcribed. */
  models: string[] | null;
  /** Search synonyms and 301 sources only — never displayed (CLAUDE.md). */
  legacyAliases: string[];
  flagship: boolean;
};

export type CategoryEntry = {
  id: string;
  name: string;
  slug: string;
  series: SeriesEntry[];
};

/** "KMC-H7 / KMC-H8 — Hephaestus" -> "kmc-h7-h8" */
function seriesSlug(name: string): string {
  const [codes] = name.split('—');
  return codes
    .trim()
    .toLowerCase()
    .split('/')
    .map((code, index) => {
      const clean = code.trim().replace(/[^a-z0-9-]+/g, '');
      return index === 0 ? clean : clean.replace(/^kmc-/, '');
    })
    .join('-');
}

/**
 * The catalogue writes "KMC-GM — Gantry Mercury"; the naming policy writes "·".
 * The space before the separator is non-breaking so a heading can never wrap to
 * a line that opens with a lone middot.
 */
function displayName(name: string): string {
  return name.replace(/\s*—\s*/, ' · ');
}

export const productCategories: CategoryEntry[] = taxonomy.categories
  .filter((category) => (CATALOGUE_CATEGORY_IDS as readonly string[]).includes(category.id))
  .map((category) => ({
    id: category.id,
    name: category.name_2026,
    slug: category.id,
    series: category.series.map((series) => ({
      name: displayName(series.name_2026),
      type: series.type_2026,
      slug: seriesSlug(series.name_2026),
      models: Array.isArray(series.models_2026) ? series.models_2026 : null,
      legacyAliases: series.legacy_aliases_for_search_only ?? [],
      flagship: series.flagship === true,
    })),
  }));

export const flagshipSeries = productCategories
  .flatMap((category) => category.series)
  .find((series) => series.flagship);
