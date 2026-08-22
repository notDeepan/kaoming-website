"""The two things that make this site slow on an office PC, verified.

    python tests/perf-guards.py

Reported symptom: the site is laggy on a weak office desktop. Two causes, both
of which the code used to get wrong, and neither of which any existing test
covered.

  1. The 3D tier was chosen from `deviceMemory` and `hardwareConcurrency` — CPU
     facts — while the whole 3D budget is spent on the GPU. A typical office
     desktop reports eight cores and eight gigabytes and therefore scored HIGH
     while drawing through Intel integrated graphics. `isWeakGpu` now caps it.

  2. Lenis moves the document and re-runs ScrollTrigger against every trigger on
     every frame. On four cores that is the difference between scrolling and
     stuttering, so `detectLowPower` drops those machines onto native scroll —
     without setting `reducedMotion`, which would flatten the choreography for
     everyone who merely has a slow computer.

Both are measured by lying to the page about the machine and checking what it
does, which is the only way to test hardware adaptation on one machine.
"""

import sys

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = "http://localhost:3000"
GL_ARGS = ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"]
PRODUCT = "/en/products/gantry-machining-center/kmc-gm"

results = []


def check(name, ok, detail=""):
    results.append((name, ok, detail))


# Chromium reports 8 by default here, so a "capable" machine needs no faking;
# a weak one does. `deviceMemory` is not writable, so both are redefined.
def spoof(cores, memory):
    return f"""
    Object.defineProperty(navigator, 'hardwareConcurrency', {{ get: () => {cores} }});
    Object.defineProperty(navigator, 'deviceMemory', {{ get: () => {memory} }});
    """


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=GL_ARGS)

    # --- Lenis is gated on the CPU, and only on the CPU.
    for label, cores, memory, expect_smooth in (
        ("capable", 8, 8, True),
        ("four-core", 4, 8, False),
        ("low-memory", 8, 4, False),
    ):
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        context.add_init_script(spoof(cores, memory))
        page = context.new_page()
        page.goto(f"{BASE}/en", wait_until="load", timeout=60_000)
        page.wait_for_timeout(900)

        smooth = page.evaluate("() => document.documentElement.classList.contains('lenis')")
        check(
            f"{label} machine: smooth scroll {'on' if expect_smooth else 'off'}",
            smooth == expect_smooth,
            f"lenis={smooth}",
        )

        # The calm variant is a stated preference, not a consequence of slow
        # hardware. A low-power machine must still pin and scrub.
        page.goto(f"{BASE}/en/company/history", wait_until="load", timeout=60_000)
        page.wait_for_timeout(600)
        pinned = page.evaluate(
            "() => { const s = document.querySelector('[data-timeline]');"
            " return s ? s.className.includes('h-svh') : null; }"
        )
        check(f"{label} machine: the timeline still pins", pinned is True, str(pinned))
        context.close()

    # --- The GPU caps the 3D tier regardless of what the CPU claims.
    # Headless Chromium renders through SwiftShader, which `isWeakGpu` matches,
    # so a page claiming sixteen cores and thirty-two gigabytes must still not
    # come up at the HIGH tier.
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    context.add_init_script(spoof(16, 32))
    page = context.new_page()
    page.goto(f"{BASE}{PRODUCT}", wait_until="load", timeout=90_000)
    page.wait_for_timeout(1200)
    page.mouse.wheel(0, 1400)
    page.wait_for_timeout(2500)

    renderer = page.evaluate(
        """() => { const c = document.createElement('canvas');
             const gl = c.getContext('webgl2') || c.getContext('webgl');
             if (!gl) return null;
             const i = gl.getExtension('WEBGL_debug_renderer_info');
             return i ? gl.getParameter(i.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); }"""
    )
    check("the renderer name is readable", bool(renderer), str(renderer)[:52])

    section = page.locator("section[data-quality-tier]").first
    tier = section.get_attribute("data-quality-tier") if section.count() else None
    if tier is None:
        # The tier is not always surfaced as an attribute; fall back to the step,
        # which is. Either is enough to show the ladder did not start at full
        # quality on a software renderer.
        step = page.locator("section[data-quality-step]").first.get_attribute("data-quality-step")
        check("a software renderer does not stay at full quality", step != "full", str(step))
    else:
        check("a software renderer is not given the HIGH tier", tier != "high", str(tier))

    context.close()
    browser.close()

width = max(len(name) for name, _, _ in results)
for name, ok, detail in results:
    print(f"{'PASS' if ok else 'FAIL'}  {name.ljust(width)}  {detail}")
print(f"\n{sum(1 for _, ok, _ in results if ok)}/{len(results)} passed")
sys.exit(0 if all(ok for _, ok, _ in results) else 1)
