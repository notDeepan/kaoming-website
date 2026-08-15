import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { WaySelector } from '@/components/company/way-selector';
import { Action } from '@/components/ui/action';
import { ContentGap, PageHeader, Provenance, SHELL } from '@/components/ui/page-shell';
import { Reveal } from '@/components/ui/reveal';
import { SectionHeader } from '@/components/ui/section-header';
import { routing } from '@/i18n/routing';
import { awards, pillars } from '@/lib/company';
import { RFQ_HREF } from '@/lib/nav';
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
  const t = await getTranslations({ locale, namespace: 'Technology' });
  return {
    title: t('title'),
    description: t('lede'),
    alternates: alternatesFor(locale, '/technology'),
  };
}

/**
 * Technology (Part E.1).
 *
 * The spec is right that this section should replace generic engineering copy
 * with KAO MING's actual differentiators — and two of them are transcribed in
 * full: hand scraping, and the box-way/linear-way comparison, which the spec
 * asks to be built as a decision tool rather than prose because that is exactly
 * what it is for a buyer.
 *
 * The spec also lists STAS spindle temperature figures, the four named
 * inspection procedures and the force-flow structure as "verified and already
 * written". They are not in `_kit/content/` — `company.json` records those three
 * pillars as "content not yet captured" from kaoming.com. They may well exist in
 * the reference material, which CLAUDE.md forbids publishing from. So they are
 * named as gaps here and nothing is quoted.
 */
export default async function TechnologyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('Technology');
  const scraping = pillars.find((pillar) => pillar.id === 'scraping');
  const boxWay = pillars.find((pillar) => pillar.id === 'box-way');
  const linearWay = pillars.find((pillar) => pillar.id === 'linear-way');
  const pending = pillars.filter((pillar) => pillar.pending);

  const patents = awards.filter((award) => award.type === 'patent');
  const honours = awards.filter((award) => award.type !== 'patent');

  return (
    <>
      <PageHeader label={t('label')} title={t('title')} lede={t('lede')} />

      {/* ------------------------------------------------------- scraping */}
      {scraping ? (
        <section id="scraping" className={`${SHELL} scroll-mt-28 pb-24`}>
          <SectionHeader index="01" label={t('sections.scraping')} title={scraping.title} />
          <Reveal as="ul" className="mt-12 grid gap-x-12 gap-y-8 md:grid-cols-2">
            {scraping.points.map((point) => (
              <li
                key={point}
                data-reveal
                className="border-t border-km-steel-600/60 pt-5 text-body text-km-offwhite"
              >
                {point}
              </li>
            ))}
          </Reveal>
        </section>
      ) : null}

      {/* --------------------------------------- box way vs linear way */}
      {boxWay && linearWay ? (
        <section
          id="box-way-vs-linear-way"
          className="scroll-mt-28 border-y border-km-steel-600/60 bg-km-charcoal"
        >
          <div className={`${SHELL} py-24`}>
            <SectionHeader
              index="02"
              label={t('sections.ways')}
              title={t('ways.title')}
              lede={t('ways.lede')}
            />
            <div className="mt-14">
              <WaySelector
                box={{ title: boxWay.title, points: boxWay.points }}
                linear={{ title: linearWay.title, points: linearWay.points }}
              />
            </div>
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------ patents and honours */}
      <section id="quality" className={`${SHELL} scroll-mt-28 py-24`}>
        <SectionHeader index="03" label={t('sections.record')} title={t('record.title')} />

        <Reveal as="ul" className="mt-12 grid gap-x-12 gap-y-8 md:grid-cols-2 xl:grid-cols-3">
          {patents.map((patent) => (
            <li key={patent.id} data-reveal className="border-t border-km-steel-600/60 pt-5">
              <p className="font-mono text-spec text-km-blue">{patent.id}</p>
              <p className="mt-2 text-body text-km-offwhite">{patent.subject}</p>
              {patent.kind ? (
                <p className="km-label mt-2 text-km-steel-400">{patent.kind}</p>
              ) : null}
            </li>
          ))}
          {honours.map((honour) => (
            <li key={honour.id} data-reveal className="border-t border-km-steel-600/60 pt-5">
              <p className="font-display text-h3 text-km-paper">{honour.id}</p>
              {honour.subject ? (
                <p className="mt-2 text-body text-km-offwhite">{honour.subject}</p>
              ) : null}
              {honour.note ? (
                <p className="mt-2 text-small text-km-steel-400">{honour.note}</p>
              ) : null}
            </li>
          ))}
        </Reveal>
      </section>

      {/* ----------------------------------------------- the stated gaps */}
      {pending.length ? (
        <section id="technical-center" className={`${SHELL} scroll-mt-28 pb-24`}>
          <SectionHeader index="04" label={t('sections.pending')} title={t('pending.title')} />
          <div className="mt-12">
            <ContentGap>
              <p>{t('pending.body')}</p>
              <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
                {pending.map((pillar) => (
                  <li key={pillar.id} className="km-label text-km-warning">
                    {pillar.title}
                  </li>
                ))}
              </ul>
            </ContentGap>
          </div>
        </section>
      ) : null}

      <section id="spindle" className={`${SHELL} scroll-mt-28 pb-24`}>
        <Action href={RFQ_HREF} variant="primary">
          {t('cta')}
        </Action>
        <Provenance>{t('provenance')}</Provenance>
      </section>
    </>
  );
}
