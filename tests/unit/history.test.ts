import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { blankOffer } from '../../src/domain/comparison';
import { PriceDatabase, allObservations, exportObservations, productKeyFor, saveComparison } from '../../src/features/history/db';

const created: PriceDatabase[] = [];
function temporaryDb() { const database = new PriceDatabase(`regua-test-${crypto.randomUUID()}`); created.push(database); return database; }
afterEach(async () => { for (const database of created.splice(0)) await database.delete(); });

const a = { ...blankOffer('2026-11-05'), product: 'Café', brand: 'Marca A', price: '12,00', quantity: '250' };
const b = { ...a, price: '20,00', quantity: '500', store: 'Mercado B' };

describe('IndexedDB sem sobrescrever histórico', () => {
  it('salva duas observações de forma persistente, mesmo com o mesmo produto', async () => {
    const database = temporaryDb();
    await saveComparison([a,b], database);
    await saveComparison([a,b], database);
    const records = await allObservations(database);
    expect(records).toHaveLength(4);
    expect(new Set(records.map(r => r.id)).size).toBe(4);
    expect(records[0]?.normalizedNumerator).toBeTruthy();
    expect(records[0]?.observedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
  it('permite exportar um arquivo JSON versionado com dois preços', async () => {
    const database = temporaryDb();
    await saveComparison([a,b], database);
    const exported = await exportObservations(database);
    expect(exported.version).toBe(1);
    expect(exported.observations).toHaveLength(2);
    expect(exported.observations.every(r => r.priceCents > 0)).toBe(true);
  });
  it('normaliza identificadores com e sem acento', () => {
    expect(productKeyFor('Café', 'Marca A')).toBe(productKeyFor('Cafe', 'marca a'));
  });
  it('não grava um registro quando uma oferta não possui nome', async () => {
    const database = temporaryDb();
    await expect(saveComparison([a, { ...b, product: '' }], database)).rejects.toThrow();
    expect(await allObservations(database)).toHaveLength(0);
  });
});
