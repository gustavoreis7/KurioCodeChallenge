import { expect, test } from "@playwright/test";
import { add, boot, login } from "./helpers";

test.beforeEach(async ({ page }) => boot(page));

test("pagamento segue a composicao do frame e valida os campos antes da revisao", async ({
  page,
}, info) => {
  await login(page);
  await add(page);
  await page.goto("/checkout");
  await expect(page.locator(".checkout-summary .quote-total")).toBeVisible();
  if (info.project.name === "mobile") {
    await page
      .getByRole("button", { name: "Perfil do colecionador", exact: true })
      .click();
  } else {
    const collector = (await page
      .locator(".checkout-collector")
      .boundingBox())!;
    const summary = (await page.locator(".checkout-summary").boundingBox())!;
    const wallets = (await page.locator(".checkout-wallets").boundingBox())!;
    expect(collector.x + collector.width).toBeLessThan(summary.x);
    expect(Math.abs(collector.y - summary.y)).toBeLessThan(2);
    expect(wallets.y).toBeGreaterThanOrEqual(summary.y + summary.height);
    await expect(
      page.getByLabel("Endereço da carteira", { exact: true }),
    ).toHaveValue("0x1111111111111111111111111111111111111111");
    await expect(
      page.getByLabel("Endereço da carteira", { exact: true }),
    ).toHaveAttribute("readonly", "");
    await expect(page.locator(".checkout-coupon-link")).toHaveAttribute(
      "href",
      "/cart",
    );
  }
  await page.getByLabel("Nome do perfil", { exact: true }).fill("A");
  await page.locator(".checkout-review").click();
  await expect(
    page.getByRole("dialog", { name: "Revisar e confirmar compra" }),
  ).not.toBeVisible();
  await expect(
    page.getByLabel("Nome do perfil", { exact: true }),
  ).toBeFocused();
  await page.getByLabel("Nome do perfil", { exact: true }).fill("Galeria Ana");
  await page.getByLabel("Código de indicação", { exact: true }).fill("ANA2026");
  await page.locator(".checkout-review").click();
  await expect(
    page.getByRole("dialog", { name: "Revisar e confirmar compra" }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("Galeria Ana");
  await expect(page.getByRole("dialog")).toContainText("ANA2026");
  await expect(
    page.getByRole("button", { name: "Confirmar compra", exact: true }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("selecao de carteira e rede usa o cadastro persistido", async ({
  page,
}) => {
  await login(page);
  await page.goto("/wallets");
  await page
    .getByRole("button", { name: "Adicionar carteira secundaria" })
    .click();
  await page.locator("#new-name").fill("Secundaria Polygon");
  await page.locator("#new-network").selectOption("polygon");
  await page.locator("#new-provider").selectOption("coinbase");
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
  await expect(
    page.locator('.wallet-form select[name$="-provider"]').last(),
  ).toHaveValue("coinbase");
  await add(page);
  await page.goto("/checkout");
  await page
    .getByRole("radio", {
      name: "Coinbase Wallet · Secundaria Polygon · polygon",
      exact: true,
    })
    .check();
  await expect(page.locator("#checkout-network")).toHaveValue("polygon");
  await page.locator(".checkout-review").click();
  const dialog = page.getByRole("dialog", {
    name: "Revisar e confirmar compra",
  });
  await expect(dialog).toContainText("Secundaria Polygon · polygon");
  await expect(dialog).toContainText("0.001 ETH");
  await dialog
    .getByRole("button", { name: "Confirmar compra", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Seus NFTs agora estao na sua carteira",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "Compra confirmada" }),
  ).toBeVisible();
});
