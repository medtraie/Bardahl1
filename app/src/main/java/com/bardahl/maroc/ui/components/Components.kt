package com.bardahl.maroc.ui.components

import androidx.compose.animation.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.bardahl.maroc.R
import com.bardahl.maroc.domain.model.OrderStatus
import com.bardahl.maroc.ui.theme.*

@Composable
fun GlassCard(
    modifier: Modifier = Modifier,
    borderColor: Color = GlassmorphismBorder,
    onClick: (() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(20.dp))
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(
                        BardahlCardDark.copy(alpha = 0.95f),
                        BardahlCardDark.copy(alpha = 0.85f)
                    )
                )
            )
            .border(1.dp, borderColor, RoundedCornerShape(20.dp))
            .then(if (onClick != null) Modifier.clickable { onClick() } else Modifier)
            .padding(16.dp)
    ) {
        Column {
            content()
        }
    }
}

@Composable
fun BardahlHeader(
    title: String,
    subtitle: String = "RIEN NE VOUS ARRÊTERA",
    onBackClick: (() -> Unit)? = null,
    onSettingsClick: (() -> Unit)? = null,
    actions: @Composable RowScope.() -> Unit = {}
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(DarkBackground)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (onBackClick != null) {
            IconButton(onClick = onBackClick) {
                Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Retour", tint = BardahlYellow)
            }
            Spacer(modifier = Modifier.width(4.dp))
        }

        // Bardahl Official Flag Badge
        Box(
            modifier = Modifier
                .size(44.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(BardahlYellow)
                .border(1.5.dp, BardahlBlack, RoundedCornerShape(12.dp)),
            contentAlignment = Alignment.Center
        ) {
            Image(
                painter = painterResource(id = R.drawable.ic_bardahl_official_logo),
                contentDescription = "Bardahl Logo",
                modifier = Modifier.size(38.dp)
            )
        }

        Spacer(modifier = Modifier.width(12.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = Typography.titleLarge,
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = TextPrimaryDark
            )
            Text(
                text = subtitle,
                style = Typography.bodyMedium,
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                color = BardahlYellow
            )
        }

        Row(verticalAlignment = Alignment.CenterVertically) {
            actions()
            if (onSettingsClick != null) {
                Spacer(modifier = Modifier.width(4.dp))
                IconButton(
                    onClick = onSettingsClick,
                    modifier = Modifier
                        .clip(RoundedCornerShape(10.dp))
                        .background(BardahlCardDark)
                        .border(1.dp, BardahlCardBorder, RoundedCornerShape(10.dp))
                ) {
                    Icon(
                        Icons.Default.Settings,
                        contentDescription = "Paramètres",
                        tint = BardahlYellow,
                        modifier = Modifier.size(20.dp)
                    )
                }
            }
        }
    }
}

@Composable
fun BardahlButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    icon: ImageVector? = null,
    enabled: Boolean = true
) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier
            .height(52.dp)
            .shadow(12.dp, RoundedCornerShape(16.dp), spotColor = BardahlYellow),
        colors = ButtonDefaults.buttonColors(
            containerColor = BardahlYellow,
            contentColor = BardahlBlack,
            disabledContainerColor = BardahlCardBorder,
            disabledContentColor = TextSecondaryDark
        ),
        shape = RoundedCornerShape(16.dp)
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            if (icon != null) {
                Icon(icon, contentDescription = null, modifier = Modifier.size(20.dp))
                Spacer(modifier = Modifier.width(8.dp))
            }
            Text(
                text = text,
                fontWeight = FontWeight.Bold,
                fontSize = 15.sp
            )
        }
    }
}

@Composable
fun BardahlTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    leadingIcon: ImageVector? = null,
    trailingIcon: @Composable (() -> Unit)? = null,
    keyboardOptions: KeyboardOptions = KeyboardOptions.Default,
    singleLine: Boolean = true
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label, color = TextSecondaryDark) },
        singleLine = singleLine,
        keyboardOptions = keyboardOptions,
        leadingIcon = if (leadingIcon != null) {
            { Icon(leadingIcon, contentDescription = null, tint = BardahlYellow) }
        } else null,
        trailingIcon = trailingIcon,
        colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = BardahlYellow,
            unfocusedBorderColor = BardahlCardBorder,
            focusedLabelColor = BardahlYellow,
            unfocusedLabelColor = TextSecondaryDark,
            focusedTextColor = TextPrimaryDark,
            unfocusedTextColor = TextPrimaryDark,
            cursorColor = BardahlYellow,
            focusedContainerColor = BardahlCardDark,
            unfocusedContainerColor = BardahlCardDark
        ),
        shape = RoundedCornerShape(14.dp),
        modifier = modifier.fillMaxWidth()
    )
}

@Composable
fun StatusBadge(status: OrderStatus) {
    val (bgColor, textColor) = when (status) {
        OrderStatus.DRAFT -> StatusDraft.copy(alpha = 0.2f) to StatusDraft
        OrderStatus.VALIDATED -> StatusValidated.copy(alpha = 0.2f) to StatusValidated
        OrderStatus.SENT -> StatusSent.copy(alpha = 0.2f) to StatusSent
        OrderStatus.DELIVERED -> StatusDelivered.copy(alpha = 0.2f) to StatusDelivered
        OrderStatus.CANCELLED -> StatusCancelled.copy(alpha = 0.2f) to StatusCancelled
    }

    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .background(bgColor)
            .border(1.dp, textColor.copy(alpha = 0.4f), RoundedCornerShape(12.dp))
            .padding(horizontal = 10.dp, vertical = 4.dp)
    ) {
        Text(
            text = status.label,
            color = textColor,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold
        )
    }
}

@Composable
fun InteractiveKpiCard(
    title: String,
    value: String,
    subtitle: String,
    icon: ImageVector,
    accentColor: Color = BardahlYellow,
    modifier: Modifier = Modifier
) {
    GlassCard(modifier = modifier, borderColor = accentColor.copy(alpha = 0.3f)) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(title, fontSize = 12.sp, color = TextSecondaryDark, fontWeight = FontWeight.Medium)
                Spacer(modifier = Modifier.height(4.dp))
                Text(value, fontSize = 20.sp, color = TextPrimaryDark, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(4.dp))
                Text(subtitle, fontSize = 11.sp, color = accentColor, fontWeight = FontWeight.SemiBold)
            }
            Box(
                modifier = Modifier
                    .size(46.dp)
                    .clip(CircleShape)
                    .background(accentColor.copy(alpha = 0.15f)),
                contentAlignment = Alignment.Center
            ) {
                Icon(icon, contentDescription = null, tint = accentColor, modifier = Modifier.size(24.dp))
            }
        }
    }
}
