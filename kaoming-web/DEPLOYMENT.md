# Deployment

## The link that is live now

**https://notdeepan.github.io/kaoming-website/**

Public, no login, works on a phone. Rebuild and republish it with one command:

```bash
npm run pages
```

That builds a static export and force-pushes it to the `gh-pages` branch, which
GitHub Pages serves. It refuses to run with uncommitted changes, because it
restores the working tree with `git checkout` afterwards.

**It is a reduced site, and the reductions are not cosmetic.** Pages runs no
Node, so:

| Gone | Why |
|---|---|
| Submitting an enquiry | `/api/rfq` is a POST handler. The form renders, validates and says plainly that it cannot be sent from here. |
| The printed QR short links (`/m/<code>`) | A redirect handler. |
| The legacy KMC 301s | `redirects()` needs a server. |
| Image optimisation | The optimiser is a server. Source WebP is served as-is. |

Everything a visitor looks at is intact: the 3D scenes, the catalogue reader,
the NEWS section, both locales, the whole specification, and both themes.
`python tests/pages-live.py` checks the deployed URL rather than a local build.

Two things about that build are worth knowing before changing them. `basePath`
is `/kaoming-website`, and Next does **not** apply it to anything referenced out
of `/public` — `scripts/publish-pages.mjs` prefixes those paths in the emitted
artifact instead, so the application source keeps one truth about where its
assets live. And there is no Actions workflow: pushing one needs a token with
`workflow` scope. `gh auth refresh -h github.com -s workflow` if you want Pages
to rebuild on push instead of on command.

## Is it the hosting?

Asked after the site felt slow on an office desktop. Mostly no.

GitHub Pages is a CDN and serves everything gzipped, and the pages themselves are
static HTML — there is no server doing work per request. What is heavy is what
the browser then has to run. Measured on the local production build, decoded
(over the wire it is roughly a third of this):

| | Total | Script | Other |
|---|---|---|---|
| `/en` | 1.9 MB | 737 KB | 736 KB of route prefetch, 111 KB images, 98 KB fonts |
| `/en/products/.../kmc-gm` | 3.3 MB | 2.0 MB | three.js, drei and the post-processing stack |
| `/en/company/network` | 1.9 MB | 819 KB | |

So the 3D pages carry two megabytes of JavaScript to parse before anything moves,
and then ask the GPU for a bloom pass. On a machine with integrated graphics that
is the whole problem, and it is the same problem on any host. Both halves of it
are now capped — see the third row of
[What changed in review](README.md#what-changed-in-review) — and
`tests/perf-guards.py` holds the caps in place.

The one thing that *is* the hosting: Pages runs no image optimiser, so source
WebP is served at full size rather than resized per viewport. On a phone that is
worth roughly 100 KB a page. A Vercel deployment fixes it for free.

## A link where the whole site works

Two commands, from this directory:

```bash
npx vercel login
npx vercel --prod
```

Vercel prints a URL like `https://kaoming-website-xxxx.vercel.app`. That is the
link to send.

`vercel.json` already sets the three things that matter for a preview:
indexing off, the ephemeral lead store on, and the region in Tokyo (closest of
Vercel's free regions to Taiwan). Nothing else needs configuring.

**What "private" means here.** On Vercel's free tier the URL is unlisted, not
password-protected: anybody with the link can open it, nobody can find it
otherwise. `robots.txt` serves `Disallow: /` while `NEXT_PUBLIC_ALLOW_INDEXING`
is false, so it stays out of search engines. If you need an actual password on
it, that is Vercel's Deployment Protection, and it is a paid feature.

**The enquiry form works on the preview, but the leads do not last.** There is no
database on a preview, so `RFQ_EPHEMERAL_DB=1` has it copy an empty SQLite file
to the instance's temp directory. A submitted enquiry is genuinely written and
read back — the success page is telling the truth — but it is gone when the
instance recycles. Before this is anything other than a demo, set a real
`DATABASE_URL` and remove that flag.

---

The build is production-ready. The Pages link above is a preview, not a home:
**nothing has been deployed to anything permanent**, and nothing should be until
two things outside the code are settled.

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

`tests/pages-live.py` is the exception — it takes no local server, because it
checks the deployed Pages URL for the things only a deploy can get wrong.
```bash
python tests/pages-live.py
```
