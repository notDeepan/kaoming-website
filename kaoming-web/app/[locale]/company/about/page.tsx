import type { Metadata } from 'next';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Action } from '@/components/ui/action';
import { COMPARISON } from '@/components/ui/layout';
import { PageHeader, Provenance, SHELL } from '@/components/ui/page-shell';
import { Reveal } from '@/components/ui/reveal';
import { SectionHeader } from '@/components/ui/section-header';
import { routing } from '@/i18n/routing';
import { contact, identity, PLANT_AREA_M2 } from '@/lib/company';
import { factoryImages } from '@/lib/images';
import { allSeries } from '@/lib/machines';
import { networkCounts } from '@/lib/distributors';
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
  const t = await getTranslations({ locale, namespace: 'About' });
  return {
    title: t('title'),
    description: identity.originStory.slice(0, 160),
    alternates: alternatesFor(locale, '/company/about'),
  };
}

/**
 * About (Part E.1 COMPANY).
 *
 * Built entirely from `company.json`: the founding, the origin story, and the
 * positioning claims KAO MING makes about itself — quoted as their claims,
 * which is what they are, rather than restated as this site's assertions.
 *
 * The figures in the strip are the four this site can stand behind: the
 * founding year, the number of catalogue series, the agent count, and the plant
 * area stated in KAO MING's own 2008 milestone.
 */
export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('About');
  const hero = factoryImages.find((image) => image.src.includes('ctsp-plant-exterior'));
  const foundingYear = Number(identity.founding.match(/\d{4}/)?.[0] ?? 1968);

  const figures = [
    { value: String(foundingYear), label: t('figures.founded') },
    { value: String(allSeries.length), label: t('figures.series') },
    { value: String(networkCounts.total), label: t('figures.agents') },
    { value: `${PLANT_AREA_M2.toLocaleString('en-US')} m²`, label: t('figures.plant') },
  ];

  return (
    <>
      <PageHeader label={t('label')} title={t('title')} lede={identity.originStory} />

      {hero ? (
        <div className={`${SHELL} pb-20`}>
          <Image
            src={hero.src}
            alt={t('heroAlt')}
            width={hero.width}
            height={hero.height}
            priority
            sizes="(min-width: 1600px) 1520px, 94vw"
            className="h-auto w-full border border-km-steel-600/60"
          />
        </div>
      ) : null}

      {/* ---------------------------------------------------- the figures */}
      <section className="border-y border-km-steel-600/60 bg-km-charcoal">
        <Reveal
          as="dl"
          className={`${SHELL} ${COMPARISON} grid-cols-2 py-20 xl:grid-cols-4`}
        >
          {/* Founded, series, agents, plant — the company in one row, read
              across. Aligned for the same reason the specification figures are. */}
          {figures.map((figure) => (
            <div key={figure.label} data-reveal>
              <dd className="font-mono text-spec-xl text-km-paper">{figure.value}</dd>
              <dt className="km-label mt-4 border-t border-km-steel-600/60 pt-4 text-km-steel-400">
                {figure.label}
              </dt>
            </div>
          ))}
        </Reveal>
      </section>

      {/* ------------------------------------------------- what they claim */}
      <section className={`${SHELL} py-24`}>
        <SectionHeader index="01" label={t('claimsLabel')} title={t('claimsTitle')} />
        <Reveal as="ul" className="mt-12 flex flex-col gap-8">
          {identity.positioningClaims.map((claim) => (
            <li key={claim} data-reveal className="max-w-[62ch] border-s-2 border-km-blue ps-6">
              <p className="font-display text-h3 text-km-paper">“{claim}”</p>
            </li>
          ))}
        </Reveal>
        <p className="km-label mt-10 max-w-[70ch] text-km-steel-400">{t('claimsNote')}</p>
      </section>

      {/* --------------------------------------------------------- contact */}
      <section className="border-t border-km-steel-600/60">
        <div className={`${SHELL} py-20`}>
          <SectionHeader index="02" label={t('hqLabel')} title={identity.legalName} />

          {/* An address block, set as one. The four fields are not four equal
              things — the address is long and the telephone is short, so they
              get the widths they need. */}
          <dl className="mt-16 grid gap-x-12 gap-y-10 sm:grid-cols-2 xl:grid-cols-[1fr_1.6fr_0.8fr_1.1fr]">
            <Detail label={t('detail.chineseName')} value={identity.chineseName} />
            <Detail label={t('detail.address')} value={contact.address} />
            <Detail label={t('detail.tel')} value={contact.tel} />
            <Detail label={t('detail.email')} value={contact.email} />
          </dl>
          <div className="mt-12">
            <Action href="/support/contact" variant="primary">
              {t('cta')}
            </Action>
          </div>
          <Provenance>{t('provenance')}</Provenance>
        </div>
      </section>
    </>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-km-steel-600/60 pt-5">
      <dt className="km-label text-km-steel-400">{label}</dt>
      <dd className="mt-2 text-body text-km-offwhite">{value}</dd>
    </div>
  );
}
