'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';
import { track } from '@/lib/analytics';
import { Link, usePathname } from '@/i18n/navigation';
import { localeMeta, routing, type AppLocale } from '@/i18n/routing';

/**
 * Part E.2 — "ENGLISH ▾" opening the locale list. Only activated locales are
 * listed; ja / de / ko appear when Phase 5 turns them on in i18n/routing.
 *
 * The switcher keeps the visitor on the same page in the new locale, which is
 * what `usePathname` from next-intl's navigation returns (locale-stripped).
 */
export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const t = useTranslations('Header');
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className="km-label flex min-h-11 items-center gap-1.5 px-2 text-km-steel-400 transition-colors duration-(--duration-km) ease-(--ease-km) hover:text-km-offwhite"
      >
        {/* WCAG 2.5.3 Label in Name: the accessible name has to contain the
            visible text, so the purpose is prefixed rather than replacing it
            with an aria-label. */}
        <span className="sr-only">{t('changeLanguage')}: </span>
        {localeMeta[locale].label}
        <svg
          aria-hidden="true"
          viewBox="0 0 10 6"
          className={`size-2.5 transition-transform duration-(--duration-km) ease-(--ease-km) ${open ? 'rotate-180' : ''}`}
          fill="none"
        >
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </button>

      <ul
        id={menuId}
        hidden={!open}
        className="absolute end-0 top-full z-10 min-w-40 border border-km-steel-600 bg-km-charcoal py-1"
      >
        {routing.locales.map((code) => {
          const isCurrent = code === locale;
          return (
            <li key={code}>
              <Link
                href={pathname}
                locale={code}
                hrefLang={localeMeta[code].hreflang}
                lang={localeMeta[code].htmlLang}
                aria-current={isCurrent ? 'true' : undefined}
                onClick={() => {
                  setOpen(false);
                  // Part Q: language usage is one of the three INTERNATIONAL
                  // dashboard metrics, and this is the only place it happens.
                  if (!isCurrent) track({ name: 'language_switched', to: code });
                }}
                className={`block px-4 py-2.5 text-small transition-colors duration-(--duration-km) ease-(--ease-km) hover:bg-km-steel-800 ${
                  isCurrent ? 'text-km-red-glow' : 'text-km-offwhite'
                }`}
              >
                {localeMeta[code].label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
