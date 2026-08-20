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

    suspend fun fetchCommercials(): List<Commercial> = withContext(Dispatchers.IO) {
        try {
            val conn = getConnection("commercials?select=*")
            if (conn.responseCode == 200) {
                val jsonStr = conn.inputStream.bufferedReader().use { it.readText() }
                val jsonArray = JSONArray(jsonStr)
                val list = mutableListOf<Commercial>()
                for (i in 0 until jsonArray.length()) {
                    val obj = jsonArray.getJSONObject(i)
                    list.add(
                        Commercial(
                            id = obj.getString("id"),
                            userId = obj.optString("user_id", "00000000-0000-0000-0000-000000000000"),
                            name = obj.optString("name", "Commercial ${obj.optString("matricule", "COM")}"),
                            email = obj.optString("email", ""),
                            phone = obj.optString("phone", "+212 6 00 00 00 00"),
                            matricule = obj.optString("matricule", "COMM-001"),
                            city = obj.optString("city", "Casablanca"),
                            targetMonthlySales = obj.optDouble("target_monthly_sales", 150000.0),
                            currentMonthSales = obj.optDouble("current_month_sales", 0.0),
                            totalOrdersCount = obj.optInt("total_orders_count", 0)
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

    suspend fun fetchOrders(): List<Order> = withContext(Dispatchers.IO) {
        try {
            val clientsList = fetchClients()
            val commercialsList = fetchCommercials()
            val clientsMap = clientsList.associateBy { it.id }
            val commercialsMap = commercialsList.associateBy { it.id }

            val conn = getConnection("orders?select=*")
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

                    val clientName = clientObj?.companyName ?: obj.optString("client_name", "Client Bardahl")
                    val commName = commObj?.name ?: obj.optString("commercial_name", "Mohammed amine")

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
                            totalHt = obj.optDouble("total_ht", 0.0),
                            totalDiscount = obj.optDouble("total_discount", 0.0),
                            totalTva = obj.optDouble("total_tva", 0.0),
                            totalTtc = obj.optDouble("total_ttc", 0.0),
                            observations = obj.optString("observations", ""),
                            paymentMethod = obj.optString("payment_method", "Chèque"),
                            modeExpedition = obj.optString("mode_expedition", "Transport Bardahl"),
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
            val conn = getConnection("orders", "POST")
            conn.doOutput = true
            val json = JSONObject().apply {
                put("id", order.id)
                put("order_number", order.orderNumber)
                put("commercial_id", order.commercialId)
                put("client_id", order.clientId)
                put("status", order.status.name.lowercase())
                put("total_ht", order.totalHt)
                put("total_discount", order.totalDiscount)
                put("total_tva", order.totalTva)
                put("total_ttc", order.totalTtc)
                put("observations", order.observations ?: "")
            }
            conn.outputStream.bufferedWriter().use { it.write(json.toString()) }
            return@withContext conn.responseCode in 200..299
        } catch (e: Exception) {
            e.printStackTrace()
            return@withContext false
        }
    }
}
