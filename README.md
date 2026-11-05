# PREÇO NA RÉGUA

> **Compare pelo que rende, não apenas pelo que custa.**

Aplicativo PWA, mobile-first e offline-first de comparação de preços por **kg, litro ou unidade**, sem cadastro, servidor, contas de usuários nem banco de dados remoto.

**Produção prevista:** https://pronatec.wicolly.com.br

## O que está implementado

| Recurso | Como funciona |
|---|---|
| Comparador | Duas ofertas independentes; preço, quantidade, medida, multiplicador de embalagens, produto, marca, loja, data e URL. |
| Precisão | Preço convertido de texto para **centavos inteiros** e quantidade para **milésimos inteiros**; comparação por frações com `bigint`, sem empate falso por arredondamento. |
| Conversões | Massa: `mg`, `g`, `kg` → preço/kg. Volume: `mL`, `L` → preço/L. Contagem: `un.`, `dúzia` → preço/unidade. |
| Resultados | Três visões independentes: **etiquetas**, **analítico** com Recharts, e **cupom fiscal**. |
| Histórico | IndexedDB/Dexie; observações adicionadas, nunca sobrescritas por semelhança de produto; busca, filtro por dimensão, ordenação, evolução de preços, exclusão com confirmação. |
| Backup | Exportação JSON versionada. Contrato `HistoryImporter` preparado para futura importação. |
| Compartilhamento | Link `#c=...` com JSON comprimido via `lz-string`, versão e validação Zod. Web Share API, quando disponível, e cópia manual/clipboard. |
| Instalação | Manifest, ícones PNG, `Service Worker` via Workbox + `vite-plugin-pwa` e cache offline dos arquivos da aplicação. |
| Privacidade | Histórico permanece no dispositivo. Links carregam apenas **duas ofertas**, nunca exportam histórico por conta própria. |
| Testes | Vitest: domínio, validação, compartilhamento, Dexie. Playwright: comparação, visualizações, histórico, compartilhamento e offline. |

## Pré-requisitos

- **Node.js 22 LTS** (ou `>=20.19.0`).
- **npm**.
- Navegador moderno com IndexedDB e Service Worker (Chrome, Edge, Firefox ou Safari atuais).

## Rodar localmente

```bash
npm install
npm run dev
```

Abra a URL mostrada pelo Vite (normalmente `http://localhost:5173`). Na primeira inicialização, **não há produtos ou preços cadastrados**; todos os valores são fornecidos pelo usuário.

### Verificar e gerar build

```bash
npm run typecheck   # TypeScript rigoroso
npm run test        # testes unitários
npm run build       # gera ./dist
npm run preview     # abre o build gerado
```

### Testes de ponta a ponta

```bash
npx playwright install chromium
npm run test:e2e
```

O Playwright gera o build e sobe um `vite preview` local. O teste offline primeiro faz cache da aplicação, depois desliga a rede no contexto do navegador.

> **CI:** a pipeline em `.github/workflows/ci.yml` instala dependências e executa TypeScript, Vitest, build e Playwright. Como o pacote original não contém `package-lock.json` (o registry npm não estava acessível durante a preparação), após a primeira instalação recomenda-se executar `npm install --package-lock-only`, versionar o lockfile e trocar `npm install` por `npm ci` no CI.

## Utilização

1. Entre na aba **Comparar** e preencha os valores da **Oferta A** e da **Oferta B**.
2. Selecione unidades de **mesma dimensão** (gramas com quilogramas, mililitros com litros, unidades com dúzias). O cálculo é automático.
3. Alterne entre **Etiquetas**, **Analítico** e **Cupom** para ver o mesmo resultado.
4. Para guardar as observações, informe o **nome dos produtos** e clique em **Salvar no histórico**.
5. Para enviar uma comparação, clique em **Compartilhar comparação**, copie o link ou use **Enviar** (Web Share API). O destinatário pode editar e salvar no histórico **dele**, independentemente do seu.
6. Na aba **Histórico**, pesquise, filtre, compare evolução por produto e exporte um JSON.

### Regras de cálculo

O preço informado é do **conjunto inteiro**. Para `n` embalagens de `q` unidades cada:

```
quantidade_total = q × n
preço_normalizado = preço_do_conjunto / quantidade_total × unidade_padrão
```

Exemplo (sem registros de demonstração pré-carregados):

- A: R$ 10,00 / 500 g = **R$ 20,00/kg**.
- B: R$ 18,00 / 1 kg = **R$ 18,00/kg**.
- Resultado: B é **10% mais econômica por kg** (`(20−18) / 20 × 100`).

Os valores brutos são inteiros. A **comparação e o empate são exatos**; o arredondamento ocorre **somente para exibição** das casas monetárias e do percentual. Um `R$ 0,0001/kg` pode aparecer em preços normalizados excepcionalmente pequenos. Para porcentagens com mais de duas casas o visor arredonda, mas a decisão não.

**Limites por oferta:** R$ 0,01 a R$ 999.999,99; quantidade maior que zero e até 999.999,999, com 3 casas decimais; 1 a 999 embalagens. Inserir `1000` em vez de `1.000` para mil unidades: ponto/vírgula nos campos numéricos significa separador **decimal**, não milhar.

## Publicação: Cloudflare Pages

**Nenhuma publicação ou alteração DNS foi realizada automaticamente.** Os passos abaixo são para você executar na conta Cloudflare quando autorizar:

1. Crie seu repositório GitHub e envie a pasta deste projeto (com `src`, `public`, `package.json`, `vite.config.ts`, etc.). Não envie `node_modules`.
2. No painel Cloudflare, vá a **Workers & Pages → Create application → Pages → Import an existing Git repository**.
3. Conecte o repositório, selecione a branch `main` e configure:

   | Campo | Valor |
   |---|---|
   | Framework preset | React (Vite), ou Vite |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | Root directory | `/` (se o projeto está na raiz do repositório) |
   | Node | `22` (quando configurável) |

4. Publique primeiro em **`*.pages.dev`** e valide formulário, histórico, PWA e compartilhamento.
5. Após validar, abra o projeto em **Custom domains → Set up a domain** e cadastre `pronatec.wicolly.com.br`.
6. Verifique os registros DNS existentes antes de qualquer alteração; um `A`, `AAAA` ou `CNAME` já definido para `pronatec` pode conflitar. Só permita que o Cloudflare ajuste registros **após revisar e autorizar**.
7. Depois de propagado o domínio, confira certificado HTTPS, instalação do PWA e URLs `https://pronatec.wicolly.com.br/#c=...`.

**Fontes oficiais:** [Cloudflare — React com Pages](https://developers.cloudflare.com/pages/framework-guides/deploy-a-react-site/) · [Cloudflare — Build configuration](https://developers.cloudflare.com/pages/configuration/build-configuration/) · [Cloudflare — Custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/).

### GitHub Pages (extra para a atividade)

Se o professor exigir explicitamente um **site no GitHub Pages**, apenas subir o código no GitHub e publicar no Cloudflare Pages **não substitui** essa exigência. Incluí um workflow **manual e opcional** `.github/workflows/github-pages.yml`:

1. No repositório GitHub, ative **Settings → Pages → Source: GitHub Actions**.
2. Abra **Actions → Publicar também no GitHub Pages → Run workflow**.
3. O build usará `VITE_BASE_PATH=/<nome-do-repositorio>/`, suportando a URL `https://<usuario>.github.io/<repositorio>/`.
4. Mantenha o domínio `pronatec.wicolly.com.br` exclusivamente no Cloudflare Pages. A publicação do GitHub Pages é independente, não modifica DNS e não é executada automaticamente pelo repositório.

## PWA, rede e dados locais

- A **primeira visita requer conexão**, para baixar o aplicativo e ativar o Service Worker.
- Após o primeiro carregamento/caching, a interface, o comparador, o histórico e a geração de links funcionam **sem internet**. Enviar o link ou acessar a oferta original depende da conexão do usuário e do aplicativo escolhido.
- O histórico fica em `IndexedDB` sob o **origin do site**. `localhost`, `pages.dev`, GitHub Pages e `pronatec.wicolly.com.br` possuem históricos **separados**.
- Limpar os dados do navegador, usar modo anônimo, trocar de navegador/origin ou restrições de armazenamento **pode remover as observações**. Exporte o JSON periodicamente.
- Atualizações do Service Worker trocam assets em cache e **não executam limpeza de IndexedDB**. A persistência definitiva, porém, depende do navegador.
- O histórico não é automaticamente compartilhado nem sincronizado.
- Os links incluem dados digitados (nomes, preços, links de promoção). Não inclua informações confidenciais que não queira passar aos destinatários.

## Arquitetura

Consulte [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) para os contratos das camadas, regras matemáticas, arquitetura offline e evoluções previstas.

## Licença

Código educacional preparado para o **Grupo 8 — Comparação de Preços**. O conteúdo foi elaborado para servir como base de produto; ajuste créditos e integrantes reais da turma antes de apresentar ou publicar.
