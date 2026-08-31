import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Action } from "@/components/ui/action";
import { CompareToggle } from "@/components/compare/compare-controls";
import { SpecificationsScene } from "@/components/product/specifications-scene";
import { DocumentActions } from "@/components/ui/document-actions";
import { ApplicationsBand } from "@/components/product/applications-band";
import { MachineConstellation } from "@/components/product/machine-constellation";
import { MachineViewer } from "@/components/product/machine-viewer";
import { MachineWindow } from "@/components/product/machine-window";
import { RfqScene } from "@/components/product/rfq-scene";
import { WorkpieceScene } from "@/components/product/workpiece-scene";
import { SourceNote } from "@/components/ui/source-note";
import { routing } from "@/i18n/routing";
import { catalogueDocuments, displayImage } from "@/lib/images";
import {
  allSeries,
  catalogueForSeries,
  constellationFacts,
  getSeries,
  specHighlights,
} from "@/lib/machines";
import { breadcrumbSchema, productSchema, schemaScript } from "@/lib/schema";
import { alternatesFor } from "@/lib/site";


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
    alternates: alternatesFor(
      locale,
      `/products/${entry.categorySlug}/${entry.slug}`,
    ),
    openGraph: hero
      ? {
          type: "website",
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

  const t = await getTranslations("Products");
  const tSpecLabel = await getTranslations("Spec");
  const hero = entry.images[0];
  const highlights = specHighlights(entry);
  const catalogue = catalogueForSeries(entry.slug, catalogueDocuments);

  /*
   * The constellation's data, resolved here rather than in the client component.
   *
   * Spec labels are message keys and the values are already transcribed strings,
   * so translating them on the server keeps next-intl's server API out of a
   * component that has to be a client one for the pointer and the turntable.
   *
   * A fact that belongs to a specification group links to that group's table
   * further down the page. One that does not — the model span, the architecture
   * note — is a card and nothing more, because a link that goes nowhere is worse
   * than no link.
   */
  const nodes = constellationFacts(entry).map((fact) => ({
    id: fact.id,
    label:
      fact.kind === "spec"
        ? tSpecLabel(fact.labelKey)
        : t(`fact.${fact.labelKey}`),
    value: fact.value,
    href: fact.group ? "#spec" : null,
  }));

  const views = entry.images.map((image) => ({
    ...displayImage(image),
    view: image.view,
    model: image.model,
  }));

  return (
    <>
      {/* Part R — the specification, offered to search engines in the same form
          the page renders it. Every value comes from `entry`; nothing here is
          asserted that the page does not also show. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: schemaScript(
            productSchema(entry, locale, (key) => tSpecLabel(key)),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: schemaScript(
            breadcrumbSchema([
              { name: t("allTitle"), path: `/${locale}/products` },
              {
                name: entry.categorySlug.replace(/-/g, " "),
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

      {/*
       * The machine window.
       *
       * A series is not a page you scroll any more. Clicking a machine opens a
       * window over the grid you came from, and everything about that machine is
       * inside it — the web of figures, the 3D view, the specification, the
       * photographs. There is deliberately nothing underneath it: the previous
       * version put the web at the top of an ordinary page and left the old page
       * below, so scrolling undid the whole effect.
       *
       * The panes are rendered here, on the server, and handed over as elements.
       * `MachineWindow` renders only the open one, which is what keeps the 3D
       * pane's canvas from mounting for a visitor who never opens it.
       */}
      <MachineWindow
        name={entry.name}
        type={entry.type}
        category={entry.categorySlug.replace(/-/g, " ")}
        closeHref={`/products/${entry.categorySlug}`}
        panes={[
          {
            id: "web",
            label: t("paneWeb"),
            content: (
              <MachineConstellation
                name={entry.name}
                type={entry.type}
                views={views}
                nodes={nodes}
                onOpen3d="#experience"
                catalogueHref={catalogue?.path ?? null}
                transitionName={`machine-${entry.slug}`}
                labels={{
                  view3d: t("view3d"),
                  catalogue: t("openCatalogue"),
                  turntable: t("turntable"),
                  viewOf: t("imageAlt", { model: "{model}", view: "{view}" }),
                  hint: t("constellationHint"),
                  specifications: t("specificationsTitle"),
                }}
              />
            ),
          },
          {
            id: "viewer",
            label: t("paneViewer"),
            fill: true,
            content: (
              <MachineViewer
                slug={entry.slug}
                machine={entry.name}
                components={entry.components}
                fallback={hero ? hero.plate : null}
              />
            ),
          },
          {
            id: "spec",
            label: t("paneSpec"),
            content: (
              <>
                <div className="mx-auto max-w-[1600px]">
                  <SpecificationsScene
                    index="01"
                    series={entry}
                    highlights={highlights}
                    sourceNote={
                      entry.source ? (
                        <SourceNote
                          document={entry.source.document}
                          status={
                            entry.completeness === "full"
                              ? null
                              : entry.transcriptionNote
                          }
                        />
                      ) : null
                    }
                  />

                  {/* What the catalogue says about the machine, in its own words.
                    All of them, numbered from one: these used to be split
                    between the six that fitted on scroll-scene 03 and an
                    overflow list of whatever was left, which is not a
                    distinction the catalogue makes. */}
                  {entry.features.length ? (
                    <section className="mt-16 border-t border-km-steel-600/60 pt-10">
                      <h2 className="km-label text-km-steel-400">
                        {t("featuresTitle")}
                      </h2>
                      <ul className="mt-8 border-t border-km-steel-600/40">
                        {entry.features.map((feature, index) => (
                          <li
                            key={feature.id}
                            data-feature
                            className="grid gap-x-10 gap-y-2 border-b border-km-steel-600/40 py-7 sm:grid-cols-[3rem_1fr]"
                          >
                            <span className="km-label text-km-red-glow">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <div>
                              <h3 className="font-display text-h3 text-km-paper">
                                {feature.title}
                              </h3>
                              {feature.copy ? (
                                <p className="mt-3 max-w-[62ch] text-body text-km-steel-400">
                                  {feature.copy}
                                </p>
                              ) : null}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ) : null}

                  {/* Take the document it was transcribed from, or set the
                    machine beside another. Asking for a price is the form at
                    the foot of this pane, not a link away from it. */}
                  <div className="mt-12 flex flex-wrap items-center gap-4 border-t border-km-steel-600/60 pt-8">
                    <Action href="#rfq" variant="primary">
                      {t("requestQuote")}
                    </Action>
                    <CompareToggle
                      entry={{
                        slug: entry.slug,
                        name: entry.name,
                        category: entry.categorySlug,
                      }}
                    />
                    {catalogue ? (
                      <DocumentActions
                        documentId={catalogue.id}
                        href={catalogue.path}
                      />
                    ) : null}
                  </div>
                </div>

                {/* What the machine makes, which industries buy it, and the way to
                  ask for a price. These are the machine's own content and they
                  follow it into the window — the redesign changed where a
                  visitor finds them, not whether the site holds them.

                  Outside the measure above and pulled back out to the window's
                  edges: each carries a hairline and a full-width ground, and a
                  band that stops short of the frame reads as a floating panel
                  rather than as the next part of the document. */}
                <div className="-mx-5 mt-16 sm:-mx-6 xl:-mx-8">
                  <WorkpieceScene
                    index="02"
                    workpieces={entry.workpieces}
                    machine={entry.name}
                  />
                  <ApplicationsBand index="03" />
                  <RfqScene
                    index="04"
                    slug={entry.slug}
                    machine={entry.name}
                    locale={locale}
                  />
                </div>
              </>
            ),
          },
          {
            id: "gallery",
            label: t("paneGallery"),
            content: (
              <ul className="mx-auto grid max-w-[1600px] items-start gap-x-8 gap-y-12 sm:grid-cols-2 xl:grid-cols-3">
                {entry.images.map((image) => (
                  <li key={image.plate.src}>
                    <figure className="border border-km-steel-600/60 bg-km-plate p-4">
                      <Image
                        src={image.plate.src}
                        alt={t("imageAlt", {
                          model: image.model,
                          view: image.view,
                        })}
                        width={image.plate.width}
                        height={image.plate.height}
                        sizes="(min-width: 1280px) 30vw, (min-width: 768px) 46vw, 92vw"
                        className="h-auto w-full"
                      />
                    </figure>
                    <figcaption className="mt-3 flex flex-wrap items-baseline gap-x-3">
                      <span className="font-mono text-spec text-km-offwhite">
                        {image.model}
                      </span>
                      <span className="text-small text-km-steel-400">
                        {image.view}
                      </span>
                    </figcaption>
                  </li>
                ))}
              </ul>
            ),
          },
        ]}
      />
    </>
  );
}
