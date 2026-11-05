import { describe, expect, it } from 'vitest';
import { blankOffer, compareOffers, normalizeOffer, percentageLabel, type OfferInput } from '../../src/domain/comparison';
import { parseBRLCents, formatRationalBRL } from '../../src/domain/money';
import { parseMilliQuantity, quantityTicks } from '../../src/domain/units';

const offer = (patch: Partial<OfferInput>): OfferInput => ({ ...blankOffer('2026-11-05'), product: 'Arroz', price: '10,00', quantity: '500', unit: 'g', ...patch });

describe('medidas exatas', () => {
  it('converte 0,5 kg em 500 g', () => {
    expect(quantityTicks('0,5', 'kg', 1)).toBe(quantityTicks('500', 'g', 1));
  });
  it('converte litros e mililitros, incluindo conjuntos', () => {
    expect(quantityTicks('1,5', 'l', 2)).toBe(quantityTicks('3000', 'ml', 1));
  });
  it('converte dúzias em unidades', () => {
    expect(quantityTicks('1', 'dz', 1)).toBe(quantityTicks('12', 'un', 1));
  });
  it('não aceita quantidade zero, negativa, gigante, exponencial ou mais de 3 decimais', () => {
    for (const value of ['0', '-1', '1000000', '1e3', '0,0001', 'NaN', '1.000,00']) expect(parseMilliQuantity(value)).toBeNull();
  });
});

describe('comparação e economia', () => {
  it('identifica B como 10% mais barato por kg, embora o pacote seja mais caro', () => {
    const result = compareOffers(offer({ price: '10,00', quantity: '500', unit: 'g' }), offer({ price: '18,00', quantity: '1', unit: 'kg' }));
    expect(result.status).toBe('ok');
    if (result.status === 'ok') { expect(result.comparison.winner).toBe('b'); expect(result.comparison.savingsBasisPoints).toBe(1000); expect(percentageLabel(result.comparison.savingsBasisPoints)).toBe('10,00%'); }
  });
  it('reconhece empate exato entre preços e embalagens diferentes', () => {
    const result = compareOffers(offer({ price: '6,00', quantity: '500' }), offer({ price: '12,00', quantity: '1', unit: 'kg' }));
    expect(result.status).toBe('ok');
    if (result.status === 'ok') { expect(result.comparison.winner).toBe('tie'); expect(result.comparison.savingsBasisPoints).toBe(0); }
  });
  it('não classifica como empate diferenças que se perderiam no arredondamento de 2 casas', () => {
    const result = compareOffers(offer({ price: '1,01', quantity: '1000', unit: 'kg' }), offer({ price: '1,00', quantity: '1000', unit: 'kg' }));
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.comparison.winner).toBe('b');
  });
  it('compara 500 mL e 1 L corretamente', () => {
    const result = compareOffers(offer({ price: '5,00', quantity: '500', unit: 'ml' }), offer({ price: '12,00', quantity: '1', unit: 'l' }));
    expect(result.status).toBe('ok');
    if (result.status === 'ok') expect(result.comparison.winner).toBe('a');
  });
  it('rejeita medidas incompatíveis', () => {
    expect(compareOffers(offer({ unit: 'kg' }), offer({ unit: 'l' })).status).toBe('incompatible');
  });
  it('multiplica a quantidade total pela contagem de embalagens', () => {
    expect(normalizeOffer(offer({ packCount: '2', price: '12,00' })).chartValue).toBe(12);
  });
  it('gera explicação monetária a partir de fração exata', () => {
    const normalized = normalizeOffer(offer({ price: '5,00', quantity: '250', unit: 'g' }));
    expect(formatRationalBRL(normalized.numeratorCents, normalized.denominator)).toContain('20,00');
  });
});

describe('validação de entradas', () => {
  it('converte moeda brasileira para centavos sem IEEE-754', () => {
    expect(parseBRLCents('12,99')).toBe(1299n);
    expect(parseBRLCents('12.99')).toBe(1299n);
    expect(parseBRLCents('0,01')).toBe(1n);
  });
  it('impede preços zero, negativos, indevidos e gigantes', () => {
    for (const value of ['0', '-1,00', '1.000,00', '1000000', '1000000,00', '0,001', 'Infinity']) expect(parseBRLCents(value)).toBeNull();
  });
  it('rejeita quantidade de pacotes zero, data inválida, URL javascript e preço inválido', () => {
    const result = compareOffers(offer({ packCount: '0', referenceDate: '2026-02-30', sourceUrl: 'javascript:alert(1)', price: '-3' }), offer({}));
    expect(result.status).toBe('invalid');
    if (result.status === 'invalid') { expect(result.errors[0]).toHaveProperty('packCount'); expect(result.errors[0]).toHaveProperty('referenceDate'); expect(result.errors[0]).toHaveProperty('sourceUrl'); expect(result.errors[0]).toHaveProperty('price'); }
  });
});
