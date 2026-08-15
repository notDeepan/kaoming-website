# KAO MING INTERNATIONAL WEBSITE
## Master Design & Build Specification — v1.0 (August 2026)

**Project:** Redesign of kaoming.com into a premium international B2B digital showroom for KAO MING Machinery Industrial Co., Ltd. (高明精機), Houli, Taichung, Taiwan.

**This document is the single source of truth for the build.** It is written to be executed by Claude Code. It expands the original 95-section concept document into an implementable specification: art direction, tech stack, data model, page-by-page specs, the 3D pipeline, performance budgets, i18n, SEO, analytics, and a milestone-by-milestone build plan.

---

# PART 0 — INSTRUCTIONS FOR CLAUDE CODE

Read this part before writing any code.

## 0.1 Prime directives

1. **"Show, then explain."** Every major section leads with the machine (photo, video, or 3D), then explains, then converts. Never open a section with a wall of text.
2. **Never invent technical claims.** All specifications, travels, speeds, accuracies, and capabilities must come from verified KAO MING documentation supplied in `/content`. Where data is missing, render the placeholder token `{{TO_BE_VERIFIED}}` visibly in dev and hide the field in production. AI may generate visual concepts, geometry, animation, layout, and draft copy — never engineering facts. The UI must visually distinguish **verified specification** (spec tables, numbers) from **visual representation** (3D models, conceptual internals).
3. **Build the flagship pilot first.** One machine, complete experience, reusable framework. Every other machine is then content, not code (see Part S).
4. **Never publish a third-party partner logo or named cooperation claim** without written permission on file. One internal deck displays another manufacturer's logo under "technical cooperation"; it does not go on the public site until legal clearance exists.
5. **Performance is a feature.** Budgets in Part O are hard limits, not aspirations. If a visual idea and the budget conflict, degrade the visual, not the budget.
6. **Lerp everything.** No property snaps. Camera, scroll progress, hover states, and counters all interpolate with weighted easing (damping 0.06–0.1; framerate-independent: `factor = 1 - Math.pow(1 - ease, delta * 60)`).

## 0.2 Skills to consult (installed in this environment)

Read the relevant SKILL.md **before** starting the corresponding work. Mapping:

| Work | Skills to read |
|---|---|
| Project scaffold, React architecture | `vercel-react-best-practices`, `vercel-composition-patterns`, `gsap-react` |
| Visual/aesthetic decisions | `art-direction-immersive`, `frontend-design` |
| R3F scene setup, canvas, render loop | `r3f-fundamentals`, `threejs-fundamentals` |
| Model loading, decoders, preloading | `r3f-loaders`, `3d-asset-pipeline` |
| Lighting, HDRI, shadows | `r3f-lighting`, `threejs-lighting` |
| Materials (painted metal, glass, steel) | `r3f-materials`, `threejs-materials` |
| Bloom, vignette, grain, grading | `r3f-postprocessing`, `threejs-postprocessing` |
| Scroll choreography, pinning, scrub | `gsap-scrolltrigger`, `gsap-timeline`, `gsap-core`, `gsap-plugins` |
| Exploded view, reassembly, component motion | `r3f-animation`, `gsap-timeline` |
| Hotspots, raycasting, viewer controls | `r3f-interaction`, `threejs-interaction` |
| Scene/page transitions (card → fullscreen) | `composite-rendering` |
| Custom shader moments (light sweep, x-ray) | `r3f-shaders`, `glsl-shaders` |
| Textures, envmaps | `r3f-textures`, `threejs-textures` |
| Model optimization (GLB/Draco/KTX2/LOD) | `3d-asset-pipeline` |
| Performance passes | `web-perf-budget`, `gsap-performance`, `vercel-optimize` |
| Accessibility / UI audit | `web-design-guidelines`, `writing-guidelines` |
| Browser testing | `webapp-testing` |
| Deployment | `vercel-cli-with-tokens` |
| Overall Awwwards-grade patterns | `awwwards-3d` (philosophy and hard rules apply; output format differs — see 0.3) |

## 0.3 Deviation from the awwwards-3d default output

The `awwwards-3d` skill defaults to single-file HTML. **This project is a multi-page production site** (i18n, SEO, CMS-ready, forms), so the deliverable is a **Next.js application** (see Part C). All other principles from that skill carry over unchanged: ACESFilmic tone mapping, capped pixel ratio, Draco-compressed GLB, lerped motion, Lenis-owned scroll, no snap animations, no `console.log` in the render loop, delta-time-driven animation.

**One sanctioned exception to "no OrbitControls":** Scene 02 (manual machine inspection) requires user-driven orbit. Use `@react-three/drei` `CameraControls` (or `PresentationControls`) with damped inertia, constrained polar/azimuth angles and zoom limits — never raw unconstrained `OrbitControls`. All scroll-driven scenes use a scripted camera.

## 0.4 Hard rules (ship-blockers)

- No `metalness > 0` without an environment map loaded.
- `renderer.toneMapping = ACESFilmicToneMapping`, `outputColorSpace = SRGBColorSpace`, exposure 1.0–1.2.
- `setPixelRatio(Math.min(devicePixelRatio, 2))` desktop; cap 1.5 on mobile tier.
- All GLBs Draco-compressed + KTX2 textures. No raw exports in `/public`.
- Lenis owns scroll; ScrollTrigger reads from Lenis; remove `scroll-behavior: smooth` from CSS.
- Raycast only against a registered array of interactable meshes, throttled below render Hz.
- Dispose geometries/materials/textures/render-targets on route change; cancel RAF; remove listeners.
- `prefers-reduced-motion` gets the calm variant (Part P) — this is not optional.
- Every animation driven by `clock.getDelta()`, never frame count.
- No autoplay audio, ever. Sound (if built) is gesture-gated with a persistent mute, default off.

---

# PART A — VISION & STRATEGY

## A.1 Project vision

Transform kaoming.com from a traditional corporate/product website into an **interactive digital showroom and international sales platform**. The site should feel like a machine tool itself: precise, engineered, powerful, refined, technologically advanced.

The visitor journey: **Discover → Explore → Understand → Compare → Visualize → Trust → Contact.**

The website must communicate that KAO MING is not simply a machinery supplier but an experienced engineering and manufacturing company — Taiwan's leader in gantry-type (double-column) machining centers — capable of producing sophisticated, high-value CNC machinery for international customers.

## A.2 The sales journey (canonical flow)

```
HOME → PRODUCT DISCOVERY → PRODUCT CARD → 3D TRANSITION → FULL-SCREEN MACHINE
→ INTERACTIVE 3D → SCROLL ROTATION → EXPLODED VIEW → COMPONENT EXPLANATION
→ REASSEMBLY → WORKPIECE → APPLICATION → SPECIFICATIONS → CATALOGUE
→ COMPARE → REQUEST QUOTE → KAO MING SALES TEAM
```

Every product journey ends in a pre-populated RFQ. A qualified international lead is the success condition of the entire system.

## A.3 Design mantra (acceptance test for every section)

Every major section must satisfy at least one of:

- **SHOW IT** — photography, video, 3D, or animation.
- **EXPLAIN IT** — clear technical information.
- **PROVE IT** — case studies, factory, certifications, real examples.
- **CONNECT IT** — applications, distributors, contact options.
- **CONVERT IT** — an obvious next action.

A section satisfying none of these gets cut.

## A.4 What this site is (for the development mindset)

A combination of: corporate website + industrial product catalogue + 3D visualization platform + digital showroom + international sales platform + technical documentation system + lead-generation platform. The 3D experience is a **reusable framework**: after the pilot, a new machine requires only a new model, textures, component data, specifications, workpieces, videos, and documents — never new interaction code.

---

# PART B — ART DIRECTION (COMMITTED CREATIVE BRIEF)

## B.1 The eight commitments

1. **Concept / thesis:** *"Enter the machine."* The site is a machine hall at night — vast, dark, silent, precisely lit. One monumental machine at a time occupies the light. The visitor doesn't browse a website; they walk the floor of a digital showroom and step inside the engineering.
2. **Mood (three words, hold the line):** **Monumental. Precise. Calm.** Never busy, never loud, never decorative.
3. **Reference triangulation:** Bonhomme (typography-led product showcase) × Igloo Inc. (narrative pacing, cinematic lighting) × Apple AirPods Pro pages (scroll-driven object storytelling). Aim at the intersection — an industrial-scale Apple product page with Bonhomme's typographic confidence.
4. **Palette:** warm charcoal dominant (60–70% of surface), machined-steel neutrals, off-white light sections, KAO MING red as a rare earned accent (<10% coverage). Exact tokens in B.2. Backgrounds are never flat: subtle radial gradient + film grain + vignette always present.
5. **Type:** Display = **PP Neue Machina** (machine-inspired geometric grotesque; license required) with free fallback **Space Grotesk**. Workhorse = **Inter**. Technical numbers/labels = **IBM Plex Mono**. Traditional Chinese = **Noto Sans TC** (matched weights). Two voices + mono only.
6. **Motion signature:** the **scroll-driven disassembly** — the machine exploding into named components and reassembling as one system. This is the moment people remember and share. Everything else supports it.
7. **Load sequence (first 2 seconds):** black screen → a 1px accent-red progress line machines itself horizontally across the viewport (driven by real asset progress) → line completes and sweeps upward as a light pass revealing the machine silhouette → wordmark and H1 stagger in → scroll indicator fades in. Never a spinner.
8. **Sound:** **absent in Phases 1–4.** The direction is silent + hyper-tactile motion. If added later (Phase 5+): low ambient machine-hall room tone at −24 dB, soft servo ticks on hotspot interactions, gesture-gated, mute toggle, default off, `localStorage`-persisted.

## B.2 Color tokens

Derived from KAO MING's official CIS logo file (sampled August 2026) — these are exact, not placeholders. The logo is a flat four-color mark and yields **two** brand colors, not one.

```css
:root {
  /* Dominant field — warm-shifted toward the wordmark black */
  --km-black:      #0C0B0A;  /* page background, hero */
  --km-charcoal:   #161513;  /* raised dark surfaces, product scenes */
  --km-steel-800:  #201E1B;  /* cards on dark, dark section alt */
  --km-steel-600:  #3C3936;  /* borders, dividers, inactive UI */
  --km-steel-400:  #837E77;  /* secondary text on dark, captions */

  /* Light system (specs, documentation, resources) */
  --km-offwhite:   #F3F1EC;  /* light section background */
  --km-paper:      #FAF9F6;  /* cards on light, near-white text on dark */

  /* Official brand marks (exact, sampled from the CIS logo) */
  --km-ink:        #2B2925;  /* 'KMC' wordmark — warm near-black, the true text black */
  --km-red:        #B61B31;  /* logo arch — primary accent; buttons, active states, progress */
  --km-blue:       #64A9DA;  /* logo mountain, '1968', script tagline — SECOND brand color:
                                interactive states, links, data highlights, 3D emissive */
  --km-red-glow:   #E8465C;  /* hover/emissive value — exceeds bloom threshold in 3D */
  --km-blue-glow:  #8FC7EE;

  /* Semantic */
  --km-success:    #2E9E6B;
  --km-warning:    #D9A21B;
}
```

**Machine livery** (sampled from the official 325GM render — for 3D PBR materials, not UI): enclosure blue-grey `#657199` (lit `#8E9AC2`, shadowed `#4D5981`), structural casting grey `#C5C5C5` (lit `#E0E0E0`), base casting `#383838`, KESSLER-head orange `#F08A24`, and the green edge LED strips `#4CE0A0`. Those LED strips are a real product feature and are the natural source for the site's light-line motif (loader, section rules, hotspot rings). Confirm an official Pantone/RAL for the livery before finalizing materials — these are render-sampled and may have been graded.

Rules: accent never used for large fills or long text; keep UI blue (`--km-blue`) and livery blue (`--machine-blue`) strictly separate — they are different families; never place `--km-red` directly against the machine's blue-grey without `--km-ink` or `--km-offwhite` between them; machines remain the visual focus; avoid gradients except atmospheric background depth; no glassmorphism; the "3D scene" grade (bloom, vignette, grain) is part of the palette and must be consistent across all machines.

**Explicitly avoid** (from the concept doc + AI-cliché list): excessive gradients, too many boxes, dense text, small typography, old-fashioned navigation, dominant red/orange, stock photography, generic corporate imagery, purple-blue gradient heroes, cream+serif+terracotta templates.

## B.3 Typography system

```
Display (PP Neue Machina / Space Grotesk fallback):
  --text-hero:    clamp(3.5rem, 9vw, 8.5rem)   / 0.95 line-height / -0.02em tracking / uppercase
  --text-h1:      clamp(2.5rem, 6vw, 5rem)     / 1.0
  --text-h2:      clamp(2rem, 4vw, 3.25rem)    / 1.05
  --text-h3:      clamp(1.4rem, 2.5vw, 1.9rem) / 1.15

Workhorse (Inter / Noto Sans TC):
  --text-body:    1.0625rem / 1.65             (short paragraphs, max ~62ch)
  --text-small:   0.875rem  / 1.5

Technical (IBM Plex Mono):
  --text-spec-xl: clamp(2rem, 5vw, 4rem)       (big numbers: "3,000 mm", "8,000 rpm")
  --text-spec:    0.9375rem                    (tables, labels, units)
  --text-label:   0.75rem / +0.12em tracking / uppercase (eyebrows, section indices)
```

Hierarchy pattern for products (canonical example):

```
KMC-425SR-H                       ← display, hero size
Multi-Face Double-Column Machining Center   ← display h3, steel-400
Precision. Rigidity. Productivity.          ← label, accent-tracked
```

Large typography is mandatory for: product names, technical numbers, statistics, section titles, key benefits. Section indices ("01 — INTRODUCTION") in mono label style throughout. Fonts self-hosted `woff2`, subset, `font-display: swap`, display font preloaded.

---

# PART C — TECH STACK & ARCHITECTURE

## C.1 Stack (locked for this project)

| Layer | Choice | Rationale |
|---|---|---|
| Framework | **Next.js 15 (App Router, TypeScript)** | SSG/SSR for SEO-critical multilingual content; route-level code splitting keeps 3D off non-3D pages; matches installed vercel-* skills |
| 3D | **three r170+ via @react-three/fiber + @react-three/drei** | Component model fits the reusable machine framework; drei wires Draco/KTX2/Meshopt decoders |
| Motion | **GSAP 3.12.5 + ScrollTrigger** (via `useGSAP`) | Scroll choreography, pinning, scrubbed timelines |
| Smooth scroll | **Lenis 1.1.0** (`lenis`, not the retired @studio-freight scope) | Owns scroll; synced to `ScrollTrigger.update` |
| Post-processing | three built-in `EffectComposer` passes (or `@react-three/postprocessing` if version-verified against the three release in use) | Bloom, vignette, grain per the locked recipe: UnrealBloom strength ~0.45 / radius 0.4 / threshold 0.82; grain intensity ~0.05, always the final pass |
| Styling | **Tailwind CSS v4 + CSS custom properties** (tokens from Part B) | Design-token driven; no component library skins |
| Content (pilot) | **File-based: JSON + MDX in `/content`, per-locale** | Test-first approach; no CMS dependency for the pilot |
| Content (Phase 2+) | Headless CMS — **Payload CMS** (self-hostable, Next-native) or **Sanity**; decision deferred | Satisfies the admin requirement (§ Part N.4) without blocking the pilot |
| DB (RFQ storage) | **SQLite via Prisma** (pilot) → Postgres when hosted | Deliberately mirrors the KAO MING CRM stack (Next.js/Prisma) so RFQ leads can later flow into the CRM |
| Email | Resend or SMTP (decision at M5) | RFQ notifications |
| i18n | **next-intl**, path-prefix routing | `/en`, `/zh-tw` (Part R) |
| Analytics | GA4 + custom event layer (Part Q) | International traffic segmentation |
| Hosting | **Undecided** — pilot runs locally; demo via free private Vercel preview deploys recommended; kaoming.com untouched until internal approval | `vercel-cli-with-tokens` + `vercel-optimize` skills apply when deploying |
| Testing | Playwright via `webapp-testing` skill | Visual + interaction smoke tests per milestone |

Self-host all decoder files (Draco/Basis/Meshopt) under `/public/decoders/` — no runtime CDN dependency in production. Vendor fonts locally.

## C.2 Repository structure

```
kaoming-web/
├─ app/
│  ├─ [locale]/
│  │  ├─ page.tsx                      # Homepage
│  │  ├─ products/
│  │  │  ├─ page.tsx                   # Product discovery grid
│  │  │  ├─ [category]/page.tsx        # Category listing
│  │  │  └─ [category]/[model]/page.tsx  # THE product experience (Scenes 01–11)
│  │  ├─ applications/[slug]/page.tsx
│  │  ├─ technology/page.tsx
│  │  ├─ company/{about,history,factory,network,sustainability}/page.tsx
│  │  ├─ resources/page.tsx            # Resource center
│  │  ├─ catalogue/[slug]/page.tsx     # Digital catalogue experience
│  │  ├─ case-studies/[slug]/page.tsx
│  │  ├─ compare/page.tsx
│  │  ├─ support/{service,parts,faq,contact,representatives}/page.tsx
│  │  ├─ events/[slug]/page.tsx        # Trade show mode
│  │  └─ rfq/page.tsx
│  └─ api/
│     ├─ rfq/route.ts                  # POST — validate, store, notify
│     └─ search/route.ts
├─ components/
│  ├─ ui/            # Button, Card, Modal, Tabs, Filter, SpecTable, Counter…
│  ├─ sections/      # Hero, MachineShowcase, Timeline, Gallery, VideoBlock, CTA…
│  ├─ three/         # MachineViewer, ScrollScene, ExplodedRig, Hotspot,
│  │                 # CameraRig, PostFX, QualityManager, XRayMaterial
│  └─ catalogue/     # CatalogueShelf, PageTurner, StandardViewer, TOC, CatalogueSearch
├─ lib/              # lenis setup, gsap registration, quality-tier detection,
│                    # analytics, i18n helpers, machine-data loaders, zod schemas
├─ content/
│  ├─ machines/<model>/{en,zh-tw}.json + shared.json
│  ├─ applications/…  ├─ case-studies/…  ├─ history/…
│  ├─ distributors/distributors.json
│  └─ documents/manifest.json          # smart document metadata (Part N.3)
├─ public/
│  ├─ models/<model>/{high,med,low}.glb
│  ├─ decoders/{draco,basis,meshopt}/
│  ├─ img/…  ├─ video/…  ├─ docs/…  └─ fonts/
├─ prisma/schema.prisma                # RFQ leads
└─ messages/{en,zh-tw}.json            # UI strings
```

## C.3 Rendering strategy

- All textual/SEO content is server-rendered HTML (SSG where possible). The 3D canvas is a **progressive enhancement layered on top** — crawlers, reduced-motion users, and low-tier devices get a complete page with photography instead of WebGL.
- One persistent `<Canvas>` per 3D page (never multiple canvases fighting for context). Non-3D routes ship zero three.js bytes (dynamic `import()`).
- First paint never waits for a GLB: hero text + atmospheric CSS background + blurred poster render immediately; the model streams in behind the load sequence (B.1 #7) and cross-fades over the poster.
- `QualityManager` detects device tier at mount (deviceMemory, hardwareConcurrency, UA hints, canvas benchmark) → selects `{high|med|low}.glb`, DPR cap, and post-processing depth. Tier is overridable via a small "quality" toggle in the viewer UI.
- Render on demand where the scene is static (spec sections); full RAF loop only while a 3D scene is active and on-screen (IntersectionObserver-gated).

---

# PART D — DESIGN SYSTEM

Reusable components; the entire site must feel like one system.

**Buttons.** `Primary` (accent fill, dark text on hover invert), `Secondary` (1px steel-600 outline, fills on hover), `Text` (mono label + arrow, underline draws in). All: 150–250ms weighted easing, visible focus ring (2px accent offset), slide micro-interaction, generous hit area (min 44px).

**Cards.** `ProductCard` (the miniature showroom — see F.2), `ApplicationCard`, `NewsCard`, `DocumentCard` (file type, size, language, version badges), `CaseStudyCard`, `DistributorCard`. Cards lift 4–6px on hover with soft shadow, never scale-bounce.

**Sections.** `Hero`, `MachineViewer` (3D), `SpecHighlights` (big-number grid), `SpecTable` (full, virtualized if long), `Timeline`, `Gallery`, `VideoBlock`, `CTABlock`, `SectionHeader` (index + label + title pattern).

**Interactive.** `Hotspot` (3D-anchored marker + panel), `Modal`, `CompareTray` + `CompareTable`, `Tabs`, `Filters`, `LanguageSwitcher`, `SearchOverlay`, `RFQForm`, `FileUpload`.

**Micro-interactions (site-wide vocabulary — used purposefully, never all at once):** buttons slide; product images shift on hover; numbers count up when scrolled into view (`Counter`); machine lighting responds subtly to pointer; cards lift; navigation transitions smoothly; images reveal with a clip-path wipe on scroll; technical hairlines draw themselves (SVG stroke-dashoffset); spec values tick upward in mono. Every animation has a purpose; stillness between moments is deliberate.

**Scroll experience.** The site feels continuous — no hard stop → section → hard stop. Section transitions visually connect: machine → camera moves → component → component becomes workpiece → workpiece becomes application → application becomes customer → customer becomes RFQ. Achieved with shared pinned scenes, cross-fades through `composite-rendering` patterns, and overlapping ScrollTrigger ranges.

---

# PART E — GLOBAL STRUCTURE & NAVIGATION

## E.1 Site map

```
PRODUCTS   (naming per the 2026 catalogues — see /content/machines/_taxonomy.json)
  Gantry Type Machining Centers
      KMC-GM · Gantry Mercury      Intelligent Five-axis      325 / 425 / 525 / 625 GM   ★FLAGSHIP
      KMC-GN · Gantry Neptunus     Box-way gantry             433GN → 1445GN  (18 models)
  Double-Column Machining Centers
      KMC-H7 / H8 · Hephaestus     Box way                    215 → 428  (15 models)
      KMC-H11 · Hephaestus         Box way, extended Z
  Multi-Face Double-Column Centers
      KMC-HA11 · Hephaestus        Multi-face
      KMC-HA14 · Hephaestus        Multi-face, large format   628 → 836 HA14  (6 models)
      KMC-HMA · Minerva            Multi-face (HMA15/HMA11)   318HMA → 536HMA (20 models)
  Vertical Machining Centers
      KMC-CE · Clymene             Direct-drive spindle       115 / 136 / 168 CE
      KMC-CH · Clymene             Geared spindle             116 / 158 CH
  No 2026 catalogue — publish from the current website only, no spec tables:
      Epeius E7 / EU / E8 / E10 · Atlas AS · Caelus CS · Armstrong Series A (radial drills)
      Without-tool-change system machining center (confirm whether it survives)
APPLICATIONS   Aerospace · Automotive · Die & Mold · Energy · Heavy Industry · General Engineering
TECHNOLOGY     Scraping · Box Way vs Linear Way · Spindle · Technical Center · Quality
COMPANY        About · History · Factory (Inside KAO MING) · Global Network · Sustainability
RESOURCES      Catalogues · Brochures · Specifications · Videos · Case Studies · News
SUPPORT        Service · Parts · FAQ · Contact · Global Representatives
```

**Naming architecture (critical).** The 2026 catalogues name every machine by its mythology series and catalogue model code — `KMC-GM · Gantry Mercury` with models 325/425/525/625GM; `KMC-HMA · Minerva` with models 318HMA–536HMA; `KMC-H7 / H8 / H11 / HA11 / HA14 · Hephaestus`; `KMC-CE / CH · Clymene`; `KMC-GN · Gantry Neptunus`. **That is the naming the site uses.** The current site buries these as untranslated Chinese parentheticals (`(升級版Hephaestus系列H7)`) that international visitors cannot read. Legacy `KMC-xx` codes (SD, SV, SR, SR-H, M, RF, G, DV, HIS, V, VL) are kept **only** as invisible search synonyms and 301 redirect sources — buyers still search "KMC-SR" and that equity must not be discarded — but they are never shown as a machine's name or type. Route pattern: `/products/[category]/[series-slug]`, with `/products/kmc-sr` → 301 → the Hephaestus H11 route. Never present a machine under two names in one view, and never use a photo-folder filename as a model code (the archive's `KMC-436HAX.E` is catalogue model `KMC-436HMA`).

**Model code rule (all catalogue series).** First digit(s) = working table length / X travel in metres; next two digits = distance between columns in hundreds of mm; suffix = series. `436HMA` = 4000 mm table, 3600 mm between columns, Minerva. The data loader derives size-variant specs from this rule and inherits the rest from series level.

**Series art direction.** The mythology system is already art-directed on the catalogue covers and should carry into the site: each family owns a signature lighting key — Neptunus oceanic/cold, Mercury bright/aerial, Hephaestus forge/ember, Clymene misty/pale, Atlas/Caelus monumental. This gives the product pages variety without inventing a new visual language per machine.

**Technology section** replaces generic "engineering" copy with KAO MING's actual differentiators, all verified and already written: hand scraping (>20 PPI, 50/50 high-low points, 40% contact ratio); the box-way vs linear-way selection guide (a genuine buyer decision tool — build it as an interactive comparison, not prose); the four named inspection procedures (**Kinematic Measurement · Thermal Drift Test · Geometric Accuracy Inspection · Straightness Measurement**) with third-party validation (PMC test report, Fanuc cutting evaluation — result: Good); force-flow reversed-T structure (+20% rigidity); 70% self-made parts; and the **STAS spindle-temperature system** — warm-up cut from 180 minutes to 30, 70% time saved, 80–87% reduction in thermal-growth effect. STAS is the strongest sustainability story KAO MING has and belongs on both the Technology page and the Sustainability page, with numbers.

## E.2 Header / persistent chrome

- Slim fixed header on dark: wordmark left; PRODUCTS / APPLICATIONS / TECHNOLOGY / COMPANY / RESOURCES / SUPPORT; right side: search icon, language switcher (`ENGLISH ▾` → English / 繁體中文 / 日本語 / Deutsch / 한국어 as phases activate), and the persistent accent CTA **REQUEST A QUOTE**.
- Header background: transparent over heroes → charcoal with blur after 80px scroll. Hides on scroll-down, reveals on scroll-up (Lenis velocity-aware).
- Products opens a full-width mega-panel: category list left, live 3D-render thumbnail of hovered category right.
- Mobile: full-screen overlay menu, staggered link reveal, CTA pinned bottom.
- Footer: 4-column (Products / Company / Resources / Contact + HQ address No. 53, Houke S. Rd., Houli Dist., Taichung 421012, Taiwan, tel/fax), certifications strip, language switcher, legal.

---

# PART F — HOMEPAGE

Communicates in one screen: what KAO MING makes + why it matters + why to keep exploring.

## F.1 Hero

Full-screen cinematic sequence (load beat sheet in B.1 #7):

1. Black → progress line → light-sweep reveal.
2. Machine appears — **pilot uses the flagship 3D model with a slow scripted camera drift** (fallback: graded cinematic video loop, `preload="metadata"`, poster-first; final choice at M2 based on asset quality).
3. Subtle idle life: spindle slowly rotates, a soft light sweeps across painted surfaces every ~12s, faint reflections travel. Never distracting — the machine must feel physical, not animated.
4. Copy stagger:
   ```
   PRECISION ENGINEERED FOR THE WORLD
   Advanced CNC machining solutions from Taiwan.
   [ EXPLORE PRODUCTS ]   [ REQUEST A QUOTE ]
   ```
5. Scroll indicator (thin mono "SCROLL", pulsing line).

## F.2 Machine showcase — "EXPLORE OUR MACHINES"

Large product cards, each a miniature showroom. Card anatomy: dark steel-800 field, machine render/3D snapshot center, model designation top-left in display type, category line, hairline dimension callouts that draw in on hover.

Hover: machine rotates ~6°, camera dollies slightly, background value shifts one step, technical dimensions fade in, **EXPLORE IN 3D →** button appears. On tier-low devices, hover swaps between two pre-rendered angles instead of live 3D.

Only the currently visible card's 3D is live; the rest are static renders (never load every machine's model simultaneously).

## F.3 Remaining homepage flow

Applications band (6 cinematic tiles) → Technology teaser (factory photography + "INSIDE KAO MING →") → **Numbers strip** (counters, sourced from `sales-decks-2022.json` — all figures dated Dec 2022 and must be refreshed before launch: years since 1968, **248+ models**, **30 territories served**, **70% self-made parts**, 40,000 m² of manufacturing) → Latest case study feature → **Global network teaser** — an animated arc from Taiwan out to the 30 known territories, tapping through to the full map → Resource shortcuts → closing CTA **READY TO DISCUSS YOUR PROJECT?**

---

# PART G — THE PRODUCT EXPERIENCE (SCENES 01–11)

The core of the site. One continuous scroll-driven page per machine. Route: `/[locale]/products/[category]/[model]`.

## G.0 Entry transition (card → fullscreen)

Clicking **EXPLORE MACHINE** must not feel like a page load — it feels like *entering* the machine. Implementation: capture the card's viewport rect → FLIP-style expansion of the card frame to fullscreen while the shared 3D scene's camera dollies toward the machine → route swap under the hood (View Transitions API where supported; `composite-rendering` cross-fade fallback) → model persists (same GLB instance handed to the product scene) → title `KMC-XXXX` staggers in. Reverse the same transition on exit (G.11). Direct URL entry (deep link / QR): skip transition, play the standard load sequence.

## G.1 Scene 01 — Machine introduction

Full-screen machine on `--km-black`, cinematic three-point lighting + HDRI reflections, gentle idle rotation (0.02 rad/s). Copy: model designation (hero display type), category line, one-sentence positioning, **EXPLORE** CTA, mono instruction "Scroll to explore". Camera at front-3/4 hero angle.

## G.2 Scene 02 — Interactive 3D

Manual inspection mode. drei `CameraControls`: rotate / zoom / pan with damped inertia; polar angle clamped (no under-floor views), zoom limits [0.6×, 2.5×], double-click focuses a component. Control strip (mono labels): **RESET · EXPLODED VIEW · AUTO ROTATE · FULLSCREEN** (+ QUALITY toggle). Idle 8s → gentle auto-rotate resumes. Machine response is always smooth — inputs lerped, never 1:1.

## G.3 Scene 03 — Scroll-driven rotation

Pinned viewport; scroll scrubs a GSAP timeline that drives the camera along a CatmullRom orbit:

| Scroll | Camera | Synced info card (right/left alternating) |
|---|---|---|
| 0–20% | Front | **HIGH-RIGIDITY STRUCTURE** — short verified copy |
| 20–40% | Front-right 45° | **PRECISION GUIDANCE SYSTEM** |
| 40–60% | Side | **HIGH-PERFORMANCE SPINDLE** |
| 60–80% | Rear | **[4th feature from verified content]** |
| 80–100% | High angle | transition into exploded view |

Info cards: steel-800 panels, mono eyebrow + display headline + ≤2 sentences, connected to the machine by a drawn hairline. Content and count come from `machine.features[]` — the scene adapts to 3–6 features.

## G.4 Scene 04 — Exploded view (the signature)

Scroll-scrubbed disassembly. Each component in the GLB carries an explode vector and order (authored in the model, read from object userData or a JSON rig file):

```
base (anchor, static) → columns separate laterally → crossbeam rises →
saddle/ram forward → spindle head forward-down → table slides out →
enclosure panels fan outward → doors/windows lift → internal assemblies revealed
```

Motion: each component eases along its vector with per-component stagger (`power3.inOut`), total spread ≈ 1.4× machine bounding box. Camera slowly rises and orbits ~30° across the sequence. Feels like a professional disassembly, not an explosion. Reduced-motion: pre-rendered exploded still with labeled callouts.

## G.5 Scene 05 — Component information

At full explosion, floating spec cards appear connected to components by drawn leader lines (premium technical infographic): **SPINDLE — High-performance machining**, **CROSSBEAM — High-rigidity structural design**, **TABLE — Designed for demanding workpieces**, etc. Cards populate from `machine.components[]` (schema in Part N.1). 3–7 cards; staggered reveal as scroll progresses through the held exploded state.

## G.6 Interactive hotspots (available in Scenes 02–05)

Hotspot anchors are named empties in the GLB (`HS_spindle`, `HS_atc`, …) projected to screen space. Marker: 8px accent dot + expanding ring on approach. Hover: component highlights (emissive lift toward `--km-red-glow`, subtle bloom), siblings dim to 40%. Click: side panel opens — component name, verified description, key specs (mono table), optional image/diagram/video. Panel is DOM (accessible), not WebGL text. Keyboard: hotspots are focusable buttons in DOM order; Enter opens panel.

## G.7 X-ray mode & internal layers (Phase 4)

Toggle **X-RAY VIEW**: enclosure materials animate to `transmission`/fresnel-edge shader (see `glsl-shaders`), internals fade in. Layer selector: **STRUCTURE · SPINDLE · AXIS SYSTEM · CONTROL · COOLANT** — each toggles a component group. Where true internal geometry is unavailable, use simplified plausible assemblies **permanently labeled "Conceptual representation — not engineering geometry"** in the panel and on-screen. Build the material/grouping architecture in the pilot; ship the mode only when at least one layer has approved content.

## G.8 Scene 06 — Reassembly

Explode timeline reverses with tightened overlap (reassembly reads slightly faster/more confident than disassembly); camera pulls back; machine reforms. Text over the final beat: **ENGINEERED AS ONE SYSTEM.** Then the scene transitions toward the workpiece — the machine doors close, interior work-light comes up.

## G.9 Scene 07 — Workpiece

Answers "what does this machine actually make?"

- **Pilot implementation:** camera moves to the table; a workpiece model (or billboard of real photography) fades in on the table; tool approaches; material-removal suggested by a shader clip/dissolve on the workpiece; finished part revealed with a light sweep. If workpiece 3D is not ready, use the verified photo sequence with Ken-Burns + wipe transitions inside the 3D frame.
- **Workpiece showcase strip:** cards for 2–4 real KAO MING workpieces — photo, name, material, approximate dimensions, machining requirements, machine used, **EXPLORE APPLICATION →**. All data from `machine.workpieces[]`; photographs are always the authoritative visual (AI-derived renders never presented as dimensionally accurate).

## G.10 Scenes 08–11 — Applications → Specs → Downloads → RFQ

**Scene 08 — Applications.** "WHERE IS IT USED?" Tiles for the relevant industries (Aerospace — large structural components; Automotive — large components and tooling; Energy — large precision components; Die & Mold — complex precision machining; Heavy Industry — large-scale machining). Each links to its application page (Part J.1).

**Scene 09 — Specifications.** Never dump the table first. Big-number grid (mono `--text-spec-xl`, counters):

```
X AXIS 3,000 mm · Y AXIS 2,500 mm · Z AXIS 1,000 mm · SPINDLE 8,000 rpm
```

then **VIEW FULL SPECIFICATIONS** expands the complete verified table (sticky first column, unit-aware — mm/in toggle; table loading units per catalogue convention). A slim **ADD TO COMPARE** control sits here (Part M.2).

**Scene 10 — Downloads.** Document cards from the manifest: Product Brochure / Technical Specifications / Machine Layout / Options / Application Guide — PDF badge, size, language, version; **VIEW** (in-browser) and **DOWNLOAD** buttons. Downloads fire analytics events.

**Scene 11 — RFQ.** **READY TO DISCUSS YOUR PROJECT?** + short statement + embedded RFQ form pre-populated with this machine (full spec Part M.1).

## G.11 Exit

Persistent **← BACK TO PRODUCTS** (top-left, after Scene 01). Triggers the reverse card transition; product grid restores prior scroll position (App Router scroll restoration + stored grid state).

---

# PART H — 3D PIPELINE (NO-CAD WORKFLOW)

CAD files are unavailable and no orbit photo session of an assembled machine is possible. However, for the flagship (**KMC-325GM**) the source material is far better than a worst case: two 8688×5792 near-orthographic product renders (clean front elevation, and a front-right ¾ with the top open showing the table, work zone and KESSLER head), a doors-open interior view, and the catalogue's dimensioned floor-space drawing for scale calibration. All are in `kaoming-content-kit-v2/blueprints/`.

Models are therefore **visual representations** built from dimensioned drawings plus high-resolution renders — never claimed as engineering-accurate; internals not visible in the source material are conceptual and labeled as such (G.7).

The method is **blueprint modeling**: orthographic drawings and the front-elevation render mapped into Blender as modeling planes, with the ¾ render resolving depth and form. A gantry machining center is dominated by large prismatic castings — base, columns, crossbeam, table, enclosure — which this approach produces faster and more accurately than AI photo-reconstruction from limited angles. AI image-to-3D is demoted to an optional reference draft.

## H.1 Pipeline steps (blueprint-first)

```
1  Assets in hand (kit v2): 325GM front elevation (8688x5792), 325GM 3/4 open
   (8688x5792), 325GM doors-open interior, GM floor-space drawing (300 DPI,
   dimensioned), GM machining-range diagram, verified spec JSON.
2  Supplement if available: frame captures from any KAO MING video showing a GM
   (youtube.com/user/kaoming2011), and original marketing image files from the
   communication division.
3  PRIMARY PATH — blueprint modeling: build in Blender over the orthographic
   drawing and front-elevation render at real-world scale (calibrate against a
   printed dimension, e.g. the 9300 mm floor length); model components as
   separate named objects from the start (H.2) rather than cutting a fused mesh.
4  OPTIONAL — AI image-to-3D (Tripo3D / Meshy / Rodin) as a proportional
   reference draft only; never the final asset.
5  Detail pass: KESSLER head, chain ATC, control panel, doors/windows, cabinet,
   coolant/chip conveyor — from the ¾ and interior renders; plausible
   simplification elsewhere.
6  Exploded rig: per-object explode vector + order in custom properties.
7  Materials: glTF PBR metal-rough, using the sampled livery values in Part B.2
   (enclosure blue-grey, casting grey, base casting, KESSLER orange, green LED
   emissive); machined-steel, glass, rubber, plastic set.
8  Export GLB (+Y up, apply modifiers, scale verified against the drawing).
9  Optimize (H.3) → three LOD tiers
10 Load in the MachineViewer with self-hosted decoders
11 Wire hotspots (HS_* empties) + component data records from kmc-gm.json
12 Wire scroll rig (camera path + explode timeline)
13 Performance verification against Part O
```

**Who models it — two viable routes:** (a) a contracted hard-surface 3D artist working from the drawings and renders — a well-scoped, commonly quoted freelance job; get 2–3 quotes with H.2 (naming/rig conventions) attached as the brief; or (b) an in-house Blender build guided step-by-step by Claude. Route (a) is faster to quality; route (b) costs time, not money, and keeps iteration in-house.

**Second-machine note:** the supplied photo archive also contains 9800×7525 and 11024×7165 renders of the Epeius (E7/E8/EU) and Hephaestus (H7/HA11/HAX) machines — including an Epeius render with the enclosure cut away showing the interior. Any of these could be machine two without new photography. The artist brief is preserved in the companion asset checklist (`KAOMING_WEBSITE_ASSET_CHECKLIST.md`, section 5).

## H.2 GLB authoring conventions (contract between artist and code)

Named objects (machine-dependent subset):

```
KM_base · KM_column_L · KM_column_R · KM_crossbeam · KM_saddle · KM_ram
KM_spindle_head · KM_spindle · KM_atc (tool changer) · KM_table
KM_enclosure_[pos] · KM_door_[pos] · KM_window_[pos]
KM_panel_op (operator panel) · KM_cabinet_elec · KM_coolant · KM_chip_conveyor
KM_motor_[axis] · KM_internal_[name]   (conceptual internals)
HS_[component]                          (hotspot empties)
CAM_[scene]_[index]                     (optional authored camera keys)
```

Custom properties per component: `explodeVec` (unit vector), `explodeDist` (m), `explodeOrder` (int), `group` (structure|spindle|axis|control|coolant|enclosure), `conceptual` (bool). Real-world scale (1 unit = 1 m); origin at floor center; +Z facing front.

## H.3 Optimization & LOD tiers

```bash
gltf-transform optimize input.glb high.glb  --compress draco --texture-compress ktx2 --texture-size 2048
gltf-transform optimize input.glb med.glb   --compress draco --texture-compress ktx2 --texture-size 1024
# low tier: additionally simplify geometry (weld/simplify) and strip internals
gltf-transform optimize simplified.glb low.glb --compress draco --texture-compress ktx2 --texture-size 512
gltf-transform inspect high.glb   # verify size, tris, KTX2 present
```

| Tier | Devices | Max triangles | Max GLB (compressed) | Textures |
|---|---|---|---|---|
| HIGH | Desktop dGPU | 350k | 6 MB (hero shell first ≤ 2.5 MB, rest streamed) | 2048 KTX2 |
| MED | Laptops/iGPU | 150k | 3 MB | 1024 KTX2 |
| LOW | Mobile | 60k | 1.5 MB | 512 KTX2; internals stripped |

ETC1S for color maps, UASTC for normal maps. Draco for these static meshes (Meshopt only if animation is baked into the GLB). Deferred loading: a product's model loads only when its route/section demands it.

---

# PART I — DIGITAL CATALOGUE EXPERIENCE

Not a boring PDF viewer. Route: `/[locale]/catalogue/[slug]`.

**I.1 Landing shelf.** Catalogues displayed as physical documents — 3D-looking covers (CSS 3D transform on high-res cover render; true WebGL not required here) on the dark field. Hover: catalogue lifts gently. **OPEN CATALOGUE →**.

**I.2 Opening animation.** Click: cover moves toward viewer → opens → first spread → background darkens into a reading environment. Feels like opening a premium printed engineering catalogue.

**I.3 Immersive mode (desktop default).** Scroll-driven page turning: scroll advances spreads; page curls via a CSS 3D fold (two half-page planes with a highlight gradient) — sufficient realism at a fraction of WebGL cost. Pages are pre-rasterized WebP/AVIF spreads (from the PDF at build time, 2×), lazy-loaded ±2 spreads around the current one.

**I.4 Modes.** **IMMERSIVE** (above) · **STANDARD** (paginated document viewer with thumbnails — also the mobile default, swipe-based, light animation) · **DOWNLOAD PDF**. Reduced-motion forces STANDARD.

**I.5 Interactivity.** Hotzone overlays on machine pages: **Explore in 3D →** deep-links to that model's product experience — the printed-to-digital bridge. Floating TOC (01 Company · 02 Double-Column · 03 5-Axis · … — jumps to page). Search within catalogue ("5-axis", "spindle", "KMC", "table", "X-axis") over a build-time-extracted text index; results list matching pages with thumbnails.

**I.6 Catalogue → RFQ.** **Add to Enquiry** on any machine page accumulates models into the enquiry tray; **REQUEST INFORMATION** opens the RFQ pre-populated with all selected machines.

---

# PART J — SECONDARY EXPERIENCES

**J.1 Application pages** (`/applications/[slug]`): hero image/video → industry challenge → KAO MING solution → recommended machines (cards) → embedded 3D of the primary recommended machine (reuses MachineViewer in showcase mode) → example workpieces → technical info → customer/case study → downloads → RFQ. One template, six industries.

**J.2 Inside KAO MING (factory).** Vertical scroll journey through the process: **ENGINEERING (CAD/design) → CASTING → MACHINING → ASSEMBLY → INSPECTION → TESTING → SHIPPING (global delivery)**. Full-bleed real photography with parallax and wipe reveals; mono step indices; short captions. Real photography only — AI may enhance presentation (grading, cleanup) but must never fabricate or misrepresent the facility.

**J.3 Company history.** Horizontal-scrolling animated timeline (vertical scroll drives horizontal motion, pinned): 1960s establishment → each decade a panel revealing photograph / machine / factory / achievement / product. A thin timeline rule draws itself; years in display type. All milestones from `/content/history` (verified).

**J.4 Global network.** Interactive world map (SVG, brand-styled — not default Google tiles) with region tabs matching KAO MING's own grouping: **AMERICAS · EUROPE AREA · MIDDLE EAST / AFRICA · ASIA · OCEANIA**. The full network is in `content/company/distributors.json` — **41 agents: 32 international across 33 countries, plus 9 Taiwan domestic** — each with company name, URL, address, phone, fax and email. This page can be built complete on day one.

Implementation notes: Canada, Belgium, France, Russia, India, Japan, China and Taiwan each have more than one agent, so a marker must expand to a list rather than a single card. Taiwan records are flagged `"domestic": true` — default to hiding them on `/en` and showing them on `/zh-tw`, subject to sales' decision. Several records expose an individual's personal email or mobile; on the public site prefer the company's general address and phone and route the rest through the RFQ. Every agent card carries a **Request a quote through this representative** action that pre-fills the RFQ with country and agent. CTA: **FIND YOUR LOCAL KAO MING REPRESENTATIVE**. (The record shape deliberately matches the agent registry in the KAO MING CRM project so both can eventually share one source.)

**J.5 Case studies — CUSTOMER SUCCESS.** Template: CUSTOMER (company/industry) → CHALLENGE → SOLUTION (which machine) → PROCESS → RESULT (measurable where available) → interactive 3D machine → workpiece images → machining video.

**J.6 Resource center.** Categories: Catalogues · Brochures · Technical Specifications · Application Guides · Videos · Case Studies · Certifications · Company Materials. Filters: product, industry, document type, language. Cards from the smart-document manifest (Part N.3).

**J.7 Trade show mode.** Event landing template (`/events/[slug]`): **MEET KAO MING AT EMO** — booth number, location/dates, machines demonstrated (cards → 3D pages), videos, appointment booking (mailto/calendar link in pilot), catalogue, contact. After the show the page converts to a permanent archive (`archived: true` flips the layout). **QR system:** every machine page has a stable short URL + generated QR (build script) for booth signage and printed catalogues — scan → that machine's 3D experience opens on the phone (LOW tier, instant).

**J.8 Virtual showroom (Phase 6).** `/showroom` — an exhibition-booth navigator: MACHINES · TECHNOLOGY · FACTORY · APPLICATIONS · CATALOGUES · COMPANY as spatial cards. Design reserved; build only after multiple machines have 3D.

**J.9 AR (future, flagged).** **VIEW MACHINE IN YOUR SPACE** — export a scale-accurate USDZ/GLB for Quick Look / Scene Viewer for factory-floor planning (dimensions, clearance, door access). Requires dimension-verified models; not part of the initial build. Architecture note: keep model real-world scale (H.2) so this costs nothing later.

**J.10 Video system.** Per major machine (as content allows): 01 Product Overview · 02 Machining Demonstration · 03 Technology · 04 Factory · 05 Application. Short, purposeful, compressed (AV1/H.264 ladder), poster-first, `preload="none"`, lazy, captioned. **3D↔video bridge:** button **WATCH MACHINE IN ACTION** — camera zooms toward the spindle → cross-dissolve to real spindle footage → on end, dissolve back to the 3D model at the matching angle. Requires one matched camera angle per video; falls back to a standard lightbox if unmatched.

---

# PART M — CONVERSION SYSTEMS

## M.1 RFQ system (the most important function)

Entry points: product Scene 11, catalogue enquiry tray, application pages, compare page, contact page, persistent header CTA. Selected machine(s) always carry over automatically.

Form fields: PRODUCT (auto-populated, editable multi-select) · COUNTRY (dropdown) · COMPANY · NAME · EMAIL · PHONE · INDUSTRY · APPLICATION · MATERIAL · WORKPIECE SIZE · EXPECTED PRODUCTION · MESSAGE · FILE UPLOAD (drawing / CAD / PDF / image / other — max 25 MB/file, 3 files; extensions whitelist: pdf, step/stp, iges/igs, dwg, dxf, jpg, png, zip).

Behavior: 2-step (contact → project) with progress; zod validation client+server; honeypot + time-trap + rate limit; files stored outside web root; lead persisted via Prisma (`Lead`, `LeadFile`, `LeadMachine` tables) and emailed to sales with a clean summary; localized success state with expected response time. Privacy consent checkbox linking to the privacy page. **Schema deliberately compatible with the KAO MING CRM enquiry model (agents/quotations) — a later webhook posts leads straight into the CRM.**

## M.2 Machine comparison

Compare tray (max 3 machines) persists in localStorage. `/compare`: aligned columns comparing X / Y / Z / table size / spindle / weight / accuracy / options / applications from structured spec data; differences highlightable. CTA per column: **REQUEST QUOTE FOR SELECTED MACHINE**. **Phase-4 premium upgrade:** side-by-side synchronized 3D — all selected machines rotate simultaneously in one canvas (shared camera rig, LOW-tier models to keep budget).

## M.3 Find My Machine (Phase 6)

Guided selector: what are you machining? → size → material → accuracy → axis configuration → production requirements → **RECOMMENDED MACHINE** with match score (rules-based over structured spec data — no ML needed initially) → EXPLORE IN 3D / COMPARE / REQUEST QUOTE.

## M.4 ASK KAO MING assistant (Phase 6, optional)

Chat button; answers only from approved KAO MING documentation (RAG over the document manifest + product database), always linking to product pages; must refuse to invent specifications. Build only with an approved content corpus.

## M.5 Global search

Overlay search across: machine models, categories, applications, specifications, catalogues, documents, news. Build-time index (Fuse.js/pagefind for pilot; server search when CMS lands). Results grouped: Products / Documents / Videos / News.

---

# PART N — CONTENT & DATA MODEL

## N.1 Machine record (`/content/machines/<model>/`)

```jsonc
// shared.json — locale-independent
{
  "id": "kmc-425sr-h",
  "model": "KMC-425SR-H",
  "series": "SR-H",
  "category": "multi-face-double-column",
  "status": "published",
  "hero": { "poster": "...", "video": "..." },
  "models3d": { "high": "...", "med": "...", "low": "...", "rig": "rig.json" },
  "specs": {                       // verified only; units explicit
    "travel": { "x_mm": 4000, "y_mm": 2500, "z_mm": 1000 },
    "columns_distance_mm": 2500,
    "spindle": { "taper": "...", "speed_rpm": 8000, "motor_kw": null },
    "table": { "area_mm": "...", "max_load": { "value": 15, "unit": "t" } },
    "accuracy": { "positioning": "{{TO_BE_VERIFIED}}" },
    "machine": { "weight_t": null, "dimensions_mm": null }
  },
  "options": [ { "id": "atc-60", "name_key": "...", "standard": false } ],
  "components": [                  // powers Scene 05 + hotspots
    { "id": "spindle", "object": "KM_spindle", "hotspot": "HS_spindle",
      "specs": { "speed_rpm": 8000 }, "image": null, "video": null,
      "conceptual": false }
  ],
  "features": [ { "id": "rigidity", "order": 1 } ],   // Scene 03
  "workpieces": [ "wp-001", "wp-002" ],
  "applications": [ "aerospace", "die-mold" ],
  "videos": [ { "type": "overview", "src": "...", "captions": {...},
                "bridgeAngle": "CAM_spindle_01" } ],
  "documents": [ "doc-425srh-brochure-en" ],
  "related": [ "kmc-315sr-h" ]
}
// en.json / zh-tw.json — names, descriptions, feature copy, component copy
```

Model-code intelligence (per KAO MING convention): within a series, the code encodes size — first digit = X travel, next two = distance between columns (e.g., 433/439/445GN share X=4500 with varying Y). Series-constant specs live once at series level; size-variant specs per model. The data loader merges series + model.

## N.2 Other content types

`application`, `caseStudy`, `historyMilestone`, `distributor` (region, country, company, address, website, email, phone, contact person), `event` (trade show), `newsItem`, `workpiece` (name, material, dimensions approx., requirements, machineUsed, photos[]).

## N.3 Smart document manifest

Every downloadable document: `{ id, title, category, product?, industry?, language, version (e.g. "2026"), fileType, sizeMB, path, revisionDate, supersedes? }`. The resource center renders only from this manifest — outdated documents cannot linger unnoticed; a build check warns when `revisionDate` > 24 months old.

## N.4 CMS path (Phase 2+)

Pilot is file-based (fast, versioned, zero infra — matches the test-first approach). When the pilot is validated, migrate content collections into **Payload CMS** (or Sanity) so admins can update products, specifications, images, videos, catalogues, documents, applications, news, distributors, languages, and case studies without a developer. 3D models are replaceable by uploading new GLBs + rig.json — never a site rebuild. Schema above is designed to map 1:1 into CMS collections.

---

# PART O — PERFORMANCE BUDGET (HARD LIMITS)

Written down here so it cannot be silently blown.

**Core Web Vitals (75th percentile, field):** LCP < 2.5s (target 1.8s — first paint is text/poster, never the GLB) · INP < 200ms · CLS < 0.1 (all media has explicit dimensions).

**Weight:** initial JS per route < 300 KB compressed; three/r3f chunk loads only on 3D routes via dynamic import; GLB budgets per H.3; images AVIF/WebP with `srcset`, lazy below fold; fonts subset woff2, one preloaded; video `preload="none"` + poster; analytics deferred.

**Runtime:** 60fps desktop / 30fps floor on mid-tier Android (test throttled in DevTools + one real device); long tasks < 50ms; zero per-frame allocations; raycast ≤ 30Hz against registered meshes only; draw calls: dozens, not thousands (shared materials, merged static geometry); render-on-demand for static 3D; pause RAF when canvas off-screen or tab hidden.

**Degradation ladder when a scene misses frame budget:** drop grain pass → drop bloom → reduce DPR step (2 → 1.5 → 1.25) → swap to lower LOD → swap scene to static render. Automated via `QualityManager` rolling-FPS watchdog.

**Verification gates (every milestone):** Lighthouse ≥ 85 desktop / ≥ 70 mobile; `gltf-transform inspect` on every model in CI; `web-vitals` field beacon in production; `stats.js` + `renderer.info` in dev overlay.

---

# PART P — ACCESSIBILITY & REDUCED MOTION

- Full keyboard navigation: viewer controls, hotspots (focusable, Enter opens), catalogue paging (arrow keys), menus, forms. Visible focus states everywhere.
- All information available as text: every 3D scene has a DOM equivalent (feature copy, component list, spec tables are real HTML — the 3D is illustration, not the sole carrier).
- Alt text for all imagery; captions/subtitles for all videos; contrast AA on both dark and light systems (steel-400 on charcoal passes for large text only — body text uses paper/off-white).
- `prefers-reduced-motion`: disable scroll-driven rotation, exploded scrub, page-turn, parallax, auto-movement, counters; replace with static renders (hero still, labeled exploded still, standard scrolling, simple opacity transitions). The site remains fully usable and complete.
- Reduced-data / no-WebGL fallback: photography-based product page (already exists as the SSR layer).
- Language switcher and all controls labeled; forms with proper labels, error text, and ARIA live regions.

---

# PART Q — ANALYTICS & SUCCESS METRICS

**Event taxonomy (GA4 custom events):** `product_viewed`, `3d_opened`, `3d_interacted`, `exploded_started`, `component_clicked`, `xray_opened`, `catalogue_opened`, `catalogue_page_viewed`, `catalogue_search`, `pdf_downloaded {doc_id}`, `video_started/completed {video_id}`, `application_viewed`, `compare_created`, `compare_machine_added`, `rfq_started {source}`, `rfq_submitted {machines[]}`, `qr_entry {model}`, `language_switched`, `distributor_viewed {country}`.

**Dashboards / success metrics:**
- BUSINESS — RFQs, qualified leads, distributor enquiries, catalogue downloads, sales enquiries.
- ENGAGEMENT — product exploration depth, 3D interaction rate, exploded-view completion, video completion, application views, time on product pages.
- INTERNATIONAL — visitors by country, language usage, regional enquiries, distributor searches.

The redesign is judged by these numbers, not by appearance.

---

# PART R — INTERNATIONALIZATION & SEO

**Locales:** Phase 1 `/en` + `/zh-tw` · Phase 5 `/ja`, `/de`, `/ko` · Phase 6 further markets. Path-prefix routing, locale-aware metadata, `hreflang` alternates + `x-default`, localized sitemaps. Language selector global (header + footer). **Professional translation for technical terminology — machine translation is never shipped for spec or product copy**; UI strings in `messages/*.json`, content per-locale files with fallback-to-English flagged in dev.

**SEO:** SSG for all product/application/technology/distributor/case-study/resource pages; unique titles/descriptions per locale; schema.org `Organization`, `Product` (with `additionalProperty` for specs), `BreadcrumbList`, `VideoObject`, `Event` (trade shows); clean semantic HTML beneath the 3D layer; OG images per machine (rendered hero angle); target terms per market — "double column machining center", "gantry machining center", "5 axis machining center", "large CNC machining center", "heavy duty machining center", "Taiwan machining center manufacturer" + professionally localized equivalents; internal linking: application ↔ machine ↔ case study ↔ resource.

---

# PART S — ROADMAP & BUILD PLAN

## S.1 Product phases (business view)

- **PHASE 1 — FOUNDATION:** new visual design, homepage, navigation, product page redesign (photo-based), mobile, EN/zh-TW architecture, resource center, RFQ, SEO foundation.
- **PHASE 2 — CONTENT:** new photography, product videos, factory photography, application pages, case studies, global network, company history, better catalogues.
- **PHASE 3 — 3D:** first flagship model, interactive viewer, rotation, zoom, hotspots, scroll animation, exploded view. **One machine only.**
- **PHASE 4 — ADVANCED 3D:** internal visualization/x-ray, component animation, workpiece animation, multiple machines, 3D comparison, product configuration.
- **PHASE 5 — INTERNATIONAL:** ja/de/ko, international SEO, distributor landing pages, regional content.
- **PHASE 6 — ADVANCED DIGITAL SALES:** Find My Machine, AI assistant, advanced configurator, AR, digital showroom, **CRM integration** (RFQ webhook into the KAO MING CRM), personalized recommendations.

## S.2 Claude Code build milestones (execution view)

Each milestone ends with the webapp-testing smoke pass + the Part O gates.

| # | Milestone | Contents | Done when |
|---|---|---|---|
| M0 | Scaffold | Next.js 15 + TS + Tailwind tokens + fonts + Lenis/GSAP setup + i18n routing + layout chrome (header/footer/menu) | Both locales render; Lighthouse ≥ 95 on empty pages |
| M1 | Design system + static pages | Part D components; homepage (photo/video hero fallback); product grid; category pages; photo-based product template; resource center; contact/support | Full Phase-1 site browsable without any WebGL |
| M2 | RFQ + data layer | Content loaders, machine schema, Prisma lead store, RFQ form + email, compare (table version), search, analytics events | A pre-populated RFQ lands in DB + inbox from every entry point |
| M3 | 3D viewer core | Canvas architecture, QualityManager, GLB loading (self-hosted decoders), lighting/HDRI/post chain, Scene 01–02 (intro + manual inspection) with the flagship model | 60fps desktop / 30fps mobile with the real model; load sequence per B.1 |
| M4 | Scroll choreography | Lenis+ScrollTrigger pinned scenes, camera path (Scene 03), card→fullscreen transition, feature cards | Scrubbing is smooth and framerate-independent both directions |
| M5 | Exploded system | Explode rig reader, Scene 04–06 (explode/components/reassembly), hotspots + panels | The signature moment works with keyboard + reduced-motion variants |
| M6 | Product experience complete | Scenes 07–11 (workpiece, applications band, specs, downloads, RFQ embed), exit transition, QR deep-links | Full canonical journey A.2 works end-to-end on the flagship |
| M7 | Catalogue + secondary pages | Catalogue experience (I), factory, history, network map, case studies, applications, trade-show template | Every route in E.1 live in both locales |
| M8 | Hardening & launch | Accessibility audit (web-design-guidelines), perf audit (web-perf-budget, vercel-optimize), SEO/schema/OG, field vitals, deploy (vercel-cli-with-tokens) | Part O gates green in production; analytics dashboards receiving |

Phase 4–6 features (x-ray layers, 3D compare, Find My Machine, assistant, showroom, AR, CRM webhook) are separate post-launch work orders reusing this architecture.

## S.3 Flagship pilot rule

Do **not** build the 3D system for every machine. **Flagship selected: KMC-325GM** (GM series, Gantry Mercury). Rationale: the catalogue's GM floor-space drawing corresponds to the 325GM footprint, its full spec column is verified, and GM models differ only in X-length — so the 425/525/625GM 3D variants derive from the 325GM build by stretching X-direction segments (base, table, enclosure). One build yields four machines. Blueprints and structured spec data are already extracted into `kaoming-content-kit`. Build the complete experience (Hero → 3D → Rotation → Exploded → Components → Reassembly → Workpiece → Applications → Specifications → Catalogue → RFQ), test it, then reuse the framework: every additional machine = model + rig + content only.

---

# APPENDIX 1 — FINAL EXPERIENCE STATEMENT

The new KAO MING website should feel like entering a physical KAO MING showroom from anywhere in the world. A visitor should be able to walk around the machine, look inside it, understand its components, see it working, see what it produces, understand its applications, read the technical specifications, open the catalogue, compare machines — and finally talk to a KAO MING representative.

The visitor should feel, in order: *"This company builds serious machines." → "These machines are technically sophisticated." → "I understand how this machine works." → "I can see what it can produce." → "This machine could solve my manufacturing problem." → "I want to talk to KAO MING."*

The website becomes an extension of the engineering itself.

**Precise. Interactive. Technical. International. Premium.**

# APPENDIX 2 — OPEN DECISIONS (RESOLVE BEFORE THE MARKED MILESTONE)

| Decision | Needed by | Options |
|---|---|---|
| Flagship machine for pilot | M3 | **RESOLVED: KMC-325GM** — blueprints + verified specs extracted (`kaoming-content-kit`); 425/525/625GM variants via X-stretch |
| Source-material constraint | M3 | **RESOLVED for GM/GN:** blueprint pages + full 22-model spec tables extracted from the catalogue. Still wanted: original marketing renders, GN/GM video frames. Bow Way catalogue is a scan — transcribe its 5 spec spreads when Bow Way pages are scheduled |
| Exact brand red + logo files | M0 | **RESOLVED:** CIS logo supplied; brand red #B61B31, brand blue #64A9DA, wordmark ink #2B2925 (Part B.2) |
| Machine livery Pantone/RAL | M3 | Sampled from renders (Part B.2); confirm official paint spec with production |
| Display font licensing | M0 | PP Neue Machina (license) vs Space Grotesk (free) |
| Hosting | Launch | **Deferred (undecided).** Interim: run locally + private Vercel preview for demos; kaoming.com untouched until approval — mirrors the CRM test-first approach |
| Final product taxonomy + public model list | M1 | **DRAFTED** in `_taxonomy.json` from kaoming.com — confirm with sales which naming is customer-facing per market, and whether Without-Tool-Change survives |
| Legacy URL redirect map | M1 | 301s from every current kaoming.com product URL to its new series route (SEO equity) |
| History milestone year↔event pairing | M7 | 10 years and 10 events captured verbatim; the Wix carousel scrambled the pairing — confirm with KAO MING |
| RFQ recipient inbox(es) + privacy policy text | M2 | Sales team decision |
| Hero: live 3D vs cinematic video | M3 | Based on model quality vs footage quality |
| 3D modeling route | M3 | Contracted hard-surface artist from drawings+renders (get 2–3 quotes, H.2 as brief) vs in-house Claude-guided Blender build |
| CMS selection | Phase 2 | Payload vs Sanity vs stay file-based |
