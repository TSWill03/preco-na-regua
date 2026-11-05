# Relatório de validação do pacote

## Executado neste ambiente

- **15 verificações de domínio executadas e aprovadas em Node.js 22.** Os arquivos `src/domain/*.ts` foram transpilados usando TypeScript local para testar valores em runtime. Casos: parsing de centavos, conversões de massa, volume e dúzias, pacotes múltiplos, limites inválidos, comparação e desempate, 10% de economia, igualdade exata, medidas incompatíveis, data de calendário inválida, protocolo URL proibido e formatação em moeda.
- **Sintaxe de todos os arquivos TS/TSX:** sem erros de parsing com TypeScript 5.8.3.
- **Sintaxe da folha CSS:** analisada com `tinycss2`, sem erros estruturais.
- **Ícones PWA:** arquivos PNG presentes, verificados em 192×192 e 512×512.

## Não executado aqui — depende de acesso ao npm

A rede deste ambiente não consegue resolver `registry.npmjs.org`. Por isso as dependências não puderam ser instaladas e **não foi possível executar nem afirmar sucesso de**:

- `npm run typecheck` (TypeScript com typings reais de React, Dexie, Recharts etc.);
- `npm run build` (Vite/Tailwind/PWA);
- `npm run test` (suite Vitest completa, inclusive IndexedDB e links);
- `npm run test:e2e` (Playwright e teste offline com Service Worker);
- inspeção visual do aplicativo React real no navegador.

Os testes e as configurações dessas etapas **estão incluídos** no projeto para execução em uma máquina com acesso à internet. Não há simulação de dados de usuários, resultados de testes inventados ou indicação falsa de deploy concluído.

## Checklist antes de colocar em produção

```bash
npm install
npm run typecheck
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
```

Revise erros de compatibilidade caso bibliotecas publiquem novas versões. Teste desktop, celular, fluxo de compartilhamento, gráficos com registros históricos e uso offline após carregar a aplicação uma vez. Confira domínio e DNS **antes** de vincular ao Cloudflare Pages.
