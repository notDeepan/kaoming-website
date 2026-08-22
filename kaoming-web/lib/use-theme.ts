'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_THEME, isTheme, type Theme } from './theme';

/**
 * The live theme, for the handful of places CSS cannot reach.
 *
 * Almost nothing needs this. The palette flips through CSS custom properties,
 * so every DOM surface on the site re-colours itself with no React involved.
 * What cannot: the WebGL scene, whose clear colour, floor and grade are numbers
 * inside a renderer rather than declarations in a stylesheet.
 *
 * Observes the attribute instead of subscribing to the toggle, because the
 * toggle is not the only writer — the blocking script in the layout sets it
 * before React exists, and a second tab can change the stored value. The
 * attribute is the one thing all of them agree on.
 */
export function useTheme(): Theme {
  const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    const root = document.documentElement;

    const read = () => {
      const value = root.getAttribute('data-theme');
      setTheme(isTheme(value) ? value : DEFAULT_THEME);
    };

    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  return theme;
}
