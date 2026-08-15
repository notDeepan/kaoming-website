import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CompareTable, type ComparableSeries } from '@/components/compare/compare-table';
import { routing } from '@/i18n/routing';
import { allSeries, specHighlights } from '@/lib/machines';
import { alternatesFor } from '@/lib/site';

const SHELL = 'mx-auto max-w-[1600px] px-5 sm:px-6 xl:px-10';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Compare' });
  return {
    title: t('title'),
    description: t('lede'),
    alternates: alternatesFor(locale, '/compare'),
    // The useful version of this page is always a specific comparison, and
    // those are query strings. Nothing here is worth indexing on its own.
    robots: { index: false, follow: true },
  };
}

/**
 * Part M.2 — machines side by side.
 *
 * The selection lives in the URL, so a comparison is a link: it can be sent to a
 * colleague, pasted into an email to sales, or bookmarked. The tray in the
 * corner only builds it.
 *
 * The page itself is static and hands the whole comparable dataset to the
 * table, which picks from it on the client. See the note in compare-table for
 * why the query is not read here.
 */
export default async function ComparePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('Compare');

  // Row order is the union across every series, in the order the specification
  // itself presents them, so the table reads the same whichever three are picked.
  const rowOrder: string[] = [];
  const comparable: ComparableSeries[] = allSeries.map((series) => {
    const rows: Record<string, string> = {};
    for (const row of [...specHighlights(series, 2), ...series.specGroups.flatMap((g) => g.rows)]) {
      if (!rows[row.label]) rows[row.label] = row.value;
      if (!rowOrder.includes(row.label)) rowOrder.push(row.label);
    }

    return {
      slug: series.slug,
      name: series.name,
      type: series.type,
      categorySlug: series.categorySlug,
      image: series.images[0]?.cut ?? null,
      rows,
    };
  });

  return (
    <div className={`${SHELL} pt-36 pb-32 sm:pt-44`}>
      <p className="km-label text-km-red-glow">{t('label')}</p>
      <h1 className="mt-6 max-w-[16ch] text-h1 text-km-paper uppercase">{t('title')}</h1>
      <p className="mt-8 max-w-[62ch] text-km-steel-400">{t('lede')}</p>

      {/* The fallback reserves the table's box. Without it the footer jumps up
          the page while the client reads the selection out of the URL. */}
      <Suspense fallback={<div className="mt-14 min-h-[24rem]" />}>
        <CompareTable series={comparable} rowOrder={rowOrder} />
      </Suspense>
    </div>
  );
}
