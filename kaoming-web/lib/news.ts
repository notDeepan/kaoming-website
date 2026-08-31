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
 *  2. **A date the source did not state is never invented.** `datePrecision`
 *     records how much of the date the source actually gave — a day, a month or
 *     a year — and the site prints exactly that much. A visible "1 January" that
 *     no source ever stated is a false claim, and the ISO `date` beneath it
 *     exists to sort and to be machine-read, not to be shown.
 *
 *  3. **Third-party coverage is cited, never reproduced.** Trade-press articles
 *     are not KAO MING's to republish. `press` carries an outlet, a date, one
 *     short quotation and a link out — the credibility marker and the whole of
 *     what is reproduced.
 */

type Locale = string;

export type NewsKind = 'exhibition' | 'product' | 'company';

/** How much of the date the source actually stated. */
export type DatePrecision = 'day' | 'month' | 'year';

export type NewsPress = {
  outlet: string;
  /** ISO date of the article, where the source gave one. */
  date: string | null;
  url: string;
  /** One short quotation. Never an article body — see rule 3 above. */
  quote: string | null;
};

type RawText = {
  title: string;
  body: string;
  dateline?: string;
  booth?: string;
  venue?: string;
};

type RawPress = {
  outlet: string;
  date: string | null;
  url: string;
  quote: string | null;
};

type RawItem = {
  slug: string;
  kind: NewsKind;
  date: string;
  endDate?: string;
  dateIsApproximate: boolean;
  datePrecision?: DatePrecision;
  featured?: boolean;
  specCaveat?: boolean;
  image: string | null;
  series: { category: string; slug: string } | null;
  legacyCode: string | null;
  note?: string;
  sourceRef?: string;
  sourceNote?: string;
  imagesWanted?: string;
  press?: RawPress[];
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
  /** True where the source stated less than a full date. */
  dateIsApproximate: boolean;
  datePrecision: DatePrecision;
  year: number;
  title: string;
  body: string;
  /** Exhibition entries only: the source's own date line and booth number. */
  dateline: string | null;
  booth: string | null;
  /** Where it happened, where the source names a venue. */
  venue: string | null;
  image: string | null;
  series: NewsSeriesRef | null;
  /** Search synonym. Never rendered — see rule 1 above. */
  legacyCode: string | null;
  /** Lead entries. Newest first among themselves. */
  featured: boolean;
  /**
   * The figures in this entry come from trade-press coverage, not from a KAO
   * MING catalogue, and the page says so where it prints them. True only for
   * the KMC-123EU launch, whose Epeius series has no 2026 catalogue in the kit.
   */
  specCaveat: boolean;
  press: NewsPress[];
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
    // Older entries predate the field and were all year-only where approximate.
    datePrecision: item.datePrecision ?? (item.dateIsApproximate ? 'year' : 'day'),
    year: Number(item.date.slice(0, 4)),
    title: text.title,
    body: text.body,
    dateline: text.dateline ?? null,
    booth: text.booth ?? null,
    venue: text.venue ?? null,
    image: item.image,
    series: resolveSeries(item.series),
    legacyCode: item.legacyCode,
    featured: item.featured === true,
    specCaveat: item.specCaveat === true,
    press: item.press ?? [],
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

/**
 * The date, printed to exactly the precision the source stated.
 *
 * Both the card and the entry page need this and they must not disagree, which
 * is the whole reason it lives here rather than twice in the components. A
 * source that gave a month gets a month; one that gave a year gets a year. The
 * ISO value goes in `<time dateTime>` either way — it is the sort key and the
 * format a search engine reads, and "2023-03-01" behind a visible "March 2023"
 * is honest in a way a visible "1 March 2023" would not be.
 */
export function newsStamp(item: NewsItem, locale: Locale): string {
  if (item.datePrecision === 'year') return String(item.year);
  const date = new Date(item.date);
  if (item.datePrecision === 'month') {
    return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }).format(date);
  }
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/** Every slug, for `generateStaticParams`. */
export const newsSlugs = raw.map((item) => item.slug);

export const NEWS_KINDS: NewsKind[] = ['exhibition', 'product', 'company'];

/**
 * The most recent item KAO MING has published anywhere.
 *
 * Surfaced rather than hidden, and the page says so when it has gone stale. It
 * was 2023 when this section was built from kaoming.com alone, which is why the
 * staleness notice exists at all; the 2026 research closed that gap and the
 * notice now stays quiet on its own, because it reads the data rather than a
 * hard-coded year.
 */
export const latestNewsYear = Math.max(...raw.map((item) => Number(item.date.slice(0, 4))));

/**
 * The lead entries, newest first.
 *
 * A section with eleven entries does not need a hierarchy imposed on it, but it
 * does need the two that matter most to a buyer — the newest machine and the
 * newest proof the company is moving — above the ones from 2018.
 */
export function featuredNews(locale: Locale): NewsItem[] {
  return newsFor(locale).filter((item) => item.featured);
}
