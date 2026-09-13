#!/usr/bin/env node
/**
 * Recolour a garment photo into another colourway.
 *
 *   npm run recolor -- <photo.jpg> <sortie.jpg> "#1C294C"
 *
 * For a range sold in more colours than were photographed. It is a stand-in,
 * not a colour sample: the hue is exact, the way a dye actually sits on that
 * fabric is not. Mark such variants `simulated: true` in lib/products.js and
 * replace them with real photographs when they exist.
 *
 * The garment is isolated by hue and saturation, not by a hand-drawn mask,
 * which works as long as it is the only strongly saturated thing in frame —
 * skin, a neutral wall and black trousers all fall outside the band. Pass
 * --base "#RRGGBB" if the garment colour should not be auto-detected.
 *
 * Lightness is shifted, not scaled: newL = L + (targetL - baseL). That keeps
 * the full range of folds and shadows and merely re-centres it on the target,
 * where a multiply would crush the shadows on a dark target and blow the
 * highlights on a light one.
 *
 * Two masks, because the outline needs different treatment from the body.
 * `core` is the strict hue/saturation test — the fabric itself, where hue,
 * saturation AND lightness are remapped. `edge` is that mask dilated and
 * feathered, covering the antialiased pixels along the garment's outline:
 * half fabric, half wall, too desaturated to pass the strict test, and left
 * alone they keep the old hue and draw a coloured line around the garment.
 * Those get the new hue but keep their own lightness — shifting it too turned
 * the ring white on pale targets, trading a blue outline for a glowing one.
 */
const sharp = require('sharp')

const clamp = (v, a, b) => v < a ? a : v > b ? b : v

// Separable max filter: grows the mask outwards by `r` pixels so the
// garment's antialiased outline is included.
function dilate(m, W, H, r) {
  const t = new Float32Array(m.length)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let v = 0
    for (let k = -r; k <= r; k++) { const xx = x + k; if (xx >= 0 && xx < W) v = Math.max(v, m[y * W + xx]) }
    t[y * W + x] = v
  }
  for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) {
    let v = 0
    for (let k = -r; k <= r; k++) { const yy = y + k; if (yy >= 0 && yy < H) v = Math.max(v, t[yy * W + x]) }
    m[y * W + x] = v
  }
}

// Separable box blur: feathers the dilated edge so the recolour fades out.
function blur(m, W, H, r) {
  const t = new Float32Array(m.length)
  const d = 2 * r + 1
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let v = 0
    for (let k = -r; k <= r; k++) v += m[y * W + clamp(x + k, 0, W - 1)]
    t[y * W + x] = v / d
  }
  for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) {
    let v = 0
    for (let k = -r; k <= r; k++) v += t[clamp(y + k, 0, H - 1) * W + x]
    m[y * W + x] = v / d
  }
}

function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return [0, 0, l]
  const s = d / (1 - Math.abs(2 * l - 1))
  let h
  if (max === r) h = 60 * (((g - b) / d) % 6)
  else if (max === g) h = 60 * ((b - r) / d + 2)
  else h = 60 * ((r - g) / d + 4)
  if (h < 0) h += 360
  return [h, s, l]
}

function hsl2rgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  let r, g, b
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255]
}


function weight(h, s, l, baseH) {
  let dh = Math.abs(h - baseH)
  if (dh > 180) dh = 360 - dh
  const wh = dh <= 28 ? 1 : dh >= 55 ? 0 : (55 - dh) / 27
  const ws = s <= 0.06 ? 0 : s >= 0.20 ? 1 : (s - 0.06) / 0.14
  const wl = l <= 0.02 ? 0 : l >= 0.06 ? 1 : (l - 0.02) / 0.04
  return wh * ws * wl
}



const args = process.argv.slice(2).filter(a => a !== '--')
const flag = name => { const i = args.indexOf(name); return i < 0 ? null : args[i + 1] }
const positional = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')))
const [file, out, target] = positional
if (!file || !out || !target) {
  console.error('Usage: npm run recolor -- <photo.jpg> <sortie.jpg> "#RRGGBB" [--base "#RRGGBB"]')
  process.exit(1)
}

function hex2hsl(hex) {
  const v = hex.replace('#', '')
  return rgb2hsl(parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16))
}

// The garment colour: the most common hue among strongly saturated pixels.
function detectBase(hsl, n) {
  const bins = new Array(36).fill(0)
  for (let i = 0; i < n; i++) {
    const o = i * 3
    if (hsl[o + 1] > 0.45 && hsl[o + 2] > 0.08 && hsl[o + 2] < 0.85) bins[Math.floor(hsl[o] / 10) % 36]++
  }
  const top = bins.indexOf(Math.max(...bins))
  let h = 0, s = 0, l = 0, c = 0
  for (let i = 0; i < n; i++) {
    const o = i * 3
    if (Math.floor(hsl[o] / 10) % 36 !== top) continue
    if (hsl[o + 1] <= 0.45) continue
    h += hsl[o]; s += hsl[o + 1]; l += hsl[o + 2]; c++
  }
  return [h / c, s / c, l / c]
}

;(async () => {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width, H = info.height, n = W * H

  const hsl = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const o = i * 3
    const [h, s, l] = rgb2hsl(data[o], data[o + 1], data[o + 2])
    hsl[o] = h; hsl[o + 1] = s; hsl[o + 2] = l
  }

  const baseFlag = flag('--base')
  const [bh, bs, bl] = baseFlag ? hex2hsl(baseFlag) : detectBase(hsl, n)
  const [th, ts, tl] = hex2hsl(target)

  const core = new Float32Array(n)
  for (let i = 0; i < n; i++) core[i] = weight(hsl[i * 3], hsl[i * 3 + 1], hsl[i * 3 + 2], bh)
  const edge = Float32Array.from(core)
  dilate(edge, W, H, 3)
  blur(edge, W, H, 2)
  blur(core, W, H, 1)

  const px = Buffer.alloc(data.length)
  for (let i = 0; i < n; i++) {
    const o = i * 3
    const r = data[o], g = data[o + 1], b = data[o + 2]
    const w = edge[i]
    if (w < 0.004) { px[o] = r; px[o + 1] = g; px[o + 2] = b; continue }
    const s = hsl[o + 1], l = hsl[o + 2]
    const nl = clamp(l + (tl - bl) * core[i], 0.02, 0.97)
    const ns = clamp(ts * (s / bs), 0, 1)
    const [nr, ng, nb] = hsl2rgb(th, ns, nl)
    px[o]     = clamp(r + (nr - r) * w, 0, 255)
    px[o + 1] = clamp(g + (ng - g) * w, 0, 255)
    px[o + 2] = clamp(b + (nb - b) * w, 0, 255)
  }

  await sharp(px, { raw: { width: W, height: H, channels: 3 } })
    .jpeg({ quality: 92, mozjpeg: true, chromaSubsampling: '4:4:4' })
    .toFile(out)
  console.log(`base ${bh.toFixed(0)}deg s${bs.toFixed(2)} l${bl.toFixed(2)}  ->  ${target}   ${out}`)
})().catch(e => { console.error(e.message); process.exit(1) })
