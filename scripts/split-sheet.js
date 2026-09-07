#!/usr/bin/env node
/**
 * Cut a contact sheet of one garment in several colours into individual
 * square product photos.
 *
 *   npm run sheet -- <montage.jpg> <public/produits/polo> marine,noir,blanc,...
 *
 * Options:
 *   --caption <px>   height of the "Color: X" caption under each cell, cut off
 *                    before squaring (default 0)
 *   --size <px>      output side (default 1000)
 *
 * The grid is found from the montage's own gutters — the near-white rows and
 * columns separating the cells — rather than from hard-coded coordinates, so
 * a 3x3 sheet and a 3-then-4 sheet both work and a sheet that is a few pixels
 * off does not need the numbers retuned.
 *
 * Cells taller than they are wide are squared over a blurred, zoomed copy of
 * themselves. A flat pad reads as a border when the photo has a background of
 * its own; the blur continues it instead.
 */
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const args = process.argv.slice(2)
const flag = (name, def) => {
  const i = args.indexOf(name)
  return i < 0 ? def : args[i + 1]
}
const positional = args.filter((a, i) =>
  !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')))

const [file, outDir, nameList] = positional
if (!file || !outDir || !nameList) {
  console.error('Usage: npm run sheet -- <montage> <dossier> nom1,nom2,...  [--caption 14] [--size 1000]')
  process.exit(1)
}
const CAPTION = +flag('--caption', 0)
const SIZE = +flag('--size', 1000)
const names = nameList.split(',').map(s => s.trim()).filter(Boolean)

const slug = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// Runs of near-white along one axis: the montage's gutters.
function gutters(grey, W, H, axis, from, to) {
  const N = axis === 'y' ? H : W
  const runs = []
  let start = -1
  for (let i = 0; i <= N; i++) {
    let light = 0, tot = 0
    if (i < N) for (let j = from; j < to; j++) {
      const v = axis === 'y' ? grey[i * W + j] : grey[j * W + i]
      tot++
      if (v > 240) light++
    }
    const on = i < N && light / tot > 0.95
    if (on && start < 0) start = i
    if (!on && start >= 0) { if (i - start >= 2) runs.push([start, i - 1]); start = -1 }
  }
  return runs
}

// Turn gutter runs into the spans between them.
function spans(runs, N) {
  const out = []
  let cur = 0
  for (const [a, b] of runs) {
    if (a > cur) out.push([cur, a])
    cur = b + 1
  }
  if (cur < N) out.push([cur, N])
  return out.filter(([a, b]) => b - a > N * 0.05)
}

;(async () => {
  const { data: grey, info } = await sharp(file).greyscale().raw()
    .toBuffer({ resolveWithObject: true })
  const W = info.width, H = info.height

  const rows = spans(gutters(grey, W, H, 'y', 0, W), H)
  const cells = []
  for (const [y0, y1] of rows) {
    // Columns are found per row: sheets often put three photos on one row and
    // four on the next.
    for (const [x0, x1] of spans(gutters(grey, W, H, 'x', y0, y1), W)) {
      cells.push({ x0, x1, y0, y1: Math.max(y0 + 1, y1 - CAPTION) })
    }
  }

  if (cells.length !== names.length) {
    console.error(`${cells.length} cellules détectées, ${names.length} noms fournis.`)
    console.error(cells.map((c, i) => `  ${i + 1}. x ${c.x0}..${c.x1}  y ${c.y0}..${c.y1}`).join('\n'))
    process.exit(1)
  }

  fs.mkdirSync(outDir, { recursive: true })
  for (let i = 0; i < cells.length; i++) {
    const c = cells[i]
    const region = { left: c.x0, top: c.y0, width: c.x1 - c.x0, height: c.y1 - c.y0 }
    const cell = await sharp(file).extract(region).toBuffer()
    const back = await sharp(cell).resize(SIZE, SIZE, { fit: 'cover' }).blur(28)
      .modulate({ brightness: 0.92 }).toBuffer()
    const fore = await sharp(cell).resize(SIZE, SIZE, { fit: 'inside' }).toBuffer()

    const out = path.join(outDir, `${slug(names[i])}.jpg`)
    await sharp(back).composite([{ input: fore, gravity: 'center' }])
      .jpeg({ quality: 88, mozjpeg: true }).toFile(out)
    console.log(`  ${names[i].padEnd(16)} ${region.width}x${region.height} -> ${out} (${Math.round(fs.statSync(out).size / 1024)} Ko)`)
  }
})().catch(e => { console.error(e.message); process.exit(1) })
