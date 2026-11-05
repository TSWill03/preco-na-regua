import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { z } from 'zod';
import { type OfferInput } from '../../domain/comparison';
import { UNITS } from '../../domain/units';

const sourceUrl = z.string().max(1024).refine(value => {
  if (!value) return true;
  try { return ['http:', 'https:'].includes(new URL(value).protocol); } catch { return false; }
}, 'URL inválida.');
const offerSchema = z.strictObject({
  product: z.string().max(100), brand: z.string().max(100), store: z.string().max(100),
  price: z.string().max(16), quantity: z.string().max(16),
  unit: z.enum(Object.keys(UNITS) as [keyof typeof UNITS, ...(keyof typeof UNITS)[]]),
  packCount: z.string().max(4),
  referenceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  sourceUrl
});
const payloadSchema = z.strictObject({
  version: z.literal(1),
  referenceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  offers: z.tuple([offerSchema, offerSchema])
});

export type SharePayload = { version: 1; referenceDate: string; offers: [OfferInput, OfferInput] };
export type ShareReadResult = { ok: true; data: SharePayload } | { ok: false; reason: string };
const MAX_COMPRESSED_LENGTH = 6000;
const MAX_JSON_LENGTH = 6000;

export function encodeComparison(offers: [OfferInput, OfferInput], referenceDate: string): string {
  const candidate: SharePayload = { version: 1, referenceDate, offers };
  const parsed = payloadSchema.safeParse(candidate);
  if (!parsed.success) throw new Error('Os dados da comparação não podem ser compartilhados.');
  const json = JSON.stringify(parsed.data);
  if (json.length > MAX_JSON_LENGTH) throw new Error('Há informações demais para compartilhar em um link.');
  const compressed = compressToEncodedURIComponent(json);
  if (compressed.length > MAX_COMPRESSED_LENGTH) throw new Error('O link ficou maior que o limite permitido.');
  return compressed;
}

export function decodeComparison(encoded: string): ShareReadResult {
  if (!encoded || encoded.length > MAX_COMPRESSED_LENGTH || !/^[\w+\-$]*$/.test(encoded)) {
    return { ok: false, reason: 'O link está incompleto ou é grande demais.' };
  }
  try {
    const json = decompressFromEncodedURIComponent(encoded);
    if (!json || json.length > MAX_JSON_LENGTH) return { ok: false, reason: 'Não foi possível recuperar os dados do link.' };
    const raw: unknown = JSON.parse(json);
    if (typeof raw === 'object' && raw !== null && 'version' in raw && raw.version !== 1) {
      return { ok: false, reason: 'Esta versão de link não é compatível com o aplicativo.' };
    }
    const result = payloadSchema.safeParse(raw);
    if (!result.success) return { ok: false, reason: 'O link contém campos inválidos ou incompletos.' };
    return { ok: true, data: result.data };
  } catch { return { ok: false, reason: 'O link parece estar corrompido.' }; }
}

export function shareLinkFor(offers: [OfferInput, OfferInput], date: string, pageUrl: string): string {
  const url = new URL(pageUrl);
  url.hash = `c=${encodeComparison(offers, date)}`;
  url.search = '';
  return url.toString();
}

export function readSharedHash(hash: string): ShareReadResult | null {
  if (!hash.startsWith('#c=')) return null;
  return decodeComparison(hash.slice(3));
}
