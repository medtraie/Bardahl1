import * as XLSX from 'xlsx'

export function exportOrdersToExcel(orders) {
  const data = orders.map(o => ({
    "N° Bon": o.orderNumber,
    "Date": o.date,
    "Commercial": o.commercialName,
    "Client": o.clientName,
    "Total HT (DH)": o.totalHt,
    "TVA (DH)": o.totalTva,
    "Total TTC (DH)": o.totalTtc,
    "Statut": o.status
  }))

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Commandes")
  XLSX.writeFile(workbook, "Bardahl_Export_Commandes.xlsx")
}

export function exportDevisToExcel(devisList) {
  const data = devisList.map(d => ({
    "N° Devis": d.devisNumber,
    "Date Émission": d.date,
    "Date Validité": d.validityDate || '-',
    "Commercial": d.commercialName,
    "Client": d.clientName,
    "Ville Client": d.clientCity || '-',
    "ICE Client": d.clientIce || '-',
    "Nombre d'Articles": (d.items || []).length,
    "Total HT (DH)": d.totalHt,
    "TVA (DH)": d.totalTva,
    "Total TTC (DH)": d.totalTtc,
    "Remise (DH)": d.totalDiscount || 0,
    "Statut": d.status,
    "Bon de Commande Associé": d.convertedOrderNumber || '-'
  }))

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Devis")
  XLSX.writeFile(workbook, `Bardahl_Export_Devis_${new Date().toISOString().substring(0, 10)}.xlsx`)
}

export function exportStockMovementsToExcel(movements, promoNameFilter = 'Toutes') {
  const data = movements.map(m => ({
    "Date": m.date,
    "N° Bon": m.orderNumber || '-',
    "Type Mouvement": m.typeLabel,
    "Réf. Produit": m.reference,
    "Désignation Produit": m.productName,
    "Gamme / Famille": m.category || 'Bardahl',
    "Quantité (Cartons)": m.cartons,
    "Quantité (Unités)": m.units,
    "Offre Commerciale": m.promoName || 'Standard',
    "Client": m.clientName || '-',
    "Commercial": m.commercialName || '-',
    "Stock Restant Dispo": `${m.remainingStock} un.`
  }))

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Mouvements de Stock")
  
  const cleanFilter = (promoNameFilter || 'Global').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30)
  XLSX.writeFile(workbook, `Bardahl_Mouvements_Stock_${cleanFilter}.xlsx`)
}
