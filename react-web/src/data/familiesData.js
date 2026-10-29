/**
 * Familles Officielles de Produits Bardahl Maroc
 * Classification centralisée et administrable servant au catalogue,
 * au moteur de promotion et aux analyses décisionnelles.
 */

export const DEFAULT_BARDAHL_FAMILIES = [
  {
    id: 'fam_fa0001',
    code: 'FA0001',
    label: 'SPECIFIQUES LOCAL',
    icon: '🛠️',
    color: '#007AFF',
    description: 'Produits spécifiques de fabrication locale',
    isActive: true,
    sortOrder: 1
  },
  {
    id: 'fam_fa0004',
    code: 'FA0004',
    label: 'DEGRIPPANTS',
    icon: '💨',
    color: '#FF9500',
    description: 'Dégrippants et lubrifiants multifonctions',
    isActive: true,
    sortOrder: 2
  },
  {
    id: 'fam_fa0011',
    code: 'FA0011',
    label: 'GRAISSES INDUSTRIE LOCAL',
    icon: '⚙️',
    color: '#AF52DE',
    description: 'Graisses industrielles locales',
    isActive: true,
    sortOrder: 3
  },
  {
    id: 'fam_fa0012',
    code: 'FA0012',
    label: 'GRAISSES INDUSTRIE IMPORT',
    icon: '🛢️',
    color: '#5856D6',
    description: 'Graisses industrielles importées haute performance',
    isActive: true,
    sortOrder: 4
  },
  {
    id: 'fam_fa0013',
    code: 'FA0013',
    label: 'ADDITIFS LOCAL',
    icon: '🧪',
    color: '#34C759',
    description: 'Additifs moteur et fluides fabrication locale',
    isActive: true,
    sortOrder: 5
  },
  {
    id: 'fam_fa0014',
    code: 'FA0014',
    label: 'ADDITIFS HUILES ET B.V',
    icon: '🔬',
    color: '#FF2D55',
    description: 'Additifs pour huiles moteur et boîtes de vitesses',
    isActive: true,
    sortOrder: 6
  },
  {
    id: 'fam_fa0015',
    code: 'FA0015',
    label: 'ADDITIFS DIESEL',
    icon: '⛽',
    color: '#FF9500',
    description: 'Nettoyants injecteurs et additifs diesel',
    isActive: true,
    sortOrder: 7
  },
  {
    id: 'fam_fa0016',
    code: 'FA0016',
    label: 'ADDITIFS ESSENCE',
    icon: '⚡',
    color: '#FFCC00',
    description: 'Nettoyants injection, carburateur et additifs essence',
    isActive: true,
    sortOrder: 8
  },
  {
    id: 'fam_fa0017',
    code: 'FA0017',
    label: 'ADDITIFS TRAITEMENT RADIATEUR',
    icon: '❄️',
    color: '#00C7BE',
    description: 'Nettoyants et stop-fuites circuit de refroidissement',
    isActive: true,
    sortOrder: 9
  },
  {
    id: 'fam_fa0018',
    code: 'FA0018',
    label: 'LIQUIDES DE FREINS',
    icon: '🛑',
    color: '#FF3B30',
    description: 'Liquides de frein DOT 4 et DOT 5.1',
    isActive: true,
    sortOrder: 10
  },
  {
    id: 'fam_fa0020',
    code: 'FA0020',
    label: 'SPECIFIQUES IMPORT',
    icon: '📦',
    color: '#30B0C7',
    description: 'Produits et lubrifiants spécifiques importés',
    isActive: true,
    sortOrder: 11
  },
  {
    id: 'fam_fa0021',
    code: 'FA0021',
    label: 'SAVONS',
    icon: '🧼',
    color: '#64D2FF',
    description: 'Savons crème microbilles professionnels atelier',
    isActive: true,
    sortOrder: 12
  },
  {
    id: 'fam_fa0022',
    code: 'FA0022',
    label: 'ENTRETIEN',
    icon: '🧽',
    color: '#4CD964',
    description: 'Machines et produits de nettoyage et entretien',
    isActive: true,
    sortOrder: 13
  },
  {
    id: 'fam_fa0023',
    code: 'FA0023',
    label: 'HUILES BOITES DE VITESSES',
    icon: '⚙️',
    color: '#BF5AF2',
    description: 'Huiles de boîtes manuelles et automatiques ATF',
    isActive: true,
    sortOrder: 14
  },
  {
    id: 'fam_fa0024',
    code: 'FA0024',
    label: 'HUILES VOITURES',
    icon: '🚗',
    color: '#FFD000',
    description: 'Huiles moteur synthétiques et minérales véhicules légers',
    isActive: true,
    sortOrder: 15
  },
  {
    id: 'fam_fa0025',
    code: 'FA0025',
    label: 'LR XCL',
    icon: '💧',
    color: '#5AC8FA',
    description: 'Liquides de refroidissement technologie XCL',
    isActive: true,
    sortOrder: 16
  },
  {
    id: 'fam_fa0026',
    code: 'FA0026',
    label: 'LR LOCAL',
    icon: '🚰',
    color: '#32ADE6',
    description: 'Liquides de refroidissement et antigels locaux',
    isActive: true,
    sortOrder: 17
  },
  {
    id: 'fam_fa0027',
    code: 'FA0027',
    label: 'LAVE GLACE',
    icon: '🚘',
    color: '#007AFF',
    description: 'Lave-glaces été, hiver et concentrés',
    isActive: true,
    sortOrder: 18
  },
  {
    id: 'fam_fa0028',
    code: 'FA0028',
    label: 'HUILES CAMIONS',
    icon: '🚛',
    color: '#FF9500',
    description: 'Huiles moteur pour poids lourds et camions',
    isActive: true,
    sortOrder: 19
  },
  {
    id: 'fam_fa0029',
    code: 'FA0029',
    label: 'HUILES MOTO 4 TEMPS',
    icon: '🏍️',
    color: '#FF3B30',
    description: 'Huiles moteur moto et karting 4 temps',
    isActive: true,
    sortOrder: 20
  },
  {
    id: 'fam_fa0030',
    code: 'FA0030',
    label: 'HUILES MOTO 2 TEMPS',
    icon: '🛵',
    color: '#FF2D55',
    description: 'Huiles moteur moto et compétition 2 temps',
    isActive: true,
    sortOrder: 21
  },
  {
    id: 'fam_fa0031',
    code: 'FA0031',
    label: 'ENTRETIEN MOTO',
    icon: '🔧',
    color: '#FF9F0A',
    description: 'Lubrifiants chaîne, fourche et entretien 2-roues',
    isActive: true,
    sortOrder: 22
  },
  {
    id: 'fam_fa0032',
    code: 'FA0032',
    label: 'PLV & EMBALLAGES',
    icon: '🏷️',
    color: '#8E8E93',
    description: 'Présentoirs, étiquettes, emballages et accessoires',
    isActive: true,
    sortOrder: 23
  },
  {
    id: 'fam_fa0033',
    code: 'FA0033',
    label: 'COLLES',
    icon: '🧴',
    color: '#A2845E',
    description: 'Colles et pâtes de fixation industrielles',
    isActive: true,
    sortOrder: 24
  },
  {
    id: 'fam_fa0034',
    code: 'FA0034',
    label: 'LR LOCAL 20L',
    icon: '🪣',
    color: '#30B0C7',
    description: 'Liquides de refroidissement locaux bidons 20L',
    isActive: true,
    sortOrder: 25
  },
  {
    id: 'fam_fa0035',
    code: 'FA0035',
    label: 'ADBLUE',
    icon: '🔵',
    color: '#0A84FF',
    description: 'Solution AdBlue dépollution diesel',
    isActive: true,
    sortOrder: 26
  },
  {
    id: 'fam_fa0036',
    code: 'FA0036',
    label: 'LR XCL 20L',
    icon: '🟦',
    color: '#5E5CE6',
    description: 'Liquides de refroidissement XCL bidons 20L',
    isActive: true,
    sortOrder: 27
  },
  {
    id: 'fam_fa0037',
    code: 'FA0037',
    label: 'LG250ML',
    icon: '🧪',
    color: '#64D2FF',
    description: 'Doses concentrées lave-glace 250ml',
    isActive: true,
    sortOrder: 28
  },
  {
    id: 'fam_fa0038',
    code: 'FA0038',
    label: 'GRAISSES INDUSTRIE LOCAL VRAC18180',
    icon: '🏭',
    color: '#D1A153',
    description: 'Graisses industrielles locales en fûts 18kg et 180kg',
    isActive: true,
    sortOrder: 29
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
 * @param {string} categoryOrFamily - Catégorie ou code famille
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

  // 1. Recherche par correspondance exacte de code (FA0001, etc.), label ou id
  const exact = families.find(f => 
    (f.code && f.code.toUpperCase() === c) || 
    (f.label && f.label.toUpperCase() === c) ||
    (f.id && f.id.toUpperCase() === c)
  )
  if (exact) return exact

  // 2. Mappings historiques de compatibilité
  const legacyMap = {
    'ADDITIFS': 'FA0015',
    'FLUIDES_LR': 'FA0025',
    'LUB_AUTO': 'FA0024',
    'IND_GRAISSES': 'FA0012',
    'IND_AEROSOLS': 'FA0004',
    'LUBRIFIANTS_MOTO': 'FA0029',
    'LAVE_GLACE': 'FA0027',
    'ADBLUE': 'FA0035'
  }
  if (legacyMap[c]) {
    const f = families.find(f => f.code === legacyMap[c])
    if (f) return f
  }

  // 3. Recherche partielle de code ou label
  const partial = families.find(f => 
    (f.code && c.includes(f.code.toUpperCase())) ||
    (f.label && c.includes(f.label.toUpperCase()))
  )
  if (partial) return partial

  // 4. Mots-clés métiers Bardahl
  if (c.includes('GRAISSE')) {
    return families.find(f => f.code === 'FA0011' || f.code === 'FA0012') || families[0]
  }
  if (c.includes('ADDITIF')) {
    return families.find(f => f.code === 'FA0015' || f.code === 'FA0016' || f.code === 'FA0013') || families[0]
  }
  if (c.includes('LR') || c.includes('REFROIDISSEMENT') || c.includes('ANTIGEL')) {
    return families.find(f => f.code === 'FA0025' || f.code === 'FA0026') || families[0]
  }
  if (c.includes('MOTO')) {
    return families.find(f => f.code === 'FA0029' || f.code === 'FA0030' || f.code === 'FA0031') || families[0]
  }
  if (c.includes('HUILE') || c.includes('LUB')) {
    return families.find(f => f.code === 'FA0024' || f.code === 'FA0023' || f.code === 'FA0028') || families[0]
  }

  // Fallback dynamique
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
