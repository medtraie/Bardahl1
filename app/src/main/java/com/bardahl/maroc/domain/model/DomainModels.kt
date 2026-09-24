package com.bardahl.maroc.domain.model

enum class UserRole {
    ADMIN, COMMERCIAL
}

enum class OrderStatus(val label: String) {
    DRAFT("Brouillon"),
    VALIDATED("Validé"),
    SENT("Envoyé"),
    DELIVERED("Livré"),
    CANCELLED("Annulé")
}

enum class ClientType(val label: String) {
    DETAIL("Détail"),
    GROS("Grossiste"),
    STATION("Station Service"),
    GARAGE("Garage"),
    INDUSTRIEL("Industriel"),
    FLOTTE("Flotte Automobile")
}

data class User(
    val id: String,
    val email: String,
    val role: UserRole,
    val firstName: String,
    val lastName: String,
    val phone: String,
    val isActive: Boolean = true,
    val avatarUrl: String? = null
)

data class Commercial(
    val id: String,
    val userId: String,
    val name: String,
    val email: String,
    val password: String = "123456",
    val phone: String,
    val matricule: String,
    val city: String,
    val targetMonthlySales: Double = 0.0,
    val currentMonthSales: Double = 0.0,
    val totalOrdersCount: Int = 0,
    val isActive: Boolean = true,
    val sectors: List<String> = emptyList()
)

data class Client(
    val id: String,
    val commercialId: String,
    val companyName: String,
    val ice: String,
    val rc: String,
    val ifCode: String,
    val patente: String,
    val address: String,
    val city: String,
    val phone: String,
    val email: String,
    val clientType: ClientType = ClientType.DETAIL,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val isActive: Boolean = true
)

data class Category(
    val id: String,
    val name: String,
    val code: String,
    val description: String? = null
)

data class Product(
    val id: String,
    val categoryId: String?,
    val code: String,
    val reference: String,
    val name: String,
    val description: String,
    val viscosity: String? = null,
    val volume: String? = null,
    val packaging: String,
    val unitPriceTtc: Double,
    val unitPriceHt: Double = unitPriceTtc / 1.20,
    val tvaRate: Double = 20.0,
    val stockQuantity: Int = 100,
    val imageUrl: String? = null,
    val isActive: Boolean = true
)

data class OrderItem(
    val id: String = java.util.UUID.randomUUID().toString(),
    val orderId: String = "",
    val productId: String,
    val productName: String,
    val productReference: String,
    val quantity: Int,
    val freeQuantity: Int = 0,
    val unitPriceTtc: Double,
    val discountPercentage: Double = 0.0,
    val promoTag: String = "",
    val tvaRate: Double = 20.0
) {
    val totalHt: Double
        get() = (unitPriceTtc / (1 + (tvaRate / 100))) * quantity
    val totalTtc: Double
        get() = unitPriceTtc * quantity
}

data class Order(
    val id: String = java.util.UUID.randomUUID().toString(),
    val orderNumber: String,
    val commercialId: String,
    val commercialName: String = "",
    val clientId: String,
    val clientName: String = "",
    val orderDate: String,
    val status: OrderStatus = OrderStatus.DRAFT,
    val items: List<OrderItem> = emptyList(),
    val paymentMethod: String = "Chèque",
    val modeExpedition: String = "Transport Bardahl",
    val remarque: String = "",
    val promoNote: String = "",
    val remisePercent: Double = 0.0,
    val remiseMontant: Double = 0.0,
    val voucherDiscount: Double = 0.0,
    val totalFreeItems: Int = 0,
    val totalHt: Double = 0.0,
    val totalDiscount: Double = 0.0,
    val totalTva: Double = 0.0,
    val totalTtc: Double = 0.0,
    val signatureUrl: String? = null,
    val observations: String? = null,
    val isSynced: Boolean = true
)

enum class PromotionType(val label: String) {
    TYPE_1("Type 1: Cartons → Remise %"),
    TYPE_2("Type 2: Cartons → Remise % + Gratuit"),
    TYPE_3("Type 3: Cartons → Remise % + Bon d'Achat"),
    TYPE_4("Type 4: Montant Famille → Remise %")
}

enum class PromoTargetType {
    FAMILY, PRODUCT
}

enum class FreeItemType {
    SAME_PRODUCT, DIFFERENT_PRODUCT
}

data class PromotionTier(
    val threshold: Int,
    val discountPercent: Double,
    val freeQuantity: Int
)

data class Promotion(
    val id: String = java.util.UUID.randomUUID().toString(),
    val name: String,
    val description: String = "",
    val type: PromotionType = PromotionType.TYPE_1,
    val targetType: PromoTargetType = PromoTargetType.FAMILY,
    val targetFamily: String? = null,
    val targetProductId: String? = null,
    val targetProductRef: String? = null,
    val targetProductName: String? = null,
    val threshold: Double = 10.0,
    val discountPercent: Double = 0.0,
    val freeItemType: FreeItemType = FreeItemType.SAME_PRODUCT,
    val freeProductId: String? = null,
    val freeProductRef: String? = null,
    val freeProductName: String? = null,
    val freeQuantity: Int = 0,
    val tiers: List<PromotionTier> = emptyList(),
    val voucherAmount: Double = 0.0,
    val isActive: Boolean = true,
    val startDate: String = "2026-01-01",
    val endDate: String = "2026-12-31"
)

data class AppliedPromotionInfo(
    val promoId: String,
    val name: String,
    val type: PromotionType,
    val targetDisplay: String,
    val conditionReached: String,
    val discountPercent: Double = 0.0,
    val giftSummary: String? = null,
    val freeQuantity: Int = 0,
    val voucherAmount: Double = 0.0
)

data class DashboardStats(
    val totalOrders: Int = 0,
    val ordersToday: Int = 0,
    val ordersThisMonth: Int = 0,
    val totalRevenueTtc: Double = 0.0,
    val activeClientsCount: Int = 0,
    val activeProductsCount: Int = 0
)

data class CompanySettings(
    val companyName: String = "BARDAHL MAGHREB S.A",
    val logoUrl: String = "",
    val address: String = "Casablanca, Maroc",
    val phone: String = "+212 5 22 00 00 00",
    val email: String = "contact@bardahl.ma",
    val ice: String = "001524389000045",
    val rc: String = "123456",
    val ifCode: String = "9876543",
    val patente: String = "456789",
    val tvaDefault: Double = 20.0
)
