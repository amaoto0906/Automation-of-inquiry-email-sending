import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { assets } from "./asset-manifest.mjs";

const pngDirectory = path.join(process.cwd(), "asset-src/png");
const webpDirectory = path.join(process.cwd(), "public/assets/generated/webp");
await mkdir(webpDirectory, { recursive: true });

for (const asset of assets) {
  const source = path.join(pngDirectory, `${asset.name}.png`);
  const destination = path.join(webpDirectory, `${asset.name}.webp`);

  await sharp(source)
    .webp({
      quality: asset.mode === "cover" ? 78 : 82,
      effort: 6,
      smartSubsample: true,
    })
    .toFile(destination);

  console.log(`WebP変換完了: ${asset.name}.webp`);
}

console.log(`WebPアセット ${assets.length} 点の変換が完了しました。`);
