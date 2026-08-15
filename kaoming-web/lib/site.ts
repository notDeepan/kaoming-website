import { localeMeta, routing } from '@/i18n/routing';

/**
 * Hosting is an open decision (Appendix 2) — the pilot runs locally and demos
 * from private Vercel previews, and kaoming.com is untouched until approval.
 *
 * Indexing is therefore OFF unless explicitly switched on. A preview of an
 * unapproved redesign getting crawled under the real company's name is not a
 * risk worth carrying for the sake of a default.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const ALLOW_INDEXING = process.env.NEXT_PUBLIC_ALLOW_INDEXING === 'true';

/**
 * Per-page canonical and hreflang alternates (Part R).
 *
 * These cannot live in the locale layout: metadata set there applies verbatim to
 * every page beneath it, so a single canonical would have every route on the
 * site declaring itself a duplicate of the homepage, and the hreflang pairs
 * would point a German reader of a product page at the English homepage. Each
 * page passes its own locale-independent path.
 *
 * @param path locale-independent, leading slash, e.g. `/products/kmc-gm`
 */
export function alternatesFor(locale: string, path = '') {
  const languages = Object.fromEntries(
    routing.locales.map((code) => [localeMeta[code].hreflang, `/${code}${path}`]),
  );

  return {
    canonical: `/${locale}${path}`,
    languages: { ...languages, 'x-default': `/${routing.defaultLocale}${path}` },
  };
}
