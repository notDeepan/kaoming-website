import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function NotFound() {
  const t = await getTranslations('NotFound');

  return (
    <div className="mx-auto max-w-[1600px] px-5 pt-32 pb-24 sm:px-6 sm:pt-40 xl:px-10">
      <p className="km-label text-km-red-glow">{t('code')}</p>
      <h1 className="mt-6 text-h1 text-km-paper uppercase">{t('title')}</h1>
      <p className="mt-6 max-w-[62ch] text-km-steel-400">{t('body')}</p>
      <Link
        href="/"
        className="km-label mt-10 inline-flex min-h-11 items-center gap-2 border-b border-km-red pb-1 text-km-offwhite"
      >
        {t('backHome')}
      </Link>
    </div>
  );
}
