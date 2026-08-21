package com.bardahl.maroc.ui.screens.clients

import android.widget.Toast
import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.bardahl.maroc.domain.model.Client
import com.bardahl.maroc.domain.model.ClientType
import com.bardahl.maroc.domain.model.Order
import com.bardahl.maroc.domain.model.UserRole
import com.bardahl.maroc.ui.components.*
import com.bardahl.maroc.ui.theme.*
import com.bardahl.maroc.ui.viewmodels.AuthState
import com.bardahl.maroc.ui.viewmodels.AuthViewModel
import com.bardahl.maroc.ui.viewmodels.ClientViewModel
import com.bardahl.maroc.ui.viewmodels.OrderViewModel
import com.bardahl.maroc.util.PdfGenerator

@Composable
fun ClientListScreen(
    clientViewModel: ClientViewModel,
    orderViewModel: OrderViewModel,
    authViewModel: AuthViewModel,
    onSettingsClick: () -> Unit
) {
    val clients by clientViewModel.clientsList.collectAsState()
    val orders by orderViewModel.orders.collectAsState()
    val searchQuery by clientViewModel.searchQuery.collectAsState()
    val authState by authViewModel.authState.collectAsState()
    val currentUser = (authState as? AuthState.Success)?.user
    val isAdmin = currentUser?.role == UserRole.ADMIN
    val context = LocalContext.current

    // Auto-refresh when opening screen
    LaunchedEffect(Unit) {
        clientViewModel.refreshClientsFromSupabase()
        orderViewModel.refreshOrdersFromSupabase()
    }

    var showAddDialog by remember { mutableStateOf(false) }
    var editingClient by remember { mutableStateOf<Client?>(null) }
    var deletingClient by remember { mutableStateOf<Client?>(null) }
    var selectedDetailClient by remember { mutableStateOf<Client?>(null) }

    // Role-based client filtering matching Web app
    val userCommId = currentUser?.id ?: ""
    val visibleClients = if (isAdmin) {
        clients
    } else {
        clients.filter { it.commercialId == userCommId }
    }

    val filteredClients = remember(visibleClients, searchQuery) {
        if (searchQuery.isBlank()) visibleClients
        else visibleClients.filter {
            it.companyName.contains(searchQuery, ignoreCase = true) ||
            it.ice.contains(searchQuery) ||
            it.ifCode.contains(searchQuery, ignoreCase = true) ||
            it.city.contains(searchQuery, ignoreCase = true) ||
            it.address.contains(searchQuery, ignoreCase = true)
        }
    }

    Scaffold(
        topBar = {
            BardahlHeader(
                title = "Gestion des Clients",
                subtitle = "${filteredClients.size} clients enregistrés",
                onSettingsClick = onSettingsClick
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = { showAddDialog = true },
                containerColor = BardahlYellow,
                contentColor = BardahlBlack,
                shape = RoundedCornerShape(16.dp)
            ) {
                Icon(Icons.Default.Add, contentDescription = "Ajouter Client")
            }
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
                onValueChange = { clientViewModel.updateSearchQuery(it) },
                label = "Rechercher par Nom, ICE, Ville ou Code Client...",
                leadingIcon = Icons.Default.Search
            )

            Spacer(modifier = Modifier.height(14.dp))

            if (filteredClients.isEmpty()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = if (searchQuery.isNotBlank()) "Aucun client ne correspond à votre recherche."
                               else "Aucun client trouvé dans votre portefeuille.",
                        color = TextSecondaryDark,
                        fontSize = 13.sp
                    )
                }
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    items(filteredClients) { client ->
                        val clientOrders = orders.filter {
                            it.clientId == client.id ||
                            it.clientName.trim().equals(client.companyName.trim(), ignoreCase = true)
                        }
                        val totalCaTtc = clientOrders.sumOf { it.totalTtc }

                        ClientCardItem(
                            client = client,
                            ordersCount = clientOrders.size,
                            totalCaTtc = totalCaTtc,
                            onDetailsClick = { selectedDetailClient = client },
                            onEditClick = { editingClient = client },
                            onDeleteClick = { deletingClient = client }
                        )
                    }
                    item { Spacer(modifier = Modifier.height(80.dp)) }
                }
            }
        }
    }

    // Modal: Add Client
    if (showAddDialog) {
        ClientFormDialog(
            client = null,
            defaultCommercialId = currentUser?.id ?: "",
            onDismiss = { showAddDialog = false },
            onSave = { newClient ->
                clientViewModel.addClient(newClient)
                showAddDialog = false
                Toast.makeText(context, "Client \"${newClient.companyName}\" ajouté avec succès!", Toast.LENGTH_SHORT).show()
            }
        )
    }

    // Modal: Edit Client
    editingClient?.let { clientToEdit ->
        ClientFormDialog(
            client = clientToEdit,
            defaultCommercialId = clientToEdit.commercialId,
            onDismiss = { editingClient = null },
            onSave = { updatedClient ->
                clientViewModel.updateClient(updatedClient)
                editingClient = null
                Toast.makeText(context, "Client \"${updatedClient.companyName}\" mis à jour avec succès!", Toast.LENGTH_SHORT).show()
            }
        )
    }

    // Modal: Delete Confirmation
    deletingClient?.let { clientToDelete ->
        AlertDialog(
            onDismissRequest = { deletingClient = null },
            containerColor = DarkSurface,
            title = {
                Text("Supprimer le client ?", color = TextPrimaryDark, fontWeight = FontWeight.Bold)
            },
            text = {
                Text(
                    "Voulez-vous vraiment supprimer définitivement le client \"${clientToDelete.companyName}\" ?",
                    color = TextSecondaryDark,
                    fontSize = 13.sp
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        clientViewModel.deleteClient(clientToDelete.id)
                        deletingClient = null
                        Toast.makeText(context, "Client supprimé.", Toast.LENGTH_SHORT).show()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = StatusCancelled, contentColor = Color.White),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Text("Supprimer", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { deletingClient = null }) {
                    Text("Annuler", color = TextSecondaryDark)
                }
            }
        )
    }

    // Modal: Client Details & CA
    selectedDetailClient?.let { client ->
        val clientOrders = orders.filter {
            it.clientId == client.id ||
            it.clientName.trim().equals(client.companyName.trim(), ignoreCase = true)
        }
        ClientDetailsDialog(
            client = client,
            clientOrders = clientOrders,
            onDismiss = { selectedDetailClient = null },
            onDownloadPdf = {
                PdfGenerator.generateClientPdf(context, client, clientOrders)
                Toast.makeText(context, "Rapport PDF généré avec succès!", Toast.LENGTH_SHORT).show()
            }
        )
    }
}

@Composable
fun ClientCardItem(
    client: Client,
    ordersCount: Int,
    totalCaTtc: Double,
    onDetailsClick: () -> Unit,
    onEditClick: () -> Unit,
    onDeleteClick: () -> Unit
) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.fillMaxWidth()) {
            // Header Row: Company Name + Type Badge
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = client.companyName,
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimaryDark,
                    modifier = Modifier.weight(1f)
                )

                Spacer(modifier = Modifier.width(8.dp))

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(BardahlYellow.copy(alpha = 0.15f))
                        .border(1.dp, BardahlYellow.copy(alpha = 0.4f), RoundedCornerShape(8.dp))
                        .padding(horizontal = 8.dp, vertical = 3.dp)
                ) {
                    Text(
                        text = client.clientType.label,
                        fontSize = 11.sp,
                        color = BardahlYellow,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Information rows with Yellow Icons
            Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                // Code Client + ICE + RC
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Pin, contentDescription = null, tint = BardahlYellow, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = buildString {
                            if (client.ifCode.isNotBlank()) append("Code: ${client.ifCode} | ")
                            append("ICE: ${client.ice}")
                            if (client.rc.isNotBlank()) append(" | RC: ${client.rc}")
                        },
                        fontSize = 12.sp,
                        color = TextSecondaryDark
                    )
                }

                // Address & City
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Place, contentDescription = null, tint = BardahlYellow, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "${client.address}, ${client.city}",
                        fontSize = 12.sp,
                        color = TextSecondaryDark
                    )
                }

                // Phone
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Phone, contentDescription = null, tint = BardahlYellow, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = client.phone.ifBlank { "+212 5 22 00 00 00" },
                        fontSize = 12.sp,
                        color = TextPrimaryDark,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Quick CA Preview Badge (Exact Web Style)
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp))
                    .background(DarkBackground)
                    .border(1.dp, BardahlCardBorder, RoundedCornerShape(10.dp))
                    .padding(horizontal = 12.dp, vertical = 8.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "CA Réalisé :",
                        fontSize = 11.sp,
                        color = TextSecondaryDark,
                        fontWeight = FontWeight.SemiBold
                    )
                    Text(
                        text = "${String.format("%.2f DH", totalCaTtc)} ($ordersCount bon${if (ordersCount > 1) "s" else ""})",
                        fontSize = 13.sp,
                        color = BardahlYellow,
                        fontWeight = FontWeight.Black
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))
            HorizontalDivider(color = BardahlCardBorder)
            Spacer(modifier = Modifier.height(10.dp))

            // Card Footer: Active Client status + Action buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        Icons.Default.CheckCircle,
                        contentDescription = null,
                        tint = StatusDelivered,
                        modifier = Modifier.size(13.dp)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "Client Actif",
                        fontSize = 11.sp,
                        color = StatusDelivered,
                        fontWeight = FontWeight.Bold
                    )
                }

                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Details Button
                    Button(
                        onClick = onDetailsClick,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = BardahlYellow,
                            contentColor = BardahlBlack
                        ),
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                        modifier = Modifier.height(30.dp)
                    ) {
                        Icon(Icons.Default.Visibility, contentDescription = null, modifier = Modifier.size(13.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text("Détails", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }

                    // Edit Button
                    IconButton(
                        onClick = onEditClick,
                        modifier = Modifier
                            .size(30.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(DarkBackground)
                            .border(1.dp, BardahlYellow.copy(alpha = 0.4f), RoundedCornerShape(8.dp))
                    ) {
                        Icon(
                            Icons.Default.Edit,
                            contentDescription = "Modifier",
                            tint = BardahlYellow,
                            modifier = Modifier.size(14.dp)
                        )
                    }

                    // Delete Button
                    IconButton(
                        onClick = onDeleteClick,
                        modifier = Modifier
                            .size(30.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(StatusCancelled.copy(alpha = 0.15f))
                            .border(1.dp, StatusCancelled.copy(alpha = 0.3f), RoundedCornerShape(8.dp))
                    ) {
                        Icon(
                            Icons.Default.Delete,
                            contentDescription = "Supprimer",
                            tint = StatusCancelled,
                            modifier = Modifier.size(14.dp)
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun ClientDetailsDialog(
    client: Client,
    clientOrders: List<Order>,
    onDismiss: () -> Unit,
    onDownloadPdf: () -> Unit
) {
    val totalCaTtc = clientOrders.sumOf { it.totalTtc }
    val totalHt = totalCaTtc / 1.20
    val totalTva = totalCaTtc - totalHt
    val validatedCount = clientOrders.count { it.status.name.equals("VALIDATED", ignoreCase = true) }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = DarkSurface,
        title = {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = client.companyName,
                        color = TextPrimaryDark,
                        fontWeight = FontWeight.Black,
                        fontSize = 18.sp,
                        modifier = Modifier.weight(1f)
                    )
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(BardahlYellow.copy(alpha = 0.15f))
                            .padding(horizontal = 8.dp, vertical = 3.dp)
                    ) {
                        Text(client.clientType.label, color = BardahlYellow, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "Code: ${client.ifCode.ifBlank { "-" }} | ICE: ${client.ice} | Ville: ${client.city}",
                    fontSize = 11.sp,
                    color = TextSecondaryDark
                )
            }
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // 3 KPI Cards (Matching Web Modal)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // CA Total Card
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(10.dp))
                            .background(DarkBackground)
                            .border(1.dp, BardahlYellow.copy(alpha = 0.6f), RoundedCornerShape(10.dp))
                            .padding(10.dp)
                    ) {
                        Column {
                            Text("CA TOTAL", fontSize = 10.sp, color = TextSecondaryDark, fontWeight = FontWeight.Bold)
                            Text(
                                String.format("%.2f DH", totalCaTtc),
                                fontSize = 13.sp,
                                color = BardahlYellow,
                                fontWeight = FontWeight.Black
                            )
                        }
                    }

                    // Total HT Card
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(10.dp))
                            .background(DarkBackground)
                            .border(1.dp, BardahlCardBorder, RoundedCornerShape(10.dp))
                            .padding(10.dp)
                    ) {
                        Column {
                            Text("TOTAL HT", fontSize = 10.sp, color = TextSecondaryDark, fontWeight = FontWeight.Bold)
                            Text(
                                String.format("%.2f DH", totalHt),
                                fontSize = 13.sp,
                                color = TextPrimaryDark,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }

                    // Total Orders Card
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(10.dp))
                            .background(DarkBackground)
                            .border(1.dp, BardahlCardBorder, RoundedCornerShape(10.dp))
                            .padding(10.dp)
                    ) {
                        Column {
                            Text("BONS", fontSize = 10.sp, color = TextSecondaryDark, fontWeight = FontWeight.Bold)
                            Text(
                                "${clientOrders.size} ($validatedCount val.)",
                                fontSize = 13.sp,
                                color = StatusDelivered,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }

                // Client Identity Details
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(10.dp))
                        .background(DarkBackground)
                        .padding(12.dp)
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("• Registre de Commerce (RC): ${client.rc.ifBlank { "-" }}", fontSize = 12.sp, color = TextPrimaryDark)
                        Text("• Adresse: ${client.address}, ${client.city}", fontSize = 12.sp, color = TextPrimaryDark)
                        Text("• Téléphone: ${client.phone}", fontSize = 12.sp, color = TextPrimaryDark)
                        if (client.email.isNotBlank()) Text("• Email: ${client.email}", fontSize = 12.sp, color = TextPrimaryDark)
                    }
                }

                // Orders History Section Header
                Text(
                    text = "Historique des Bons de Commande (${clientOrders.size})",
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextPrimaryDark
                )

                if (clientOrders.isEmpty()) {
                    Text(
                        text = "Aucun bon de commande enregistré pour ce client.",
                        fontSize = 12.sp,
                        color = TextSecondaryDark
                    )
                } else {
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        clientOrders.forEach { ord ->
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(DarkBackground)
                                    .border(1.dp, BardahlCardBorder, RoundedCornerShape(8.dp))
                                    .padding(8.dp)
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column {
                                        Text(ord.orderNumber, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextPrimaryDark)
                                        Text(ord.orderDate, fontSize = 10.sp, color = TextSecondaryDark)
                                    }
                                    Column(horizontalAlignment = Alignment.End) {
                                        Text(String.format("%.2f DH", ord.totalTtc), fontSize = 12.sp, fontWeight = FontWeight.Black, color = BardahlYellow)
                                        StatusBadge(ord.status)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },
        confirmButton = {
            Button(
                onClick = onDownloadPdf,
                colors = ButtonDefaults.buttonColors(containerColor = BardahlYellow, contentColor = BardahlBlack),
                shape = RoundedCornerShape(10.dp)
            ) {
                Icon(Icons.Default.PictureAsPdf, contentDescription = null, modifier = Modifier.size(15.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("TÉLÉCHARGER PDF", fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Fermer", color = TextSecondaryDark)
            }
        }
    )
}

@Composable
fun ClientFormDialog(
    client: Client?,
    defaultCommercialId: String,
    onDismiss: () -> Unit,
    onSave: (Client) -> Unit
) {
    var companyName by remember { mutableStateOf(client?.companyName ?: "") }
    var ifCode by remember { mutableStateOf(client?.ifCode ?: "") }
    var ice by remember { mutableStateOf(client?.ice ?: "") }
    var rc by remember { mutableStateOf(client?.rc ?: "") }
    var address by remember { mutableStateOf(client?.address ?: "") }
    var city by remember { mutableStateOf(client?.city ?: "") }
    var phone by remember { mutableStateOf(client?.phone ?: "") }
    var email by remember { mutableStateOf(client?.email ?: "") }
    var selectedType by remember { mutableStateOf(client?.clientType ?: ClientType.GARAGE) }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = DarkSurface,
        title = {
            Text(
                text = if (client == null) "Ajouter un Client" else "Modifier le Client",
                color = TextPrimaryDark,
                fontWeight = FontWeight.Bold,
                fontSize = 17.sp
            )
        },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                BardahlTextField(companyName, { companyName = it }, "Raison Sociale / Nom *")
                BardahlTextField(ifCode, { ifCode = it }, "Code Client (IF Code)")
                BardahlTextField(ice, { ice = it }, "N° ICE (15 chiffres) *")
                BardahlTextField(rc, { rc = it }, "N° Registre Commerce (RC)")
                BardahlTextField(address, { address = it }, "Adresse Complète")
                BardahlTextField(city, { city = it }, "Ville")
                BardahlTextField(phone, { phone = it }, "Téléphone Contact")
                BardahlTextField(email, { email = it }, "Email")

                Text("Type de Client :", fontSize = 12.sp, color = TextSecondaryDark, fontWeight = FontWeight.Bold)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    listOf(ClientType.GARAGE, ClientType.STATION, ClientType.FLOTTE, ClientType.INDUSTRIEL).forEach { t ->
                        val isSelected = selectedType == t
                        FilterChip(
                            selected = isSelected,
                            onClick = { selectedType = t },
                            label = { Text(t.label, fontSize = 11.sp) },
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
        },
        confirmButton = {
            BardahlButton(
                text = "ENREGISTRER",
                onClick = {
                    if (companyName.isNotBlank() && ice.isNotBlank()) {
                        val finalClient = Client(
                            id = client?.id ?: java.util.UUID.randomUUID().toString(),
                            commercialId = client?.commercialId ?: defaultCommercialId,
                            companyName = companyName.trim(),
                            ice = ice.trim(),
                            rc = rc.trim(),
                            ifCode = ifCode.trim(),
                            patente = client?.patente ?: "",
                            address = address.trim().ifBlank { "Casablanca" },
                            city = city.trim().ifBlank { "Casablanca" },
                            phone = phone.trim().ifBlank { "+212 5 22 00 00 00" },
                            email = email.trim(),
                            clientType = selectedType
                        )
                        onSave(finalClient)
                    }
                }
            )
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Annuler", color = TextSecondaryDark)
            }
        }
    )
}
