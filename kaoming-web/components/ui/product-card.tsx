import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Series } from '@/lib/machines';
import { displayImage } from '@/lib/images';
import { DimensionRule, MachinePlate } from './machine-plate';

/**
 * Part F.2 — the miniature showroom.
 *
 * **A rule and a void, not a box.** It was a bordered, filled panel with even
 * padding, and four of them in a row is the single most templated thing a page
 * can do — Part B.2's own avoid-list says "too many boxes". A machine on the
 * dark field, with a hairline above its name and nothing else drawn, reads far
 * more engineered than the same machine inside a card.
 *
 * The hairline is the interaction: it is dim at rest, and on hover it lights to
 * the accent and the machine lifts. Nothing scales, nothing bounces (Part D).
 *
 * Every card is the same size. The flagship carried a `lead` variant at roughly
 * double scale for a while; it left a screen-height void beside its shorter
 * neighbours and made four categories unreadable against each other. The
 * FLAGSHIP label carries that fact at no cost to the grid.
 *
 * `headline` is the one verified figure that distinguishes this series at a
 * glance. Where the catalogue page has not been transcribed the card says how
 * many models the series has and nothing more — an empty dimension rule would
 * imply a number nobody has read yet.
 */
export async function ProductCard({
  series,
  headline,
  priority = false,
  /**
   * How wide this card's slot is, per breakpoint.
   *
   * It has to come from the page, because only the page knows its grid. The
   * value was hardcoded here for the homepage's four columns, and the products
   * index and the category pages run three — so on those two the browser was
   * told the slot was 24vw when it was 33vw, and on a retina screen served an
   * 828px image into a 982px slot. That is 0.84x on the machine photography,
   * which is the one thing this card exists to show.
   */
  sizes = '(min-width: 1280px) 24vw, (min-width: 640px) 46vw, 90vw',
}: {
  series: Series;
  headline?: { label: string; value: string } | null;
  priority?: boolean;
  sizes?: string;
}) {
  const t = await getTranslations('Products');
  const image = series.images[0];

  return (
    <article data-reveal className="group relative">
      <Link
        href={`/products/${series.categorySlug}/${series.slug}`}
        className="block"
      >
        {/* The machine first. On a showroom floor you see the machine before
            you read the plate, and the page should work the same way. */}
        {image ? (
          <MachinePlate
            image={displayImage(image)}
            alt={`${series.name} — ${image.model}`}
            glow="sm"
            priority={priority}
            transitionName={`machine-${series.slug}`}
            sizes={sizes}
            className="transition-transform duration-(--duration-km-slow) ease-(--ease-km) group-hover:-translate-y-2"
          />
        ) : (
          <div
            aria-hidden="true"
            className="flex aspect-[3/2] items-center justify-center border border-dashed border-km-steel-600/40"
          >
            <span className="km-label text-km-steel-400">{t('noImage')}</span>
          </div>
        )}

        {/* Compression: the rule, the name and the type belong to each other and
            sit almost on top of one another. The release is above, between this
            machine and the last one. */}
        <span
          aria-hidden="true"
          className="mt-8 block h-px w-full bg-km-steel-600/60 transition-colors duration-(--duration-km) ease-(--ease-km) group-hover:bg-km-red"
        />

        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-h3 text-km-paper">{series.name}</h3>
            <p className="mt-1 text-small text-km-steel-400">{series.type}</p>
          </div>
          {series.flagship ? (
            <span className="km-label shrink-0 text-km-red-glow">{t('flagship')}</span>
          ) : null}
        </div>

        <div className="mt-5">
          {headline ? (
            <DimensionRule label={headline.label} value={headline.value} />
          ) : (
            <p className="km-label text-km-steel-400">
              {t('modelCount', { count: series.models.length })}
            </p>
          )}
          <p className="km-label mt-4 flex items-center gap-2 text-km-offwhite transition-colors group-hover:text-km-red-glow">
            {t('explore')}
            <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3" fill="none">
              <path d="M1 8h13M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </p>
        </div>
      </Link>
    </article>
  );
}
