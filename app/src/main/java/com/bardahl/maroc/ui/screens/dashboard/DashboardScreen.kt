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
import com.bardahl.maroc.ui.components.*
import com.bardahl.maroc.ui.theme.*
import com.bardahl.maroc.ui.viewmodels.DashboardViewModel
import com.bardahl.maroc.ui.viewmodels.OrderViewModel

@Composable
fun DashboardScreen(
    dashboardViewModel: DashboardViewModel,
    orderViewModel: OrderViewModel,
    onCreateOrderClick: () -> Unit,
    onSettingsClick: () -> Unit
) {
    val stats by dashboardViewModel.stats.collectAsState()
    val orders by orderViewModel.orders.collectAsState()

    Scaffold(
        topBar = {
            BardahlHeader(
                title = "Tableau de Bord",
                subtitle = "Vue d'ensemble - Bardahl Maroc",
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
                        value = "${stats.ordersThisMonth}",
                        subtitle = "+14% par rapport au mois dernier",
                        icon = Icons.Default.ReceiptLong,
                        accentColor = BardahlYellow,
                        modifier = Modifier.weight(1f)
                    )
                    InteractiveKpiCard(
                        title = "Chiffre d'Affaires",
                        value = String.format("%.0f DH", stats.totalRevenueTtc),
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
                        value = "${stats.ordersToday}",
                        subtitle = "Aujourd'hui",
                        icon = Icons.Default.Today,
                        accentColor = StatusValidated,
                        modifier = Modifier.weight(1f)
                    )
                    InteractiveKpiCard(
                        title = "Clients Actifs",
                        value = "${stats.activeClientsCount}",
                        subtitle = "Portfolio Commercial",
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
                        "Commandes Récentes",
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

            // Recent Orders List
            items(orders) { order ->
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
