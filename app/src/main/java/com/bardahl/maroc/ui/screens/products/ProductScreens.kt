package com.bardahl.maroc.ui.screens.products

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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.input.KeyboardType
import com.bardahl.maroc.domain.model.BardahlFamilies
import com.bardahl.maroc.domain.model.Product
import com.bardahl.maroc.domain.model.parseUnitsPerBox
import com.bardahl.maroc.ui.components.*
import com.bardahl.maroc.ui.theme.*
import com.bardahl.maroc.domain.model.UserRole
import com.bardahl.maroc.ui.viewmodels.AuthState
import com.bardahl.maroc.ui.viewmodels.AuthViewModel
import com.bardahl.maroc.ui.viewmodels.ProductViewModel

data class CategoryFilterItem(val code: String, val label: String)

@Composable
fun ProductCatalogScreen(
    productViewModel: ProductViewModel,
    authViewModel: AuthViewModel? = null,
    onSettingsClick: () -> Unit
) {
    val context = LocalContext.current
    val productsList by productViewModel.products.collectAsState()
    val searchQuery by productViewModel.searchQuery.collectAsState()

    val authState = authViewModel?.authState?.collectAsState()?.value
    val currentUser = (authState as? AuthState.Success)?.user
    val isAdmin = currentUser?.role == UserRole.ADMIN || currentUser?.email.equals("bardahl@gmail.com", ignoreCase = true)

    var isTableView by remember { mutableStateOf(false) }
    var selectedCategoryCode by remember { mutableStateOf("ALL") }
    var showAddDialog by remember { mutableStateOf(false) }
    var editingProduct by remember { mutableStateOf<Product?>(null) }
    var deletingProduct by remember { mutableStateOf<Product?>(null) }

    val categories = remember {
        listOf(CategoryFilterItem("ALL", "Toutes les Familles")) +
            BardahlFamilies.all.map { CategoryFilterItem(it.code, "${it.icon} ${it.label}") }
    }

    // Filter Logic
    val filteredProducts = productsList.filter { product ->
        val q = searchQuery.trim()
        val fam = BardahlFamilies.resolve(product.categoryId)
        val matchesSearch = q.isBlank() ||
                product.name.contains(q, ignoreCase = true) ||
                product.code.contains(q, ignoreCase = true) ||
                product.reference.contains(q, ignoreCase = true) ||
                fam.label.contains(q, ignoreCase = true)

        if (!matchesSearch) return@filter false
        if (selectedCategoryCode == "ALL") return@filter true

        fam.code.equals(selectedCategoryCode, ignoreCase = true) ||
            (product.categoryId ?: "").contains(selectedCategoryCode, ignoreCase = true)
    }

    Scaffold(
        topBar = {
            BardahlHeader(
                title = "Catalogue Produits",
                subtitle = "Gamme Officielle Bardahl Maroc",
                onSettingsClick = onSettingsClick,
                actions = {
                    IconButton(onClick = { isTableView = !isTableView }) {
                        Icon(
                            imageVector = if (isTableView) Icons.Default.GridView else Icons.Default.TableChart,
                            contentDescription = "Changer vue",
                            tint = BardahlYellow
                        )
                    }
                }
            )
        },
        floatingActionButton = {
            if (isAdmin) {
                FloatingActionButton(
                    onClick = { showAddDialog = true },
                    containerColor = BardahlYellow,
                    contentColor = BardahlBlack,
                    shape = RoundedCornerShape(16.dp)
                ) {
                    Icon(Icons.Default.Add, contentDescription = "Ajouter Produit")
                }
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

            // Search Bar
            BardahlTextField(
                value = searchQuery,
                onValueChange = { productViewModel.setSearchQuery(it) },
                label = "Rechercher Produit, Réf, Famille...",
                leadingIcon = Icons.Default.Search
            )

            Spacer(modifier = Modifier.height(10.dp))

            // Category Filter Pills
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                categories.forEach { cat ->
                    val isSelected = selectedCategoryCode == cat.code
                    FilterChip(
                        selected = isSelected,
                        onClick = { selectedCategoryCode = cat.code },
                        label = {
                            Text(
                                text = cat.label,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (isSelected) BardahlBlack else Color.White
                            )
                        },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = BardahlYellow,
                            selectedLabelColor = BardahlBlack,
                            containerColor = DarkSurface,
                            labelColor = Color.White
                        ),
                        border = FilterChipDefaults.filterChipBorder(
                            enabled = true,
                            selected = isSelected,
                            borderColor = BardahlCardBorder,
                            selectedBorderColor = BardahlYellow
                        )
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            // Products Display (Cards View vs Table View)
            if (isTableView) {
                ProductsTableView(
                    products = filteredProducts,
                    isAdmin = isAdmin,
                    onEdit = { editingProduct = it },
                    onDelete = { deletingProduct = it }
                )
            } else {
                LazyColumn(
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    items(filteredProducts) { product ->
                        ProductCardStructured(
                            product = product,
                            isAdmin = isAdmin,
                            onEdit = { editingProduct = product },
                            onDelete = { deletingProduct = product }
                        )
                    }
                    item { Spacer(modifier = Modifier.height(80.dp)) }
                }
            }
        }
    }

    // Add Dialog
    if (showAddDialog) {
        AddEditProductDialog(
            title = "Ajouter un Produit au Catalogue",
            initialProduct = null,
            onDismiss = { showAddDialog = false },
            onSave = { newProd ->
                productViewModel.addProduct(newProd)
                showAddDialog = false
                Toast.makeText(context, "Produit ${newProd.name} ajouté au catalogue !", Toast.LENGTH_SHORT).show()
            }
        )
    }

    // Edit Dialog
    if (editingProduct != null) {
        AddEditProductDialog(
            title = "Modifier Produit Bardahl",
            initialProduct = editingProduct,
            onDismiss = { editingProduct = null },
            onSave = { updatedProd ->
                productViewModel.updateProduct(updatedProd)
                editingProduct = null
                Toast.makeText(context, "Produit ${updatedProd.name} mis à jour !", Toast.LENGTH_SHORT).show()
            }
        )
    }

    // Delete Dialog
    if (deletingProduct != null) {
        AlertDialog(
            onDismissRequest = { deletingProduct = null },
            containerColor = DarkSurface,
            title = { Text("Supprimer le Produit ?", color = TextPrimaryDark, fontWeight = FontWeight.Bold) },
            text = { Text("Êtes-vous sûr de vouloir supprimer ${deletingProduct?.name} du catalogue ?", color = TextSecondaryDark) },
            confirmButton = {
                Button(
                    onClick = {
                        val target = deletingProduct
                        deletingProduct = null
                        if (target != null) {
                            productViewModel.deleteProduct(target)
                            Toast.makeText(context, "Produit ${target.name} supprimé.", Toast.LENGTH_SHORT).show()
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = StatusCancelled)
                ) {
                    Text("Supprimer", color = TextPrimaryDark)
                }
            },
            dismissButton = {
                TextButton(onClick = { deletingProduct = null }) {
                    Text("Annuler", color = TextSecondaryDark)
                }
            }
        )
    }
}

@Composable
fun ProductCardStructured(
    product: Product,
    isAdmin: Boolean = false,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column {
            // Header Row: Product Icon, Name, Viscosity Badge
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f)
                ) {
                    Box(
                        modifier = Modifier
                            .size(44.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(BardahlYellow.copy(alpha = 0.15f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.Inventory2,
                            contentDescription = null,
                            tint = BardahlYellow,
                            modifier = Modifier.size(24.dp)
                        )
                    }

                    Spacer(modifier = Modifier.width(12.dp))

                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = product.name,
                            fontSize = 15.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextPrimaryDark,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = "Réf: ${product.reference} | Code: ${product.code}",
                            fontSize = 11.sp,
                            color = TextSecondaryDark,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }

                val famInfo = BardahlFamilies.resolve(product.categoryId)
                Spacer(modifier = Modifier.width(8.dp))
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .background(BardahlYellow.copy(alpha = 0.16f))
                        .border(1.dp, BardahlYellow.copy(alpha = 0.4f), RoundedCornerShape(8.dp))
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = "${famInfo.icon} ${famInfo.label}",
                        color = BardahlYellow,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            Spacer(modifier = Modifier.height(10.dp))
            HorizontalDivider(color = BardahlCardBorder)
            Spacer(modifier = Modifier.height(10.dp))

            // Body Row: Packaging, Units/Box, Stock & Price
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        "Cond. : ${product.packaging} (${product.unitsPerBox} un./ctn)",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = TextPrimaryDark
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        "Stock disponible : ${product.stockQuantity} un.",
                        fontSize = 11.sp,
                        color = if (product.stockQuantity > 0) StatusDelivered else StatusCancelled,
                        fontWeight = FontWeight.Bold
                    )
                }

                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = "${String.format("%.2f", product.unitPriceTtc)} DH",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Black,
                        color = BardahlYellow
                    )
                    Text("TTC / Unité", fontSize = 10.sp, color = TextSecondaryDark)
                }
            }

            if (isAdmin) {
                Spacer(modifier = Modifier.height(12.dp))

                // Action Buttons Row (Modifier & Supprimer)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Button(
                        onClick = onEdit,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = BardahlYellow.copy(alpha = 0.15f),
                            contentColor = BardahlYellow
                        ),
                        shape = RoundedCornerShape(10.dp),
                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp)
                    ) {
                        Icon(Icons.Default.Edit, contentDescription = null, tint = BardahlYellow, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Modifier", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = BardahlYellow)
                    }

                    Spacer(modifier = Modifier.width(10.dp))

                    Button(
                        onClick = onDelete,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = StatusCancelled.copy(alpha = 0.15f),
                            contentColor = StatusCancelled
                        ),
                        shape = RoundedCornerShape(10.dp),
                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp)
                    ) {
                        Icon(Icons.Default.Delete, contentDescription = null, tint = StatusCancelled, modifier = Modifier.size(16.dp))
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Supprimer", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = StatusCancelled)
                    }
                }
            }
        }
    }
}

@Composable
fun ProductsTableView(
    products: List<Product>,
    isAdmin: Boolean = false,
    onEdit: (Product) -> Unit,
    onDelete: (Product) -> Unit
) {
    val scrollState = rememberScrollState()

    GlassCard(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .horizontalScroll(scrollState)
        ) {
            // Header Row
            Row(
                modifier = Modifier
                    .background(DarkSurface)
                    .padding(vertical = 10.dp, horizontal = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                TableCell("Réf.", width = 80.dp, header = true)
                TableCell("Désignation Produit", width = 200.dp, header = true)
                TableCell("Famille", width = 140.dp, header = true)
                TableCell("Conditionnement", width = 130.dp, header = true)
                TableCell("Stock", width = 70.dp, header = true)
                TableCell("Prix TTC", width = 100.dp, header = true)
                if (isAdmin) TableCell("Actions", width = 100.dp, header = true)
            }

            HorizontalDivider(color = BardahlCardBorder)

            // Rows
            LazyColumn(modifier = Modifier.heightIn(max = 500.dp)) {
                items(products) { product ->
                    val famInfo = BardahlFamilies.resolve(product.categoryId)
                    Row(
                        modifier = Modifier.padding(vertical = 10.dp, horizontal = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        TableCell(product.reference, width = 80.dp, bold = true)
                        TableCell(product.name, width = 200.dp)
                        TableCell("${famInfo.icon} ${famInfo.label}", width = 140.dp, highlight = true)
                        TableCell("${product.unitsPerBox} un. (${product.packaging})", width = 130.dp)
                        TableCell("${product.stockQuantity}", width = 70.dp)
                        TableCell("${String.format("%.2f", product.unitPriceTtc)} DH", width = 100.dp, gold = true)
                        if (isAdmin) {
                            Row(modifier = Modifier.width(100.dp)) {
                                IconButton(onClick = { onEdit(product) }, modifier = Modifier.size(28.dp)) {
                                    Icon(Icons.Default.Edit, contentDescription = "Modifier", tint = BardahlYellow, modifier = Modifier.size(16.dp))
                                }
                                IconButton(onClick = { onDelete(product) }, modifier = Modifier.size(28.dp)) {
                                    Icon(Icons.Default.Delete, contentDescription = "Supprimer", tint = StatusCancelled, modifier = Modifier.size(16.dp))
                                }
                            }
                        }
                    }
                    HorizontalDivider(color = BardahlCardBorder.copy(alpha = 0.5f))
                }
            }
        }
    }
}

@Composable
private fun TableCell(
    text: String,
    width: androidx.compose.ui.unit.Dp,
    header: Boolean = false,
    bold: Boolean = false,
    gold: Boolean = false,
    highlight: Boolean = false
) {
    Text(
        text = text,
        modifier = Modifier.width(width),
        fontSize = if (header) 12.sp else 13.sp,
        fontWeight = if (header || bold || gold) FontWeight.Bold else FontWeight.Normal,
        color = when {
            header -> TextSecondaryDark
            gold -> BardahlYellow
            highlight -> BardahlYellow
            else -> TextPrimaryDark
        },
        maxLines = 1,
        overflow = TextOverflow.Ellipsis
    )
}

@Composable
fun AddEditProductDialog(
    title: String,
    initialProduct: Product?,
    onDismiss: () -> Unit,
    onSave: (Product) -> Unit
) {
    var name by remember { mutableStateOf(initialProduct?.name ?: "") }
    var reference by remember { mutableStateOf(initialProduct?.reference ?: "") }
    var code by remember { mutableStateOf(initialProduct?.code ?: "") }
    val resolvedInitialUnits = initialProduct?.unitsPerBox ?: 12
    var unitsPerBoxStr by remember { mutableStateOf(resolvedInitialUnits.toString()) }
    var packaging by remember { mutableStateOf(initialProduct?.packaging?.takeIf { it.isNotBlank() && !it.equals("null", ignoreCase = true) } ?: "Carton de $resolvedInitialUnits") }
    var priceTtcStr by remember {
        mutableStateOf(
            if (initialProduct != null) {
                if (initialProduct.unitPriceTtc % 1.0 == 0.0) initialProduct.unitPriceTtc.toInt().toString() else initialProduct.unitPriceTtc.toString()
            } else ""
        )
    }
    var stockStr by remember { mutableStateOf((initialProduct?.stockQuantity ?: 100).toString()) }
    var selectedFamilyCode by remember {
        mutableStateOf(BardahlFamilies.resolve(initialProduct?.categoryId).code)
    }
    var familyExpanded by remember { mutableStateOf(false) }

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = DarkSurface,
        title = { Text(title, color = BardahlYellow, fontWeight = FontWeight.Bold) },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Désignation Produit *
                LabeledInputField("Désignation Produit *") {
                    BardahlTextField(name, { name = it }, "Nom complet du produit")
                }

                // Référence * & Code Article
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Column(modifier = Modifier.weight(1f)) {
                        LabeledInputField("Référence *") {
                            BardahlTextField(reference, { reference = it }, "Ex: 4009B")
                        }
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        LabeledInputField("Code Article") {
                            BardahlTextField(code, { code = it }, "Ex: 4009B")
                        }
                    }
                }

                // Prix TTC * & Famille de produits *
                LabeledInputField("Prix TTC (DH) *") {
                    BardahlTextField(
                        value = priceTtcStr,
                        onValueChange = { priceTtcStr = it.replace(',', '.') },
                        label = "Prix en DH TTC",
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
                    )
                }

                LabeledInputField("Famille de produits *") {
                    Box(modifier = Modifier.fillMaxWidth()) {
                        val activeFam = BardahlFamilies.resolve(selectedFamilyCode)
                        OutlinedButton(
                            onClick = { familyExpanded = true },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.outlinedButtonColors(containerColor = DarkBackground, contentColor = Color.White),
                            border = ButtonDefaults.outlinedButtonBorder.copy(brush = androidx.compose.ui.graphics.SolidColor(BardahlCardBorder)),
                            shape = RoundedCornerShape(12.dp)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    "${activeFam.icon} ${activeFam.label}",
                                    color = Color.White,
                                    fontSize = 13.sp,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                    modifier = Modifier.weight(1f)
                                )
                                Icon(Icons.Default.ArrowDropDown, contentDescription = null, tint = BardahlYellow)
                            }
                        }
                        DropdownMenu(
                            expanded = familyExpanded,
                            onDismissRequest = { familyExpanded = false },
                            modifier = Modifier.background(DarkSurface).heightIn(max = 320.dp)
                        ) {
                            BardahlFamilies.all.forEach { fam ->
                                DropdownMenuItem(
                                    text = { Text("${fam.icon} ${fam.label}", color = Color.White, fontSize = 13.sp) },
                                    onClick = {
                                        selectedFamilyCode = fam.code
                                        familyExpanded = false
                                    }
                                )
                            }
                        }
                    }
                }

                // Unités par carton * & Conditionnement
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Column(modifier = Modifier.weight(1f)) {
                        LabeledInputField("Unités par carton *") {
                            BardahlTextField(
                                value = unitsPerBoxStr,
                                onValueChange = { raw ->
                                    val digits = raw.filter { it.isDigit() }
                                    unitsPerBoxStr = digits
                                    val parsed = digits.toIntOrNull()
                                    if (parsed != null && parsed > 0 && (packaging.isBlank() || packaging.startsWith("Carton de", ignoreCase = true))) {
                                        packaging = "Carton de $parsed"
                                    }
                                },
                                label = "Ex: 12 ou 24",
                                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
                            )
                        }
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        LabeledInputField("Conditionnement") {
                            BardahlTextField(packaging, { packaging = it }, "Ex: Carton de 24")
                        }
                    }
                }

                // Stock Disponible
                LabeledInputField("Stock Disponible") {
                    BardahlTextField(
                        value = stockStr,
                        onValueChange = { stockStr = it.filter { ch -> ch.isDigit() } },
                        label = "Ex: 100",
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
                    )
                }
            }
        },
        confirmButton = {
            BardahlButton(
                text = if (initialProduct != null) "Enregistrer Modifications" else "ENREGISTRER",
                onClick = {
                    if (name.isNotBlank()) {
                        val price = priceTtcStr.replace(',', '.').toDoubleOrNull() ?: 0.0
                        val parsedUnits = unitsPerBoxStr.toIntOrNull()?.takeIf { it > 0 } ?: parseUnitsPerBox(packaging)
                        val cleanPackaging = packaging.trim().ifBlank { "Carton de $parsedUnits" }
                        val parsedStock = stockStr.toIntOrNull() ?: 100
                        val cleanRef = reference.trim().ifBlank { "REF-${(1000..9999).random()}" }
                        onSave(
                            Product(
                                id = initialProduct?.id ?: "p${System.currentTimeMillis()}",
                                categoryId = selectedFamilyCode,
                                code = code.trim().ifBlank { cleanRef },
                                reference = cleanRef,
                                name = name.trim(),
                                description = initialProduct?.description ?: "Gamme officielle Bardahl Maroc",
                                viscosity = null,
                                volume = initialProduct?.volume,
                                packaging = cleanPackaging,
                                unitPriceTtc = price,
                                stockQuantity = parsedStock,
                                imageUrl = initialProduct?.imageUrl,
                                isActive = initialProduct?.isActive ?: true,
                                explicitUnitsPerBox = parsedUnits
                            )
                        )
                    }
                }
            )
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Annuler", color = Color.White)
            }
        }
    )
}

@Composable
private fun LabeledInputField(label: String, content: @Composable () -> Unit) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Text(label, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = BardahlYellow)
        Spacer(modifier = Modifier.height(4.dp))
        content()
    }
}
