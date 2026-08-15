# KAO MING INTERNATIONAL WEBSITE — project rules

Read `KAOMING_WEBSITE_MASTER_SPEC.md` in full before writing any code. It is the
single source of truth for this build. This file is the short version of the
rules that must survive every session.

## Source authority — absolute

Machine names, types, model codes and every machine specification come from
`_kit/content/` only. That data was transcribed from KAO MING's **2026
catalogues** and the current kaoming.com, and nothing else is a source.

- `_kit/content/machines/_taxonomy.json` — read this first. Naming policy,
  category structure, and which series have no 2026 catalogue.
- `_kit/content/machines/*.json` — verified per-series machine data.
- `_kit/content/company/company.json` — company facts from kaoming.com.
- `_kit/images/_manifest.json` — every machine photo, mapped to its catalogue
  model code, view and best use. **Image filenames ARE catalogue model codes** —
  never re-derive a model code from a source filename.
- `_kit/catalogues/` — the three 2026 source PDFs. Rasterize spreads at build
  time for the catalogue experience (Part I) and serve as downloads (Scene 10).
- `_kit/blueprints/` — 3D modeling references. Not for display.
- `_kit/factory/` — factory and global-network imagery.
- `_kit/reference/` — **background only. Never publish anything from here.**
  It exists so you understand the business, not so you can quote it.

Anything reaching a product page that is not traceable to `_kit/content/` is a
defect. Never invent a specification. Where data is genuinely missing, render
`{{TO_BE_VERIFIED}}` visibly in dev and hide the field in production.

## Naming

Use the 2026 catalogue naming: `KMC-GM · Gantry Mercury`, `KMC-GN · Gantry
Neptunus`, `KMC-H7 / H8 / H11 / HA11 / HA14 · Hephaestus`, `KMC-HMA · Minerva`,
`KMC-CE / CH · Clymene`.

Legacy codes (KMC-SD, SV, SR, SR-H, M, RF, G, DV, HIS, V, VL) are **invisible
search synonyms and 301 redirect sources only** — never a machine's displayed
name or type. Never show one machine under two names in the same view. Never use
a photo filename as a model code.

## Skills — read before you build, not after

Part 0.2 of the spec maps work to skills. The short version:

| Work | Read first |
|---|---|
| Scaffold, React architecture | `vercel-react-best-practices`, `vercel-composition-patterns`, `gsap-react` |
| Visual/aesthetic decisions | `art-direction-immersive`, `frontend-design` |
| Scroll choreography | `gsap-scrolltrigger`, `gsap-timeline`, `gsap-core` |
| 3D scene, models, materials | `r3f-fundamentals`, `r3f-loaders`, `r3f-materials`, `r3f-lighting`, `3d-asset-pipeline` |
| Exploded view, hotspots | `r3f-animation`, `r3f-interaction`, `composite-rendering` |
| Performance passes | `web-perf-budget`, `gsap-performance`, `vercel-optimize` |
| Accessibility / UI audit | `web-design-guidelines` |
| Browser testing | `webapp-testing` |
| Deployment | `vercel-cli-with-tokens` |

If a listed skill is not installed, say so rather than improvising.

## Build one milestone at a time

Part S.2 defines milestones M0–M8, each with an acceptance gate. Build the
milestone asked for, stop at its gate, and report against the gate. Do not run
ahead into the next milestone.

M0–M2 need no 3D assets and can be built today. M3 is the first milestone that
requires the KMC-325GM model.

## Hard rules that are easy to forget

- Performance budgets in Part O are limits, not targets. If a visual idea and
  the budget conflict, degrade the visual.
- Lenis owns scroll; ScrollTrigger reads from Lenis. No `scroll-behavior: smooth`.
- No `metalness > 0` without an environment map. ACESFilmic tone mapping,
  sRGB output, pixel ratio capped at 2 (1.5 on mobile).
- All GLBs Draco-compressed with KTX2 textures; decoders self-hosted under
  `/public/decoders/`. No raw exports in `/public`.
- `prefers-reduced-motion` gets the calm variant. Not optional.
- Every 3D scene has a DOM equivalent — the 3D is illustration, never the sole
  carrier of information.
- Brand assets: use `_kit/brand/KMC_CIS_Final_20240108_LOGO.png` as supplied.
  No redraw, no recolor. Tokens in `_kit/brand/brand-tokens.css`.
- Never publish a third-party partner logo or named cooperation claim. One
  legacy deck contains one; it does not go on the site.
