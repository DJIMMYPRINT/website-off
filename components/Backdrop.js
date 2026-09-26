// Page backdrop: a still hairline grid, nothing else.
//
// It used to carry floating geometric shapes and drifting colour halos. Both
// are gone with the corporate pass: they were built for a consumer-app feel,
// and behind a price list and a spec table they read as noise — movement in
// the corner of the eye while someone is trying to compare two quantities.
// What is left gives the ivory the texture of drafting paper and never moves.
export default function Backdrop() {
  return (
    <div className="backdrop" aria-hidden="true">
      <div className="bg-grid" />
    </div>
  )
}
