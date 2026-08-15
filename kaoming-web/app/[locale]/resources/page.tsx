import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CtaBlock } from '@/components/ui/cta-block';
import { DocumentCard } from '@/components/ui/document-card';
import { Reveal } from '@/components/ui/reveal';
import { routing } from '@/i18n/routing';
import { alternatesFor } from '@/lib/site';
import { catalogueDocuments } from '@/lib/images';
import { seriesBySlug } from '@/lib/machines';

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
  const t = await getTranslations({ locale, namespace: 'Resources' });
  return {
    title: t('title'),
    description: t('lede'),
    alternates: alternatesFor(locale, '/resources'),
  };
}

/**
 * Part J.6 / N.3 — the resource centre renders from the document manifest and
 * nothing else, so a superseded file cannot survive on a forgotten page.
 *
 * Today the manifest holds what KAO MING has actually supplied: the three 2026
 * catalogues. Brochures, specification sheets, application guides and videos
 * appear here the moment they are added to the manifest — no page edit needed.
 */
export default async function ResourcesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('Resources');
  const tCatalogue = await getTranslations('Catalogue');

  return (
    <>
      <div className={`${SHELL} pt-36 pb-14 sm:pt-44`}>
        <p className="km-label text-km-red-glow">{t('label')}</p>
        <h1 className="mt-6 max-w-[16ch] text-h1 text-km-paper uppercase">{t('title')}</h1>
        <p className="mt-8 max-w-[62ch] text-km-steel-400">{t('lede')}</p>
      </div>

      <section className={`${SHELL} pb-16`} aria-labelledby="catalogues">
        <h2 id="catalogues" className="km-label border-b border-km-steel-600/60 pb-4 text-km-steel-400">
          {t('catalogues')}
        </h2>
        <Reveal as="ul" className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {catalogueDocuments.map((document) => (
            <li key={document.id} className="contents">
              <DocumentCard
                title={tCatalogue(document.id)}
                description={document.covers
                  .map((slug) => seriesBySlug.get(slug)?.name)
                  .filter(Boolean)
                  .join(' · ')}
                href={document.path}
                fileType={document.fileType}
                sizeBytes={document.sizeBytes}
                language={document.language}
                version={document.version}
              />
            </li>
          ))}
        </Reveal>
      </section>

      <section className={`${SHELL} pb-24`}>
        <p className="max-w-[70ch] border-s-2 border-km-warning ps-6 text-small text-km-warning">
          {t('pending')}
        </p>
      </section>

      <CtaBlock />
    </>
  );
}
