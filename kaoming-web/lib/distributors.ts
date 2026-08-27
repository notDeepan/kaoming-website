import distributorsJson from '@/content/company/distributors.json';
import { NETWORK } from './company';

/**
 * The agent network (Part J.4). 41 agents, KAO MING's own five regions.
 *
 * Two rules the source file states and this module enforces, rather than
 * leaving to whoever writes the page:
 *
 * **Privacy.** Several records expose an individual's personal email or mobile.
 * The public site publishes the company's general address, telephone and
 * website, and routes everything else through the RFQ. `contactEmail` is
 * therefore only carried through when it is plainly a company address — a
 * personal mailbox at a company domain is still somebody's inbox on a page
 * indexed by search engines.
 *
 * **Staleness.** Agent lists rot. The file says every entry needs confirming
 * with sales before launch; `VERIFY_BEFORE_LAUNCH` carries that to the page so
 * the caveat ships with the data instead of being lost in a JSON file.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = Record<string, any>;
const source = distributorsJson as Loose;

export type Agent = {
  id: string;
  country: string;
  name: string;
  url: string | null;
  address: string | null;
  tel: string | null;
  fax: string | null;
  /** Only ever a general company address. Personal mailboxes are withheld. */
  contactEmail: string | null;
  /** True where a personal address was withheld, so the card can say so. */
  contactWithheld: boolean;
  domestic: boolean;
  note: string | null;
};

export type Region = {
  id: string;
  /** KAO MING's own label, e.g. "EUROPE AREA". */
  label: string;
  agents: Agent[];
};

/**
 * A mailbox that is plainly a role, not a person. Anything else — first.last@,
 * a given name, a mobile-style handle — is withheld and routed through the RFQ.
 *
 * **Anchored at both ends on purpose.** A prefix match is what makes this rule
 * dangerous: `^km` publishes `kmurphy@`, `^mail` publishes `mailene@`, `^sales`
 * publishes `salesman.john@`. Every one of those is a person's inbox on a page
 * search engines index, which is the exact harm the source file's privacy note
 * asks to avoid. A role mailbox is the whole local part, optionally with one
 * qualifier after a separator — `sales`, `info_yzk`, `contacto`, `km`.
 */
const ROLE_NAMES = [
  'info',
  'informacion',
  'contact',
  'contacto',
  'kontakt',
  'sales',
  'service',
  'office',
  'mail',
  'admin',
  'support',
  'export',
  'enquiry',
  'enquiries',
  'inquiry',
  'inquiries',
  'marketing',
  'kmc',
  'km',
] as const;

const ROLE_MAILBOX = new RegExp(`^(${ROLE_NAMES.join('|')})([._-][a-z0-9]+)?$`, 'i');

export function isRoleMailbox(local: string): boolean {
  return ROLE_MAILBOX.test(local);
}

function publishableEmail(email: string | undefined): { email: string | null; withheld: boolean } {
  if (!email) return { email: null, withheld: false };
  const local = email.split('@')[0] ?? '';
  if (isRoleMailbox(local)) return { email, withheld: false };
  return { email: null, withheld: true };
}

const slug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48);

export const regions: Region[] = Object.entries(source.regions as Record<string, Loose[]>).map(
  ([label, agents]) => ({
    id: slug(label),
    label,
    agents: agents.map((agent, index) => {
      const { email, withheld } = publishableEmail(agent.email as string | undefined);
      return {
        id: `${slug(label)}-${index}-${slug(String(agent.agent))}`,
        country: agent.country as string,
        name: agent.agent as string,
        url: (agent.url as string) ?? null,
        address: (agent.address as string) ?? null,
        tel: (agent.tel as string) ?? null,
        fax: (agent.fax as string) ?? null,
        contactEmail: email,
        contactWithheld: withheld,
        domestic: agent.domestic === true,
        note: (agent.note as string) ?? null,
      };
    }),
  }),
);

export const allAgents: Agent[] = regions.flatMap((region) => region.agents);

/**
 * KAO MING divides two markets into territories — "Northern France" and
 * "Southern India" are their words, and each has its own agent. They are
 * territories of one country, so a country count has to fold them back.
 */
const TERRITORY_OF: Record<string, string> = {
  'Northern France': 'France',
  'Southern France': 'France',
  'Northern India': 'India',
  'Southern India': 'India',
};

export const countryOf = (territory: string) => TERRITORY_OF[territory] ?? territory;

/**
 * Counted from the registry, not copied from its summary.
 *
 * The source file's `coverage_summary` says "32 international agents across 33
 * countries". The registry itself lists **40 international agent records across
 * 32 countries** — the 32 in that summary is the country count wearing the
 * agents' label, because eight countries have more than one agent. Publishing
 * the summary's figure would understate KAO MING's own network by eight.
 *
 * These are agent *locations*, not companies: Bendertechniek appears in both
 * the Netherlands and Belgium as two legal entities, and both are real places a
 * buyer can call.
 */
const international = allAgents.filter((agent) => !agent.domestic);

export const networkCounts = {
  total: allAgents.length,
  international: international.length,
  domestic: allAgents.filter((agent) => agent.domestic).length,
  countries: new Set(international.map((agent) => countryOf(agent.country))).size,
  /** Territories as KAO MING names them, which is more than the country count. */
  territories: new Set(international.map((agent) => agent.country)).size,
};

/**
 * The chrome states these totals without loading the registry (see `NETWORK` in
 * lib/company). Two copies of a number is how a footer ends up claiming 32
 * agents on a site that lists 34, so the copies are checked against each other
 * here — at module scope, which runs during the build.
 */
if (
  NETWORK.international !== networkCounts.international ||
  NETWORK.domestic !== networkCounts.domestic ||
  NETWORK.countries !== networkCounts.countries
) {
  throw new Error(
    `Network totals disagree: lib/company states ${NETWORK.international}/${NETWORK.domestic} ` +
      `agents in ${NETWORK.countries} countries, the registry has ` +
      `${networkCounts.international}/${networkCounts.domestic} in ${networkCounts.countries}.`,
  );
}

export const VERIFY_BEFORE_LAUNCH = source.verify_before_launch as string;
export const NETWORK_SOURCE = source.source as string;

/**
 * Where each country sits, for the marker layout.
 *
 * These are country centroids — geography, not KAO MING data — used to place a
 * marker on a graticule. Part J.4 asks for a brand-styled map rather than
 * Google tiles; drawing coastlines nobody supplied would be inventing a
 * picture, so the page draws the grid and the markers and lets the arrangement
 * carry the geography. "Northern France" and "Southern India" are KAO MING's
 * own territory names, offset within the country so two agents do not stack.
 */
const COORDINATES: Record<string, [number, number]> = {
  'U.S.A.': [39.0, -98.0],
  Canada: [56.0, -106.0],
  Mexico: [23.0, -102.0],
  Brazil: [-14.0, -51.0],
  Argentina: [-38.0, -64.0],
  Peru: [-9.0, -75.0],
  Germany: [51.0, 10.0],
  Italy: [42.8, 12.6],
  Switzerland: [46.8, 8.2],
  Austria: [47.5, 14.6],
  Netherlands: [52.1, 5.3],
  Belgium: [50.6, 4.5],
  'Northern France': [49.5, 2.5],
  'Southern France': [44.0, 4.5],
  Sweden: [60.1, 15.6],
  Denmark: [56.0, 9.5],
  Finland: [62.0, 26.0],
  'Czech Republic': [49.8, 15.5],
  Turkey: [39.0, 35.2],
  Russia: [55.8, 37.6],
  'U.A.E.': [24.0, 54.0],
  Israel: [31.5, 34.8],
  Egypt: [26.8, 30.8],
  'South Africa': [-30.6, 22.9],
  'Northern India': [28.6, 77.2],
  'Southern India': [12.9, 77.6],
  Japan: [36.2, 138.3],
  Korea: [36.5, 127.9],
  China: [35.9, 104.2],
  Thailand: [15.9, 100.99],
  Malaysia: [4.2, 101.98],
  Indonesia: [-2.5, 118.0],
  Taiwan: [23.7, 121.0],
  Australia: [-25.3, 133.8],
  'New Zealand': [-41.0, 174.9],
};

export type Marker = {
  country: string;
  /** 0–1 across the map, west to east. */
  x: number;
  /** 0–1 down the map, north to south. */
  y: number;
  regionId: string;
  agents: Agent[];
};

/**
 * One marker per country, carrying every agent in it — Canada, Belgium, France,
 * Russia, India, Japan, China and Taiwan each have more than one, and the spec
 * is explicit that a marker must expand to a list rather than a single card.
 *
 * Equirectangular, clipped to 60°N–50°S: the full ±90° range spends half the
 * height on ice nobody has an agent in.
 */
const NORTH = 72;
const SOUTH = -52;

/** The one projection. Everything on the map goes through it. */
function project(latitude: number, longitude: number): { x: number; y: number } {
  return { x: (longitude + 180) / 360, y: (NORTH - latitude) / (NORTH - SOUTH) };
}

/**
 * Houli, Taichung — where every one of these machines is built and shipped from.
 *
 * Exported separately from the agent markers because it is not an agent: it is
 * the point the network radiates from, it is on the map whether or not Taiwan's
 * domestic agents are shown, and it is the only marker on the page that is a
 * fact about KAO MING rather than about a distributor.
 */
export const HQ = {
  country: 'Taiwan',
  city: 'Houli, Taichung',
  ...project(...(COORDINATES.Taiwan as [number, number])),
};

export function markersFor(regionId: string | null, includeDomestic: boolean): Marker[] {
  const byCountry = new Map<string, Marker>();

  for (const region of regions) {
    if (regionId && region.id !== regionId) continue;

    for (const agent of region.agents) {
      if (agent.domestic && !includeDomestic) continue;
      const coordinates = COORDINATES[agent.country];
      if (!coordinates) continue;

      const existing = byCountry.get(agent.country);
      if (existing) {
        existing.agents.push(agent);
        continue;
      }

      byCountry.set(agent.country, {
        country: agent.country,
        ...project(...coordinates),
        regionId: region.id,
        agents: [agent],
      });
    }
  }

  return [...byCountry.values()].sort((a, b) => a.country.localeCompare(b.country));
}
