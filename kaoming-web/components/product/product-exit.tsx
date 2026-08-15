'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useRouter as useIntlRouter } from '@/i18n/navigation';

/**
 * Part G.11 — the way out.
 *
 * Appears once the visitor has left Scene 01, because on Scene 01 the machine
 * has not earned a back button yet and the header is right there. It reverses
 * the entry transition: the same `view-transition-name` is on the hero plate and
 * on the card in the grid, so the browser tweens one into the other instead of
 * cutting between two pages (Part G.0).
 *
 * The grid restoring its scroll position is the App Router's own behaviour on a
 * back navigation, so the control uses `router.back()` when this page was
 * reached from the grid, and only falls back to a fresh navigation when it was
 * not — a deep link, a QR scan, a shared URL. Pushing a new entry in the first
 * case would leave the buyer somewhere they have never been, at the top.
 */
export function ProductExit({ category }: { category: string }) {
  const t = useTranslations('Products');
  const router = useRouter();
  const intlRouter = useIntlRouter();

  const [visible, setVisible] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    // `navigation.canGoBack` is not universal; history length above one means
    // this tab has somewhere to go back to, which is the question being asked.
    setCanGoBack(window.history.length > 1);

    const onScroll = () => setVisible(window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const leave = () => {
    const go = () => {
      if (canGoBack) router.back();
      else intlRouter.push(`/products/${category}`);
    };

    // View Transitions where the browser has them; a plain navigation where it
    // does not. Either way the visitor ends up in the same place.
    const start = document.startViewTransition?.bind(document);
    if (start) start(go);
    else go();
  };

  return (
    <button
      type="button"
      data-product-exit
      onClick={leave}
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      className={`km-label fixed start-4 top-24 z-30 inline-flex min-h-11 items-center gap-2.5 border border-km-steel-600/60 bg-km-black/80 px-4 py-2 text-km-offwhite backdrop-blur-sm transition-[opacity,transform] duration-(--duration-km) ease-(--ease-km) hover:border-km-offwhite ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'
      }`}
    >
      <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="size-3 shrink-0">
        <path d="M15 8H2M7 3L2 8l5 5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      {t('backToProducts')}
    </button>
  );
}
