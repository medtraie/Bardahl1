/**
 * Moteur Promotionnel Bardahl Maroc
 * Conforme au cahier des charges officiel :
 * - Type 1 : Quantité de cartons -> Remise (%)
 * - Type 2 : Quantité de cartons -> Remise (%) + Carton(s) gratuit(s) (Même réf [Opt A] ou Autre réf [Opt B], Paliers exclusifs)
 * - Type 3 : Quantité de cartons -> Remise (%) + Bon d'achat (Montant fixe DH déduit immédiatement)
 * - Type 4 : Montant total d'une famille -> Remise (%)
 * - Règle de non-cumul sur un même produit/famille avec arbitrage/choix du commercial
 */

/**
 * @typedef {Object} Promotion
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string} type - 'TYPE_1' | 'TYPE_2' | 'TYPE_3' | 'TYPE_4'
 * @property {string} targetType - 'FAMILY' | 'PRODUCT'
 * @property {string} [targetFamily] - Nom de la famille/catégorie (ex: 'ADDITIFS', 'LUBRIFIANTS AUTO')
 * @property {string} [targetProductId] - ID du produit spécifique
 * @property {string} [targetProductRef] - Référence du produit spécifique
 * @property {number} threshold - Seuil de cartons (Types 1, 2, 3) ou seuil de montant DH (Type 4)
 * @property {number} discountPercent - Taux de remise (%)
 * @property {string} [freeItemType] - 'SAME_PRODUCT' (Opt A) | 'DIFFERENT_PRODUCT' (Opt B)
 * @property {number} [freeQuantity] - Nombre de cartons gratuits
 * @property {string} [freeProductId] - ID du produit offert si DIFFERENT_PRODUCT
 * @property {string} [freeProductRef] - Référence du produit offert
 * @property {string} [freeProductName] - Nom du produit offert
 * @property {Array<{threshold: number, discountPercent: number, freeQuantity: number}>} [tiers] - Paliers exclusifs
 * @property {number} [voucherAmount] - Montant fixe du bon d'achat (DH) pour Type 3
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
 * @returns {Object} Résultat de l'analyse promotionnelle
 */
export function evaluatePromotions(selectedProducts = [], allProducts = [], promotions = [], selectedChoices = {}) {
  if (!selectedProducts || selectedProducts.length === 0 || !promotions || promotions.length === 0) {
    return {
      appliedPromotions: [],
      candidatePromos: [],
      conflicts: [],
      lineDiscounts: {},
      totalDiscountFromPromos: 0,
      freeItems: [],
      voucherDiscount: 0,
      eligiblePromosCount: 0
    }
  }

  // 1. Indexer les produits avec leur catégorie/famille
  const productMetaMap = {}
  allProducts.forEach(p => {
    productMetaMap[p.id] = p
    if (p.reference) productMetaMap[p.reference] = p
    if (p.code) productMetaMap[p.code] = p
  })

  // 2. Calculer les statistiques par Produit et par Famille dans la commande
  const familyStats = {}
  const productStats = {}

  selectedProducts.forEach((item, idx) => {
    const qty = parseInt(item.qty || 1, 10)
    const priceTtc = parseFloat(item.priceTtc || 0)
    const lineTotal = priceTtc * qty

    const meta = productMetaMap[item.productId] || productMetaMap[item.reference] || {}
    const family = (meta.category || item.category || 'AUTRES').toUpperCase()

    // Par famille
    if (!familyStats[family]) {
      familyStats[family] = { totalCartons: 0, totalAmountTtc: 0, items: [] }
    }
    familyStats[family].totalCartons += qty
    familyStats[family].totalAmountTtc += lineTotal
    familyStats[family].items.push({ item, idx })

    // Par produit
    const prodKey = item.productId || item.reference
    if (!productStats[prodKey]) {
      productStats[prodKey] = { totalCartons: 0, totalAmountTtc: 0, items: [] }
    }
    productStats[prodKey].totalCartons += qty
    productStats[prodKey].totalAmountTtc += lineTotal
    productStats[prodKey].items.push({ item, idx })
  })

  // 3. Identifier les promotions éligibles
  const candidatePromos = []

  promotions.filter(p => p.isActive !== false).forEach(promo => {
    let isEligible = false
    let currentConditionValue = 0
    let applicableItems = []
    let appliedTier = null

    if (promo.targetType === 'FAMILY') {
      const targetFam = (promo.targetFamily || '').toUpperCase()
      const stats = familyStats[targetFam]
      if (stats) {
        if (promo.type === 'TYPE_4') {
          // Type 4: Seuil de montant
          currentConditionValue = stats.totalAmountTtc
          if (currentConditionValue >= promo.threshold) {
            isEligible = true
            applicableItems = stats.items
          }
        } else {
          // Types 1, 2, 3: Seuil de cartons
          currentConditionValue = stats.totalCartons
          // Vérifier d'abord les paliers si configurés (Section 5)
          if (promo.tiers && promo.tiers.length > 0) {
            // Paliers exclusifs : palier le plus élevé atteint
            const sortedTiers = [...promo.tiers].sort((a, b) => b.threshold - a.threshold)
            const matchedTier = sortedTiers.find(t => currentConditionValue >= t.threshold)
            if (matchedTier) {
              isEligible = true
              appliedTier = matchedTier
              applicableItems = stats.items
            }
          } else if (currentConditionValue >= promo.threshold) {
            isEligible = true
            applicableItems = stats.items
          }
        }
      }
    } else {
      // Cible = Produit spécifique
      const prodKey = promo.targetProductId || promo.targetProductRef
      const stats = productStats[prodKey] || (promo.targetProductRef ? productStats[promo.targetProductRef] : null)
      if (stats) {
        currentConditionValue = stats.totalCartons
        if (promo.tiers && promo.tiers.length > 0) {
          const sortedTiers = [...promo.tiers].sort((a, b) => b.threshold - a.threshold)
          const matchedTier = sortedTiers.find(t => currentConditionValue >= t.threshold)
          if (matchedTier) {
            isEligible = true
            appliedTier = matchedTier
            applicableItems = stats.items
          }
        } else if (currentConditionValue >= promo.threshold) {
          isEligible = true
          applicableItems = stats.items
        }
      }
    }

    if (isEligible) {
      const effectiveDiscount = appliedTier ? appliedTier.discountPercent : promo.discountPercent
      const effectiveFreeQty = appliedTier ? appliedTier.freeQuantity : (promo.freeQuantity || 0)

      candidatePromos.push({
        promo,
        targetKey: promo.targetType === 'FAMILY' ? `FAM_${(promo.targetFamily || '').toUpperCase()}` : `PROD_${promo.targetProductId || promo.targetProductRef}`,
        targetDisplay: promo.targetType === 'FAMILY' ? `Famille « ${promo.targetFamily} »` : (promo.targetProductName || promo.targetProductRef || 'Produit'),
        currentConditionValue,
        threshold: appliedTier ? appliedTier.threshold : promo.threshold,
        appliedTier,
        discountPercent: effectiveDiscount,
        freeQuantity: effectiveFreeQty,
        voucherAmount: promo.voucherAmount || 0,
        applicableItems
      })
    }
  })

  // 4. Gestion des Conflits & Non-Cumul (Section 10 & 16)
  // Deux promotions ne doivent pas être cumulées sur un même produit/famille
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
        // Sélectionner par défaut la plus généreuse en remise %
        const sorted = [...group].sort((a, b) => (b.discountPercent + (b.freeQuantity * 5)) - (a.discountPercent + (a.freeQuantity * 5)))
        retainedPromos.push(sorted[0])
      }
    }
  })

  // 5. Calcul des avantages concrets
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

    // B. Cartons gratuits (Type 2)
    let giftSummary = null
    if (freeQuantity > 0 && promo.type === 'TYPE_2') {
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
        const giftRef = promo.freeProductRef || giftMeta.reference || 'PROMO-GIFT'
        const giftName = promo.freeProductName || giftMeta.name || 'Produit Cadeau Offert'

        freeItems.push({
          productId: promo.freeProductId || giftMeta.id || 'promo_gift',
          reference: giftRef,
          productName: giftName,
          qtyGratuit: freeQuantity,
          priceTtc: 0,
          promoId: promo.id,
          promoName: promo.name
        })
        giftSummary = `${freeQuantity} carton(s) offert(s) de ${giftName} (Réf. ${giftRef})`
      }
    }

    // C. Bon d'achat fixe (Type 3)
    if (voucherAmount > 0 && promo.type === 'TYPE_3') {
      voucherDiscount += voucherAmount
    }

    appliedPromotions.push({
      promoId: promo.id,
      name: promo.name,
      type: promo.type,
      targetDisplay,
      conditionReached: promo.type === 'TYPE_4'
        ? `${currentConditionValue.toFixed(2)} DH (Seuil : ${threshold.toFixed(2)} DH)`
        : `${currentConditionValue} carton(s) (Seuil : ${threshold} cartons)`,
      appliedTierInfo: appliedTier ? `Palier atteint : ${appliedTier.threshold} cartons (${appliedTier.discountPercent}% + ${appliedTier.freeQuantity} gratuit)` : null,
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
    eligiblePromosCount: appliedPromotions.length
  }
}
