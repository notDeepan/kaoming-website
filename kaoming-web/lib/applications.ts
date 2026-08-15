import { pillars } from './company';

/**
 * The six industries (Part J.1, Part E.1).
 *
 * **KAO MING has published nothing here.** The site audit in `company.json`
 * records their own applications page as the single biggest content gap on
 * kaoming.com: it says "updating", and the industry, materials and
 * multi-angle-machining sections have never been filled in.
 *
 * So an application page cannot say what KAO MING has done in aerospace. What it
 * *can* say is what KAO MING has published about which way type suits which
 * industry — the box-way and linear-way pillars each end with a verbatim
 * "Industries:" line, and those lines are real, sourced, and genuinely useful to
 * a buyer choosing between two machines. Everything beyond that is routing:
 * the machines, the specification, the enquiry.
 *
 * The industry list itself is Part G.10's, and the routes are Part E.1's.
 */

export type Application = {
  slug: string;
  /** Key under `Nav.application` in messages. */
  key: string;
  /**
   * Verbatim lines from `company.json` that name this industry, with the pillar
   * they came from. Empty for an industry KAO MING has not named anywhere.
   */
  evidence: { pillar: string; pillarId: string; line: string }[];
};

export const APPLICATION_SLUGS = [
  'aerospace',
  'automotive',
  'die-mold',
  'energy',
  'heavy-industry',
  'general-engineering',
] as const;

export type ApplicationSlug = (typeof APPLICATION_SLUGS)[number];

const KEY_BY_SLUG: Record<ApplicationSlug, string> = {
  aerospace: 'aerospace',
  automotive: 'automotive',
  'die-mold': 'dieMold',
  energy: 'energy',
  'heavy-industry': 'heavyIndustry',
  'general-engineering': 'generalEngineering',
};

/**
 * Words that identify an industry inside a verbatim line. Matching on the words
 * KAO MING actually wrote — "aviation", "automobile", "molds" — rather than on
 * the industry's own name, because the source does not use our vocabulary.
 */
const TERMS: Record<ApplicationSlug, RegExp> = {
  aerospace: /\b(aviation|aerospace|aircraft|marine)\b/i,
  automotive: /\b(automobile|automotive|vehicle)\b/i,
  'die-mold': /\b(mold|mould|die)s?\b/i,
  energy: /\b(energy|turbine|wind|power)\b/i,
  'heavy-industry': /\b(heavy[- ]duty|heavy\/rough|heavy cutting|machine parts)\b/i,
  'general-engineering': /\b(general engineering|machine parts|complex workpieces)\b/i,
};

/** Only the lines that state industries — a pillar's other points are technical. */
function industryLines(): { pillar: string; pillarId: string; line: string }[] {
  return pillars.flatMap((pillar) =>
    pillar.points
      .filter((point) => /^Industries:/i.test(point) || /^Advantage:/i.test(point))
      .map((line) => ({ pillar: pillar.title, pillarId: pillar.id, line })),
  );
}

export const applications: Application[] = APPLICATION_SLUGS.map((slug) => ({
  slug,
  key: KEY_BY_SLUG[slug],
  evidence: industryLines().filter((entry) => TERMS[slug].test(entry.line)),
}));

export function applicationFor(slug: string): Application | undefined {
  return applications.find((application) => application.slug === slug);
}
