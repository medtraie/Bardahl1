/**
 * Familles Officielles de Produits Bardahl Maroc
 * Classification centralisée et administrable servant au catalogue,
 * au moteur de promotion et aux analyses décisionnelles.
 */

export const DEFAULT_BARDAHL_FAMILIES = [
  { 
    id: 'fam_additifs', 
    code: 'ADDITIFS', 
    label: 'Additifs & Traitements', 
    icon: '🧪', 
    color: '#007AFF', 
    description: 'Additifs carburant, huile, radiateur et traitements moteurs professionnels',
    isActive: true 
  },
  { 
    id: 'fam_fluides', 
    code: 'FLUIDES_LR', 
    label: 'Fluides & LR', 
    icon: '💧', 
    color: '#00C7BE', 
    description: 'Liquides de refroidissement, lave-glaces et liquides de freins',
    isActive: true 
  },
  { 
    id: 'fam_lubrifiants', 
    code: 'LUB_AUTO', 
    label: 'Lubrifiants Auto', 
    icon: '🛢️', 
    color: '#FFD000', 
    description: 'Huiles moteur synthétiques, semi-synthétiques, boîte et transmission',
    isActive: true 
  },
  { 
    id: 'fam_aerosols', 
    code: 'IND_AEROSOLS', 
    label: 'Aérosols & Nettoyants', 
    icon: '💨', 
    color: '#AF52DE', 
    description: 'Nettoyants freins, dégrippants, rénovateurs et aérosols techniques',
    isActive: true 
  },
  { 
    id: 'fam_graisses', 
    code: 'IND_GRAISSES', 
    label: 'Industrie & Graisses', 
    icon: '⚙️', 
    color: '#FF9500', 
    description: 'Graisses haute performance, maintenance industrielle et agricole',
    isActive: true 
  }
]

let _activeProductFamiliesCache = (() => {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('bardahl_product_families')
      if (saved) return JSON.parse(saved)
    }
  } catch (e) {}
  return DEFAULT_BARDAHL_FAMILIES
})()

export function setGlobalProductFamilies(list) {
  if (Array.isArray(list) && list.length > 0) {
    _activeProductFamiliesCache = list
  }
}

export function getGlobalProductFamilies() {
  return _activeProductFamiliesCache || DEFAULT_BARDAHL_FAMILIES
}

/**
 * Identifie la famille correspondante pour une catégorie ou un libellé produit
 * @param {string} categoryOrFamily - Catégorie ou libellé de l'article
 * @param {Array} familiesList - Liste dynamique des familles disponibles
 * @returns {Object} Famille trouvée ou fallback
 */
export const getFamilyInfo = (categoryOrFamily, familiesList = null) => {
  const families = (familiesList && familiesList.length > 0) 
    ? familiesList 
    : (_activeProductFamiliesCache && _activeProductFamiliesCache.length > 0 
        ? _activeProductFamiliesCache 
        : DEFAULT_BARDAHL_FAMILIES)

  if (!categoryOrFamily) return families[0]
  
  const c = String(categoryOrFamily).toUpperCase().trim()

  // Supabase Category UUID mappings
  const knownUuidMap = {
    'A0000000-0000-0000-0000-000000000001': 'LUB_AUTO',
    'A0000000-0000-0000-0000-000000000002': 'IND_GRAISSES',
    'A0000000-0000-0000-0000-000000000003': 'IND_AEROSOLS',
    'A0000000-0000-0000-0000-000000000004': 'IND_GRAISSES',
    'A0000000-0000-0000-0000-000000000005': 'FLUIDES_LR',
    'A0000000-0000-0000-0000-000000000006': 'FLUIDES_LR',
    '1FC40C43-AB74-41BC-919E-2268B742CB9A': 'ADDITIFS',
    '98A08F5A-C31B-496D-AD6B-44FD676B38AE': 'LUBRIFIANTS_MOTO',
    '397C5A02-FA1A-49F8-A05A-757AFAA00D01': 'LAVE_GLACE'
  }
  if (knownUuidMap[c]) {
    const f = families.find(f => f.code === knownUuidMap[c])
    if (f) return f
  }

  // 1. Recherche par correspondance exacte de code, label ou id
  const exact = families.find(f => 
    (f.code && f.code.toUpperCase() === c) || 
    (f.label && f.label.toUpperCase() === c) ||
    (f.id && f.id.toUpperCase() === c) ||
    (f.code && c.includes(f.code.toUpperCase())) ||
    (f.label && c.includes(f.label.toUpperCase()))
  )
  if (exact) return exact

  // 2. Recherche par mots-clés métiers historiques Bardahl
  if (c.includes('GRAISSE') || c.includes('IND_GRAISSE') || c.includes('ALIM') || c.includes('MAINTENANCE') || (c.includes('IND') && !c.includes('AEROSOL'))) {
    const f = families.find(f => f.code === 'IND_GRAISSES')
    if (f) return f
  }
  if (c.includes('ADDITIF') || c.includes('TRAITEMENT') || c.includes('INJECTEUR') || c.includes('SUMOLUB')) {
    const f = families.find(f => f.code === 'ADDITIFS')
    if (f) return f
  }
  if (c.includes('FLUIDE') || c.includes('LR') || c.includes('REFROIDISSEMENT') || c.includes('LAVE')) {
    const f = families.find(f => f.code === 'FLUIDES_LR') || families.find(f => f.code === 'LAVE_GLACE')
    if (f) return f
  }
  if (c.includes('MOTO')) {
    const f = families.find(f => f.code === 'LUBRIFIANTS_MOTO')
    if (f) return f
  }
  if (c.includes('LUB') || c.includes('HUILE') || c.includes('AUTO') || c.includes('10W40') || c.includes('5W30') || c.includes('5W40')) {
    const f = families.find(f => f.code === 'LUB_AUTO')
    if (f) return f
  }
  if (c.includes('AEROSOL') || c.includes('NETTOYANT') || c.includes('DEGRIPPANT') || c.includes('FREIN')) {
    const f = families.find(f => f.code === 'IND_AEROSOLS')
    if (f) return f
  }

  // 3. Fallback dynamique
  return { 
    id: `fam_dyn_${c.replace(/\s+/g, '_')}`, 
    code: c.replace(/\s+/g, '_'), 
    label: categoryOrFamily, 
    icon: '🏷️', 
    color: '#FFD000',
    description: `Famille ${categoryOrFamily}`,
    isActive: true 
  }
}

