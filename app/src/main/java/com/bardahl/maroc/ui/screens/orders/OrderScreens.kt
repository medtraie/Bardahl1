package com.bardahl.maroc.ui.screens.orders

import android.widget.Toast
import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.bardahl.maroc.domain.model.*
import com.bardahl.maroc.ui.components.*
import com.bardahl.maroc.ui.theme.*
import com.bardahl.maroc.ui.viewmodels.ClientViewModel
import com.bardahl.maroc.ui.viewmodels.OrderViewModel
import com.bardahl.maroc.ui.viewmodels.ProductViewModel
import com.bardahl.maroc.util.ExcelExporter
import com.bardahl.maroc.util.PdfGenerator
import com.bardahl.maroc.domain.model.UserRole
import com.bardahl.maroc.ui.viewmodels.AuthState
import com.bardahl.maroc.ui.viewmodels.AuthViewModel

@Composable
fun OrderListScreen(
    orderViewModel: OrderViewModel,
    authViewModel: AuthViewModel,
    onCreateOrderClick: () -> Unit,
    onSettingsClick: () -> Unit
) {
    val orders by orderViewModel.orders.collectAsState()
    val authState by authViewModel.authState.collectAsState()
    val currentUser = (authState as? AuthState.Success)?.user
    val isAdmin = currentUser?.role == UserRole.ADMIN
    val context = LocalContext.current

    // Refresh orders every time the screen is opened
    LaunchedEffect(Unit) {
        orderViewModel.refreshOrdersFromSupabase()
    }

    // Role-based order filtering - mirrors Web AppContext visibleOrders logic (exact ID match)
    val userCommId = currentUser?.id ?: ""
    val visibleOrders = if (isAdmin) {
        orders
    } else {
        orders.filter { o -> o.commercialId == userCommId }
    }

    Scaffold(
        topBar = {
            BardahlHeader(
                title = "Bons de Commande",
                subtitle = "Historique & Duplicatas",
                onSettingsClick = onSettingsClick,
                actions = {
                    IconButton(onClick = {
                        val file = ExcelExporter.exportOrdersToCsv(context, orders)
                        Toast.makeText(context, "Export Excel généré : ${file.name}", Toast.LENGTH_LONG).show()
                    }) {
                        Icon(Icons.Default.Download, contentDescription = "Exporter Excel", tint = BardahlYellow)
                    }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = onCreateOrderClick,
                containerColor = BardahlYellow,
                contentColor = BardahlBlack,
                shape = RoundedCornerShape(16.dp)
            ) {
                Icon(Icons.Default.Add, contentDescription = "Nouveau Bon")
            }
        },
        containerColor = DarkBackground
    ) { paddingValues ->
        if (visibleOrders.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(16.dp),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "Aucun bon de commande trouvé.\nUtilisez le bouton + ci-dessous pour en créer un.",
                    color = TextSecondaryDark,
                    fontSize = 14.sp,
                    textAlign = TextAlign.Center,
                    lineHeight = 20.sp
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(paddingValues)
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item { Spacer(modifier = Modifier.height(4.dp)) }

                items(visibleOrders) { order ->
                    OrderCardDetailed(
                        order = order,
                        onPdfClick = {
                            PdfGenerator.generateOrderPdf(context, order)
                            Toast.makeText(context, "Téléchargement Bon de Commande PDF en cours...", Toast.LENGTH_SHORT).show()
                        }
                    )
                }
            }
        }
    }
}

@Composable
fun OrderCardDetailed(order: Order, onPdfClick: () -> Unit) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column {
                    Text(order.orderNumber, fontWeight = FontWeight.Bold, fontSize = 16.sp, color = TextPrimaryDark)
                    Text(order.orderDate, fontSize = 11.sp, color = TextSecondaryDark)
                }
                StatusBadge(order.status)
            }

            Spacer(modifier = Modifier.height(10.dp))
            HorizontalDivider(color = BardahlCardBorder)
            Spacer(modifier = Modifier.height(10.dp))

            Text("Client : ${order.clientName}", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextPrimaryDark)
            Text("Commercial : ${order.commercialName}", fontSize = 12.sp, color = TextSecondaryDark)
            Text("Mode de Paiement : ${order.paymentMethod}", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = BardahlYellow)

            if (order.totalDiscount > 0) {
                Text("Remise Commerciale : -${String.format("%.2f DH", order.totalDiscount)}", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = StatusCancelled)
            }

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column {
                    Text("Total HT: ${String.format("%.2f DH", order.totalHt)}", fontSize = 11.sp, color = TextSecondaryDark)
                    Text("TOTAL TTC: ${String.format("%.2f DH", order.totalTtc)}", fontSize = 16.sp, fontWeight = FontWeight.Black, color = BardahlYellow)
                }

                Row {
                    IconButton(
                        onClick = onPdfClick,
                        modifier = Modifier
                            .clip(RoundedCornerShape(10.dp))
                            .background(BardahlYellow.copy(alpha = 0.15f))
                    ) {
                        Icon(Icons.Default.PictureAsPdf, contentDescription = "Télécharger PDF", tint = BardahlYellow)
                    }
                }
            }
        }
    }
}

@Composable
fun OrderCreateScreen(
    orderViewModel: OrderViewModel,
    clientViewModel: ClientViewModel,
    productViewModel: ProductViewModel,
    authViewModel: AuthViewModel,
    onOrderCreated: () -> Unit
) {
    val clients by clientViewModel.clientsList.collectAsState()
    val products by productViewModel.products.collectAsState()
    val existingOrders by orderViewModel.orders.collectAsState()
    val authState by authViewModel.authState.collectAsState()
    val currentUser = (authState as? AuthState.Success)?.user
    val context = LocalContext.current

    // Commercial identity from logged-in user
    val commercialId = currentUser?.id ?: ""
    val commercialName = currentUser?.firstName ?: ""

    // Suggested Next Serial Number
    val suggestedOrderNumber = remember(existingOrders) {
        val nextSeq = 4332 + existingOrders.size + 1
        "BC-2026-00$nextSeq"
    }

    var customOrderNumber by remember { mutableStateOf("") }
    var selectedPaymentMethod by remember { mutableStateOf("Chèque") }
    var selectedModeExpedition by remember { mutableStateOf("Transport Bardahl") }
    var remarqueInput by remember { mutableStateOf("") }

    var selectedClient by remember { mutableStateOf<Client?>(null) }
    var selectedItems by remember { mutableStateOf(listOf<OrderItem>()) }

    var globalRemisePercentStr by remember { mutableStateOf("0") }

    var showProductBrowser by remember { mutableStateOf(false) }
    var productToQuantityPick by remember { mutableStateOf<Product?>(null) }

    // Financial Calculations
    val grossTotalTtc = selectedItems.sumOf { it.totalTtc }
    val globalRemisePercent = globalRemisePercentStr.toDoubleOrNull() ?: 0.0
    val totalDiscountAmount = grossTotalTtc * (globalRemisePercent / 100.0)

    val netTotalTtc = (grossTotalTtc - totalDiscountAmount).coerceAtLeast(0.0)
    val totalHt = netTotalTtc / 1.20
    val totalTva = netTotalTtc - totalHt

    Scaffold(
        topBar = {
            BardahlHeader(
                title = "Création Bon de Commande",
                subtitle = "Série, Client, Paiement, Expédition & Remarques"
            )
        },
        containerColor = DarkBackground
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 16.dp)
                .verticalScroll(rememberScrollState())
        ) {
            Spacer(modifier = Modifier.height(8.dp))

            // Step 0: Numéro de Série (Modifiable & Transparent Placeholder)
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Numéro de Série (Modifiable)", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = BardahlYellow)
                    Icon(Icons.Default.Pin, contentDescription = null, tint = BardahlYellow)
                }
                Spacer(modifier = Modifier.height(6.dp))

                OutlinedTextField(
                    value = customOrderNumber,
                    onValueChange = { customOrderNumber = it },
                    placeholder = {
                        Text(
                            text = suggestedOrderNumber,
                            color = TextSecondaryDark.copy(alpha = 0.45f),
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold
                        )
                    },
                    label = { Text("N° de Série du Bon de Commande", color = TextSecondaryDark, fontSize = 12.sp) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = BardahlYellow,
                        unfocusedBorderColor = BardahlCardBorder,
                        focusedTextColor = TextPrimaryDark,
                        unfocusedTextColor = TextPrimaryDark
                    )
                )
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Step 1: Select Client Card
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Text("1. Sélectionner le Client", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = BardahlYellow)
                Spacer(modifier = Modifier.height(8.dp))
                if (selectedClient == null) {
                    Text("Choisissez un client dans votre portefeuille ci-dessous :", fontSize = 12.sp, color = TextSecondaryDark)
                    Spacer(modifier = Modifier.height(8.dp))
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        clients.forEach { client ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(DarkSurface)
                                    .clickable { selectedClient = client }
                                    .padding(10.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(client.companyName, color = TextPrimaryDark, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                                    Text("ICE: ${client.ice}", color = TextSecondaryDark, fontSize = 11.sp)
                                }
                                Text(client.city, color = BardahlYellow, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                } else {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text(selectedClient!!.companyName, fontWeight = FontWeight.Bold, fontSize = 15.sp, color = TextPrimaryDark)
                            Text("ICE: ${selectedClient!!.ice} | ${selectedClient!!.city}", fontSize = 11.sp, color = TextSecondaryDark)
                        }
                        IconButton(onClick = { selectedClient = null }) {
                            Icon(Icons.Default.Edit, contentDescription = "Changer", tint = BardahlYellow)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Step 2: Select Payment Method (Mode de Paiement: Chèque, Virement, Espèces, Traite)
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("2. Mode de Paiement", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = BardahlYellow)
                    Icon(Icons.Default.Payments, contentDescription = null, tint = BardahlYellow)
                }
                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    listOf("Chèque", "Virement", "Espèces", "Traite").forEach { method ->
                        val isSelected = selectedPaymentMethod == method
                        FilterChip(
                            selected = isSelected,
                            onClick = { selectedPaymentMethod = method },
                            label = { Text(method, fontSize = 12.sp, fontWeight = FontWeight.Bold) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = BardahlYellow,
                                selectedLabelColor = BardahlBlack,
                                containerColor = DarkSurface,
                                labelColor = TextPrimaryDark
                            ),
                            border = FilterChipDefaults.filterChipBorder(
                                enabled = true,
                                selected = isSelected,
                                borderColor = BardahlCardBorder,
                                selectedBorderColor = BardahlYellow
                            )
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Step 2.1: Select Shipping Method (Mode d'Expédition)
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("3. Mode d'Expédition", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = BardahlYellow)
                    Icon(Icons.Default.LocalShipping, contentDescription = null, tint = BardahlYellow)
                }
                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    listOf("Transport Bardahl", "Livraison Client", "Enlèvement Magasin", "Transporteur Externe").forEach { exp ->
                        val isSelected = selectedModeExpedition == exp
                        FilterChip(
                            selected = isSelected,
                            onClick = { selectedModeExpedition = exp },
                            label = { Text(exp, fontSize = 11.sp, fontWeight = FontWeight.Bold) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = BardahlYellow,
                                selectedLabelColor = BardahlBlack,
                                containerColor = DarkSurface,
                                labelColor = TextPrimaryDark
                            ),
                            border = FilterChipDefaults.filterChipBorder(
                                enabled = true,
                                selected = isSelected,
                                borderColor = BardahlCardBorder,
                                selectedBorderColor = BardahlYellow
                            )
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Step 3: Add Products & Select Quantities
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("4. Produits & Quantités", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = BardahlYellow)
                    Button(
                        onClick = { showProductBrowser = true },
                        colors = ButtonDefaults.buttonColors(containerColor = BardahlYellow, contentColor = BardahlBlack),
                        shape = RoundedCornerShape(10.dp),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Ajouter Produit", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                if (selectedItems.isEmpty()) {
                    Text("Aucun article dans ce Bon de Commande. Cliquez sur 'Ajouter Produit' pour choisir la quantité.", fontSize = 12.sp, color = TextSecondaryDark)
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        selectedItems.forEach { item ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(DarkSurface)
                                    .padding(10.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(item.productName, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextPrimaryDark)
                                    Text("Réf: ${item.productReference} | ${item.unitPriceTtc} DH TTC / Unité", fontSize = 11.sp, color = TextSecondaryDark)
                                    if (item.discountPercentage > 0) {
                                        Text("Remise Produit: ${item.discountPercentage}%", fontSize = 11.sp, color = StatusCancelled, fontWeight = FontWeight.Bold)
                                    }
                                    Text("Total TTC: ${String.format("%.2f DH", item.totalTtc)}", fontSize = 12.sp, fontWeight = FontWeight.Black, color = BardahlYellow)
                                }

                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    IconButton(
                                        onClick = {
                                            selectedItems = if (item.quantity > 1) {
                                                selectedItems.map {
                                                    if (it.productId == item.productId) it.copy(quantity = it.quantity - 1) else it
                                                }
                                            } else {
                                                selectedItems.filter { it.productId != item.productId }
                                            }
                                        },
                                        modifier = Modifier.size(30.dp)
                                    ) {
                                        Icon(Icons.Default.RemoveCircleOutline, contentDescription = "Moins", tint = BardahlYellow)
                                    }

                                    Text(
                                        text = "${item.quantity}",
                                        fontSize = 14.sp,
                                        fontWeight = FontWeight.Black,
                                        color = TextPrimaryDark,
                                        modifier = Modifier.padding(horizontal = 6.dp)
                                    )

                                    IconButton(
                                        onClick = {
                                            selectedItems = selectedItems.map {
                                                if (it.productId == item.productId) it.copy(quantity = it.quantity + 1) else it
                                            }
                                        },
                                        modifier = Modifier.size(30.dp)
                                    ) {
                                        Icon(Icons.Default.AddCircleOutline, contentDescription = "Plus", tint = BardahlYellow)
                                    }

                                    Spacer(modifier = Modifier.width(6.dp))

                                    IconButton(
                                        onClick = {
                                            selectedItems = selectedItems.filter { it.productId != item.productId }
                                        },
                                        modifier = Modifier.size(30.dp)
                                    ) {
                                        Icon(Icons.Default.Delete, contentDescription = "Supprimer", tint = StatusCancelled)
                                    }
                                }
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Step 4: Remise Commerciale (%) Selection Card
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Text("5. Remise Commerciale (%)", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = BardahlYellow)
                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    listOf("0", "5", "10", "15", "20").forEach { pct ->
                        val isSelected = globalRemisePercentStr == pct
                        FilterChip(
                            selected = isSelected,
                            onClick = { globalRemisePercentStr = pct },
                            label = { Text("$pct%", fontSize = 12.sp, fontWeight = FontWeight.Bold) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = BardahlYellow,
                                selectedLabelColor = BardahlBlack,
                                containerColor = DarkSurface,
                                labelColor = TextPrimaryDark
                            ),
                            border = FilterChipDefaults.filterChipBorder(
                                enabled = true,
                                selected = isSelected,
                                borderColor = BardahlCardBorder,
                                selectedBorderColor = BardahlYellow
                            )
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Step 5: Remarques / Instructions Text Field
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("6. Remarques & Instructions", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = BardahlYellow)
                    Icon(Icons.Default.Comment, contentDescription = null, tint = BardahlYellow)
                }
                Spacer(modifier = Modifier.height(6.dp))

                OutlinedTextField(
                    value = remarqueInput,
                    onValueChange = { remarqueInput = it },
                    placeholder = { Text("Instructions particulières de livraison ou remarque commercial...", color = TextSecondaryDark.copy(alpha = 0.5f), fontSize = 12.sp) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(80.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = BardahlYellow,
                        unfocusedBorderColor = BardahlCardBorder,
                        focusedTextColor = TextPrimaryDark,
                        unfocusedTextColor = TextPrimaryDark
                    )
                )
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Calculation Summary Card
            GlassCard(modifier = Modifier.fillMaxWidth(), borderColor = BardahlYellow) {
                Text("Récapitulatif Financier Bon de Commande", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimaryDark)
                Spacer(modifier = Modifier.height(8.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Mode de Règlement", color = TextSecondaryDark, fontSize = 13.sp)
                    Text(selectedPaymentMethod, color = BardahlYellow, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Mode d'Expédition", color = TextSecondaryDark, fontSize = 13.sp)
                    Text(selectedModeExpedition, color = BardahlYellow, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Montant Brut TTC", color = TextSecondaryDark, fontSize = 13.sp)
                    Text(String.format("%.2f DH", grossTotalTtc), color = TextPrimaryDark, fontSize = 13.sp)
                }
                if (globalRemisePercent > 0) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Remise Commerciale ($globalRemisePercent%)", color = StatusCancelled, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                        Text(String.format("-%.2f DH", totalDiscountAmount), color = StatusCancelled, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    }
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Total HT Net", color = TextSecondaryDark, fontSize = 13.sp)
                    Text(String.format("%.2f DH", totalHt), color = TextPrimaryDark, fontSize = 13.sp)
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("TVA (20%)", color = TextSecondaryDark, fontSize = 13.sp)
                    Text(String.format("%.2f DH", totalTva), color = TextPrimaryDark, fontSize = 13.sp)
                }
                Spacer(modifier = Modifier.height(6.dp))
                HorizontalDivider(color = BardahlCardBorder)
                Spacer(modifier = Modifier.height(6.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("TOTAL NET TTC", color = BardahlYellow, fontSize = 16.sp, fontWeight = FontWeight.Black)
                    Text(String.format("%.2f DH", netTotalTtc), color = BardahlYellow, fontSize = 16.sp, fontWeight = FontWeight.Black)
                }
            }

            Spacer(modifier = Modifier.height(18.dp))

            // Submit Button
            BardahlButton(
                text = "VALIDER ET GÉNÉRER LE BON DE COMMANDE",
                icon = Icons.Default.Check,
                onClick = {
                    if (selectedClient != null && selectedItems.isNotEmpty()) {
                        val finalOrderNumber = customOrderNumber.ifBlank { suggestedOrderNumber }
                        val today = java.time.LocalDate.now().toString()
                        val newOrder = Order(
                            id = java.util.UUID.randomUUID().toString(),
                            orderNumber = finalOrderNumber,
                            commercialId = commercialId,
                            commercialName = commercialName,
                            clientId = selectedClient!!.id,
                            clientName = selectedClient!!.companyName,
                            orderDate = today,
                            status = OrderStatus.VALIDATED,
                            items = selectedItems,
                            paymentMethod = selectedPaymentMethod,
                            modeExpedition = selectedModeExpedition,
                            remarque = remarqueInput,
                            totalHt = totalHt,
                            totalDiscount = totalDiscountAmount,
                            totalTva = totalTva,
                            totalTtc = netTotalTtc
                        )
                        orderViewModel.createOrder(newOrder)

                        // Automatically generate & save PDF
                        PdfGenerator.generateOrderPdf(context, newOrder)

                        Toast.makeText(context, "Bon de Commande ${newOrder.orderNumber} créé avec succès!", Toast.LENGTH_LONG).show()
                        onOrderCreated()
                    } else {
                        Toast.makeText(context, "Veuillez sélectionner un client et au moins un produit avec sa quantité.", Toast.LENGTH_SHORT).show()
                    }
                },
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(24.dp))
        }
    }

    // Product Browser Dialog
    if (showProductBrowser) {
        var productSearch by remember { mutableStateOf("") }
        val filteredProds = products.filter {
            it.name.contains(productSearch, ignoreCase = true) ||
            it.reference.contains(productSearch, ignoreCase = true) ||
            it.code.contains(productSearch, ignoreCase = true)
        }

        AlertDialog(
            onDismissRequest = { showProductBrowser = false },
            containerColor = DarkSurface,
            title = { Text("Sélectionner un Produit Bardahl", color = TextPrimaryDark, fontWeight = FontWeight.Bold) },
            text = {
                Column(modifier = Modifier.fillMaxWidth()) {
                    BardahlTextField(
                        value = productSearch,
                        onValueChange = { productSearch = it },
                        label = "Chercher nom ou référence...",
                        leadingIcon = Icons.Default.Search
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    LazyColumn(modifier = Modifier.height(280.dp)) {
                        items(filteredProds) { prod ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(8.dp))
                                    .clickable {
                                        productToQuantityPick = prod
                                        showProductBrowser = false
                                    }
                                    .padding(vertical = 8.dp, horizontal = 4.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(prod.name, fontSize = 13.sp, color = TextPrimaryDark, fontWeight = FontWeight.Bold)
                                    Text("Réf: ${prod.reference} | Cond: ${prod.packaging}", fontSize = 11.sp, color = TextSecondaryDark)
                                }
                                Text(String.format("%.2f DH", prod.unitPriceTtc), fontSize = 13.sp, color = BardahlYellow, fontWeight = FontWeight.Bold)
                            }
                            HorizontalDivider(color = BardahlCardBorder.copy(alpha = 0.4f))
                        }
                    }
                }
            },
            confirmButton = {},
            dismissButton = {
                TextButton(onClick = { showProductBrowser = false }) {
                    Text("Fermer", color = TextSecondaryDark)
                }
            }
        )
    }

    // REDESIGNED & SPACIOUS Product Quantity & Remise Selection Dialog
    if (productToQuantityPick != null) {
        val prod = productToQuantityPick!!
        var quantityInput by remember { mutableStateOf("12") }
        var productRemiseInput by remember { mutableStateOf("0") }

        AlertDialog(
            onDismissRequest = { productToQuantityPick = null },
            containerColor = DarkSurface,
            title = {
                Column(modifier = Modifier.fillMaxWidth()) {
                    Text("Saisir la Quantité Désirée", color = TextPrimaryDark, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(prod.name, fontSize = 14.sp, fontWeight = FontWeight.Bold, color = BardahlYellow)
                    Text("Réf: ${prod.reference} | Prix: ${prod.unitPriceTtc} DH TTC / Unité", fontSize = 11.sp, color = TextSecondaryDark)
                }
            },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Text("Quantité à Commander (Unités / Bidons) :", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextPrimaryDark)

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        IconButton(
                            onClick = {
                                val current = quantityInput.toIntOrNull() ?: 1
                                if (current > 1) quantityInput = (current - 1).toString()
                            },
                            modifier = Modifier
                                .size(44.dp)
                                .clip(CircleShape)
                                .background(BardahlYellow)
                        ) {
                            Icon(Icons.Default.Remove, contentDescription = "Moins", tint = BardahlBlack)
                        }

                        Spacer(modifier = Modifier.width(14.dp))

                        Box(
                            modifier = Modifier
                                .width(90.dp)
                                .height(48.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(DarkBackground)
                                .border(1.dp, BardahlYellow, RoundedCornerShape(10.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            OutlinedTextField(
                                value = quantityInput,
                                onValueChange = { quantityInput = it.filter { char -> char.isDigit() } },
                                textStyle = LocalTextStyle.current.copy(
                                    color = TextPrimaryDark,
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Bold,
                                    textAlign = TextAlign.Center
                                ),
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                singleLine = true,
                                modifier = Modifier.fillMaxSize(),
                                colors = OutlinedTextFieldDefaults.colors(
                                    focusedBorderColor = Color.Transparent,
                                    unfocusedBorderColor = Color.Transparent,
                                    focusedContainerColor = Color.Transparent,
                                    unfocusedContainerColor = Color.Transparent
                                )
                            )
                        }

                        Spacer(modifier = Modifier.width(14.dp))

                        IconButton(
                            onClick = {
                                val current = quantityInput.toIntOrNull() ?: 0
                                quantityInput = (current + 1).toString()
                            },
                            modifier = Modifier
                                .size(44.dp)
                                .clip(CircleShape)
                                .background(BardahlYellow)
                        ) {
                            Icon(Icons.Default.Add, contentDescription = "Plus", tint = BardahlBlack)
                        }
                    }

                    Column {
                        Text("Remise Produit (%) :", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextPrimaryDark)
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            listOf("0", "5", "10", "15").forEach { r ->
                                FilterChip(
                                    selected = productRemiseInput == r,
                                    onClick = { productRemiseInput = r },
                                    label = { Text("$r%", fontSize = 11.sp, fontWeight = FontWeight.Bold) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = BardahlYellow,
                                        selectedLabelColor = BardahlBlack,
                                        containerColor = DarkBackground,
                                        labelColor = TextPrimaryDark
                                    )
                                )
                            }
                        }
                    }

                    val qtyInt = quantityInput.toIntOrNull() ?: 1
                    val remisePct = productRemiseInput.toDoubleOrNull() ?: 0.0
                    val brutTotal = qtyInt * prod.unitPriceTtc
                    val netTotal = brutTotal * (1 - (remisePct / 100.0))

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(DarkBackground)
                            .padding(12.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = "Sous-Total TTC: ${String.format("%.2f DH", netTotal)}",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Black,
                                color = BardahlYellow
                            )
                            if (remisePct > 0) {
                                Text(
                                    text = "Brut: ${String.format("%.2f DH", brutTotal)} | Remise: -$remisePct%",
                                    fontSize = 11.sp,
                                    color = StatusCancelled
                                )
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val qty = quantityInput.toIntOrNull() ?: 1
                        val rPct = productRemiseInput.toDoubleOrNull() ?: 0.0
                        if (qty > 0) {
                            val existing = selectedItems.find { it.productId == prod.id }
                            selectedItems = if (existing != null) {
                                selectedItems.map {
                                    if (it.productId == prod.id) it.copy(quantity = it.quantity + qty, discountPercentage = rPct) else it
                                }
                            } else {
                                selectedItems + OrderItem(
                                    productId = prod.id,
                                    productName = prod.name,
                                    productReference = prod.reference,
                                    quantity = qty,
                                    unitPriceTtc = prod.unitPriceTtc,
                                    discountPercentage = rPct
                                )
                            }
                            productToQuantityPick = null
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = BardahlYellow, contentColor = BardahlBlack),
                    shape = RoundedCornerShape(12.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                ) {
                    Text(
                        text = "AJOUTER AU BON DE COMMANDE",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Black,
                        color = BardahlBlack
                    )
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { productToQuantityPick = null },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Annuler", color = TextSecondaryDark, fontSize = 13.sp)
                }
            }
        )
    }
}
