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

/**
 * Identifie la famille correspondante pour une catégorie ou un libellé produit
 * @param {string} categoryOrFamily - Catégorie ou libellé de l'article
 * @param {Array} familiesList - Liste dynamique des familles disponibles
 * @returns {Object} Famille trouvée ou fallback
 */
export const getFamilyInfo = (categoryOrFamily, familiesList = DEFAULT_BARDAHL_FAMILIES) => {
  const families = (familiesList && familiesList.length > 0) ? familiesList : DEFAULT_BARDAHL_FAMILIES
  if (!categoryOrFamily) return families[0]
  
  const c = String(categoryOrFamily).toUpperCase().trim()

  // 1. Recherche par correspondance exacte de code ou label
  const exact = families.find(f => 
    f.code.toUpperCase() === c || 
    f.label.toUpperCase() === c ||
    c.includes(f.code.toUpperCase()) ||
    c.includes(f.label.toUpperCase())
  )
  if (exact) return exact

  // 2. Recherche par mots-clés métiers historiques Bardahl
  if (c.includes('ADDITIF') || c.includes('TRAITEMENT') || c.includes('INJECTEUR')) {
    const f = families.find(f => f.code === 'ADDITIFS')
    if (f) return f
  }
  if (c.includes('FLUIDE') || c.includes('LR') || c.includes('REFROIDISSEMENT') || c.includes('LAVE')) {
    const f = families.find(f => f.code === 'FLUIDES_LR')
    if (f) return f
  }
  if (c.includes('LUB') || c.includes('HUILE') || c.includes('AUTO') || c.includes('MOTO') || c.includes('10W40') || c.includes('5W30')) {
    const f = families.find(f => f.code === 'LUB_AUTO')
    if (f) return f
  }
  if (c.includes('AEROSOL') || c.includes('NETTOYANT') || c.includes('DEGRIPPANT') || c.includes('FREIN')) {
    const f = families.find(f => f.code === 'IND_AEROSOLS')
    if (f) return f
  }
  if (c.includes('GRAISSE') || c.includes('IND') || c.includes('ALIM') || c.includes('MAINTENANCE')) {
    const f = families.find(f => f.code === 'IND_GRAISSES')
    if (f) return f
  }

  // 3. Fallback dynamique
  return { 
    id: `fam_dyn_${c.replace(/\s+/g, '_')}`, 
    code: c, 
    label: categoryOrFamily, 
    icon: '🏷️', 
    color: '#8E8E93',
    isActive: true 
  }
}
