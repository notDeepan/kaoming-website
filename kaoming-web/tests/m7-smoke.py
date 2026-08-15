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

    # --- History: the pairing must not be asserted.
    page.goto(f"{BASE}/en/company/history")
    page.wait_for_load_state("networkidle")
    check("ten milestone years", page.locator("[data-year]").count() == 10)
    check("ten milestone events", page.locator("[data-milestone]").count() == 10)
    check(
        "the unconfirmed pairing is stated, not printed as fact",
        "scrambled" in page.inner_text("body").lower(),
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
