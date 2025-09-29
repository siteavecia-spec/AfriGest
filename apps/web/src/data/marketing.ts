export type Testimonial = {
  quote: string
  author: string
  role?: string
  logo?: string
}

export type Partner = {
  name: string
  logo?: string
  url?: string
}

export const testimonials: Testimonial[] = [
  {
    quote: "Nous avons réduit les erreurs de stock et gagné du temps en caisse. AfriGest est rapide, même avec une connexion faible.",
    author: "Boutique Textile",
    role: "Conakry",
  },
  {
    quote: "Le module e‑commerce nous a permis d'augmenter nos ventes en ligne sans changer nos habitudes.",
    author: "Cosmétiques & Beauté",
  },
  {
    quote: "Les tableaux de bord sont clairs. On sait chaque jour où on en est.",
    author: "Électroménager",
  },
]

// Allow overriding partner logos/links via env for official brand assets
const ENV: any = (import.meta as any)?.env || {}
const envLogo = (key: string, fallback: string) => String(ENV[key] || fallback)
const envLink = (key: string, fallback?: string) => (ENV[key] ? String(ENV[key]) : fallback)

export const partners: Partner[] = [
  {
    name: 'Stripe',
    logo: envLogo('VITE_LOGO_STRIPE_URL', '/partners/stripe.svg'),
    url: envLink('VITE_LINK_STRIPE', 'https://stripe.com')
  },
  {
    name: 'PayPal',
    logo: envLogo('VITE_LOGO_PAYPAL_URL', '/partners/paypal.svg'),
    url: envLink('VITE_LINK_PAYPAL', 'https://paypal.com')
  },
  {
    name: 'MTN MoMo',
    logo: envLogo('VITE_LOGO_MTN_URL', '/partners/mtn.svg'),
    url: envLink('VITE_LINK_MTN')
  },
  {
    name: 'Orange Money',
    logo: envLogo('VITE_LOGO_ORANGE_URL', '/partners/orange.svg'),
    url: envLink('VITE_LINK_ORANGE')
  },
  {
    name: 'AWS',
    logo: envLogo('VITE_LOGO_AWS_URL', '/partners/aws.svg'),
    url: envLink('VITE_LINK_AWS', 'https://aws.amazon.com')
  }
]
