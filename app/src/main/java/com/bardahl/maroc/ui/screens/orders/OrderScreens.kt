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
import androidx.compose.foundation.text.BasicTextField
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
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
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

    // Role-based order filtering - mirrors Web AppContext visibleOrders logic
    val userCommId = currentUser?.id ?: ""
    val userCommName = currentUser?.firstName ?: ""
    val userEmail = currentUser?.email ?: ""
    val visibleOrders = if (isAdmin) {
        orders
    } else {
        orders.filter { o ->
            o.commercialId == userCommId ||
            (userCommName.isNotBlank() && o.commercialName.contains(userCommName, ignoreCase = true)) ||
            (userEmail.isNotBlank() && o.observations?.contains(userEmail, ignoreCase = true) == true)
        }
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

            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Client : ${order.clientName}", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextPrimaryDark)
                if (order.totalFreeItems > 0) {
                    Spacer(modifier = Modifier.width(6.dp))
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(StatusDelivered.copy(alpha = 0.2f))
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text("+${order.totalFreeItems} Offert(s)", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = StatusDelivered)
                    }
                }
            }
            Text("Commercial : ${order.commercialName}", fontSize = 12.sp, color = TextSecondaryDark)
            Text("Mode de Paiement : ${order.paymentMethod}", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = BardahlYellow)

            if (!order.promoNote.isNullOrBlank()) {
                Text("Promo : ${order.promoNote}", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = StatusDelivered)
            }

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
    var promoNoteInput by remember { mutableStateOf("") }

    var selectedClient by remember { mutableStateOf<Client?>(null) }
    var selectedItems by remember { mutableStateOf(listOf<OrderItem>()) }

    var globalRemisePercentStr by remember { mutableStateOf("0") }
    var globalRemiseMontantStr by remember { mutableStateOf("") }

    var showProductBrowser by remember { mutableStateOf(false) }
    var productToQuantityPick by remember { mutableStateOf<Product?>(null) }

    // Client search state
    var clientSearch by remember { mutableStateOf("") }

    // Global Financial Calculations (Free units are 0 DH)
    val grossTotalTtc = selectedItems.sumOf { it.unitPriceTtc * it.quantity }
    val totalFreeItemsCount = selectedItems.sumOf { it.freeQuantity }
    val globalRemisePercent = globalRemisePercentStr.toDoubleOrNull() ?: 0.0
    val globalRemiseMontant = globalRemiseMontantStr.toDoubleOrNull() ?: 0.0
    val totalDiscountAmount = (grossTotalTtc * (globalRemisePercent / 100.0)) + globalRemiseMontant

    val netTotalTtc = (grossTotalTtc - totalDiscountAmount).coerceAtLeast(0.0)
    val totalHt = netTotalTtc / 1.20
    val totalTva = netTotalTtc - totalHt

    Scaffold(
        topBar = {
            BardahlHeader(
                title = "Création Bon de Commande",
                subtitle = "Série, Client, Paiement, Expédition, Promos & Remise Globale"
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

            // Step 0: Numéro de Série (Modifiable)
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
                Text("1. Sélectionner le Client *", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = BardahlYellow)
                Spacer(modifier = Modifier.height(8.dp))
                if (selectedClient == null) {
                    val filteredClients = if (clientSearch.isBlank()) clients.take(50)
                    else clients.filter {
                        it.companyName.contains(clientSearch, ignoreCase = true) ||
                        it.ifCode.contains(clientSearch, ignoreCase = true) ||
                        it.ice.contains(clientSearch, ignoreCase = true) ||
                        it.city.contains(clientSearch, ignoreCase = true)
                    }.take(50)

                    OutlinedTextField(
                        value = clientSearch,
                        onValueChange = { clientSearch = it },
                        placeholder = { Text("Rechercher par nom, code ou ville...", fontSize = 12.sp, color = TextSecondaryDark) },
                        leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, tint = BardahlYellow) },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = BardahlYellow,
                            unfocusedBorderColor = BardahlCardBorder,
                            focusedTextColor = TextPrimaryDark,
                            unfocusedTextColor = TextPrimaryDark
                        )
                    )
                    Spacer(modifier = Modifier.height(6.dp))

                    if (filteredClients.isEmpty()) {
                        Text("Aucun client trouvé.", fontSize = 12.sp, color = TextSecondaryDark)
                    } else {
                        LazyColumn(
                            modifier = Modifier.heightIn(max = 260.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            items(filteredClients) { client ->
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
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(client.companyName, color = TextPrimaryDark, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                                        Text(
                                            "Code: ${client.ifCode.ifBlank { "-" }} | ICE: ${client.ice}",
                                            color = TextSecondaryDark,
                                            fontSize = 10.sp
                                        )
                                    }
                                    Text(client.city, color = BardahlYellow, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                                }
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
                        IconButton(onClick = { selectedClient = null; clientSearch = "" }) {
                            Icon(Icons.Default.Edit, contentDescription = "Changer", tint = BardahlYellow)
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Step 2: Select Payment Method (Includes Carte Bancaire)
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
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    listOf("Chèque", "Virement", "Carte Bancaire", "Espèces", "Traite").forEach { method ->
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

            // Step 3: Select Shipping Method (Mode d'Expédition)
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

            // Step 4: Add Products & Manage Promos / Free Units
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("4. Articles & Gratuités *", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = BardahlYellow)
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
                    Text("Aucun article dans ce Bon de Commande. Cliquez sur 'Ajouter Produit' pour choisir les quantités.", fontSize = 12.sp, color = TextSecondaryDark)
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        selectedItems.forEachIndexed { idx, item ->
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
                                    Text("Réf: ${item.productReference} | ${item.unitPriceTtc} DH TTC", fontSize = 11.sp, color = TextSecondaryDark)
                                    
                                    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.padding(top = 2.dp)) {
                                        Text("Facturé: ${item.quantity}", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextPrimaryDark)
                                        if (item.freeQuantity > 0) {
                                            Spacer(modifier = Modifier.width(6.dp))
                                            Text("+${item.freeQuantity} Gratuit(s)", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = StatusDelivered)
                                        }
                                        if (item.promoTag.isNotBlank()) {
                                            Spacer(modifier = Modifier.width(6.dp))
                                            Text("• ${item.promoTag}", fontSize = 10.sp, color = StatusDelivered)
                                        }
                                    }
                                    Text("Total TTC: ${String.format("%.2f DH", item.totalTtc)}", fontSize = 12.sp, fontWeight = FontWeight.Black, color = BardahlYellow)
                                }

                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    // Quick Promo Buttons
                                    IconButton(
                                        onClick = {
                                            // Toggle 10+1 free promo
                                            selectedItems = selectedItems.mapIndexed { i, itm ->
                                                if (i == idx) {
                                                    val newFree = if (itm.freeQuantity > 0) 0 else maxOf(1, itm.quantity / 10)
                                                    itm.copy(freeQuantity = newFree, promoTag = if (newFree > 0) "10+1 Offert" else "")
                                                } else itm
                                            }
                                        },
                                        modifier = Modifier.size(30.dp)
                                    ) {
                                        Icon(Icons.Default.CardGiftcard, contentDescription = "Offre 10+1", tint = if (item.freeQuantity > 0) StatusDelivered else TextSecondaryDark)
                                    }

                                    IconButton(
                                        onClick = {
                                            selectedItems = if (item.quantity > 1) {
                                                selectedItems.mapIndexed { i, itm ->
                                                    if (i == idx) itm.copy(quantity = itm.quantity - 1) else itm
                                                }
                                            } else {
                                                selectedItems.filterIndexed { i, _ -> i != idx }
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
                                        modifier = Modifier.padding(horizontal = 4.dp)
                                    )

                                    IconButton(
                                        onClick = {
                                            selectedItems = selectedItems.mapIndexed { i, itm ->
                                                if (i == idx) itm.copy(quantity = itm.quantity + 1) else itm
                                            }
                                        },
                                        modifier = Modifier.size(30.dp)
                                    ) {
                                        Icon(Icons.Default.AddCircleOutline, contentDescription = "Plus", tint = BardahlYellow)
                                    }

                                    Spacer(modifier = Modifier.width(4.dp))

                                    IconButton(
                                        onClick = {
                                            selectedItems = selectedItems.filterIndexed { i, _ -> i != idx }
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

            // Step 5: Remise Commerciale GLOBALE sur le Total (Non linéaire)
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Text("5. Remise Commerciale Globale (Non linéaire)", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = BardahlYellow)
                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    listOf("0", "5", "10", "15", "20").forEach { pct ->
                        val isSelected = globalRemisePercentStr == pct && globalRemiseMontantStr.isBlank()
                        FilterChip(
                            selected = isSelected,
                            onClick = {
                                globalRemisePercentStr = pct
                                globalRemiseMontantStr = ""
                            },
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

                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    OutlinedTextField(
                        value = globalRemisePercentStr,
                        onValueChange = {
                            globalRemisePercentStr = it
                            globalRemiseMontantStr = ""
                        },
                        label = { Text("% Remise", fontSize = 11.sp, color = TextSecondaryDark) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = BardahlYellow,
                            unfocusedBorderColor = BardahlCardBorder,
                            focusedTextColor = TextPrimaryDark,
                            unfocusedTextColor = TextPrimaryDark
                        )
                    )

                    OutlinedTextField(
                        value = globalRemiseMontantStr,
                        onValueChange = {
                            globalRemiseMontantStr = it
                            globalRemisePercentStr = "0"
                        },
                        label = { Text("Ou Montant Fixe (DH)", fontSize = 11.sp, color = TextSecondaryDark) },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                        singleLine = true,
                        modifier = Modifier.weight(1.2f),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = BardahlYellow,
                            unfocusedBorderColor = BardahlCardBorder,
                            focusedTextColor = BardahlYellow,
                            unfocusedTextColor = BardahlYellow
                        )
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Step 6: Note Promo & Remarques
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Text("6. Promos & Remarques de Livraison", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = BardahlYellow)
                Spacer(modifier = Modifier.height(6.dp))

                OutlinedTextField(
                    value = promoNoteInput,
                    onValueChange = { promoNoteInput = it },
                    label = { Text("Note / Nom de l'offre promotionnelle", color = TextSecondaryDark, fontSize = 11.sp) },
                    placeholder = { Text("Ex: Pack Vidange Été / Promo 10+1", color = TextSecondaryDark.copy(alpha = 0.5f), fontSize = 11.sp) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = BardahlYellow,
                        unfocusedBorderColor = BardahlCardBorder,
                        focusedTextColor = TextPrimaryDark,
                        unfocusedTextColor = TextPrimaryDark
                    )
                )

                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = remarqueInput,
                    onValueChange = { remarqueInput = it },
                    label = { Text("Instructions de livraison", color = TextSecondaryDark, fontSize = 11.sp) },
                    placeholder = { Text("Ex: Livrer avant 12h...", color = TextSecondaryDark.copy(alpha = 0.5f), fontSize = 11.sp) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(70.dp),
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

                if (totalFreeItemsCount > 0) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("🎁 Articles Gratuits (Offerts)", color = StatusDelivered, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                        Text("+$totalFreeItemsCount Unité(s) (0.00 DH)", color = StatusDelivered, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    }
                }

                if (totalDiscountAmount > 0) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Remise Commerciale Globale", color = StatusCancelled, fontSize = 13.sp, fontWeight = FontWeight.Bold)
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
                    Text("TOTAL NET TTC À PAYER", color = BardahlYellow, fontSize = 16.sp, fontWeight = FontWeight.Black)
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
                        val commIdToUse = if (currentUser?.role == UserRole.ADMIN) (selectedClient!!.commercialId.takeIf { it.isNotBlank() && it.contains("-") } ?: commercialId) else commercialId
                        val commNameToUse = if (currentUser?.role == UserRole.ADMIN) "Direction Bardahl" else commercialName

                        val newOrder = Order(
                            id = java.util.UUID.randomUUID().toString(),
                            orderNumber = finalOrderNumber,
                            commercialId = commIdToUse,
                            commercialName = commNameToUse,
                            clientId = selectedClient!!.id,
                            clientName = selectedClient!!.companyName,
                            orderDate = today,
                            status = OrderStatus.VALIDATED,
                            items = selectedItems,
                            paymentMethod = selectedPaymentMethod,
                            modeExpedition = selectedModeExpedition,
                            remarque = remarqueInput,
                            promoNote = promoNoteInput,
                            remisePercent = globalRemisePercent,
                            remiseMontant = globalRemiseMontant,
                            totalFreeItems = totalFreeItemsCount,
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
            productSearch.isBlank() ||
            it.name.contains(productSearch, ignoreCase = true) ||
            it.reference.contains(productSearch, ignoreCase = true) ||
            it.code.contains(productSearch, ignoreCase = true) ||
            it.code.startsWith(productSearch, ignoreCase = true)
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
                        label = "Chercher par nom, Réf ou Code Article...",
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

    // Product Quantity & Free Units Pick Dialog
    if (productToQuantityPick != null) {
        val prod = productToQuantityPick!!
        var quantityInput by remember { mutableStateOf("0") }
        var freeQuantityInput by remember { mutableStateOf("0") }
        var promoTagInput by remember { mutableStateOf("") }

        AlertDialog(
            onDismissRequest = { productToQuantityPick = null },
            containerColor = DarkSurface,
            title = {
                Column(modifier = Modifier.fillMaxWidth()) {
                    Text("Saisir la Quantité & Gratuité", color = TextPrimaryDark, fontWeight = FontWeight.Bold, fontSize = 18.sp)
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
                    // Quantité facturée
                    Text("Quantité Facturée (Payante) :", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextPrimaryDark)

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        IconButton(
                            onClick = {
                                val current = quantityInput.toIntOrNull() ?: 0
                                if (current > 0) quantityInput = (current - 1).toString()
                            },
                            modifier = Modifier
                                .size(42.dp)
                                .clip(CircleShape)
                                .background(BardahlYellow)
                        ) {
                            Icon(Icons.Default.Remove, contentDescription = "Moins", tint = BardahlBlack)
                        }

                        Spacer(modifier = Modifier.width(14.dp))

                        Box(
                            modifier = Modifier
                                .width(95.dp)
                                .height(48.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(DarkBackground)
                                .border(1.5.dp, BardahlYellow, RoundedCornerShape(10.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            BasicTextField(
                                value = quantityInput,
                                onValueChange = { quantityInput = it.filter { char -> char.isDigit() } },
                                textStyle = TextStyle(
                                    color = TextPrimaryDark,
                                    fontSize = 22.sp,
                                    fontWeight = FontWeight.Black,
                                    textAlign = TextAlign.Center
                                ),
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                singleLine = true,
                                cursorBrush = SolidColor(BardahlYellow),
                                decorationBox = { innerTextField ->
                                    Box(
                                        modifier = Modifier.fillMaxSize(),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        if (quantityInput.isEmpty()) {
                                            Text("0", color = TextSecondaryDark, fontSize = 22.sp, fontWeight = FontWeight.Black)
                                        }
                                        innerTextField()
                                    }
                                }
                            )
                        }

                        Spacer(modifier = Modifier.width(14.dp))

                        IconButton(
                            onClick = {
                                val current = quantityInput.toIntOrNull() ?: 0
                                quantityInput = (current + 1).toString()
                            },
                            modifier = Modifier
                                .size(42.dp)
                                .clip(CircleShape)
                                .background(BardahlYellow)
                        ) {
                            Icon(Icons.Default.Add, contentDescription = "Plus", tint = BardahlBlack)
                        }
                    }

                    // Quantité Gratuite (Offerte)
                    Text("Quantité Offerte / Gratuite (0 DH) :", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = StatusDelivered)

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        IconButton(
                            onClick = {
                                val current = freeQuantityInput.toIntOrNull() ?: 0
                                if (current > 0) freeQuantityInput = (current - 1).toString()
                            },
                            modifier = Modifier
                                .size(40.dp)
                                .clip(CircleShape)
                                .background(StatusDelivered.copy(alpha = 0.25f))
                        ) {
                            Icon(Icons.Default.Remove, contentDescription = "Moins", tint = StatusDelivered)
                        }

                        Spacer(modifier = Modifier.width(14.dp))

                        Box(
                            modifier = Modifier
                                .width(95.dp)
                                .height(48.dp)
                                .clip(RoundedCornerShape(10.dp))
                                .background(DarkBackground)
                                .border(1.5.dp, StatusDelivered, RoundedCornerShape(10.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            BasicTextField(
                                value = freeQuantityInput,
                                onValueChange = { freeQuantityInput = it.filter { char -> char.isDigit() } },
                                textStyle = TextStyle(
                                    color = StatusDelivered,
                                    fontSize = 22.sp,
                                    fontWeight = FontWeight.Black,
                                    textAlign = TextAlign.Center
                                ),
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                                singleLine = true,
                                cursorBrush = SolidColor(StatusDelivered),
                                decorationBox = { innerTextField ->
                                    Box(
                                        modifier = Modifier.fillMaxSize(),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        if (freeQuantityInput.isEmpty()) {
                                            Text("0", color = TextSecondaryDark, fontSize = 22.sp, fontWeight = FontWeight.Black)
                                        }
                                        innerTextField()
                                    }
                                }
                            )
                        }

                        Spacer(modifier = Modifier.width(14.dp))

                        IconButton(
                            onClick = {
                                val current = freeQuantityInput.toIntOrNull() ?: 0
                                freeQuantityInput = (current + 1).toString()
                            },
                            modifier = Modifier
                                .size(40.dp)
                                .clip(CircleShape)
                                .background(StatusDelivered.copy(alpha = 0.25f))
                        ) {
                            Icon(Icons.Default.Add, contentDescription = "Plus", tint = StatusDelivered)
                        }
                    }

                    // Quick Promo Presets
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Button(
                            onClick = {
                                val q = quantityInput.toIntOrNull() ?: 0
                                if (q == 0) {
                                    quantityInput = "10"
                                    freeQuantityInput = "1"
                                } else {
                                    freeQuantityInput = maxOf(1, q / 10).toString()
                                }
                                promoTagInput = "Promo 10+1"
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = BardahlYellow.copy(alpha = 0.2f), contentColor = BardahlYellow),
                            shape = RoundedCornerShape(8.dp),
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("+10+1 Offert", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }

                        Button(
                            onClick = {
                                val currentQ = quantityInput.toIntOrNull() ?: 0
                                freeQuantityInput = if (currentQ > 0) currentQ.toString() else "1"
                                quantityInput = "0"
                                promoTagInput = "Gratuité 100%"
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = StatusDelivered.copy(alpha = 0.2f), contentColor = StatusDelivered),
                            shape = RoundedCornerShape(8.dp),
                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("100% Gratuit", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                    }

                    val qtyInt = quantityInput.toIntOrNull() ?: 0
                    val brutTotal = qtyInt * prod.unitPriceTtc

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(DarkBackground)
                            .padding(10.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(
                                text = "Total Ligne TTC: ${String.format("%.2f DH", brutTotal)}",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Black,
                                color = BardahlYellow
                            )
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val qty = quantityInput.toIntOrNull() ?: 0
                        val freeQty = freeQuantityInput.toIntOrNull() ?: 0
                        if (qty > 0 || freeQty > 0) {
                            val existing = selectedItems.find { it.productId == prod.id }
                            selectedItems = if (existing != null) {
                                selectedItems.map {
                                    if (it.productId == prod.id) it.copy(
                                        quantity = it.quantity + qty,
                                        freeQuantity = it.freeQuantity + freeQty,
                                        promoTag = promoTagInput
                                    ) else it
                                }
                            } else {
                                selectedItems + OrderItem(
                                    productId = prod.id,
                                    productName = prod.name,
                                    productReference = prod.reference,
                                    quantity = qty,
                                    freeQuantity = freeQty,
                                    promoTag = promoTagInput,
                                    unitPriceTtc = prod.unitPriceTtc
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
