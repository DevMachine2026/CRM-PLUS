#!/usr/bin/env python3
"""Apply mobile PageHeader / MetricGrid / Fab / ResponsiveDataView patterns."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]

def patch_billing():
    p = ROOT / "app/(dashboard)/billing/billing-client.tsx"
    t = p.read_text()
    if "ResponsiveDataView" in t and "mobile={" in t:
        return
    pat = re.compile(
        r"      \{/\* Table \*/\}\n      <motion className=\"rounded-md border\">.*?\n      \{/\* Pagination \*/\}",
        re.DOTALL,
    )
    pat = re.compile(
        r"      \{/\* Table \*/\}\n      <div className=\"rounded-md border\">.*?\n      \{/\* Pagination \*/\}",
        re.DOTALL,
    )
    new = BILLING_TABLE_BLOCK
    t2, n = pat.subn(new, t, 1)
    if n:
        # filters mobile
        t2 = t2.replace(
            '      <motion className="flex flex-wrap gap-3 items-end">',
            '      <FilterBar>',
        )
        t2 = t2.replace(
            'className="w-40"',
            'className="w-full sm:w-40"',
        )
        t2 = t2.replace(
            'className="w-36"',
            'className="w-full min-w-0 flex-1 sm:w-36"',
        )
        if "FilterBar" in t2 and "filter-bar" not in t2:
            t2 = t2.replace(
                'import { PageHeader }',
                'import { FilterBar } from "@/components/layout/filter-bar";\nimport { PageHeader }',
            )
        t2 = t2.replace("      </motion>\n\n      {/* Table */}", "      </FilterBar>\n\n      {/* Table */}")
        t2 = re.sub(r"<motion\b", "<div", t2)
        t2 = re.sub(r"</motion>", "</div>", t2)
        p.write_text(t2)
        print("billing table patched")

BILLING_TABLE_BLOCK = r'''      <FilterBar>
        <div className="w-full sm:w-40">
          <Select
            value={searchParams.get("status") ?? "all"}
            onValueChange={(v) => pushParam("status", !v || v === "all" ? "" : v)}
          >
            <SelectTrigger className="min-h-11">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <motion className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
          <Search className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
          <Input type="date" className="min-h-11 w-full sm:w-36" defaultValue={searchParams.get("dateFrom") ?? ""} onChange={(e) => pushParam("dateFrom", e.target.value)} />
          <span className="hidden text-sm text-muted-foreground sm:inline">até</span>
          <Input type="date" className="min-h-11 w-full sm:w-36" defaultValue={searchParams.get("dateTo") ?? ""} onChange={(e) => pushParam("dateTo", e.target.value)} />
        </motion>
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
      </FilterBar>

      <ResponsiveDataView
        mobile={
          revenues.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Nenhum faturamento encontrado.</p>
          ) : (
            revenues.map((rev) => (
              <MobileListCard key={rev.id} onClick={canUpdate ? () => openEdit(rev) : undefined}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-snug">{rev.opportunity?.title ?? "Sem oportunidade"}</p>
                    <p className="mt-1 text-sm font-medium text-muted-foreground">{rev.contact?.name ?? rev.company?.name ?? "—"}</p>
                  </div>
                  <p className="shrink-0 font-semibold tabular-nums">{fmt(rev.amount)}</p>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge variant={STATUS_VARIANT[rev.status]} className="flex items-center gap-1">{STATUS_ICON[rev.status]}{STATUS_LABEL[rev.status]}</Badge>
                  <span className="text-xs font-medium text-muted-foreground">Pago: {fmtDate(rev.paidAt)}</span>
                </div>
              </MobileListCard>
            ))
          )
        }
        desktop={
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Oportunidade</TableHead>
                <TableHead>Contato / Empresa</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Pago em</TableHead>
                <TableHead>Criado em</TableHead>
                {canUpdate && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {revenues.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canUpdate ? 8 : 7} className="py-8 text-center text-muted-foreground">Nenhum faturamento encontrado.</TableCell>
                </TableRow>
              ) : (
                revenues.map((rev) => (
                  <TableRow key={rev.id}>
                    <TableCell className="max-w-[200px] truncate font-medium">{rev.opportunity?.title ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{rev.contact?.name ?? rev.company?.name ?? "—"}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">{rev.description ?? "—"}</TableCell>
                    <TableCell className="text-right font-mono">{fmt(rev.amount)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[rev.status]} className="flex w-fit items-center gap-1">{STATUS_ICON[rev.status]}{STATUS_LABEL[rev.status]}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{fmtDate(rev.paidAt)}</TableCell>
                    <TableCell className="text-sm">{fmtDate(rev.createdAt)}</TableCell>
                    {canUpdate && (
                      <TableCell>
                        <Button size="sm" variant="ghost" className="min-h-11" onClick={() => openEdit(rev)}>Editar</Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        }
      />

      {/* Pagination */}'''

if __name__ == "__main__":
    patch_billing()
