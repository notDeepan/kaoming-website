import type { Metadata } from 'next';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { preload } from 'react-dom';
import { AnalyticsScripts } from '@/components/analytics/analytics-scripts';
import { FieldVitals } from '@/components/analytics/field-vitals';
import { CjkFallbackFaces } from '@/components/chrome/cjk-fallback-faces';
import { CompareTray } from '@/components/compare/compare-controls';
import { SiteFooter } from '@/components/chrome/site-footer';
import { SiteHeader } from '@/components/chrome/site-header';
import { SkipLink } from '@/components/chrome/skip-link';
import { localeMeta, routing, type AppLocale } from '@/i18n/routing';
import { SmoothScrollProvider } from '@/lib/motion/smooth-scroll';
import { organizationSchema, schemaScript } from '@/lib/schema';
import { ALLOW_INDEXING, alternatesFor, SITE_URL } from '@/lib/site';
import { DEFAULT_THEME, themeInitScript } from '@/lib/theme';
import { BODY_FONT_URL, CJK_FACES_URL, DISPLAY_FONT_URL, fontVariables } from '@/lib/fonts';
import '../globals.css';

type LocaleParams = { locale: string };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<LocaleParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations({ locale, namespace: 'Meta' });

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t('title'), template: t('titleTemplate') },
    description: t('description'),
    applicationName: t('siteName'),
    // Canonical and hreflang are per page — see alternatesFor in lib/site.
    alternates: alternatesFor(locale),
    openGraph: {
      type: 'website',
      siteName: t('siteName'),
      title: t('title'),
      description: t('description'),
      locale: localeMeta[locale as AppLocale].htmlLang.replace('-', '_'),
      url: `/${locale}`,
    },
    robots: ALLOW_INDEXING
      ? { index: true, follow: true }
      : { index: false, follow: false, nocache: true },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<LocaleParams>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  // Opts every Server Component below into static rendering.
  setRequestLocale(locale);

  /*
   * Part B.3 / Part O — the two faces that set layout are preloaded: the display
   * face for headings, the body face for paragraphs. A late body swap re-flows a
   * paragraph and moves everything under it, which on its own spent the whole
   * CLS budget.
   *
   * Called rather than rendered as <link> children: as children they are subject
   * to stream ordering and arrived too late to prevent the re-flow. A
   * hand-written <head> would also work, but it closes before Next has streamed
   * the page's metadata, which pushes <meta name="robots"> out of the head and
   * silently voids `noindex` on /rfq and /compare.
   *
   * `crossOrigin` is mandatory even same-origin: font fetches are CORS-mode, and
   * without it the preload is discarded and the file fetched twice.
   */
  for (const href of [DISPLAY_FONT_URL, BODY_FONT_URL]) {
    preload(href, {
      as: 'font',
      type: 'font/woff2',
      crossOrigin: 'anonymous',
      fetchPriority: 'high',
    });
  }

  const t = await getTranslations('Header');

  return (
    <html
      lang={localeMeta[locale as AppLocale].htmlLang}
      className={fontVariables}
      /* The default theme is in the markup, not in a script: light survives a
         visitor with JavaScript off, and there is no first frame in which the
         document has no theme to flash out of. The script below only corrects
         this for someone who has chosen otherwise. */
      data-theme={DEFAULT_THEME}
    >
      <body className="min-h-dvh bg-km-black antialiased">
        {/*
         * Corrects `data-theme` for a visitor who has chosen dark, before the
         * browser paints anything below it. Inline and synchronous — `next/script`
         * defers, which is a flash.
         *
         * First child of <body> rather than in <head> on purpose: a hand-written
         * <head> closes before Next has streamed the page's metadata into it,
         * which pushes <meta name="robots"> out and silently voids `noindex` on
         * /rfq and /compare (the same reason the font preloads above are called
         * rather than rendered). A synchronous script here still runs before the
         * rest of the body is parsed, which is all this needs.
         */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript() }} />

        {/* Part R — Organization, once, on every page. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: schemaScript(organizationSchema()) }}
        />

        {/* Part B.2 — the field is never flat. Both layers are static and inert. */}
        <div className="km-atmosphere" aria-hidden="true" />
        <div className="km-grain" aria-hidden="true" />

        {/* Traditional Chinese fallback faces — attached after paint, because the
            stacks prefer the platform CJK face and this is only a safety net. */}
        {locale === 'zh-tw' ? <CjkFallbackFaces href={CJK_FACES_URL} /> : null}

        <NextIntlClientProvider>
          <SmoothScrollProvider>
            <SkipLink label={t('skipToContent')} />
            <SiteHeader />
            <main id="main" className="relative z-1">
              {children}
            </main>
            <SiteFooter />
            <CompareTray />
            <AnalyticsScripts />
            <FieldVitals />
          </SmoothScrollProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
