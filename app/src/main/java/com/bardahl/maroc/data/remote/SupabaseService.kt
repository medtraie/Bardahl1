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
    private val apiKey: String = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVva25ua3JwaHRsc212cmRrZW92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU4NzgwNjgsImV4cCI6MjEwMTQ1NDA2OH0.jOaTIQRMOTTbNZ7m-pJjQa269wFbERaKcKEWx3rzU4g"
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
            val conn = getConnection("products?select=*")
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
                            code = obj.getString("code"),
                            reference = obj.getString("reference"),
                            name = obj.getString("name"),
                            description = obj.optString("description", ""),
                            viscosity = obj.optString("viscosity", null),
                            volume = obj.optString("volume", null),
                            packaging = obj.getString("packaging"),
                            unitPriceTtc = obj.getDouble("unit_price_ttc"),
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
        try {
            val endpoint = if (commercialId != null) "clients?commercial_id=eq.$commercialId" else "clients?select=*"
            val conn = getConnection(endpoint)
            if (conn.responseCode == 200) {
                val jsonStr = conn.inputStream.bufferedReader().use { it.readText() }
                val jsonArray = JSONArray(jsonStr)
                val list = mutableListOf<Client>()
                for (i in 0 until jsonArray.length()) {
                    val obj = jsonArray.getJSONObject(i)
                    list.add(
                        Client(
                            id = obj.getString("id"),
                            commercialId = obj.optString("commercial_id", ""),
                            companyName = obj.getString("company_name"),
                            ice = obj.getString("ice"),
                            rc = obj.optString("rc", ""),
                            ifCode = obj.optString("if_code", ""),
                            patente = obj.optString("patente", ""),
                            address = obj.getString("address"),
                            city = obj.getString("city"),
                            phone = obj.getString("phone"),
                            email = obj.optString("email", "")
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
