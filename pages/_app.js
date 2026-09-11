import { useRouter } from 'next/router'
import '../styles/globals.css'
import '../styles/atelier.css'
import Layout from '../components/Layout'

// L'atelier (/atelier) est un poste de travail interne, pas une page du
// site : il n'a ni le bandeau promo, ni la barre d'onglets, ni le shell de
// 520 px qui donne au site sa forme de téléphone. Il apporte sa propre
// coquille et se passe donc de Layout — tout en partageant les mêmes jetons
// de couleur et la même typographie, importés ci-dessus pour les deux.

export default function App({ Component, pageProps }) {
  const router = useRouter()
  const bare = router.pathname.startsWith('/atelier')

  if (bare) return <Component {...pageProps} />

  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  )
}
