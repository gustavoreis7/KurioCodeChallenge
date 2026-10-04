import { expect, type Page } from "@playwright/test";

export async function control<T = unknown>(
  page: Page,
  path: string,
  data: unknown = {},
): Promise<T> {
  await page.waitForFunction(() => !!window.kurioMocks);
  return page.evaluate(
    async ({ path, data }) => {
      if (!window.kurioMocks) throw new Error("MSW nao inicializado");
      return window.kurioMocks.post<T>(path, data);
    },
    { path, data },
  );
}
export async function boot(page: Page) {
  await page.goto("/");
  await page.waitForFunction(
    () =>
      document.documentElement.dataset.hydrated === "true" &&
      navigator.serviceWorker.controller,
  );
  await expect(page.locator(".nft-card img")).toHaveCount(9);
  await control(page, "/__mock/reset");
  await page.evaluate(() => localStorage.removeItem("kurio.session.token"));
  await control(page, "/__mock/config", { latencyMs: 20, paymentDelayMs: 200 });
  await page.reload();
  await page.waitForFunction(
    () =>
      document.documentElement.dataset.hydrated === "true" &&
      navigator.serviceWorker.controller,
  );
  await expect(page.locator(".nft-card img")).toHaveCount(9);
}
export async function login(
  page: Page,
  email = "ana@example.test",
  password = "Demo1234!",
) {
  await page.goto("/login");
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("E-mail", { exact: true }).fill(email);
  await dialog.getByLabel("Senha", { exact: true }).fill(password);
  await dialog.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(dialog).not.toBeVisible();
}
export async function add(page: Page) {
  await page.goto("/nfts/001");
  await page
    .getByRole("button", { name: "Adicionar ao carrinho", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Fechar carrinho" }).click();
}
export async function checkout(page: Page) {
  await page.goto("/checkout");
  await page
    .getByRole("button", {
      name: "Confirmar compra e revisar pedido",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("dialog", { name: "Revisar e confirmar compra" }),
  ).toBeVisible();
}
