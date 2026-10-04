# Contratos de rede

Tipos: `src/types/index.ts` e mapa de operacoes em `src/types/api.ts`.
Base URL relativa: `/api`. Corpos e respostas sao JSON, exceto respostas 204.
Sessao privada: `Authorization: Bearer <token>`. Carrinho visitante:
`X-Guest-Id: <identificador estavel de 8 a 80 caracteres alfanumericos/hifens>`.
Quando ha token, nao existe fallback para visitante se a sessao for invalida.

## REST

| Metodo e recurso                     | Entrada                                            | Resposta                                               |
| ------------------------------------ | -------------------------------------------------- | ------------------------------------------------------ |
| POST /auth/register                  | Registration; X-Guest-Id opcional                  | 201 Session                                            |
| POST /auth/login                     | Credentials; X-Guest-Id opcional                   | 200 Session                                            |
| GET /auth/social/:provider/accounts  | google ou facebook                                 | SocialAccountsResponse; identidades ficticias publicas |
| POST /auth/social/:provider          | SocialLoginRequest; X-Guest-Id opcional            | 200 Session; mesma conta demonstrativa, sem duplicacao |
| GET /auth/session                    | Token                                              | Session                                                |
| POST /auth/logout                    | Token                                              | 204; revoga token e subscription                       |
| POST /auth/expire                    | Token                                              | 204; expira efetivamente a sessao                      |
| GET /nfts                            | Parametros abaixo                                  | NftListResponse (paginacao e facets)                   |
| GET /nfts/:id                        | Identificador                                      | NFT                                                    |
| GET /favorites                       | Token                                              | { nftIds: string[] }                                   |
| PUT /favorites/:id                   | Token                                              | { userId, nftId }; inclusao idempotente                |
| DELETE /favorites/:id                | Token                                              | 204; remocao idempotente                               |
| GET /cart                            | Token ou X-Guest-Id                                | Cart                                                   |
| POST /cart/items                     | CartItem                                           | 201 Cart; acumula quantidade                           |
| PATCH /cart/items/:nftId/:editionId  | { quantity }                                       | Cart; substitui quantidade                             |
| DELETE /cart/items/:nftId/:editionId | Identificadores                                    | Cart                                                   |
| PUT /cart/coupon                     | { code }                                           | Cart                                                   |
| DELETE /cart/coupon                  | Sem corpo                                          | Cart                                                   |
| POST /cart/quote                     | { network }                                        | Quote validada e persistida                            |
| POST /orders                         | CreateOrderRequest; Token; Idempotency-Key UUID v4 | 201 Order ou 200 na recuperacao                        |
| GET /orders                          | Token                                              | { items: Order[] } do usuario                          |
| GET /orders/:id                      | Token                                              | Order com snapshot do recibo                           |
| GET /profile                         | Token                                              | User                                                   |
| PATCH /profile                       | ProfileUpdate                                      | User                                                   |
| PUT /profile/password                | PasswordUpdate                                     | 204                                                    |
| GET /wallets                         | Token                                              | { items: Wallet[] } do usuario                         |
| POST /wallets                        | WalletInput                                        | 201 Wallet                                             |
| PATCH /wallets/:id                   | WalletInput completo                               | Wallet                                                 |
| POST /wallets/:id/connection         | { action: connect, disconnect ou refuse }          | Wallet                                                 |

Catalogo: `q`, `categories` e `networks` (repetidos ou separados por virgula), `minPrice`,
`maxPrice`, `available=true`, `sort=recent|price-asc|price-desc|title`, `page`
(base 1), `pageSize` (1 a 100, padrao 6). Categorias combinam por AND;
redes combinam por OR (ethereum, polygon, solana). Rede desconhecida retorna 422.
Ordenacao tem desempate estavel por ID. Filtros e busca combinam por AND.
Sem resultado: `items=[]`, `total=0`, `totalPages=0`.

`NFT.network` e metadado do catalogo (`NftNetwork`), nao rede de pagamento.
`NFT.details` e opcional para compatibilidade com respostas legadas. Contem
`collectionName`, `paragraphs: string[]` e `metadata: { label, value }[]`
com rede, contrato e direitos autorais. Estes dados pertencem as fixtures,
nao sao textos de negocio inventados pela tela. A migracao preserva precos,
estoque, versoes, carrinhos e snapshots dos pedidos existentes.
`facets.categories` e `facets.networks` contam os NFTs do catalogo completo,
independentemente dos filtros e da pagina. O cenario empty retorna contadores zero.
As nove colecoes do layout sao original, photography, music, art3d, collectibles,
generative, games, memberships e utility; rare, legendary e new continuam disponiveis.
Dados persistidos anteriores recebem os metadados sem reset de contas ou recibos.

O slider usa coordenadas inteiras de 0 a 1600 (centesimos), convertidas por bigint
para strings ETH ao aplicar. Valores exatos de ate 18 casas podem ser digitados;
abrir o slider ou recarregar nao arredonda esses valores. Apenas Aplicar altera
os limites na URL. Carteiras e cotacoes continuam em Ethereum/Polygon conforme
o contrato de pagamentos; Solana no filtro nao simula uma nova integracao de carteira.

As quantidades sao inteiros positivos e limitados por edicao e estoque livre,
considerando reservas dos pedidos pendentes. Cada usuario pode ter uma
carteira principal e uma secundaria; enderecos EVM tem 40 digitos hexadecimais.
Uma carteira deve estar conectada na rede da cotacao para criar o pedido.
O checkout solicita essa autorizacao automaticamente via REST ao revisar,
sem botoes adicionais de conectar/recusar/desconectar na interface. O endpoint
continua suportando os tres estados e o cenario deterministico `wallet-refused`.

`Wallet.provider` e `WalletInput.provider` aceitam `metamask`, `walletconnect`
ou `coinbase`. O campo e opcional para clientes/dados legados; os cadastros novos
recebem MetaMask como padrao no MSW. O tipo pode ser editado e persiste no
cadastro. Selecao no pagamento usa o ID, endereco, rede e tipo da carteira
cadastrada; nao cria carteiras ficticias a partir dos logos do Figma.

`Collector.profileName` opcional no REST aceita entre 2 e 80 caracteres.
`Collector.referralCode` opcional aceita ate 30 letras, numeros, hifen ou
underscore. Ambos sao validados pelo MSW e persistem no snapshot do pedido;
o codigo de indicacao nao aplica desconto. Cupom continua sendo validado pela
API do carrinho. A tela exige nome do perfil e nome de usuario, mas permite
compras sem indicacao ou ENS; os clientes REST legados continuam compativeis.

Campos complementares do layout: `User` e `ProfileUpdate` incluem `username`
e `ens` opcionais. `Registration` aceita `username`; quando preenchido, sao
3 a 30 letras/numeros/underscore. ENS opcional termina em `.eth`.
`Collector` guarda name, email, username/ens opcionais e notes (ate 500
caracteres) no snapshot. O endereco/rede no pagamento vem de `Wallet`, nao de
uma segunda carteira inventada no formulario. Avatar aceita URL HTTP ou data URL
PNG/JPEG/WebP; a UI limita upload a 2 MB. Senha tem no minimo 8 caracteres,
uma letra e um numero. Nao existe OAuth real ou recuperacao de senha nesse contrato.

Autenticacao social e exclusivamente simulada. GET retorna `{ provider,
simulated: true, accounts: [{ id, name, email }] }`, com as identidades fixas
de Ana e Bruno, sem dados editados do perfil privado nem hashes de senha.
POST recebe `{ accountId }`; IDs sao subjects distintos por provedor, vinculados
no mock a um userId estavel. Provedor desconhecido ou subject de outro provedor
retorna 422 (`INVALID_SOCIAL_PROVIDER`/`INVALID_SOCIAL_ACCOUNT`); email/token
externo arbitrario nao autentica. Alterar email do perfil nao quebra o vinculo.
Sessao, expiracao, merge do visitante, revogacao do token anterior, sockets e
reset usam as mesmas regras do login por senha. Cenarios offline/HTTP/latencia
tambem se aplicam. Em producao estes endpoints nao substituem validacao OAuth
no servidor; nunca se deve confiar em accountId enviado pelo cliente para
autenticar contas reais.

## Dinheiro, cotacao e idempotencia

Todos os valores ETH sao strings decimais nao negativas, com ate 18 casas.
Nunca ha transporte de ETH em number. Calculos convertem para wei com bigint.
Desconto usa basis points inteiros, truncado para baixo em wei. Taxas:
Ethereum `0.03`, Polygon `0.001`. Quote referencia cartVersion, versoes dos NFTs,
cupom, rede, itens e totais; expira em cinco minutos.

POST /orders revalida a cotacao integralmente. Preco/versao, disponibilidade,
cupom, carrinho ou taxa alterados impedem a tentativa. O cliente deve pedir
outra cotacao e obter nova confirmacao do usuario. A mesma chave por usuario e
mesmo corpo JSON canonico recupera o pedido, inclusive apos timeout ou confirmacao.
Todos os campos participam do fingerprint; a ordem das propriedades nao interfere.
Mesma chave com corpo diferente retorna 409 IDEMPOTENCY_CONFLICT.

Pedidos pending reservam estoque; confirmed/refused sao terminais. Recusa
libera reserva e preserva carrinho. Confirmacao desconta apenas as quantidades
compradas e preserva outros itens; o snapshot do pedido nao e recalculado.
TransactionId e explorerUrl sao simulados, gerados apenas para confirmed.

## Erros

```json
{
  "error": {
    "code": "VALIDATION",
    "message": "Email invalido",
    "fields": { "email": "Informe um email valido" }
  }
}
```

`fields` e `details` sao opcionais. Codigos HTTP: 400 JSON invalido; 401 sessao
ou credenciais invalidas; 403 permissao; 404 recurso ausente ou pertencente a
outro usuario; 409 conflito (email, carteira, disponibilidade, cotacao ou
idempotencia); 410 cupom expirado; 422 validacao; 503 falha transitoria;
504 resposta perdida apos criacao do pedido. SCENARIO_RESET (409) descarta
requisicoes iniciadas antes do reset. Offline provoca erro de rede,
sem resposta HTTP. Pagamento recusado e estado do pedido, nao sucesso de compra.

## Socket.IO

Transporte WebSocket, namespace padrao `/`, Engine.IO v4, path `/socket.io/`.
`socket.io-client` usa o WebSocket exportado por engine.io-client para garantir
interceptacao pelo MSW tanto no browser quanto nos testes Node.
O binding `@mswjs/socket.io-binding` codifica/decodifica os eventos. Nenhum
evento de negocio e entregue por callback direto ou escrita no cache.

Ao conectar, o cliente autenticado envia `session.subscribe` com `{ token }`.
`nft.updated` e publico. `order.updated` e enviado somente para subscriptions
com token ativo do dono do pedido. Logout/troca/expiracao encerram a conexao.

Ambos os eventos: `eventId`, `resourceId`, `version`, `occurredAt` e `data`
(snapshot completo de NFT ou Order). `order.updated` acrescenta `userId` e
`sessionToken` para o consumidor rejeitar mensagens da sessao anterior.
A regra implementada no consumidor e aceitar somente versao maior que a atual,
ignorando eventId repetido e verificando identidade de sessao nos dados privados.

Alteracoes de preco/disponibilidade, reservas e liquidacao emitem nft.updated;
criacao e liquidacao emitem order.updated. Controles MSW permitem reenviar
duplicatas e versoes antigas sem regredir o banco REST.
