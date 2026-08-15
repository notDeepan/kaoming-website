import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageHeader, Provenance, SHELL } from '@/components/ui/page-shell';
import { Reveal } from '@/components/ui/reveal';
import { SectionHeader } from '@/components/ui/section-header';
import { routing } from '@/i18n/routing';
import { sustainability } from '@/lib/company';
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
  const t = await getTranslations({ locale, namespace: 'Sustainability' });
  return {
    title: t('title'),
    description: t('lede'),
    alternates: alternatesFor(locale, '/company/sustainability'),
  };
}

/**
 * Sustainability (Part E.1 COMPANY).
 *
 * Seven claims, all verbatim from kaoming.com, and the five pillars they group
 * under. One of them carries a figure — 18,000 kg of CO₂ a year from sensor-
 * controlled LED lighting — and it is set as a figure, because a number is the
 * only part of a sustainability page a buyer's procurement team will read.
 *
 * The spec also names STAS as KAO MING's strongest sustainability story, with
 * warm-up cut from 180 minutes to 30. Those numbers are not in `_kit/content/`;
 * the technology page records the same gap. Nothing here is quoted from
 * anywhere else.
 */
export default async function SustainabilityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('Sustainability');

  // The one claim that states a measurable figure, pulled out to lead.
  const measured = sustainability.claims.find((claim) => /\d[\d,]*\s*kg/i.test(claim));
  const rest = sustainability.claims.filter((claim) => claim !== measured);

  return (
    <>
      <PageHeader label={t('label')} title={t('title')} lede={t('lede')} />

      {measured ? (
        <section className="border-y border-km-steel-600/60 bg-km-charcoal">
          <div className={`${SHELL} py-16`}>
            <p className="font-mono text-spec-xl text-km-paper">
              {measured.match(/[\d,]+\s*kg/i)?.[0]}
            </p>
            <p className="mt-4 max-w-[52ch] text-body text-km-steel-400">{measured}</p>
          </div>
        </section>
      ) : null}

      <section className={`${SHELL} py-24`}>
        <SectionHeader index="01" label={t('claimsLabel')} title={t('claimsTitle')} />
        <Reveal as="ul" className="mt-12 grid gap-x-12 gap-y-8 md:grid-cols-2">
          {rest.map((claim) => (
            <li
              key={claim}
              data-claim
              className="border-t border-km-steel-600/60 pt-5 text-body text-km-offwhite"
            >
              {claim}
            </li>
          ))}
        </Reveal>
      </section>

      <section className="border-t border-km-steel-600/60">
        <div className={`${SHELL} py-20`}>
          <SectionHeader index="02" label={t('pillarsLabel')} title={t('pillarsTitle')} />
          <ol className="mt-12 grid gap-px sm:grid-cols-2 xl:grid-cols-5">
            {sustainability.pillars.map((pillar, index) => (
              <li
                key={pillar}
                className="flex flex-col gap-4 border border-km-steel-600/60 p-6"
              >
                <span className="km-label text-km-red-glow">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="font-display text-body text-km-paper">{pillar}</span>
              </li>
            ))}
          </ol>
          <Provenance>{t('provenance')}</Provenance>
        </div>
      </section>
    </>
  );
}
