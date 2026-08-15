'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';
import { track } from '@/lib/analytics';
import { Link } from '@/i18n/navigation';
import { markersFor, regions, type Agent } from '@/lib/distributors';

/**
 * The global network (Part J.4).
 *
 * **Why there are no coastlines.** The spec asks for a brand-styled SVG map
 * rather than Google tiles. Nobody supplied a base map, and drawing one from
 * memory would put a fabricated picture of the world on a page whose entire
 * purpose is to be accurate about where KAO MING actually has representation. So
 * the map is a graticule — real latitude and longitude lines — and the markers
 * sit at their countries' real coordinates. The arrangement carries the
 * geography, and every claim on the page is one KAO MING made.
 *
 * A marker is a country, not an agent: Canada, Belgium, France, Russia, India,
 * Japan, China and Taiwan each have more than one, and the spec requires a
 * marker to expand to a list.
 *
 * Taiwan's nine domestic agents default to hidden on international locales and
 * shown on `/zh-tw`, which is the spec's instruction pending sales' decision.
 */
export function NetworkMap({ domesticDefault }: { domesticDefault: boolean }) {
  const t = useTranslations('Network');

  const [regionId, setRegionId] = useState<string | null>(null);
  const [domestic, setDomestic] = useState(domesticDefault);
  const [open, setOpen] = useState<string | null>(null);

  const markers = useMemo(() => markersFor(regionId, domestic), [regionId, domestic]);
  const selected = markers.find((marker) => marker.country === open) ?? null;

  return (
    <div>
      {/* ------------------------------------------------------ region tabs */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <button
          type="button"
          data-region="all"
          aria-pressed={regionId === null}
          onClick={() => setRegionId(null)}
          className={tabClass(regionId === null)}
        >
          {t('all')}
        </button>
        {regions.map((region) => (
          <button
            key={region.id}
            type="button"
            data-region={region.id}
            aria-pressed={regionId === region.id}
            onClick={() => {
              setRegionId(region.id);
              setOpen(null);
            }}
            className={tabClass(regionId === region.id)}
          >
            {region.label}
          </button>
        ))}

        <label className="km-label ms-auto flex min-h-11 items-center gap-3 text-km-steel-400">
          <input
            type="checkbox"
            checked={domestic}
            onChange={(event) => setDomestic(event.target.checked)}
            className="size-4 accent-km-red"
          />
          {t('showDomestic')}
        </label>
      </div>

      {/* ------------------------------------------------------------ map */}
      <div className="relative mt-8 border border-km-steel-600/60 bg-km-charcoal">
        <svg
          viewBox="0 0 1000 460"
          role="img"
          aria-label={t('mapAlt', { count: markers.length })}
          className="block h-auto w-full"
        >
          {/* The graticule: meridians every 30°, parallels every 20°. Real
              lines, and the only spatial reference on the page — with no
              coastlines to read against, a marker means nothing unless the frame
              it sits in is legible. The equator and the prime meridian are drawn
              heavier and labelled, because those two are what let someone place
              the rest at a glance. */}
          <g stroke="var(--color-km-steel-600)" strokeWidth="0.75" opacity="0.55">
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

          {/* Equator: 0° latitude on a 72°N–52°S frame. */}
          <g stroke="var(--color-km-steel-400)" strokeWidth="1" opacity="0.7">
            <line x1={0} y1={(72 / 124) * 460} x2={1000} y2={(72 / 124) * 460} />
            <line x1={500} y1={0} x2={500} y2={460} />
          </g>
          <g fill="var(--color-km-steel-400)" fontSize="9" opacity="0.75" className="font-mono">
            <text x={8} y={(72 / 124) * 460 - 6}>
              0°
            </text>
            <text x={506} y={14}>
              0°
            </text>
          </g>

          {markers.map((marker) => {
            const x = marker.x * 1000;
            const y = marker.y * 460;
            const active = open === marker.country;
            return (
              <g key={marker.country}>
                <circle
                  cx={x}
                  cy={y}
                  r={active ? 10 : 6}
                  fill={active ? 'var(--color-km-red)' : 'var(--color-km-blue)'}
                  opacity={active ? 1 : 0.8}
                />
                {marker.agents.length > 1 ? (
                  <text
                    x={x}
                    y={y + 3.5}
                    textAnchor="middle"
                    className="font-mono"
                    fontSize="8"
                    fill="var(--color-km-ink)"
                  >
                    {marker.agents.length}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>

        {/* The markers are decoration; these buttons are the control surface,
            so the map is operable with a keyboard and reads in a screen reader
            as a list of countries rather than as a picture. */}
        <ul className="flex flex-wrap gap-x-2 gap-y-1 border-t border-km-steel-600/60 p-4">
          {markers.map((marker) => (
            <li key={marker.country}>
              <button
                type="button"
                data-country={marker.country}
                aria-pressed={open === marker.country}
                onClick={() => setOpen(open === marker.country ? null : marker.country)}
                className={`km-label min-h-11 px-3 transition-colors duration-(--duration-km) ease-(--ease-km) ${
                  open === marker.country
                    ? 'text-km-red-glow'
                    : 'text-km-steel-400 hover:text-km-offwhite'
                }`}
              >
                {marker.country}
                {marker.agents.length > 1 ? (
                  <span className="ms-2 font-mono text-km-blue">{marker.agents.length}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* --------------------------------------------------- the agent cards */}
      <div className="mt-10">
        {selected ? (
          <>
            <h3 className="km-display text-display-xs text-km-paper">{selected.country}</h3>
            <ul className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {selected.agents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </ul>
          </>
        ) : (
          <p className="text-body text-km-steel-400">{t('choose')}</p>
        )}
      </div>
    </div>
  );
}

function tabClass(active: boolean) {
  return `km-label min-h-11 border px-4 py-2 transition-colors duration-(--duration-km) ease-(--ease-km) ${
    active ? 'border-km-red bg-km-red text-km-paper' : 'border-km-steel-600 text-km-offwhite hover:border-km-offwhite'
  }`;
}

function AgentCard({ agent }: { agent: Agent }) {
  const t = useTranslations('Network');

  return (
    <li data-agent className="flex h-full flex-col border border-km-steel-600/60 p-6">
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

      <div className="mt-auto flex flex-wrap gap-4 pt-6">
        {agent.url ? (
          <a
            href={agent.url.startsWith('http') ? agent.url : `https://${agent.url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="km-label min-h-11 inline-flex items-center text-km-offwhite hover:text-km-red-glow"
          >
            {t('website')}
          </a>
        ) : null}
        {/* Pre-fills country and agent, which is what makes an enquiry through a
            representative land on the right desk (Part J.4). */}
        <Link
          href={`/rfq?source=contact&country=${encodeURIComponent(agent.country)}&agent=${encodeURIComponent(agent.name)}`}
          onClick={() => track({ name: 'distributor_viewed', country: agent.country })}
          className="km-label min-h-11 inline-flex items-center text-km-red-glow hover:text-km-paper"
        >
          {t('enquire')}
        </Link>
      </div>
    </li>
  );
}
