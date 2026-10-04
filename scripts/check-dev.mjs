import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const url = process.env.DEV_URL ?? "http://127.0.0.1:5173";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const width of [1440, 768, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
    });
    const page = await context.newPage();
    page.setDefaultTimeout(120_000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error")
        console.error(message.text().split("\n")[0]);
    });
    const response = await page.goto(url);
    assert.equal(response?.status(), 200);
    await page.getByRole("heading", { level: 1 }).waitFor();
    await page.waitForFunction(
      () => navigator.serviceWorker.controller !== null,
    );
    await page.waitForFunction(
      () => document.documentElement.dataset.hydrated === "true",
    );
    const catalog = await page.evaluate(async () => {
      const response = await fetch("/api/nfts?pageSize=2");
      return { status: response.status, body: await response.json() };
    });
    assert.equal(catalog.status, 200);
    assert.equal(catalog.body.items.length, 2);
    await page.waitForFunction(() =>
      Array.from(document.images).some(
        (image) => image.complete && image.naturalWidth > 0,
      ),
    );
    await page.locator(".nft-card").first().waitFor();
    await page.screenshot({ path: `test-results/dev-${width}.png` });
    const cartButton = page.getByRole("button", { name: /Abrir carrinho/ });
    // A click verifies that React has hydrated, not just that SSR returned HTML.
    await cartButton.click();
    await page.getByRole("dialog").waitFor();
    await page
      .getByRole("heading", { name: "Seu carrinho esta vazio" })
      .waitFor();
    await page.getByRole("button", { name: "Fechar carrinho" }).click();
    await page.getByRole("link", { name: "Entrar", exact: true }).click();
    await page.getByRole("dialog", { name: "Entrar" }).waitFor();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      true,
    );
    assert.deepEqual(errors, [], `Browser errors at ${width}px`);
    console.log(
      JSON.stringify({
        width,
        status: response.status(),
        mocks: "active",
        hydration: "ok",
        cart: "ok",
        login: "ok",
      }),
    );
    await context.close();
  }
} finally {
  await browser.close();
}
