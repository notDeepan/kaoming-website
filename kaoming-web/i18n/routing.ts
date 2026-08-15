import { defineRouting } from 'next-intl/routing';

/**
 * Part R — path-prefix routing.
 * Phase 1 ships `/en` and `/zh-tw`. Phase 5 adds ja, de, ko; Phase 6 more.
 * Adding a locale = one entry here + one `messages/<locale>.json`.
 */
export const routing = defineRouting({
  locales: ['en', 'zh-tw'],
  defaultLocale: 'en',
  localePrefix: 'always',
});

export type AppLocale = (typeof routing.locales)[number];

/**
 * The URL segment is lowercase (`/zh-tw`), but `lang` and `hreflang` must carry
 * the real BCP 47 tag. Keeping the two apart here stops `lang="zh-tw"` — which
 * tells a screen reader nothing about script — from leaking into the markup.
 */
export const localeMeta: Record<
  AppLocale,
  { htmlLang: string; hreflang: string; label: string; shortLabel: string }
> = {
  en: {
    htmlLang: 'en',
    hreflang: 'en',
    label: 'English',
    shortLabel: 'EN',
  },
  'zh-tw': {
    htmlLang: 'zh-Hant-TW',
    hreflang: 'zh-Hant-TW',
    label: '繁體中文',
    shortLabel: '繁中',
  },
};

/** Locales specified in Part R but not yet activated. Listed so the switcher's
 *  future shape is visible in code review, never rendered. */
export const plannedLocales = ['ja', 'de', 'ko'] as const;
