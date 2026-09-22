"""Check the synthetic design prototype, not the production application.

Requires Python 3.10+ and Playwright. Use CHROMIUM_EXECUTABLE for a system
browser, or install Playwright's Chromium. No server or network is required.
Clipboard is stubbed: these checks do not verify native clipboard access.
"""
from __future__ import annotations

import json
import os
import shutil
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
DESIGN = ROOT / "docs" / "design"
CLIPBOARD_STUB = """Object.defineProperty(navigator, 'clipboard', {
  configurable: true,
  value: {
    writeText: async text => { window.copiedForTest = text; },
    readText: async () => window.copiedForTest
  }
})"""


def main() -> None:
    html = (DESIGN / "prototype.html").read_text(encoding="utf-8")
    results: list[dict] = []
    errors: list[str] = []
    executable = os.environ.get("CHROMIUM_EXECUTABLE") or shutil.which("chromium")
    with sync_playwright() as playwright:
        launch_args = {"headless": True}
        if executable:
            launch_args["executable_path"] = executable
        browser = playwright.chromium.launch(**launch_args)
        context = browser.new_context()

        def new_page(width: int):
            page = context.new_page()
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.set_viewport_size({"width": width, "height": 900})
            page.set_content(html)
            page.evaluate(CLIPBOARD_STUB)
            return page

        for width in (375, 500, 600, 750, 1280):
            page = new_page(width)
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), width
            assert page.locator("#resources").is_visible()
            assert page.locator("[data-use]").count() == 3
            results.append({"test": "layout-no-overflow-resource-visible", "width": width, "passed": True})
            if width in (600, 1280):
                page.screenshot(path=str(DESIGN / f"prototype-{width}.png"), full_page=True)
            page.close()

        page = new_page(600)
        page.locator('[data-use="0"]').click()
        page.locator("#draft").fill("我的人工修改")
        page.locator('[data-use="1"]').click()
        assert page.locator("#draft").input_value() == "我的人工修改"
        assert page.locator("#proposal").is_visible()
        page.locator("#keep").click()
        assert page.locator("#draft").input_value() == "我的人工修改"
        results.append({"test": "dirty-reply-protected", "passed": True})

        page.locator("#translation").evaluate("element => element.open = true")
        assert page.locator("#stale").is_visible()
        page.locator("#copy").click()
        assert page.evaluate("navigator.clipboard.readText()") == "我的人工修改"
        assert page.locator("#th").inner_text() == "0"
        results.append({"test": "translation-stale-copy-only-text-no-count", "passed": True})

        page.locator("#fail-save").check()
        page.locator("#record").click()
        assert page.locator("#th").inner_text() == "0"
        assert page.locator("#draft").input_value() == "我的人工修改"
        page.locator("#fail-save").uncheck()
        page.locator("#record").click()
        page.locator("#record").click()
        assert page.locator("#th").inner_text() == "1"
        assert page.locator("#saved-text").inner_text() == "我的人工修改"
        results.append({"test": "save-failure-retains-text-double-record-once", "passed": True})

        page.locator("#resource-state").select_option("empty")
        assert "Nothing worth linking" in page.locator("#resource-msg").inner_text()
        page.locator("#resource-state").select_option("error")
        assert "Couldn't check" in page.locator("#resource-msg").inner_text()
        results.append({"test": "no-resource-distinct-from-error", "passed": True})

        page.locator("#direction").select_option("c")
        assert not page.locator("#resources").is_visible()
        page.locator("#direction").select_option("b")
        assert page.locator("#resources").is_visible()
        results.append({"test": "direction-C-hides-resources-B-does-not", "passed": True})
        assert not errors, errors
        browser_version = browser.version
        context.close()
        browser.close()

    report = {
        "scope": "Synthetic design prototype only; local Chromium set_content. Clipboard stubbed. Not native clipboard, Orca, backend, AI quality or production verification.",
        "browser_version": browser_version,
        "results": results,
        "page_errors": errors,
    }
    output = json.dumps(report, indent=2, ensure_ascii=False) + "\n"
    (DESIGN / "prototype-checks.json").write_text(output, encoding="utf-8")
    print(output, end="")


if __name__ == "__main__":
    main()
