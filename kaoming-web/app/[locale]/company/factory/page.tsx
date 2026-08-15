import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { FactoryJourney, type FactoryStep } from '@/components/company/factory-journey';
import { ContentGap, PageHeader, Provenance, SHELL } from '@/components/ui/page-shell';
import { SectionHeader } from '@/components/ui/section-header';
import { routing } from '@/i18n/routing';
import { factoryImages } from '@/lib/images';
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
  const t = await getTranslations({ locale, namespace: 'Factory' });
  return {
    title: t('title'),
    description: t('lede'),
    alternates: alternatesFor(locale, '/company/factory'),
  };
}

/**
 * Inside KAO MING (Part J.2).
 *
 * The spec asks for a seven-step journey: ENGINEERING → CASTING → MACHINING →
 * ASSEMBLY → INSPECTION → TESTING → SHIPPING. The kit supplies photography for
 * four of them. Part J.2 is equally explicit that this page is real photography
 * only and that nothing may misrepresent the facility, so the four steps that
 * have a photograph are built and the three that do not are named as missing.
 *
 * Captioning a warehouse aisle "INSPECTION" would fill the page and break the
 * rule in the same stroke.
 */
export default async function FactoryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('Factory');
  const image = (fragment: string) => factoryImages.find((entry) => entry.src.includes(fragment));

  /**
   * Each step names the photograph that shows it. The mapping is by subject, not
   * by convenience: `machining-hall-overhead-crane` is the machining hall,
   * `shopfloor-168CE-assembly` is a 168CE on the assembly floor, and
   * `packed-for-shipping` is that same machine crated.
   */
  const steps: FactoryStep[] = (
    [
      ['machining', 'machining-hall-overhead-crane'],
      ['assembly', 'shopfloor-168CE-assembly'],
      ['parts', 'parts-inventory-racks'],
      ['shipping', 'packed-for-shipping'],
    ] as const
  )
    .map(([id, fragment]) => ({
      id,
      image: image(fragment) ?? null,
      title: t(`step.${id}.title`),
      copy: t(`step.${id}.copy`),
    }))
    .filter((step) => step.image !== null);

  const missing = ['engineering', 'casting', 'inspection', 'testing'] as const;

  const heritage = [image('ctsp-plant-exterior'), image('original-hq-fengyuan'), image('heritage-kaoming-gate')]
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  return (
    <>
      <PageHeader label={t('label')} title={t('title')} lede={t('lede')} />

      <FactoryJourney steps={steps} />

      {/* ---------------------------------------------------- the heritage */}
      {heritage.length ? (
        <section className={`${SHELL} py-24`}>
          <SectionHeader index="02" label={t('heritageLabel')} title={t('heritageTitle')} />
          <ul className="mt-14 grid gap-6 md:grid-cols-3">
            {heritage.map((entry, index) => (
              <li key={entry.src}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={entry.src}
                  alt={t(`heritage.${index}`)}
                  width={entry.width}
                  height={entry.height}
                  loading="lazy"
                  decoding="async"
                  className="h-auto w-full border border-km-steel-600/60"
                />
                <p className="mt-3 text-small text-km-steel-400">{t(`heritage.${index}`)}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ------------------------------------------------ the missing steps */}
      <section className={`${SHELL} pb-24`}>
        <ContentGap>
          <p>{t('missing.body')}</p>
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
            {missing.map((id) => (
              <li key={id} className="km-label text-km-warning">
                {t(`step.${id}.title`)}
              </li>
            ))}
          </ul>
        </ContentGap>
        <Provenance>{t('provenance')}</Provenance>
      </section>
    </>
  );
}
