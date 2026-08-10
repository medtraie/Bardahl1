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
