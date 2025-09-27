export function setMetaDescription(content: string) {
  try {
    let tag = document.querySelector('meta[name="description"]') as HTMLMetaElement | null
    if (!tag) {
      tag = document.createElement('meta')
      tag.setAttribute('name', 'description')
      document.head.appendChild(tag)
    }
    tag.setAttribute('content', content)
  } catch {}
}

export function setDocumentTitle(title: string) {
  try { document.title = title } catch {}
}

export function setOpenGraph(params: { title?: string; description?: string; url?: string; image?: string; siteName?: string }) {
  try {
    const ensure = (p: string, v: string) => {
      let tag = document.querySelector(`meta[property="${p}"]`) as HTMLMetaElement | null
      if (!tag) { tag = document.createElement('meta'); tag.setAttribute('property', p); document.head.appendChild(tag) }
      tag.setAttribute('content', v)
    }
    if (params.title) ensure('og:title', params.title)
    if (params.description) ensure('og:description', params.description)
    if (params.url) ensure('og:url', params.url)
    if (params.image) ensure('og:image', params.image)
    if (params.siteName) ensure('og:site_name', params.siteName)
  } catch {}
}

export function setTwitterCard(params: { title?: string; description?: string; image?: string; site?: string; cardType?: 'summary'|'summary_large_image' }) {
  try {
    const ensure = (n: string, v: string) => {
      let tag = document.querySelector(`meta[name="${n}"]`) as HTMLMetaElement | null
      if (!tag) { tag = document.createElement('meta'); tag.setAttribute('name', n); document.head.appendChild(tag) }
      tag.setAttribute('content', v)
    }
    ensure('twitter:card', params.cardType || 'summary')
    if (params.title) ensure('twitter:title', params.title)
    if (params.description) ensure('twitter:description', params.description)
    if (params.image) ensure('twitter:image', params.image)
    if (params.site) ensure('twitter:site', params.site)
  } catch {}
}
