import sharp from 'sharp'
import { readFileSync, writeFileSync } from 'fs'

const sizes = [192, 512, 180]

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#16a34a"/>
  <text x="256" y="340" font-family="Arial Black, Arial" font-weight="900" font-size="280" fill="white" text-anchor="middle">J</text>
</svg>`

for (const size of sizes) {
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(`public/${size === 180 ? 'apple-touch-icon' : `pwa-${size}x${size}`}.png`)
  console.log(`Generated ${size}x${size}`)
}
