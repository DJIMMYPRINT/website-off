#!/usr/bin/env node
/**
 * Ajoute ou remplace la photo d'un produit.
 *
 *   node scripts/add-photo.js <image source> "<nom du produit>"
 *   node scripts/add-photo.js /tmp/polo.jpg "Polo"
 *
 * Fait en une passe ce qui était fait à la main : redimensionne en 800x800
 * (le plus grand usage à l'écran est le canevas de 351 px en densité double),
 * compresse en JPEG 82, écrit dans public/produits/, puis met à jour le champ
 * `photo` du produit dans lib/products.js.
 *
 * Le nom du produit doit correspondre exactement à celui du catalogue —
 * le script refuse plutôt que de deviner, pour ne pas réaffecter la photo
 * d'un produit à un autre en silence.
 */
const fs = require('fs')
const path = require('path')

const [, , src, name] = process.argv
if (!src || !name) {
  console.error('Usage : node scripts/add-photo.js <image> "<nom du produit>"')
  process.exit(1)
}
if (!fs.existsSync(src)) {
  console.error(`Image introuvable : ${src}`)
  process.exit(1)
}

const PRODUCTS_FILE = path.join(__dirname, '..', 'lib', 'products.js')
const source = fs.readFileSync(PRODUCTS_FILE, 'utf8')

const names = [...source.matchAll(/name: '([^']+)'/g)].map(m => m[1])
if (!names.includes(name)) {
  console.error(`Produit inconnu : « ${name} »`)
  console.error('Noms valides :\n  - ' + names.join('\n  - '))
  process.exit(1)
}

// Accent-free, lowercase, dash-separated — safe in a URL and stable over time.
const slug = name
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const outRel = `/produits/${slug}.jpg`
const outAbs = path.join(__dirname, '..', 'public', 'produits', `${slug}.jpg`)

;(async () => {
  const sharp = require('sharp')
  fs.mkdirSync(path.dirname(outAbs), { recursive: true })
  const meta = await sharp(src).metadata()
  await sharp(src).resize(800, 800, { fit: 'cover', position: 'centre' })
    .jpeg({ quality: 82, mozjpeg: true }).toFile(outAbs)

  // Rewrite only this product's photo field, leaving the rest of the line
  // (price, description, techniques) untouched.
  const line = new RegExp(`(name: '${name.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}',\\s*photo: )([^,]+)(,)`)
  if (!line.test(source)) {
    console.error(`Champ photo introuvable pour « ${name} » — lib/products.js a-t-il changé de forme ?`)
    process.exit(1)
  }
  fs.writeFileSync(PRODUCTS_FILE, source.replace(line, `$1'${outRel}'$3`))

  const kb = n => Math.round(fs.statSync(n).size / 1024)
  console.log(`✅ ${name}`)
  console.log(`   source  : ${meta.width}x${meta.height}, ${kb(src)} Ko`)
  console.log(`   publiée : ${outRel} — 800x800, ${kb(outAbs)} Ko`)
})().catch(e => { console.error(e.message); process.exit(1) })
