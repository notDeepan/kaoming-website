import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CtaBlock } from '@/components/ui/cta-block';
import { ProductCard } from '@/components/ui/product-card';

import { Reveal } from '@/components/ui/reveal';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { alternatesFor } from '@/lib/site';
import { headlineDimension } from '@/lib/featured';
import { seriesInCategory } from '@/lib/machines';
import { productCategories } from '@/lib/taxonomy';

const SHELL = 'mx-auto max-w-[1600px] px-5 sm:px-6 xl:px-10';

/** Three across from `xl`; the card's default describes the home page's four. */
const THREE_UP = '(min-width: 1280px) 33vw, (min-width: 640px) 46vw, 90vw';

export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    productCategories.map((category) => ({ locale, category: category.slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}): Promise<Metadata> {
  const { locale, category } = await params;
  const entry = productCategories.find((item) => item.slug === category);
  if (!entry) return {};
  const t = await getTranslations({ locale, namespace: 'Products' });
  return {
    title: entry.name,
    description: t('categoryLede', { category: entry.name }),
    alternates: alternatesFor(locale, `/products/${entry.slug}`),
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ locale: string; category: string }>;
}) {
  const { locale, category } = await params;
  setRequestLocale(locale);

  const entry = productCategories.find((item) => item.slug === category);
  if (!entry) notFound();

  const t = await getTranslations('Products');
  const tSpec = await getTranslations('Spec');
  const series = seriesInCategory(entry.slug);

  return (
    <>
      <div className={`${SHELL} pt-36 pb-16 sm:pt-44`}>
        <nav aria-label={t('breadcrumb')}>
          <Link href="/products" className="km-label text-km-steel-400 hover:text-km-offwhite">
            ← {t('allTitle')}
          </Link>
        </nav>
        <h1 className="mt-8 max-w-[18ch] text-h1 text-km-paper uppercase">{entry.name}</h1>
        <p className="mt-8 max-w-[62ch] text-km-steel-400">
          {t('categoryLede', { category: entry.name })}
        </p>
      </div>

      <Reveal as="ul" className={`${SHELL} grid gap-6 pb-24 md:grid-cols-2 xl:grid-cols-3`}>
        {series.map((item) => {
          const headline = headlineDimension(item);
          return (
            <li key={item.slug} className="contents">
              <ProductCard
                series={item}
                sizes={THREE_UP}
                headline={
                  headline ? { label: tSpec(headline.labelKey), value: headline.value } : null
                }
              />
            </li>
          );
        })}
      </Reveal>

      <CtaBlock />
    </>
  );
}
