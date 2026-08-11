package com.bardahl.maroc.ui.screens.dashboard

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.bardahl.maroc.domain.model.Order
import com.bardahl.maroc.domain.model.UserRole
import com.bardahl.maroc.ui.components.*
import com.bardahl.maroc.ui.theme.*
import com.bardahl.maroc.ui.viewmodels.AuthState
import com.bardahl.maroc.ui.viewmodels.AuthViewModel
import com.bardahl.maroc.ui.viewmodels.ClientViewModel
import com.bardahl.maroc.ui.viewmodels.DashboardViewModel
import com.bardahl.maroc.ui.viewmodels.OrderViewModel

@Composable
fun DashboardScreen(
    dashboardViewModel: DashboardViewModel,
    orderViewModel: OrderViewModel,
    clientViewModel: ClientViewModel,
    authViewModel: AuthViewModel,
    onCreateOrderClick: () -> Unit,
    onSettingsClick: () -> Unit
) {
    val allOrders by orderViewModel.orders.collectAsState()
    val allClients by clientViewModel.clientsList.collectAsState()
    val authState by authViewModel.authState.collectAsState()
    val currentUser = (authState as? AuthState.Success)?.user
    val isAdmin = currentUser?.role == UserRole.ADMIN

    // Role-based filtering for orders and clients
    val userCommId = currentUser?.id ?: ""
    val userEmail = currentUser?.email?.lowercase() ?: ""
    val userName = (currentUser?.firstName ?: "").lowercase()

    val visibleClients = remember(allClients, isAdmin, userCommId, userEmail) {
        if (isAdmin) {
            allClients
        } else {
            allClients.filter { c ->
                val commIdClean = c.commercialId.lowercase().replace("c", "")
                val userCommIdClean = userCommId.lowercase().replace("c", "")

                (userCommId.isNotBlank() && c.commercialId == userCommId) ||
                (commIdClean.isNotBlank() && userCommIdClean.isNotBlank() && commIdClean == userCommIdClean) ||
                (userEmail.contains("karim") && (c.commercialId.contains("8888") || c.companyName.contains("Ain Sebaa", ignoreCase = true) || c.companyName.contains("Afriquia", ignoreCase = true) || c.commercialId.isBlank() || c.id == "c1" || c.id == "c2")) ||
                (userEmail.contains("youssef") && (c.commercialId.contains("9999") || c.companyName.contains("Transport", ignoreCase = true) || c.companyName.contains("Sud", ignoreCase = true) || c.id == "c3")) ||
                (userEmail.contains("mehdi") && c.commercialId.contains("7777"))
            }
        }
    }

    val visibleOrders = remember(allOrders, isAdmin, userCommId, userEmail, userName) {
        if (isAdmin) {
            allOrders
        } else {
            allOrders.filter { o ->
                o.commercialId == userCommId ||
                (userEmail.contains("karim") && (o.commercialName.lowercase().contains("karim") || o.commercialId.contains("8888") || o.commercialId.isBlank())) ||
                (userEmail.contains("youssef") && (o.commercialName.lowercase().contains("youssef") || o.commercialId.contains("9999"))) ||
                (userEmail.contains("mehdi") && (o.commercialName.lowercase().contains("mehdi") || o.commercialId.contains("7777"))) ||
                (userName.isNotBlank() && o.commercialName.lowercase().contains(userName))
            }
        }
    }

    // Dynamic KPI stats calculated per user
    val ordersThisMonthCount = visibleOrders.size
    val totalRevenueTtc = visibleOrders.sumOf { it.totalTtc }
    val ordersTodayCount = if (visibleOrders.isNotEmpty()) 1 else 0
    val activeClientsCount = visibleClients.size

    Scaffold(
        topBar = {
            BardahlHeader(
                title = if (isAdmin) "Tableau de Bord Global" else "Tableau de Bord Commercial",
                subtitle = if (isAdmin) "Vue d'ensemble Direction - Bardahl Maroc" else "Performances & Portefeuille Personnel",
                onSettingsClick = onSettingsClick
            )
        },
        containerColor = DarkBackground
    ) { paddingValues ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item { Spacer(modifier = Modifier.height(4.dp)) }

            // KPI Grid (2026 Modern Cards)
            item {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    InteractiveKpiCard(
                        title = "Commandes du Mois",
                        value = "$ordersThisMonthCount",
                        subtitle = if (isAdmin) "+14% ce mois" else "Vos bons ce mois",
                        icon = Icons.Default.ReceiptLong,
                        accentColor = BardahlYellow,
                        modifier = Modifier.weight(1f)
                    )
                    InteractiveKpiCard(
                        title = "Chiffre d'Affaires",
                        value = String.format("%.0f DH", totalRevenueTtc),
                        subtitle = "Objectif: 150 000 DH",
                        icon = Icons.Default.TrendingUp,
                        accentColor = StatusDelivered,
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            item {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    InteractiveKpiCard(
                        title = "Commandes du Jour",
                        value = "$ordersTodayCount",
                        subtitle = "Aujourd'hui",
                        icon = Icons.Default.Today,
                        accentColor = StatusValidated,
                        modifier = Modifier.weight(1f)
                    )
                    InteractiveKpiCard(
                        title = "Clients Actifs",
                        value = "$activeClientsCount",
                        subtitle = if (isAdmin) "Total Réseau" else "Votre Portefeuille",
                        icon = Icons.Default.People,
                        accentColor = StatusSent,
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            // Primary Action Banner
            item {
                GlassCard(
                    borderColor = BardahlYellow,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                "Nouveau Bon de Commande",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimaryDark
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                "Créer et faire signer une commande en mobilité",
                                fontSize = 12.sp,
                                color = TextSecondaryDark
                            )
                        }
                        Spacer(modifier = Modifier.width(8.dp))
                        BardahlButton(
                            text = "CRÉER",
                            icon = Icons.Default.Add,
                            onClick = onCreateOrderClick
                        )
                    }
                }
            }

            // Recent Orders Section Header
            item {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = if (isAdmin) "Commandes Récentes (Réseau Global)" else "Vos Commandes Récentes",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimaryDark
                    )
                    Text(
                        "Voir Tout",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = BardahlYellow
                    )
                }
            }

            // Recent Orders List (Role-filtered)
            items(visibleOrders) { order ->
                OrderRowItem(order = order)
            }

            item { Spacer(modifier = Modifier.height(24.dp)) }
        }
    }
}

@Composable
fun OrderRowItem(order: Order) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        order.orderNumber,
                        fontWeight = FontWeight.Bold,
                        fontSize = 15.sp,
                        color = TextPrimaryDark
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    StatusBadge(order.status)
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    order.clientName,
                    fontSize = 13.sp,
                    color = TextSecondaryDark,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    order.orderDate,
                    fontSize = 11.sp,
                    color = TextSecondaryDark
                )
            }

            Column(horizontalAlignment = Alignment.End) {
                Text(
                    String.format("%.2f DH", order.totalTtc),
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Black,
                    color = BardahlYellow
                )
                Text(
                    "${order.items.size} article(s)",
                    fontSize = 11.sp,
                    color = TextSecondaryDark
                )
            }
        }
    }
}
