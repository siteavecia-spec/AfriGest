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

export const partners: Partner[] = [
  { name: 'Stripe', logo: '/partners/stripe.svg', url: 'https://stripe.com' },
  { name: 'PayPal', logo: '/partners/paypal.svg', url: 'https://paypal.com' },
  { name: 'MTN MoMo', logo: '/partners/mtn.svg' },
  { name: 'Orange Money', logo: '/partners/orange.svg' },
  { name: 'AWS', logo: '/partners/aws.svg', url: 'https://aws.amazon.com' },
]
