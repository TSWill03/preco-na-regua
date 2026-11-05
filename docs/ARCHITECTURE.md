# Arquitetura — Preço na Régua

## Visão geral

Aplicação frontend estática, sem API e sem backend obrigatório.

```text
Navegador
└── React + TypeScript (src/app)
    ├── OfferForm A/B
    ├── ResultViews: Labels | Analysis (Recharts) | Receipt
    ├── HistoryScreen: gráfico, lista, filtros, exportação
    ├── Estado dos formulários (memória React)
    ├── Domínio (src/domain)
    │   ├── units.ts: unidades/ticks inteiros
    │   ├── money.ts: parsing de centavos e formatação
    │   └── comparison.ts: validação, frações e vencedor
    ├── Compartilhamento (src/features/share)
    │   └── Zod, JSON versionado, lz-string, #c=...
    └── Persistência (src/features/history)
        └── Dexie → IndexedDB do navegador

Service Worker (Workbox gerado por vite-plugin-pwa)
└── Precache: index.html, JS, CSS, fontes e ícones essenciais
```

## Domínio matemático

Dinheiro: regex valida texto de moeda (`12,90`, `12.90`) e converte para `bigint` de centavos, sem usar `parseFloat`.

Quantidade: aceita até 3 casas decimais e representa a quantidade em milésimos da unidade digitada. Exemplo: `0,5 kg` vira `500 × 1.000.000` ticks; `500 g` vira `500.000 × 1.000` ticks. Esses valores são idênticos e a comparação é exata.

**Tabela de ticks:**

| Dimensão | Entrada | Ticks por unidade | Unidade padrão | Ticks por padrão |
|---|---|---:|---|---:|
| Massa | mg | 1 | kg | 1.000.000.000 |
| Massa | g | 1.000 | kg | 1.000.000.000 |
| Massa | kg | 1.000.000 | kg | 1.000.000.000 |
| Volume | mL | 1 | L | 1.000.000 |
| Volume | L | 1.000 | L | 1.000.000 |
| Contagem | unidade | 1 | unidade | 1.000 |
| Contagem | dúzia | 12 | unidade | 1.000 |

`normalizeOffer` devolve fração `numeratorCents = priceCents × standardTicks`; `denominator = totalTicks`; isto é, **centavos por unidade padrão**. Para decidir entre A e B, compara-se `A.numerator × B.denominator` versus `B.numerator × A.denominator` (`bigint`). Nenhuma conversão para `number` participa da decisão de vencedor ou empate.

Economia percentual relativa ao preço mais alto:

```
percentual = 100 × (mais_caro - mais_barato) / mais_caro
```

A fração do percentual também é calculada com inteiros e arredondada para 2 casas na exibição. O `chartValue: number` é **apenas apresentação no Recharts**, sem efeito nos cálculos monetários.

## Validação e entrada do usuário

- `comparison.ts` valida preço positivo, data real (incluindo meses/dias impossíveis), quantidade positiva, múltiplo inteiro de 1 a 999, string de tamanho limitado e URL HTTP/HTTPS.
- `share.ts` adiciona schema `z.strictObject` versionado, limites de tamanho comprimido/descomprimido, tipos literais, regex e URL segura. Não usa `eval`, `innerHTML` ou execução de dados do fragmento.
- A UI mostra erros e impede salvar/compartilhar quando a comparação não é válida.
- O nome do produto é opcional para **comparar**, obrigatório para **salvar** no histórico, porque é necessário identificar a observação.

## Persistência e versionamento

Dexie DB `preco-na-regua`, schema versão 1: tabela `observations`, chave única `id`, índices `productKey`, `store`, `category`, `referenceDate`, `observedAt` e `normalizedPrice`. Uma comparação grava duas observações em transação `rw` atômica. Duas observações do mesmo produto não se sobrescrevem.

Cada registro salva preço em centavos, quantidade, medida original, loja, data da oferta, timestamp de registro, preço normalizado de exibição e sua fração exata (`normalizedNumerator`, `normalizedDenominator` como strings, serializáveis no JSON). Isso permite evoluir as visualizações sem perder exatidão.

A evolução de preços agrupa **produto + marca + dimensão** e ordena pela data da oferta, com timestamp como desempate. Evita misturar valores por litro e por quilo.

Exportação: `{ version: 1, exportedAt: ISOString, observations: [...] }`. A interface `HistoryImporter` explicita um futuro ponto de extensão para validar versão, IDs e conflitos antes de importar; **a importação não foi habilitada** sem uma política de conciliação de duplicatas.

## Compartilhamento

Payload: `{ version: 1, referenceDate: YYYY-MM-DD, offers: [OfferInput, OfferInput] }`, limitado a 6.000 caracteres JSON e 6.000 caracteres comprimidos; UTF-16 comprimido com `lz-string` para um fragmento URL-safe. Exemplo: `#c=<payload>`.

O fragmento não é enviado ao servidor como parte da requisição HTTP. Entretanto, o link em si contém os dados informados: o receptor pode ler o payload. O app restaura somente ofertas válidas e **não cria registro no histórico sem confirmação**.

Se `navigator.share` estiver disponível, aparece opção nativa; sempre há opção de copiar link, com fallback sem Clipboard API.

## PWA e segurança

- `vite-plugin-pwa`: Workbox generateSW, `registerType: 'prompt'`. A atualização de cache não remove o IndexedDB.
- Cache de arquivos essenciais do build, incluindo fontes locais de `@fontsource`, sem dependência de CDNs no runtime.
- Manifest com `start_url`, `scope`, ícones 192/512 e maskable.
- Cloudflare Pages serve assets estáticos com cabeçalhos `_headers` (CSP restritiva e outras proteções básicas). GH Pages ignora `_headers`; seu deploy não depende dele.
- SVG, text nodes e JSX são renderizados com escaping padrão do React. Promo URLs são armazenadas como strings e o app não abre automaticamente links.
- Como todo aplicativo 100% local, dados estão sujeitos à limpeza e à política de retenção do navegador. Para ambiente multiusuário/sincronização, seria necessário backend, autenticação e estratégia de privacy-by-design.

## Testes

- `tests/unit/comparison.test.ts` — medidas, massa/volume/dúzia, frações, empates, economia e limites.
- `tests/unit/share.test.ts` — round-trip dos links e rejeição de entradas malformadas/versionadas.
- `tests/unit/history.test.ts` — IndexedDB simulado (`fake-indexeddb`), persistência, exportação, rejeição de registros incompletos.
- `tests/e2e/flows.spec.ts` — UI mobile/desktop, abas, histórico, restauração por fragmento, funcionamento offline com Service Worker.

## Evoluções possíveis (fora do MVP)

Importar JSON com esquema e modo de resolver conflitos; gráficos agregados por estabelecimento; comparar mais de duas ofertas; leitura de código de barras/nota fiscal; sincronização opcional autenticada. Nenhuma dessas dependências foi introduzida no MVP.
