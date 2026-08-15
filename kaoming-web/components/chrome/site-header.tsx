import { getTranslations } from 'next-intl/server';
import { navSections } from '@/lib/nav';
import { buildSearchIndex } from '@/lib/search';
import { productCategories } from '@/lib/taxonomy';
import { DesktopNav, type MegaCategory } from './desktop-nav';
import { HeaderShell } from './header-shell';
import { Logo } from './logo';
import { MobileMenu } from './mobile-menu';
import { SearchOverlay } from '@/components/search/search-overlay';
import { LanguageSwitcher } from './language-switcher';
import { QuoteCta } from './quote-cta';

/**
 * Part E.2 — persistent chrome.
 * Server component: the taxonomy is flattened here so the client only receives
 * the labels and hrefs the mega-panel actually renders.
 */
export async function SiteHeader() {
  const t = await getTranslations('Header');
  const tNav = await getTranslations('Nav');
  const tCatalogue = await getTranslations('Catalogue');

  // Built on the server from the same data the pages render, then handed to the
  // overlay so a query never needs a round trip (Part M.5).
  const searchIndex = buildSearchIndex(
    (key) => tNav(key),
    (id) => tCatalogue(id),
  );

  const megaCategories: MegaCategory[] = productCategories.map((category) => ({
    name: category.name,
    href: `/products/${category.slug}`,
    series: category.series.map((series) => ({
      name: series.name,
      type: series.type,
      href: `/products/${category.slug}/${series.slug}`,
    })),
  }));

  return (
    <HeaderShell>
      <Logo label={t('home')} />

      <DesktopNav sections={navSections} categories={megaCategories} />

      <div className="flex items-center gap-1 sm:gap-2">
        <SearchOverlay index={searchIndex} />

        <LanguageSwitcher className="hidden lg:block" />

        <QuoteCta label={t('requestQuote')} className="hidden sm:inline-flex" />

        <MobileMenu sections={navSections} />
      </div>
    </HeaderShell>
  );
}
