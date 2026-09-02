import { useState, useEffect, useRef } from 'react'
import { SUPABASE_IMG_BASE } from '../lib/constants'

// Product photo with an emoji fallback. The fallback is not decoration: the
// photos are served from a separate Supabase storage bucket, so a bucket
// outage, a renamed file, or a product photographed later must degrade to
// something sensible rather than to a broken-image icon.
// `fill` spans the parent's width and holds a square via aspect-ratio, which
// is what a photo-led grid wants: the tile decides the size, not a hard-coded
// pixel value that has to be retuned every time the layout changes.
export default function ProductImg({ product, size = 56, radius = 12, fill = false, style }) {
  const [failed, setFailed] = useState(false)
  const imgRef = useRef(null)

  // The markup is server-rendered, so the browser starts fetching the image
  // before React hydrates. A load that fails in that window fires its error
  // event with no handler attached yet, and onError never runs — leaving a
  // broken-image icon exactly where the emoji fallback was meant to appear.
  // Re-check the element once on mount to catch those.
  useEffect(() => {
    const el = imgRef.current
    if (el && el.complete && el.naturalWidth === 0) setFailed(true)
  }, [product.photo])
  const box = {
    ...(fill
      ? { width: '100%', aspectRatio: '1' }
      : { width: size, height: size }),
    borderRadius: radius,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'rgba(245,240,232,.05)', overflow: 'hidden', flexShrink: 0,
    ...style,
  }
  if (!product.photo || failed) {
    const glyph = fill ? '3.2rem' : (typeof size === 'number' ? size * 0.5 : '7rem')
    return <div style={box}><span style={{ fontSize: glyph }}>{product.emoji}</span></div>
  }
  return (
    <div style={box}>
      <img
        ref={imgRef}
        src={`${SUPABASE_IMG_BASE}/${product.photo}`}
        alt={product.name}
        onError={() => setFailed(true)}
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    </div>
  )
}
