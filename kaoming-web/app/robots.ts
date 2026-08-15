import type { MetadataRoute } from 'next';
import { ALLOW_INDEXING, SITE_URL } from '@/lib/site';

/**
 * Belt and braces with the per-page `robots` meta tag. Until KAO MING approves
 * the redesign, a preview of it must not be crawlable under the company's name
 * (Appendix 2 — hosting). The sitemap itself lands with the SEO pass in M8.
 */
export default function robots(): MetadataRoute.Robots {
  if (!ALLOW_INDEXING) {
    return { rules: { userAgent: '*', disallow: '/' } };
  }

  return {
    rules: { userAgent: '*', allow: '/' },
    host: SITE_URL,
  };
}
