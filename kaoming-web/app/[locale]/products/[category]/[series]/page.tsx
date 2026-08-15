import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Action, ActionLink } from '@/components/ui/action';
import { CompareToggle } from '@/components/compare/compare-controls';
import { ApplicationsBand } from '@/components/product/applications-band';
import { ProductExit } from '@/components/product/product-exit';
import { RfqScene } from '@/components/product/rfq-scene';
import { SpecificationsScene } from '@/components/product/specifications-scene';
import { WorkpieceScene } from '@/components/product/workpiece-scene';
import { ProductExperience } from '@/components/three/product-experience';
import { DocumentActions } from '@/components/ui/document-actions';
import { RAIL } from '@/components/ui/layout';
import { MachinePlate } from '@/components/ui/machine-plate';
import { Reveal } from '@/components/ui/reveal';
import { SectionHeader } from '@/components/ui/section-header';
import { SourceNote } from '@/components/ui/source-note';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { catalogueDocuments } from '@/lib/images';
import { MAX_FEATURE_CARDS, overflowFeatures as overflowFor } from '@/lib/features';
import { allSeries, catalogueForSeries, getSeries, specHighlights } from '@/lib/machines';
import { RFQ_HREF } from '@/lib/nav';
import { breadcrumbSchema, productSchema, schemaScript } from '@/lib/schema';
import { alternatesFor } from '@/lib/site';

const SHELL = 'mx-auto max-w-[1600px] px-5 sm:px-6 xl:px-10';

export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    allSeries.map((series) => ({
      locale,
      category: series.categorySlug,
      series: series.slug,
    })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; category: string; series: string }>;
}): Promise<Metadata> {
  const { locale, category, series } = await params;
  const entry = getSeries(category, series);
  if (!entry) return {};
  // Part R: an OG image per machine. The dark-field knockout is the hero angle
  // the catalogue photographs from, and it is already generated.
  const hero = entry.images[0];

  return {
    title: entry.name,
    description: entry.positioning ?? entry.type,
    // Legacy KMC codes still carry search equity and stay invisible (CLAUDE.md).
    keywords: [entry.name, entry.type, ...entry.legacyAliases],
    alternates: alternatesFor(locale, `/products/${entry.categorySlug}/${entry.slug}`),
    openGraph: hero
      ? {
          type: 'website',
          title: entry.name,
          description: entry.positioning ?? entry.type,
          images: [
            {
              url: hero.plate.src,
              width: hero.plate.width,
              height: hero.plate.height,
              alt: `${entry.name} — ${hero.view}`,
            },
          ],
        }
      : undefined,
  };
}

/**
 * The photo-based product template (M1). The same page becomes the 3D
 * experience in M3–M6; the DOM below is the equivalent the spec requires every
 * 3D scene to have, not a stopgap that gets deleted.
 *
 * It adapts to how much of the catalogue has been transcribed: a full
 * specification, table geometry only, or — for the two Bow Way pages nobody has
 * read yet — the series name, its catalogue features and the catalogue itself,
 * with the gap stated plainly.
 */
export default async function SeriesPage({
  params,
}: {
  params: Promise<{ locale: string; category: string; series: string }>;
}) {
  const { locale, category, series } = await params;
  setRequestLocale(locale);

  const entry = getSeries(category, series);
  if (!entry) notFound();

  const t = await getTranslations('Products');
  const tSpecLabel = await getTranslations('Spec');
  const tCatalogue = await getTranslations('Catalogue');
  const hero = entry.images[0];
  const gallery = entry.images.slice(1);
  const highlights = specHighlights(entry);
  const catalogue = catalogueForSeries(entry.slug, catalogueDocuments);

  // Scene 03 shows the first six; this is what it did not reach.
  const overflowFeatures = overflowFor(entry);

  const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
  const positioning =
    entry.positioning && normalise(entry.positioning) !== normalise(entry.type)
      ? entry.positioning
      : null;

  return (
    <>
      {/* Part R — the specification, offered to search engines in the same form
          the page renders it. Every value comes from `entry`; nothing here is
          asserted that the page does not also show. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: schemaScript(productSchema(entry, locale, (key) => tSpecLabel(key))),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: schemaScript(
            breadcrumbSchema([
              { name: t('allTitle'), path: `/${locale}/products` },
              {
                name: entry.categorySlug.replace(/-/g, ' '),
                path: `/${locale}/products/${entry.categorySlug}`,
              },
              {
                name: entry.name,
                path: `/${locale}/products/${entry.categorySlug}/${entry.slug}`,
              },
            ]),
          ),
        }}
      />

      {/* ---------------------------------------------------------- hero */}
      <section className={`${SHELL} pt-36 pb-16 sm:pt-44`}>
        {/* One line, always.
            Wrapping was the site's entire CLS budget: at 412px this trail is
            two lines in the fallback face and one in Plex Mono, so the swap at
            ~690ms lifted the whole hero by 22px — 0.148, measured, on the most
            important page on the site. Metric-matching the fallback does not
            help, because the reflow is a line count, not a line height. A
            breadcrumb that scrolls sideways on a narrow screen cannot reflow at
            all, and reads better there anyway. */}
        <nav
          aria-label={t('breadcrumb')}
          className="km-label -mx-5 flex gap-2 overflow-x-auto px-5 whitespace-nowrap text-km-steel-400 sm:mx-0 sm:px-0"
        >
          <Link href="/products" className="hover:text-km-offwhite">
            {t('allTitle')}
          </Link>
          <span aria-hidden="true">/</span>
          <Link href={`/products/${entry.categorySlug}`} className="hover:text-km-offwhite">
            {entry.categorySlug.replace(/-/g, ' ')}
          </Link>
        </nav>

        {/* The machine leads and the plate runs to the right edge of the
            viewport; the name and the buttons are a title block hung under it
            on the left. It was a centred 32rem/1fr split with the type vertically
            centred against the photograph — tidy, and it made a 50-tonne machine
            look like a product thumbnail. */}
        <div className="mt-12 grid items-end gap-x-10 gap-y-10 lg:grid-cols-[minmax(0,34%)_1fr]">
          <div className="relative z-1 lg:pb-4">
            <h1 className="max-w-[11ch] text-h1 text-balance text-km-paper uppercase lg:w-[125%]">
              {entry.name}
            </h1>
            <p className="mt-5 max-w-[26ch] font-display text-h3 text-km-steel-400">
              {entry.type}
            </p>
          </div>

          {hero ? (
            <div className="lg:-me-5 xl:-me-10">
              <MachinePlate
                image={hero.cut}
                alt={t('imageAlt', { model: hero.model, view: hero.view })}
                priority
                glow="lg"
                sizes="(min-width: 1024px) 68vw, 92vw"
                transitionName={`machine-${entry.slug}`}
              />
            </div>
          ) : null}
        </div>

        {/* Compression: the caption sits almost on the plate it names, and the
            actions ride the same hairline. */}
        <div className="mt-4 flex flex-col gap-8 border-t border-km-steel-600/60 pt-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-[52ch]">
            {hero ? (
              <p className="km-label text-km-steel-400">{t('shown', { model: hero.model })}</p>
            ) : null}
            {/* Several series carry a catalogue positioning line that restates
                the type almost word for word. Printing both reads as padding. */}
            {positioning ? (
              <p className="mt-5 text-body text-km-steel-400">{positioning}</p>
            ) : null}
          </div>

          <div className="flex shrink-0 flex-wrap gap-4">
            <Action href={`${RFQ_HREF}?machine=${entry.slug}&source=product`} variant="primary">
              {t('requestQuote')}
            </Action>
            <CompareToggle
              entry={{ slug: entry.slug, name: entry.name, category: entry.categorySlug }}
            />
            {catalogue ? (
              <ActionLink href={catalogue.path} target="_blank" rel="noopener" variant="secondary">
                {t('openCatalogue')}
              </ActionLink>
            ) : null}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- scenes 01 to 06 */}
      <ProductExperience series={entry} fallbackImage={hero ? hero.plate : null} />

      {/* ------------------------------------------- remaining features */}
      {/* Scene 03 carries the first six features as its info cards. Anything
          beyond that — Neptunus states nine — still belongs on the page, so the
          remainder is listed here rather than being silently dropped. */}
      {overflowFeatures.length ? (
        <section className={`${SHELL} py-32 sm:py-40`}>
          <div className={RAIL.threeNine}>
            <SectionHeader label={t('featuresLabel')} title={t('featuresTitle')} />

            {/* A numbered list against the wide column, not a three-across grid.
                These continue Scene 03's sequence, so they are numbered from
                seven and read as a continuation rather than a fresh set. */}
            <Reveal as="ul" className="border-t border-km-steel-600/40 lg:mt-3">
              {overflowFeatures.map((feature, index) => (
                <li
                  key={feature.id}
                  data-reveal
                  className="grid gap-x-10 gap-y-2 border-b border-km-steel-600/40 py-8 sm:grid-cols-[3rem_1fr]"
                >
                  <span className="km-label text-km-red-glow">
                    {String(index + 1 + MAX_FEATURE_CARDS).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="font-display text-h3 text-km-paper">{feature.title}</h3>
                    {feature.copy ? (
                      <p className="mt-3 max-w-[62ch] text-body text-km-steel-400">
                        {feature.copy}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </Reveal>
          </div>
        </section>
      ) : null}

      {entry.architecture ? (
        <section className={`${SHELL} pb-24`}>
          <p className="max-w-[70ch] border-s-2 border-km-blue ps-6 text-km-steel-400">
            {entry.architecture}
          </p>
        </section>
      ) : null}

      {/* ------------------------------------------------------- gallery */}
      {gallery.length ? (
        <section className={`${SHELL} py-24`}>
          <SectionHeader label={t('galleryLabel')} title={t('galleryTitle')} />
          {/* Views of one machine, not a contact sheet: unequal columns and
              staggered baselines, so the eye moves between them. */}
          <Reveal
            as="ul"
            className="mt-16 grid items-start gap-x-8 gap-y-16 sm:grid-cols-2 xl:grid-cols-[1.2fr_0.95fr_1.1fr]"
          >
            {gallery.map((image, index) => (
              <li
                key={image.plate.src}
                data-reveal
                className={['', 'xl:mt-20', 'xl:mt-8'][index % 3]}
              >
                <figure className="border border-km-steel-600/60 bg-km-offwhite p-4">
                  <Image
                    src={image.plate.src}
                    alt={t('imageAlt', { model: image.model, view: image.view })}
                    width={image.plate.width}
                    height={image.plate.height}
                    sizes="(min-width: 1280px) 30vw, (min-width: 768px) 46vw, 92vw"
                    className="h-auto w-full"
                  />
                </figure>
                <figcaption className="mt-3 flex flex-wrap items-baseline gap-x-3">
                  <span className="font-mono text-spec text-km-offwhite">{image.model}</span>
                  <span className="text-small text-km-steel-400">{image.view}</span>
                </figcaption>
              </li>
            ))}
          </Reveal>
        </section>
      ) : null}

      {/* ---------------------------------------------------- scene 07 */}
      <WorkpieceScene index="01" workpieces={entry.workpieces} machine={entry.name} />

      {/* ---------------------------------------------------- scene 08 */}
      <ApplicationsBand index="02" />

      {/* ---------------------------------------------------- scene 09 */}
      <SpecificationsScene
        index="03"
        series={entry}
        highlights={highlights}
        sourceNote={
          entry.source ? (
            <SourceNote
              document={entry.source.document}
              status={entry.completeness === 'full' ? null : entry.transcriptionNote}
            />
          ) : null
        }
      />

      {/* ---------------------------------------------------- scene 10 */}
      {catalogue ? (
        <section id="downloads" className="border-t border-km-steel-600/60">
          <div className={`${SHELL} py-20`}>
            <SectionHeader index="04" label={t('downloadsLabel')} title={t('downloadsTitle')} />
            <div
              data-document-card={catalogue.id}
              className="mt-10 flex flex-wrap items-center gap-6 border border-km-steel-600/60 p-6"
            >
              <span className="km-label bg-km-red px-2 py-1 text-km-paper">
                {catalogue.fileType}
              </span>
              <span className="font-display text-km-paper">{tCatalogue(catalogue.id)}</span>
              <span className="font-mono text-spec text-km-steel-400">
                {(catalogue.sizeBytes / 1048576).toFixed(1)} MB · {catalogue.version} ·{' '}
                {catalogue.language.toUpperCase()}
              </span>
              <DocumentActions documentId={catalogue.id} href={catalogue.path} align="end" />
            </div>
            {/* Part G.10 lists five document types per machine. The kit supplies
                the catalogue and nothing else, so one card is what there is. */}
            <p className="mt-6 max-w-[70ch] text-small text-km-steel-400">
              {t('downloadsPending')}
            </p>
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------- scene 11 */}
      <RfqScene index="05" slug={entry.slug} machine={entry.name} locale={locale} />

      <ProductExit category={entry.categorySlug} />
    </>
  );
}

