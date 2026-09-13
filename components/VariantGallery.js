import { useRef, useEffect, useCallback } from 'react'

// Swipeable gallery for products photographed in several versions — usually
// colours, sometimes cuts.
//
// The track is a native scroll-snap carousel rather than a JS drag: on a
// phone that gives real momentum, rubber-banding and accessibility for free,
// and it cannot lose the pointer the way the studio's hand-rolled drag did.
// The picker row underneath is the same selection by another route — tapping
// scrolls the track, swiping the track lights the button — so the choice and
// the photo can never disagree.
//
// A variant with a `hex` is drawn as a colour swatch; one without is drawn as
// its own photo, because the three local work outfits share a single navy and
// three identical dots would be no help at all.
export default function VariantGallery({ variants, label, index, onIndex }) {
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
    if (i !== index && i >= 0 && i < variants.length) onIndex(i)
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

  const current = variants[index]

  return (
    <div className="cg">
      <div className="cg-track" ref={trackRef} onScroll={onScroll}>
        {variants.map((v, i) => (
          <div className="cg-slide" key={v.name}>
            <img src={v.photo} alt={v.name} loading={i === 0 ? 'eager' : 'lazy'} draggable="false" />
          </div>
        ))}
      </div>

      <div className="cg-dots" aria-hidden="true">
        {variants.map((v, i) => <i key={v.name} className={i === index ? 'on' : ''} />)}
      </div>

      <div className="cg-name">
        <span>{label}</span><strong>{current.name}</strong>
      </div>

      <div className="cg-row" ref={rowRef}>
        {variants.map((v, i) => (
          <button
            key={v.name}
            type="button"
            onClick={() => onIndex(i)}
            className={`cg-sw${v.hex ? '' : ' cg-sw-photo'}${i === index ? ' on' : ''}`}
            style={v.hex ? { '--sw': v.hex } : { backgroundImage: `url(${v.photo})` }}
            aria-label={v.name}
            aria-pressed={i === index}
          />
        ))}
      </div>
    </div>
  )
}
