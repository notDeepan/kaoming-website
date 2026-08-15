import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { placeholderRoutes } from '@/lib/nav';

/**
 * Reserved-route placeholder.
 *
 * Every destination the chrome links to exists as a real, statically generated
 * page from M0 onwards, so the navigation can be reviewed end to end without a
 * single broken link — and without pretending any of that content exists yet.
 *
 * Each milestone replaces entries here with real routes; a real route at the
 * same path always wins over this catch-all. Anything not in the registry is a
 * genuine 404, not a placeholder.
 */

export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    placeholderRoutes.map((route) => ({
      locale,
      slug: route.split('/').filter(Boolean),
    })),
  );
}

export default async function PlaceholderPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string[] }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const route = `/${slug.join('/')}`;
  // dynamicParams=false covers production; dev still renders arbitrary params.
  if (!placeholderRoutes.includes(route)) notFound();

  const t = await getTranslations('Placeholder');

  return (
    <div className="mx-auto max-w-[1600px] px-5 pt-32 pb-24 sm:px-6 sm:pt-40 xl:px-10">
      <p className="km-label text-km-red-glow">{t('label')}</p>
      <h1 className="mt-6 max-w-[20ch] text-h1 text-km-paper uppercase">{t('title')}</h1>
      <p className="mt-8 max-w-[62ch] text-km-steel-400">{t('body')}</p>

      <dl className="mt-10 flex items-baseline gap-4 border-t border-km-steel-600/60 pt-6">
        <dt className="km-label text-km-steel-400">{t('route')}</dt>
        <dd className="font-mono text-spec text-km-blue">{route}</dd>
      </dl>

      <Link
        href="/"
        className="km-label mt-10 inline-flex min-h-11 items-center gap-2 border-b border-km-red pb-1 text-km-offwhite"
      >
        {t('backHome')}
      </Link>
    </div>
  );
}
