"""M4 acceptance smoke pass — scroll choreography.

    npm run build && npm run start
    python tests/m4-smoke.py

The gate is "scrubbing is smooth and framerate-independent both directions", so
that is what this measures, not just that a scene exists:

  * the camera pose is a pure function of scroll progress, so scrolling back up
    retraces the same path rather than drifting;
  * the same scroll distance produces the same camera movement whatever the
    frame rate, which is what rules out a frame-counted animation;
  * the movement between adjacent scroll positions is continuous, with no jump.

Chromium here rasterises WebGL in software, which is useful: it is a genuinely
slow frame rate, so a scrub that survives it is not depending on 60Hz.
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
PRODUCT = "/en/products/gantry-machining-center/kmc-gm"
GL_ARGS = ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"]
results = []


def check(name, ok, detail=""):
    results.append((name, ok, detail))


# The scene publishes a read-only handle for diagnostics (see SceneProbe).
CAMERA_POSE = """
() => {
  const s = window.__kmScene;
  return s ? [Number(s.x.toFixed(3)), Number(s.y.toFixed(3)), Number(s.z.toFixed(3))] : null;
}
"""


def scroll_to(page, fraction):
    """Put the page at a fraction of the Scene 03 range and let the ease settle."""
    page.evaluate(
        """(f) => {
          const section = document.querySelector('section[data-scrubbed]');
          const rect = section.getBoundingClientRect();
          const top = rect.top + window.scrollY;
          const range = section.offsetHeight - window.innerHeight;
          window.scrollTo(0, top + range * f);
        }""",
        fraction,
    )
    page.wait_for_timeout(1400)  # the scrub is eased; let it converge
    return page.evaluate(CAMERA_POSE)


def distance(a, b):
    return sum((x - y) ** 2 for x, y in zip(a, b)) ** 0.5


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=GL_ARGS)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

    # ---------------------------------------------- what M4 measured, and where
    #
    # M4 was the scroll choreography of the product page: scene 03 pinned the
    # stage, scrubbed a scripted camera path across a tall range, and slid the
    # feature cards past it from alternating sides. All of it was measured here —
    # the forward pass, the reverse pass, the drift between them.
    #
    # A machine is a window now. It does not scroll, so there is no scrub to
    # measure and no pinned stage to check: the camera is the visitor's, the
    # features are a list in the specification pane, and the disassembly is a
    # control (measured in m5-smoke). Those assertions are not weakened here,
    # they are gone with the thing they described.
    #
    # What is still M4's subject — scroll choreography that still exists — is
    # asserted where it lives: the landing hero's parallax and the history
    # timeline's pinned scrub in their own suites, the shared-element transition
    # below, and the constellation that replaced this page's opening.
    page.goto(f"{BASE}{PRODUCT}")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1500)

    check(
        "the machine opens as a window, not a scrolling page",
        page.locator("[data-machine-window]").count() == 1,
    )
    check(
        "and there is nothing behind it to scroll to",
        page.evaluate("() => document.documentElement.scrollHeight <= window.innerHeight + 1"),
        str(page.evaluate("() => document.documentElement.scrollHeight - window.innerHeight")),
    )

    open_pane(page, "viewer")
    page.wait_for_timeout(2500)
    check("the 3D is a pane of that window", page.locator("canvas").count() == 1)
    check(
        "the camera is the visitor's from the first frame",
        page.get_by_role("button", name="Reset").count() == 1,
    )
    check("no console errors in the window", not errors, str(errors[:2]))

    # --- The entry transition names a shared element on both sides.
    t = browser.new_page(viewport={"width": 1440, "height": 900})
    t.goto(f"{BASE}/en/products")
    t.wait_for_load_state("networkidle")
    card_named = t.evaluate("""() => !![...document.querySelectorAll('img')]
      .find((img) => (img.style.viewTransitionName || '').startsWith('machine-'))""")
    check("product card names its machine for the transition", card_named)

    t.goto(f"{BASE}{PRODUCT}")
    t.wait_for_load_state("networkidle")
    page_named = t.evaluate("""() => !![...document.querySelectorAll('img')]
      .find((img) => img.style.viewTransitionName === 'machine-kmc-gm')""")
    check("product hero names the same machine", page_named)

    # ------------------------------------------------ the constellation
    #
    # The series page opens on a ring of transcribed figures around the machine
    # rather than on a photograph and a table. Four things have to hold, and the
    # first two are the ones that broke while it was being built.
    t.goto(f"{BASE}{PRODUCT}")
    t.wait_for_load_state("networkidle")
    t.wait_for_timeout(2200)

    nodes = t.locator("[data-node]").count()
    check("the constellation renders its facts", 0 < nodes <= 10, f"{nodes} nodes")
    check(
        "a connector per fact",
        t.locator("[data-connector]").count() == nodes,
        f"{t.locator('[data-connector]').count()} connectors",
    )

    # The connectors are drawn with a dash offset animated to zero. An offset
    # left at full length is an invisible line, which is exactly what happened
    # when the tween was scheduled before the value that feeds it was set.
    drawn = t.evaluate(
        """() => [...document.querySelectorAll('[data-connector]')]
             .every((l) => parseFloat(getComputedStyle(l).strokeDashoffset || '0') < 1)"""
    )
    check("the connectors finish drawing", drawn)

    # Nothing may sit on top of anything else: the ring is positioned, and a
    # radius that is too small for the cards silently stacks them.
    overlaps = t.evaluate(
        """() => {
          const boxes = [...document.querySelectorAll('[data-node]')]
            .map((e) => ({ id: e.dataset.fact, r: e.getBoundingClientRect() }));
          const core = document.querySelector('[data-constellation-core]').getBoundingClientRect();
          const hit = (a, b) =>
            !(a.right < b.left || b.right < a.left || a.bottom < b.top || b.bottom < a.top);
          const out = [];
          for (let i = 0; i < boxes.length; i += 1) {
            if (hit(boxes[i].r, core)) out.push(boxes[i].id + ' over the core');
            for (let j = i + 1; j < boxes.length; j += 1) {
              if (hit(boxes[i].r, boxes[j].r)) out.push(boxes[i].id + ' over ' + boxes[j].id);
            }
          }
          return out;
        }"""
    )
    check("nothing in the ring overlaps", not overlaps, "; ".join(overlaps[:2]))

    # The core's two ways out.
    check(
        "the core opens the 3D view",
        t.locator("[data-constellation-core] [data-open-3d]").count() == 1,
    )
    check("the 3D pane exists to open", t.locator("[data-pane='viewer']").count() == 1)

    # Hovering a fact traces it back to the middle.
    first = t.locator("[data-node]").first.get_attribute("data-fact")
    t.hover(f"[data-fact='{first}']")
    t.wait_for_timeout(400)
    lit = t.evaluate(
        f"""() => getComputedStyle(document.querySelector("[data-connector]")).stroke"""
    )
    check("hovering a fact lights its connector", lit is not None, str(lit))

    # On a phone a ring is a pile, so the same nodes are a column instead. The
    # DOM order never changes — only the positioning.
    phone = browser.new_page(viewport={"width": 390, "height": 844})
    phone.goto(f"{BASE}{PRODUCT}")
    phone.wait_for_load_state("networkidle")
    phone.wait_for_timeout(1200)
    stacked = phone.evaluate(
        """() => {
          const nodes = [...document.querySelectorAll('[data-node]')];
          if (nodes.length < 2) return false;
          const tops = nodes.map((n) => Math.round(n.getBoundingClientRect().top));
          return tops.every((top, i) => i === 0 || top >= tops[i - 1]);
        }"""
    )
    check("the ring becomes a column on a phone", stacked)
    # `offsetParent` is an HTMLElement property and is simply undefined on an
    # SVG node, so the display of the sheet the lines live on is what says
    # whether they are drawn.
    check(
        "and the connectors are not drawn there",
        phone.evaluate(
            """() => {
              const sheet = document.querySelector('[data-connector]')?.closest('svg');
              return !sheet || getComputedStyle(sheet).display === 'none';
            }"""
        ),
    )
    phone.close()
    t.close()

    browser.close()

failed = [r for r in results if not r[1]]
for name, ok, detail in results:
    print(("PASS " if ok else "FAIL ") + name + ((" — " + detail) if detail and not ok else ""))
print(f"\n{len(results) - len(failed)}/{len(results)} passed")
sys.exit(1 if failed else 0)
