import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { BARDAHL_LOGO_BASE64 } from './logoBase64'

export function generateOrderPdf(order) {
  const doc = new jsPDF()

  // 1. Top Header Bar & Official Bardahl Logo
  doc.setFillColor(255, 208, 0)
  doc.rect(0, 0, 210, 5, 'F')

  // Draw Official Bardahl Logo Image (Checkered Flag + Yellow Background)
  try {
    doc.addImage(BARDAHL_LOGO_BASE64, 'PNG', 14, 8, 52, 32)
  } catch (e) {
    console.error("Error drawing logo base64:", e)
  }

  // Top Far-Right Aligned Official Company Registration
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(13, 15, 18)
  doc.text("BARDAHL - MAGHREB", 196, 15, { align: 'right' })

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(50, 50, 50)
  doc.text("S.A. au Capital de 1.800.000 DHs", 196, 20, { align: 'right' })
  doc.text("107, Rue Amir Abdelkader - CASABLANCA 20 300", 196, 24, { align: 'right' })
  doc.text("Tél. : 05 22 61 89 56 - Fax : 05 22 62 03 05", 196, 28, { align: 'right' })
  doc.text("E-mail : bardahlmaghreb@menara.ma | www.bardahl.ma", 196, 32, { align: 'right' })
  doc.text("R.C. 44907 Casa - B.P. 2177 - Patente 31400690 - I.F. : 01620063", 196, 36, { align: 'right' })
  doc.text("C.C.P. Rabat 147213 P - C.N.S.S. 1601716 - I.C.E. : 000084015000037", 196, 40, { align: 'right' })

  // Golden Divider Bar
  doc.setDrawColor(255, 208, 0)
  doc.setLineWidth(1)
  doc.line(14, 44, 196, 44)

  // 2. Document Title Box
  doc.setFillColor(20, 23, 31)
  doc.roundedRect(14, 48, 182, 12, 2, 2, 'F')
  doc.setTextColor(255, 208, 0)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text("BON DE COMMANDE N° : " + (order.orderNumber || "BC-2026-004334"), 18, 56)

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text("Casablanca, le : " + (order.date || new Date().toISOString().substring(0, 10)), 140, 56)

  // 3. Client & Commercial & Mode Expédition Box
  doc.setFillColor(248, 249, 250)
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(14, 64, 182, 24, 3, 3, 'FD')

  doc.setTextColor(13, 15, 18)
  doc.setFontSize(9.5)
  doc.setFont('helvetica', 'bold')
  doc.text("INFORMATIONS CLIENT", 18, 71)
  doc.text("MODALITÉS DE LA COMMANDE", 115, 71)

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(74, 85, 104)
  doc.text("Raison Sociale : " + (order.clientName || "-"), 18, 77)
  doc.text("Commercial Responsable : " + (order.commercialName || "Karim Benjelloun"), 18, 83)

  doc.text("Mode de Paiement : " + (order.paymentMethod || "Chèque"), 115, 77)
  doc.text("Mode d'Expédition : " + (order.modeExpedition || "Transport Bardahl"), 115, 83)

  // 4. Products Table (With Robust Fallback for Items)
  let itemsList = (order.items && order.items.length > 0)
    ? order.items
    : (order.products && order.products.length > 0)
    ? order.products
    : []

  // If no items list present, build a smart default item matching order.totalTtc
  if (itemsList.length === 0) {
    const totalTtc = order.totalTtc || 165.0
    itemsList = [
      {
        reference: '34131',
        productName: 'Bardahl XTRA 10W40 1L (Huile Moteur)',
        qty: 1,
        priceTtc: totalTtc,
        remise: 0
      }
    ]
  }

  const rows = itemsList.map(i => {
    const ref = i.reference || i.productReference || i.code || '34131'
    const name = i.productName || i.name || i.product_name || 'Produit Bardahl'
    const qty = parseInt(i.qty || i.quantity || 1)
    const priceTtc = parseFloat(i.priceTtc || i.unitPriceTtc || i.unit_price || i.price || 0)
    const remise = parseFloat(i.remise || i.discount || i.discountPercentage || 0)
    const lineTotal = (priceTtc * qty * (1 - (remise / 100)))

    return [
      ref,
      name,
      qty.toString(),
      priceTtc.toFixed(2) + " DH",
      remise > 0 ? remise + "%" : "-",
      lineTotal.toFixed(2) + " DH"
    ]
  })

  doc.autoTable({
    startY: 92,
    head: [['Réf.', 'Désignation de la Marchandise', 'Qté', 'Prix U. TTC', 'Remise', 'Total TTC']],
    body: rows,
    headStyles: {
      fillColor: [20, 23, 31],
      textColor: [255, 208, 0],
      fontStyle: 'bold',
      fontSize: 8.5
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [26, 32, 44]
    },
    alternateRowStyles: {
      fillColor: [247, 250, 252]
    },
    theme: 'grid'
  })

  // 5. Remarques, Totals & Signatures
  let finalY = doc.lastAutoTable.finalY + 8

  // Optional Remarque Box if specified
  if (order.remarque && order.remarque.trim()) {
    doc.setFillColor(248, 249, 250)
    doc.setDrawColor(255, 208, 0)
    doc.roundedRect(14, finalY, 182, 14, 2, 2, 'FD')
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(13, 15, 18)
    doc.text("REMARQUES / INSTRUCTIONS DE LIVRAISON :", 18, finalY + 5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(74, 85, 104)
    doc.text(order.remarque, 18, finalY + 10)
    finalY += 18
  }

  // Totals Box Right
  doc.setFillColor(248, 249, 250)
  doc.setDrawColor(203, 213, 224)
  doc.roundedRect(120, finalY, 76, 38, 3, 3, 'FD')

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(45, 55, 72)
  doc.text("Total HT :", 125, finalY + 8)
  doc.text((order.totalHt || 0).toFixed(2) + " DH", 188, finalY + 8, { align: 'right' })

  if (order.totalDiscount > 0) {
    doc.setTextColor(229, 57, 53)
    doc.text("Remise Commerciale :", 125, finalY + 15)
    doc.text("-" + order.totalDiscount.toFixed(2) + " DH", 188, finalY + 15, { align: 'right' })
    doc.setTextColor(45, 55, 72)
  }

  doc.text("TVA (20%) :", 125, finalY + 22)
  doc.text((order.totalTva || 0).toFixed(2) + " DH", 188, finalY + 22, { align: 'right' })

  // Total Net TTC Banner
  doc.setFillColor(255, 208, 0)
  doc.roundedRect(123, finalY + 26, 70, 9, 2, 2, 'F')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(13, 15, 18)
  doc.text("TOTAL NET TTC :", 126, finalY + 32)
  doc.text((order.totalTtc || 0).toFixed(2) + " DH", 190, finalY + 32, { align: 'right' })

  // Signatures Left Box
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(26, 32, 44)
  doc.text("Signature et Cachet du Client :", 14, finalY + 8)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.text("(Mention obligatoire 'Lu et Approuvé')", 14, finalY + 12)

  doc.setDrawColor(203, 213, 224)
  doc.roundedRect(14, finalY + 15, 95, 23, 2, 2, 'D')

  // Footer
  doc.setDrawColor(255, 208, 0)
  doc.line(14, 280, 196, 280)
  doc.setFontSize(7)
  doc.setTextColor(113, 128, 150)
  doc.text("BARDAHL MAGHREB S.A - 107, Rue Amir Abdelkader, Casablanca - ICE: 000084015000037 - RC: 44907 Casa", 105, 285, { align: 'center' })

  doc.save(`${order.orderNumber || 'Bon_de_Commande'}.pdf`)
}

/**
 * Generate Professional Client Financial & CA Statement PDF Report
 */
export function generateClientPdf(client, clientOrders = []) {
  const doc = new jsPDF()

  // 1. Top Header Bar & Official Bardahl Logo
  doc.setFillColor(255, 208, 0)
  doc.rect(0, 0, 210, 5, 'F')

  try {
    doc.addImage(BARDAHL_LOGO_BASE64, 'PNG', 14, 8, 52, 32)
  } catch (e) {
    console.error("Error drawing logo base64:", e)
  }

  // Right Aligned Company Information
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(13, 15, 18)
  doc.text("BARDAHL - MAGHREB", 196, 15, { align: 'right' })

  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(50, 50, 50)
  doc.text("S.A. au Capital de 1.800.000 DHs", 196, 20, { align: 'right' })
  doc.text("107, Rue Amir Abdelkader - CASABLANCA 20 300", 196, 24, { align: 'right' })
  doc.text("Tél. : 05 22 61 89 56 - Fax : 05 22 62 03 05", 196, 28, { align: 'right' })
  doc.text("E-mail : bardahlmaghreb@menara.ma | www.bardahl.ma", 196, 32, { align: 'right' })
  doc.text("R.C. 44907 Casa - B.P. 2177 - Patente 31400690 - I.F. : 01620063", 196, 36, { align: 'right' })
  doc.text("C.C.P. Rabat 147213 P - C.N.S.S. 1601716 - I.C.E. : 000084015000037", 196, 40, { align: 'right' })

  // Golden Divider Line
  doc.setDrawColor(255, 208, 0)
  doc.setLineWidth(1)
  doc.line(14, 44, 196, 44)

  // 2. Document Title Box
  doc.setFillColor(20, 23, 31)
  doc.roundedRect(14, 48, 182, 12, 2, 2, 'F')
  doc.setTextColor(255, 208, 0)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text("FICHE & RELEVÉ DU CHIFFRE D'AFFAIRES CLIENT", 18, 56)

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.text("Édité le : " + new Date().toLocaleDateString('fr-FR'), 190, 56, { align: 'right' })

  // 3. Client Informations Card Box
  doc.setFillColor(248, 249, 250)
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(14, 64, 182, 30, 3, 3, 'FD')

  doc.setTextColor(13, 15, 18)
  doc.setFontSize(9.5)
  doc.setFont('helvetica', 'bold')
  doc.text("INFORMATIONS DE L'ENTREPRISE", 18, 71)
  doc.text("VILLE & CONTACT", 115, 71)

  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(74, 85, 104)
  doc.text("Raison Sociale : " + (client.companyName || "-"), 18, 77)
  doc.text("ICE : " + (client.ice || "-") + "  |  RC : " + (client.rc || "-"), 18, 83)
  doc.text("Secteur / Type : " + (client.type || "Garage"), 18, 89)

  doc.text("Ville / Adresse : " + (client.city || "-") + " (" + (client.address || "-") + ")", 115, 77)
  doc.text("Téléphone : " + (client.phone || "-"), 115, 83)
  doc.text("Commercial Suivi : " + (client.commercialName || "Karim Benjelloun"), 115, 89)

  // 4. Financial Calculations Summary Box (4 Perfectly Centered Columns)
  const totalCaTtc = clientOrders.reduce((sum, o) => sum + (parseFloat(o.totalTtc) || 0), 0)
  const totalHt = totalCaTtc / 1.20
  const totalTva = totalCaTtc - totalHt
  const countValidated = clientOrders.filter(o => (o.status || '').toUpperCase() === 'VALIDATED').length

  doc.setFillColor(20, 23, 31)
  doc.roundedRect(14, 98, 182, 22, 3, 3, 'F')

  // Column Center Coordinates:
  // Col 1: 14..59.5 (Center = 36.75)
  // Col 2: 59.5..105 (Center = 82.25)
  // Col 3: 105..150.5 (Center = 127.75)
  // Col 4: 150.5..196 (Center = 173.25)

  // Subtle Column Separators inside Black Box
  doc.setDrawColor(50, 60, 75)
  doc.setLineWidth(0.3)
  doc.line(59.5, 100, 59.5, 118)
  doc.line(105, 100, 105, 118)
  doc.line(150.5, 100, 150.5, 118)

  // Column Headers
  doc.setFontSize(7)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(160, 174, 192)
  doc.text("CA TOTAL (TTC)", 36.75, 105, { align: 'center' })
  doc.text("TOTAL HT (NET)", 82.25, 105, { align: 'center' })
  doc.text("TVA (20%)", 127.75, 105, { align: 'center' })
  doc.text("BONS COMMANDES", 173.25, 105, { align: 'center' })

  // Column Values
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  
  doc.setTextColor(255, 208, 0)
  doc.text(totalCaTtc.toFixed(2) + " DH", 36.75, 114, { align: 'center' })

  doc.setTextColor(255, 255, 255)
  doc.text(totalHt.toFixed(2) + " DH", 82.25, 114, { align: 'center' })
  doc.text(totalTva.toFixed(2) + " DH", 127.75, 114, { align: 'center' })
  
  doc.setFontSize(9)
  doc.text(`${countValidated} Validés / ${clientOrders.length}`, 173.25, 114, { align: 'center' })

  // 5. Order History Table
  const tableRows = clientOrders.map(o => [
    o.orderNumber || '-',
    o.date || '-',
    o.paymentMethod || 'Chèque',
    o.modeExpedition || 'Transport Bardahl',
    (o.status || 'DRAFT').toUpperCase(),
    (parseFloat(o.totalHt) || 0).toFixed(2) + " DH",
    (parseFloat(o.totalTtc) || 0).toFixed(2) + " DH"
  ])

  doc.autoTable({
    startY: 124,
    head: [['N° Bon', 'Date', 'Paiement', 'Expédition', 'Statut', 'Total HT', 'Total TTC']],
    body: tableRows.length > 0 ? tableRows : [['-', '-', '-', '-', '-', '0.00 DH', '0.00 DH']],
    headStyles: {
      fillColor: [20, 23, 31],
      textColor: [255, 208, 0],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [26, 32, 44],
      halign: 'center'
    },
    alternateRowStyles: {
      fillColor: [247, 250, 252]
    },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'center' },
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { fontStyle: 'bold', halign: 'center' },
      5: { halign: 'right' },
      6: { fontStyle: 'bold', halign: 'right' }
    },
    theme: 'grid'
  })

  // Footer
  let finalY = doc.lastAutoTable.finalY + 12
  if (finalY < 270) {
    doc.setDrawColor(255, 208, 0)
    doc.line(14, 280, 196, 280)
    doc.setFontSize(7)
    doc.setTextColor(113, 128, 150)
    doc.text("BARDAHL MAGHREB S.A - Document Officiel d'Analyse du Portefeuille Clients - ICE: 000084015000037", 105, 285, { align: 'center' })
  }

  const safeFileName = (client.companyName || 'Client').replace(/[^a-zA-Z0-9]/g, '_')
  doc.save(`Releve_CA_Bardahl_${safeFileName}.pdf`)
}
