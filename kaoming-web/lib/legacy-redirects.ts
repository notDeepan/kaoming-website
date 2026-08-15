import { productCategories } from './taxonomy';

/**
 * 301s from the legacy KMC codes (Part E.1, CLAUDE.md).
 *
 * Buyers still search "KMC-SR", and kaoming.com has ranked on those codes for
 * years. The 2026 catalogues renamed every machine, so a redesign that simply
 * drops the old codes throws away the search equity along with them.
 *
 * The codes are therefore kept in exactly two places and nowhere else: as
 * invisible search synonyms, and as the sources of these redirects. Not one of
 * them is ever rendered as a machine's name or type.
 *
 * Derived from `_taxonomy.json`, so a code cannot be redirected to a series that
 * no longer exists, and a new alias in the taxonomy becomes a redirect without
 * anyone remembering to add one.
 */

export type LegacyRedirect = { from: string; to: string };

export const legacyRedirects: LegacyRedirect[] = productCategories.flatMap((category) =>
  category.series.flatMap((series) =>
    series.legacyAliases
      // `KMC-GM` is both the legacy code and the current name, so it would
      // redirect a series to itself and 404 nothing.
      .filter((alias) => alias.toLowerCase() !== series.slug)
      .map((alias) => ({
        from: `/products/${alias.toLowerCase()}`,
        to: `/products/${category.slug}/${series.slug}`,
      })),
  ),
);

/**
 * Next's redirect entries. `:locale` keeps a redirect inside the language the
 * visitor arrived in — a German buyer following a ten-year-old link to
 * `/zh-tw/products/kmc-sr` should not be dropped into Chinese.
 */
export function redirectRules() {
  return legacyRedirects.flatMap((redirect) => [
    { source: `/:locale${redirect.from}`, destination: `/:locale${redirect.to}`, permanent: true },
    // The unprefixed form too: printed links and old inbound links rarely carry
    // a locale, and the middleware never sees them as product routes.
    { source: redirect.from, destination: `/en${redirect.to}`, permanent: true },
  ]);
}
