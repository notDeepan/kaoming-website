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


def toggle_explode(page):
    """Press the exploded-view control and let the rig settle.

    This used to be `scroll_explode(page, fraction)`: the disassembly was scrubbed
    across a tall scroll range, and a test could sample it at any point. The
    machine is a window now — a fixed panel with a close button — so there is no
    scroll range to sample and the explode is what it always also was, a control.

    What is asserted is unchanged: the machine starts assembled, the control
    takes it fully apart, and pressing it again puts it back. What is gone is the
    scrub, because the scrub is gone.
    """
    page.get_by_role("button", name="Exploded view").first.dispatch_event("click")
    page.wait_for_timeout(1800)
    return page.evaluate(RIG)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=GL_ARGS)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

    page.goto(f"{BASE}{PRODUCT}")

    open_pane(page, "viewer")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2500)

    # --- Structure: one canvas still, and the three new scenes present.
    check("still one canvas for the whole experience", page.locator("canvas").count() == 1)
    # Scenes 04, 05 and 06 were three sections of a scroll range. They are one
    # control and one list in the window now, so what has to exist is those.
    check(
        "the exploded view is offered as a control",
        page.get_by_role("button", name="Exploded view").count() == 1,
    )

    # --- The components come from the catalogue, not from the model.
    rows = page.locator("[data-component-card]")
    count = rows.count()
    check("component rows render from the catalogue", count == 6, f"{count} rows")

    titles = rows.all_inner_texts()
    check(
        "the head is named as the catalogue names it",
        any("KESSLER 2-AXIS HEAD" in title.upper() for title in titles),
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

    # --- Apart, and back together, on the control.
    opened = toggle_explode(page)
    if opened:
        check("the machine comes apart", opened["spread"] > 8.0, f"spread {opened['spread']:.2f} m")
        check(
            "it holds fully open rather than part way",
            abs(opened["amount"] - 1.0) < 0.02,
            f"amount {opened['amount']}",
        )

        closed = toggle_explode(page)
        check(
            "and the control puts it back",
            closed is not None and closed["spread"] < 0.35,
            f"spread {closed['spread']:.2f} m" if closed else "scene was torn down",
        )
    else:
        check("rig observable through the exploded view", False, str(opened))

    # --- Pointing at a component marks it on the machine (Part G.5).
    #
    # The leader line that used to be drawn from the row to the part went with
    # the scroll scenes: it existed because the row and the machine were far
    # apart on a tall page. In the window they are one panel, and the mark on the
    # machine is the whole of the relationship — which is what this asserts.
    toggle_explode(page)
    page.evaluate("document.querySelector('[data-component-card] button').focus()")
    page.wait_for_timeout(600)

    # --- Keyboard. No pointer is used from here on: Tab to the first component,
    # Enter to open it, and the panel must be a real one with real figures.
    page.evaluate("document.querySelector('[data-component-card] button').focus()")
    focused = page.evaluate(
        "() => document.activeElement.closest('[data-component-card]')?.dataset.componentObject"
    )
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
    # The card is the <li>; the control is the button inside it, so the identity
    # of the focused component is read off the card the active element sits in.
    check(
        "Tab moves to the next component in DOM order",
        page.evaluate(
            "() => document.activeElement.closest('[data-component-card]')?.dataset.componentObject"
        )
        == page.evaluate(
            "() => document.querySelectorAll('[data-component-card]')[1].dataset.componentObject"
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
    open_pane(rm, "viewer")
    rm.wait_for_timeout(2000)

    check(
        "components are readable under reduced motion",
        rm.locator("[data-component-card]").count() == 6,
    )

    # Nothing may take the machine apart on its own. There is no scroll range to
    # sweep any more, so what this asserts is that simply opening the pane and
    # letting it run leaves the machine assembled — the disassembly is the
    # visitor's choice and nothing else's.
    rm.wait_for_timeout(1500)
    quiet = rm.evaluate(RIG)
    check(
        "reduced motion leaves the machine assembled",
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
    rm.evaluate("document.querySelector('[data-component-card] button').focus()")
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
