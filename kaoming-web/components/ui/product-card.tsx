import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { Series } from '@/lib/machines';
import { DimensionRule, MachinePlate } from './machine-plate';

/**
 * Part F.2 — the miniature showroom. Dark steel field, the machine lit on it,
 * the catalogue name in display type, and the series' principal dimension drawn
 * beneath. Lifts on hover; never bounces (Part D).
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
}: {
  series: Series;
  headline?: { label: string; value: string } | null;
  priority?: boolean;
}) {
  const t = await getTranslations('Products');
  const image = series.images[0];

  return (
    <article data-reveal className="group relative">
      <Link
        href={`/products/${series.categorySlug}/${series.slug}`}
        className="block h-full border border-km-steel-600/60 bg-km-steel-800 p-6 transition-[transform,border-color,background-color] duration-(--duration-km-slow) ease-(--ease-km) hover:-translate-y-1.5 hover:border-km-steel-600 hover:bg-km-charcoal sm:p-8"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-display text-h3 text-km-paper">{series.name}</h3>
            <p className="mt-1.5 text-small text-km-offwhite">{series.type}</p>
          </div>
          {series.flagship ? (
            <span className="km-label shrink-0 bg-km-red px-2.5 py-1 text-km-paper">
              {t('flagship')}
            </span>
          ) : null}
        </div>

        {image ? (
          <MachinePlate
            image={image.cut}
            alt={`${series.name} — ${image.model}`}
            glow="sm"
            priority={priority}
            transitionName={`machine-${series.slug}`}
            sizes="(min-width: 1280px) 34vw, (min-width: 768px) 46vw, 90vw"
            className="mt-8"
          />
        ) : (
          <div
            aria-hidden="true"
            className="mt-8 flex aspect-[3/2] items-center justify-center border border-dashed border-km-steel-600/60"
          >
            <span className="km-label text-km-steel-400">{t('noImage')}</span>
          </div>
        )}

        <div className="mt-8 border-t border-km-steel-600/50 pt-5">
          {headline ? (
            <DimensionRule label={headline.label} value={headline.value} />
          ) : (
            <p className="km-label text-km-offwhite">
              {t('modelCount', { count: series.models.length })}
            </p>
          )}
          <p className="km-label mt-5 flex items-center gap-2 text-km-offwhite transition-colors group-hover:text-km-red-glow">
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
