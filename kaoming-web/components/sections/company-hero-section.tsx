import { existsSync } from 'node:fs';
import { getTranslations } from 'next-intl/server';
import { factoryImages } from '@/lib/images';
import { CompanyHero } from './company-hero';

/**
 * A drop-in override for the opening frame.
 *
 * KAO MING supplied two elevated photographs of the whole CTSP site that are not
 * in `_kit/factory` — the closest thing the kit has is a low three-quarter of
 * the same building. Put either of them at this path and the hero uses it; leave
 * it absent and the hero falls back to the kit image, which is what it does
 * today.
 *
 * Checked with `existsSync` rather than imported, because an import of a missing
 * file is a build error and the point of this is that the file is optional. It
 * resolves at build time, so it costs nothing at runtime.
 *
 * Only the path is needed. The hero renders with `fill`, so `next/image` crops
 * to the section rather than to the file's own ratio and never reads its
 * intrinsic size — which is also why any reasonably wide photograph works here
 * without being re-cut first.
 */
const OVERRIDE = 'img/factory/kaoming-plant-aerial.jpg';

/**
 * The server half of the opening frame: it resolves the photograph and the
 * strings, so the client component that owns the scroll behaviour never imports
 * the image registry or next-intl's server API.
 *
 * The photograph is the Central Taiwan Science Park plant, from `_kit/factory`.
 * It is the only supplied image of the whole company at once — every other one
 * is an interior, a detail or a machine — which is what a landing frame has to
 * be.
 */
export async function CompanyHeroSection() {
  const t = await getTranslations('Home');

  const src = existsSync(`public/${OVERRIDE}`)
    ? `/${OVERRIDE}`
    : factoryImages.find((entry) => entry.src.includes('ctsp-plant-exterior'))?.src;

  if (!src) return null;

  return (
    <CompanyHero
      src={src}
      alt={t('plantAlt')}
      eyebrow={t('eyebrow')}
      title={t('companyTitle')}
      body={t('companyBody')}
      primary={t('companyAction')}
      secondary={t('requestQuote')}
      scroll={t('scroll')}
    />
  );
}
