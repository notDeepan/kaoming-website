'use client';

import Fuse from 'fuse.js';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { track } from '@/lib/analytics';
import { Link } from '@/i18n/navigation';
import type { SearchDocument, SearchKind } from '@/lib/search';
import { useSmoothScroll } from '@/lib/motion/smooth-scroll';

/**
 * Part M.5 — global search.
 *
 * Fuse runs entirely in the browser over an index the server built, so a query
 * costs no round trip and works the moment the overlay opens. The index is a few
 * hundred short records; a server search arrives with the CMS.
 *
 * The overlay is the header's search control finally doing something — it was
 * rendered disabled through M0 and M1 because there was nothing to search.
 */

const GROUPS: { kind: SearchKind; label: string }[] = [
  { kind: 'series', label: 'groupSeries' },
  { kind: 'model', label: 'groupModels' },
  { kind: 'document', label: 'groupDocuments' },
  { kind: 'page', label: 'groupPages' },
];

export function SearchOverlay({ index }: { index: SearchDocument[] }) {
  const t = useTranslations('Search');
  const { stop, start } = useSmoothScroll();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tracked = useRef<string>('');

  const fuse = useMemo(
    () =>
      new Fuse(index, {
        keys: [
          { name: 'title', weight: 3 },
          { name: 'subtitle', weight: 1 },
          { name: 'synonyms', weight: 2 },
        ],
        threshold: 0.34,
        ignoreLocation: true,
        minMatchCharLength: 2,
      }),
    [index],
  );

  const results = useMemo(() => {
    if (query.trim().length < 2) return [];
    return fuse.search(query.trim(), { limit: 24 }).map((hit) => hit.item);
  }, [fuse, query]);

  // One event per settled query, not one per keystroke.
  useEffect(() => {
    if (query.trim().length < 2) return;
    const timer = setTimeout(() => {
      if (tracked.current === query) return;
      tracked.current = query;
      track({ name: 'search_performed', query: query.trim(), results: results.length });
    }, 700);
    return () => clearTimeout(timer);
  }, [query, results.length]);

  useEffect(() => {
    if (!open) {
      start();
      return;
    }

    stop();
    inputRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, stop, start]);

  // Cmd/Ctrl-K from anywhere, the shortcut every buyer already knows.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={t('open')}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="hidden min-h-11 min-w-11 items-center justify-center text-km-steel-400 transition-colors duration-(--duration-km) ease-(--ease-km) hover:text-km-offwhite sm:flex"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" className="size-4.5" fill="none">
          <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
          <path d="M13.5 13.5L18 18" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>

      <div
        ref={panelRef}
        hidden={!open}
        role="dialog"
        aria-modal="true"
        aria-label={t('title')}
        data-lenis-prevent
        className="fixed inset-0 z-150 overflow-y-auto bg-km-black/95 backdrop-blur-sm"
      >
        <div className="mx-auto max-w-[52rem] px-5 pt-24 pb-16 sm:px-6">
          <div className="flex items-center gap-4 border-b border-km-steel-600 pb-4">
            <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5 shrink-0 text-km-steel-400" fill="none">
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
              <path d="M13.5 13.5L18 18" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('placeholder')}
              aria-label={t('title')}
              className="min-h-11 w-full bg-transparent text-h3 text-km-paper placeholder:text-km-steel-600 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                triggerRef.current?.focus();
              }}
              aria-label={t('close')}
              className="km-label flex size-11 items-center justify-center text-km-steel-400 hover:text-km-offwhite"
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5" fill="none">
                <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          </div>

          <p aria-live="polite" className="km-label mt-4 text-km-steel-400">
            {query.trim().length < 2
              ? t('hint')
              : results.length
                ? t('resultCount', { count: results.length })
                : t('noResults', { query: query.trim() })}
          </p>

          <div className="mt-8 flex flex-col gap-10">
            {GROUPS.map((group) => {
              const items = results.filter((item) => item.kind === group.kind);
              if (!items.length) return null;

              return (
                <section key={group.kind}>
                  <h2 className="km-label border-b border-km-steel-600/60 pb-3 text-km-red-glow">
                    {t(group.label)}
                  </h2>
                  <ul>
                    {items.map((item) =>
                      item.kind === 'document' ? (
                        <li key={item.id}>
                          <a
                            href={item.href}
                            target="_blank"
                            rel="noopener"
                            onClick={() => setOpen(false)}
                            className="flex flex-wrap items-baseline gap-x-4 border-b border-km-steel-600/30 py-3 hover:bg-km-steel-800"
                          >
                            <span className="font-display text-km-paper">{item.title}</span>
                            <span className="text-small text-km-steel-400">{item.subtitle}</span>
                          </a>
                        </li>
                      ) : (
                        <li key={item.id}>
                          <Link
                            href={item.href}
                            onClick={() => setOpen(false)}
                            className="flex flex-wrap items-baseline gap-x-4 border-b border-km-steel-600/30 py-3 hover:bg-km-steel-800"
                          >
                            <span className="font-display text-km-paper">{item.title}</span>
                            <span className="text-small text-km-steel-400">{item.subtitle}</span>
                          </Link>
                        </li>
                      ),
                    )}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
