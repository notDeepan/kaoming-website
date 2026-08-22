import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { HistoryTimeline } from '@/components/company/history-timeline';
import { PageHeader, Provenance, SHELL } from '@/components/ui/page-shell';
import { SectionHeader } from '@/components/ui/section-header';
import { routing } from '@/i18n/routing';
import { history, milestonesFor } from '@/lib/company';
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
 * Illustration, not evidence.
 *
 * Three of the ten milestones name a place KAO MING photographed and supplied in
 * `_kit/factory`: the Fongyuan works it started in, the Fongyuan head office it
 * moved to, and the constant-temperature plant in the Central Taiwan Science
 * Park. Those three carry a photograph. The other seven are events, not places,
 * and get none — a stock picture of a machining hall against "obtained ISO 9001"
 * would be decoration dressed as documentation.
 *
 * Alt text describes the photograph. It never restates the milestone, which is
 * already the paragraph directly above it.
 */
const ILLUSTRATIONS: Record<number, { src: string; alt: string }> = {
  1968: {
    src: '/img/factory/kaoming-factory-04-heritage-kaoming-gate.jpg',
    alt: 'The original KAO MING works gate, Fongyuan.',
  },
  1974: {
    src: '/img/factory/kaoming-factory-03-original-hq-fengyuan.jpg',
    alt: 'The head office building on Sanfong Road, Fongyuan.',
  },
  2008: {
    src: '/img/factory/kaoming-factory-02-ctsp-plant-exterior.jpg',
    alt: 'The constant-temperature plant in the Central Taiwan Science Park.',
  },
};

/**
 * Company history (Part J.3).
 *
 * The page used to carry a visible caveat instead of a timeline: KAO MING's
 * carousel scrambled which milestone belonged to which year, and printing ten
 * years beside ten events would have been a guess wearing the clothes of a fact.
 *
 * The caveat is gone because the question was answered rather than waived. The
 * carousel scrambles reading order; the page's stored layout does not, and
 * sorting its positioned boxes recovers a two-column timeline with no ambiguity
 * — reproduced independently by the Traditional Chinese page. `lib/company`
 * records the method and `content/company/company.json` the evidence.
 *
 * What survives from that caution is the provenance line at the foot, which now
 * names the one figure the two locales still disagree on.
 */
export default async function HistoryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('History');
  const milestones = milestonesFor(locale);
  const [first, last] = history.span;

  return (
    <>
      <PageHeader
        label={t('label')}
        title={t('title')}
        lede={t('lede')}
        aside={
          <dl className="flex gap-10">
            <div>
              <dt className="km-label text-km-steel-400">{t('founded')}</dt>
              <dd className="mt-2 font-mono text-spec-xl text-km-paper">{first}</dd>
            </div>
            <div>
              <dt className="km-label text-km-steel-400">{t('latest')}</dt>
              <dd className="mt-2 font-mono text-spec-xl text-km-paper">{last}</dd>
            </div>
          </dl>
        }
      />

      <HistoryTimeline
        milestones={milestones}
        illustrations={ILLUSTRATIONS}
        label={t('timelineLabel')}
        hint={t('scrollHint')}
      />

      {/*
       * The same ten milestones again, as a plain dated list.
       *
       * Not a duplicate for its own sake: the timeline above is pinned and
       * scrubbed, which makes it a poor thing to scan, to search in the browser,
       * or to print. This is the record; that is the reading of it.
       */}
      <section className={`${SHELL} py-24`}>
        <SectionHeader index="01" label={t('milestonesLabel')} title={t('milestonesTitle')} />

        <ol className="mt-14 border-t border-km-steel-600/60">
          {milestones.map((milestone) => (
            <li
              key={milestone.year}
              data-record
              className="flex flex-col gap-2 border-b border-km-steel-600/30 py-6 sm:flex-row sm:gap-10"
            >
              <span className="w-20 shrink-0 font-mono text-spec text-km-red-glow">
                {milestone.year}
              </span>
              <span className="max-w-[70ch] text-body text-km-offwhite">{milestone.text}</span>
            </li>
          ))}
        </ol>

        <p className="mt-10 max-w-[70ch] text-small text-km-steel-400">{history.corroborated}</p>
        <Provenance>{t('provenance')}</Provenance>
      </section>
    </>
  );
}
