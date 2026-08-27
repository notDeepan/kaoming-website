import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { NewsCard } from '@/components/company/news-card';
import { ContentGap, PageHeader, Provenance, SHELL } from '@/components/ui/page-shell';
import { Reveal } from '@/components/ui/reveal';
import { SectionHeader } from '@/components/ui/section-header';
import { Figures } from '@/components/ui/figures';
import { routing } from '@/i18n/routing';
import { latestNewsYear, NEWS_KINDS, newsFor } from '@/lib/news';
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
  const t = await getTranslations({ locale, namespace: 'News' });
  return {
    title: t('title'),
    description: t('lede'),
    alternates: alternatesFor(locale, '/news'),
  };
}

/**
 * NEWS — the second item in kaoming.com's own navigation, and the one this site
 * did not have.
 *
 * The current site splits it into three tabs and hides two of them behind a
 * click. There are eight entries in total; tabs are a control for a hundred, and
 * for eight they are just three-quarters of the section hidden by default. So
 * the three tabs become three sections down one page, in the order a visitor
 * cares about them: where the company will be, what it has launched, what it has
 * been doing.
 *
 * The section states its own age. The newest entry KAO MING has published is
 * from 2023, and a news page whose top item is three years old is a fact about
 * the page — better said out loud, above the fold, than discovered.
 */
export default async function NewsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('News');
  const items = newsFor(locale);
  const currentYear = new Date().getFullYear();
  const stale = currentYear - latestNewsYear >= 2;

  return (
    <>
      <PageHeader
        label={t('label')}
        title={t('title')}
        lede={t('lede')}
        aside={
          <Figures
            figures={[
              { label: t('stat.entries'), value: items.length },
              { label: t('stat.latest'), value: latestNewsYear },
            ]}
          />
        }
      />

      {stale ? (
        <div className={`${SHELL} pb-16`}>
          <ContentGap>
            <p>{t('stale', { year: latestNewsYear })}</p>
          </ContentGap>
        </div>
      ) : null}

      {NEWS_KINDS.map((kind, index) => {
        const group = items.filter((item) => item.kind === kind);
        if (!group.length) return null;

        return (
          <section
            key={kind}
            id={kind}
            data-news-section={kind}
            className={`${SHELL} border-t border-km-steel-600/60 py-20`}
          >
            <SectionHeader
              index={String(index + 1).padStart(2, '0')}
              label={t(`kind.${kind}`)}
              title={t(`group.${kind}.title`)}
              lede={t(`group.${kind}.lede`)}
            />
            <Reveal as="ul" className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {group.map((item) => (
                <li key={item.slug} className="contents">
                  <NewsCard item={item} locale={locale} />
                </li>
              ))}
            </Reveal>
          </section>
        );
      })}

      <div className={`${SHELL} pb-24`}>
        <Provenance>{t('provenance')}</Provenance>
      </div>
    </>
  );
}
