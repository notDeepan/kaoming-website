import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ContentGap, PageHeader, SHELL } from '@/components/ui/page-shell';
import { Reveal } from '@/components/ui/reveal';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { applications } from '@/lib/applications';
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
  const t = await getTranslations({ locale, namespace: 'Applications' });
  return {
    title: t('indexTitle'),
    description: t('indexLede'),
    alternates: alternatesFor(locale, '/applications'),
  };
}

export default async function ApplicationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('Applications');
  const tNav = await getTranslations('Nav');

  return (
    <>
      <PageHeader label={t('label')} title={t('indexTitle')} lede={t('indexLede')} />

      <section className={`${SHELL} pb-24`}>
        <Reveal as="ul" className="grid gap-px border border-km-steel-600/60 sm:grid-cols-2 xl:grid-cols-3">
          {applications.map((application) => (
            <li key={application.slug} data-application-tile data-reveal>
              <Link
                href={`/applications/${application.slug}`}
                className="group flex h-full flex-col justify-between gap-10 border border-km-steel-600/60 p-8 transition-colors duration-(--duration-km) ease-(--ease-km) hover:border-km-red-glow"
              >
                <span>
                  <span className="font-display text-h3 text-km-paper">
                    {tNav(`application.${application.key}`)}
                  </span>
                  <span className="mt-3 block text-small text-km-steel-400">
                    {application.evidence.length
                      ? t('tile.stated', { count: application.evidence.length })
                      : t('tile.pending')}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className="km-label text-km-red-glow transition-transform duration-(--duration-km) ease-(--ease-km) group-hover:translate-x-1"
                >
                  →
                </span>
              </Link>
            </li>
          ))}
        </Reveal>

        <div className="mt-14">
          <ContentGap>
            <p>{t('gap')}</p>
          </ContentGap>
        </div>
      </section>
    </>
  );
}
