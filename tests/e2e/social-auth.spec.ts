import { expect, test } from "@playwright/test";
import { add, boot, control } from "./helpers";

test.beforeEach(async ({ page }) => {
  await boot(page);
});

for (const provider of ["Google", "Facebook"]) {
  test(`login social ${provider}: retorno ao checkout, merge do carrinho e sessao apos F5`, async ({
    page,
  }) => {
    await add(page);
    await page.goto("/checkout");
    await expect(page).toHaveURL(/login.*checkout/);
    const dialog = page.getByRole("dialog");
    await dialog
      .getByRole("button", { name: `Continuar com ${provider}`, exact: true })
      .click();
    await expect(
      dialog.getByRole("heading", { name: `Continuar com ${provider}` }),
    ).toBeFocused();
    await expect(dialog.getByText(/Autenticacao simulada/)).toBeVisible();
    await dialog
      .getByRole("button", { name: /Ana Silva.*ana@example.test/ })
      .click();
    await expect(page).toHaveURL(/\/checkout$/);
    await expect(dialog).not.toBeVisible();
    await page.goto("/cart");
    await expect(page.getByRole("status", { name: /Quantidade/ })).toHaveText(
      "1",
    );
    await page.goto("/profile");
    await expect(page.getByLabel("E-mail", { exact: true })).toHaveValue(
      "ana@example.test",
    );
    await page.reload();
    await expect(page.getByLabel("E-mail", { exact: true })).toHaveValue(
      "ana@example.test",
    );
    await page.screenshot({
      path: `reports/social-auth-${provider.toLowerCase()}-${test.info().project.name}-profile.png`,
      fullPage: true,
    });
  });
}

test("cadastro social e troca de conta nao reutilizam favoritos ou token anterior", async ({
  page,
}) => {
  await page.goto("/register?redirect=%2Fprofile");
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Continuar com Google" }).click();
  await dialog.getByRole("button", { name: /Ana Silva/ }).click();
  await expect(page).toHaveURL(/\/profile$/);
  const oldToken = await page.evaluate(() =>
    localStorage.getItem("kurio.session.token"),
  );
  expect(oldToken).toBeTruthy();
  await page.goto("/nfts/001");
  const favorite = page.getByRole("button", {
    name: "Favoritar NFT",
    exact: true,
  });
  await favorite.click();
  await expect(favorite).toHaveAttribute("aria-pressed", "true");
  await page.goto("/login?redirect=%2Fprofile");
  await dialog.getByRole("button", { name: "Continuar com Facebook" }).click();
  await dialog.getByRole("button", { name: /Bruno Costa/ }).click();
  await expect(page.getByLabel("E-mail", { exact: true })).toHaveValue(
    "bruno@example.test",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("kurio.session.token")),
  ).not.toBe(oldToken);
  await page.goto("/nfts/001");
  await expect(favorite).toHaveAttribute("aria-pressed", "false");
  await page.goto("/");
  await page.getByRole("button", { name: "Bruno", exact: true }).click();
  await page.getByRole("button", { name: "Sair", exact: true }).click();
  await page.goto("/profile");
  await expect(page).toHaveURL(/login.*profile/);
  expect(
    await page.evaluate(() => localStorage.getItem("kurio.session.token")),
  ).toBeNull();
});

test("seletor social: layout, falha recuperavel, foco e cancelamento de resposta atrasada", async ({
  page,
}) => {
  await page.goto("/login");
  const dialog = page.getByRole("dialog");
  const google = dialog.getByRole("button", {
    name: "Continuar com Google",
    exact: true,
  });
  await google.click();
  const ana = dialog.getByRole("button", { name: /Ana Silva/ });
  await expect(ana).toBeVisible();
  expect(
    await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
  await page.screenshot({
    path: `reports/social-account-picker-${test.info().project.name}.png`,
    fullPage: true,
  });
  await control(page, "/__mock/config", {
    scenario: "http-500",
    latencyMs: 100,
  });
  await ana.click();
  await expect(dialog.getByRole("alert")).toContainText(
    "Servico temporariamente indisponivel",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("kurio.session.token")),
  ).toBeNull();
  await control(page, "/__mock/config", {
    scenario: "success",
    latencyMs: 1500,
  });
  await ana.click();
  await expect(dialog.getByRole("status")).toContainText("Entrando...");
  await dialog.getByRole("button", { name: "Voltar", exact: true }).click();
  await expect(google).toBeFocused();
  // Wait for the real delayed REST request, without applying a fake session.
  await page.waitForTimeout(1800);
  await expect(page).toHaveURL((url) => url.pathname === "/login");
  expect(
    await page.evaluate(() => localStorage.getItem("kurio.session.token")),
  ).toBeNull();
  await control(page, "/__mock/config", { latencyMs: 20 });
  await dialog.getByRole("button", { name: "Continuar com Facebook" }).click();
  await dialog.getByRole("button", { name: /Bruno Costa/ }).click();
  await expect(dialog).not.toBeVisible();
});
