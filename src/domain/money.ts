/** Faz parsing monetário em centavos sem ponto flutuante. Máximo R$ 999.999,99. */
export function parseBRLCents(raw: string): bigint | null {
  const clean = raw.trim().replace(/^R\$\s*/, '');
  if (!/^\d{1,6}(?:[,.]\d{1,2})?$/.test(clean)) return null;
  const [whole = '', decimal = ''] = clean.replace(',', '.').split('.');
  const cents = BigInt(whole) * 100n + BigInt(decimal.padEnd(2, '0') || '0');
  return cents >= 1n && cents <= 99_999_999n ? cents : null;
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatCents(cents: bigint | number): string {
  return formatBRL(Number(cents) / 100);
}

export function roundDiv(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n || numerator < 0n) throw new Error('Fração monetária inválida.');
  return (numerator + denominator / 2n) / denominator;
}

/** Retorna uma aproximação numérica SOMENTE para visualização/gráfico. */
export function rationalCurrencyApprox(numeratorCents: bigint, denominator: bigint): number {
  return Number(numeratorCents) / Number(denominator) / 100;
}

/** Arredonda em 4 casas de real. A decisão da oferta vencedora nunca usa esse arredondamento. */
export function formatRationalBRL(numeratorCents: bigint, denominator: bigint): string {
  const tenThousandthsOfReal = roundDiv(numeratorCents * 100n, denominator);
  if (tenThousandthsOfReal === 0n && numeratorCents > 0n) return '< R$ 0,0001';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 4
  }).format(Number(tenThousandthsOfReal) / 10_000);
}
