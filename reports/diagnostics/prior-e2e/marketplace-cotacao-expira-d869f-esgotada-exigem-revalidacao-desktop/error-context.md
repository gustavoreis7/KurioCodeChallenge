# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: marketplace.spec.ts >> cotacao expirada e edicao esgotada exigem revalidacao
- Location: tests\e2e\marketplace.spec.ts:294:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('dialog').getByRole('alert')
Expected: visible
Error: strict mode violation: getByRole('dialog').getByRole('alert') resolved to 2 elements:
    1) <div role="alert" class="notice">…</div> aka getByText('Preco ou disponibilidade alterados. E necessario revalidar os valores.Revalidar')
    2) <div role="alert" class="notice error-notice">…</div> aka getByRole('alert').filter({ hasText: 'Quantidade indisponivel' })

Call log:
  - Expect "toBeVisible" getByRole('dialog').getByRole('alert') with timeout 30000ms
  - waiting for getByRole('dialog').getByRole('alert')

```

# Page snapshot

```yaml
- generic [active]:
  - status:
    - text: Preco ou disponibilidade alterados. Revalide o carrinho antes de comprar.
    - button "Dispensar aviso": ×
  - link [aria-hidden]:
    - /url: "#main-content"
    - text: Ir para o conteudo
  - generic [aria-hidden]:
    - banner:
      - link:
        - /url: /
        - text: KURIO
      - navigation:
        - link:
          - /url: /
          - text: Inicio
        - link:
          - /url: /#catalogo
          - text: Mercado
        - button: Criadores
        - button: Aprenda
      - generic:
        - button
        - button:
          - generic: "1"
        - button:
          - generic: Ana
    - main:
      - navigation:
        - link:
          - /url: /
          - text: Inicio
        - text: /
        - link:
          - /url: /cart
          - text: Carrinho
        - text: / Pagamento
      - heading [level=1]: Pagamento
      - generic:
        - generic:
          - heading [level=2]: Perfil do colecionador
          - generic:
            - generic:
              - generic:
                - generic:
                  - text: Nome de exibicao
                  - generic [aria-hidden]: "*"
                - textbox: Ana Silva
              - generic:
                - generic:
                  - text: E-mail
                  - generic [aria-hidden]: "*"
                - textbox: ana@example.test
            - generic:
              - generic:
                - generic: Nome de usuario
                - textbox
              - generic:
                - generic: Nome ENS
                - textbox:
                  - /placeholder: nome.eth
            - generic:
              - generic:
                - generic: Rede
                - combobox
              - generic:
                - generic: Carteira cadastrada
                - combobox
            - paragraph: "0x1111111111111111111111111111111111111111"
            - status: Carteira conectada
            - generic:
              - button: Desconectar
              - button: Recusar conexao
            - generic:
              - generic: Observacao do colecionador (opcional)
              - textbox
            - link:
              - /url: /wallets
              - text: Gerenciar carteiras
            - alert:
              - paragraph: Quantidade indisponivel
            - button [disabled]: Revisar compra
        - generic:
          - heading [level=2]: Seus NFTs
          - alert:
            - paragraph: Quantidade indisponivel
            - button: Tentar novamente
    - contentinfo:
      - generic:
        - generic:
          - heading [level=2]: Seguranca da carteira
          - paragraph: Procedencia e edicoes verificadas em cada colecao.
        - generic:
          - heading [level=2]: Criadores em destaque
          - paragraph: Arte digital com identidade e colecoes de tiragem limitada.
        - generic:
          - heading [level=2]: Alertas de lancamentos
          - paragraph: Novas colecoes, novas perspectivas.
        - generic:
          - heading [level=2]: Seu proximo colecionavel
          - link:
            - /url: /#catalogo
            - text: Explorar mercado
      - generic:
        - link:
          - /url: /
          - text: KURIO
        - generic: Feito para colecionadores, criadores e curiosos.
      - generic:
        - generic:
          - heading [level=2]: Meu perfil
          - link:
            - /url: /profile
            - text: Meu perfil
          - link:
            - /url: /wallets
            - text: Carteiras
          - link:
            - /url: /orders
            - text: Pedidos
        - generic:
          - heading [level=2]: Colecoes
          - link:
            - /url: /?categories=%5B%22original%22%5D
            - text: Arte digital
          - link:
            - /url: /?categories=%5B%22rare%22%5D
            - text: Raridades
          - link:
            - /url: /?categories=%5B%22new%22%5D
            - text: Novidades
        - generic:
          - heading [level=2]: Carteiras compativeis
          - paragraph: Ethereum · Polygon
          - paragraph: Transacoes simuladas
      - paragraph: © 2026 Kurio. Propriedade digital para todos.
  - dialog [ref=f4e2]:
    - heading "Revisar e confirmar compra" [level=2] [ref=f4e3]
    - paragraph [ref=f4e4]: Confira o colecionador, a carteira e os valores antes de confirmar.
    - button "Fechar" [ref=f4e5] [cursor=pointer]
    - paragraph [ref=f4e6]: Ana Silva · ana@example.test
    - paragraph [ref=f4e7]: Principal · ethereum
    - generic [ref=f4e8]:
      - generic [ref=f4e9]:
        - term [ref=f4e10]: Subtotal
        - definition [ref=f4e11]: 1.48 ETH
      - generic [ref=f4e12]:
        - term [ref=f4e13]: Desconto
        - definition [ref=f4e14]: − 0 ETH
      - generic [ref=f4e15]:
        - term [ref=f4e16]: Taxa de rede
        - definition [ref=f4e17]: 0.03 ETH
      - generic [ref=f4e18]:
        - term [ref=f4e19]: Total
        - definition [ref=f4e20]: 1.51 ETH
    - alert [ref=f4e21]:
      - text: Preco ou disponibilidade alterados. E necessario revalidar os valores.
      - button "Revalidar valores" [ref=f4e22] [cursor=pointer]
    - alert [ref=f4e23]:
      - paragraph [ref=f4e24]: Quantidade indisponivel
    - button "Confirmar compra" [disabled]
```

# Test source

```ts
  224 |   await expect(page).toHaveURL(/login.*checkout/);
  225 |   await control(page, "/__mock/config", { scenario: "success" });
  226 |   await page.getByLabel("E-mail", { exact: true }).fill("ana@example.test");
  227 |   await page.getByLabel("Senha", { exact: true }).fill("Demo1234!");
  228 |   await page
  229 |     .getByRole("dialog")
  230 |     .getByRole("button", { name: "Entrar", exact: true })
  231 |     .click();
  232 |   await expect(
  233 |     page.getByRole("heading", { name: "Pagamento", exact: true }),
  234 |   ).toBeVisible();
  235 |   await page.getByRole("button", { name: "Recuperar pedido" }).click();
  236 |   await expect(
  237 |     page.getByRole("heading", {
  238 |       name: "Seus NFTs agora estao na sua carteira",
  239 |     }),
  240 |   ).toBeVisible();
  241 | });
  242 | test("Socket.IO altera cotacao, ignora duplicata/antigo e exige nova revisao", async ({
  243 |   page,
  244 | }) => {
  245 |   await login(page);
  246 |   await add(page);
  247 |   await checkout(page);
  248 |   await control(page, "/__mock/nfts/001", {
  249 |     priceEth: "2.000000000000000001",
  250 |     duplicate: true,
  251 |     stale: true,
  252 |   });
  253 |   await expect(
  254 |     page.getByRole("dialog").getByRole("button", { name: "Confirmar compra" }),
  255 |   ).toBeDisabled();
  256 |   await expect(
  257 |     page.getByRole("button", { name: "Revalidar valores" }),
  258 |   ).toBeVisible();
  259 |   await page.getByRole("button", { name: "Revalidar valores" }).click();
  260 |   await expect(page.getByRole("dialog").locator(".quote-total dd")).toHaveText(
  261 |     "2.030000000000000001 ETH",
  262 |   );
  263 |   await page
  264 |     .getByRole("button", { name: "Confirmar compra", exact: true })
  265 |     .click();
  266 |   await expect(
  267 |     page.getByRole("heading", {
  268 |       name: "Seus NFTs agora estao na sua carteira",
  269 |     }),
  270 |   ).toBeVisible();
  271 | });
  272 | test("pedido pendente recuperado por REST apos interrupcao do socket", async ({
  273 |   page,
  274 | }) => {
  275 |   await login(page);
  276 |   await add(page);
  277 |   await checkout(page);
  278 |   await control(page, "/__mock/config", { scenario: "pending" });
  279 |   await page.getByRole("button", { name: "Confirmar compra" }).click();
  280 |   await expect(
  281 |     page.getByRole("heading", { name: "Pedido pendente" }),
  282 |   ).toBeVisible();
  283 |   const id = new URL(page.url()).pathname.split("/").pop()!;
  284 |   await control(page, "/__mock/disconnect");
  285 |   await control(page, `/__mock/orders/${id}/settle`, { status: "confirmed" });
  286 |   await page.reload();
  287 |   await expect(
  288 |     page.getByRole("heading", {
  289 |       name: "Seus NFTs agora estao na sua carteira",
  290 |     }),
  291 |   ).toBeVisible();
  292 | });
  293 | 
  294 | test("cotacao expirada e edicao esgotada exigem revalidacao", async ({
  295 |   page,
  296 | }) => {
  297 |   await login(page);
  298 |   await add(page);
  299 |   const editionId = await page
  300 |     .getByLabel("Edicao", { exact: true })
  301 |     .inputValue();
  302 |   await checkout(page);
  303 |   await page.clock.install();
  304 |   await page.clock.setSystemTime(
  305 |     new Date(await page.evaluate(() => Date.now() + 6 * 60 * 1000)),
  306 |   );
  307 |   const confirm = page.getByRole("button", {
  308 |     name: "Confirmar compra",
  309 |     exact: true,
  310 |   });
  311 |   await expect(confirm).toBeDisabled();
  312 |   const now = await page.evaluate(() => new Date().toISOString());
  313 |   await control(page, "/__mock/config", { now });
  314 |   await page.getByRole("button", { name: "Revalidar valores" }).click();
  315 |   await expect(confirm).toBeEnabled();
  316 |   await control(page, "/__mock/nfts/001", {
  317 |     editionId,
  318 |     available: 0,
  319 |     duplicate: true,
  320 |     stale: true,
  321 |   });
  322 |   await expect(confirm).toBeDisabled();
  323 |   await page.getByRole("button", { name: "Revalidar valores" }).click();
> 324 |   await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();
      |                                                             ^ Error: expect(locator).toBeVisible() failed
  325 |   await expect(confirm).toBeDisabled();
  326 |   await page.keyboard.press("Escape");
  327 |   await page.goto("/cart");
  328 |   await expect(page.locator(".cart-items li")).toHaveCount(1);
  329 |   await expect(
  330 |     page.getByText("Disponibilidade alterada", { exact: true }),
  331 |   ).toBeVisible();
  332 | });
  333 | test("perfil, avatar, senha e cadastro de carteira secundaria", async ({
  334 |   page,
  335 | }) => {
  336 |   await login(page);
  337 |   await page.goto("/profile");
  338 |   await page.getByLabel("Nome de exibicao").fill("Ana Colecionadora");
  339 |   await page
  340 |     .locator("#avatar-upload")
  341 |     .setInputFiles("src/assets/nft-beanie.jpg");
  342 |   await page.getByRole("button", { name: "Salvar perfil" }).click();
  343 |   await expect(page.getByRole("status")).toContainText("Perfil atualizado");
  344 |   await page.reload();
  345 |   await expect(page.getByLabel("Nome de exibicao")).toHaveValue(
  346 |     "Ana Colecionadora",
  347 |   );
  348 |   await expect(page.getByAltText("Avatar do colecionador")).toBeVisible();
  349 |   await page.getByLabel("Senha atual", { exact: true }).fill("Incorreta123");
  350 |   await page.getByLabel("Nova senha", { exact: true }).fill("NovaSenha123");
  351 |   await page.getByLabel("Confirmar nova senha").fill("NovaSenha123");
  352 |   await page.getByRole("button", { name: "Salvar senha" }).click();
  353 |   await expect(page.getByRole("alert")).toContainText("Senha atual incorreta");
  354 |   await page.getByLabel("Senha atual", { exact: true }).fill("Demo1234!");
  355 |   await page.getByRole("button", { name: "Salvar senha" }).click();
  356 |   await expect(page.getByLabel("Nova senha", { exact: true })).toHaveValue("");
  357 |   await page.goto("/wallets");
  358 |   await page
  359 |     .getByRole("button", { name: "Adicionar carteira secundaria" })
  360 |     .click();
  361 |   await page.locator("#new-name").fill("Minha Polygon");
  362 |   await page.locator("#new-network").selectOption("polygon");
  363 |   await page
  364 |     .locator("#new-address")
  365 |     .fill("0x3333333333333333333333333333333333333333");
  366 |   await page
  367 |     .locator(".wallet-form")
  368 |     .last()
  369 |     .getByRole("button", { name: "Salvar carteira" })
  370 |     .click();
  371 |   await expect(page.locator(".wallet-form")).toHaveCount(2);
  372 |   await page.reload();
  373 |   await expect(page.locator("#new-name")).not.toBeVisible();
  374 |   await expect(page.locator("input[value='Minha Polygon']")).toBeVisible();
  375 | });
  376 | test("shimmer, falha de rede, recuperacao e ausencia de overflow", async ({
  377 |   page,
  378 | }) => {
  379 |   await control(page, "/__mock/config", { scenario: "slow" });
  380 |   await page.goto("/nfts/002");
  381 |   await expect(page.locator(".shimmer").first()).toBeVisible();
  382 |   await expect(page.getByRole("heading", { name: "Mutt #832" })).toBeVisible();
  383 |   await control(page, "/__mock/config", {
  384 |     scenario: "http-500",
  385 |     latencyMs: 20,
  386 |   });
  387 |   await page.goto("/nfts/003");
  388 |   await expect(page.getByRole("alert")).toBeVisible();
  389 |   await control(page, "/__mock/config", { scenario: "success" });
  390 |   await page.getByRole("button", { name: "Tentar novamente" }).click();
  391 |   await expect(page.getByRole("heading", { name: "Mutt #833" })).toBeVisible();
  392 |   expect(
  393 |     await page.evaluate(
  394 |       () => document.documentElement.scrollWidth <= window.innerWidth,
  395 |     ),
  396 |   ).toBe(true);
  397 | });
  398 | test("regressao visual: inicio, detalhe, carrinho e pagamento", async ({
  399 |   page,
  400 | }) => {
  401 |   await expect(page).toHaveScreenshot("inicio.png", { fullPage: true });
  402 |   await page.goto("/nfts/001");
  403 |   await expect(page.getByRole("heading", { name: "Mutt #831" })).toBeVisible();
  404 |   await expect(page).toHaveScreenshot("detalhe.png", { fullPage: true });
  405 |   await add(page);
  406 |   await page.goto("/cart");
  407 |   await expect(page.locator(".quote-total")).toBeVisible();
  408 |   await expect(page).toHaveScreenshot("carrinho.png", { fullPage: true });
  409 |   await login(page);
  410 |   await page.goto("/checkout");
  411 |   await expect(page.locator(".quote-total")).toBeVisible();
  412 |   await expect(page).toHaveScreenshot("pagamento.png", { fullPage: true });
  413 | });
  414 | 
```