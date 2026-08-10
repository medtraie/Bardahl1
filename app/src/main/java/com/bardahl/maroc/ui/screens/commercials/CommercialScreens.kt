package com.bardahl.maroc.ui.screens.commercials

import android.widget.Toast
import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.bardahl.maroc.domain.model.Commercial
import com.bardahl.maroc.ui.components.*
import com.bardahl.maroc.ui.theme.*

data class CommercialData(
    val id: String,
    val firstName: String,
    val lastName: String,
    val email: String,
    val password: String = "123456",
    val phone: String,
    val matricule: String,
    val address: String,
    val city: String,
    val isActive: Boolean = true,
    val lastLogin: String = "Aujourd'hui",
    val totalOrders: Int = 18,
    val targetSales: Double = 150000.0,
    val currentSales: Double = 118500.0
) {
    val fullName: String get() = "$firstName $lastName"
}

@Composable
fun CommercialManagementScreen(onSettingsClick: () -> Unit) {
    val context = LocalContext.current

    var commercials by remember {
        mutableStateOf(
            listOf(
                CommercialData("c1", "Karim", "Benjelloun", "karim@bardahl.ma", "123456", "+212 6 61 00 11 22", "COMM-001", "Boulevard Zerktouni", "Casablanca", true, "Aujourd'hui à 21:05", 24, 150000.0, 148500.0),
                CommercialData("c2", "Youssef", "El Amrani", "youssef@bardahl.ma", "123456", "+212 6 62 33 44 55", "COMM-002", "Avenue de France", "Rabat", true, "Hier à 18:30", 19, 120000.0, 95000.0),
                CommercialData("c3", "Mehdi", "Naciri", "mehdi@bardahl.ma", "123456", "+212 6 63 55 66 77", "COMM-003", "Avenue Guéliz", "Marrakech", true, "Il y a 3 jours", 15, 100000.0, 82000.0)
            )
        )
    }

    var searchQuery by remember { mutableStateOf("") }
    var showAddDialog by remember { mutableStateOf(false) }
    var editingCommercial by remember { mutableStateOf<CommercialData?>(null) }
    var resettingPassCommercial by remember { mutableStateOf<CommercialData?>(null) }

    val filteredCommercials = commercials.filter {
        it.fullName.contains(searchQuery, ignoreCase = true) ||
        it.matricule.contains(searchQuery, ignoreCase = true) ||
        it.city.contains(searchQuery, ignoreCase = true) ||
        it.email.contains(searchQuery, ignoreCase = true)
    }

    Scaffold(
        topBar = {
            BardahlHeader(
                title = "Équipe Commerciale Supabase",
                subtitle = "Comptes Utilisateurs Commerciaux (Admin)",
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
                label = "Rechercher Commercial, Email, Matricule...",
                leadingIcon = Icons.Default.Search
            )

            Spacer(modifier = Modifier.height(14.dp))

            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                items(filteredCommercials) { comm ->
                    CommercialCardFull(
                        commercial = comm,
                        onEdit = { editingCommercial = comm },
                        onToggleBlock = {
                            commercials = commercials.map {
                                if (it.id == comm.id) it.copy(isActive = !it.isActive) else it
                            }
                            val statusStr = if (!comm.isActive) "Débloqué" else "Bloqué"
                            Toast.makeText(context, "Commercial ${comm.fullName} $statusStr", Toast.LENGTH_SHORT).show()
                        },
                        onResetPassword = { resettingPassCommercial = comm },
                        onDelete = {
                            commercials = commercials.filter { it.id != comm.id }
                            Toast.makeText(context, "Commercial ${comm.fullName} supprimé.", Toast.LENGTH_SHORT).show()
                        }
                    )
                }
                item { Spacer(modifier = Modifier.height(24.dp)) }
            }
        }
    }

    if (showAddDialog) {
        AddEditCommercialDialog(
            title = "Créer Compte User Commercial",
            initialData = null,
            onDismiss = { showAddDialog = false },
            onSave = { newComm ->
                commercials = listOf(newComm) + commercials
                showAddDialog = false
                Toast.makeText(context, "Compte Commercial (${newComm.email}) créé dans Supabase !", Toast.LENGTH_SHORT).show()
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
                Toast.makeText(context, "Commercial ${updatedComm.fullName} mis à jour !", Toast.LENGTH_SHORT).show()
            }
        )
    }

    if (resettingPassCommercial != null) {
        ResetPasswordDialog(
            commercial = resettingPassCommercial!!,
            onDismiss = { resettingPassCommercial = null },
            onConfirm = { newPass ->
                commercials = commercials.map {
                    if (it.id == resettingPassCommercial!!.id) it.copy(password = newPass) else it
                }
                resettingPassCommercial = null
                Toast.makeText(context, "Mot de passe réinitialisé avec succès !", Toast.LENGTH_SHORT).show()
            }
        )
    }
}

@Composable
fun CommercialCardFull(
    commercial: CommercialData,
    onEdit: () -> Unit,
    onToggleBlock: () -> Unit,
    onResetPassword: () -> Unit,
    onDelete: () -> Unit
) {
    val progress = (commercial.currentSales / commercial.targetSales).coerceIn(0.0, 1.0).toFloat()

    GlassCard(
        modifier = Modifier.fillMaxWidth(),
        borderColor = if (commercial.isActive) BardahlCardBorder else StatusCancelled.copy(alpha = 0.5f)
    ) {
        Column {
            // Header Row: Avatar, Info, Status Badge
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(48.dp)
                            .clip(CircleShape)
                            .background(if (commercial.isActive) BardahlYellow else StatusCancelled.copy(alpha = 0.2f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "${commercial.firstName.take(1)}${commercial.lastName.take(1)}",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Black,
                            color = if (commercial.isActive) BardahlBlack else StatusCancelled
                        )
                    }

                    Spacer(modifier = Modifier.width(12.dp))

                    Column {
                        Text(commercial.fullName, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimaryDark)
                        Text("Matricule: ${commercial.matricule} | ${commercial.city}", fontSize = 12.sp, color = TextSecondaryDark)
                    }
                }

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(10.dp))
                        .background(if (commercial.isActive) StatusDelivered.copy(alpha = 0.2f) else StatusCancelled.copy(alpha = 0.2f))
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = if (commercial.isActive) "User Commercial" else "Bloqué",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (commercial.isActive) StatusDelivered else StatusCancelled
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Contact, Email & Password Display
            Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Email: ${commercial.email}", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextPrimaryDark)
                    Text("Mdps: ${commercial.password}", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = StatusDelivered)
                }
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Tél: ${commercial.phone}", fontSize = 12.sp, color = TextSecondaryDark)
                    Text("Commandes: ${commercial.totalOrders}", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = BardahlYellow)
                }
            }

            Spacer(modifier = Modifier.height(10.dp))
            Divider(color = BardahlCardBorder)
            Spacer(modifier = Modifier.height(10.dp))

            // Sales Progress Bar
            Text("Objectif Ventes Mensuel", fontSize = 12.sp, color = TextSecondaryDark, fontWeight = FontWeight.SemiBold)
            Spacer(modifier = Modifier.height(4.dp))
            LinearProgressIndicator(
                progress = { progress },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(8.dp)
                    .clip(RoundedCornerShape(4.dp)),
                color = BardahlYellow,
                trackColor = BardahlCardBorder
            )
            Spacer(modifier = Modifier.height(4.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text("${String.format("%.0f", commercial.currentSales)} DH", fontSize = 13.sp, fontWeight = FontWeight.Bold, color = BardahlYellow)
                Text("Objectif: ${String.format("%.0f", commercial.targetSales)} DH", fontSize = 12.sp, color = TextSecondaryDark)
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Action Buttons Row (Edit, Block, Reset Password, Delete)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onEdit) {
                    Icon(Icons.Default.Edit, contentDescription = "Modifier", tint = BardahlYellow, modifier = Modifier.size(18.dp))
                }
                IconButton(onClick = onResetPassword) {
                    Icon(Icons.Default.VpnKey, contentDescription = "Réinitialiser Mot de passe", tint = StatusValidated, modifier = Modifier.size(18.dp))
                }
                IconButton(onClick = onToggleBlock) {
                    Icon(
                        if (commercial.isActive) Icons.Default.Block else Icons.Default.CheckCircle,
                        contentDescription = "Bloquer",
                        tint = if (commercial.isActive) StatusSent else StatusDelivered,
                        modifier = Modifier.size(18.dp)
                    )
                }
                IconButton(onClick = onDelete) {
                    Icon(Icons.Default.Delete, contentDescription = "Supprimer", tint = StatusCancelled, modifier = Modifier.size(18.dp))
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
    var password by remember { mutableStateOf(initialData?.password ?: "123456") }
    var phone by remember { mutableStateOf(initialData?.phone ?: "") }
    var matricule by remember { mutableStateOf(initialData?.matricule ?: "COMM-00${(4..99).random()}") }
    var city by remember { mutableStateOf(initialData?.city ?: "") }
    var targetSalesStr by remember { mutableStateOf(initialData?.targetSales?.toString() ?: "150000") }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = DarkSurface,
        title = { Text(title, color = TextPrimaryDark, fontWeight = FontWeight.Bold) },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                BardahlTextField(firstName, { firstName = it }, "Prénom")
                BardahlTextField(lastName, { lastName = it }, "Nom")
                BardahlTextField(email, { email = it }, "Adresse Email Identifiant *")
                BardahlTextField(password, { password = it }, "Mot de Passe *")
                BardahlTextField(phone, { phone = it }, "Téléphone")
                BardahlTextField(matricule, { matricule = it }, "Matricule")
                BardahlTextField(city, { city = it }, "Secteur / Ville")
                BardahlTextField(targetSalesStr, { targetSalesStr = it }, "Objectif Ventes Mensuel (DH)")
            }
        },
        confirmButton = {
            BardahlButton(
                text = "ENREGISTRER EN SUPABASE",
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
                                city = city,
                                address = city,
                                targetSales = target,
                                currentSales = initialData?.currentSales ?: 0.0,
                                isActive = initialData?.isActive ?: true
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
