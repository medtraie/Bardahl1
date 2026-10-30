package com.bardahl.maroc.ui.viewmodels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.bardahl.maroc.data.BardahlCatalogData
import com.bardahl.maroc.data.repository.ClientRepository
import com.bardahl.maroc.data.repository.OrderRepository
import com.bardahl.maroc.data.repository.ProductRepository
import com.bardahl.maroc.domain.model.*
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

sealed class AuthState {
    object Idle : AuthState()
    object Loading : AuthState()
    data class Success(val user: User, val commercial: Commercial? = null) : AuthState()
    data class Error(val message: String) : AuthState()
}

class AuthViewModel : ViewModel() {
    private val supabaseService = com.bardahl.maroc.data.remote.SupabaseService()

    private val _authState = MutableStateFlow<AuthState>(AuthState.Idle)
    val authState: StateFlow<AuthState> = _authState.asStateFlow()

    // Cache commercials after first fetch so login can validate against real data
    private var _commercials: List<Commercial> = emptyList()

    init {
        // Pre-load commercials list on startup so login is immediate
        viewModelScope.launch {
            try {
                _commercials = supabaseService.fetchCommercials()
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun login(email: String, password: String, context: android.content.Context? = null) {
        viewModelScope.launch {
            _authState.value = AuthState.Loading

            val cleanEmail = email.trim().lowercase()
            val cleanPassword = password.trim()

            if (cleanEmail.isBlank()) {
                _authState.value = AuthState.Error("Veuillez saisir une adresse email valide.")
                return@launch
            }

            if (cleanPassword.isBlank()) {
                _authState.value = AuthState.Error("Veuillez saisir votre mot de passe.")
                return@launch
            }

            // Admin login
            if (cleanEmail == "bardahl@gmail.com") {
                if (cleanPassword != "123456" && cleanPassword != "123") {
                    _authState.value = AuthState.Error("Mot de passe incorrect.")
                    return@launch
                }
                val user = User(
                    id = "11111111-1111-1111-1111-111111111111",
                    email = "bardahl@gmail.com",
                    role = UserRole.ADMIN,
                    firstName = "Direction",
                    lastName = "Bardahl (Admin)",
                    phone = "+212 5 22 11 22 33"
                )
                _authState.value = AuthState.Success(user, null)
                return@launch
            }

            // Always fetch the freshest commercials to ensure any recently changed password in Équipe Commerciale is applied!
            try {
                _commercials = supabaseService.fetchCommercials()
            } catch (e: Exception) {
                if (_commercials.isEmpty()) {
                    _authState.value = AuthState.Error("Impossible de vérifier les identifiants. Vérifiez votre connexion Internet.")
                    return@launch
                }
            }

            // Find commercial by email or name/prefix
            val emailPrefix = cleanEmail.substringBefore("@")
            val comm = _commercials.find { it.email.trim().lowercase() == cleanEmail }
                ?: _commercials.find { it.name.trim().lowercase() == emailPrefix || it.name.trim().lowercase().contains(emailPrefix) }

            if (comm == null) {
                _authState.value = AuthState.Error("Aucun compte trouvé pour \"$cleanEmail\".")
                return@launch
            }

            if (!comm.isActive) {
                _authState.value = AuthState.Error("Ce compte commercial est actuellement désactivé. Veuillez contacter la direction.")
                return@launch
            }

            // Strict password check against the commercial's account password!
            val expectedPassword = comm.password.trim().ifBlank { "123456" }
            if (cleanPassword != expectedPassword) {
                _authState.value = AuthState.Error("Mot de passe incorrect.")
                return@launch
            }

            // MAC Filtering & Device Authorization Check (Max 3 Devices per Commercial)
            val currentMac = com.bardahl.maroc.util.DeviceSecurityUtil.getDeviceMacAddress(context)
            val deviceInfo = com.bardahl.maroc.util.DeviceSecurityUtil.getDeviceInfo(context)

            // Check if MAC filtering is active globally and for this commercial
            val (isGlobalFilteringActive, commsMacStatus) = supabaseService.fetchMacFilteringConfig()
            val isFilteringActiveForComm = isGlobalFilteringActive && (commsMacStatus[comm.id] != false)

            if (isFilteringActiveForComm) {
                // Fetch authorized MACs from Supabase
                val authorizedMacs = supabaseService.fetchAuthorizedMacsForCommercial(comm.id)
                val cleanCurrentMac = currentMac.replace(":", "").replace("-", "").uppercase()

                val isAuthorized = authorizedMacs.any { authMac ->
                    authMac.replace(":", "").replace("-", "").equals(cleanCurrentMac, ignoreCase = true)
                }

                if (!isAuthorized) {
                    val reason = if (authorizedMacs.isEmpty()) {
                        "Aucun appareil enregistré pour ce commercial (Accès restreint Direction)"
                    } else {
                        "Tentative depuis un appareil non enregistré (MAC non autorisée)"
                    }

                    // Record blocked attempt in Supabase logs table immediately!
                    supabaseService.postMacSecurityLog(
                        commercialId = comm.id,
                        commercialName = comm.name,
                        commercialEmail = comm.email,
                        attemptedMac = currentMac,
                        deviceModel = deviceInfo.deviceModel,
                        status = "BLOCKED",
                        reason = reason
                    )

                    val errorMsg = "🔒 ACCÈS REFUSÉ : Cet appareil n'est pas autorisé par la Direction Bardahl.\n\nAdresse MAC : $currentMac\nModèle : ${deviceInfo.deviceModel}\n\nMaximum 3 appareils autorisés. Contactez votre administrateur pour enregistrer ce téléphone."
                    _authState.value = AuthState.Error(errorMsg)
                    return@launch
                } else {
                    // Record successful authorized login attempt in Supabase logs table!
                    supabaseService.postMacSecurityLog(
                        commercialId = comm.id,
                        commercialName = comm.name,
                        commercialEmail = comm.email,
                        attemptedMac = currentMac,
                        deviceModel = deviceInfo.deviceModel,
                        status = "AUTHORIZED",
                        reason = "Appareil autorisé conforme"
                    )
                }
            }

            val user = User(
                id = comm.id,
                email = comm.email.ifBlank { cleanEmail },
                role = UserRole.COMMERCIAL,
                firstName = comm.name,
                lastName = "",
                phone = comm.phone
            )
            _authState.value = AuthState.Success(user, comm)
        }
    }

    fun logout() {
        _authState.value = AuthState.Idle
    }
}

class DashboardViewModel(
    private val orderRepository: OrderRepository,
    private val clientRepository: ClientRepository,
    private val productRepository: ProductRepository
) : ViewModel() {

    private val _stats = MutableStateFlow(
        DashboardStats(
            totalOrders = 0,
            ordersToday = 0,
            ordersThisMonth = 0,
            totalRevenueTtc = 0.0,
            activeClientsCount = 0,
            activeProductsCount = BardahlCatalogData.allProducts.size
        )
    )
    val stats: StateFlow<DashboardStats> = _stats.asStateFlow()

    init {
        loadLiveStats()
    }

    fun loadLiveStats() {
        viewModelScope.launch {
            try {
                val clients = clientRepository.fetchRemoteClientsDirectly()
                _stats.value = _stats.value.copy(activeClientsCount = clients.size)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }
}

class ClientViewModel(private val clientRepository: ClientRepository) : ViewModel() {
    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _clientsList = MutableStateFlow<List<Client>>(
        listOf(
            Client("c1", "88888888-8888-8888-8888-888888888888", "Auto Service Ain Sebaa", "001548792000088", "45892", "1425367", "789654", "Zone Ind. Ain Sebaa", "Casablanca", "+212 5 22 35 44 55", "contact@autoservice.ma", ClientType.GARAGE),
            Client("c2", "88888888-8888-8888-8888-888888888888", "Station Afriquia Route de Rabat", "001984256000077", "12458", "8523694", "456123", "Km 12 Route de Rabat", "Casablanca", "+212 5 22 78 99 00", "station@afriquia.ma", ClientType.STATION),
            Client("c3", "88888888-8888-8888-8888-888888888888", "Transport & Logistique du Sud", "002145893000066", "89654", "3692581", "123987", "Zone Logistique Zenata", "Mohammedia", "+212 5 23 30 20 10", "achats@tlsud.ma", ClientType.FLOTTE)
        )
    )
    val clientsList: StateFlow<List<Client>> = _clientsList.asStateFlow()

    init {
        refreshClientsFromSupabase()
    }

    fun refreshClientsFromSupabase() {
        viewModelScope.launch {
            try {
                val remote = clientRepository.fetchRemoteClientsDirectly()
                if (remote.isNotEmpty()) {
                    _clientsList.value = remote
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun updateSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun addClient(client: Client) {
        viewModelScope.launch {
            _clientsList.value = listOf(client) + _clientsList.value
            clientRepository.saveClient(client)
        }
    }

    fun updateClient(client: Client) {
        viewModelScope.launch {
            _clientsList.value = _clientsList.value.map { if (it.id == client.id) client else it }
            clientRepository.updateClient(client)
        }
    }

    fun deleteClient(id: String) {
        viewModelScope.launch {
            _clientsList.value = _clientsList.value.filter { it.id != id }
            clientRepository.deleteClient(id)
        }
    }
}

class ProductViewModel(private val productRepository: ProductRepository) : ViewModel() {
    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _products = MutableStateFlow<List<Product>>(BardahlCatalogData.allProducts)
    val products: StateFlow<List<Product>> = _products.asStateFlow()

    init {
        refreshProductsFromSupabase()
    }

    fun refreshProductsFromSupabase() {
        viewModelScope.launch {
            try {
                val remote = productRepository.fetchRemoteProductsDirectly()
                if (remote.isNotEmpty()) {
                    val map = mutableMapOf<String, Product>()
                    BardahlCatalogData.allProducts.forEach { map[it.id] = it }
                    remote.forEach { map[it.id] = it }
                    _products.value = map.values.toList()
                } else {
                    _products.value = BardahlCatalogData.allProducts
                }
            } catch (e: Exception) {
                e.printStackTrace()
                _products.value = BardahlCatalogData.allProducts
            }
        }
    }

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }
}

class OrderViewModel(private val orderRepository: OrderRepository) : ViewModel() {
    private val supabaseService = com.bardahl.maroc.data.remote.SupabaseService()
    private val _orders = MutableStateFlow<List<Order>>(emptyList())
    val orders: StateFlow<List<Order>> = _orders.asStateFlow()

    private val _promotions = MutableStateFlow<List<Promotion>>(com.bardahl.maroc.util.PromotionEngine.defaultPromotions)
    val promotions: StateFlow<List<Promotion>> = _promotions.asStateFlow()

    init {
        refreshOrdersFromSupabase()
        refreshPromotions()
        refreshDevisFromSupabase()
    }

    fun refreshDevisFromSupabase() {
        viewModelScope.launch {
            try {
                val remote = supabaseService.fetchDevis()
                if (remote.isNotEmpty()) {
                    _devis.value = remote
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun refreshPromotions() {
        viewModelScope.launch {
            try {
                val remote = supabaseService.fetchPromotions()
                if (remote.isNotEmpty()) {
                    _promotions.value = remote
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun refreshOrdersFromSupabase() {
        viewModelScope.launch {
            try {
                val remote = orderRepository.fetchRemoteOrdersDirectly()
                val current = _orders.value
                val merged = (current.filter { it.isSynced.not() } + remote).distinctBy { it.orderNumber }
                _orders.value = if (merged.isNotEmpty()) merged else remote
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    private val _editingOrder = MutableStateFlow<Order?>(null)
    val editingOrder: StateFlow<Order?> = _editingOrder.asStateFlow()

    fun setEditingOrder(order: Order?) {
        _editingOrder.value = order
    }

    fun createOrder(order: Order) {
        viewModelScope.launch {
            _orders.value = listOf(order) + _orders.value.filter { it.orderNumber != order.orderNumber }
            orderRepository.saveOrder(order)
            try {
                val remote = orderRepository.fetchRemoteOrdersDirectly()
                val merged = (listOf(order) + remote).distinctBy { it.orderNumber }
                _orders.value = merged
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun updateOrder(order: Order) {
        viewModelScope.launch {
            _orders.value = _orders.value.map { if (it.orderNumber == order.orderNumber || it.id == order.id) order else it }
            orderRepository.updateOrder(order)
            _editingOrder.value = null
            try {
                val remote = orderRepository.fetchRemoteOrdersDirectly()
                val merged = (listOf(order) + remote).distinctBy { it.orderNumber }
                _orders.value = merged
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    // ── DEVIS / ESTIMATIONS STATE & CRUD ──
    private val _devis = MutableStateFlow<List<Devis>>(emptyList())
    val devis: StateFlow<List<Devis>> = _devis.asStateFlow()

    fun createDevis(d: Devis) {
        viewModelScope.launch {
            _devis.value = listOf(d) + _devis.value.filter { it.id != d.id && it.devisNumber != d.devisNumber }
            try {
                supabaseService.postDevis(d)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun updateDevis(d: Devis) {
        viewModelScope.launch {
            _devis.value = _devis.value.map { if (it.id == d.id || it.devisNumber == d.devisNumber) d else it }
            try {
                supabaseService.updateDevis(d)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun deleteDevis(id: String) {
        viewModelScope.launch {
            _devis.value = _devis.value.filter { it.id != id }
            try {
                supabaseService.deleteDevis(id)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun convertDevisToOrder(targetDevis: Devis): Order {
        val nextNum = String.format("BC-2026-%06d", 4332 + _orders.value.size + 1)
        val newOrder = Order(
            id = "ord_" + System.currentTimeMillis(),
            orderNumber = nextNum,
            commercialId = targetDevis.commercialId,
            commercialName = targetDevis.commercialName,
            clientId = targetDevis.clientId,
            clientName = targetDevis.clientName,
            orderDate = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.getDefault()).format(java.util.Date()),
            status = OrderStatus.VALIDATED,
            items = targetDevis.items,
            paymentMethod = targetDevis.paymentMethod,
            modeExpedition = targetDevis.modeExpedition,
            remarque = if (targetDevis.remarque.isNotBlank()) "[Converti depuis Devis ${targetDevis.devisNumber}] ${targetDevis.remarque}" else "Converti depuis Devis ${targetDevis.devisNumber}",
            remisePercent = targetDevis.remisePercent,
            remiseMontant = targetDevis.remiseMontant,
            totalHt = targetDevis.totalHt,
            totalDiscount = targetDevis.totalDiscount,
            totalTva = targetDevis.totalTva,
            totalTtc = targetDevis.totalTtc,
            hasAnormalPrice = false
        )

        createOrder(newOrder)

        val updatedDevis = targetDevis.copy(
            status = DevisStatus.CONVERTI,
            convertedOrderNumber = nextNum,
            convertedOrderId = newOrder.id,
            convertedAt = java.text.SimpleDateFormat("yyyy-MM-dd HH:mm", java.util.Locale.getDefault()).format(java.util.Date())
        )
        updateDevis(updatedDevis)

        return newOrder
    }
}
