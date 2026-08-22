import newsJson from '@/content/company/news.json';
import { productCategories } from './taxonomy';

/**
 * NEWS (kaoming.com's own second nav item), normalised.
 *
 * The current site publishes three tabs — EXHIBITION, NEW PRODUCT, NEWEST — and
 * this module is the whole of that section: `content/company/news.json` is the
 * only source, adding an entry there publishes it in both locales, and there is
 * no page to edit to do so.
 *
 * Two rules the raw file cannot enforce on its own, enforced here:
 *
 *  1. **No legacy code reaches a screen.** The source titles its product
 *     announcements KMC-321HIS and KMC-RF. CLAUDE.md is explicit that legacy
 *     codes are search synonyms and 301 sources and never a displayed name, so
 *     `legacyCode` is carried for search and `title` is the machine type the
 *     source itself gives the announcement. Where the series survives into the
 *     2026 catalogue, `series` resolves to its current name and its page.
 *
 *  2. **A date the source did not state is never invented.** Only the EMO entry
 *     carries a real date. Everything else states a year in its own title and
 *     nothing finer, so it is flagged approximate and renders as a bare year.
 */

type Locale = string;

export type NewsKind = 'exhibition' | 'product' | 'company';

type RawText = { title: string; body: string; dateline?: string; booth?: string };

type RawItem = {
  slug: string;
  kind: NewsKind;
  date: string;
  endDate?: string;
  dateIsApproximate: boolean;
  image: string | null;
  series: { category: string; slug: string } | null;
  legacyCode: string | null;
  note?: string;
  en: RawText;
  zh: RawText;
};

export type NewsSeriesRef = {
  /** "KMC-CE · Clymene" — the 2026 catalogue name, identical in every locale. */
  name: string;
  type: string;
  href: string;
};

export type NewsItem = {
  slug: string;
  kind: NewsKind;
  /** ISO date. Sorting key, and the `datetime` attribute. */
  date: string;
  endDate: string | null;
  /** True where the source stated only a year. */
  dateIsApproximate: boolean;
  year: number;
  title: string;
  body: string;
  /** Exhibition entries only: the source's own date line and booth number. */
  dateline: string | null;
  booth: string | null;
  image: string | null;
  series: NewsSeriesRef | null;
  /** Search synonym. Never rendered — see rule 1 above. */
  legacyCode: string | null;
};

const raw = (newsJson as { items: RawItem[] }).items;

function resolveSeries(reference: RawItem['series']): NewsSeriesRef | null {
  if (!reference) return null;
  const category = productCategories.find((entry) => entry.slug === reference.category);
  const series = category?.series.find((entry) => entry.slug === reference.slug);
  // A dangling reference means the taxonomy moved under this file. Dropping the
  // link is right: a news item without a link is still true, and a link to a
  // route that no longer exists is a 404 in front of a buyer.
  if (!category || !series) return null;
  return {
    name: series.name,
    type: series.type,
    href: `/products/${category.slug}/${series.slug}`,
  };
}

function normalise(item: RawItem, locale: Locale): NewsItem {
  const text = locale.startsWith('zh') ? item.zh : item.en;
  return {
    slug: item.slug,
    kind: item.kind,
    date: item.date,
    endDate: item.endDate ?? null,
    dateIsApproximate: item.dateIsApproximate,
    year: Number(item.date.slice(0, 4)),
    title: text.title,
    body: text.body,
    dateline: text.dateline ?? null,
    booth: text.booth ?? null,
    image: item.image,
    series: resolveSeries(item.series),
    legacyCode: item.legacyCode,
  };
}

/** Newest first. Ties break on slug so the order is stable between builds. */
export function newsFor(locale: Locale): NewsItem[] {
  return raw
    .map((item) => normalise(item, locale))
    .sort((a, b) => (a.date === b.date ? a.slug.localeCompare(b.slug) : b.date.localeCompare(a.date)));
}

export function newsItem(slug: string, locale: Locale): NewsItem | null {
  const item = raw.find((entry) => entry.slug === slug);
  return item ? normalise(item, locale) : null;
}

/** Every slug, for `generateStaticParams`. */
export const newsSlugs = raw.map((item) => item.slug);

export const NEWS_KINDS: NewsKind[] = ['exhibition', 'product', 'company'];

/**
 * The most recent item KAO MING has published anywhere.
 *
 * Surfaced rather than hidden. The newest entry is from 2023, and a NEWS section
 * whose top item is three years old is a fact about the section — one the site
 * states plainly on the page instead of letting a visitor work it out.
 */
export const latestNewsYear = Math.max(...raw.map((item) => Number(item.date.slice(0, 4))));
