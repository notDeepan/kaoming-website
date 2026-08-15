# Deployment

The build is ready to deploy. **It has not been deployed**, and should not be
until two things outside the code are settled.

## Blocked on

| | |
|---|---|
| **Hosting target** | Recorded as *deferred, undecided* in the spec's open items. The interim plan is a private Vercel preview for demos, with kaoming.com untouched until approval. |
| **KAO MING's approval** | Appendix 2: a preview of the redesign must not be crawlable under the company's name before they have approved it. `NEXT_PUBLIC_ALLOW_INDEXING` stays `false` until they do, and `robots.txt` and the sitemap both follow that flag. |

Neither is a technical blocker. Both are somebody's decision, and publishing a
company's site under its own name is not a decision this build gets to make on
its own.

## Before the first deploy

1. **Environment.** Copy `.env.example` and fill it in. The three that change
   behaviour rather than just enabling a feature:
   - `NEXT_PUBLIC_SITE_URL` — canonical URLs, hreflang and OG images are all
     absolute against it. Wrong here means wrong in every search result.
   - `NEXT_PUBLIC_ALLOW_INDEXING` — `true` only after approval.
   - `DATABASE_URL` — SQLite is fine for a pilot on one instance. A hosted
     deployment needs Postgres, because the file-backed database does not
     survive a redeploy and RFQ leads are the point of the site.

2. **Rate limiting.** `lib/rfq/rate-limit.ts` keeps its window in memory, which
   is correct for one process and wrong for several. On a multi-instance host,
   swap the store for the platform's limiter or Redis; the call site does not
   change.

3. **Generated assets.** Two build steps are not part of `next build` because
   they read the kit rather than the app, and they only need re-running when
   their sources change:

   ```bash
   node scripts/prepare-images.mjs        # machine plates, knockouts, factory
   python scripts/rasterize-catalogues.py # 48 catalogue spreads + search index
   npm run qr                             # printed short-link QR codes
   ```

   `npm run qr` reads `NEXT_PUBLIC_SITE_URL`. Generate the codes **after** the
   domain is decided — a QR printed on a banner cannot be reissued.

4. **Uploads.** `RFQ_UPLOAD_DIR` must resolve to persistent storage outside
   `public/`. On a platform with an ephemeral filesystem this needs object
   storage instead, or a buyer's drawing is gone at the next deploy.

## After the first deploy

- Confirm `robots.txt` matches the intent for that environment. A preview that
  is meant to be private and is serving `Allow: /` is the one mistake here that
  cannot be taken back.
- Watch the field vitals (`components/analytics/field-vitals.tsx`). Part O's
  budgets are field numbers at the 75th percentile, and every measurement in
  this repository is a lab number on one machine.
- Confirm the RFQ path end to end **on the deployed instance**: submit one, and
  check it reaches both the database and the inbox. `tests/m2-smoke.py` proves
  the code path; only a real submission proves the mail credentials.

## Verifying a deploy

Every gate is a script. Point them at the deployed origin by editing `BASE`, or
run them against `npm run start` locally:

```bash
npm run build && npm run start
python tests/m0-smoke.py   # routing, chrome, both locales
python tests/m1-smoke.py   # content and the product template
python tests/m2-smoke.py   # RFQ, compare, search, analytics
python tests/m3-smoke.py   # canvas, quality ladder, fallbacks
python tests/m4-smoke.py   # scroll choreography
python tests/m5-smoke.py   # the exploded system
python tests/m6-smoke.py   # the canonical journey, end to end
python tests/m7-smoke.py   # every route in the site map
python tests/m8-smoke.py   # accessibility, SEO, redirects, analytics
```
