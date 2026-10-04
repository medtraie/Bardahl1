import React, { useState, useEffect, useMemo } from 'react'
import {
  Search, FileSpreadsheet, Plus, FileText, Trash2, Edit3, CheckCircle2,
  CreditCard, Hash, Percent, Filter, Truck, MessageSquare, Gift, Tag,
  Sparkles, AlertCircle, Package, X, ShoppingBag, Layers,
  Scale, Calculator, ArrowRight, Clock, History, AlertTriangle, RefreshCw, BadgePercent, Coins, CheckSquare, Square,
  ChevronDown, User
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { generateOrderPdf, generateMultipleOrdersPdf } from '../utils/pdfGenerator'
import { exportOrdersToExcel } from '../utils/excelExporter'
import { evaluatePromotions } from '../utils/promotionEngine'
import { getProductUnitsPerCarton } from '../data/productsData'
import { getFamilyInfo, DEFAULT_BARDAHL_FAMILIES } from '../data/familiesData'


export default function Orders({ openWizardTrigger }) {
  const { 
    orders, clients, products, commercials, promotions, 
    addOrder, updateOrder, deleteOrder, updateOrderStatus, currentUser,
    clientCompensations = [], addClientCompensation, updateClientCompensation, consumeClientCompensation, deleteClientCompensation,
    productFamilies = [],
    deductProductsStock, restoreProductsStock
  } = useApp()

  const isAdmin = currentUser?.role === 'ADMIN'

  const handleStatusChange = async (order, newStatus) => {
    const statusLabels = {
      EN_ATTENTE: 'En Attente',
      VALIDATED: 'Validé',
      DELIVERED: 'Livré',
      CANCELLED: 'Annulé'
    }
    const label = statusLabels[newStatus] || newStatus
    const confirmChange = window.confirm(`Direction Bardahl : Voulez-vous changer le statut du bon N° ${order.orderNumber} en « ${label} » ?`)
    if (!confirmChange) return

    const updated = { ...order, status: newStatus }
    updateOrder(updated)
    if (updateOrderStatus) {
      await updateOrderStatus(order.dbId || order.id, newStatus)
    }
    if (newStatus === 'CANCELLED' && restoreProductsStock && order.items) {
      restoreProductsStock(order.items)
    }
    alert(`Le statut du bon N° ${order.orderNumber} est désormais « ${label} » !`)
  }

  const renderOrderStatusBadge = (status) => {
    const s = String(status || '').toUpperCase()
    if (s === 'EN_ATTENTE' || s === 'DRAFT') {
      return (
        <span className="badge-status EN_ATTENTE" style={{ background: 'rgba(255, 149, 0, 0.16)', color: '#FF9500', border: '1px solid rgba(255, 149, 0, 0.35)', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <span>⏳</span> En Attente
        </span>
      )
    }
    if (s === 'VALIDATED' || s === 'VALIDÉ') {
      return (
        <span className="badge-status VALIDATED" style={{ background: 'rgba(0, 122, 255, 0.16)', color: '#007AFF', border: '1px solid rgba(0, 122, 255, 0.35)', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <span>✓</span> Validé
        </span>
      )
    }
    if (s === 'DELIVERED' || s === 'LIVRÉ') {
      return (
        <span className="badge-status DELIVERED" style={{ background: 'rgba(52, 199, 89, 0.16)', color: '#34C759', border: '1px solid rgba(52, 199, 89, 0.35)', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <span>🚚</span> Livré
        </span>
      )
    }
    if (s === 'CANCELLED' || s === 'ANNULÉ') {
      return (
        <span className="badge-status CANCELLED" style={{ background: 'rgba(255, 69, 58, 0.16)', color: '#FF453A', border: '1px solid rgba(255, 69, 58, 0.35)', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <span>✕</span> Annulé
        </span>
      )
    }
    return <span className={`badge-status ${s}`}>{s}</span>
  }

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '-'
    const clean = String(dateStr).substring(0, 10)
    const parts = clean.split('-')
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return clean
  }

  const renderPaymentBadge = (method) => {
    const m = String(method || 'Chèque').trim()
    let bg = 'rgba(255, 255, 255, 0.06)'
    let color = '#E2E8F0'
    let border = 'rgba(255, 255, 255, 0.12)'
    let icon = '💳'

    const lower = m.toLowerCase()
    if (lower.includes('espèce') || lower.includes('espece')) {
      bg = 'rgba(52, 199, 89, 0.14)'
      color = '#34C759'
      border = 'rgba(52, 199, 89, 0.3)'
      icon = '💵'
    } else if (lower.includes('chèque') || lower.includes('cheque')) {
      bg = 'rgba(0, 122, 255, 0.14)'
      color = '#007AFF'
      border = 'rgba(0, 122, 255, 0.3)'
      icon = '📝'
    } else if (lower.includes('virement')) {
      bg = 'rgba(175, 82, 222, 0.14)'
      color = '#AF52DE'
      border = 'rgba(175, 82, 222, 0.3)'
      icon = '🏦'
    } else if (lower.includes('traite') || lower.includes('effet')) {
      bg = 'rgba(255, 149, 0, 0.14)'
      color = '#FF9500'
      border = 'rgba(255, 149, 0, 0.3)'
      icon = '📄'
    }

    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        fontSize: '11px',
        fontWeight: '700',
        padding: '3px 8px',
        borderRadius: '6px',
        background: bg,
        color: color,
        border: `1px solid ${border}`,
        whiteSpace: 'nowrap'
      }}>
        <span style={{ fontSize: '12px' }}>{icon}</span>
        {m}
      </span>
    )
  }

  const activeFamilies = useMemo(() => {
    return (productFamilies && productFamilies.length > 0)
      ? productFamilies.filter(f => f.isActive !== false)
      : DEFAULT_BARDAHL_FAMILIES
  }, [productFamilies])

  const productCategoriesList = useMemo(() => [
    { id: 'ALL', label: 'Toutes les Gammes' },
    ...activeFamilies.map(f => ({ id: f.code, label: `${f.icon} ${f.label}` }))
  ], [activeFamilies])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [commercialFilter, setCommercialFilter] = useState('ALL')
  const [showOrderWizard, setShowOrderWizard] = useState(false)
  const [editingOrder, setEditingOrder] = useState(null)
  const [selectedOrderIds, setSelectedOrderIds] = useState([])
  
  // Navigation tabs: 'ORDERS' (Bons de commande) | 'COMPENSATIONS' (Registre des Avoirs & Régularisations)
  const [activeOrdersTab, setActiveOrdersTab] = useState('ORDERS')
  const [compensationStatusFilter, setCompensationStatusFilter] = useState('ALL') // 'ALL' | 'PENDING' | 'CONSUMED'

  // Smart Remise Adjustment / Compensation Modal State
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false)
  const [adjustingOrder, setAdjustingOrder] = useState(null)
  const [adjustmentLines, setAdjustmentLines] = useState([])
  const [adjustmentChosenMode, setAdjustmentChosenMode] = useState('DH') // 'DH' | 'PERCENT'
  const [adjustmentReason, setAdjustmentReason] = useState('')
  const [updateOrderInHistory, setUpdateOrderInHistory] = useState(true)

  // Applied Avoir / Compensation on Current Order in Wizard
  const [appliedAvoirCompensation, setAppliedAvoirCompensation] = useState(null)

  // Order Wizard Form State
  const [customOrderNumber, setCustomOrderNumber] = useState('')
  const [selectedClient, setSelectedClient] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('Chèque')
  const [modeExpedition, setModeExpedition] = useState('Transport Bardahl')
  const [remarque, setRemarque] = useState('')
  const [remisePercent, setRemisePercent] = useState(0)
  const [remiseMontant, setRemiseMontant] = useState(0)
  const [promoNote, setPromoNote] = useState('')
  const [selectedPromoId, setSelectedPromoId] = useState('AUTO')
  const [selectedProducts, setSelectedProducts] = useState([])
  const [commercialPromoChoices, setCommercialPromoChoices] = useState({})
  const [customBatchRemise, setCustomBatchRemise] = useState('')

  // Searchable Select States
  const [clientSearchQuery, setClientSearchQuery] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [productSearchQuery, setProductSearchQuery] = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [selectedProductCategoryFilter, setSelectedProductCategoryFilter] = useState('ALL')

  const suggestedOrderNumber = `BC-2026-00${4332 + orders.length + 1}`
  const activeOrderNumber = customOrderNumber.trim() || suggestedOrderNumber

  // Trigger modal open from header / dashboard buttons
  useEffect(() => {
    if (openWizardTrigger && openWizardTrigger > 0) {
      handleOpenAddWizard()
    }
  }, [openWizardTrigger])

  const filteredOrders = orders.filter(o => {
    const matchesSearch = (o.orderNumber || '').toLowerCase().includes(search.toLowerCase()) ||
                          (o.clientName || '').toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'ALL' || 
      (statusFilter === 'EN_ATTENTE' ? (o.status === 'EN_ATTENTE' || o.status === 'DRAFT') : o.status === statusFilter)
    const matchesCommercial = commercialFilter === 'ALL' ||
      (o.commercialName && o.commercialName.trim().toLowerCase() === commercialFilter.trim().toLowerCase())
    return matchesSearch && matchesStatus && matchesCommercial
  })

  const filteredClientOptions = clients.filter(c => {
    const q = clientSearchQuery.toLowerCase()
    return (c.companyName || '').toLowerCase().includes(q) ||
           (c.codeClient || '').toLowerCase().includes(q) ||
           (c.ice || '').toLowerCase().includes(q) ||
           (c.city || '').toLowerCase().includes(q)
  })

  const filteredProductOptions = useMemo(() => {
    const q = (productSearchQuery || '').toLowerCase().trim()
    return (products || []).filter(p => {
      if (selectedProductCategoryFilter !== 'ALL') {
        const fam = getFamilyInfo(p.category || p.categoryId, activeFamilies)
        if (fam.code !== selectedProductCategoryFilter && !(p.category || '').toUpperCase().includes(selectedProductCategoryFilter)) {
          return false
        }
      }
      if (!q) return true
      const matchName = (p.name || '').toLowerCase().includes(q)
      const matchRef = (p.reference || '').toLowerCase().includes(q)
      const matchCode = (p.code || '').toLowerCase().includes(q)
      const matchCat = (p.category || '').toLowerCase().includes(q)
      const matchVisc = (p.viscosity || '').toLowerCase().includes(q)
      return matchName || matchRef || matchCode || matchCat || matchVisc
    })
  }, [products, productSearchQuery, selectedProductCategoryFilter])

  const handleOpenAddWizard = () => {
    setEditingOrder(null)
    setCustomOrderNumber('')
    setSelectedClient('')
    setClientSearchQuery('')
    setPaymentMethod('Chèque')
    setModeExpedition('Transport Bardahl')
    setRemarque('')
    setRemisePercent(0)
    setRemiseMontant(0)
    setPromoNote('')
    setSelectedPromoId('AUTO')
    setCommercialPromoChoices({})
    setSelectedProducts([])
    setCustomBatchRemise('')
    setShowOrderWizard(true)
  }

  const handleOpenEditWizard = (order) => {
    setEditingOrder(order)
    setCustomOrderNumber(order.orderNumber || '')
    const matchedClient = clients.find(c => c.companyName === order.clientName)
    setSelectedClient(matchedClient ? matchedClient.id : '')
    if (matchedClient) {
      setClientSearchQuery(`${matchedClient.codeClient ? '[' + matchedClient.codeClient + '] ' : ''}${matchedClient.companyName} (${matchedClient.city})`)
    } else {
      setClientSearchQuery(order.clientName || '')
    }
    setPaymentMethod(order.paymentMethod || 'Chèque')
    setModeExpedition(order.modeExpedition || 'Transport Bardahl')
    setRemarque(order.remarque || '')
    setRemisePercent(order.remisePercent || 0)
    setRemiseMontant(order.remiseMontant || 0)
    setPromoNote(order.promoNote || '')
    setSelectedPromoId('AUTO')
    setCommercialPromoChoices({})
    setCustomBatchRemise('')
    setSelectedProducts(order.items ? order.items.map(i => ({
      productId: i.productId || i.reference,
      productName: i.productName || i.name,
      reference: i.reference || i.code,
      category: i.category || '',
      priceTtc: parseFloat(i.priceTtc || i.unitPriceTtc || 0),
      qty: parseInt(i.qty || i.quantity || 1, 10),
      qtyGratuit: parseInt(i.qtyGratuit || i.freeQty || 0, 10),
      promoTag: i.promoTag || '',
      remisePercent: parseFloat(i.remisePercent || i.remise || 0)
    })) : [])
    setShowOrderWizard(true)
  }

  const parsePercent = (val) => {
    if (val === undefined || val === null || val === '') return null
    const str = String(val).replace(',', '.')
    const parsed = parseFloat(str)
    return isNaN(parsed) ? 0 : Math.max(0, Math.min(100, parsed))
  }

  // § 17 & § 18.13-14 : Handlers de Sélection Multiple et Génération PDF Groupé
  const handleToggleSelectOrder = (orderId) => {
    setSelectedOrderIds(prev =>
      prev.includes(orderId) ? prev.filter(id => id !== orderId) : [...prev, orderId]
    )
  }

  const handleSelectAllOrders = () => {
    if (selectedOrderIds.length === filteredOrders.length) {
      setSelectedOrderIds([])
    } else {
      setSelectedOrderIds(filteredOrders.map(o => o.id))
    }
  }

  const handleGenerateBatchPdf = () => {
    const selected = orders.filter(o => selectedOrderIds.includes(o.id))
    if (selected.length === 0) {
      alert("Veuillez sélectionner au moins un bon de commande.")
      return
    }
    generateMultipleOrdersPdf(selected)
  }

  const handleDeleteOrder = (order) => {
    const confirmMessage = `Voulez-vous vraiment supprimer le bon de commande N° ${order.orderNumber} ?\n\n• Client : ${order.clientName || 'Inconnu'}\n• Montant : ${(parseFloat(order.totalTtc) || 0).toFixed(2)} DH\n\nAttention : Cette action est irréversible.`
    if (window.confirm(confirmMessage)) {
      deleteOrder(order.dbId || order.id)
    }
  }

  const handleAddProduct = (productId) => {
    if (!productId) return
    const prod = products.find(p => p.id === productId)
    if (prod) {
      const upb = parseInt(prod.unitsPerBox || getProductUnitsPerCarton(prod) || 1, 10) || 1
      const existing = selectedProducts.find(p => p.productId === productId)
      if (existing) {
        setSelectedProducts(prev => prev.map(p => p.productId === productId ? { ...p, qty: p.qty + 1 } : p))
      } else {
        setSelectedProducts(prev => [...prev, {
          productId: prod.id,
          productName: prod.name,
          reference: prod.reference,
          category: prod.category || '',
          packaging: prod.packaging || '',
          unitsPerBox: upb,
          priceTtc: parseFloat(prod.priceTtc) || 0,
          qty: 1,
          qtyGratuit: 0,
          promoTag: '',
          remisePercent: ''
        }])
      }
    }
  }

  const handleLineRemiseChange = (index, newPercent) => {
    // § 8 & § 18.4 : Accepter virgule et point (ex: "7,5" ou "7.5") sans blocage
    setSelectedProducts(prev => prev.map((p, i) => i === index ? { ...p, remisePercent: newPercent } : p))
  }

  const handleApplyBatchRemise = (pct) => {
    setSelectedProducts(prev => prev.map(p => ({ ...p, remisePercent: pct })))
  }

  const handleApplyCustomBatchRemise = (val) => {
    if (val === '' || val === null || val === undefined) return
    const normalized = String(val).replace(',', '.')
    const parsed = Math.max(0, Math.min(100, parseFloat(normalized) || 0))
    handleApplyBatchRemise(parsed)
  }

  // ── Handlers for Smart Remise Adjustment / Compensation ─────────────────────
  const handleOpenRemiseAdjustment = (order) => {
    setAdjustingOrder(order)
    setAdjustmentReason(`Correction remise commerciale sur bon ${order.orderNumber}`)
    setAdjustmentChosenMode('DH')
    setUpdateOrderInHistory(true)

    // Build editable rows from order.items
    const lines = (order.items || []).map((it, idx) => {
      const q = parseInt(it.qty || it.quantity || 1, 10)
      const pu = parseFloat(it.priceTtc || it.unitPriceTtc || 0)
      const currentRemise = (it.remisePercent !== undefined && it.remisePercent !== null)
        ? parseFloat(it.remisePercent)
        : (parseFloat(order.remisePercent) || 0)
      return {
        key: `line_${idx}`,
        productId: it.productId || it.id || '',
        reference: it.reference || it.ref || '',
        name: it.productName || it.name || '',
        category: it.category || 'Bardahl',
        qty: q,
        priceTtc: pu,
        grossTotal: q * pu,
        currentRemise: currentRemise,
        newRemise: currentRemise,
        diffPercent: 0,
        diffAmountDh: 0
      }
    })
    setAdjustmentLines(lines)
    setShowAdjustmentModal(true)
  }

  const handleAdjustmentLineChange = (index, val) => {
    const parsed = val === '' ? '' : Math.max(0, Math.min(100, parseFloat(val) || 0))
    setAdjustmentLines(prev => prev.map((line, i) => {
      if (i !== index) return line
      const newRemise = parsed === '' ? 0 : parsed
      const diffPct = Math.abs(line.currentRemise - newRemise)
      const diffDh = line.grossTotal * (diffPct / 100)
      return {
        ...line,
        newRemise: parsed,
        diffPercent: parseFloat(diffPct.toFixed(2)),
        diffAmountDh: parseFloat(diffDh.toFixed(2))
      }
    }))
  }

  const adjustmentTotals = useMemo(() => {
    let totalGross = 0
    let totalCompensationDh = 0
    let linesWithDiff = 0

    adjustmentLines.forEach(l => {
      totalGross += l.grossTotal
      if (l.diffPercent > 0) {
        totalCompensationDh += l.diffAmountDh
        linesWithDiff += 1
      }
    })

    const averagePercent = totalGross > 0 ? (totalCompensationDh / totalGross) * 100 : 0

    return {
      totalGross,
      totalCompensationDh: parseFloat(totalCompensationDh.toFixed(2)),
      averagePercent: parseFloat(averagePercent.toFixed(2)),
      linesWithDiff
    }
  }, [adjustmentLines])

  const handleSaveAdjustment = async () => {
    if (!adjustingOrder) return
    if (adjustmentTotals.totalCompensationDh <= 0) {
      alert("Aucune modification de remise n'a été détectée. Veuillez modifier la remise d'au moins un article pour générer une compensation.")
      return
    }

    const clientObj = clients.find(c => c.companyName === adjustingOrder.clientName || c.id === adjustingOrder.clientDbId)

    const payload = {
      orderId: adjustingOrder.id,
      orderNumber: adjustingOrder.orderNumber,
      clientId: clientObj?.id || adjustingOrder.clientDbId || adjustingOrder.clientName,
      clientName: adjustingOrder.clientName,
      date: new Date().toISOString().slice(0, 10),
      items: adjustmentLines.filter(l => l.diffPercent > 0).map(l => ({
        reference: l.reference,
        productName: l.name,
        qty: l.qty,
        priceTtc: l.priceTtc,
        grossTotal: l.grossTotal,
        oldRemisePercent: l.currentRemise,
        newRemisePercent: typeof l.newRemise === 'number' ? l.newRemise : parseFloat(l.newRemise) || 0,
        diffPercent: l.diffPercent,
        amountDh: l.diffAmountDh
      })),
      totalAmountDh: adjustmentTotals.totalCompensationDh,
      equivalentPercent: adjustmentTotals.averagePercent,
      chosenMode: adjustmentChosenMode,
      reason: adjustmentReason || 'Régularisation remise commerciale',
      status: 'PENDING'
    }

    addClientCompensation(payload)

    if (updateOrderInHistory) {
      const updatedItems = (adjustingOrder.items || []).map((it, idx) => {
        const adj = adjustmentLines[idx]
        if (adj && adj.diffPercent > 0) {
          const newPct = typeof adj.newRemise === 'number' ? adj.newRemise : parseFloat(adj.newRemise) || 0
          return {
            ...it,
            remisePercent: newPct
          }
        }
        return it
      })

      const newTotalDiscount = updatedItems.reduce((sum, it) => {
        const q = parseInt(it.qty || it.quantity || 1, 10)
        const p = parseFloat(it.priceTtc || it.unitPriceTtc || 0)
        const r = parseFloat(it.remisePercent) || 0
        return sum + ((q * p) * (r / 100))
      }, 0)

      const gross = updatedItems.reduce((sum, it) => {
        const q = parseInt(it.qty || it.quantity || 1, 10)
        const p = parseFloat(it.priceTtc || it.unitPriceTtc || 0)
        return sum + (q * p)
      }, 0)

      const voucher = parseFloat(adjustingOrder.voucherDiscount) || 0
      const avoir = parseFloat(adjustingOrder.avoirDeduction) || 0
      const newTotalTtc = Math.max(0, gross - newTotalDiscount - voucher - avoir)

      const updatedOrderObj = {
        ...adjustingOrder,
        items: updatedItems,
        totalDiscount: newTotalDiscount,
        totalHt: newTotalTtc / 1.20,
        totalTva: newTotalTtc - (newTotalTtc / 1.20),
        totalTtc: newTotalTtc,
        hasCompensation: true,
        compensationSummary: `${adjustmentTotals.totalCompensationDh.toFixed(2)} DH (${adjustmentChosenMode === 'DH' ? 'Avoir DH' : '+ ' + adjustmentTotals.averagePercent + '%'})`
      }

      await updateOrder(updatedOrderObj)
    }

    alert(`Régularisation enregistrée avec succès !\n\nUn avoir de ${adjustmentTotals.totalCompensationDh.toFixed(2)} DH TTC (ou +${adjustmentTotals.averagePercent}%) a été créé pour le client « ${adjustingOrder.clientName} ».\nIl sera proposé automatiquement lors de son prochain bon de commande.`)
    setShowAdjustmentModal(false)
    setAdjustingOrder(null)
  }

  // Look for any pending compensations for selectedClient in Wizard
  const clientPendingCompensations = useMemo(() => {
    if (!selectedClient) return []
    const client = clients.find(c => c.id === selectedClient)
    const clientName = (client?.companyName || '').toLowerCase()
    return clientCompensations.filter(c => 
      c.status === 'PENDING' && 
      (c.clientId === selectedClient || (clientName && (c.clientName || '').toLowerCase() === clientName))
    )
  }, [selectedClient, clients, clientCompensations])

  const handleSelectPromotion = (promoId) => {
    setSelectedPromoId(promoId)
    setCommercialPromoChoices({})

    if (promoId === 'NONE') {
      setSelectedProducts(prev => prev.map(p => ({ ...p, remisePercent: '' })))
      setRemiseMontant(0)
      return
    }

    if (promoId === 'AUTO') {
      return
    }

    const promo = promotions.find(p => p.id === promoId)
    if (!promo) return

    // 1. Locate the target product in catalog
    let targetProduct = null
    if (promo.targetType === 'PRODUCT') {
      targetProduct = products.find(p =>
        p.id === promo.targetProductId ||
        p.reference === promo.targetProductRef ||
        (promo.targetProductRef && p.code === promo.targetProductRef) ||
        (promo.targetProductName && p.name && p.name.toLowerCase() === promo.targetProductName.toLowerCase()) ||
        (promo.targetProductRef && p.name && p.name.toLowerCase().includes(promo.targetProductRef.toLowerCase())) ||
        (promo.targetProductName && p.name && p.name.toLowerCase().includes(promo.targetProductName.toLowerCase()))
      )
    } else if (promo.targetType === 'FAMILY') {
      targetProduct = products.find(p =>
        (p.category || p.categoryId || '').toUpperCase() === (promo.targetFamily || '').toUpperCase()
      )
    }

    // Fallback: search in promo name or description
    if (!targetProduct) {
      targetProduct = products.find(p =>
        (promo.name && p.name && promo.name.toLowerCase().includes(p.name.toLowerCase())) ||
        (promo.name && p.reference && promo.name.toLowerCase().includes(p.reference.toLowerCase())) ||
        (promo.description && p.name && promo.description.toLowerCase().includes(p.name.toLowerCase()))
      )
    }

    // 2. Required quantity in UNITS
    let requiredCartons = 10
    if (promo.tiers && promo.tiers.length > 0) {
      requiredCartons = promo.tiers[0].min !== undefined ? promo.tiers[0].min : (promo.tiers[0].threshold || 10)
    } else if (promo.threshold > 0) {
      if (promo.type === 'TYPE_4' && targetProduct) {
        const price = parseFloat(targetProduct.unitPriceTtc || targetProduct.priceTtc || 100)
        requiredCartons = Math.max(1, Math.ceil(promo.threshold / price))
      } else {
        requiredCartons = promo.threshold
      }
    }

    // 3. Add or update target product in selectedProducts with required units without manual gift duplication
    if (targetProduct) {
      const upb = parseInt(targetProduct.unitsPerBox || getProductUnitsPerCarton(targetProduct) || 1, 10) || 1
      const requiredUnits = promo.type === 'TYPE_4' ? requiredCartons : (requiredCartons * upb)

      setSelectedProducts(prev => {
        const existingIdx = prev.findIndex(item => item.productId === targetProduct.id || item.reference === targetProduct.reference)
        if (existingIdx >= 0) {
          return prev.map((item, idx) => {
            if (idx === existingIdx) {
              return {
                ...item,
                qty: Math.max(item.qty || 0, requiredUnits),
                unitsPerBox: upb,
                promoTag: promo.name
              }
            }
            return item
          })
        } else {
          return [...prev, {
            productId: targetProduct.id,
            reference: targetProduct.reference || 'REF',
            productName: targetProduct.name,
            category: targetProduct.category || targetProduct.categoryId || 'PROMO',
            packaging: targetProduct.packaging || '',
            unitsPerBox: upb,
            priceTtc: parseFloat(targetProduct.unitPriceTtc || targetProduct.priceTtc || 0),
            qty: requiredUnits,
            qtyGratuit: 0,
            remisePercent: '',
            promoTag: promo.name
          }]
        }
      })
    }
  }

  const handleQtyChange = (index, newQty) => {
    const val = parseInt(newQty, 10)
    if (isNaN(val) || val <= 0) {
      setSelectedProducts(prev => prev.filter((_, i) => i !== index))
    } else {
      // Les promotions et gratuités se recalculent automatiquement via le hook promoAnalysis
      setSelectedProducts(prev => prev.map((p, i) => i === index ? { ...p, qty: val } : p))
    }
  }

  const handleQtyGratuitChange = (index, newGratuit) => {
    const val = Math.max(0, parseInt(newGratuit, 10) || 0)
    setSelectedProducts(prev => prev.map((p, i) => i === index ? { ...p, qtyGratuit: val } : p))
  }

  const handleTogglePromoLine = (index, promoType) => {
    setSelectedProducts(prev => prev.map((p, i) => {
      if (i !== index) return p
      if (promoType === '10+1') {
        return { ...p, qtyGratuit: Math.max(1, Math.floor(p.qty / 10)), promoTag: 'Promo 10+1 Offert' }
      } else if (promoType === '100%') {
        return { ...p, qtyGratuit: p.qty, qty: 0, promoTag: 'Gratuité 100% (Échantillon)' }
      } else {
        return { ...p, qtyGratuit: p.qtyGratuit > 0 ? 0 : 1, promoTag: p.qtyGratuit > 0 ? '' : 'Article Offert' }
      }
    }))
  }

  React.useEffect(() => {
    if (!showOrderWizard) return
    const handleClickOutside = (e) => {
      if (!e.target.closest('.client-search-container')) {
        setShowClientDropdown(false)
      }
      if (!e.target.closest('.product-search-container')) {
        setShowProductDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showOrderWizard])

  // Real-time Automatic Promotions Engine (Sections 1-16)
  const promoAnalysis = useMemo(() => {
    return evaluatePromotions(selectedProducts, products, promotions, commercialPromoChoices, selectedPromoId)
  }, [selectedProducts, products, promotions, commercialPromoChoices, selectedPromoId])

  // Financial Calculations per Product Line (Remise Commerciale par produit)
  const grossTotalTtc = selectedProducts.reduce((sum, item) => sum + (item.priceTtc * item.qty), 0)

  // Total discounts from individual product lines with decimal comma/dot support (§ 8)
  const totalLineDiscountAmount = selectedProducts.reduce((sum, item, idx) => {
    const promoDiscount = promoAnalysis.lineDiscounts && promoAnalysis.lineDiscounts[idx] ? promoAnalysis.lineDiscounts[idx] : 0
    const parsedRemise = parsePercent(item.remisePercent)
    const finalPct = parsedRemise !== null ? parsedRemise : promoDiscount
    return sum + ((item.priceTtc * item.qty) * (finalPct / 100))
  }, 0)

  // Voucher discount (either from Type 3 promo or explicit manual voucher)
  const voucherDiscount = Math.max(promoAnalysis.voucherDiscount || 0, parseFloat(remiseMontant) || 0)
  const totalDiscountAmount = totalLineDiscountAmount

  // Avoir / Compensation deduction (if applied as fixed DH)
  const avoirDeductionAmount = (appliedAvoirCompensation && !appliedAvoirCompensation.appliedAsPercent) 
    ? (parseFloat(appliedAvoirCompensation.totalAmountDh) || 0) 
    : (parseFloat(editingOrder?.avoirDeduction) || 0)

  const netTotalTtc = Math.max(0, grossTotalTtc - totalDiscountAmount - voucherDiscount - avoirDeductionAmount)
  const totalHt = netTotalTtc / 1.20
  const totalTva = netTotalTtc - totalHt

  const userFreeItemsCount = selectedProducts.reduce((sum, item) => {
    const freeItem = (promoAnalysis.freeItems || []).find(fi => fi.reference === item.reference || fi.productId === item.productId)
    return sum + (freeItem ? (parseInt(freeItem.qtyGratuit, 10) || 0) : 0)
  }, 0)
  const promoDistinctFreeItemsCount = (promoAnalysis.freeItems || [])
    .filter(fi => !selectedProducts.some(sp => sp.reference === fi.reference || sp.productId === fi.productId))
    .reduce((sum, item) => sum + (parseInt(item.qtyGratuit, 10) || 0), 0)
  const totalFreeItemsCount = userFreeItemsCount + promoDistinctFreeItemsCount

  const handleSaveOrderSubmit = () => {
    if (!selectedClient) {
      alert("Veuillez sélectionner un client.")
      return
    }
    if (selectedProducts.length === 0) {
      alert("Veuillez ajouter au moins un produit.")
      return
    }

    const client = clients.find(c => c.id === selectedClient)

    // Build combined items list strictly respecting promotion rules without manual gratuit override
    const combinedItems = [
      ...selectedProducts.map((sp, idx) => {
        const promoDiscount = promoAnalysis.lineDiscounts && promoAnalysis.lineDiscounts[idx] ? promoAnalysis.lineDiscounts[idx] : 0
        const parsedRemise = parsePercent(sp.remisePercent)
        const finalPct = parsedRemise !== null ? parsedRemise : promoDiscount
        const freeItemForSp = (promoAnalysis.freeItems || []).find(fi => fi.reference === sp.reference || fi.productId === sp.productId)
        const earnedFreeCartons = freeItemForSp ? (parseInt(freeItemForSp.qtyGratuit, 10) || 0) : 0
        const earnedFreeUnits = earnedFreeCartons * (sp.unitsPerBox || 1)
        return {
          ...sp,
          qtyGratuit: earnedFreeUnits,
          remisePercent: finalPct,
          promoDiscountPercent: promoDiscount,
          promoTag: earnedFreeCartons > 0 ? (freeItemForSp.promoName || sp.promoTag) : sp.promoTag
        }
      }),
      ...(promoAnalysis.freeItems || [])
        .filter(fi => !selectedProducts.some(sp => sp.reference === fi.reference || sp.productId === fi.productId))
        .map(fi => ({
          productId: fi.productId,
          productName: fi.productName,
          reference: fi.reference,
          priceTtc: 0,
          qty: 0,
          qtyGratuit: (parseInt(fi.qtyGratuit, 10) || 1) * (fi.unitsPerBox || 1),
          remisePercent: 0,
          promoTag: `🎁 Offert : ${fi.promoName}`
        }))
    ]

    // Build automated promo note summary if promos are active
    const autoPromoSummary = promoAnalysis.appliedPromotions.length > 0
      ? promoAnalysis.appliedPromotions.map(ap => ap.name + (ap.discountPercent > 0 ? ` (${ap.discountPercent}%)` : '') + (ap.giftSummary ? ` [${ap.giftSummary}]` : '') + (ap.voucherAmount > 0 ? ` [Bon -${ap.voucherAmount} DH]` : '')).join(' | ')
      : ''
    const finalPromoNote = autoPromoSummary

    const activeAvoirOrderNumber = appliedAvoirCompensation ? appliedAvoirCompensation.orderNumber : (editingOrder?.avoirOrderNumber || '')

    // Consume pending compensation if applied on this order
    if (appliedAvoirCompensation && appliedAvoirCompensation.id) {
      consumeClientCompensation(appliedAvoirCompensation.id, activeOrderNumber)
    }

    if (editingOrder) {
      const updatedOrder = {
        ...editingOrder,
        orderNumber: activeOrderNumber,
        clientName: client ? client.companyName : editingOrder.clientName,
        paymentMethod: paymentMethod,
        modeExpedition: modeExpedition,
        remarque: remarque,
        remisePercent: 0,
        remiseMontant: parseFloat(remiseMontant) || 0,
        avoirDeduction: avoirDeductionAmount,
        avoirOrderNumber: activeAvoirOrderNumber,
        promoNote: finalPromoNote,
        status: isAdmin ? (editingOrder?.status || 'VALIDATED') : 'EN_ATTENTE',
        totalHt: totalHt,
        totalDiscount: totalDiscountAmount,
        voucherDiscount: voucherDiscount,
        totalTva: totalTva,
        totalTtc: netTotalTtc,
        totalFreeItems: totalFreeItemsCount,
        appliedPromotions: promoAnalysis.appliedPromotions,
        items: combinedItems
      }

      // Restore old stock and deduct new items
      if (restoreProductsStock && editingOrder.items) {
        restoreProductsStock(editingOrder.items)
      }
      if (deductProductsStock) {
        deductProductsStock(combinedItems)
      }

      updateOrder(updatedOrder)
      setShowOrderWizard(false)
      setEditingOrder(null)
      setAppliedAvoirCompensation(null)
      alert(`Bon de commande ${updatedOrder.orderNumber} modifié et enregistré avec succès !`)
    } else {
      const newOrder = {
        id: 'o_' + Date.now(),
        orderNumber: activeOrderNumber,
        date: new Date().toISOString().substring(0, 10),
        commercialName: currentUser?.name || "Mohammed amine",
        commercialEmail: currentUser?.email || "mohammed@bardahl.ma",
        clientName: client ? client.companyName : "Client Bardahl",
        paymentMethod: paymentMethod,
        modeExpedition: modeExpedition,
        remarque: remarque,
        remisePercent: 0,
        remiseMontant: parseFloat(remiseMontant) || 0,
        avoirDeduction: avoirDeductionAmount,
        avoirOrderNumber: activeAvoirOrderNumber,
        promoNote: finalPromoNote,
        status: isAdmin ? "VALIDATED" : "EN_ATTENTE",
        totalHt: totalHt,
        totalDiscount: totalDiscountAmount,
        voucherDiscount: voucherDiscount,
        totalTva: totalTva,
        totalTtc: netTotalTtc,
        totalFreeItems: totalFreeItemsCount,
        appliedPromotions: promoAnalysis.appliedPromotions,
        items: combinedItems
      }

      // Deduct product stock in catalog and database
      if (deductProductsStock) {
        deductProductsStock(combinedItems)
      }

      addOrder(newOrder)
      setShowOrderWizard(false)
      setAppliedAvoirCompensation(null)
      alert(isAdmin
        ? `Bon de commande ${newOrder.orderNumber} enregistré avec succès dans la base de données !`
        : `Bon de commande ${newOrder.orderNumber} créé avec succès ! Statut : « En Attente » de validation par la Direction Bardahl.`
      )
    }

    setCustomOrderNumber('')
    setSelectedClient('')
    setPaymentMethod('Chèque')
    setModeExpedition('Transport Bardahl')
    setRemarque('')
    setRemisePercent(0)
    setRemiseMontant(0)
    setPromoNote('')
    setSelectedProducts([])
    setCommercialPromoChoices({})
    setCustomBatchRemise('')
    setAppliedAvoirCompensation(null)
  }

  const filteredCompensations = useMemo(() => {
    return (clientCompensations || []).filter(c => {
      if (compensationStatusFilter !== 'ALL' && c.status !== compensationStatusFilter) return false
      if (!search) return true
      const q = search.toLowerCase()
      return (c.orderNumber || '').toLowerCase().includes(q) ||
             (c.clientName || '').toLowerCase().includes(q) ||
             (c.reason || '').toLowerCase().includes(q)
    })
  }, [clientCompensations, compensationStatusFilter, search])

  const pendingCompensationsTotalDh = useMemo(() => {
    return (clientCompensations || [])
      .filter(c => c.status === 'PENDING')
      .reduce((sum, c) => sum + (parseFloat(c.totalAmountDh) || 0), 0)
  }, [clientCompensations])

  const consumedCompensationsTotalDh = useMemo(() => {
    return (clientCompensations || [])
      .filter(c => c.status === 'CONSUMED')
      .reduce((sum, c) => sum + (parseFloat(c.totalAmountDh) || 0), 0)
  }, [clientCompensations])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header Controls & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#FFFFFF' }}>Gestion des Bons de Commande</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {filteredOrders.length} bons enregistrés au total • {clientCompensations.filter(c => c.status === 'PENDING').length} compensation(s) en attente
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {selectedOrderIds.length > 0 && (
            <button
              onClick={handleGenerateBatchPdf}
              className="btn-bardahl"
              style={{
                padding: '10px 18px',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#34C759',
                color: '#0D0F12',
                border: 'none',
                fontWeight: '900'
              }}
              title="Générer un seul fichier PDF groupé contenant tous les bons sélectionnés"
            >
              <FileText style={{ width: '16px', height: '16px' }} />
              Générer PDF Groupé ({selectedOrderIds.length})
            </button>
          )}

          <button
            onClick={() => exportOrdersToExcel(orders)}
            className="btn-secondary"
            style={{ padding: '10px 16px', fontSize: '13px', color: '#34C759', borderColor: '#34C759', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <FileSpreadsheet style={{ width: '16px', height: '16px' }} /> Exporter Excel
          </button>

          <button onClick={handleOpenAddWizard} className="btn-bardahl" style={{ padding: '10px 20px', fontSize: '13px' }}>
            <Plus style={{ width: '16px', height: '16px' }} /> Nouveau Bon
          </button>
        </div>
      </div>

      {/* Segmented Navigation Tabs */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid var(--border-card)', paddingBottom: '12px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => setActiveOrdersTab('ORDERS')}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: '800',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: activeOrdersTab === 'ORDERS' ? 'rgba(255, 208, 0, 0.15)' : 'rgba(255, 255, 255, 0.03)',
            color: activeOrdersTab === 'ORDERS' ? 'var(--bardahl-yellow)' : 'var(--text-secondary)',
            border: activeOrdersTab === 'ORDERS' ? '1px solid var(--bardahl-yellow)' : '1px solid var(--border-card)',
            transition: 'all 0.2s'
          }}
        >
          <FileText size={16} />
          Bons de Commande
          <span style={{
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '10px',
            background: activeOrdersTab === 'ORDERS' ? 'var(--bardahl-yellow)' : 'rgba(255,255,255,0.1)',
            color: activeOrdersTab === 'ORDERS' ? '#000000' : '#FFFFFF',
            fontWeight: '900'
          }}>
            {orders.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveOrdersTab('COMPENSATIONS')}
          style={{
            padding: '10px 20px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: '800',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: activeOrdersTab === 'COMPENSATIONS' ? 'rgba(0, 122, 255, 0.15)' : 'rgba(255, 255, 255, 0.03)',
            color: activeOrdersTab === 'COMPENSATIONS' ? '#007AFF' : 'var(--text-secondary)',
            border: activeOrdersTab === 'COMPENSATIONS' ? '1px solid #007AFF' : '1px solid var(--border-card)',
            transition: 'all 0.2s'
          }}
        >
          <Scale size={16} />
          Registre des Avoirs & Compensations
          {clientCompensations.filter(c => c.status === 'PENDING').length > 0 ? (
            <span style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '10px',
              background: '#FF9500',
              color: '#000000',
              fontWeight: '900'
            }}>
              {clientCompensations.filter(c => c.status === 'PENDING').length} en attente
            </span>
          ) : (
            <span style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '10px',
              background: 'rgba(255,255,255,0.1)',
              color: 'var(--text-secondary)',
              fontWeight: '700'
            }}>
              {clientCompensations.length}
            </span>
          )}
        </button>
      </div>

      {activeOrdersTab === 'ORDERS' ? (
        <>
          {/* Filter & Search Bar */}
          <div className="glass-card" style={{ padding: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', alignItems: 'center' }}>
              
              <div style={{ position: 'relative' }}>
                <Search style={{ width: '16px', height: '16px', color: 'var(--bardahl-yellow)', position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Rechercher par N° Bon ou Client..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: '40px' }}
                />
              </div>

              <div>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="input-field"
                  style={{ padding: '10px' }}
                >
                  <option value="ALL">Tous les Statuts ({orders.length})</option>
                  <option value="EN_ATTENTE">⏳ En Attente ({orders.filter(o => o.status === 'EN_ATTENTE' || o.status === 'DRAFT').length})</option>
                  <option value="VALIDATED">✓ Validés ({orders.filter(o => o.status === 'VALIDATED').length})</option>
                  <option value="DELIVERED">🚚 Livrés ({orders.filter(o => o.status === 'DELIVERED').length})</option>
                  <option value="CANCELLED">✕ Annulés ({orders.filter(o => o.status === 'CANCELLED').length})</option>
                </select>
              </div>

              <div>
                <select
                  value={commercialFilter}
                  onChange={e => setCommercialFilter(e.target.value)}
                  className="input-field"
                  style={{ padding: '10px' }}
                >
                  <option value="ALL">Tous les Représentants</option>
                  {commercials.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          {/* Orders Table */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table className="custom-table" style={{ width: '100%', minWidth: '1080px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '44px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <input
                        type="checkbox"
                        checked={filteredOrders.length > 0 && selectedOrderIds.length === filteredOrders.length}
                        onChange={handleSelectAllOrders}
                        title="Sélectionner / désélectionner tous les bons"
                        style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--bardahl-yellow)' }}
                      />
                    </th>
                    <th style={{ minWidth: '140px', whiteSpace: 'nowrap' }}>N° Bon</th>
                    <th style={{ minWidth: '110px', whiteSpace: 'nowrap' }}>Date</th>
                    <th style={{ minWidth: '220px' }}>Client</th>
                    <th style={{ minWidth: '140px', whiteSpace: 'nowrap' }}>Commercial</th>
                    <th style={{ minWidth: '115px', textAlign: 'center', whiteSpace: 'nowrap' }}>Paiement</th>
                    <th style={{ minWidth: '125px', textAlign: 'right', whiteSpace: 'nowrap' }}>Total TTC</th>
                    <th style={{ minWidth: '125px', textAlign: 'center', whiteSpace: 'nowrap' }}>Statut</th>
                    <th style={{ minWidth: isAdmin ? '345px' : '230px', textAlign: 'center', whiteSpace: 'nowrap' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <AlertCircle size={32} style={{ opacity: 0.5, color: 'var(--bardahl-yellow)' }} />
                          <span style={{ fontSize: '14px', fontWeight: '600' }}>Aucun bon de commande trouvé pour ces critères.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map(o => (
                      <tr 
                        key={o.id} 
                        style={{ 
                          background: selectedOrderIds.includes(o.id) ? 'rgba(255, 208, 0, 0.06)' : undefined,
                          transition: 'background 0.15s ease'
                        }}
                      >
                        <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                          <input
                            type="checkbox"
                            checked={selectedOrderIds.includes(o.id)}
                            onChange={() => handleToggleSelectOrder(o.id)}
                            style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--bardahl-yellow)' }}
                          />
                        </td>
                        <td style={{ whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                          <span style={{
                            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                            fontWeight: '800',
                            fontSize: '12.5px',
                            color: 'var(--bardahl-yellow)',
                            background: 'rgba(255, 208, 0, 0.08)',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: '1px solid rgba(255, 208, 0, 0.22)',
                            display: 'inline-block',
                            letterSpacing: '0.3px'
                          }}>
                            {o.orderNumber}
                          </span>
                        </td>
                        <td style={{ whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                          <span style={{
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                            fontWeight: '600',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}>
                            <Clock size={12} style={{ opacity: 0.6 }} />
                            {formatDateDisplay(o.date)}
                          </span>
                        </td>
                        <td style={{ verticalAlign: 'middle', minWidth: '220px' }}>
                          <div>
                            <div style={{ color: '#FFFFFF', fontWeight: '800', fontSize: '13px', lineHeight: '1.4' }}>
                              {o.clientName}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', marginTop: '4px' }}>
                              {o.totalFreeItems > 0 && (
                                <span style={{
                                  fontSize: '10px',
                                  padding: '2px 7px',
                                  borderRadius: '6px',
                                  background: 'rgba(52, 199, 89, 0.16)',
                                  color: '#34C759',
                                  fontWeight: '800',
                                  border: '1px solid rgba(52, 199, 89, 0.35)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px'
                                }}>
                                  <span>🎁</span> +{o.totalFreeItems} Offert(s)
                                </span>
                              )}
                              {o.hasCompensation && (
                                <span style={{
                                  fontSize: '10px',
                                  padding: '2px 7px',
                                  borderRadius: '6px',
                                  background: 'rgba(0, 122, 255, 0.16)',
                                  color: '#007AFF',
                                  fontWeight: '800',
                                  border: '1px solid rgba(0, 122, 255, 0.35)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px'
                                }}>
                                  <span>⚖️</span> {o.compensationSummary || 'Régularisé'}
                                </span>
                              )}
                              {o.avoirDeduction > 0 && (
                                <span style={{
                                  fontSize: '10px',
                                  padding: '2px 7px',
                                  borderRadius: '6px',
                                  background: 'rgba(255, 208, 0, 0.16)',
                                  color: 'var(--bardahl-yellow)',
                                  fontWeight: '800',
                                  border: '1px solid rgba(255, 208, 0, 0.35)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px'
                                }}>
                                  <span>💰</span> Avoir déduit -{parseFloat(o.avoirDeduction).toFixed(2)} DH
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                          <span style={{
                            fontSize: '12px',
                            color: 'rgba(255, 255, 255, 0.85)',
                            fontWeight: '600',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            <span style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '50%',
                              background: 'rgba(255, 255, 255, 0.08)',
                              border: '1px solid rgba(255, 255, 255, 0.16)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                              fontWeight: '800',
                              color: 'var(--bardahl-yellow)'
                            }}>
                              {(o.commercialName || 'C')[0].toUpperCase()}
                            </span>
                            {o.commercialName}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                          {renderPaymentBadge(o.paymentMethod)}
                        </td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                          <span style={{
                            color: 'var(--bardahl-yellow)',
                            fontWeight: '900',
                            fontSize: '14px',
                            letterSpacing: '0.2px'
                          }}>
                            {(parseFloat(o.totalTtc) || 0).toFixed(2)} <span style={{ fontSize: '11px', color: 'rgba(255, 208, 0, 0.7)' }}>DH</span>
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                          {renderOrderStatusBadge(o.status)}
                        </td>
                        <td style={{ textAlign: 'center', whiteSpace: 'nowrap', verticalAlign: 'middle' }}>
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            whiteSpace: 'nowrap',
                            flexWrap: 'nowrap'
                          }}>
                            {isAdmin && (
                              <select
                                value={o.status === 'DRAFT' ? 'EN_ATTENTE' : (o.status || 'EN_ATTENTE')}
                                onChange={(e) => handleStatusChange(o, e.target.value)}
                                style={{
                                  height: '32px',
                                  padding: '0 8px',
                                  fontSize: '11px',
                                  fontWeight: '800',
                                  cursor: 'pointer',
                                  borderRadius: '8px',
                                  outline: 'none',
                                  background: o.status === 'VALIDATED' ? 'rgba(0, 122, 255, 0.18)' :
                                              o.status === 'DELIVERED' ? 'rgba(52, 199, 89, 0.18)' :
                                              o.status === 'CANCELLED' ? 'rgba(255, 69, 58, 0.18)' :
                                              'rgba(255, 149, 0, 0.18)',
                                  color: o.status === 'VALIDATED' ? '#007AFF' :
                                         o.status === 'DELIVERED' ? '#34C759' :
                                         o.status === 'CANCELLED' ? '#FF453A' :
                                         '#FF9500',
                                  border: `1px solid ${
                                    o.status === 'VALIDATED' ? 'rgba(0, 122, 255, 0.45)' :
                                    o.status === 'DELIVERED' ? 'rgba(52, 199, 89, 0.45)' :
                                    o.status === 'CANCELLED' ? 'rgba(255, 69, 58, 0.45)' :
                                    'rgba(255, 149, 0, 0.45)'
                                  }`,
                                  transition: 'all 0.2s'
                                }}
                                title="Direction Bardahl : Changer le statut du bon (Validé, Livré, Annulé)"
                              >
                                <option value="EN_ATTENTE" style={{ background: '#12151C', color: '#FF9500' }}>⏳ En Attente</option>
                                <option value="VALIDATED" style={{ background: '#12151C', color: '#007AFF' }}>✓ Validé</option>
                                <option value="DELIVERED" style={{ background: '#12151C', color: '#34C759' }}>🚚 Livré</option>
                                <option value="CANCELLED" style={{ background: '#12151C', color: '#FF453A' }}>✕ Annulé</option>
                              </select>
                            )}

                            <button
                              onClick={() => generateOrderPdf(o)}
                              className="btn-secondary"
                              style={{
                                height: '32px',
                                padding: '0 10px',
                                fontSize: '11px',
                                fontWeight: '700',
                                borderRadius: '8px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              title="Télécharger Bon de Commande (PDF)"
                            >
                              <FileText style={{ width: '13px', height: '13px', color: 'var(--bardahl-yellow)' }} />
                              <span>PDF</span>
                            </button>

                            <button
                              onClick={() => handleOpenRemiseAdjustment(o)}
                              style={{
                                height: '32px',
                                padding: '0 10px',
                                fontSize: '11px',
                                fontWeight: '700',
                                color: '#007AFF',
                                borderColor: 'rgba(0, 122, 255, 0.4)',
                                background: 'rgba(0, 122, 255, 0.08)',
                                borderRadius: '8px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                cursor: 'pointer',
                                border: '1px solid rgba(0, 122, 255, 0.4)',
                                transition: 'all 0.2s'
                              }}
                              title="Régularisation & Compensation Remise Produit"
                            >
                              <Scale style={{ width: '13px', height: '13px' }} />
                              <span>Régulariser</span>
                            </button>

                            <button
                              onClick={() => handleOpenEditWizard(o)}
                              style={{
                                height: '32px',
                                width: '32px',
                                padding: 0,
                                fontSize: '12px',
                                color: 'var(--bardahl-yellow)',
                                border: '1px solid rgba(255, 208, 0, 0.35)',
                                background: 'rgba(255, 208, 0, 0.08)',
                                borderRadius: '8px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                              title="Modifier ce bon de commande"
                            >
                              <Edit3 style={{ width: '14px', height: '14px' }} />
                            </button>

                            <button
                              onClick={() => handleDeleteOrder(o)}
                              className="btn-delete-order"
                              style={{
                                height: '32px',
                                width: '32px',
                                padding: 0,
                                fontSize: '12px',
                                color: '#FF453A',
                                background: 'rgba(255, 69, 58, 0.12)',
                                border: '1px solid rgba(255, 69, 58, 0.35)',
                                borderRadius: '8px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                              }}
                              title="Supprimer ce bon de commande"
                            >
                              <Trash2 style={{ width: '14px', height: '14px' }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        /* COMPENSATIONS REGISTER TAB */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Summary Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div className="glass-card" style={{ padding: '18px', borderLeft: '4px solid #FF9500' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>Avoirs en Attente</span>
                <Clock size={18} color="#FF9500" />
              </div>
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#FF9500', marginTop: '8px' }}>
                {pendingCompensationsTotalDh.toFixed(2)} DH TTC
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {clientCompensations.filter(c => c.status === 'PENDING').length} compensation(s) à déduire sur prochain bon
              </div>
            </div>

            <div className="glass-card" style={{ padding: '18px', borderLeft: '4px solid #34C759' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>Avoirs Déjà Consommés</span>
                <CheckCircle2 size={18} color="#34C759" />
              </div>
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#34C759', marginTop: '8px' }}>
                {consumedCompensationsTotalDh.toFixed(2)} DH TTC
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {clientCompensations.filter(c => c.status === 'CONSUMED').length} avoir(s) déduits avec succès
              </div>
            </div>

            <div className="glass-card" style={{ padding: '18px', borderLeft: '4px solid #007AFF' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>Total Dossiers Régularisés</span>
                <Scale size={18} color="#007AFF" />
              </div>
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#007AFF', marginTop: '8px' }}>
                {clientCompensations.length} Dossiers
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Traçabilité intégrale des rectifications de remise
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="glass-card" style={{ padding: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <Search style={{ width: '16px', height: '16px', color: 'var(--bardahl-yellow)', position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Rechercher par Bon, Client ou motif..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: '40px' }}
                />
              </div>

              <div>
                <select
                  value={compensationStatusFilter}
                  onChange={e => setCompensationStatusFilter(e.target.value)}
                  className="input-field"
                  style={{ padding: '10px' }}
                >
                  <option value="ALL">Tous les Dossiers ({clientCompensations.length})</option>
                  <option value="PENDING">En Attente de compensation ({clientCompensations.filter(c => c.status === 'PENDING').length})</option>
                  <option value="CONSUMED">Consommés / Déduits ({clientCompensations.filter(c => c.status === 'CONSUMED').length})</option>
                </select>
              </div>
            </div>
          </div>

          {/* Compensations Table */}
          <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Bon Origine</th>
                    <th>Date Rectif.</th>
                    <th>Client</th>
                    <th>Produit(s) & Rectification</th>
                    <th>Avoir (DH TTC)</th>
                    <th>Équivalent Remise</th>
                    <th>Mode Choisi</th>
                    <th>Statut</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCompensations.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
                        Aucune compensation enregistrée dans ce registre.
                      </td>
                    </tr>
                  ) : (
                    filteredCompensations.map(c => (
                      <tr key={c.id}>
                        <td>
                          <strong style={{ color: 'var(--bardahl-yellow)' }}>{c.orderNumber}</strong>
                        </td>
                        <td style={{ fontSize: '12px' }}>{c.date}</td>
                        <td>
                          <strong style={{ color: '#FFFFFF' }}>{c.clientName}</strong>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            {(c.items || []).map((it, idx) => (
                              <div key={idx} style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ color: '#FFFFFF', fontWeight: '600' }}>{it.productName || it.reference}</span>
                                <span style={{ color: 'var(--text-secondary)' }}>({it.qty}x) :</span>
                                <span style={{ color: '#FF453A', textDecoration: 'line-through' }}>{it.oldRemisePercent}%</span>
                                <ArrowRight size={10} color="var(--bardahl-yellow)" />
                                <span style={{ color: '#34C759', fontWeight: '800' }}>{it.newRemisePercent}%</span>
                                <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '4px', background: 'rgba(255, 208, 0, 0.1)', color: 'var(--bardahl-yellow)' }}>
                                  Δ {it.diffPercent}% = {parseFloat(it.amountDh || 0).toFixed(2)} DH
                                </span>
                              </div>
                            ))}
                            {c.reason && (
                              <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '2px' }}>
                                💡 {c.reason}
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '14px', fontWeight: '900', color: '#34C759' }}>
                            {parseFloat(c.totalAmountDh || 0).toFixed(2)} DH
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '13px', fontWeight: '800', color: '#007AFF' }}>
                            +{parseFloat(c.equivalentPercent || 0).toFixed(2)}%
                          </span>
                        </td>
                        <td>
                          <span style={{
                            fontSize: '11px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: c.chosenMode === 'DH' ? 'rgba(52, 199, 89, 0.15)' : 'rgba(0, 122, 255, 0.15)',
                            color: c.chosenMode === 'DH' ? '#34C759' : '#007AFF',
                            fontWeight: '700'
                          }}>
                            {c.chosenMode === 'DH' ? 'Avoir Déduction DH' : 'Remise % Prochain Bon'}
                          </span>
                        </td>
                        <td>
                          {c.status === 'PENDING' ? (
                            <span style={{
                              fontSize: '11px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: 'rgba(255, 149, 0, 0.2)',
                              color: '#FF9500',
                              fontWeight: '800',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <Clock size={11} /> En Attente
                            </span>
                          ) : (
                            <span style={{
                              fontSize: '11px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: 'rgba(52, 199, 89, 0.2)',
                              color: '#34C759',
                              fontWeight: '800',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <CheckCircle2 size={11} /> Consommé {c.consumedOnOrderNumber ? `(${c.consumedOnOrderNumber})` : ''}
                            </span>
                          )}
                        </td>
                        <td>
                          {c.status === 'PENDING' && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Supprimer cette compensation de ${c.totalAmountDh} DH pour le client ${c.clientName} ?`)) {
                                  deleteClientCompensation(c.id)
                                }
                              }}
                              className="btn-delete-order"
                              style={{
                                height: '32px',
                                width: '32px',
                                padding: 0,
                                fontSize: '12px',
                                color: '#FF453A',
                                background: 'rgba(255, 69, 58, 0.12)',
                                border: '1px solid rgba(255, 69, 58, 0.35)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              title="Annuler cette compensation"
                            >
                              <Trash2 style={{ width: '14px', height: '14px' }} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Order Creation / Edit Wizard Dialog */}
      {showOrderWizard && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 1000 }}>
          <div className="glass-card" style={{ width: '96vw', maxWidth: '1280px', maxHeight: '94vh', overflowY: 'auto', borderColor: 'rgba(255, 208, 0, 0.45)', padding: '26px' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid var(--border-card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, var(--bardahl-yellow), #E5B800)',
                  color: '#0D0F12',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 15px rgba(255, 208, 0, 0.3)'
                }}>
                  <FileText style={{ width: '22px', height: '22px' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '19px', fontWeight: '900', color: '#FFFFFF' }}>
                    {editingOrder ? `Modifier Bon de Commande ${editingOrder.orderNumber}` : 'Création Bon de Commande Bardahl'}
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Saisie complète du bon commercial • Articles, Gratuités, Remises Lignes et Offres Bardahl
                  </p>
                </div>
              </div>

              <button
                onClick={() => { setShowOrderWizard(false); setEditingOrder(null); setClientSearchQuery(''); setProductSearchQuery(''); }}
                style={{ color: 'var(--text-secondary)', fontSize: '24px', cursor: 'pointer', background: 'none', border: 'none', padding: '4px' }}
                title="Fermer"
              >
                &times;
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* N° de Bon & Client Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '16px', alignItems: 'start' }}>
                {/* N° de Bon */}
                <div style={{ background: '#14171F', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-card)' }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--bardahl-yellow)', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Hash style={{ width: '15px', height: '15px' }} /> N° de Bon de Commande
                  </label>
                  <input
                    type="text"
                    value={customOrderNumber}
                    onChange={e => setCustomOrderNumber(e.target.value)}
                    placeholder={suggestedOrderNumber}
                    className="input-field"
                    style={{ fontWeight: '800', fontSize: '13px', color: '#FFFFFF' }}
                  />
                </div>

                {/* Step 1: Select Client */}
                <div className="client-search-container" style={{ position: 'relative', background: '#14171F', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-card)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--bardahl-yellow)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      1. Sélectionner le Client *
                    </label>
                    {selectedClient && (
                      <span style={{ fontSize: '11px', color: '#34C759', fontWeight: '800' }}>
                        ✓ Client Assigné
                      </span>
                    )}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <Search style={{ width: '15px', height: '15px', position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--bardahl-yellow)', pointerEvents: 'none' }} />
                    <input
                      type="text"
                      className="input-field"
                      placeholder="🔎 Rechercher par code client (ex: CL00477), nom ou ville..."
                      value={clientSearchQuery}
                      onChange={e => {
                        setClientSearchQuery(e.target.value)
                        setShowClientDropdown(true)
                        if (!e.target.value) setSelectedClient('')
                      }}
                      onFocus={() => setShowClientDropdown(true)}
                      style={{ paddingLeft: '36px', paddingRight: clientSearchQuery ? '36px' : '14px', height: '40px', fontSize: '13px', borderRadius: '10px' }}
                    />
                    {clientSearchQuery && (
                      <button
                        type="button"
                        onClick={() => { setClientSearchQuery(''); setSelectedClient(''); }}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', cursor: 'pointer' }}
                        title="Effacer"
                      >
                        <X size={12} />
                      </button>
                    )}
                    {showClientDropdown && (
                      <div style={{
                        position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#181C24', border: '1px solid var(--border-card)',
                        borderRadius: '12px', maxHeight: '220px', overflowY: 'auto', zIndex: 1020, boxShadow: '0 12px 35px rgba(0,0,0,0.7)'
                      }}>
                        {filteredClientOptions.length === 0 ? (
                          <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
                            Aucun client trouvé pour « {clientSearchQuery} »
                          </div>
                        ) : (
                          filteredClientOptions.map(c => (
                            <div
                              key={c.id}
                              onClick={() => { setSelectedClient(c.id); setClientSearchQuery(`${c.codeClient ? '[' + c.codeClient + '] ' : ''}${c.companyName} (${c.city})`); setShowClientDropdown(false); }}
                              style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 208, 0, 0.08)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <div>
                                <strong style={{ color: 'var(--bardahl-yellow)', fontSize: '12px' }}>{c.codeClient || 'CLIENT'}</strong>
                                <span style={{ color: '#FFFFFF', fontWeight: '700', marginLeft: '8px', fontSize: '13px' }}>{c.companyName}</span>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '11px', marginLeft: '6px' }}>({c.city})</span>
                              </div>
                              {c.ice && (
                                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', background: '#14171F', padding: '2px 6px', borderRadius: '4px' }}>
                                  ICE: {c.ice}
                                </span>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Alert: Pending Compensations / Avoirs for this Client */}
              {clientPendingCompensations.length > 0 && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(255, 149, 0, 0.12), rgba(255, 208, 0, 0.08))',
                  border: '1px solid rgba(255, 149, 0, 0.5)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: '0 4px 20px rgba(255, 149, 0, 0.1)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255, 149, 0, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Scale size={18} color="#FF9500" />
                      </div>
                      <div>
                        <strong style={{ color: '#FF9500', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Régularisation de Remise Détectée ({clientPendingCompensations.length} dossier en attente)
                        </strong>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
                          Ce client dispose d'un avoir/compensation suite à une rectification de remise sur une commande antérieure.
                        </p>
                      </div>
                    </div>
                  </div>

                  {clientPendingCompensations.map(comp => {
                    const isApplied = appliedAvoirCompensation?.id === comp.id
                    return (
                      <div key={comp.id} style={{
                        background: 'rgba(0,0,0,0.35)',
                        border: isApplied ? '1px solid #34C759' : '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '10px',
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '14px'
                      }}>
                        <div style={{ flex: 1, minWidth: '220px' }}>
                          <div style={{ fontSize: '13px', fontWeight: '800', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>Bon Origine :</span>
                            <span style={{ color: 'var(--bardahl-yellow)', padding: '2px 8px', borderRadius: '4px', background: 'rgba(255, 208, 0, 0.12)' }}>{comp.orderNumber}</span>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>du {comp.date}</span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            Articles rectifiés : <strong style={{ color: '#FFFFFF' }}>{comp.items?.map(it => `${it.productName || it.reference} (${it.oldRemisePercent}% ➔ ${it.newRemisePercent}%)`).join(', ') || 'Régularisation remise'}</strong>
                          </div>
                          {comp.reason && (
                            <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '2px' }}>
                              Motif : {comp.reason}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '15px', fontWeight: '900', color: '#34C759' }}>
                              {parseFloat(comp.totalAmountDh).toFixed(2)} DH TTC
                            </div>
                            <div style={{ fontSize: '11px', color: '#007AFF', fontWeight: '700' }}>
                              ou équivalent +{parseFloat(comp.equivalentPercent).toFixed(2)}%
                            </div>
                          </div>

                          {isApplied ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{
                                padding: '6px 12px',
                                borderRadius: '8px',
                                background: 'rgba(52, 199, 89, 0.2)',
                                border: '1px solid #34C759',
                                color: '#34C759',
                                fontSize: '12px',
                                fontWeight: '800',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}>
                                <CheckCircle2 size={14} /> {appliedAvoirCompensation.appliedAsPercent ? `Remise +${comp.equivalentPercent}% Appliquée` : `Avoir -${parseFloat(comp.totalAmountDh).toFixed(2)} DH Déduit`}
                              </span>
                              <button
                                type="button"
                                onClick={() => setAppliedAvoirCompensation(null)}
                                className="btn-secondary"
                                style={{ padding: '6px 10px', fontSize: '11px' }}
                              >
                                Annuler
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              <button
                                type="button"
                                onClick={() => setAppliedAvoirCompensation({ ...comp, appliedAsPercent: false })}
                                className="btn-bardahl"
                                style={{
                                  padding: '7px 12px',
                                  fontSize: '11px',
                                  fontWeight: '800',
                                  gap: '6px',
                                  background: 'linear-gradient(135deg, #34C759, #28A745)',
                                  color: '#FFFFFF',
                                  borderColor: '#34C759'
                                }}
                                title="Déduire ce montant directement en Dirhams sur le total à payer de ce bon"
                              >
                                <Coins size={14} /> Option 1 : Déduire {parseFloat(comp.totalAmountDh).toFixed(2)} DH
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAppliedAvoirCompensation({ ...comp, appliedAsPercent: true })
                                  const boostPct = parseFloat(comp.equivalentPercent) || 0
                                  if (selectedProducts.length > 0) {
                                    setSelectedProducts(prev => prev.map(p => ({
                                      ...p,
                                      remisePercent: Math.min(100, (parseFloat(p.remisePercent) || 0) + boostPct)
                                    })))
                                  }
                                }}
                                className="btn-secondary"
                                style={{
                                  padding: '7px 12px',
                                  fontSize: '11px',
                                  fontWeight: '800',
                                  gap: '6px',
                                  color: '#007AFF',
                                  borderColor: '#007AFF',
                                  background: 'rgba(0, 122, 255, 0.1)'
                                }}
                                title="Appliquer un pourcentage additionnel sur les produits"
                              >
                                <BadgePercent size={14} /> Option 2 : +{parseFloat(comp.equivalentPercent).toFixed(2)}%
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Step 2: Mode de Paiement & Expédition */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--bardahl-yellow)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CreditCard style={{ width: '15px', height: '15px' }} /> 2. Mode de Paiement
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                    {['Chèque', 'Virement', 'Carte Bancaire', 'Espèces', 'Traite'].map(method => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        style={{
                          padding: '9px 6px', borderRadius: '8px', fontSize: '11px', fontWeight: '800', cursor: 'pointer',
                          background: paymentMethod === method ? 'var(--bardahl-yellow)' : '#14171F',
                          color: paymentMethod === method ? '#0D0F12' : 'var(--text-secondary)',
                          border: paymentMethod === method ? '1px solid var(--bardahl-yellow)' : '1px solid var(--border-card)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--bardahl-yellow)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Truck style={{ width: '15px', height: '15px' }} /> 3. Mode d'Expédition
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={modeExpedition}
                      onChange={e => setModeExpedition(e.target.value)}
                      style={{
                        width: '100%',
                        height: '40px',
                        fontSize: '13px',
                        fontWeight: '800',
                        color: '#FFFFFF',
                        backgroundColor: '#161922',
                        border: '1.5px solid rgba(255, 208, 0, 0.45)',
                        borderRadius: '8px',
                        paddingLeft: '14px',
                        paddingRight: '36px',
                        cursor: 'pointer',
                        outline: 'none',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                        appearance: 'none',
                        WebkitAppearance: 'none',
                        MozAppearance: 'none'
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = 'var(--bardahl-yellow)'}
                      onBlur={e => e.currentTarget.style.borderColor = 'rgba(255, 208, 0, 0.45)'}
                    >
                      <option value="Transport Bardahl" style={{ backgroundColor: '#181C24', color: '#FFFFFF', fontSize: '13px', fontWeight: 'bold' }}>
                        🚚 Transport Bardahl (Livraison Interne)
                      </option>
                      <option value="Livraison Client" style={{ backgroundColor: '#181C24', color: '#FFFFFF', fontSize: '13px', fontWeight: 'bold' }}>
                        🏢 Livraison Client directe
                      </option>
                      <option value="Enlèvement Magasin" style={{ backgroundColor: '#181C24', color: '#FFFFFF', fontSize: '13px', fontWeight: 'bold' }}>
                        🏪 Enlèvement Magasin (Client Récupère)
                      </option>
                      <option value="Transporteur Externe" style={{ backgroundColor: '#181C24', color: '#FFFFFF', fontSize: '13px', fontWeight: 'bold' }}>
                        📦 Transporteur Externe / Privé
                      </option>
                    </select>
                    <ChevronDown style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--bardahl-yellow)', pointerEvents: 'none' }} />
                  </div>
                  <div style={{ marginTop: '5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Mode sélectionné :</span>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--bardahl-yellow)' }}>
                      {modeExpedition}
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 3: Add Products */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: '800', color: 'var(--bardahl-yellow)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Gift style={{ width: '18px', height: '18px' }} /> 4. Articles & Gratuités *
                    </label>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {selectedProducts.length === 0 ? 'Ajoutez les articles au bon de commande' : `${selectedProducts.length} référence(s) sélectionnée(s)`}
                    </span>
                  </div>

                  {/* Advanced Search Bar with Floating Catalog Picker */}
                  <div className="product-search-container" style={{ position: 'relative', width: '520px', maxWidth: '100%' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <Search style={{ width: '16px', height: '16px', position: 'absolute', left: '14px', color: 'var(--bardahl-yellow)', pointerEvents: 'none' }} />
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Rechercher par référence (ex: 2580), désignation, gamme..."
                        value={productSearchQuery}
                        onChange={e => {
                          setProductSearchQuery(e.target.value)
                          setShowProductDropdown(true)
                        }}
                        onFocus={() => setShowProductDropdown(true)}
                        style={{
                          paddingLeft: '40px',
                          paddingRight: productSearchQuery ? '40px' : '16px',
                          height: '42px',
                          fontSize: '13px',
                          borderRadius: '12px',
                          border: showProductDropdown ? '1px solid var(--bardahl-yellow)' : '1px solid var(--border-card)',
                          boxShadow: showProductDropdown ? '0 0 14px var(--bardahl-yellow-glow)' : 'none'
                        }}
                      />
                      {productSearchQuery && (
                        <button
                          type="button"
                          onClick={() => { setProductSearchQuery('') }}
                          style={{
                            position: 'absolute',
                            right: '12px',
                            background: 'rgba(255,255,255,0.1)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '22px',
                            height: '22px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer'
                          }}
                          title="Effacer la recherche"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    {/* Floating Product Dropdown Picker */}
                    {showProductDropdown && (
                      <div style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        right: 0,
                        width: '640px',
                        maxWidth: '92vw',
                        background: 'rgba(18, 21, 28, 0.98)',
                        border: '1px solid rgba(255, 208, 0, 0.35)',
                        borderRadius: '16px',
                        boxShadow: '0 16px 45px rgba(0, 0, 0, 0.85), 0 0 25px rgba(255, 208, 0, 0.08)',
                        backdropFilter: 'blur(16px)',
                        zIndex: 1100,
                        overflow: 'hidden'
                      }}>
                        {/* Header: Category Filter Pills */}
                        <div style={{ padding: '12px 14px', background: 'rgba(13, 15, 18, 0.95)', borderBottom: '1px solid var(--border-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
                            {productCategoriesList.map(cat => (
                              <button
                                key={cat.id}
                                type="button"
                                onClick={() => setSelectedProductCategoryFilter(cat.id)}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '8px',
                                  fontSize: '11px',
                                  fontWeight: '800',
                                  cursor: 'pointer',
                                  border: 'none',
                                  background: selectedProductCategoryFilter === cat.id ? 'var(--bardahl-yellow)' : '#1F2430',
                                  color: selectedProductCategoryFilter === cat.id ? '#0D0F12' : 'var(--text-secondary)',
                                  transition: 'all 0.15s ease'
                                }}
                              >
                                {cat.label}
                              </button>
                            ))}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700' }}>
                              {filteredProductOptions.length} article(s)
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowProductDropdown(false)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                              title="Fermer"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </div>

                        {/* List of Product Results */}
                        <div style={{ maxHeight: '340px', overflowY: 'auto', padding: '6px' }}>
                          {filteredProductOptions.length === 0 ? (
                            <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                              <AlertCircle size={28} style={{ color: 'var(--bardahl-yellow)', margin: '0 auto 8px' }} />
                              <div style={{ fontSize: '13px', fontWeight: '800', color: '#FFFFFF' }}>Aucun article trouvé</div>
                              <div style={{ fontSize: '11px', marginTop: '4px' }}>
                                Aucun produit ne correspond à votre recherche dans cette catégorie.
                              </div>
                            </div>
                          ) : (
                            filteredProductOptions.slice(0, 40).map(p => {
                              const alreadySelected = selectedProducts.find(item => item.productId === p.id || item.reference === p.reference)

                              return (
                                <div
                                  key={p.id}
                                  onClick={() => handleAddProduct(p.id)}
                                  style={{
                                    padding: '10px 12px',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '12px',
                                    background: alreadySelected ? 'rgba(255, 208, 0, 0.06)' : 'transparent',
                                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                                    transition: 'background 0.15s ease'
                                  }}
                                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 208, 0, 0.12)'}
                                  onMouseLeave={e => e.currentTarget.style.background = alreadySelected ? 'rgba(255, 208, 0, 0.06)' : 'transparent'}
                                >
                                  {/* Left: Ref + Category + Name */}
                                  <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                                      <span style={{
                                        fontSize: '11px',
                                        fontWeight: '900',
                                        padding: '2px 7px',
                                        borderRadius: '5px',
                                        background: 'rgba(255, 208, 0, 0.18)',
                                        color: 'var(--bardahl-yellow)',
                                        letterSpacing: '0.4px'
                                      }}>
                                        REF: {p.reference}
                                      </span>
                                      <span style={{
                                        fontSize: '10px',
                                        fontWeight: '700',
                                        padding: '1px 6px',
                                        borderRadius: '4px',
                                        background: '#2B313E',
                                        color: '#CBD5E1'
                                      }}>
                                        {(() => {
                                          const famInfo = getFamilyInfo(p.category, activeFamilies)
                                          return `${famInfo.icon} ${famInfo.label}`
                                        })()}
                                      </span>
                                      {p.viscosity && p.viscosity !== 'N/A' && (
                                        <span style={{ fontSize: '10px', fontWeight: '800', color: '#007AFF' }}>
                                          {p.viscosity}
                                        </span>
                                      )}
                                      {alreadySelected && (
                                        <span style={{ fontSize: '10px', fontWeight: '800', color: '#34C759', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                          ✓ Dans le bon (Qté: {alreadySelected.qty})
                                        </span>
                                      )}
                                    </div>

                                    <div style={{ fontWeight: '800', color: '#FFFFFF', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                      {p.name}
                                    </div>

                                    {p.packaging && (
                                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                        Carton : {p.packaging}
                                      </div>
                                    )}
                                  </div>

                                  {/* Right: Price + Add Button */}
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                                    <div style={{ textAlign: 'right' }}>
                                      <div style={{ fontSize: '14px', fontWeight: '900', color: 'var(--bardahl-yellow)' }}>
                                        {(parseFloat(p.priceTtc) || 0).toFixed(2)} DH
                                      </div>
                                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                                        TTC
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleAddProduct(p.id)
                                      }}
                                      style={{
                                        padding: '6px 12px',
                                        borderRadius: '8px',
                                        fontSize: '11px',
                                        fontWeight: '800',
                                        cursor: 'pointer',
                                        background: alreadySelected ? '#34C759' : 'var(--bardahl-yellow)',
                                        color: '#0D0F12',
                                        border: 'none',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                                      }}
                                    >
                                      <Plus size={13} /> {alreadySelected ? '+1' : 'Ajouter'}
                                    </button>
                                  </div>
                                </div>
                              )
                            })
                          )}
                        </div>

                        {/* Footer note */}
                        <div style={{ padding: '8px 14px', background: 'rgba(13, 15, 18, 0.95)', borderTop: '1px solid var(--border-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            💡 Cliquez sur un article ou sur "+1" pour l'ajouter instantanément au bon de commande.
                          </span>
                          <button
                            type="button"
                            onClick={() => setShowProductDropdown(false)}
                            className="btn-secondary"
                            style={{ padding: '3px 12px', fontSize: '11px' }}
                          >
                            Fermer
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Batch Remise Quick Buttons Bar */}
                {/* Batch Remise Quick Buttons Bar */}
                {selectedProducts.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255, 208, 0, 0.06)', padding: '10px 14px', borderRadius: '10px', border: '1px dashed rgba(255, 208, 0, 0.35)', marginBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Percent style={{ width: '15px', height: '15px', color: 'var(--bardahl-yellow)' }} />
                      <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--bardahl-yellow)' }}>
                        Application Rapide de la Remise sur Tout le Panier :
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      {/* Saisie Libre Personnalisée (Custom Remise Input) */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0D0F12', padding: '4px 8px', borderRadius: '8px', border: '1px solid rgba(255, 208, 0, 0.45)' }}>
                        <span style={{ fontSize: '11px', fontWeight: '800', color: '#FFFFFF' }}>
                          Remise au choix :
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            placeholder="Ex: 3"
                            value={customBatchRemise}
                            onChange={e => setCustomBatchRemise(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleApplyCustomBatchRemise(customBatchRemise)
                              }
                            }}
                            style={{
                              width: '65px',
                              height: '28px',
                              background: '#181C24',
                              border: '1px solid var(--border-card)',
                              borderRadius: '6px',
                              color: 'var(--bardahl-yellow)',
                              fontSize: '13px',
                              fontWeight: '900',
                              textAlign: 'center',
                              padding: '0 4px',
                              outline: 'none'
                            }}
                          />
                          <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--bardahl-yellow)', marginLeft: '4px', marginRight: '4px' }}>%</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleApplyCustomBatchRemise(customBatchRemise)}
                          style={{
                            padding: '4px 12px',
                            height: '28px',
                            fontSize: '11px',
                            fontWeight: '800',
                            borderRadius: '6px',
                            background: 'linear-gradient(135deg, var(--bardahl-yellow), #E5B800)',
                            color: '#0D0F12',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            boxShadow: '0 2px 6px rgba(255, 208, 0, 0.25)'
                          }}
                          title="Appliquer cette remise personnalisée sur tous les articles du panier"
                        >
                          Appliquer
                        </button>
                      </div>

                      {/* Divider */}
                      <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '14px' }}>|</span>

                      {/* Quick Presets */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        {[
                          { pct: 0, label: '0% (Standard)' },
                          { pct: 5, label: '5%' },
                          { pct: 10, label: '10%' },
                          { pct: 15, label: '15%' },
                          { pct: 20, label: '20%' },
                        ].map(b => (
                          <button
                            key={b.pct}
                            type="button"
                            onClick={() => {
                              setCustomBatchRemise(b.pct === 0 ? '' : b.pct.toString())
                              handleApplyBatchRemise(b.pct)
                            }}
                            style={{
                              padding: '5px 10px',
                              fontSize: '11px',
                              fontWeight: '800',
                              borderRadius: '6px',
                              background: '#14171F',
                              color: b.pct === 0 ? 'var(--text-secondary)' : '#007AFF',
                              border: b.pct === 0 ? '1px solid var(--border-card)' : '1px solid rgba(0, 122, 255, 0.4)',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--bardahl-yellow)'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = b.pct === 0 ? 'var(--border-card)' : 'rgba(0, 122, 255, 0.4)'}
                          >
                            {b.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Wide and Spacious Items Table */}
                <div style={{ borderRadius: '12px', border: '1px solid var(--border-card)', overflow: 'hidden' }}>
                  <table className="custom-table" style={{ width: '100%', margin: 0 }}>
                    <thead>
                      <tr>
                        <th style={{ minWidth: '85px' }}>Réf.</th>
                        <th style={{ minWidth: '240px' }}>Désignation Produit</th>
                        <th style={{ minWidth: '110px' }}>Gamme</th>
                        <th style={{ textAlign: 'center', minWidth: '120px' }}>Quantité</th>
                        <th style={{ textAlign: 'center', minWidth: '120px' }}>Gratuit</th>
                        <th style={{ minWidth: '105px', textAlign: 'right' }}>Prix U. TTC</th>
                        <th style={{ minWidth: '110px', textAlign: 'center' }}>Remise (%)</th>
                        <th style={{ minWidth: '125px', textAlign: 'right' }}>Total Net TTC</th>
                        <th style={{ minWidth: '110px', textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedProducts.length === 0 ? (
                        <tr>
                          <td colSpan="9" style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-secondary)' }}>
                            <ShoppingBag style={{ width: '36px', height: '36px', color: 'var(--text-muted)', margin: '0 auto 8px', display: 'block' }} />
                            <div style={{ fontWeight: '800', color: '#FFFFFF', fontSize: '14px' }}>Aucun article dans ce bon de commande</div>
                            <div style={{ fontSize: '12px', marginTop: '4px', color: 'var(--text-secondary)' }}>
                              Recherchez un produit ou une référence ci-dessus pour composer la commande.
                            </div>
                          </td>
                        </tr>
                      ) : (
                        selectedProducts.map((item, idx) => {
                          const promoDiscount = promoAnalysis.lineDiscounts && promoAnalysis.lineDiscounts[idx] ? promoAnalysis.lineDiscounts[idx] : 0
                          const parsedRemise = parsePercent(item.remisePercent)
                          const hasManualOverride = parsedRemise !== null
                          const currentRemise = hasManualOverride ? parsedRemise : promoDiscount
                          const lineGross = item.priceTtc * item.qty
                          const lineDiscountVal = lineGross * (currentRemise / 100)
                          const lineNet = Math.max(0, lineGross - lineDiscountVal)
                          const upb = item.unitsPerBox || 1
                          const cartons = Math.floor(item.qty / upb)
                          const remainderUnits = item.qty % upb

                          return (
                            <tr key={idx}>
                              <td>
                                <span style={{
                                  fontWeight: '900',
                                  fontSize: '11px',
                                  color: 'var(--bardahl-yellow)',
                                  background: 'rgba(255, 208, 0, 0.12)',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  display: 'inline-block'
                                }}>
                                  {item.reference}
                                </span>
                              </td>
                              <td>
                                <strong style={{ color: '#FFFFFF', fontSize: '13px', display: 'block' }}>{item.productName}</strong>
                                {item.promoTag && (
                                  <div style={{ fontSize: '10px', color: '#34C759', fontWeight: 'bold', marginTop: '2px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                    <Sparkles size={10} /> {item.promoTag}
                                  </div>
                                )}
                              </td>
                              <td>
                                <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '5px', background: '#2B313E', color: '#CBD5E1', fontWeight: '700' }}>
                                  {item.category || 'Bardahl'}
                                </span>
                              </td>

                              {/* § 4 & § 18.1-2 : Quantité saisie en Unités avec symbole carton interactif et conversion instantanée */}
                              <td style={{ textAlign: 'center' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', background: '#0D0F12', border: '1px solid rgba(255, 208, 0, 0.4)', borderRadius: '8px', padding: '2px' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleQtyChange(idx, Math.max(1, (parseInt(item.qty, 10) || 1) - 1))}
                                    style={{ width: '28px', height: '28px', background: 'transparent', border: 'none', color: 'var(--bardahl-yellow)', fontSize: '16px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    title="Diminuer d'une unité"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.qty}
                                    onChange={e => handleQtyChange(idx, e.target.value)}
                                    style={{
                                      width: '46px',
                                      height: '28px',
                                      textAlign: 'center',
                                      background: 'transparent',
                                      border: 'none',
                                      color: '#FFFFFF',
                                      fontWeight: '800',
                                      fontSize: '13px',
                                      outline: 'none'
                                    }}
                                    title="Saisie en unités (flacons, bidons...)"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleQtyChange(idx, (parseInt(item.qty, 10) || 0) + 1)}
                                    style={{ width: '28px', height: '28px', background: 'transparent', border: 'none', color: 'var(--bardahl-yellow)', fontSize: '16px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    title="Augmenter d'une unité"
                                  >
                                    +
                                  </button>
                                </div>

                                {/* Symbole carton interactif & réactif : clic ajoute 1 carton (+upb un.) instantanément */}
                                <div style={{ marginTop: '5px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                    {cartons > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const newCartons = Math.max(1, cartons - 1)
                                          handleQtyChange(idx, newCartons * upb)
                                        }}
                                        title={`Retirer 1 carton (-${upb} unités)`}
                                        style={{
                                          background: 'rgba(255, 208, 0, 0.1)',
                                          border: '1px solid rgba(255, 208, 0, 0.3)',
                                          color: 'var(--bardahl-yellow)',
                                          borderRadius: '5px',
                                          width: '20px',
                                          height: '22px',
                                          fontSize: '12px',
                                          fontWeight: '900',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          padding: 0
                                        }}
                                      >
                                        -
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newCartons = cartons + 1
                                        handleQtyChange(idx, newCartons * upb)
                                      }}
                                      title={`Cliquer pour ajouter +1 carton (+${upb} unités)`}
                                      style={{
                                        background: 'linear-gradient(135deg, rgba(255, 208, 0, 0.2), rgba(255, 149, 0, 0.15))',
                                        border: '1px solid var(--bardahl-yellow)',
                                        color: 'var(--bardahl-yellow)',
                                        borderRadius: '6px',
                                        padding: '3px 8px',
                                        fontSize: '11px',
                                        fontWeight: '800',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        transition: 'all 0.15s ease',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
                                      }}
                                      onMouseEnter={e => {
                                        e.currentTarget.style.background = 'var(--bardahl-yellow)'
                                        e.currentTarget.style.color = '#000'
                                      }}
                                      onMouseLeave={e => {
                                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255, 208, 0, 0.2), rgba(255, 149, 0, 0.15))'
                                        e.currentTarget.style.color = 'var(--bardahl-yellow)'
                                      }}
                                    >
                                      <span style={{ fontSize: '13px' }}>📦</span>
                                      <span>{cartons} Carton{cartons > 1 ? 's' : ''}</span>
                                      <span style={{ fontSize: '10px', opacity: 0.9, fontWeight: '900' }}>+1 📦</span>
                                    </button>
                                  </div>

                                  {remainderUnits > 0 && (
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>
                                      (+{remainderUnits} un. hors carton)
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Colonne GRATUIT : stricte application de l'offre sélectionnée sans modification manuelle */}
                              <td style={{ textAlign: 'center' }}>
                                {(() => {
                                  const freeItem = (promoAnalysis.freeItems || []).find(fi => fi.reference === item.reference || fi.productId === item.productId)
                                  const freeCartons = freeItem ? (parseInt(freeItem.qtyGratuit, 10) || 0) : 0
                                  const freeUnits = freeCartons * upb

                                  if (freeCartons > 0) {
                                    return (
                                      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                                        <span style={{
                                          background: 'rgba(52, 199, 89, 0.18)',
                                          color: '#34C759',
                                          border: '1px solid rgba(52, 199, 89, 0.45)',
                                          borderRadius: '7px',
                                          padding: '4px 10px',
                                          fontWeight: '900',
                                          fontSize: '12px',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '5px',
                                          boxShadow: '0 2px 6px rgba(52, 199, 89, 0.15)'
                                        }}
                                        title={`Gratuité calculée automatiquement via l'offre ${freeItem.promoName || ''}`}
                                        >
                                          🎁 {freeCartons} carton{freeCartons > 1 ? 's' : ''}
                                        </span>
                                        <span style={{ fontSize: '10px', color: '#34C759', fontWeight: 'bold' }}>
                                          ({freeUnits} un. offert{freeUnits > 1 ? 'es' : 'e'})
                                        </span>
                                      </div>
                                    )
                                  }

                                  return (
                                    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                                      <span style={{
                                        color: '#8E95A5',
                                        fontSize: '12px',
                                        fontWeight: '800',
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        border: '1px solid rgba(255, 255, 255, 0.08)',
                                        padding: '4px 14px',
                                        borderRadius: '6px'
                                      }}>
                                        0
                                      </span>
                                      <span style={{ fontSize: '9px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                        {selectedPromoId === 'NONE' ? 'Sans promo' : 'Condition non atteinte'}
                                      </span>
                                    </div>
                                  )
                                })()}
                              </td>

                              <td style={{ textAlign: 'right', fontWeight: '700', color: 'var(--text-primary)', fontSize: '12px' }}>
                                {item.priceTtc.toFixed(2)} DH
                              </td>

                              {/* § 8 & § 9 & § 18.4 : Remise Commerciale (%) acceptant les décimales avec virgule ou point + Alerte manuelle vs promo */}
                              <td style={{ textAlign: 'center' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', background: '#0D0F12', border: currentRemise > 0 ? '1px solid #007AFF' : '1px solid var(--border-card)', borderRadius: '8px', padding: '2px 6px' }}>
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={item.remisePercent !== undefined && item.remisePercent !== '' ? item.remisePercent : (promoDiscount > 0 ? promoDiscount : '')}
                                    onChange={e => handleLineRemiseChange(idx, e.target.value)}
                                    placeholder={promoDiscount > 0 ? `${promoDiscount}` : "0"}
                                    style={{
                                      width: '48px',
                                      height: '26px',
                                      textAlign: 'center',
                                      background: 'transparent',
                                      border: 'none',
                                      color: currentRemise > 0 ? '#007AFF' : '#FFFFFF',
                                      fontWeight: '800',
                                      fontSize: '12px',
                                      outline: 'none'
                                    }}
                                    title="Remise commerciale en % sur cet article (saisie décimale avec virgule ou point)"
                                  />
                                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: currentRemise > 0 ? '#007AFF' : 'var(--text-secondary)', paddingRight: '2px' }}>%</span>
                                </div>
                                {hasManualOverride && promoDiscount > 0 && (
                                  <div style={{ fontSize: '10px', color: '#FF9500', fontWeight: 'bold', marginTop: '2px' }} title="Remise manuelle prioritaire sur la promotion">
                                    ⚠️ Manuelle ({item.remisePercent}%)
                                  </div>
                                )}
                              </td>

                              {/* Total Net TTC */}
                              <td style={{ textAlign: 'right' }}>
                                {currentRemise > 0 ? (
                                  <div>
                                    <div style={{ color: 'var(--bardahl-yellow)', fontWeight: '900', fontSize: '13px' }}>
                                      {lineNet.toFixed(2)} DH
                                    </div>
                                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textDecoration: 'line-through' }}>
                                      {lineGross.toFixed(2)} DH
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ color: 'var(--bardahl-yellow)', fontWeight: '900', fontSize: '13px' }}>
                                    {lineGross.toFixed(2)} DH
                                  </div>
                                )}
                              </td>

                              <td style={{ textAlign: 'center' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleQtyChange(idx, 0)}
                                    style={{
                                      color: '#FF453A',
                                      background: 'rgba(255, 69, 58, 0.1)',
                                      border: '1px solid rgba(255, 69, 58, 0.3)',
                                      borderRadius: '6px',
                                      padding: '5px 8px',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center'
                                    }}
                                    title="Supprimer la ligne"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}

                      {/* § 10, § 11 & § 18.5-7 : Affichage automatique des cadeaux promotionnels distincts sans doublon */}
                      {promoAnalysis.freeItems && promoAnalysis.freeItems
                        .filter(fi => !selectedProducts.some(sp => sp.reference === fi.reference || sp.productId === fi.productId))
                        .map((fi, fiIdx) => (
                        <tr key={`promo_gift_${fiIdx}`} style={{ background: 'rgba(52, 199, 89, 0.08)', borderLeft: '3px solid #34C759' }}>
                          <td>
                            <span style={{
                              fontWeight: '900',
                              fontSize: '11px',
                              color: '#34C759',
                              background: 'rgba(52, 199, 89, 0.15)',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              display: 'inline-block'
                            }}>
                              {fi.reference}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <strong style={{ color: '#FFFFFF', fontSize: '13px' }}>{fi.productName}</strong>
                              <span style={{ background: '#34C759', color: '#0D0F12', fontSize: '10px', fontWeight: '900', padding: '1px 6px', borderRadius: '4px' }}>
                                🎁 CADEAU
                              </span>
                            </div>
                            <div style={{ fontSize: '10px', color: '#34C759', marginTop: '2px' }}>
                              Offert via « {fi.promoName} »
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '5px', background: 'rgba(52, 199, 89, 0.2)', color: '#34C759', fontWeight: '700' }}>
                              Gratuité Offerte
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ fontWeight: '800', color: '#34C759', fontSize: '13px' }}>
                              {fi.qtyGratuit} carton(s)
                            </span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ color: '#8E95A5', fontSize: '12px' }}>-</span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: '700', color: '#34C759', fontSize: '12px' }}>
                            0.00 DH
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ color: '#8E95A5', fontSize: '12px' }}>-</span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: '900', color: '#34C759', fontSize: '13px' }}>
                            0.00 DH
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{ fontSize: '10px', color: '#34C759', fontWeight: '700' }}>Automatique</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Step 5: Promotions & Offres Commerciales */}
              <div style={{ background: '#14171F', padding: '16px', borderRadius: '14px', border: '1px solid var(--border-card)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '800', color: 'var(--bardahl-yellow)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={16} /> 5. Promotions & Offres Commerciales
                  </label>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Sélectionnez une offre Bardahl ou laissez l'application automatique
                  </span>
                </div>

                {/* Promotion Selector Dropdown */}
                <div>
                  <select
                    value={selectedPromoId}
                    onChange={e => handleSelectPromotion(e.target.value)}
                    className="input-field"
                    style={{ width: '100%', fontWeight: '700', fontSize: '13px', padding: '12px 14px' }}
                  >
                    <option value="AUTO">✨ Application Automatique (Recommandé — selon articles commandés)</option>
                    <option value="NONE">🚫 Aucune Promotion (Appliquer le tarif standard sans offre)</option>
                    {promotions && promotions.filter(p => p.isActive !== false).length > 0 && (
                      <optgroup label="── Offres Commerciales Actives Définies ──">
                        {promotions.filter(p => p.isActive !== false).map(p => {
                          const typeLabel = p.type === 'TYPE_1' ? 'Type 1 Remise' : p.type === 'TYPE_2' ? 'Type 2 Gratuit' : p.type === 'TYPE_3' ? 'Type 3 Bon d\'achat' : 'Type 4 CA Famille'
                          const targetInfo = p.targetType === 'FAMILY' ? `Famille ${p.targetFamily}` : (p.targetProductName || p.targetProductRef)
                          const thresholdInfo = p.type === 'TYPE_4' ? `Dès ${p.threshold} DH` : `Dès ${p.threshold} cartons`
                          return (
                            <option key={p.id} value={p.id}>
                              [{typeLabel}] {p.name} — {targetInfo} ({thresholdInfo})
                            </option>
                          )
                        })}
                      </optgroup>
                    )}
                  </select>
                </div>

                {/* Status Feedback Display for Chosen Mode */}
                {selectedPromoId === 'NONE' ? (
                  <div style={{ padding: '10px 14px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid var(--border-card)', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🚫 Mode sans promotion activé. Aucune remise ni gratuité promotionnelle ne sera calculée sur ce bon de commande.</span>
                  </div>
                ) : selectedPromoId === 'AUTO' ? (
                  promoAnalysis.appliedPromotions.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#34C759', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckCircle2 size={14} /> {promoAnalysis.appliedPromotions.length} offre(s) commerciale(s) activée(s) automatiquement :
                      </div>
                      {promoAnalysis.appliedPromotions.map((ap, i) => (
                        <div key={i} style={{ background: '#0D0F12', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(52, 199, 89, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', fontSize: '12px' }}>
                          <div>
                            <strong style={{ color: '#FFFFFF', display: 'block' }}>{ap.name}</strong>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '11px', marginTop: '2px' }}>
                              Cible : <span style={{ color: 'var(--bardahl-yellow)', fontWeight: 'bold' }}>{ap.targetDisplay}</span> • Condition atteinte : {ap.conditionReached}
                              {ap.appliedTierInfo && <span style={{ color: '#34C759', marginLeft: '6px' }}>({ap.appliedTierInfo})</span>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            {ap.discountPercent > 0 && (
                              <span style={{ background: 'rgba(0, 122, 255, 0.15)', color: '#007AFF', border: '1px solid rgba(0, 122, 255, 0.3)', padding: '3px 8px', borderRadius: '6px', fontWeight: '800', fontSize: '11px' }}>
                                Remise : {ap.discountPercent}%
                              </span>
                            )}
                            {ap.giftSummary && (
                              <span style={{ background: 'rgba(52, 199, 89, 0.15)', color: '#34C759', border: '1px solid rgba(52, 199, 89, 0.3)', padding: '3px 8px', borderRadius: '6px', fontWeight: '800', fontSize: '11px' }}>
                                🎁 {ap.giftSummary}
                              </span>
                            )}
                            {ap.voucherAmount > 0 && (
                              <span style={{ background: 'rgba(255, 149, 0, 0.15)', color: '#FF9500', border: '1px solid rgba(255, 149, 0, 0.3)', padding: '3px 8px', borderRadius: '6px', fontWeight: '800', fontSize: '11px' }}>
                                Bon : -{ap.voucherAmount.toFixed(2)} DH
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '10px 14px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid var(--border-card)', fontSize: '11px', color: 'var(--text-secondary)' }}>
                      ℹ️ Les offres promotionnelles applicables s'activeront automatiquement dès que les quantités ou montants seuils seront atteints.
                    </div>
                  )
                ) : (
                  /* Specific Promo Selected */
                  promoAnalysis.selectedPromoStatus && (
                    <div style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      background: promoAnalysis.selectedPromoStatus.isReached ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 149, 0, 0.1)',
                      border: promoAnalysis.selectedPromoStatus.isReached ? '1px solid rgba(52, 199, 89, 0.4)' : '1px solid rgba(255, 149, 0, 0.4)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {promoAnalysis.selectedPromoStatus.isReached ? (
                            <CheckCircle2 size={16} style={{ color: '#34C759' }} />
                          ) : (
                            <AlertCircle size={16} style={{ color: '#FF9500' }} />
                          )}
                          <strong style={{ color: promoAnalysis.selectedPromoStatus.isReached ? '#34C759' : '#FF9500', fontSize: '13px' }}>
                            {promoAnalysis.selectedPromoStatus.isReached ? 'Offre Validée et Appliquée !' : 'Condition non atteinte pour cette offre'}
                          </strong>
                        </div>
                        <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#FFF' }}>
                          {promoAnalysis.selectedPromoStatus.currentVal} / {promoAnalysis.selectedPromoStatus.threshold} {promoAnalysis.selectedPromoStatus.unitLabel}
                        </span>
                      </div>

                      <p style={{ fontSize: '12px', color: '#DDD', margin: 0, lineHeight: '1.4' }}>
                        {promoAnalysis.selectedPromoStatus.isReached ? (
                          `La condition sur ${promoAnalysis.selectedPromoStatus.targetLabel} est validée (${promoAnalysis.selectedPromoStatus.currentVal} ${promoAnalysis.selectedPromoStatus.unitLabel}). Tous les avantages ont été appliqués sur votre bon de commande.`
                        ) : (
                          `Vous avez actuellement ${promoAnalysis.selectedPromoStatus.currentVal} ${promoAnalysis.selectedPromoStatus.unitLabel} sur ${promoAnalysis.selectedPromoStatus.targetLabel}. Ajoutez encore ${promoAnalysis.selectedPromoStatus.missingValue} ${promoAnalysis.selectedPromoStatus.unitLabel} pour activer cette offre.`
                        )}
                      </p>

                      {/* Box Quantité Restante de Produit (Stock Restant Déduit des articles commandés) */}
                      {(() => {
                        const chosenPromo = promoAnalysis.selectedPromoStatus.promo
                        let targetProds = []
                        if (chosenPromo.targetType === 'FAMILY') {
                          const famProdsInCart = selectedProducts.filter(sp => {
                            const famInfo = getFamilyInfo(sp.category, activeFamilies)
                            return (famInfo.label || '').toLowerCase() === (chosenPromo.targetFamily || '').toLowerCase() ||
                                   (famInfo.code || '').toLowerCase() === (chosenPromo.targetFamily || '').toLowerCase()
                          })
                          if (famProdsInCart.length > 0) {
                            targetProds = famProdsInCart.map(sp => products.find(p => p.id === sp.productId || p.reference === sp.reference) || sp)
                          } else {
                            targetProds = products.filter(p => {
                              const famInfo = getFamilyInfo(p.category, activeFamilies)
                              return (famInfo.label || '').toLowerCase() === (chosenPromo.targetFamily || '').toLowerCase() ||
                                     (famInfo.code || '').toLowerCase() === (chosenPromo.targetFamily || '').toLowerCase()
                            }).slice(0, 3)
                          }
                        } else {
                          const targetRefs = (chosenPromo.targetProductRefs && Array.isArray(chosenPromo.targetProductRefs) && chosenPromo.targetProductRefs.length > 0)
                            ? chosenPromo.targetProductRefs
                            : (chosenPromo.targetProductRef ? [chosenPromo.targetProductRef] : (chosenPromo.targetProductId ? [chosenPromo.targetProductId] : []))

                          targetProds = products.filter(p =>
                            targetRefs.some(r => r === p.reference || r === p.id || r === p.code) ||
                            (chosenPromo.targetProductName && p.name && p.name.toLowerCase() === chosenPromo.targetProductName.toLowerCase()) ||
                            (chosenPromo.name && p.name && chosenPromo.name.toLowerCase().includes(p.name.toLowerCase()))
                          )

                          if (targetProds.length === 0 && selectedProducts.length > 0) {
                            targetProds = selectedProducts.map(sp => products.find(p => p.id === sp.productId || p.reference === sp.reference) || sp)
                          }
                        }

                        if (!targetProds || targetProds.length === 0) return null

                        return (
                          <div style={{
                            marginTop: '10px',
                            padding: '10px 14px',
                            background: 'rgba(0, 0, 0, 0.45)',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 208, 0, 0.3)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Package size={15} color="var(--bardahl-yellow)" />
                                <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--bardahl-yellow)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                                  Quantité Restante de Produit (Stock Disponible) :
                                </span>
                              </div>
                              <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                                Déduction en temps réel selon articles commandés
                              </span>
                            </div>

                            {targetProds.map(tp => {
                              const currentStock = parseInt(tp.stock !== undefined ? tp.stock : 100, 10)
                              const inCartItem = selectedProducts.find(sp => sp.productId === tp.id || sp.reference === tp.reference)
                              const inCartUnits = inCartItem ? (parseInt(inCartItem.qty, 10) || 0) : 0
                              const remainingStock = Math.max(0, currentStock - inCartUnits)
                              const upb = tp.unitsPerBox || getProductUnitsPerCarton(tp) || 1
                              const remainingCartons = Math.floor(remainingStock / upb)
                              const remainingLooseUnits = remainingStock % upb

                              return (
                                <div
                                  key={tp.id || tp.reference}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: '8px',
                                    padding: '7px 10px',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(255, 255, 255, 0.06)'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{
                                      fontSize: '11px',
                                      fontWeight: '900',
                                      color: 'var(--bardahl-yellow)',
                                      background: 'rgba(255, 208, 0, 0.15)',
                                      padding: '2px 7px',
                                      borderRadius: '4px'
                                    }}>
                                      {tp.reference}
                                    </span>
                                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#FFFFFF' }}>
                                      {tp.name}
                                    </span>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{
                                      background: remainingStock > 0 ? 'rgba(52, 199, 89, 0.18)' : 'rgba(255, 69, 58, 0.18)',
                                      color: remainingStock > 0 ? '#34C759' : '#FF453A',
                                      border: remainingStock > 0 ? '1px solid rgba(52, 199, 89, 0.4)' : '1px solid rgba(255, 69, 58, 0.4)',
                                      padding: '3px 10px',
                                      borderRadius: '6px',
                                      fontSize: '11px',
                                      fontWeight: '900',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px'
                                    }}>
                                      <span>📦</span>
                                      <span>
                                        Restant : {remainingStock} un. ({remainingCartons} carton{remainingCartons > 1 ? 's' : ''}{remainingLooseUnits > 0 ? ` + ${remainingLooseUnits} un.` : ''})
                                      </span>
                                    </span>

                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                      (Stock magasin : {currentStock} un.{inCartUnits > 0 ? ` | Dans ce bon : -${inCartUnits} un.` : ''})
                                    </span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )
                      })()}

                      {promoAnalysis.appliedPromotions.length > 0 && (
                        <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {promoAnalysis.appliedPromotions[0].discountPercent > 0 && (
                            <span style={{ background: 'rgba(0, 122, 255, 0.2)', color: '#007AFF', padding: '3px 8px', borderRadius: '6px', fontWeight: '800', fontSize: '11px' }}>
                              Remise : {promoAnalysis.appliedPromotions[0].discountPercent}%
                            </span>
                          )}
                          {promoAnalysis.appliedPromotions[0].giftSummary && (
                            <span style={{ background: 'rgba(52, 199, 89, 0.2)', color: '#34C759', padding: '3px 8px', borderRadius: '6px', fontWeight: '800', fontSize: '11px' }}>
                              🎁 {promoAnalysis.appliedPromotions[0].giftSummary}
                            </span>
                          )}
                          {promoAnalysis.appliedPromotions[0].voucherAmount > 0 && (
                            <span style={{ background: 'rgba(255, 149, 0, 0.2)', color: '#FF9500', padding: '3px 8px', borderRadius: '6px', fontWeight: '800', fontSize: '11px' }}>
                              Bon Immédiat : -{promoAnalysis.appliedPromotions[0].voucherAmount.toFixed(2)} DH
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                )}

                {/* Arbitrage / Choix du commercial en cas de promotions concurrentes */}
                {promoAnalysis.conflicts && promoAnalysis.conflicts.length > 0 && (
                  <div style={{ background: 'rgba(255, 149, 0, 0.1)', border: '1px solid #FF9500', borderRadius: '12px', padding: '14px', marginTop: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <AlertCircle size={18} style={{ color: '#FF9500' }} />
                      <h4 style={{ color: '#FF9500', fontSize: '13px', fontWeight: '800' }}>
                        CHOIX DE LA PROMOTION (Plusieurs offres applicables — Section 16)
                      </h4>
                    </div>
                    <p style={{ fontSize: '11px', color: '#E2E8F0', marginBottom: '10px' }}>
                      Deux promotions ne peuvent pas être cumulées sur le même produit ou la même famille. Veuillez sélectionner l'offre commerciale à appliquer :
                    </p>
                    {promoAnalysis.conflicts.map(conf => (
                      <div key={conf.targetKey} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--bardahl-yellow)' }}>
                          {conf.targetDisplay} :
                        </span>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {conf.options.map(opt => {
                            const isChosen = (commercialPromoChoices[conf.targetKey] || conf.options[0].promo.id) === opt.promo.id
                            return (
                              <button
                                key={opt.promo.id}
                                type="button"
                                onClick={() => setCommercialPromoChoices(prev => ({ ...prev, [conf.targetKey]: opt.promo.id }))}
                                style={{
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                  fontWeight: '800',
                                  background: isChosen ? 'var(--bardahl-yellow)' : '#14171F',
                                  color: isChosen ? '#0D0F12' : '#FFF',
                                  border: isChosen ? '1px solid var(--bardahl-yellow)' : '1px solid var(--border-card)',
                                  cursor: 'pointer'
                                }}
                              >
                                {opt.promo.name}
                                {opt.discountPercent > 0 ? ` (${opt.discountPercent}%)` : ''}
                                {opt.freeQuantity > 0 ? ` +${opt.freeQuantity} gratuit` : ''}
                                {opt.voucherAmount > 0 ? ` +${opt.voucherAmount} DH bon` : ''}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Step 6: Remises Commerciales par Produit (Récapitulatif & Actions Rapides) */}
              <div style={{ background: '#14171F', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-card)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--bardahl-yellow)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Percent style={{ width: '16px', height: '16px' }} /> 6. Remises Commerciales par Produit (Lignes)
                  </label>
                  <span style={{ fontSize: '11px', color: totalLineDiscountAmount > 0 ? '#007AFF' : 'var(--text-secondary)', fontWeight: 'bold' }}>
                    {totalLineDiscountAmount > 0 ? `Total remises calculées : -${totalLineDiscountAmount.toFixed(2)} DH` : 'Définies par article dans le tableau des produits'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Appliquer uniformément à tous les articles :</span>
                  
                  {/* Saisie Libre Personnalisée (Custom Remise Input) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#0D0F12', padding: '3px 6px', borderRadius: '8px', border: '1px solid rgba(255, 208, 0, 0.4)' }}>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      placeholder="Autre %"
                      value={customBatchRemise}
                      onChange={e => setCustomBatchRemise(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleApplyCustomBatchRemise(customBatchRemise)
                        }
                      }}
                      style={{
                        width: '60px',
                        height: '26px',
                        background: '#181C24',
                        border: '1px solid var(--border-card)',
                        borderRadius: '5px',
                        color: 'var(--bardahl-yellow)',
                        fontSize: '12px',
                        fontWeight: '900',
                        textAlign: 'center',
                        padding: '0 4px',
                        outline: 'none'
                      }}
                    />
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--bardahl-yellow)' }}>%</span>
                    <button
                      type="button"
                      onClick={() => handleApplyCustomBatchRemise(customBatchRemise)}
                      style={{
                        padding: '3px 9px',
                        height: '26px',
                        fontSize: '11px',
                        fontWeight: '800',
                        borderRadius: '6px',
                        background: 'var(--bardahl-yellow)',
                        color: '#0D0F12',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      Appliquer
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {[0, 5, 10, 15, 20].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => {
                          setCustomBatchRemise(pct === 0 ? '' : pct.toString())
                          handleApplyBatchRemise(pct)
                        }}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: '800',
                          background: '#0D0F12',
                          color: pct === 0 ? 'var(--text-secondary)' : '#007AFF',
                          border: '1px solid var(--border-card)',
                          cursor: 'pointer'
                        }}
                        title={`Définir ${pct}% de remise sur chaque ligne`}
                      >
                        {pct}% partout
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Bon / Déduction Fixe (DH) :</span>
                    <input
                      type="number"
                      min="0"
                      value={remiseMontant}
                      onChange={e => setRemiseMontant(parseFloat(e.target.value) || 0)}
                      placeholder="0.00 DH"
                      className="input-field"
                      style={{ width: '95px', fontSize: '12px', padding: '5px 8px', color: '#FF9500', fontWeight: 'bold' }}
                    />
                  </div>
                </div>
              </div>

              {/* Step 7: Instructions de Livraison & Remarques (Full-width, Note Promotionnelle removed) */}
              <div style={{ background: '#14171F', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-card)' }}>
                <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--bardahl-yellow)', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MessageSquare style={{ width: '15px', height: '15px' }} /> 7. Instructions de Livraison & Remarques
                </label>
                <input
                  type="text"
                  value={remarque}
                  onChange={e => setRemarque(e.target.value)}
                  placeholder="Ex: Livrer avant 12h, appeler le réceptionnaire avant livraison, dépôt atelier..."
                  className="input-field"
                  style={{ fontSize: '13px', padding: '12px 14px' }}
                />
              </div>

              {/* Summary Card */}
              <div style={{ background: '#14171F', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255, 208, 0, 0.4)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <span>Montant Brut TTC :</span>
                  <span style={{ fontWeight: '700', color: '#FFFFFF' }}>{grossTotalTtc.toFixed(2)} DH</span>
                </div>

                {totalFreeItemsCount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#34C759', fontWeight: '800' }}>
                    <span>🎁 Articles Gratuits (Offerts) :</span>
                    <span>+{totalFreeItemsCount} Unité(s) (0.00 DH)</span>
                  </div>
                )}

                {totalLineDiscountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#007AFF', fontWeight: '800' }}>
                    <span>Total Remises Commerciales sur Produits (Lignes) :</span>
                    <span>-{totalLineDiscountAmount.toFixed(2)} DH</span>
                  </div>
                )}

                {voucherDiscount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#FF9500', fontWeight: '800' }}>
                    <span>Bon d'Achat Immédiat (DH) :</span>
                    <span>-{voucherDiscount.toFixed(2)} DH</span>
                  </div>
                )}

                {avoirDeductionAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#34C759', fontWeight: '800' }}>
                    <span>⚖️ Déduction Avoir / Régularisation {activeAvoirOrderNumber ? `(Bon N° ${activeAvoirOrderNumber})` : ''} :</span>
                    <span>-{avoirDeductionAmount.toFixed(2)} DH</span>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <span>Total HT Net :</span>
                  <span>{totalHt.toFixed(2)} DH</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <span>TVA (20%) :</span>
                  <span>{totalTva.toFixed(2)} DH</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '17px', fontWeight: '900', color: 'var(--bardahl-yellow)', paddingTop: '8px', borderTop: '1px solid var(--border-card)' }}>
                  <span>TOTAL NET TTC À PAYER :</span>
                  <span>{netTotalTtc.toFixed(2)} DH</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-card)' }}>
                <button type="button" onClick={() => setShowOrderWizard(false)} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '12px' }}>
                  Annuler
                </button>
                <button type="button" onClick={handleSaveOrderSubmit} className="btn-bardahl" style={{ padding: '8px 16px', fontSize: '12px' }}>
                  <CheckCircle2 style={{ width: '16px', height: '16px' }} /> {editingOrder ? 'Enregistrer Modifications' : 'Valider et Enregistrer'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Smart Remise Adjustment / Compensation Modal */}
      {showAdjustmentModal && adjustingOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 1100 }}>
          <div className="glass-card" style={{ width: '96vw', maxWidth: '1100px', maxHeight: '92vh', overflowY: 'auto', borderColor: '#007AFF', padding: '26px' }}>
            
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid var(--border-card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #007AFF, #0056B3)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 15px rgba(0, 122, 255, 0.3)'
                }}>
                  <Scale style={{ width: '22px', height: '22px' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#FFFFFF' }}>
                    Régularisation & Compensation de Remise Commerciale
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Bon N° <strong style={{ color: 'var(--bardahl-yellow)' }}>{adjustingOrder.orderNumber}</strong> • Client : <strong style={{ color: '#FFFFFF' }}>{adjustingOrder.clientName}</strong> • Date : {adjustingOrder.date}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => { setShowAdjustmentModal(false); setAdjustingOrder(null); }}
                style={{ color: 'var(--text-secondary)', fontSize: '24px', cursor: 'pointer', background: 'none', border: 'none', padding: '4px' }}
                title="Fermer"
              >
                &times;
              </button>
            </div>

            {/* Smart Notice */}
            <div style={{
              background: 'rgba(0, 122, 255, 0.08)',
              border: '1px solid rgba(0, 122, 255, 0.25)',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <AlertCircle size={20} color="#007AFF" style={{ flexShrink: 0 }} />
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
                <strong style={{ color: '#FFFFFF' }}>Système Intelligent de Rectification :</strong> Modifiez ci-dessous le pourcentage de remise erroné sur la ou les lignes d'articles standard (ex : corriger <strong>5%</strong> en <strong>3%</strong>). Le système calcule immédiatement le montant en <strong style={{ color: '#34C759' }}>Dirhams (DH TTC)</strong> ainsi que le <strong style={{ color: '#007AFF' }}>Pourcentage moyen (%)</strong> à compenser sur la prochaine commande du client.
              </p>
            </div>

            {/* Table of Order Lines */}
            <div style={{ overflowX: 'auto', marginBottom: '20px', borderRadius: '10px', border: '1px solid var(--border-card)' }}>
              <table className="custom-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Référence & Désignation</th>
                    <th>Qté</th>
                    <th>PU TTC</th>
                    <th>Total Brut TTC</th>
                    <th>Remise Initiale</th>
                    <th style={{ color: 'var(--bardahl-yellow)' }}>Nouvelle Remise Rectifiée (%)</th>
                    <th>Écart (Δ%)</th>
                    <th>Valeur Compensation (DH TTC)</th>
                  </tr>
                </thead>
                <tbody>
                  {adjustmentLines.map((line, idx) => (
                    <tr key={line.key} style={{ background: line.diffPercent > 0 ? 'rgba(255, 208, 0, 0.04)' : 'transparent' }}>
                      <td>
                        <div style={{ fontSize: '11px', color: 'var(--bardahl-yellow)', fontWeight: 'bold' }}>{line.reference}</div>
                        <strong style={{ color: '#FFFFFF', fontSize: '13px' }}>{line.name}</strong>
                      </td>
                      <td style={{ fontWeight: '700' }}>{line.qty}</td>
                      <td>{line.priceTtc.toFixed(2)} DH</td>
                      <td style={{ fontWeight: '700' }}>{line.grossTotal.toFixed(2)} DH</td>
                      <td>
                        <span style={{ padding: '3px 8px', borderRadius: '6px', background: 'rgba(255, 255, 255, 0.08)', fontWeight: '800' }}>
                          {line.currentRemise}%
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={line.newRemise}
                            onChange={e => handleAdjustmentLineChange(idx, e.target.value)}
                            className="input-field"
                            style={{
                              width: '80px',
                              textAlign: 'center',
                              fontWeight: '900',
                              fontSize: '13px',
                              color: line.diffPercent > 0 ? 'var(--bardahl-yellow)' : '#FFFFFF',
                              borderColor: line.diffPercent > 0 ? 'var(--bardahl-yellow)' : 'var(--border-card)'
                            }}
                          />
                          <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>%</span>
                        </div>
                      </td>
                      <td>
                        {line.diffPercent > 0 ? (
                          <span style={{
                            fontSize: '11px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: 'rgba(255, 208, 0, 0.15)',
                            color: 'var(--bardahl-yellow)',
                            fontWeight: '900'
                          }}>
                            Δ {line.diffPercent}%
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>0.00%</span>
                        )}
                      </td>
                      <td>
                        {line.diffAmountDh > 0 ? (
                          <strong style={{ color: '#34C759', fontSize: '14px' }}>
                            +{line.diffAmountDh.toFixed(2)} DH
                          </strong>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>0.00 DH</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Calculations KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px', marginBottom: '20px' }}>
              <div style={{ background: '#14171F', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-card)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>
                  Lignes d'Articles Concernées
                </span>
                <div style={{ fontSize: '20px', fontWeight: '900', color: '#FFFFFF', marginTop: '6px' }}>
                  {adjustmentTotals.linesWithDiff} article(s) modifié(s)
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Total Brut : {adjustmentTotals.totalGross.toFixed(2)} DH TTC
                </div>
              </div>

              <div style={{ background: '#14171F', padding: '16px', borderRadius: '12px', border: '1px solid rgba(52, 199, 89, 0.4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', color: '#34C759', fontWeight: '800', textTransform: 'uppercase' }}>
                    Valeur Compensation en Dirhams (Option 1)
                  </span>
                  <Coins size={16} color="#34C759" />
                </div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: '#34C759', marginTop: '6px' }}>
                  {adjustmentTotals.totalCompensationDh.toFixed(2)} DH TTC
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Montant monétaire exact à déduire en avoir
                </div>
              </div>

              <div style={{ background: '#14171F', padding: '16px', borderRadius: '12px', border: '1px solid rgba(0, 122, 255, 0.4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '11px', color: '#007AFF', fontWeight: '800', textTransform: 'uppercase' }}>
                    Équivalent Pourcentage Moyen (Option 2)
                  </span>
                  <BadgePercent size={16} color="#007AFF" />
                </div>
                <div style={{ fontSize: '24px', fontWeight: '900', color: '#007AFF', marginTop: '6px' }}>
                  +{adjustmentTotals.averagePercent}%
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Pourcentage compensatoire sur prochain bon
                </div>
              </div>
            </div>

            {/* Compensation Preference & Options */}
            <div style={{ background: '#14171F', padding: '18px', borderRadius: '12px', border: '1px solid var(--border-card)', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--bardahl-yellow)', textTransform: 'uppercase' }}>
                Mode de Compensation Préféré pour le Client :
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
                <div
                  onClick={() => setAdjustmentChosenMode('DH')}
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    border: adjustmentChosenMode === 'DH' ? '2px solid #34C759' : '1px solid var(--border-card)',
                    background: adjustmentChosenMode === 'DH' ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255,255,255,0.02)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: '2px solid #34C759',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: '2px',
                    flexShrink: 0
                  }}>
                    {adjustmentChosenMode === 'DH' && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#34C759' }} />}
                  </div>
                  <div>
                    <strong style={{ color: '#FFFFFF', fontSize: '13px' }}>Option 1 : Avoir Monétaire Fixe ({adjustmentTotals.totalCompensationDh.toFixed(2)} DH)</strong>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                      Déduire directement le montant de {adjustmentTotals.totalCompensationDh.toFixed(2)} DH TTC du total à payer de son prochain bon de commande.
                    </p>
                  </div>
                </div>

                <div
                  onClick={() => setAdjustmentChosenMode('PERCENT')}
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    border: adjustmentChosenMode === 'PERCENT' ? '2px solid #007AFF' : '1px solid var(--border-card)',
                    background: adjustmentChosenMode === 'PERCENT' ? 'rgba(0, 122, 255, 0.1)' : 'rgba(255,255,255,0.02)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: '2px solid #007AFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: '2px',
                    flexShrink: 0
                  }}>
                    {adjustmentChosenMode === 'PERCENT' && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#007AFF' }} />}
                  </div>
                  <div>
                    <strong style={{ color: '#FFFFFF', fontSize: '13px' }}>Option 2 : Remise en Pourcentage (+{adjustmentTotals.averagePercent}%)</strong>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                      Ajouter une remise supplémentaire de {adjustmentTotals.averagePercent}% sur les articles de sa prochaine commande.
                    </p>
                  </div>
                </div>
              </div>

              {/* Checkbox update bon history */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '12px', color: '#FFFFFF' }}>
                <input
                  type="checkbox"
                  checked={updateOrderInHistory}
                  onChange={e => setUpdateOrderInHistory(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--bardahl-yellow)', cursor: 'pointer' }}
                />
                Mettre à jour l'historique et le total du Bon de Commande N° <strong>{adjustingOrder.orderNumber}</strong> avec ces nouvelles remises
              </label>

              {/* Reason input */}
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
                  Motif ou Note Explicative :
                </label>
                <input
                  type="text"
                  value={adjustmentReason}
                  onChange={e => setAdjustmentReason(e.target.value)}
                  placeholder="Ex: Rectification saisie remise 5% au lieu de 3% sur TOP DIESEL +1L"
                  className="input-field"
                  style={{ fontSize: '12px', padding: '10px 14px' }}
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => { setShowAdjustmentModal(false); setAdjustingOrder(null); }}
                className="btn-secondary"
                style={{ padding: '9px 18px', fontSize: '13px' }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveAdjustment}
                className="btn-bardahl"
                style={{
                  padding: '9px 20px',
                  fontSize: '13px',
                  fontWeight: '800',
                  background: 'linear-gradient(135deg, #007AFF, #0056B3)',
                  borderColor: '#007AFF',
                  color: '#FFFFFF',
                  boxShadow: '0 4px 15px rgba(0, 122, 255, 0.3)'
                }}
              >
                <CheckCircle2 size={16} /> Enregistrer et Valider la Compensation
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
