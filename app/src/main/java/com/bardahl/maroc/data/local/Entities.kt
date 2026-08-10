package com.bardahl.maroc.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "local_clients")
data class ClientEntity(
    @PrimaryKey val id: String,
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
    val clientType: String,
    val isSynced: Boolean = true
)

@Entity(tableName = "local_products")
data class ProductEntity(
    @PrimaryKey val id: String,
    val categoryId: String?,
    val code: String,
    val reference: String,
    val name: String,
    val description: String,
    val viscosity: String?,
    val volume: String?,
    val packaging: String,
    val unitPriceTtc: Double,
    val stockQuantity: Int,
    val imageUrl: String?
)

@Entity(tableName = "local_orders")
data class OrderEntity(
    @PrimaryKey val id: String,
    val orderNumber: String,
    val commercialId: String,
    val commercialName: String,
    val clientId: String,
    val clientName: String,
    val orderDate: String,
    val status: String,
    val totalHt: Double,
    val totalDiscount: Double,
    val totalTva: Double,
    val totalTtc: Double,
    val observations: String?,
    val isSynced: Boolean = false
)

@Entity(tableName = "local_order_items")
data class OrderItemEntity(
    @PrimaryKey val id: String,
    val orderId: String,
    val productId: String,
    val productName: String,
    val productReference: String,
    val quantity: Int,
    val unitPriceTtc: Double,
    val discountPercentage: Double,
    val tvaRate: Double
)

@Entity(tableName = "sync_queue")
data class SyncQueueItem(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val entityType: String, // "ORDER", "CLIENT"
    val entityId: String,
    val action: String, // "INSERT", "UPDATE", "DELETE"
    val payloadJson: String,
    val createdAt: Long = System.currentTimeMillis()
)
