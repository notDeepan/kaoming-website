import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Action } from '@/components/ui/action';
import { Counter } from '@/components/ui/counter';
import { Bleed, BEAT, COMPARISON, RAIL, SHELL, VOID } from '@/components/ui/layout';
import { ProductCard } from '@/components/ui/product-card';
import { Reveal } from '@/components/ui/reveal';
import { SectionHeader } from '@/components/ui/section-header';
import { Link } from '@/i18n/navigation';
import { COMPANY, NETWORK } from '@/lib/company';
import { featuredSeries, headlineDimension } from '@/lib/featured';
import { catalogueDocuments, factoryImages } from '@/lib/images';
import { allSeries } from '@/lib/machines';
import { navSections } from '@/lib/nav';

/**
 * The homepage bands (Part F.3).
 *
 * **No two consecutive sections share a structure.** They used to: every one was
 * a centred container, a title block, a 56px gap and a row of equal cards. The
 * rotation now runs
 *
 *   showcase   four machines, one per category, aligned
 *   industries an edge-anchored hairline list            (full bleed, no boxes)
 *   technology a full-bleed photograph, stats overlapping its edge
 *   numbers    four figures on one baseline, read across
 *   network    a margin note against a wide field        (4/8)
 *   resources  three rules, compressed
 *
 * and the centred CTA that follows them is the rare symmetric moment, which is
 * what makes it land.
 */

/** Part F.2 — one machine per category, the four compared side by side. */
export async function MachineShowcase() {
  const t = await getTranslations('Home');
  const tSpec = await getTranslations('Spec');
  const featured = featuredSeries();

  const headlineFor = (series: (typeof featured)[number]) => {
    const headline = headlineDimension(series);
    return headline ? { label: tSpec(headline.labelKey), value: headline.value } : null;
  };

  return (
    <section className={`${SHELL} ${VOID}`}>
      <SectionHeader
        index="01"
        label={t('showcaseLabel')}
        title={t('showcaseTitle')}
        lede={t('showcaseLede')}
        action={
          <Action href="/products" variant="secondary">
            {t('viewAllMachines')}
          </Action>
        }
      />

      {/* One machine per category, aligned.
          This was a 7/5 split with the flagship at double size and the other
          three staggered down a rail beside it. The hierarchy was real but the
          composition was not: the tall lead column left a screen-height void
          under it while the short rail ran on, and a visitor comparing four
          categories had to read them at four different sizes and heights.
          These are peers — one per category, which is the whole point of the
          section — so they get one baseline. The flagship still says so, in the
          one place that costs the layout nothing: its own label. */}
      <Reveal as="ul" className="mt-20 grid gap-x-8 gap-y-20 sm:grid-cols-2 xl:grid-cols-4">
        {featured.map((series, index) => (
          <li key={series.slug} data-reveal>
            <ProductCard
              series={series}
              headline={headlineFor(series)}
              priority={index === 0}
            />
          </li>
        ))}
      </Reveal>
    </section>
  );
}

/**
 * Part F.3 — the six industries.
 *
 * An edge-anchored list of hairline rows that run the full width of the
 * viewport. It was a three-across grid of bordered tiles; six identical boxes
 * is a table of contents pretending to be a feature.
 */
export async function ApplicationsBand() {
  const t = await getTranslations('Home');
  const tNav = await getTranslations('Nav');
  const applications = navSections.find((section) => section.key === 'applications');

  return (
    <section className="bg-km-charcoal">
      <div className={`${SHELL} ${BEAT}`}>
        <SectionHeader index="02" label={t('applicationsLabel')} title={t('applicationsTitle')} />
      </div>

      {/* No 01–06 here.
          The section index numbers the buyer's journey, which is a real
          sequence. These six are not: aerospace does not come before automotive,
          and numbering them was a structural device encoding nothing — the one
          thing a numbered marker must never be. The list is full-bleed so the
          rows still run the width of the hall. */}
      <Bleed>
        <Reveal as="ul" className="border-t border-km-steel-600/40">
          {applications?.children.map((child) => (
            <li key={child.href} data-reveal className="border-b border-km-steel-600/40">
              <Link
                href={child.href}
                className="group flex items-baseline gap-6 px-5 py-7 transition-colors duration-(--duration-km) ease-(--ease-km) hover:bg-km-steel-800 sm:gap-12 sm:px-6 xl:px-10"
              >
                <span className="font-display text-h2 text-km-paper uppercase">
                  {child.kind === 'literal' ? child.label : tNav(child.key)}
                </span>
                <span
                  aria-hidden="true"
                  className="km-label ms-auto hidden shrink-0 self-center text-km-steel-400 transition-transform duration-(--duration-km) ease-(--ease-km) group-hover:translate-x-2 group-hover:text-km-red-glow sm:block"
                >
                  {t('viewApplication')} →
                </span>
              </Link>
            </li>
          ))}
        </Reveal>
      </Bleed>
    </section>
  );
}

/**
 * Part F.3 — the technology teaser.
 *
 * A full-bleed photograph of the machining hall, with the figures overlapping
 * its bottom edge on a negative margin. The scraping numbers are the strongest
 * thing KAO MING can say about itself and are quoted verbatim: over 20 points
 * per square inch, a 50/50 split of load-bearing points and oil pockets, 40%
 * contact ratio in use.
 */
export async function TechnologyTeaser() {
  const t = await getTranslations('Home');
  const hall = factoryImages[0];

  return (
    <section className="pt-40 sm:pt-56">
      <div className={SHELL}>
        <SectionHeader index="03" label={t('technologyLabel')} title={t('technologyTitle')} />
      </div>

      {hall ? (
        <Bleed className="mt-16">
          <div className="relative h-[52svh] min-h-80 w-full overflow-hidden sm:h-[70svh]">
            <Image
              src={hall.src}
              alt={t('factoryAlt')}
              fill
              sizes="100vw"
              className="object-cover"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-km-black via-km-black/20 to-transparent"
            />
          </div>
        </Bleed>
      ) : null}

      {/* Overlapping the photograph above it. The figures belong to the hall,
          so they sit on it rather than politely underneath. */}
      <Reveal className={`${SHELL} relative -mt-20 sm:-mt-28`}>
        <div data-reveal className={RAIL.fiveSeven}>
          <p className="max-w-[42ch] text-body text-km-steel-400">{t('technologyBody')}</p>

          {/* Three measurements of one scraped surface, read together — so one
              baseline. They were on three different heights, which made a set of
              related figures look like three unrelated boasts. */}
          <dl className={`${COMPARISON} grid-cols-2 sm:grid-cols-3`}>
            {(['ppi', 'split', 'contact'] as const).map((key) => (
              <div key={key}>
                <dd className="font-mono text-spec-xl text-km-paper">
                  {t(`technologyStats.${key}.value`)}
                </dd>
                <dt className="km-label mt-3 border-t border-km-steel-600/60 pt-3 text-km-steel-400">
                  {t(`technologyStats.${key}.label`)}
                </dt>
              </div>
            ))}
          </dl>
        </div>

        <Action href="/company/factory" variant="text" className="mt-16">
          {t('insideKaoMing')}
        </Action>
      </Reveal>
    </section>
  );
}

/**
 * Part F.3 — the numbers.
 *
 * Four figures on a staggered baseline rather than a tidy four-across row. Each
 * one is a different width and sits at a different height, so the eye travels
 * across them instead of scanning a ruler.
 *
 * The spec sources this from a 2022 sales deck. That deck is reference-only
 * material (CLAUDE.md) and its figures are four years stale, so every number
 * here comes from the verified record instead: the founding year, the model
 * count in the 2026 catalogues, the agent registry, and the plant area stated
 * in the company history. Nothing is rounded up.
 */
export async function NumbersStrip() {
  const t = await getTranslations('Home');
  const year = new Date().getFullYear();

  const stats = [
    { key: 'years', value: year - COMPANY.foundedYear, suffix: '' },
    { key: 'models', value: allSeries.reduce((total, series) => total + series.models.length, 0), suffix: '+' },
    { key: 'countries', value: NETWORK.countries, suffix: '' },
    { key: 'plant', value: 25000, suffix: ' m²' },
  ] as const;

  return (
    <section className="mt-40 border-y border-km-steel-600/60 bg-km-charcoal sm:mt-56">
      <Reveal
        as="dl"
        className={`${SHELL} ${COMPARISON} grid-cols-2 py-24 lg:grid-cols-4`}
      >
        {/* Aligned. These four are the company at a glance and they are read as
            one row of facts; staggering them turned a summary into a scatter. */}
        {stats.map((stat) => (
          <div key={stat.key} data-reveal>
            <dd className="font-mono text-spec-xl text-km-paper">
              <Counter value={stat.value} suffix={stat.suffix} />
            </dd>
            <dt className="km-label mt-4 border-t border-km-steel-600/60 pt-4 text-km-steel-400">
              {t(`numbers.${stat.key}`)}
            </dt>
          </div>
        ))}
      </Reveal>
    </section>
  );
}

/** Part F.3 — the network. A margin note against a wide field. */
export async function NetworkTeaser() {
  const t = await getTranslations('Home');

  return (
    <section className={`${SHELL} ${VOID}`}>
      <Reveal className={RAIL.fourEight}>
        <div data-reveal>
          <SectionHeader index="04" label={t('networkLabel')} title={t('networkTitle')} />
        </div>

        <div data-reveal className="lg:pt-24">
          <p className="max-w-[46ch] text-body text-km-steel-400">
            {t('networkBody', {
              agents: NETWORK.international,
              countries: NETWORK.countries,
            })}
          </p>

          {/* The five regions as a column of rules, hard against the field's
              right edge — a legend, not a row of chips. */}
          <ul className="mt-14 border-t border-km-steel-600/40">
            {NETWORK.regions.map((region) => (
              <li
                key={region}
                className="km-label border-b border-km-steel-600/40 py-3 text-km-steel-400"
              >
                {region}
              </li>
            ))}
          </ul>

          <Action href="/company/network" variant="secondary" className="mt-12">
            {t('findRepresentative')}
          </Action>
        </div>
      </Reveal>
    </section>
  );
}

/** Part F.3 — the three 2026 catalogues. Three rules, not three cards. */
export async function ResourceShortcuts() {
  const t = await getTranslations('Home');
  const tCatalogue = await getTranslations('Catalogue');

  return (
    <section className="border-t border-km-steel-600/60 bg-km-charcoal">
      <div className={`${SHELL} ${BEAT}`}>
        <SectionHeader
          index="05"
          label={t('resourcesLabel')}
          title={t('resourcesTitle')}
          action={
            <Action href="/resources" variant="secondary">
              {t('viewAllResources')}
            </Action>
          }
        />

        <Reveal as="ul" className="mt-20 border-t border-km-steel-600/40">
          {catalogueDocuments.map((document) => (
            <li key={document.id} data-reveal className="border-b border-km-steel-600/40">
              <a
                href={document.path}
                target="_blank"
                rel="noopener"
                className="group flex flex-wrap items-baseline gap-x-8 gap-y-2 py-6 transition-colors duration-(--duration-km) ease-(--ease-km) hover:text-km-red-glow"
              >
                <span className="km-label w-12 shrink-0 text-km-red-glow">
                  {document.fileType}
                </span>
                <span className="font-display text-h3 text-km-paper">
                  {tCatalogue(document.id)}
                </span>
                <span className="km-label ms-auto text-km-steel-400">
                  {(document.sizeBytes / 1048576).toFixed(1)} MB · {document.version}
                </span>
                <span
                  aria-hidden="true"
                  className="km-label shrink-0 text-km-steel-400 transition-transform duration-(--duration-km) ease-(--ease-km) group-hover:translate-x-2 group-hover:text-km-red-glow"
                >
                  →
                </span>
              </a>
            </li>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
