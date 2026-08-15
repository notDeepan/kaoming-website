import { setRequestLocale } from 'next-intl/server';
import {
  ApplicationsBand,
  MachineShowcase,
  NetworkTeaser,
  NumbersStrip,
  ResourceShortcuts,
  TechnologyTeaser,
} from '@/components/sections/home-bands';
import { HomeHero } from '@/components/sections/home-hero';
import { CtaBlock } from '@/components/ui/cta-block';
import { routing } from '@/i18n/routing';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * Part F. The order is the buyer's journey from Part A.2 — see the machines,
 * find your industry, understand the engineering, weigh the company, find your
 * representative, take the documents, ask for a quote — which is why these
 * sections are numbered and the tiles inside them are not.
 */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <HomeHero />
      <MachineShowcase />
      <ApplicationsBand />
      <TechnologyTeaser />
      <NumbersStrip />
      <NetworkTeaser />
      <ResourceShortcuts />
      <CtaBlock />
    </>
  );
}
