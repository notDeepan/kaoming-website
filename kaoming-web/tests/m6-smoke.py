"""M6 acceptance smoke pass — the canonical journey, walked.

    npm run build && npm run start
    python tests/m6-smoke.py

The gate is "full canonical journey A.2 works end-to-end on the flagship", so
this test does not check the scenes one at a time from a standing start. It
walks the journey the spec draws, in one browser session, clicking what a buyer
would click:

    HOME -> PRODUCT DISCOVERY -> PRODUCT CARD -> 3D -> SCROLL -> EXPLODED VIEW
    -> COMPONENTS -> REASSEMBLY -> WORKPIECE -> APPLICATION -> SPECIFICATIONS
    -> CATALOGUE -> COMPARE -> REQUEST QUOTE -> SALES

and ends by actually submitting the quote, because Part A.2 says a qualified
lead is the success condition of the entire system. Anything that breaks the
chain fails here even if every section renders perfectly on its own.

The QR entry (Part J.7) is walked separately afterwards: it is the one journey
that does not start at the home page.
"""

import json
import sys
import urllib.request
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
GL_ARGS = ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"]
FLAGSHIP = "/en/products/gantry-machining-center/kmc-gm"
results = []


def check(name, ok, detail=""):
    results.append((name, ok, detail))


RIG = """
() => {
  const r = window.__kmRig;
  return r ? { amount: Number(r.amount.toFixed(3)), spread: Number(r.spread.toFixed(2)) } : null;
}
"""


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=GL_ARGS)
    # The RFQ limiter buckets by client address, and this journey ends in a real
    # submission. Without its own address the run shares a bucket with whatever
    # else has posted recently — including the M2 suite's deliberate flood — and
    # a correct 429 would read as a broken journey. TEST-NET-3, reserved for
    # documentation, so it can never collide with a real address.
    page = browser.new_page(
        viewport={"width": 1440, "height": 900},
        extra_http_headers={"x-forwarded-for": "203.0.113.6"},
    )
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

    # ---------------------------------------------------------------- HOME
    page.goto(f"{BASE}/en")
    page.wait_for_load_state("networkidle")
    check("home page renders", page.locator("h1").count() >= 1)

    # ----------------------------------------------------- PRODUCT DISCOVERY
    # The home page's own call to action, not the header menu: this is the path
    # a buyer who has just arrived actually takes.
    page.get_by_role("link", name="Explore products").first.click()
    # Client-side navigation: `networkidle` can settle before the URL changes,
    # so wait on the destination rather than on the network.
    page.wait_for_url("**/products", timeout=15000)
    page.wait_for_load_state("networkidle")
    check("discovery reached from the home page", "/products" in page.url, page.url)

    # ---------------------------------------------------------- PRODUCT CARD
    # `:visible` matters: the header's mega-panel also links to every machine,
    # and clicking a link inside a closed panel is not what a buyer does.
    card = page.locator("a[href*='/products/gantry-machining-center/kmc-gm']:visible").first
    check("the flagship has a card in the grid", card.count() == 1)
    card.click()
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2500)
    check("the card leads to the flagship", "kmc-gm" in page.url, page.url)

    # ------------------------------------------------------ FULL-SCREEN 3D
    check("the machine is on a canvas", page.locator("canvas").count() == 1)

    # Pin the tier: software rasterisation walks the Part O ladder and would
    # remove the canvas mid-journey. Dispatched so the page does not scroll.
    page.get_by_role("button", name="Low", exact=True).first.dispatch_event("click")
    page.wait_for_timeout(400)

    # -------------------------------------- SCROLL -> EXPLODED -> COMPONENTS
    page.evaluate(
        """() => {
          const range = document.querySelector('[data-explode]').parentElement;
          const rect = range.getBoundingClientRect();
          const span = range.offsetHeight - window.innerHeight;
          window.scrollTo(0, rect.top + window.scrollY + span * 0.5);
        }"""
    )
    page.wait_for_timeout(1600)
    rig = page.evaluate(RIG)
    check("the machine comes apart on the way down", rig and rig["spread"] > 8.0, str(rig))

    page.evaluate("document.querySelector('[data-component-card]').focus()")
    page.keyboard.press("Enter")
    page.wait_for_timeout(300)
    panel = page.evaluate("() => document.activeElement.getAttribute('aria-controls')")
    check("a component explains itself", page.locator(f"#{panel}").is_visible())
    page.keyboard.press("Enter")

    # --------------------------------------------------------- REASSEMBLY
    page.evaluate(
        """() => {
          const range = document.querySelector('[data-explode]').parentElement;
          const rect = range.getBoundingClientRect();
          const span = range.offsetHeight - window.innerHeight;
          window.scrollTo(0, rect.top + window.scrollY + span);
        }"""
    )
    page.wait_for_timeout(1600)
    rig = page.evaluate(RIG)
    check("and goes back together", rig and rig["spread"] < 0.35, str(rig))

    # ----------------------------------------------------------- WORKPIECE
    check("the workpiece scene exists", page.locator("#workpiece").count() == 1)
    workpiece_text = page.locator("#workpiece").inner_text()
    check(
        "it answers what the machine makes, or says why it cannot",
        page.locator("[data-workpiece]").count() > 0
        or "not yet supplied" in workpiece_text.lower(),
        workpiece_text[:90].replace("\n", " | "),
    )

    # --------------------------------------------------------- APPLICATION
    tiles = page.locator("[data-application-tile] a")
    check("the applications band offers industries", tiles.count() == 5, f"{tiles.count()} tiles")
    hrefs = page.evaluate(
        "() => [...document.querySelectorAll('[data-application-tile] a')].map((a) => a.getAttribute('href'))"
    )
    check(
        "each tile routes to its application page",
        all(href and "/applications/" in href for href in hrefs),
        str(hrefs[:2]),
    )

    # ------------------------------------------------------ SPECIFICATIONS
    check(
        "the big numbers come first",
        page.locator("[data-spec-highlight]").count() >= 3,
    )
    expand = page.locator("[data-spec-expand]").first
    check("the full table is not dumped first", expand.get_attribute("aria-expanded") == "false")
    check("the table is hidden until asked for", not page.locator("#full-specifications").is_visible())

    expand.click()
    page.wait_for_timeout(400)
    check("VIEW FULL SPECIFICATIONS opens it", page.locator("#full-specifications").is_visible())
    check(
        "the verified table is inside",
        page.locator("#full-specifications table").count() == 1,
    )

    # The unit toggle converts for display only. 3,000 mm is 118.1 in.
    metric = page.locator("#full-specifications table tbody tr").first.inner_text()
    page.locator("[data-unit='in']").first.click()
    page.wait_for_timeout(300)
    imperial = page.locator("#full-specifications table tbody tr").first.inner_text()
    check("mm/in toggle changes the figures", metric != imperial)
    check("inches are labelled as converted", "converted" in page.locator("#full-specifications").inner_text().lower())
    check("118.1 in is 3,000 mm", "118.1 in" in imperial, imperial.replace("\n", " | ")[:100])
    page.locator("[data-unit='mm']").first.click()
    page.wait_for_timeout(300)
    check(
        "switching back restores the catalogue figures",
        page.locator("#full-specifications table tbody tr").first.inner_text() == metric,
    )

    # ----------------------------------------------------------- CATALOGUE
    view = page.locator("[data-document-view]").first
    download = page.locator("[data-document-download]").first
    check("the catalogue can be read in the browser", view.count() == 1)
    check("and taken away", download.count() == 1 and download.get_attribute("download") is not None)
    check(
        "both point at the same verified document",
        view.get_attribute("href") == download.get_attribute("href")
        and (view.get_attribute("href") or "").startswith("/docs/"),
        str(view.get_attribute("href")),
    )

    # ------------------------------------------------------------- COMPARE
    page.get_by_role("button", name="Add to compare").first.click()
    page.wait_for_timeout(400)
    # COMPARE_KEY in lib/store/compare — the tray survives a page change, which
    # is the whole reason a buyer can gather three machines and then compare.
    tray = page.evaluate("() => localStorage.getItem('km.compare.v1') ?? ''")
    check("the machine can be set beside another", "kmc-gm" in tray, tray or "(empty)")

    # ------------------------------------------------------- REQUEST QUOTE
    check("the RFQ is on the page, not a link away", page.locator("#rfq form").count() == 1)
    check(
        "this machine arrives already selected",
        page.locator("#rfq [data-machine='kmc-gm']").first.get_attribute("aria-pressed") == "true",
    )

    page.locator("#rfq input[name='company']").fill("Nordwerk Präzisionsteile GmbH")
    page.locator("#rfq input[name='name']").fill("A. Buyer")
    page.locator("#rfq input[name='email']").fill("m6-journey@example.com")
    page.locator("#rfq select[name='country']").select_option(label="Germany")
    page.locator("#rfq").get_by_role("button", name="Continue").click()
    page.wait_for_timeout(300)

    page.locator("#rfq textarea[name='message']").fill(
        "Walked the M6 canonical journey. Please ignore."
    )
    page.locator("#rfq input[name='consent']").check()
    page.locator("#rfq").get_by_role("button", name="Send enquiry").click()
    page.wait_for_timeout(2500)

    # ----------------------------------------------------------- SALES TEAM
    sent = page.locator("#rfq").inner_text()
    check(
        "the journey ends in a submitted enquiry",
        "thank" in sent.lower() or "感謝" in sent,
        sent[:120].replace("\n", " | "),
    )

    # ---------------------------------------------------------------- EXIT
    check("the way out is offered", page.locator("[data-product-exit]").count() == 1)
    check(
        "and is reachable once past the first screen",
        page.locator("[data-product-exit]").first.is_visible(),
    )
    page.locator("[data-product-exit]").first.click()
    page.wait_for_load_state("networkidle")
    check("it returns to the products", "/products" in page.url, page.url)

    check("no console errors on the whole journey", not errors, str(errors[:3]))
    page.close()

    # ------------------------------------------------- QR ENTRY (Part J.7)
    scan = browser.new_page(viewport={"width": 390, "height": 844})
    scan.goto(f"{BASE}/m/gm")
    scan.wait_for_load_state("networkidle")
    scan.wait_for_timeout(2000)
    check("a scanned code lands on the machine", "kmc-gm" in scan.url, scan.url)
    check("and is recognised as a scan", "qr=1" in scan.url, scan.url)
    check(
        "a scan opens at the LOW tier, not by walking down to it",
        scan.evaluate("() => document.querySelector('[data-quality-tier]').dataset.qualityTier")
        == "low",
        scan.evaluate("() => document.querySelector('[data-quality-tier]').dataset.qualityTier"),
    )
    scan.close()
    browser.close()

# Every printed code must resolve. The QR script restates the slug rule from
# lib/taxonomy, so this is what stops a banner being printed with a dead link.
index_file = Path("public/qr/index.json")
if not index_file.exists():
    check("QR codes have been generated", False, "run npm run qr")
else:
    index = json.loads(index_file.read_text(encoding="utf-8"))
    codes = index["codes"]
    check("a code exists for every series", len(codes) == 9, f"{len(codes)} codes")

    dead = []
    for entry in codes:
        request = urllib.request.Request(f"{BASE}/m/{entry['code']}", method="GET")
        try:
            with urllib.request.urlopen(request) as response:
                if response.status != 200 or entry["slug"] not in response.url:
                    dead.append(entry["code"])
        except Exception:
            dead.append(entry["code"])
    check("every printed code resolves to its machine", not dead, f"dead: {dead}")

    svgs = [entry for entry in codes if not Path(f"public/qr/{entry['code']}.svg").exists()]
    check("every code has a printable SVG", not svgs, str([e["code"] for e in svgs]))

failed = [r for r in results if not r[1]]
for name, ok, detail in results:
    print(("PASS " if ok else "FAIL ") + name + ((" — " + detail) if detail and not ok else ""))
print(f"\n{len(results) - len(failed)}/{len(results)} passed")
sys.exit(1 if failed else 0)
