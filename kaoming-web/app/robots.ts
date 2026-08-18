import type { MetadataRoute } from 'next';
import { ALLOW_INDEXING, SITE_URL } from '@/lib/site';

/**
 * Belt and braces with the per-page `robots` meta tag. Until KAO MING approves
 * the redesign, a preview of it must not be crawlable under the company's name
 * (Appendix 2 — hosting). The sitemap itself lands with the SEO pass in M8.
 */
/**
 * Both of these are computed from committed content and never vary per
 * request. Saying so explicitly is required by `output: export` (the Pages
 * build) and is simply true of every other build.
 */
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  if (!ALLOW_INDEXING) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }

  return {
    rules: { userAgent: '*', allow: '/' },
    host: SITE_URL,
  };
}
