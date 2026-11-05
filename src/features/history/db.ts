import Dexie, { type EntityTable } from 'dexie';
import { type OfferInput, normalizeOffer } from '../../domain/comparison';
import { UNITS, type MeasureCategory, type MeasureUnit, readableQuantity } from '../../domain/units';

export interface PriceObservation {
  id: string;
  productKey: string;
  product: string;
  brand: string;
  presentation: string;
  store: string;
  priceCents: number;
  quantity: string;
  unit: MeasureUnit;
  packCount: number;
  category: MeasureCategory;
  normalizedNumerator: string;
  normalizedDenominator: string;
  normalizedPrice: number;
  standardUnit: string;
  referenceDate: string;
  observedAt: string;
  sourceUrl: string;
}

export class PriceDatabase extends Dexie {
  observations!: EntityTable<PriceObservation, 'id'>;
  constructor(name = 'preco-na-regua') {
    super(name);
    this.version(1).stores({ observations: 'id, productKey, store, category, referenceDate, observedAt, normalizedPrice' });
  }
}

export const db = new PriceDatabase();

export function productKeyFor(product: string, brand: string): string {
  return `${product.trim()}|${brand.trim()}`.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
}

export function observationFor(offer: OfferInput, dateTime = new Date().toISOString()): PriceObservation {
  if (!offer.product.trim()) throw new Error('Informe o nome do produto antes de salvar no histórico.');
  const norm = normalizeOffer(offer);
  return {
    id: crypto.randomUUID(), productKey: productKeyFor(offer.product, offer.brand),
    product: offer.product.trim(), brand: offer.brand.trim(),
    presentation: readableQuantity(offer.quantity, offer.unit, Number(offer.packCount)),
    store: offer.store.trim(), priceCents: Number(norm.priceCents),
    quantity: offer.quantity, unit: offer.unit, packCount: Number(offer.packCount),
    category: UNITS[offer.unit].category,
    normalizedNumerator: norm.numeratorCents.toString(),
    normalizedDenominator: norm.denominator.toString(),
    normalizedPrice: norm.chartValue,
    standardUnit: norm.label,
    referenceDate: offer.referenceDate, observedAt: dateTime, sourceUrl: offer.sourceUrl
  };
}

/** Uma transação única; nenhum dos dois registros é gravado parcialmente. */
export async function saveComparison(offers: [OfferInput, OfferInput], database = db): Promise<void> {
  const records = offers.map(offer => observationFor(offer));
  await database.transaction('rw', database.observations, async () => { await database.observations.bulkAdd(records); });
}

export async function allObservations(database = db): Promise<PriceObservation[]> {
  return database.observations.orderBy('observedAt').reverse().toArray();
}

export async function exportObservations(database = db): Promise<{ version: 1; exportedAt: string; observations: PriceObservation[] }> {
  return { version: 1, exportedAt: new Date().toISOString(), observations: await allObservations(database) };
}

/** Fronteira para futura importação versionada; nunca mistura URLs com histórico automaticamente. */
export interface HistoryImporter {
  validate(input: unknown): Promise<PriceObservation[]>;
  import(records: PriceObservation[], database?: PriceDatabase): Promise<number>;
}
