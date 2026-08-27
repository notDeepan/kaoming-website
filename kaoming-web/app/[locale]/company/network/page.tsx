import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { NetworkMap } from '@/components/company/network-map';
import { PageHeader, Provenance, SHELL } from '@/components/ui/page-shell';
import { Figures } from '@/components/ui/figures';
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
    title: t('title'),
    description: t('lede', {
      agents: networkCounts.international,
      countries: networkCounts.countries,
    }),
    alternates: alternatesFor(locale, '/company/network'),
  };
}

/**
 * Global network (Part J.4) — the one page the spec says can be built complete
 * on day one, and it is: 41 agents, five regions, every field KAO MING
 * published.
 *
 * Taiwan's nine domestic agents default to hidden on `/en` and shown on
 * `/zh-tw`, which is the spec's instruction pending sales' decision. It is a
 * default, not a rule: the toggle is right there, because a Taiwanese buyer
 * reading the English site should not have to switch language to find their
 * nearest representative.
 */
export default async function NetworkPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('Network');

  return (
    <>
      <PageHeader
        label={t('label')}
        title={t('title')}
        lede={t('lede', {
          agents: networkCounts.international,
          countries: networkCounts.countries,
        })}
        aside={
          <Figures
            figures={[
              { label: t('figures.agents'), value: networkCounts.international },
              { label: t('figures.countries'), value: networkCounts.countries },
            ]}
          />
        }
      />

      <section className={`${SHELL} pb-24`}>
        <NetworkMap domesticDefault={locale === 'zh-tw'} lead="map" />

        {/* The registry carries a note from KAO MING's own transcription asking
            sales to confirm every entry before launch. It is addressed to KAO
            MING, not to a buyer, and on a live page it reads as an unfinished
            site — so it shows where it is useful and nowhere else. Same rule
            CLAUDE.md sets for {{TO_BE_VERIFIED}}: visible in dev, hidden in
            production. */}
        {process.env.NODE_ENV !== 'production' ? (
          <p className="km-label mt-12 max-w-[80ch] border-s-2 border-km-warning ps-6 text-km-warning">
            {VERIFY_BEFORE_LAUNCH}
          </p>
        ) : null}
        <Provenance>{t('provenance')}</Provenance>
      </section>
    </>
  );
}
