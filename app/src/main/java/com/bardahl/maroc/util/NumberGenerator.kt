package com.bardahl.maroc.util

import com.bardahl.maroc.domain.model.Devis
import com.bardahl.maroc.domain.model.Order
import java.util.Calendar
import java.util.Locale

object NumberGenerator {

    /**
     * Generate sequential Order Number: BC-MM/YY-XXXX
     * e.g., BC-10/26-0001, BC-10/26-0002...
     * Changes month/year automatically (e.g. BC-11/26-0001).
     * Strictly avoids duplicate order numbers.
     */
    fun getNextOrderNumber(existingOrders: List<Order>, calendar: Calendar = Calendar.getInstance()): String {
        val mm = String.format(Locale.US, "%02d", calendar.get(Calendar.MONTH) + 1)
        val yy = String.format(Locale.US, "%02d", calendar.get(Calendar.YEAR) % 100)
        val prefix = "BC-$mm/$yy-"
        val regex = Regex("^BC-$mm/$yy-(\\d+)$", RegexOption.IGNORE_CASE)

        val existingSet = existingOrders.map { it.orderNumber.trim().uppercase() }.toSet()
        var maxSeq = 0
        for (order in existingOrders) {
            val num = order.orderNumber.trim()
            val match = regex.find(num)
            if (match != null) {
                val seq = match.groupValues[1].toIntOrNull() ?: 0
                if (seq > maxSeq) {
                    maxSeq = seq
                }
            }
        }

        var nextSeq = maxSeq + 1
        var candidate = "$prefix${String.format(Locale.US, "%04d", nextSeq)}"
        while (existingSet.contains(candidate.uppercase())) {
            nextSeq++
            candidate = "$prefix${String.format(Locale.US, "%04d", nextSeq)}"
        }
        return candidate
    }

    /**
     * Generate sequential Devis Number: DEV-MM/YY-XXXX
     * e.g., DEV-10/26-0001, DEV-10/26-0002...
     * Changes month/year automatically (e.g. DEV-11/26-0001).
     * Strictly avoids duplicate devis numbers.
     */
    fun getNextDevisNumber(existingDevis: List<Devis>, calendar: Calendar = Calendar.getInstance()): String {
        val mm = String.format(Locale.US, "%02d", calendar.get(Calendar.MONTH) + 1)
        val yy = String.format(Locale.US, "%02d", calendar.get(Calendar.YEAR) % 100)
        val prefix = "DEV-$mm/$yy-"
        val regex = Regex("^DEV-$mm/$yy-(\\d+)$", RegexOption.IGNORE_CASE)

        val existingSet = existingDevis.map { it.devisNumber.trim().uppercase() }.toSet()
        var maxSeq = 0
        for (devis in existingDevis) {
            val num = devis.devisNumber.trim()
            val match = regex.find(num)
            if (match != null) {
                val seq = match.groupValues[1].toIntOrNull() ?: 0
                if (seq > maxSeq) {
                    maxSeq = seq
                }
            }
        }

        var nextSeq = maxSeq + 1
        var candidate = "$prefix${String.format(Locale.US, "%04d", nextSeq)}"
        while (existingSet.contains(candidate.uppercase())) {
            nextSeq++
            candidate = "$prefix${String.format(Locale.US, "%04d", nextSeq)}"
        }
        return candidate
    }
}
