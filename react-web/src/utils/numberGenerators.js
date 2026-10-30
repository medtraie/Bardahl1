/**
 * Number generator utility for Bardahl Maroc
 * Sequential, non-duplicating serial numbers formatted with Month/Year:
 * - Bon de Commande: BC-MM/YY-XXXX (e.g. BC-10/26-0001)
 * - Devis Estimatif: DEV-MM/YY-XXXX (e.g. DEV-10/26-0001)
 *
 * Automatically rolls over with each new month (e.g. BC-11/26-0001).
 * Detects the highest sequence in existing records to guarantee strict succession.
 */

/**
 * Returns the next sequential Order Number: BC-MM/YY-XXXX
 * @param {Array} orders - Existing orders list
 * @param {Date} [date] - Base date (defaults to current date)
 * @returns {string} e.g. "BC-10/26-0001"
 */
export function getNextOrderNumber(orders = [], date = new Date()) {
  const d = date instanceof Date && !isNaN(date) ? date : new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(-2)
  const prefix = `BC-${mm}/${yy}-`
  const regex = new RegExp(`^BC-${mm}\\/${yy}-(\\d+)$`, 'i')
  const existingSet = new Set()

  let maxSeq = 0
  for (const o of orders) {
    const num = (o?.orderNumber || o?.order_number || '').trim()
    if (num) {
      existingSet.add(num.toUpperCase())
      const match = num.match(regex)
      if (match) {
        const seq = parseInt(match[1], 10)
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq
        }
      }
    }
  }

  let nextSeq = maxSeq + 1
  let candidate = `${prefix}${String(nextSeq).padStart(4, '0')}`
  while (existingSet.has(candidate.toUpperCase())) {
    nextSeq++
    candidate = `${prefix}${String(nextSeq).padStart(4, '0')}`
  }
  return candidate
}

/**
 * Returns the next sequential Devis Number: DEV-MM/YY-XXXX
 * @param {Array} devisList - Existing devis list
 * @param {Date} [date] - Base date (defaults to current date)
 * @returns {string} e.g. "DEV-10/26-0001"
 */
export function getNextDevisNumber(devisList = [], date = new Date()) {
  const d = date instanceof Date && !isNaN(date) ? date : new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(-2)
  const prefix = `DEV-${mm}/${yy}-`
  const regex = new RegExp(`^DEV-${mm}\\/${yy}-(\\d+)$`, 'i')
  const existingSet = new Set()

  let maxSeq = 0
  for (const dev of devisList) {
    const num = (dev?.devisNumber || dev?.devis_number || '').trim()
    if (num) {
      existingSet.add(num.toUpperCase())
      const match = num.match(regex)
      if (match) {
        const seq = parseInt(match[1], 10)
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq
        }
      }
    }
  }

  let nextSeq = maxSeq + 1
  let candidate = `${prefix}${String(nextSeq).padStart(4, '0')}`
  while (existingSet.has(candidate.toUpperCase())) {
    nextSeq++
    candidate = `${prefix}${String(nextSeq).padStart(4, '0')}`
  }
  return candidate
}
