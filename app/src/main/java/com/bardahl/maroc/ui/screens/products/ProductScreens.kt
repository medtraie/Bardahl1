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
import com.bardahl.maroc.domain.model.Product
import com.bardahl.maroc.ui.components.*
import com.bardahl.maroc.ui.theme.*
import com.bardahl.maroc.ui.viewmodels.ProductViewModel

data class CategoryFilterItem(val code: String, val label: String)

@Composable
fun ProductCatalogScreen(
    productViewModel: ProductViewModel,
    onSettingsClick: () -> Unit
) {
    val context = LocalContext.current
    val productsList by productViewModel.products.collectAsState()
    val searchQuery by productViewModel.searchQuery.collectAsState()

    var isTableView by remember { mutableStateOf(false) }
    var selectedCategoryCode by remember { mutableStateOf("ALL") }
    var showAddDialog by remember { mutableStateOf(false) }
    var editingProduct by remember { mutableStateOf<Product?>(null) }
    var deletingProduct by remember { mutableStateOf<Product?>(null) }

    val categories = listOf(
        CategoryFilterItem("ALL", "Tous"),
        CategoryFilterItem("LUB_AUTO", "Lubrifiants Auto"),
        CategoryFilterItem("ADDITIFS", "Additifs"),
        CategoryFilterItem("FLUIDES_LR", "Fluides & Refroidissement"),
        CategoryFilterItem("IND_GRAISSES", "Graisses"),
        CategoryFilterItem("IND_AEROSOLS", "Aérosols"),
        CategoryFilterItem("IND_ALIM", "Alimentaire")
    )

    // Filter Logic
    val filteredProducts = productsList.filter { product ->
        val matchesSearch = product.name.contains(searchQuery, ignoreCase = true) ||
                            product.code.contains(searchQuery, ignoreCase = true) ||
                            product.reference.contains(searchQuery, ignoreCase = true) ||
                            (product.viscosity != null && product.viscosity.contains(searchQuery, ignoreCase = true))
        val matchesCategory = selectedCategoryCode == "ALL" || product.categoryId == selectedCategoryCode
        matchesSearch && matchesCategory
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
            FloatingActionButton(
                onClick = { showAddDialog = true },
                containerColor = BardahlYellow,
                contentColor = BardahlBlack,
                shape = RoundedCornerShape(16.dp)
            ) {
                Icon(Icons.Default.Add, contentDescription = "Ajouter Produit")
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
                label = "Rechercher Produit, Réf, Viscosité...",
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
                                color = if (isSelected) BardahlBlack else TextPrimaryDark
                            )
                        },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = BardahlYellow,
                            selectedLabelColor = BardahlBlack,
                            containerColor = DarkSurface,
                            labelColor = TextPrimaryDark
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
            title = "Ajouter Produit au Catalogue",
            initialProduct = null,
            onDismiss = { showAddDialog = false },
            onSave = { newProd ->
                showAddDialog = false
                Toast.makeText(context, "Produit ${newProd.name} ajouté au catalogue !", Toast.LENGTH_SHORT).show()
            }
        )
    }

    // Edit Dialog
    if (editingProduct != null) {
        AddEditProductDialog(
            title = "Modifier Produit",
            initialProduct = editingProduct,
            onDismiss = { editingProduct = null },
            onSave = { updatedProd ->
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
                        val name = deletingProduct?.name
                        deletingProduct = null
                        Toast.makeText(context, "Produit $name supprimé.", Toast.LENGTH_SHORT).show()
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

                if (!product.viscosity.isNullOrBlank()) {
                    Spacer(modifier = Modifier.width(8.dp))
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(BardahlYellow)
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Text(
                            text = product.viscosity,
                            color = BardahlBlack,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Black,
                            maxLines = 1
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))
            HorizontalDivider(color = BardahlCardBorder)
            Spacer(modifier = Modifier.height(10.dp))

            // Body Row: Packaging & Price (No Stock display)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text("Cond. : ${product.packaging}", fontSize = 13.sp, fontWeight = FontWeight.SemiBold, color = TextPrimaryDark)
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

@Composable
fun ProductsTableView(
    products: List<Product>,
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
            // Header Row (No Stock column)
            Row(
                modifier = Modifier
                    .background(DarkSurface)
                    .padding(vertical = 10.dp, horizontal = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                TableCell("Réf.", width = 80.dp, header = true)
                TableCell("Désignation Produit", width = 200.dp, header = true)
                TableCell("Viscosité", width = 90.dp, header = true)
                TableCell("Conditionnement", width = 140.dp, header = true)
                TableCell("Prix TTC", width = 110.dp, header = true)
                TableCell("Actions", width = 100.dp, header = true)
            }

            HorizontalDivider(color = BardahlCardBorder)

            // Rows
            LazyColumn(modifier = Modifier.heightIn(max = 500.dp)) {
                items(products) { product ->
                    Row(
                        modifier = Modifier.padding(vertical = 10.dp, horizontal = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        TableCell(product.reference, width = 80.dp, bold = true)
                        TableCell(product.name, width = 200.dp)
                        TableCell(product.viscosity ?: "N/A", width = 90.dp, highlight = !product.viscosity.isNullOrBlank())
                        TableCell(product.packaging, width = 140.dp)
                        TableCell("${String.format("%.2f", product.unitPriceTtc)} DH", width = 110.dp, gold = true)
                        Row(modifier = Modifier.width(100.dp)) {
                            IconButton(onClick = { onEdit(product) }, modifier = Modifier.size(28.dp)) {
                                Icon(Icons.Default.Edit, contentDescription = "Modifier", tint = BardahlYellow, modifier = Modifier.size(16.dp))
                            }
                            IconButton(onClick = { onDelete(product) }, modifier = Modifier.size(28.dp)) {
                                Icon(Icons.Default.Delete, contentDescription = "Supprimer", tint = StatusCancelled, modifier = Modifier.size(16.dp))
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
    var viscosity by remember { mutableStateOf(initialProduct?.viscosity ?: "") }
    var packaging by remember { mutableStateOf(initialProduct?.packaging ?: "12 X 1l") }
    var priceTtcStr by remember { mutableStateOf(initialProduct?.unitPriceTtc?.toString() ?: "") }
    var selectedCategoryId by remember { mutableStateOf(initialProduct?.categoryId ?: "LUB_AUTO") }
    var categoryExpanded by remember { mutableStateOf(false) }

    val categories = listOf(
        CategoryFilterItem("LUB_AUTO", "Lubrifiants Auto"),
        CategoryFilterItem("ADDITIFS", "Additifs"),
        CategoryFilterItem("FLUIDES_LR", "Fluides & Refroidissement"),
        CategoryFilterItem("IND_GRAISSES", "Graisses"),
        CategoryFilterItem("IND_AEROSOLS", "Aérosols"),
        CategoryFilterItem("IND_ALIM", "Alimentaire")
    )

    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = DarkSurface,
        title = { Text(title, color = TextPrimaryDark, fontWeight = FontWeight.Bold) },
        text = {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                // Product Name
                LabeledInputField("Désignation Produit *") {
                    BardahlTextField(name, { name = it }, "Nom du produit")
                }

                // Category Selector Dropdown
                LabeledInputField("Gamme / Catégorie *") {
                    Box(modifier = Modifier.fillMaxWidth()) {
                        OutlinedButton(
                            onClick = { categoryExpanded = true },
                            modifier = Modifier.fillMaxWidth(),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = TextPrimaryDark),
                            border = ButtonDefaults.outlinedButtonBorder.copy(brush = androidx.compose.ui.graphics.SolidColor(BardahlCardBorder))
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    categories.find { it.code == selectedCategoryId }?.label ?: "Lubrifiants Auto",
                                    color = TextPrimaryDark,
                                    fontSize = 13.sp
                                )
                                Icon(Icons.Default.ArrowDropDown, contentDescription = null, tint = BardahlYellow)
                            }
                        }
                        DropdownMenu(
                            expanded = categoryExpanded,
                            onDismissRequest = { categoryExpanded = false },
                            modifier = Modifier.background(DarkSurface)
                        ) {
                            categories.forEach { cat ->
                                DropdownMenuItem(
                                    text = { Text(cat.label, color = TextPrimaryDark) },
                                    onClick = {
                                        selectedCategoryId = cat.code
                                        categoryExpanded = false
                                    }
                                )
                            }
                        }
                    }
                }

                // Reference & Code
                LabeledInputField("Référence") {
                    BardahlTextField(reference, { reference = it }, "Ex: 34131")
                }
                LabeledInputField("Code Produit") {
                    BardahlTextField(code, { code = it }, "Ex: XTRA-10W40-1L")
                }

                // Viscosity & Packaging
                LabeledInputField("Viscosité") {
                    BardahlTextField(viscosity, { viscosity = it }, "Ex: 10W40 ou N/A")
                }
                LabeledInputField("Conditionnement") {
                    BardahlTextField(packaging, { packaging = it }, "Ex: 12 X 1l")
                }

                // Price TTC
                LabeledInputField("Prix TTC / Unité (DH) *") {
                    BardahlTextField(priceTtcStr, { priceTtcStr = it }, "Prix en DH")
                }
            }
        },
        confirmButton = {
            BardahlButton(
                text = "ENREGISTRER",
                onClick = {
                    if (name.isNotBlank()) {
                        val price = priceTtcStr.toDoubleOrNull() ?: 0.0
                        onSave(
                            Product(
                                id = initialProduct?.id ?: "p${System.currentTimeMillis()}",
                                categoryId = selectedCategoryId,
                                code = code.ifBlank { name.uppercase().replace(" ", "-") },
                                reference = reference.ifBlank { "REF-${(1000..9999).random()}" },
                                name = name,
                                description = "Gamme officielle Bardahl Maroc",
                                viscosity = viscosity.ifBlank { null },
                                packaging = packaging,
                                unitPriceTtc = price,
                                stockQuantity = 999999
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
private fun LabeledInputField(label: String, content: @Composable () -> Unit) {
    Column(modifier = Modifier.fillMaxWidth()) {
        Text(label, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = BardahlYellow)
        Spacer(modifier = Modifier.height(4.dp))
        content()
    }
}
