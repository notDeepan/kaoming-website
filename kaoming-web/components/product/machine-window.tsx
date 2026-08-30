'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { WindowViewContext, type WindowView } from './window-view';

export type { WindowView };

/**
 * The machine window.
 *
 * Clicking a machine does not open a page you scroll — it opens a window over
 * the one you were on. Everything about that machine is inside it: the web of
 * figures, the 3D view, the full specification, the photographs. There is
 * nothing underneath to scroll to, which is the whole point; the previous
 * version put the web at the top of an ordinary page and left the old page
 * beneath it, so scrolling undid the effect entirely.
 *
 * **It is still a real route.** `/products/<category>/<series>` renders this,
 * which means the window has a URL, survives a reload, is in the sitemap, and
 * works in the static export. What makes it feel like a window is that it is
 * fixed over the viewport with a close control — not that it is rendered by a
 * router trick that the export cannot do.
 *
 * **Closing.** The close control is a real `<Link>` to the category page, so it
 * works with no JavaScript and is a proper right-clickable link. With
 * JavaScript, `history.back()` is preferred when there is something to go back
 * to, because a visitor who arrived from the products grid expects to land
 * where they were rather than one level up. Escape does the same.
 *
 * **Scroll.** The page behind is locked while the window is open, and the
 * window's own body scrolls natively — `data-lenis-prevent`, the attribute the
 * rest of the site's overlays already use to keep Lenis off a panel that
 * scrolls itself.
 */
export function MachineWindow({
  name,
  type,
  category,
  closeHref,
  panes,
}: {
  name: string;
  type: string;
  category: string;
  closeHref: string;
  /**
   * The panes, in tab order, each already rendered on the server.
   *
   * Elements rather than a render prop: a function cannot cross the server /
   * client boundary.
   *
   * All four are rendered, and the unselected ones are hidden by a stylesheet
   * rule that only applies once scripting is confirmed. Without JavaScript the
   * tabs cannot switch, so hiding three quarters of a machine would leave its
   * specification unreachable — the panes stack into one plain document
   * instead. The cost of rendering all four is that the 3D pane's subtree
   * mounts and its effects run, so `MachineViewer` waits for its own pane to be
   * selected before it asks for a canvas.
   */
  panes: {
    id: WindowView;
    label: string;
    content: ReactNode;
    /** Take exactly the body's height instead of the content's own. The 3D
     *  stage is sized by its container, so its panel has to pass the height
     *  down; a document pane must not, or it would be clipped to one screen. */
    fill?: boolean;
  }[];
}) {
  const t = useTranslations('Products');
  const router = useRouter();
  const [view, setView] = useState<WindowView>('web');
  const closeRef = useRef<HTMLAnchorElement>(null);

  /**
   * True when the window handled the close itself, false to let the link do it.
   *
   * Going back is only right when the previous page was one of ours — a visitor
   * who arrived from the grid expects to land back on the grid rather than one
   * level up. Someone who arrived from a search result, or straight on this URL,
   * has nothing of ours behind them, and `history.back()` would take them off
   * the site or to `about:blank`. The referrer is the one honest signal for
   * that, and where it is absent the link's own href is the answer.
   */
  const close = () => {
    if (typeof window === 'undefined') return false;
    const internal =
      window.history.length > 1 && document.referrer.startsWith(window.location.origin);
    if (!internal) return false;
    router.back();
    return true;
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (!close()) closeRef.current?.click();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
   * Two things, both on the documentElement.
   *
   * `lenis-stopped` locks the page behind. It goes on the root rather than the
   * body because that is where Lenis and the mobile menu already put it, and two
   * mechanisms fighting over `body { overflow }` is how a page ends up
   * permanently locked.
   *
   * `data-window-open` is what hides the site chrome and lets this z-index
   * work at all. `<main>` carries `relative z-1`, which is a stacking context,
   * so `z-200` in here is only 200 *within main* — and main's own 1 loses to the
   * header's 120. The rule in app/globals.css removes that context and takes the
   * header and footer out of the way, because a window that is the whole
   * interface should not have the site's navigation floating over it.
   */
  /* A scanned code opens on the machine itself. Someone holding a phone up in
     front of a KMC-325GM in a hall has already seen the web of figures on the
     stand; what they came to the URL for is the machine, so the 3D pane is what
     opens. Read after mount, because the server has no query string. */
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('qr') === '1') {
      setView('viewer');
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('lenis-stopped');
    root.dataset.windowOpen = 'true';
    return () => {
      root.classList.remove('lenis-stopped');
      delete root.dataset.windowOpen;
    };
  }, []);

  return (
    <WindowViewContext value={{ view, setView }}>
    <div
      data-machine-window
      data-view={view}
      role="dialog"
      aria-modal="true"
      aria-label={name}
      /* Above the header, which is z-120. The window is the whole interface
         while it is open; leaving the site chrome visible over it would say the
         opposite. */
      className="fixed inset-0 z-200 flex flex-col bg-km-black"
    >
      {/* ------------------------------------------------------- the frame */}
      <header className="flex shrink-0 items-center gap-4 border-b border-km-steel-600/60 px-5 py-3 sm:px-6 xl:px-8">
        <p className="km-label min-w-0 truncate text-km-steel-400">
          <span className="text-km-offwhite">{name}</span>
          <span aria-hidden="true" className="mx-2">
            ·
          </span>
          <span className="hidden sm:inline">{type}</span>
          <span className="sm:hidden">{category}</span>
        </p>

        {/* The panes. A tab list rather than links, because switching pane is a
            state change inside one window and not a navigation — a URL per pane
            would put four entries in the back stack between the grid and here. */}
        <div role="tablist" aria-label={name} className="ms-auto flex items-center gap-1">
          {panes.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              data-pane={entry.id}
              aria-selected={view === entry.id}
              onClick={() => setView(entry.id)}
              className={`km-label min-h-11 border px-3 transition-colors duration-(--duration-km) ease-(--ease-km) ${
                view === entry.id
                  ? 'border-km-red bg-km-red text-km-on-brand'
                  : 'border-transparent text-km-steel-400 hover:text-km-offwhite'
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>

        <Link
          ref={closeRef}
          href={closeHref}
          data-window-close
          onClick={(event) => {
            if (close()) event.preventDefault();
          }}
          className="km-label ms-2 flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-km-steel-600 px-4 transition-colors duration-(--duration-km) ease-(--ease-km) hover:border-km-offwhite hover:text-km-paper"
        >
          {t('closeWindow')}
          <span aria-hidden="true">✕</span>
        </Link>
      </header>

      {/* --------------------------------------------------------- the body */}
      <div
        data-lenis-prevent
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-6 xl:px-8"
      >
        {panes.map((pane) => (
          <div
            key={pane.id}
            role="tabpanel"
            aria-label={pane.label}
            data-pane-panel={pane.id}
            data-selected={String(view === pane.id)}
            className={pane.fill ? 'h-full min-h-0' : undefined}
          >
            {pane.content}
          </div>
        ))}
      </div>

      <footer className="shrink-0 border-t border-km-steel-600/60 px-5 py-2.5 text-center sm:px-6 xl:px-8">
        <p className="km-label text-km-steel-400">{t('windowHint')}</p>
      </footer>
    </div>
    </WindowViewContext>
  );
}
