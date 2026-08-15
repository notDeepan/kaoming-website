import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { RfqForm, type MachineOption } from '@/components/rfq/rfq-form';
import { routing } from '@/i18n/routing';
import { countryOptions } from '@/lib/geo';
import { allSeries } from '@/lib/machines';
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
  const t = await getTranslations({ locale, namespace: 'Rfq' });
  return {
    title: t('title'),
    description: t('lede'),
    alternates: alternatesFor(locale, '/rfq'),
    // An enquiry form is for buyers, not for search results.
    robots: { index: false, follow: true },
  };
}

/**
 * Part M.1, Scene 11 — the page every journey ends on.
 *
 * The machine and the entry point arrive as query parameters, and the form
 * reads them on the client rather than the page reading them on the server.
 * That is deliberate: touching `searchParams` in a Server Component opts the
 * whole route into dynamic rendering, and Next then streams the page's metadata
 * into the body instead of the head — which silently drops the `noindex` on the
 * one page that most needs it. Static rendering keeps the directive real.
 */
export default async function RfqPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('Rfq');

  const machines: MachineOption[] = allSeries.map((series) => ({
    slug: series.slug,
    name: series.name,
    category: series.categorySlug,
  }));

  return (
    <div className={`${SHELL} pt-36 pb-24 sm:pt-44`}>
      <p className="km-label text-km-red-glow">{t('label')}</p>
      <h1 className="mt-6 max-w-[18ch] text-h1 text-km-paper uppercase">{t('title')}</h1>
      <p className="mt-8 max-w-[62ch] text-km-steel-400">{t('lede')}</p>

      <div className="mt-14">
        <RfqForm machines={machines} countries={countryOptions(locale)} />
      </div>
    </div>
  );
}
