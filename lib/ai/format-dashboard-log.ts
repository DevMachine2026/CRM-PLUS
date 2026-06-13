/**
 * Textos amigáveis para o painel "Ações da IA hoje" no Dashboard.
 * Converte action + outputSummary técnicos em linguagem para o usuário leigo.
 */

const INTENT_LABELS: Record<string, string> = {
  quote_request: "pedido de orçamento",
  scheduling:    "agendamento",
  complaint:     "reclamação",
  information:   "pedido de informação",
  purchase:      "intenção de compra",
  urgency:       "urgência",
  interest:      "interesse de compra",
  doubt:         "dúvida",
  neutral:       "mensagem neutra",
  other:         "outro assunto",
};

export const DASHBOARD_HIDDEN_ACTIONS = new Set(["webhook_received"]);

const ACTION_TITLES: Record<string, string> = {
  classify_lead:          "Lead qualificado",
  summarize_conversation: "Conversa resumida",
  detect_intent:          "Intenção detectada",
  suggest_reply:          "Sugestão de resposta",
  suggest_next_action:    "Próxima ação sugerida",
  detect_stalled_leads:   "Leads parados verificados",
  detect_stage_advance:   "Funil atualizado",
  create_task_from_message: "Tarefa criada",
  auto_tag:               "Tags sugeridas",
  generate_follow_up:     "Follow-ups gerados",
};

function parseKeyValues(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of raw.split(",")) {
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    out[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
  }
  return out;
}

function contactFromInput(inputSummary: string | null | undefined): string | null {
  if (!inputSummary) return null;
  const fromQuoted = inputSummary.match(/from="([^"]+)"/);
  if (fromQuoted?.[1]) return fromQuoted[1];
  const nameEq = inputSummary.match(/name=([^,]+)/);
  if (nameEq?.[1]) return nameEq[1].trim();
  return null;
}

function formatClassifyLead(outputSummary: string, inputSummary?: string | null): string {
  try {
    const data = JSON.parse(outputSummary) as {
      intent?: string;
      leadScore?: number;
      priorityScore?: number;
      createOpportunity?: boolean;
      nextBestAction?: string;
      fallback?: string;
    };
    const contact = contactFromInput(inputSummary);
    const intent = data.intent ? (INTENT_LABELS[data.intent] ?? data.intent) : null;
    const score = data.leadScore ?? data.priorityScore;
    const parts: string[] = [];

    if (contact) parts.push(`Contato: ${contact}`);
    if (intent) parts.push(`Intenção: ${intent}`);
    if (typeof score === "number") parts.push(`Score ${score}/100`);
    if (data.createOpportunity) parts.push("Nova oportunidade aberta");
    if (data.nextBestAction) parts.push(`Próximo passo: ${data.nextBestAction}`);
    if (data.fallback) parts.push("(modo simplificado)");

    return parts.length > 0 ? parts.join(" · ") : "Lead analisado automaticamente.";
  } catch {
    const kv = parseKeyValues(outputSummary);
    if (kv.score || kv.class) {
      const bits = [];
      if (kv.score) bits.push(`Score ${kv.score}/100`);
      if (kv.class === "hot") bits.push("lead quente");
      else if (kv.class === "warm") bits.push("lead morno");
      return bits.join(" · ") || "Lead analisado.";
    }
    return "Lead analisado automaticamente.";
  }
}

function formatStalledLeads(outputSummary: string): string {
  const kv = parseKeyValues(outputSummary);
  const stalled = Number(kv.stalled ?? 0);
  const tasks = Number(kv.tasksCreated ?? 0);

  if (stalled === 0) {
    return "Nenhum lead parado encontrado — tudo em dia.";
  }
  if (tasks > 0) {
    return `${stalled} lead${stalled !== 1 ? "s" : ""} parado${stalled !== 1 ? "s" : ""} · ${tasks} tarefa${tasks !== 1 ? "s" : ""} criada${tasks !== 1 ? "s" : ""}`;
  }
  return `${stalled} lead${stalled !== 1 ? "s" : ""} parado${stalled !== 1 ? "s" : ""} identificado${stalled !== 1 ? "s" : ""}.`;
}

function formatStageAdvance(outputSummary: string): string {
  const kv = parseKeyValues(outputSummary);
  const moved = kv.moved === "true";
  const target = kv.target && kv.target !== "none" ? kv.target : null;
  const closedWon = outputSummary.includes("status=won");

  if (moved && closedWon) {
    return target
      ? `Oportunidade concluída como ganha (${target}).`
      : "Oportunidade marcada como ganha.";
  }
  if (moved && target) {
    return `Card movido para a etapa "${target}".`;
  }
  return "Etapa mantida — a conversa ainda não justifica avanço no funil.";
}

function formatDetectIntent(outputSummary: string): string {
  try {
    const data = JSON.parse(outputSummary) as { intent?: string; confidence?: number };
    const intent = data.intent ? (INTENT_LABELS[data.intent] ?? data.intent) : null;
    if (intent && typeof data.confidence === "number") {
      return `Intenção: ${intent} (${data.confidence}% de confiança).`;
    }
    if (intent) return `Intenção: ${intent}.`;
  } catch {
    const kv = parseKeyValues(outputSummary);
    if (kv.intent) {
      const label = INTENT_LABELS[kv.intent] ?? kv.intent;
      return `Intenção: ${label}.`;
    }
  }
  return "Intenção da mensagem analisada.";
}

function formatSummarize(outputSummary: string): string {
  try {
    const data = JSON.parse(outputSummary) as { summary?: string; messageCount?: number };
    if (data.summary) {
      const count = data.messageCount ? ` (${data.messageCount} mensagens)` : "";
      return `${data.summary}${count}`;
    }
  } catch {
    if (outputSummary.length < 160 && !outputSummary.includes("=")) {
      return outputSummary;
    }
  }
  return "Resumo da conversa gerado.";
}

function formatSuggestReply(outputSummary: string): string {
  try {
    const data = JSON.parse(outputSummary) as { tone?: string; confidence?: number };
    const tone =
      data.tone === "friendly" ? "amigável"
      : data.tone === "empathetic" ? "empático"
      : data.tone === "professional" ? "profissional"
      : data.tone ?? "profissional";
    if (typeof data.confidence === "number") {
      return `Sugestão pronta (tom ${tone}, ${data.confidence}% de confiança).`;
    }
    return `Sugestão de resposta gerada (tom ${tone}).`;
  } catch {
    return "Sugestão de resposta gerada para o vendedor.";
  }
}

function formatFollowUp(outputSummary: string): string {
  const kv = parseKeyValues(outputSummary);
  const n = Number(kv.followUps ?? kv.total ?? 0);
  if (n === 0) return "Nenhum follow-up pendente identificado.";
  return `${n} follow-up${n !== 1 ? "s" : ""} sugerido${n !== 1 ? "s" : ""}.`;
}

export function formatAiDashboardLog(log: {
  action: string;
  outputSummary?: string | null;
  inputSummary?: string | null;
}): { title: string; detail: string | null } {
  const title = ACTION_TITLES[log.action] ?? log.action.replace(/_/g, " ");
  const raw = log.outputSummary?.trim() ?? "";

  if (!raw) {
    return { title, detail: null };
  }

  switch (log.action) {
    case "classify_lead":
      return { title, detail: formatClassifyLead(raw, log.inputSummary) };
    case "detect_stalled_leads":
      return { title, detail: formatStalledLeads(raw) };
    case "detect_stage_advance":
      return { title, detail: formatStageAdvance(raw) };
    case "detect_intent":
      return { title, detail: formatDetectIntent(raw) };
    case "summarize_conversation":
    case "summarize":
      return { title, detail: formatSummarize(raw) };
    case "suggest_reply":
      return { title, detail: formatSuggestReply(raw) };
    case "generate_follow_up":
      return { title, detail: formatFollowUp(raw) };
    case "create_task_from_message":
      return { title, detail: "Tarefa criada a partir de compromisso na conversa." };
    case "auto_tag":
      return { title, detail: "Tags sugeridas para o contato." };
    case "suggest_next_action":
      return { title, detail: raw.length < 120 ? raw : "Próxima ação recomendada para o vendedor." };
    default:
      if (raw.includes("=") && !raw.startsWith("{")) {
        return { title, detail: null };
      }
      if (raw.length <= 120) return { title, detail: raw };
      return { title, detail: null };
  }
}
