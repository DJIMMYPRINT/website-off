import { useEffect, useRef, useState } from 'react'

// Silent looping illustration of a marking technique.
//
// Two rules shape this. First, nothing downloads until the card is close to
// the screen: `preload="none"` plus a poster means a visitor who never scrolls
// past the hero pays nothing for two videos they did not ask for. Second, it
// plays only while visible — a clip looping off-screen burns battery on a
// phone for no one's benefit.
//
// Muted and playsInline are not decoration either: without both, iOS refuses
// to autoplay at all and opens the clip fullscreen instead.
//
// WebM is offered first and MP4 second: at matched quality the VP9 file is
// about 15% smaller, and every browser that cannot read it (Safari, older
// iOS) falls through to the H.264 one.
export default function TechVideo({ name, label }) {
  const ref = useRef(null)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => setReduced(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el || reduced) return
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          // play() rejects when the browser declines autoplay; the poster
          // stays up, which is a perfectly good fallback.
          el.play().catch(() => {})
        } else {
          el.pause()
        }
      },
      { threshold: 0.35 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [reduced])

  return (
    <div className="tv">
      <video
        ref={ref}
        className="tv-el"
        poster={`/videos/${name}-poster.jpg`}
        preload="none"
        muted
        loop
        playsInline
        // Decorative: the card's own heading and description already name and
        // explain the technique, so a screen reader gains nothing here.
        aria-hidden="true"
        tabIndex={-1}
      >
        <source src={`/videos/${name}.webm`} type="video/webm" />
        <source src={`/videos/${name}.mp4`} type="video/mp4" />
      </video>
      <span className="tv-tag">{label}</span>
    </div>
  )
}
