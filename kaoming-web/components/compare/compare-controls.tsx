'use client';

import { useTranslations } from 'next-intl';
import { track } from '@/lib/analytics';
import { Link } from '@/i18n/navigation';
import { useCompare, type CompareEntry } from '@/lib/store/compare';

/**
 * Part M.2 — the compare tray.
 *
 * The tray holds slugs, not machine data, and the comparison itself is a server
 * route keyed by the URL (`/compare?m=a,b,c`). That keeps the spec tables off
 * the client bundle and makes a comparison something a buyer can send to a
 * colleague, which is exactly what happens when three people choose a machine.
 */

/** Sits on a product page. Adds or removes that series from the tray. */
export function CompareToggle({ entry }: { entry: CompareEntry }) {
  const t = useTranslations('Compare');
  const { entries, toggle, full } = useCompare();

  const active = entries.some((item) => item.slug === entry.slug);
  const blocked = full && !active;

  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={blocked}
      title={blocked ? t('full') : undefined}
      onClick={() => {
        const added = toggle(entry);
        if (added) track({ name: 'compare_machine_added', series: entry.slug });
      }}
      className={`km-label inline-flex min-h-11 items-center gap-2.5 border px-5 py-3 transition-colors duration-(--duration-km) ease-(--ease-km) disabled:opacity-50 ${
        active
          ? 'border-km-blue text-km-blue'
          : 'border-km-steel-600 text-km-offwhite hover:border-km-offwhite'
      }`}
    >
      <span
        aria-hidden="true"
        className={`inline-block size-2 ${active ? 'bg-km-blue' : 'bg-km-steel-600'}`}
      />
      {active ? t('added') : t('add')}
    </button>
  );
}

/** Fixed to the bottom of the viewport whenever the tray has anything in it. */
export function CompareTray() {
  const t = useTranslations('Compare');
  const { entries, remove, clear } = useCompare();

  if (!entries.length) return null;

  const href = `/compare?m=${entries.map((entry) => entry.slug).join(',')}`;

  return (
    <aside
      aria-label={t('tray')}
      data-compare-tray
      className="fixed inset-x-0 bottom-0 z-110 border-t border-km-steel-600 bg-km-charcoal/95 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3 sm:px-6 xl:px-10">
        <p className="km-label text-km-steel-400">{t('tray')}</p>

        <ul className="flex flex-wrap items-center gap-2">
          {entries.map((entry) => (
            <li key={entry.slug}>
              <span className="km-label inline-flex items-center gap-2 border border-km-steel-600 py-1 ps-3 pe-1 text-km-offwhite">
                {entry.name}
                <button
                  type="button"
                  onClick={() => remove(entry.slug)}
                  aria-label={`${t('remove')}: ${entry.name}`}
                  className="flex size-8 items-center justify-center text-km-steel-400 hover:text-km-red-glow"
                >
                  <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3" fill="none">
                    <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </button>
              </span>
            </li>
          ))}
        </ul>

        <div className="ms-auto flex items-center gap-4">
          <button
            type="button"
            onClick={clear}
            className="km-label min-h-11 text-km-steel-400 hover:text-km-offwhite"
          >
            {t('clear')}
          </button>
          <Link
            href={href}
            onClick={() => track({ name: 'compare_created', machines: entries.map((e) => e.slug) })}
            className="km-label inline-flex min-h-11 items-center gap-2.5 border border-km-red bg-km-red px-5 py-3 text-km-on-brand transition-colors duration-(--duration-km) ease-(--ease-km) hover:border-km-red-glow hover:bg-transparent hover:text-km-red-glow"
          >
            {t('open')} ({entries.length})
          </Link>
        </div>
      </div>
    </aside>
  );
}
