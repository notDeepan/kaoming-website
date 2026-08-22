import Image from 'next/image';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { NewsItem } from '@/lib/news';

/**
 * One entry in the NEWS index.
 *
 * The card leads with the date because that is what a visitor checking whether a
 * company is still moving actually reads, and because half of these entries are
 * exhibitions, where the date IS the news. Where the source stated only a year,
 * the year is all that is printed — a fabricated "1 January" in a `<time>` would
 * be a false claim in a machine-readable field.
 *
 * `<time dateTime>` still carries the full ISO value for the same reason: it is
 * the sort key and the format search engines read, and 2023-01-01 with a visible
 * "2023" is honest in a way a visible "1 January 2023" is not.
 */
export async function NewsCard({ item, locale }: { item: NewsItem; locale: string }) {
  const t = await getTranslations('News');

  const stamp = item.dateIsApproximate
    ? String(item.year)
    : new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric' }).format(
        new Date(item.date),
      );

  return (
    <article
      data-news-item
      data-kind={item.kind}
      className="group relative flex h-full flex-col border border-km-steel-600/60 bg-km-steel-800 transition-colors duration-(--duration-km) ease-(--ease-km) hover:border-km-steel-600"
    >
      {item.image ? (
        <div className="relative aspect-16/9 overflow-hidden border-b border-km-steel-600/60">
          <Image
            src={item.image}
            alt=""
            fill
            sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 100vw"
            className="object-cover transition-transform duration-(--duration-km-slow) ease-(--ease-km) group-hover:scale-105"
          />
        </div>
      ) : null}

      <div className="flex flex-1 flex-col p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="km-label bg-km-red px-2 py-1 text-km-on-brand">
            {t(`kind.${item.kind}`)}
          </span>
          <time dateTime={item.date} className="font-mono text-spec text-km-steel-400">
            {stamp}
          </time>
        </div>

        <h3 className="mt-6 font-display text-h3 text-balance text-km-paper">
          <Link
            href={`/news/${item.slug}`}
            /* The whole card is the target, but only the heading is the link —
               so the accessible name is the headline and not a paragraph of
               body copy read out as one string. */
            className="after:absolute after:inset-0 focus-visible:outline-offset-4"
          >
            {item.title}
          </Link>
        </h3>

        {item.booth ? (
          <p className="mt-3 font-mono text-spec text-km-offwhite">{item.booth}</p>
        ) : null}

        {item.body ? (
          <p className="mt-4 line-clamp-4 text-small text-km-offwhite">{item.body}</p>
        ) : null}

        {item.series ? (
          <p className="km-label mt-auto pt-8 text-km-steel-400">{item.series.name}</p>
        ) : null}
      </div>
    </article>
  );
}
