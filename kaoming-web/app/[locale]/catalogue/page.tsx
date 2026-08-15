import type { Metadata } from 'next';
import Image from 'next/image';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PageHeader, SHELL } from '@/components/ui/page-shell';
import { Reveal } from '@/components/ui/reveal';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { catalogues } from '@/lib/catalogue';
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
  const t = await getTranslations({ locale, namespace: 'Catalogue' });
  return {
    title: t('shelfTitle'),
    description: t('shelfLede'),
    alternates: alternatesFor(locale, '/catalogue'),
  };
}

/**
 * The shelf (Part I.1): catalogues as physical documents on the dark field.
 *
 * The "3D-looking cover" is a CSS 3D transform on the real first spread — a
 * perspective rotation, a spine shading gradient, and a lift on hover. No WebGL:
 * the spec says true WebGL is not required here, and a canvas per cover on an
 * index page would be three contexts for a decorative effect.
 */
export default async function CatalogueShelfPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations('Catalogue');

  return (
    <>
      <PageHeader label={t('label')} title={t('shelfTitle')} lede={t('shelfLede')} />

      <section className={`${SHELL} pb-24`}>
        {/* A shelf, not a row. Three documents of different sizes, stood at
            different heights the way they would be if you put them on a table —
            and the widest catalogue is the one that covers the flagship. */}
        <Reveal
          as="ul"
          className="grid items-start gap-x-10 gap-y-20 sm:grid-cols-2 xl:grid-cols-[1.3fr_1fr_1.15fr]"
        >
          {catalogues.map((catalogue, index) => {
            const cover = catalogue.spreads[0];
            return (
              <li
                key={catalogue.id}
                data-catalogue={catalogue.slug}
                data-reveal
                className={['', 'xl:mt-24', 'xl:mt-10'][index % 3]}
              >
                <Link
                  href={`/catalogue/${catalogue.slug}`}
                  className="group block [perspective:1600px]"
                >
                  <div className="relative transition-transform duration-(--duration-km-slow) ease-(--ease-km) [transform-style:preserve-3d] group-hover:[transform:rotateY(-14deg)_translateY(-8px)]">
                    {cover ? (
                      <Image
                        src={cover.src}
                        alt={t(catalogue.id)}
                        width={cover.width}
                        height={cover.height}
                        sizes="(min-width: 1280px) 30vw, (min-width: 640px) 46vw, 92vw"
                        className="h-auto w-full border border-km-steel-600/60 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.9)]"
                      />
                    ) : null}
                    {/* The spine. A printed catalogue has one; this is the only
                        thing that makes a flat image read as an object. */}
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 start-0 w-6 bg-gradient-to-r from-black/60 to-transparent"
                    />
                  </div>

                  <h2 className="mt-6 font-display text-h3 text-km-paper">{t(catalogue.id)}</h2>
                  <p className="mt-2 font-mono text-spec text-km-steel-400">
                    {catalogue.pageCount} {t('pages')} ·{' '}
                    {(catalogue.sizeBytes / 1048576).toFixed(1)} MB · {catalogue.version} ·{' '}
                    {catalogue.language.toUpperCase()}
                  </p>
                  <p className="km-label mt-4 text-km-red-glow">{t('open')}</p>
                </Link>
              </li>
            );
          })}
        </Reveal>
      </section>
    </>
  );
}
