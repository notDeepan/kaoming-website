import { allSeries, type Series } from './machines';
import { productCategories } from './taxonomy';

/**
 * The homepage shows one machine per category, not all nine.
 *
 * The choice is a rule, not an editor's mood: the flagship leads its category,
 * and every other category is represented by its most completely transcribed
 * series that actually has a photograph. That way the showcase can never drift
 * out of step with what the catalogues and the image archive support.
 */
export function featuredSeries(): Series[] {
  const rank: Record<Series['completeness'], number> = { full: 0, partial: 1, pending: 2 };

  return productCategories
    .map((category) => {
      const candidates = allSeries.filter((series) => series.categorySlug === category.slug);
      const withImages = candidates.filter((series) => series.images.length > 0);
      const pool = withImages.length ? withImages : candidates;

      return [...pool].sort((a, b) => {
        if (a.flagship !== b.flagship) return a.flagship ? -1 : 1;
        if (rank[a.completeness] !== rank[b.completeness]) {
          return rank[a.completeness] - rank[b.completeness];
        }
        return b.models.length - a.models.length;
      })[0];
    })
    .filter((series): series is Series => Boolean(series));
}

/**
 * The single verified figure a card leads with. Always a transcribed catalogue
 * value — the largest X travel where the series states travels, the longest
 * table where the transcription has only reached table geometry, and nothing at
 * all where neither has been read yet.
 */
export function headlineDimension(
  series: Series,
): { labelKey: string; value: string } | null {
  if (!series.models.length || !series.modelColumns.length) return null;

  const index = series.modelColumns.findIndex((column) =>
    ['travelX', 'tableLength'].includes(column),
  );
  if (index === -1) return null;

  const values = series.models.map((model) => model.cells[index]).filter(Boolean);
  if (!values.length) return null;

  const largest = values.reduce((best, current) => {
    const parse = (value: string) => Number(value.replace(/[^\d.]/g, '')) || 0;
    return parse(current) > parse(best) ? current : best;
  });

  return { labelKey: series.modelColumns[index], value: largest };
}
