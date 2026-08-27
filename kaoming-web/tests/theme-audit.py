"""Both themes, on every page kind, measured rather than eyeballed.

    python tests/theme-audit.py

The light theme re-points the palette tokens rather than adding a parallel set,
so a component that paired a colour with a fixed one — a dark label on a fill
that only inverts in one theme, a logo plate that flips to black — breaks
silently and only in one theme. Reading the pages will not find that; computing
it will.

For every element carrying its own text, this walks up to the first ancestor
with a non-transparent background, composites the alpha, and applies WCAG 2.1
contrast. Anything under 4.5:1 (3:1 for large text) is reported with the text
that failed, in the theme it failed in.

Also checks the two things the flip is most likely to get wrong outside of text:
the logo plate must stay light in both themes, and the toggle must actually
persist a choice across a navigation.
"""

import sys

from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = "http://localhost:3000"
GL_ARGS = ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"]

ROUTES = [
    "/en",
    "/en/news",
    "/en/news/emo-hannover-2023",
    "/en/company/history",
    "/en/company/sustainability",
    "/en/company/network",
    "/en/support/contact",
    "/en/products/gantry-machining-center/kmc-gm",
    "/en/rfq",
    "/zh-tw/company/sustainability",
]

results = []


def check(name, ok, detail=""):
    results.append((name, ok, detail))


# Runs in the page. Returns the worst offenders rather than every element, so a
# failure names something specific instead of printing a thousand lines.
CONTRAST_JS = r"""
() => {
  const parse = (value) => {
    const m = value.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number);
    return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
  };

  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });

  const lum = (c) => {
    const f = (v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };

  const ratio = (a, b) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  // The painted backdrop behind an element: the first ancestor with a
  // non-transparent background, compositing anything translucent on the way.
  const backdrop = (el) => {
    let stack = [];
    let node = el;
    while (node && node !== document.documentElement) {
      const bg = parse(getComputedStyle(node).backgroundColor);
      if (bg && bg.a > 0) {
        stack.push(bg);
        if (bg.a >= 0.999) break;
      }
      node = node.parentElement;
    }
    if (!stack.length) stack.push(parse(getComputedStyle(document.body).backgroundColor));
    let out = stack[stack.length - 1];
    for (let i = stack.length - 2; i >= 0; i -= 1) out = over(stack[i], out);
    return out;
  };

  /*
   * Type over a photograph cannot be measured this way and must not be guessed
   * at. `getComputedStyle` sees a transparent scrim over an <img>; it does not
   * see the photograph, so compositing against the nearest painted ancestor
   * reports light type on a light page and fails something that is in fact
   * white on a dark scrim.
   *
   * Two subtrees are affected, and both are excluded here and checked
   * explicitly further down instead: the media hero itself, and the header while
   * it is still transparent over one.
   */
  const overMedia = (el) =>
    el.closest('[data-company-hero]') !== null ||
    (document.documentElement.dataset.mediaHero === 'true' &&
      el.closest("header[data-solid='false']") !== null);

  const bad = [];
  for (const el of document.querySelectorAll('body *')) {
    if (overMedia(el)) continue;
    // Only elements that render text of their own.
    const own = [...el.childNodes]
      .filter((n) => n.nodeType === 3)
      .map((n) => n.textContent.trim())
      .join(' ')
      .trim();
    if (!own) continue;

    const style = getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none') continue;
    if (Number(style.opacity) < 0.15) continue;
    const box = el.getBoundingClientRect();
    if (box.width < 2 || box.height < 2) continue;
    // Screen-reader-only text is not painted; measuring it is meaningless.
    if (box.width <= 1 && box.height <= 1) continue;
    if (style.clipPath === 'inset(50%)' || style.clip === 'rect(0px, 0px, 0px, 0px)') continue;

    const fg = parse(style.color);
    if (!fg || fg.a === 0) continue;

    const bg = backdrop(el);
    const composited = fg.a < 1 ? over(fg, bg) : fg;
    const r = ratio(composited, bg);

    const size = parseFloat(style.fontSize);
    const weight = Number(style.fontWeight) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const floor = large ? 3 : 4.5;

    if (r < floor) {
      bad.push({
        ratio: Math.round(r * 100) / 100,
        floor,
        text: own.slice(0, 42),
        color: style.color,
        on: `rgb(${Math.round(bg.r)}, ${Math.round(bg.g)}, ${Math.round(bg.b)})`,
        tag: el.tagName.toLowerCase(),
      });
    }
  }

  bad.sort((a, b) => a.ratio - b.ratio);
  return bad.slice(0, 6);
}
"""


def luminance_of(rgb):
    values = [int(part) for part in rgb.replace("rgb(", "").replace(")", "").split(",")]

    def channel(v):
        v /= 255
        return v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4

    r, g, b = (channel(v) for v in values[:3])
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=GL_ARGS)

    for theme in ("light", "dark"):
        # A fresh context per theme, not a fresh init script on one page: init
        # scripts accumulate, so the second theme's page would still be running
        # the first theme's script and the two would fight.
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        # Set before the first navigation so the blocking script picks it up and
        # the page is never rendered in the other theme first.
        context.add_init_script(f"try{{localStorage.setItem('km-theme','{theme}')}}catch(e){{}}")
        page = context.new_page()

        for route in ROUTES:
            page.goto(BASE + route, wait_until="load", timeout=60_000)
            page.wait_for_timeout(400)

            applied = page.evaluate("() => document.documentElement.getAttribute('data-theme')")
            check(f"{theme} {route} applies the theme", applied == theme, applied or "")

            failures = page.evaluate(CONTRAST_JS)
            check(
                f"{theme} {route} text meets AA",
                not failures,
                "; ".join(f"{f['ratio']}:1 {f['tag']} \"{f['text']}\"" for f in failures[:3]),
            )

        # What the sweep above had to skip: the type over the photograph.
        #
        # The photograph itself is unmeasurable from computed styles, so this
        # asserts the two things that ARE measurable and that together make the
        # type legible: it is set in the one colour that does not invert, and the
        # scrim under it is opaque enough to be a ground rather than a tint. It
        # does not prove a contrast ratio, and says so.
        page.goto(BASE + "/en", wait_until="load", timeout=60_000)
        page.wait_for_timeout(500)
        media = page.evaluate(
            """() => {
              const hero = document.querySelector('[data-company-hero]');
              if (!hero) return null;
              const h1 = hero.querySelector('h1');
              const scrim = [...hero.querySelectorAll('div')]
                .map((d) => getComputedStyle(d).backgroundImage)
                .find((bg) => bg.includes('linear-gradient'));
              const alphas = [...(scrim || '').matchAll(/rgba\([^)]*?,\s*([0-9.]+)\)/g)]
                .map((m) => Number(m[1]));
              return {
                colour: h1 ? getComputedStyle(h1).color : null,
                onBrand: getComputedStyle(document.documentElement)
                  .getPropertyValue('--color-km-on-brand').trim(),
                maxAlpha: alphas.length ? Math.max(...alphas) : 0,
              };
            }"""
        )
        check(f"{theme} the hero has a media scrim", media is not None)
        if media:
            expected = media["onBrand"].lstrip("#")
            rgb = tuple(int(expected[i : i + 2], 16) for i in (0, 2, 4))
            check(
                f"{theme} hero type is the non-inverting colour",
                media["colour"] == f"rgb({rgb[0]}, {rgb[1]}, {rgb[2]})",
                f"{media['colour']} vs km-on-brand {media['onBrand']}",
            )
            check(
                f"{theme} the scrim is a ground, not a tint",
                media["maxAlpha"] >= 0.75,
                f"max alpha {media['maxAlpha']}",
            )

        # The logo sits on a plate because the supplied mark is dark ink on
        # transparent and may not be recoloured. The plate must not invert.
        page.goto(BASE + "/en", wait_until="load", timeout=60_000)
        plate = page.evaluate(
            "() => { const i = document.querySelector('header img[src*=\"LOGO\"]');"
            " return i ? getComputedStyle(i.closest('span')).backgroundColor : null; }"
        )
        check(
            f"{theme} logo plate stays light",
            plate is not None and luminance_of(plate) > 0.7,
            plate or "no plate found",
        )
        context.close()

    # The choice has to outlive a navigation, which is the whole point of it.
    # Its own context, with nothing stored and no init script.
    context = browser.new_context(viewport={"width": 1440, "height": 900})
    page = context.new_page()
    page.goto(BASE + "/en", wait_until="load", timeout=60_000)
    before = page.evaluate("() => document.documentElement.getAttribute('data-theme')")
    check("default theme is light", before == "light", before or "")

    page.click("[data-theme-toggle]")
    page.wait_for_timeout(150)
    toggled = page.evaluate("() => document.documentElement.getAttribute('data-theme')")
    check("toggle flips the theme", toggled == "dark", toggled or "")

    page.goto(BASE + "/en/news", wait_until="load", timeout=60_000)
    persisted = page.evaluate("() => document.documentElement.getAttribute('data-theme')")
    check("the choice survives a navigation", persisted == "dark", persisted or "")

    # Three switches are mounted at once — header, footer, mobile menu — and the
    # footer's is unconditional, so at least two are live on every viewport. An
    # earlier version gave each its own state, synced once at mount: clicking the
    # footer left the header showing the old icon, and the header's next click
    # then recomputed from that stale value and re-applied the theme already on,
    # so it looked dead. Drive one and assert on the others.
    page.goto(BASE + "/en", wait_until="load", timeout=60_000)
    page.wait_for_timeout(300)

    header_toggle = page.locator("header [data-theme-toggle]").first
    footer_toggle = page.locator("footer [data-theme-toggle]").first
    check(
        "the header and the footer each carry a switch",
        header_toggle.count() == 1 and footer_toggle.count() == 1,
    )

    def pressed_states():
        # Only the ones a visitor can actually reach: the mobile menu's copy is
        # in the DOM behind a closed overlay on a desktop viewport.
        return page.eval_on_selector_all(
            "header [data-theme-toggle], footer [data-theme-toggle]",
            "els => els.map(e => e.getAttribute('aria-pressed'))",
        )

    # Clicked through the DOM rather than with the mouse. Lenis owns scroll on
    # this page, so Playwright's scroll-into-view and Lenis fight over where the
    # footer is and the click never becomes actionable. What is under test here
    # is state synchronisation between two mounted switches, not hit-testing —
    # m8-smoke.py is where reachability is asserted.
    before_click = pressed_states()
    page.eval_on_selector("footer [data-theme-toggle]", "el => el.click()")
    page.wait_for_timeout(250)
    after_click = pressed_states()
    after_footer = page.evaluate("() => document.documentElement.getAttribute('data-theme')")

    check(
        "clicking one switch updates the other",
        len(set(after_click)) == 1 and after_click != before_click,
        f"{before_click} -> {after_click}",
    )

    # And the stale-state consequence: the switch that was NOT clicked must now
    # reverse the theme, not re-apply the one already on.
    page.eval_on_selector("header [data-theme-toggle]", "el => el.click()")
    page.wait_for_timeout(250)
    reversed_to = page.evaluate("() => document.documentElement.getAttribute('data-theme')")
    # Relative to whatever the footer click left it on, not to a fixed value:
    # the theme carried over from the persistence check above, so hard-coding
    # "light" here would only be testing the order of the checks.
    check(
        "a switch that was not clicked still reverses the theme",
        reversed_to != after_footer,
        f"{after_footer} -> {reversed_to}",
    )

    browser.close()

width = max(len(name) for name, _, _ in results)
for name, ok, detail in results:
    print(f"{'PASS' if ok else 'FAIL'}  {name.ljust(width)}  {detail}")
print(f"\n{sum(1 for _, ok, _ in results if ok)}/{len(results)} passed")
sys.exit(0 if all(ok for _, ok, _ in results) else 1)
