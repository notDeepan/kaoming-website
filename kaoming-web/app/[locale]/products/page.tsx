import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CtaBlock } from '@/components/ui/cta-block';
import { ProductCard } from '@/components/ui/product-card';
import { Reveal } from '@/components/ui/reveal';
import { SectionHeader } from '@/components/ui/section-header';
import { routing } from '@/i18n/routing';
import { alternatesFor } from '@/lib/site';
import { headlineDimension } from '@/lib/featured';
import { seriesInCategory } from '@/lib/machines';
import { productCategories } from '@/lib/taxonomy';

const SHELL = 'mx-auto max-w-[1600px] px-5 sm:px-6 xl:px-10';

/** This page runs three across from `xl`; the card's default is the home page's four. */
const THREE_UP = '(min-width: 1280px) 33vw, (min-width: 640px) 46vw, 90vw';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Products' });
  return {
    title: t('allTitle'),
    description: t('allLede'),
    alternates: alternatesFor(locale, '/products'),
  };
}

/** Product discovery — every catalogue series, grouped by category (Part E.1). */
export default async function ProductsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('Products');
  const tSpec = await getTranslations('Spec');

  return (
    <>
      {/* The title runs past its column into the space the lede leaves. */}
      <div className={`${SHELL} pt-36 pb-16 sm:pt-44`}>
        <p className="km-label text-km-red-glow">{t('label')}</p>
        <div className="mt-8 grid gap-x-16 gap-y-8 lg:grid-cols-[7fr_5fr] lg:items-end">
          <h1 className="max-w-[14ch] text-h1 text-balance text-km-paper uppercase">
            {t('allTitle')}
          </h1>
          <p className="max-w-[42ch] text-body text-km-steel-400 lg:pb-2">{t('allLede')}</p>
        </div>
      </div>

      {/* The catalogue's four categories, each an aligned grid of its series.
          The machines inside a category are alternatives a buyer is choosing
          between, so they are set as peers on one baseline. The rhythm between
          the categories does the composing instead: the gantry family opens
          tight under the title, the rest are separated by a full release. */}
      {productCategories.map((category, categoryIndex) => {
        const series = seriesInCategory(category.slug);

        return (
          <section
            key={category.slug}
            className={`${SHELL} ${categoryIndex === 0 ? 'py-20' : 'py-32 sm:py-40'}`}
          >
            <SectionHeader
              index={String(categoryIndex + 1).padStart(2, '0')}
              label={t('category')}
              title={category.name}
            />

            <Reveal
              as="ul"
              className="mt-20 grid gap-x-10 gap-y-20 sm:grid-cols-2 xl:grid-cols-3"
            >
              {series.map((entry) => {
                const headline = headlineDimension(entry);
                return (
                  <li key={entry.slug}>
                    <ProductCard
                      series={entry}
                      sizes={THREE_UP}
                      headline={
                        headline ? { label: tSpec(headline.labelKey), value: headline.value } : null
                      }
                    />
                  </li>
                );
              })}
            </Reveal>
          </section>
        );
      })}

      <div className="h-40" />
      <CtaBlock />
    </>
  );
}
