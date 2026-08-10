package com.bardahl.maroc.ui.screens.settings

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.bardahl.maroc.ui.components.*
import com.bardahl.maroc.ui.theme.*

@Composable
fun SettingsScreen(onLogoutClick: () -> Unit) {
    val context = LocalContext.current
    var isDarkMode by remember { mutableStateOf(true) }
    var selectedLang by remember { mutableStateOf("Français") }
    var userNameInput by remember { mutableStateOf("Karim Benjelloun") }
    var userPhoneInput by remember { mutableStateOf("+212 6 61 22 33 44") }
    
    // Interactive Notification Switches
    var alertStockLow by remember { mutableStateOf(true) }
    var notifyOrderCreated by remember { mutableStateOf(true) }
    var notifyCloudSync by remember { mutableStateOf(true) }

    Scaffold(
        topBar = {
            BardahlHeader(
                title = "Paramètres & Preferences",
                subtitle = "Configuration Système Bardahl Maghreb"
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

            // User Profile Settings Card
            item {
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Profil Agent Commercial", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = BardahlYellow)
                        Icon(Icons.Default.Person, contentDescription = null, tint = BardahlYellow)
                    }
                    Spacer(modifier = Modifier.height(10.dp))
                    
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

                    Spacer(modifier = Modifier.height(8.dp))

                    OutlinedTextField(
                        value = userPhoneInput,
                        onValueChange = { userPhoneInput = it },
                        label = { Text("Téléphone Direct", color = TextSecondaryDark, fontSize = 12.sp) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = BardahlYellow,
                            unfocusedBorderColor = BardahlCardBorder,
                            focusedTextColor = TextPrimaryDark,
                            unfocusedTextColor = TextPrimaryDark
                        )
                    )

                    Spacer(modifier = Modifier.height(10.dp))
                    
                    Button(
                        onClick = {
                            Toast.makeText(context, "Profil mis à jour avec succès !", Toast.LENGTH_SHORT).show()
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = BardahlYellow, contentColor = BardahlBlack),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text("ENREGISTRER PROFIL", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            // Notifications & Alertes System Card
            item {
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Notifications & Alertes", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimaryDark)
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
                            Text("Mises à jour du Cloud", fontSize = 11.sp, color = TextSecondaryDark)
                        }
                        Switch(
                            checked = notifyCloudSync,
                            onCheckedChange = { notifyCloudSync = it },
                            colors = SwitchDefaults.colors(checkedThumbColor = BardahlYellow)
                        )
                    }
                }
            }

            // Sync Card & Cloud Status
            item {
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Synchronisation Cloud", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimaryDark)
                            Text("Statut: Connecté & En direct", fontSize = 12.sp, color = BardahlYellow)
                        }
                        IconButton(onClick = {
                            Toast.makeText(context, "Base de données Cloud 100% synchronisée!", Toast.LENGTH_SHORT).show()
                        }) {
                            Icon(Icons.Default.Sync, contentDescription = "Sync", tint = BardahlYellow)
                        }
                    }
                }
            }

            // Language & Appearance
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

            // Logout Button
            item {
                BardahlButton(
                    text = "DÉCONNEXION",
                    icon = Icons.Default.Logout,
                    onClick = onLogoutClick,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }
    }
}
