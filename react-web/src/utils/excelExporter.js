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

export function exportMacDevicesToExcel(commercialsWithDevices, auditLogs = []) {
  // Sheet 1: Devices
  const devicesData = []
  commercialsWithDevices.forEach(comm => {
    const devices = comm.devices || []
    if (devices.length === 0) {
      devicesData.push({
        "Matricule": comm.matricule,
        "Commercial": comm.name,
        "Email": comm.email,
        "Région": (comm.regions || []).join(', ') || comm.city || '-',
        "Filtrage MAC": comm.isMacFilteringActive !== false ? 'ACTIVÉ' : 'DÉSACTIVÉ',
        "Appareils Autorisés": '0 / 3',
        "Adresse MAC": 'Aucun appareil',
        "Nom de l'Appareil": '-',
        "Modèle Appareil": '-',
        "Statut Appareil": '-',
        "Dernière Connexion": comm.lastLogin?.date ? new Date(comm.lastLogin.date).toLocaleString('fr-FR') : 'Jamais connecté',
        "Dernier Modèle Utilisé": comm.lastLogin?.deviceModel || '-'
      })
    } else {
      devices.forEach((d, idx) => {
        devicesData.push({
          "Matricule": comm.matricule,
          "Commercial": comm.name,
          "Email": comm.email,
          "Région": (comm.regions || []).join(', ') || comm.city || '-',
          "Filtrage MAC": comm.isMacFilteringActive !== false ? 'ACTIVÉ' : 'DÉSACTIVÉ',
          "Appareils Autorisés": `${devices.length} / 3`,
          "Adresse MAC": d.macAddress,
          "Nom de l'Appareil": d.deviceName || `Appareil #${idx + 1}`,
          "Modèle Appareil": d.deviceModel || '-',
          "Statut Appareil": d.isActive !== false ? 'AUTORISÉ' : 'DÉSACTIVÉ',
          "Dernière Connexion": comm.lastLogin?.date ? new Date(comm.lastLogin.date).toLocaleString('fr-FR') : 'Jamais connecté',
          "Dernier Modèle Utilisé": comm.lastLogin?.deviceModel || '-'
        })
      })
    }
  })

  // Sheet 2: Audit Logs
  const logsData = auditLogs.map(l => ({
    "Date & Heure": new Date(l.createdAt || l.created_at || Date.now()).toLocaleString('fr-FR'),
    "Commercial": l.commercialName || l.commercial_name || '-',
    "Adresse MAC Tentée": l.attemptedMac || l.attempted_mac || '-',
    "Modèle de l'Appareil": l.deviceModel || l.device_model || '-',
    "Statut": l.status || 'BLOCKED',
    "Motif": l.reason || '-'
  }))

  const workbook = XLSX.utils.book_new()
  const wsDevices = XLSX.utils.json_to_sheet(devicesData)
  XLSX.utils.book_append_sheet(workbook, wsDevices, "Appareils Autorisés")

  if (logsData.length > 0) {
    const wsLogs = XLSX.utils.json_to_sheet(logsData)
    XLSX.utils.book_append_sheet(workbook, wsLogs, "Journal de Sécurité")
  }

  const dateStr = new Date().toISOString().substring(0, 10)
  XLSX.writeFile(workbook, `Bardahl_Audit_Securite_MAC_${dateStr}.xlsx`)
}
