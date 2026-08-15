import path from 'node:path';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { redirectRules } from './lib/legacy-redirects';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // An unrelated lockfile sits above this project; pin the trace root so the
  // build does not walk out of the app directory.
  outputFileTracingRoot: path.join(import.meta.dirname, '.'),
  // Part O: AVIF/WebP with srcset. The width ladders are trimmed from Next's
  // defaults — sixteen candidate widths for a 48px logo is markup weight for
  // nothing, and these cover the real breakpoints the layout uses.
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 828, 1080, 1440, 1920, 2560],
    imageSizes: [16, 32, 48, 96, 128, 256],
  },
  experimental: {
    // Part O: keep route JS small — tree-shake icon/util barrels when they land.
    optimizePackageImports: ['gsap'],
    // Part G.0: entering a machine should feel like entering it, not like
    // loading a page. Lets the router hand the card's image to the product
    // page's hero across the navigation.
    viewTransition: true,
  },
  async headers() {
    return [
      {
        // Every path under /fonts carries a version in its name, so the URL
        // changes whenever the file does. Safe to pin hard.
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Rasterized catalogue spreads carry the document id and page number in
        // their path and are regenerated wholesale, never edited in place.
        source: '/catalogue/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
  /**
   * Legacy KMC codes still carry a decade of search equity (Part E.1). Derived
   * from the taxonomy so a redirect cannot outlive the series it points at.
   */
  async redirects() {
    return redirectRules();
  },
};

export default withNextIntl(nextConfig);
