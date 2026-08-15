import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { NetworkMap } from '@/components/company/network-map';
import { PageHeader, Provenance, SHELL } from '@/components/ui/page-shell';
import { routing } from '@/i18n/routing';
import { networkCounts, VERIFY_BEFORE_LAUNCH } from '@/lib/distributors';
import { alternatesFor } from '@/lib/site';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Network' });
  return {
    title: t('representativesTitle'),
    description: t('lede', {
      agents: networkCounts.international,
      countries: networkCounts.countries,
    }),
    alternates: alternatesFor(locale, '/support/representatives'),
  };
}

/**
 * Global representatives (Part E.1 SUPPORT).
 *
 * The same registry as `/company/network`, framed for a different visitor: that
 * page is "how far KAO MING reaches", this one is "who do I call". Part E.1
 * lists both, and both are genuinely wanted — a buyer evaluating a supplier and
 * an owner with a machine down are not the same person and do not arrive from
 * the same place.
 *
 * One data source, one component, two entry points. Nothing is duplicated but
 * the framing.
 */
export default async function RepresentativesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('Network');

  return (
    <>
      <PageHeader
        label={t('representativesLabel')}
        title={t('representativesTitle')}
        lede={t('representativesLede')}
      />

      <section className={`${SHELL} pb-24`}>
        <NetworkMap domesticDefault={locale === 'zh-tw'} />

        <p className="km-label mt-12 max-w-[80ch] border-s-2 border-km-warning ps-6 text-km-warning">
          {VERIFY_BEFORE_LAUNCH}
        </p>
        <Provenance>{t('provenance')}</Provenance>
      </section>
    </>
  );
}
