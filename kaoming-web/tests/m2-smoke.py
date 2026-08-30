"""M2 acceptance smoke pass — "a pre-populated RFQ lands in DB + inbox from
every entry point".

Run against a production build:

    npm run build && npm run start
    python tests/m2-smoke.py

Drives the real form in a real browser, then reads the database back to confirm
what was stored. Also exercises the abuse controls, the compare route and the
search overlay.
"""

import json
import os
import sqlite3
import subprocess
import sys
import time

from playwright.sync_api import sync_playwright

# The limiter keys on the client address, and its window is ten minutes of
# process memory. Without an address of their own, the enquiries this suite
# sends would still be counted against the ones m6 sends — and against this
# suite's own previous run — which is how a green suite turns red for a reason
# that is not a defect. Each block below gets its own address instead, so the
# flood check still proves the limiter refuses a flood.
TRAP_IP = f"10.7.{int(time.time()) % 251}.11"
FLOOD_IP = f"10.7.{int(time.time()) % 251}.12"
FORM_IP = f"10.7.{int(time.time()) % 251}.13"


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
DB = os.path.join(os.path.dirname(__file__), "..", "prisma", "dev.db")
results = []


def check(name, ok, detail=""):
    results.append((name, ok, detail))


def query(sql, args=()):
    connection = sqlite3.connect(DB)
    try:
        connection.row_factory = sqlite3.Row
        return [dict(row) for row in connection.execute(sql, args).fetchall()]
    finally:
        connection.close()


def fill_and_submit(page, *, company, wait_before_submit=3.2):
    page.fill('#rfq-company', company)
    page.fill('#rfq-name', 'Test Buyer')
    page.fill('#rfq-email', 'buyer@example.com')
    page.select_option('#rfq-country', label='Germany')
    page.get_by_role('button', name='Continue').click()
    page.fill('#rfq-material', 'S45C')
    page.fill('#rfq-message', 'Testing the enquiry path end to end.')
    page.check('input[name="consent"]')
    # The time trap rejects anything submitted in under three seconds.
    time.sleep(wait_before_submit)
    page.get_by_role('button', name='Send enquiry').click()


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    # --- Every entry point carries its machine and its source through.
    entry_points = [
        ("product", "/en/products/gantry-machining-center/kmc-gm", "Request a quote"),
        ("compare", "/en/compare?m=kmc-gm,kmc-gn", "Request a quote"),
        ("contact", "/en/support/contact", "Request a quote"),
    ]
    page = browser.new_page(
        viewport={"width": 1440, "height": 900},
        extra_http_headers={"x-forwarded-for": FORM_IP},
    )
    for source, path, label in entry_points:
        page.goto(f"{BASE}{path}")
        page.wait_for_load_state("networkidle")
        # A machine is a window now, and its enquiry sits in the specification
        # pane beside the figures it would be quoting against.
        if source == "product":
            open_pane(page, "spec")
        if source == "product":
            # A machine holds its own enquiry now, so attribution is carried by
            # the form rather than by a query string on a link to one. Same two
            # facts, read where they now live.
            check(
                "product carries a source",
                page.locator("[data-rfq-source]").first.get_attribute("data-rfq-source")
                == "product",
                str(page.locator("[data-rfq-source]").first.get_attribute("data-rfq-source")),
            )
            pressed = page.locator('[data-machine="kmc-gm"]').first.get_attribute("aria-pressed")
            check("product carries a machine", pressed == "true", str(pressed))
            continue

        # Scoped to main: the header CTA carries the same label on every page.
        href = page.locator("main").get_by_role("link", name=label).first.get_attribute("href")
        check(f"{source} links to the RFQ with a source", href and "source=" in href, str(href))
        if source == "compare":
            check(f"{source} carries a machine", href and "machine=" in href, str(href))

    # --- The form pre-populates from the URL.
    page.goto(f"{BASE}/en/rfq?machine=kmc-gm&source=product")
    page.wait_for_load_state("networkidle")
    pressed = page.locator('[data-machine="kmc-gm"]').get_attribute("aria-pressed")
    check("machine arrives pre-selected", pressed == "true", str(pressed))

    # --- A real submission reaches the database.
    marker = f"Playwright GmbH {int(time.time())}"
    fill_and_submit(page, company=marker)
    page.wait_for_selector("text=Thank you", timeout=15000)
    check("form confirms receipt", page.get_by_text("Thank you").first.is_visible())

    rows = query("SELECT * FROM Lead WHERE company = ?", (marker,))
    check("lead stored", len(rows) == 1, f"{len(rows)} rows")
    if rows:
        lead = rows[0]
        check("lead keeps the entry point", lead["source"] == "product", lead["source"])
        check("lead keeps the locale", lead["locale"] == "en", lead["locale"])
        check("lead records consent", bool(lead["consentAt"]))
        check("lead keeps the project detail", lead["material"] == "S45C", str(lead["material"]))
        machines = query("SELECT * FROM LeadMachine WHERE leadId = ?", (lead["id"],))
        check("lead keeps its machine", len(machines) == 1 and machines[0]["seriesSlug"] == "kmc-gm")
        check("no IP address column exists", "ip" not in lead and "ipAddress" not in lead)

    # --- Validation rejects an incomplete enquiry rather than storing it.
    page.goto(f"{BASE}/en/rfq")
    page.wait_for_load_state("networkidle")
    page.fill('#rfq-company', 'No Email Ltd')
    page.fill('#rfq-name', 'Test')
    page.get_by_role('button', name='Continue').click()
    still_on_step_one = page.locator('#rfq-email').is_visible()
    check("invalid step one does not advance", still_on_step_one)
    check("nothing stored for the invalid attempt", len(query("SELECT id FROM Lead WHERE company = ?", ('No Email Ltd',))) == 0)
    page.close()

    # --- Search overlay: the header control works and finds a legacy code.
    s = browser.new_page(viewport={"width": 1440, "height": 900})
    s.goto(f"{BASE}/en")
    s.wait_for_load_state("networkidle")
    s.get_by_role("button", name="Search").first.click()
    s.wait_for_timeout(300)
    s.keyboard.type("KMC-SR")
    s.wait_for_timeout(600)
    hephaestus = s.get_by_role("dialog").get_by_text("Hephaestus").first.is_visible()
    check("legacy code finds the catalogue series", hephaestus)
    s.keyboard.press("Escape")
    s.wait_for_timeout(300)
    check("escape closes search", s.get_by_role("dialog").is_hidden())
    s.close()

    # --- Compare: tray builds a shareable URL, page renders differences.
    c = browser.new_page(viewport={"width": 1440, "height": 900})
    c.goto(f"{BASE}/en/products/gantry-machining-center/kmc-gm")
    c.wait_for_load_state("networkidle")
    # One control now, in the window's specification pane — beside the figures a
    # buyer would be comparing. The hero copy of it went with the hero.
    open_pane(c, "spec")
    c.get_by_role("button", name="Add to compare").first.click()
    c.wait_for_timeout(400)
    check("tray appears after adding", c.get_by_role("complementary").is_visible())
    c.goto(f"{BASE}/en/compare?m=kmc-gm,kmc-ce")
    c.wait_for_load_state("networkidle")
    check("compare renders both machines", c.locator("thead th").count() == 3)
    check("compare marks a differing row", c.get_by_text("Differs").first.is_visible())
    c.close()

    browser.close()

# --- The abuse controls, exercised directly against the endpoint.
def post(fields, address=TRAP_IP):
    payload = {
        "company": "Bot Co", "name": "Bot", "email": "bot@example.com",
        "country": "Germany", "consent": "true", "locale": "en", "source": "rfq",
        "machines": "[]", "elapsedMs": "9000", "website": "",
    }
    payload.update(fields)
    args = []
    for key, value in payload.items():
        args += ["-F", f"{key}={value}"]
    out = subprocess.run(
        ["curl", "-s", "-o", "-", "-w", "\n%{http_code}", "-H", f"X-Forwarded-For: {address}", "-X", "POST", f"{BASE}/api/rfq", *args],
        capture_output=True, text=True,
    ).stdout.strip().splitlines()
    return out[-1], "\n".join(out[:-1])


before = len(query("SELECT id FROM Lead"))

status, body = post({"website": "http://spam.example"})
check("honeypot answers like a success", status == "200", status)

status, body = post({"elapsedMs": "120"})
check("time trap answers like a success", status == "200", status)

check("neither trap stored a lead", len(query("SELECT id FROM Lead")) == before)

status, body = post({"email": "not-an-email"})
check("invalid email is rejected", status == "422", status)

status, body = post({"consent": "false"})
check("missing consent is rejected", status == "422", status)

check("still nothing stored from rejected attempts", len(query("SELECT id FROM Lead")) == before)

# --- The limiter itself: keep posting valid enquiries until one is refused.
limit_hit = False
for _ in range(int(os.environ.get("RFQ_RATE_MAX", "40")) + 2):
    status, _ = post({"company": "Rate Limit Probe"}, address=FLOOD_IP)
    if status == "429":
        limit_hit = True
        break
check("rate limiter refuses a flood", limit_hit)

failed = [r for r in results if not r[1]]
for name, ok, detail in results:
    print(("PASS " if ok else "FAIL ") + name + ((" — " + detail) if detail and not ok else ""))
print(f"\n{len(results) - len(failed)}/{len(results)} passed")
sys.exit(1 if failed else 0)
