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
import com.bardahl.maroc.util.PdfGenerator
import com.bardahl.maroc.ui.theme.*
import com.bardahl.maroc.ui.viewmodels.*
import com.bardahl.maroc.ui.components.*
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

    LaunchedEffect(Unit) {
        orderViewModel.refreshDevisFromSupabase()
    }

    var searchQuery by remember { mutableStateOf("") }
    var selectedStatusFilter by remember { mutableStateOf("TOUS") }
    val statusFilters = listOf("TOUS", "EN ATTENTE", "VALIDÉ", "CONVERTI", "EXPIRÉ")

    var showCreateDialog by remember { mutableStateOf(false) }
    var selectedDevisForDetails by remember { mutableStateOf<Devis?>(null) }

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
            BardahlHeader(
                title = "Devis & Estimations",
                subtitle = if (isAdmin) "Direction Bardahl • Duplicatas" else "Commercial • Offres de Prix",
                onSettingsClick = onSettingsClick,
                actions = {
                    Surface(
                        color = BardahlYellow,
                        shape = RoundedCornerShape(10.dp),
                        modifier = Modifier
                            .clip(RoundedCornerShape(10.dp))
                            .clickable { showCreateDialog = true }
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(Icons.Default.Add, contentDescription = null, tint = BardahlBlack, modifier = Modifier.size(15.dp))
                            Spacer(modifier = Modifier.width(3.dp))
                            Text("Nouveau", color = BardahlBlack, fontSize = 11.sp, fontWeight = FontWeight.Black)
                        }
                    }
                }
            )
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = { showCreateDialog = true },
                containerColor = BardahlYellow,
                contentColor = BardahlBlack,
                shape = RoundedCornerShape(16.dp),
                elevation = FloatingActionButtonDefaults.elevation(defaultElevation = 6.dp),
                icon = {
                    Icon(Icons.Default.Add, contentDescription = null, tint = BardahlBlack, modifier = Modifier.size(20.dp))
                },
                text = {
                    Text("Nouveau Devis", fontWeight = FontWeight.Black, fontSize = 13.sp, color = BardahlBlack)
                }
            )
        },
        containerColor = DarkBackground
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(horizontal = 16.dp)
        ) {
            Spacer(modifier = Modifier.height(8.dp))

            // Search Bar
            BardahlTextField(
                value = searchQuery,
                onValueChange = { searchQuery = it },
                label = "Rechercher numéro, client, ville...",
                leadingIcon = Icons.Default.Search
            )

            Spacer(modifier = Modifier.height(10.dp))

            // Status Filter Chips Row
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                statusFilters.forEach { filter ->
                    val isSelected = selectedStatusFilter == filter
                    val count = when (filter) {
                        "TOUS" -> visibleDevis.size
                        "EN ATTENTE" -> visibleDevis.count { it.status == DevisStatus.EN_ATTENTE }
                        "VALIDÉ" -> visibleDevis.count { it.status == DevisStatus.VALIDE }
                        "CONVERTI" -> visibleDevis.count { it.status == DevisStatus.CONVERTI }
                        "EXPIRÉ" -> visibleDevis.count { it.status == DevisStatus.EXPIRE }
                        else -> 0
                    }

                    val chipBg = if (isSelected) BardahlYellow else DarkSurface
                    val chipTextColor = if (isSelected) BardahlBlack else TextSecondaryDark
                    val chipBorder = if (isSelected) BardahlYellow else BardahlCardBorder

                    Row(
                        modifier = Modifier
                            .clip(RoundedCornerShape(20.dp))
                            .background(chipBg)
                            .border(1.dp, chipBorder, RoundedCornerShape(20.dp))
                            .clickable { selectedStatusFilter = filter }
                            .padding(horizontal = 12.dp, vertical = 7.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = filter,
                            fontSize = 11.sp,
                            fontWeight = if (isSelected) FontWeight.Black else FontWeight.Bold,
                            color = chipTextColor
                        )
                        Spacer(modifier = Modifier.width(5.dp))
                        Box(
                            modifier = Modifier
                                .clip(CircleShape)
                                .background(if (isSelected) BardahlBlack.copy(alpha = 0.2f) else BardahlCardBorder)
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = "$count",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (isSelected) BardahlBlack else TextSecondaryDark
                            )
                        }
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
                DevisKpiCard("Montant TTC", String.format("%.0f DH", totalCaDevise), Icons.Default.MonetizationOn, StatusDelivered)
                DevisKpiCard("En Attente", "$pendingCount", Icons.Default.HourglassTop, Color(0xFFFF9500))
                DevisKpiCard("Convertis", "$convertedCount", Icons.Default.CheckCircle, StatusDelivered)
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Content List or Empty State
            if (filteredDevis.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        modifier = Modifier.padding(24.dp)
                    ) {
                        Icon(
                            Icons.Default.Description,
                            contentDescription = null,
                            tint = TextSecondaryDark.copy(alpha = 0.4f),
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
                            text = "Appuyez sur \"Nouveau Devis\" pour créer une offre de prix commerciale.",
                            fontSize = 12.sp,
                            color = TextSecondaryDark,
                            textAlign = TextAlign.Center
                        )
                        Spacer(modifier = Modifier.height(18.dp))
                        Button(
                            onClick = { showCreateDialog = true },
                            colors = ButtonDefaults.buttonColors(containerColor = BardahlYellow),
                            shape = RoundedCornerShape(12.dp),
                            contentPadding = PaddingValues(horizontal = 20.dp, vertical = 10.dp)
                        ) {
                            Icon(Icons.Default.Add, contentDescription = null, tint = BardahlBlack, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Nouveau Devis", color = BardahlBlack, fontWeight = FontWeight.Black, fontSize = 13.sp)
                        }
                    }
                }
            } else {
                LazyColumn(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    contentPadding = PaddingValues(bottom = 80.dp)
                ) {
                    items(filteredDevis, key = { it.id }) { devis ->
                        DevisCard(
                            devis = devis,
                            onPdfClick = {
                                PdfGenerator.generateDevisPdf(context, devis)
                                Toast.makeText(context, "Téléchargement Devis PDF en cours...", Toast.LENGTH_SHORT).show()
                            },
                            onClick = {
                                selectedDevisForDetails = devis
                            },
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

    // Devis Detail Dialog with Company Info Header
    selectedDevisForDetails?.let { devis ->
        Dialog(onDismissRequest = { selectedDevisForDetails = null }) {
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .fillMaxHeight(0.9f),
                shape = RoundedCornerShape(16.dp),
                color = BardahlCardDark,
                border = androidx.compose.foundation.BorderStroke(1.dp, BardahlCardBorder)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(16.dp)
                        .verticalScroll(rememberScrollState())
                ) {
                    // Title Bar
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "DEVIS : ${devis.devisNumber}",
                            fontWeight = FontWeight.Black,
                            fontSize = 17.sp,
                            color = BardahlYellow
                        )
                        IconButton(onClick = { selectedDevisForDetails = null }) {
                            Icon(Icons.Default.Close, contentDescription = "Fermer", tint = TextSecondaryDark)
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    // 1. Official Company Legal Header Box
                    Surface(
                        color = DarkSurface,
                        shape = RoundedCornerShape(12.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, BardahlYellow.copy(alpha = 0.4f)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text(CompanyInfo.FULL_NAME, fontWeight = FontWeight.Black, fontSize = 14.sp, color = Color.White)
                            Text(CompanyInfo.CAPITAL, fontWeight = FontWeight.Bold, fontSize = 11.sp, color = BardahlYellow)
                            Text(CompanyInfo.ADDRESS, fontSize = 10.sp, color = TextSecondaryDark)
                            Spacer(modifier = Modifier.height(4.dp))
                            Text("ICE: ${CompanyInfo.ICE} • RC: ${CompanyInfo.RC} • TP: ${CompanyInfo.TP}", fontSize = 9.5.sp, color = TextSecondaryDark)
                            Text("C.N.S.S.: ${CompanyInfo.CNSS} • I.F.: ${CompanyInfo.IF}", fontSize = 9.5.sp, color = TextSecondaryDark)
                            Text("Tél: ${CompanyInfo.PHONES}", fontSize = 9.5.sp, color = TextSecondaryDark)
                            Text("Email: ${CompanyInfo.EMAIL} • ${CompanyInfo.WEBSITE}", fontSize = 9.5.sp, color = BardahlYellow)
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // 2. Client & Terms
                    Surface(
                        color = DarkSurface,
                        shape = RoundedCornerShape(12.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, BardahlCardBorder),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Text("INFORMATIONS CLIENT", fontWeight = FontWeight.Bold, fontSize = 11.sp, color = BardahlYellow)
                            Text(devis.clientName, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color.White)
                            if (devis.clientCity.isNotBlank()) Text("Ville: ${devis.clientCity}", fontSize = 11.sp, color = TextSecondaryDark)
                            if (devis.clientIce.isNotBlank()) Text("ICE: ${devis.clientIce}", fontSize = 11.sp, color = TextSecondaryDark)
                            Spacer(modifier = Modifier.height(6.dp))
                            HorizontalDivider(color = BardahlCardBorder)
                            Spacer(modifier = Modifier.height(6.dp))
                            Text("MODALITÉS", fontWeight = FontWeight.Bold, fontSize = 11.sp, color = BardahlYellow)
                            Text("Date: ${devis.date}", fontSize = 11.sp, color = TextSecondaryDark)
                            Text("Paiement: ${devis.paymentMethod}", fontSize = 11.sp, color = TextSecondaryDark)
                            Text("Expédition: ${devis.modeExpedition}", fontSize = 11.sp, color = TextSecondaryDark)
                            Text("Commercial: ${devis.commercialName.ifBlank { "Direction Bardahl" }}", fontSize = 11.sp, color = TextSecondaryDark)
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // 3. Articles Table
                    Text("ARTICLES DU DEVIS (${devis.items.size})", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = TextPrimaryDark)
                    Spacer(modifier = Modifier.height(6.dp))
                    devis.items.forEach { item ->
                        Surface(
                            color = DarkSurface,
                            shape = RoundedCornerShape(8.dp),
                            border = androidx.compose.foundation.BorderStroke(0.5.dp, BardahlCardBorder),
                            modifier = Modifier.fillMaxWidth().padding(vertical = 3.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(8.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text("[${item.productReference}] ${item.productName}", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = Color.White, maxLines = 1)
                                    Text("${item.quantity} un. x ${String.format("%.2f", item.unitPriceTtc)} DH", fontSize = 10.sp, color = TextSecondaryDark)
                                }
                                Text(String.format("%.2f DH", item.totalTtc), fontSize = 12.sp, fontWeight = FontWeight.Bold, color = BardahlYellow)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // 4. Financial Totals Card
                    Surface(
                        color = DarkSurface,
                        shape = RoundedCornerShape(12.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, BardahlYellow.copy(alpha = 0.5f)),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Column(modifier = Modifier.padding(12.dp)) {
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("Total H.T :", fontSize = 11.sp, color = TextSecondaryDark)
                                Text(String.format("%.2f DH", devis.totalHt), fontSize = 11.sp, color = Color.White)
                            }
                            if (devis.totalDiscount > 0) {
                                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                    Text("Remise Accordée :", fontSize = 11.sp, color = StatusCancelled)
                                    Text(String.format("-%.2f DH", devis.totalDiscount), fontSize = 11.sp, color = StatusCancelled)
                                }
                            }
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("T.V.A (20%) :", fontSize = 11.sp, color = TextSecondaryDark)
                                Text(String.format("%.2f DH", devis.totalTva), fontSize = 11.sp, color = Color.White)
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            HorizontalDivider(color = BardahlYellow.copy(alpha = 0.4f))
                            Spacer(modifier = Modifier.height(6.dp))
                            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                                Text("TOTAL NET TTC :", fontSize = 13.sp, fontWeight = FontWeight.Black, color = BardahlYellow)
                                Text(String.format("%.2f DH", devis.totalTtc), fontSize = 14.sp, fontWeight = FontWeight.Black, color = BardahlYellow)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(18.dp))

                    // 5. Action Buttons
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(
                            onClick = {
                                PdfGenerator.generateDevisPdf(context, devis)
                                Toast.makeText(context, "Téléchargement Devis PDF en cours...", Toast.LENGTH_SHORT).show()
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = BardahlYellow),
                            shape = RoundedCornerShape(10.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Icon(Icons.Default.PictureAsPdf, contentDescription = null, tint = BardahlBlack, modifier = Modifier.size(16.dp))
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("Télécharger PDF", color = BardahlBlack, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        }

                        if (devis.status != DevisStatus.CONVERTI) {
                            Button(
                                onClick = {
                                    selectedDevisForDetails = null
                                    val createdOrder = orderViewModel.convertDevisToOrder(devis)
                                    Toast.makeText(
                                        context,
                                        "Devis ${devis.devisNumber} converti avec succès en bon N° ${createdOrder.orderNumber} !",
                                        Toast.LENGTH_LONG
                                    ).show()
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = StatusDelivered),
                                shape = RoundedCornerShape(10.dp),
                                modifier = Modifier.weight(1f)
                            ) {
                                Icon(Icons.Default.Transform, contentDescription = null, tint = Color.White, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Convertir", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            }
                        }
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
            existingDevis = devisList,
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
    onPdfClick: () -> Unit,
    onClick: () -> Unit,
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
        modifier = Modifier.fillMaxWidth().clickable { onClick() }
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

                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    IconButton(
                        onClick = onPdfClick,
                        modifier = Modifier.size(28.dp)
                    ) {
                        Icon(
                            Icons.Default.PictureAsPdf,
                            contentDescription = "PDF",
                            tint = BardahlYellow,
                            modifier = Modifier.size(18.dp)
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
    existingDevis: List<Devis> = emptyList(),
    onDismiss: () -> Unit,
    onDevisCreated: (Devis) -> Unit
) {
    val clients by clientViewModel.clientsList.collectAsState()
    val products by productViewModel.products.collectAsState()
    val authState by authViewModel.authState.collectAsState()
    val currentUser = (authState as? AuthState.Success)?.user

    val suggestedDevisNumber = remember(existingDevis) {
        com.bardahl.maroc.util.NumberGenerator.getNextDevisNumber(existingDevis)
    }
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
                            text = "Nouveau Devis • $suggestedDevisNumber",
                            fontSize = 16.sp,
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
                            val nextDevisNumber = suggestedDevisNumber
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
