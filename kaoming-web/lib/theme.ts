/**
 * Light and dark, and which one the site opens in.
 *
 * KAO MING's own review of the first build was that it read too dark, so light
 * is the default and dark is the option — not the other way round. The default
 * is rendered into the HTML by the server (`app/[locale]/layout.tsx` stamps
 * `data-theme` on <html>), which is what makes the light field survive a visitor
 * with JavaScript off and what removes the flash of the wrong theme entirely:
 * there is no moment at which the document has no theme.
 *
 * The stored value is only ever a deviation from that default. Nothing here
 * reads `prefers-color-scheme`: a B2B catalogue is a document, and a buyer who
 * has their OS in dark mode has not thereby asked for KAO MING's specification
 * tables in dark mode. They can ask, with the switch, and then it is remembered.
 */

export type Theme = 'light' | 'dark';

export const DEFAULT_THEME: Theme = 'light';

export const THEME_STORAGE_KEY = 'km-theme';

/** Marks the frame in which the attribute changes, so nothing tweens across it. */
export const THEME_SWITCHING_ATTRIBUTE = 'data-theme-switching';

export function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}

/**
 * The blocking script, rendered as the FIRST CHILD OF <body> — not in <head>.
 *
 * That placement is deliberate and load-bearing: a hand-written <head> in this
 * app closes before Next has streamed the page's metadata into it, which pushes
 * <meta name="robots"> out and silently voids `noindex` on /rfq and /compare.
 * `app/[locale]/layout.tsx` carries the same warning over the font preloads.
 * A synchronous script at the top of <body> still runs before the rest of the
 * body is parsed, which is all this needs. Do not "tidy" it into <head>.
 *
 * Kept as a string, and deliberately tiny, because it runs before first paint on
 * every page. It only ever *corrects* the server's attribute, so the common case
 * — a visitor who has never touched the switch — costs one localStorage read and
 * no DOM write at all.
 *
 * Wrapped in try/catch: `localStorage` throws outright in a sandboxed iframe and
 * under some privacy settings, and a theme preference is not worth a blank page.
 */
export function themeInitScript(): string {
  return [
    '(function(){try{',
    `var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});`,
    "if(t==='dark'||t==='light'){",
    "var r=document.documentElement;",
    "if(r.getAttribute('data-theme')!==t)r.setAttribute('data-theme',t);",
    '}}catch(e){}})()',
  ].join('');
}
