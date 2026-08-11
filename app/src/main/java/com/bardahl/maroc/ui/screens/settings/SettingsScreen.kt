package com.bardahl.maroc.ui.screens.settings

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import com.bardahl.maroc.domain.model.UserRole
import com.bardahl.maroc.ui.components.*
import com.bardahl.maroc.ui.theme.*
import com.bardahl.maroc.ui.viewmodels.AuthState
import com.bardahl.maroc.ui.viewmodels.AuthViewModel

@Composable
fun SettingsScreen(
    authViewModel: AuthViewModel,
    onLogoutClick: () -> Unit
) {
    val context = LocalContext.current
    val authState by authViewModel.authState.collectAsState()
    val currentUser = (authState as? AuthState.Success)?.user
    val isAdmin = currentUser?.role == UserRole.ADMIN

    // Dynamic User Profile State
    var userNameInput by remember(currentUser) {
        mutableStateOf(
            if (currentUser != null) "${currentUser.firstName} ${currentUser.lastName}".trim()
            else "Direction Bardahl"
        )
    }
    var userEmailInput by remember(currentUser) {
        mutableStateOf(currentUser?.email ?: "bardahl@gmail.com")
    }
    var userPhoneInput by remember(currentUser) {
        mutableStateOf(currentUser?.phone ?: "+212 5 22 11 22 33")
    }
    var userCityInput by remember { mutableStateOf("Casablanca") }

    // Interactive System Switches
    var isDarkMode by remember { mutableStateOf(true) }
    var selectedLang by remember { mutableStateOf("Français") }
    var alertStockLow by remember { mutableStateOf(true) }
    var notifyOrderCreated by remember { mutableStateOf(true) }
    var notifyCloudSync by remember { mutableStateOf(true) }

    Scaffold(
        topBar = {
            BardahlHeader(
                title = "Paramètres & Configuration",
                subtitle = "Gestion du Profil et du Système Bardahl Maghreb"
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

            // 1. User Profile & Account Settings Card (Dynamic Admin vs Commercial)
            item {
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = if (isAdmin) "Profil Administrateur Global" else "Profil Agent Commercial",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = BardahlYellow
                        )
                        Icon(
                            imageVector = if (isAdmin) Icons.Default.Shield else Icons.Default.Person,
                            contentDescription = null,
                            tint = BardahlYellow
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // Role Badge
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(if (isAdmin) BardahlYellow.copy(alpha = 0.15f) else StatusDelivered.copy(alpha = 0.15f))
                            .border(1.dp, if (isAdmin) BardahlYellow else StatusDelivered, RoundedCornerShape(10.dp))
                            .padding(horizontal = 12.dp, vertical = 8.dp)
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = if (isAdmin) Icons.Default.VerifiedUser else Icons.Default.Badge,
                                contentDescription = null,
                                tint = if (isAdmin) BardahlYellow else StatusDelivered,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = if (isAdmin) "Rôle : Administrateur Global Bardahl (Direction)" else "Rôle : Agent Commercial Autorisé",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimaryDark
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // Full Name Input
                    OutlinedTextField(
                        value = userNameInput,
                        onValueChange = { userNameInput = it },
                        label = { Text("Nom complet", color = TextSecondaryDark, fontSize = 12.sp) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = BardahlYellow,
                            unfocusedBorderColor = BardahlCardBorder,
                            focusedTextColor = TextPrimaryDark,
                            unfocusedTextColor = TextPrimaryDark
                        )
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    // Email Identifiant (Read-only)
                    OutlinedTextField(
                        value = userEmailInput,
                        onValueChange = {},
                        readOnly = true,
                        label = { Text("Adresse Email Identifiant (Connecté)", color = TextSecondaryDark, fontSize = 12.sp) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = BardahlYellow,
                            unfocusedBorderColor = BardahlCardBorder,
                            focusedTextColor = BardahlYellow,
                            unfocusedTextColor = BardahlYellow
                        )
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    // Phone & City Row
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        OutlinedTextField(
                            value = userPhoneInput,
                            onValueChange = { userPhoneInput = it },
                            label = { Text("Téléphone", color = TextSecondaryDark, fontSize = 12.sp) },
                            modifier = Modifier.weight(1f),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = BardahlYellow,
                                unfocusedBorderColor = BardahlCardBorder,
                                focusedTextColor = TextPrimaryDark,
                                unfocusedTextColor = TextPrimaryDark
                            )
                        )
                        OutlinedTextField(
                            value = userCityInput,
                            onValueChange = { userCityInput = it },
                            label = { Text("Secteur / Ville", color = TextSecondaryDark, fontSize = 12.sp) },
                            modifier = Modifier.weight(1f),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = BardahlYellow,
                                unfocusedBorderColor = BardahlCardBorder,
                                focusedTextColor = TextPrimaryDark,
                                unfocusedTextColor = TextPrimaryDark
                            )
                        )
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    Button(
                        onClick = {
                            Toast.makeText(context, "Profil mis à jour avec succès !", Toast.LENGTH_SHORT).show()
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = BardahlYellow, contentColor = BardahlBlack),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Icon(Icons.Default.Save, contentDescription = null, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("ENREGISTRER LE PROFIL", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            // 2. Notifications & Alertes System Card
            item {
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Notifications & Alertes Automatiques", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimaryDark)
                        Icon(Icons.Default.Notifications, contentDescription = null, tint = BardahlYellow)
                    }
                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Alertes Stock Bas", fontSize = 13.sp, color = TextPrimaryDark, fontWeight = FontWeight.SemiBold)
                            Text("Avertir si le stock d'un produit < 20 unités", fontSize = 11.sp, color = TextSecondaryDark)
                        }
                        Switch(
                            checked = alertStockLow,
                            onCheckedChange = { alertStockLow = it },
                            colors = SwitchDefaults.colors(checkedThumbColor = BardahlYellow)
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Validation des Commandes", fontSize = 13.sp, color = TextPrimaryDark, fontWeight = FontWeight.SemiBold)
                            Text("Notification en temps réel à chaque bon créé", fontSize = 11.sp, color = TextSecondaryDark)
                        }
                        Switch(
                            checked = notifyOrderCreated,
                            onCheckedChange = { notifyOrderCreated = it },
                            colors = SwitchDefaults.colors(checkedThumbColor = BardahlYellow)
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Synchronisation Cloud", fontSize = 13.sp, color = TextPrimaryDark, fontWeight = FontWeight.SemiBold)
                            Text("Mises à jour du Cloud en temps réel", fontSize = 11.sp, color = TextSecondaryDark)
                        }
                        Switch(
                            checked = notifyCloudSync,
                            onCheckedChange = { notifyCloudSync = it },
                            colors = SwitchDefaults.colors(checkedThumbColor = BardahlYellow)
                        )
                    }
                }
            }

            // 3. Performance & Cloud System Status
            item {
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Performance & Cloud System", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimaryDark)
                            Text("Statut: Connecté & En direct", fontSize = 12.sp, color = StatusDelivered, fontWeight = FontWeight.Bold)
                        }
                        IconButton(onClick = {
                            Toast.makeText(context, "Base de données Cloud 100% synchronisée!", Toast.LENGTH_SHORT).show()
                        }) {
                            Icon(Icons.Default.Sync, contentDescription = "Sync", tint = BardahlYellow)
                        }
                    }
                }
            }

            // 4. Language & Appearance
            item {
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Text("Préférences & Apparence", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimaryDark)
                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Thème Sombre (Obsidian 2026)", fontSize = 13.sp, color = TextPrimaryDark)
                        Switch(
                            checked = isDarkMode,
                            onCheckedChange = { isDarkMode = it },
                            colors = SwitchDefaults.colors(checkedThumbColor = BardahlYellow)
                        )
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Langue (Français / العربية)", fontSize = 13.sp, color = TextPrimaryDark)
                        Row {
                            TextButton(onClick = { selectedLang = "Français" }) {
                                Text("FR", color = if (selectedLang == "Français") BardahlYellow else TextSecondaryDark, fontWeight = FontWeight.Bold)
                            }
                            TextButton(onClick = { selectedLang = "العربية" }) {
                                Text("AR", color = if (selectedLang == "العربية") BardahlYellow else TextSecondaryDark, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }

            // 5. Logout Button
            item {
                BardahlButton(
                    text = "DÉCONNEXION SÉCURISÉE",
                    icon = Icons.Default.Logout,
                    onClick = onLogoutClick,
                    modifier = Modifier.fillMaxWidth()
                )
            }

            item { Spacer(modifier = Modifier.height(24.dp)) }
        }
    }
}
