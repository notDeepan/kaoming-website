import companyJson from '@/content/company/company.json';

/**
 * KAO MING's own facts, normalised (Part J.2, J.3, E.1 technology section).
 *
 * Everything here was transcribed verbatim from kaoming.com. Two things this
 * file deliberately does *not* do:
 *
 *  1. It does not pair history years with history events. The source carries a
 *     warning that the Wix carousel scrambled the pairing and that it must be
 *     confirmed with KAO MING before publishing. Ten years and ten events in the
 *     same order look like ten pairs; publishing them as pairs would be a guess
 *     printed as a fact, on the one page a visitor reads as the company's own
 *     account of itself.
 *
 *  2. It does not fill in the three technology pillars whose content the source
 *     records as "not yet captured". A section header with invented body copy
 *     underneath is worse than a section that says the copy is coming.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = Record<string, any>;
const source = companyJson as Loose;

export type Pillar = {
  id: string;
  title: string;
  points: string[];
  /** True where kaoming.com has a section but its copy was never captured. */
  pending: boolean;
};

export type Award = {
  type: 'patent' | 'certification' | 'award';
  id: string;
  subject: string | null;
  kind: string | null;
  note: string | null;
};

export const identity = {
  legalName: source.identity.legal_name as string,
  chineseName: source.identity.chinese_name as string,
  tagline: source.identity.tagline as string,
  founding: source.identity.founding as string,
  originStory: source.identity.origin_story as string,
  salesPresence: source.identity.sales_presence as string,
  positioningClaims: source.identity.positioning_claims_verbatim as string[],
  brandMarks: source.identity.brand_marks as string[],
};

export const contact = {
  address: source.contact.address_en as string,
  tel: source.contact.tel as string,
  fax: source.contact.fax as string,
  email: source.contact.email as string,
  social: source.contact.social as Record<string, string>,
};

/**
 * The pillars behind the Technology page. A pillar whose only stated point says
 * the content was never captured is marked `pending` and renders as a gap.
 */
export const pillars: Pillar[] = (source.manufacturing_process_pillars as Loose[]).map(
  (pillar) => {
    const points = (pillar.verbatim_points as string[]) ?? [];
    const pending = points.every((point) => /not yet captured|content not/i.test(point));
    return {
      id: pillar.id as string,
      title: pillar.title as string,
      points: pending ? [] : points,
      pending,
    };
  },
);

export const awards: Award[] = (source.patents_and_awards as Loose[]).map((entry) => ({
  type: entry.type as Award['type'],
  id: entry.id as string,
  subject: (entry.subject as string) ?? null,
  kind: (entry.kind as string) ?? null,
  note: (entry.note as string) ?? null,
}));

export const sustainability = {
  claims: source.sustainability.claims_verbatim as string[],
  pillars: source.sustainability.pillars as string[],
};

/**
 * Years and events, kept apart on purpose. `pairingConfirmed` is the flag that
 * flips this into a paired timeline the day KAO MING confirms the order — and
 * nothing else in the page needs to change when it does.
 */
export const history = {
  years: source.history_milestones.years_listed as number[],
  events: source.history_milestones.events_listed as string[],
  pairingConfirmed: false,
  corroborated: source.history_milestones.corroborated_elsewhere as string,
};

/** The plant, for the numbers strip. Stated in the 2008 milestone verbatim. */
export const PLANT_AREA_M2 = 25_000;

/* ------------------------------------------------- the chrome's flat view */

/**
 * The footer, the contact page and the homepage want a handful of these facts
 * flat rather than nested. Same data, one shape each, so a change to the source
 * reaches every one of them.
 */
export const COMPANY = {
  legalName: identity.legalName,
  chineseName: identity.chineseName,
  address: contact.address,
  tel: contact.tel,
  fax: contact.fax,
  email: contact.email,
  foundedYear: Number(identity.founding.match(/\d{4}/)?.[0] ?? 1968),
};

/**
 * Certifications, for the footer strip. Only entries KAO MING actually holds —
 * this is the one place on the site where an invented badge would be a lie a
 * buyer's procurement department checks.
 */
export const CERTIFICATIONS = awards.filter((award) => award.type === 'certification');

/**
 * Network totals, so the footer does not pull in 49 agent records to print one
 * number. `lib/distributors` counts the registry and throws at build time if
 * these drift from it — which is how the discrepancy in the source file's own
 * summary was found: it states 32 international agents where the registry lists
 * 40 across 32 countries.
 */
export const NETWORK = {
  international: 40,
  domestic: 9,
  countries: 32,
  regions: ['AMERICAS', 'EUROPE AREA', 'MIDDLE EAST / AFRICA', 'ASIA', 'OCEANIA'],
};
