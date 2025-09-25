export type AttrType = 'string' | 'number' | 'date' | 'text'
export interface CustomAttr { key: string; label: string; type: AttrType }
export type CustomAttrsMap = Record<string, CustomAttr[]> // sectorKey -> attributes

const LS_KEY = 'afrigest_custom_attrs'

export function loadCustomAttrs(): CustomAttrsMap {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function saveCustomAttrs(map: CustomAttrsMap) {
  localStorage.setItem(LS_KEY, JSON.stringify(map))
}

export function mergeTemplates<T extends { key: string; name: string; attributes: CustomAttr[] }>(base: T[], custom: CustomAttrsMap): T[] {
  return base.map(t => ({
    ...t,
    attributes: [...(t.attributes || []), ...((custom[t.key] || []))]
  }))
}
