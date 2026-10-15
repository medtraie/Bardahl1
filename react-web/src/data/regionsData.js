/**
 * Gestion Géographique & Régions Officielles du Maroc — Bardahl Maroc
 * COM-01 & COM-02:
 * 12 Régions de référence avec leurs villes rattachées,
 * support de l'ajout de nouvelles régions personnalisées,
 * et fonctions utilitaires d'affectation et de filtrage.
 */

export const DEFAULT_MOROCCAN_REGIONS = [
  {
    id: 'reg_beni_mellal',
    name: 'Béni Mellal-Khénifra',
    color: '#10B981',
    cities: ['Béni Mellal', 'Khénifra', 'Khouribga', 'Fquih Ben Salah', 'Azilal', 'Kasba Tadla', 'Oued Zem', 'Souk Sebt']
  },
  {
    id: 'reg_casa_settat',
    name: 'Casablanca-Settat',
    color: '#FFD000',
    cities: ['Casablanca', 'Mohammedia', 'Settat', 'Berrechid', 'El Jadida', 'Benslimane', 'Nouaceur', 'Médiouna', 'Sidi Bennour', 'Bouznika']
  },
  {
    id: 'reg_dakhla',
    name: 'Dakhla-Oued Ed Dahab',
    color: '#06B6D4',
    cities: ['Dakhla', 'Aousserd']
  },
  {
    id: 'reg_draa_tafilalet',
    name: 'Drâa-Tafilalet',
    color: '#F97316',
    cities: ['Errachidia', 'Ouarzazate', 'Tinghir', 'Midelt', 'Zagora', 'Erfoud', 'Rissani']
  },
  {
    id: 'reg_fes_meknes',
    name: 'Fès-Meknès',
    color: '#F59E0B',
    cities: ['Fès', 'Meknès', 'Taza', 'Sefrou', 'Ifrane', 'Moulay Yacoub', 'Boulemane', 'Taounate', 'El Hajeb', 'Azrou']
  },
  {
    id: 'reg_guelmim',
    name: 'Guelmim-Oued Noun',
    color: '#EC4899',
    cities: ['Guelmim', 'Tan-Tan', 'Sidi Ifni', 'Assa-Zag']
  },
  {
    id: 'reg_oriental',
    name: "L’Oriental",
    color: '#84CC16',
    cities: ['Oujda', 'Nador', 'Berkane', 'Taourirt', 'Jerada', 'Driouch', 'Guercif', 'Figuig', 'Saïdia']
  },
  {
    id: 'reg_laayoune',
    name: 'Laâyoune-Sakia El Hamra',
    color: '#6366F1',
    cities: ['Laâyoune', 'Boujdour', 'Tarfaya', 'Es-Semara']
  },
  {
    id: 'reg_marrakech_safi',
    name: 'Marrakech-Safi',
    color: '#EF4444',
    cities: ['Marrakech', 'Safi', 'Essaouira', 'El Kelâa des Sraghna', 'Chichaoua', 'Youssoufia', 'Ben Guerir', 'Rhamna']
  },
  {
    id: 'reg_tanger_tetouan',
    name: 'Tanger-Tétouan-Al Hoceïma',
    color: '#8B5CF6',
    cities: ['Tanger', 'Tétouan', 'Al Hoceïma', 'Larache', 'Ksar El Kébir', 'Chefchaouen', 'Asilah', "M'diq", 'Fnideq', 'Ouazzane']
  },
  {
    id: 'reg_souss_massa',
    name: 'Souss-Massa',
    color: '#14B8A6',
    cities: ['Agadir', 'Inezgane', 'Aït Melloul', 'Taroudant', 'Tiznit', 'Chtouka Aït Baha', 'Tata', 'Biougra']
  },
  {
    id: 'reg_rabat_sale_kenitra',
    name: 'Rabat-Salé-Kénitra',
    color: '#3B82F6',
    cities: ['Rabat', 'Salé', 'Kénitra', 'Témara', 'Skhirat', 'Khémisset', 'Sidi Kacem', 'Sidi Slimane', 'Tiflet']
  }
]

const STORAGE_KEY = 'bardahl_moroccan_regions'

/**
 * Récupère la liste des régions (12 officielles + régions personnalisées ajoutées)
 */
export function getStoredRegions() {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Fusionner avec DEFAULT pour garantir que les 12 régions sont toujours présentes
          const map = new Map()
          DEFAULT_MOROCCAN_REGIONS.forEach(r => map.set(r.name.toLowerCase().trim(), r))
          parsed.forEach(r => {
            const key = (r.name || '').toLowerCase().trim()
            if (map.has(key)) {
              const existing = map.get(key)
              // Merge cities without duplicates
              const mergedCities = Array.from(new Set([...(existing.cities || []), ...(r.cities || [])]))
              map.set(key, { ...existing, ...r, cities: mergedCities })
            } else {
              map.set(key, r)
            }
          })
          return Array.from(map.values())
        }
      }
    }
  } catch (e) {
    console.warn('Erreur lecture régions stockées:', e)
  }
  return DEFAULT_MOROCCAN_REGIONS
}

/**
 * Sauvegarde la liste des régions
 */
export function saveStoredRegions(regions) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(regions))
    }
  } catch (e) {
    console.error('Erreur sauvegarde régions:', e)
  }
}

/**
 * Ajoute une nouvelle région de travail
 */
export function addCustomRegion(regionName, cities = [], color = '#EAB308') {
  if (!regionName || !regionName.trim()) return null
  const cleanName = regionName.trim()
  const currentList = getStoredRegions()
  const exists = currentList.find(r => r.name.toLowerCase().trim() === cleanName.toLowerCase())
  if (exists) {
    // Add any new cities to existing region
    const newCities = Array.from(new Set([...(exists.cities || []), ...cities.map(c => c.trim()).filter(Boolean)]))
    const updated = currentList.map(r => r.id === exists.id ? { ...r, cities: newCities } : r)
    saveStoredRegions(updated)
    return exists
  }
  const newRegion = {
    id: 'reg_custom_' + Date.now(),
    name: cleanName,
    color: color || '#EAB308',
    cities: cities.map(c => c.trim()).filter(Boolean)
  }
  const updatedList = [...currentList, newRegion]
  saveStoredRegions(updatedList)
  return newRegion
}

/**
 * Trouve la région correspondante à une ville donnée
 */
export function getRegionForCity(cityOrRegionName, customRegions = null) {
  if (!cityOrRegionName) return 'Casablanca-Settat'
  const text = String(cityOrRegionName).toLowerCase().trim()
  const regions = customRegions || getStoredRegions()

  // 1. Match exact de nom de région
  const exactRegion = regions.find(r => r.name.toLowerCase().trim() === text)
  if (exactRegion) return exactRegion.name

  // 2. Match de ville dans la région
  for (const r of regions) {
    if (Array.isArray(r.cities)) {
      for (const city of r.cities) {
        const cLower = city.toLowerCase().trim()
        if (text === cLower || text.includes(cLower) || cLower.includes(text)) {
          return r.name
        }
      }
    }
  }

  // 3. Heuristiques marocaines étendues
  if (text.includes('casa') || text.includes('settat') || text.includes('mohammedia') || text.includes('berrechid') || text.includes('jadida')) {
    return 'Casablanca-Settat'
  }
  if (text.includes('rabat') || text.includes('salé') || text.includes('sale') || text.includes('kénitra') || text.includes('kenitra') || text.includes('témara') || text.includes('temara')) {
    return 'Rabat-Salé-Kénitra'
  }
  if (text.includes('tanger') || text.includes('tétouan') || text.includes('tetouan') || text.includes('larache') || text.includes('hoceima')) {
    return 'Tanger-Tétouan-Al Hoceïma'
  }
  if (text.includes('marrakech') || text.includes('safi') || text.includes('essaouira')) {
    return 'Marrakech-Safi'
  }
  if (text.includes('agadir') || text.includes('inezgane') || text.includes('taroudant') || text.includes('tiznit') || text.includes('souss')) {
    return 'Souss-Massa'
  }
  if (text.includes('fès') || text.includes('fes') || text.includes('meknès') || text.includes('meknes') || text.includes('taza')) {
    return 'Fès-Meknès'
  }
  if (text.includes('oujda') || text.includes('nador') || text.includes('berkane') || text.includes('oriental')) {
    return "L’Oriental"
  }
  if (text.includes('béni') || text.includes('beni') || text.includes('khénifra') || text.includes('khenifra') || text.includes('khouribga')) {
    return 'Béni Mellal-Khénifra'
  }
  if (text.includes('dakhla') || text.includes('aousserd')) {
    return 'Dakhla-Oued Ed Dahab'
  }
  if (text.includes('laâyoune') || text.includes('laayoune') || text.includes('boujdour') || text.includes('tarfaya') || text.includes('semara')) {
    return 'Laâyoune-Sakia El Hamra'
  }
  if (text.includes('guelmim') || text.includes('tan-tan') || text.includes('tantan') || text.includes('ifni')) {
    return 'Guelmim-Oued Noun'
  }
  if (text.includes('errachidia') || text.includes('ouarzazate') || text.includes('tinghir') || text.includes('zagora') || text.includes('midelt') || text.includes('draa')) {
    return 'Drâa-Tafilalet'
  }

  return 'Casablanca-Settat'
}

/**
 * Retourne la liste unique de toutes les villes associées aux régions fournies
 */
export function getCitiesForRegions(regionNames = [], customRegions = null) {
  if (!Array.isArray(regionNames) || regionNames.length === 0) return []
  const regions = customRegions || getStoredRegions()
  const citiesSet = new Set()

  regionNames.forEach(rName => {
    const reg = regions.find(r => r.name.toLowerCase().trim() === String(rName).toLowerCase().trim())
    if (reg && Array.isArray(reg.cities)) {
      reg.cities.forEach(c => citiesSet.add(c))
    }
  })

  return Array.from(citiesSet)
}
