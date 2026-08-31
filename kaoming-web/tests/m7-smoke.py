"""M7 acceptance smoke pass — every route in the Part E.1 site map.

    npm run build && npm run start
    python tests/m7-smoke.py

The gate is "every route in E.1 live in both locales", and "live" has to mean
more than 200 OK — the reserved-route placeholder returns 200 too. So every
route is checked for a real page: its own <h1>, its own <title>, and no
placeholder marker.

Then the pages that carry KAO MING's own data are checked against that data
rather than against themselves: the agent registry, the history warning, the way
selector, the catalogue reader.
"""

import json
import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://localhost:3000"
results = []


def check(name, ok, detail=""):
    results.append((name, ok, detail))


# Every route in the Part E.1 site map, plus the two Part I/J routes the
# chrome links to. Product routes are covered by M1 and M6.
ROUTES = [
    "/",
    "/products",
    "/applications",
    "/applications/aerospace",
    "/applications/automotive",
    "/applications/die-mold",
    "/applications/energy",
    "/applications/heavy-industry",
    "/applications/general-engineering",
    "/technology",
    "/company/about",
    "/company/history",
    "/company/factory",
    "/company/network",
    "/company/sustainability",
    "/resources",
    "/case-studies",
    "/catalogue",
    "/support/service",
    "/support/parts",
    "/support/faq",
    "/support/contact",
    "/support/representatives",
]

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 900})
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))

    # --- Every route, both locales, and none of them a placeholder.
    titles = {}
    for locale in ("en", "zh-tw"):
        for route in ROUTES:
            path = f"/{locale}{route}".rstrip("/") if route != "/" else f"/{locale}"
            response = page.goto(f"{BASE}{path}")
            page.wait_for_load_state("domcontentloaded")

            status = response.status if response else 0
            headings = page.locator("h1").count()
            body = page.inner_text("body")
            placeholder = "reserved" in body.lower() and "this section" in body.lower()

            ok = status == 200 and headings >= 1 and not placeholder
            check(
                f"{locale}{route} is a real page",
                ok,
                f"status {status}, {headings} h1, placeholder={placeholder}",
            )

            # A Server Component importing a value from a `'use client'` module
            # gets a client-reference stub instead, and Next does not error: the
            # stub is an object, so the server prints its own error text or does
            # arithmetic on it. It rendered on the flagship product page and
            # every gate still passed, because nobody was reading the page.
            leaked = "attempted to call" in body.lower()
            check(f"{locale}{route} leaks no client reference", not leaked)

            titles[path] = page.title()

    # Two routes sharing a title usually means one is rendering the other's
    # content — the failure mode a status check cannot see.
    english = [title for path, title in titles.items() if path.startswith("/en")]
    check(
        "each English route has its own title",
        len(set(english)) == len(english),
        f"{len(english) - len(set(english))} duplicates",
    )

    # --- The network page against the registry it is built from.
    registry = json.loads(
        Path("content/company/distributors.json").read_text(encoding="utf-8")
    )
    records = [agent for agents in registry["regions"].values() for agent in agents]
    international = [agent for agent in records if not agent.get("domestic")]

    page.goto(f"{BASE}/en/company/network")
    page.wait_for_load_state("networkidle")

    check("five region tabs, KAO MING's own", page.locator("[data-region]").count() == 6)

    # Domestic agents are hidden on /en by default (Part J.4).
    check(
        "Taiwan domestic agents are hidden on /en",
        page.locator("[data-country='Taiwan']").count() == 0,
    )
    page.get_by_label("Include Taiwan domestic").check()
    page.wait_for_timeout(300)
    check(
        "and can be shown",
        page.locator("[data-country='Taiwan']").count() == 1,
    )

    page.goto(f"{BASE}/zh-tw/company/network")
    page.wait_for_load_state("networkidle")
    check(
        "shown by default on zh-tw",
        page.locator("[data-country='Taiwan']").count() == 1,
    )

    page.goto(f"{BASE}/en/company/network")
    page.wait_for_load_state("networkidle")
    countries = page.locator("[data-country]").count()
    expected = len({agent["country"] for agent in international})
    check(
        "a marker for every international territory",
        countries == expected,
        f"{countries} shown, {expected} in the registry",
    )

    # A country with two agents must expand to both.
    page.locator("[data-country='Canada']").click()
    page.wait_for_timeout(300)
    canada = len([agent for agent in international if agent["country"] == "Canada"])
    check(
        "a multi-agent country expands to a list",
        page.locator("[data-agent]").count() == canada,
        f"{page.locator('[data-agent]').count()} cards, {canada} agents",
    )

    # --- The locator, since it stopped being a picture beside a list.
    #
    # The old version showed nothing until you clicked and had no link between
    # the map and the directory. These four assertions are the difference: the
    # answer is on the page from the first frame, a marker is a real control, the
    # two are bound in both directions, and the search actually narrows both.
    check(
        "every territory is listed before any interaction",
        page.locator("[data-marker]").count() == expected,
        f"{page.locator('[data-marker]').count()} markers",
    )

    page.locator("[data-country='Canada']").click()  # close it again
    page.wait_for_timeout(250)
    page.locator("[data-marker='Japan']").click()
    page.wait_for_timeout(500)
    check(
        "clicking a marker opens that country in the directory",
        page.get_attribute("[data-country='Japan']", "aria-expanded") == "true",
    )
    check(
        "and the marker shows as selected",
        page.get_attribute("[data-marker='Japan']", "aria-pressed") == "true",
    )

    page.locator("[data-marker='Brazil']").focus()
    page.keyboard.press("Enter")
    page.wait_for_timeout(400)
    check(
        "a marker is operable from the keyboard",
        page.get_attribute("[data-country='Brazil']", "aria-expanded") == "true",
    )

    page.fill("[data-network-search]", "india")
    page.wait_for_timeout(500)
    rows = page.locator("[data-country]").count()
    check(
        "search narrows the directory and the map together",
        rows == page.locator("[data-marker]").count() and 0 < rows < expected,
        f"{rows} rows, {page.locator('[data-marker]').count()} markers",
    )

    page.fill("[data-network-search]", "zzzzzz")
    page.wait_for_timeout(400)
    check(
        "an empty result offers the enquiry form instead of nothing",
        page.locator("a[href*='/rfq']").count() > 0
        and "no representative matches" in page.inner_text("body").lower(),
    )
    page.fill("[data-network-search]", "")
    page.wait_for_timeout(300)

    # The registry's note asks KAO MING's sales team to confirm every entry. It
    # is addressed to them, not to a buyer, and a production build must not
    # publish it.
    check(
        "the internal verification note is not published",
        "ask sales to confirm" not in page.inner_text("body").lower(),
    )

    # The privacy rule: no personal mailbox reaches the page.
    #
    # This deliberately does NOT restate the allowlist from lib/distributors.
    # It did, and that made the check circular — the test and the code shared
    # one list, so a rule that published somebody's personal inbox would have
    # been confirmed correct by its own definition. Judge instead the shape of
    # what actually reached the page: a role mailbox is a role word with at most
    # one qualifier. Anything that looks like a person's name fails here even if
    # the module decided it was fine.
    shown = page.inner_text("body")
    role_shape = re.compile(r"^[a-z]+([._-][a-z0-9]+)?@", re.I)
    personal_shape = re.compile(r"^[a-z]\.?[a-z]+[._-][a-z]+@", re.I)

    published = [
        agent["email"]
        for agent in international
        if agent.get("email") and agent["email"] in shown
    ]
    malformed = [
        email
        for email in published
        if not role_shape.match(email) or personal_shape.match(email)
    ]
    check("no personal mailbox is published", not malformed, str(malformed[:3]))
    check(
        "most agent emails are withheld, as the privacy note asks",
        len(published) * 2 < len(international),
        f"{len(published)} of {len(international)} published",
    )

    # --- History: the pairing was withheld while it was a guess. It has since
    # been recovered from the source page's own stored layout, so what this now
    # asserts is that every year carries its milestone, that the record is also
    # available as a plain list, and that the one figure the two locales still
    # disagree on is disclosed rather than quietly averaged.
    page.goto(f"{BASE}/en/company/history")
    page.wait_for_load_state("networkidle")
    # Counted against each other rather than against a number written here. The
    # record grows — it stood at the about page's ten, and the 2026 research
    # carried it to fourteen — and a test that pins the count turns every
    # addition into a failure. What must hold is that the three renderings of it
    # agree, and that it never shrinks below what kaoming.com itself publishes.
    years = page.locator("[data-year]").count()
    milestones = page.locator("[data-milestone]").count()
    records = page.locator("[data-record]").count()
    check("the timeline, the years and the list agree", years == milestones == records,
          f"{years} years, {milestones} milestones, {records} records")
    check("the record is at least what the about page carries", records >= 10, str(records))

    paired = page.evaluate(
        """() => [...document.querySelectorAll('[data-milestone]')]
             .filter((el) => el.textContent.trim().replace(/^\d{4}/, '').trim().length > 8)
             .length"""
    )
    check("every year carries its milestone", paired == records, f"{paired} of {records}")

    body = page.inner_text("body")
    check("1968 is the founding", "1968" in body and "founder" in body.lower())
    check(
        "the locales' disagreement on the plant area is disclosed",
        "40,000" in body and "25,000" in body,
    )

    # --- News. The section grew from seven entries transcribed off kaoming.com
    # to eleven, and the four that came from the 2026 research carry rules the
    # earlier ones never had to. Each of these fails quietly and looks fine.
    page.goto(f"{BASE}/en/news")
    page.wait_for_load_state("networkidle")
    entries = page.locator("[data-news-item]").count()
    check("the news index carries the whole record", entries >= 11, f"{entries} entries")

    news_body = page.inner_text("main")

    # CLAUDE.md forbids a named cooperation claim. Two organiser releases list
    # KAO MING beside other manufacturers, and that roster is recorded in the
    # source file and must never reach a page: on KAO MING's own news section a
    # competitor list reads as an association whether or not it is meant to.
    leaked = [
        name
        for name in ("FFG", "HIWIN", "MAZAK", "Tongtai", "Quaser", "SOCO", "HEIDENHAIN",
                     "Victor Taichung", "TTGroup")
        if name in news_body
    ]
    check("no other manufacturer is named on the news index", not leaked, ", ".join(leaked))

    # A legacy code is a search synonym and never a displayed name.
    legacy = [c for c in ("KMC-HIS", "KMC-RF", "KMC-321HIS") if c in news_body]
    check("no legacy model code is displayed", not legacy, ", ".join(legacy))

    # The staleness notice reads the data. It existed because the newest entry
    # was 2023; with 2026 entries present it must take itself off the page.
    check(
        "the staleness notice is gone now the record is current",
        page.locator("text=Nothing later exists").count() == 0,
    )

    # A date the source never stated is never printed. TIMTOS 2023 is the case:
    # the source gives a month, so a month is what may appear.
    page.goto(f"{BASE}/en/news/timtos-2023")
    page.wait_for_load_state("networkidle")
    stamp = page.locator("time").first.inner_text()
    check("a month-precision date prints a month", stamp.strip() == "March 2023", stamp)

    # Trade-press figures are marked as trade-press figures. The KMC-123EU has
    # no catalogue in the kit, so its numbers are the press's and the page says
    # so beside them.
    page.goto(f"{BASE}/en/news/tmts-2026")
    page.wait_for_load_state("networkidle")
    check("press-sourced figures carry their caveat", page.locator("[data-spec-caveat]").count() == 1)
    links = page.locator("[data-press] a")
    check("both outlets are cited", links.count() == 2, f"{links.count()} citations")
    hrefs = page.evaluate(
        "() => [...document.querySelectorAll('[data-press] a')].map((a) => a.getAttribute('href'))"
    )
    check(
        "each citation links out to the outlet",
        all(h and h.startswith("https://") for h in hrefs),
        str(hrefs),
    )
    # A quotation, not an article. The longest thing reproduced from either
    # outlet stays short enough to be a citation rather than a republication.
    longest = page.evaluate(
        "() => Math.max(0, ...[...document.querySelectorAll('[data-press] blockquote')]"
        ".map((q) => q.textContent.trim().length))"
    )
    check("what is quoted stays a quotation", 0 < longest <= 200, f"{longest} characters")

    check(
        "the launch is not given a product page it has no catalogue for",
        page.locator("a[href*='kmc-123eu']").count() == 0,
    )

    # --- Technology: the way selector is a comparison, not prose.
    page.goto(f"{BASE}/en/technology")
    page.wait_for_load_state("networkidle")
    check("both way types are presented", page.locator("[data-way]").count() == 2)
    check(
        "the uncaptured sections are named as gaps",
        page.locator("[data-content-gap]").count() >= 1,
    )

    # --- Applications: the gap is stated on every one of the six.
    for slug in ("aerospace", "automotive", "die-mold", "energy", "heavy-industry",
                 "general-engineering"):
        page.goto(f"{BASE}/en/applications/{slug}")
        page.wait_for_load_state("networkidle")
        check(
            f"{slug} states its content gap",
            page.locator("[data-content-gap]").count() >= 1,
        )

    page.goto(f"{BASE}/en/applications/aerospace")
    page.wait_for_load_state("networkidle")
    check(
        "aerospace carries the line KAO MING actually wrote",
        "aviation" in page.inner_text("body").lower(),
    )

    # --- The catalogue reader.
    manifest = json.loads(Path("content/catalogue/generated.json").read_text(encoding="utf-8"))
    spreads = sum(document["pageCount"] for document in manifest["documents"])
    check("48 spreads rasterized", spreads == 48, f"{spreads} spreads")

    page.goto(f"{BASE}/en/catalogue")
    page.wait_for_load_state("networkidle")
    check("three catalogues on the shelf", page.locator("[data-catalogue]").count() == 3)

    page.goto(f"{BASE}/en/catalogue/gn-gm-2026-en")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(500)
    check("the reader opens on page 1", page.inner_text("[data-current-page]") == "1")

    page.locator("[data-page-next]").click()
    page.wait_for_timeout(400)
    check("it turns forward", page.inner_text("[data-current-page]") == "2")

    page.keyboard.press("ArrowLeft")
    page.wait_for_timeout(400)
    check("and back, from the keyboard", page.inner_text("[data-current-page]") == "1")

    page.locator("[data-toc-toggle]").click()
    page.wait_for_timeout(300)
    check("the contents jump to a page", page.locator("[data-toc-page='7']").count() == 1)
    page.locator("[data-toc-page='7']").click()
    page.wait_for_timeout(400)
    check("and land on it", page.inner_text("[data-current-page]") == "7")

    # This catalogue has no text layer, so the reader must say so rather than
    # offering a search that can never match.
    check(
        "an unsearchable catalogue says so",
        page.locator("[data-catalogue-search]").count() == 0
        and "no text layer" in page.inner_text("body").lower(),
    )

    # The Clymene catalogue does have text, so search must work there.
    page.goto(f"{BASE}/en/catalogue/clymene-2026-en")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(500)
    search = page.locator("[data-catalogue-search]")
    check("a searchable catalogue offers search", search.count() == 1)
    search.fill("spindle")
    page.wait_for_timeout(400)
    check(
        "and finds pages",
        page.locator("[data-result]").count() > 0,
        f"{page.locator('[data-result]').count()} results",
    )

    check("no page errors across M7", not errors, str(errors[:3]))
    browser.close()

failed = [r for r in results if not r[1]]
for name, ok, detail in results:
    print(("PASS " if ok else "FAIL ") + name + ((" — " + detail) if detail and not ok else ""))
print(f"\n{len(results) - len(failed)}/{len(results)} passed")
sys.exit(1 if failed else 0)
