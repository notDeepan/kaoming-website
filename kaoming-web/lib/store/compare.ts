'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * The compare tray (Part M.2): at most three machines, kept in localStorage so a
 * buyer can gather candidates across a session and still have them after a
 * reload.
 *
 * The key carries a version. When the stored shape changes, the version changes
 * with it and old entries are dropped rather than parsed into something the app
 * no longer understands.
 */

export const COMPARE_KEY = 'km.compare.v1';
export const COMPARE_LIMIT = 3;

export type CompareEntry = { slug: string; name: string; category: string };

function read(): CompareEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(COMPARE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (entry): entry is CompareEntry =>
          typeof entry === 'object' &&
          entry !== null &&
          typeof (entry as CompareEntry).slug === 'string' &&
          typeof (entry as CompareEntry).name === 'string',
      )
      .slice(0, COMPARE_LIMIT);
  } catch {
    return [];
  }
}

function write(entries: CompareEntry[]) {
  try {
    window.localStorage.setItem(COMPARE_KEY, JSON.stringify(entries));
    // Same-tab listeners: the storage event only fires in *other* tabs.
    window.dispatchEvent(new CustomEvent(COMPARE_KEY));
  } catch {
    // A full or disabled storage is not worth breaking the page over.
  }
}

export function useCompare() {
  // Starts empty so the server render and the first client render agree; the
  // effect fills it in before anything is interactive.
  const [entries, setEntries] = useState<CompareEntry[]>([]);

  useEffect(() => {
    const sync = () => setEntries(read());
    sync();
    window.addEventListener(COMPARE_KEY, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(COMPARE_KEY, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const toggle = useCallback((entry: CompareEntry) => {
    const current = read();
    const exists = current.some((item) => item.slug === entry.slug);
    const next = exists
      ? current.filter((item) => item.slug !== entry.slug)
      : [...current, entry].slice(0, COMPARE_LIMIT);
    write(next);
    setEntries(next);
    return !exists;
  }, []);

  const remove = useCallback((slug: string) => {
    const next = read().filter((item) => item.slug !== slug);
    write(next);
    setEntries(next);
  }, []);

  const clear = useCallback(() => {
    write([]);
    setEntries([]);
  }, []);

  return { entries, toggle, remove, clear, full: entries.length >= COMPARE_LIMIT };
}
