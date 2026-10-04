import { expect, test } from "@playwright/test";
import { add, boot, checkout, login } from "./helpers";

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Frames mobile do Figma");
  await boot(page);
});

test("frames mobile: busca, destaques, grade e autenticacao em tela cheia", async ({
  page,
}) => {
  await expect(
    page.getByRole("searchbox", { name: "Buscar NFTs" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Navegacao mobile" }),
  ).toBeVisible();
  const first = await page
    .locator(".catalog-results .nft-card")
    .nth(0)
    .boundingBox();
  const second = await page
    .locator(".catalog-results .nft-card")
    .nth(1)
    .boundingBox();
  expect(second!.x).toBeGreaterThan(first!.x + first!.width);
  expect(second!.y - first!.y).toBeCloseTo(28, 0);
  const hero = page.locator(".hero-artwork");
  const original = await hero.getAttribute("src");
  await page.getByRole("button", { name: "Mostrar destaque 2" }).click();
  await expect(hero).not.toHaveAttribute("src", original!);
  await page.getByRole("button", { name: "Em alta", exact: true }).click();
  await expect(page).toHaveURL(/trending/);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Em alta", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".catalog-results .nft-card")).toHaveCount(8);
  await page.getByRole("link", { name: "Entrar", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Entrar", exact: true });
  const bounds = await dialog.boundingBox();
  expect(bounds!.x).toBe(0);
  expect(bounds!.width).toBe(390);
  await expect(dialog.locator(".auth-brand")).toHaveText("KURIO");
  await expect(page.getByLabel("E-mail", { exact: true })).toBeFocused();
  await page
    .getByRole("link", { name: "Novo na Kurio? Crie uma conta" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Criar perfil de colecionador" }),
  ).toBeVisible();
});

test("frames mobile: imagem ampla, compra fixa, carrinho e carteira real", async ({
  page,
}) => {
  await login(page);
  await page.goto("/nfts/001");
  const image = page.locator(".detail-image");
  await expect(image).toBeVisible();
  const bounds = await image.boundingBox();
  expect(bounds!.width).toBe(338);
  await expect(page.locator(".mobile-editions")).toBeVisible();
  expect(
    await page
      .locator(".detail-purchase")
      .evaluate((node) => getComputedStyle(node).position),
  ).toBe("fixed");
  await add(page);
  await page.goto("/cart");
  await expect(page.locator(".cart-row")).toHaveCount(1);
  const row = page.locator(".cart-row");
  expect((await row.locator("img").boundingBox())!.width).toBe(100);
  const quantity = await row.locator(".quantity-control").boundingBox();
  const remove = await row.locator(".cart-remove").boundingBox();
  expect(remove!.y + remove!.height).toBeLessThanOrEqual(quantity!.y);
  const price = await row.locator(".cart-line-total").boundingBox();
  expect(price!.x + price!.width - 92).toBeLessThanOrEqual(quantity!.x);
  await expect(page.getByLabel("Codigo promocional")).toBeVisible();
  await checkout(page);
  const dialog = page.getByRole("dialog", {
    name: "Revisar e confirmar compra",
  });
  await dialog.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(page.locator(".mobile-wallet-option")).toHaveCount(1);
  await expect(page.locator(".mobile-wallet-option")).toContainText(
    "Principal",
  );
  const wallet = await page.locator(".mobile-wallet-option").boundingBox();
  expect(wallet!.x + wallet!.width).toBeLessThanOrEqual(370);
  expect(await page.evaluate(() => window.innerWidth)).toBe(390);
  const total = await page
    .locator(".checkout-summary .quote-total")
    .boundingBox();
  const review = await page.locator(".checkout-review").boundingBox();
  expect(total!.y + total!.height).toBeLessThan(review!.y);
  await page.getByRole("button", { name: /Seus NFTs/ }).click();
  await expect(page.locator("#checkout-items")).toBeVisible();
  await expect(
    page.locator(".checkout-summary .network-fee-note"),
  ).toBeVisible();
  expect(
    await page
      .locator(".checkout-review")
      .evaluate((node) => getComputedStyle(node).position),
  ).toBe("fixed");
  await page
    .getByRole("button", { name: "Perfil do colecionador", exact: true })
    .click();
  await expect(
    page.getByLabel("Nome de exibição", { exact: true }),
  ).toHaveValue("Ana Silva");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
