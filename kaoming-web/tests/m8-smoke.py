"""M8 acceptance smoke pass — hardening.

    npm run build && npm run start
    python tests/m8-smoke.py

Lighthouse already scores accessibility 100 on every route, and that is worth
exactly what it is worth: it checks contrast, names and roles. It cannot press
Tab. Part P asks for full keyboard navigation, a calm variant under reduced
motion, and every piece of information available as text — so that is what this
measures, along with the Part R search surface and the Part O field beacon.
"""

import json
import re
import sys
import urllib.request

from playwright.sync_api import sync_playwright


def open_pane(page, pane):
    """Open one pane of the machine window.

    A series is a window now, not a page you scroll: the web of figures is the
    opening pane, and the specification, the 3D view and the photographs are the
    others. Content that used to be a section further down the page is a tab
    away, so a test that wants it has to ask for it. Nothing here relaxes what is
    then asserted.
    """
    tab = page.locator(f"[data-pane='{pane}']")
    if tab.count() == 0:
        return False
    tab.first.click()
    page.wait_for_timeout(600)
    if pane == "viewer":
        # The model is fetched when the pane opens. Wait for the machine to be
        # on screen rather than for a fixed number of milliseconds.
        try:
            page.wait_for_selector("[data-viewer-ready='true']", timeout=45_000)
            page.wait_for_timeout(700)
        except Exception:
            pass
    return True


BASE = "http://localhost:3000"
GL_ARGS = ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"]
results = []


def check(name, ok, detail=""):
    results.append((name, ok, detail))


def fetch(path, follow=True):
    request = urllib.request.Request(f"{BASE}{path}", method="GET")
    opener = (
        urllib.request.build_opener()
        if follow
        else urllib.request.build_opener(NoRedirect())
    )
    return opener.open(request)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args):  # noqa: D102
        return None


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=GL_ARGS)

    # ================================================== Part P — keyboard
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.goto(f"{BASE}/en/products/gantry-machining-center/kmc-gm")
    page.wait_for_load_state("networkidle")

    # Tab from the top: the skip link must be the first stop, and it must work.
    page.keyboard.press("Tab")
    first = page.evaluate("() => document.activeElement.textContent.trim()")
    check("the first tab stop is the skip link", "skip" in first.lower(), first)

    page.keyboard.press("Enter")
    page.wait_for_timeout(200)
    check(
        "the skip link reaches the main content",
        page.evaluate("() => window.location.hash") == "#main",
    )

    # Every interactive control must show focus. A control with no visible focus
    # ring is unusable by anyone navigating with a keyboard.
    unfocusable = page.evaluate(
        """() => {
          const bad = [];
          const controls = [...document.querySelectorAll('a[href], button:not([disabled]), input, select, textarea')]
            .filter((el) => el.offsetParent !== null)
            .slice(0, 60);
          for (const el of controls) {
            el.focus();
            const style = getComputedStyle(el);
            const ring = style.outlineWidth !== '0px' || style.boxShadow !== 'none'
              || getComputedStyle(el, ':focus-visible').outlineWidth !== '0px';
            if (!ring) bad.push(el.tagName + '.' + String(el.className || '').slice(0, 40));
          }
          return bad;
        }"""
    )
    check("every visible control takes a focus ring", not unfocusable, str(unfocusable[:3]))

    # Part P: hotspots focusable, Enter opens. Measured properly at M5; this is
    # the regression guard now that four more milestones sit on top of it.
    # The component list is in the window's 3D pane, and the control is the
    # button inside the card.
    open_pane(page, "viewer")
    page.wait_for_timeout(2000)
    page.evaluate("document.querySelector('[data-component-card] button').focus()")
    page.keyboard.press("Enter")
    page.wait_for_timeout(300)
    check(
        "hotspots still open from the keyboard",
        page.evaluate("() => document.activeElement.getAttribute('aria-expanded')") == "true",
    )
    page.close()

    # Catalogue paging by arrow key (Part P).
    reader = browser.new_page(viewport={"width": 1440, "height": 900})
    reader.goto(f"{BASE}/en/catalogue/clymene-2026-en")
    reader.wait_for_load_state("networkidle")
    reader.wait_for_timeout(400)
    reader.keyboard.press("ArrowRight")
    reader.wait_for_timeout(400)
    check("the catalogue pages with arrow keys", reader.inner_text("[data-current-page]") == "2")
    reader.keyboard.press("End")
    reader.wait_for_timeout(400)
    check("End reaches the last spread", reader.inner_text("[data-current-page]") == "14")
    reader.close()

    # ============================================ Part P — reduced motion
    calm = browser.new_context(viewport={"width": 1440, "height": 900}, reduced_motion="reduce")

    rm = calm.new_page()
    rm.goto(f"{BASE}/en/company/history")
    rm.wait_for_load_state("networkidle")
    rm.wait_for_timeout(800)
    check(
        "the history timeline is not pinned under reduced motion",
        rm.evaluate("() => getComputedStyle(document.querySelector('[data-timeline]')).position")
        != "fixed",
    )
    check("and all ten years are readable", rm.locator("[data-year]").count() == 10)

    rm.goto(f"{BASE}/en/company/factory")
    rm.wait_for_load_state("networkidle")
    rm.wait_for_timeout(800)
    steps = rm.locator("[data-factory-step]").count()
    check("the factory journey is complete under reduced motion", steps == 4, f"{steps} steps")

    rm.goto(f"{BASE}/en/catalogue/clymene-2026-en")
    rm.wait_for_load_state("networkidle")
    rm.wait_for_timeout(600)
    check(
        "the catalogue forces standard mode under reduced motion",
        rm.locator("[data-mode='immersive']").first.is_disabled(),
    )
    rm.close()
    calm.close()

    # ================================== Part P — information as text, always
    blind = browser.new_context(
        viewport={"width": 1440, "height": 900}, java_script_enabled=False
    )
    nojs = blind.new_page()
    nojs.goto(f"{BASE}/en/products/gantry-machining-center/kmc-gm")
    body = nojs.inner_text("body")
    for value in ("HSK-A100", "KESSLER 2-Axis Head", "KMC-325GM"):
        check(f"'{value}' is readable with JavaScript off", value in body)
    nojs.close()
    blind.close()

    # Alt text on every image the site renders.
    audit = browser.new_page(viewport={"width": 1440, "height": 900})
    missing_alt = []
    for path in ("/en", "/en/products", "/en/company/factory", "/en/catalogue",
                 "/en/products/gantry-machining-center/kmc-gm"):
        audit.goto(f"{BASE}{path}")
        audit.wait_for_load_state("networkidle")
        found = audit.evaluate(
            """() => [...document.querySelectorAll('img')]
                 .filter((img) => !img.alt && img.getAttribute('alt') === null)
                 .map((img) => img.currentSrc.split('/').pop().slice(0, 40))"""
        )
        missing_alt.extend(found)
    check("every image carries alt text", not missing_alt, str(missing_alt[:3]))

    # ===================================================== Part R — the SEO surface
    audit.goto(f"{BASE}/en/products/gantry-machining-center/kmc-gm")
    audit.wait_for_load_state("networkidle")

    schemas = audit.evaluate(
        """() => [...document.querySelectorAll('script[type="application/ld+json"]')]
             .map((node) => JSON.parse(node.textContent))"""
    )
    types = [schema.get("@type") for schema in schemas]
    check("Organization schema is present", "Organization" in types, str(types))
    check("Product schema is present", "Product" in types, str(types))
    check("BreadcrumbList schema is present", "BreadcrumbList" in types, str(types))

    product = next(schema for schema in schemas if schema.get("@type") == "Product")
    properties = product.get("additionalProperty", [])
    check(
        "the specification is published as additionalProperty",
        len(properties) >= 10,
        f"{len(properties)} properties",
    )
    check(
        "and carries transcribed values",
        any(entry["value"] == "HSK-A100" for entry in properties),
    )
    # KAO MING publishes no prices and no reviews; claiming either would be
    # structured data this site invented.
    check(
        "no invented offers or ratings",
        "offers" not in product and "aggregateRating" not in product,
    )
    check(
        "legacy codes stay searchable but unshown",
        "KMC-GM" in str(product.get("alternateName", []))
        and "KMC-SR" not in audit.inner_text("body"),
    )

    # hreflang, both directions, plus x-default.
    alternates = audit.evaluate(
        """() => [...document.querySelectorAll('link[rel="alternate"]')]
             .map((node) => [node.hreflang, node.href])"""
    )
    # BCP-47, not the route segment: Traditional Chinese as used in Taiwan is
    # `zh-Hant-TW`. `/zh-tw` is a URL; `zh-tw` is not a language tag.
    langs = {entry[0] for entry in alternates}
    check("hreflang covers both locales", {"en", "zh-Hant-TW"} <= langs, str(langs))
    check("and declares x-default", "x-default" in langs, str(langs))
    check(
        "each alternate points at its own locale",
        all(
            (tag == "en" and "/en/" in href)
            or (tag == "zh-Hant-TW" and "/zh-tw/" in href)
            or tag == "x-default"
            for tag, href in alternates
        ),
        str(alternates[:2]),
    )

    audit.close()
    browser.close()

# ------------------------------------------------------- server-side checks

# The legacy 301s. A buyer following a ten-year-old link to KMC-SR must land on
# the machine that replaced it, not on a 404.
for code, expected in (("kmc-sr", "kmc-h11"), ("kmc-sd", "kmc-h7-h8"), ("kmc-rf", "kmc-hma")):
    try:
        response = fetch(f"/products/{code}")
        check(
            f"/products/{code} redirects to {expected}",
            expected in response.url,
            response.url,
        )
    except Exception as error:  # noqa: BLE001
        check(f"/products/{code} redirects to {expected}", False, str(error))

# robots and sitemap must agree with each other.
robots = fetch("/robots.txt").read().decode()
sitemap = fetch("/sitemap.xml").read().decode()
indexing_off = "Disallow: /" in robots
check(
    "robots and sitemap agree",
    (indexing_off and "<url>" not in sitemap) or (not indexing_off and "<url>" in sitemap),
    f"indexing_off={indexing_off}, sitemap urls={sitemap.count('<url>')}",
)
check(
    "indexing is still off until KAO MING approves",
    indexing_off,
    "robots.txt allows crawling — intended only after approval",
)

# The Part Q taxonomy: every declared event must have a call site.
source = ""
for path in (
    "components/three/product-experience.tsx",
    "components/three/component-scenes.tsx",
    "components/rfq/rfq-form.tsx",
    "components/compare/compare-controls.tsx",
    "components/ui/document-actions.tsx",
    "components/catalogue/catalogue-reader.tsx",
    "components/company/network-map.tsx",
    "components/search/search-overlay.tsx",
    "components/chrome/language-switcher.tsx",
    "app/[locale]/products/[category]/[series]/page.tsx",
):
    try:
        with open(path, encoding="utf-8") as handle:
            source += handle.read()
    except FileNotFoundError:
        pass

with open("lib/analytics.ts", encoding="utf-8") as handle:
    taxonomy = handle.read()

declared = set(re.findall(r"name: '([a-z0-9_]+)'", taxonomy))
fired = set(re.findall(r"name: '([a-z0-9_]+)'", source))
# Phase 4+ features the taxonomy declares as a contract, not as dead code.
future = {"xray_opened", "video_started", "video_completed", "application_viewed"}
unfired = declared - fired - future
check(
    "every shipped event in the taxonomy has a call site",
    not unfired,
    f"never fired: {sorted(unfired)}",
)

failed = [r for r in results if not r[1]]
for name, ok, detail in results:
    print(("PASS " if ok else "FAIL ") + name + ((" — " + detail) if detail and not ok else ""))
print(f"\n{len(results) - len(failed)}/{len(results)} passed")
sys.exit(1 if failed else 0)
