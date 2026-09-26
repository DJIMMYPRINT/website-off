// Shared line icons.
//
// The site used emoji wherever a pictogram was wanted. On a supplier page
// they were the loudest "consumer app" signal left: they carry their own
// colours, they render differently on every device, and next to a price
// table they read as decoration. These are one stroke weight, one colour —
// they inherit `currentColor`, so each caller decides.
const P = {
  check:    'M20 6 9 17l-5-5',
  wa:       'M12 21a9 9 0 1 0-8-4.7L3 21l4.7-1A9 9 0 0 0 12 21Z',
  phone:    'M6 3h3l2 5-2.5 1.5a12 12 0 0 0 5 5L15 12l5 2v3a2 2 0 0 1-2.2 2A16 16 0 0 1 4 5.2 2 2 0 0 1 6 3Z',
  mail:     'M3 6h18v12H3zM3 7l9 6 9-6',
  pin:      'M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z M12 10.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z',
  clock:    'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7.5V12l3 2',
  truck:    'M3 7h11v9H3zM14 10h4l3 3v3h-7zM7 19a1.6 1.6 0 1 0 0-3.2A1.6 1.6 0 0 0 7 19Zm10 0a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2Z',
  bank:     'M3 10 12 4l9 6M5 10v8m4-8v8m6-8v8m4-8v8M3 20h18',
  card:     'M3 6h18v12H3zM3 10h18M6.5 14.5h3',
  upload:   'M12 16V4m0 0 4 4m-4-4-4 4M4 17v3h16v-3',
  download: 'M12 4v12m0 0 4-4m-4 4-4-4M4 17v3h16v-3',
  doc:      'M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h4',
  box:      'M3 8.5 12 4l9 4.5v7L12 20l-9-4.5zM3 8.5 12 13l9-4.5M12 13v7',
  tag:      'M3 12 12 3h8v8l-9 9zM16.5 7.5h.01',
  tool:     'M14.5 5.5a4 4 0 0 0 5 5L21 9l-6-6-1.5 1.5ZM13 8 4 17v3h3l9-9',
  clip:     'M20 11.5 12 19.5a4.5 4.5 0 1 1-6.4-6.4l8-8a3 3 0 0 1 4.2 4.2l-8 8a1.5 1.5 0 1 1-2.1-2.1l7.3-7.3',
  search:   'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM20 20l-4-4',
  info:     'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v5M12 7.6h.01',
  warn:     'M12 4 2.5 20h19L12 4ZM12 10v4M12 17h.01',
  mail2:    'M4 5h16v11H8l-4 4z',
}

export default function Ico({ n, size = 18, stroke = 1.6, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
         aria-hidden="true" style={{ flexShrink: 0, ...style }}>
      <path d={P[n]} />
    </svg>
  )
}
