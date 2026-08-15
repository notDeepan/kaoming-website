import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { SupportPage } from '@/components/support/support-page';
import { routing } from '@/i18n/routing';
import { alternatesFor } from '@/lib/site';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Faq' });
  return {
    title: t('title'),
    description: t('lede'),
    alternates: alternatesFor(locale, '/support/faq'),
  };
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <SupportPage namespace="Faq" path="/support/faq" />;
}
