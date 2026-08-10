package com.bardahl.maroc.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView

private val DarkColorScheme = darkColorScheme(
    primary = BardahlYellow,
    onPrimary = BardahlBlack,
    primaryContainer = BardahlYellowDark,
    onPrimaryContainer = BardahlBlack,
    secondary = BardahlYellowLight,
    onSecondary = BardahlBlack,
    background = DarkBackground,
    onBackground = TextPrimaryDark,
    surface = DarkSurface,
    onSurface = TextPrimaryDark,
    surfaceVariant = BardahlCardDark,
    onSurfaceVariant = TextSecondaryDark,
    outline = BardahlCardBorder
)

private val LightColorScheme = lightColorScheme(
    primary = BardahlYellow,
    onPrimary = BardahlBlack,
    primaryContainer = BardahlYellowDark,
    background = DarkBackground,
    surface = DarkSurface
)

@Composable
fun BardahlTheme(
    darkTheme: Boolean = true, // Default to 2026 Dark Mode Premium Aesthetics
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    val view = LocalView.current

    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = colorScheme.background.toArgb()
            window.navigationBarColor = colorScheme.background.toArgb()
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
