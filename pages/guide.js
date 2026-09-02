import Head from 'next/head'
import Link from 'next/link'
import { PRODUCTS } from '../lib/products'
import { WA, MIN_ORDER, VOLUME_DISCOUNTS, SIZES } from '../lib/constants'

// Guide gratuit — la ressource envoyée en message privé par les campagnes
// « commente GUIDE » (voir lib/campaigns.js). C'est une vraie page du site,
// indexable : elle sert autant au référencement qu'aux réseaux sociaux.
//
// Tous les chiffres sont calculés depuis lib/products.js et lib/constants.js.
// Reprix un produit et le guide suit — aucun prix n'est écrit en dur ici.

const METIERS = [
  { ic: '🍽️', metier: 'Restaurant, café', produits: ['Tablier', 'Polo', 'Chemise'], note: 'Tablier pour la salle et la cuisine, polo pour le service.' },
  { ic: '🏨', metier: 'Hôtel, réception', produits: ['Chemise', 'Gilet', 'Veste'], note: 'Chemise + gilet : le combo le plus habillé, sans surcoût.' },
  { ic: '🏭', metier: 'Industrie, chantier', produits: ['Gilet', 'Pantalon', 'Veste'], note: 'Gilet haute visibilité obligatoire sur beaucoup de sites.' },
  { ic: '🚚', metier: 'Livraison, terrain', produits: ['Polo', 'Casquette', 'Sweat à capuche'], note: 'Le logo sur la casquette est vu de loin et sur les photos.' },
  { ic: '🏪', metier: 'Commerce, boutique', produits: ['Polo', 'T-shirt', 'Sweat sans capuche'], note: 'T-shirt pour les périodes de forte rotation d\'équipe.' },
  { ic: '🎓', metier: 'École, association, événement', produits: ['T-shirt', 'Casquette', 'Sweat à capuche'], note: 'Sérigraphie : le coût par pièce s\'effondre au-delà de 100.' },
]

const TECHNIQUES = [
  { nom: 'Broderie',            durabilite: 'Excellente', couleurs: 'Jusqu\'à ~12 fils', ideal: 'Polo, chemise, veste, casquette', cout: 'Élevé', note: 'Le rendu le plus premium. Ne se décolle jamais.' },
  { nom: 'Sérigraphie',         durabilite: 'Très bonne', couleurs: '1 à 4 couleurs',    ideal: 'T-shirt, sweat, tablier',        cout: 'Bas en grande série', note: 'Frais de calage : intéressante à partir de ~50 pièces.' },
  { nom: 'Transfert numérique', durabilite: 'Bonne',      couleurs: 'Illimitées',        ideal: 'Logos complexes, dégradés',       cout: 'Moyen', note: 'La seule option fidèle pour un logo photo ou multicolore.' },
  { nom: 'Sublimation',         durabilite: 'Excellente', couleurs: 'Illimitées',        ideal: 'Polyester clair, maillots',       cout: 'Moyen', note: 'L\'encre entre dans la fibre : aucun relief au toucher.' },
  { nom: 'Flocage',             durabilite: 'Très bonne', couleurs: '1 à 2 couleurs',    ideal: 'Noms, numéros, dos de veste',     cout: 'Bas',   note: 'Effet velours, très lisible de loin.' },
]

const ERREURS = [
  ['Commander sans échantillon de couleur', 'Un « marine » varie d\'un tissu à l\'autre. Demandez une photo du coloris exact avant de lancer 100 pièces.'],
  ['Fournir un logo en basse définition', 'Une image récupérée sur Facebook sortira floue en broderie. Il faut du vectoriel (SVG) ou du PNG 300 dpi.'],
  ['Oublier les tailles extrêmes', 'Il y a toujours un XS et un 3XL dans une équipe. Les compter après coup coûte une deuxième livraison.'],
  ['Choisir la technique avant le vêtement', 'La sérigraphie ne tient pas sur toutes les matières. On choisit le vêtement, puis la technique.'],
  ['Mettre le logo trop grand', 'Sur un polo, un logo poitrine de 7 à 9 cm de large suffit. Au-delà, ça fait publicitaire, plus uniforme.'],
  ['Commander pile le nombre d\'employés', 'Prévoyez 10 à 15 % de plus : arrivées, casse, taches. Le réassort unitaire coûte bien plus cher.'],
]

const REPARTITION = [
  ['S', '10 %'], ['M', '25 %'], ['L', '30 %'], ['XL', '20 %'], ['XXL', '10 %'], ['3XL', '5 %'],
]

const card = {
  background: 'var(--surface)', border: '1px solid var(--line)',
  borderRadius: '14px', padding: '1.1rem 1.2rem',
}
const th = {
  textAlign: 'left', fontSize: '.7rem', fontWeight: 700, letterSpacing: '.06em',
  textTransform: 'uppercase', color: 'var(--muted-light)', padding: '.6rem .7rem',
  borderBottom: '1px solid var(--line)', whiteSpace: 'nowrap',
}
const td = {
  fontSize: '.82rem', padding: '.65rem .7rem', borderBottom: '1px solid var(--line)',
  color: 'var(--txt-soft)', verticalAlign: 'top',
}
const scroller = { overflowX: 'auto', border: '1px solid var(--line)', borderRadius: '14px', background: 'var(--surface)' }

const da = n => `${n.toLocaleString('fr-DZ')} DA`

export default function Guide() {
  // Exemple chiffré, calculé et non écrit en dur : 60 polos, remise volume
  // 50–99 pièces puis remise paiement anticipé, exactement comme /commande.
  const polo = PRODUCTS.find(p => p.name === 'Polo') || PRODUCTS[0]
  const qty = 60
  const brut = polo.price * qty
  const apresVolume = Math.round(brut * 0.95)
  const apresPaiement = apresVolume - Math.round(apresVolume * 0.1)

  const waGuide = `https://wa.me/${WA}?text=${encodeURIComponent(
    'Bonjour Djimmy Prints, j\'ai lu le guide et je voudrais équiper mon équipe.'
  )}`

  return (
    <>
      <Head>
        <title>Guide gratuit : équiper son équipe en tenues personnalisées — Djimmy Prints</title>
        <meta name="description" content="Guide gratuit : choisir le bon vêtement par métier, la bonne technique de marquage, préparer son logo, estimer son budget et répartir les tailles. Prix réels, minimum 20 pièces, livraison 58 wilayas." />
        <meta property="og:title" content="Guide gratuit : équiper son équipe en tenues personnalisées" />
        <meta property="og:description" content="Vêtement par métier, technique de marquage, logo, budget, tailles : tout ce qu'il faut décider avant de commander." />
      </Head>

      <div style={{padding:'1.6rem 1.15rem 2.5rem',position:'relative',zIndex:1,maxWidth:860,margin:'0 auto'}}>
        <p className="s-lbl">Guide gratuit</p>
        <h1 className="s-ttl">Équiper son équipe <span className="kw">sans se tromper</span></h1>
        <p className="s-desc">
          Cinq décisions à prendre avant de commander des tenues personnalisées : le vêtement,
          la technique de marquage, le logo, le budget et les tailles. Tout est ici, avec nos
          vrais prix — pas de formulaire à remplir pour lire la suite.
        </p>

        {/* ── 1. LE VÊTEMENT ── */}
        <h2 className="s-ttl" style={{fontSize:'1.35rem',marginTop:'2.6rem'}}>1. Le vêtement, par métier</h2>
        <p style={{fontSize:'.86rem',color:'var(--muted)',lineHeight:1.7,margin:'.6rem 0 1.1rem'}}>
          Partez de ce que vos équipes font réellement dans la journée, pas de ce qui est joli en photo.
        </p>
        <div className="cards-sm">
          {METIERS.map(m => (
            <div key={m.metier} style={card}>
              <div style={{fontSize:'1.4rem'}}>{m.ic}</div>
              <div style={{fontFamily:'var(--display)',fontSize:'1rem',margin:'.35rem 0 .45rem'}}>{m.metier}</div>
              <div style={{fontSize:'.8rem',color:'var(--txt-soft)',marginBottom:'.4rem'}}>
                {m.produits.map(nom => {
                  const p = PRODUCTS.find(x => x.name === nom)
                  return p ? `${p.name} (${da(p.price)})` : nom
                }).join(' · ')}
              </div>
              <div style={{fontSize:'.76rem',color:'var(--muted)',lineHeight:1.6}}>{m.note}</div>
            </div>
          ))}
        </div>

        {/* ── 2. LA TECHNIQUE ── */}
        <h2 className="s-ttl" style={{fontSize:'1.35rem',marginTop:'2.6rem'}}>2. La technique de marquage</h2>
        <p style={{fontSize:'.86rem',color:'var(--muted)',lineHeight:1.7,margin:'.6rem 0 1.1rem'}}>
          C'est la décision qui fait le plus varier le prix et la durée de vie du marquage.
        </p>
        <div style={scroller}>
          <table style={{width:'100%',borderCollapse:'collapse',minWidth:640}}>
            <thead>
              <tr>
                <th style={th}>Technique</th><th style={th}>Tenue dans le temps</th>
                <th style={th}>Couleurs</th><th style={th}>Idéal pour</th><th style={th}>Coût</th>
              </tr>
            </thead>
            <tbody>
              {TECHNIQUES.map(t => (
                <tr key={t.nom}>
                  <td style={{...td,fontWeight:700,color:'var(--txt)'}}>
                    {t.nom}
                    <div style={{fontWeight:400,fontSize:'.74rem',color:'var(--muted)',marginTop:'.25rem',maxWidth:230}}>{t.note}</div>
                  </td>
                  <td style={td}>{t.durabilite}</td>
                  <td style={td}>{t.couleurs}</td>
                  <td style={td}>{t.ideal}</td>
                  <td style={td}>{t.cout}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── 3. LE LOGO ── */}
        <h2 className="s-ttl" style={{fontSize:'1.35rem',marginTop:'2.6rem'}}>3. Préparer son logo</h2>
        <div className="grid-2" style={{marginTop:'1rem'}}>
          <div style={card}>
            <strong style={{fontSize:'.9rem'}}>Le fichier</strong>
            <ul style={{fontSize:'.83rem',color:'var(--txt-soft)',lineHeight:1.8,margin:'.5rem 0 0',paddingLeft:'1.1rem'}}>
              <li><strong>SVG</strong> ou <strong>AI</strong> : idéal, agrandissable à l'infini.</li>
              <li><strong>PNG 300 dpi</strong> minimum, fond transparent.</li>
              <li>Une capture d'écran ou une photo du logo ne suffit pas.</li>
              <li>Pas de fichier ? Nous vectorisons le vôtre.</li>
            </ul>
          </div>
          <div style={card}>
            <strong style={{fontSize:'.9rem'}}>Le placement</strong>
            <ul style={{fontSize:'.83rem',color:'var(--txt-soft)',lineHeight:1.8,margin:'.5rem 0 0',paddingLeft:'1.1rem'}}>
              <li>Poitrine gauche : 7 à 9 cm de large, la valeur sûre.</li>
              <li>Dos : nom de l'entreprise, lisible à 5 mètres.</li>
              <li>Manche : discret, pour un second logo ou un slogan.</li>
              <li>Casquette : face avant, broderie de préférence.</li>
            </ul>
          </div>
        </div>
        <p style={{fontSize:'.84rem',color:'var(--muted)',marginTop:'1rem',lineHeight:1.7}}>
          Vous pouvez tester le placement vous-même, en glissant votre logo sur le vêtement :{' '}
          <Link href="/catalogue" style={{color:'var(--vio)'}}>configurateur du catalogue</Link>.
        </p>

        {/* ── 4. LE BUDGET ── */}
        <h2 className="s-ttl" style={{fontSize:'1.35rem',marginTop:'2.6rem'}}>4. Le budget</h2>
        <p style={{fontSize:'.86rem',color:'var(--muted)',lineHeight:1.7,margin:'.6rem 0 1.1rem'}}>
          Minimum <strong>{MIN_ORDER} pièces</strong>. Les remises sont automatiques, elles ne se négocient pas :
          elles s'appliquent seules dès que la quantité est atteinte.
        </p>
        <div style={scroller}>
          <table style={{width:'100%',borderCollapse:'collapse',minWidth:420}}>
            <thead><tr><th style={th}>Quantité</th><th style={th}>Remise</th><th style={th}>Palier</th></tr></thead>
            <tbody>
              {VOLUME_DISCOUNTS.map(d => (
                <tr key={d.qty}>
                  <td style={{...td,fontWeight:700,color:'var(--txt)'}}>{d.qty} pièces</td>
                  <td style={td}>{d.dis}</td>
                  <td style={td}>{d.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{...card,marginTop:'1rem'}}>
          <strong style={{fontSize:'.9rem'}}>Exemple réel : {qty} polos brodés</strong>
          <div style={{fontSize:'.85rem',color:'var(--txt-soft)',lineHeight:2,marginTop:'.5rem'}}>
            <div>{qty} × {da(polo.price)} = <strong>{da(brut)}</strong></div>
            <div>− 5 % remise volume ({qty} pièces) → <strong>{da(apresVolume)}</strong></div>
            <div>− 10 % paiement anticipé (CCP / CIB) → <strong style={{color:'var(--ok)'}}>{da(apresPaiement)}</strong></div>
            <div style={{color:'var(--muted)',fontSize:'.8rem'}}>
              soit {da(Math.round(apresPaiement / qty))} par polo, logo brodé compris.
            </div>
          </div>
        </div>

        {/* ── 5. LES TAILLES ── */}
        <h2 className="s-ttl" style={{fontSize:'1.35rem',marginTop:'2.6rem'}}>5. Répartir les tailles</h2>
        <p style={{fontSize:'.86rem',color:'var(--muted)',lineHeight:1.7,margin:'.6rem 0 1rem'}}>
          Si vous n'avez pas encore relevé les tailles de chacun, cette répartition indicative
          évite les mauvaises surprises. Tailles disponibles : {SIZES.join(' · ')}.
        </p>
        <div style={{display:'flex',flexWrap:'wrap',gap:'.5rem'}}>
          {REPARTITION.map(([t, pct]) => (
            <div key={t} style={{...card,padding:'.7rem 1rem',minWidth:88,textAlign:'center'}}>
              <div style={{fontFamily:'var(--display)',fontSize:'1.1rem'}}>{t}</div>
              <div style={{fontSize:'.78rem',color:'var(--muted)'}}>{pct}</div>
            </div>
          ))}
        </div>

        {/* ── ERREURS ── */}
        <h2 className="s-ttl" style={{fontSize:'1.35rem',marginTop:'2.6rem'}}>Les 6 erreurs qui coûtent cher</h2>
        <div style={{display:'flex',flexDirection:'column',gap:'.6rem',marginTop:'1rem'}}>
          {ERREURS.map(([titre, texte], i) => (
            <div key={titre} style={card}>
              <strong style={{fontSize:'.88rem'}}>
                <span style={{color:'var(--vio)',marginRight:'.5rem'}}>{String(i + 1).padStart(2, '0')}</span>
                {titre}
              </strong>
              <div style={{fontSize:'.82rem',color:'var(--muted)',lineHeight:1.7,marginTop:'.3rem'}}>{texte}</div>
            </div>
          ))}
        </div>

        {/* ── CTA ── */}
        <div className="glass" style={{padding:'1.6rem',marginTop:'2.6rem',textAlign:'center'}}>
          <h2 style={{fontFamily:'var(--display)',fontSize:'1.3rem',marginBottom:'.5rem'}}>
            Prêt à chiffrer votre projet ?
          </h2>
          <p style={{fontSize:'.86rem',color:'var(--muted)',lineHeight:1.7,marginBottom:'1.2rem'}}>
            Devis gratuit, réponse sous 24 h. Livraison dans les 58 wilayas.
          </p>
          <div style={{display:'flex',gap:'.6rem',justifyContent:'center',flexWrap:'wrap'}}>
            <Link href="/devis" className="btn-g">Demander un devis</Link>
            <Link href="/catalogue" className="btn-outline">Voir le catalogue</Link>
            <a href={waGuide} target="_blank" rel="noopener noreferrer" className="btn-outline">WhatsApp</a>
          </div>
        </div>
      </div>
    </>
  )
}
