/** Itens para `Select` (Base UI) — labels resolvem com popup fechado. */
export type SelectItemOption = { value: string; label: string };

export function buildSelectItems(
  entries: Array<{ value: string; label: string }>,
): SelectItemOption[] {
  return entries;
}

export function withNoneOption(
  label: string,
  entries: SelectItemOption[],
): SelectItemOption[] {
  return [{ value: "none", label }, ...entries];
}

export function mapById(
  list: Array<{ id: string; name: string }>,
  labelFn?: (item: { id: string; name: string }) => string,
): SelectItemOption[] {
  return list.map((item) => ({
    value: item.id,
    label: labelFn ? labelFn(item) : item.name,
  }));
}
