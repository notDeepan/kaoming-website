'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useDeferredValue, useMemo, useRef, useState } from 'react';
import { track } from '@/lib/analytics';
import { Link } from '@/i18n/navigation';
import { markersFor, regions, type Agent, type Marker } from '@/lib/distributors';
import { WORLD_LAND_PATH } from '@/content/company/world-land';

/**
 * The global network (Part J.4) — a distributor locator, not a picture of one.
 *
 * **What this replaced, and why.** The first version was a map with a dot per
 * country, a row of country chips under it, and the words "Choose a country to
 * see its representatives" where the answer should have been. Two things were
 * wrong with that, and neither was the map.
 *
 * The first is that the page had no content until you interacted with it. A
 * visitor who wants to know whether KAO MING has anyone in Türkiye had to find
 * "TURKEY" in a wall of thirty-two identical mono chips, click it, and then read
 * the answer somewhere else on the page. The most valuable slot on the page held
 * an instruction.
 *
 * The second is that the map and the list were not the same object. Nothing
 * hovered, nothing linked, a dot could not be clicked. A picture beside a table
 * is not a locator; it is two things that happen to be about the same data.
 *
 * So: every agent is listed from the first frame, the map is a control rather
 * than an illustration, and the two are bound in both directions — hover a
 * country and its marker lights; click a marker and the list scrolls to it.
 * There is a search field, because thirty-two countries is past the point where
 * scanning beats typing.
 *
 * **The base map.** Natural Earth's 1:110m land, public domain, projected at
 * authoring time by scripts/generate-world-land.py into exactly the projection
 * `markersFor` uses for a marker — so a marker cannot sit off its own country.
 * Nothing is invented and nothing is fetched.
 *
 * A marker is a country, not an agent: Canada, Belgium, France, Russia, India,
 * Japan, China and Taiwan each have more than one, and the spec requires a
 * marker to expand to a list.
 *
 * Taiwan's nine domestic agents default to hidden on international locales and
 * shown on `/zh-tw`, which is the spec's instruction pending sales' decision.
 */
export function NetworkMap({
  domesticDefault,
  /**
   * Which half leads. `/company/network` is "how far does this company reach",
   * so it opens on the map; `/support/representatives` is "who do I call", so
   * it opens on the directory. Same data, same component — the difference is
   * which one a visitor's eye lands on first, and on a phone which one is on
   * top.
   */
  lead = 'map',
}: {
  domesticDefault: boolean;
  lead?: 'map' | 'directory';
}) {
  const t = useTranslations('Network');

  const [regionId, setRegionId] = useState<string | null>(null);
  const [domestic, setDomestic] = useState(domesticDefault);
  const [open, setOpen] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  // The list re-renders on every keystroke and can be forty cards long. Keeping
  // the input itself on the urgent update is what stops it feeling laggy on the
  // office machines Part O is written for.
  const deferredQuery = useDeferredValue(query);

  const rows = useRef(new Map<string, HTMLLIElement | null>());

  const markers = useMemo(() => markersFor(regionId, domestic), [regionId, domestic]);

  const needle = deferredQuery.trim().toLowerCase();
  const shown = useMemo(() => {
    if (!needle) return markers;
    return markers.filter(
      (marker) =>
        marker.country.toLowerCase().includes(needle) ||
        marker.agents.some(
          (agent) =>
            agent.name.toLowerCase().includes(needle) ||
            (agent.address ?? '').toLowerCase().includes(needle),
        ),
    );
  }, [markers, needle]);

  const agentCount = shown.reduce((total, marker) => total + marker.agents.length, 0);

  /** Region label for a grouping heading, or null when one region is selected. */
  const groups = useMemo(() => {
    if (regionId) return [{ id: regionId, label: null as string | null, markers: shown }];
    return regions
      .map((region) => ({
        id: region.id,
        label: region.label,
        markers: shown.filter((marker) => marker.regionId === region.id),
      }))
      .filter((group) => group.markers.length > 0);
  }, [regionId, shown]);

  const select = useCallback((country: string | null, fromMap: boolean) => {
    setOpen(country);
    if (country && fromMap) {
      // Clicking a marker has to move the reader to the answer, or the click
      // appears to do nothing on a viewport where the list is off screen.
      rows.current.get(country)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, []);

  const mapPanel = (
    <div>
      <MapPanel
        markers={shown}
        open={open}
        hover={hover}
        onHover={setHover}
        onSelect={(country) => select(country, true)}
        alt={t('mapAlt', { count: shown.length })}
      />

      {/*
       * Under the map rather than over it. The map is sticky and the directory
       * beside it is several screens long, so on a wide viewport this column
       * would otherwise be a short picture above a great deal of nothing — and
       * the two things a reader wants there are how to read the markers and
       * what to do when their country is not one.
       */}
      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <LegendKey className="bg-km-blue">{t('legend.agent')}</LegendKey>
          <LegendKey className="bg-km-red">{t('legend.selected')}</LegendKey>
          <li className="km-label flex items-center gap-2.5 text-km-steel-400">
            <span
              aria-hidden="true"
              className="grid size-4 place-items-center rounded-full bg-km-blue font-mono text-[0.5rem] text-km-black"
            >
              2
            </span>
            {t('legend.count')}
          </li>
        </ul>

        <Link
          href="/rfq?source=contact"
          className="km-label inline-flex min-h-11 shrink-0 items-center text-km-red-glow hover:text-km-paper"
        >
          {t('notListed')}
        </Link>
      </div>
    </div>
  );

  const directory = (
    <div className="flex min-w-0 flex-col">
      <p className="km-label border-b border-km-steel-600/60 pb-3 text-km-steel-400">
        {t('showing', { countries: shown.length, agents: agentCount })}
      </p>

      {groups.length === 0 ? (
        <div className="py-14">
          <p className="text-body text-km-offwhite">{t('empty', { query: query.trim() })}</p>
          <p className="mt-6">
            <Link
              href="/rfq?source=contact"
              className="km-label inline-flex min-h-11 items-center text-km-red-glow hover:text-km-paper"
            >
              {t('emptyAction')}
            </Link>
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-10 pt-8">
          {groups.map((group) => (
            <section key={group.id} aria-label={group.label ?? undefined}>
              {group.label ? (
                <h3 className="km-label flex items-center gap-4 text-km-red-glow">
                  <span aria-hidden="true" className="h-px w-8 shrink-0 bg-km-red" />
                  {group.label}
                </h3>
              ) : null}

              <ul className={group.label ? 'mt-5' : undefined}>
                {group.markers.map((marker) => (
                  <CountryRow
                    key={marker.country}
                    ref={(node) => {
                      rows.current.set(marker.country, node);
                    }}
                    marker={marker}
                    open={open === marker.country}
                    onToggle={() =>
                      select(open === marker.country ? null : marker.country, false)
                    }
                    onHover={setHover}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div>
      {/* ------------------------------------------------------- the controls */}
      <div className="flex flex-col gap-5 border-b border-km-steel-600/60 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-col gap-4">
          <SearchField value={query} onChange={setQuery} label={t('search')} />

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <RegionTab
              active={regionId === null}
              onClick={() => {
                setRegionId(null);
                setOpen(null);
              }}
              data-region="all"
            >
              {t('all')}
            </RegionTab>
            {regions.map((region) => (
              <RegionTab
                key={region.id}
                active={regionId === region.id}
                onClick={() => {
                  setRegionId(region.id);
                  setOpen(null);
                }}
                data-region={region.id}
              >
                {region.label}
              </RegionTab>
            ))}
          </div>
        </div>

        <label className="km-label flex min-h-11 shrink-0 items-center gap-3 text-km-steel-400">
          <input
            type="checkbox"
            checked={domestic}
            onChange={(event) => setDomestic(event.target.checked)}
            className="size-4 accent-km-red"
          />
          {t('showDomestic')}
        </label>
      </div>

      {/*
       * Directory and map side by side from `xl` up, one above the other below
       * it. `lead` decides which comes first in the DOM, which is both the
       * reading order on a phone and the tab order everywhere — so the page's
       * framing and its markup agree rather than being reconciled with `order-*`.
       */}
      <div
        className={`mt-10 grid gap-10 xl:gap-14 ${
          lead === 'map'
            ? 'xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]'
            : 'xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]'
        }`}
      >
        {lead === 'map' ? (
          <>
            <div className="xl:sticky xl:top-28 xl:self-start">{mapPanel}</div>
            {directory}
          </>
        ) : (
          <>
            {directory}
            <div className="xl:sticky xl:top-28 xl:self-start">{mapPanel}</div>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ the map */

function MapPanel({
  markers,
  open,
  hover,
  onHover,
  onSelect,
  alt,
}: {
  markers: Marker[];
  open: string | null;
  hover: string | null;
  onHover: (country: string | null) => void;
  onSelect: (country: string | null) => void;
  alt: string;
}) {
  const labelled = hover ? (markers.find((marker) => marker.country === hover) ?? null) : null;

  return (
    <div className="relative border border-km-steel-600/60 bg-km-charcoal">
      <svg
        viewBox="0 0 1000 460"
        role="img"
        aria-label={alt}
        className="block h-auto w-full"
        onMouseLeave={() => onHover(null)}
      >
        {/* Land, filled as a raised plate with a hairline coast. `fillRule`
            matters — the path carries lakes and inland seas as reversed rings,
            and without it the Caspian fills in. */}
        <path
          d={WORLD_LAND_PATH}
          fillRule="evenodd"
          fill="var(--color-km-steel-800)"
          stroke="var(--color-km-steel-400)"
          strokeOpacity="0.55"
          strokeWidth="0.7"
          strokeLinejoin="round"
        />

        {/* The graticule, at a whisper. With surveyed continents to read
            against it is no longer carrying the geography, so it is back to
            being what it is: a grid. The degree labels the first version needed
            are gone with it — nobody locating a distributor is reading off the
            prime meridian. */}
        <g stroke="var(--color-km-steel-600)" strokeWidth="0.5" opacity="0.22">
          {Array.from({ length: 13 }, (_, index) => (
            <line
              key={`m${index}`}
              x1={(index * 1000) / 12}
              y1={0}
              x2={(index * 1000) / 12}
              y2={460}
            />
          ))}
          {Array.from({ length: 8 }, (_, index) => (
            <line key={`p${index}`} x1={0} y1={(index * 460) / 7} x2={1000} y2={(index * 460) / 7} />
          ))}
        </g>

        {markers.map((marker) => (
          <MapMarker
            key={marker.country}
            marker={marker}
            active={open === marker.country}
            hovered={hover === marker.country}
            onHover={onHover}
            onSelect={onSelect}
          />
        ))}
      </svg>

      {/*
       * The label, in HTML rather than as an SVG `<title>`.
       *
       * `<title>` is the obvious choice and it is the wrong one here: React 19
       * treats `<title>` as a hoistable document element, so the server emits
       * thirty-four empty ones and the client fills them in — a hydration
       * mismatch that takes the whole tree down to a client re-render (React
       * error #418). It is also the browser's own tooltip, which appears after a
       * delay, never on keyboard focus, and cannot be styled.
       *
       * Positioned from the same projection as the marker, in percentages, so it
       * tracks the marker at every width without measuring anything.
       */}
      {labelled ? (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute z-1 -translate-x-1/2 whitespace-nowrap border border-km-steel-600 bg-km-black px-2.5 py-1.5 ${
            // Sweden, Finland and Canada sit close enough to the top edge that a
            // label above them hangs outside the frame. Those flip below.
            labelled.y < 0.18 ? 'translate-y-[0.85rem]' : '-translate-y-[calc(100%+0.85rem)]'
          }`}
          style={{ left: `${labelled.x * 100}%`, top: `${labelled.y * 100}%` }}
        >
          <span className="km-label text-km-paper">{labelled.country}</span>
          {labelled.agents.length > 1 ? (
            <span className="ms-2 font-mono text-spec text-km-blue">{labelled.agents.length}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**
 * One country.
 *
 * A real control, not decoration: focusable, operable from the keyboard, and
 * named for a screen reader. A pointer or a focus ring gets the country and its
 * agent count from the tooltip in `MapPanel` — see the note there for why that
 * is HTML and not an SVG `<title>`. The radius is scaled by how many agents sit
 * behind it, which is the one thing a map can say that a list cannot say as
 * quickly.
 *
 * The ring is painted in the page field rather than in the marker's own colour.
 * Markers sit on land, and land is a near neighbour of theirs in the palette; a
 * ring in the same family would only make the dot look bigger.
 */
function MapMarker({
  marker,
  active,
  hovered,
  onHover,
  onSelect,
}: {
  marker: Marker;
  active: boolean;
  hovered: boolean;
  onHover: (country: string | null) => void;
  onSelect: (country: string | null) => void;
}) {
  const x = marker.x * 1000;
  const y = marker.y * 460;
  const many = marker.agents.length > 1;

  const base = many ? 8 : 6.5;
  const radius = active ? base + 4 : hovered ? base + 2 : base;

  return (
    <g
      role="button"
      tabIndex={0}
      aria-pressed={active}
      aria-label={`${marker.country} — ${marker.agents.length}`}
      data-marker={marker.country}
      className="cursor-pointer outline-none"
      onClick={() => onSelect(active ? null : marker.country)}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        onSelect(active ? null : marker.country);
      }}
      onMouseEnter={() => onHover(marker.country)}
      onFocus={() => onHover(marker.country)}
      onBlur={() => onHover(null)}
    >
      {/* A generous transparent target. The visible dot is 13–16 px across in
          the rendered frame, well under the 44 px Part P asks of a control, and
          this is what makes it hittable without drawing something bigger. */}
      <circle cx={x} cy={y} r={18} fill="transparent" />

      <circle
        cx={x}
        cy={y}
        r={radius + 1.5}
        fill="var(--color-km-black)"
        opacity="0.9"
        className="transition-all duration-(--duration-km) ease-(--ease-km)"
      />
      <circle
        cx={x}
        cy={y}
        r={radius}
        fill={active ? 'var(--color-km-red)' : 'var(--color-km-blue)'}
        className="transition-all duration-(--duration-km) ease-(--ease-km)"
      />
      {/*
       * The numeral has to contrast with whatever the dot is, and the dot is two
       * different colours in two different themes. Brand red is dark in both, so
       * a selected marker takes the light `km-on-brand`. Brand blue is light on
       * the dark theme and dark on the light one — it inverts, exactly as the
       * page field does — so an unselected marker takes `km-black`, which
       * inverts with it. 7.7:1 and 5.6:1 rather than the 2.4:1 a single fixed
       * colour gave on the dark theme.
       */}
      {many ? (
        <text
          x={x}
          y={y + 3.2}
          textAnchor="middle"
          className="pointer-events-none font-mono"
          fontSize="9"
          fill={active ? 'var(--color-km-on-brand)' : 'var(--color-km-black)'}
        >
          {marker.agents.length}
        </text>
      ) : null}
    </g>
  );
}

/* ------------------------------------------------------------ the directory */

function CountryRow({
  ref,
  marker,
  open,
  onToggle,
  onHover,
}: {
  ref: (node: HTMLLIElement | null) => void;
  marker: Marker;
  open: boolean;
  onToggle: () => void;
  onHover: (country: string | null) => void;
}) {
  const t = useTranslations('Network');

  return (
    <li
      ref={ref}
      data-country-row={marker.country}
      className="border-b border-km-steel-600/40"
      onMouseEnter={() => onHover(marker.country)}
      onMouseLeave={() => onHover(null)}
    >
      <button
        type="button"
        data-country={marker.country}
        aria-expanded={open}
        onClick={onToggle}
        className={`flex min-h-12 w-full items-center gap-4 py-3 text-start transition-colors duration-(--duration-km) ease-(--ease-km) ${
          open ? 'text-km-red-glow' : 'text-km-offwhite hover:text-km-red-glow'
        }`}
      >
        <span
          aria-hidden="true"
          className={`size-2 shrink-0 rounded-full transition-colors duration-(--duration-km) ${
            open ? 'bg-km-red' : 'bg-km-blue'
          }`}
        />
        <span className="km-label min-w-0 flex-1 truncate">{marker.country}</span>
        {marker.agents.length > 1 ? (
          <span className="font-mono text-spec text-km-steel-400">{marker.agents.length}</span>
        ) : null}
        <svg
          aria-hidden="true"
          viewBox="0 0 10 6"
          className={`size-2.5 shrink-0 transition-transform duration-(--duration-km) ease-(--ease-km) ${
            open ? 'rotate-180' : ''
          }`}
          fill="none"
        >
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </button>

      {open ? (
        <ul className="flex flex-col gap-4 pb-6">
          {marker.agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} t={t} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function AgentCard({
  agent,
  t,
}: {
  agent: Agent;
  t: ReturnType<typeof useTranslations<'Network'>>;
}) {
  return (
    <li data-agent className="border border-km-steel-600/60 bg-km-steel-800 p-5">
      <h4 className="font-display text-body text-km-paper">{agent.name}</h4>

      <dl className="mt-4 flex flex-col gap-2 text-small">
        {agent.address ? (
          <div>
            <dt className="km-label text-km-steel-400">{t('field.address')}</dt>
            <dd className="mt-1 text-km-offwhite">{agent.address}</dd>
          </div>
        ) : null}
        {agent.tel ? (
          <div className="flex flex-wrap items-baseline gap-3">
            <dt className="km-label text-km-steel-400">{t('field.tel')}</dt>
            <dd className="font-mono text-spec text-km-offwhite">{agent.tel}</dd>
          </div>
        ) : null}
        {agent.contactEmail ? (
          <div className="flex flex-wrap items-baseline gap-3">
            <dt className="km-label text-km-steel-400">{t('field.email')}</dt>
            <dd className="text-km-offwhite break-all">{agent.contactEmail}</dd>
          </div>
        ) : null}
      </dl>

      {agent.contactWithheld ? (
        <p className="km-label mt-4 text-km-steel-400">{t('withheld')}</p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
        {agent.url ? (
          <a
            href={agent.url.startsWith('http') ? agent.url : `https://${agent.url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="km-label inline-flex min-h-11 items-center text-km-offwhite hover:text-km-red-glow"
          >
            {t('website')}
          </a>
        ) : null}
        {/* Pre-fills country and agent, which is what makes an enquiry through a
            representative land on the right desk (Part J.4). */}
        <Link
          href={`/rfq?source=contact&country=${encodeURIComponent(agent.country)}&agent=${encodeURIComponent(agent.name)}`}
          onClick={() => track({ name: 'distributor_viewed', country: agent.country })}
          className="km-label inline-flex min-h-11 items-center text-km-red-glow hover:text-km-paper"
        >
          {t('enquire')}
        </Link>
      </div>
    </li>
  );
}

function LegendKey({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <li className="km-label flex items-center gap-2.5 text-km-steel-400">
      <span aria-hidden="true" className={`size-2.5 rounded-full ${className}`} />
      {children}
    </li>
  );
}

/* -------------------------------------------------------------- the controls */

function SearchField({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <div className="relative w-full max-w-sm">
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-km-steel-400"
        fill="none"
      >
        <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        data-network-search
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        placeholder={label}
        className="min-h-11 w-full border border-km-steel-600 bg-transparent ps-10 pe-3 text-small text-km-offwhite transition-colors duration-(--duration-km) ease-(--ease-km) placeholder:text-km-steel-400 hover:border-km-offwhite focus:border-km-offwhite"
      />
    </div>
  );
}

function RegionTab({
  active,
  children,
  ...props
}: React.ComponentProps<'button'> & { active: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      {...props}
      className={`km-label min-h-11 border px-4 py-2 transition-colors duration-(--duration-km) ease-(--ease-km) ${
        active
          ? 'border-km-red bg-km-red text-km-on-brand'
          : 'border-km-steel-600 text-km-offwhite hover:border-km-offwhite'
      }`}
    >
      {children}
    </button>
  );
}
