package com.bardahl.maroc.util

import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.pdf.PdfDocument
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import com.bardahl.maroc.R
import com.bardahl.maroc.domain.model.Client
import com.bardahl.maroc.domain.model.Order
import com.bardahl.maroc.domain.model.Devis
import com.bardahl.maroc.domain.model.CompanyInfo
import java.io.File
import java.io.FileOutputStream

object PdfGenerator {

    fun generateOrderPdf(context: Context, order: Order): File {
        val pdfDocument = PdfDocument()
        // Standard A4 Size: 595 x 842 points
        val pageInfo = PdfDocument.PageInfo.Builder(595, 842, 1).create()
        val page = pdfDocument.startPage(pageInfo)
        val canvas: Canvas = page.canvas

        val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        val textPaint = Paint(Paint.ANTI_ALIAS_FLAG)
        val rightAlignPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            textAlign = Paint.Align.RIGHT
        }

        // =========================================================================
        // 1. TOP HEADER: LOGO (LEFT) + FAR-RIGHT ALIGNED COMPANY REGISTRATION (RIGHT)
        // =========================================================================

        // Draw Official Bardahl Logo Bitmap at Top-Left (x=30, y=20, w=145, h=95)
        val logoBitmap = getBitmapFromVectorDrawable(context, R.drawable.ic_bardahl_official_logo, 145, 95)
            ?: getBitmapFromVectorDrawable(context, R.drawable.ic_bardahl_logo, 145, 95)
        if (logoBitmap != null) {
            canvas.drawBitmap(logoBitmap, 30f, 20f, paint)
        }

        // Draw Official BARDAHL - MAGHREB Header Info FLUSH TO FAR RIGHT MARGIN (x=565f)
        rightAlignPaint.color = Color.parseColor("#0D0F12")
        rightAlignPaint.textSize = 18f
        rightAlignPaint.isFakeBoldText = true
        canvas.drawText("BARDAHL - MAGHREB", 565f, 32f, rightAlignPaint)

        rightAlignPaint.textSize = 8.2f
        rightAlignPaint.isFakeBoldText = false
        rightAlignPaint.color = Color.parseColor("#222222")

        canvas.drawText(CompanyInfo.CAPITAL, 565f, 45f, rightAlignPaint)
        canvas.drawText(CompanyInfo.ADDRESS, 565f, 56f, rightAlignPaint)
        canvas.drawText("Tél. : ${CompanyInfo.PHONES}", 565f, 67f, rightAlignPaint)
        canvas.drawText("Email : ${CompanyInfo.EMAIL} | Site web : ${CompanyInfo.WEBSITE}", 565f, 78f, rightAlignPaint)
        canvas.drawText("R.C. : ${CompanyInfo.RC} - T.P. : ${CompanyInfo.TP} - I.F. : ${CompanyInfo.IF}", 565f, 89f, rightAlignPaint)
        canvas.drawText("C.N.S.S. : ${CompanyInfo.CNSS} - ICE : ${CompanyInfo.ICE}", 565f, 100f, rightAlignPaint)

        // Golden Divider Bar under Header
        paint.color = Color.parseColor("#FFD000")
        paint.strokeWidth = 3.5f
        canvas.drawLine(30f, 112f, 565f, 112f, paint)
        paint.strokeWidth = 1f

        // =========================================================================
        // 2. DOCUMENT TITLE BANNER: BON DE COMMANDE N° & DATE
        // =========================================================================
        paint.color = Color.parseColor("#14171F")
        canvas.drawRoundRect(RectF(30f, 120f, 565f, 150f), 6f, 6f, paint)

        textPaint.color = Color.parseColor("#FFD000")
        textPaint.textSize = 13.5f
        textPaint.isFakeBoldText = true
        canvas.drawText("BON DE COMMANDE N° : ${order.orderNumber}", 42f, 140f, textPaint)

        textPaint.color = Color.WHITE
        textPaint.textSize = 10.5f
        textPaint.isFakeBoldText = false
        canvas.drawText("Casablanca, le : ${order.orderDate}", 385f, 140f, textPaint)

        // =========================================================================
        // 3. CLIENT & COMMERCIAL INFORMATIONS BOX
        // =========================================================================
        paint.color = Color.parseColor("#F8F9FA")
        canvas.drawRoundRect(RectF(30f, 158f, 565f, 230f), 8f, 8f, paint)
        paint.color = Color.parseColor("#CBD5E0")
        paint.style = Paint.Style.STROKE
        canvas.drawRoundRect(RectF(30f, 158f, 565f, 230f), 8f, 8f, paint)
        paint.style = Paint.Style.FILL

        textPaint.color = Color.parseColor("#0D0F12")
        textPaint.textSize = 10.5f
        textPaint.isFakeBoldText = true
        canvas.drawText("INFORMATIONS CLIENT", 42f, 175f, textPaint)
        canvas.drawText("MODALITÉS DE LA COMMANDE", 315f, 175f, textPaint)

        textPaint.isFakeBoldText = false
        textPaint.textSize = 9.5f
        textPaint.color = Color.parseColor("#4A5568")

        // Left Column (Client Info)
        canvas.drawText("Raison Sociale : ${order.clientName}", 42f, 192f, textPaint)
        canvas.drawText("Commercial Responsable : ${order.commercialName}", 42f, 206f, textPaint)
        canvas.drawText("Code I.C.E. Client : 001548792000088", 42f, 220f, textPaint)

        // Right Column (Order Conditions & Payment Method & Expedition)
        canvas.drawText("Mode de Paiement : ${order.paymentMethod}", 315f, 192f, textPaint)
        canvas.drawText("Mode d'Expédition : ${order.modeExpedition}", 315f, 206f, textPaint)
        canvas.drawText("Statut Commande : ${order.status.label}", 315f, 220f, textPaint)

        // Optional Remarks & Promotions Box
        var tableTop = 240f
        val hasRemarque = !order.remarque.isNullOrBlank()
        val hasPromoNote = !order.promoNote.isNullOrBlank()

        if (hasRemarque || hasPromoNote) {
            val boxHeight = if (hasRemarque && hasPromoNote) 38f else 24f
            paint.color = Color.parseColor("#F8F9FA")
            canvas.drawRoundRect(RectF(30f, 236f, 565f, 236f + boxHeight), 6f, 6f, paint)
            paint.color = Color.parseColor("#FFD000")
            paint.style = Paint.Style.STROKE
            canvas.drawRoundRect(RectF(30f, 236f, 565f, 236f + boxHeight), 6f, 6f, paint)
            paint.style = Paint.Style.FILL

            var textY = 250f
            if (hasPromoNote) {
                textPaint.color = Color.parseColor("#2E7D32")
                textPaint.textSize = 8.5f
                textPaint.isFakeBoldText = true
                canvas.drawText("OFFRE PROMOTIONNELLE : ${order.promoNote}", 42f, textY, textPaint)
                textY += 13f
            }
            if (hasRemarque) {
                textPaint.color = Color.parseColor("#0D0F12")
                textPaint.textSize = 8.5f
                textPaint.isFakeBoldText = true
                canvas.drawText("Instructions de livraison : ${order.remarque}", 42f, textY, textPaint)
            }
            tableTop = 244f + boxHeight
        }

        // =========================================================================
        // 4. HIGH-PRECISION STRUCTURED PRODUCTS TABLE
        // =========================================================================
        val headerHeight = 22f

        // Table Header Row Background (Obsidian Dark #14171F)
        paint.color = Color.parseColor("#14171F")
        canvas.drawRect(30f, tableTop, 565f, tableTop + headerHeight, paint)

        // Table Header Column Titles
        textPaint.color = Color.parseColor("#FFD000")
        textPaint.isFakeBoldText = true
        textPaint.textSize = 9f

        canvas.drawText("RÉF.", 35f, tableTop + 15f, textPaint)
        canvas.drawText("DÉSIGNATION DE LA MARCHANDISE", 95f, tableTop + 15f, textPaint)
        canvas.drawText("QTÉ", 295f, tableTop + 15f, textPaint)
        canvas.drawText("GRATUIT", 335f, tableTop + 15f, textPaint)
        canvas.drawText("PRIX U. TTC", 395f, tableTop + 15f, textPaint)
        canvas.drawText("TOTAL TTC", 485f, tableTop + 15f, textPaint)

        // Table Data Rows
        var currentY = tableTop + headerHeight + 16f
        textPaint.color = Color.parseColor("#1A202C")
        textPaint.isFakeBoldText = false
        textPaint.textSize = 8.8f

        order.items.forEachIndexed { index, item ->
            val isMultiLine = item.productName.length > 28
            val rowHeight = if (isMultiLine) 30f else 22f

            // Alternate Row Background
            if (index % 2 == 1) {
                paint.color = Color.parseColor("#F7FAFC")
                canvas.drawRect(30f, currentY - 13f, 565f, currentY + rowHeight - 13f, paint)
            }

            // Reference
            canvas.drawText(item.productReference, 35f, currentY, textPaint)

            // Product Name (Clean 2-line Wrapping if needed)
            if (isMultiLine) {
                val line1 = item.productName.substring(0, 26)
                val line2 = item.productName.substring(26)
                canvas.drawText(line1, 95f, currentY, textPaint)
                canvas.drawText(line2, 95f, currentY + 11f, textPaint)
            } else {
                canvas.drawText(item.productName, 95f, currentY, textPaint)
            }

            // CMD-03: Sur une ligne de produit offert uniquement, la quantité achetée doit être égale à 0,
            // prix unitaire et total à 0,00 DH, et gratuité conservée
            val isGiftOnly = (item.quantity == 0 || item.unitPriceTtc == 0.0 || item.promoTag.contains("Offert", ignoreCase = true) || item.promoTag.contains("Cadeau", ignoreCase = true)) && item.freeQuantity > 0
            val displayQty = if (isGiftOnly) 0 else item.quantity
            val displayPrice = if (isGiftOnly) 0.0 else item.unitPriceTtc
            val displayTotal = if (isGiftOnly) 0.0 else item.totalTtc

            // Quantity Facturée
            canvas.drawText("${displayQty}", 300f, currentY, textPaint)

            // Gratuité (Offert)
            val freeStr = if (item.freeQuantity > 0) "+${item.freeQuantity} Offert" else "-"
            if (item.freeQuantity > 0) {
                textPaint.color = Color.parseColor("#388E3C")
                textPaint.isFakeBoldText = true
            }
            canvas.drawText(freeStr, 335f, currentY, textPaint)
            textPaint.color = Color.parseColor("#1A202C")
            textPaint.isFakeBoldText = false

            // Unit Price TTC
            canvas.drawText(String.format("%.2f DH", displayPrice), 395f, currentY, textPaint)

            // Total Line TTC
            canvas.drawText(String.format("%.2f DH", displayTotal), 485f, currentY, textPaint)

            // Row Separator Line
            paint.color = Color.parseColor("#EDF2F7")
            canvas.drawLine(30f, currentY + rowHeight - 13f, 565f, currentY + rowHeight - 13f, paint)

            currentY += rowHeight
        }

        // Table Borders
        paint.color = Color.parseColor("#CBD5E0")
        paint.style = Paint.Style.STROKE
        canvas.drawRect(30f, tableTop, 565f, Math.max(currentY - 5f, tableTop + 100f), paint)
        paint.style = Paint.Style.FILL

        // =========================================================================
        // 5. FINANCIAL TOTALS BOX & SIGNATURES
        // =========================================================================
        val totalsY = Math.max(currentY + 20f, 580f)

        // Totals Box Background
        paint.color = Color.parseColor("#F8F9FA")
        canvas.drawRoundRect(RectF(335f, totalsY, 565f, totalsY + 125f), 8f, 8f, paint)
        paint.color = Color.parseColor("#CBD5E0")
        paint.style = Paint.Style.STROKE
        canvas.drawRoundRect(RectF(335f, totalsY, 565f, totalsY + 125f), 8f, 8f, paint)
        paint.style = Paint.Style.FILL

        textPaint.color = Color.parseColor("#2D3748")
        textPaint.textSize = 9.5f
        textPaint.isFakeBoldText = false

        canvas.drawText("Montant HT :", 350f, totalsY + 20f, textPaint)
        canvas.drawText(String.format("%.2f DH", order.totalHt), 470f, totalsY + 20f, textPaint)

        if (order.totalFreeItems > 0) {
            textPaint.color = Color.parseColor("#388E3C")
            textPaint.isFakeBoldText = true
            canvas.drawText("Articles Offerts :", 350f, totalsY + 36f, textPaint)
            canvas.drawText("+${order.totalFreeItems} U (0.00 DH)", 470f, totalsY + 36f, textPaint)
            textPaint.color = Color.parseColor("#2D3748")
            textPaint.isFakeBoldText = false
        }

        if (order.totalDiscount > 0) {
            textPaint.color = Color.parseColor("#E53935")
            textPaint.isFakeBoldText = true
            canvas.drawText("Remise Globale :", 350f, totalsY + 52f, textPaint)
            canvas.drawText(String.format("-%.2f DH", order.totalDiscount), 470f, totalsY + 52f, textPaint)
            textPaint.color = Color.parseColor("#2D3748")
            textPaint.isFakeBoldText = false
        }

        if (order.voucherDiscount > 0) {
            textPaint.color = Color.parseColor("#E65100")
            textPaint.isFakeBoldText = true
            canvas.drawText("Bon d'Achat :", 350f, totalsY + 62f, textPaint)
            canvas.drawText(String.format("-%.2f DH", order.voucherDiscount), 470f, totalsY + 62f, textPaint)
            textPaint.color = Color.parseColor("#2D3748")
            textPaint.isFakeBoldText = false
        }

        canvas.drawText("TVA (20%) :", 350f, totalsY + 74f, textPaint)
        canvas.drawText(String.format("%.2f DH", order.totalTva), 470f, totalsY + 74f, textPaint)

        // Total Net TTC Banner (Bardahl Yellow #FFD000)
        paint.color = Color.parseColor("#FFD000")
        canvas.drawRoundRect(RectF(345f, totalsY + 84f, 555f, totalsY + 120f), 6f, 6f, paint)

        textPaint.isFakeBoldText = true
        textPaint.textSize = 11.5f
        textPaint.color = Color.parseColor("#0D0F12")
        canvas.drawText("TOTAL NET TTC :", 355f, totalsY + 100f, textPaint)
        canvas.drawText(String.format("%.2f DH", order.totalTtc), 460f, totalsY + 100f, textPaint)

        // Dual Signature Boxes (Client & Commercial)
        textPaint.color = Color.parseColor("#1A202C")
        textPaint.textSize = 9.5f
        textPaint.isFakeBoldText = true
        canvas.drawText("Signature et Cachet du Client :", 40f, totalsY + 18f, textPaint)
        canvas.drawText("(Mention obligatoire 'Lu et Approuvé')", 40f, totalsY + 30f, textPaint)

        paint.style = Paint.Style.STROKE
        paint.color = Color.parseColor("#CBD5E0")
        canvas.drawRoundRect(RectF(40f, totalsY + 36f, 255f, totalsY + 122f), 6f, 6f, paint)
        paint.style = Paint.Style.FILL

        textPaint.textSize = 8.5f
        textPaint.color = Color.parseColor("#A0AEC0")
        textPaint.isFakeBoldText = false
        canvas.drawText("Visa Agent Commercial / Direction Bardahl", 48f, totalsY + 114f, textPaint)

        // =========================================================================
        // 6. OFFICIAL LEGAL FOOTER
        // =========================================================================
        paint.color = Color.parseColor("#FFD000")
        canvas.drawRect(30f, 810f, 565f, 812f, paint)

        textPaint.textSize = 7.5f
        textPaint.color = Color.parseColor("#718096")
        canvas.drawText(CompanyInfo.FOOTER_LEGAL, 70f, 824f, textPaint)

        pdfDocument.finishPage(page)

        // Save PDF to Cache File
        val safeNumber = order.orderNumber.replace("/", "-").replace(":", "-").replace(" ", "_")
        val pdfFileName = "Bon_de_Commande_${safeNumber}.pdf"
        val outputFile = File(context.cacheDir, pdfFileName)
        FileOutputStream(outputFile).use { pdfDocument.writeTo(it) }
        pdfDocument.close()

        // Export directly to Downloads & Open File Chooser Intent
        downloadAndOpenPdf(context, outputFile, pdfFileName)

        return outputFile
    }

    fun generateClientPdf(context: Context, client: Client, clientOrders: List<Order>): File {
        val pdfDocument = PdfDocument()
        val pageInfo = PdfDocument.PageInfo.Builder(595, 842, 1).create()
        val page = pdfDocument.startPage(pageInfo)
        val canvas: Canvas = page.canvas

        val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        val textPaint = Paint(Paint.ANTI_ALIAS_FLAG)
        val rightAlignPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { textAlign = Paint.Align.RIGHT }

        // Top Logo
        val logoBitmap = getBitmapFromVectorDrawable(context, R.drawable.ic_bardahl_official_logo, 145, 95)
            ?: getBitmapFromVectorDrawable(context, R.drawable.ic_bardahl_logo, 145, 95)
        if (logoBitmap != null) {
            canvas.drawBitmap(logoBitmap, 30f, 20f, paint)
        }

        // Header info
        rightAlignPaint.color = Color.parseColor("#0D0F12")
        rightAlignPaint.textSize = 18f
        rightAlignPaint.isFakeBoldText = true
        canvas.drawText("BARDAHL - MAGHREB", 565f, 32f, rightAlignPaint)

        rightAlignPaint.textSize = 8.2f
        rightAlignPaint.isFakeBoldText = false
        rightAlignPaint.color = Color.parseColor("#222222")
        canvas.drawText("FICHE CLIENT & HISTORIQUE COMMANDES", 565f, 45f, rightAlignPaint)
        canvas.drawText(CompanyInfo.ADDRESS, 565f, 56f, rightAlignPaint)

        // Banner Title
        paint.color = Color.parseColor("#FFD000")
        canvas.drawRoundRect(RectF(30f, 120f, 565f, 155f), 6f, 6f, paint)
        textPaint.color = Color.parseColor("#0D0F12")
        textPaint.textSize = 14f
        textPaint.isFakeBoldText = true
        canvas.drawText("PORTFOLIO : ${client.companyName.uppercase()}", 45f, 142f, textPaint)

        // Client Info Box
        paint.color = Color.parseColor("#F8F9FA")
        canvas.drawRoundRect(RectF(30f, 165f, 565f, 245f), 6f, 6f, paint)
        textPaint.color = Color.parseColor("#2D3748")
        textPaint.textSize = 9.5f
        textPaint.isFakeBoldText = false
        canvas.drawText("Code Client : ${client.ifCode.ifBlank { "-" }}   |   ICE : ${client.ice}   |   RC : ${client.rc}", 45f, 185f, textPaint)
        canvas.drawText("Adresse : ${client.address}, ${client.city} (${client.patente})", 45f, 205f, textPaint)
        canvas.drawText("Téléphone : ${client.phone}   |   Type : ${client.clientType.name}", 45f, 225f, textPaint)

        // Total CA
        val totalCa = clientOrders.sumOf { it.totalTtc }
        paint.color = Color.parseColor("#0D0F12")
        canvas.drawRoundRect(RectF(30f, 255f, 565f, 290f), 6f, 6f, paint)
        textPaint.color = Color.parseColor("#FFD000")
        textPaint.textSize = 11f
        textPaint.isFakeBoldText = true
        canvas.drawText("TOTAL CHIFFRE D'AFFAIRES RÉALISÉ : ${String.format("%.2f DH", totalCa)} (${clientOrders.size} Commandes)", 45f, 277f, textPaint)

        // Orders Table
        var curY = 320f
        paint.color = Color.parseColor("#0D0F12")
        canvas.drawRect(30f, curY, 565f, curY + 22f, paint)
        textPaint.color = Color.parseColor("#FFFFFF")
        textPaint.textSize = 9f
        textPaint.isFakeBoldText = true
        canvas.drawText("N° BON", 40f, curY + 15f, textPaint)
        canvas.drawText("DATE", 160f, curY + 15f, textPaint)
        canvas.drawText("PAIEMENT", 270f, curY + 15f, textPaint)
        canvas.drawText("STATUT", 390f, curY + 15f, textPaint)
        canvas.drawText("TOTAL TTC", 480f, curY + 15f, textPaint)
        curY += 22f

        textPaint.isFakeBoldText = false
        textPaint.color = Color.parseColor("#2D3748")
        if (clientOrders.isEmpty()) {
            canvas.drawText("Aucun bon de commande enregistré pour ce client.", 45f, curY + 20f, textPaint)
        } else {
            for (ord in clientOrders.take(15)) {
                curY += 20f
                canvas.drawText(ord.orderNumber, 40f, curY, textPaint)
                canvas.drawText(ord.orderDate, 160f, curY, textPaint)
                canvas.drawText(ord.paymentMethod, 270f, curY, textPaint)
                canvas.drawText(ord.status.name, 390f, curY, textPaint)
                canvas.drawText(String.format("%.2f DH", ord.totalTtc), 480f, curY, textPaint)
                paint.color = Color.parseColor("#E2E8F0")
                canvas.drawLine(30f, curY + 5f, 565f, curY + 5f, paint)
            }
        }

        // Footer
        paint.color = Color.parseColor("#FFD000")
        canvas.drawRect(30f, 810f, 565f, 812f, paint)
        textPaint.textSize = 7.5f
        textPaint.color = Color.parseColor("#718096")
        canvas.drawText(CompanyInfo.FOOTER_LEGAL, 70f, 824f, textPaint)

        pdfDocument.finishPage(page)

        val safeClient = client.companyName.replace("/", "-").replace(":", "-").replace(" ", "_")
        val pdfFileName = "Fiche_Client_${safeClient}.pdf"
        val outputFile = File(context.cacheDir, pdfFileName)
        FileOutputStream(outputFile).use { pdfDocument.writeTo(it) }
        pdfDocument.close()

        downloadAndOpenPdf(context, outputFile, pdfFileName)
        return outputFile
    }


    fun generateDevisPdf(context: Context, devis: Devis): File {
        val pdfDocument = PdfDocument()
        val pageInfo = PdfDocument.PageInfo.Builder(595, 842, 1).create()
        val page = pdfDocument.startPage(pageInfo)
        val canvas: Canvas = page.canvas

        val paint = Paint(Paint.ANTI_ALIAS_FLAG)
        val textPaint = Paint(Paint.ANTI_ALIAS_FLAG)
        val rightAlignPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            textAlign = Paint.Align.RIGHT
        }

        // 1. Logo (Top Left)
        val logoBitmap = getBitmapFromVectorDrawable(context, R.drawable.ic_bardahl_official_logo, 145, 95)
            ?: getBitmapFromVectorDrawable(context, R.drawable.ic_bardahl_logo, 145, 95)
        if (logoBitmap != null) {
            canvas.drawBitmap(logoBitmap, 30f, 20f, paint)
        }

        // Header Company Info
        rightAlignPaint.color = Color.parseColor("#0D0F12")
        rightAlignPaint.textSize = 18f
        rightAlignPaint.isFakeBoldText = true
        canvas.drawText(CompanyInfo.NAME, 565f, 32f, rightAlignPaint)

        rightAlignPaint.textSize = 8.2f
        rightAlignPaint.isFakeBoldText = false
        rightAlignPaint.color = Color.parseColor("#222222")

        canvas.drawText(CompanyInfo.CAPITAL, 565f, 45f, rightAlignPaint)
        canvas.drawText(CompanyInfo.ADDRESS, 565f, 56f, rightAlignPaint)
        canvas.drawText("Tél. : ${CompanyInfo.PHONES}", 565f, 67f, rightAlignPaint)
        canvas.drawText("Email : ${CompanyInfo.EMAIL} | Site web : ${CompanyInfo.WEBSITE}", 565f, 78f, rightAlignPaint)
        canvas.drawText("R.C. : ${CompanyInfo.RC} - T.P. : ${CompanyInfo.TP} - I.F. : ${CompanyInfo.IF}", 565f, 89f, rightAlignPaint)
        canvas.drawText("C.N.S.S. : ${CompanyInfo.CNSS} - ICE : ${CompanyInfo.ICE}", 565f, 100f, rightAlignPaint)

        // Golden divider
        paint.color = Color.parseColor("#FFD000")
        paint.strokeWidth = 3.5f
        canvas.drawLine(30f, 112f, 565f, 112f, paint)
        paint.strokeWidth = 1f

        // 2. Title Banner
        paint.color = Color.parseColor("#14171F")
        canvas.drawRoundRect(RectF(30f, 120f, 565f, 150f), 6f, 6f, paint)

        textPaint.color = Color.parseColor("#FFD000")
        textPaint.textSize = 13.5f
        textPaint.isFakeBoldText = true
        canvas.drawText("DEVIS ESTIMATIF N° : ${devis.devisNumber}", 42f, 140f, textPaint)

        textPaint.color = Color.WHITE
        textPaint.textSize = 10f
        textPaint.isFakeBoldText = false
        canvas.drawText("Casablanca, le : ${devis.date}", 420f, 140f, textPaint)

        // 3. Client & Modalités Box
        paint.color = Color.parseColor("#F8F9FA")
        canvas.drawRoundRect(RectF(30f, 158f, 565f, 230f), 8f, 8f, paint)
        paint.color = Color.parseColor("#CBD5E0")
        paint.style = Paint.Style.STROKE
        canvas.drawRoundRect(RectF(30f, 158f, 565f, 230f), 8f, 8f, paint)
        paint.style = Paint.Style.FILL

        textPaint.color = Color.parseColor("#0D0F12")
        textPaint.textSize = 10.5f
        textPaint.isFakeBoldText = true
        canvas.drawText("INFORMATIONS CLIENT", 42f, 175f, textPaint)
        canvas.drawText("MODALITÉS DU DEVIS", 315f, 175f, textPaint)

        textPaint.isFakeBoldText = false
        textPaint.textSize = 9.5f
        textPaint.color = Color.parseColor("#4A5568")

        canvas.drawText("Raison Sociale : ${devis.clientName}", 42f, 192f, textPaint)
        canvas.drawText("Commercial Responsable : ${devis.commercialName.ifBlank { "Direction Bardahl" }}", 42f, 206f, textPaint)
        canvas.drawText("Code I.C.E. Client : ${devis.clientIce.ifBlank { "-" }}", 42f, 220f, textPaint)

        canvas.drawText("Mode de Paiement : ${devis.paymentMethod}", 315f, 192f, textPaint)
        canvas.drawText("Mode d'Expédition : ${devis.modeExpedition}", 315f, 206f, textPaint)
        canvas.drawText("Statut Devis : ${devis.status.label}", 315f, 220f, textPaint)

        // 4. Products Table
        var tableTop = 242f
        paint.color = Color.parseColor("#14171F")
        canvas.drawRect(30f, tableTop, 565f, tableTop + 24f, paint)

        textPaint.color = Color.parseColor("#FFD000")
        textPaint.textSize = 8.8f
        textPaint.isFakeBoldText = true
        canvas.drawText("RÉF.", 38f, tableTop + 16f, textPaint)
        canvas.drawText("DÉSIGNATION DE LA MARCHANDISE", 100f, tableTop + 16f, textPaint)
        canvas.drawText("QTÉ", 350f, tableTop + 16f, textPaint)
        canvas.drawText("P.U TTC", 410f, tableTop + 16f, textPaint)
        canvas.drawText("REMISE", 470f, tableTop + 16f, textPaint)
        canvas.drawText("TOTAL TTC", 515f, tableTop + 16f, textPaint)

        var currentY = tableTop + 24f
        textPaint.isFakeBoldText = false
        textPaint.textSize = 8.5f
        textPaint.color = Color.parseColor("#2D3748")

        val itemsList = devis.items
        for ((idx, item) in itemsList.withIndex()) {
            if (currentY > 640f) break
            val isEven = idx % 2 == 0
            paint.color = if (isEven) Color.WHITE else Color.parseColor("#F7FAFC")
            canvas.drawRect(30f, currentY, 565f, currentY + 20f, paint)

            paint.color = Color.parseColor("#E2E8F0")
            canvas.drawLine(30f, currentY + 20f, 565f, currentY + 20f, paint)

            val refText = item.productReference.ifBlank { "REF" }
            val nameText = if (item.productName.length > 36) item.productName.take(34) + "..." else item.productName
            val qtyText = "${item.quantity} un."
            val puText = String.format("%.2f", item.unitPriceTtc)
            val remiseText = if (item.discountPercentage > 0) "${item.discountPercentage.toInt()}%" else "-"
            val totalText = String.format("%.2f DH", item.totalTtc)

            canvas.drawText(refText, 38f, currentY + 14f, textPaint)
            canvas.drawText(nameText, 100f, currentY + 14f, textPaint)
            canvas.drawText(qtyText, 350f, currentY + 14f, textPaint)
            canvas.drawText(puText, 410f, currentY + 14f, textPaint)
            canvas.drawText(remiseText, 475f, currentY + 14f, textPaint)
            canvas.drawText(totalText, 515f, currentY + 14f, textPaint)

            currentY += 20f
        }

        // Border around table
        paint.style = Paint.Style.STROKE
        paint.color = Color.parseColor("#CBD5E0")
        canvas.drawRect(30f, tableTop, 565f, currentY, paint)
        paint.style = Paint.Style.FILL

        // 5. Totals & Signature
        val totalsY = currentY + 15f
        paint.color = Color.parseColor("#F8F9FA")
        canvas.drawRoundRect(RectF(345f, totalsY, 555f, totalsY + 115f), 6f, 6f, paint)
        paint.color = Color.parseColor("#CBD5E0")
        paint.style = Paint.Style.STROKE
        canvas.drawRoundRect(RectF(345f, totalsY, 555f, totalsY + 115f), 6f, 6f, paint)
        paint.style = Paint.Style.FILL

        textPaint.color = Color.parseColor("#2D3748")
        textPaint.textSize = 9.5f
        textPaint.isFakeBoldText = false

        canvas.drawText("Total H.T :", 355f, totalsY + 22f, textPaint)
        canvas.drawText(String.format("%.2f DH", devis.totalHt), 470f, totalsY + 22f, textPaint)

        if (devis.totalDiscount > 0) {
            textPaint.color = Color.parseColor("#E53E3E")
            textPaint.isFakeBoldText = true
            canvas.drawText("Remise Accordée :", 355f, totalsY + 38f, textPaint)
            canvas.drawText(String.format("-%.2f DH", devis.totalDiscount), 470f, totalsY + 38f, textPaint)
            textPaint.color = Color.parseColor("#2D3748")
            textPaint.isFakeBoldText = false
        }

        canvas.drawText("TVA (20%) :", 355f, totalsY + 54f, textPaint)
        canvas.drawText(String.format("%.2f DH", devis.totalTva), 470f, totalsY + 54f, textPaint)

        // Banner Total Net TTC
        paint.color = Color.parseColor("#FFD000")
        canvas.drawRoundRect(RectF(345f, totalsY + 70f, 555f, totalsY + 105f), 6f, 6f, paint)

        textPaint.isFakeBoldText = true
        textPaint.textSize = 11.5f
        textPaint.color = Color.parseColor("#0D0F12")
        canvas.drawText("TOTAL NET TTC :", 355f, totalsY + 92f, textPaint)
        canvas.drawText(String.format("%.2f DH", devis.totalTtc), 460f, totalsY + 92f, textPaint)

        // Signature Left Box
        textPaint.color = Color.parseColor("#1A202C")
        textPaint.textSize = 9f
        textPaint.isFakeBoldText = true
        canvas.drawText("Pour accord (Cachet & Signature Client) :", 40f, totalsY + 18f, textPaint)

        paint.style = Paint.Style.STROKE
        paint.color = Color.parseColor("#CBD5E0")
        canvas.drawRoundRect(RectF(40f, totalsY + 26f, 255f, totalsY + 105f), 6f, 6f, paint)
        paint.style = Paint.Style.FILL

        textPaint.textSize = 8f
        textPaint.color = Color.parseColor("#718096")
        textPaint.isFakeBoldText = false
        canvas.drawText("Validité : 30 jours à dater de l'émission", 48f, totalsY + 98f, textPaint)

        // 6. Footer
        paint.color = Color.parseColor("#FFD000")
        canvas.drawRect(30f, 810f, 565f, 812f, paint)

        textPaint.textSize = 7.5f
        textPaint.color = Color.parseColor("#718096")
        canvas.drawText(CompanyInfo.FOOTER_LEGAL, 70f, 824f, textPaint)

        pdfDocument.finishPage(page)

        val safeNumber = devis.devisNumber.replace("/", "-").replace(":", "-").replace(" ", "_")
        val pdfFileName = "Devis_${safeNumber}.pdf"
        val outputFile = File(context.cacheDir, pdfFileName)
        FileOutputStream(outputFile).use { pdfDocument.writeTo(it) }
        pdfDocument.close()

        downloadAndOpenPdf(context, outputFile, pdfFileName)
        return outputFile
    }

    private fun getBitmapFromVectorDrawable(context: Context, drawableId: Int, width: Int, height: Int): Bitmap? {
        return try {
            val drawable = ContextCompat.getDrawable(context, drawableId) ?: return null
            val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bitmap)
            drawable.setBounds(0, 0, canvas.width, canvas.height)
            drawable.draw(canvas)
            bitmap
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    private fun downloadAndOpenPdf(context: Context, pdfFile: File, fileName: String) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val contentValues = ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, fileName)
                    put(MediaStore.MediaColumns.MIME_TYPE, "application/pdf")
                    put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                }
                val resolver = context.contentResolver
                val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)
                if (uri != null) {
                    resolver.openOutputStream(uri)?.use { output ->
                        pdfFile.inputStream().use { input -> input.copyTo(output) }
                    }
                }
            } else {
                val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                if (!downloadsDir.exists()) downloadsDir.mkdirs()
                val targetFile = File(downloadsDir, fileName)
                pdfFile.copyTo(targetFile, overwrite = true)
            }

            // Launch PDF Viewer / Share chooser
            val contentUri: Uri = FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                pdfFile
            )

            val openIntent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(contentUri, "application/pdf")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            val chooser = Intent.createChooser(openIntent, "Ouvrir ou Télécharger $fileName")
            chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            context.startActivity(chooser)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
