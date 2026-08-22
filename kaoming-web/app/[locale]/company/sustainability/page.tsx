import type { Metadata } from 'next';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageHeader, Provenance, SHELL } from '@/components/ui/page-shell';
import { Reveal } from '@/components/ui/reveal';
import { SectionHeader } from '@/components/ui/section-header';
import { routing } from '@/i18n/routing';
import { CO2_REDUCTION_KG_PER_YEAR, csrFor } from '@/lib/company';
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
 * Corporate social responsibility — the third section of kaoming.com's own
 * ABOUT page, restored.
 *
 * The first build of this site kept the seven energy claims and lost everything
 * they hang off: the commitment KAO MING opens with, the environmental-impact
 * assessment it did before building in the Science Park, the policy paragraph
 * about its own staff, and the five pillars it groups the whole thing under. It
 * also filed the result under "sustainability", which is not the heading KAO
 * MING uses. They call it social responsibility, and putting environment,
 * welfare and consumer rights in one commitment is the point they are making.
 *
 * Every paragraph here is verbatim, and per locale — the English and Chinese
 * pages are both KAO MING's, and neither is a translation of the other.
 *
 * The route stays `/company/sustainability`. The heading changed; the URL is a
 * link somebody may already hold.
 */
export default async function SocialResponsibilityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('Sustainability');
  const csr = csrFor(locale);

  return (
    <>
      <PageHeader label={t('label')} title={t('title')} lede={t('lede')} />

      {/* The one measurable figure on the page, set as a figure. A number is the
          part of a responsibility page a buyer's procurement team reads. */}
      <section className="border-y border-km-steel-600/60 bg-km-charcoal">
        <div className={`${SHELL} grid gap-12 py-16 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center`}>
          <p className="font-mono text-spec-xl text-km-paper">
            {CO2_REDUCTION_KG_PER_YEAR.toLocaleString(locale)}
            <span className="ms-2 text-h3 text-km-steel-400">{t('co2Unit')}</span>
          </p>
          <p className="max-w-[58ch] text-body text-km-steel-400">{t('co2Caption')}</p>
        </div>
      </section>

      <section className={`${SHELL} py-24`}>
        <SectionHeader index="01" label={t('statementLabel')} title={t('statementTitle')} />
        <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-start">
          <p className="max-w-[68ch] text-body text-km-offwhite">{csr.statement}</p>
          {/* The plant the statement is about. */}
          <figure className="relative aspect-4/3 overflow-hidden border border-km-steel-600/60">
            <Image
              src="/img/factory/kaoming-factory-02-ctsp-plant-exterior.jpg"
              alt="The KAO MING plant in the Central Taiwan Science Park."
              fill
              sizes="(min-width: 1024px) 26rem, 100vw"
              className="object-cover"
            />
          </figure>
        </div>
      </section>

      <section className={`${SHELL} border-t border-km-steel-600/60 py-20`}>
        <SectionHeader index="02" label={t('claimsLabel')} title={t('claimsTitle')} />
        <p className="km-label mt-10 text-km-steel-400">{csr.equipmentHeading}</p>
        <Reveal as="ol" className="mt-8 grid gap-x-12 gap-y-8 md:grid-cols-2">
          {csr.equipment.map((item, index) => (
            <li
              key={item}
              data-claim
              className="flex gap-6 border-t border-km-steel-600/60 pt-5 text-body text-km-offwhite"
            >
              <span className="km-label shrink-0 text-km-red-glow">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="max-w-[52ch]">{item}</span>
            </li>
          ))}
        </Reveal>
      </section>

      <section className="border-t border-km-steel-600/60">
        <div className={`${SHELL} py-20`}>
          <SectionHeader index="03" label={t('pillarsLabel')} title={t('pillarsTitle')} />
          <ol className="mt-14 grid gap-px sm:grid-cols-2 xl:grid-cols-5">
            {csr.pillars.map((pillar, index) => (
              <li
                key={pillar}
                data-pillar
                className="flex flex-col gap-4 border border-km-steel-600/60 p-6"
              >
                <span className="km-label text-km-red-glow">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="font-display text-body text-km-paper">{pillar}</span>
              </li>
            ))}
          </ol>

          <div className="mt-16 max-w-[70ch] border-s-2 border-km-red ps-6">
            <p className="km-label text-km-steel-400">{t('policyLabel')}</p>
            <p className="mt-3 text-body text-km-offwhite">{csr.policy}</p>
          </div>

          <Provenance>{t('provenance')}</Provenance>
        </div>
      </section>
    </>
  );
}
