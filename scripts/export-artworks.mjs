import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const directory = new URL("../public/artworks/", import.meta.url);
await mkdir(directory, { recursive: true });
for (const name of [
  "emerald-ape",
  "violet-nomad",
  "ivory-baron",
  "golden-beat",
]) {
  const input = new URL(`../src/assets/figma/${name}.png`, import.meta.url);
  const output = new URL(`${name}.webp`, directory);
  await sharp(fileURLToPath(input))
    .resize({ width: 768, withoutEnlargement: true })
    .webp({ quality: 88 })
    .toFile(fileURLToPath(output));
  console.log(`Exported ${name}.webp`);
}
