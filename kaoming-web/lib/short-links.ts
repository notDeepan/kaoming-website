import { allSeries } from './machines';

/**
 * Stable short URLs for booth signage and printed catalogues (Part J.7).
 *
 * `kaoming.com/m/gm` has to survive being printed on a banner, so it is derived
 * from the series slug and from nothing else — not from a database row, not from
 * a counter, not from anything that could be regenerated differently next year.
 * A printed code that stops resolving is worse than no code at all.
 *
 * Deliberately locale-free. A visitor in Hannover scanning a code at EMO gets
 * the language their phone asks for, because the redirect passes through the
 * next-intl middleware rather than hard-coding `/en`.
 */

/** `kmc-gm` → `gm`. The prefix is on every series and carries no information. */
export function shortCodeFor(slug: string): string {
  return slug.replace(/^kmc-/, '');
}

export type ShortLink = {
  code: string;
  slug: string;
  /** Path this code resolves to, before the locale prefix is added. */
  target: string;
  /** Machine name, for the QR sheet a printer works from. */
  name: string;
};

export const shortLinks: ShortLink[] = allSeries.map((series) => ({
  code: shortCodeFor(series.slug),
  slug: series.slug,
  // `qr=1` is what tells the page it was reached from a scan: Part J.7 asks for
  // the LOW tier and an instant open, and Part G.0 for the entry transition to
  // be skipped on a deep link. Both are decisions the page can only make if it
  // knows how the visitor arrived.
  target: `/products/${series.categorySlug}/${series.slug}?qr=1`,
  name: series.name,
}));

const BY_CODE = new Map(shortLinks.map((link) => [link.code, link]));

export function shortLinkFor(code: string): ShortLink | undefined {
  return BY_CODE.get(code.toLowerCase());
}
