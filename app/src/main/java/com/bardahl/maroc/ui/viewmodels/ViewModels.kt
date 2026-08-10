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
    private val _authState = MutableStateFlow<AuthState>(AuthState.Idle)
    val authState: StateFlow<AuthState> = _authState.asStateFlow()

    fun login(email: String, password: String, role: UserRole) {
        viewModelScope.launch {
            _authState.value = AuthState.Loading
            kotlinx.coroutines.delay(500)

            val cleanEmail = email.trim().lowercase()

            if (cleanEmail.isNotBlank()) {
                if (cleanEmail == "bardahl@gmail.com") {
                    val user = User(
                        id = "11111111-1111-1111-1111-111111111111",
                        email = "bardahl@gmail.com",
                        role = UserRole.ADMIN,
                        firstName = "Direction",
                        lastName = "Bardahl (Admin)",
                        phone = "+212 5 22 11 22 33"
                    )
                    _authState.value = AuthState.Success(user, null)
                } else {
                    // ANY OTHER ACCOUNT IS STRICTLY COMMERCIAL
                    val user = User(
                        id = "user_${System.currentTimeMillis()}",
                        email = cleanEmail,
                        role = UserRole.COMMERCIAL,
                        firstName = cleanEmail.substringBefore("@").uppercase(),
                        lastName = "Commercial",
                        phone = "+212 6 61 00 11 22"
                    )
                    val commercial = Commercial(
                        id = "comm_${System.currentTimeMillis()}",
                        userId = user.id,
                        name = user.firstName,
                        email = user.email,
                        phone = user.phone,
                        matricule = "COMM-004",
                        city = "Casablanca",
                        targetMonthlySales = 150000.0,
                        currentMonthSales = 0.0,
                        totalOrdersCount = 0
                    )
                    _authState.value = AuthState.Success(user, commercial)
                }
            } else {
                _authState.value = AuthState.Error("Veuillez saisir une adresse email valide.")
            }
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
            totalOrders = 36,
            ordersToday = 4,
            ordersThisMonth = 22,
            totalRevenueTtc = 184500.0,
            activeClientsCount = 18,
            activeProductsCount = BardahlCatalogData.allProducts.size
        )
    )
    val stats: StateFlow<DashboardStats> = _stats.asStateFlow()
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

    fun updateSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun addClient(client: Client) {
        viewModelScope.launch {
            _clientsList.value = _clientsList.value + client
            clientRepository.saveClient(client)
        }
    }
}

class ProductViewModel(private val productRepository: ProductRepository) : ViewModel() {
    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery.asStateFlow()

    private val _products = MutableStateFlow<List<Product>>(BardahlCatalogData.allProducts)
    val products: StateFlow<List<Product>> = _products.asStateFlow()

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }
}

class OrderViewModel(private val orderRepository: OrderRepository) : ViewModel() {
    private val _orders = MutableStateFlow<List<Order>>(
        listOf(
            Order(
                id = "o1",
                orderNumber = "BC-2026-00001",
                commercialId = "c8888888-8888-8888-8888-888888888888",
                commercialName = "Karim Benjelloun",
                clientId = "c1",
                clientName = "Auto Service Ain Sebaa",
                orderDate = "2026-08-05 14:30",
                status = OrderStatus.VALIDATED,
                totalHt = 4250.0,
                totalTva = 850.0,
                totalTtc = 5100.0,
                items = listOf(
                    OrderItem(productId = "la1", productName = "Bardahl XTRA 10W40 1L", productReference = "34131", quantity = 24, unitPriceTtc = 78.0),
                    OrderItem(productId = "ind65", productName = "GRAISSE BLANCHE Aérosol 400ml", productReference = "1381B", quantity = 12, unitPriceTtc = 80.0)
                )
            ),
            Order(
                id = "o2",
                orderNumber = "BC-2026-00002",
                commercialId = "c8888888-8888-8888-8888-888888888888",
                commercialName = "Karim Benjelloun",
                clientId = "c2",
                clientName = "Station Afriquia Route de Rabat",
                orderDate = "2026-08-05 16:15",
                status = OrderStatus.DRAFT,
                totalHt = 7450.0,
                totalTva = 1490.0,
                totalTtc = 8940.0,
                items = listOf(
                    OrderItem(productId = "la3", productName = "Bardahl XTRA 5W40 1L", productReference = "34121", quantity = 36, unitPriceTtc = 120.0)
                )
            )
        )
    )
    val orders: StateFlow<List<Order>> = _orders.asStateFlow()

    fun createOrder(order: Order) {
        viewModelScope.launch {
            _orders.value = listOf(order) + _orders.value
            orderRepository.saveOrder(order)
        }
    }
}
