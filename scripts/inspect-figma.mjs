import { chromium } from "@playwright/test";

const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  await page.goto(
    process.argv[2] ??
      "https://www.figma.com/proto/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=2-2&scaling=min-zoom&content-scaling=fixed&page-id=0%3A1",
    { waitUntil: "domcontentloaded", timeout: 120_000 },
  );
  await page.waitForTimeout(70_000);
  console.log((await page.locator("body").innerText()).slice(0, 6000));
  console.log(
    await page
      .locator("button")
      .evaluateAll((buttons) =>
        buttons.map((button) => ({
          text: button.textContent,
          label: button.getAttribute("aria-label"),
          title: button.getAttribute("title"),
        })),
      ),
  );
  await page.screenshot({ path: "reports/figma-current.png", fullPage: true });
  const cookies = page.getByRole("button", {
    name: "Recusar cookies",
    exact: true,
  });
  if (await cookies.isVisible()) await cookies.click();
  for (let frame = 1; frame <= 15; frame++) {
    await page.screenshot({
      path: `reports/figma-frame-${String(frame).padStart(2, "0")}.png`,
    });
    console.log(`Frame ${frame}: ${page.url()}`);
    if (frame < 15) {
      await page.keyboard.press("ArrowRight");
      await page.waitForTimeout(1000);
      if (
        !(await page.locator("body").innerText()).includes(`${frame + 1} / 15`)
      ) {
        await page
          .getByRole("button", { name: "Próximo quadro", exact: true })
          .evaluate((button) => button.click());
      }
      await page.waitForFunction(
        (next) => document.body.innerText.includes(`${next} / 15`),
        frame + 1,
        { timeout: 15_000 },
      );
      await page.waitForTimeout(2000);
    }
  }
} finally {
  await browser.close();
}
