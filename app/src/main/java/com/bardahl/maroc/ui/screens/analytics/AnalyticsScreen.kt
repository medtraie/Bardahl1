package com.bardahl.maroc.ui.screens.analytics

import android.widget.Toast
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.bardahl.maroc.ui.components.BardahlHeader
import com.bardahl.maroc.ui.components.GlassCard
import com.bardahl.maroc.ui.theme.*

private data class SegmentInfo(
    val name: String,
    val category: String,
    val color: Color,
    val value: String,
    val description: String
)

@Composable
fun AnalyticsScreen(onSettingsClick: () -> Unit) {
    val context = LocalContext.current
    var selectedPeriod by remember { mutableStateOf("Ce Mois") }
    var selectedSegmentInfo by remember { mutableStateOf<SegmentInfo?>(null) }

    val segmentDetailsMap = remember {
        mapOf(
            "Lubrifiants Auto" to SegmentInfo("Lubrifiants Auto (BVM-BVA)", "Gamme Phare Bardahl", Color(0xFFFFD000), "280,000 DH (42% du CA Global)", "Représente la gamme principale d'huiles moteur et liquides de transmission Bardahl. C'est le moteur du CA réseau pour les garages."),
            "Additifs & Aérosols" to SegmentInfo("Additifs & Aérosols", "Gamme Marge Forte", Color(0xFFFF9F43), "165,000 DH (26% du CA Global)", "Comprend les nettoyeurs d'injecteurs, traitement anti-fumée et nettoyants freins. Génère la plus forte marge commerciale unitaire."),
            "Industrie & Graisses" to SegmentInfo("Industrie & Graisses", "Gamme Technique Spécialisée", Color(0xFFFF5252), "115,000 DH (18% du CA Global)", "Comprend les graisses au lithium, huiles hydrauliques et lubrifiants agro-alimentaires H1 destinés aux usines et flottes de transport."),
            "Fluides & LR" to SegmentInfo("Fluides & LR", "Gamme Refroidissement", Color(0xFF0077B6), "72,000 DH (14% du CA Global)", "Comprend les liquides de refroidissement XCL et fluides de frein DOT4. Demande constante en station service et centres auto."),
            "Mohammed amine" to SegmentInfo("Mohammed amine", "Commercial Top Performer", Color(0xFFFFD000), "148,500 DH / mois (102% de l'objectif)", "Commercial responsable de la zone Casablanca & Mohammedia. Performance exceptionnelle avec un portefeuille de clients actifs."),
            "Bahjaji" to SegmentInfo("Bahjaji", "Commercial Senior", Color(0xFF2EC4B6), "165,200 DH / mois (110% de l'objectif)", "Commercial responsable du secteur Rabat et Centre. Plus grand portefeuille avec plus de 1 600 clients actifs."),
            "Casablanca" to SegmentInfo("Casablanca", "Secteur Capital Économique", Color(0xFFFFD000), "95,000 Unités / 520,000 DH TTC", "Premier secteur de vente au Maroc avec plus de 60% de la demande concentrée sur Ain Sebaa, Lissasfa et Zone Industrielle."),
            "Rabat" to SegmentInfo("Rabat", "Secteur Capitale & Flottes", Color(0xFF2EC4B6), "78,000 Unités / 380,000 DH TTC", "Secteur en forte croissance tiré par les marchés publics, flottes administratives et stations services autoroutières."),
            "Tanger" to SegmentInfo("Tanger", "Secteur Nord & Logistique", Color(0xFF9B51E0), "82,000 Unités / 410,000 DH TTC", "Zone stratégique portée par Tanger Med, les zones franches automobiles et le transport international.")
        )
    }

    val topProducts = listOf(
        TopProductItem("34131", "Bardahl XTRA 10W40 1L", "1,840 Bidons", "143,520 DH"),
        TopProductItem("BH001", "BARDAHL HUILE Anti-Usure 250ml", "2,400 Flacons", "60,000 DH"),
        TopProductItem("GAL01", "Graisse Lithium All Purpose N°2 400g", "1,950 Cartouches", "52,650 DH"),
        TopProductItem("7313", "XCL UNIVERSEL -25°C 5L", "620 Bidons", "81,840 DH"),
        TopProductItem("4451E", "Brake Cleaner Nettoyant Freins 600ml", "1,200 Spray", "56,400 DH")
    )

    val topCommercials = listOf(
        LeaderItem(1, "Mohammed amine", "Casablanca", "148,500 DH", 0.98f),
        LeaderItem(2, "Bahjaji", "Rabat & Centre", "165,200 DH", 1.10f),
        LeaderItem(3, "BELFKIH", "Tanger & Nord", "92,400 DH", 0.92f)
    )

    Scaffold(
        topBar = {
            BardahlHeader(
                title = "Analyses Ventes Bardahl Maroc",
                subtitle = "Tableau de Bord BI & Analytics Commercial 2026",
                onSettingsClick = onSettingsClick,
                actions = {
                    IconButton(onClick = {
                        Toast.makeText(context, "Export Rapport PDF Ventes généré avec succès !", Toast.LENGTH_SHORT).show()
                    }) {
                        Icon(Icons.Default.Download, contentDescription = "Export PDF", tint = BardahlYellow)
                    }
                }
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

            // Period Filters Row
            item {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    listOf("Ce Mois", "Ce Trimestre", "Cette Année").forEach { period ->
                        FilterChip(
                            selected = selectedPeriod == period,
                            onClick = { selectedPeriod = period },
                            label = { Text(period, fontSize = 12.sp, fontWeight = FontWeight.Bold) },
                            colors = FilterChipDefaults.filterChipColors(
                                selectedContainerColor = BardahlYellow,
                                selectedLabelColor = BardahlBlack,
                                containerColor = BardahlCardDark,
                                labelColor = TextSecondaryDark
                            ),
                            border = FilterChipDefaults.filterChipBorder(
                                enabled = true,
                                selected = selectedPeriod == period,
                                borderColor = BardahlCardBorder,
                                selectedBorderColor = BardahlYellow
                            )
                        )
                    }
                }
            }

            // 1. TOP 4 REAL BARDAHL KPI CARDS ROW
            item {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        BardahlKpiCard(
                            title = "Chiffre d'Affaires HT",
                            value = "1,248.5K",
                            unit = "DH",
                            valueColor = Color(0xFFD4A373),
                            badgeIcon = Icons.Default.Paid,
                            modifier = Modifier.weight(1f)
                        )
                        BardahlKpiCard(
                            title = "CA Total TTC",
                            value = "1,498.2K",
                            unit = "DH",
                            valueColor = Color(0xFF2EC4B6),
                            badgeIcon = Icons.Default.Payments,
                            modifier = Modifier.weight(1f)
                        )
                    }
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        BardahlKpiCard(
                            title = "Panier Moyen Order",
                            value = "8,450",
                            unit = "DH",
                            valueColor = Color(0xFFFF6B6B),
                            badgeIcon = Icons.Default.ShoppingBag,
                            modifier = Modifier.weight(1f)
                        )
                        BardahlKpiCard(
                            title = "Taux Objectif Ventes",
                            value = "94%",
                            unit = "Atteint",
                            valueColor = Color(0xFF9B51E0),
                            badgeIcon = Icons.Default.EmojiEvents,
                            modifier = Modifier.weight(1f)
                        )
                    }
                }
            }

            // 2. MIDDLE CHARTS ROW (Évolution CA par Gamme + Trajectoire Objectif vs Réalisé)
            item {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    // Chart 1: Évolution Mensuelle du CA par Gamme Bardahl
                    GlassCard(modifier = Modifier.fillMaxWidth()) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Évolution Mensuelle par Gamme Bardahl",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimaryDark
                            )
                            Icon(Icons.Default.TrendingUp, contentDescription = null, tint = BardahlYellow)
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("Appuyez sur une gamme pour voir ses détails :", fontSize = 11.sp, color = TextSecondaryDark)
                        Spacer(modifier = Modifier.height(10.dp))

                        // Interactive Gamme Chips Legend
                        Row(
                            modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            listOf(
                                Pair("Lubrifiants Auto", Color(0xFFFFD000)),
                                Pair("Additifs & Aérosols", Color(0xFFFF9F43)),
                                Pair("Industrie & Graisses", Color(0xFFFF5252)),
                                Pair("Fluides & LR", Color(0xFF0077B6))
                            ).forEach { (name, color) ->
                                AssistChip(
                                    onClick = { selectedSegmentInfo = segmentDetailsMap[name] },
                                    label = { Text(name, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextPrimaryDark) },
                                    leadingIcon = { Box(modifier = Modifier.size(10.dp).clip(CircleShape).background(color)) }
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))
                        SalesWaveChart(modifier = Modifier.fillMaxWidth().height(160.dp))
                    }

                    // Chart 2: Trajectoire Objectif vs Ventes Réelles
                    GlassCard(modifier = Modifier.fillMaxWidth()) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Objectif vs Ventes Réelles (Commercials)",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimaryDark
                            )
                            Icon(Icons.Default.ShowChart, contentDescription = null, tint = BardahlYellow)
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        
                        Row(
                            modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            listOf(
                                Pair("Mohammed amine", Color(0xFFFFD000)),
                                Pair("Bahjaji", Color(0xFF2EC4B6))
                            ).forEach { (name, color) ->
                                AssistChip(
                                    onClick = { selectedSegmentInfo = segmentDetailsMap[name] },
                                    label = { Text(name, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextPrimaryDark) },
                                    leadingIcon = { Box(modifier = Modifier.size(10.dp).clip(CircleShape).background(color)) }
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))
                        CommercialTrendChart(modifier = Modifier.fillMaxWidth().height(160.dp))
                    }
                }
            }

            // 3. BOTTOM CHARTS ROW (Donut Pie Répartition Gammes + Capsule Bars Ventes par Ville)
            item {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    // Chart 3: Répartition Ventes par Gamme Bardahl (%)
                    GlassCard(modifier = Modifier.fillMaxWidth()) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Répartition du CA par Gamme Produit (%)",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimaryDark
                            )
                            Icon(Icons.Default.PieChart, contentDescription = null, tint = BardahlYellow)
                        }
                        Spacer(modifier = Modifier.height(14.dp))
                        GammePieChart(modifier = Modifier.fillMaxWidth().height(180.dp))
                    }

                    // Chart 4: Volume Ventes par Ville / Secteur
                    GlassCard(modifier = Modifier.fillMaxWidth()) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Volume Ventes par Secteur / Ville",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextPrimaryDark
                            )
                            Icon(Icons.Default.BarChart, contentDescription = null, tint = BardahlYellow)
                        }
                        Spacer(modifier = Modifier.height(8.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            listOf("Casablanca", "Rabat", "Tanger").forEach { city ->
                                AssistChip(
                                    onClick = { selectedSegmentInfo = segmentDetailsMap[city] },
                                    label = { Text(city, fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextPrimaryDark) }
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))
                        CitySalesBarChart(modifier = Modifier.fillMaxWidth().height(180.dp))
                    }
                }
            }

            // 4. TOP 5 BEST-SELLING PRODUCTS TABLE
            item {
                GlassCard(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("Top 5 Produits les Plus Vendus (Bardahl)", fontSize = 15.sp, fontWeight = FontWeight.Bold, color = TextPrimaryDark)
                        Icon(Icons.Default.Star, contentDescription = null, tint = BardahlYellow)
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        topProducts.forEach { item ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(DarkSurface)
                                    .padding(12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(item.name, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextPrimaryDark)
                                    Text("Réf: ${item.ref} | Volume: ${item.volume}", fontSize = 11.sp, color = TextSecondaryDark)
                                }
                                Text(item.revenue, fontSize = 14.sp, fontWeight = FontWeight.Black, color = BardahlYellow)
                            }
                        }
                    }
                }
            }

            item { Spacer(modifier = Modifier.height(24.dp)) }
        }
    }

    // Segment Inspector Dialog (عند الضغط على الألوان والمنحنيات)
    if (selectedSegmentInfo != null) {
        val info = selectedSegmentInfo!!
        AlertDialog(
            onDismissRequest = { selectedSegmentInfo = null },
            containerColor = DarkSurface,
            title = {
                Column {
                    Text(info.name, color = TextPrimaryDark, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(info.category, color = BardahlYellow, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(DarkBackground)
                            .border(1.dp, info.color, RoundedCornerShape(10.dp))
                            .padding(12.dp)
                    ) {
                        Column {
                            Text("Valeur / Performance Réelle :", fontSize = 11.sp, color = TextSecondaryDark)
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(info.value, fontSize = 15.sp, fontWeight = FontWeight.Black, color = info.color)
                        }
                    }

                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(DarkBackground)
                            .padding(12.dp)
                    ) {
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(Icons.Default.Info, contentDescription = null, tint = BardahlYellow, modifier = Modifier.size(16.dp))
                                Spacer(modifier = Modifier.width(6.dp))
                                Text("Explication Commerciale (على ماذا تدل) :", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = BardahlYellow)
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(info.description, fontSize = 13.sp, color = TextPrimaryDark, lineHeight = 18.sp)
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = { selectedSegmentInfo = null },
                    colors = ButtonDefaults.buttonColors(containerColor = BardahlYellow, contentColor = BardahlBlack),
                    shape = RoundedCornerShape(10.dp)
                ) {
                    Text("FERMER L'ANALYSE", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        )
    }
}

@Composable
private fun BardahlKpiCard(
    title: String,
    value: String,
    unit: String,
    valueColor: Color,
    badgeIcon: androidx.compose.ui.graphics.vector.ImageVector,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = BardahlCardDark),
        border = CardDefaults.outlinedCardBorder().copy(brush = Brush.horizontalGradient(listOf(BardahlCardBorder, BardahlCardBorder)))
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(14.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = title,
                fontSize = 12.sp,
                color = TextSecondaryDark,
                fontWeight = FontWeight.Medium
            )
            Spacer(modifier = Modifier.height(6.dp))
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    imageVector = badgeIcon,
                    contentDescription = null,
                    tint = valueColor.copy(alpha = 0.12f),
                    modifier = Modifier.size(50.dp)
                )
                Row(verticalAlignment = Alignment.Bottom) {
                    Text(
                        text = value,
                        fontSize = 28.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = valueColor
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = unit,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = valueColor.copy(alpha = 0.8f),
                        modifier = Modifier.padding(bottom = 4.dp)
                    )
                }
            }
        }
    }
}

@Composable
private fun SalesWaveChart(modifier: Modifier = Modifier) {
    val months = listOf("Jan", "Fév", "Mar", "Avr", "Mai", "Juin")

    Column(modifier = modifier) {
        Canvas(modifier = Modifier.weight(1f).fillMaxWidth()) {
            val width = size.width
            val height = size.height

            val path1 = Path().apply {
                moveTo(0f, height * 0.88f)
                cubicTo(width * 0.2f, height * 0.94f, width * 0.4f, height * 0.80f, width * 0.6f, height * 0.86f)
                cubicTo(width * 0.8f, height * 0.92f, width * 0.9f, height * 0.82f, width, height * 0.84f)
                lineTo(width, height)
                lineTo(0f, height)
                close()
            }
            drawPath(path1, color = Color(0xFF0077B6))

            val path2 = Path().apply {
                moveTo(0f, height * 0.72f)
                cubicTo(width * 0.2f, height * 0.82f, width * 0.4f, height * 0.68f, width * 0.6f, height * 0.75f)
                cubicTo(width * 0.8f, height * 0.82f, width * 0.9f, height * 0.70f, width, height * 0.74f)
                lineTo(width, height * 0.84f)
                cubicTo(width * 0.9f, height * 0.82f, width * 0.8f, height * 0.92f, width * 0.6f, height * 0.86f)
                cubicTo(width * 0.4f, height * 0.80f, width * 0.2f, height * 0.94f, 0f, height * 0.88f)
                close()
            }
            drawPath(path2, color = Color(0xFFFF5252))

            val path3 = Path().apply {
                moveTo(0f, height * 0.52f)
                cubicTo(width * 0.2f, height * 0.62f, width * 0.4f, height * 0.42f, width * 0.6f, height * 0.52f)
                cubicTo(width * 0.8f, height * 0.60f, width * 0.9f, height * 0.46f, width, height * 0.50f)
                lineTo(width, height * 0.74f)
                cubicTo(width * 0.9f, height * 0.70f, width * 0.8f, height * 0.82f, width * 0.6f, height * 0.75f)
                cubicTo(width * 0.4f, height * 0.68f, width * 0.2f, height * 0.82f, 0f, height * 0.72f)
                close()
            }
            drawPath(path3, color = Color(0xFFFF9F43))

            val path4 = Path().apply {
                moveTo(0f, height * 0.28f)
                cubicTo(width * 0.25f, height * 0.42f, width * 0.45f, height * 0.12f, width * 0.65f, height * 0.32f)
                cubicTo(width * 0.85f, height * 0.08f, width * 0.95f, height * 0.22f, width, height * 0.18f)
                lineTo(width, height * 0.50f)
                cubicTo(width * 0.9f, height * 0.46f, width * 0.8f, height * 0.60f, width * 0.6f, height * 0.52f)
                cubicTo(width * 0.4f, height * 0.42f, width * 0.2f, height * 0.62f, 0f, height * 0.52f)
                close()
            }
            drawPath(path4, color = Color(0xFF2EC4B6))
        }

        Row(
            modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            months.forEach { month ->
                Text(month, fontSize = 10.sp, color = TextSecondaryDark, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun CommercialTrendChart(modifier: Modifier = Modifier) {
    val months = listOf("Jan", "Fév", "Mar", "Avr", "Mai", "Juin")

    Column(modifier = modifier) {
        Canvas(modifier = Modifier.weight(1f).fillMaxWidth()) {
            val width = size.width
            val height = size.height

            val pathGreen = Path().apply {
                moveTo(0f, height * 0.78f)
                cubicTo(width * 0.25f, height * 0.74f, width * 0.5f, height * 0.80f, width * 0.75f, height * 0.76f)
                cubicTo(width * 0.85f, height * 0.77f, width * 0.95f, height * 0.79f, width, height * 0.80f)
            }
            drawPath(pathGreen, color = Color(0xFF51CF66), style = Stroke(width = 4f))

            val pathCyan = Path().apply {
                moveTo(0f, height * 0.52f)
                cubicTo(width * 0.2f, height * 0.22f, width * 0.4f, height * 0.62f, width * 0.6f, height * 0.42f)
                cubicTo(width * 0.8f, height * 0.32f, width * 0.9f, height * 0.48f, width, height * 0.22f)
            }
            drawPath(pathCyan, color = Color(0xFF2EC4B6), style = Stroke(width = 4f))

            val pathCoral = Path().apply {
                moveTo(0f, height * 0.58f)
                cubicTo(width * 0.22f, height * 0.12f, width * 0.45f, height * 0.68f, width * 0.7f, height * 0.42f)
                cubicTo(width * 0.85f, height * 0.35f, width * 0.95f, height * 0.30f, width, height * 0.28f)
            }
            drawPath(pathCoral, color = Color(0xFFFF6B6B), style = Stroke(width = 4f))
        }

        Row(
            modifier = Modifier.fillMaxWidth().padding(top = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            months.forEach { month ->
                Text(month, fontSize = 10.sp, color = TextSecondaryDark, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun GammePieChart(modifier: Modifier = Modifier) {
    Canvas(modifier = modifier) {
        val diameter = minOf(size.width, size.height) * 0.85f
        val topLeft = Offset((size.width - diameter) / 2, (size.height - diameter) / 2)
        val arcSize = Size(diameter, diameter)

        drawArc(color = Color(0xFFFFD000), startAngle = -90f, sweepAngle = 151f, useCenter = true, topLeft = topLeft, size = arcSize)
        drawArc(color = Color(0xFFFF6B6B), startAngle = 61f, sweepAngle = 93f, useCenter = true, topLeft = topLeft, size = arcSize)
        drawArc(color = Color(0xFF9B51E0), startAngle = 154f, sweepAngle = 65f, useCenter = true, topLeft = topLeft, size = arcSize)
        drawArc(color = Color(0xFF2EC4B6), startAngle = 219f, sweepAngle = 32f, useCenter = true, topLeft = topLeft, size = arcSize)
        drawArc(color = Color(0xFF0077B6), startAngle = 251f, sweepAngle = 19f, useCenter = true, topLeft = topLeft, size = arcSize)
    }
}

@Composable
private fun CitySalesBarChart(modifier: Modifier = Modifier) {
    val cityData = listOf(
        Pair("Casa", 0.95f),
        Pair("Rabat", 0.78f),
        Pair("Marrakech", 0.65f),
        Pair("Tanger", 0.82f),
        Pair("Agadir", 0.58f)
    )

    Row(
        modifier = modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.Bottom
    ) {
        cityData.forEach { (city, fraction) ->
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Bottom,
                modifier = Modifier.fillMaxHeight()
            ) {
                Box(
                    modifier = Modifier
                        .width(26.dp)
                        .weight(1f)
                        .clip(CircleShape)
                        .background(BardahlCardDark)
                        .padding(4.dp),
                    contentAlignment = Alignment.BottomCenter
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .fillMaxHeight(fraction)
                            .clip(CircleShape)
                            .background(
                                Brush.verticalGradient(
                                    colors = listOf(Color(0xFFFFD000), Color(0xFFFF9F43))
                                )
                            )
                    )
                }
                Spacer(modifier = Modifier.height(6.dp))
                Text(city, fontSize = 10.sp, color = TextSecondaryDark, fontWeight = FontWeight.Bold)
            }
        }
    }
}

private data class TopProductItem(
    val ref: String,
    val name: String,
    val volume: String,
    val revenue: String
)

private data class LeaderItem(
    val rank: Int,
    val name: String,
    val city: String,
    val sales: String,
    val progress: Float
)
