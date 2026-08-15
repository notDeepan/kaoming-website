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
      <div className={`${SHELL} pt-36 pb-10 sm:pt-44`}>
        <p className="km-label text-km-red-glow">{t('label')}</p>
        <h1 className="mt-6 max-w-[16ch] text-h1 text-km-paper uppercase">{t('allTitle')}</h1>
        <p className="mt-8 max-w-[62ch] text-km-steel-400">{t('allLede')}</p>
      </div>

      {productCategories.map((category, categoryIndex) => {
        const series = seriesInCategory(category.slug);
        return (
          <section key={category.slug} className={`${SHELL} py-16`}>
            <SectionHeader
              index={String(categoryIndex + 1).padStart(2, '0')}
              label={t('category')}
              title={category.name}
            />
            <Reveal as="ul" className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {series.map((entry) => {
                const headline = headlineDimension(entry);
                return (
                  <li key={entry.slug} className="contents">
                    <ProductCard
                      series={entry}
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

      <div className="h-24" />
      <CtaBlock />
    </>
  );
}
