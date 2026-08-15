import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Everything except API routes, the printed short links, Next internals, and
  // anything with a file extension (fonts, images, PDFs, the eventual GLBs and
  // decoders).
  //
  // `/m/...` is excluded so its route handler runs first and can redirect to an
  // unprefixed path — the middleware then picks the locale from the visitor's
  // browser, which is the whole point of a code printed once for every market
  // (Part J.7).
  matcher: '/((?!api|trpc|m/|_next|_vercel|.*\\..*).*)',
};
