'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import {
  DEFAULT_THEME,
  isTheme,
  THEME_STORAGE_KEY,
  THEME_SWITCHING_ATTRIBUTE,
  type Theme,
} from '@/lib/theme';

/**
 * The light / dark switch (Part E.2, beside the language switcher).
 *
 * Reads the live attribute rather than holding its own idea of the theme.
 * `<html data-theme>` is set by the server and may already have been corrected
 * by the blocking script in <head> before React ever runs, so the DOM is the
 * only honest source; a `useState(DEFAULT_THEME)` here would render the wrong
 * icon for one frame on every page load for anyone who has chosen dark.
 *
 * The read happens in an effect, not during render, for the same reason the
 * button starts out labelled from `DEFAULT_THEME`: reading the DOM during a
 * server render is impossible and during hydration is a mismatch.
 */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const t = useTranslations('Header');
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    const current = document.documentElement.getAttribute('data-theme');
    if (isTheme(current)) setTheme(current);
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    const root = document.documentElement;

    // Every hairline, label and panel on the page carries a colour transition.
    // Flipping the palette with those live turns the switch into a 250 ms
    // cross-fade of the entire document, which on a slow machine is exactly the
    // kind of jank Part O exists to prevent. Suppress for one frame.
    root.setAttribute(THEME_SWITCHING_ATTRIBUTE, '');
    root.setAttribute('data-theme', next);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => root.removeAttribute(THEME_SWITCHING_ATTRIBUTE));
    });

    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private-mode storage refusal. The theme still changes for this page
      // load; it simply is not remembered, which is the right failure.
    }

    setTheme(next);
  };

  const dark = theme === 'dark';

  return (
    <button
      type="button"
      data-theme-toggle
      onClick={toggle}
      // A switch, not a checkbox: two named states, and the pressed state is
      // what a screen reader announces rather than the word "checked".
      aria-pressed={dark}
      className={`km-label flex min-h-11 items-center gap-2 px-2 text-km-steel-400 transition-colors duration-(--duration-km) ease-(--ease-km) hover:text-km-offwhite ${className}`}
    >
      {/* WCAG 2.5.3 again — the visible word is part of the accessible name. */}
      <span className="sr-only">{t('theme.action')}: </span>
      <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4" fill="none">
        {dark ? (
          // Crescent — the dark theme is the one currently on.
          <path
            d="M15.5 12.6A6.4 6.4 0 0 1 7.4 4.5a6.5 6.5 0 1 0 8.1 8.1Z"
            fill="currentColor"
          />
        ) : (
          <>
            <circle cx="10" cy="10" r="3.4" fill="currentColor" />
            <g stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
              <path d="M10 1.8v2.1M10 16.1v2.1M1.8 10h2.1M16.1 10h2.1" />
              <path d="M4.2 4.2l1.5 1.5M14.3 14.3l1.5 1.5M15.8 4.2l-1.5 1.5M5.7 14.3l-1.5 1.5" />
            </g>
          </>
        )}
      </svg>
      {dark ? t('theme.dark') : t('theme.light')}
    </button>
  );
}
