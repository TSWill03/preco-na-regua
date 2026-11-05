/** Cálculos em inteiros: quantidade é interpretada em milésimos da unidade informada. */
export const UNITS = {
  mg: { category: 'mass', label: 'mg', factor: 1n, standardTicks: 1_000_000_000n, standardLabel: 'kg' },
  g: { category: 'mass', label: 'g', factor: 1_000n, standardTicks: 1_000_000_000n, standardLabel: 'kg' },
  kg: { category: 'mass', label: 'kg', factor: 1_000_000n, standardTicks: 1_000_000_000n, standardLabel: 'kg' },
  ml: { category: 'volume', label: 'mL', factor: 1n, standardTicks: 1_000_000n, standardLabel: 'L' },
  l: { category: 'volume', label: 'L', factor: 1_000n, standardTicks: 1_000_000n, standardLabel: 'L' },
  un: { category: 'count', label: 'un.', factor: 1n, standardTicks: 1_000n, standardLabel: 'un.' },
  dz: { category: 'count', label: 'dúzia', factor: 12n, standardTicks: 1_000n, standardLabel: 'un.' }
} as const;

export type MeasureUnit = keyof typeof UNITS;
export type MeasureCategory = (typeof UNITS)[MeasureUnit]['category'];

export const UNIT_GROUPS: { title: string; units: MeasureUnit[] }[] = [
  { title: 'Massa', units: ['g', 'kg', 'mg'] },
  { title: 'Volume', units: ['ml', 'l'] },
  { title: 'Unidades', units: ['un', 'dz'] }
];

/** Aceita vírgula ou ponto decimal, até 3 casas, sem depender de Number. */
export function parseMilliQuantity(raw: string): bigint | null {
  const text = raw.trim();
  if (!/^\d{1,6}(?:[,.]\d{1,3})?$/.test(text)) return null;
  const [whole = '', fractional = ''] = text.replace(',', '.').split('.');
  const milli = BigInt(whole) * 1000n + BigInt(fractional.padEnd(3, '0') || '0');
  return milli > 0n && milli <= 999_999_999n ? milli : null;
}

export function quantityTicks(quantity: string, unit: MeasureUnit, packCount: number): bigint | null {
  const milli = parseMilliQuantity(quantity);
  if (milli === null || !Number.isInteger(packCount) || packCount < 1 || packCount > 999) return null;
  return milli * UNITS[unit].factor * BigInt(packCount);
}

export function equivalentCategory(unitA: MeasureUnit, unitB: MeasureUnit): boolean {
  return UNITS[unitA].category === UNITS[unitB].category;
}

export function readableQuantity(quantity: string, unit: MeasureUnit, packCount: number): string {
  return `${quantity.replace('.', ',')} ${UNITS[unit].label}${packCount > 1 ? ` × ${packCount} emb.` : ''}`;
}
