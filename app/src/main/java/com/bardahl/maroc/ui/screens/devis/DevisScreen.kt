package com.bardahl.maroc.ui.screens.devis

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
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.bardahl.maroc.domain.model.*
import com.bardahl.maroc.ui.theme.*
import com.bardahl.maroc.ui.viewmodels.*
import java.text.SimpleDateFormat
import java.util.*

@Composable
fun DevisScreen(
    orderViewModel: OrderViewModel,
    clientViewModel: ClientViewModel,
    productViewModel: ProductViewModel,
    authViewModel: AuthViewModel,
    onSettingsClick: () -> Unit = {},
    onNavigateToOrders: () -> Unit = {}
) {
    val devisList by orderViewModel.devis.collectAsState()
    val authState by authViewModel.authState.collectAsState()
    val currentUser = (authState as? AuthState.Success)?.user
    val isAdmin = currentUser?.role == UserRole.ADMIN
    val context = LocalContext.current

    // Scoped visibility: Commercial sees only their own quotes, Admin sees all
    val userCommId = currentUser?.id ?: ""
    val userCommName = currentUser?.firstName ?: ""
    val userEmail = currentUser?.email ?: ""
    val visibleDevis = if (isAdmin) {
        devisList
    } else {
        devisList.filter { d ->
            d.commercialId == userCommId ||
            (userCommName.isNotBlank() && d.commercialName.contains(userCommName, ignoreCase = true)) ||
            (userEmail.isNotBlank() && d.commercialEmail.equals(userEmail, ignoreCase = true))
        }
    }

    var searchQuery by remember { mutableStateOf("") }
    var selectedStatusFilter by remember { mutableStateOf("TOUS") }
    val statusFilters = listOf("TOUS", "EN ATTENTE", "VALIDÉ", "CONVERTI", "EXPIRÉ")

    var showCreateDialog by remember { mutableStateOf(false) }

    val filteredDevis = visibleDevis.filter { d ->
        val q = searchQuery.trim().lowercase()
        val matchesSearch = q.isBlank() ||
                d.devisNumber.lowercase().contains(q) ||
                d.clientName.lowercase().contains(q) ||
                d.commercialName.lowercase().contains(q) ||
                d.clientCity.lowercase().contains(q) ||
                d.clientIce.lowercase().contains(q)

        val matchesStatus = when (selectedStatusFilter) {
            "TOUS" -> true
            "EN ATTENTE" -> d.status == DevisStatus.EN_ATTENTE
            "VALIDÉ" -> d.status == DevisStatus.VALIDE
            "CONVERTI" -> d.status == DevisStatus.CONVERTI
            "EXPIRÉ" -> d.status == DevisStatus.EXPIRE
            else -> true
        }

        matchesSearch && matchesStatus
    }

    // KPIs
    val totalDevisCount = visibleDevis.size
    val totalCaDevise = visibleDevis.sumOf { it.totalTtc }
    val pendingCount = visibleDevis.count { it.status == DevisStatus.EN_ATTENTE }
    val convertedCount = visibleDevis.count { it.status == DevisStatus.CONVERTI }

    Scaffold(
        topBar = {
            Surface(
                color = BardahlCardDark,
                tonalElevation = 4.dp
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = "Devis & Estimations",
                                    fontSize = 20.sp,
                                    fontWeight = FontWeight.Black,
                                    color = TextPrimaryDark
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(if (isAdmin) BardahlYellow.copy(alpha = 0.2f) else StatusValidated.copy(alpha = 0.2f))
                                        .padding(horizontal = 8.dp, vertical = 2.dp)
                                ) {
                                    Text(
                                        text = if (isAdmin) "Direction Bardahl" else "Commercial",
                                        color = if (isAdmin) BardahlYellow else StatusValidated,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                            }
                            Text(
                                text = "Gestion et conversion rapide en bons de commande",
                                fontSize = 11.sp,
                                color = TextSecondaryDark
                            )
                        }

                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Button(
                                onClick = { showCreateDialog = true },
                                colors = ButtonDefaults.buttonColors(containerColor = BardahlYellow),
                                shape = RoundedCornerShape(10.dp),
                                contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp)
                            ) {
                                Icon(Icons.Default.Add, contentDescription = null, tint = BardahlBlack, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text("Nouveau", color = BardahlBlack, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                            }
                            Spacer(modifier = Modifier.width(8.dp))
                            IconButton(onClick = onSettingsClick) {
                                Icon(Icons.Default.Settings, contentDescription = "Paramètres", tint = TextSecondaryDark)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    // KPI Cards Horizontal Row
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        DevisKpiCard("Total Devis", "$totalDevisCount", Icons.Default.Description, BardahlYellow)
                        DevisKpiCard("CA Devisé TTC", String.format("%.0f DH", totalCaDevise), Icons.Default.MonetizationOn, StatusDelivered)
                        DevisKpiCard("En Attente", "$pendingCount", Icons.Default.HourglassTop, Color(0xFFFF9500))
                        DevisKpiCard("Convertis", "$convertedCount", Icons.Default.CheckCircle, StatusDelivered)
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    // Search Input
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(DarkSurface)
                            .border(1.dp, BardahlCardBorder, RoundedCornerShape(12.dp))
                            .padding(horizontal = 12.dp, vertical = 10.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.Search, contentDescription = null, tint = BardahlYellow, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            BasicTextField(
                                value = searchQuery,
                                onValueChange = { searchQuery = it },
                                singleLine = true,
                                textStyle = TextStyle(color = TextPrimaryDark, fontSize = 13.sp),
                                cursorBrush = SolidColor(BardahlYellow),
                                modifier = Modifier.weight(1f),
                                decorationBox = { innerTextField ->
                                    if (searchQuery.isEmpty()) {
                                        Text("Rechercher numéro, client, ville...", color = TextSecondaryDark, fontSize = 13.sp)
                                    }
                                    innerTextField()
                                }
                            )
                            if (searchQuery.isNotEmpty()) {
                                Icon(
                                    Icons.Default.Close,
                                    contentDescription = "Effacer",
                                    tint = TextSecondaryDark,
                                    modifier = Modifier.size(16.dp).clickable { searchQuery = "" }
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    // Status Filters Row
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        statusFilters.forEach { filter ->
                            val isSelected = selectedStatusFilter == filter
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(if (isSelected) BardahlYellow else DarkSurface)
                                    .border(1.dp, if (isSelected) BardahlYellow else BardahlCardBorder, RoundedCornerShape(8.dp))
                                    .clickable { selectedStatusFilter = filter }
                                    .padding(horizontal = 10.dp, vertical = 6.dp)
                            ) {
                                Text(
                                    text = filter,
                                    fontSize = 11.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                    color = if (isSelected) BardahlBlack else TextPrimaryDark
                                )
                            }
                        }
                    }
                }
            }
        },
        containerColor = DarkBackground
    ) { paddingValues ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
        ) {
            if (filteredDevis.isEmpty()) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Icon(
                        Icons.Default.Description,
                        contentDescription = null,
                        tint = TextSecondaryDark.copy(alpha = 0.5f),
                        modifier = Modifier.size(64.dp)
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "Aucun devis trouvé",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimaryDark
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = "Appuyez sur \"Nouveau\" en haut pour créer une offre de prix commerciale.",
                        fontSize = 12.sp,
                        color = TextSecondaryDark,
                        textAlign = TextAlign.Center
                    )
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    items(filteredDevis, key = { it.id }) { devis ->
                        DevisCard(
                            devis = devis,
                            onConvertClick = {
                                val createdOrder = orderViewModel.convertDevisToOrder(devis)
                                Toast.makeText(
                                    context,
                                    "Devis ${devis.devisNumber} converti avec succès en bon N° ${createdOrder.orderNumber} !",
                                    Toast.LENGTH_LONG
                                ).show()
                            },
                            onNavigateToOrders = onNavigateToOrders
                        )
                    }
                }
            }
        }
    }

    // Create Devis Dialog
    if (showCreateDialog) {
        CreateDevisDialog(
            clientViewModel = clientViewModel,
            productViewModel = productViewModel,
            authViewModel = authViewModel,
            onDismiss = { showCreateDialog = false },
            onDevisCreated = { newDevis ->
                orderViewModel.createDevis(newDevis)
                showCreateDialog = false
                Toast.makeText(context, "Devis ${newDevis.devisNumber} créé avec succès !", Toast.LENGTH_SHORT).show()
            }
        )
    }
}

@Composable
fun DevisKpiCard(title: String, value: String, icon: androidx.compose.ui.graphics.vector.ImageVector, color: Color) {
    Surface(
        color = BardahlCardDark,
        shape = RoundedCornerShape(12.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, BardahlCardBorder),
        modifier = Modifier.width(135.dp)
    ) {
        Column(modifier = Modifier.padding(10.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(text = title, fontSize = 10.sp, color = TextSecondaryDark, fontWeight = FontWeight.SemiBold)
                Icon(icon, contentDescription = null, tint = color, modifier = Modifier.size(14.dp))
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(text = value, fontSize = 16.sp, fontWeight = FontWeight.Black, color = TextPrimaryDark)
        }
    }
}

@Composable
fun DevisCard(
    devis: Devis,
    onConvertClick: () -> Unit,
    onNavigateToOrders: () -> Unit
) {
    val statusColor = when (devis.status) {
        DevisStatus.EN_ATTENTE -> Color(0xFFFF9500)
        DevisStatus.VALIDE -> StatusValidated
        DevisStatus.CONVERTI -> StatusDelivered
        DevisStatus.EXPIRE -> StatusCancelled
    }

    Surface(
        color = BardahlCardDark,
        shape = RoundedCornerShape(14.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, BardahlCardBorder),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            // Header: Devis Number & Status
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Description, contentDescription = null, tint = BardahlYellow, modifier = Modifier.size(18.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = devis.devisNumber,
                        fontWeight = FontWeight.Black,
                        fontSize = 15.sp,
                        color = TextPrimaryDark
                    )
                }

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(statusColor.copy(alpha = 0.15f))
                        .border(1.dp, statusColor.copy(alpha = 0.4f), RoundedCornerShape(8.dp))
                        .padding(horizontal = 8.dp, vertical = 3.dp)
                ) {
                    Text(
                        text = devis.status.label,
                        color = statusColor,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Client & Info
            Text(
                text = devis.clientName,
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp,
                color = TextPrimaryDark
            )

            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                if (devis.clientCity.isNotBlank()) {
                    Text(text = "📍 ${devis.clientCity}", fontSize = 11.sp, color = TextSecondaryDark)
                }
                if (devis.clientIce.isNotBlank()) {
                    Text(text = "ICE: ${devis.clientIce}", fontSize = 11.sp, color = TextSecondaryDark)
                }
                Text(text = "📅 ${devis.date}", fontSize = 11.sp, color = TextSecondaryDark)
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Totals
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(DarkSurface, RoundedCornerShape(8.dp))
                    .padding(horizontal = 10.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(text = "Total HT", fontSize = 10.sp, color = TextSecondaryDark)
                    Text(text = String.format("%.2f DH", devis.totalHt), fontSize = 12.sp, color = TextPrimaryDark)
                }
                Column {
                    Text(text = "Articles", fontSize = 10.sp, color = TextSecondaryDark)
                    Text(text = "${devis.items.size} réf.", fontSize = 12.sp, color = TextPrimaryDark)
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text(text = "Total TTC", fontSize = 10.sp, color = TextSecondaryDark)
                    Text(
                        text = String.format("%.2f DH", devis.totalTtc),
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Black,
                        color = BardahlYellow
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Actions: Convert to Order or View Linked Order
            if (devis.status == DevisStatus.CONVERTI) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(StatusDelivered.copy(alpha = 0.12f))
                        .border(1.dp, StatusDelivered.copy(alpha = 0.3f), RoundedCornerShape(10.dp))
                        .clickable { onNavigateToOrders() }
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.CheckCircle, contentDescription = null, tint = StatusDelivered, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "Converti → ${devis.convertedOrderNumber ?: "Bon de Commande"}",
                            color = StatusDelivered,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                    Text(text = "Voir le bon →", color = StatusDelivered, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            } else {
                Button(
                    onClick = onConvertClick,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = StatusDelivered),
                    shape = RoundedCornerShape(10.dp),
                    contentPadding = PaddingValues(vertical = 10.dp)
                ) {
                    Icon(Icons.Default.Transform, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "Convertir en Bon de Commande",
                        color = Color.White,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    }
}

@Composable
fun CreateDevisDialog(
    clientViewModel: ClientViewModel,
    productViewModel: ProductViewModel,
    authViewModel: AuthViewModel,
    onDismiss: () -> Unit,
    onDevisCreated: (Devis) -> Unit
) {
    val clients by clientViewModel.clientsList.collectAsState()
    val products by productViewModel.products.collectAsState()
    val authState by authViewModel.authState.collectAsState()
    val currentUser = (authState as? AuthState.Success)?.user

    var selectedClient by remember { mutableStateOf<Client?>(clients.firstOrNull()) }
    var clientSearch by remember { mutableStateOf("") }
    var showClientPicker by remember { mutableStateOf(false) }

    var paymentMethod by remember { mutableStateOf("Chèque") }
    val paymentOptions = listOf("Chèque", "Traite 60J", "Traite 90J", "Virement bancaire", "Espèces")

    var modeExpedition by remember { mutableStateOf("Transport Bardahl") }
    val modeOptions = listOf(
        "Transport Bardahl" to "🚚 Transport Bardahl (Livraison directe)",
        "Messagerie CTM / Ghazala" to "📦 Messagerie CTM / Ghazala",
        "Comptoir / Enlèvement" to "🏬 Comptoir / Enlèvement sur place"
    )

    var remarque by remember { mutableStateOf("") }
    var selectedProductsList by remember { mutableStateOf<List<OrderItem>>(emptyList()) }

    var productSearch by remember { mutableStateOf("") }
    val filteredProducts = products.filter {
        productSearch.isBlank() ||
                it.name.contains(productSearch, ignoreCase = true) ||
                it.reference.contains(productSearch, ignoreCase = true)
    }

    val filteredClients = clients.filter {
        clientSearch.isBlank() ||
                it.companyName.contains(clientSearch, ignoreCase = true) ||
                it.city.contains(clientSearch, ignoreCase = true) ||
                it.ice.contains(clientSearch, ignoreCase = true)
    }

    val totalTtc = selectedProductsList.sumOf { it.totalTtc }
    val totalHt = totalTtc / 1.20
    val totalTva = totalTtc - totalHt

    Dialog(onDismissRequest = onDismiss) {
        Surface(
            color = BardahlCardDark,
            shape = RoundedCornerShape(16.dp),
            border = androidx.compose.foundation.BorderStroke(1.dp, BardahlYellow.copy(alpha = 0.4f)),
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.92f)
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(16.dp)
            ) {
                // Header
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Description, contentDescription = null, tint = BardahlYellow, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "Nouveau Devis",
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Black,
                            color = BardahlYellow
                        )
                    }
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Fermer", tint = TextSecondaryDark)
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                Column(
                    modifier = Modifier
                        .weight(1f)
                        .verticalScroll(rememberScrollState())
                ) {
                    // 1. Client Bénéficiaire * (Spacieux avec sélection claire)
                    Text("Client Bénéficiaire *", fontSize = 12.sp, color = TextPrimaryDark, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(4.dp))

                    Surface(
                        color = DarkSurface,
                        shape = RoundedCornerShape(10.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, if (showClientPicker) BardahlYellow else BardahlCardBorder),
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { showClientPicker = !showClientPicker }
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = selectedClient?.companyName ?: "Sélectionner un client",
                                        color = if (selectedClient != null) TextPrimaryDark else TextSecondaryDark,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.Bold
                                    )
                                    if (selectedClient != null) {
                                        Text(
                                            text = "${selectedClient?.city ?: "Maroc"} • ICE: ${selectedClient?.ice ?: "-"}",
                                            color = TextSecondaryDark,
                                            fontSize = 11.sp
                                        )
                                    }
                                }
                                Icon(
                                    imageVector = if (showClientPicker) Icons.Default.KeyboardArrowUp else Icons.Default.KeyboardArrowDown,
                                    contentDescription = null,
                                    tint = BardahlYellow
                                )
                            }

                            // Searchable client picker list
                            if (showClientPicker) {
                                Spacer(modifier = Modifier.height(8.dp))
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(BardahlCardDark)
                                        .border(1.dp, BardahlCardBorder, RoundedCornerShape(8.dp))
                                        .padding(horizontal = 8.dp, vertical = 6.dp)
                                ) {
                                    BasicTextField(
                                        value = clientSearch,
                                        onValueChange = { clientSearch = it },
                                        singleLine = true,
                                        textStyle = TextStyle(color = TextPrimaryDark, fontSize = 12.sp),
                                        cursorBrush = SolidColor(BardahlYellow),
                                        modifier = Modifier.fillMaxWidth(),
                                        decorationBox = { innerTextField ->
                                            if (clientSearch.isEmpty()) {
                                                Text("Chercher par nom, ville, ICE...", color = TextSecondaryDark, fontSize = 12.sp)
                                            }
                                            innerTextField()
                                        }
                                    )
                                }

                                Spacer(modifier = Modifier.height(6.dp))

                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .heightIn(max = 180.dp)
                                        .verticalScroll(rememberScrollState())
                                ) {
                                    filteredClients.take(30).forEach { c ->
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .clickable {
                                                    selectedClient = c
                                                    showClientPicker = false
                                                }
                                                .padding(vertical = 8.dp, horizontal = 4.dp),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text(text = c.companyName, fontSize = 12.sp, color = TextPrimaryDark, fontWeight = FontWeight.Bold)
                                                Text(text = "${c.city} • ICE: ${c.ice}", fontSize = 10.sp, color = TextSecondaryDark)
                                            }
                                            if (selectedClient?.id == c.id) {
                                                Icon(Icons.Default.Check, contentDescription = null, tint = BardahlYellow, modifier = Modifier.size(16.dp))
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // 2. Mode d'Expédition (Spacieux, bien visible et aéré)
                    Text("Mode d'Expédition", fontSize = 12.sp, color = TextPrimaryDark, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(6.dp))
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        modeOptions.forEach { (modeKey, modeLabel) ->
                            val isSelected = modeExpedition == modeKey
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(if (isSelected) BardahlYellow.copy(alpha = 0.15f) else DarkSurface)
                                    .border(1.dp, if (isSelected) BardahlYellow else BardahlCardBorder, RoundedCornerShape(8.dp))
                                    .clickable { modeExpedition = modeKey }
                                    .padding(horizontal = 12.dp, vertical = 10.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    text = modeLabel,
                                    fontSize = 12.sp,
                                    color = if (isSelected) BardahlYellow else TextPrimaryDark,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                                )
                                if (isSelected) {
                                    Icon(Icons.Default.CheckCircle, contentDescription = null, tint = BardahlYellow, modifier = Modifier.size(16.dp))
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // 3. Paiement Proposé (Chips horizontaux)
                    Text("Paiement Proposé", fontSize = 12.sp, color = TextPrimaryDark, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(6.dp))
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        paymentOptions.forEach { opt ->
                            val isSelected = paymentMethod == opt
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(if (isSelected) BardahlYellow else DarkSurface)
                                    .border(1.dp, if (isSelected) BardahlYellow else BardahlCardBorder, RoundedCornerShape(8.dp))
                                    .clickable { paymentMethod = opt }
                                    .padding(horizontal = 12.dp, vertical = 7.dp)
                            ) {
                                Text(
                                    text = opt,
                                    fontSize = 11.sp,
                                    color = if (isSelected) BardahlBlack else TextPrimaryDark,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // 4. Products Selection
                    Text("Articles Bardahl (${selectedProductsList.size} sélectionnés)", fontSize = 12.sp, color = TextPrimaryDark, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(4.dp))

                    // Search product
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(DarkSurface)
                            .border(1.dp, BardahlCardBorder, RoundedCornerShape(8.dp))
                            .padding(horizontal = 10.dp, vertical = 8.dp)
                    ) {
                        BasicTextField(
                            value = productSearch,
                            onValueChange = { productSearch = it },
                            singleLine = true,
                            textStyle = TextStyle(color = TextPrimaryDark, fontSize = 12.sp),
                            cursorBrush = SolidColor(BardahlYellow),
                            modifier = Modifier.fillMaxWidth(),
                            decorationBox = { innerTextField ->
                                if (productSearch.isEmpty()) {
                                    Text("Rechercher un produit à ajouter...", color = TextSecondaryDark, fontSize = 12.sp)
                                }
                                innerTextField()
                            }
                        )
                    }

                    Spacer(modifier = Modifier.height(6.dp))

                    // Product Quick Picker Box
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(140.dp)
                            .background(DarkSurface, RoundedCornerShape(8.dp))
                            .border(1.dp, BardahlCardBorder, RoundedCornerShape(8.dp))
                            .padding(6.dp)
                    ) {
                        LazyColumn {
                            items(filteredProducts.take(30)) { prod ->
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clickable {
                                            val existing = selectedProductsList.find { it.productId == prod.id }
                                            if (existing != null) {
                                                selectedProductsList = selectedProductsList.map {
                                                    if (it.productId == prod.id) it.copy(quantity = it.quantity + prod.unitsPerBox) else it
                                                }
                                            } else {
                                                selectedProductsList = selectedProductsList + OrderItem(
                                                    productId = prod.id,
                                                    productName = prod.name,
                                                    productReference = prod.reference,
                                                    quantity = prod.unitsPerBox,
                                                    unitPriceTtc = prod.unitPriceTtc,
                                                    unitsPerBox = prod.unitsPerBox
                                                )
                                            }
                                        }
                                        .padding(vertical = 4.dp, horizontal = 6.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(text = "[${prod.reference}] ${prod.name}", fontSize = 11.sp, color = TextPrimaryDark, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                        Text(text = "${prod.unitPriceTtc} DH TTC - ${prod.packaging}", fontSize = 10.sp, color = TextSecondaryDark)
                                    }
                                    Icon(Icons.Default.AddCircle, contentDescription = null, tint = BardahlYellow, modifier = Modifier.size(16.dp))
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // Selected Items Summary
                    if (selectedProductsList.isNotEmpty()) {
                        Text("Articles dans le devis :", fontSize = 11.sp, color = TextSecondaryDark)
                        selectedProductsList.forEach { item ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 2.dp),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(text = "${item.quantity}x ${item.productName}", fontSize = 11.sp, color = TextPrimaryDark, modifier = Modifier.weight(1f))
                                Text(text = String.format("%.2f DH", item.totalTtc), fontSize = 11.sp, color = BardahlYellow, fontWeight = FontWeight.Bold)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // Summary Total Box
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(BardahlYellow.copy(alpha = 0.12f), RoundedCornerShape(8.dp))
                            .border(1.dp, BardahlYellow.copy(alpha = 0.3f), RoundedCornerShape(8.dp))
                            .padding(10.dp)
                    ) {
                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                            Text("Total Devis TTC", fontWeight = FontWeight.Bold, color = BardahlYellow)
                            Text(String.format("%.2f DH", totalTtc), fontWeight = FontWeight.Black, color = BardahlYellow, fontSize = 16.sp)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Action Buttons
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedButton(
                        onClick = onDismiss,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text("Annuler", color = TextPrimaryDark)
                    }

                    Button(
                        onClick = {
                            val client = selectedClient ?: clients.firstOrNull() ?: return@Button
                            val nextDevisNumber = String.format("DEV-2026-%04d", (1..9999).random())
                            val newDevis = Devis(
                                devisNumber = nextDevisNumber,
                                commercialId = currentUser?.id ?: "comm_bardahl",
                                commercialName = currentUser?.firstName ?: "Commercial Bardahl",
                                commercialEmail = currentUser?.email ?: "",
                                clientId = client.id,
                                clientName = client.companyName,
                                clientIce = client.ice,
                                clientCity = client.city,
                                clientAddress = client.address,
                                clientPhone = client.phone,
                                date = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date()),
                                validityDate = "",
                                status = DevisStatus.EN_ATTENTE,
                                items = selectedProductsList,
                                paymentMethod = paymentMethod,
                                modeExpedition = modeExpedition,
                                remarque = remarque,
                                totalHt = totalHt,
                                totalTva = totalTva,
                                totalTtc = totalTtc
                            )
                            onDevisCreated(newDevis)
                        },
                        modifier = Modifier.weight(1f),
                        colors = ButtonDefaults.buttonColors(containerColor = BardahlYellow),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text("Enregistrer", color = BardahlBlack, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}
