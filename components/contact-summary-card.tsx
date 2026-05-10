"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, RefreshCw, CheckSquare } from "lucide-react";

interface SummaryData {
  summary:   string;
  keyPoints: string[];
  nextSteps: string[];
  sentiment: "positive" | "neutral" | "negative";
}

const SENTIMENT_COLOR: Record<SummaryData["sentiment"], string> = {
  positive: "bg-green-100 text-green-800",
  neutral:  "bg-gray-100 text-gray-800",
  negative: "bg-red-100 text-red-800",
};

const SENTIMENT_LABEL: Record<SummaryData["sentiment"], string> = {
  positive: "Positivo",
  neutral:  "Neutro",
  negative: "Negativo",
};

export function ContactSummaryCard({
  contactId,
  contactName,
}: {
  contactId:   string;
  contactName: string;
}) {
  const [data,    setData]    = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  async function loadSummary() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/contacts/${contactId}/summary`);
      if (!res.ok) throw new Error("Erro ao carregar resumo");
      const json = await res.json();
      setData(json.data);
    } catch {
      setError("Não foi possível gerar o resumo. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-purple-200 bg-purple-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="h-4 w-4 text-purple-500" />
            Resumo IA — {contactName}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadSummary}
            disabled={loading}
            className="text-purple-600 hover:text-purple-700 hover:bg-purple-100"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
            {data ? "Atualizar" : "Gerar Resumo"}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {!data && !loading && !error && (
          <p className="text-xs text-muted-foreground text-center py-4">
            Clique em &quot;Gerar Resumo&quot; para que a IA analise o histórico completo deste contato.
          </p>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-purple-600 py-4 justify-center">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Analisando histórico...
          </div>
        )}

        {error && <p className="text-xs text-red-500 py-2">{error}</p>}

        {data && (
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <Badge className={`text-[10px] shrink-0 ${SENTIMENT_COLOR[data.sentiment]}`}>
                {SENTIMENT_LABEL[data.sentiment]}
              </Badge>
              <p className="text-xs leading-relaxed">{data.summary}</p>
            </div>

            {data.keyPoints.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Pontos-chave
                </p>
                <ul className="space-y-1">
                  {data.keyPoints.map((kp, i) => (
                    <li key={i} className="text-xs flex items-start gap-1">
                      <span className="text-purple-400 mt-0.5">•</span>
                      {kp}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.nextSteps.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                  Próximos Passos
                </p>
                <ul className="space-y-1">
                  {data.nextSteps.map((step, i) => (
                    <li key={i} className="text-xs flex items-start gap-1 text-purple-700">
                      <CheckSquare className="h-3 w-3 mt-0.5 shrink-0" />
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
