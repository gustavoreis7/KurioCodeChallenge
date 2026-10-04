import { mkdir, writeFile, readFile } from "node:fs/promises";
import { cpus, platform, release } from "node:os";
import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";
import configs from "../lighthouse.config.mjs";

const origin = process.env.AUDIT_URL ?? "http://127.0.0.1:4173";
const html = await (await fetch(origin)).text();
if (html.includes("/@vite/client"))
  throw new Error("Use npm run build e npm run preview, nao o servidor dev.");
const directory = "reports/lighthouse";
await mkdir(directory, { recursive: true });
const median = (values) =>
  values.toSorted((a, b) => a - b)[Math.floor(values.length / 2)];
const packageInfo = JSON.parse(
  await readFile(
    new URL("../node_modules/lighthouse/package.json", import.meta.url),
    "utf8",
  ),
);
const summary = {
  environment: {
    node: process.version,
    lighthouse: packageInfo.version,
    os: `${platform()} ${release()}`,
    cpu: cpus()[0]?.model,
    date: new Date().toISOString(),
    origin,
    conditions:
      "Production build, default MSW, fresh Chrome profile each run, Lighthouse default simulated throttling.",
  },
  measurements: [],
};
for (const [name, path] of [
  ["inicio", "/"],
  ["detalhe", "/nfts/001"],
]) {
  for (const profile of ["mobile", "desktop"]) {
    const measurements = [];
    for (let run = 1; run <= 3; run++) {
      const chrome = await launch({
        chromeFlags: ["--headless", "--disable-gpu"],
      });
      try {
        console.log(`Lighthouse ${name} ${profile} ${run}/3`);
        const result = await lighthouse(
          new URL(path, origin).href,
          {
            port: chrome.port,
            output: ["html", "json"],
            logLevel: "error",
            maxWaitForLoad: 90_000,
          },
          configs[profile],
        );
        if (!result || result.lhr.runtimeError)
          throw new Error(
            result?.lhr.runtimeError?.message ?? "Lighthouse sem resultado",
          );
        await writeFile(
          `${directory}/${name}-${profile}-${run}.html`,
          result.report[0],
        );
        await writeFile(
          `${directory}/${name}-${profile}-${run}.json`,
          result.report[1],
        );
        const lhr = result.lhr;
        measurements.push({
          scores: Object.fromEntries(
            Object.entries(lhr.categories).map(([key, value]) => [
              key,
              (value.score ?? 0) * 100,
            ]),
          ),
          lcp: lhr.audits["largest-contentful-paint"].numericValue,
          cls: lhr.audits["cumulative-layout-shift"].numericValue,
          tbt: lhr.audits["total-blocking-time"].numericValue,
          chrome: lhr.environment.hostUserAgent,
          failures: Object.values(lhr.audits)
            .filter(
              (audit) =>
                audit.score !== null &&
                audit.score < 1 &&
                audit.scoreDisplayMode !== "informative",
            )
            .map((audit) => ({
              id: audit.id,
              title: audit.title,
              displayValue: audit.displayValue,
            })),
        });
      } finally {
        await chrome.kill();
      }
    }
    const scores = Object.fromEntries(
      Object.keys(measurements[0].scores).map((key) => [
        key,
        median(measurements.map((value) => value.scores[key])),
      ]),
    );
    summary.measurements.push({
      page: name,
      profile,
      scores,
      lcp: median(measurements.map((value) => value.lcp)),
      cls: median(measurements.map((value) => value.cls)),
      tbt: median(measurements.map((value) => value.tbt)),
      runs: measurements,
    });
    await writeFile(
      `${directory}/summary.json`,
      JSON.stringify(summary, null, 2),
    );
    console.log(JSON.stringify({ page: name, profile, scores }));
  }
}
const rows = summary.measurements
  .map(
    (value) =>
      `| ${value.page} | ${value.profile} | ${value.scores.performance} | ${value.scores.accessibility} | ${value.scores["best-practices"]} | ${value.scores.seo} | ${value.lcp.toFixed(0)} | ${value.cls.toFixed(3)} | ${value.tbt.toFixed(0)} |`,
  )
  .join("\n");
await writeFile(
  `${directory}/SUMMARY.md`,
  `# Lighthouse\n\n${JSON.stringify(summary.environment, null, 2)}\n\n| Pagina | Perfil | Perf | A11y | BP | SEO | LCP ms | CLS | TBT ms |\n|---|---|---|---|---|---|---|---|---|\n${rows}\n\nMetas: 90 / 95 / 95 / 90. Consulte os audits abaixo de 1 em summary.json e os HTML individuais para diagnosticar resultados abaixo das metas.\n`,
);
