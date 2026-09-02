import { useState } from 'react'
import { SUPABASE_IMG_BASE } from '../lib/constants'

// Product photo with an emoji fallback. The fallback is not decoration: the
// photos are served from a separate Supabase storage bucket, so a bucket
// outage, a renamed file, or a product photographed later must degrade to
// something sensible rather than to a broken-image icon.
export default function ProductImg({ product, size = 56, radius = 12, style }) {
  const [failed, setFailed] = useState(false)
  const box = {
    width: size, height: size, borderRadius: radius,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(255,255,255,.05)', overflow: 'hidden', flexShrink: 0,
    ...style,
  }
  if (!product.photo || failed) {
    const glyph = typeof size === 'number' ? size * 0.5 : '7rem'
    return <div style={box}><span style={{ fontSize: glyph }}>{product.emoji}</span></div>
  }
  return (
    <div style={box}>
      <img
        src={`${SUPABASE_IMG_BASE}/${product.photo}`}
        alt={product.name}
        onError={() => setFailed(true)}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </div>
  )
}
