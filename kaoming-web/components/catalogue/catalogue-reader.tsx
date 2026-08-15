'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { track } from '@/lib/analytics';
import { Link } from '@/i18n/navigation';
import type { Catalogue } from '@/lib/catalogue';
import { useSmoothScroll } from '@/lib/motion/smooth-scroll';

/**
 * The catalogue reader (Part I.3–I.6).
 *
 * **Immersive** turns pages with a CSS 3D fold — two half-page planes and a
 * highlight gradient, which is the spec's own suggestion and reaches sufficient
 * realism at a fraction of WebGL's cost. **Standard** is a paginated viewer with
 * thumbnails, and is the default on a phone and under reduced motion (Part I.4).
 *
 * Spreads are pre-rasterized WebP. Only the current page and its two neighbours
 * are given to the browser eagerly; everything else is lazy. 48 spreads at full
 * resolution would be 7 MB of images on a page that shows one at a time.
 *
 * Search is over the build-time text index. Two of the three catalogues are
 * placed artwork with no text layer at all, so the control says so plainly for
 * those rather than returning "no results" for every query — a search box that
 * silently never matches is worse than one that explains itself.
 */

type Mode = 'immersive' | 'standard';

export function CatalogueReader({ catalogue, title }: { catalogue: Catalogue; title: string }) {
  const t = useTranslations('Catalogue');
  const { reducedMotion } = useSmoothScroll();

  const [mode, setMode] = useState<Mode>('standard');
  const [page, setPage] = useState(1);
  const [turning, setTurning] = useState<'next' | 'previous' | null>(null);
  const [query, setQuery] = useState('');
  const [tocOpen, setTocOpen] = useState(false);
  const stage = useRef<HTMLDivElement>(null);

  const total = catalogue.pageCount;
  const spread = catalogue.spreads[page - 1];

  // Immersive is the desktop default (Part I.4), but never under reduced
  // motion and never on a narrow screen, where the fold has nowhere to fold.
  useEffect(() => {
    if (reducedMotion) return;
    if (window.matchMedia('(min-width: 1024px)').matches) setMode('immersive');
  }, [reducedMotion]);

  const go = useCallback(
    (next: number) => {
      const clamped = Math.min(Math.max(next, 1), total);
      if (clamped === page) return;
      setTurning(clamped > page ? 'next' : 'previous');
      setPage(clamped);
      track({ name: 'catalogue_page_viewed', doc_id: catalogue.id, page: clamped });
    },
    [catalogue.id, page, total],
  );

  useEffect(() => {
    if (!turning) return;
    const timer = setTimeout(() => setTurning(null), 520);
    return () => clearTimeout(timer);
  }, [turning, page]);

  // Keyboard is the primary control for a reader, not an afterthought.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      if (event.key === 'ArrowRight' || event.key === 'PageDown') go(page + 1);
      if (event.key === 'ArrowLeft' || event.key === 'PageUp') go(page - 1);
      if (event.key === 'Home') go(1);
      if (event.key === 'End') go(total);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, page, total]);

  /**
   * Scroll-driven page turning in immersive mode (Part I.3). The wheel is
   * intercepted only while the reader is the thing under the pointer and the
   * page is at rest, so the surrounding document still scrolls normally.
   */
  useEffect(() => {
    if (mode !== 'immersive') return;
    const element = stage.current;
    if (!element) return;

    let cooling = false;
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) < 12 || cooling) return;
      event.preventDefault();
      cooling = true;
      setTimeout(() => {
        cooling = false;
      }, 420);
      go(page + (event.deltaY > 0 ? 1 : -1));
    };

    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [mode, go, page]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length < 2) return [];
    return catalogue.spreads.filter((entry) => entry.text.toLowerCase().includes(needle));
  }, [catalogue.spreads, query]);

  return (
    <div data-catalogue-reader={catalogue.slug}>
      {/* ------------------------------------------------------- the chrome */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-y border-km-steel-600/60 px-5 py-3 sm:px-6 xl:px-10">
        <button
          type="button"
          data-toc-toggle
          aria-expanded={tocOpen}
          aria-controls="catalogue-toc"
          onClick={() => setTocOpen((value) => !value)}
          className="km-label min-h-11 text-km-steel-400 hover:text-km-offwhite"
        >
          {t('contents')}
        </button>

        <div role="group" aria-label={t('mode')} className="flex items-center gap-1">
          {(['immersive', 'standard'] as const).map((option) => (
            <button
              key={option}
              type="button"
              data-mode={option}
              aria-pressed={mode === option}
              disabled={option === 'immersive' && reducedMotion}
              title={option === 'immersive' && reducedMotion ? t('immersiveReduced') : undefined}
              onClick={() => setMode(option)}
              className={`km-label min-h-11 px-3 transition-colors duration-(--duration-km) ease-(--ease-km) disabled:opacity-40 ${
                mode === option ? 'text-km-blue' : 'text-km-steel-400 hover:text-km-offwhite'
              }`}
            >
              {t(`modes.${option}`)}
            </button>
          ))}
        </div>

        <div className="ms-auto flex items-center gap-4">
          {catalogue.searchable ? (
            <label className="flex items-center gap-3">
              <span className="km-label text-km-steel-400">{t('search')}</span>
              <input
                type="search"
                data-catalogue-search
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  if (event.target.value.trim().length >= 2) {
                    track({ name: 'catalogue_search', query: event.target.value.trim() });
                  }
                }}
                className="min-h-11 w-44 border border-km-steel-600 bg-km-charcoal px-3 text-small text-km-offwhite focus:border-km-blue"
              />
            </label>
          ) : null}

          <a
            href={catalogue.pdf}
            download
            onClick={() => track({ name: 'pdf_downloaded', doc_id: catalogue.id })}
            className="km-label min-h-11 inline-flex items-center text-km-offwhite hover:text-km-red-glow"
          >
            {t('downloadPdf')}
          </a>
        </div>
      </div>

      {/* Its own row. Inline in the control bar this wrapped to three lines and
          crowded the download link — a note explaining an absence should not be
          the widest thing in the chrome. */}
      {!catalogue.searchable ? (
        <p className="km-label border-b border-km-steel-600/60 px-5 py-3 text-km-steel-400 sm:px-6 xl:px-10">
          {t('notSearchable')}
        </p>
      ) : null}

      {/* ------------------------------------------------------- the results */}
      {query.trim().length >= 2 ? (
        <div className="border-b border-km-steel-600/60 px-5 py-4 sm:px-6 xl:px-10">
          <p className="km-label text-km-steel-400">
            {t('results', { count: results.length, query: query.trim() })}
          </p>
          {results.length ? (
            <ul className="mt-4 flex flex-wrap gap-3">
              {results.map((entry) => (
                <li key={entry.page}>
                  <button
                    type="button"
                    data-result={entry.page}
                    onClick={() => {
                      go(entry.page);
                      setQuery('');
                    }}
                    className="block border border-km-steel-600/60 p-1 transition-colors duration-(--duration-km) hover:border-km-blue"
                  >
                    <Image
                      src={entry.thumb}
                      alt=""
                      width={120}
                      height={84}
                      className="h-auto w-24"
                    />
                    <span className="km-label mt-1 block text-km-steel-400">{entry.page}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {/* ---------------------------------------------------------- the TOC */}
      <div
        id="catalogue-toc"
        hidden={!tocOpen}
        className="border-b border-km-steel-600/60 px-5 py-5 sm:px-6 xl:px-10"
      >
        <ul className="flex flex-wrap gap-2">
          {catalogue.spreads.map((entry) => (
            <li key={entry.page}>
              <button
                type="button"
                data-toc-page={entry.page}
                aria-current={entry.page === page ? 'true' : undefined}
                onClick={() => {
                  go(entry.page);
                  setTocOpen(false);
                }}
                className={`km-label min-h-11 min-w-11 border px-2 transition-colors duration-(--duration-km) ${
                  entry.page === page
                    ? 'border-km-red bg-km-red text-km-paper'
                    : 'border-km-steel-600/60 text-km-steel-400 hover:text-km-offwhite'
                }`}
              >
                {entry.page}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* -------------------------------------------------------- the spread */}
      <div
        ref={stage}
        className="relative flex items-center justify-center bg-km-charcoal px-5 py-10 sm:px-6 xl:px-10"
      >
        <div className="w-full max-w-[1200px] [perspective:2400px]">
          {spread ? (
            <div
              key={spread.page}
              data-spread={spread.page}
              className={`relative origin-left [transform-style:preserve-3d] ${
                mode === 'immersive' && turning && !reducedMotion
                  ? turning === 'next'
                    ? 'animate-[km-turn-next_480ms_var(--ease-km)]'
                    : 'animate-[km-turn-previous_480ms_var(--ease-km)]'
                  : ''
              }`}
            >
              <Image
                src={spread.src}
                alt={t('spreadAlt', { page: spread.page, title })}
                width={spread.width}
                height={spread.height}
                // The current page and its neighbours only.
                priority={spread.page === 1}
                sizes="(min-width: 1280px) 1200px, 94vw"
                className="h-auto w-full border border-km-steel-600/60"
              />
              {/* The fold highlight. Purely a gradient — it is what sells the
                  curl without a second render of the page. */}
              {mode === 'immersive' && turning ? (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/12 to-transparent"
                />
              ) : null}
            </div>
          ) : null}

          {/* --------------------------- Explore in 3D, where a page names one */}
          {spread?.machines.length ? (
            <ul className="mt-6 flex flex-wrap gap-4">
              {spread.machines.map((machine) => (
                <li key={machine.model}>
                  <Link
                    href={`/products/${machine.category}/${machine.slug}`}
                    data-explore-3d={machine.model}
                    className="km-label inline-flex min-h-11 items-center gap-2.5 border border-km-blue px-4 py-2 text-km-blue transition-colors duration-(--duration-km) ease-(--ease-km) hover:bg-km-blue hover:text-km-ink"
                  >
                    {t('explore3d', { model: machine.model })}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      {/* --------------------------------------------------------- the pager */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-km-steel-600/60 px-5 py-4 sm:px-6 xl:px-10">
        <button
          type="button"
          data-page-previous
          onClick={() => go(page - 1)}
          disabled={page === 1}
          className="km-label min-h-11 px-3 text-km-offwhite hover:text-km-red-glow disabled:opacity-40"
        >
          {t('previous')}
        </button>

        <p className="font-mono text-spec text-km-steel-400" aria-live="polite">
          <span data-current-page>{page}</span> / {total}
        </p>

        <button
          type="button"
          data-page-next
          onClick={() => go(page + 1)}
          disabled={page === total}
          className="km-label min-h-11 px-3 text-km-offwhite hover:text-km-red-glow disabled:opacity-40"
        >
          {t('next')}
        </button>
      </div>

      {/* Thumbnails: the standard mode's own navigation (Part I.4). */}
      {mode === 'standard' ? (
        <ul className="flex gap-2 overflow-x-auto border-t border-km-steel-600/60 px-5 py-4 sm:px-6 xl:px-10">
          {catalogue.spreads.map((entry) => (
            <li key={entry.page} className="shrink-0">
              <button
                type="button"
                data-thumb={entry.page}
                aria-current={entry.page === page ? 'true' : undefined}
                onClick={() => go(entry.page)}
                className={`block border p-1 transition-colors duration-(--duration-km) ${
                  entry.page === page ? 'border-km-red' : 'border-km-steel-600/60 hover:border-km-offwhite'
                }`}
              >
                <Image src={entry.thumb} alt="" width={120} height={84} className="h-auto w-20" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
