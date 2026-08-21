package com.bardahl.maroc.ui.screens.auth

import androidx.compose.animation.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.bardahl.maroc.R
import com.bardahl.maroc.ui.theme.*
import com.bardahl.maroc.ui.viewmodels.AuthState
import com.bardahl.maroc.ui.viewmodels.AuthViewModel

@Composable
fun LoginScreen(
    authViewModel: AuthViewModel,
    onLoginSuccess: () -> Unit
) {
    val authState by authViewModel.authState.collectAsState()
    var email by remember { mutableStateOf("bardahl@gmail.com") }
    var password by remember { mutableStateOf("123456") }

    val isEmailAdmin = email.trim().lowercase() == "bardahl@gmail.com"

    LaunchedEffect(authState) {
        if (authState is AuthState.Success) {
            onLoginSuccess()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                brush = Brush.radialGradient(
                    colors = listOf(
                        Color(0xFF181C24),
                        Color(0xFF0D0F12)
                    )
                )
            )
            .padding(16.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .widthIn(max = 440.dp)
                .verticalScroll(rememberScrollState()),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Glass Card Container matching Web Login Card
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(20.dp))
                    .background(
                        brush = Brush.verticalGradient(
                            colors = listOf(
                                BardahlCardDark.copy(alpha = 0.95f),
                                BardahlCardDark.copy(alpha = 0.85f)
                            )
                        )
                    )
                    .border(1.dp, BardahlYellow.copy(alpha = 0.4f), RoundedCornerShape(20.dp))
                    .padding(22.dp)
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    // Official Yellow Checkered Flag Bardahl Logo (Exact Web Logo)
                    Image(
                        painter = painterResource(id = R.drawable.ic_bardahl_official_logo),
                        contentDescription = "Official Bardahl Logo",
                        modifier = Modifier
                            .width(140.dp)
                            .height(95.dp)
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    Text(
                        text = "BARDAHL MAROC",
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Black,
                        color = Color.White,
                        letterSpacing = 0.5.sp,
                        textAlign = TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(4.dp))

                    Text(
                        text = "Système de Gestion Commerciale & Bons de Commande",
                        fontSize = 13.sp,
                        color = TextSecondaryDark,
                        textAlign = TextAlign.Center
                    )

                    Spacer(modifier = Modifier.height(18.dp))

                    // Error Alert Box (if error exists)
                    if (authState is AuthState.Error) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .background(StatusCancelled.copy(alpha = 0.15f))
                                .border(1.dp, StatusCancelled.copy(alpha = 0.4f), RoundedCornerShape(12.dp))
                                .padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.Warning,
                                contentDescription = null,
                                tint = StatusCancelled,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = (authState as AuthState.Error).message,
                                color = StatusCancelled,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        Spacer(modifier = Modifier.height(14.dp))
                    }

                    // Dynamic Account Role Indicator (Exact Web Replica)
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(
                                if (isEmailAdmin) BardahlYellow.copy(alpha = 0.15f)
                                else Color(0xFF007AFF).copy(alpha = 0.15f)
                            )
                            .border(
                                width = 1.dp,
                                color = if (isEmailAdmin) BardahlYellow else Color(0xFF007AFF).copy(alpha = 0.3f),
                                shape = RoundedCornerShape(12.dp)
                            )
                            .padding(horizontal = 12.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.Center
                    ) {
                        Icon(
                            imageVector = if (isEmailAdmin) Icons.Default.Shield else Icons.Default.Person,
                            contentDescription = null,
                            tint = if (isEmailAdmin) BardahlYellow else Color(0xFF007AFF),
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = if (isEmailAdmin) "Compte Administrateur Global (bardahl@gmail.com)"
                                   else "Compte Agent Commercial Supabase",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = if (isEmailAdmin) BardahlYellow else Color(0xFF007AFF),
                            textAlign = TextAlign.Center
                        )
                    }

                    Spacer(modifier = Modifier.height(18.dp))

                    // Form Fields (Left-aligned labels with icons)
                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalAlignment = Alignment.Start
                    ) {
                        // Email Label
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(bottom = 6.dp)
                        ) {
                            Icon(
                                Icons.Default.Email,
                                contentDescription = null,
                                tint = BardahlYellow,
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Adresse Email Identifiant",
                                fontSize = 12.sp,
                                color = TextSecondaryDark,
                                fontWeight = FontWeight.SemiBold
                            )
                        }

                        // Email Input Field
                        OutlinedTextField(
                            value = email,
                            onValueChange = { email = it },
                            placeholder = {
                                Text(
                                    "bardahl@gmail.com ou email commercial",
                                    color = TextSecondaryDark.copy(alpha = 0.45f),
                                    fontSize = 13.sp
                                )
                            },
                            singleLine = true,
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                            modifier = Modifier.fillMaxWidth(),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = BardahlYellow,
                                unfocusedBorderColor = BardahlCardBorder,
                                focusedTextColor = TextPrimaryDark,
                                unfocusedTextColor = TextPrimaryDark,
                                cursorColor = BardahlYellow,
                                focusedContainerColor = Color(0xFF0D0F12),
                                unfocusedContainerColor = Color(0xFF0D0F12)
                            ),
                            shape = RoundedCornerShape(12.dp)
                        )

                        Spacer(modifier = Modifier.height(14.dp))

                        // Password Label
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.padding(bottom = 6.dp)
                        ) {
                            Icon(
                                Icons.Default.Lock,
                                contentDescription = null,
                                tint = BardahlYellow,
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Mot de passe",
                                fontSize = 12.sp,
                                color = TextSecondaryDark,
                                fontWeight = FontWeight.SemiBold
                            )
                        }

                        // Password Input Field
                        OutlinedTextField(
                            value = password,
                            onValueChange = { password = it },
                            placeholder = {
                                Text(
                                    "Entrez votre mot de passe",
                                    color = TextSecondaryDark.copy(alpha = 0.45f),
                                    fontSize = 13.sp
                                )
                            },
                            singleLine = true,
                            visualTransformation = PasswordVisualTransformation(),
                            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                            modifier = Modifier.fillMaxWidth(),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedBorderColor = BardahlYellow,
                                unfocusedBorderColor = BardahlCardBorder,
                                focusedTextColor = TextPrimaryDark,
                                unfocusedTextColor = TextPrimaryDark,
                                cursorColor = BardahlYellow,
                                focusedContainerColor = Color(0xFF0D0F12),
                                unfocusedContainerColor = Color(0xFF0D0F12)
                            ),
                            shape = RoundedCornerShape(12.dp)
                        )
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    // Login Button (Glowing Bardahl Yellow with Login Icon)
                    Button(
                        onClick = { authViewModel.login(email, password) },
                        enabled = authState !is AuthState.Loading,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp)
                            .shadow(14.dp, RoundedCornerShape(14.dp), spotColor = BardahlYellow),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = BardahlYellow,
                            contentColor = BardahlBlack,
                            disabledContainerColor = BardahlCardBorder,
                            disabledContentColor = TextSecondaryDark
                        ),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center
                        ) {
                            Icon(
                                imageVector = Icons.Default.Login,
                                contentDescription = null,
                                tint = BardahlBlack,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = if (authState is AuthState.Loading) "CONNEXION EN COURS..." else "SE CONNECTER",
                                fontWeight = FontWeight.Black,
                                fontSize = 14.sp,
                                color = BardahlBlack
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    // Quick Demo Shortcuts (Matching Web Login)
                    HorizontalDivider(color = BardahlCardBorder)

                    Spacer(modifier = Modifier.height(14.dp))

                    Column(
                        modifier = Modifier.fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center
                        ) {
                            Text(
                                text = "Tester Connexion Admin : ",
                                fontSize = 11.sp,
                                color = TextSecondaryDark
                            )
                            Text(
                                text = "bardahl@gmail.com",
                                fontSize = 11.sp,
                                color = BardahlYellow,
                                fontWeight = FontWeight.Bold,
                                textDecoration = TextDecoration.Underline,
                                modifier = Modifier.clickable {
                                    email = "bardahl@gmail.com"
                                    password = "123456"
                                }
                            )
                        }

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.Center
                        ) {
                            Text(
                                text = "Tester Connexion Commercial : ",
                                fontSize = 11.sp,
                                color = TextSecondaryDark
                            )
                            Text(
                                text = "karim@bardahl.ma",
                                fontSize = 11.sp,
                                color = Color(0xFF007AFF),
                                fontWeight = FontWeight.Bold,
                                textDecoration = TextDecoration.Underline,
                                modifier = Modifier.clickable {
                                    email = "karim@bardahl.ma"
                                    password = "123"
                                }
                            )
                        }
                    }
                }
            }
        }
    }
}
