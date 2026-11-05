import { describe, expect, it } from 'vitest';
import { compressToEncodedURIComponent } from 'lz-string';
import { blankOffer, compareOffers } from '../../src/domain/comparison';
import { encodeComparison, decodeComparison, readSharedHash, shareLinkFor } from '../../src/features/share/share';

const a = { ...blankOffer('2026-11-05'), product: 'Feijão', price: '8,50', quantity: '1', unit: 'kg' as const };
const b = { ...blankOffer('2026-11-05'), product: 'Feijão', price: '5,00', quantity: '500', unit: 'g' as const };

describe('compartilhamento URL sem servidor', () => {
  it('restaura as duas ofertas e reproduz a comparação', () => {
    const encoded = encodeComparison([a, b], a.referenceDate);
    const read = decodeComparison(encoded);
    expect(read.ok).toBe(true);
    if (read.ok) { expect(read.data.offers).toEqual([a, b]); expect(compareOffers(read.data.offers[0], read.data.offers[1]).status).toBe('ok'); }
  });
  it('produz link com fragmento c, sem query com dados', () => {
    const link = shareLinkFor([a,b], a.referenceDate, 'https://pronatec.wicolly.com.br/?utm=abc');
    expect(new URL(link).search).toBe('');
    expect(readSharedHash(new URL(link).hash)?.ok).toBe(true);
  });
  it('ignora fragmentos que não são de comparação', () => expect(readSharedHash('#outra-coisa')).toBeNull());
  it('rejeita payloads longos, corrompidos e com versão incompatível', () => {
    expect(decodeComparison('a'.repeat(6001)).ok).toBe(false);
    expect(decodeComparison('%%%').ok).toBe(false);
    const badVersion = compressToEncodedURIComponent(JSON.stringify({ version: 42, offers: [a,b], referenceDate: a.referenceDate }));
    const result = decodeComparison(badVersion);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('versão');
  });
  it('rejeita campos adicionais e protocolos perigosos', () => {
    const injected = compressToEncodedURIComponent(JSON.stringify({ version: 1, referenceDate: a.referenceDate, offers: [{ ...a, extra: 'unexpected' }, b] }));
    const jsLink = compressToEncodedURIComponent(JSON.stringify({ version: 1, referenceDate: a.referenceDate, offers: [{ ...a, sourceUrl: 'javascript:alert(1)' }, b] }));
    expect(decodeComparison(injected).ok).toBe(false);
    expect(decodeComparison(jsLink).ok).toBe(false);
  });
});
