import companyJson from '@/content/company/company.json';

/**
 * KAO MING's own facts, normalised (Part J.2, J.3, E.1 technology section).
 *
 * Everything here was transcribed verbatim from kaoming.com.
 *
 * The history pairing used to be withheld: the source carried a warning that
 * the Wix carousel scrambled which event belonged to which year, and printing
 * ten years beside ten events would have been a guess wearing the clothes of a
 * fact. That warning has since been discharged rather than overruled. The
 * carousel scrambles *reading order*, but the page's stored layout does not —
 * every year and every milestone is a positioned box, and sorting those boxes
 * recovers a two-column timeline with no ambiguity. The Traditional-Chinese
 * page decodes to the identical pairing, independently. `content/company/
 * company.json` records the method; `historyTimeline` below is the result.
 *
 * One thing this file still deliberately does not do: it does not fill in the
 * three technology pillars whose content the source records as "not yet
 * captured". A section header with invented body copy underneath is worse than
 * a section that says the copy is coming.
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

/**
 * The same positioning, written by someone who is not KAO MING.
 *
 * Everything else on the About page is the company describing itself, which a
 * buyer discounts and is right to. This is the one statement of the same facts
 * from a third party — the Mechanical Industry Network, published by ITRI, in
 * its announcement of the 2025 lean-management event — so it is carried as what
 * it is: attributed, dated, and linked.
 */
export const positioningCorroborated = {
  statement: source.identity.positioning_corroborated_2025.statement_en as string,
  source: source.identity.positioning_corroborated_2025.source as string,
};

export type SocialLink = { id: string; label: string; href: string };

/**
 * The three accounts KAO MING links from its own footer, in the order it links
 * them. Nothing is added: an account this company does not run is not a social
 * link, it is a claim.
 */
export const socialLinks: SocialLink[] = Object.entries(
  source.contact.social as Record<string, string>,
).map(([id, href]) => ({
  id,
  // Platform names are proper nouns and stay in Latin script in both locales.
  label: id.charAt(0).toUpperCase() + id.slice(1),
  href,
}));

export const contact = {
  /** The CTSP plant — the address KAO MING puts in its own footer. */
  address: source.contact.address_en as string,
  /** Registered head office, Fongyuan. Only the CONTACT page states it. */
  headOffice: source.contact.head_office_en as string,
  headOfficeZh: source.contact.head_office_zh as string,
  plantZh: source.contact.plant_zh as string,
  /** Taiwan uniform invoice number — a buyer's finance department asks for it. */
  uniformNumber: source.contact.uniform_number as string,
  tel: source.contact.tel as string,
  fax: source.contact.fax as string,
  email: source.contact.email as string,
  social: source.contact.social as Record<string, string>,
  socialLinks,
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

export type Milestone = {
  year: number;
  /** The milestone in the reader's locale, verbatim from that locale's page. */
  text: string;
};

type RawMilestone = { year: number; en: string; zh: string };

const rawTimeline = source.history_milestones.timeline as RawMilestone[];

/**
 * The milestones, in the reader's own language.
 *
 * Not a translation: KAO MING wrote both, and where the two differ the
 * difference is theirs to reconcile, not this site's to average. The 2008
 * milestone is the live example — 25,000 square metres in English, 40,000 in
 * Traditional Chinese. Each locale prints what its own source page says, and
 * company.json records the discrepancy for whoever asks KAO MING about it.
 */
export function milestonesFor(locale: string): Milestone[] {
  const chinese = locale.startsWith('zh');
  return rawTimeline.map((entry) => ({
    year: entry.year,
    text: chinese ? entry.zh : entry.en,
  }));
}

export const history = {
  years: rawTimeline.map((entry) => entry.year),
  events: rawTimeline.map((entry) => entry.en),
  pairingConfirmed: source.history_milestones.pairing_confirmed === true,
  corroborated: source.history_milestones.corroborated_elsewhere as string,
  /** The founding year and the most recent milestone, for the page's numbers. */
  span: [rawTimeline[0].year, rawTimeline[rawTimeline.length - 1].year] as const,
};

/* ---------------------------------------------- corporate social responsibility */

type Bilingual = { en: string; zh: string };
const pick = (value: Bilingual, locale: string) =>
  locale.startsWith('zh') ? value.zh : value.en;

const csrSource = source.social_responsibility as {
  heading: Bilingual;
  statement: Bilingual;
  equipment_heading: Bilingual;
  equipment: Bilingual[];
  policy: Bilingual;
  pillars: Bilingual[];
};

export type Csr = {
  heading: string;
  statement: string;
  equipmentHeading: string;
  equipment: string[];
  policy: string;
  pillars: string[];
};

/**
 * The ABOUT page's own third section on kaoming.com, which the first build of
 * this site dropped: it kept the seven energy claims as a "sustainability" page
 * and lost the commitment they hang off, the five pillars, and the fact that
 * KAO MING files this under social responsibility rather than under green
 * marketing. All of it is verbatim, per locale.
 */
export function csrFor(locale: string): Csr {
  return {
    heading: pick(csrSource.heading, locale),
    statement: pick(csrSource.statement, locale),
    equipmentHeading: pick(csrSource.equipment_heading, locale),
    equipment: csrSource.equipment.map((item) => pick(item, locale)),
    policy: pick(csrSource.policy, locale),
    pillars: csrSource.pillars.map((item) => pick(item, locale)),
  };
}

/** The one measurable figure on the page, and the only one. */
export const CO2_REDUCTION_KG_PER_YEAR = 18_000;

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
