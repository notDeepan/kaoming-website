import localFont from 'next/font/local';

/**
 * Typography — Master spec Part B.3.
 *
 * Three voices: display (Space Grotesk), workhorse (Inter), technical
 * (IBM Plex Mono), plus Noto Sans TC for Traditional Chinese. All self-hosted
 * woff2, latin subset, `font-display: swap`.
 *
 * WHY THE PLATFORM CJK FACE COMES FIRST IN EVERY STACK
 * Fontsource splits Noto Sans TC into 105 unicode-range subsets of ~75 KB. A
 * page of Traditional Chinese touches roughly a dozen of them, so serving it as
 * the primary face costs ~900 KB and pushed /zh-tw to LCP 4.3 s on throttled
 * mobile — well past the 2.5 s in Part O, which says the visual degrades before
 * the budget does. Every target platform already ships an excellent Traditional
 * Chinese face (PingFang TC on Apple, Noto Sans CJK TC on Android — the same
 * typeface family, Microsoft JhengHei on Windows), so the self-hosted font stays
 * as the per-glyph safety net: a device missing a glyph downloads only the
 * subset carrying it.
 *
 * To make Noto Sans TC primary again, subset it at build time to the glyphs the
 * site's Chinese copy actually uses (harfbuzz via `subset-font`, or pyftsubset)
 * and reorder these stacks. Sensible work for the M8 performance pass.
 *
 * Space Grotesk is the spec's sanctioned free stand-in for PP Neue Machina,
 * which is a paid licence with none on file (Appendix 2, due M0).
 *
 * WHY THE DISPLAY AND BODY FACES ARE NOT HERE
 * Part O requires the display font to be preloaded, and Next 15.5 does not emit
 * font preload links for next/font — its font manifest comes out empty whether
 * the font is declared in a shared module or directly in the layout. So the
 * display face is declared by hand in app/globals.css against a stable,
 * version-pinned URL under /public, which lets the layout preload it with a
 * literal href. Its metric-matched fallback overrides in that file are the ones
 * next/font itself computed for this exact file against Arial.
 *
 * Inter needs the same treatment for a different reason: as the body face it is
 * what re-flows a paragraph when it swaps in late, and that re-flow was spending
 * the whole CLS budget on its own. Preloading it is the fix, so it is declared
 * by hand too. Plex Mono stays on next/font — it sets short labels and figures
 * that cannot change a line count, so a late swap costs nothing.
 *
 * next/font evaluates these options at build time and accepts only literals —
 * no shared constants, no spreads. Hence the repetition.
 */

export const fontMono = localFont({
  src: [
    { path: './IBMPlexMono-400-latin.woff2', weight: '400', style: 'normal' },
    { path: './IBMPlexMono-500-latin.woff2', weight: '500', style: 'normal' },
    { path: './IBMPlexMono-600-latin.woff2', weight: '600', style: 'normal' },
  ],
  display: 'swap',
  preload: false,
  variable: '--font-mono-face',
  /**
   * Latin only, and deliberately.
   *
   * The CJK faces used to lead this list, which quietly defeated the metric
   * matching: font fallback is per glyph, and `Microsoft JhengHei` — installed
   * on every Windows machine — carries Latin glyphs too, so it answered for the
   * Latin text before the adjusted face ever got the chance. The CJK faces now
   * sit after this list in `--font-mono` (globals.css), where they still catch
   * the Chinese glyphs Plex Mono does not have and no longer intercept the
   * Latin ones it does.
   */
  fallback: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
  /**
   * Metric-matched fallback, on.
   *
   * It was off, on the reasoning that Plex Mono "sets short labels and figures
   * that cannot change a line count, so a late swap costs nothing". That held
   * on a laptop and was false on a phone: at 412px the product page's mono
   * breadcrumb wraps to a second line when the real face swaps in, pushing the
   * whole hero grid down. Measured at 0.148 — the entire CLS the site was
   * carrying, in one shift at 653ms, from one line of type.
   *
   * With the adjustment on, the fallback occupies the same space and the swap
   * moves nothing.
   */
  adjustFontFallback: 'Arial',
});

export const fontVariables = fontMono.variable;

/** Preloaded in the root layout. Versioned so the immutable cache header is safe. */
export const DISPLAY_FONT_URL = '/fonts/display/space-grotesk-variable-latin-v5.3.0.woff2';
export const BODY_FONT_URL = '/fonts/body/inter-variable-latin-v5.3.0.woff2';

/** Linked by the layout on Traditional Chinese routes only. */
export const CJK_FACES_URL = '/fonts/noto-sans-tc-v5.3.0/faces.css';
