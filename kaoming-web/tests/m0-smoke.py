"""M0 acceptance smoke pass (Part S.2 — every milestone ends with one).

Run against a production build:

    npm run build && npm run start
    python tests/m0-smoke.py

Covers the M0 gate beyond "it renders": Lenis ownership of scroll, the header
scroll contract, locale switching, the reduced-motion calm variant, mobile menu
focus handling, and the reserved-route vs genuine-404 split.
"""

from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
results = []


def check(name, ok, detail=""):
    results.append((name, ok, detail))


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # 1. Lenis owns scroll by default
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    page.goto(f"{BASE}/en")
    page.wait_for_load_state("networkidle")
    check("lenis active", "lenis" in page.locator("html").get_attribute("class"))

    # 2. Header goes solid past 80px, hides on scroll-down, returns on scroll-up
    page.mouse.wheel(0, 400)
    page.wait_for_timeout(800)
    hdr = page.get_by_role("banner")
    check("header solid after scroll", hdr.get_attribute("data-solid") == "true")
    check("header hidden on scroll-down", hdr.get_attribute("data-hidden") == "true")
    page.mouse.wheel(0, -150)
    page.wait_for_timeout(800)
    check("header returns on scroll-up", hdr.get_attribute("data-hidden") == "false")

    # 3. Language switcher keeps the current path
    page.goto(f"{BASE}/en/technology")
    page.wait_for_load_state("networkidle")
    page.get_by_role("banner").get_by_role("button", name="Change language").click()
    page.get_by_role('banner').locator('a[hreflang="zh-Hant-TW"]').first.click()
    try:
        page.wait_for_url("**/zh-tw/technology", timeout=8000)
        ok = True
    except Exception:
        ok = False
    page.wait_for_load_state("networkidle")
    check("locale switch preserves path", ok and page.url.endswith("/zh-tw/technology"), page.url)
    check("html lang switched", page.locator("html").get_attribute("lang") == "zh-Hant-TW")

    # 4. CJK safety-net sheet attaches after hydration on zh-tw only
    check("cjk sheet on zh-tw", page.locator('link[data-cjk-faces]').count() == 1)
    page.goto(f"{BASE}/en")
    page.wait_for_load_state("networkidle")
    check("no cjk sheet on en", page.locator('link[data-cjk-faces]').count() == 0)
    page.close()

    # 5. Reduced motion: no Lenis, native scroll still works
    ctx = browser.new_context(viewport={"width": 1440, "height": 900}, reduced_motion="reduce")
    rm = ctx.new_page()
    rm.goto(f"{BASE}/en")
    rm.wait_for_load_state("networkidle")
    rm.wait_for_timeout(400)
    check("reduced motion disables lenis", "lenis" not in rm.locator("html").get_attribute("class"))
    rm.mouse.wheel(0, 600)
    rm.wait_for_timeout(500)
    y = rm.evaluate("window.scrollY")
    check("reduced motion still scrolls", y > 100, f"scrollY={y}")
    check("reduced-motion header reacts", rm.get_by_role("banner").get_attribute("data-solid") == "true")
    ctx.close()

    # 6. Mobile menu: focus trap, Escape, scroll lock, focus restore
    m = browser.new_page(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True)
    m.goto(f"{BASE}/en")
    m.wait_for_load_state("networkidle")
    m.get_by_role("button", name="Open menu").click()
    m.wait_for_timeout(600)
    check("menu locks scroll", "lenis-stopped" in m.locator("html").get_attribute("class"))
    check("menu focuses close button",
          m.evaluate("document.activeElement?.getAttribute('aria-label')") == "Close menu")
    m.keyboard.press("Escape")
    m.wait_for_timeout(500)
    check("escape closes menu", m.get_by_role("dialog", name="Menu").is_hidden())
    check("focus restored to trigger",
          m.evaluate("document.activeElement?.getAttribute('aria-label')") == "Open menu")
    check("scroll unlocked", "lenis-stopped" not in m.locator("html").get_attribute("class"))
    m.close()

    # 7. Reserved route renders; unknown route 404s
    q = browser.new_page(viewport={"width": 1440, "height": 900})
    r1 = q.goto(f"{BASE}/en/products/vertical-machining-center/kmc-ce")
    check("reserved route 200", r1.status == 200, str(r1.status))
    r2 = q.goto(f"{BASE}/en/not-a-real-route")
    check("unknown route 404", r2.status == 404, str(r2.status))
    r3 = q.goto(f"{BASE}/")
    check("root redirects to default locale", q.url.rstrip("/").endswith("/en"), q.url)
    q.close()

    browser.close()

failed = [r for r in results if not r[1]]
for name, ok, detail in results:
    print(("PASS " if ok else "FAIL ") + name + ((" — " + detail) if detail and not ok else ""))
print(f"\n{len(results) - len(failed)}/{len(results)} passed")
