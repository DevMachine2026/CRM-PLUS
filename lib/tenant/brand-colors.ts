/** Mistura cor da marca com base (CSS color-mix — suportado em browsers modernos). */
export function brandMix(hex: string, percent: number, base: string): string {
  return `color-mix(in oklab, ${hex} ${percent}%, ${base})`;
}

export function isDefaultBrandColor(color: string | undefined): boolean {
  return !color || color.toLowerCase() === "#171717";
}
