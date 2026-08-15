import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { HistoryTimeline } from '@/components/company/history-timeline';
import { ContentGap, PageHeader, Provenance, SHELL } from '@/components/ui/page-shell';
import { SectionHeader } from '@/components/ui/section-header';
import { routing } from '@/i18n/routing';
import { history } from '@/lib/company';
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
  const t = await getTranslations({ locale, namespace: 'History' });
  return {
    title: t('title'),
    description: t('lede'),
    alternates: alternatesFor(locale, '/company/history'),
  };
}

/**
 * Company history (Part J.3) — and the one page on this site where the honest
 * design decision is visible in the layout itself.
 *
 * KAO MING publishes ten years and ten milestones. Their Wix carousel scrambled
 * which event belongs to which year, and the transcription carries an explicit
 * warning that the pairing must be confirmed before publishing. Ten years and
 * ten events in the same order look exactly like ten pairs — which is precisely
 * why printing them as pairs would be a guess wearing the clothes of a fact, on
 * the page a visitor reads as the company's own account of itself.
 *
 * So the timeline scrolls the years, and the milestones are listed beside it as
 * what they are: ten verified events whose dates are being confirmed. When
 * `history.pairingConfirmed` flips, the timeline pairs them and this page does
 * not otherwise change.
 */
export default async function HistoryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('History');

  return (
    <>
      <PageHeader label={t('label')} title={t('title')} lede={t('lede')} />

      <HistoryTimeline
        years={history.years}
        events={history.events}
        paired={history.pairingConfirmed}
        label={t('timelineLabel')}
      />

      <section className={`${SHELL} py-24`}>
        <SectionHeader index="01" label={t('milestonesLabel')} title={t('milestonesTitle')} />

        {!history.pairingConfirmed ? (
          <div className="mt-12">
            <ContentGap>
              <p>{t('pairing.body')}</p>
            </ContentGap>
          </div>
        ) : null}

        <ol className="mt-12 flex flex-col gap-px border-y border-km-steel-600/60">
          {history.events.map((event, index) => (
            <li
              key={event}
              data-milestone
              className="flex flex-col gap-3 border-y border-km-steel-600/30 py-5 sm:flex-row sm:gap-8"
            >
              <span className="km-label shrink-0 text-km-red-glow">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="max-w-[70ch] text-body text-km-offwhite">{event}</span>
            </li>
          ))}
        </ol>

        <p className="mt-10 max-w-[70ch] text-small text-km-steel-400">{history.corroborated}</p>
        <Provenance>{t('provenance')}</Provenance>
      </section>
    </>
  );
}
