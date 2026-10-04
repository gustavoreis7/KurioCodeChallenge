import { chromium } from "@playwright/test";

const origin = process.env.DEV_URL ?? "http://127.0.0.1:5173";
const browser = await chromium.launch({ channel: "chrome", headless: true });
async function capture(page, path) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      Array.from(document.images)
        .filter(
          (image) =>
            image.clientWidth > 0 &&
            (image.complete || image.loading !== "lazy"),
        )
        .map((image) => image.decode().catch(() => {})),
    );
  });
  await page.screenshot({ path, fullPage: true });
}
try {
  for (const width of [1440, 768, 414, 390, 320]) {
    const context = await browser.newContext({
      viewport: { width, height: 896 },
    });
    const page = await context.newPage();
    await page.goto(origin);
    await page.waitForFunction(
      () =>
        document.documentElement.dataset.hydrated === "true" &&
        navigator.serviceWorker.controller,
    );
    await page.locator(".nft-card img").first().waitFor();
    await page.evaluate(async () => {
      await window.kurioMocks.post("/__mock/reset");
      await window.kurioMocks.post("/__mock/config", { latencyMs: 20 });
      const { api } = await import("/src/services/api.ts");
      for (const [nftId, quantity] of [
        ["001", 1],
        ["002", 1],
        ["003", 2],
        ["004", 2],
      ]) {
        await api.addItem({
          nftId,
          editionId: "edition-1",
          quantity,
        });
      }
    });
    await page.goto(`${origin}/cart`);
    await page.locator(".cart-row img").nth(3).waitFor();
    await page.locator(".quote-total").waitFor();
    await capture(page, `reports/design-cart-${width}.png`);
    console.log(
      JSON.stringify({
        width,
        screen: "cart",
        overflow: await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
      }),
    );
    await page.goto(`${origin}/login?redirect=%2Fcheckout`);
    await page.getByRole("dialog").waitFor();
    await capture(page, `reports/design-login-${width}.png`);
    await page
      .getByRole("button", { name: "Continuar com Google", exact: true })
      .click();
    await page.getByRole("button", { name: /Ana Silva/ }).click();
    await page.waitForURL(/\/checkout$/);
    await page.locator(".quote-total").waitFor();
    await capture(page, `reports/design-checkout-${width}.png`);
    console.log(
      JSON.stringify({
        width,
        screen: "checkout",
        overflow: await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
      }),
    );
    await page.goto(`${origin}/nfts/001`);
    await page.locator("img.detail-image").waitFor();
    await page.locator(".related-section .nft-card img").first().waitFor();
    await capture(page, `reports/design-detail-${width}.png`);
    console.log(
      JSON.stringify({
        width,
        screen: "detail",
        overflow: await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
      }),
    );
    await context.close();
  }
} finally {
  await browser.close();
}
