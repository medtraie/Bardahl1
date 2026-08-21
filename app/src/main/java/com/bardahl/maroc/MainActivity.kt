package com.bardahl.maroc

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.viewModels
import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.bardahl.maroc.data.local.AppDatabase
import com.bardahl.maroc.data.remote.SupabaseService
import com.bardahl.maroc.data.repository.ClientRepository
import com.bardahl.maroc.data.repository.OrderRepository
import com.bardahl.maroc.data.repository.ProductRepository
import com.bardahl.maroc.domain.model.UserRole
import com.bardahl.maroc.ui.screens.analytics.AnalyticsScreen
import com.bardahl.maroc.ui.screens.auth.LoginScreen
import com.bardahl.maroc.ui.screens.clients.ClientListScreen
import com.bardahl.maroc.ui.screens.commercials.CommercialManagementScreen
import com.bardahl.maroc.ui.screens.dashboard.DashboardScreen
import com.bardahl.maroc.ui.screens.orders.OrderCreateScreen
import com.bardahl.maroc.ui.screens.orders.OrderListScreen
import com.bardahl.maroc.ui.screens.products.ProductCatalogScreen
import com.bardahl.maroc.ui.screens.settings.SettingsScreen
import com.bardahl.maroc.ui.theme.*
import com.bardahl.maroc.ui.viewmodels.*

class MainActivity : ComponentActivity() {

    private val authViewModel by viewModels<AuthViewModel>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val db = AppDatabase.getInstance(this)
        val supabaseService = SupabaseService()
        val clientRepository = ClientRepository(db.clientDao(), supabaseService)
        val productRepository = ProductRepository(db.productDao(), supabaseService)
        val orderRepository = OrderRepository(db.orderDao(), db.syncQueueDao(), supabaseService)

        val dashboardViewModel = DashboardViewModel(orderRepository, clientRepository, productRepository)
        val clientViewModel = ClientViewModel(clientRepository)
        val productViewModel = ProductViewModel(productRepository)
        val orderViewModel = OrderViewModel(orderRepository)

        setContent {
            BardahlTheme {
                MainAppNavHost(
                    authViewModel = authViewModel,
                    dashboardViewModel = dashboardViewModel,
                    clientViewModel = clientViewModel,
                    productViewModel = productViewModel,
                    orderViewModel = orderViewModel
                )
            }
        }
    }
}

sealed class Screen(val route: String, val title: String, val icon: ImageVector) {
    object Login : Screen("login", "Connexion", Icons.Default.Lock)
    object Dashboard : Screen("dashboard", "Accueil", Icons.Default.Dashboard)
    object Clients : Screen("clients", "Clients", Icons.Default.People)
    object Products : Screen("products", "Produits", Icons.Default.Inventory2)
    object Orders : Screen("orders", "Bons de Commande", Icons.Default.ReceiptLong)
    object CreateOrder : Screen("create_order", "Nouveau Bon", Icons.Default.AddCircle)
    object Commercials : Screen("commercials", "Commerciaux", Icons.Default.Badge)
    object Analytics : Screen("analytics", "Analyses", Icons.Default.Analytics)
    object Settings : Screen("settings", "Paramètres", Icons.Default.Settings)
}

@Composable
fun MainAppNavHost(
    authViewModel: AuthViewModel,
    dashboardViewModel: DashboardViewModel,
    clientViewModel: ClientViewModel,
    productViewModel: ProductViewModel,
    orderViewModel: OrderViewModel
) {
    val navController = rememberNavController()
    val authState by authViewModel.authState.collectAsState()
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    val isLoggedIn = authState is AuthState.Success
    val currentUser = (authState as? AuthState.Success)?.user
    val isAdmin = currentUser?.role == UserRole.ADMIN

    val navigateToSettings = {
        navController.navigate(Screen.Settings.route) {
            launchSingleTop = true
        }
    }

    val scrollState = rememberScrollState()

    Scaffold(
        bottomBar = {
            if (isLoggedIn && currentRoute != Screen.Login.route && currentRoute != Screen.CreateOrder.route) {
                Surface(
                    color = BardahlCardDark,
                    tonalElevation = 8.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(scrollState)
                            .padding(horizontal = 8.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        val bottomNavItems = if (isAdmin) {
                            listOf(Screen.Dashboard, Screen.Clients, Screen.Products, Screen.Orders, Screen.Commercials, Screen.Analytics)
                        } else {
                            listOf(Screen.Dashboard, Screen.Clients, Screen.Products, Screen.Orders)
                        }

                        bottomNavItems.forEach { screen ->
                            val isSelected = currentRoute == screen.route
                            val bgColor = if (isSelected) BardahlYellow else DarkSurface
                            val contentColor = if (isSelected) BardahlBlack else TextSecondaryDark

                            Row(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(14.dp))
                                    .background(bgColor)
                                    .border(1.dp, if (isSelected) BardahlYellow else BardahlCardBorder, RoundedCornerShape(14.dp))
                                    .clickable {
                                        if (currentRoute != screen.route) {
                                            navController.navigate(screen.route) {
                                                popUpTo(Screen.Dashboard.route) { saveState = true }
                                                launchSingleTop = true
                                                restoreState = true
                                            }
                                        }
                                    }
                                    .padding(horizontal = 14.dp, vertical = 10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.Center
                            ) {
                                Icon(
                                    imageVector = screen.icon,
                                    contentDescription = screen.title,
                                    tint = contentColor,
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = screen.title,
                                    color = contentColor,
                                    fontSize = 12.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.SemiBold,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }
                    }
                }
            }
        },
        containerColor = DarkBackground
    ) { paddingValues ->
        Box(modifier = Modifier.padding(paddingValues)) {
            NavHost(
                navController = navController,
                startDestination = if (isLoggedIn) Screen.Dashboard.route else Screen.Login.route
            ) {
                composable(Screen.Login.route) {
                    LoginScreen(
                        authViewModel = authViewModel,
                        onLoginSuccess = {
                            navController.navigate(Screen.Dashboard.route) {
                                popUpTo(Screen.Login.route) { inclusive = true }
                            }
                        }
                    )
                }
                composable(Screen.Dashboard.route) {
                    DashboardScreen(
                        dashboardViewModel = dashboardViewModel,
                        orderViewModel = orderViewModel,
                        clientViewModel = clientViewModel,
                        authViewModel = authViewModel,
                        onCreateOrderClick = { navController.navigate(Screen.CreateOrder.route) },
                        onSettingsClick = navigateToSettings
                    )
                }
                composable(Screen.Clients.route) {
                    ClientListScreen(
                        clientViewModel = clientViewModel,
                        orderViewModel = orderViewModel,
                        authViewModel = authViewModel,
                        onSettingsClick = navigateToSettings
                    )
                }
                composable(Screen.Products.route) {
                    ProductCatalogScreen(
                        productViewModel = productViewModel,
                        onSettingsClick = navigateToSettings
                    )
                }
                composable(Screen.Orders.route) {
                    OrderListScreen(
                        orderViewModel = orderViewModel,
                        authViewModel = authViewModel,
                        onCreateOrderClick = { navController.navigate(Screen.CreateOrder.route) },
                        onSettingsClick = navigateToSettings
                    )
                }
                composable(Screen.CreateOrder.route) {
                    OrderCreateScreen(
                        orderViewModel = orderViewModel,
                        clientViewModel = clientViewModel,
                        productViewModel = productViewModel,
                        authViewModel = authViewModel,
                        onOrderCreated = { navController.popBackStack() }
                    )
                }
                composable(Screen.Commercials.route) {
                    CommercialManagementScreen(onSettingsClick = navigateToSettings)
                }
                composable(Screen.Analytics.route) {
                    AnalyticsScreen(onSettingsClick = navigateToSettings)
                }
                composable(Screen.Settings.route) {
                    SettingsScreen(
                        authViewModel = authViewModel,
                        onLogoutClick = {
                            authViewModel.logout()
                            navController.navigate(Screen.Login.route) {
                                popUpTo(0)
                            }
                        }
                    )
                }
            }
        }
    }
}
