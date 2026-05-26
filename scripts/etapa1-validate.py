#!/usr/bin/env python3
"""ETAPA 1 — Validação funcional (Trilhas A e B via browser)."""

from __future__ import annotations

import json
import re
import sys
import time
from playwright.sync_api import ConsoleMessage, sync_playwright

BASE = "http://localhost:3000"
EMAIL = "admin@acme.com.br"
PASSWORD = "senha123"

ROUTES_A = [
    ("/dashboard", "Dashboard"),
    ("/contacts", "Contatos"),
    ("/pipeline", "Pipeline"),
    ("/opportunities", "Oportunidades"),
    ("/tasks", "Tarefas"),
    ("/billing", "Faturamento"),
    ("/reports", "Relatórios"),
]

console_errors: list[str] = []
results: dict[str, str] = {}


def on_console(msg: ConsoleMessage) -> None:
    if msg.type != "error":
        return
    text = msg.text
    if "favicon" in text.lower():
        return
    console_errors.append(text)


def fail(msg: str) -> None:
    results[msg] = "FAIL"
    print(f"  ❌ {msg}")


def ok(msg: str) -> None:
    results[msg] = "OK"
    print(f"  ✅ {msg}")


def warn(msg: str) -> None:
    results[msg] = "WARN"
    print(f"  ⚠  {msg}")


def looks_like_mock_reply(data: dict) -> bool:
    suggestion = str(data.get("suggestion", ""))
    mock_phrases = (
        "Obrigado pelo contato",
        "[MOCK]",
        "Como posso ajudá-lo hoje",
    )
    return any(p in suggestion for p in mock_phrases)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.on("console", on_console)

    print("\n── Trilha A: Login ──")
    page.goto(f"{BASE}/login", wait_until="networkidle", timeout=60_000)
    page.fill('input[type="email"]', EMAIL)
    page.fill('input[type="password"]', PASSWORD)
    with page.expect_navigation(timeout=60_000):
        page.get_by_role("button", name=re.compile("Entrar", re.I)).click()
    time.sleep(1)
    if "/dashboard" in page.url:
        ok(f"Login → {page.url}")
    else:
        fail(f"Login esperava /dashboard, obteve {page.url}")

    print("\n── Trilha A: Navegação ──")
    for path, label in ROUTES_A:
        console_errors.clear()
        try:
            page.goto(f"{BASE}{path}", wait_until="networkidle", timeout=90_000)
            content = page.content()
            if "não foi possível carregar esta página" in content.lower():
                fail(f"{label} — error boundary")
            elif console_errors:
                fail(f"{label} — console: {console_errors[0][:100]}")
            else:
                ok(f"{label} ({path})")
        except Exception as exc:
            fail(f"{label} — {exc}")

    print("\n── Trilha A: Inbox IA (API autenticada) ──")
    page.goto(f"{BASE}/inbox", wait_until="networkidle", timeout=90_000)
    ai_checks = page.evaluate(
        """async () => {
      const convRes = await fetch('/api/conversations?limit=10');
      const convJson = await convRes.json();
      const convs = convJson.data?.items ?? convJson.data ?? [];
      const conv = Array.isArray(convs) ? convs.find(c => c.id) : null;
      if (!conv?.id) return { error: 'no_conversation' };

      async function post(path) {
        const r = await fetch(path, { method: 'POST' });
        const j = await r.json().catch(() => ({}));
        return { status: r.status, data: j.data ?? j, error: j.error };
      }

      return {
        convId: conv.id,
        summarize: await post(`/api/conversations/${conv.id}/summarize`),
        intent: await post(`/api/conversations/${conv.id}/detect-intent`),
        reply: await post(`/api/conversations/${conv.id}/suggest-reply`),
      };
    }"""
    )

    if ai_checks.get("error") == "no_conversation":
        warn("Sem conversas — IA não testada na Inbox")
    else:
        for label, key in [
            ("Resumir", "summarize"),
            ("Detectar intenção", "intent"),
            ("Sugerir resposta", "reply"),
        ]:
            block = ai_checks.get(key) or {}
            status = block.get("status")
            data = block.get("data") or {}
            if status == 200 and data and not block.get("error"):
                if key == "reply" and looks_like_mock_reply(data):
                    warn(f"{label} — 200 (provável mock / quota Gemini)")
                else:
                    ok(f"{label} — HTTP 200")
            else:
                fail(f"{label} — HTTP {status} {block.get('error') or data}")

    print("\n── Trilha A: Settings → Empresa (Sara) ──")
    page.goto(f"{BASE}/settings", wait_until="networkidle", timeout=60_000)
    tab = page.get_by_role("tab", name=re.compile("Empresa", re.I))
    if tab.count():
        tab.first.click()
        page.wait_for_timeout(400)
    textareas = page.locator("textarea")
    if textareas.count():
        textareas.first.fill("Validação ETAPA1 — instruções da Sara para demo.")
        save = page.get_by_role("button", name=re.compile("Salvar", re.I))
        if save.count():
            save.first.click()
            page.wait_for_timeout(2500)
            ok("Empresa — instruções da Sara salvas")
        else:
            warn("Empresa — textarea ok, Salvar não encontrado")
    else:
        warn("Empresa — aba/form não encontrado")

    print("\n── Trilha B: Integrações ──")
    console_errors.clear()
    page.goto(f"{BASE}/settings/integrations", wait_until="networkidle", timeout=90_000)
    body_lower = page.content().lower()
    if "demonstração" in body_lower or "modo demo" in body_lower:
        ok("Modo demonstração visível na página")
    else:
        warn('Texto "demonstração" só pode aparecer ao abrir o sheet')

    wa = page.get_by_role("button", name=re.compile("Conectar WhatsApp", re.I))
    if wa.count():
        wa.first.click()
        page.wait_for_timeout(800)
        for label in ("Gerar QR", "Conectar", "Iniciar"):
            btn = page.get_by_role("button", name=re.compile(label, re.I))
            if btn.count():
                btn.first.click()
                break
        page.wait_for_timeout(5500)
        dialog = page.locator('[role="dialog"]').inner_text() if page.locator('[role="dialog"]').count() else ""
        if re.search(r"conectado|modo demo|qr|aguardando", dialog, re.I):
            ok("WhatsApp — fluxo demo/QR no sheet")
        else:
            warn(f"WhatsApp sheet: {dialog[:120]}...")
        page.keyboard.press("Escape")
    else:
        warn("Conectar WhatsApp não encontrado")

    ig = page.get_by_role("button", name=re.compile("Conectar com Facebook", re.I))
    if ig.count():
        ig.first.click()
        page.wait_for_timeout(1500)
        dialog = page.locator('[role="dialog"]').inner_text() if page.locator('[role="dialog"]').count() else ""
        if dialog and not console_errors:
            ok("Instagram — sheet demo sem crash")
        page.keyboard.press("Escape")

    if console_errors:
        fail(f"Integrações — erros console: {console_errors[0][:120]}")
    else:
        ok("Integrações — console limpo")

    browser.close()

failed = sum(1 for v in results.values() if v == "FAIL")
print(f"\n{'='*50}\nBrowser: {len(results)} checks, {failed} falha(s)")
sys.exit(1 if failed else 0)
