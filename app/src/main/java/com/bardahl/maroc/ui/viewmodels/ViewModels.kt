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

    fun login(email: String, password: String) {
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
    private val _orders = MutableStateFlow<List<Order>>(emptyList())
    val orders: StateFlow<List<Order>> = _orders.asStateFlow()

    init {
        refreshOrdersFromSupabase()
    }

    fun refreshOrdersFromSupabase() {
        viewModelScope.launch {
            try {
                val remote = orderRepository.fetchRemoteOrdersDirectly()
                _orders.value = remote
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    fun createOrder(order: Order) {
        viewModelScope.launch {
            _orders.value = listOf(order) + _orders.value
            orderRepository.saveOrder(order)
        }
    }
}
