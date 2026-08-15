import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ProductCard } from '@/components/ui/product-card';
import { Action } from '@/components/ui/action';
import { ContentGap, PageHeader, Provenance, SHELL } from '@/components/ui/page-shell';
import { Reveal } from '@/components/ui/reveal';
import { SectionHeader } from '@/components/ui/section-header';
import { routing } from '@/i18n/routing';
import { APPLICATION_SLUGS, applicationFor } from '@/lib/applications';
import { allSeries } from '@/lib/machines';
import { RFQ_HREF } from '@/lib/nav';
import { alternatesFor } from '@/lib/site';

export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    APPLICATION_SLUGS.map((slug) => ({ locale, slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const application = applicationFor(slug);
  if (!application) return {};

  const tNav = await getTranslations({ locale, namespace: 'Nav' });
  const t = await getTranslations({ locale, namespace: 'Applications' });
  const industry = tNav(`application.${application.key}`);

  return {
    title: t('pageTitle', { industry }),
    description: t('pageDescription', { industry }),
    alternates: alternatesFor(locale, `/applications/${slug}`),
  };
}

/**
 * One application page, six industries (Part J.1).
 *
 * The spec's template is: hero → industry challenge → KAO MING solution →
 * recommended machines → embedded 3D → workpieces → technical info → case
 * study → downloads → RFQ. Of those, KAO MING has supplied **none of the
 * industry content**: their own applications page has never been filled in, and
 * no series states which industries it serves.
 *
 * Writing the challenge and the solution myself would be the single easiest way
 * to put invented claims about a machine tool in front of a buyer, so this page
 * does not. What it gives instead is real: the lines KAO MING has published
 * about which way type suits this industry, the machines with their transcribed
 * specifications, and an enquiry that reaches an engineer who can answer
 * properly. The gap is stated where the missing content would be.
 */
export default async function ApplicationPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const application = applicationFor(slug);
  if (!application) notFound();

  const t = await getTranslations('Applications');
  const tNav = await getTranslations('Nav');
  const industry = tNav(`application.${application.key}`);

  // Every series, in catalogue order. Not "recommended for this industry" —
  // nothing states that, and a recommendation nobody made is a claim.
  const machines = allSeries.filter((series) => series.completeness !== 'pending').slice(0, 6);

  return (
    <>
      <PageHeader
        label={t('label')}
        title={industry}
        lede={t('pageDescription', { industry })}
      />

      {/* --------------------------------- what KAO MING has actually said */}
      {application.evidence.length ? (
        <section className={`${SHELL} pb-24`}>
          <SectionHeader index="01" label={t('evidenceLabel')} title={t('evidenceTitle')} />
          <Reveal as="ul" className="mt-12 flex flex-col gap-8">
            {application.evidence.map((entry) => (
              <li
                key={entry.line}
                data-evidence
                className="max-w-[76ch] border-s-2 border-km-blue ps-6"
              >
                <p className="km-label text-km-steel-400">{entry.pillar}</p>
                <p className="mt-2 text-body text-km-offwhite">{entry.line}</p>
              </li>
            ))}
          </Reveal>
          <p className="km-label mt-8 max-w-[70ch] text-km-steel-400">{t('evidenceNote')}</p>
        </section>
      ) : null}

      {/* ------------------------------------------------------ the gap */}
      <section className={`${SHELL} pb-24`}>
        <ContentGap>
          <p>{t('pageGap', { industry })}</p>
        </ContentGap>
      </section>

      {/* -------------------------------------------------- the machines */}
      <section className="border-t border-km-steel-600/60 bg-km-charcoal">
        <div className={`${SHELL} py-24`}>
          <SectionHeader
            index="02"
            label={t('machinesLabel')}
            title={t('machinesTitle')}
            lede={t('machinesLede')}
          />
          <Reveal as="ul" className="mt-14 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {machines.map((series) => (
              <li key={series.slug} data-reveal>
                <ProductCard series={series} />
              </li>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ------------------------------------------------------- enquiry */}
      <section className={`${SHELL} py-20`}>
        <h2 className="max-w-[24ch] text-h2 text-km-paper uppercase">{t('ctaTitle')}</h2>
        <p className="mt-6 max-w-[62ch] text-body text-km-steel-400">
          {t('ctaLede', { industry })}
        </p>
        <div className="mt-10">
          <Action href={`${RFQ_HREF}?source=product`} variant="primary">
            {t('cta')}
          </Action>
        </div>
        <Provenance>{t('provenance')}</Provenance>
      </section>
    </>
  );
}
