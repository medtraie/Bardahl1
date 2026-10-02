import { getFamilyInfo } from '../data/familiesData.js'

/**
 * Moteur Promotionnel Bardahl Maroc (Version Évoluée Paliers Dynamiques & Multi-Références)
 * 
 * Conforme aux spécifications du Rapport de Modifications Fonctionnelles :
 * - Évolution n°1 : Classification par familles administrables
 * - Évolution n°2 : Sélection de plusieurs références produit (Multi-références)
 * - Évolution n°3 : Paliers dynamiques de quantité de cartons avec remise (Tranches progressives)
 * - Évolution n°4 : Paliers quantité + carton gratuit (Option A Même Réf ou Option B Réf Distincte)
 * - Évolution n°5 : Paliers sur montant total en DH TTC
 * - Règle de non-cumul avec arbitrage automatique et choix du commercial
 * - Préservation des remises individuelles par produit et gratuités à 0,00 DH TTC
 */

/**
 * @typedef {Object} PromotionTier
 * @property {string} [id]
 * @property {number} min - Quantité ou montant de départ
 * @property {number|null} [max] - Quantité ou montant de fin (null = "et plus" / ∞)
 * @property {number} [threshold] - Rétrocompatibilité seuil unique
 * @property {number} discountPercent - Taux de remise (%)
 * @property {number} [freeQuantity] - Cartons gratuits
 * @property {number} [voucherAmount] - Bon d'achat immédiat (DH TTC)
 */

/**
 * @typedef {Object} Promotion
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string} type - 'TYPE_1' | 'TYPE_2' | 'TYPE_3' | 'TYPE_4'
 * @property {string} targetType - 'FAMILY' | 'PRODUCT'
 * @property {string} [targetFamily] - Nom de la famille/catégorie
 * @property {Array<string>} [targetProductRefs] - Multi-références ciblées
 * @property {string} [targetProductRef] - Rétrocompatibilité mono-référence
 * @property {string} [targetProductId]
 * @property {string} [targetProductName]
 * @property {number} [threshold] - Seuil de repli
 * @property {number} [discountPercent] - Taux de remise de repli
 * @property {string} [freeItemType] - 'SAME_PRODUCT' | 'DIFFERENT_PRODUCT'
 * @property {number} [freeQuantity] - Cartons gratuits de repli
 * @property {string} [freeProductId]
 * @property {string} [freeProductRef]
 * @property {string} [freeProductName]
 * @property {Array<PromotionTier>} [tiers] - Tranches dynamiques
 * @property {number} [voucherAmount] - Bon d'achat de repli
 * @property {boolean} isActive
 * @property {string} [startDate]
 * @property {string} [endDate]
 */

/**
 * Évalue les promotions applicables sur un ensemble d'articles commandés.
 * 
 * @param {Array} selectedProducts - Articles dans le panier de commande
 * @param {Array} allProducts - Catalogue complet des produits
 * @param {Array<Promotion>} promotions - Liste des promotions configurées
 * @param {Object} selectedChoices - Choix manuels faits par le commercial pour les conflits { [conflictKey]: promoId }
 * @param {string} selectedPromoId - 'AUTO' | 'NONE' | promoId
 * @returns {Object} Résultat complet de l'analyse promotionnelle
 */
export function evaluatePromotions(selectedProducts = [], allProducts = [], promotions = [], selectedChoices = {}, selectedPromoId = 'AUTO') {
  if (!selectedProducts || selectedProducts.length === 0 || !promotions || promotions.length === 0 || selectedPromoId === 'NONE') {
    return {
      appliedPromotions: [],
      candidatePromos: [],
      conflicts: [],
      lineDiscounts: {},
      totalDiscountFromPromos: 0,
      freeItems: [],
      voucherDiscount: 0,
      eligiblePromosCount: 0,
      selectedPromoStatus: selectedPromoId === 'NONE' ? { isNone: true } : null
    }
  }

  // 1. Indexer les produits avec leur catégorie/famille et métadonnées
  const productMetaMap = {}
  allProducts.forEach(p => {
    productMetaMap[p.id] = p
    if (p.reference) productMetaMap[p.reference] = p
    if (p.code) productMetaMap[p.code] = p
  })

  // 2. Calculer les statistiques par Famille et par Produit dans la commande
  const familyStats = {}
  const productStats = {}

  selectedProducts.forEach((item, idx) => {
    const qty = parseInt(item.qty || 1, 10)
    const priceTtc = parseFloat(item.priceTtc || 0)
    const lineTotal = priceTtc * qty

    const meta = productMetaMap[item.productId] || productMetaMap[item.reference] || {}
    const unitsPerBox = parseInt(item.unitsPerBox || meta.unitsPerBox || meta.unitsPerCarton || 1, 10) || 1
    // Règle fonctionnelle § 4 & 18.1 : Conversion des unités saisies en cartons éligibles complets
    const eligibleCartons = Math.floor(qty / unitsPerBox)
    const rawCategory = String(meta.category || item.category || 'AUTRES').trim()
    const famInfo = getFamilyInfo(rawCategory)
    const canonicalCode = (famInfo.code || 'AUTRES').toUpperCase()
    const famLabelUpper = (famInfo.label || 'AUTRES').toUpperCase()
    const rawUpper = rawCategory.toUpperCase()

    // Par famille (indexé sous tous les alias canoniques pour garantir la liaison fiche produit 100% effective)
    const familyKeys = Array.from(new Set([canonicalCode, famLabelUpper, rawUpper]))
    familyKeys.forEach(fKey => {
      if (!familyStats[fKey]) {
        familyStats[fKey] = { totalCartons: 0, totalUnits: 0, totalAmountTtc: 0, items: [] }
      }
      familyStats[fKey].totalCartons += eligibleCartons
      familyStats[fKey].totalUnits += qty
      familyStats[fKey].totalAmountTtc += lineTotal
      familyStats[fKey].items.push({ item, idx, eligibleCartons, unitsPerBox })
    })

    // Par produit individuel (par référence et ID)
    const prodKey = String(item.reference || item.productId || 'UNKNOWN').trim()
    if (!productStats[prodKey]) {
      productStats[prodKey] = { totalCartons: 0, totalUnits: 0, totalAmountTtc: 0, items: [] }
    }
    productStats[prodKey].totalCartons += eligibleCartons
    productStats[prodKey].totalUnits += qty
    productStats[prodKey].totalAmountTtc += lineTotal
    productStats[prodKey].items.push({ item, idx, eligibleCartons, unitsPerBox })
  })

  // 3. Calcul du statut de l'offre spécifique si une offre précise est sélectionnée
  let selectedPromoStatus = null
  if (selectedPromoId && selectedPromoId !== 'AUTO') {
    const chosenPromo = promotions.find(p => p.id === selectedPromoId)
    if (chosenPromo) {
      let currentVal = 0
      if (chosenPromo.targetType === 'FAMILY') {
        const rawTargetFam = String(chosenPromo.targetFamily || '').trim()
        const targetFamInfo = getFamilyInfo(rawTargetFam)
        const st = familyStats[targetFamInfo.code.toUpperCase()] || familyStats[targetFamInfo.label.toUpperCase()] || familyStats[rawTargetFam.toUpperCase()]
        currentVal = chosenPromo.type === 'TYPE_4' ? (st?.totalAmountTtc || 0) : (st?.totalCartons || 0)
      } else {
        // Multi-références ou mono-référence
        const targetRefs = (chosenPromo.targetProductRefs && Array.isArray(chosenPromo.targetProductRefs) && chosenPromo.targetProductRefs.length > 0)
          ? chosenPromo.targetProductRefs
          : (chosenPromo.targetProductRef ? [chosenPromo.targetProductRef] : (chosenPromo.targetProductId ? [chosenPromo.targetProductId] : []))
        
        let sumCartons = 0
        let sumAmount = 0
        selectedProducts.forEach(item => {
          const itemRef = String(item.reference || '').trim()
          const itemId = String(item.productId || '').trim()
          if (targetRefs.some(r => r === itemRef || r === itemId)) {
            const qty = parseInt(item.qty || 1, 10)
            const meta = productMetaMap[item.productId] || productMetaMap[item.reference] || {}
            const unitsPerBox = parseInt(item.unitsPerBox || meta.unitsPerBox || meta.unitsPerCarton || 1, 10) || 1
            const cartons = Math.floor(qty / unitsPerBox)
            const price = parseFloat(item.priceTtc || 0)
            sumCartons += cartons
            sumAmount += (price * qty)
          }
        })
        currentVal = chosenPromo.type === 'TYPE_4' ? sumAmount : sumCartons
      }

      // Seuil minimal pour débloquer le 1er palier avec avantage
      let minThreshold = chosenPromo.threshold || 10
      if (chosenPromo.tiers && Array.isArray(chosenPromo.tiers) && chosenPromo.tiers.length > 0) {
        // Trouver le premier palier qui apporte un avantage (> 0% remise ou > 0 gratuit ou > 0 bon)
        const avantageTiers = chosenPromo.tiers.filter(t => (t.discountPercent > 0 || (t.freeQuantity || 0) > 0 || (t.voucherAmount || 0) > 0))
        if (avantageTiers.length > 0) {
          minThreshold = Math.min(...avantageTiers.map(t => t.min !== undefined && t.min !== null ? parseFloat(t.min) : (t.threshold || 0)))
        } else {
          minThreshold = Math.min(...chosenPromo.tiers.map(t => t.min !== undefined && t.min !== null ? parseFloat(t.min) : (t.threshold || 0)))
        }
      }

      const isReached = currentVal >= minThreshold
      const missingValue = Math.max(0, minThreshold - currentVal)
      const unitLabel = chosenPromo.type === 'TYPE_4' ? 'DH TTC' : 'carton(s)'
      const targetLabel = chosenPromo.targetType === 'FAMILY' 
        ? `la famille ${chosenPromo.targetFamily}` 
        : (chosenPromo.targetProductRefs && chosenPromo.targetProductRefs.length > 1
            ? `${chosenPromo.targetProductRefs.length} réf. Bardahl`
            : (chosenPromo.targetProductName || chosenPromo.targetProductRef || 'ce produit'))

      selectedPromoStatus = {
        promo: chosenPromo,
        isReached,
        currentVal,
        threshold: minThreshold,
        missingValue,
        unitLabel,
        targetLabel
      }
    }
  }

  // 4. Identifier les promotions éligibles
  const candidatePromos = []
  const todayStr = new Date().toISOString().substring(0, 10)
  const activePromos = promotions.filter(p => {
    if (p.isActive === false) return false
    if (p.startDate && p.startDate > todayStr) return false
    if (p.endDate && p.endDate < todayStr) return false
    return true
  })
  const promosToEvaluate = (selectedPromoId && selectedPromoId !== 'AUTO')
    ? activePromos.filter(p => p.id === selectedPromoId)
    : activePromos

  promosToEvaluate.forEach(promo => {
    let isEligible = false
    let currentConditionValue = 0
    let applicableItems = []
    let appliedTier = null
    let targetKey = ''
    let targetDisplay = ''

    if (promo.targetType === 'FAMILY') {
      const rawTargetFam = String(promo.targetFamily || '').trim()
      const targetFamInfo = getFamilyInfo(rawTargetFam)
      targetKey = `FAM_${targetFamInfo.code}`
      targetDisplay = `Famille « ${targetFamInfo.label} »`

      const stats = familyStats[targetFamInfo.code.toUpperCase()] || familyStats[targetFamInfo.label.toUpperCase()] || familyStats[rawTargetFam.toUpperCase()]
      if (stats && stats.items.length > 0) {
        currentConditionValue = promo.type === 'TYPE_4' ? stats.totalAmountTtc : stats.totalCartons
        applicableItems = stats.items
      }
    } else {
      // Cible = Produit spécifique (Mono ou Multi-références)
      const targetRefs = (promo.targetProductRefs && Array.isArray(promo.targetProductRefs) && promo.targetProductRefs.length > 0)
        ? promo.targetProductRefs.map(r => String(r).trim())
        : (promo.targetProductRef ? [String(promo.targetProductRef).trim()] : (promo.targetProductId ? [String(promo.targetProductId).trim()] : []))

      targetKey = `PRODS_${targetRefs.slice().sort().join('_')}`
      targetDisplay = targetRefs.length > 1
        ? `${targetRefs.length} réf. Bardahl (${targetRefs.slice(0, 3).join(', ')}${targetRefs.length > 3 ? '...' : ''})`
        : (promo.targetProductName || targetRefs[0] || 'Produit')

      // Cumuler tous les articles du panier correspondant à ces références
      let matchedCartons = 0
      let matchedAmount = 0
      const matchedItems = []

      selectedProducts.forEach((item, idx) => {
        const itemRef = String(item.reference || item.productReference || '').trim()
        const itemId = String(item.productId || item.id || '').trim()
        const isMatch = targetRefs.some(ref => ref === itemRef || ref === itemId)
        if (isMatch) {
          const qty = parseInt(item.qty || 1, 10)
          const meta = productMetaMap[item.productId] || productMetaMap[item.reference] || {}
          const unitsPerBox = parseInt(item.unitsPerBox || meta.unitsPerBox || meta.unitsPerCarton || 1, 10) || 1
          const cartons = Math.floor(qty / unitsPerBox)
          const price = parseFloat(item.priceTtc || 0)
          matchedCartons += cartons
          matchedAmount += (price * qty)
          matchedItems.push({ item, idx, eligibleCartons: cartons, unitsPerBox })
        }
      })

      if (matchedItems.length > 0) {
        currentConditionValue = promo.type === 'TYPE_4' ? matchedAmount : matchedCartons
        applicableItems = matchedItems
      }
    }

    // Évaluation des seuils / tranches dynamiques
    if (applicableItems.length > 0) {
      if (promo.tiers && Array.isArray(promo.tiers) && promo.tiers.length > 0) {
        // Normaliser et trier les paliers par min croissant
        const normalizedTiers = promo.tiers.map(t => {
          const minVal = t.min !== undefined && t.min !== null && t.min !== ''
            ? parseFloat(t.min)
            : (t.threshold !== undefined ? parseFloat(t.threshold) : 0)
          const maxVal = (t.max !== undefined && t.max !== null && t.max !== '' && !isNaN(t.max))
            ? parseFloat(t.max)
            : null
          return {
            ...t,
            minVal,
            maxVal,
            discountPercent: parseFloat(t.discountPercent || 0),
            freeQuantity: parseInt(t.freeQuantity || 0, 10),
            voucherAmount: parseFloat(t.voucherAmount || 0)
          }
        }).sort((a, b) => a.minVal - b.minVal)

        // 1. Chercher la tranche exacte : currentConditionValue >= min && (max == null || currentConditionValue <= max)
        const matched = normalizedTiers.find(t => {
          if (currentConditionValue < t.minVal) return false
          if (t.maxVal !== null && currentConditionValue > t.maxVal) return false
          return true
        })

        // 2. Si la quantité/montant dépasse la dernière tranche configurée fermée, prendre le palier le plus élevé
        const highestTier = normalizedTiers[normalizedTiers.length - 1]
        const fallbackTier = (currentConditionValue >= highestTier.minVal) ? highestTier : null

        appliedTier = matched || fallbackTier

        // La promotion est applicable si elle accorde un avantage concret (remise > 0% ou gratuité > 0 ou bon > 0)
        if (appliedTier && (appliedTier.discountPercent > 0 || appliedTier.freeQuantity > 0 || appliedTier.voucherAmount > 0)) {
          isEligible = true
        }
      } else {
        // Seuil unique classique de repli
        const th = parseFloat(promo.threshold || 0)
        if (currentConditionValue >= th) {
          isEligible = true
        }
      }
    }

    if (isEligible) {
      let effectiveDiscount = appliedTier && appliedTier.discountPercent !== undefined 
        ? appliedTier.discountPercent 
        : parseFloat(promo.discountPercent || 0)
      let effectiveFreeQty = appliedTier && appliedTier.freeQuantity !== undefined 
        ? appliedTier.freeQuantity 
        : parseInt(promo.freeQuantity || 0, 10)
      let effectiveVoucher = appliedTier && appliedTier.voucherAmount !== undefined 
        ? appliedTier.voucherAmount 
        : parseFloat(promo.voucherAmount || 0)

      // Strict enforcement of Types (§ 12, § 13, § 14, § 18.8)
      if (promo.type === 'TYPE_1') {
        effectiveFreeQty = 0
        effectiveVoucher = 0
      } else if (promo.type === 'TYPE_3') {
        effectiveFreeQty = 0
        effectiveDiscount = 0
      } else if (promo.type === 'TYPE_4') {
        effectiveFreeQty = 0
        effectiveVoucher = 0
      } else if (promo.type === 'TYPE_2') {
        effectiveVoucher = 0
      }

      candidatePromos.push({
        promo,
        targetKey,
        targetDisplay,
        currentConditionValue,
        threshold: appliedTier ? appliedTier.minVal : promo.threshold,
        appliedTier,
        discountPercent: effectiveDiscount,
        freeQuantity: effectiveFreeQty,
        voucherAmount: effectiveVoucher,
        applicableItems
      })
    }
  })

  // 5. Gestion des Conflits & Non-Cumul sur une même cible
  const targetGroups = {}
  candidatePromos.forEach(cp => {
    if (!targetGroups[cp.targetKey]) {
      targetGroups[cp.targetKey] = []
    }
    targetGroups[cp.targetKey].push(cp)
  })

  const conflicts = []
  const retainedPromos = []

  Object.entries(targetGroups).forEach(([targetKey, group]) => {
    if (group.length === 1) {
      retainedPromos.push(group[0])
    } else {
      // Conflit : plusieurs promotions éligibles pour cette même cible
      const chosenPromoId = selectedChoices[targetKey]
      const chosen = group.find(cp => cp.promo.id === chosenPromoId)

      conflicts.push({
        targetKey,
        targetDisplay: group[0].targetDisplay,
        options: group,
        chosenPromoId: chosen ? chosen.promo.id : null
      })

      if (chosen) {
        retainedPromos.push(chosen)
      } else {
        // Sélectionner par défaut l'offre la plus avantageuse pour le client
        const sorted = [...group].sort((a, b) => {
          const scoreA = a.discountPercent + (a.freeQuantity * 5) + (a.voucherAmount / 20)
          const scoreB = b.discountPercent + (b.freeQuantity * 5) + (b.voucherAmount / 20)
          return scoreB - scoreA
        })
        retainedPromos.push(sorted[0])
      }
    }
  })

  // 6. Calcul des avantages concrets et application
  const lineDiscounts = {}
  let totalDiscountFromPromos = 0
  const freeItems = []
  let voucherDiscount = 0
  const appliedPromotions = []

  retainedPromos.forEach(cp => {
    const { promo, discountPercent, freeQuantity, voucherAmount, applicableItems, currentConditionValue, threshold, targetDisplay, appliedTier } = cp

    // A. Remise en % sur les articles de la cible
    let promoItemsSubtotal = 0
    if (discountPercent > 0 && applicableItems.length > 0) {
      applicableItems.forEach(({ item, idx }) => {
        lineDiscounts[idx] = Math.max(lineDiscounts[idx] || 0, discountPercent)
        const itemTotal = (item.priceTtc || 0) * (item.qty || 1)
        promoItemsSubtotal += itemTotal
        totalDiscountFromPromos += itemTotal * (discountPercent / 100)
      })
    }

    // B. Cartons gratuits (Type 2 uniquement, calcul strict non-cumulatif selon palier atteint)
    let giftSummary = null
    if (promo.type === 'TYPE_2' && freeQuantity > 0) {
      if (promo.freeItemType === 'SAME_PRODUCT') {
        const sourceItem = applicableItems[0]?.item
        if (sourceItem) {
          freeItems.push({
            productId: sourceItem.productId,
            reference: sourceItem.reference,
            productName: sourceItem.productName,
            qtyGratuit: freeQuantity,
            priceTtc: 0,
            promoId: promo.id,
            promoName: promo.name
          })
          giftSummary = `${freeQuantity} carton(s) offert(s) de ${sourceItem.productName} (Même réf. ${sourceItem.reference})`
        }
      } else {
        const giftMeta = productMetaMap[promo.freeProductId] || productMetaMap[promo.freeProductRef] || {}
        const giftRef = promo.freeProductRef || giftMeta.reference
        const giftName = promo.freeProductName || giftMeta.name

        // Règle § 10 & 18.6 : Aucun cadeau fictif ne doit être injecté si aucun produit cadeau n'est configuré
        if (giftRef || giftName) {
          freeItems.push({
            productId: promo.freeProductId || giftMeta.id || 'promo_gift',
            reference: giftRef || 'CADEAU',
            productName: giftName || 'Cadeau Promotionnel',
            qtyGratuit: freeQuantity,
            priceTtc: 0,
            promoId: promo.id,
            promoName: promo.name
          })
          giftSummary = `${freeQuantity} carton(s) offert(s) de ${giftName || giftRef}`
        }
      }
    }

    // C. Bon d'achat fixe immédiat (Type 3 uniquement, déduit globalement sur le bon de commande)
    if (promo.type === 'TYPE_3' && voucherAmount > 0) {
      voucherDiscount += voucherAmount
    }

    // Description lisible du palier appliqué
    const unitLabel = promo.type === 'TYPE_4' ? 'DH TTC' : 'cartons'
    let appliedTierInfo = null
    if (appliedTier) {
      const minTxt = appliedTier.minVal !== undefined ? appliedTier.minVal : appliedTier.threshold
      const maxTxt = (appliedTier.maxVal !== null && appliedTier.maxVal !== undefined) ? ` à ${appliedTier.maxVal}` : '+'
      const perks = []
      if (discountPercent > 0) perks.push(`${discountPercent}% remise`)
      if (freeQuantity > 0) perks.push(`${freeQuantity} carton(s) gratuit(s)`)
      if (voucherAmount > 0) perks.push(`Bon -${voucherAmount} DH`)
      appliedTierInfo = `Palier : ${minTxt}${maxTxt} ${unitLabel} → ${perks.join(' + ')}`
    }

    appliedPromotions.push({
      promoId: promo.id,
      name: promo.name,
      type: promo.type,
      targetDisplay,
      conditionReached: promo.type === 'TYPE_4'
        ? `${currentConditionValue.toFixed(2)} DH (Seuil : ${(threshold || 0).toFixed(2)} DH)`
        : `${currentConditionValue} carton(s) (Seuil : ${threshold || 0} cartons)`,
      appliedTierInfo,
      discountPercent,
      giftSummary,
      freeQuantity,
      voucherAmount,
      promoItemsSubtotal
    })
  })

  return {
    appliedPromotions,
    candidatePromos,
    conflicts,
    lineDiscounts,
    totalDiscountFromPromos,
    freeItems,
    voucherDiscount,
    eligiblePromosCount: appliedPromotions.length,
    selectedPromoStatus
  }
}
