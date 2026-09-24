package com.bardahl.maroc.util

import com.bardahl.maroc.domain.model.*

data class CandidatePromo(
    val promo: Promotion,
    val targetKey: String,
    val targetDisplay: String,
    val currentConditionValue: Double,
    val threshold: Double,
    val appliedTier: PromotionTier?,
    val discountPercent: Double,
    val freeQuantity: Int,
    val voucherAmount: Double,
    val applicableIndices: List<Int>
)

data class PromotionConflict(
    val targetKey: String,
    val targetDisplay: String,
    val options: List<CandidatePromo>
)

data class PromotionResult(
    val appliedPromotions: List<AppliedPromotionInfo> = emptyList(),
    val candidatePromos: List<CandidatePromo> = emptyList(),
    val conflicts: List<PromotionConflict> = emptyList(),
    val lineDiscounts: Map<Int, Double> = emptyMap(),
    val totalDiscountFromPromos: Double = 0.0,
    val freeItems: List<OrderItem> = emptyList(),
    val voucherDiscount: Double = 0.0
)

object PromotionEngine {

    val defaultPromotions: List<Promotion> = listOf(
        Promotion(
            id = "promo_1",
            name = "Offre Volume Additifs (5% dès 10 cartons)",
            description = "À partir de 10 cartons achetés dans la famille Additifs -> 5% de remise sur la famille.",
            type = PromotionType.TYPE_1,
            targetType = PromoTargetType.FAMILY,
            targetFamily = "ADDITIFS",
            threshold = 10.0,
            discountPercent = 5.0
        ),
        Promotion(
            id = "promo_2a",
            name = "Promo XTRA 10W40 (5% + 1 Offert Même Réf)",
            description = "Dès 10 cartons de XTRA 10W40 -> 5% remise + 1 carton gratuit identique.",
            type = PromotionType.TYPE_2,
            targetType = PromoTargetType.PRODUCT,
            targetProductRef = "34131",
            targetProductName = "Bardahl XTRA 10W40 1L",
            threshold = 10.0,
            discountPercent = 5.0,
            freeItemType = FreeItemType.SAME_PRODUCT,
            freeQuantity = 1
        ),
        Promotion(
            id = "promo_2b",
            name = "Offre Lubrifiants (5% + 2 Plasma Booster Offerts)",
            description = "Dès 10 cartons de Lubrifiants Auto -> 5% remise + 2 cartons Plasma Booster offerts.",
            type = PromotionType.TYPE_2,
            targetType = PromoTargetType.FAMILY,
            targetFamily = "LUBRIFIANTS AUTO",
            threshold = 10.0,
            discountPercent = 5.0,
            freeItemType = FreeItemType.DIFFERENT_PRODUCT,
            freeProductRef = "2530B",
            freeProductName = "PLASMA OIL BOOSTER (2530B)",
            freeQuantity = 2
        ),
        Promotion(
            id = "promo_tiers",
            name = "Paliers Progressifs Graisses (10/20/30 cartons)",
            description = "Paliers exclusifs : 10 cartons = 5% + 1 | 20 cartons = 7% + 2 | 30 cartons = 10% + 3 offerts.",
            type = PromotionType.TYPE_2,
            targetType = PromoTargetType.FAMILY,
            targetFamily = "GRAISSES",
            threshold = 10.0,
            freeItemType = FreeItemType.SAME_PRODUCT,
            tiers = listOf(
                PromotionTier(threshold = 10, discountPercent = 5.0, freeQuantity = 1),
                PromotionTier(threshold = 20, discountPercent = 7.0, freeQuantity = 2),
                PromotionTier(threshold = 30, discountPercent = 10.0, freeQuantity = 3)
            )
        ),
        Promotion(
            id = "promo_3",
            name = "Pack Atelier Pro (5% + Bon d'Achat 100 DH)",
            description = "Dès 10 cartons Produits Atelier -> 5% remise + 100 DH déduit immédiatement.",
            type = PromotionType.TYPE_3,
            targetType = PromoTargetType.FAMILY,
            targetFamily = "PRODUITS ATELIER",
            threshold = 10.0,
            discountPercent = 5.0,
            voucherAmount = 100.0
        ),
        Promotion(
            id = "promo_4",
            name = "Challenge CA Additifs (Dès 5 000 DH)",
            description = "Dès 5 000 DH d'achat dans la famille Additifs -> 5% de remise sur toute la famille.",
            type = PromotionType.TYPE_4,
            targetType = PromoTargetType.FAMILY,
            targetFamily = "ADDITIFS",
            threshold = 5000.0,
            discountPercent = 5.0
        )
    )

    fun evaluatePromotions(
        items: List<OrderItem>,
        allProducts: List<Product>,
        promotions: List<Promotion> = defaultPromotions,
        selectedChoices: Map<String, String> = emptyMap()
    ): PromotionResult {
        if (items.isEmpty() || promotions.isEmpty()) return PromotionResult()

        // Index products by ID, Ref, Code
        val productMap = mutableMapOf<String, Product>()
        allProducts.forEach { p ->
            productMap[p.id] = p
            productMap[p.reference] = p
            productMap[p.code] = p
        }

        // Aggregate by Family and by Product
        data class ItemStat(var totalCartons: Int = 0, var totalAmountTtc: Double = 0.0, val indices: MutableList<Int> = mutableListOf())
        val familyStats = mutableMapOf<String, ItemStat>()
        val productStats = mutableMapOf<String, ItemStat>()

        items.forEachIndexed { idx, item ->
            val qty = item.quantity
            val lineTotal = item.unitPriceTtc * qty
            val meta = productMap[item.productId] ?: productMap[item.productReference]
            val family = (meta?.categoryId ?: "AUTRES").uppercase()

            val fStat = familyStats.getOrPut(family) { ItemStat() }
            fStat.totalCartons += qty
            fStat.totalAmountTtc += lineTotal
            fStat.indices.add(idx)

            val pKey = item.productId.ifEmpty { item.productReference }
            val pStat = productStats.getOrPut(pKey) { ItemStat() }
            pStat.totalCartons += qty
            pStat.totalAmountTtc += lineTotal
            pStat.indices.add(idx)

            if (item.productReference.isNotEmpty() && item.productReference != pKey) {
                val refStat = productStats.getOrPut(item.productReference) { ItemStat() }
                refStat.totalCartons += qty
                refStat.totalAmountTtc += lineTotal
                refStat.indices.add(idx)
            }
        }

        // Find candidate eligible promotions
        val candidates = mutableListOf<CandidatePromo>()

        promotions.filter { it.isActive }.forEach { promo ->
            var isEligible = false
            var currentVal = 0.0
            var applicableIndices = emptyList<Int>()
            var appliedTier: PromotionTier? = null

            if (promo.targetType == PromoTargetType.FAMILY) {
                val targetFam = (promo.targetFamily ?: "").uppercase()
                val stat = familyStats[targetFam]
                if (stat != null) {
                    if (promo.type == PromotionType.TYPE_4) {
                        currentVal = stat.totalAmountTtc
                        if (currentVal >= promo.threshold) {
                            isEligible = true
                            applicableIndices = stat.indices
                        }
                    } else {
                        currentVal = stat.totalCartons.toDouble()
                        if (promo.tiers.isNotEmpty()) {
                            val sortedTiers = promo.tiers.sortedByDescending { it.threshold }
                            val matched = sortedTiers.firstOrNull { currentVal >= it.threshold }
                            if (matched != null) {
                                isEligible = true
                                appliedTier = matched
                                applicableIndices = stat.indices
                            }
                        } else if (currentVal >= promo.threshold) {
                            isEligible = true
                            applicableIndices = stat.indices
                        }
                    }
                }
            } else {
                val pKey = promo.targetProductId ?: promo.targetProductRef ?: ""
                val stat = productStats[pKey]
                if (stat != null) {
                    currentVal = stat.totalCartons.toDouble()
                    if (promo.tiers.isNotEmpty()) {
                        val sortedTiers = promo.tiers.sortedByDescending { it.threshold }
                        val matched = sortedTiers.firstOrNull { currentVal >= it.threshold }
                        if (matched != null) {
                            isEligible = true
                            appliedTier = matched
                            applicableIndices = stat.indices
                        }
                    } else if (currentVal >= promo.threshold) {
                        isEligible = true
                        applicableIndices = stat.indices
                    }
                }
            }

            if (isEligible) {
                val effDiscount = appliedTier?.discountPercent ?: promo.discountPercent
                val effFreeQty = appliedTier?.freeQuantity ?: promo.freeQuantity
                val targetKey = if (promo.targetType == PromoTargetType.FAMILY) "FAM_${(promo.targetFamily ?: "").uppercase()}" else "PROD_${promo.targetProductRef ?: promo.targetProductId}"
                val targetDisplay = if (promo.targetType == PromoTargetType.FAMILY) "Famille ${promo.targetFamily}" else (promo.targetProductName ?: promo.targetProductRef ?: "Produit")

                candidates.add(
                    CandidatePromo(
                        promo = promo,
                        targetKey = targetKey,
                        targetDisplay = targetDisplay,
                        currentConditionValue = currentVal,
                        threshold = appliedTier?.threshold?.toDouble() ?: promo.threshold,
                        appliedTier = appliedTier,
                        discountPercent = effDiscount,
                        freeQuantity = effFreeQty,
                        voucherAmount = promo.voucherAmount,
                        applicableIndices = applicableIndices
                    )
                )
            }
        }

        // Non-Cumul & Conflicts (Section 10 & 16)
        val groupedByTarget = candidates.groupBy { it.targetKey }
        val conflicts = mutableListOf<PromotionConflict>()
        val retained = mutableListOf<CandidatePromo>()

        groupedByTarget.forEach { (targetKey, group) ->
            if (group.size == 1) {
                retained.add(group.first())
            } else {
                // Conflict
                conflicts.add(PromotionConflict(targetKey, group.first().targetDisplay, group))
                val chosenId = selectedChoices[targetKey]
                val chosen = group.firstOrNull { it.promo.id == chosenId }
                if (chosen != null) {
                    retained.add(chosen)
                } else {
                    // Pick the highest advantage by default
                    val sorted = group.sortedByDescending { it.discountPercent + (it.freeQuantity * 5) }
                    retained.add(sorted.first())
                }
            }
        }

        // Calculate Advantages
        val lineDiscounts = mutableMapOf<Int, Double>()
        var totalDiscountFromPromos = 0.0
        val freeItems = mutableListOf<OrderItem>()
        var voucherDiscount = 0.0
        val appliedPromotions = mutableListOf<AppliedPromotionInfo>()

        retained.forEach { cp ->
            // A. Discount %
            if (cp.discountPercent > 0.0) {
                cp.applicableIndices.forEach { idx ->
                    val cur = lineDiscounts[idx] ?: 0.0
                    lineDiscounts[idx] = maxOf(cur, cp.discountPercent)
                    val item = items[idx]
                    totalDiscountFromPromos += (item.unitPriceTtc * item.quantity) * (cp.discountPercent / 100.0)
                }
            }

            // B. Free Gift items
            var giftSummary: String? = null
            if (cp.freeQuantity > 0 && cp.promo.type == PromotionType.TYPE_2) {
                if (cp.promo.freeItemType == FreeItemType.SAME_PRODUCT) {
                    val srcItem = if (cp.applicableIndices.isNotEmpty()) items[cp.applicableIndices.first()] else null
                    if (srcItem != null) {
                        freeItems.add(
                            OrderItem(
                                productId = srcItem.productId,
                                productName = srcItem.productName,
                                productReference = srcItem.productReference,
                                quantity = 0,
                                freeQuantity = cp.freeQuantity,
                                unitPriceTtc = 0.0,
                                promoTag = "Cadeau: ${cp.promo.name}"
                            )
                        )
                        giftSummary = "${cp.freeQuantity} carton(s) gratuit(s) de ${srcItem.productName} (Même réf)"
                    }
                } else {
                    val giftMeta = productMap[cp.promo.freeProductId] ?: productMap[cp.promo.freeProductRef]
                    val giftRef = cp.promo.freeProductRef ?: giftMeta?.reference ?: "PROMO-GIFT"
                    val giftName = cp.promo.freeProductName ?: giftMeta?.name ?: "Produit Cadeau Offert"
                    freeItems.add(
                        OrderItem(
                            productId = cp.promo.freeProductId ?: giftMeta?.id ?: "gift",
                            productName = giftName,
                            productReference = giftRef,
                            quantity = 0,
                            freeQuantity = cp.freeQuantity,
                            unitPriceTtc = 0.0,
                            promoTag = "Cadeau: ${cp.promo.name}"
                        )
                    )
                    giftSummary = "${cp.freeQuantity} carton(s) gratuit(s) de $giftName (Réf $giftRef)"
                }
            }

            // C. Voucher
            if (cp.voucherAmount > 0.0 && cp.promo.type == PromotionType.TYPE_3) {
                voucherDiscount += cp.voucherAmount
            }

            val conditionReachedText = if (cp.promo.type == PromotionType.TYPE_4) {
                "%.2f DH (Seuil : %.2f DH)".format(cp.currentConditionValue, cp.threshold)
            } else {
                "${cp.currentConditionValue.toInt()} carton(s) (Seuil : ${cp.threshold.toInt()} cartons)"
            }

            appliedPromotions.add(
                AppliedPromotionInfo(
                    promoId = cp.promo.id,
                    name = cp.promo.name,
                    type = cp.promo.type,
                    targetDisplay = cp.targetDisplay,
                    conditionReached = conditionReachedText,
                    discountPercent = cp.discountPercent,
                    giftSummary = giftSummary,
                    freeQuantity = cp.freeQuantity,
                    voucherAmount = cp.voucherAmount
                )
            )
        }

        return PromotionResult(
            appliedPromotions = appliedPromotions,
            candidatePromos = candidates,
            conflicts = conflicts,
            lineDiscounts = lineDiscounts,
            totalDiscountFromPromos = totalDiscountFromPromos,
            freeItems = freeItems,
            voucherDiscount = voucherDiscount
        )
    }
}
