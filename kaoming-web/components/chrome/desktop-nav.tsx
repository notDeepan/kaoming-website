'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useId, useState } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import type { NavSection } from '@/lib/nav';

/**
 * Minimal, serialisable shape of the product taxonomy for the mega-panel.
 * Built on the server so `content/machines/_taxonomy.json` never reaches the
 * client bundle.
 */
export type MegaCategory = {
  name: string;
  href: string;
  series: { name: string; type: string; href: string }[];
};

export function DesktopNav({
  sections,
  categories,
}: {
  sections: NavSection[];
  categories: MegaCategory[];
}) {
  const t = useTranslations('Header');
  const tNav = useTranslations('Nav');
  const pathname = usePathname();
  const panelId = useId();
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);

  // Any navigation closes the panel — the route change alone does not unmount it.
  useEffect(() => setPanelOpen(false), [pathname]);

  useEffect(() => {
    if (!panelOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPanelOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [panelOpen]);

  const activeSection = (section: NavSection) =>
    pathname === section.href || pathname.startsWith(`${section.href}/`);

  return (
    <div
      className="hidden lg:block"
      onPointerLeave={() => setPanelOpen(false)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node)) setPanelOpen(false);
      }}
    >
      <nav aria-label={t('primaryNavigation')}>
        <ul className="flex items-center">
          {sections.map((section) => {
            const isProducts = section.key === 'products';
            const isActive = activeSection(section);

            return (
              <li key={section.key}>
                {isProducts ? (
                  <button
                    type="button"
                    aria-expanded={panelOpen}
                    aria-controls={panelId}
                    onClick={() => setPanelOpen((value) => !value)}
                    onPointerEnter={() => setPanelOpen(true)}
                    onFocus={() => setPanelOpen(true)}
                    className={`km-label flex min-h-11 items-center gap-1.5 px-3 transition-colors duration-(--duration-km) ease-(--ease-km) hover:text-km-offwhite ${
                      isActive || panelOpen ? 'text-km-offwhite' : 'text-km-steel-400'
                    }`}
                  >
                    {tNav(section.key)}
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 10 6"
                      className={`size-2.5 transition-transform duration-(--duration-km) ease-(--ease-km) ${panelOpen ? 'rotate-180' : ''}`}
                      fill="none"
                    >
                      <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.2" />
                    </svg>
                  </button>
                ) : (
                  <Link
                    href={section.href}
                    onPointerEnter={() => setPanelOpen(false)}
                    onFocus={() => setPanelOpen(false)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`km-label flex min-h-11 items-center px-3 transition-colors duration-(--duration-km) ease-(--ease-km) hover:text-km-offwhite ${
                      isActive ? 'text-km-offwhite' : 'text-km-steel-400'
                    }`}
                  >
                    {tNav(section.key)}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Full-width mega-panel (Part E.2). */}
      <div
        id={panelId}
        hidden={!panelOpen}
        className="absolute inset-x-0 top-full border-t border-km-steel-600 bg-km-charcoal"
      >
        <div className="mx-auto grid max-w-[1600px] grid-cols-[minmax(0,22rem)_1fr] gap-12 px-6 py-10 xl:px-10">
          <div>
            <p className="km-label mb-4 text-km-steel-400">{tNav('products')}</p>
            <ul>
              {categories.map((category, index) => (
                <li key={category.href}>
                  <Link
                    href={category.href}
                    onPointerEnter={() => setActiveCategory(index)}
                    onFocus={() => setActiveCategory(index)}
                    className={`block border-b border-km-steel-600/50 py-3 text-h3 transition-colors duration-(--duration-km) ease-(--ease-km) ${
                      index === activeCategory ? 'text-km-offwhite' : 'text-km-steel-400'
                    }`}
                  >
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/*
            The render thumbnail for the hovered category (Part E.2) lands in
            M1, once the category key images are chosen from _kit/images. Until
            then this pane carries the catalogue series list, which is the
            information a buyer actually navigates by.
          */}
          <div className="border-s border-km-steel-600/50 ps-12">
            <p className="km-label mb-4 text-km-steel-400">
              {categories[activeCategory]?.name}
            </p>
            <ul className="grid gap-x-10 gap-y-1 sm:grid-cols-2">
              {categories[activeCategory]?.series.map((series) => (
                <li key={series.href}>
                  <Link
                    href={series.href}
                    className="group block py-2.5 transition-colors duration-(--duration-km) ease-(--ease-km)"
                  >
                    <span className="block font-display text-km-offwhite transition-colors group-hover:text-km-red-glow">
                      {series.name}
                    </span>
                    <span className="block text-small text-km-steel-400">{series.type}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
