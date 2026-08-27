'use client';

import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { Action } from '@/components/ui/action';
import { MachinePlate, type PlateImage } from '@/components/ui/machine-plate';
import { Link } from '@/i18n/navigation';

/**
 * Part M.2 — the comparison itself.
 *
 * The selection is read from the URL on the client, not from `searchParams` on
 * the server, so the route stays statically rendered. Reading search params
 * server-side would make the page dynamic, and Next streams a dynamic page's
 * metadata into the body rather than the head — which quietly voids the
 * `noindex` this page sets.
 *
 * The whole comparable dataset arrives as a prop. It is nine series of short
 * strings; shipping it costs less than the round trip a server render would
 * need, and the comparison then switches instantly as machines are added.
 */

export type ComparableSeries = {
  slug: string;
  name: string;
  type: string;
  categorySlug: string;
  image: PlateImage | null;
  /** Spec label -> transcribed value. Labels are message keys. */
  rows: Record<string, string>;
};

export function CompareTable({
  series,
  rowOrder,
}: {
  series: ComparableSeries[];
  /** Every label any series states, in the order the spec presents them. */
  rowOrder: string[];
}) {
  const t = useTranslations('Compare');
  const tSpec = useTranslations('Spec');
  const params = useSearchParams();
  // True until the client has read the URL. Used only to hold the box height.

  const selected = useMemo(() => {
    const requested = (params.get('m') ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
    return requested
      .map((slug) => series.find((entry) => entry.slug === slug))
      .filter((entry): entry is ComparableSeries => Boolean(entry))
      .slice(0, 3);
  }, [params, series]);

  const rows = useMemo(() => {
    if (!selected.length) return [];
    return rowOrder
      .filter((label) => selected.some((entry) => entry.rows[label]))
      .map((label) => {
        const values = selected.map((entry) => entry.rows[label] ?? null);
        const stated = values.filter((value): value is string => value !== null);
        return { label, values, differs: stated.length > 1 && new Set(stated).size > 1 };
      });
  }, [rowOrder, selected]);

  /*
   * Nothing selected yet.
   *
   * This used to be a 24rem box holding one sentence and a button — a quarter of
   * a screen of ruled emptiness, and the largest dead element on the site. The
   * sentence was also an instruction ("add machines from any product page")
   * rather than a way to do the thing.
   *
   * The whole comparable set is already a prop and the selection is just a URL
   * parameter, so the empty state can be the picker: every series listed, one
   * click away from being in the comparison. No store, no height to reserve —
   * the panel is as tall as its contents.
   */
  if (!selected.length) {
    return (
      <div className="mt-14 border-t border-km-steel-600/60">
        <p className="km-label mt-6 max-w-[60ch] text-km-steel-400">{t('emptyPick')}</p>

        <ul className="mt-8 grid gap-px sm:grid-cols-2 xl:grid-cols-3">
          {series.map((entry) => (
            <li key={entry.slug}>
              <Link
                href={{ pathname: '/compare', query: { m: entry.slug } }}
                data-pick={entry.slug}
                className="group flex min-h-24 items-center justify-between gap-6 border-b border-km-steel-600/40 py-5 transition-colors duration-(--duration-km) ease-(--ease-km) hover:border-km-red sm:pe-8"
              >
                <span className="min-w-0">
                  <span className="block font-display text-body text-km-paper">{entry.name}</span>
                  <span className="mt-1 block text-small text-km-steel-400">{entry.type}</span>
                </span>
                <span
                  aria-hidden="true"
                  className="km-label shrink-0 text-km-steel-400 transition-colors duration-(--duration-km) group-hover:text-km-red-glow"
                >
                  +
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <Action href="/products" variant="text" className="mt-10">
          {t('browse')}
        </Action>
      </div>
    );
  }

  return (
    <div className="mt-14 overflow-x-auto">
      <table className="w-full min-w-[48rem] border-collapse text-left">
        <caption className="sr-only">{t('title')}</caption>
        <thead>
          <tr>
            <th scope="col" className="km-label w-[16rem] px-4 py-4 align-bottom text-km-offwhite">
              {tSpec('model')}
            </th>
            {selected.map((entry) => (
              <th key={entry.slug} scope="col" className="px-4 pb-6 align-bottom">
                {entry.image ? (
                  <MachinePlate
                    image={entry.image}
                    alt={entry.name}
                    glow="sm"
                    sizes="24vw"
                    className="mb-4 max-w-[16rem]"
                  />
                ) : null}
                <Link
                  href={`/products/${entry.categorySlug}/${entry.slug}`}
                  className="font-display text-h3 text-km-paper hover:text-km-red-glow"
                >
                  {entry.name}
                </Link>
                <span className="mt-1 block text-small font-normal text-km-offwhite">
                  {entry.type}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-t border-km-steel-600/40 even:bg-km-charcoal/40">
              <th scope="row" className="px-4 py-3.5 text-left align-top">
                <span className="text-small text-km-steel-400">{tSpec(row.label)}</span>
                {row.differs ? (
                  <span className="km-label ms-2 align-middle text-km-blue">{t('differs')}</span>
                ) : null}
              </th>
              {row.values.map((value, index) => (
                <td
                  key={selected[index].slug}
                  className={`px-4 py-3.5 align-top font-mono text-spec ${
                    value ? 'text-km-offwhite' : 'text-km-steel-400'
                  }`}
                >
                  {value ?? t('notStated')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-km-steel-600/60">
            <td className="px-4 py-8" />
            {selected.map((entry) => (
              <td key={entry.slug} className="px-4 py-8 align-top">
                <Action href={`/rfq?machine=${entry.slug}&source=compare`} variant="primary">
                  {t('quoteFor')}
                </Action>
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
