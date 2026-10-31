package com.bardahl.maroc.data.remote

import com.bardahl.maroc.data.MoroccanRegionsRepository
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

    private var cachedCommercialsList: List<Commercial>? = null

    suspend fun getCachedCommercials(): List<Commercial> {
        val cached = cachedCommercialsList
        if (cached != null && cached.isNotEmpty()) return cached
        val fresh = fetchCommercials()
        if (fresh.isNotEmpty()) {
            cachedCommercialsList = fresh
        }
        return fresh
    }

    private fun getConnection(endpoint: String, method: String = "GET"): HttpURLConnection {
        val url = URL("$baseUrl/$endpoint")
        val conn = url.openConnection() as HttpURLConnection
        conn.requestMethod = method
        conn.setRequestProperty("apikey", apiKey)
        conn.setRequestProperty("Authorization", "Bearer $apiKey")
        conn.setRequestProperty("Content-Type", "application/json")
        conn.setRequestProperty("Prefer", "return=representation")
        conn.useCaches = false
        conn.setRequestProperty("Cache-Control", "no-cache, no-store, must-revalidate")
        conn.setRequestProperty("Pragma", "no-cache")
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
                        val rawPatente = obj.optString("patente", "")
                        val cityStr = obj.optString("city", "Casablanca")
                        val resolvedRegion = if (rawPatente.isNotBlank() && rawPatente != "0" && rawPatente != "-") {
                            rawPatente
                        } else {
                            com.bardahl.maroc.data.MoroccanRegionsRepository.getRegionForCity(cityStr)
                        }
                        list.add(
                            Client(
                                id = obj.getString("id"),
                                commercialId = obj.optString("commercial_id", ""),
                                companyName = obj.optString("company_name", "Client"),
                                ice = obj.optString("ice", "000000000000000"),
                                rc = obj.optString("rc", ""),
                                ifCode = obj.optString("if_code", ""),
                                patente = rawPatente,
                                address = obj.optString("address", "Casablanca"),
                                city = cityStr,
                                region = resolvedRegion,
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
                put("patente", client.region.ifBlank { client.patente })
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
                put("patente", client.region.ifBlank { client.patente })
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
                    val rawCityStr = obj.optString("city", "Casablanca")
                    val isInactive = rawCityStr.contains("Statut: INACTIF", ignoreCase = true) || rawCityStr.contains("[Status: INACTIVE]", ignoreCase = true)
                    val cleanCity = rawCityStr.replace(Regex("""\|\s*Statut:\s*\w+""", RegexOption.IGNORE_CASE), "")
                        .replace(Regex("""\[Status:\s*\w+\]""", RegexOption.IGNORE_CASE), "").trim()

                    var sectorStr = cleanCity
                    var regionList = emptyList<String>()

                    if (cleanCity.contains("| Régions:")) {
                        val parts = cleanCity.split("| Régions:")
                        sectorStr = parts[0].trim()
                        regionList = parts[1].split(",").map { it.trim() }.filter { it.isNotBlank() }
                    } else if (cleanCity.contains("[Régions:")) {
                        val match = Regex("""\[Régions:(.*?)\]""").find(cleanCity)
                        if (match != null) {
                            regionList = match.groupValues[1].split(",").map { it.trim() }.filter { it.isNotBlank() }
                            sectorStr = cleanCity.replace(Regex("""\[Régions:.*?\]"""), "").trim()
                        }
                    }

                    val sectorList = sectorStr.split(",").map { it.trim() }.filter { it.isNotBlank() }

                    // Register custom regions found into MoroccanRegionsRepository if not present
                    regionList.forEach { rName ->
                        if (MoroccanRegionsRepository.getAllRegions().none { it.name.equals(rName, ignoreCase = true) }) {
                            MoroccanRegionsRepository.addCustomRegion(rName, sectorList)
                        }
                    }

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
                            isActive = !isInactive,
                            sectors = if (sectorList.isNotEmpty()) sectorList else listOf("Casablanca"),
                            regions = regionList
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
            val statusTag = if (commercial.isActive) "ACTIF" else "INACTIF"
            val cityPayload = if (commercial.regions.isNotEmpty()) {
                "${commercial.sectors.joinToString(", ")} | Régions: ${commercial.regions.joinToString(", ")} | Statut: $statusTag"
            } else {
                "${commercial.city} | Statut: $statusTag"
            }
            val json = JSONObject().apply {
                put("id", commercial.id)
                put("name", commercial.name)
                put("email", commercial.email)
                put("password", commercial.password)
                put("phone", commercial.phone)
                put("matricule", commercial.matricule)
                put("city", cityPayload)
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
            val statusTag = if (commercial.isActive) "ACTIF" else "INACTIF"
            val cityPayload = if (commercial.regions.isNotEmpty()) {
                "${commercial.sectors.joinToString(", ")} | Régions: ${commercial.regions.joinToString(", ")} | Statut: $statusTag"
            } else {
                "${commercial.city} | Statut: $statusTag"
            }
            val json = JSONObject().apply {
                put("name", commercial.name)
                put("email", commercial.email)
                put("password", commercial.password)
                put("phone", commercial.phone)
                put("matricule", commercial.matricule)
                put("city", cityPayload)
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
            // First detach clients and orders to prevent foreign key errors
            try {
                val connClients = getConnection("clients?commercial_id=eq.$id", "PATCH")
                connClients.doOutput = true
                connClients.outputStream.bufferedWriter().use { it.write("{\"commercial_id\":null}") }
                connClients.responseCode
            } catch (e: Exception) {
                e.printStackTrace()
            }

            try {
                val connOrders = getConnection("orders?commercial_id=eq.$id", "PATCH")
                connOrders.doOutput = true
                connOrders.outputStream.bufferedWriter().use { it.write("{\"commercial_id\":null}") }
                connOrders.responseCode
            } catch (e: Exception) {
                e.printStackTrace()
            }

            val conn = getConnection("commercials?id=eq.$id", "DELETE")
            return@withContext conn.responseCode in 200..299
        } catch (e: Exception) {
            e.printStackTrace()
            return@withContext false
        }
    }

    suspend fun fetchOrders(): List<Order> = withContext(Dispatchers.IO) {
        try {
            val commercialsList = getCachedCommercials()
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

                    val commObj = commercialsMap[commId]

                    val obs = obj.optString("observations", "")
                    var parsedItems = mutableListOf<OrderItem>()
                    var parsedPayment = "Chèque"
                    var parsedExpedition = "Transport Bardahl"
                    var parsedRemarque = ""
                    var parsedPromoNote = ""
                    var parsedRemisePercent = 0.0
                    var parsedRemiseMontant = 0.0
                    var parsedVoucherDiscount = 0.0
                    var customClientName = ""
                    var customCommName = ""
                    var customCommEmail = ""

                    if (obs.trim().startsWith("{") && obs.trim().endsWith("}")) {
                        try {
                            val obsJson = JSONObject(obs.trim())
                            parsedPayment = obsJson.optString("paymentMethod", "Chèque")
                            parsedExpedition = obsJson.optString("modeExpedition", "Transport Bardahl")
                            parsedRemarque = obsJson.optString("remarque", "")
                            parsedPromoNote = obsJson.optString("promoNote", "")
                            parsedRemisePercent = obsJson.optDouble("remisePercent", 0.0)
                            parsedRemiseMontant = obsJson.optDouble("remiseMontant", 0.0)
                            parsedVoucherDiscount = obsJson.optDouble("voucherDiscount", 0.0)
                            customClientName = obsJson.optString("clientName", "")
                            customCommName = obsJson.optString("commercialName", "")
                            customCommEmail = obsJson.optString("commercialEmail", "")

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

                    val isAdminOrder = commId == "e7fa1dfe-4bfc-49fb-82a6-142e4724942c" ||
                            customCommName.contains("Admin", ignoreCase = true) ||
                            customCommName.contains("Direction", ignoreCase = true) ||
                            customCommEmail.contains("bardahl@gmail.com", ignoreCase = true) ||
                            obs.contains("bardahl@gmail.com", ignoreCase = true)

                    val clientName = if (customClientName.isNotBlank()) customClientName else "Client Bardahl"
                    val commName = if (isAdminOrder) {
                        "Créé par Administrateur"
                    } else if (customCommName.isNotBlank()) {
                        customCommName
                    } else {
                        commObj?.name ?: "Commercial Bardahl"
                    }

                    val resolvedCommId = if (isAdminOrder) {
                        "e7fa1dfe-4bfc-49fb-82a6-142e4724942c"
                    } else if (commId.isNotBlank()) {
                        commId
                    } else if (commObj != null) {
                        commObj.id
                    } else {
                        commercialsList.find { it.name.equals(customCommName, ignoreCase = true) || (customCommEmail.isNotBlank() && it.email.equals(customCommEmail, ignoreCase = true)) }?.id ?: ""
                    }

                    val totalFreeUnits = parsedItems.sumOf { it.freeQuantity }
                    var hasAnormal = false
                    try {
                        if (obs.trim().startsWith("{") && obs.trim().endsWith("}")) {
                            hasAnormal = JSONObject(obs.trim()).optBoolean("hasAnormalPrice", false)
                        }
                    } catch (_: Exception) {}

                    list.add(
                        Order(
                            id = obj.getString("id"),
                            orderNumber = obj.optString("order_number", "BC-2026-0000"),
                            commercialId = resolvedCommId,
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
                            voucherDiscount = parsedVoucherDiscount,
                            totalFreeItems = totalFreeUnits,
                            totalHt = obj.optDouble("total_ht", 0.0),
                            totalDiscount = obj.optDouble("total_discount", 0.0),
                            totalTva = obj.optDouble("total_tva", 0.0),
                            totalTtc = obj.optDouble("total_ttc", 0.0),
                            observations = obs,
                            isSynced = true,
                            hasAnormalPrice = hasAnormal
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
            val isAdmin = commId == "e7fa1dfe-4bfc-49fb-82a6-142e4724942c" ||
                    order.commercialName.contains("Admin", ignoreCase = true) ||
                    order.commercialName.contains("Direction", ignoreCase = true)

            if (isAdmin) {
                commId = "e7fa1dfe-4bfc-49fb-82a6-142e4724942c"
            } else if (commId.isBlank() || commId == "11111111-1111-1111-1111-111111111111" || !commId.contains("-")) {
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

            val finalCommName = if (isAdmin) "Créé par Administrateur" else order.commercialName
            val obsJson = JSONObject().apply {
                put("items", itemsJsonArr)
                put("paymentMethod", order.paymentMethod)
                put("modeExpedition", order.modeExpedition)
                put("remarque", order.remarque)
                put("promoNote", order.promoNote)
                put("remisePercent", order.remisePercent)
                put("remiseMontant", order.remiseMontant)
                put("voucherDiscount", order.voucherDiscount)
                put("commercialName", finalCommName)
                if (isAdmin) {
                    put("commercialEmail", "bardahl@gmail.com")
                }
                put("clientName", order.clientName)
                put("hasAnormalPrice", order.hasAnormalPrice)
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

    suspend fun updateOrder(order: Order): Boolean = withContext(Dispatchers.IO) {
        try {
            var commId = order.commercialId.trim()
            val isAdmin = commId == "e7fa1dfe-4bfc-49fb-82a6-142e4724942c" ||
                    order.commercialName.contains("Admin", ignoreCase = true) ||
                    order.commercialName.contains("Direction", ignoreCase = true)

            if (isAdmin) {
                commId = "e7fa1dfe-4bfc-49fb-82a6-142e4724942c"
            }

            var cId = order.clientId.trim()
            if (cId.isBlank() || cId.startsWith("c") || !cId.contains("-")) {
                val clients = fetchClients()
                val matchedClient = clients.find { it.companyName.equals(order.clientName, ignoreCase = true) || it.id == cId }
                cId = matchedClient?.id ?: clients.firstOrNull()?.id ?: "443e06e8-8eff-4dbd-86f1-7fae0f4f936c"
            }

            val conn = getConnection("orders?order_number=eq.${order.orderNumber}", "PATCH")
            conn.doOutput = true

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

            val finalCommName = if (isAdmin) "Créé par Administrateur" else order.commercialName
            val obsJson = JSONObject().apply {
                put("items", itemsJsonArr)
                put("paymentMethod", order.paymentMethod)
                put("modeExpedition", order.modeExpedition)
                put("remarque", order.remarque)
                put("promoNote", order.promoNote)
                put("remisePercent", order.remisePercent)
                put("remiseMontant", order.remiseMontant)
                put("voucherDiscount", order.voucherDiscount)
                put("commercialName", finalCommName)
                put("totalFreeItems", order.totalFreeItems)
                if (isAdmin) {
                    put("commercialEmail", "bardahl@gmail.com")
                }
                put("clientName", order.clientName)
                put("hasAnormalPrice", order.hasAnormalPrice)
            }

            val statusStr = if (order.status == OrderStatus.VALIDATED) "validated" else "draft"
            val json = JSONObject().apply {
                put("commercial_id", commId)
                put("client_id", cId)
                put("status", statusStr)
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

    suspend fun fetchPromotions(): List<Promotion> = withContext(Dispatchers.IO) {
        val list = mutableListOf<Promotion>()
        try {
            val conn = getConnection("promotions?select=*&is_active=eq.true&order=created_at.desc")
            if (conn.responseCode == 200) {
                val jsonStr = conn.inputStream.bufferedReader().use { it.readText() }
                val jsonArray = JSONArray(jsonStr)
                for (i in 0 until jsonArray.length()) {
                    val obj = jsonArray.getJSONObject(i)
                    val rawType = obj.optString("type", "TYPE_1")
                    val pType = when (rawType) {
                        "TYPE_2" -> PromotionType.TYPE_2
                        "TYPE_3" -> PromotionType.TYPE_3
                        "TYPE_4" -> PromotionType.TYPE_4
                        else -> PromotionType.TYPE_1
                    }

                    val rawTargetType = obj.optString("target_type", "FAMILY")
                    val tTargetType = if (rawTargetType.equals("PRODUCT", ignoreCase = true)) PromoTargetType.PRODUCT else PromoTargetType.FAMILY

                    val rawFreeItemType = obj.optString("free_item_type", "SAME_PRODUCT")
                    val fFreeItemType = if (rawFreeItemType.equals("DIFFERENT_PRODUCT", ignoreCase = true)) FreeItemType.DIFFERENT_PRODUCT else FreeItemType.SAME_PRODUCT

                    val tiersList = mutableListOf<PromotionTier>()
                    val tiersArr = obj.optJSONArray("tiers")
                    if (tiersArr != null) {
                        for (t in 0 until tiersArr.length()) {
                            val tObj = tiersArr.getJSONObject(t)
                            tiersList.add(
                                PromotionTier(
                                    threshold = tObj.optInt("threshold", 10),
                                    discountPercent = tObj.optDouble("discountPercent", tObj.optDouble("discount_percent", 5.0)),
                                    freeQuantity = tObj.optInt("freeQuantity", tObj.optInt("free_quantity", 1))
                                )
                            )
                        }
                    }

                    val rawTargetRefs = obj.optString("target_product_ref", "")
                    val parsedTargetRefs = if (rawTargetRefs.isNotBlank()) {
                        rawTargetRefs.split(",").map { it.trim() }.filter { it.isNotBlank() }
                    } else emptyList()

                    list.add(
                        Promotion(
                            id = obj.getString("id"),
                            name = obj.getString("name"),
                            description = obj.optString("description", ""),
                            type = pType,
                            targetType = tTargetType,
                            targetFamily = obj.optString("target_family", null),
                            targetProductId = obj.optString("target_product_id", null),
                            targetProductRef = if (parsedTargetRefs.isNotEmpty()) parsedTargetRefs.first() else obj.optString("target_product_ref", null),
                            targetProductRefs = parsedTargetRefs,
                            targetProductName = obj.optString("target_product_name", null),
                            threshold = obj.optDouble("threshold", 10.0),
                            discountPercent = obj.optDouble("discount_percent", 0.0),
                            freeItemType = fFreeItemType,
                            freeProductId = obj.optString("free_product_id", null),
                            freeProductRef = obj.optString("free_product_ref", null),
                            freeProductName = obj.optString("free_product_name", null),
                            freeQuantity = obj.optInt("free_quantity", 0),
                            tiers = tiersList,
                            voucherAmount = obj.optDouble("voucher_amount", 0.0),
                            isActive = obj.optBoolean("is_active", true),
                            startDate = obj.optString("start_date", "2026-01-01"),
                            endDate = obj.optString("end_date", "2026-12-31")
                        )
                    )
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return@withContext if (list.isNotEmpty()) list else com.bardahl.maroc.util.PromotionEngine.defaultPromotions
    }

    // ─── MAC FILTERING & DEVICE SECURITY (Stored via Supabase logs table) ────────

    suspend fun fetchAuthorizedMacsForCommercial(commercialId: String): List<String> = withContext(Dispatchers.IO) {
        val list = mutableListOf<String>()
        try {
            val conn = getConnection("logs?entity=eq.commercial_device&select=*&limit=200")
            if (conn.responseCode == 200) {
                val jsonStr = conn.inputStream.bufferedReader().use { it.readText() }
                val jsonArray = JSONArray(jsonStr)
                for (i in 0 until jsonArray.length()) {
                    val row = jsonArray.getJSONObject(i)
                    val details = row.optJSONObject("details") ?: continue
                    val cId = details.optString("commercialId", row.optString("entity_id", ""))
                    val isActive = details.optBoolean("isActive", true)
                    val mac = details.optString("macAddress", "").trim().uppercase()
                    if (cId.equals(commercialId, ignoreCase = true) && isActive && mac.isNotBlank()) {
                        list.add(mac)
                    }
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return@withContext list
    }

    suspend fun fetchMacFilteringConfig(): Pair<Boolean, Map<String, Boolean>> = withContext(Dispatchers.IO) {
        var isGlobalActive = true
        val statusMap = mutableMapOf<String, Boolean>()
        try {
            val conn = getConnection("logs?entity=eq.mac_filtering_config&select=*&limit=1&order=created_at.desc")
            if (conn.responseCode == 200) {
                val jsonStr = conn.inputStream.bufferedReader().use { it.readText() }
                val jsonArray = JSONArray(jsonStr)
                if (jsonArray.length() > 0) {
                    val row = jsonArray.getJSONObject(0)
                    val details = row.optJSONObject("details")
                    if (details != null) {
                        isGlobalActive = details.optBoolean("isGlobalFilteringActive", true)
                        val statusObj = details.optJSONObject("commercialsMacStatus")
                        if (statusObj != null) {
                            val keys = statusObj.keys()
                            while (keys.hasNext()) {
                                val k = keys.next()
                                statusMap[k] = statusObj.optBoolean(k, true)
                            }
                        }
                    }
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return@withContext Pair(isGlobalActive, statusMap)
    }

    suspend fun postMacSecurityLog(
        commercialId: String,
        commercialName: String,
        commercialEmail: String,
        attemptedMac: String,
        deviceModel: String,
        status: String,
        reason: String,
        ipAddress: String = "Réseau Mobile / Wi-Fi"
    ): Boolean = withContext(Dispatchers.IO) {
        try {
            val conn = getConnection("logs", "POST")
            conn.doOutput = true
            val nowIso = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).apply {
                timeZone = java.util.TimeZone.getTimeZone("UTC")
            }.format(java.util.Date())

            val details = JSONObject().apply {
                put("commercialId", commercialId)
                put("commercialName", commercialName)
                put("commercialEmail", commercialEmail)
                put("attemptedMac", attemptedMac.trim().uppercase())
                put("deviceModel", deviceModel)
                put("status", status.trim().uppercase())
                put("reason", reason)
                put("ipAddress", ipAddress)
                put("timestamp", nowIso)
            }

            val payload = JSONObject().apply {
                put("action", "MAC_ATTEMPT_${status.trim().uppercase()}")
                put("entity", "mac_security_log")
                if (commercialId.contains("-")) {
                    put("entity_id", commercialId)
                }
                put("details", details)
            }

            conn.outputStream.bufferedWriter().use { it.write(payload.toString()) }
            val code = conn.responseCode
            return@withContext code in 200..299
        } catch (e: Exception) {
            e.printStackTrace()
            return@withContext false
        }
    }

    // ─── DEVIS / ESTIMATIONS (Stored via Supabase logs table with entity = 'devis') ────

    suspend fun fetchDevis(): List<Devis> = withContext(Dispatchers.IO) {
        val list = mutableListOf<Devis>()
        try {
            val conn = getConnection("logs?entity=eq.devis&select=*&order=created_at.desc&limit=500")
            if (conn.responseCode == 200) {
                val jsonStr = conn.inputStream.bufferedReader().use { it.readText() }
                val jsonArray = JSONArray(jsonStr)
                for (i in 0 until jsonArray.length()) {
                    val row = jsonArray.getJSONObject(i)
                    val details = row.optJSONObject("details") ?: continue

                    // Parse items
                    val itemsList = mutableListOf<OrderItem>()
                    val itemsArr = details.optJSONArray("items")
                    if (itemsArr != null) {
                        for (j in 0 until itemsArr.length()) {
                            val itObj = itemsArr.getJSONObject(j)
                            itemsList.add(
                                OrderItem(
                                    id = itObj.optString("id", java.util.UUID.randomUUID().toString()),
                                    orderId = itObj.optString("orderId", ""),
                                    productId = itObj.optString("productId", ""),
                                    productName = itObj.optString("productName", itObj.optString("name", "")),
                                    productReference = itObj.optString("productReference", itObj.optString("reference", "")),
                                    quantity = itObj.optInt("quantity", itObj.optInt("qty", 1)),
                                    freeQuantity = itObj.optInt("freeQuantity", itObj.optInt("qtyGratuit", 0)),
                                    unitPriceTtc = itObj.optDouble("unitPriceTtc", itObj.optDouble("priceTtc", 0.0)),
                                    discountPercentage = itObj.optDouble("discountPercentage", itObj.optDouble("remise", 0.0)),
                                    promoTag = itObj.optString("promoTag", ""),
                                    tvaRate = itObj.optDouble("tvaRate", 20.0),
                                    unitsPerBox = itObj.optInt("unitsPerBox", 12),
                                    isPriceModified = itObj.optBoolean("isPriceModified", false)
                                )
                            )
                        }
                    }

                    val rawStatus = details.optString("status", "EN_ATTENTE").uppercase()
                    val st = when (rawStatus) {
                        "VALIDE", "VALIDATED" -> DevisStatus.VALIDE
                        "CONVERTI", "CONVERTED" -> DevisStatus.CONVERTI
                        "EXPIRE", "EXPIRED" -> DevisStatus.EXPIRE
                        else -> DevisStatus.EN_ATTENTE
                    }

                    list.add(
                        Devis(
                            id = details.optString("id", row.getString("id")),
                            devisNumber = details.optString("devisNumber", "DEV-2026-0001"),
                            commercialId = details.optString("commercialId", details.optString("commercialDbId", row.optString("entity_id", ""))),
                            commercialName = details.optString("commercialName", ""),
                            commercialEmail = details.optString("commercialEmail", ""),
                            clientId = details.optString("clientId", details.optString("clientDbId", "")),
                            clientName = details.optString("clientName", ""),
                            clientIce = details.optString("clientIce", ""),
                            clientCity = details.optString("clientCity", ""),
                            clientAddress = details.optString("clientAddress", ""),
                            clientPhone = details.optString("clientPhone", ""),
                            date = details.optString("date", row.optString("created_at", "").take(10)),
                            validityDate = details.optString("validityDate", ""),
                            status = st,
                            items = itemsList,
                            paymentMethod = details.optString("paymentMethod", "Chèque"),
                            modeExpedition = details.optString("modeExpedition", "Transport Bardahl"),
                            remarque = details.optString("remarque", ""),
                            remisePercent = details.optDouble("remisePercent", 0.0),
                            remiseMontant = details.optDouble("remiseMontant", 0.0),
                            totalHt = details.optDouble("totalHt", 0.0),
                            totalDiscount = details.optDouble("totalDiscount", 0.0),
                            totalTva = details.optDouble("totalTva", 0.0),
                            totalTtc = details.optDouble("totalTtc", 0.0),
                            convertedOrderNumber = details.optString("convertedOrderNumber", null).takeIf { !it.isNullOrBlank() },
                            convertedOrderId = details.optString("convertedOrderId", null).takeIf { !it.isNullOrBlank() },
                            convertedAt = details.optString("convertedAt", null).takeIf { !it.isNullOrBlank() }
                        )
                    )
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return@withContext list
    }

    suspend fun postDevis(devis: Devis): Boolean = withContext(Dispatchers.IO) {
        try {
            val conn = getConnection("logs", "POST")
            conn.doOutput = true
            val nowIso = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US).apply {
                timeZone = java.util.TimeZone.getTimeZone("UTC")
            }.format(java.util.Date())

            val itemsArr = JSONArray()
            devis.items.forEach { itm ->
                itemsArr.put(
                    JSONObject().apply {
                        put("id", itm.id)
                        put("productId", itm.productId)
                        put("productName", itm.productName)
                        put("productReference", itm.productReference)
                        put("quantity", itm.quantity)
                        put("freeQuantity", itm.freeQuantity)
                        put("unitPriceTtc", itm.unitPriceTtc)
                        put("discountPercentage", itm.discountPercentage)
                        put("promoTag", itm.promoTag)
                        put("tvaRate", itm.tvaRate)
                        put("unitsPerBox", itm.unitsPerBox)
                        put("isPriceModified", itm.isPriceModified)
                    }
                )
            }

            val details = JSONObject().apply {
                put("id", devis.id)
                put("devisNumber", devis.devisNumber)
                put("commercialId", devis.commercialId)
                put("commercialDbId", devis.commercialId)
                put("commercialName", devis.commercialName)
                put("commercialEmail", devis.commercialEmail)
                put("clientId", devis.clientId)
                put("clientDbId", devis.clientId)
                put("clientName", devis.clientName)
                put("clientIce", devis.clientIce)
                put("clientCity", devis.clientCity)
                put("clientAddress", devis.clientAddress)
                put("clientPhone", devis.clientPhone)
                put("date", devis.date)
                put("validityDate", devis.validityDate)
                put("status", devis.status.name)
                put("items", itemsArr)
                put("paymentMethod", devis.paymentMethod)
                put("modeExpedition", devis.modeExpedition)
                put("remarque", devis.remarque)
                put("remisePercent", devis.remisePercent)
                put("remiseMontant", devis.remiseMontant)
                put("totalHt", devis.totalHt)
                put("totalDiscount", devis.totalDiscount)
                put("totalTva", devis.totalTva)
                put("totalTtc", devis.totalTtc)
                put("convertedOrderNumber", devis.convertedOrderNumber)
                put("convertedOrderId", devis.convertedOrderId)
                put("convertedAt", devis.convertedAt)
                put("createdAt", nowIso)
            }

            val payload = JSONObject().apply {
                put("action", "DEVIS_" + devis.status.name)
                put("entity", "devis")
                if (devis.commercialId.contains("-")) {
                    put("entity_id", devis.commercialId)
                }
                put("details", details)
            }

            conn.outputStream.bufferedWriter().use { it.write(payload.toString()) }
            val code = conn.responseCode
            return@withContext code in 200..299
        } catch (e: Exception) {
            e.printStackTrace()
            return@withContext false
        }
    }

    suspend fun updateDevis(devis: Devis): Boolean = withContext(Dispatchers.IO) {
        try {
            val getConn = getConnection("logs?entity=eq.devis&select=id,details&limit=200")
            var targetRowId: String? = null
            if (getConn.responseCode == 200) {
                val str = getConn.inputStream.bufferedReader().use { it.readText() }
                val arr = JSONArray(str)
                for (i in 0 until arr.length()) {
                    val r = arr.getJSONObject(i)
                    val d = r.optJSONObject("details")
                    if (d != null) {
                        val dId = d.optString("id", "")
                        val dNum = d.optString("devisNumber", "")
                        if (dId == devis.id || (dNum.isNotBlank() && dNum == devis.devisNumber)) {
                            targetRowId = r.getString("id")
                            break
                        }
                    }
                }
            }

            if (targetRowId != null) {
                val patchConn = getConnection("logs?id=eq.$targetRowId", "PATCH")
                patchConn.doOutput = true

                val itemsArr = JSONArray()
                devis.items.forEach { itm ->
                    itemsArr.put(
                        JSONObject().apply {
                            put("id", itm.id)
                            put("productId", itm.productId)
                            put("productName", itm.productName)
                            put("productReference", itm.productReference)
                            put("quantity", itm.quantity)
                            put("freeQuantity", itm.freeQuantity)
                            put("unitPriceTtc", itm.unitPriceTtc)
                            put("discountPercentage", itm.discountPercentage)
                            put("promoTag", itm.promoTag)
                            put("tvaRate", itm.tvaRate)
                            put("unitsPerBox", itm.unitsPerBox)
                            put("isPriceModified", itm.isPriceModified)
                        }
                    )
                }

                val details = JSONObject().apply {
                    put("id", devis.id)
                    put("devisNumber", devis.devisNumber)
                    put("commercialId", devis.commercialId)
                    put("commercialDbId", devis.commercialId)
                    put("commercialName", devis.commercialName)
                    put("commercialEmail", devis.commercialEmail)
                    put("clientId", devis.clientId)
                    put("clientDbId", devis.clientId)
                    put("clientName", devis.clientName)
                    put("clientIce", devis.clientIce)
                    put("clientCity", devis.clientCity)
                    put("clientAddress", devis.clientAddress)
                    put("clientPhone", devis.clientPhone)
                    put("date", devis.date)
                    put("validityDate", devis.validityDate)
                    put("status", devis.status.name)
                    put("items", itemsArr)
                    put("paymentMethod", devis.paymentMethod)
                    put("modeExpedition", devis.modeExpedition)
                    put("remarque", devis.remarque)
                    put("remisePercent", devis.remisePercent)
                    put("remiseMontant", devis.remiseMontant)
                    put("totalHt", devis.totalHt)
                    put("totalDiscount", devis.totalDiscount)
                    put("totalTva", devis.totalTva)
                    put("totalTtc", devis.totalTtc)
                    put("convertedOrderNumber", devis.convertedOrderNumber)
                    put("convertedOrderId", devis.convertedOrderId)
                    put("convertedAt", devis.convertedAt)
                }

                val payload = JSONObject().apply {
                    put("action", "DEVIS_" + devis.status.name)
                    put("details", details)
                }

                patchConn.outputStream.bufferedWriter().use { it.write(payload.toString()) }
                return@withContext patchConn.responseCode in 200..299
            } else {
                return@withContext postDevis(devis)
            }
        } catch (e: Exception) {
            e.printStackTrace()
            return@withContext false
        }
    }

    suspend fun deleteDevis(devisId: String): Boolean = withContext(Dispatchers.IO) {
        try {
            val getConn = getConnection("logs?entity=eq.devis&select=id,details&limit=200")
            var targetRowId: String? = null
            if (getConn.responseCode == 200) {
                val str = getConn.inputStream.bufferedReader().use { it.readText() }
                val arr = JSONArray(str)
                for (i in 0 until arr.length()) {
                    val r = arr.getJSONObject(i)
                    val d = r.optJSONObject("details")
                    if (d != null && (d.optString("id", "") == devisId || r.getString("id") == devisId)) {
                        targetRowId = r.getString("id")
                        break
                    }
                }
            }

            if (targetRowId != null) {
                val delConn = getConnection("logs?id=eq.$targetRowId", "DELETE")
                return@withContext delConn.responseCode in 200..299
            }
            return@withContext false
        } catch (e: Exception) {
            e.printStackTrace()
            return@withContext false
        }
    }
}
