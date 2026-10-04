import { expect, test } from "@playwright/test";
import { add, boot, checkout, control, login } from "./helpers";

test.beforeEach(async ({ page }) => boot(page));

test("descricoes completas e metadados do produto sem overflow", async ({
  page,
}) => {
  await page.goto("/nfts/001");
  const details = page.getByRole("tabpanel", { name: "Detalhes do NFT" });
  await expect(details.locator(".nft-details-copy > p")).toHaveCount(2);
  await expect(details).toContainText("Mutt #831 é uma obra digital 1/50");
  await expect(details).toContainText("Nova Sato recebe 5%");
  await expect(details.locator(".nft-contract-details dt")).toHaveText([
    "Rede:",
    "Contrato:",
    "Direitos autorais:",
  ]);
  await expect(details).toContainText("ERC-721 verificado");
  await expect(page.locator(".detail-meta")).toContainText(
    "Coleção: Kurio Apes",
  );
  await page.reload();
  await expect(details).toContainText("metadados armazenados no IPFS");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("revisao autoriza a carteira sem controles de conexao e recupera recusa", async ({
  page,
}) => {
  await login(page);
  await add(page);
  await page.goto("/wallets");
  await expect(
    page.getByRole("button", { name: /conectar|desconectar|recusar conexao/i }),
  ).toHaveCount(0);
  await control(page, "/__mock/config", { scenario: "wallet-refused" });
  await page.goto("/checkout");
  await expect(
    page.getByRole("button", { name: /conectar|desconectar|recusar conexao/i }),
  ).toHaveCount(0);
  await page
    .getByRole("button", {
      name: "Confirmar compra e revisar pedido",
      exact: true,
    })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "A carteira não autorizou o pagamento",
  );
  await expect(
    page.getByRole("dialog", { name: "Revisar e confirmar compra" }),
  ).not.toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("kurio.attempt.user-ana")),
  ).toBeNull();
  await page.goto("/cart");
  await expect(page.locator(".cart-items li")).toHaveCount(1);
  await expect(
    page.getByRole("link", { name: "Finalizar compra", exact: true }),
  ).toBeVisible();
  await control(page, "/__mock/config", { scenario: "success" });
  await checkout(page);
  await expect(
    page.getByRole("button", { name: "Confirmar compra", exact: true }),
  ).toBeEnabled();
});
