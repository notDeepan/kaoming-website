'use client';

import { useEffect } from 'react';

/**
 * Attaches the Noto Sans TC `@font-face` sheet after hydration instead of
 * linking it in the head.
 *
 * The sheet is 105 unicode-range declarations (~34 KB) and, since the font
 * stacks prefer the platform CJK face, almost no visitor ever exercises it —
 * anyone reading Traditional Chinese is on a device that ships a Traditional
 * Chinese font. Blocking first paint on it costs every zh-tw visitor real
 * milliseconds to insure a case that essentially does not occur. Loading it
 * late means a device with no CJK font at all shows fallback boxes for a moment
 * after hydration, which is the right way round.
 */
export function CjkFallbackFaces({ href }: { href: string }) {
  useEffect(() => {
    if (document.querySelector(`link[data-cjk-faces][href="${href}"]`)) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset.cjkFaces = '';
    document.head.appendChild(link);
  }, [href]);

  return null;
}
