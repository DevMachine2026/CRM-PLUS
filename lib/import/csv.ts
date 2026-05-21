/**
 * Parser CSV leve (sem dependência extra) — suporta vírgula ou ponto-e-vírgula.
 */

export type CsvRow = Record<string, string>;

function detectDelimiter(line: string): "," | ";" {
  const semi = (line.match(/;/g) ?? []).length;
  const comma = (line.match(/,/g) ?? []).length;
  return semi > comma ? ";" : ",";
}

function parseLine(line: string, delimiter: "," | ";"): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && ch === delimiter) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function normalizeHeader(h: string): string {
  return h
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
}

export function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  const raw = text.replace(/^\uFEFF/, "").trim();
  if (!raw) return { headers: [], rows: [] };

  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };

  const delimiter = detectDelimiter(lines[0]);
  const headers = parseLine(lines[0], delimiter).map(normalizeHeader);
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = parseLine(lines[i], delimiter);
    if (cells.every((c) => !c)) continue;
    const row: CsvRow = {};
    headers.forEach((h, idx) => {
      row[h] = cells[idx] ?? "";
    });
    rows.push(row);
  }

  return { headers, rows };
}

export function pickField(row: CsvRow, aliases: string[]): string {
  for (const key of aliases) {
    const v = row[key]?.trim();
    if (v) return v;
  }
  return "";
}
