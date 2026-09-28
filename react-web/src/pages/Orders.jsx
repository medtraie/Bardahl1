import React, { useState, useEffect, useMemo } from 'react'
import {
  Search, FileSpreadsheet, Plus, FileText, Trash2, Edit3, CheckCircle2,
  CreditCard, Hash, Percent, Filter, Truck, MessageSquare, Gift, Tag,
  Sparkles, AlertCircle, Package, X, ShoppingBag, Layers
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { generateOrderPdf } from '../utils/pdfGenerator'
import { exportOrdersToExcel } from '../utils/excelExporter'
import { evaluatePromotions } from '../utils/promotionEngine'

const PRODUCT_CATEGORIES = [
  { id: 'ALL', label: 'Toutes les Gammes' },
  { id: 'ADDITIFS', label: 'Additifs' },
  { id: 'LUBRIFIANTS', label: 'Lubrifiants Auto' },
  { id: 'FLUIDES', label: 'Fluides & LR' },
  { id: 'AEROSOLS', label: 'Aérosols & Nettoyants' },
  { id: 'INDUSTRIE', label: 'Industrie & Graisses' },
]

export default function Orders({ openWizardTrigger }) {
  const { orders, clients, products, commercials, promotions, addOrder, updateOrder, deleteOrder, currentUser } = useApp()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [commercialFilter, setCommercialFilter] = useState('ALL')
  const [showOrderWizard, setShowOrderWizard] = useState(false)
  const [editingOrder, setEditingOrder] = useState(null)
  
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
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter
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
        const cat = (p.category || p.categoryId || '').toUpperCase()
        if (!cat.includes(selectedProductCategoryFilter)) return false
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

  const handleDeleteOrder = (order) => {
    if (window.confirm(`Voulez-vous vraiment supprimer le bon de commande ${order.orderNumber} ?`)) {
      deleteOrder(order.id)
    }
  }

  const handleAddProduct = (productId) => {
    if (!productId) return
    const prod = products.find(p => p.id === productId)
    if (prod) {
      const existing = selectedProducts.find(p => p.productId === productId)
      if (existing) {
        setSelectedProducts(prev => prev.map(p => p.productId === productId ? { ...p, qty: p.qty + 1 } : p))
      } else {
        setSelectedProducts(prev => [...prev, {
          productId: prod.id,
          productName: prod.name,
          reference: prod.reference,
          category: prod.category || '',
          priceTtc: parseFloat(prod.priceTtc) || 0,
          qty: 1,
          qtyGratuit: 0,
          promoTag: '',
          remisePercent: 0
        }])
      }
    }
  }

  const handleLineRemiseChange = (index, newPercent) => {
    const val = newPercent === '' ? '' : Math.max(0, Math.min(100, parseFloat(newPercent) || 0))
    setSelectedProducts(prev => prev.map((p, i) => i === index ? { ...p, remisePercent: val } : p))
  }

  const handleApplyBatchRemise = (pct) => {
    setSelectedProducts(prev => prev.map(p => ({ ...p, remisePercent: pct })))
  }

  const handleSelectPromotion = (promoId) => {
    setSelectedPromoId(promoId)
    setCommercialPromoChoices({})

    if (promoId === 'NONE') {
      setSelectedProducts(prev => prev.map(p => ({ ...p, remisePercent: 0 })))
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

    // 2. Required quantity
    let requiredQty = 10
    if (promo.tiers && promo.tiers.length > 0) {
      requiredQty = promo.tiers[0].threshold || 10
    } else if (promo.threshold > 0) {
      if (promo.type === 'TYPE_4' && targetProduct) {
        const price = parseFloat(targetProduct.unitPriceTtc || targetProduct.priceTtc || 100)
        requiredQty = Math.max(1, Math.ceil(promo.threshold / price))
      } else {
        requiredQty = promo.threshold
      }
    }

    // 3. Free quantity (TYPE_2)
    let freeQty = 0
    if (promo.type === 'TYPE_2') {
      freeQty = promo.freeQuantity || (promo.tiers && promo.tiers[0]?.freeQuantity) || 1
    }

    // 4. Discount & Voucher
    let discountPct = 0
    if (promo.tiers && promo.tiers.length > 0) {
      discountPct = promo.tiers[0].discountPercent || 0
    } else {
      discountPct = promo.discountPercent || 0
    }
    const voucherAmt = promo.voucherAmount || 0

    // 5. Add or update target product in selectedProducts with per-product remise
    if (targetProduct) {
      setSelectedProducts(prev => {
        const existingIdx = prev.findIndex(item => item.productId === targetProduct.id || item.reference === targetProduct.reference)
        if (existingIdx >= 0) {
          return prev.map((item, idx) => {
            if (idx === existingIdx) {
              const newQty = Math.max(item.qty || 0, requiredQty)
              const newFree = (promo.type === 'TYPE_2' && promo.freeItemType === 'SAME_PRODUCT')
                ? Math.max(item.qtyGratuit || 0, freeQty)
                : (item.qtyGratuit || 0)
              return {
                ...item,
                qty: newQty,
                qtyGratuit: newFree,
                remisePercent: discountPct > 0 ? discountPct : (item.remisePercent || 0),
                promoTag: promo.name
              }
            }
            // If family promo, update other items of the same family
            if (promo.targetType === 'FAMILY' && promo.targetFamily && (item.category || '').toUpperCase().includes(promo.targetFamily.toUpperCase())) {
              return {
                ...item,
                remisePercent: discountPct > 0 ? discountPct : (item.remisePercent || 0),
                promoTag: promo.name
              }
            }
            return item
          })
        } else {
          const newItem = {
            productId: targetProduct.id,
            reference: targetProduct.reference || 'REF',
            productName: targetProduct.name,
            category: targetProduct.category || targetProduct.categoryId || 'PROMO',
            priceTtc: parseFloat(targetProduct.unitPriceTtc || targetProduct.priceTtc || 0),
            qty: requiredQty,
            qtyGratuit: (promo.type === 'TYPE_2' && promo.freeItemType === 'SAME_PRODUCT') ? freeQty : 0,
            remisePercent: discountPct,
            promoTag: promo.name
          }

          const newItems = [...prev, newItem]

          if (promo.type === 'TYPE_2' && promo.freeItemType === 'DIFFERENT_PRODUCT' && freeQty > 0) {
            const freeProd = products.find(p => p.id === promo.freeProductId || p.reference === promo.freeProductRef)
            if (freeProd) {
              newItems.push({
                productId: freeProd.id,
                reference: freeProd.reference || 'CADEAU',
                productName: freeProd.name,
                category: freeProd.category || freeProd.categoryId || 'CADEAU',
                priceTtc: parseFloat(freeProd.unitPriceTtc || freeProd.priceTtc || 0),
                qty: 0,
                qtyGratuit: freeQty,
                remisePercent: 0,
                promoTag: `🎁 Offert : ${promo.name}`
              })
            }
          }

          return newItems
        }
      })
    }

    if (voucherAmt > 0) {
      setRemiseMontant(voucherAmt)
    }
  }

  const handleQtyChange = (index, newQty) => {
    const val = parseInt(newQty, 10)
    if (isNaN(val) || val <= 0) {
      setSelectedProducts(prev => prev.filter((_, i) => i !== index))
    } else {
      setSelectedProducts(prev => prev.map((p, i) => i === index ? { ...p, qty: val } : p))

      // If a specific promotion is active, dynamically update remise per product and gratuit based on quantity/tiers
      if (selectedPromoId && selectedPromoId !== 'AUTO' && selectedPromoId !== 'NONE') {
        const promo = promotions.find(p => p.id === selectedPromoId)
        if (promo) {
          if (promo.tiers && promo.tiers.length > 0) {
            const sortedTiers = [...promo.tiers].sort((a, b) => b.threshold - a.threshold)
            const matchedTier = sortedTiers.find(t => val >= t.threshold)
            if (matchedTier) {
              setSelectedProducts(prev => prev.map((p, i) => i === index ? {
                ...p,
                remisePercent: matchedTier.discountPercent || 0,
                qtyGratuit: (promo.type === 'TYPE_2' && promo.freeItemType === 'SAME_PRODUCT') ? (matchedTier.freeQuantity || 0) : p.qtyGratuit
              } : p))
            } else {
              setSelectedProducts(prev => prev.map((p, i) => i === index ? {
                ...p,
                remisePercent: 0,
                qtyGratuit: (promo.type === 'TYPE_2' && promo.freeItemType === 'SAME_PRODUCT') ? 0 : p.qtyGratuit
              } : p))
            }
          } else if (promo.threshold > 0) {
            if (val >= promo.threshold) {
              setSelectedProducts(prev => prev.map((p, i) => i === index ? {
                ...p,
                remisePercent: promo.discountPercent || 0,
                qtyGratuit: (promo.type === 'TYPE_2' && promo.freeItemType === 'SAME_PRODUCT') ? (promo.freeQuantity || 1) : p.qtyGratuit
              } : p))
            } else {
              setSelectedProducts(prev => prev.map((p, i) => i === index ? {
                ...p,
                remisePercent: 0,
                qtyGratuit: (promo.type === 'TYPE_2' && promo.freeItemType === 'SAME_PRODUCT') ? 0 : p.qtyGratuit
              } : p))
            }
          }
        }
      }
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

  // Total discounts from individual product lines
  const totalLineDiscountAmount = selectedProducts.reduce((sum, item, idx) => {
    const promoDiscount = promoAnalysis.lineDiscounts && promoAnalysis.lineDiscounts[idx] ? promoAnalysis.lineDiscounts[idx] : 0
    const finalPct = (item.remisePercent !== undefined && item.remisePercent !== null && item.remisePercent !== '')
      ? parseFloat(item.remisePercent) || 0
      : promoDiscount
    return sum + ((item.priceTtc * item.qty) * (finalPct / 100))
  }, 0)

  // Voucher discount (either from Type 3 promo or explicit manual voucher)
  const voucherDiscount = Math.max(promoAnalysis.voucherDiscount || 0, parseFloat(remiseMontant) || 0)
  const totalDiscountAmount = totalLineDiscountAmount

  const netTotalTtc = Math.max(0, grossTotalTtc - totalDiscountAmount - voucherDiscount)
  const totalHt = netTotalTtc / 1.20
  const totalTva = netTotalTtc - totalHt

  const userFreeItemsCount = selectedProducts.reduce((sum, item) => sum + (item.qtyGratuit || 0), 0)
  const promoFreeItemsCount = (promoAnalysis.freeItems || []).reduce((sum, item) => sum + (item.qtyGratuit || 0), 0)
  const totalFreeItemsCount = userFreeItemsCount + promoFreeItemsCount

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

    // Build combined items list including line remisePercent and automatic free gifts
    const combinedItems = [
      ...selectedProducts.map((sp, idx) => {
        const promoDiscount = promoAnalysis.lineDiscounts && promoAnalysis.lineDiscounts[idx] ? promoAnalysis.lineDiscounts[idx] : 0
        const finalPct = (sp.remisePercent !== undefined && sp.remisePercent !== null && sp.remisePercent !== '')
          ? parseFloat(sp.remisePercent) || 0
          : promoDiscount
        return {
          ...sp,
          remisePercent: finalPct,
          promoDiscountPercent: promoDiscount
        }
      }),
      ...(promoAnalysis.freeItems || []).map(fi => ({
        productId: fi.productId,
        productName: fi.productName,
        reference: fi.reference,
        priceTtc: 0,
        qty: 0,
        qtyGratuit: fi.qtyGratuit,
        remisePercent: 0,
        promoTag: `🎁 Offert : ${fi.promoName}`
      }))
    ]

    // Build automated promo note summary if promos are active
    const autoPromoSummary = promoAnalysis.appliedPromotions.length > 0
      ? promoAnalysis.appliedPromotions.map(ap => ap.name + (ap.discountPercent > 0 ? ` (${ap.discountPercent}%)` : '') + (ap.giftSummary ? ` [${ap.giftSummary}]` : '') + (ap.voucherAmount > 0 ? ` [Bon -${ap.voucherAmount} DH]` : '')).join(' | ')
      : ''
    const finalPromoNote = autoPromoSummary

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
        promoNote: finalPromoNote,
        totalHt: totalHt,
        totalDiscount: totalDiscountAmount,
        voucherDiscount: voucherDiscount,
        totalTva: totalTva,
        totalTtc: netTotalTtc,
        totalFreeItems: totalFreeItemsCount,
        appliedPromotions: promoAnalysis.appliedPromotions,
        items: combinedItems
      }
      updateOrder(updatedOrder)
      generateOrderPdf(updatedOrder)
      setShowOrderWizard(false)
      setEditingOrder(null)
      alert(`Bon de commande ${updatedOrder.orderNumber} modifié avec succès !`)
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
        promoNote: finalPromoNote,
        status: "VALIDATED",
        totalHt: totalHt,
        totalDiscount: totalDiscountAmount,
        voucherDiscount: voucherDiscount,
        totalTva: totalTva,
        totalTtc: netTotalTtc,
        totalFreeItems: totalFreeItemsCount,
        appliedPromotions: promoAnalysis.appliedPromotions,
        items: combinedItems
      }
      addOrder(newOrder)
      generateOrderPdf(newOrder)
      setShowOrderWizard(false)
      alert(`Bon de commande ${newOrder.orderNumber} créé avec succès !`)
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
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header Controls & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#FFFFFF' }}>Gestion des Bons de Commande</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {filteredOrders.length} bons enregistrés au total
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
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
              <option value="ALL">Tous les Statuts</option>
              <option value="VALIDATED">Validés</option>
              <option value="DRAFT">Brouillons</option>
              <option value="DELIVERED">Livrés</option>
              <option value="CANCELLED">Annulés</option>
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
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>N° Bon</th>
                <th>Date</th>
                <th>Client</th>
                <th>Commercial</th>
                <th>Paiement</th>
                <th>Total TTC</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
                    Aucun bon de commande trouvé pour ces critères.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(o => (
                  <tr key={o.id}>
                    <td><strong style={{ color: '#FFFFFF' }}>{o.orderNumber}</strong></td>
                    <td style={{ fontSize: '12px' }}>{o.date}</td>
                    <td>
                      <div>
                        <strong style={{ color: '#FFFFFF' }}>{o.clientName}</strong>
                        {o.totalFreeItems > 0 && (
                          <span style={{ display: 'inline-block', marginLeft: '6px', fontSize: '10px', padding: '1px 6px', borderRadius: '6px', background: 'rgba(52, 199, 89, 0.2)', color: '#34C759', fontWeight: 'bold' }}>
                            +{o.totalFreeItems} Offert(s)
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{o.commercialName}</td>
                    <td><span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', color: '#FFFFFF' }}>{o.paymentMethod || 'Chèque'}</span></td>
                    <td style={{ color: 'var(--bardahl-yellow)', fontWeight: '900', fontSize: '14px' }}>
                      {(parseFloat(o.totalTtc) || 0).toFixed(2)} DH
                    </td>
                    <td><span className={`badge-status ${o.status}`}>{o.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          onClick={() => generateOrderPdf(o)}
                          className="btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '11px' }}
                          title="Télécharger PDF"
                        >
                          <FileText style={{ width: '14px', height: '14px' }} /> PDF
                        </button>
                        <button
                          onClick={() => handleOpenEditWizard(o)}
                          className="btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '11px', color: 'var(--bardahl-yellow)', borderColor: 'var(--bardahl-yellow)' }}
                          title="Modifier"
                        >
                          <Edit3 style={{ width: '14px', height: '14px' }} />
                        </button>
                        <button
                          onClick={() => handleDeleteOrder(o)}
                          style={{ padding: '6px 10px', fontSize: '11px', color: '#FF453A', background: 'rgba(255, 69, 58, 0.1)', border: '1px solid rgba(255, 69, 58, 0.3)', borderRadius: '8px', cursor: 'pointer' }}
                          title="Supprimer"
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
                  <select
                    value={modeExpedition}
                    onChange={e => setModeExpedition(e.target.value)}
                    className="input-field"
                    style={{ height: '38px', fontSize: '12px', fontWeight: '700' }}
                  >
                    <option value="Transport Bardahl">Transport Bardahl (Livraison Interne)</option>
                    <option value="Livraison Client">Livraison Client directe</option>
                    <option value="Enlèvement Magasin">Enlèvement Magasin (Client Récupère)</option>
                    <option value="Transporteur Externe">Transporteur Externe / Privé</option>
                  </select>
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
                            {PRODUCT_CATEGORIES.map(cat => (
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
                                        {p.category || 'BARDAHL'}
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
                {selectedProducts.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255, 208, 0, 0.05)', padding: '8px 14px', borderRadius: '10px', border: '1px dashed rgba(255, 208, 0, 0.25)', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Percent style={{ width: '14px', height: '14px', color: 'var(--bardahl-yellow)' }} />
                      <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--bardahl-yellow)' }}>
                        Application Rapide de la Remise sur Tout le Panier :
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                          onClick={() => handleApplyBatchRemise(b.pct)}
                          style={{
                            padding: '3px 8px',
                            fontSize: '11px',
                            fontWeight: '800',
                            borderRadius: '6px',
                            background: '#14171F',
                            color: b.pct === 0 ? 'var(--text-secondary)' : '#007AFF',
                            border: b.pct === 0 ? '1px solid var(--border-card)' : '1px solid rgba(0, 122, 255, 0.4)',
                            cursor: 'pointer'
                          }}
                        >
                          {b.label}
                        </button>
                      ))}
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
                          const currentRemise = (item.remisePercent !== undefined && item.remisePercent !== null && item.remisePercent !== '') ? item.remisePercent : promoDiscount
                          const lineGross = item.priceTtc * item.qty
                          const lineDiscountVal = lineGross * ((parseFloat(currentRemise) || 0) / 100)
                          const lineNet = Math.max(0, lineGross - lineDiscountVal)

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
                              <td style={{ textAlign: 'center' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', background: '#0D0F12', border: '1px solid rgba(255, 208, 0, 0.4)', borderRadius: '8px', padding: '2px' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleQtyChange(idx, Math.max(1, (parseInt(item.qty, 10) || 1) - 1))}
                                    style={{ width: '28px', height: '28px', background: 'transparent', border: 'none', color: 'var(--bardahl-yellow)', fontSize: '16px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.qty}
                                    onChange={e => handleQtyChange(idx, e.target.value)}
                                    style={{
                                      width: '42px',
                                      height: '28px',
                                      textAlign: 'center',
                                      background: 'transparent',
                                      border: 'none',
                                      color: '#FFFFFF',
                                      fontWeight: '800',
                                      fontSize: '13px',
                                      outline: 'none'
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleQtyChange(idx, (parseInt(item.qty, 10) || 0) + 1)}
                                    style={{ width: '28px', height: '28px', background: 'transparent', border: 'none', color: 'var(--bardahl-yellow)', fontSize: '16px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  >
                                    +
                                  </button>
                                </div>
                              </td>
                              <td style={{ textAlign: 'center' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', background: '#0D0F12', border: '1px solid rgba(52, 199, 89, 0.4)', borderRadius: '8px', padding: '2px' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleQtyGratuitChange(idx, Math.max(0, (parseInt(item.qtyGratuit, 10) || 0) - 1))}
                                    style={{ width: '28px', height: '28px', background: 'transparent', border: 'none', color: '#34C759', fontSize: '16px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min="0"
                                    value={item.qtyGratuit}
                                    onChange={e => handleQtyGratuitChange(idx, e.target.value)}
                                    style={{
                                      width: '42px',
                                      height: '28px',
                                      textAlign: 'center',
                                      background: 'transparent',
                                      border: 'none',
                                      color: item.qtyGratuit > 0 ? '#34C759' : '#8E95A5',
                                      fontWeight: '800',
                                      fontSize: '13px',
                                      outline: 'none'
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleQtyGratuitChange(idx, (parseInt(item.qtyGratuit, 10) || 0) + 1)}
                                    style={{ width: '28px', height: '28px', background: 'transparent', border: 'none', color: '#34C759', fontSize: '16px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                  >
                                    +
                                  </button>
                                </div>
                              </td>
                              <td style={{ textAlign: 'right', fontWeight: '700', color: 'var(--text-primary)', fontSize: '12px' }}>
                                {item.priceTtc.toFixed(2)} DH
                              </td>

                              {/* Remise Commerciale (%) par produit */}
                              <td style={{ textAlign: 'center' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', background: '#0D0F12', border: currentRemise > 0 ? '1px solid #007AFF' : '1px solid var(--border-card)', borderRadius: '8px', padding: '2px 6px' }}>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.5"
                                    value={currentRemise}
                                    onChange={e => handleLineRemiseChange(idx, e.target.value)}
                                    placeholder="0"
                                    style={{
                                      width: '42px',
                                      height: '26px',
                                      textAlign: 'center',
                                      background: 'transparent',
                                      border: 'none',
                                      color: currentRemise > 0 ? '#007AFF' : '#FFFFFF',
                                      fontWeight: '800',
                                      fontSize: '12px',
                                      outline: 'none'
                                    }}
                                    title="Remise commerciale en % sur cet article"
                                  />
                                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: currentRemise > 0 ? '#007AFF' : 'var(--text-secondary)', paddingRight: '2px' }}>%</span>
                                </div>
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
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleTogglePromoLine(idx, '10+1')}
                                    style={{
                                      fontSize: '11px',
                                      fontWeight: '800',
                                      padding: '5px 8px',
                                      borderRadius: '6px',
                                      background: item.promoTag ? 'rgba(52, 199, 89, 0.2)' : '#14171F',
                                      color: item.promoTag ? '#34C759' : 'var(--text-secondary)',
                                      border: item.promoTag ? '1px solid #34C759' : '1px solid var(--border-card)',
                                      cursor: 'pointer'
                                    }}
                                    title="Appliquer Promo 10+1 (1 offert pour 10 achetés)"
                                  >
                                    10+1
                                  </button>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {[0, 5, 10, 15, 20].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => handleApplyBatchRemise(pct)}
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
                  <CheckCircle2 style={{ width: '16px', height: '16px' }} /> {editingOrder ? 'Enregistrer Modifications' : 'Valider et Générer PDF'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}
