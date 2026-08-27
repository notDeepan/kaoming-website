import { setRequestLocale } from 'next-intl/server';
import {
  ApplicationsBand,
  MachineShowcase,
  NetworkTeaser,
  NumbersStrip,
  ResourceShortcuts,
  TechnologyTeaser,
} from '@/components/sections/home-bands';
import { CompanyHeroSection } from '@/components/sections/company-hero-section';
import { CompanyStatement } from '@/components/sections/company-statement';
import { HomeHero } from '@/components/sections/home-hero';
import { CtaBlock } from '@/components/ui/cta-block';
import { routing } from '@/i18n/routing';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * Part F, re-ordered so the company comes before the product.
 *
 * The page used to open on a machine. That is right for a product page and
 * wrong for a landing page — a buyer arriving cold wants to know who this is
 * before they are sold a fourteen-metre gantry, and KAO MING's own review of
 * the first build said so. So the plant is the opening frame, the founding story
 * is the first thing to read, and the machine that used to be the hero now leads
 * the section beneath it.
 *
 * Nothing was dropped to make room. The rest is still the buyer's journey from
 * Part A.2 — see the machines, find your industry, understand the engineering,
 * weigh the company, find your representative, take the documents, ask for a
 * quote — which is why these sections are numbered and the tiles inside them are
 * not.
 */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <>
      <CompanyHeroSection />
      <CompanyStatement />
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
