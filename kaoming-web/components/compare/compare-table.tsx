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

  if (!selected.length) {
    return (
      <div className="mt-14 min-h-[24rem] border border-km-steel-600/60 p-10">
        <p className="text-km-steel-400">{t('empty')}</p>
        <Action href="/products" variant="secondary" className="mt-6">
          {t('browse')}
        </Action>
      </div>
    );
  }

  return (
    <div className="mt-14 min-h-[24rem] overflow-x-auto">
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
