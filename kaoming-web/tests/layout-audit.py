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
  * equal columns everywhere                      -> equal-column grid count
  * every item in a row sharing one top edge      -> flat vs staggered rows
  * one uniform gap between everything            -> distinct section rhythms

Two equal-column grids are allowed and named below. Both are deliberate: a form
puts related fields in pairs, and the box-way/linear-way comparison is even
*because* neither option is being recommended over the other.
"""

import sys

from playwright.sync_api import sync_playwright

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

  document.querySelectorAll('main section').forEach((s) => {
    const cs = getComputedStyle(s);
    out.rhythms.push(parseInt(cs.paddingTop) + parseInt(cs.paddingBottom));
  });

  return out;
}"""

# The composed surfaces. Tool pages — the map, the catalogue reader, the RFQ —
# are single-purpose and are not held to the section-rhythm rule.
COMPOSED = [
    "/en",
    "/en/products",
    "/en/products/gantry-machining-center/kmc-gm",
    "/en/technology",
]

# Equal columns that are correct. Anything else failing the check is a
# three-across grid that crept back in.
ALLOWED_EQUAL = ("md:grid-cols-2", "sm:grid-cols-2")

with sync_playwright() as p:
    browser = p.chromium.launch(
        headless=True, args=["--use-gl=swiftshader", "--enable-unsafe-swiftshader"]
    )

    for path in COMPOSED:
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        page.goto(f"{BASE}{path}")
        page.wait_for_load_state("networkidle")
        # Reveal animations set the starting state, so everything has to have
        # been scrolled past before its real geometry can be read.
        page.evaluate("scrollTo(0, document.body.scrollHeight)")
        page.wait_for_timeout(1400)
        page.evaluate("scrollTo(0, 0)")
        page.wait_for_timeout(300)

        a = page.evaluate(AUDIT)

        check(f"{path} escapes the container", a["bleed"] >= 2, f"{a['bleed']} full-bleed")
        check(
            f"{path} composes asymmetrically",
            a["asym"] >= 2,
            f"{a['asym']} asymmetric grids",
        )

        unexplained = [
            e for e in a["equal"] if not any(token in e for token in ALLOWED_EQUAL)
        ]
        check(
            f"{path} has no equal-column grids",
            not unexplained,
            str(unexplained[:2]),
        )

        check(
            f"{path} staggers its rows",
            a["flat"] == 0,
            f"{a['flat']} rows share one top edge",
        )
        check(
            f"{path} varies its vertical rhythm",
            len(set(a["rhythms"])) >= 3,
            f"rhythms {sorted(set(a['rhythms']))}",
        )
        page.close()

    # The composition must not cost a sideways scroll on a phone — bleeds and
    # negative margins are exactly how that happens.
    for path in COMPOSED + ["/en/company/about", "/en/catalogue", "/zh-tw"]:
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
