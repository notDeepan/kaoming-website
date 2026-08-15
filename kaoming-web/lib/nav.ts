import { productCategories } from './taxonomy';

/**
 * The site map from Part E.1, expressed as routes (Part C.2).
 *
 * Two jobs:
 *  1. Drives the header, mega-panel, mobile menu and footer.
 *  2. Acts as the route registry the M0 placeholder catch-all validates
 *     against, so an unbuilt section renders an honest placeholder while a
 *     genuinely wrong URL still 404s.
 *
 * Labels are message keys, never literal strings — the chrome is fully
 * translated (Part R). Product category and series names are the exception:
 * they come from the catalogue via lib/taxonomy and are shown in catalogue form
 * in every locale, which is the whole point of the naming architecture in E.1.
 */

export type NavChild =
  /** Label comes from the `Nav` namespace in messages/*.json. */
  | { kind: 'message'; key: string; href: string }
  /** Label is catalogue-verbatim and identical in every locale (E.1). */
  | { kind: 'literal'; label: string; href: string };

export type NavSection = {
  key: string;
  href: string;
  children: NavChild[];
};

export const navSections: NavSection[] = [
  {
    key: 'products',
    href: '/products',
    children: productCategories.map((category) => ({
      kind: 'literal' as const,
      label: category.name,
      href: `/products/${category.slug}`,
    })),
  },
  {
    key: 'applications',
    href: '/applications',
    children: [
      { kind: 'message', key: 'application.aerospace', href: '/applications/aerospace' },
      { kind: 'message', key: 'application.automotive', href: '/applications/automotive' },
      { kind: 'message', key: 'application.dieMold', href: '/applications/die-mold' },
      { kind: 'message', key: 'application.energy', href: '/applications/energy' },
      { kind: 'message', key: 'application.heavyIndustry', href: '/applications/heavy-industry' },
      { kind: 'message', key: 'application.generalEngineering', href: '/applications/general-engineering' },
    ],
  },
  {
    key: 'technology',
    href: '/technology',
    children: [
      { kind: 'message', key: 'technologyItems.scraping', href: '/technology#scraping' },
      { kind: 'message', key: 'technologyItems.ways', href: '/technology#box-way-vs-linear-way' },
      { kind: 'message', key: 'technologyItems.spindle', href: '/technology#spindle' },
      { kind: 'message', key: 'technologyItems.technicalCenter', href: '/technology#technical-center' },
      { kind: 'message', key: 'technologyItems.quality', href: '/technology#quality' },
    ],
  },
  {
    key: 'company',
    href: '/company/about',
    children: [
      { kind: 'message', key: 'companyItems.about', href: '/company/about' },
      { kind: 'message', key: 'companyItems.history', href: '/company/history' },
      { kind: 'message', key: 'companyItems.factory', href: '/company/factory' },
      { kind: 'message', key: 'companyItems.network', href: '/company/network' },
      { kind: 'message', key: 'companyItems.sustainability', href: '/company/sustainability' },
    ],
  },
  {
    key: 'resources',
    href: '/resources',
    children: [
      { kind: 'message', key: 'resourceItems.catalogues', href: '/resources?type=catalogue' },
      { kind: 'message', key: 'resourceItems.brochures', href: '/resources?type=brochure' },
      { kind: 'message', key: 'resourceItems.specifications', href: '/resources?type=specification' },
      { kind: 'message', key: 'resourceItems.videos', href: '/resources?type=video' },
      { kind: 'message', key: 'resourceItems.caseStudies', href: '/case-studies' },
      { kind: 'message', key: 'resourceItems.news', href: '/resources?type=news' },
    ],
  },
  {
    key: 'support',
    href: '/support/contact',
    children: [
      { kind: 'message', key: 'supportItems.service', href: '/support/service' },
      { kind: 'message', key: 'supportItems.parts', href: '/support/parts' },
      { kind: 'message', key: 'supportItems.faq', href: '/support/faq' },
      { kind: 'message', key: 'supportItems.contact', href: '/support/contact' },
      { kind: 'message', key: 'supportItems.representatives', href: '/support/representatives' },
    ],
  },
];

export const RFQ_HREF = '/rfq';

/**
 * Routes that now have a real page. They are excluded from the placeholder
 * registry so the catch-all never tries to generate a path that a real route
 * already owns. Each milestone moves entries into this list.
 */
const BUILT_ROUTES = new Set<string>([
  '/products',
  ...productCategories.map((category) => `/products/${category.slug}`),
  ...productCategories.flatMap((category) =>
    category.series.map((series) => `/products/${category.slug}/${series.slug}`),
  ),
  '/resources',
  '/rfq',
  '/compare',
  // M7 — every remaining route in the Part E.1 site map.
  '/applications',
  '/applications/aerospace',
  '/applications/automotive',
  '/applications/die-mold',
  '/applications/energy',
  '/applications/heavy-industry',
  '/applications/general-engineering',
  '/technology',
  '/company/about',
  '/company/history',
  '/company/factory',
  '/company/network',
  '/company/sustainability',
  '/support/service',
  '/support/parts',
  '/support/faq',
  '/support/contact',
  '/support/representatives',
  '/case-studies',
  '/catalogue',
]);

/** Routes the chrome links to that no milestone has built yet. Anything not in
 *  here and not a real route is a 404, not a placeholder. */
export const placeholderRoutes: string[] = [
  ...navSections.flatMap((section) => [
    section.href,
    ...section.children.map((child) => child.href),
  ]),
  ...productCategories.flatMap((category) => [
    `/products/${category.slug}`,
    ...category.series.map((series) => `/products/${category.slug}/${series.slug}`),
  ]),
  RFQ_HREF,
  '/compare',
  '/case-studies',
]
  // Strip hashes and query strings — they are page state, not routes.
  .map((href) => href.split(/[?#]/)[0])
  .filter(
    (href, index, all) =>
      href !== '/' && !BUILT_ROUTES.has(href) && all.indexOf(href) === index,
  )
  .sort();
