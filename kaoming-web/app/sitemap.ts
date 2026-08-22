import type { MetadataRoute } from 'next';
import { routing } from '@/i18n/routing';
import { APPLICATION_SLUGS } from '@/lib/applications';
import { catalogues } from '@/lib/catalogue';
import { newsSlugs } from '@/lib/news';
import { allSeries } from '@/lib/machines';
import { productCategories } from '@/lib/taxonomy';
import { ALLOW_INDEXING, SITE_URL } from '@/lib/site';

/**
 * Localized sitemap (Part R).
 *
 * Every route is listed once per locale, each entry carrying `alternates` so a
 * crawler is told about the other language rather than having to find it. That
 * is the same information as the `hreflang` tags in the page head; a sitemap
 * that disagrees with the head is worse than one that does not exist.
 *
 * `/rfq` and `/compare` are omitted deliberately — an enquiry form and a
 * transient comparison are not search results.
 *
 * The whole file is empty while indexing is off. The redesign is not approved
 * and must not be crawlable under KAO MING's name yet (Appendix 2); shipping a
 * sitemap that invites crawling of a `noindex` site would just be noise.
 */

const STATIC_PATHS = [
  '',
  '/products',
  '/news',
  '/applications',
  ...APPLICATION_SLUGS.map((slug) => `/applications/${slug}`),
  '/technology',
  '/company/about',
  '/company/history',
  '/company/factory',
  '/company/network',
  '/company/sustainability',
  '/resources',
  '/case-studies',
  '/catalogue',
  '/support/service',
  '/support/parts',
  '/support/faq',
  '/support/contact',
  '/support/representatives',
];

/**
 * Both of these are computed from committed content and never vary per
 * request. Saying so explicitly is required by `output: export` (the Pages
 * build) and is simply true of every other build.
 */
export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  if (!ALLOW_INDEXING) return [];

  const paths = [
    ...STATIC_PATHS,
    ...productCategories.map((category) => `/products/${category.slug}`),
    ...allSeries.map((series) => `/products/${series.categorySlug}/${series.slug}`),
    ...catalogues.map((catalogue) => `/catalogue/${catalogue.slug}`),
    ...newsSlugs.map((slug) => `/news/${slug}`),
  ];

  return routing.locales.flatMap((locale) =>
    paths.map((path) => ({
      url: `${SITE_URL}/${locale}${path}`,
      lastModified: new Date(),
      // A product page is the point of the site; the chrome around it is not.
      priority: path.startsWith('/products/') ? 0.9 : path === '' ? 1 : 0.6,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((other) => [other, `${SITE_URL}/${other}${path}`]),
        ),
      },
    })),
  );
}
