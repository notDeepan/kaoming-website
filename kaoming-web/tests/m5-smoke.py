"""M5 acceptance smoke pass — the exploded view.

    npm run build && npm run start
    python tests/m5-smoke.py

The gate is "the signature moment works, with keyboard and reduced-motion
variants", so all three are measured here rather than only the mouse path:

  * the machine actually comes apart, holds open, and closes again across one
    scroll range, and does it deterministically in both directions;
  * every component the catalogue names is a real focusable control that opens a
    real panel with the transcribed figures in it, reachable with Tab and Enter
    and with no pointer involved at all;
  * under reduced motion nothing moves on scroll, and the exploded view is still
    available — because the visitor asked for it with a button.

The rig publishes `window.__kmRig` for the same reason the camera publishes
`window.__kmScene`: a read-only seam beats instrumenting the scene per test.
"""

import sys

from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
PRODUCT = "/en/products/gantry-machining-center/kmc-gm"
GL_ARGS = ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"]
results = []


def check(name, ok, detail=""):
    results.append((name, ok, detail))


RIG = """
() => {
  const r = window.__kmRig;
  return r ? { parts: r.parts, amount: Number(r.amount.toFixed(4)),
               spread: Number(r.spread.toFixed(3)), active: r.active } : null;
}
"""


def wait_rig_active(page, expected, timeout_ms=6000):
    """Wait for the machine to catch up with the DOM.

    Chromium rasterises WebGL in software here, at two or three frames a second,
    so the mark on the machine can legitimately be a frame behind the focus. The
    DOM is checked separately and immediately; this only waits for the 3D.
    """
    waited = 0
    while waited < timeout_ms:
        state = page.evaluate(RIG)
        if state and state["active"] == expected:
            return True
        page.wait_for_timeout(250)
        waited += 250
    return False


def marker(page):
    """What the DOM says is being pointed at — the authority, not the canvas."""
    return page.evaluate(
        "() => document.querySelector('[data-active-component]').dataset.activeComponent"
    )


def scroll_explode(page, fraction):
    """Put the page at a fraction of the Scenes 04-06 range; let the ease settle."""
    page.evaluate(
        """(f) => {
          const range = document.querySelector('[data-explode]').parentElement;
          const rect = range.getBoundingClientRect();
          const top = rect.top + window.scrollY;
          const span = range.offsetHeight - window.innerHeight;
          window.scrollTo(0, top + span * f);
        }""",
        fraction,
    )
    page.wait_for_timeout(1400)
    return page.evaluate(RIG)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=GL_ARGS)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

    page.goto(f"{BASE}{PRODUCT}")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2500)

    # --- Structure: one canvas still, and the three new scenes present.
    check("still one canvas for the whole experience", page.locator("canvas").count() == 1)
    for scene in ("04", "05", "06"):
        check(
            f"scene {scene} section is present",
            page.locator(f"[data-explode-scene='{scene}']").count() == 1,
        )

    # --- The components come from the catalogue, not from the model.
    rows = page.locator("[data-component-card]")
    count = rows.count()
    check("component rows render from the catalogue", count == 6, f"{count} rows")

    titles = rows.all_inner_texts()
    check(
        "the head is named as the catalogue names it",
        any("KESSLER 2-Axis Head" in title for title in titles),
        str(titles[:2]),
    )

    # Every row must point at a mesh that exists in the model, or the hotspot
    # marks nothing. The rig reports how many parts it found.
    objects = page.evaluate(
        """() => [...document.querySelectorAll('[data-component-card]')]
             .map((el) => el.dataset.componentObject)"""
    )
    check("every component names a model object", all(objects), str(objects))

    rig = page.evaluate(RIG)
    check("the rig read the model", rig is not None and rig["parts"] >= 8, str(rig))
    check("machine starts assembled", rig is not None and rig["spread"] < 0.01, str(rig))

    # Pin the quality tier before measuring anything that takes time. Chromium
    # rasterises WebGL in software here, so the Part O watchdog correctly walks
    # the ladder and eventually removes the canvas — which would end the
    # measurement rather than fail it. Dispatched rather than clicked, because a
    # real click scrolls the control into view and moves what is being measured.
    page.get_by_role("button", name="Low", exact=True).first.dispatch_event("click")
    page.wait_for_timeout(500)

    # --- Scene 04 → 06 as one movement of one scroll range.
    forward = {}
    for fraction in (0.0, 0.2, 0.35, 0.5, 0.75, 1.0):
        forward[fraction] = scroll_explode(page, fraction)

    if all(forward.values()):
        opened = forward[0.5]["spread"]
        check("the machine comes apart", opened > 8.0, f"spread {opened:.2f} m")
        check(
            "it holds open while its components are read",
            abs(forward[0.5]["amount"] - 1.0) < 0.02,
            f"amount {forward[0.5]['amount']}",
        )
        check(
            "it is back together at the end",
            forward[1.0]["spread"] < 0.35,
            f"spread {forward[1.0]['spread']:.2f} m",
        )

        # Reverse scrub: the same scroll positions must give the same machine.
        drift = []
        for fraction in (0.75, 0.5, 0.35, 0.2):
            back = scroll_explode(page, fraction)
            if back is None:
                break
            drift.append(abs(back["spread"] - forward[fraction]["spread"]))

        if len(drift) == 4:
            worst = max(drift)
            check(
                "scrubbing back retraces the same disassembly",
                worst < 0.35,
                f"worst drift {worst:.3f} m",
            )
            print(f"  reverse drift per stop: {[round(d, 3) for d in drift]}")
        else:
            check("rig observable through the reverse scrub", False, "scene was torn down")
    else:
        check("rig observable through the forward scrub", False, str(forward))

    # --- The leader line (Part G.5). With the machine open, pointing at a
    # component must draw a line that actually lands on that part — a line that
    # goes nowhere is worse than no line.
    scroll_explode(page, 0.5)
    page.evaluate("document.querySelector('[data-component-card]').focus()")
    line = None
    for _ in range(20):
        line = page.evaluate(
            """() => {
              const svg = document.querySelector('[data-leader-line]');
              if (!svg) return null;
              const l = svg.querySelector('line');
              const box = svg.getBoundingClientRect();
              return {
                opacity: getComputedStyle(svg).opacity,
                x1: Number(l.getAttribute('x1')), y1: Number(l.getAttribute('y1')),
                x2: Number(l.getAttribute('x2')), y2: Number(l.getAttribute('y2')),
                w: box.width, h: box.height,
              };
            }"""
        )
        if line and line["opacity"] == "1" and line["x2"]:
            break
        page.wait_for_timeout(250)

    check("a leader line is drawn", line is not None and line["opacity"] == "1", str(line))
    if line:
        check(
            "the leader line lands on the machine, not off the stage",
            0 <= line["x2"] <= line["w"] and 0 <= line["y2"] <= line["h"],
            f"({line['x2']:.0f}, {line['y2']:.0f}) in {line['w']:.0f}x{line['h']:.0f}",
        )
        check(
            "it starts at the component's row",
            abs(line["x1"] - line["x2"]) + abs(line["y1"] - line["y2"]) > 20,
            str(line),
        )

    # --- Keyboard. No pointer is used from here on: Tab to the first component,
    # Enter to open it, and the panel must be a real one with real figures.
    page.evaluate("document.querySelector('[data-component-card]').focus()")
    focused = page.evaluate("() => document.activeElement.dataset.componentCard")
    check("component rows take focus", bool(focused), str(focused))

    check("focus alone marks the component", marker(page) == focused, marker(page))
    check(
        "the mark reaches the machine",
        wait_rig_active(page, objects[0]),
        page.evaluate(RIG)["active"],
    )

    panel_id = page.evaluate("() => document.activeElement.getAttribute('aria-controls')")
    check(
        "panel starts closed",
        page.evaluate("() => document.activeElement.getAttribute('aria-expanded')") == "false",
    )

    page.keyboard.press("Enter")
    page.wait_for_timeout(300)
    check(
        "Enter opens the panel",
        page.evaluate("() => document.activeElement.getAttribute('aria-expanded')") == "true",
    )
    check("the panel is visible", page.locator(f"#{panel_id}").is_visible())

    panel_text = page.locator(f"#{panel_id}").inner_text()
    check(
        "the panel carries the transcribed figures",
        "HSK-A100" in panel_text and "±105°" in panel_text,
        panel_text[:120].replace("\n", " | "),
    )
    # The labels are message keys resolved through next-intl and then set in
    # caps by the label style, so compare case-insensitively — what must not
    # appear is the raw source key from the transcription.
    check(
        "specification labels are translated, not raw source keys",
        "spindleTaper" not in panel_text and "spindle taper" in panel_text.lower(),
        panel_text[:120].replace("\n", " | "),
    )

    page.keyboard.press("Enter")
    page.wait_for_timeout(300)
    check(
        "Enter closes it again",
        page.evaluate("() => document.activeElement.getAttribute('aria-expanded')") == "false",
    )

    # Tab must reach the next component, in the order the page lists them, and
    # the marked part on the machine must follow the focus rather than lag it.
    page.keyboard.press("Tab")
    page.wait_for_timeout(200)
    check(
        "Tab moves to the next component in DOM order",
        page.evaluate("() => document.activeElement.dataset.componentCard")
        == page.evaluate(
            "() => document.querySelectorAll('[data-component-card]')[1].dataset.componentCard"
        ),
    )
    check(
        "the marked part follows the focus",
        wait_rig_active(page, objects[1]),
        f"{page.evaluate(RIG)['active']} vs {objects[1]}",
    )

    # Leaving the list must clear the mark, or the machine keeps a component lit
    # that nobody is reading any more.
    page.evaluate("document.activeElement.blur()")
    page.wait_for_timeout(200)
    check("leaving the list clears the mark", marker(page) == "", marker(page))
    check("and clears it on the machine", wait_rig_active(page, ""), page.evaluate(RIG)["active"])

    check("no console errors during the exploded view", not errors, str(errors[:3]))
    page.close()

    # --- Reduced motion: the calm variant.
    ctx = browser.new_context(viewport={"width": 1440, "height": 900}, reduced_motion="reduce")
    rm = ctx.new_page()
    rm_errors = []
    rm.on("pageerror", lambda e: rm_errors.append(str(e)))
    rm.goto(f"{BASE}{PRODUCT}")
    rm.wait_for_load_state("networkidle")
    rm.wait_for_timeout(2000)

    check(
        "components are readable under reduced motion",
        rm.locator("[data-component-card]").count() == 6,
    )

    # Scroll all the way through the range the exploded view occupies, then come
    # back to the machine. Under reduced motion the stage is not pinned, so the
    # canvas stops rendering while it is off screen — coming back is what makes
    # the reading meaningful rather than a frozen frame.
    rm.evaluate("document.querySelector(\"[data-explode-scene='06']\").scrollIntoView()")
    rm.wait_for_timeout(800)
    rm.evaluate("document.querySelector('canvas').scrollIntoView()")
    rm.wait_for_timeout(1500)
    quiet = rm.evaluate(RIG)
    check(
        "reduced motion does not take the machine apart on scroll",
        quiet is not None and quiet["spread"] < 0.01,
        str(quiet),
    )

    # ...but the control still works, because pressing it is the visitor's choice.
    rm.get_by_role("button", name="Exploded view").first.dispatch_event("click")
    opened = False
    for _ in range(24):
        asked = rm.evaluate(RIG)
        if asked and asked["spread"] > 8.0:
            opened = True
            break
        rm.wait_for_timeout(250)
    check("the exploded view is still available on request", opened, str(rm.evaluate(RIG)))

    # The panel has to work with the keyboard here too.
    rm.evaluate("document.querySelector('[data-component-card]').focus()")
    rm.keyboard.press("Enter")
    rm.wait_for_timeout(200)
    check(
        "keyboard panel works under reduced motion",
        rm.evaluate("() => document.activeElement.getAttribute('aria-expanded')") == "true",
    )
    check("no console errors under reduced motion", not rm_errors, str(rm_errors[:3]))
    ctx.close()

    # --- A series the catalogue names no components for must not pretend.
    other = browser.new_page(viewport={"width": 1440, "height": 900})
    other.goto(f"{BASE}/en/products/double-column-machining-center/kmc-h7-h8")
    other.wait_for_load_state("networkidle")
    other.wait_for_timeout(1500)
    check(
        "a series with no transcribed components gets no exploded view",
        other.locator("[data-explode]").count() == 0,
    )
    other.close()

    browser.close()

failed = [r for r in results if not r[1]]
for name, ok, detail in results:
    print(("PASS " if ok else "FAIL ") + name + ((" — " + detail) if detail and not ok else ""))
print(f"\n{len(results) - len(failed)}/{len(results)} passed")
sys.exit(1 if failed else 0)
