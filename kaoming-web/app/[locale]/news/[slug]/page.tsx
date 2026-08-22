import type { Metadata } from 'next';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Action } from '@/components/ui/action';
import { PageHeader, Provenance, SHELL } from '@/components/ui/page-shell';
import { NewsCard } from '@/components/company/news-card';
import { routing } from '@/i18n/routing';
import { newsFor, newsItem, newsSlugs } from '@/lib/news';
import { alternatesFor } from '@/lib/site';

type Params = { locale: string; slug: string };

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => newsSlugs.map((slug) => ({ locale, slug })));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const item = newsItem(slug, locale);
  if (!item) return {};

  return {
    title: item.title,
    description: item.body || item.booth || undefined,
    alternates: alternatesFor(locale, `/news/${slug}`),
    openGraph: { type: 'article', publishedTime: item.date, title: item.title },
  };
}

/**
 * One news entry.
 *
 * Short on purpose. KAO MING's own entries are a headline, a date and at most a
 * paragraph — several are a single sentence — and padding that out with invented
 * context would break the source rule on the page where it would be least
 * visible. The page's job is to give the entry a stable URL, a machine-readable
 * date and, where the announcement is about a machine, a route to the machine.
 *
 * That route is the reason a product announcement is worth a page at all: the
 * source titles these by legacy code and dead-ends. This resolves the code to
 * the series' 2026 name and links its specification.
 */
export default async function NewsItemPage({ params }: { params: Promise<Params> }) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const item = newsItem(slug, locale);
  if (!item) notFound();

  const t = await getTranslations('News');

  const stamp = item.dateIsApproximate
    ? String(item.year)
    : new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' }).format(
        new Date(item.date),
      );

  const related = newsFor(locale)
    .filter((entry) => entry.slug !== item.slug)
    .slice(0, 3);

  return (
    <>
      <PageHeader
        label={t(`kind.${item.kind}`)}
        title={item.title}
        aside={
          <div>
            <p className="km-label text-km-steel-400">{t('field.date')}</p>
            <time dateTime={item.date} className="mt-2 block font-mono text-spec-xl text-km-paper">
              {stamp}
            </time>
          </div>
        }
      />

      <article className={`${SHELL} pb-20`}>
        {item.image ? (
          <div className="relative aspect-21/9 overflow-hidden border border-km-steel-600/60">
            <Image
              src={item.image}
              alt=""
              fill
              sizes="(min-width: 1600px) 1520px, 100vw"
              priority
              className="object-cover"
            />
          </div>
        ) : null}

        <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div>
            {item.dateline || item.booth ? (
              <dl className="mb-10 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 border-y border-km-steel-600/60 py-5 font-mono text-spec">
                {item.dateline ? (
                  <>
                    <dt className="km-label text-km-steel-400">{t('field.when')}</dt>
                    <dd className="text-km-offwhite">{item.dateline}</dd>
                  </>
                ) : null}
                {item.booth ? (
                  <>
                    <dt className="km-label text-km-steel-400">{t('field.booth')}</dt>
                    <dd className="text-km-offwhite">{item.booth}</dd>
                  </>
                ) : null}
              </dl>
            ) : null}

            {item.body ? (
              <p className="max-w-[70ch] text-body text-km-offwhite">{item.body}</p>
            ) : (
              <p className="max-w-[70ch] text-body text-km-steel-400">{t('noBody')}</p>
            )}
          </div>

          {item.series ? (
            <aside className="h-max border border-km-steel-600/60 bg-km-steel-800 p-6">
              <p className="km-label text-km-steel-400">{t('relatedSeries')}</p>
              {/* The 2026 catalogue name, in catalogue form, in every locale. */}
              <p className="mt-4 font-display text-h3 text-km-paper">{item.series.name}</p>
              <p className="mt-2 text-small text-km-steel-400">{item.series.type}</p>
              <div className="mt-8">
                <Action href={item.series.href} variant="primary">
                  {t('viewSeries')}
                </Action>
              </div>
            </aside>
          ) : null}
        </div>

        <Provenance>{t('provenance')}</Provenance>
      </article>

      {related.length ? (
        <section className={`${SHELL} border-t border-km-steel-600/60 py-20`}>
          <h2 className="km-label text-km-steel-400">{t('more')}</h2>
          <ul className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {related.map((entry) => (
              <li key={entry.slug} className="contents">
                <NewsCard item={entry} locale={locale} />
              </li>
            ))}
          </ul>
          <div className="mt-12">
            <Action href="/news" variant="secondary">
              {t('all')}
            </Action>
          </div>
        </section>
      ) : null}
    </>
  );
}
