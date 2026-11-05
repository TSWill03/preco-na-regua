import { formatRationalBRL, parseBRLCents, rationalCurrencyApprox, roundDiv } from './money';
import { equivalentCategory, quantityTicks, UNITS, type MeasureCategory, type MeasureUnit } from './units';

export interface OfferInput {
  product: string;
  brand: string;
  store: string;
  price: string;
  quantity: string;
  unit: MeasureUnit;
  packCount: string;
  referenceDate: string;
  sourceUrl: string;
}

export interface NormalizedOffer {
  source: OfferInput;
  priceCents: bigint;
  totalTicks: bigint;
  /** Razão exata do preço em centavos por kg, L ou unidade. */
  numeratorCents: bigint;
  denominator: bigint;
  label: string;
  category: MeasureCategory;
  chartValue: number;
}
export interface Comparison {
  a: NormalizedOffer;
  b: NormalizedOffer;
  winner: 'a' | 'b' | 'tie';
  savingsBasisPoints: number;
  differenceNumeratorCents: bigint;
  differenceDenominator: bigint;
  standardLabel: string;
}
export type CompareOutcome =
  | { status: 'ok'; comparison: Comparison }
  | { status: 'invalid'; errors: [Record<string, string>, Record<string, string>] }
  | { status: 'incompatible'; categoryA: MeasureCategory; categoryB: MeasureCategory };

export function blankOffer(date = new Date().toLocaleDateString('en-CA')): OfferInput {
  return { product: '', brand: '', store: '', price: '', quantity: '', unit: 'g', packCount: '1', referenceDate: date, sourceUrl: '' };
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateOffer(offer: OfferInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (parseBRLCents(offer.price) === null) errors.price = 'Informe um preço entre R$ 0,01 e R$ 999.999,99.';
  if (quantityTicks(offer.quantity, offer.unit, 1) === null) errors.quantity = 'Informe uma quantidade maior que zero (até 3 casas decimais).';
  if (!/^\d{1,3}$/.test(offer.packCount) || Number(offer.packCount) < 1 || Number(offer.packCount) > 999) {
    errors.packCount = 'Use de 1 a 999 embalagens.';
  }
  if (!validDate(offer.referenceDate)) errors.referenceDate = 'Informe uma data válida.';
  for (const field of ['product', 'brand', 'store'] as const) {
    if (offer[field].length > 100) errors[field] = 'Use no máximo 100 caracteres.';
  }
  if (offer.sourceUrl) {
    try {
      const url = new URL(offer.sourceUrl);
      if (!['http:', 'https:'].includes(url.protocol) || offer.sourceUrl.length > 1024) throw new Error();
    } catch { errors.sourceUrl = 'Use um link HTTP ou HTTPS válido (até 1.024 caracteres).'; }
  }
  return errors;
}

export function normalizeOffer(offer: OfferInput): NormalizedOffer {
  const errors = validateOffer(offer);
  if (Object.keys(errors).length) throw new Error('Oferta inválida.');
  const priceCents = parseBRLCents(offer.price)!;
  const totalTicks = quantityTicks(offer.quantity, offer.unit, Number(offer.packCount))!;
  const definition = UNITS[offer.unit];
  const numeratorCents = priceCents * definition.standardTicks;
  return {
    source: offer, priceCents, totalTicks, numeratorCents, denominator: totalTicks,
    label: definition.standardLabel, category: definition.category,
    chartValue: rationalCurrencyApprox(numeratorCents, totalTicks)
  };
}

export function compareOffers(a: OfferInput, b: OfferInput): CompareOutcome {
  const errors: [Record<string, string>, Record<string, string>] = [validateOffer(a), validateOffer(b)];
  if (Object.keys(errors[0]).length || Object.keys(errors[1]).length) return { status: 'invalid', errors };
  if (!equivalentCategory(a.unit, b.unit)) {
    return { status: 'incompatible', categoryA: UNITS[a.unit].category, categoryB: UNITS[b.unit].category };
  }
  const aa = normalizeOffer(a);
  const bb = normalizeOffer(b);
  const left = aa.numeratorCents * bb.denominator;
  const right = bb.numeratorCents * aa.denominator;
  const winner: Comparison['winner'] = left === right ? 'tie' : left < right ? 'a' : 'b';
  const low = winner === 'b' ? bb : aa;
  const high = winner === 'b' ? aa : bb;
  const diffCross = high.numeratorCents * low.denominator - low.numeratorCents * high.denominator;
  const highCross = high.numeratorCents * low.denominator;
  // Percentual relativo à oferta mais cara; 1 ponto-base = 0,01%.
  const savingsBasisPoints = winner === 'tie' ? 0 : Number(roundDiv(diffCross * 10_000n, highCross));
  const differenceNumeratorCents = winner === 'tie' ? 0n :
    high.numeratorCents * low.denominator - low.numeratorCents * high.denominator;
  const differenceDenominator = high.denominator * low.denominator;
  return { status: 'ok', comparison: {
    a: aa, b: bb, winner, savingsBasisPoints,
    differenceNumeratorCents, differenceDenominator, standardLabel: aa.label
  } };
}

export function percentageLabel(basisPoints: number): string {
  return (basisPoints / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
}

export function normalPriceLabel(offer: NormalizedOffer): string {
  return `${formatRationalBRL(offer.numeratorCents, offer.denominator)} / ${offer.label}`;
}
