"""Layout audit — the composition, measured.

    npm run build && npm run start
    python tests/layout-audit.py

Not a milestone gate. This exists because "the layout looks machine-generated"
is a real, specific defect with measurable causes, and the fix for it is the
kind that decays: the next person adding a section will reach for
`grid md:grid-cols-3 gap-6` inside the centred container, because that is what
every other codebase does and it always looks fine on its own.

What actually made the page read as generated, and what each is measured by:

  * every element inside one centred container    -> full-bleed count
  * no hierarchy anywhere                         -> asymmetric grid count
  * one uniform gap between everything            -> distinct section rhythms

**This does not test for "never align".** An earlier version did, and that was
the wrong rule: it counted equal-column grids as failures and pushed staggered
baselines onto content whose entire job is being compared. A specification
figure, a company statistic and a set of industries somebody is scanning to find
their own are all read *across*, and alignment is what makes that possible.

So the rule this encodes is the real one:

  * **hierarchy** — where one thing matters more, it is bigger (the flagship)
  * **comparison** — where things are peers, they share a baseline (the specs)

and both are asserted, because either one alone is a layout that looks composed
and reads badly.
"""

import sys

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
results = []


def check(name, ok, detail=""):
    results.append((name, ok, detail))


AUDIT = """() => {
  const vw = innerWidth;
  const out = { bleed: 0, equal: [], asym: 0, stagger: 0, flat: 0, rhythms: [] };

  document.querySelectorAll('main *').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width >= vw - 1 && r.height > 60 && el.children.length) out.bleed++;

    const cs = getComputedStyle(el);
    if (cs.display !== 'grid') return;
    const cols = cs.gridTemplateColumns.split(' ').filter(Boolean);
    if (cols.length < 2) return;
    const widths = new Set(cols.map((c) => Math.round(parseFloat(c))));
    if (widths.size === 1) out.equal.push(el.tagName + '.' + String(el.className).slice(0, 40));
    else out.asym++;
  });

  document.querySelectorAll('main ul, main dl').forEach((list) => {
    const kids = [...list.children].filter((k) => k.getBoundingClientRect().height > 20);
    if (kids.length < 3) return;
    const tops = new Set(kids.map((k) => Math.round(k.getBoundingClientRect().top / 12)));
    if (tops.size === 1) out.flat++;
    else out.stagger++;
  });

  // A section's vertical rhythm, wherever the padding is actually set. Many of
  // these sections are a full-bleed ground wrapping one max-width column, and
  // the breathing room is on the column — reading only the section would call
  // a page with a deliberate rhythm flat.
  document.querySelectorAll('main section').forEach((s) => {
    const cs = getComputedStyle(s);
    let pad = parseInt(cs.paddingTop) + parseInt(cs.paddingBottom);
    if (pad === 0 && s.children.length === 1) {
      const inner = getComputedStyle(s.firstElementChild);
      pad = parseInt(inner.paddingTop) + parseInt(inner.paddingBottom);
    }
    out.rhythms.push(pad);
  });

  return out;
}"""

# The composed surfaces, and how much compositional hierarchy each one owes.
#
# `/en/products` is deliberately the low bar. It is a catalogue index: four
# categories, each a grid of the machines inside it, and the machines inside a
# category are alternatives a buyer is choosing between. Demanding narrative
# composition of it would push exactly the decoration this audit exists to
# prevent — the page's job is to be scanned, and a grid is how that is done.
# Its hierarchy lives in the rhythm between the categories instead.
#
# Tool pages — the map, the catalogue reader, the RFQ — are single-purpose and
# are not audited at all.
COMPOSED = [
    # (path, minimum asymmetric grids, minimum distinct section rhythms, pane)
    ("/en", 2, 3, None),
    # Two rhythms, not three. This is a scan-first index of four category
    # groups, and its hierarchy is the alternation between them; a third gap
    # here would be decoration for a page whose job is to be read at a glance.
    # (It appeared to have three until the rhythm metric stopped counting a
    # section with no padding at all as a rhythm of its own.)
    ("/en/products", 1, 2, None),
    # A machine is a window. Its composition to audit is the specification
    # pane — the long document a buyer reads — not the fixed frame around it.
    ("/en/products/gantry-machining-center/kmc-gm", 2, 3, "spec"),
    ("/en/technology", 2, 3, None),
]

with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True, args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader"]
    )

    for path, minAsym, minRhythm, pane in COMPOSED:
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto(f"{BASE}{path}")
        page.wait_for_load_state("networkidle")
        # Reveal animations set the starting state, so everything has to have
        # been scrolled past before its real geometry can be read. Inside a
        # window the document does not scroll — the pane body does.
        if pane:
            open_pane(page, pane)
            page.evaluate(
                "() => { const b = document.querySelector('[data-lenis-prevent]');"
                " if (b) b.scrollTop = b.scrollHeight; }"
            )
            page.wait_for_timeout(1400)
            page.evaluate(
                "() => { const b = document.querySelector('[data-lenis-prevent]');"
                " if (b) b.scrollTop = 0; }"
            )
        else:
            page.evaluate("scrollTo(0, document.body.scrollHeight)")
            page.wait_for_timeout(1400)
            page.evaluate("scrollTo(0, 0)")
        page.wait_for_timeout(300)

        a = page.evaluate(AUDIT)

        check(f"{path} escapes the container", a["bleed"] >= 2, f"{a['bleed']} full-bleed")
        check(
            f"{path} composes with hierarchy",
            a["asym"] >= minAsym,
            f"{a['asym']} asymmetric grids, wanted {minAsym}",
        )
        check(
            f"{path} varies its vertical rhythm",
            len(set(a["rhythms"])) >= minRhythm,
            f"rhythms {sorted(set(a['rhythms']))}, wanted {minRhythm}",
        )
        page.close()

    # --- Comparison sets share a baseline.
    #
    # The other half of the rule, and the half that was got wrong first. These
    # are read across, so every one of them must sit on one line.
    compare = browser.new_page(viewport={"width": 1440, "height": 900})

    for path, selector, label in (
        (
            "/en/products/gantry-machining-center/kmc-gm",
            "[data-spec-highlight]",
            "the four specification figures",
        ),
        (
            "/en/products/gantry-machining-center/kmc-gm",
            "[data-application-tile]",
            "the five industries",
        ),
    ):
        compare.goto(f"{BASE}{path}")
        compare.wait_for_load_state("networkidle")
        compare.evaluate("scrollTo(0, document.body.scrollHeight)")
        compare.wait_for_timeout(1200)

        tops = compare.evaluate(
            """(sel) => {
              const els = [...document.querySelectorAll(sel)];
              return [...new Set(els.map((e) => Math.round(e.getBoundingClientRect().top)))].length;
            }""",
            selector,
        )
        # One row on a wide screen; the grid wraps to two on narrower ones, so
        # anything up to two distinct baselines is alignment, not stagger.
        check(f"{label} share a baseline", 0 < tops <= 2, f"{tops} distinct top edges")

    # The showcase is a comparison too — four categories, read against each
    # other. The flagship was given a double-width `lead` card here, which left
    # a screen-height void beside its shorter neighbours; the FLAGSHIP label
    # carries that fact instead, at no cost to the grid.
    compare.goto(f"{BASE}/en")
    compare.wait_for_load_state("networkidle")
    cards = compare.evaluate(
        """() => [...document.querySelectorAll('article')]
             .map((a) => Math.round(a.getBoundingClientRect().width))
             .filter((w) => w > 100)"""
    )
    check(
        "the four machines are the same size",
        bool(cards) and max(cards) - min(cards) <= 2,
        f"widths {cards[:4]}",
    )
    check(
        "and the flagship is still marked",
        compare.get_by_text("Flagship").first.is_visible(),
    )

    # A numbered marker must mean something. The industries are not a sequence.
    compare.goto(f"{BASE}/en")
    compare.wait_for_load_state("networkidle")
    numbered = compare.evaluate(
        """() => {
          const band = [...document.querySelectorAll('section')]
            .find((s) => s.querySelector('a[href*="/applications/"]'));
          if (!band) return 0;
          return [...band.querySelectorAll('a[href*="/applications/"] span')]
            .filter((s) => /^\\d\\d$/.test(s.textContent.trim())).length;
        }"""
    )
    check("industries carry no false sequence numbering", numbered == 0, f"{numbered} numerals")
    compare.close()

    # The composition must not cost a sideways scroll on a phone — bleeds and
    # negative margins are exactly how that happens.
    for path in [entry[0] for entry in COMPOSED] + ["/en/company/about", "/en/catalogue", "/zh-tw"]:
        phone = browser.new_page(viewport={"width": 390, "height": 844})
        phone.goto(f"{BASE}{path}")
        phone.wait_for_load_state("networkidle")
        overflow = phone.evaluate("() => document.documentElement.scrollWidth - innerWidth")
        check(f"{path} does not scroll sideways at 390px", overflow <= 0, f"{overflow}px")
        phone.close()

    browser.close()

failed = [r for r in results if not r[1]]
for name, ok, detail in results:
    print(("PASS " if ok else "FAIL ") + name + ((" — " + detail) if detail and not ok else ""))
print(f"\n{len(results) - len(failed)}/{len(results)} passed")
sys.exit(1 if failed else 0)
