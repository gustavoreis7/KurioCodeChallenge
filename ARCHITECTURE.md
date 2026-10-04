# Arquitetura

## Responsabilidades

- `src/types`: contratos REST/eventos, ETH como string decimal.
- `src/services/api.ts`: operacoes tipadas; REST exclusivamente por Axios.
- `src/services/http.ts`: token, visitante, timeout, 401 e descarte de respostas
  privadas obsoletas pela revisao de sessao.
- `src/services/session.ts`: restaura token pela API; notifica componentes,
  cancela consultas, remove cache privado e encerra sockets antes da transicao.
- `src/hooks`: consultas, mutations, favorito otimista e reconciliacao Socket.IO.
- `src/routes`: rotas TanStack, busca validada e protecao `beforeLoad`.
- `src/pages`/`components`: formularios, estados e apresentacao, sem fixtures.
- `src/mocks`: banco, regras de negocio, cenarios, REST e binding Socket.IO.
- `tests`: integracao de rede, contratos do cliente, E2E e snapshots.

## Sessao e Cache

Chaves publicas: `['nfts', parametros]`, `['nft', id]`.
Chaves privadas: `['private', token, recurso, ...]`; visitantes:
`['visitor', guestId, recurso, ...]`. Login/cadastro mesclam o carrinho visitante
no backend antes de ativar a nova sessao. Logout troca o identificador visitante
e remove a tentativa local da conta; nao apresenta o carrinho anterior ao proximo
usuario. Expiracao preserva a tentativa por usuario para retomada autenticada.
Parametros padrao sao omitidos da URL pelo middleware `stripSearchParams`;
filtros, busca, ordenacao e paginas nao padrao continuam persistidos nela.

Consultas usam AbortSignal, staleTime 30 s e gcTime 5 min. Uma leitura pode
repetir apenas uma vez por falha de rede/5xx; 4xx e mutations nao repetem
automaticamente. Cotacoes nao repetem automaticamente e sao revalidadas para
revisao. Favoritos cancelam a leitura, guardam snapshot, atualizam otimisticamente,
fazem rollback em erro e reconciliam com REST.

Pedidos e NFTs usam versoes tambem no structuralSharing: uma resposta REST
atrasada nao sobrescreve evento mais novo. Estados terminais de pedido nao
regredem para pending. Campos e mutations locais sao remontados por token nas
paginas privadas. Interceptors descartam respostas antigas antes de callbacks.

## Socket.IO

MSW 2.10.2 e `@mswjs/socket.io-binding` 0.2.0 estao fixados. O cliente real
`socket.io-client` 4.8.1 e importado somente depois de MSW iniciar; Engine.IO
captura o WebSocket global ao importar. O transporte e WebSocket-only, sem
fallback polling. O binding nao implementa todas as funcionalidades de um
servidor Socket.IO, rooms ou namespaces customizados.

`nft.updated` leva eventId, resourceId, version, occurredAt e snapshot.
`order.updated` acrescenta userId e sessionToken. A subscription usa
`session.subscribe`; eventos privados verificam sessao vigente na simulacao
e no cliente. Listeners sao removidos e socket desconectado no encerramento.
Heartbeats Engine.IO de controle a cada 20 s sustentam o handshake do binding;
eventos de negocio sempre usam `binding.client.emit`, nunca setters da UI.

O hook ignora IDs duplicados e versoes antigas, aplica snapshots aos caches de
lista/detalhe e invalida somente a cotacao de um carrinho afetado. Reconexao
reconcilia consultas ativas por REST e exige nova revisao do checkout. Mutacoes
de filtro/paginacao continuam sendo responsabilidade da consulta pela URL.

## Precisao e Compra

Precos/taxas/descontos/totais trafegam como strings, com ate 18 casas decimais.
Calculadora local de linhas usa BigInt/wei; resumo e finalizacao usam a cotacao
da API. Quantidade e um inteiro limitado por disponibilidade e maxPerOrder.

Checkout revalida pela API e apresenta revisao antes de enviar. Snapshot,
revisao dos eventos, prazo, rede/carteira e fingerprint da cotacao bloqueiam
confirmacao desatualizada. Um evento relevante mostra aviso e exige revalidacao
explicita. A autorizacao da carteira ocorre via REST ao revisar a compra,
sem controles adicionais de conexao na interface. Recusa impede a revisao;
a confirmacao exige autorizacao e carteira da mesma rede, conforme o contrato.

O frame desktop de pagamento organiza o formulario em duas colunas e o
resumo/carteiras na lateral. Mobile coloca as carteiras primeiro, mantendo
dados do colecionador e itens expansivos e a acao fixa. O botao visivel
"Confirmar compra" abre a revisao obrigatoria; somente a confirmacao desse
dialogo envia o pedido. Seu nome acessivel inclui a revisao e o texto visivel.
Endereco e tipo de carteira vem do cadastro real, com selecao compartilhada
entre formulario e radios; a carteira secundaria nunca e inventada na UI.
Nome do perfil e codigo de indicacao integram o snapshot e a validacao REST.
Indicacao e ENS sao opcionais, diferentemente dos asteriscos do desenho, para
nao exigir um codigo promocional ou dominio ENS de todo colecionador.

Descricoes completas, colecao, atributos e metadados de rede, contrato e
direitos autorais pertencem ao contrato `NFT.details` e as fixtures MSW.
Registros legados recebem esses metadados sem reset de contas, precos,
carrinhos ou snapshots de pedidos. A tela aceita respostas legadas usando
`description` quando `details` nao estiver disponivel.

Uma tentativa persiste UUID v4 e corpo exato por usuario antes do POST com
`Idempotency-Key`. Trava sincrona impede cliques repetidos. Erro sem resultado
conhecido permite somente recuperar a mesma tentativa; nao gera outra chave.
O ledger do mock compara JSON canonico e devolve o mesmo pedido antes de
revalidar a cotacao. Mesmo UUID com outro corpo produz conflito.

Reservas pendentes impedem overselling. Plano de liquidacao persiste e retoma
apos refresh; polling REST de 2 s complementa eventos para pedidos pendentes.
Confirmacao remove apenas quantidades compradas; recusa preserva carrinho.
Recibo usa exclusivamente snapshot imutavel do pedido, nao o catalogo atual.

## Mocks e Seguranca

Banco persistido em `mutt.mock.database.v1` no localStorage. Requests validam
token e ownership depois da latencia. PBKDF2-SHA256 com 100 mil iteracoes e
salt substitui senhas em claro. Estado retorna clones; transacoes nao tem await.
Reset elimina banco/configuracao/clock/timers/sockets integralmente.
Configuracao de cenario e relogio ficam em `kurio.mock.config.v1`, com validacao
ao restaurar, para preservar falhas deterministicas apos refresh.

A simulacao e local a uma aba/processo; localStorage nao e uma barreira de
seguranca real nem implementa coordenacao entre abas. Somente dados ficticios.
Nao ha blockchain, gateway, extensao de carteira ou OAuth real. Google/Facebook
usam autenticacao social simulada via REST MSW: o servidor lista identidades
ficticias e valida o subject vinculado ao provedor, sem aceitar email arbitrario
ou expor perfis privados no seletor. Login e cadastro social reutilizam a sessao
existente da identidade demonstrativa, sem duplicar contas. `createSession`
revoga token/socket anterior e mescla carrinho; `setSession` limpa o cache privado.
O seletor usa Query/Axios, aborta requests ao desmontar e descarta respostas
fora da revisao de sessao original. O aviso de simulacao e explicito; nao ha SDK
nem credenciais dos provedores. Editorial e suporte estao fora do escopo.

## Figma e Acessibilidade

O refinamento do carrinho usa os frames 03 e 12: tabela desktop de quatro
colunas, recomendacoes por Query, retratos mobile de 100 px e resumo inferior
com controles arredondados. Remocao permanece separada do controle de quantidade,
sem reproduzir a sobreposicao visivel na referencia. Dinheiro permanece exato,
inclusive quando exige quebra de linha em telas pequenas.
Detalhe mobile usa margens de 26 px, painel sobre a imagem e barra de compra
com botao/cart separados. Login preserva labels acessiveis com a composicao
mobile em tela cheia. Pagamento usa carteiras cadastradas de verdade no mock;
nao inventa conexoes WalletConnect/MetaMask para copiar o frame. Itens e valores
podem ser expandidos; o modal de revisao sempre mostra o resumo financeiro.
Uma faixa opaca protege os controles fixos contra texto sob o botao desabilitado.
Capturas de desenvolvimento ficam em `reports/design-*-{largura}.png`.

Referencia: https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge

`src/responsive.css` concentra composicao por tela e breakpoint; cores e
componentes compartilhados continuam em `src/styles.css`. No mobile, a busca
fica no topo, filtros/ordenacao abrem pelo icone, a grade tem duas colunas
deslocadas e a navegacao inferior abre carrinho, conta e favoritos reais.
Os destaques alternam imagens da API. Novos lancamentos e Em alta usam categorias
na URL; `trending` e uma classificacao deterministica das fixtures, nao uma
metrica de popularidade real. A migracao dessa classificacao nao altera precos,
estoque ou pedidos persistidos.

Detalhe mobile usa imagem ampla, edicoes em radios e quantidade/compra fixas;
ETH segue string, inclusive no total por quantidade. Login/cadastro ocupam a
tela inteira com foco Radix, sem o catalogo visivel ao fundo. Carrinho usa linhas
compactas e resumo inferior. Checkout exibe carteiras cadastradas como radios,
perfil expansivel, resumo completo e revisao fixa, mantendo confirmacao separada
e bloqueio por cotacao alterada. Nao foram inventados providers de carteira ou
OAuth que o contrato nao implemente. Nome de exibicao permanece obrigatorio no
cadastro conforme o contrato, mesmo sendo um campo extra frente ao frame mobile.
Editorial/rodape nao aparecem nos frames mobile; no desktop permanecem no
catalogo, detalhe, carrinho e pagamento. Perfil/carteiras e recibo seguem os
frames desktop sem rodape.

Space Mono e servida localmente por @fontsource. Tamanhos de texto/contraste e
alvos foram ampliados em relacao as miniaturas para legibilidade. CSS preserva
aspect-ratio das imagens e shimmer respeita reduced-motion. Dialog Radix e
Drawer Vaul controlam foco; labels/erros, status live, skip link e foco visivel
complementam os formularios. Perfil, carteiras e recibo adaptam-se ao mobile.
O skeleton do detalhe reserva tambem breadcrumb, abas e itens relacionados,
evitando a movimentacao do rodape durante o carregamento.
A biblioteca do drawer e carregada sob demanda ao abrir o carrinho, sem alterar
as consultas REST nem remover funcionalidades do build auditado.

## Verificacao e Entrega

Playwright usa contextos novos e reset MSW por teste, Chrome/Chromium,
1440/390 px e smoke tambem em 768 px. HTML e traces de falha sao gerados pelos
comandos do README. Baselines representam regressao da implementacao, nao
comparacao automatica contra todos os frames do Figma.

Lighthouse usa somente build otimizado, tres runs por pagina/perfil, configs
versionadas e HTML/JSON/medianas em reports/lighthouse. A API programatica segue
https://github.com/GoogleChrome/lighthouse/blob/main/docs/readme.md.
Resultados reais abaixo das metas devem ser registrados, sem desativar assets
ou funcionalidades para melhorar a pontuacao.
Antes da padronizacao visual, as medianas foram 81/84 no mobile e 99/100 no desktop (inicio/detalhe),
com 100 nas outras categorias. O inicio do MSW e a hidratacao precedem os dados
e a imagem LCP; processamento do cliente sob throttling continua elevando TBT.
O middleware de URL removeu um redirect inicial e o drawer sob demanda reduziu
o bundle inicial de cerca de 289 KB para 216 KB. O skeleton completo zerou o
CLS do detalhe na mediana. Performance mobile ainda nao atinge 90.
Consulte [reports/VERIFICATION.md](reports/VERIFICATION.md) para evidencias,
metricas, limites e proximas oportunidades de otimizacao.

Vercel foi escolhida para `Kuriocodechallenge`. O build especifico adiciona
o adapter Nitro sem alterar o desenvolvimento/preview padrao.
O fallback WASM oficial do Rolldown permite compilar quando o binding nativo
nao carrega neste Windows; ele participa somente do build, nao da UI.
Publicacao exige repositorio e equipe autenticada; o nome do projeto nao identifica a conta.
A ausencia de URL publica nao e apresentada como cumprimento do deploy.
