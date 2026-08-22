"""Verifies the deployed GitHub Pages preview, not a local build.

    python tests/pages-live.py

The Pages build is a reduced site served from a subdirectory, so this checks
the things that reduction could plausibly have broken and that no local run can
prove: `basePath` reaching every `/public` asset (images, fonts, decoders), the
3D still mounting when fetched over the network, and the enquiry form saying
honestly that it cannot be submitted.
"""

import sys

from playwright.sync_api import sync_playwright

# Titles and notices are printed in both locales; the Windows console is cp1252.
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = "https://notdeepan.github.io/kaoming-website"
GL_ARGS = ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"]

ROUTES = [
    "/en/",
    "/zh-tw/",
    "/en/products/",
    "/en/products/gantry-machining-center/kmc-gm/",
    "/en/catalogue/clymene-2026-en/",
    "/en/company/network/",
    "/en/news/",
    "/en/news/emo-hannover-2023/",
    "/en/company/history/",
    "/en/company/sustainability/",
]

results = []


def check(name, ok, detail=""):
    results.append((name, ok, detail))


with sync_playwright() as p:
    browser = p.chromium.launch(args=GL_ARGS)
    page = browser.new_page(viewport={"width": 1440, "height": 900})

    failures = []
    page.on(
        "response",
        lambda r: failures.append(f"{r.status} {r.url}") if r.status >= 400 else None,
    )

    for route in ROUTES:
        failures.clear()
        page.goto(BASE + route, wait_until="load", timeout=90_000)
        page.wait_for_timeout(1500)
        broken = page.evaluate(
            "() => [...document.querySelectorAll('img')]"
            ".filter(i => i.complete && i.naturalWidth === 0).map(i => i.currentSrc).slice(0,3)"
        )
        check(f"{route} renders", bool(page.title()), page.title()[:48])
        check(f"{route} no 4xx/5xx", not failures, "; ".join(failures[:2]))
        check(f"{route} images load", not broken, "; ".join(broken))

    # Fonts are the asset class basePath most easily strands: their URLs live in
    # CSS, where no source-side helper can reach them.
    page.goto(BASE + "/en/", wait_until="load", timeout=90_000)
    loaded = page.evaluate(
        "async () => { await document.fonts.ready;"
        " return [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family); }"
    )
    check("self-hosted faces load", "KM Display" in loaded, str(sorted(set(loaded))[:4]))

    # The 3D, over the network, from a subdirectory.
    page.goto(
        BASE + "/en/products/gantry-machining-center/kmc-gm/",
        wait_until="load",
        timeout=120_000,
    )
    page.mouse.wheel(0, 1200)
    try:
        page.wait_for_selector("canvas", timeout=60_000)
        canvas = True
    except Exception:
        canvas = False
    check("canvas mounts on the deployed build", canvas)

    if canvas:
        page.wait_for_timeout(8000)
        check("scene probe reports a camera", bool(page.evaluate("() => !!window.__kmScene")))

    # The static build must say the enquiry cannot be sent rather than fail.
    page.goto(BASE + "/en/rfq/", wait_until="load", timeout=90_000)
    notice = page.locator("[data-static-notice]").first
    check(
        "RFQ states it cannot be submitted here",
        notice.count() > 0,
        notice.inner_text()[:60] if notice.count() else "",
    )

    # Appendix 2 — not crawlable under KAO MING's name before approval.
    page.goto(BASE + "/robots.txt", timeout=60_000)
    body = page.inner_text("body")
    check("robots.txt disallows everything", "Disallow: /" in body, body.strip()[:48])

    browser.close()

width = max(len(n) for n, _, _ in results)
for name, ok, detail in results:
    print(f"{'PASS' if ok else 'FAIL'}  {name.ljust(width)}  {detail}")
print(f"\n{sum(1 for _, ok, _ in results if ok)}/{len(results)} passed")
sys.exit(0 if all(ok for _, ok, _ in results) else 1)
