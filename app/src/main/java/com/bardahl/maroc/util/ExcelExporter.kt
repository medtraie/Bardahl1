package com.bardahl.maroc.util

import android.content.Context
import com.bardahl.maroc.domain.model.Order
import java.io.File
import java.io.FileWriter

object ExcelExporter {

    fun exportOrdersToCsv(context: Context, orders: List<Order>): File {
        val file = File(context.cacheDir, "Bardahl_Export_Commandes_${System.currentTimeMillis()}.csv")
        FileWriter(file).use { writer ->
            // Write CSV Header
            writer.append("N° Commande,Date,Commercial,Client,Statut,Total HT (DH),TVA (DH),Total TTC (DH)\n")

            // Write Data Rows
            orders.forEach { order ->
                writer.append("\"${order.orderNumber}\",")
                writer.append("\"${order.orderDate}\",")
                writer.append("\"${order.commercialName}\",")
                writer.append("\"${order.clientName}\",")
                writer.append("\"${order.status.label}\",")
                writer.append("${order.totalHt},")
                writer.append("${order.totalTva},")
                writer.append("${order.totalTtc}\n")
            }
        }
        return file
    }
}
