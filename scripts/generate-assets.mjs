import { access, mkdir, rename } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { assets } from "./asset-manifest.mjs";

const pngDirectory = path.join(process.cwd(), "asset-src/png");
await mkdir(pngDirectory, { recursive: true });

for (const asset of assets) {
  const source = path.join(pngDirectory, `${asset.name}.png`);
  const temporary = path.join(pngDirectory, `.${asset.name}.prepared.png`);
  await access(source);

  await sharp(source)
    .resize(asset.width, asset.height, {
      fit: asset.mode,
      position: "centre",
      background: { r: 248, g: 251, b: 255, alpha: 1 },
      withoutEnlargement: false,
    })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(temporary);

  await rename(temporary, source);
  console.log(`PNG整形完了: ${asset.name}.png (${asset.width}x${asset.height})`);
}

console.log(`PNGアセット ${assets.length} 点の整形・検証が完了しました。`);
