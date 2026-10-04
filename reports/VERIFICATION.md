# Verificacao Final

Ambiente local: Windows 10.0.26200, Intel Core i5-8250U 1.60 GHz,
Node 22.23.3, Playwright 1.63.0 e Lighthouse 13.5.0.

## Revisao Atual: Padronizacao do Pagamento

- Vitest: 35/35 aprovados em execucao isolada. O novo contrato valida nome do perfil, indicacao e tipo da carteira e preserva estes dados no snapshot confirmado.
- Playwright focado: 15 aprovados e 1 exclusao intencional do caso exclusivamente mobile no projeto desktop (5.3 min). Cobre composicao, validacao/foco, revisao dos campos, cadastro/persistencia de Coinbase/Polygon, compra completa/repetida, recusa recuperavel, timeout idempotente, Socket.IO e frame mobile.
- Comparacao final SEM update-snapshots: 2/2 aprovados (47.2 s), com oito capturas de inicio, detalhe, carrinho e pagamento. As baselines foram renovadas intencionalmente antes desta comparacao. O HTML atual corresponde somente a ultima verificacao visual, nao a suite completa.
- TypeScript, tipos dos mocks, ESLint e build client/SSR aprovados. Apenas avisos conhecidos de imports mistos e imports nao usados de dependencias, sem erro de compilacao.
- Capturas de carrinho, login, pagamento e detalhe em 320/390/414/768/1440 px sem overflow horizontal nas telas verificadas. Skeletons do pagamento reservam as dimensoes dos retratos, carteiras e resumo compacto.
- O formulario segue a composicao desktop em duas colunas, com NFTs/totais e carteiras na lateral. No mobile, carteiras precedem os campos expansivos e o botao permanece fixo. O endereco vem do cadastro; a escolha de rede/carteira sincroniza radios e formulario.
- "Confirmar compra" abre a revisao obrigatoria antes do POST idempotente. Indicacao e ENS continuam opcionais; diferencas e contratos foram documentados em ARCHITECTURE.md e docs/CONTRACTS.md.
- Os testes iniciais de compra com a secundaria esperavam um titulo antigo do recibo. A compra havia confirmado corretamente; a expectativa foi corrigida para o titulo atual e o status real, sem mudar o produto ou ampliar timeouts.
- Suite E2E completa, Lighthouse e deploy Vercel nao foram reexecutados nesta revisao. Regressoes internas nao certificam equivalencia pixel a pixel com todos os frames do Figma.

## Revisao Anterior: Descricoes e Interface de Pagamento

- Vitest: 34/34 aprovados em execucao isolada. Inclui metadados completos por rede e migracao das descricoes sem alterar precos, versoes, contas, carrinhos ou recibos.
- Playwright final sem update-snapshots: 12 aprovados e 2 exclusoes intencionais dos casos exclusivos mobile no projeto desktop (3.3 min). Inclui descricoes/refresh, recusa recuperavel da carteira, ausencia de controles extras de conexao, compra repetida, atualizacao real via Socket.IO, frames mobile e oito capturas.
- A primeira regressao ampla encontrou uma corrida no helper de controle: a configuracao de cenario foi solicitada antes de `window.kurioMocks` estar disponivel apos navegacao. O helper agora aguarda a inicializacao real; a repeticao final passou integralmente, sem ampliar timeouts.
- Baselines de detalhe e pagamento desktop/mobile atualizadas intencionalmente; a execucao final comparou as telas sem atualizar capturas.
- TypeScript, tipos dos mocks, ESLint e build de producao client/SSR aprovados. Permanecem avisos de imports dinamicos/estaticos e imports nao usados de dependencias, sem erro de compilacao.
- Capturas renovadas de carrinho, login, pagamento e detalhe em 320/390/414/768/1440 px. Carrinho, pagamento e detalhe sem overflow horizontal em todas as larguras; imagens e fontes reais foram aguardadas.
- Autorizacao da carteira permanece via REST ao revisar a compra, conforme a linha 58 do Challenge.md. A interface nao possui botoes extras de conectar/recusar/desconectar, status de conexao ou banner de reconexao. O transporte Socket.IO e a reconciliacao continuam ativos.
- A sequencia de autorizacao e cotacao descarta sessao encerrada/trocada antes de iniciar a etapa seguinte ou gravar dados no cache.
- Suite E2E completa, Lighthouse e deploy Vercel nao foram reexecutados nesta revisao. O HTML atual corresponde a regressao focada de 14 casos, nao a suite completa. As capturas validam regressao interna, nao certificam equivalencia pixel a pixel com todos os frames do Figma.

## Revisao Anterior: Carrinho e Autenticacao Social

- Vitest: 33/33 aprovados em execucao isolada. Os novos testes cobrem ambos os provedores simulados, subjects invalidos, persistencia/merge, falha recuperavel e revogacao real do Socket.IO na troca de conta.
- Playwright focado: 16 aprovados e 2 exclusoes intencionais dos casos exclusivos mobile no projeto desktop (4.4 min). Inclui login/cadastro, foco, cupom/carrinho/refresh, isolamento, cancelamento social e geometria dos controles mobile.
- Baselines atualizadas intencionalmente para carrinho desktop/mobile, detalhe mobile e pagamento mobile. Uma execucao visual adicional confirmou a ultima composicao.
- Verificacao final SEM update-snapshots: 4/4 aprovados (1.3 min), com oito capturas e compra completa/repetida nas duas versoes. O HTML atual corresponde a essa ultima execucao, nao a suite completa.
- TypeScript, tipos dos mocks, ESLint e build client/SSR aprovados. Persistem apenas os avisos de imports dinamicos/estaticos ja existentes.
- `scripts/capture-design.mjs` capturou carrinho com quatro itens, login, pagamento e detalhe em 320/390/414/768/1440 px. Carrinho/pagamento/detalhe nao apresentaram overflow horizontal. As imagens reais e fontes foram aguardadas antes das capturas, sem aceitar o skeleton como tela final.
- A suite E2E completa, Lighthouse e deploy Vercel nao foram reexecutados nesta revisao. Estes testes visuais verificam regressao interna; nao certificam equivalencia pixel a pixel com todos os frames do Figma.

Carrinho mobile segue o frame 12 com retratos de 100 px, quantidades ao centro
da linha, remocao separada, resumo inferior e CTA arredondado. Em 320 px, os
controles mudam de posicao para preservar o texto. Desktop segue a tabela e
recomendacoes do frame 03. Detalhe/login receberam ajustes nas margens,
dimensoes de controles e foco. Pagamento compacta itens/valores num expansor,
mantendo a revisao financeira obrigatoria e impedindo texto sob o CTA fixo.

Google/Facebook sao simulacoes REST MSW explicitamente identificadas, nao OAuth
real. O cancelamento e o retorno ao formulario conservam o foco e nao aplicam
respostas atrasadas. Um teste inicial de cancelamento esperava `/login` sem os
search params normais do Router; foi corrigido para verificar o pathname.
Um teste Socket.IO excedeu 5 s ao executar junto do navegador; a suite isolada
passou integralmente sem ampliar o timeout.

## Verificacao Anterior

- Vitest: 27 testes aprovados, incluindo REST/Socket.IO, precisao, sessao, migracao persistida e filtros de rede.
- Playwright: a suite completa desta revisao teve 31 aprovados, 3 falhas mobile e 2 exclusoes intencionais dos testes exclusivos mobile no projeto desktop (11.3 min). O relatorio anterior foi preservado em `diagnostics/frontend-before-fixes/e2e/`.
- Apos as correcoes, a regressao focada passou: 10 testes aprovados e 2 exclusoes intencionais (1.5 min), sem update-snapshots. Ela cobre favoritos/rollback/isolamento, compra repetida, skeleton/rede, oito capturas e os dois novos testes dos frames mobile. Os 34 cenarios distintos foram validados em execucoes complementares; a suite completa nao foi repetida novamente apos o ultimo reparo. O HTML atual corresponde a essa execucao focada.
- As oito baselines foram atualizadas intencionalmente para o refinamento visual; a execucao posterior comparou inicio, detalhe, carrinho e pagamento desktop/mobile sem update-snapshots.
- TypeScript, tipos dos mocks e ESLint aprovados.
- Build padrao atual aprovado. Build Vercel aprovado na revisao anterior; o deploy publico exige autenticacao externa.
- Smoke de desenvolvimento verifica hidratacao, mocks, imagens, login, drawer e overflow em 1440/768/390 px.

Relatorio executavel: [E2E HTML](e2e/index.html).
Baselines: [tests/e2e/marketplace.spec.ts-snapshots](../tests/e2e/marketplace.spec.ts-snapshots/).
Traces das falhas anteriores corrigidas ficam em `diagnostics/prior-e2e/` e seus anexos HTML;
as causas eram seletores ambiguos de alertas e corrida entre reset e restauracao de sessao.
O helper de boot agora espera imagens reais e hidratacao tambem apos o reload;
esperar apenas os nove cards aceitava skeletons antes de os handlers React estarem ativos.
Baselines novas registram o design solicitado; a verificacao posterior nao usa update-snapshots.
Nesta revisao, um primeiro E2E identificou interceptacao do clique no checkbox
oculto de 1 px. O input agora cobre a linha inteira sem perder semantica ou foco.
Outra expectativa foi corrigida para decodificar strings numericas entre aspas
nos search params do TanStack Router, verificando o tipo string e os 18 decimais.
Contadores sao calculados pelo MSW (24 NFTs; 8 por rede), nao copiados do Figma.
Solana pertence aos metadados de descoberta; carteiras/cotacoes permanecem Ethereum/Polygon.
Uma execucao concorrente de Vitest e Playwright excedeu o limite de 5 s em um
teste Socket.IO. A suite isolada passou (25/25); recomenda-se executar as duas
suites separadamente neste ambiente. O timeout nao foi ampliado para ocultar a falha.

## Refinamento Mobile

Os 15 frames foram capturados em `figma-frame-01.png` ate `figma-frame-15.png`.
Busca superior, grade em duas colunas deslocadas, navegacao inferior, login e
cadastro em tela cheia, imagem ampla do detalhe, compra fixa, resumo do carrinho
na largura inteira e carteiras reais como radios seguem as referencias mobile.
Filtros/ordenacao, detalhes do colecionador e revisao financeira continuam
acessiveis. Precificacao, UUID/idempotencia e fluxo Socket.IO nao foram trocados
por estado local.

A verificacao encontrou interceptacao do toque nos indicadores do hero e no
coracao do detalhe. Z-index dos indicadores e remocao do stacking context do
painel de detalhe corrigiram os controles. O checkout foi compactado e seus
itens flex passaram a ocupar a largura disponivel, sem texto sob a barra fixa
nem expansao do viewport por endereco de carteira. O teste mobile verifica
explicitamente `innerWidth === 390`, limite do cartao e total acima da revisao.

O teste de shimmer agora verifica a imagem reservada, nao o breadcrumb oculto
no mobile. O teste otimista observa transicoes reais de `aria-pressed` com
MutationObserver: nenhum setter, cache ou evento de negocio e simulado.
Uma resposta de checkout excedeu o timeout real de 1 s sob carga do ambiente;
o teste de compra aceita o recurso real de recuperacao somente quando o botao
esta habilitado e continua exigindo pedido unico e recibo imutavel. Os timeouts
da aplicacao e da suite nao foram ampliados. Uma captura tambem excedeu 30 s;
a repeticao posterior passou. Lighthouse nao foi reexecutado nesta revisao.

## Lighthouse Antes Da Padronizacao

As medicoes abaixo precedem os novos blocos, tamanhos e assets WebP. Nao sao
uma nova auditoria desta revisao visual; os comandos continuam disponiveis para
reexecutar as 12 medicoes no build correspondente.

Tres medicoes por pagina/perfil (12 ao todo), build otimizado em
`http://127.0.0.1:4173`, mocks padrao, perfil Chrome novo por execucao e
throttling simulado padrao. Imagens, fontes, MSW e Socket.IO permaneceram ativos.
Configuracao: [lighthouse.config.mjs](../lighthouse.config.mjs).
Relatorios individuais HTML/JSON e versoes do navegador: [lighthouse](lighthouse/).
Medianas detalhadas: [SUMMARY.md](lighthouse/SUMMARY.md) e [summary.json](lighthouse/summary.json).

| Pagina | Perfil | Perf | A11y | BP | SEO | LCP ms | CLS | TBT ms |
|---|---|---|---|---|---|---|---|---|
| Inicio | Mobile | 81 | 100 | 100 | 100 | 3858 | 0.001 | 234 |
| Inicio | Desktop | 99 | 100 | 100 | 100 | 904 | 0.021 | 0 |
| Detalhe | Mobile | 84 | 100 | 100 | 100 | 3711 | 0.000 | 201 |
| Detalhe | Desktop | 100 | 100 | 100 | 100 | 810 | 0.000 | 0 |

Metas: 90/95/95/90. **Performance mobile nao atingiu 90.**
Os dados dependem da inicializacao do service worker MSW e da hidratacao antes
de revelar a imagem principal, atrasando sua descoberta. Processamento de
JavaScript em CPU simulada e carregamento dos JPGs contribuem para LCP/TBT.
Essas dependencias explicam parte dos resultados; sao inferencias baseadas nos
audits e no fluxo de carregamento, nao garantias de causalidade isolada.

A primeira auditoria registrou performance mobile 74/74, LCP 4219/4039 ms,
TBT 343/411 ms e CLS desktop do detalhe 0.113.
Remover o redirect dos parametros padrao, carregar Vaul apenas quando necessario
(bundle inicial aproximadamente 289 -> 216 KB) e reservar o detalhe completo no
skeleton melhorou as medianas sem mudar os recursos auditados.
Evidencias anteriores: `diagnostics/lighthouse-before-url-change/`.
Oportunidades restantes: imagens responsivas em formatos modernos, mais divisao
de codigo e investigacao de inicializacao/hidratacao mantendo a rede mockada.
Os retratos originais permanecem disponiveis localmente.

## Pendencias Externas

Vercel: projeto informado `KurioFrontEndChallenge`; build e adapter preparados.
A CLI nao esta autenticada e nao ha remoto Git/repo informado. Nenhuma URL
publica foi publicada, portanto a entrega da secao 12 ainda nao esta completa.

Figma: o prototipo renderizou no Chrome e os 15 frames foram capturados;
os quatro PNGs originais e WebPs locais estao no projeto.
Os 15 frames nao foram certificados pixel a pixel. Estados auxiliares fora do
escopo sao explicitamente indisponiveis. Ajustes e limites estao em
[ARCHITECTURE.md](../ARCHITECTURE.md).
