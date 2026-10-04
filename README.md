# Kurio Marketplace

React/TypeScript com TanStack Router v1, Query v5, Axios, Socket.IO, MSW e
componentes shadcn/ui. Regras oficiais: `Challenge.md`.

## Executar

Use Node 22.19+ ou 24 LTS. O projeto tambem inclui Node 22 local para os scripts
npm, sem alterar a instalacao global. Um Node global antigo pode gerar avisos
de engine durante a instalacao.

```sh
npm ci
npm run dev
```

Abra a URL informada pelo Vite, normalmente `http://127.0.0.1:5173`.
Uma porta ocupada faz o Vite selecionar a seguinte.
Os mocks iniciam antes da hidratacao e ficam ativos no build de demonstracao.
`VITE_ENABLE_MOCKS=false` desativa os mocks; nesse modo e necessario um backend
que implemente os contratos em `docs/CONTRACTS.md`.

## Credenciais Ficticias

| Conta       | E-mail             | Senha     |
| ----------- | ------------------ | --------- |
| Ana Silva   | ana@example.test   | Demo1234! |
| Bruno Costa | bruno@example.test | Demo1234! |

24 NFTs, duas edicoes por NFT, uma carteira inicial por conta. Cupom valido:
`MUTT10`; expirado: `EXPIRED`. Senhas sao hashes PBKDF2 com salt na simulacao.
As carteiras e as referencias de transacao sao simuladas, sem blockchain real.

Google e Facebook funcionam nas telas de login e cadastro: escolha uma das
contas ficticias para entrar, sem senha do provedor. A escolha e autenticada
pela API MSW e preserva carrinho, retorno a rota protegida e sessao apos F5.
O seletor identifica explicitamente a simulacao; nao e OAuth real e nao solicita
credenciais externas. Com mocks desativados, o backend precisa implementar
esses contratos. OAuth de producao exige configuracao e validacao no servidor.

## Fluxos

- Explore, combine colecoes/redes, ordene e pagine. O estado fica na URL.
- Contadores vem da API; o slider permite dois limites e Valores exatos aceita
  ate 18 casas decimais. Aplicar confirma os limites, sem arredondar ETH.
- Acesse `/nfts/001`, escolha edicao/quantidade e adicione ao carrinho.
- O carrinho visitante sobrevive a refresh e e mesclado ao autenticar.
- Em `/checkout`, selecione uma carteira cadastrada, revise e confirme.
  A autorizacao simulada acontece ao revisar a compra, sem controles extras
  de conectar, recusar ou desconectar. Uma recusa impede a confirmacao.
- Recusas preservam itens. Timeout mostra `Recuperar pedido`, mantendo corpo
  e UUID originais, inclusive apos refresh.
- `/profile`, `/wallets`, `/orders` e checkout exigem sessao.

## Interface Responsiva

O mobile usa busca no topo, filtros/ordenacao pelo icone, duas colunas no
catalogo e navegacao inferior com entrada para login e favoritos. Detalhe tem
barra fixa de compra; login/cadastro ocupam a tela inteira. Checkout usa
carteiras reais da simulacao e perfil expansivel, preservando revisao e
confirmacao separadas. Os 15 frames de referencia estao em `reports/figma-frame-*`;
os ajustes de composicao ficam em `src/responsive.css`.

Carrinho mobile usa retratos de 100 px, controles separados da remocao e resumo
na largura inteira. No desktop, a tabela alinha preco/edicoes/total e mostra
recomendacoes retornadas pela API. Checkout mobile permite expandir os NFTs e
o detalhamento financeiro; a revisao obrigatoria continua exibindo todos os
valores antes da confirmacao. `node scripts/capture-design.mjs` captura carrinho,
login, checkout e detalhe no servidor dev em 320/390/414/768/1440 px, usando
os servicos REST reais da simulacao, sem setters de dados.

## Verificacoes

```sh
npm run typecheck
npm run typecheck:mocks
npm run lint
npm test
npm run test:e2e
npm run test:visual
npm run test:e2e:report
npm run build
npm run build:vercel
npm run assets:export
npm run preview
npm run audit:lighthouse
```

Playwright usa Chrome instalado no ambiente local e Chromium em CI.
Para CI, instale o navegador com `npx playwright install --with-deps chromium`.
`TEST_BASE_URL` seleciona outro servidor; `DEV_URL` seleciona a URL para
`npm run check:dev`, que verifica 1440, 768 e 390 px.
Relatorio E2E: `reports/e2e/`; traces de falha: `test-results/` e anexos do HTML.
Os controles `window.kurioMocks.post('/__mock/...', dados)` passam pelo Axios
e permitem executar os mesmos E2E no preview de producao ou no deploy com mocks.
Baselines: `tests/e2e/marketplace.spec.ts-snapshots/`. Para atualizacoes intencionais:
`npm run test:visual -- --update-snapshots`.

Lighthouse deve usar o build otimizado servido por `npm run preview`, nunca o
servidor dev. `AUDIT_URL` altera a URL padrao `http://127.0.0.1:4173`.
Cada pagina/perfil tem tres execucoes, HTML/JSON, medianas e ambiente em
`reports/lighthouse/`. Metas: Performance 90, A11y 95, BP 95 e SEO 90.
Resultados e pendencias da verificacao final: [reports/VERIFICATION.md](reports/VERIFICATION.md).
Performance mobile ficou abaixo da meta; a analise registra os valores e causas,
sem desativar mocks ou funcionalidades durante a auditoria.

## Cenarios Reproduziveis

Configuracao via Axios em `POST /api/__mock/config`, ou header
`X-Mock-Scenario` por request. A configuracao global permite demonstrar falhas
na UI. Configuracao e relogio de negocio persistem apos F5; reset restaura os
valores padrao. Os controles tambem funcionam no build de demonstracao.

```ts
await axios.post("/api/__mock/config", {
  scenario: "success",
  latencyMs: 80,
  paymentDelayMs: 600,
  timeoutMs: 1500,
});
await axios.post("/api/__mock/nfts/001", {
  priceEth: "1.500000000000000001",
  duplicate: true,
  stale: true,
});
await axios.post("/api/__mock/nfts/001", { editionId, available: 0 });
await axios.post("/api/__mock/disconnect");
await axios.post(`/api/__mock/orders/${orderId}/settle`, {
  status: "confirmed",
});
await axios.post("/api/__mock/reset");
```

Use o `editionId` retornado pela API. O reset limpa banco, sessoes, cotacoes,
pedidos, idempotencia, timers e
sockets. Remova tambem `kurio.session.token` e recarregue ao resetar manualmente.
Cada E2E parte de um contexto isolado e executa esse reset.

| Cenario                                   | Efeito                                              |
| ----------------------------------------- | --------------------------------------------------- |
| success / payment-confirmed               | Pedido pendente, depois confirmado                  |
| empty                                     | Catalogo vazio                                      |
| slow / variable-latency                   | 2 s ou sequencia deterministica 600/40/250 ms       |
| offline / http-422 / http-500 / forbidden | Rede, 422, 503 ou 403                               |
| session-expired                           | Revoga sessao, encerra socket e retorna ao login    |
| registration-conflict / validation-error  | Conflito ou validacao                               |
| invalid-coupon / expired-coupon           | Codigo invalido ou expirado                         |
| price-changed / edition-sold-out          | Atualiza REST/Socket e rejeita cotacao antiga       |
| timeout-after-create                      | Persiste pedido antes da resposta tardia; recuperar |
| payment-refused                           | Recusa terminal, preserva carrinho                  |
| pending                                   | Liquidacao somente pelo controle `settle`           |
| wallet-refused                            | Conexao da carteira recusada                        |

`now` fixa o relogio de negocio nos controles. Para testar expiração temporal
na UI, fixe tambem o relogio do navegador com Playwright Clock. Eventos sempre
passam por `socket.io-client` interceptado pelo binding MSW.

## Entrega Publica

Hospedagem escolhida: Vercel. Nome informado: `KurioFrontEndChallenge`.
`vercel.json` seleciona TanStack Start e `npm run build:vercel`; o adapter Nitro
gera as funcoes e os assets de deploy. Configure Node 22 e mantenha os mocks
ativos (nao defina `VITE_ENABLE_MOCKS=false`). Nao use um rewrite generico para
`index.html`: o projeto usa SSR e o adapter encaminha as rotas.

Conecte o repositorio na equipe correta da Vercel e publique o mesmo commit.
Depois, valide `/nfts/001`, `/cart`, `/login`, `/checkout`, `/profile`, `/wallets`
e `/orders` por acesso direto e refresh, alem dos eventos e da recuperacao de
pedido. Nao ha remoto Git nem conta de hospedagem conectada nesta pasta;
o nome informado sozinho nao permite publicar. A URL publica ainda esta pendente.
Consulte `ARCHITECTURE.md` para assets originais recuperados, ajustes visuais e limites da simulacao.
