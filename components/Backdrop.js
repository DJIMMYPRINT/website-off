// Animated page backdrop: a luminous grid, floating geometric shapes, and
// soft colour glows — all in the logo's green and gold.
//
// Everything animates on transform and opacity only, so the compositor
// handles it and scrolling stays smooth on a phone. The whole thing is
// pointer-events:none and sits behind the content; `prefers-reduced-motion`
// freezes it (see globals.css) rather than removing it, so the composition
// still reads for anyone who asks for less movement.

const SHAPES = [
  { cls: 'sq',  style: { left: '8%',  top: '12%', width: 70,  height: 70,  animationDuration: '26s', animationDelay: '0s'    } },
  { cls: 'ci',  style: { left: '78%', top: '18%', width: 100, height: 100, animationDuration: '32s', animationDelay: '-6s'   } },
  { cls: 'tri', style: { left: '16%', top: '58%', width: 84,  height: 84,  animationDuration: '29s', animationDelay: '-12s'  } },
  { cls: 'sq',  style: { left: '68%', top: '66%', width: 56,  height: 56,  animationDuration: '35s', animationDelay: '-3s'   } },
  { cls: 'ci',  style: { left: '40%', top: '86%', width: 76,  height: 76,  animationDuration: '24s', animationDelay: '-16s'  } },
  { cls: 'tri', style: { left: '88%', top: '44%', width: 48,  height: 48,  animationDuration: '30s', animationDelay: '-9s'   } },
]

export default function Backdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      <div className="bg-grid" />
      <div className="bg-shapes">
        {SHAPES.map((s, i) => (
          <span key={i} className={`shape ${s.cls}`} style={s.style} />
        ))}
      </div>
      <div className="aurora-blob ab1" />
      <div className="aurora-blob ab2" />
      <div className="aurora-blob ab3" />
    </div>
  )
}
