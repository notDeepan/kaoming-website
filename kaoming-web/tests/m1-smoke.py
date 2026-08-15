"""M1 acceptance smoke pass — "full Phase-1 site browsable without any WebGL".

Run against a production build:

    npm run build && npm run start
    python tests/m1-smoke.py

Walks every route the navigation offers, in both locales, and asserts that the
pages carry what the milestone promised: real specification on the product
template, honest gaps where a catalogue page has not been transcribed, the
document manifest on the resource centre, and no WebGL context anywhere.
"""

from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
results = []


def check(name, ok, detail=""):
    results.append((name, ok, detail))


SERIES = [
    ("gantry-machining-center", "kmc-gm", "full"),
    ("gantry-machining-center", "kmc-gn", "full"),
    ("double-column-machining-center", "kmc-h7-h8", "partial"),
    ("double-column-machining-center", "kmc-h11", "pending"),
    ("multi-face-machining-center", "kmc-ha11", "pending"),
    ("multi-face-machining-center", "kmc-ha14", "partial"),
    ("multi-face-machining-center", "kmc-hma", "partial"),
    ("vertical-machining-center", "kmc-ce", "full"),
    ("vertical-machining-center", "kmc-ch", "full"),
]

def open_specifications(page):
    """Part G.10 (M6): the table is one press away, never dumped first.

    Before M6 the full specification was always printed on the page. It still
    is — it is now behind VIEW FULL SPECIFICATIONS, because Scene 09 leads with
    the four figures a buyer asks for first. A series with no table to show has
    no control and nothing to press.
    """
    control = page.locator("[data-spec-expand]")
    if control.count():
        control.first.click()
        page.wait_for_timeout(300)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})

    # Every top-level route resolves in both locales.
    for locale in ("en", "zh-tw"):
        for path in ("", "/products", "/resources", "/support/contact"):
            response = page.goto(f"{BASE}/{locale}{path}")
            check(f"{locale}{path or '/'} 200", response.status == 200, str(response.status))

    # Product template: verified specification, and gaps declared as gaps.
    for category, series, completeness in SERIES:
        response = page.goto(f"{BASE}/en/products/{category}/{series}")
        page.wait_for_load_state("networkidle")
        check(f"{series} 200", response.status == 200, str(response.status))

        heading = page.locator("h1").first.inner_text()
        check(f"{series} names the catalogue series", "KMC-" in heading, heading)

        # Provenance is on every page that shows a specification.
        check(
            f"{series} states its source",
            page.get_by_text("Verified specification").first.is_visible(),
        )

        open_specifications(page)

        has_table = page.locator("table").count() > 0
        if completeness == "pending":
            check(f"{series} declares the missing table", not has_table)
            check(
                f"{series} explains the gap",
                "has not been transcribed" in page.inner_text("main"),
            )
        else:
            check(f"{series} renders a model table", has_table)

    # The flagship carries the full transcribed specification.
    page.goto(f"{BASE}/en/products/gantry-machining-center/kmc-gm")
    page.wait_for_load_state("networkidle")
    open_specifications(page)
    body = page.inner_text("main")
    for value in ("HSK-A100", "15,000 rpm", "±0.002", "50,000 kg", "KMC-625GM"):
        check(f"kmc-gm shows {value}", value in body)

    # Scene 03 carries the first six features; anything beyond is listed below
    # it and numbered from seven. GM states seven features, GN nine — so the
    # overflow indices are the arithmetic proof that the split is right.
    for series, expected in (("kmc-gm", ["07"]), ("kmc-gn", ["07", "08", "09"])):
        page.goto(f"{BASE}/en/products/gantry-machining-center/{series}")
        page.wait_for_load_state("networkidle")
        indices = page.evaluate(
            """() => [...document.querySelectorAll('section li > span.km-label')]
                 .map((el) => el.textContent.trim())
                 .filter((text) => /^0[7-9]$/.test(text))"""
        )
        check(f"{series} numbers its overflow features {expected}", indices == expected, str(indices))

    # Traditional Chinese renders the same figures with translated labels.
    page.goto(f"{BASE}/zh-tw/products/gantry-machining-center/kmc-gm")
    page.wait_for_load_state("networkidle")
    open_specifications(page)
    zh = page.inner_text("main")
    check("zh-tw keeps catalogue figures", "HSK-A100" in zh and "50,000 kg" in zh)
    check("zh-tw translates spec labels", "主軸錐度" in zh)
    check("zh-tw keeps the catalogue model code", "KMC-325GM" in zh)

    # Resource centre renders from the manifest.
    page.goto(f"{BASE}/en/resources")
    page.wait_for_load_state("networkidle")
    check("resources lists three catalogues", page.locator("article").count() == 3)
    check(
        "resources states file size",
        "MB" in page.inner_text("main"),
    )

    # The M1 gate is that the Phase-1 site is browsable *without* WebGL, not that
    # WebGL is absent. M3 puts a canvas on the product template on purpose; the
    # pages that carry no machine still ship none of it, and the product page's
    # facts stay in the DOM either way (tests/m3-smoke.py checks the blind path).
    for path in ("/en", "/en/products"):
        page.goto(f"{BASE}{path}")
        page.wait_for_load_state("networkidle")
        check(f"{path} uses no canvas", page.locator("canvas").count() == 0)

    page.goto(f"{BASE}/en/products/gantry-machining-center/kmc-gm")
    page.wait_for_load_state("networkidle")
    product = page.inner_text("main")
    check(
        "product page states its specification in the DOM, not only in 3D",
        "HSK-A100" in product and page.locator("table").count() >= 1,
    )

    # Reduced motion: content is present without any tween having run.
    ctx = browser.new_context(viewport={"width": 1440, "height": 900}, reduced_motion="reduce")
    rm = ctx.new_page()
    rm.goto(f"{BASE}/en")
    rm.wait_for_load_state("networkidle")
    rm.wait_for_timeout(400)
    opacity = rm.evaluate(
        "getComputedStyle(document.querySelector('h1')).opacity"
    )
    check("reduced motion shows the hero", opacity == "1", f"opacity={opacity}")
    hidden = rm.evaluate(
        "[...document.querySelectorAll('[data-reveal]')].filter(e => getComputedStyle(e).opacity !== '1').length"
    )
    check("reduced motion reveals everything", hidden == 0, f"{hidden} hidden")
    ctx.close()

    # Mobile: the product template is usable and the model table scrolls.
    m = browser.new_page(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    m.goto(f"{BASE}/en/products/gantry-machining-center/kmc-gn")
    m.wait_for_load_state("networkidle")
    overflow = m.evaluate(
        "document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1"
    )
    check("mobile page does not scroll sideways", overflow)
    scroller = m.evaluate(
        "!!document.querySelector('table')?.closest('div')?.matches('.overflow-x-auto')"
    )
    check("model table scrolls in its own container", scroller)
    m.close()

    browser.close()

failed = [r for r in results if not r[1]]
for name, ok, detail in results:
    print(("PASS " if ok else "FAIL ") + name + ((" — " + detail) if detail and not ok else ""))
print(f"\n{len(results) - len(failed)}/{len(results)} passed")
