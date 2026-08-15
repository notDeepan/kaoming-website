import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CatalogueReader } from '@/components/catalogue/catalogue-reader';
import { Action } from '@/components/ui/action';
import { PageHeader, SHELL } from '@/components/ui/page-shell';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { catalogueBySlug, catalogues, machinesInCatalogue } from '@/lib/catalogue';
import { RFQ_HREF } from '@/lib/nav';
import { alternatesFor } from '@/lib/site';

export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    catalogues.map((catalogue) => ({ locale, slug: catalogue.slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const catalogue = catalogueBySlug(slug);
  if (!catalogue) return {};

  const t = await getTranslations({ locale, namespace: 'Catalogue' });
  return {
    title: t(catalogue.id),
    description: t('readerDescription', { title: t(catalogue.id), pages: catalogue.pageCount }),
    alternates: alternatesFor(locale, `/catalogue/${slug}`),
  };
}

/**
 * One catalogue, read in the browser (Part I).
 *
 * The reader is a client island; everything around it — the title, the machines
 * it covers, the enquiry — is server-rendered, so a visitor with no JavaScript
 * still gets the catalogue's identity, its machines and a working download.
 *
 * Part I.6 asks for **Add to Enquiry** to accumulate models. That is the compare
 * tray and the RFQ, both of which already exist and already carry machines into
 * a pre-populated enquiry — so this links into them rather than growing a third
 * tray with its own state.
 */
export default async function CataloguePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const catalogue = catalogueBySlug(slug);
  if (!catalogue) notFound();

  const t = await getTranslations('Catalogue');
  const machines = machinesInCatalogue(catalogue);
  const title = t(catalogue.id);

  return (
    <>
      <PageHeader
        label={t('label')}
        title={title}
        aside={
          <p className="font-mono text-spec text-km-steel-400">
            {catalogue.pageCount} {t('pages')} · {catalogue.version} ·{' '}
            {catalogue.language.toUpperCase()}
          </p>
        }
      />

      <CatalogueReader catalogue={catalogue} title={title} />

      {/* -------------------------------------------- the machines it covers */}
      <section className={`${SHELL} py-20`}>
        <h2 className="km-label text-km-red-glow">{t('coversLabel')}</h2>
        <ul className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
          {machines.map((series) => (
            <li key={series.slug}>
              <Link
                href={`/products/${series.categorySlug}/${series.slug}`}
                data-covers={series.slug}
                className="font-display text-h3 text-km-paper transition-colors duration-(--duration-km) hover:text-km-red-glow"
              >
                {series.name}
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-12 flex flex-wrap gap-4">
          <Action
            href={`${RFQ_HREF}?source=catalogue&machine=${machines.map((series) => series.slug).join(',')}`}
            variant="primary"
          >
            {t('requestInformation')}
          </Action>
          <Action href="/compare" variant="secondary">
            {t('compare')}
          </Action>
        </div>
      </section>
    </>
  );
}
