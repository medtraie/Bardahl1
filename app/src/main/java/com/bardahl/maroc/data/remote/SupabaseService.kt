package com.bardahl.maroc.data.remote

import com.bardahl.maroc.domain.model.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class SupabaseService(
    private val baseUrl: String = "https://uoknnkrphtlsmvrdkeov.supabase.co/rest/v1",
    private val apiKey: String = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVva25ua3JwaHRsc212cmRrZW92Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTg3ODA2OCwiZXhwIjoyMTAxNDU0MDY4fQ.iN0xqCHWT_ZeqUAIuxwgJ0_AsVmKLPgVlj87mc3YX4s"
) {

    private fun getConnection(endpoint: String, method: String = "GET"): HttpURLConnection {
        val url = URL("$baseUrl/$endpoint")
        val conn = url.openConnection() as HttpURLConnection
        conn.requestMethod = method
        conn.setRequestProperty("apikey", apiKey)
        conn.setRequestProperty("Authorization", "Bearer $apiKey")
        conn.setRequestProperty("Content-Type", "application/json")
        conn.setRequestProperty("Prefer", "return=representation")
        conn.connectTimeout = 10000
        conn.readTimeout = 10000
        return conn
    }

    suspend fun fetchProducts(): List<Product> = withContext(Dispatchers.IO) {
        try {
            val conn = getConnection("products?select=*&limit=1000")
            if (conn.responseCode == 200) {
                val jsonStr = conn.inputStream.bufferedReader().use { it.readText() }
                val jsonArray = JSONArray(jsonStr)
                val list = mutableListOf<Product>()
                for (i in 0 until jsonArray.length()) {
                    val obj = jsonArray.getJSONObject(i)
                    list.add(
                        Product(
                            id = obj.getString("id"),
                            categoryId = obj.optString("category_id", null),
                            code = obj.optString("code", "P-${i + 1}"),
                            reference = obj.optString("reference", "REF-${i + 1}"),
                            name = obj.getString("name"),
                            description = obj.optString("description", ""),
                            viscosity = obj.optString("viscosity", null),
                            volume = obj.optString("volume", null),
                            packaging = obj.optString("packaging", "Unité"),
                            unitPriceTtc = obj.optDouble("unit_price_ttc", 100.0),
                            stockQuantity = obj.optInt("stock_quantity", 100)
                        )
                    )
                }
                return@withContext list
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return@withContext emptyList()
    }

    suspend fun fetchClients(commercialId: String? = null): List<Client> = withContext(Dispatchers.IO) {
        val list = mutableListOf<Client>()
        try {
            var offset = 0
            val limit = 1000
            var hasMore = true
            while (hasMore) {
                val endpoint = if (commercialId != null) {
                    "clients?commercial_id=eq.$commercialId&limit=$limit&offset=$offset"
                } else {
                    "clients?select=*&limit=$limit&offset=$offset"
                }
                val conn = getConnection(endpoint)
                if (conn.responseCode == 200) {
                    val jsonStr = conn.inputStream.bufferedReader().use { it.readText() }
                    val jsonArray = JSONArray(jsonStr)
                    val count = jsonArray.length()
                    if (count == 0) {
                        hasMore = false
                        break
                    }
                    for (i in 0 until count) {
                        val obj = jsonArray.getJSONObject(i)
                        val rawType = obj.optString("client_type", "garage").lowercase()
                        val cType = when (rawType) {
                            "station" -> ClientType.STATION
                            "flotte", "fleet" -> ClientType.FLOTTE
                            "grossiste" -> ClientType.GROS
                            "industriel" -> ClientType.INDUSTRIEL
                            else -> ClientType.GARAGE
                        }
                        list.add(
                            Client(
                                id = obj.getString("id"),
                                commercialId = obj.optString("commercial_id", ""),
                                companyName = obj.optString("company_name", "Client"),
                                ice = obj.optString("ice", "000000000000000"),
                                rc = obj.optString("rc", ""),
                                ifCode = obj.optString("if_code", ""),
                                patente = obj.optString("patente", ""),
                                address = obj.optString("address", "Casablanca"),
                                city = obj.optString("city", "Casablanca"),
                                phone = obj.optString("phone", "+212 5 22 00 00 00"),
                                email = obj.optString("email", ""),
                                clientType = cType
                            )
                        )
                    }
                    if (count < limit) {
                        hasMore = false
                    } else {
                        offset += limit
                    }
                } else {
                    hasMore = false
                }
            }
            return@withContext list
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return@withContext list
    }

    suspend fun postClient(client: Client): Boolean = withContext(Dispatchers.IO) {
        try {
            val conn = getConnection("clients", "POST")
            conn.doOutput = true
            val json = JSONObject().apply {
                put("id", client.id)
                put("commercial_id", client.commercialId.ifBlank { "c8888888-8888-8888-8888-888888888888" })
                put("company_name", client.companyName)
                put("ice", client.ice)
                put("rc", client.rc)
                put("if_code", client.ifCode)
                put("patente", client.patente)
                put("address", client.address)
                put("city", client.city)
                put("phone", client.phone)
                put("email", client.email)
                put("client_type", client.clientType.name.lowercase())
            }
            conn.outputStream.bufferedWriter().use { it.write(json.toString()) }
            return@withContext conn.responseCode in 200..299
        } catch (e: Exception) {
            e.printStackTrace()
            return@withContext false
        }
    }

    suspend fun updateClient(client: Client): Boolean = withContext(Dispatchers.IO) {
        try {
            val conn = getConnection("clients?id=eq.${client.id}", "PATCH")
            conn.doOutput = true
            val json = JSONObject().apply {
                put("company_name", client.companyName)
                put("ice", client.ice)
                put("rc", client.rc)
                put("if_code", client.ifCode)
                put("patente", client.patente)
                put("address", client.address)
                put("city", client.city)
                put("phone", client.phone)
                put("email", client.email)
                put("client_type", client.clientType.name.lowercase())
            }
            conn.outputStream.bufferedWriter().use { it.write(json.toString()) }
            return@withContext conn.responseCode in 200..299
        } catch (e: Exception) {
            e.printStackTrace()
            return@withContext false
        }
    }

    suspend fun deleteClient(id: String): Boolean = withContext(Dispatchers.IO) {
        try {
            val conn = getConnection("clients?id=eq.$id", "DELETE")
            return@withContext conn.responseCode in 200..299
        } catch (e: Exception) {
            e.printStackTrace()
            return@withContext false
        }
    }

    suspend fun fetchCommercials(): List<Commercial> = withContext(Dispatchers.IO) {
        try {
            val conn = getConnection("commercials?select=*")
            if (conn.responseCode == 200) {
                val jsonStr = conn.inputStream.bufferedReader().use { it.readText() }
                val jsonArray = JSONArray(jsonStr)
                val list = mutableListOf<Commercial>()
                for (i in 0 until jsonArray.length()) {
                    val obj = jsonArray.getJSONObject(i)
                    val sectorStr = obj.optString("city", "Casablanca")
                    val sectorList = sectorStr.split(",").map { it.trim() }.filter { it.isNotBlank() }
                    list.add(
                        Commercial(
                            id = obj.getString("id"),
                            userId = obj.optString("user_id", "00000000-0000-0000-0000-000000000000"),
                            name = obj.optString("name", "Commercial ${obj.optString("matricule", "COM")}"),
                            email = obj.optString("email", ""),
                            password = obj.optString("password", "123456").ifBlank { "123456" },
                            phone = obj.optString("phone", "+212 6 00 00 00 00"),
                            matricule = obj.optString("matricule", "COMM-001"),
                            city = sectorStr,
                            targetMonthlySales = obj.optDouble("target_monthly_sales", 150000.0),
                            currentMonthSales = obj.optDouble("current_month_sales", 0.0),
                            totalOrdersCount = obj.optInt("total_orders_count", 0),
                            isActive = obj.optBoolean("is_active", true),
                            sectors = if (sectorList.isNotEmpty()) sectorList else listOf("Casablanca")
                        )
                    )
                }
                return@withContext list
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return@withContext emptyList()
    }

    suspend fun postCommercial(commercial: Commercial): Boolean = withContext(Dispatchers.IO) {
        try {
            val conn = getConnection("commercials", "POST")
            conn.doOutput = true
            val json = JSONObject().apply {
                put("id", commercial.id)
                put("name", commercial.name)
                put("email", commercial.email)
                put("password", commercial.password)
                put("phone", commercial.phone)
                put("matricule", commercial.matricule)
                put("city", commercial.city)
                put("target_monthly_sales", commercial.targetMonthlySales)
                put("current_month_sales", commercial.currentMonthSales)
                put("total_orders_count", commercial.totalOrdersCount)
            }
            conn.outputStream.bufferedWriter().use { it.write(json.toString()) }
            return@withContext conn.responseCode in 200..299
        } catch (e: Exception) {
            e.printStackTrace()
            return@withContext false
        }
    }

    suspend fun updateCommercial(commercial: Commercial): Boolean = withContext(Dispatchers.IO) {
        try {
            val conn = getConnection("commercials?id=eq.${commercial.id}", "PATCH")
            conn.doOutput = true
            val json = JSONObject().apply {
                put("name", commercial.name)
                put("email", commercial.email)
                put("password", commercial.password)
                put("phone", commercial.phone)
                put("matricule", commercial.matricule)
                put("city", commercial.city)
                put("target_monthly_sales", commercial.targetMonthlySales)
            }
            conn.outputStream.bufferedWriter().use { it.write(json.toString()) }
            return@withContext conn.responseCode in 200..299
        } catch (e: Exception) {
            e.printStackTrace()
            return@withContext false
        }
    }

    suspend fun deleteCommercial(id: String): Boolean = withContext(Dispatchers.IO) {
        try {
            val conn = getConnection("commercials?id=eq.$id", "DELETE")
            return@withContext conn.responseCode in 200..299
        } catch (e: Exception) {
            e.printStackTrace()
            return@withContext false
        }
    }

    suspend fun fetchOrders(): List<Order> = withContext(Dispatchers.IO) {
        try {
            val clientsList = fetchClients()
            val commercialsList = fetchCommercials()
            val clientsMap = clientsList.associateBy { it.id }
            val commercialsMap = commercialsList.associateBy { it.id }

            val conn = getConnection("orders?select=*&order=created_at.desc")
            if (conn.responseCode == 200) {
                val jsonStr = conn.inputStream.bufferedReader().use { it.readText() }
                val jsonArray = JSONArray(jsonStr)
                val list = mutableListOf<Order>()
                for (i in 0 until jsonArray.length()) {
                    val obj = jsonArray.getJSONObject(i)
                    val rawStatus = obj.optString("status", "draft").uppercase()
                    val st = when (rawStatus) {
                        "VALIDATED" -> OrderStatus.VALIDATED
                        "SENT" -> OrderStatus.SENT
                        "DELIVERED" -> OrderStatus.DELIVERED
                        "CANCELLED" -> OrderStatus.CANCELLED
                        else -> OrderStatus.DRAFT
                    }
                    val cId = obj.optString("client_id", "")
                    val commId = obj.optString("commercial_id", "")

                    val clientObj = clientsMap[cId]
                    val commObj = commercialsMap[commId]

                    val obs = obj.optString("observations", "")
                    var parsedItems = mutableListOf<OrderItem>()
                    var parsedPayment = "Chèque"
                    var parsedExpedition = "Transport Bardahl"
                    var parsedRemarque = ""
                    var parsedPromoNote = ""
                    var parsedRemisePercent = 0.0
                    var parsedRemiseMontant = 0.0
                    var customClientName = ""
                    var customCommName = ""

                    if (obs.trim().startsWith("{") && obs.trim().endsWith("}")) {
                        try {
                            val obsJson = JSONObject(obs.trim())
                            parsedPayment = obsJson.optString("paymentMethod", "Chèque")
                            parsedExpedition = obsJson.optString("modeExpedition", "Transport Bardahl")
                            parsedRemarque = obsJson.optString("remarque", "")
                            parsedPromoNote = obsJson.optString("promoNote", "")
                            parsedRemisePercent = obsJson.optDouble("remisePercent", 0.0)
                            parsedRemiseMontant = obsJson.optDouble("remiseMontant", 0.0)
                            customClientName = obsJson.optString("clientName", "")
                            customCommName = obsJson.optString("commercialName", "")

                            val itemsArr = obsJson.optJSONArray("items")
                            if (itemsArr != null) {
                                for (j in 0 until itemsArr.length()) {
                                    val itemObj = itemsArr.getJSONObject(j)
                                    parsedItems.add(
                                        OrderItem(
                                            productId = itemObj.optString("productId", "la1"),
                                            productName = itemObj.optString("productName", "Produit Bardahl"),
                                            productReference = itemObj.optString("reference", itemObj.optString("productReference", "34131")),
                                            quantity = itemObj.optInt("qty", itemObj.optInt("quantity", 1)),
                                            freeQuantity = itemObj.optInt("qtyGratuit", itemObj.optInt("freeQuantity", 0)),
                                            unitPriceTtc = itemObj.optDouble("priceTtc", itemObj.optDouble("unitPriceTtc", 0.0)),
                                            promoTag = itemObj.optString("promoTag", "")
                                        )
                                    )
                                }
                            }
                        } catch (e: Exception) {
                            e.printStackTrace()
                        }
                    } else {
                        parsedPayment = when {
                            obs.contains("Carte Bancaire", ignoreCase = true) -> "Carte Bancaire"
                            obs.contains("Espèces", ignoreCase = true) -> "Espèces"
                            obs.contains("Virement", ignoreCase = true) -> "Virement"
                            else -> "Chèque"
                        }
                        parsedExpedition = when {
                            obs.contains("Client Récupère", ignoreCase = true) -> "Client Récupère"
                            obs.contains("Transporteur Privé", ignoreCase = true) -> "Transporteur Privé"
                            else -> "Transport Bardahl"
                        }
                        parsedRemarque = obs
                    }

                    val clientName = if (customClientName.isNotBlank()) customClientName else clientObj?.companyName ?: "Client Bardahl"
                    val commName = if (customCommName.isNotBlank()) customCommName else commObj?.name ?: "Commercial Bardahl"

                    val totalFreeUnits = parsedItems.sumOf { it.freeQuantity }

                    list.add(
                        Order(
                            id = obj.getString("id"),
                            orderNumber = obj.optString("order_number", "BC-2026-0000"),
                            commercialId = commId,
                            commercialName = commName,
                            clientId = cId,
                            clientName = clientName,
                            orderDate = obj.optString("order_date", "2026-08-10").take(10),
                            status = st,
                            items = parsedItems,
                            paymentMethod = parsedPayment,
                            modeExpedition = parsedExpedition,
                            remarque = parsedRemarque,
                            promoNote = parsedPromoNote,
                            remisePercent = parsedRemisePercent,
                            remiseMontant = parsedRemiseMontant,
                            totalFreeItems = totalFreeUnits,
                            totalHt = obj.optDouble("total_ht", 0.0),
                            totalDiscount = obj.optDouble("total_discount", 0.0),
                            totalTva = obj.optDouble("total_tva", 0.0),
                            totalTtc = obj.optDouble("total_ttc", 0.0),
                            observations = obs,
                            isSynced = true
                        )
                    )
                }
                return@withContext list
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return@withContext emptyList()
    }

    suspend fun postOrder(order: Order): Boolean = withContext(Dispatchers.IO) {
        try {
            // 1. Resolve valid commercial UUID
            var commId = order.commercialId.trim()
            if (commId.isBlank() || commId == "11111111-1111-1111-1111-111111111111" || !commId.contains("-")) {
                val comms = fetchCommercials()
                commId = comms.find { it.name.contains(order.commercialName, ignoreCase = true) }?.id
                    ?: comms.firstOrNull()?.id
                    ?: "b7593f2a-0dab-4281-acc7-6c404a27511a"
            }

            // 2. Resolve valid client UUID
            var cId = order.clientId.trim()
            if (cId.isBlank() || cId.startsWith("c") || !cId.contains("-")) {
                val clients = fetchClients()
                val matchedClient = clients.find { it.companyName.equals(order.clientName, ignoreCase = true) || it.id == cId }
                cId = matchedClient?.id ?: clients.firstOrNull()?.id ?: "443e06e8-8eff-4dbd-86f1-7fae0f4f936c"
            }

            val conn = getConnection("orders", "POST")
            conn.doOutput = true

            // Build structured observations JSON containing all items and order metadata
            val itemsJsonArr = JSONArray()
            order.items.forEach { item ->
                val itemObj = JSONObject().apply {
                    put("productId", item.productId)
                    put("productName", item.productName)
                    put("reference", item.productReference)
                    put("qty", item.quantity)
                    put("qtyGratuit", item.freeQuantity)
                    put("priceTtc", item.unitPriceTtc)
                    put("promoTag", item.promoTag)
                }
                itemsJsonArr.put(itemObj)
            }

            val obsJson = JSONObject().apply {
                put("items", itemsJsonArr)
                put("paymentMethod", order.paymentMethod)
                put("modeExpedition", order.modeExpedition)
                put("remarque", order.remarque)
                put("promoNote", order.promoNote)
                put("remisePercent", order.remisePercent)
                put("remiseMontant", order.remiseMontant)
                put("commercialName", order.commercialName)
                put("clientName", order.clientName)
            }

            val json = JSONObject().apply {
                put("order_number", order.orderNumber)
                put("commercial_id", commId)
                put("client_id", cId)
                put("status", order.status.name.lowercase())
                put("order_date", order.orderDate.take(10))
                put("total_ht", order.totalHt)
                put("total_discount", order.totalDiscount)
                put("total_tva", order.totalTva)
                put("total_ttc", order.totalTtc)
                put("observations", obsJson.toString())
                put("is_synced", true)
            }

            conn.outputStream.bufferedWriter().use { it.write(json.toString()) }
            val code = conn.responseCode
            return@withContext code in 200..299
        } catch (e: Exception) {
            e.printStackTrace()
            return@withContext false
        }
    }
}
