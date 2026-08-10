package com.bardahl.maroc.ui.screens.auth

import androidx.compose.animation.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.bardahl.maroc.R
import com.bardahl.maroc.domain.model.UserRole
import com.bardahl.maroc.ui.components.BardahlButton
import com.bardahl.maroc.ui.components.BardahlTextField
import com.bardahl.maroc.ui.components.GlassCard
import com.bardahl.maroc.ui.theme.*
import com.bardahl.maroc.ui.viewmodels.AuthState
import com.bardahl.maroc.ui.viewmodels.AuthViewModel

@Composable
fun LoginScreen(
    authViewModel: AuthViewModel,
    onLoginSuccess: () -> Unit
) {
    val authState by authViewModel.authState.collectAsState()
    var email by remember { mutableStateOf("karim@bardahl.ma") }
    var password by remember { mutableStateOf("123") }
    var selectedRole by remember { mutableStateOf(UserRole.COMMERCIAL) }

    LaunchedEffect(authState) {
        if (authState is AuthState.Success) {
            onLoginSuccess()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkBackground)
            .padding(20.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center,
            modifier = Modifier.fillMaxWidth()
        ) {

            // Official Yellow Checkered Flag Bardahl Brand Badge
            Image(
                painter = painterResource(id = R.drawable.ic_bardahl_official_logo),
                contentDescription = "Official Bardahl Logo",
                modifier = Modifier
                    .width(140.dp)
                    .height(90.dp)
            )

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = "BARDAHL MAROC",
                style = Typography.displayLarge,
                fontSize = 24.sp,
                fontWeight = FontWeight.Black,
                color = TextPrimaryDark
            )

            Text(
                text = "RIEN NE VOUS ARRÊTERA",
                style = Typography.bodyMedium,
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = BardahlYellow,
                letterSpacing = 2.sp
            )

            Spacer(modifier = Modifier.height(24.dp))

            // Role Selector Tab (Admin vs Commercial)
            GlassCard(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(14.dp))
                        .background(DarkBackground)
                        .padding(4.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(12.dp))
                            .background(if (selectedRole == UserRole.COMMERCIAL) BardahlYellow else DarkBackground)
                            .padding(vertical = 10.dp)
                            .noRippleClickable {
                                selectedRole = UserRole.COMMERCIAL
                                email = "karim@bardahl.ma"
                                password = "123"
                            },
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "COMMERCIAL",
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            color = if (selectedRole == UserRole.COMMERCIAL) BardahlBlack else TextSecondaryDark
                        )
                    }

                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(12.dp))
                            .background(if (selectedRole == UserRole.ADMIN) BardahlYellow else DarkBackground)
                            .padding(vertical = 10.dp)
                            .noRippleClickable {
                                selectedRole = UserRole.ADMIN
                                email = "bardahl@gmail.com"
                                password = "123"
                            },
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "ADMINISTRATEUR",
                            fontWeight = FontWeight.Bold,
                            fontSize = 12.sp,
                            color = if (selectedRole == UserRole.ADMIN) BardahlBlack else TextSecondaryDark
                        )
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                BardahlTextField(
                    value = email,
                    onValueChange = { email = it },
                    label = "Adresse Email",
                    leadingIcon = Icons.Default.Email
                )

                Spacer(modifier = Modifier.height(14.dp))

                BardahlTextField(
                    value = password,
                    onValueChange = { password = it },
                    label = "Mot de passe",
                    leadingIcon = Icons.Default.Lock,
                    trailingIcon = {}
                )

                if (authState is AuthState.Error) {
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = (authState as AuthState.Error).message,
                        color = StatusCancelled,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                BardahlButton(
                    text = if (authState is AuthState.Loading) "Connexion en cours..." else "SE CONNECTER",
                    onClick = { authViewModel.login(email, password, selectedRole) },
                    enabled = authState !is AuthState.Loading,
                    modifier = Modifier.fillMaxWidth()
                )
            }
        }
    }
}

private fun Modifier.noRippleClickable(onClick: () -> Unit): Modifier = this.then(
    Modifier.clickable(onClick = onClick)
)
