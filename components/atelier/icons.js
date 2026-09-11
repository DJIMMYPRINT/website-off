// Icônes de l'atelier — même facture que la barre d'onglets du site :
// des traits, pas des emoji. Un emoji coloré se bat avec le dégradé sur une
// pastille active, et ne s'aligne pas sur la ligne de base du texte.

export const P = {
  inbox:   'M4 13h4l1.5 3h5L16 13h4M4 13 6.5 5h11L20 13v6H4z',
  today:   'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  next:    'M5 12h14M13 6l6 6-6 6',
  week:    'M4 6h16v14H4zM4 10h16M9 14h2M13 14h2M9 17h2',
  flag:    'M5 21V4m0 0 9 3-2 3 2 3-9 3',
  check:   'M4 12.5 9 17.5 20 6.5',
  done:    'M9 12l2 2 4-4M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',
  review:  'M12 9v4m0 4h.01M10.3 3.9 2.4 17.2A2 2 0 0 0 4.1 20h15.8a2 2 0 0 0 1.7-2.8L13.7 3.9a2 2 0 0 0-3.4 0z',
  mic:     'M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM19 11a7 7 0 0 1-14 0M12 18v3',
  stop:    'M7 7h10v10H7z',
  search:  'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  left:    'M15 6l-6 6 6 6',
  right:   'M9 6l6 6-6 6',
  close:   'M6 6l12 12M18 6 6 18',
  wa:      'M4 20l1.3-4A8 8 0 1 1 8 18.7z',
  tomorrow:'M12 8v4l2.5 2.5M21 12a9 9 0 1 1-9-9M17 3v4h4',
  trash:   'M5 7h14M10 7V5h4v2M6 7l1 13h10l1-13M10 11v6M14 11v6',
  note:    'M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h4',
  order:   'M4 6h2l2.2 9.5A2 2 0 0 0 10.2 17h7.4a2 2 0 0 0 2-1.6L21 8H7M10 21h.01M17 21h.01',
  keyboard:'M3 7h18v10H3zM7 11h.01M11 11h.01M15 11h.01M8 14h8',
  sparkle: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z',
}

export default function Icon({ d, size = 17, stroke = 1.7, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
         aria-hidden="true" style={style}>
      <path d={d} />
    </svg>
  )
}
