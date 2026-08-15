import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Action } from '@/components/ui/action';
import { Counter } from '@/components/ui/counter';
import { ProductCard } from '@/components/ui/product-card';
import { Reveal } from '@/components/ui/reveal';
import { SectionHeader } from '@/components/ui/section-header';
import { Link } from '@/i18n/navigation';
import { COMPANY, NETWORK } from '@/lib/company';
import { featuredSeries, headlineDimension } from '@/lib/featured';
import { catalogueDocuments, factoryImages } from '@/lib/images';
import { allSeries } from '@/lib/machines';
import { navSections } from '@/lib/nav';

const SHELL = 'mx-auto max-w-[1600px] px-5 sm:px-6 xl:px-10';

/** Part F.2 — one machine per category, each card a miniature showroom. */
export async function MachineShowcase() {
  const t = await getTranslations('Home');
  const tSpec = await getTranslations('Spec');
  const featured = featuredSeries();

  return (
    <section className={`${SHELL} py-24 sm:py-32`}>
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
      <Reveal as="ul" className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {featured.map((series, index) => {
          const headline = headlineDimension(series);
          return (
            <li key={series.slug} className="contents">
              <ProductCard
                series={series}
                priority={index === 0}
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
}

/** Part F.3 — the six industries, linking to their application pages. */
export async function ApplicationsBand() {
  const t = await getTranslations('Home');
  const tNav = await getTranslations('Nav');
  const applications = navSections.find((section) => section.key === 'applications');

  return (
    <section className="border-y border-km-steel-600/60 bg-km-charcoal">
      <div className={`${SHELL} py-24 sm:py-32`}>
        <SectionHeader index="02" label={t('applicationsLabel')} title={t('applicationsTitle')} />
        <Reveal as="ul" className="mt-14 grid gap-px border border-km-steel-600/60 bg-km-steel-600/60 sm:grid-cols-2 xl:grid-cols-3">
          {applications?.children.map((child) => (
            <li key={child.href} data-reveal className="bg-km-charcoal">
              <Link
                href={child.href}
                className="group flex h-full min-h-40 flex-col justify-between gap-8 p-7 transition-colors duration-(--duration-km) ease-(--ease-km) hover:bg-km-steel-800"
              >
                <h3 className="font-display text-h3 text-km-paper">
                  {child.kind === 'literal' ? child.label : tNav(child.key)}
                </h3>
                <span className="km-label flex items-center gap-2 text-km-steel-400 transition-colors group-hover:text-km-red-glow">
                  {t('viewApplication')}
                  <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3" fill="none">
                    <path d="M1 8h13M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </span>
              </Link>
            </li>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

/**
 * Part F.3 — the technology teaser.
 *
 * The scraping figures are the strongest thing KAO MING can say about itself
 * and are quoted verbatim from the company record: over 20 points per square
 * inch, a 50/50 split of load-bearing points and oil pockets, 40% contact ratio
 * in use.
 */
export async function TechnologyTeaser() {
  const t = await getTranslations('Home');
  const hall = factoryImages[0];

  return (
    <section className={`${SHELL} py-24 sm:py-32`}>
      <Reveal className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <div data-reveal>
          <SectionHeader index="03" label={t('technologyLabel')} title={t('technologyTitle')} />
          <p className="mt-8 max-w-[54ch] text-km-steel-400">{t('technologyBody')}</p>
          <dl className="mt-10 grid grid-cols-3 gap-6 border-t border-km-steel-600/60 pt-8">
            {(['ppi', 'split', 'contact'] as const).map((key) => (
              <div key={key}>
                <dt className="km-label text-km-steel-400">{t(`technologyStats.${key}.label`)}</dt>
                <dd className="mt-2 font-mono text-spec-xl text-km-paper">
                  {t(`technologyStats.${key}.value`)}
                </dd>
              </div>
            ))}
          </dl>
          <Action href="/company/factory" variant="text" className="mt-10">
            {t('insideKaoMing')}
          </Action>
        </div>

        {hall ? (
          <div data-reveal className="relative">
            <Image
              src={hall.src}
              alt={t('factoryAlt')}
              width={hall.width}
              height={hall.height}
              sizes="(min-width: 1024px) 46vw, 92vw"
              className="h-auto w-full"
            />
          </div>
        ) : null}
      </Reveal>
    </section>
  );
}

/**
 * Part F.3 — the numbers strip.
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
    <section className="border-y border-km-steel-600/60 bg-km-charcoal">
      <Reveal as="dl" className={`${SHELL} grid gap-x-10 gap-y-12 py-20 sm:grid-cols-2 xl:grid-cols-4`}>
        {stats.map((stat) => (
          <div key={stat.key} data-reveal className="border-t border-km-steel-600/60 pt-6">
            <dd className="font-mono text-spec-xl text-km-paper">
              <Counter value={stat.value} suffix={stat.suffix} />
            </dd>
            <dt className="km-label mt-3 text-km-steel-400">{t(`numbers.${stat.key}`)}</dt>
          </div>
        ))}
      </Reveal>
    </section>
  );
}

/** Part F.3 — the global network teaser. Counts only; the map is M7. */
export async function NetworkTeaser() {
  const t = await getTranslations('Home');

  return (
    <section className={`${SHELL} py-24 sm:py-32`}>
      <Reveal className="grid gap-12 lg:grid-cols-[1fr_auto] lg:items-end">
        <div data-reveal>
          <SectionHeader index="04" label={t('networkLabel')} title={t('networkTitle')} />
          <p className="mt-8 max-w-[54ch] text-km-steel-400">
            {t('networkBody', {
              agents: NETWORK.international,
              countries: NETWORK.countries,
            })}
          </p>
        </div>
        <ul data-reveal className="flex flex-wrap gap-x-8 gap-y-3">
          {NETWORK.regions.map((region) => (
            <li key={region} className="km-label text-km-steel-400">
              {region}
            </li>
          ))}
        </ul>
      </Reveal>
      <Action href="/company/network" variant="secondary" className="mt-10">
        {t('findRepresentative')}
      </Action>
    </section>
  );
}

/** Part F.3 — resource shortcuts. The three 2026 catalogues are what exists. */
export async function ResourceShortcuts() {
  const t = await getTranslations('Home');
  const tCatalogue = await getTranslations('Catalogue');

  return (
    <section className="border-t border-km-steel-600/60 bg-km-charcoal">
      <div className={`${SHELL} py-24 sm:py-32`}>
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
        <Reveal as="ul" className="mt-14 grid gap-6 md:grid-cols-3">
          {catalogueDocuments.map((document) => (
            <li key={document.id} data-reveal>
              <a
                href={document.path}
                target="_blank"
                rel="noopener"
                className="group flex h-full flex-col justify-between gap-10 border border-km-steel-600/60 bg-km-steel-800 p-7 transition-colors duration-(--duration-km) ease-(--ease-km) hover:border-km-steel-600"
              >
                <div>
                  <span className="km-label bg-km-red px-2 py-1 text-km-paper">
                    {document.fileType}
                  </span>
                  <h3 className="mt-6 font-display text-h3 text-km-paper">
                    {tCatalogue(document.id)}
                  </h3>
                </div>
                <span className="km-label flex items-center gap-2 text-km-steel-400 transition-colors group-hover:text-km-red-glow">
                  {t('openCatalogue')}
                  <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3" fill="none">
                    <path d="M1 8h13M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </span>
              </a>
            </li>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
