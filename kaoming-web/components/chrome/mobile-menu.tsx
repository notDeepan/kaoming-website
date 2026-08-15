'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { useGSAP, gsap } from '@/lib/motion/gsap';
import { useSmoothScroll } from '@/lib/motion/smooth-scroll';
import type { NavSection } from '@/lib/nav';
import { LanguageSwitcher } from './language-switcher';
import { QuoteCta } from './quote-cta';

/**
 * Part E.2 — full-screen overlay, staggered link reveal, CTA pinned bottom.
 *
 * Scroll inside the overlay is native (`data-lenis-prevent`) while Lenis is
 * stopped on the page behind it, so the two never fight. Focus is trapped and
 * restored, and Escape closes — the menu is the first place a keyboard user
 * gets stranded if that is skipped.
 */
export function MobileMenu({ sections }: { sections: NavSection[] }) {
  const t = useTranslations('Header');
  const tNav = useTranslations('Nav');
  const pathname = usePathname();
  const { stop, start, reducedMotion } = useSmoothScroll();
  const [open, setOpen] = useState(false);
  const panelId = useId();

  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const close = useCallback(() => setOpen(false), []);

  // Close on navigation.
  useEffect(() => close(), [pathname, close]);

  useEffect(() => {
    if (!open) {
      start();
      previouslyFocused.current?.focus();
      previouslyFocused.current = null;
      return;
    }

    previouslyFocused.current = document.activeElement as HTMLElement;
    stop();
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
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
  }, [open, stop, start, close]);

  useGSAP(
    () => {
      if (!open || reducedMotion) return;
      gsap.from('[data-menu-item]', {
        y: 24,
        opacity: 0,
        duration: 0.5,
        ease: 'power3.out',
        stagger: 0.045,
      });
    },
    { dependencies: [open, reducedMotion], scope: panelRef, revertOnUpdate: true },
  );

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? t('closeMenu') : t('openMenu')}
        onClick={() => setOpen((value) => !value)}
        className="km-label -me-2 flex min-h-11 min-w-11 items-center justify-center text-km-offwhite lg:hidden"
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5" fill="none">
          <path d="M2 6h16M2 14h16" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>

      <div
        id={panelId}
        ref={panelRef}
        hidden={!open}
        role="dialog"
        aria-modal="true"
        aria-label={t('menu')}
        data-lenis-prevent
        className="fixed inset-0 z-150 flex flex-col overflow-y-auto overscroll-contain bg-km-black lg:hidden"
      >
        <div className="flex items-center justify-between border-b border-km-steel-600/60 px-5 py-3">
          <LanguageSwitcher />
          <button
            ref={closeButtonRef}
            type="button"
            onClick={close}
            aria-label={t('closeMenu')}
            className="km-label -me-2 flex min-h-11 min-w-11 items-center justify-center text-km-offwhite"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5" fill="none">
              <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>

        <nav aria-label={t('primaryNavigation')} className="flex-1 px-5 py-8">
          <ul className="flex flex-col gap-8">
            {sections.map((section) => (
              <li key={section.key} data-menu-item>
                <Link
                  href={section.href}
                  className="block font-display text-h2 text-km-offwhite"
                >
                  {tNav(section.key)}
                </Link>
                <ul className="mt-2 flex flex-col">
                  {section.children.map((child) => (
                    <li key={child.href}>
                      <Link
                        href={child.href}
                        className="block py-2 text-small text-km-steel-400"
                      >
                        {child.kind === 'literal' ? child.label : tNav(child.key)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sticky bottom-0 border-t border-km-steel-600/60 bg-km-black/95 px-5 py-4 backdrop-blur-md">
          <QuoteCta label={t('requestQuote')} block />
        </div>
      </div>
    </>
  );
}
