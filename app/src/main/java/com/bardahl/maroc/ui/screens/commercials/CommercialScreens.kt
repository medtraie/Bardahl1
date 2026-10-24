package com.bardahl.maroc.ui.screens.commercials

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
import com.bardahl.maroc.data.MoroccanRegion
import com.bardahl.maroc.data.MoroccanRegionsRepository
import com.bardahl.maroc.data.remote.SupabaseService
import com.bardahl.maroc.domain.model.Commercial
import com.bardahl.maroc.ui.components.*
import com.bardahl.maroc.ui.theme.*
import kotlinx.coroutines.launch

val AVAILABLE_MOROCCO_SECTORS = listOf(
    "Casablanca", "Mohammedia", "Rabat", "Salé", "Kénitra",
    "Tanger", "Tétouan", "Marrakech", "Agadir", "Fès",
    "Meknès", "Oujda", "El Jadida", "Safi", "Béni Mellal", "Nador"
)

data class CommercialData(
    val id: String,
    val firstName: String,
    val lastName: String,
    val email: String,
    val password: String = "123",
    val phone: String,
    val matricule: String,
    val address: String,
    val city: String,
    val regions: List<String> = listOf("Casablanca-Settat"),
    val sectors: List<String> = listOf("Casablanca"),
    val isActive: Boolean = true,
    val lastLogin: String = "Aujourd'hui",
    val totalOrders: Int = 0,
    val targetSales: Double = 150000.0,
    val currentSales: Double = 0.0
) {
    val fullName: String get() = "$firstName $lastName".trim()
}

@Composable
fun CommercialManagementScreen(onSettingsClick: () -> Unit) {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    val supabaseService = remember { SupabaseService() }

    var commercials by remember {
        mutableStateOf(
            listOf(
                CommercialData("c1", "Mohammed", "amine", "mohammed@bardahl.ma", "123", "+212 6 61 22 33 44", "COM-1", "Zone Industrielle", "Casablanca, Mohammedia", listOf("Casablanca-Settat"), listOf("Casablanca", "Mohammedia"), true, "Aujourd'hui", 2, 150000.0, 148500.0),
                CommercialData("c2", "Amiaach", "", "amiaach@bardahl.ma", "123", "+212 6 62 44 55 66", "COM-02", "Centre Ville", "Rabat, Salé, Kénitra", listOf("Rabat-Salé-Kénitra"), listOf("Rabat", "Salé", "Kénitra"), true, "Hier", 1, 120000.0, 95000.0),
                CommercialData("c3", "Bahjaji", "", "bahjaji@bardahl.ma", "123", "+212 6 63 77 88 99", "COM-3", "Guéliz", "Marrakech, Agadir", listOf("Marrakech-Safi", "Souss-Massa"), listOf("Marrakech", "Agadir"), true, "Il y a 2j", 0, 100000.0, 82000.0)
            )
        )
    }

    // Live Sync with Supabase on screen load
    LaunchedEffect(Unit) {
        coroutineScope.launch {
            try {
                val remoteComms = supabaseService.fetchCommercials()
                val remoteOrders = supabaseService.fetchOrders()

                if (remoteComms.isNotEmpty()) {
                    val updatedList = remoteComms.map { c ->
                        val orderCount = remoteOrders.count { o -> o.commercialId == c.id }
                        val nameParts = c.name.split(" ")
                        val first = nameParts.firstOrNull() ?: c.name
                        val last = if (nameParts.size > 1) nameParts.subList(1, nameParts.size).joinToString(" ") else ""
                        val sectorList = c.city.split(",").map { it.trim() }.filter { it.isNotBlank() }
                        val inferredRegions = sectorList.map { MoroccanRegionsRepository.getRegionForCity(it) }.distinct().ifEmpty { listOf("Casablanca-Settat") }
                        val finalRegions = if (c.regions.isNotEmpty()) c.regions else inferredRegions

                        CommercialData(
                            id = c.id,
                            firstName = first,
                            lastName = last,
                            email = if (c.email.isNotBlank()) c.email else "commercial@bardahl.ma",
                            password = c.password.ifBlank { "123456" },
                            phone = if (c.phone.isNotBlank()) c.phone else "+212 6 61 22 33 44",
                            matricule = c.matricule,
                            city = c.city,
                            address = c.city,
                            regions = finalRegions,
                            sectors = if (sectorList.isNotEmpty()) sectorList else listOf("Casablanca"),
                            isActive = c.isActive,
                            totalOrders = orderCount,
                            targetSales = c.targetMonthlySales,
                            currentSales = c.currentMonthSales
                        )
                    }
                    commercials = updatedList
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    var searchQuery by remember { mutableStateOf("") }
    var selectedRegionFilter by remember { mutableStateOf("ALL") }
    var showAddDialog by remember { mutableStateOf(false) }
    var editingCommercial by remember { mutableStateOf<CommercialData?>(null) }
    var resettingPassCommercial by remember { mutableStateOf<CommercialData?>(null) }
    var commercialToSafeDelete by remember { mutableStateOf<CommercialData?>(null) }

    val filteredCommercials = commercials.filter { comm ->
        val matchesSearch = comm.fullName.contains(searchQuery, ignoreCase = true) ||
            comm.matricule.contains(searchQuery, ignoreCase = true) ||
            comm.city.contains(searchQuery, ignoreCase = true) ||
            comm.email.contains(searchQuery, ignoreCase = true) ||
            comm.sectors.any { s -> s.contains(searchQuery, ignoreCase = true) } ||
            comm.regions.any { r -> r.contains(searchQuery, ignoreCase = true) }

        val matchesRegion = selectedRegionFilter == "ALL" ||
            comm.regions.any { it.equals(selectedRegionFilter, ignoreCase = true) } ||
            comm.sectors.any { MoroccanRegionsRepository.getRegionForCity(it).equals(selectedRegionFilter, ignoreCase = true) }

        matchesSearch && matchesRegion
    }

    Scaffold(
        topBar = {
            BardahlHeader(
                title = "Équipe Commerciale",
                subtitle = "Gestion du Portefeuille Multi-Secteurs Bardahl",
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
                Icon(Icons.Default.PersonAdd, contentDescription = "Créer Compte Commercial")
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
                onValueChange = { searchQuery = it },
                label = "Rechercher Commercial, Secteur, Matricule...",
                leadingIcon = Icons.Default.Search
            )

            Spacer(modifier = Modifier.height(10.dp))

            // COM-01 & COM-02: Region Filter Chips Row
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                FilterChip(
                    selected = selectedRegionFilter == "ALL",
                    onClick = { selectedRegionFilter = "ALL" },
                    label = { Text("Toutes Régions", fontSize = 11.sp, fontWeight = FontWeight.Bold) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = BardahlYellow,
                        selectedLabelColor = BardahlBlack,
                        containerColor = DarkSurface,
                        labelColor = TextPrimaryDark
                    )
                )

                MoroccanRegionsRepository.getAllRegions().forEach { reg ->
                    val isSel = selectedRegionFilter.equals(reg.name, ignoreCase = true)
                    FilterChip(
                        selected = isSel,
                        onClick = { selectedRegionFilter = if (isSel) "ALL" else reg.name },
                        label = { Text(reg.name, fontSize = 11.sp, fontWeight = FontWeight.Bold) },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = reg.color,
                            selectedLabelColor = BardahlBlack,
                            containerColor = DarkSurface,
                            labelColor = TextPrimaryDark
                        )
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                items(filteredCommercials) { comm ->
                    CommercialCardFull(
                        commercial = comm,
                        onEdit = { editingCommercial = comm },
                        onToggleActive = {
                            val newStatus = !comm.isActive
                            commercials = commercials.map {
                                if (it.id == comm.id) it.copy(isActive = newStatus) else it
                            }
                            coroutineScope.launch {
                                supabaseService.updateCommercial(
                                    Commercial(
                                        id = comm.id,
                                        userId = "00000000-0000-0000-0000-000000000000",
                                        name = comm.fullName,
                                        email = comm.email,
                                        password = comm.password,
                                        phone = comm.phone,
                                        matricule = comm.matricule,
                                        city = comm.city,
                                        isActive = newStatus,
                                        targetMonthlySales = comm.targetSales,
                                        currentMonthSales = comm.currentSales,
                                        totalOrdersCount = comm.totalOrders,
                                        sectors = comm.sectors
                                    )
                                )
                            }
                            val statusStr = if (newStatus) "Activé" else "Désactivé"
                            Toast.makeText(context, "Compte de ${comm.fullName} $statusStr.", Toast.LENGTH_SHORT).show()
                        },
                        onResetPassword = { resettingPassCommercial = comm },
                        onDeleteClick = {
                            if (comm.totalOrders > 0) {
                                commercialToSafeDelete = comm
                            } else {
                                commercials = commercials.filter { it.id != comm.id }
                                coroutineScope.launch {
                                    supabaseService.deleteCommercial(comm.id)
                                }
                                Toast.makeText(context, "Commercial ${comm.fullName} supprimé.", Toast.LENGTH_SHORT).show()
                            }
                        }
                    )
                }
                item { Spacer(modifier = Modifier.height(24.dp)) }
            }
        }
    }

    if (showAddDialog) {
        AddEditCommercialDialog(
            title = "Créer Compte Commercial",
            initialData = null,
            onDismiss = { showAddDialog = false },
            onSave = { newComm ->
                commercials = listOf(newComm) + commercials
                showAddDialog = false
                coroutineScope.launch {
                    supabaseService.postCommercial(
                        Commercial(
                            id = newComm.id,
                            userId = "00000000-0000-0000-0000-000000000000",
                            name = newComm.fullName,
                            email = newComm.email,
                            password = newComm.password,
                            phone = newComm.phone,
                            matricule = newComm.matricule,
                            city = newComm.sectors.joinToString(", "),
                            targetMonthlySales = newComm.targetSales,
                            currentMonthSales = newComm.currentSales,
                            totalOrdersCount = newComm.totalOrders,
                            isActive = newComm.isActive,
                            sectors = newComm.sectors,
                            regions = newComm.regions
                        )
                    )
                }
                Toast.makeText(context, "Compte Commercial (${newComm.email}) créé avec succès !", Toast.LENGTH_SHORT).show()
            }
        )
    }

    if (editingCommercial != null) {
        AddEditCommercialDialog(
            title = "Modifier Compte Commercial",
            initialData = editingCommercial,
            onDismiss = { editingCommercial = null },
            onSave = { updatedComm ->
                commercials = commercials.map { if (it.id == updatedComm.id) updatedComm else it }
                editingCommercial = null
                coroutineScope.launch {
                    supabaseService.updateCommercial(
                        Commercial(
                            id = updatedComm.id,
                            userId = "00000000-0000-0000-0000-000000000000",
                            name = updatedComm.fullName,
                            email = updatedComm.email,
                            password = updatedComm.password,
                            phone = updatedComm.phone,
                            matricule = updatedComm.matricule,
                            city = updatedComm.sectors.joinToString(", "),
                            targetMonthlySales = updatedComm.targetSales,
                            currentMonthSales = updatedComm.currentSales,
                            totalOrdersCount = updatedComm.totalOrders,
                            isActive = updatedComm.isActive,
                            sectors = updatedComm.sectors,
                            regions = updatedComm.regions
                        )
                    )
                }
                Toast.makeText(context, "Commercial ${updatedComm.fullName} mis à jour !", Toast.LENGTH_SHORT).show()
            }
        )
    }

    if (resettingPassCommercial != null) {
        ResetPasswordDialog(
            commercial = resettingPassCommercial!!,
            onDismiss = { resettingPassCommercial = null },
            onConfirm = { newPass ->
                val targetComm = resettingPassCommercial!!
                commercials = commercials.map {
                    if (it.id == targetComm.id) it.copy(password = newPass) else it
                }
                resettingPassCommercial = null
                coroutineScope.launch {
                    supabaseService.updateCommercial(
                        Commercial(
                            id = targetComm.id,
                            userId = "00000000-0000-0000-0000-000000000000",
                            name = targetComm.fullName,
                            email = targetComm.email,
                            password = newPass,
                            phone = targetComm.phone,
                            matricule = targetComm.matricule,
                            city = targetComm.city,
                            targetMonthlySales = targetComm.targetSales,
                            currentMonthSales = targetComm.currentSales,
                            totalOrdersCount = targetComm.totalOrders,
                            isActive = targetComm.isActive,
                            sectors = targetComm.sectors
                        )
                    )
                }
                Toast.makeText(context, "Mot de passe réinitialisé avec succès !", Toast.LENGTH_SHORT).show()
            }
        )
    }

    // Safety Prompt: Deactivate instead of delete if commercial has orders
    if (commercialToSafeDelete != null) {
        val comm = commercialToSafeDelete!!
        AlertDialog(
            onDismissRequest = { commercialToSafeDelete = null },
            containerColor = DarkSurface,
            title = {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Default.Warning, contentDescription = null, tint = BardahlYellow)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Historique des Ventes Détecté", color = TextPrimaryDark, fontWeight = FontWeight.Bold)
                }
            },
            text = {
                Text(
                    text = "Le commercial ${comm.fullName} a ${comm.totalOrders} bon(s) de commande enregistrés.\n\nPour préserver l'intégrité des rapports et des chiffres d'affaires, il est fortement conseillé de DÉSACTIVER son compte au lieu de le supprimer.",
                    color = TextSecondaryDark,
                    fontSize = 13.sp,
                    lineHeight = 18.sp
                )
            },
            confirmButton = {
                Button(
                    onClick = {
                        commercials = commercials.map { if (it.id == comm.id) it.copy(isActive = false) else it }
                        coroutineScope.launch {
                            supabaseService.updateCommercial(
                                Commercial(
                                    id = comm.id,
                                    userId = "00000000-0000-0000-0000-000000000000",
                                    name = comm.fullName,
                                    email = comm.email,
                                    password = comm.password,
                                    phone = comm.phone,
                                    matricule = comm.matricule,
                                    city = comm.city,
                                    isActive = false,
                                    targetMonthlySales = comm.targetSales,
                                    currentMonthSales = comm.currentSales,
                                    totalOrdersCount = comm.totalOrders,
                                    sectors = comm.sectors,
                                    regions = comm.regions
                                )
                            )
                        }
                        commercialToSafeDelete = null
                        Toast.makeText(context, "Compte de ${comm.fullName} désactivé avec succès.", Toast.LENGTH_SHORT).show()
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = BardahlYellow, contentColor = BardahlBlack),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("DÉSACTIVER LE COMPTE", fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(
                    onClick = {
                        commercials = commercials.filter { it.id != comm.id }
                        coroutineScope.launch {
                            supabaseService.deleteCommercial(comm.id)
                        }
                        commercialToSafeDelete = null
                        Toast.makeText(context, "Commercial ${comm.fullName} supprimé définitivement.", Toast.LENGTH_SHORT).show()
                    }
                ) {
                    Text("Forcer Suppression", color = StatusCancelled)
                }
            }
        )
    }
}

@Composable
fun CommercialCardFull(
    commercial: CommercialData,
    onEdit: () -> Unit,
    onToggleActive: () -> Unit,
    onResetPassword: () -> Unit,
    onDeleteClick: () -> Unit
) {
    val progress = (commercial.currentSales / commercial.targetSales).coerceIn(0.0, 1.0).toFloat()

    GlassCard(
        modifier = Modifier.fillMaxWidth(),
        borderColor = if (commercial.isActive) BardahlCardBorder else StatusCancelled.copy(alpha = 0.5f)
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            
            // Header Row: Avatar + Name/Matricule + Status Badge
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f, fill = true)
                ) {
                    Box(
                        modifier = Modifier
                            .size(44.dp)
                            .clip(CircleShape)
                            .background(if (commercial.isActive) BardahlYellow else DarkBackground),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "${commercial.firstName.take(1)}${commercial.lastName.take(1)}".uppercase(),
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Black,
                            color = if (commercial.isActive) BardahlBlack else TextSecondaryDark
                        )
                    }

                    Spacer(modifier = Modifier.width(10.dp))

                    Column(modifier = Modifier.weight(1f, fill = true)) {
                        Text(
                            text = commercial.fullName,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimaryDark
                        )
                        Text(
                            text = "Matricule: ${commercial.matricule}",
                            fontSize = 11.sp,
                            color = TextSecondaryDark
                        )
                    }
                }

                Spacer(modifier = Modifier.width(6.dp))

                // Active / Inactive Status Badge
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(if (commercial.isActive) StatusDelivered.copy(alpha = 0.18f) else StatusCancelled.copy(alpha = 0.18f))
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = if (commercial.isActive) "✓ Actif" else "⏸ Désactivé",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (commercial.isActive) StatusDelivered else StatusCancelled
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Assigned Multi-Regions Badges (COM-01)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(5.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Default.Public, contentDescription = null, tint = BardahlYellow, modifier = Modifier.size(14.dp))
                commercial.regions.forEach { regName ->
                    val regObj = MoroccanRegionsRepository.getAllRegions().find { it.name.equals(regName, ignoreCase = true) }
                    val regColor = regObj?.color ?: BardahlYellow
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(regColor.copy(alpha = 0.18f))
                            .border(1.dp, regColor.copy(alpha = 0.5f), RoundedCornerShape(6.dp))
                            .padding(horizontal = 7.dp, vertical = 2.dp)
                    ) {
                        Text(regName, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = regColor)
                    }
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            // Attached Cities covered
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(4.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(Icons.Default.LocationOn, contentDescription = null, tint = TextSecondaryDark, modifier = Modifier.size(13.dp))
                commercial.sectors.forEach { sec ->
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(5.dp))
                            .background(DarkBackground)
                            .border(1.dp, BardahlCardBorder, RoundedCornerShape(5.dp))
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(sec, fontSize = 9.sp, fontWeight = FontWeight.SemiBold, color = TextPrimaryDark)
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Contact details box
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp))
                    .background(DarkBackground.copy(alpha = 0.6f))
                    .padding(10.dp)
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Email: ${commercial.email}", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = TextPrimaryDark)
                        Text("Mdps: ${commercial.password}", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = StatusDelivered)
                    }
                    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("Tél: ${commercial.phone}", fontSize = 11.sp, color = TextSecondaryDark)
                        Text("Commandes: ${commercial.totalOrders}", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = BardahlYellow)
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Sales Progress Bar
            Text("Objectif Ventes Mensuel", fontSize = 11.sp, color = TextSecondaryDark, fontWeight = FontWeight.SemiBold)
            Spacer(modifier = Modifier.height(4.dp))
            LinearProgressIndicator(
                progress = { progress },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(6.dp)
                    .clip(RoundedCornerShape(3.dp)),
                color = BardahlYellow,
                trackColor = BardahlCardBorder
            )
            Spacer(modifier = Modifier.height(4.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("${String.format("%.0f", commercial.currentSales)} DH", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = BardahlYellow)
                Text("Objectif: ${String.format("%.0f", commercial.targetSales)} DH", fontSize = 11.sp, color = TextSecondaryDark)
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Action Buttons Row (Edit, Reset Password, Activate/Deactivate Toggle, Delete)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Activate / Deactivate button
                Button(
                    onClick = onToggleActive,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (commercial.isActive) StatusCancelled.copy(alpha = 0.15f) else StatusDelivered.copy(alpha = 0.15f),
                        contentColor = if (commercial.isActive) StatusCancelled else StatusDelivered
                    ),
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                    modifier = Modifier.height(30.dp)
                ) {
                    Text(if (commercial.isActive) "Désactiver" else "Activer", fontSize = 10.sp, fontWeight = FontWeight.Bold)
                }

                Spacer(modifier = Modifier.width(4.dp))

                IconButton(onClick = onEdit, modifier = Modifier.size(32.dp)) {
                    Icon(Icons.Default.Edit, contentDescription = "Modifier", tint = BardahlYellow, modifier = Modifier.size(16.dp))
                }
                IconButton(onClick = onResetPassword, modifier = Modifier.size(32.dp)) {
                    Icon(Icons.Default.VpnKey, contentDescription = "Réinitialiser Mot de passe", tint = StatusValidated, modifier = Modifier.size(16.dp))
                }
                IconButton(onClick = onDeleteClick, modifier = Modifier.size(32.dp)) {
                    Icon(Icons.Default.Delete, contentDescription = "Supprimer", tint = StatusCancelled, modifier = Modifier.size(16.dp))
                }
            }
        }
    }
}

@Composable
fun AddEditCommercialDialog(
    title: String,
    initialData: CommercialData?,
    onDismiss: () -> Unit,
    onSave: (CommercialData) -> Unit
) {
    var firstName by remember { mutableStateOf(initialData?.firstName ?: "") }
    var lastName by remember { mutableStateOf(initialData?.lastName ?: "") }
    var email by remember { mutableStateOf(initialData?.email ?: "") }
    var password by remember { mutableStateOf(initialData?.password ?: "123") }
    var phone by remember { mutableStateOf(initialData?.phone ?: "") }
    var matricule by remember { mutableStateOf(initialData?.matricule ?: "COM-00${(4..99).random()}") }
    var selectedRegions by remember { mutableStateOf(initialData?.regions ?: listOf("Casablanca-Settat")) }
    var selectedSectors by remember { mutableStateOf(initialData?.sectors ?: listOf("Casablanca", "Mohammedia", "Settat")) }
    var customCityInput by remember { mutableStateOf("") }
    var showAddCustomRegionDialog by remember { mutableStateOf(false) }
    var targetSalesStr by remember { mutableStateOf(initialData?.targetSales?.toString() ?: "150000") }
    var isAccountActive by remember { mutableStateOf(initialData?.isActive ?: true) }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = DarkSurface,
        title = { Text(title, color = TextPrimaryDark, fontWeight = FontWeight.Bold) },
        text = {
            Column(
                modifier = Modifier.verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                BardahlTextField(firstName, { firstName = it }, "Prénom *")
                BardahlTextField(lastName, { lastName = it }, "Nom")
                BardahlTextField(email, { email = it }, "Adresse Email Identifiant *")
                BardahlTextField(password, { password = it }, "Mot de Passe *")
                BardahlTextField(phone, { phone = it }, "Téléphone")
                BardahlTextField(matricule, { matricule = it }, "Matricule")

                // COM-01 & COM-02: Multi-Region Assignment
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Régions de Travail (COM-01) :", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = BardahlYellow)
                    TextButton(
                        onClick = { showAddCustomRegionDialog = true },
                        contentPadding = PaddingValues(horizontal = 4.dp, vertical = 2.dp)
                    ) {
                        Icon(Icons.Default.Add, contentDescription = null, tint = BardahlYellow, modifier = Modifier.size(13.dp))
                        Spacer(modifier = Modifier.width(2.dp))
                        Text("+ Région", fontSize = 11.sp, color = BardahlYellow, fontWeight = FontWeight.Bold)
                    }
                }

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    MoroccanRegionsRepository.getAllRegions().forEach { reg ->
                        val isSelected = selectedRegions.contains(reg.name)
                        FilterChip(
                            selected = isSelected,
                            onClick = {
                                val nextRegs = if (isSelected) {
                                    if (selectedRegions.size > 1) selectedRegions - reg.name else selectedRegions
                                } else {
                                    selectedRegions + reg.name
                                }
                                selectedRegions = nextRegs
                                // Auto-associate attached cities
                                val attached = MoroccanRegionsRepository.getCitiesForRegions(nextRegs)
                                val keepCustom = selectedSectors.filter { s ->
                                    val r = MoroccanRegionsRepository.getRegionForCity(s)
                                    nextRegs.contains(r)
                                }
                                selectedSectors = (keepCustom + attached).distinct()
                            },
                            label = { Text(reg.name, fontSize = 11.sp, fontWeight = FontWeight.Bold) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = reg.color,
                                selectedLabelColor = BardahlBlack,
                                containerColor = DarkBackground,
                                labelColor = TextPrimaryDark
                            )
                        )
                    }
                }

                // COM-01: Attached Cities Display
                Text("Villes rattachées (${selectedSectors.size}) :", fontSize = 11.sp, fontWeight = FontWeight.SemiBold, color = TextSecondaryDark)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    selectedSectors.forEach { sec ->
                        AssistChip(
                            onClick = {
                                if (selectedSectors.size > 1) {
                                    selectedSectors = selectedSectors - sec
                                }
                            },
                            label = { Text("$sec ×", fontSize = 10.sp, fontWeight = FontWeight.Bold) },
                            colors = AssistChipDefaults.assistChipColors(
                                containerColor = BardahlYellow.copy(alpha = 0.12f),
                                labelColor = BardahlYellow
                            ),
                            border = androidx.compose.foundation.BorderStroke(1.dp, BardahlYellow.copy(alpha = 0.3f))
                        )
                    }
                }

                // Custom City Quick Add
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(modifier = Modifier.weight(1f)) {
                        BardahlTextField(
                            value = customCityInput,
                            onValueChange = { customCityInput = it },
                            label = "Ajouter ville spécifique..."
                        )
                    }
                    Button(
                        onClick = {
                            val c = customCityInput.trim()
                            if (c.isNotBlank() && !selectedSectors.contains(c)) {
                                val parentReg = MoroccanRegionsRepository.getRegionForCity(c)
                                if (!selectedRegions.contains(parentReg)) {
                                    selectedRegions = selectedRegions + parentReg
                                }
                                selectedSectors = selectedSectors + c
                                customCityInput = ""
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = BardahlYellow, contentColor = BardahlBlack),
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp),
                        modifier = Modifier.height(44.dp)
                    ) {
                        Text("Ajouter", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                }

                BardahlTextField(targetSalesStr, { targetSalesStr = it }, "Objectif Ventes Mensuel (DH)")
            }
        },
        confirmButton = {
            BardahlButton(
                text = "ENREGISTRER COMPTE",
                onClick = {
                    if (firstName.isNotBlank() && email.isNotBlank()) {
                        val target = targetSalesStr.toDoubleOrNull() ?: 150000.0
                        onSave(
                            CommercialData(
                                id = initialData?.id ?: "c${System.currentTimeMillis()}",
                                firstName = firstName,
                                lastName = lastName,
                                email = email,
                                password = password,
                                phone = phone,
                                matricule = matricule,
                                city = selectedSectors.joinToString(", "),
                                address = selectedSectors.joinToString(", "),
                                regions = selectedRegions,
                                sectors = selectedSectors,
                                targetSales = target,
                                currentSales = initialData?.currentSales ?: 0.0,
                                isActive = isAccountActive
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

    // COM-02: Dialog to Add Custom Region
    if (showAddCustomRegionDialog) {
        var newRegName by remember { mutableStateOf("") }
        var newRegCities by remember { mutableStateOf("") }

        AlertDialog(
            onDismissRequest = { showAddCustomRegionDialog = false },
            containerColor = DarkSurface,
            title = { Text("Ajouter Nouvelle Région (COM-02)", color = TextPrimaryDark, fontWeight = FontWeight.Bold, fontSize = 16.sp) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    BardahlTextField(newRegName, { newRegName = it }, "Nom de la Région *")
                    BardahlTextField(newRegCities, { newRegCities = it }, "Villes rattachées (séparées par virgule)")
                }
            },
            confirmButton = {
                BardahlButton(
                    text = "CRÉER RÉGION",
                    onClick = {
                        if (newRegName.isNotBlank()) {
                            val citiesList = newRegCities.split(",").map { it.trim() }.filter { it.isNotBlank() }
                            val created = MoroccanRegionsRepository.addCustomRegion(newRegName, citiesList)
                            if (!selectedRegions.contains(created.name)) {
                                selectedRegions = selectedRegions + created.name
                                selectedSectors = (selectedSectors + created.cities).distinct()
                            }
                            showAddCustomRegionDialog = false
                        }
                    }
                )
            },
            dismissButton = {
                TextButton(onClick = { showAddCustomRegionDialog = false }) {
                    Text("Annuler", color = TextSecondaryDark)
                }
            }
        )
    }
}

@Composable
fun ResetPasswordDialog(
    commercial: CommercialData,
    onDismiss: () -> Unit,
    onConfirm: (String) -> Unit
) {
    var newPassword by remember { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = DarkSurface,
        title = { Text("Réinitialiser Mot de passe", color = TextPrimaryDark, fontWeight = FontWeight.Bold) },
        text = {
            Column {
                Text("Commercial: ${commercial.fullName} (${commercial.email})", fontSize = 13.sp, color = TextSecondaryDark)
                Spacer(modifier = Modifier.height(12.dp))
                BardahlTextField(newPassword, { newPassword = it }, "Nouveau mot de passe")
            }
        },
        confirmButton = {
            BardahlButton(
                text = "RÉINITIALISER",
                onClick = {
                    if (newPassword.isNotBlank()) {
                        onConfirm(newPassword)
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
