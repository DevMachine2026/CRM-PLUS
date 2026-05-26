#!/usr/bin/env python3
"""ETAPA 6 — Smoke produção (health, login, rotas-chave, console)."""

from __future__ import annotations

import json
import re
import sys
import urllib.error
import urllib.request
from playwright.sync_api import ConsoleMessage, sync_playwright

BASE = "https://crm-plus-kappa.vercel.app"
EMAIL = "demo@crmplus.com.br"
PASSWORD = "demo1234"

PATHS_HTTP = [
    "/api/health",
    "/login",
    "/login?demo=1",
]

ROUTES_AFTER_LOGIN = [
    "/dashboard",
    "/settings/integrations",
    "/inbox",
    "/opportunities",
]

console_errors: list[str] = []
exit_code = 0


def http_get(path: str) -> tuple[int, str]:
    req = urllib.request.Request(
        f"{BASE}{path}",
        headers={"User-Agent": "CRM-PLUS-etapa6-smoke/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, resp.read(512).decode("utf-8", errors="replace")
    except urllib.error.HTTPError as e:
        body = e.read(512).decode("utf-8", errors="replace") if e.fp else ""
        return e.code, body


def mark(ok: bool, msg: str) -> None:
    global exit_code
    print(f"  {'✅' if ok else '❌'} {msg}")
    if not ok:
        exit_code = 1


def on_console(msg: ConsoleMessage) -> None:
    if msg.type != "error":
        return
    text = msg.text
    if any(x in text.lower() for x in ("favicon", "chunkloaderror")):
        pass
    console_errors.append(text)


print(f"\n── HTTP smoke: {BASE} ──")
for path in PATHS_HTTP:
    status, body = http_get(path)
    ok = 200 <= status < 400
    mark(ok, f"GET {path} → {status}")
    if path == "/api/health" and ok:
        try:
            data = json.loads(body)
            evo = data.get("evolution")
            if evo and evo.get("configured"):
                mark(False, "health: evolution.configured=true (esperado ausente na demo)")
            else:
                mark(True, "health: sem Evolution configurado (ok demo)")
        except json.JSONDecodeError:
            mark(False, "health: JSON inválido")

print("\n── Browser: login + rotas ──")
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.on("console", on_console)

    try:
        page.goto(f"{BASE}/login?demo=1", wait_until="domcontentloaded", timeout=60_000)
        page.wait_for_timeout(2000)
        mark("/login?demo=1" in page.url or "login" in page.url, f"Login page carregou ({page.url})")

        # demo=1: prefer explicit demo submit; else normal Entrar
        demo_btn = page.get_by_role("button", name="Entrar com conta demo")
        if demo_btn.count() > 0:
            with page.expect_navigation(timeout=90_000):
                demo_btn.click()
        else:
            page.fill('input[type="email"]', EMAIL)
            page.fill('input[type="password"]', PASSWORD)
            with page.expect_navigation(timeout=90_000):
                page.get_by_role("button", name="Entrar", exact=True).click()
        page.wait_for_timeout(2000)

        logged_in = "/dashboard" in page.url or "/login" not in page.url
        mark(logged_in and "/login" not in page.url, f"Login demo → {page.url}")

        for route in ROUTES_AFTER_LOGIN:
            page.goto(f"{BASE}{route}", wait_until="domcontentloaded", timeout=90_000)
            page.wait_for_timeout(1500)
            title = page.title()
            has_error_ui = page.locator("text=Application error").count() > 0
            mark(not has_error_ui, f"{route} ({title[:50]})")
    except Exception as e:
        mark(False, f"Browser smoke falhou: {e}")
    finally:
        browser.close()

if console_errors:
    print(f"\n── Console errors ({len(console_errors)}) ──")
    for err in console_errors[:8]:
        print(f"  • {err[:200]}")
    mark(len(console_errors) == 0, "Console sem erros vermelhos")
else:
    mark(True, "Console sem erros vermelhos")

print(f"\n{'GO' if exit_code == 0 else 'NO-GO'} (exit {exit_code})\n")
sys.exit(exit_code)
