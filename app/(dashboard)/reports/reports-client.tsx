"use client";

import Link from "next/link";
import { TrendingUp, Trophy, XCircle, Package, Users, BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ListCard } from "@/components/ui/list-card";
import { ds } from "@/lib/design-system";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MonthPoint { month: string; count: number; total: number }
interface ProductPoint { productId: string; productName: string; count: number; total: number }
interface UserPoint { userId: string; userName: string; count: number; total: number }
interface StagePoint { stageId: string; stageName: string; stageOrder: number; openCount: number; wonCount: number; lostCount: number }

interface Props {
  byMonth:   MonthPoint[];
  byProduct: ProductPoint[];
  byUser:    UserPoint[];
  byStage:   StagePoint[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  if (n === 0) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function fmtMonth(key: string) {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
}

function pct(n: number, total: number) {
  if (total === 0) return 0;
  return Math.round((n / total) * 100);
}

// ── Bar chart row ─────────────────────────────────────────────────────────────

function BarRow({ label, value, max, sub, color = "bg-primary" }: {
  label: string; value: number; max: number; sub?: string; color?: string;
}) {
  const width = max > 0 ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 shrink-0 text-xs text-right text-muted-foreground truncate" title={label}>{label}</span>
      <div className="flex-1 min-w-0">
        <div className="h-5 rounded bg-muted overflow-hidden">
          <div className={`h-full rounded ${color} transition-all`} style={{ width: `${width}%` }} />
        </div>
      </div>
      <div className="w-28 shrink-0 text-right">
        <span className="text-xs font-semibold tabular-nums">{fmt(value)}</span>
        {sub && <span className="block text-[10px] text-muted-foreground">{sub}</span>}
      </div>
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────

function ReportSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className={cn(ds.listCard, "space-y-4")}>
      <div className="flex items-center gap-2 text-sm font-semibold">
        <span className="text-muted-foreground">{icon}</span>
        {title}
      </div>
      {children}
    </section>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function ReportsClient({ byMonth, byProduct, byUser, byStage }: Props) {
  const maxMonth   = Math.max(...byMonth.map((m) => m.total), 1);
  const maxProduct = Math.max(...byProduct.map((p) => p.total), 1);
  const maxUser    = Math.max(...byUser.map((u) => u.total), 1);

  const totalWon   = byMonth.reduce((s, m) => s + m.total, 0);
  const totalDeals = byMonth.reduce((s, m) => s + m.count, 0);

  return (
    <div className={cn(ds.pageStack, "mx-auto max-w-5xl")}>
      <PageHeader
        title="Relatórios"
        description={`Últimos 12 meses · ${fmt(totalWon)} em ${totalDeals} negócio${totalDeals !== 1 ? "s" : ""} ganho${totalDeals !== 1 ? "s" : ""}`}
        icon={<BarChart3 className="h-6 w-6 text-primary" />}
      />

      {/* ── Sales by month ─────────────────────────────────────────────── */}
      <ReportSection title="Vendas por mês (ganhas)" icon={<TrendingUp className="w-4 h-4" />}>
        {byMonth.every((m) => m.total === 0) ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma venda ganha nos últimos 12 meses.</p>
        ) : (
          <div className="space-y-1.5">
            {byMonth.map((m) => (
              <BarRow
                key={m.month}
                label={fmtMonth(m.month)}
                value={m.total}
                max={maxMonth}
                sub={m.count > 0 ? `${m.count} negócio${m.count !== 1 ? "s" : ""}` : undefined}
              />
            ))}
          </div>
        )}
      </ReportSection>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ── By product ──────────────────────────────────────────────── */}
        <ReportSection title="Receita por produto" icon={<Package className="w-4 h-4" />}>
          {byProduct.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum produto em vendas ganhas.</p>
          ) : (
            <div className="space-y-1.5">
              {byProduct.map((p) => (
                <BarRow
                  key={p.productId}
                  label={p.productName}
                  value={p.total}
                  max={maxProduct}
                  sub={`${p.count} venda${p.count !== 1 ? "s" : ""}`}
                  color="bg-blue-500"
                />
              ))}
            </div>
          )}
        </ReportSection>

        {/* ── By salesperson ──────────────────────────────────────────── */}
        <ReportSection title="Receita por vendedor" icon={<Users className="w-4 h-4" />}>
          {byUser.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Nenhum vendedor com vendas ganhas.</p>
          ) : (
            <div className="space-y-1.5">
              {byUser.map((u) => (
                <BarRow
                  key={u.userId}
                  label={u.userName}
                  value={u.total}
                  max={maxUser}
                  sub={`${u.count} negócio${u.count !== 1 ? "s" : ""}`}
                  color="bg-violet-500"
                />
              ))}
            </div>
          )}
        </ReportSection>
      </div>

      {/* ── Funnel conversion ───────────────────────────────────────────── */}
      <ReportSection title="Conversão por etapa (funil padrão)" icon={<Trophy className="w-4 h-4" />}>
        {byStage.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhuma etapa configurada.{" "}
            <Link href="/pipeline" className="font-medium text-primary underline-offset-4 hover:underline">Configurar pipeline</Link>
          </p>
        ) : (
          <div className={ds.listStack}>
            {byStage.map((s) => {
              const closed = s.wonCount + s.lostCount;
              const convRate = pct(s.wonCount, closed);
              return (
                <ListCard key={s.stageId} className="p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold">{s.stageName}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {s.openCount} aberta{s.openCount !== 1 ? "s" : ""} · {s.wonCount} ganha{s.wonCount !== 1 ? "s" : ""} · {s.lostCount} perdida{s.lostCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      {closed === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <span className={cn("text-lg font-semibold tabular-nums", convRate >= 50 ? "text-green-700" : convRate >= 25 ? "text-amber-600" : "text-red-600")}>
                          {convRate}%
                        </span>
                      )}
                    </div>
                  </div>
                  {closed > 0 && (
                    <div className="mt-3 flex h-2 overflow-hidden rounded bg-muted">
                      <div className="h-full bg-green-500" style={{ width: `${pct(s.wonCount, closed)}%` }} />
                      <div className="h-full bg-red-400" style={{ width: `${pct(s.lostCount, closed)}%` }} />
                    </div>
                  )}
                </ListCard>
              );
            })}
            <p className="text-[10px] text-muted-foreground">
              <span className="mr-1 inline-block h-2 w-2 rounded-sm bg-green-500" />Ganhas
              <span className="ml-3 mr-1 inline-block h-2 w-2 rounded-sm bg-red-400" />Perdidas
              · Taxa = ganhas / (ganhas + perdidas)
            </p>
          </div>
        )}
      </ReportSection>

      {/* ── Won vs Lost summary ─────────────────────────────────────────── */}
      {byStage.length > 0 && (() => {
        const totOpen  = byStage.reduce((s, r) => s + r.openCount, 0);
        const totWon   = byStage.reduce((s, r) => s + r.wonCount, 0);
        const totLost  = byStage.reduce((s, r) => s + r.lostCount, 0);
        const totClosed = totWon + totLost;
        return (
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              <span>{totOpen} aberta{totOpen !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex items-center gap-2 text-green-700">
              <Trophy className="w-4 h-4" />
              <span>{totWon} ganha{totWon !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex items-center gap-2 text-red-600">
              <XCircle className="w-4 h-4" />
              <span>{totLost} perdida{totLost !== 1 ? "s" : ""}</span>
            </div>
            {totClosed > 0 && (
              <div className="ml-auto font-semibold">
                Taxa global: <span className={pct(totWon, totClosed) >= 50 ? "text-green-700" : "text-amber-600"}>
                  {pct(totWon, totClosed)}%
                </span>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
