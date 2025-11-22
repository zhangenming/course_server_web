import sharp from 'sharp'
import pngToIco from 'png-to-ico'
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
const root = resolve(fileURLToPath(new URL('.', import.meta.url)))
const src = resolve(root, '../src/assets/logomini.png')
const outDir = resolve(root, '../public/icons')
mkdirSync(outDir, { recursive: true })
const sizes = [16, 32, 48, 64, 128, 256]
const files = []
for (const s of sizes) {
  const p = resolve(outDir, `favicon-${s}.png`)
  await sharp(src).resize(s, s, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(p)
  files.push(p)
}
const buf = await pngToIco(files)
writeFileSync(resolve(root, '../public/favicon.ico'), buf)