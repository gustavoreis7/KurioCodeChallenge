import { expect, test } from "@playwright/test";
import { add, boot, checkout, control, login } from "./helpers";

test.beforeEach(async ({ page }) => {
  await boot(page);
});
test("URL, filtros combinados, ordenacao, paginacao e historico", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Proxima pagina" }).click();
  await expect(page).toHaveURL(/page=2/);
  await page.reload();
  await expect(page).toHaveURL(/page=2/);
  if (test.info().project.name === "mobile")
    await page.getByRole("button", { name: "Filtros", exact: true }).click();
  await page.getByLabel("Arte digital", { exact: true }).check();
  await expect(page).toHaveURL(/original/);
  await page.getByLabel("Fotografia", { exact: true }).check();
  await expect(page).toHaveURL(/photography/);
  await page
    .getByRole("combobox", { name: "Ordenar", exact: true })
    .selectOption("price-asc");
  await expect(page).toHaveURL(/price-asc/);
  await expect(page).toHaveURL(/photography/);
  await expect(
    page.getByText("Pagina 1 de", { exact: false }),
  ).not.toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole("combobox", { name: "Ordenar", exact: true }),
  ).toHaveValue("recent");
  await expect(page).not.toHaveURL(/sort=price-asc/);
  if (test.info().project.name === "desktop")
    await page
      .getByRole("button", { name: "Buscar NFTs", exact: true })
      .click();
  await page
    .getByRole("searchbox", { name: "Buscar NFTs" })
    .fill("inexistente");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Nenhum NFT encontrado" }),
  ).toBeVisible();
  await page.goto("/nfts/001");
  const detailsTab = page.getByRole("tab", { name: "Detalhes do NFT" });
  await detailsTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Historico" })).toBeFocused();
  await expect(page.getByRole("tab", { name: "Historico" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.goto("/nfts/nao-existe");
  await expect(
    page.getByRole("heading", { name: /NFT nao encontrado/ }),
  ).toBeVisible();
});
test("login visivel, foco de modal, cadastro, conflito e logout", async ({
  page,
}) => {
  const cartTrigger = page.getByRole("button", { name: /Abrir carrinho/ });
  await cartTrigger.click();
  await expect(
    page.getByRole("button", { name: "Fechar carrinho" }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("link", { name: "Ver carrinho completo" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(cartTrigger).toBeFocused();
  await page.getByRole("link", { name: "Entrar", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByLabel("E-mail", { exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.goto("/register");
  await page.getByLabel("Nome de exibicao").fill("Novo Colecionador");
  await page.getByLabel("Nome de usuario").fill("novo_colecionador");
  await page.getByLabel("E-mail", { exact: true }).fill("ana@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("Demo1234!");
  await page.getByLabel("Confirmar senha").fill("Demo1234!");
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Email ja cadastrado");
  await page.getByLabel("E-mail", { exact: true }).fill("novo@example.test");
  await page.getByRole("button", { name: "Criar conta", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Novo", exact: true }).click();
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Entrar", exact: true }),
  ).toBeVisible();
});
test("favorito otimista, rollback, persistencia e isolamento", async ({
  page,
}) => {
  await login(page);
  await page.goto("/nfts/001");
  const favorite = page.getByRole("button", {
    name: "Favoritar NFT",
    exact: true,
  });
  await expect(favorite).toBeEnabled();
  await control(page, "/__mock/config", {
    scenario: "http-500",
    latencyMs: 300,
  });
  // Observe actual DOM transitions: polling can miss the brief optimistic state.
  const optimisticRollback = favorite.evaluate(
    (button) =>
      new Promise<boolean>((resolve) => {
        let optimistic = false;
        const observer = new MutationObserver((records) => {
          optimistic ||=
            button.getAttribute("aria-pressed") === "true" ||
            records.some((record) => record.oldValue === "true");
          if (optimistic && button.getAttribute("aria-pressed") === "false") {
            clearTimeout(timer);
            observer.disconnect();
            resolve(true);
          }
        });
        const timer = setTimeout(() => {
          observer.disconnect();
          resolve(false);
        }, 10000);
        observer.observe(button, {
          attributes: true,
          attributeFilter: ["aria-pressed"],
          attributeOldValue: true,
        });
      }),
  );
  await favorite.click();
  expect(await optimisticRollback).toBe(true);
  await expect(favorite).toHaveAttribute("aria-pressed", "false");
  await control(page, "/__mock/config", { scenario: "success", latencyMs: 20 });
  await favorite.click();
  await expect(favorite).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(favorite).toHaveAttribute("aria-pressed", "true");
  if (test.info().project.name === "mobile") await page.goto("/");
  await page.getByRole("button", { name: "Ana", exact: true }).click();
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await login(page, "bruno@example.test");
  await page.goto("/nfts/001");
  await expect(favorite).toHaveAttribute("aria-pressed", "false");
});
test("carrinho visitante, quantidades, cupom, refresh e merge no login", async ({
  page,
}) => {
  await add(page);
  await page.goto("/cart");
  await page
    .getByRole("button", { name: /Aumentar quantidade de Mutt/ })
    .click();
  await expect(page.getByRole("status", { name: /Quantidade/ })).toHaveText(
    "2",
  );
  await page.getByLabel("Codigo promocional").fill("EXPIRED");
  await page.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(/expirad/i);
  await page.getByLabel("Codigo promocional").fill("MUTT10");
  await page.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Remover cupom" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole("status", { name: /Quantidade/ })).toHaveText(
    "2",
  );
  await page.getByRole("link", { name: "Finalizar compra" }).click();
  await expect(page).toHaveURL(/login.*checkout/);
  await page.getByLabel("E-mail", { exact: true }).fill("ana@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("Demo1234!");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Entrar", exact: true })
    .click();
  await expect(page).toHaveURL(/checkout/);
  await page.goto("/cart");
  await expect(page.getByRole("status", { name: /Quantidade/ })).toHaveText(
    "2",
  );
  await page
    .getByRole("button", { name: /Remover Mutt .* do carrinho/ })
    .click();
  await expect(
    page.getByRole("heading", { name: "Seu carrinho esta vazio" }),
  ).toBeVisible();
});
test("compra completa, cliques repetidos, recibo imutavel e carrinho limpo", async ({
  page,
}) => {
  await login(page);
  await add(page);
  await checkout(page);
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .dblclick();
  const confirmed = page.getByRole("heading", {
    name: "Seus NFTs agora estao na sua carteira",
  });
  const recover = page
    .getByRole("button", {
      name: "Recuperar pedido",
      exact: true,
    })
    .and(page.locator("button:enabled"));
  await expect(confirmed.or(recover)).toBeVisible();
  if (await recover.isVisible()) await recover.click();
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estao na sua carteira",
    }),
  ).toBeVisible();
  const total = await page.locator(".quote-total dd").innerText();
  await control(page, "/__mock/nfts/001", {
    priceEth: "9.000000000000000001",
    duplicate: true,
    stale: true,
  });
  await expect(page.locator(".quote-total dd")).toHaveText(total);
  await page.reload();
  await expect(page.locator(".quote-total dd")).toHaveText(total);
  await page.goto("/orders");
  await expect(page.locator(".orders-list li")).toHaveCount(1);
  await page.goto("/cart");
  await expect(
    page.getByRole("heading", { name: "Seu carrinho esta vazio" }),
  ).toBeVisible();
});
test("timeout recupera o mesmo pedido apos refresh", async ({ page }) => {
  await login(page);
  await add(page);
  await checkout(page);
  await control(page, "/__mock/config", {
    scenario: "timeout-after-create",
    timeoutMs: 1500,
    paymentDelayMs: 2000,
  });
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Recuperar pedido" }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Recuperar pedido" }).click();
  await expect(page).toHaveURL(/orders\//);
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estao na sua carteira",
    }),
  ).toBeVisible();
  await page.goto("/orders");
  await expect(page.locator(".orders-list li")).toHaveCount(1);
});
test("pagamento recusado preserva itens e sessao expirada retorna ao contexto", async ({
  page,
}) => {
  await login(page);
  await add(page);
  await checkout(page);
  await control(page, "/__mock/config", { scenario: "payment-refused" });
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Pagamento recusado" }),
  ).toBeVisible();
  await page.goto("/cart");
  await expect(page.locator(".cart-items li")).toHaveCount(1);
  await page.goto("/checkout");
  await page
    .getByRole("button", {
      name: "Confirmar compra e revisar pedido",
      exact: true,
    })
    .click();
  await control(page, "/__mock/config", { scenario: "session-expired" });
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(page).toHaveURL(/login.*checkout/);
  await control(page, "/__mock/config", { scenario: "success" });
  await page.getByLabel("E-mail", { exact: true }).fill("ana@example.test");
  await page.getByLabel("Senha", { exact: true }).fill("Demo1234!");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Entrar", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Pagamento", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Recuperar pedido" }).click();
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estao na sua carteira",
    }),
  ).toBeVisible();
});
test("Socket.IO altera cotacao, ignora duplicata/antigo e exige nova revisao", async ({
  page,
}) => {
  await login(page);
  await add(page);
  await checkout(page);
  await control(page, "/__mock/nfts/001", {
    priceEth: "2.000000000000000001",
    duplicate: true,
    stale: true,
  });
  await expect(
    page.getByRole("dialog").getByRole("button", { name: "Confirmar compra" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Revalidar valores" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Revalidar valores" }).click();
  await expect(page.getByRole("dialog").locator(".quote-total dd")).toHaveText(
    "2.030000000000000001 ETH",
  );
  await page
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estao na sua carteira",
    }),
  ).toBeVisible();
});
test("pedido pendente recuperado por REST apos interrupcao do socket", async ({
  page,
}) => {
  await login(page);
  await add(page);
  await checkout(page);
  await control(page, "/__mock/config", { scenario: "pending" });
  await page.getByRole("button", { name: "Confirmar compra" }).click();
  await expect(
    page.getByRole("heading", { name: "Pedido pendente" }),
  ).toBeVisible();
  const id = new URL(page.url()).pathname.split("/").pop()!;
  await control(page, "/__mock/disconnect");
  await control(page, `/__mock/orders/${id}/settle`, { status: "confirmed" });
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estao na sua carteira",
    }),
  ).toBeVisible();
});

test("cotacao expirada e edicao esgotada exigem revalidacao", async ({
  page,
}) => {
  await login(page);
  await add(page);
  const editionId = await page
    .getByLabel("Edicao", { exact: true })
    .inputValue();
  await checkout(page);
  await page.clock.install();
  await page.clock.setSystemTime(
    new Date(await page.evaluate(() => Date.now() + 6 * 60 * 1000)),
  );
  const confirm = page.getByRole("button", {
    name: "Confirmar compra",
    exact: true,
  });
  await expect(confirm).toBeDisabled();
  const now = await page.evaluate(() => new Date().toISOString());
  await control(page, "/__mock/config", { now });
  await page.getByRole("button", { name: "Revalidar valores" }).click();
  await expect(confirm).toBeEnabled();
  await control(page, "/__mock/nfts/001", {
    editionId,
    available: 0,
    duplicate: true,
    stale: true,
  });
  await expect(confirm).toBeDisabled();
  await page.getByRole("button", { name: "Revalidar valores" }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("alert")
      .filter({ hasText: "Quantidade indisponivel" }),
  ).toBeVisible();
  await expect(confirm).toBeDisabled();
  await page.keyboard.press("Escape");
  await page.goto("/cart");
  await expect(page.locator(".cart-items li")).toHaveCount(1);
  await expect(
    page.getByText("Disponibilidade alterada", { exact: true }),
  ).toBeVisible();
});
test("perfil, avatar, senha e cadastro de carteira secundaria", async ({
  page,
}) => {
  await login(page);
  await page.goto("/profile");
  await page.getByLabel("Nome de exibicao").fill("Ana Colecionadora");
  await page
    .locator("#avatar-upload")
    .setInputFiles("src/assets/nft-beanie.jpg");
  await page.getByRole("button", { name: "Salvar perfil" }).click();
  await expect(page.getByRole("status")).toContainText("Perfil atualizado");
  await page.reload();
  await expect(page.getByLabel("Nome de exibicao")).toHaveValue(
    "Ana Colecionadora",
  );
  await expect(page.getByAltText("Avatar do colecionador")).toBeVisible();
  await page.getByLabel("Senha atual", { exact: true }).fill("Incorreta123");
  await page.getByLabel("Nova senha", { exact: true }).fill("NovaSenha123");
  await page.getByLabel("Confirmar nova senha").fill("NovaSenha123");
  await page.getByRole("button", { name: "Salvar senha" }).click();
  await expect(page.getByRole("alert")).toContainText("Senha atual incorreta");
  await page.getByLabel("Senha atual", { exact: true }).fill("Demo1234!");
  await page.getByRole("button", { name: "Salvar senha" }).click();
  await expect(page.getByLabel("Nova senha", { exact: true })).toHaveValue("");
  await page.goto("/wallets");
  await page
    .getByRole("button", { name: "Adicionar carteira secundaria" })
    .click();
  await page.locator("#new-name").fill("Minha Polygon");
  await page.locator("#new-network").selectOption("polygon");
  await page
    .locator("#new-address")
    .fill("0x3333333333333333333333333333333333333333");
  await page
    .locator(".wallet-form")
    .last()
    .getByRole("button", { name: "Salvar carteira" })
    .click();
  await expect(page.locator(".wallet-form")).toHaveCount(2);
  await page.reload();
  await expect(page.locator("#new-name")).not.toBeVisible();
  await expect(page.locator("input[value='Minha Polygon']")).toBeVisible();
});
test("shimmer, falha de rede, recuperacao e ausencia de overflow", async ({
  page,
}) => {
  await control(page, "/__mock/config", { scenario: "slow" });
  await page.goto("/nfts/002");
  await expect(page.locator(".detail-image.shimmer")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mutt #832" })).toBeVisible();
  await control(page, "/__mock/config", {
    scenario: "http-500",
    latencyMs: 20,
  });
  await page.goto("/nfts/003");
  await expect(page.getByRole("alert")).toBeVisible();
  await control(page, "/__mock/config", { scenario: "success" });
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(page.getByRole("heading", { name: "Mutt #833" })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("regressao visual: inicio, detalhe, carrinho e pagamento", async ({
  page,
}) => {
  await expect(page).toHaveScreenshot("inicio.png", { fullPage: true });
  await page.goto("/nfts/001");
  await expect(page.getByRole("heading", { name: "Mutt #831" })).toBeVisible();
  await expect(page).toHaveScreenshot("detalhe.png", { fullPage: true });
  await add(page);
  await page.goto("/cart");
  await expect(page.locator(".quote-total")).toBeVisible();
  await expect(page).toHaveScreenshot("carrinho.png", { fullPage: true });
  await login(page);
  await page.goto("/checkout");
  await expect(page.locator(".quote-total")).toBeVisible();
  await expect(page).toHaveScreenshot("pagamento.png", { fullPage: true });
});
