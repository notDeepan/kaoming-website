import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Action } from '@/components/ui/action';
import { ContentGap, PageHeader, Provenance, SHELL } from '@/components/ui/page-shell';
import { SectionHeader } from '@/components/ui/section-header';
import { routing } from '@/i18n/routing';
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
  const t = await getTranslations({ locale, namespace: 'CaseStudies' });
  return {
    title: t('title'),
    description: t('lede'),
    alternates: alternatesFor(locale, '/case-studies'),
  };
}

/**
 * Customer success (Part J.5).
 *
 * The template is CUSTOMER → CHALLENGE → SOLUTION → PROCESS → RESULT, and every
 * one of those fields is a statement about a named third party. KAO MING has
 * supplied no case studies, and a case study is the single worst thing on a B2B
 * site to invent: it names a customer, claims a result, and is checkable.
 *
 * So this route is live, states plainly that none has been published, and lists
 * what a case study needs so the gap is actionable rather than just admitted.
 * The visitor who wanted proof is offered the two proofs that do exist — the
 * factory and the verified specifications — and a way to talk to an engineer.
 */
export default async function CaseStudiesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('CaseStudies');
  const fields = ['customer', 'challenge', 'solution', 'process', 'result'] as const;

  return (
    <>
      <PageHeader label={t('label')} title={t('title')} lede={t('lede')} />

      <section className={`${SHELL} pb-24`}>
        <ContentGap>
          <p>{t('gap')}</p>
        </ContentGap>
      </section>

      <section className="border-t border-km-steel-600/60 bg-km-charcoal">
        <div className={`${SHELL} py-20`}>
          <SectionHeader index="01" label={t('needsLabel')} title={t('needsTitle')} />
          <ol className="mt-12 grid gap-px sm:grid-cols-2 xl:grid-cols-5">
            {fields.map((field, index) => (
              <li key={field} className="flex flex-col gap-4 border border-km-steel-600/60 p-6">
                <span className="km-label text-km-red-glow">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="font-display text-body text-km-paper">{t(`field.${field}`)}</span>
              </li>
            ))}
          </ol>

          <div className="mt-12 flex flex-wrap gap-4">
            <Action href="/company/factory" variant="secondary">
              {t('seeFactory')}
            </Action>
            <Action href="/products" variant="secondary">
              {t('seeMachines')}
            </Action>
            <Action href={`${RFQ_HREF}?source=contact`} variant="primary">
              {t('cta')}
            </Action>
          </div>

          <Provenance>{t('provenance')}</Provenance>
        </div>
      </section>
    </>
  );
}
