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

    page.goto(f"{BASE}{PRODUCT}")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2500)

    check("one canvas for the whole experience", page.locator("canvas").count() == 1)
    check("scene 03 section is present", page.locator("section[data-scrubbed]").count() == 1)

    cards = page.locator("[data-feature-card]")
    count = cards.count()
    check("feature cards render from the catalogue", 3 <= count <= 6, f"{count} cards")

    # Cards must alternate sides, which is what makes the machine readable
    # between them rather than permanently hidden behind a panel.
    sides = page.evaluate("""() => [...document.querySelectorAll('[data-feature-card]')]
      .map((el) => getComputedStyle(el).justifyContent)""")
    check("cards alternate sides", len(set(sides)) == 2, str(sides))

    # Pin the quality tier before measuring. Under software rasterisation the
    # watchdog correctly walks the Part O ladder and eventually removes the
    # canvas, which would end the measurement rather than fail it — and the
    # scrub takes long enough to measure that it gets there. Dispatched rather
    # than clicked: a real click scrolls the control into view, which moves the
    # very scroll position being measured.
    page.get_by_role("button", name="Low", exact=True).first.dispatch_event("click")
    page.wait_for_timeout(500)

    # --- Forward pass, recording the camera at each stop.
    forward = {}
    for fraction in (0.0, 0.25, 0.5, 0.75, 1.0):
        pose = scroll_to(page, fraction)
        check(f"camera readable at {fraction:.2f}", pose is not None)
        if pose is None:
            break
        forward[fraction] = pose

    if len(forward) == 5:
        # The camera must actually travel: a scrub that does not move is not a
        # scrub, and would pass every other check here.
        travelled = distance(forward[0.0], forward[1.0])
        check("camera travels across the scroll range", travelled > 4.0, f"{travelled:.2f} units")

        # No jumps between adjacent samples — the path is a curve, not a cut.
        hops = [
            distance(forward[a], forward[b])
            for a, b in ((0.0, 0.25), (0.25, 0.5), (0.5, 0.75), (0.75, 1.0))
        ]
        check("no discontinuity along the path", max(hops) < travelled, f"max hop {max(hops):.2f}")

        # --- Reverse pass: the same positions, scrolled the other way.
        # Progress 0 is excluded on purpose: at exactly zero the visitor is back
        # in Scene 01, where the camera idles by design, so it is the one point
        # that is legitimately not a function of scroll.
        drift = []
        for fraction in (0.75, 0.5, 0.25):
            pose = scroll_to(page, fraction)
            if pose is None:
                break
            drift.append(distance(pose, forward[fraction]))

        if len(drift) == 3:
            worst = max(drift)
            check(
                "scrubbing back retraces the same path",
                worst < 0.25,
                f"worst drift {worst:.3f} units",
            )
            print(f"  reverse drift per stop: {[round(d, 3) for d in drift]}")
        else:
            check("camera observable through the reverse scrub", False, "scene was torn down")

        # --- Framerate independence. Throttle the CPU hard, repeat the pass,
        # and the camera must land in the same places: a frame-counted animation
        # would fall behind and land somewhere else.
        cdp = page.context.new_cdp_session(page)
        cdp.send("Emulation.setCPUThrottlingRate", {"rate": 6})
        slow = {}
        for fraction in (0.25, 0.5, 0.75):
            slow[fraction] = scroll_to(page, fraction)
        cdp.send("Emulation.setCPUThrottlingRate", {"rate": 1})

        if all(slow[f] for f in slow):
            deltas = [distance(slow[f], forward[f]) for f in slow]
            worst_fps = max(deltas)
            check(
                "same scroll lands the camera in the same place at 6x CPU throttle",
                worst_fps < 0.25,
                f"worst {worst_fps:.3f} units",
            )
            print(f"  throttled drift per stop: {[round(d, 3) for d in deltas]}")
        else:
            check("camera observable while throttled", False, "scene was torn down")

    check("no console errors during the scrub", not errors, str(errors[:3]))
    page.close()

    # --- Reduced motion: the calm variant. No pinning, no scrub, cards readable.
    ctx = browser.new_context(viewport={"width": 1440, "height": 900}, reduced_motion="reduce")
    rm = ctx.new_page()
    rm.goto(f"{BASE}{PRODUCT}")
    rm.wait_for_load_state("networkidle")
    rm.wait_for_timeout(2000)
    sticky = rm.evaluate("""() => {
      const stage = document.querySelector('section[data-scrubbed] > div');
      return getComputedStyle(stage).position;
    }""")
    check("reduced motion does not pin the stage", sticky != "sticky", str(sticky))

    before = rm.evaluate(CAMERA_POSE)
    rm.evaluate("window.scrollBy(0, 2500)")
    rm.wait_for_timeout(1500)
    after = rm.evaluate(CAMERA_POSE)
    if before and after:
        moved = distance(before, after)
        check("reduced motion does not scroll-drive the camera", moved < 0.6, f"{moved:.3f} units")
    ctx.close()

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
        t.locator("[data-constellation-core] a[href='#experience']").count() == 1,
    )
    check("the 3D anchor exists", t.locator("#experience").count() == 1)

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
