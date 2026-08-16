# KAO MING International — website

Implementation of `KAOMING_WEBSITE_MASTER_SPEC.md`. **Milestones M0–M8 complete.**
Not deployed — see [DEPLOYMENT.md](DEPLOYMENT.md) for what that is waiting on.

## Showing it to people

```bash
npm run demo
```

Checks, builds, and serves on **http://localhost:3000/en**. Takes about a minute
from cold. Run `npm run check` on its own the day before — it verifies the parts
that are not in git and tells you the exact command to fix anything missing.

Nothing here needs the internet. That is deliberate: a meeting room's wifi is the
least reliable thing in the building, and this runs entirely from the laptop.

### Sending it to someone

```bash
npm run share
```

Puts the running site on a temporary public URL, so a colleague can open it in
their own browser. No account, no deployment, nothing published — the site is
still served by this machine, so everything works exactly as it does locally,
including the enquiry form writing a real lead.

The URL lives as long as that terminal does, and is different every time. Anyone
with the link can open it; `robots.txt` keeps it out of search engines. For a
link that outlives the terminal, see [DEPLOYMENT.md](DEPLOYMENT.md).

**The walk-through, in the order the site is built to be read** — this is Part
A.2, the journey the whole thing is designed around:

| | |
|---|---|
| `/en` | The hall. Scroll to the machines, the industries, the factory. |
| `/en/products` | Nine series across four catalogue categories. |
| `/en/products/gantry-machining-center/kmc-gm` | **The one to spend time on.** Scroll slowly: the camera orbits the machine, it comes apart into named components, each one reads its catalogue figures, and it reassembles. Then the specification, the catalogue, and an enquiry already filled in. |
| `/en/catalogue/clymene-2026-en` | The 2026 catalogue, readable in the browser, searchable. |
| `/en/company/network` | 40 agents across 32 countries, from KAO MING's own registry. |
| `/zh-tw` | The same site in Traditional Chinese. |

**Two things worth saying before anyone asks.** The machine in the 3D scenes is a
grey blockout labelled *"Scale placeholder — not the machine"*: it is built to
the KMC-325GM's real dimensions, and it is there because no 3D model of the
machine exists yet. Everything around it is finished and waiting for one. And
where a section says content is missing — workpiece photography, the application
pages, the case studies — that is KAO MING's gap being stated rather than filled
in with something invented. The [open items table](#open-items-for-kao-ming) is
the list to hand them.

```bash
npm install
npm run dev          # http://localhost:3000 -> /en
npm run build && npm run start

python tests/m0-smoke.py   # scaffold + chrome
python tests/m1-smoke.py   # Phase-1 site, both locales, no WebGL
python tests/m2-smoke.py   # RFQ end to end, compare, search, abuse controls
python tests/m3-smoke.py   # 3D viewer core, quality ladder, fallbacks
python tests/m4-smoke.py   # scroll choreography, measured in both directions
python tests/m5-smoke.py   # the exploded system, keyboard and reduced motion
python tests/m6-smoke.py   # the canonical journey A.2, walked end to end
python tests/m7-smoke.py   # every route in the Part E.1 site map, both locales
python tests/m8-smoke.py   # accessibility, SEO, redirects, analytics taxonomy
```

**330 checks, all green.** Every one needs the production server running. The M2
suite also needs a database (`npm run db:migrate`) and posts enough enquiries to
trip the rate limiter, so run it with `RFQ_RATE_MAX=40`.

Three generated asset steps are not part of `next build` — they read the kit
rather than the app, and only need re-running when their sources change:

```bash
node scripts/prepare-images.mjs        # machine plates, knockouts, factory
python scripts/rasterize-catalogues.py # 48 catalogue spreads + search index
npm run qr                             # printed short-link QR codes
```

## What exists

| | |
|---|---|
| Framework | Next.js 15.5 App Router, TypeScript, React 19 |
| Styling | Tailwind v4, tokens in `app/globals.css` (Part B.2 + `_kit/brand/brand-tokens.css`) |
| Type | Space Grotesk / Inter / IBM Plex Mono / Noto Sans TC, all self-hosted |
| Motion | Lenis 1.1.0 owns scroll, drives GSAP 3.12.5 + ScrollTrigger |
| i18n | next-intl, `/en` and `/zh-tw` |
| Chrome | Header + mega-panel, mobile overlay menu, footer (Part E.2) |
| Pages | Homepage (Part F), product discovery, four category pages, nine series pages, resource centre, contact |
| Data | Nine catalogue series normalised from four source files (`lib/machines.ts`) |
| Imagery | 29 machine renders published as studio plates and dark-field knockouts |
| RFQ | `/api/rfq` with zod validation, uploads, Prisma lead store, sales notification |
| Conversion | Compare tray and table, global search, Part Q analytics event layer |
| 3D | Scenes 01–06 on one canvas, QualityManager, self-hosted decoders, procedural studio environment |
| Choreography | Scroll-scrubbed camera orbit, synced feature cards, shared-element entry transition |
| Exploded system | Scroll-scrubbed disassembly, component panels with drawn leader lines, reassembly |
| Product journey | Scenes 07–11, mm/in toggle, embedded pre-populated RFQ, exit transition, printed QR short links |
| Catalogue | 48 spreads rasterized from the 2026 PDFs, immersive and standard readers, in-catalogue search, Explore in 3D |
| Secondary pages | Applications, technology, four company pages, the 41-agent network map, support, case studies |
| Hardening | Part O budgets met, keyboard and reduced-motion audited, schema.org, hreflang, sitemap, legacy 301s, field vitals |

Every route in the Part E.1 site map is live in both locales. The reserved-route
placeholder (`app/[locale]/[...slug]`) now only answers for the Phase 4–6 routes
the spec defers — `/showroom`, `/events`, and the rest.

## Machine content

`lib/machines.ts` merges `kmc-gm`, `kmc-gn`, `kmc-ce-ch` and `kmc-bow-way` into
one `Series` model. Each series declares how much of its catalogue has actually
been transcribed:

| `completeness` | Meaning | Series |
|---|---|---|
| `full` | Whole specification table transcribed | GM, GN, CE, CH |
| `partial` | Model ranges and table geometry only | H7/H8, HA14, HMA |
| `pending` | Catalogue page not read yet — no model list | H11, HA11 |

The product template renders what exists and states the gap where it does not.
Every specification block names the catalogue it came from. No value on a
product page is computed, rounded or inferred — the only arithmetic anywhere is
selecting the smallest and largest transcribed figure for a range.

## Images

```bash
node scripts/prepare-images.mjs --kit ../kaoming-website-kit-FINAL/kaoming-website-kit
```

Every machine render in the kit is a studio plate on white, and the site is a
dark hall — so each one is also published with the background removed, letting
the machine stand on the page's black field under a CSS pool of light. The
knockout is a background removal, not a retouch: no pixel of the machine
changes, and the untouched plate is published beside it for galleries.

## The RFQ path

`POST /api/rfq` is the most important function on the site (Part M.1), so the
order of operations is deliberate:

1. Rate limit, honeypot and time trap — cheap rejections first. Both traps
   answer exactly what success looks like, so a bot learns nothing.
2. `zod` validation against `lib/rfq/schema`, the same schema the form uses. The
   server never trusts the client's verdict; it re-parses the payload from
   scratch.
3. Uploads: extension **and** MIME must both be acceptable, size is re-checked
   against the bytes received, the filename is stripped to a safe basename, and
   files are written outside `public/` so nothing is ever served back.
4. The lead is committed **before** anyone tries to send mail, so a mail outage
   cannot lose an enquiry.
5. Notification. With no inbox configured it logs the full summary and says what
   is missing, rather than looking like it worked.

No IP address is stored. The limiter needs one for a few minutes, not forever,
so it lives in memory behind a per-process salt and never reaches the database.

Set `RFQ_NOTIFY_TO`, `RFQ_NOTIFY_FROM` and `RESEND_API_KEY` to switch mail on —
that is the only thing standing between the current state and live enquiries.

## The 3D viewer — and the model that does not exist

**There is no KMC-325GM model.** The kit supplies dimensioned drawings and
product renders, not geometry, and Appendix 2 leaves the modelling route —
contracted hard-surface artist versus in-house Blender build — as a decision due
at M3. That decision is a procurement one; it does not change any code here.

So the viewer is built against `lib/three/models`, a registry that is currently
empty. Every scene renders a **scale blockout** instead: the catalogue's own
figures (9.3 m of floor length, 6.5 m across, 5.8 m tall, a 3.0 x 2.0 m table
between columns 2.5 m apart) as plain grey volumes, labelled on screen as a
placeholder so it can never be mistaken for a KAO MING product. Its objects
carry the H.2 names, so the code that will read the artist's GLB is the code
reading this.

Dropping in a real model is one entry in that registry and nothing else.

What is real and verified today: the canvas architecture and its route
isolation, the QualityManager and its degradation ladder, self-hosted Draco and
KTX2 decoders, the lighting and post chain, both scenes and their controls, the
load sequence, and every fallback path.

**Frame rate is the one thing this environment cannot verify.** Headless
Chromium rasterises WebGL in software, where the scene runs at 2–3 fps — a
number that says nothing about GPU hardware. `tests/m3-smoke.py` reports it and
asserts nothing on it. What it does assert is the behaviour that protects the
budget: on a device that genuinely misses the floor, the watchdog walks the
Part O ladder (grain, bloom, DPR, LOD, static) and in the end hands the page
back to photography. Real 60fps needs measuring on hardware with the real model.

## How the scrub is framerate-independent

The M4 gate asks for scrubbing that is "smooth and framerate-independent both
directions". That is a property of the design, not a tuning exercise:

* ScrollTrigger writes raw progress into a shared ref; nothing animates the
  camera. Each frame the camera's pose is *read off the curve* at the eased
  progress, so it carries no history and scrolling back retraces the same path.
* The easing is delta-corrected (`1 - (1 - ease) ^ (delta * 60)`), the formula
  prime directive 6 fixes, so the same scroll distance produces the same
  movement at any refresh rate.

`tests/m4-smoke.py` measures both rather than asserting they were intended.
Scrolling back through the range lands the camera within **0.003 world units**
of where it was going forwards, and repeating the pass under a 6x CPU throttle
moves it by at most **0.005 units** — on a machine 9.3 m long.

## The exploded system

Scenes 04–06 are **one function of one scroll range**, not three animations.
`explodeState(progress)` in `lib/three/rig.ts` returns how far apart the machine
is: it opens over the first third, holds open while its components are read, and
closes over the last quarter with the per-part windows compressed, which is what
makes the reassembly read faster than the disassembly (Part G.8) without
occupying less scroll. Because it is a function and not a timeline, Scene 06 is
literally Scene 04 running backwards — there is no second animation to keep in
step — and the whole range scrubs deterministically in both directions.

The rig itself is read from the model. Every part carries `explodeVec`,
`explodeDist`, `explodeOrder`, `group` and `conceptual` in its `userData`, the
H.2 authoring contract, and `readRig()` returns them in disassembly order with
the base as the anchor that never moves. **The blockout writes those same
properties onto its own meshes**, so there is exactly one code path: when the
artist's GLB arrives, nothing in the rig or in Scenes 04–06 changes.

Part G.6 asks for hotspots that are focusable in DOM order and open a panel on
Enter. They are therefore ordinary buttons in ordinary DOM, not 3D picks — the
machine is not in the raycaster at all. Focus or hover marks the part on the
machine (emissive up, siblings dimmed, both delta-damped) and draws the leader
line; the figures themselves are DOM either way, so the panel is complete with
the canvas switched off. Under reduced motion nothing is scroll-driven, and the
Part G.2 **Exploded view** control still opens the machine — because pressing it
is the visitor's own choice — it simply arrives without the sweep.

Components come from `_kit/content` like everything else. A series whose
catalogue names no components gets **no exploded view**, rather than an invented
one: today that is every series except `kmc-gm`.

## Rules this codebase enforces

- **Source authority.** Machine names, types and model codes come from
  `content/machines/_taxonomy.json` and company facts from
  `content/company/company.json`, both verbatim copies of the kit. `lib/taxonomy.ts`
  may reformat a name for display; it never invents one.
- **Palette.** `@theme` wipes Tailwind's stock colours (`--color-*: initial`).
  If a colour is not in Part B.2, there is no utility class for it. Machine livery
  values stay plain CSS variables so they cannot be used for UI.
- **Lenis owns scroll.** No `scroll-behavior: smooth` anywhere. `lib/motion/` is
  the only place GSAP is registered and the only RAF loop.
- **Reduced motion is not optional.** Lenis is not instantiated at all under
  `prefers-reduced-motion`; `useScrollSignal` falls back to a passive listener.
- **Content is validated at build.** `lib/content-schema` checks the normalised
  series before any page renders — including that every model row has exactly as
  many cells as the table has columns. A transcription that drifts fails the
  build with the series named instead of shifting a figure into the wrong column.
- **No runtime CDN for 3D.** Draco and KTX2 decoders are served from
  `public/decoders`. Because the kit has no HDRI and drei's presets are fetched
  from a CDN, the environment map is built from Lightformers in code — which also
  satisfies the rule that `metalness > 0` never appears without one.
- **Indexing is off by default.** `NEXT_PUBLIC_ALLOW_INDEXING` must be exactly
  `true` to emit an indexable page or a permissive `robots.txt`. See `.env.example`.

## Fonts

IBM Plex Mono is self-hosted through `next/font/local` (`lib/fonts/`). The
display and body faces are declared by hand in `app/globals.css` against
version-pinned URLs under `public/fonts/`, because Next 15.5 does not emit font
preload links for `next/font` — and both of those faces set layout, so a late
swap re-flows headings and paragraphs. Preloading them is what holds CLS at 0.

Traditional Chinese resolves to the platform CJK face first; self-hosted Noto
Sans TC is the per-glyph safety net, attached after paint. `lib/fonts/index.ts`
explains the trade-off and how to make it primary again.

Regenerating the CJK declarations after a font upgrade:

```bash
npm i --no-save @fontsource-variable/noto-sans-tc
node scripts/generate-cjk-faces.mjs
```

## Open items carried into M1

- PP Neue Machina licence (Appendix 2). Space Grotesk stands in; swapping it is a
  one-file change in `app/globals.css` plus the woff2.
- A horizontal and a reversed lockup of the CIS mark. The supplied file is a
  stacked portrait mark with a near-black wordmark, so a dark header needs the
  paper plaque in `components/chrome/logo.tsx`.
- Traditional Chinese UI strings in `messages/zh-tw.json` need KAO MING sign-off.
- A customer-facing name for the series with no 2026 catalogue (Epeius, Atlas,
  Caelus, Armstrong). They are excluded from navigation until sales decides.
- Global search: the header control is rendered disabled. It activates in M2 with
  the index (Part M.5).
- Service, parts and FAQ have no verified content in the kit, so those routes are
  still placeholders. They need copy from KAO MING before they can be built.
- Machine feature titles and copy come from the catalogues in English and render
  identically in both locales, as the naming architecture in Part E.1 intends.
  Traditional Chinese product copy needs professional translation (Part R).
- Latin-ext subsets, for European distributor names (Part J.4, M7).
- Privacy policy text. The RFQ consent line states what happens to the data, but
  it cannot link to a policy that does not exist yet (Appendix 2, sales' call).
- Prisma is pinned to 6.x because Prisma 7 requires Node 20.19+/22.12+/24+ and
  this machine runs Node 21.2, which is itself past end of life. Worth upgrading
  Node before the hosted deployment.

## The rest of the product journey

Part A.2 draws one flow — home, discovery, card, 3D, scroll, exploded view,
components, reassembly, workpiece, application, specifications, catalogue,
compare, quote — and says a qualified lead is the success condition of the whole
system. `tests/m6-smoke.py` therefore walks it in one browser session, clicking
what a buyer clicks, and **submits the enquiry at the end**. A page that renders
perfectly but breaks the chain fails there.

Three decisions worth knowing about:

**The specification is one press away, not dumped first.** Scene 09 leads with
the four figures a buyer asks for and expands the full verified table on
request, which is what Part G.10 asks for. A series whose catalogue page has not
been transcribed has no control and says so on the page instead — pressing VIEW
FULL SPECIFICATIONS to be told there is nothing is worse than being told.

**The mm/in toggle converts for display only** (`lib/units.ts`). The catalogues
are metric and that is what this site publishes, indexes and sends to sales;
inches exist because a buyer in Ohio reads travels in inches. Only a value that
is unambiguously millimetres is converted — `50,000 kg` and `30/30/24 m/min` are
left exactly as printed — and the panel says the inch figures are converted, so
nobody quotes one back to KAO MING as a catalogue figure.

**The RFQ is embedded, not linked.** A buyer who has just watched the machine
come apart should not have to arrive on a second page and start again. `/rfq`
still exists for the header CTA; same component, same schema, same API route,
only the entry point differs.

`/m/<code>` is the printed short link (Part J.7) — `npm run qr` writes one SVG
per machine into `public/qr/`. It is excluded from the next-intl middleware so
the redirect can be locale-free: a code printed once works for a buyer in
Taichung and a buyer in Chicago. The scan lands with `?qr=1`, which pins the LOW
tier rather than making a phone on hall wifi watch the quality ladder walk down
to it. The QR script restates the slug rule from `lib/taxonomy`, so the M6 pass
follows every generated code end to end — a banner cannot be printed with a dead
link without the gate failing first.

## What KAO MING has not supplied

Scene 07 asks what the machine makes, and **nothing in the kit answers it**: no
workpiece photography, no workpiece geometry, and no series states a
`workpieces[]` block. KAO MING's own applications page, per the site audit in
`company.json`, says "updating" and never has been filled in.

So Scene 07 states the gap where a buyer would look for the answer, and Scene
08's industry tiles are **navigation into the application pages, not a claim**
that this machine has been sold into each of those industries. The `Workpiece`
shape is wired through the loader and the schema, so transcribing one workpiece
is a content change and no code change at all.

This is the single largest content gap in the build. A machine tool is judged on
what comes off it.

## Meeting the Part O budget

The product template scored **49** with LCP 6.4s and TBT 1.2s when M7 finished.
It now scores **97 desktop / 94 mobile**, with LCP 2.0s, TBT under 250ms and CLS
0.002. Three causes, each found by measurement rather than by guessing:

**One import cost 2.5 seconds.** `useProgress` — a single named export from drei
— was imported at the top of the product page. `next/dynamic` was correctly
lazy-loading the scene, and that guarantee was worth nothing, because the hook
pulled the whole 600 KB three/r3f stack into the initial bundle anyway. Loading
progress is now reported outward from inside the canvas, and nothing in
`product-experience.tsx` may import from three, drei or r3f — noted in the file,
because the next person will be tempted by exactly the same one-line
convenience.

**The canvas mounted during first paint.** The stage was "visible" at scroll
position zero thanks to a 200px observer margin, so 600 KB of script evaluation
ran while the hero photograph was trying to paint: the LCP element finished
downloading at 485ms and rendered at 3.7s, all of it render delay. It now waits
for the stage to genuinely be on screen, for the page to have loaded, and for
the browser to be idle. Part B.1's "first paint is text or a poster, never the
3D" is true rather than intended.

**CLS 0.148 was one line of type.** Open since M1 and attributed to the hero
grid; it was the breadcrumb. At 412px the trail wraps to two lines in the
fallback face and one in Plex Mono, so the swap at ~690ms lifted the entire hero
by 22px. Metric-matching the fallback did not help — the reflow is a line
*count*, not a line height — and it turned out the metric-matched fallback was
never reached anyway, because the CJK faces led the mono stack and Microsoft
JhengHei answers for Latin glyphs too. Both are fixed: the CJK faces moved
behind the adjusted fallback, and the breadcrumb no longer wraps at all.

Lighthouse's *simulated* throttling still reports LCP ~3.7s where real
(`--throttling-method=devtools`) throttling measures 2.0s. The field beacon in
`components/analytics/field-vitals.tsx` is what settles which number describes a
real visitor.

## Open items for KAO MING

None of these is a code problem. Each is something only KAO MING can supply or
decide, and each is stated on the page it belongs to rather than hidden here.

| | |
|---|---|
| **The KMC-325GM model** | No geometry exists. Every 3D scene runs against a dimensionally-correct scale blockout, labelled on screen as a placeholder. Dropping in a real model is one entry in `lib/three/models` and nothing else. |
| **Workpiece photography** | Scene 07 asks what the machine makes and nothing in the kit answers it. The largest content gap in the build. |
| **Application content** | KAO MING's own applications page says "updating" and never has been filled in. Six pages are built and routed, waiting on content only. |
| **History pairing** | Ten years and ten milestones, with the year-to-event pairing scrambled by the old site's carousel. The timeline pairs them the day it is confirmed; `history.pairingConfirmed` is the flag. |
| **Three technology sections** | Spindle, technical centre and quality exist on kaoming.com and their copy was never captured. Named as gaps on the page. |
| **Case studies** | None supplied. The route is live and says so. |
| **Agent registry** | 41 records that need confirming with sales before launch. The registry's own summary says "32 international agents"; it actually lists **40 across 32 countries** — the 32 is the country count under the wrong label. This site publishes the count from the data, and the build fails if the two ever disagree again. |
| **Four factory steps** | Casting, engineering, inspection and testing have no photography. Captioning an existing photograph with a step it does not show would misrepresent the facility, so they are named and left unbuilt. |
| **Hosting and approval** | See [DEPLOYMENT.md](DEPLOYMENT.md). Indexing stays off until KAO MING approves. |
