package com.bardahl.maroc.data.repository

import com.bardahl.maroc.data.local.*
import com.bardahl.maroc.data.remote.SupabaseService
import com.bardahl.maroc.domain.model.*
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

class ClientRepository(
    private val clientDao: ClientDao,
    private val supabaseService: SupabaseService
) {
    fun getClients(commercialId: String?): Flow<List<Client>> {
        val flow = if (commercialId != null) {
            clientDao.getClientsByCommercial(commercialId)
        } else {
            clientDao.getAllClients()
        }
        return flow.map { entities ->
            entities.map { e ->
                Client(
                    id = e.id,
                    commercialId = e.commercialId,
                    companyName = e.companyName,
                    ice = e.ice,
                    rc = e.rc,
                    ifCode = e.ifCode,
                    patente = e.patente,
                    address = e.address,
                    city = e.city,
                    phone = e.phone,
                    email = e.email,
                    clientType = try { ClientType.valueOf(e.clientType) } catch (ex: Exception) { ClientType.GARAGE }
                )
            }
        }
    }

    suspend fun saveClient(client: Client) {
        val entity = ClientEntity(
            id = client.id,
            commercialId = client.commercialId,
            companyName = client.companyName,
            ice = client.ice,
            rc = client.rc,
            ifCode = client.ifCode,
            patente = client.patente,
            address = client.address,
            city = client.city,
            phone = client.phone,
            email = client.email,
            clientType = client.clientType.name,
            isSynced = false
        )
        clientDao.insertClient(entity)
        supabaseService.postClient(client)
    }

    suspend fun updateClient(client: Client) {
        val entity = ClientEntity(
            id = client.id,
            commercialId = client.commercialId,
            companyName = client.companyName,
            ice = client.ice,
            rc = client.rc,
            ifCode = client.ifCode,
            patente = client.patente,
            address = client.address,
            city = client.city,
            phone = client.phone,
            email = client.email,
            clientType = client.clientType.name,
            isSynced = false
        )
        clientDao.insertClient(entity)
        supabaseService.updateClient(client)
    }

    suspend fun deleteClient(id: String) {
        clientDao.deleteClient(id)
        supabaseService.deleteClient(id)
    }

    suspend fun fetchRemoteClientsDirectly(commercialId: String? = null): List<Client> {
        val remote = supabaseService.fetchClients(commercialId)
        if (remote.isNotEmpty()) {
            val entities = remote.map { c ->
                ClientEntity(
                    id = c.id,
                    commercialId = c.commercialId,
                    companyName = c.companyName,
                    ice = c.ice,
                    rc = c.rc,
                    ifCode = c.ifCode,
                    patente = c.patente,
                    address = c.address,
                    city = c.city,
                    phone = c.phone,
                    email = c.email,
                    clientType = c.clientType.name,
                    isSynced = true
                )
            }
            clientDao.insertClients(entities)
        }
        return remote
    }
}

class ProductRepository(
    private val productDao: ProductDao,
    private val supabaseService: SupabaseService
) {
    fun getProducts(): Flow<List<Product>> {
        return productDao.getAllProducts().map { entities ->
            entities.map { e ->
                Product(
                    id = e.id,
                    categoryId = e.categoryId,
                    code = e.code,
                    reference = e.reference,
                    name = e.name,
                    description = e.description,
                    viscosity = e.viscosity,
                    volume = e.volume,
                    packaging = e.packaging,
                    unitPriceTtc = e.unitPriceTtc,
                    stockQuantity = e.stockQuantity,
                    imageUrl = e.imageUrl
                )
            }
        }
    }

    suspend fun fetchRemoteProductsDirectly(): List<Product> {
        val remote = supabaseService.fetchProducts()
        if (remote.isNotEmpty()) {
            val entities = remote.map { p ->
                ProductEntity(
                    id = p.id,
                    categoryId = p.categoryId,
                    code = p.code,
                    reference = p.reference,
                    name = p.name,
                    description = p.description,
                    viscosity = p.viscosity,
                    volume = p.volume,
                    packaging = p.packaging,
                    unitPriceTtc = p.unitPriceTtc,
                    stockQuantity = p.stockQuantity,
                    imageUrl = p.imageUrl
                )
            }
            productDao.insertProducts(entities)
        }
        return remote
    }
}

class OrderRepository(
    private val orderDao: OrderDao,
    private val syncQueueDao: SyncQueueDao,
    private val supabaseService: SupabaseService
) {
    fun getOrders(commercialId: String? = null): Flow<List<Order>> {
        val flow = if (commercialId != null) {
            orderDao.getOrdersByCommercial(commercialId)
        } else {
            orderDao.getAllOrders()
        }
        return flow.map { entities ->
            entities.map { e ->
                Order(
                    id = e.id,
                    orderNumber = e.orderNumber,
                    commercialId = e.commercialId,
                    commercialName = e.commercialName,
                    clientId = e.clientId,
                    clientName = e.clientName,
                    orderDate = e.orderDate,
                    status = try { OrderStatus.valueOf(e.status) } catch (ex: Exception) { OrderStatus.DRAFT },
                    totalHt = e.totalHt,
                    totalDiscount = e.totalDiscount,
                    totalTva = e.totalTva,
                    totalTtc = e.totalTtc,
                    observations = e.observations,
                    isSynced = e.isSynced
                )
            }
        }
    }

    suspend fun fetchRemoteOrdersDirectly(): List<Order> {
        val remote = supabaseService.fetchOrders()
        if (remote.isNotEmpty()) {
            val entities = remote.map { o ->
                OrderEntity(
                    id = o.id,
                    orderNumber = o.orderNumber,
                    commercialId = o.commercialId,
                    commercialName = o.commercialName,
                    clientId = o.clientId,
                    clientName = o.clientName,
                    orderDate = o.orderDate,
                    status = o.status.name,
                    totalHt = o.totalHt,
                    totalDiscount = o.totalDiscount,
                    totalTva = o.totalTva,
                    totalTtc = o.totalTtc,
                    observations = o.observations,
                    isSynced = true
                )
            }
            orderDao.insertOrders(entities)
        }
        return remote
    }

    suspend fun saveOrder(order: Order) {
        val entity = OrderEntity(
            id = order.id,
            orderNumber = order.orderNumber,
            commercialId = order.commercialId,
            commercialName = order.commercialName,
            clientId = order.clientId,
            clientName = order.clientName,
            orderDate = order.orderDate,
            status = order.status.name,
            totalHt = order.totalHt,
            totalDiscount = order.totalDiscount,
            totalTva = order.totalTva,
            totalTtc = order.totalTtc,
            observations = order.observations,
            isSynced = false
        )
        val items = order.items.map { i ->
            OrderItemEntity(
                id = i.id,
                orderId = order.id,
                productId = i.productId,
                productName = i.productName,
                productReference = i.productReference,
                quantity = i.quantity,
                unitPriceTtc = i.unitPriceTtc,
                discountPercentage = i.discountPercentage,
                tvaRate = i.tvaRate
            )
        }
        orderDao.insertOrder(entity)
        orderDao.insertOrderItems(items)

        // Try syncing online
        val success = supabaseService.postOrder(order)
        if (success) {
            orderDao.updateOrderStatus(order.id, order.status.name, true)
        } else {
            syncQueueDao.enqueue(
                SyncQueueItem(
                    entityType = "ORDER",
                    entityId = order.id,
                    action = "INSERT",
                    payloadJson = order.id
                )
            )
        }
    }
}
