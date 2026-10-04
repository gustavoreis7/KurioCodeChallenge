import { expect, test } from "@playwright/test";
import { boot } from "./helpers";

test.beforeEach(async ({ page }) => {
  await boot(page);
});

test("cabecalho e filtros do Figma: redes, slider, precisao e refresh", async ({
  page,
}, testInfo) => {
  const header = page.locator(".site-header");
  await expect(
    header.getByRole("link", { name: "Entrar", exact: true }),
  ).toBeVisible();
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Filtros", exact: true }).click();
  else {
    const navigation = header.getByRole("navigation", {
      name: "Navegacao principal",
    });
    const bounds = await navigation.boundingBox();
    const frame = await header.boundingBox();
    expect(
      Math.abs(bounds!.x + bounds!.width / 2 - (frame!.x + frame!.width / 2)),
    ).toBeLessThan(2);
    await expect(
      navigation.getByRole("link", { name: "Início", exact: true }),
    ).toHaveAttribute("data-nav-active", "true");
    await navigation
      .getByRole("link", { name: "Mercado", exact: true })
      .click();
    await expect(
      navigation.getByRole("link", { name: "Mercado", exact: true }),
    ).toHaveAttribute("data-nav-active", "true");
  }
  const filters = page.getByRole("complementary", {
    name: "Filtros do catalogo",
  });
  await expect(
    filters.locator(".catalog-facet-group").first().getByRole("checkbox"),
  ).toHaveCount(9);
  await expect(
    filters
      .locator(".facet-row")
      .filter({ has: page.getByLabel("Ethereum", { exact: true }) })
      .locator(".facet-count"),
  ).toHaveText("(8)");
  await filters.getByLabel("Ethereum", { exact: true }).check();
  await filters.getByLabel("Solana", { exact: true }).check();
  await expect(page).toHaveURL(/networks=/);
  await expect(page.locator(".catalog-results .nft-card img")).toHaveCount(9);
  const minimum = filters.getByRole("slider", {
    name: "Preco minimo",
    exact: true,
  });
  await minimum.focus();
  await page.keyboard.press("ArrowRight");
  await expect(minimum).toHaveAttribute("aria-valuetext", "0.01 ETH");
  await filters.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(page).toHaveURL(
    (url) => JSON.parse(url.searchParams.get("minPrice") ?? "null") === "0.01",
  );
  await filters.getByText("Valores exatos", { exact: true }).click();
  await filters.getByLabel("Minimo (ETH)").fill("0.000000000000000001");
  await filters.getByRole("button", { name: "Aplicar", exact: true }).click();
  await expect(page).toHaveURL(
    (url) =>
      JSON.parse(url.searchParams.get("minPrice") ?? "null") ===
      "0.000000000000000001",
  );
  await page.reload();
  if (testInfo.project.name === "mobile")
    await page.getByRole("button", { name: "Filtros", exact: true }).click();
  await expect(filters.getByLabel("Ethereum", { exact: true })).toBeChecked();
  await expect(filters.getByLabel("Solana", { exact: true })).toBeChecked();
  await expect(
    filters.getByRole("slider", { name: "Preco minimo", exact: true }),
  ).toHaveAttribute("aria-valuetext", "0.000000000000000001 ETH");
  await filters
    .getByRole("button", { name: "Limpar filtros", exact: true })
    .click();
  await expect(page).not.toHaveURL(/networks=|minPrice=|maxPrice=/);
  await expect(
    filters.getByLabel("Ethereum", { exact: true }),
  ).not.toBeChecked();
  await expect(page.locator(".catalog-results .nft-card img")).toHaveCount(9);
  await page.screenshot({
    path: testInfo.outputPath("cabecalho-filtros.png"),
    fullPage: true,
  });
});

test("catalogo padronizado: imagens, paginacao e acoes auxiliares", async ({
  page,
}, testInfo) => {
  const pagination = page.getByRole("navigation", { name: "Paginacao" });
  await expect(
    pagination.getByRole("button", { name: "Pagina 1", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await pagination
    .getByRole("button", { name: "Pagina 2", exact: true })
    .click();
  await expect(page).toHaveURL(/page=2/);
  await expect(
    pagination.getByRole("button", { name: "Pagina 2", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.reload();
  await expect(
    pagination.getByRole("button", { name: "Pagina 2", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".catalog-results .nft-card")).toHaveCount(9);
  const images = await page
    .locator(".catalog-results .nft-image img")
    .evaluateAll((elements) =>
      elements.map((element) => {
        const image = element as HTMLImageElement;
        const rect = image.getBoundingClientRect();
        return {
          width: rect.width,
          height: rect.height,
          loaded: image.complete && image.naturalWidth > 0,
        };
      }),
    );
  for (const image of images) {
    expect(Math.abs(image.width - image.height)).toBeLessThan(1);
    expect(image.loaded).toBe(true);
  }
  if (testInfo.project.name === "mobile") {
    await expect(page.locator(".catalog-journal")).not.toBeVisible();
    await page
      .getByRole("button", { name: "Novos lançamentos", exact: true })
      .click();
    await expect(page).toHaveURL(/new/);
    await expect(page).not.toHaveURL(/page=2/);
    return;
  }
  await expect(
    page.getByRole("heading", { name: "Diario da Cunhagem" }),
  ).toBeVisible();
  await expect(page.locator(".journal-card")).toHaveCount(4);
  await page
    .getByRole("button", {
      name: "Ler mais: Como funciona a propriedade de NFTs",
      exact: true,
    })
    .click();
  await expect(page.locator(".announcement")).toContainText(
    "Conteudo editorial indisponivel",
  );
  await page.getByRole("button", { name: "Dispensar aviso" }).click();
  await page
    .getByRole("link", {
      name: "Explorar Lancamentos genesis de edicao limitada",
    })
    .click();
  await expect(page).toHaveURL(/new/);
  await expect(page).not.toHaveURL(/page=2/);
  await expect(page.getByLabel("Novidades", { exact: true })).toBeChecked();
});

test("rodape padronizado: estados honestos e layout sem overflow", async ({
  page,
}, testInfo) => {
  const footer = page.locator(".site-footer");
  if (testInfo.project.name === "mobile") {
    await expect(footer).not.toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Navegacao mobile" }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    return;
  }
  await expect(
    footer.getByRole("heading", { name: "Antecipe-se ao proximo lancamento" }),
  ).toBeVisible();
  await expect(footer.getByLabel("E-mail para lancamentos")).toBeDisabled();
  await expect(
    footer.getByRole("button", { name: "Enviar", exact: true }),
  ).toBeDisabled();
  await expect(
    footer.getByRole("button", { name: "Instagram", exact: true }),
  ).toBeDisabled();
  await footer
    .getByRole("button", { name: "Carteira e seguranca", exact: true })
    .click();
  await expect(page.locator(".announcement")).toContainText(
    "Central de ajuda indisponivel",
  );
  await page.getByRole("button", { name: "Dispensar aviso" }).click();
  for (const width of testInfo.project.name === "desktop"
    ? [1440, 768]
    : [390]) {
    await page.setViewportSize({ width, height: 1000 });
    await footer.scrollIntoViewIfNeeded();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const copy = await page
      .locator(".catalog-hero > div")
      .first()
      .boundingBox();
    const artwork = await page.locator(".hero-artwork").boundingBox();
    expect(copy).not.toBeNull();
    expect(artwork).not.toBeNull();
    expect(copy!.x + copy!.width).toBeLessThanOrEqual(artwork!.x + 1);
    const buttons = await page
      .locator(".journal-card .text-action")
      .evaluateAll((elements) =>
        elements.map((element) => element.getBoundingClientRect().bottom),
      );
    const columns = width > 900 ? 4 : 2;
    for (let index = 0; index < buttons.length; index += columns) {
      expect(
        Math.max(...buttons.slice(index, index + columns)) -
          Math.min(...buttons.slice(index, index + columns)),
      ).toBeLessThan(1);
    }
    const screenshot = testInfo.outputPath(`padronizacao-${width}.png`);
    await page.screenshot({
      path: screenshot,
      fullPage: true,
    });
    await testInfo.attach(`padronizacao-${width}`, {
      path: screenshot,
      contentType: "image/png",
    });
  }
});
