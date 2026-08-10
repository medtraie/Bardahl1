package com.bardahl.maroc.data.local

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface ClientDao {
    @Query("SELECT * FROM local_clients ORDER BY companyName ASC")
    fun getAllClients(): Flow<List<ClientEntity>>

    @Query("SELECT * FROM local_clients WHERE commercialId = :commercialId ORDER BY companyName ASC")
    fun getClientsByCommercial(commercialId: String): Flow<List<ClientEntity>>

    @Query("SELECT * FROM local_clients WHERE id = :id")
    suspend fun getClientById(id: String): ClientEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertClients(clients: List<ClientEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertClient(client: ClientEntity)

    @Query("DELETE FROM local_clients WHERE id = :id")
    suspend fun deleteClient(id: String)
}

@Dao
interface ProductDao {
    @Query("SELECT * FROM local_products ORDER BY name ASC")
    fun getAllProducts(): Flow<List<ProductEntity>>

    @Query("SELECT * FROM local_products WHERE categoryId = :categoryId ORDER BY name ASC")
    fun getProductsByCategory(categoryId: String): Flow<List<ProductEntity>>

    @Query("SELECT * FROM local_products WHERE code LIKE '%' || :query || '%' OR name LIKE '%' || :query || '%' OR reference LIKE '%' || :query || '%'")
    fun searchProducts(query: String): Flow<List<ProductEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertProducts(products: List<ProductEntity>)
}

@Dao
interface OrderDao {
    @Query("SELECT * FROM local_orders ORDER BY orderDate DESC")
    fun getAllOrders(): Flow<List<OrderEntity>>

    @Query("SELECT * FROM local_orders WHERE commercialId = :commercialId ORDER BY orderDate DESC")
    fun getOrdersByCommercial(commercialId: String): Flow<List<OrderEntity>>

    @Query("SELECT * FROM local_orders WHERE id = :id")
    suspend fun getOrderById(id: String): OrderEntity?

    @Query("SELECT * FROM local_order_items WHERE orderId = :orderId")
    suspend fun getOrderItems(orderId: String): List<OrderItemEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrder(order: OrderEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrderItems(items: List<OrderItemEntity>)

    @Query("UPDATE local_orders SET status = :status, isSynced = :isSynced WHERE id = :orderId")
    suspend fun updateOrderStatus(orderId: String, status: String, isSynced: Boolean)

    @Query("DELETE FROM local_orders WHERE id = :orderId")
    suspend fun deleteOrder(orderId: String)
}

@Dao
interface SyncQueueDao {
    @Query("SELECT * FROM sync_queue ORDER BY createdAt ASC")
    suspend fun getPendingSyncItems(): List<SyncQueueItem>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun enqueue(item: SyncQueueItem)

    @Delete
    suspend fun dequeue(item: SyncQueueItem)
}
