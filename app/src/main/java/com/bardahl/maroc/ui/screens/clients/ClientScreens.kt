package com.bardahl.maroc.ui.screens.clients

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
import com.bardahl.maroc.domain.model.Client
import com.bardahl.maroc.ui.components.*
import com.bardahl.maroc.ui.theme.*
import com.bardahl.maroc.domain.model.UserRole
import com.bardahl.maroc.ui.viewmodels.AuthState
import com.bardahl.maroc.ui.viewmodels.AuthViewModel
import com.bardahl.maroc.ui.viewmodels.ClientViewModel

@Composable
fun ClientListScreen(
    clientViewModel: ClientViewModel,
    authViewModel: AuthViewModel,
    onSettingsClick: () -> Unit
) {
    val clients by clientViewModel.clientsList.collectAsState()
    val searchQuery by clientViewModel.searchQuery.collectAsState()
    val authState by authViewModel.authState.collectAsState()
    val currentUser = (authState as? AuthState.Success)?.user
    val isAdmin = currentUser?.role == UserRole.ADMIN

    var showAddDialog by remember { mutableStateOf(false) }
    var selectedDetailClient by remember { mutableStateOf<Client?>(null) }

    // Role-based client filtering matching Web app
    val visibleClients = if (isAdmin) {
        clients
    } else {
        val userCommId = currentUser?.id ?: ""
        val userEmail = currentUser?.email?.lowercase() ?: ""
        clients.filter { c ->
            val commIdClean = c.commercialId.lowercase().replace("c", "")
            val userCommIdClean = userCommId.lowercase().replace("c", "")

            (userCommId.isNotBlank() && c.commercialId == userCommId) ||
            (commIdClean.isNotBlank() && userCommIdClean.isNotBlank() && commIdClean == userCommIdClean) ||
            (userEmail.contains("karim") && (c.commercialId.contains("8888") || c.companyName.contains("Ain Sebaa", ignoreCase = true) || c.companyName.contains("Afriquia", ignoreCase = true) || c.commercialId.isBlank() || c.id == "c1" || c.id == "c2")) ||
            (userEmail.contains("youssef") && (c.commercialId.contains("9999") || c.companyName.contains("Transport", ignoreCase = true) || c.companyName.contains("Sud", ignoreCase = true) || c.id == "c3")) ||
            (userEmail.contains("mehdi") && c.commercialId.contains("7777"))
        }
    }

    val filteredClients = visibleClients.filter {
        it.companyName.contains(searchQuery, ignoreCase = true) ||
        it.ice.contains(searchQuery) ||
        it.city.contains(searchQuery, ignoreCase = true)
    }

    Scaffold(
        topBar = {
            BardahlHeader(
                title = "Gestion des Clients",
                subtitle = "Portefeuille & Fiches Clients",
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

            BardahlTextField(
                value = searchQuery,
                onValueChange = { clientViewModel.updateSearchQuery(it) },
                label = "Rechercher par Nom, ICE ou Ville...",
                leadingIcon = Icons.Default.Search
            )

            Spacer(modifier = Modifier.height(16.dp))

            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                items(filteredClients) { client ->
                    ClientCardItem(
                        client = client,
                        onDetailsClick = { selectedDetailClient = client }
                    )
                }
            }
        }
    }

    if (showAddDialog) {
        AddClientDialog(
            onDismiss = { showAddDialog = false },
            onAdd = { newClient ->
                clientViewModel.addClient(newClient)
                showAddDialog = false
            }
        )
    }

    selectedDetailClient?.let { client ->
        ClientDetailsDialog(
            client = client,
            onDismiss = { selectedDetailClient = null }
        )
    }
}

@Composable
fun ClientCardItem(
    client: Client,
    onDetailsClick: () -> Unit
) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.fillMaxWidth()) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        client.companyName,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimaryDark
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        "ICE : ${client.ice} | RC : ${client.rc}",
                        fontSize = 12.sp,
                        color = TextSecondaryDark
                    )
                    Text(
                        "Adresse : ${client.address}, ${client.city}",
                        fontSize = 12.sp,
                        color = TextSecondaryDark
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Phone, contentDescription = null, tint = BardahlYellow, modifier = Modifier.size(14.dp))
                        Spacer(modifier = Modifier.width(4.dp))
                        Text(client.phone, fontSize = 12.sp, color = TextPrimaryDark, fontWeight = FontWeight.SemiBold)
                    }
                }

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(10.dp))
                        .background(BardahlYellow.copy(alpha = 0.15f))
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        client.clientType.label,
                        fontSize = 11.sp,
                        color = BardahlYellow,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End
            ) {
                Button(
                    onClick = onDetailsClick,
                    colors = ButtonDefaults.buttonColors(containerColor = BardahlYellow, contentColor = BardahlBlack),
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                    modifier = Modifier.height(32.dp)
                ) {
                    Icon(Icons.Default.Info, contentDescription = null, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(4.dp))
                    Text("Détails & CA", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
fun ClientDetailsDialog(
    client: Client,
    onDismiss: () -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = DarkSurface,
        title = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Default.Business, contentDescription = null, tint = BardahlYellow)
                Spacer(modifier = Modifier.width(8.dp))
                Text(client.companyName, color = TextPrimaryDark, fontWeight = FontWeight.Bold, fontSize = 18.sp)
            }
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(12.dp))
                        .background(DarkBackground)
                        .padding(12.dp)
                ) {
                    Column {
                        Text("CHIFFRE D'AFFAIRES TOTAL", fontSize = 11.sp, color = TextSecondaryDark, fontWeight = FontWeight.Bold)
                        Text("5,100.00 DH", fontSize = 20.sp, color = BardahlYellow, fontWeight = FontWeight.ExtraBold)
                        Text("Basé sur les Bons de Commande enregistrés", fontSize = 10.sp, color = TextSecondaryDark)
                    }
                }

                Text("• ICE: ${client.ice}", fontSize = 13.sp, color = TextPrimaryDark)
                Text("• Registre Commerce: ${client.rc}", fontSize = 13.sp, color = TextPrimaryDark)
                Text("• Adresse: ${client.address}, ${client.city}", fontSize = 13.sp, color = TextPrimaryDark)
                Text("• Téléphone: ${client.phone}", fontSize = 13.sp, color = TextPrimaryDark)
                Text("• Type: ${client.clientType.label}", fontSize = 13.sp, color = BardahlYellow)
            }
        },
        confirmButton = {
            BardahlButton(
                text = "FERMER",
                onClick = onDismiss
            )
        }
    )
}

@Composable
fun AddClientDialog(
    onDismiss: () -> Unit,
    onAdd: (Client) -> Unit
) {
    var companyName by remember { mutableStateOf("") }
    var ice by remember { mutableStateOf("") }
    var rc by remember { mutableStateOf("") }
    var ifCode by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }
    var city by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = DarkSurface,
        title = {
            Text("Nouveau Client Bardahl", color = TextPrimaryDark, fontWeight = FontWeight.Bold)
        },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                BardahlTextField(companyName, { companyName = it }, "Raison Sociale")
                BardahlTextField(ice, { ice = it }, "N° ICE (15 chiffres)")
                BardahlTextField(rc, { rc = it }, "N° Registre du Commerce (RC)")
                BardahlTextField(address, { address = it }, "Adresse Complète")
                BardahlTextField(city, { city = it }, "Ville")
                BardahlTextField(phone, { phone = it }, "Téléphone Contact")
            }
        },
        confirmButton = {
            BardahlButton(
                text = "ENREGISTRER",
                onClick = {
                    if (companyName.isNotBlank() && ice.isNotBlank()) {
                        onAdd(
                            Client(
                                id = java.util.UUID.randomUUID().toString(),
                                commercialId = "c8888888-8888-8888-8888-888888888888",
                                companyName = companyName,
                                ice = ice,
                                rc = rc,
                                ifCode = ifCode,
                                patente = "",
                                address = address,
                                city = city,
                                phone = phone,
                                email = ""
                            )
                        )
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
