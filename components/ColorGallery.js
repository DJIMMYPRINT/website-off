import { useRef, useEffect, useCallback } from 'react'

// Swipeable colour gallery for products photographed in several shades.
//
// The track is a native scroll-snap carousel rather than a JS drag: on a
// phone that gives real momentum, rubber-banding and accessibility for free,
// and it cannot lose the pointer the way the studio's hand-rolled drag did.
// The swatch row underneath is the same selection by another route — tapping
// scrolls the track, swiping the track lights the swatch — so the colour and
// the photo can never disagree.
export default function ColorGallery({ colors, index, onIndex }) {
  const trackRef = useRef(null)
  const rowRef = useRef(null)
  // Set while the track is being scrolled programmatically, so the scroll
  // handler does not fight the animation it triggered itself.
  const lockRef = useRef(0)
  // The first effect run is the initial render, not a choice the visitor made:
  // scrolling the swatch row into view then would drag the whole sheet past
  // the product's name and price before they have been read.
  const firstRef = useRef(true)

  const scrollTo = useCallback(i => {
    const el = trackRef.current
    if (!el) return
    lockRef.current = Date.now() + 500
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' })
  }, [])

  const onScroll = () => {
    const el = trackRef.current
    if (!el || Date.now() < lockRef.current) return
    const i = Math.round(el.scrollLeft / el.clientWidth)
    if (i !== index && i >= 0 && i < colors.length) onIndex(i)
  }

  // Follow a selection made from the swatch row, and keep the active swatch
  // inside the visible part of that row when the list is longer than the
  // screen.
  useEffect(() => {
    if (firstRef.current) { firstRef.current = false; return }
    const el = trackRef.current
    if (el && Math.round(el.scrollLeft / el.clientWidth) !== index) scrollTo(index)
    const chip = rowRef.current?.children[index]
    chip?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  }, [index, scrollTo])

  const current = colors[index]

  return (
    <div className="cg">
      <div className="cg-track" ref={trackRef} onScroll={onScroll}>
        {colors.map((c, i) => (
          <div className="cg-slide" key={c.name}>
            <img src={c.photo} alt={`${c.name}`} loading={i === 0 ? 'eager' : 'lazy'} draggable="false" />
          </div>
        ))}
      </div>

      <div className="cg-dots" aria-hidden="true">
        {colors.map((c, i) => <i key={c.name} className={i === index ? 'on' : ''} />)}
      </div>

      <div className="cg-name">
        <span>Couleur</span><strong>{current.name}</strong>
      </div>

      <div className="cg-row" ref={rowRef}>
        {colors.map((c, i) => (
          <button
            key={c.name}
            type="button"
            onClick={() => onIndex(i)}
            className={`cg-sw${i === index ? ' on' : ''}`}
            style={{ '--sw': c.hex }}
            aria-label={c.name}
            aria-pressed={i === index}
          />
        ))}
      </div>
    </div>
  )
}
