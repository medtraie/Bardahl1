import React, { useState, useEffect, useMemo } from 'react'
import {
  Search, Plus, FileText, Trash2, Edit3, CheckCircle2,
  Filter, Truck, MessageSquare, Package, X, ShoppingBag,
  Calculator, ArrowRight, Clock, AlertTriangle, RefreshCw,
  Coins, ChevronDown, User, FileSpreadsheet, Send, CheckSquare,
  ArrowUpRight, Building2, MapPin, Eye, Phone, Calendar, Sparkles,
  AlertCircle, Gift
} from 'lucide-react'
import { evaluatePromotions } from '../utils/promotionEngine'
import { useApp } from '../context/AppContext'
import { generateDevisPdf } from '../utils/pdfGenerator'
import { exportDevisToExcel } from '../utils/excelExporter'
import { getProductUnitsPerCarton } from '../data/productsData'
import { getFamilyInfo, DEFAULT_BARDAHL_FAMILIES } from '../data/familiesData'
import { BARDAHL_COMPANY_INFO } from '../data/companyData'
import { getNextDevisNumber } from '../utils/numberGenerators'

export default function Devis({ openWizardTrigger, setActiveTab }) {
  const {
    devis = [],
    allDevis = [],
    clients = [],
    products = [],
    commercials = [],
    promotions = [],
    addDevis,
    updateDevis,
    deleteDevis,
    convertDevisToOrder,
    currentUser,
    productFamilies = []
  } = useApp()

  const isAdmin = currentUser?.role === 'ADMIN' || (currentUser?.email || '').toLowerCase() === 'bardahl@gmail.com'

  // Filter & Search states
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [commercialFilter, setCommercialFilter] = useState('ALL')
  const [dateFilter, setDateFilter] = useState('ALL')

  // Modals
  const [showWizard, setShowWizard] = useState(false)
  const [editingDevis, setEditingDevis] = useState(null)
  const [selectedDevisDetails, setSelectedDevisDetails] = useState(null)
  const [convertingDevis, setConvertingDevis] = useState(null)
  const [conversionSuccessInfo, setConversionSuccessInfo] = useState(null)

  // Wizard form state
  const [selectedClient, setSelectedClient] = useState('')
  const [clientSearchQuery, setClientSearchQuery] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [customDevisNumber, setCustomDevisNumber] = useState('')
  const [validityDays, setValidityDays] = useState(30)
  const [paymentMethod, setPaymentMethod] = useState('Chèque')
  const [modeExpedition, setModeExpedition] = useState('Transport Bardahl')
  const [remarque, setRemarque] = useState('')
  const [remisePercent, setRemisePercent] = useState(0)
  const [remiseMontant, setRemiseMontant] = useState(0)
  const [selectedProducts, setSelectedProducts] = useState([])
  const [selectedPromoId, setSelectedPromoId] = useState('AUTO')
  const [commercialPromoChoices, setCommercialPromoChoices] = useState({})
  const [customBatchRemise, setCustomBatchRemise] = useState('')
  const [productSearchQuery, setProductSearchQuery] = useState('')
  const [selectedProductCategoryFilter, setSelectedProductCategoryFilter] = useState('ALL')

  // Active families
  const activeFamilies = useMemo(() => {
    return (productFamilies && productFamilies.length > 0)
      ? productFamilies.filter(f => f.isActive !== false)
      : DEFAULT_BARDAHL_FAMILIES
  }, [productFamilies])

  // Open wizard trigger from outside (Header / Quick Action)
  useEffect(() => {
    if (openWizardTrigger && openWizardTrigger > 0) {
      handleOpenWizard()
    }
  }, [openWizardTrigger])

  const suggestedDevisNumber = useMemo(() => {
    return getNextDevisNumber(devis)
  }, [devis])

  const handleOpenWizard = (dev = null) => {
    setCustomBatchRemise('')
    if (dev) {
      setEditingDevis(dev)
      setCustomDevisNumber(dev.devisNumber || '')
      setSelectedClient(dev.clientDbId || dev.clientId || '')
      setClientSearchQuery(dev.clientName ? `${dev.clientName} (${dev.clientCity || ''})` : '')
      setPaymentMethod(dev.paymentMethod || 'Chèque')
      setModeExpedition(dev.modeExpedition || 'Transport Bardahl')
      setRemarque(dev.remarque || '')
      setRemisePercent(dev.remisePercent || 0)
      setRemiseMontant(dev.remiseMontant || 0)
      setSelectedPromoId(dev.selectedPromoId || 'AUTO')
      setCommercialPromoChoices({})
      const rawItems = dev.items || []
      const distinctGiftLines = rawItems.filter(i => {
        const q = parseInt(i.qty !== undefined ? i.qty : (i.quantity !== undefined ? i.quantity : 0), 10)
        const p = parseFloat(i.priceTtc || i.unitPriceTtc || 0)
        const g = parseInt(i.qtyGratuit || i.freeQuantity || 0, 10)
        const tag = String(i.promoTag || '')
        return (q === 0 || p === 0) && (g > 0 || tag.includes('Offert') || tag.includes('Cadeau'))
      })
      const purchasedLines = rawItems.filter(i => !distinctGiftLines.includes(i))
      setSelectedProducts(purchasedLines.map(it => {
        const catProd = products.find(p => p.id === it.productId || p.reference === it.reference)
        const upb = parseInt(it.unitsPerBox || it.unitsPerCarton || catProd?.unitsPerBox || (catProd ? getProductUnitsPerCarton(catProd) : 12) || 12, 10) || 12
        const unitQty = parseInt(it.qty !== undefined ? it.qty : (it.quantity !== undefined ? it.quantity : 1), 10)
        const recordedFreeUnits = parseInt(it.qtyGratuit !== undefined ? it.qtyGratuit : (it.freeQuantity || 0), 10)
        return {
          ...it,
          unitsPerBox: upb,
          unitsPerCarton: upb,
          cartons: Math.floor(unitQty / upb),
          qty: unitQty,
          initialQty: unitQty,
          initialFreeUnits: recordedFreeUnits,
          remisePercent: it.remisePercent !== undefined ? it.remisePercent : (it.remise !== undefined && it.remise > 0 ? String(it.remise) : ''),
          remise: it.remise !== undefined ? it.remise : (parseFloat(it.remisePercent) || 0),
          qtyGratuit: recordedFreeUnits,
          manualGratuit: it.manualGratuit !== undefined ? it.manualGratuit : recordedFreeUnits
        }
      }))
    } else {
      setEditingDevis(null)
      setCustomDevisNumber(suggestedDevisNumber)
      setSelectedClient('')
      setClientSearchQuery('')
      setSelectedPromoId('AUTO')
      setCommercialPromoChoices({})
      setPaymentMethod('Chèque')
      setModeExpedition('Transport Bardahl')
      setRemarque('')
      setRemisePercent(0)
      setRemiseMontant(0)
      setSelectedProducts([])
    }
    setProductSearchQuery('')
    setShowClientDropdown(false)
    setShowWizard(true)
  }

  // Filtered Client Options in Wizard
  const filteredClientOptions = useMemo(() => {
    const q = clientSearchQuery.trim().toLowerCase()
    if (!q) return clients.slice(0, 50)
    return clients.filter(c => 
      (c.companyName || '').toLowerCase().includes(q) ||
      (c.codeClient || '').toLowerCase().includes(q) ||
      (c.ice || '').toLowerCase().includes(q) ||
      (c.city || '').toLowerCase().includes(q)
    ).slice(0, 50)
  }, [clients, clientSearchQuery])

  // Filtered Products in Wizard
  const filteredProductsCatalog = useMemo(() => {
    const q = productSearchQuery.trim().toLowerCase()
    return products.filter(p => {
      const matchQuery = !q ||
        (p.name || '').toLowerCase().includes(q) ||
        (p.code || '').toLowerCase().includes(q) ||
        (p.reference || '').toLowerCase().includes(q)
      if (!matchQuery) return false

      if (selectedProductCategoryFilter === 'ALL') return true
      const fam = getFamilyInfo(p.category, activeFamilies)
      return fam.code === selectedProductCategoryFilter || (p.category || '').toUpperCase().includes(selectedProductCategoryFilter)
    })
  }, [products, productSearchQuery, selectedProductCategoryFilter, activeFamilies])

  // Add product to devis wizard selection (WEB-01: harmonized with Orders.jsx — starts at 1 unit & increments by 1)
  const handleAddProductItem = (prod) => {
    const existingIndex = selectedProducts.findIndex(p => p.productId === prod.id || p.reference === prod.reference)
    const cartonUnits = parseInt(prod.unitsPerBox || getProductUnitsPerCarton(prod) || 1, 10) || 1
    if (existingIndex >= 0) {
      setSelectedProducts(prev => prev.map((item, idx) => {
        if (idx === existingIndex) {
          const newQty = (parseInt(item.qty, 10) || 0) + 1
          return {
            ...item,
            qty: newQty,
            cartons: Math.floor(newQty / cartonUnits)
          }
        }
        return item
      }))
    } else {
      setSelectedProducts(prev => [
        ...prev,
        {
          productId: prod.id,
          reference: prod.reference || prod.code,
          code: prod.code || prod.reference,
          productName: prod.name,
          category: prod.category || 'FA0015',
          packaging: prod.packaging || '',
          priceTtc: parseFloat(prod.priceTtc) || 0,
          unitsPerBox: cartonUnits,
          unitsPerCarton: cartonUnits,
          cartons: Math.floor(1 / cartonUnits),
          qty: 1,
          remise: 0,
          remisePercent: '',
          qtyGratuit: 0,
          manualGratuit: 0
        }
      ])
    }
  }

  const parsePercent = (val) => {
    if (val === undefined || val === null || val === '') return null
    const str = String(val).replace(',', '.')
    const parsed = parseFloat(str)
    return isNaN(parsed) ? 0 : Math.max(0, Math.min(100, parsed))
  }

  // Update product line quantity with unit stepper & carton conversions
  const handleQtyChange = (index, newQty) => {
    const val = parseInt(newQty, 10)
    if (isNaN(val) || val < 0) return
    if (val === 0) {
      setSelectedProducts(prev => {
        const item = prev[index]
        if (item && (parseInt(item.qtyGratuit, 10) > 0 || parseInt(item.manualGratuit, 10) > 0)) {
          return prev.map((p, i) => i === index ? { ...p, qty: 0, cartons: 0, promoTag: p.promoTag || 'Gratuité 100% (Échantillon)' } : p)
        }
        return prev.filter((_, i) => i !== index)
      })
    } else {
      setSelectedProducts(prev => prev.map((p, i) => {
        if (i !== index) return p
        const upb = p.unitsPerBox || p.unitsPerCarton || 1
        return {
          ...p,
          qty: val,
          cartons: Math.floor(val / upb)
        }
      }))
    }
  }

  // Modification unitaire du prix de vente
  const handlePriceChange = (index, newPrice) => {
    const cleanStr = String(newPrice).replace(',', '.')
    const parsed = parseFloat(cleanStr)
    setSelectedProducts(prev => prev.map((p, i) => {
      if (i !== index) return p
      const catProd = products.find(cp => cp.id === p.productId || cp.reference === p.reference)
      const standardPrice = catProd ? parseFloat(catProd.priceTtc || catProd.unitPriceTtc || 0) : p.priceTtc
      const isModified = !isNaN(parsed) && Math.abs(parsed - standardPrice) > 0.05
      return {
        ...p,
        priceTtc: !isNaN(parsed) && parsed >= 0 ? parsed : p.priceTtc,
        customPriceStr: newPrice,
        isPriceModified: isModified,
        originalPriceTtc: standardPrice
      }
    }))
  }

  // Modification remise commerciale en % (accepte décimales virgule/point)
  const handleLineRemiseChange = (index, newPercent) => {
    setSelectedProducts(prev => prev.map((p, i) => {
      if (i !== index) return p
      const parsed = parsePercent(newPercent)
      return {
        ...p,
        remisePercent: newPercent,
        remise: parsed !== null ? parsed : 0
      }
    }))
  }

  // Gratuité manuelle (unités)
  const handleManualGratuitChange = (index, newGratuit) => {
    const val = Math.max(0, parseInt(newGratuit, 10) || 0)
    setSelectedProducts(prev => prev.map((p, i) => i === index ? { ...p, qtyGratuit: val, manualGratuit: val } : p))
  }

  // Application globale rapide de remise sur toutes les lignes
  const handleApplyBatchRemise = (pct) => {
    setSelectedProducts(prev => prev.map(p => ({
      ...p,
      remisePercent: pct > 0 ? String(pct) : '',
      remise: pct
    })))
  }

  const handleApplyCustomBatchRemise = (val) => {
    if (val === '' || val === null || val === undefined) return
    const normalized = String(val).replace(',', '.')
    const parsed = Math.max(0, Math.min(100, parseFloat(normalized) || 0))
    handleApplyBatchRemise(parsed)
  }

  const handleRemoveProductLine = (index) => {
    setSelectedProducts(prev => prev.filter((_, idx) => idx !== index))
  }
  const handleRemoveLine = handleRemoveProductLine

  // Rétrocompatibilité
  const handleUpdateProductLine = (index, field, value) => {
    if (field === 'qty') handleQtyChange(index, value)
    else if (field === 'priceTtc') handlePriceChange(index, value)
    else if (field === 'remise') handleLineRemiseChange(index, value)
    else if (field === 'cartons') {
      const c = Math.max(0, parseInt(value, 10) || 0)
      const upb = selectedProducts[index]?.unitsPerBox || selectedProducts[index]?.unitsPerCarton || 1
      handleQtyChange(index, c * upb)
    }
  }

  // Handle promotion selection: auto-populates products & applies discounts identical to Orders / Bon de Commande
  const handleSelectPromotion = (promoId) => {
    setSelectedPromoId(promoId)
    setCommercialPromoChoices({})

    if (promoId === 'NONE') {
      setSelectedProducts(prev => prev.map(p => ({ ...p, remise: 0, remisePercent: '' })))
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
      const targetRefs = (promo.targetProductRefs && Array.isArray(promo.targetProductRefs) && promo.targetProductRefs.length > 0)
        ? promo.targetProductRefs
        : (promo.targetProductRef ? [promo.targetProductRef] : (promo.targetProductId ? [promo.targetProductId] : []))

      targetProduct = products.find(p =>
        targetRefs.some(ref => ref === p.id || ref === p.reference || ref === p.code) ||
        (promo.targetProductName && p.name && p.name.toLowerCase() === promo.targetProductName.toLowerCase()) ||
        (promo.targetProductRef && p.name && p.name.toLowerCase().includes(promo.targetProductRef.toLowerCase())) ||
        (promo.targetProductName && p.name && p.name.toLowerCase().includes(promo.targetProductName.toLowerCase()))
      )
    } else if (promo.targetType === 'FAMILY') {
      const targetFamInfo = getFamilyInfo(promo.targetFamily, activeFamilies)
      // Check if user already has an item from this family in the cart
      const existingFamilyItem = selectedProducts.find(item => {
        const itemFam = getFamilyInfo(item.category, activeFamilies)
        return itemFam.code === targetFamInfo.code
      })
      if (existingFamilyItem) {
        targetProduct = products.find(p => p.id === existingFamilyItem.productId || p.reference === existingFamilyItem.reference)
      }
      if (!targetProduct) {
        targetProduct = products.find(p => {
          const pFam = getFamilyInfo(p.category || p.categoryId || '', activeFamilies)
          return pFam.code === targetFamInfo.code
        })
      }
    }

    // Fallback: search in promo name or description
    if (!targetProduct) {
      targetProduct = products.find(p =>
        (promo.name && p.name && promo.name.toLowerCase().includes(p.name.toLowerCase())) ||
        (promo.name && p.reference && promo.name.toLowerCase().includes(p.reference.toLowerCase())) ||
        (promo.description && p.name && promo.description.toLowerCase().includes(p.name.toLowerCase()))
      )
    }

    if (!targetProduct && products.length > 0) {
      targetProduct = products[0]
    }

    // 2. Required quantity in UNITS
    let requiredUnits = 1
    let targetThreshold = promo.threshold || 1

    if (promo.tiers && Array.isArray(promo.tiers) && promo.tiers.length > 0) {
      const validTiers = promo.tiers.filter(t => (parseFloat(t.discountPercent || 0) > 0 || parseInt(t.freeQuantity || 0, 10) > 0 || parseFloat(t.voucherAmount || 0) > 0))
      const targetTier = validTiers.length > 0 ? validTiers[0] : promo.tiers[0]
      targetThreshold = targetTier.min !== undefined && targetTier.min !== null ? parseFloat(targetTier.min) : (targetTier.threshold || 1)
    }

    if (targetProduct) {
      const upb = parseInt(targetProduct.unitsPerBox || targetProduct.unitsPerCarton || getProductUnitsPerCarton(targetProduct) || 1, 10) || 1
      const price = parseFloat(targetProduct.unitPriceTtc || targetProduct.priceTtc || 100)

      if (promo.type === 'TYPE_4') {
        const targetFamInfo = getFamilyInfo(promo.targetFamily, activeFamilies)
        const currentFamilyAmount = selectedProducts.reduce((sum, item) => {
          const itemFam = getFamilyInfo(item.category, activeFamilies)
          if (itemFam.code === targetFamInfo.code) {
            return sum + (parseFloat(item.priceTtc || 0) * (parseInt(item.qty || 0, 10)))
          }
          return sum
        }, 0)

        const missingDh = Math.max(0, targetThreshold - currentFamilyAmount)
        const unitsNeeded = Math.max(1, Math.ceil((missingDh > 0 ? missingDh : targetThreshold) / (price || 1)))
        requiredUnits = unitsNeeded
      } else {
        requiredUnits = Math.max(1, Math.round(targetThreshold * upb))
      }

      const discountPct = (promo.tiers && promo.tiers.length > 0 && promo.tiers[0].discountPercent)
        ? parseFloat(promo.tiers[0].discountPercent)
        : (parseFloat(promo.discountPercent) || 0)

      setSelectedProducts(prev => {
        const existingIdx = prev.findIndex(item => item.productId === targetProduct.id || item.reference === targetProduct.reference)
        if (existingIdx >= 0) {
          return prev.map((item, idx) => {
            if (idx === existingIdx) {
              const newQty = (promo.type === 'TYPE_4') ? (item.qty || 0) + requiredUnits : Math.max(item.qty || 0, requiredUnits)
              return {
                ...item,
                qty: newQty,
                cartons: Math.ceil(newQty / upb),
                unitsPerBox: upb,
                unitsPerCarton: upb,
                remise: discountPct > 0 ? discountPct : (item.remise || 0),
                remisePercent: discountPct > 0 ? String(discountPct) : (item.remisePercent || ''),
                promoTag: promo.name
              }
            }
            return item
          })
        } else {
          return [...prev, {
            productId: targetProduct.id,
            reference: targetProduct.reference || targetProduct.code || 'REF',
            code: targetProduct.code || targetProduct.reference,
            productName: targetProduct.name,
            category: targetProduct.category || targetProduct.categoryId || 'FA0015',
            packaging: targetProduct.packaging || '',
            unitsPerBox: upb,
            unitsPerCarton: upb,
            cartons: Math.ceil(requiredUnits / upb),
            priceTtc: parseFloat(targetProduct.unitPriceTtc || targetProduct.priceTtc || 0),
            qty: requiredUnits,
            qtyGratuit: 0,
            manualGratuit: 0,
            remise: discountPct,
            remisePercent: discountPct > 0 ? String(discountPct) : '',
            promoTag: promo.name
          }]
        }
      })
    }
  }

  // Real-time Promotions Evaluation
  const promoAnalysis = useMemo(() => {
    return evaluatePromotions(selectedProducts, products, promotions, commercialPromoChoices, selectedPromoId)
  }, [selectedProducts, products, promotions, commercialPromoChoices, selectedPromoId])

  // Financial calculations for devis wizard
  const wizardCalculations = useMemo(() => {
    let brutTtc = 0
    let linesDiscount = 0

    selectedProducts.forEach((it, idx) => {
      const lineBrut = (it.qty || 0) * (it.priceTtc || 0)
      const promoDiscount = promoAnalysis.lineDiscounts && promoAnalysis.lineDiscounts[idx] ? promoAnalysis.lineDiscounts[idx] : 0
      const parsedRemise = parsePercent(it.remisePercent !== undefined && it.remisePercent !== '' ? it.remisePercent : it.remise)
      const hasManualOverride = parsedRemise !== null && parsedRemise > 0
      const finalPct = hasManualOverride ? parsedRemise : promoDiscount
      const lineRemiseDh = lineBrut * (finalPct / 100)
      brutTtc += lineBrut
      linesDiscount += lineRemiseDh
    })

    const afterLinesDiscount = Math.max(0, brutTtc - linesDiscount)
    const voucherDiscount = promoAnalysis.voucherDiscount || 0
    const globalRemiseDh = remiseMontant > 0 
      ? remiseMontant 
      : (remisePercent > 0 ? (afterLinesDiscount * (remisePercent / 100)) : 0)

    const finalTtc = Math.max(0, afterLinesDiscount - globalRemiseDh - voucherDiscount)
    const totalHt = Math.round((finalTtc / 1.20) * 100) / 100
    const totalTva = Math.round((finalTtc - totalHt) * 100) / 100
    const totalDiscount = Math.round((linesDiscount + globalRemiseDh + voucherDiscount) * 100) / 100

    return {
      brutTtc,
      linesDiscount,
      voucherDiscount,
      globalRemiseDh,
      totalDiscount,
      totalHt,
      totalTva,
      totalTtc: Math.round(finalTtc * 100) / 100
    }
  }, [selectedProducts, remisePercent, remiseMontant, promoAnalysis])

  // Save Devis Handler
  const handleSaveDevis = async (andConvertNow = false) => {
    const matchedClient = clients.find(c => c.id === selectedClient || c.dbId === selectedClient)
    if (!selectedClient || !matchedClient) {
      alert("Client manquant : veuillez rechercher et sélectionner explicitement un client dans la liste avant d'enregistrer le devis.")
      return
    }
    if (selectedProducts.length === 0) {
      alert("Veuillez ajouter au moins un produit au devis.")
      return
    }

    const clientName = matchedClient.companyName || 'Client Bardahl'
    const clientIce = matchedClient.ice || ''
    const clientCity = matchedClient.city || ''
    const clientAddress = matchedClient.address || ''
    const clientPhone = matchedClient.phone || ''

    // WEB-01 & PROMO-01: Build combinedItems identically to Orders.jsx (including distinct & same-product free gifts)
    const combinedItems = [
      ...selectedProducts.map((sp, idx) => {
        const promoDiscount = promoAnalysis.lineDiscounts && promoAnalysis.lineDiscounts[idx] ? promoAnalysis.lineDiscounts[idx] : 0
        const parsed = parsePercent(sp.remisePercent !== undefined && sp.remisePercent !== '' ? sp.remisePercent : sp.remise)
        const finalRemise = (parsed !== null && parsed > 0) ? parsed : promoDiscount
        const freeItemForSp = (promoAnalysis.freeItems || []).find(fi => fi.reference === sp.reference || fi.productId === sp.productId)
        const earnedFreeCartons = freeItemForSp ? (parseInt(freeItemForSp.qtyGratuit, 10) || 0) : 0
        const upb = parseInt(sp.unitsPerBox || sp.unitsPerCarton || 1, 10) || 1

        let earnedFreeUnits = 0
        let isAutoGift = false
        if (earnedFreeCartons > 0) {
          earnedFreeUnits = earnedFreeCartons * upb
          isAutoGift = true
        } else if (sp.manualGratuit !== undefined && sp.manualGratuit !== null && parseInt(sp.manualGratuit, 10) > 0) {
          earnedFreeUnits = parseInt(sp.manualGratuit, 10) || 0
        } else if (editingDevis && sp.initialQty === sp.qty && sp.initialFreeUnits > 0) {
          earnedFreeUnits = sp.initialFreeUnits
        } else if (sp.qtyGratuit > 0) {
          earnedFreeUnits = sp.qtyGratuit
        }

        return {
          ...sp,
          qtyGratuit: earnedFreeUnits,
          remise: finalRemise,
          remisePercent: sp.remisePercent !== undefined && sp.remisePercent !== '' ? sp.remisePercent : (finalRemise > 0 ? String(finalRemise) : ''),
          promoTag: earnedFreeUnits > 0
            ? (isAutoGift ? (freeItemForSp?.promoName || 'Article Offert Promo') : (sp.promoTag || 'Cadeau / Offert manuel'))
            : sp.promoTag
        }
      }),
      ...(promoAnalysis.freeItems || [])
        .filter(fi => !selectedProducts.some(sp => sp.reference === fi.reference || sp.productId === fi.productId))
        .map(fi => {
          const giftProd = products.find(p => p.reference === fi.reference || p.id === fi.productId)
          const upb = parseInt(giftProd?.unitsPerBox || (giftProd ? getProductUnitsPerCarton(giftProd) : 12) || 12, 10) || 12
          const cartons = parseInt(fi.qtyGratuit, 10) || 1
          const totalUnits = cartons * upb
          return {
            productId: fi.productId || giftProd?.id || 'promo_gift',
            productName: fi.productName || giftProd?.name || fi.reference,
            reference: fi.reference || giftProd?.reference || '',
            priceTtc: 0,
            qty: 0,
            qtyGratuit: totalUnits,
            unitsPerBox: upb,
            unitsPerCarton: upb,
            remise: 0,
            remisePercent: '',
            promoTag: `🎁 Offert : ${fi.promoName}`
          }
        })
    ]

    const totalFreeItemsCount = combinedItems.reduce((sum, it) => sum + (parseInt(it.qtyGratuit, 10) || 0), 0)
    const autoPromoSummary = (promoAnalysis.appliedPromotions || []).length > 0
      ? promoAnalysis.appliedPromotions.map(ap => ap.name + (ap.discountPercent > 0 ? ` (${ap.discountPercent}%)` : '') + (ap.giftSummary ? ` [${ap.giftSummary}]` : '') + (ap.voucherAmount > 0 ? ` [Bon -${ap.voucherAmount} DH]` : '')).join(' | ')
      : ''

    const validityDateStr = new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)

    const devisPayload = {
      ...(editingDevis || {}),
      devisNumber: customDevisNumber.trim() || (editingDevis ? editingDevis.devisNumber : suggestedDevisNumber),
      date: editingDevis?.date || new Date().toISOString().substring(0, 10),
      validityDate: validityDateStr,
      status: editingDevis?.status || 'EN_ATTENTE',
      clientDbId: selectedClient || null,
      clientName,
      clientIce,
      clientCity,
      clientAddress,
      clientPhone,
      paymentMethod,
      modeExpedition,
      remarque,
      promoNote: autoPromoSummary,
      remisePercent,
      remiseMontant,
      voucherDiscount: wizardCalculations.voucherDiscount || 0,
      selectedPromoId,
      items: combinedItems,
      appliedPromotions: promoAnalysis.appliedPromotions || [],
      totalFreeItems: totalFreeItemsCount,
      totalHt: wizardCalculations.totalHt,
      totalDiscount: wizardCalculations.totalDiscount,
      totalTva: wizardCalculations.totalTva,
      totalTtc: wizardCalculations.totalTtc
    }

    let savedDevis
    if (editingDevis) {
      savedDevis = await updateDevis(devisPayload)
    } else {
      savedDevis = await addDevis(devisPayload)
    }

    setShowWizard(false)
    setEditingDevis(null)

    if (andConvertNow && savedDevis) {
      handleInitiateConversion(savedDevis)
    } else {
      alert(`Devis ${devisPayload.devisNumber} enregistré avec succès !`)
    }
  }

  // Conversion flow: initiate
  const handleInitiateConversion = (dev) => {
    if (dev.status === 'CONVERTI') {
      alert(`Ce devis a déjà été converti en Bon de Commande (${dev.convertedOrderNumber || ''}).`)
      return
    }
    setConvertingDevis(dev)
  }

  // Conversion flow: confirm and execute
  const handleConfirmConversion = async () => {
    if (!convertingDevis) return
    try {
      const result = await convertDevisToOrder(convertingDevis.id)
      setConvertingDevis(null)
      setConversionSuccessInfo({
        devisNumber: convertingDevis.devisNumber,
        orderNumber: result.order.orderNumber,
        orderId: result.order.id,
        totalTtc: result.order.totalTtc,
        clientName: result.order.clientName
      })
    } catch (err) {
      alert(`Erreur lors de la conversion : ${err.message}`)
    }
  }

  // Delete quote
  const handleDeleteDevis = async (dev) => {
    const confirmDelete = window.confirm(`Voulez-vous vraiment supprimer le devis N° ${dev.devisNumber} ?`)
    if (!confirmDelete) return
    await deleteDevis(dev.id || dev.dbId)
  }

  // Change devis status (Admin or Commercial)
  const handleChangeStatus = async (dev, newStatus) => {
    const updated = { ...dev, status: newStatus }
    await updateDevis(updated)
  }

  // Filtered devis list for display
  const filteredDevis = useMemo(() => {
    return devis.filter(d => {
      // 1. Text search
      const q = search.trim().toLowerCase()
      if (q) {
        const matchesNum = (d.devisNumber || '').toLowerCase().includes(q)
        const matchesClient = (d.clientName || '').toLowerCase().includes(q)
        const matchesIce = (d.clientIce || '').toLowerCase().includes(q)
        const matchesCity = (d.clientCity || '').toLowerCase().includes(q)
        const matchesComm = (d.commercialName || '').toLowerCase().includes(q)
        const matchesOrder = (d.convertedOrderNumber || '').toLowerCase().includes(q)
        const matchesItem = (d.items || []).some(it => 
          (it.productName || '').toLowerCase().includes(q) ||
          (it.reference || '').toLowerCase().includes(q)
        )
        if (!matchesNum && !matchesClient && !matchesIce && !matchesCity && !matchesComm && !matchesOrder && !matchesItem) {
          return false
        }
      }

      // 2. Status filter
      if (statusFilter !== 'ALL') {
        if ((d.status || 'EN_ATTENTE').toUpperCase() !== statusFilter.toUpperCase()) {
          return false
        }
      }

      // 3. Commercial filter (admin only)
      if (isAdmin && commercialFilter !== 'ALL') {
        if (d.commercialDbId !== commercialFilter && d.commercialName !== commercialFilter) {
          return false
        }
      }

      // 4. Date filter
      if (dateFilter === 'THIS_MONTH') {
        const thisMonth = new Date().toISOString().substring(0, 7)
        if (!String(d.date).startsWith(thisMonth)) return false
      } else if (dateFilter === 'LAST_7_DAYS') {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)
        if (String(d.date) < sevenDaysAgo) return false
      }

      return true
    })
  }, [devis, search, statusFilter, commercialFilter, dateFilter, isAdmin])

  // KPI Metrics
  const kpis = useMemo(() => {
    const totalCount = devis.length
    const totalAmountTtc = devis.reduce((sum, d) => sum + (parseFloat(d.totalTtc) || 0), 0)
    
    const enAttenteList = devis.filter(d => (d.status || 'EN_ATTENTE').toUpperCase() === 'EN_ATTENTE')
    const enAttenteAmount = enAttenteList.reduce((sum, d) => sum + (parseFloat(d.totalTtc) || 0), 0)

    const convertisList = devis.filter(d => d.status === 'CONVERTI')
    const convertisAmount = convertisList.reduce((sum, d) => sum + (parseFloat(d.totalTtc) || 0), 0)
    const conversionRate = totalCount > 0 ? Math.round((convertisList.length / totalCount) * 100) : 0

    return {
      totalCount,
      totalAmountTtc,
      enAttenteCount: enAttenteList.length,
      enAttenteAmount,
      convertisCount: convertisList.length,
      convertisAmount,
      conversionRate
    }
  }, [devis])

  const renderStatusBadge = (status) => {
    const s = String(status || 'EN_ATTENTE').toUpperCase()
    if (s === 'CONVERTI') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '4px 10px',
          borderRadius: '8px',
          fontSize: '11px',
          fontWeight: '800',
          background: 'rgba(52, 199, 89, 0.16)',
          color: '#34C759',
          border: '1px solid rgba(52, 199, 89, 0.35)'
        }}>
          <span>🚀</span> Converti en Bon
        </span>
      )
    }
    if (s === 'VALIDE' || s === 'VALIDÉ') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '4px 10px',
          borderRadius: '8px',
          fontSize: '11px',
          fontWeight: '800',
          background: 'rgba(0, 122, 255, 0.16)',
          color: '#007AFF',
          border: '1px solid rgba(0, 122, 255, 0.35)'
        }}>
          <span>✓</span> Validé Client
        </span>
      )
    }
    if (s === 'EXPIRE' || s === 'EXPIRÉ') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '4px 10px',
          borderRadius: '8px',
          fontSize: '11px',
          fontWeight: '800',
          background: 'rgba(255, 69, 58, 0.16)',
          color: '#FF453A',
          border: '1px solid rgba(255, 69, 58, 0.35)'
        }}>
          <span>⏰</span> Expiré
        </span>
      )
    }
    if (s === 'REFUSE' || s === 'REFUSÉ') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '4px 10px',
          borderRadius: '8px',
          fontSize: '11px',
          fontWeight: '800',
          background: 'rgba(142, 142, 147, 0.16)',
          color: '#8E8E93',
          border: '1px solid rgba(142, 142, 147, 0.35)'
        }}>
          <span>✕</span> Refusé
        </span>
      )
    }
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '4px 10px',
        borderRadius: '8px',
        fontSize: '11px',
        fontWeight: '800',
        background: 'rgba(255, 149, 0, 0.16)',
        color: '#FF9500',
        border: '1px solid rgba(255, 149, 0, 0.35)'
      }}>
        <span>⏳</span> En Attente
      </span>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* ── KPI STATS CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        
        {/* Total Devis */}
        <div className="glass-card stat-card" style={{ borderColor: 'rgba(255, 208, 0, 0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600' }}>TOTAL DEVIS ÉMIS</p>
              <h3 style={{ fontSize: '24px', fontWeight: '900', color: '#FFFFFF', marginTop: '4px' }}>
                {kpis.totalCount} <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600' }}>devis</span>
              </h3>
            </div>
            <div style={{ background: 'rgba(255, 208, 0, 0.15)', color: 'var(--bardahl-yellow)', padding: '10px', borderRadius: '12px' }}>
              <FileText size={20} />
            </div>
          </div>
          <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '12px', color: 'var(--bardahl-yellow)', fontWeight: '700' }}>
            CA Devisé : {kpis.totalAmountTtc.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH TTC
          </div>
        </div>

        {/* En Attente */}
        <div className="glass-card stat-card" style={{ borderColor: 'rgba(255, 149, 0, 0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600' }}>EN COURS & EN ATTENTE</p>
              <h3 style={{ fontSize: '24px', fontWeight: '900', color: '#FF9500', marginTop: '4px' }}>
                {kpis.enAttenteCount}
              </h3>
            </div>
            <div style={{ background: 'rgba(255, 149, 0, 0.15)', color: '#FF9500', padding: '10px', borderRadius: '12px' }}>
              <Clock size={20} />
            </div>
          </div>
          <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '12px', color: '#FF9500', fontWeight: '700' }}>
            Montant : {kpis.enAttenteAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH TTC
          </div>
        </div>

        {/* Convertis en Commandes */}
        <div className="glass-card stat-card" style={{ borderColor: 'rgba(52, 199, 89, 0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600' }}>CONVERTIS EN COMMANDES</p>
              <h3 style={{ fontSize: '24px', fontWeight: '900', color: '#34C759', marginTop: '4px' }}>
                {kpis.convertisCount} <span style={{ fontSize: '13px', color: '#34C759', fontWeight: '700' }}>({kpis.conversionRate}%)</span>
              </h3>
            </div>
            <div style={{ background: 'rgba(52, 199, 89, 0.15)', color: '#34C759', padding: '10px', borderRadius: '12px' }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '12px', color: '#34C759', fontWeight: '700' }}>
            Transformé en CA : {kpis.convertisAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH TTC
          </div>
        </div>

      </div>

      {/* ── CONTROLS BAR: SEARCH, TABS & ACTIONS ── */}
      <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        {/* Top line: Search input + Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          
          <div style={{ position: 'relative', flex: '1', minWidth: '260px' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder="Rechercher par N° Devis, Client, Ville, ICE, Article..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '38px', height: '42px', fontSize: '13px' }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Admin Commercial Filter */}
          {isAdmin && (
            <select
              value={commercialFilter}
              onChange={e => setCommercialFilter(e.target.value)}
              className="input-field"
              style={{ width: 'auto', minWidth: '180px', height: '42px', fontSize: '13px' }}
            >
              <option value="ALL">Tous les commerciaux</option>
              {commercials.map(c => (
                <option key={c.id || c.dbId} value={c.dbId || c.id}>
                  {c.name} ({c.matricule || 'REP'})
                </option>
              ))}
            </select>
          )}

          {/* Quick Date filter */}
          <select
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
            className="input-field"
            style={{ width: 'auto', minWidth: '140px', height: '42px', fontSize: '13px' }}
          >
            <option value="ALL">Toutes dates</option>
            <option value="THIS_MONTH">Ce mois-ci</option>
            <option value="LAST_7_DAYS">7 derniers jours</option>
          </select>

          {/* Export Excel */}
          <button
            onClick={() => exportDevisToExcel(filteredDevis)}
            className="btn-secondary"
            style={{ height: '42px', padding: '0 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
            title="Exporter les devis filtrés en Excel"
          >
            <FileSpreadsheet size={16} /> Exporter Excel
          </button>

          {/* Nouveau Devis Button */}
          <button
            onClick={() => handleOpenWizard()}
            className="btn-bardahl"
            style={{ height: '42px', padding: '0 20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '800' }}
          >
            <Plus size={18} /> Nouveau Devis
          </button>

        </div>

        {/* Bottom line: Status Filter Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {[
            { id: 'ALL', label: 'Tous les devis', count: devis.length, color: '#FFFFFF' },
            { id: 'EN_ATTENTE', label: '⏳ En Attente', count: devis.filter(d => (d.status || 'EN_ATTENTE') === 'EN_ATTENTE').length, color: '#FF9500' },
            { id: 'VALIDE', label: '✓ Validés', count: devis.filter(d => d.status === 'VALIDE' || d.status === 'VALIDÉ').length, color: '#007AFF' },
            { id: 'CONVERTI', label: '🚀 Convertis en Commandes', count: devis.filter(d => d.status === 'CONVERTI').length, color: '#34C759' },
            { id: 'EXPIRE', label: '⏰ Expirés', count: devis.filter(d => d.status === 'EXPIRE' || d.status === 'EXPIRÉ').length, color: '#FF453A' },
          ].map(tab => {
            const isActive = statusFilter === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: '700',
                  border: isActive ? `1px solid ${tab.color}` : '1px solid rgba(255,255,255,0.08)',
                  background: isActive ? `${tab.color}22` : 'rgba(255,255,255,0.03)',
                  color: isActive ? tab.color : 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{tab.label}</span>
                <span style={{
                  background: isActive ? tab.color : 'rgba(255,255,255,0.1)',
                  color: isActive ? '#000000' : 'inherit',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  fontSize: '10px',
                  fontWeight: '800'
                }}>
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

      </div>

      {/* ── DEVIS LIST / TABLE ── */}
      {filteredDevis.length === 0 ? (
        <div className="glass-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <FileText size={48} style={{ color: 'var(--bardahl-yellow)', margin: '0 auto 16px', opacity: 0.6 }} />
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#FFFFFF', marginBottom: '8px' }}>
            Aucun devis trouvé
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', maxWidth: '400px', margin: '0 auto 20px' }}>
            {search || statusFilter !== 'ALL'
              ? "Aucun résultat ne correspond à vos critères de recherche actuels."
              : "Vous n'avez pas encore créé de devis. Commencez par créer votre premier devis commercial dès maintenant !"}
          </p>
          <button
            onClick={() => handleOpenWizard()}
            className="btn-bardahl"
            style={{ padding: '10px 22px', fontSize: '13px', margin: '0 auto' }}
          >
            <Plus size={16} /> Créer un Devis
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredDevis.map(dev => {
            const isConverted = dev.status === 'CONVERTI'
            const isValide = dev.status === 'VALIDE' || dev.status === 'VALIDÉ'
            const itemsCount = (dev.items || []).length
            const totalUnits = (dev.items || []).reduce((sum, it) => sum + (parseInt(it.qty, 10) || 0), 0)

            return (
              <div
                key={dev.id || dev.devisNumber}
                className="glass-card"
                style={{
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  flexWrap: 'wrap',
                  borderColor: isConverted ? 'rgba(52, 199, 89, 0.25)' : 'rgba(255,255,255,0.08)',
                  background: isConverted ? 'rgba(52, 199, 89, 0.02)' : undefined,
                  transition: 'all 0.2s ease'
                }}
              >
                
                {/* Left: Devis Number & Status & Date */}
                <div style={{ minWidth: '200px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span style={{
                      fontSize: '15px',
                      fontWeight: '900',
                      color: 'var(--bardahl-yellow)',
                      letterSpacing: '0.5px'
                    }}>
                      {dev.devisNumber}
                    </span>
                    {renderStatusBadge(dev.status)}
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={12} /> Émis le {dev.date}
                    </span>
                  </div>

                  {isConverted && dev.convertedOrderNumber && (
                    <div style={{ marginTop: '4px', fontSize: '11px', color: '#34C759', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>✓ Bon de Commande lié :</span>
                      <strong style={{ color: '#FFFFFF', textDecoration: 'underline', cursor: 'pointer' }} onClick={() => setActiveTab && setActiveTab('orders')}>
                        {dev.convertedOrderNumber}
                      </strong>
                    </div>
                  )}
                </div>

                {/* Center: Client & Commercial */}
                <div style={{ flex: '1', minWidth: '220px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', color: '#FFFFFF', fontSize: '14px' }}>
                    <Building2 size={14} style={{ color: 'var(--bardahl-yellow)', flexShrink: 0 }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {dev.clientName || 'Client'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    {dev.clientCity && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <MapPin size={11} /> {dev.clientCity}
                      </span>
                    )}
                    {dev.clientIce && <span>ICE: {dev.clientIce}</span>}
                    <span style={{ color: 'var(--text-secondary)' }}>
                      • Commercial : <strong style={{ color: '#E2E8F0' }}>{dev.commercialName || 'Direction Bardahl'}</strong>
                    </span>
                  </div>
                </div>

                {/* Items preview & Total amount */}
                <div style={{ textAlign: 'right', minWidth: '150px' }}>
                  <div style={{ fontSize: '18px', fontWeight: '900', color: 'var(--bardahl-yellow)' }}>
                    {(parseFloat(dev.totalTtc) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {itemsCount} article{itemsCount > 1 ? 's' : ''} ({totalUnits} unités) • HT: {(parseFloat(dev.totalHt) || 0).toFixed(2)} DH
                  </div>
                </div>

                {/* Right: Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  
                  {/* CONVERT BUTTON (Key feature) */}
                  {!isConverted ? (
                    <button
                      onClick={() => handleInitiateConversion(dev)}
                      className="btn-bardahl"
                      style={{
                        padding: '8px 14px',
                        fontSize: '12px',
                        fontWeight: '800',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: isValide 
                          ? 'linear-gradient(135deg, #34C759 0%, #28A745 100%)' 
                          : 'linear-gradient(135deg, #FFD000 0%, #FFA500 100%)',
                        color: '#000000',
                        boxShadow: '0 4px 12px rgba(255, 208, 0, 0.25)'
                      }}
                      title="Convertir ce devis en Bon de Commande officiel"
                    >
                      <ArrowRight size={14} /> Convertir en Bon
                    </button>
                  ) : (
                    <button
                      onClick={() => setActiveTab && setActiveTab('orders')}
                      className="btn-secondary"
                      style={{
                        padding: '8px 12px',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: '#34C759',
                        borderColor: 'rgba(52, 199, 89, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      title="Voir le Bon de Commande"
                    >
                      <CheckCircle2 size={14} /> Voir le Bon
                    </button>
                  )}

                  {/* PDF Download Button */}
                  <button
                    onClick={() => generateDevisPdf(dev)}
                    className="btn-secondary"
                    style={{ padding: '8px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    title="Télécharger / Imprimer le Devis PDF officiel"
                  >
                    <FileText size={14} style={{ color: 'var(--bardahl-yellow)' }} /> PDF
                  </button>

                  {/* Details Button */}
                  <button
                    onClick={() => setSelectedDevisDetails(dev)}
                    className="btn-secondary"
                    style={{ padding: '8px 10px', fontSize: '12px' }}
                    title="Consulter les détails du devis"
                  >
                    <Eye size={14} />
                  </button>

                  {/* Edit Button (if not yet converted) */}
                  {!isConverted && (
                    <button
                      onClick={() => handleOpenWizard(dev)}
                      className="btn-secondary"
                      style={{ padding: '8px 10px', fontSize: '12px', color: '#007AFF' }}
                      title="Modifier le devis"
                    >
                      <Edit3 size={14} />
                    </button>
                  )}

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDeleteDevis(dev)}
                    style={{
                      background: 'rgba(255, 69, 58, 0.1)',
                      border: '1px solid rgba(255, 69, 58, 0.3)',
                      color: '#FF453A',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Supprimer ce devis"
                  >
                    <Trash2 size={14} />
                  </button>

                </div>

              </div>
            )
          })}
        </div>
      )}

      {/* ── MODAL: NOUVEAU / MODIFIER DEVIS (WIZARD) ── */}
      {showWizard && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          zIndex: 9999
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '1280px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden' }}>
            
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255, 208, 0, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: 'var(--bardahl-yellow)', color: '#000000', padding: '8px', borderRadius: '10px' }}>
                  <FileText size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#FFFFFF', margin: 0 }}>
                    {editingDevis ? `Modifier Devis : ${editingDevis.devisNumber}` : 'Création Devis Commercial Bardahl'}
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                    Établissez une offre de prix officielle prête à l'envoi ou à la conversion directe
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowWizard(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '20px', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
              
              {/* Section 1: Informations Générales & Client */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                
                {/* Ligne 1 : Client Bénéficiaire (Spacieux) + N° Devis */}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 3fr) minmax(180px, 1fr)', gap: '14px', alignItems: 'flex-start' }}>
                  
                  {/* Client Autocomplete Search (Spacieux pour afficher tout le nom du client) */}
                  <div style={{ position: 'relative' }}>
                    <label style={{ fontSize: '12px', fontWeight: '800', color: '#FFFFFF', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Building2 size={14} style={{ color: 'var(--bardahl-yellow)' }} />
                      Client Bénéficiaire *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--bardahl-yellow)' }} />
                      <input
                        type="text"
                        placeholder="Rechercher par nom, ville, ICE (sélection obligatoire)..."
                        value={clientSearchQuery}
                        onChange={e => {
                          setClientSearchQuery(e.target.value)
                          setShowClientDropdown(true)
                          setSelectedClient('')
                        }}
                        onFocus={() => setShowClientDropdown(true)}
                        className="input-field"
                        style={{
                          paddingLeft: '36px',
                          paddingRight: '32px',
                          fontSize: '13px',
                          height: '42px',
                          fontWeight: '600',
                          width: '100%',
                          boxSizing: 'border-box',
                          borderColor: !selectedClient ? 'rgba(255, 149, 0, 0.5)' : 'rgba(52, 199, 89, 0.6)'
                        }}
                      />
                      {clientSearchQuery && (
                        <button
                          type="button"
                          onClick={() => { setClientSearchQuery(''); setSelectedClient(''); }}
                          style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {/* Client Dropdown */}
                    {showClientDropdown && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: '#181C24',
                        border: '1px solid rgba(255, 208, 0, 0.4)',
                        borderRadius: '10px',
                        maxHeight: '240px',
                        overflowY: 'auto',
                        zIndex: 100,
                        boxShadow: '0 10px 25px rgba(0,0,0,0.7)',
                        marginTop: '4px'
                      }}>
                        {filteredClientOptions.length === 0 ? (
                          <div style={{ padding: '12px', fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                            Aucun client trouvé pour « {clientSearchQuery} »
                          </div>
                        ) : (
                          filteredClientOptions.map(c => (
                            <div
                              key={c.id || c.dbId}
                              onClick={() => {
                                setSelectedClient(c.id || c.dbId)
                                setClientSearchQuery(`${c.codeClient ? '[' + c.codeClient + '] ' : ''}${c.companyName} (${c.city || ''})`)
                                setShowClientDropdown(false)
                              }}
                              style={{
                                padding: '10px 14px',
                                cursor: 'pointer',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                fontSize: '12px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 208, 0, 0.1)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <div>
                                <strong style={{ color: '#FFFFFF' }}>{c.companyName}</strong>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                  {c.city || 'Maroc'} {c.ice ? `• ICE: ${c.ice}` : ''}
                                </div>
                              </div>
                              <span style={{ fontSize: '10px', color: 'var(--bardahl-yellow)', background: 'rgba(255, 208, 0, 0.15)', padding: '2px 6px', borderRadius: '4px' }}>
                                {c.type || 'Revendeur'}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* N° Devis */}
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '800', color: '#FFFFFF', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FileText size={14} style={{ color: 'var(--bardahl-yellow)' }} />
                      N° Devis
                    </label>
                    <input
                      type="text"
                      value={customDevisNumber}
                      onChange={e => setCustomDevisNumber(e.target.value)}
                      className="input-field"
                      style={{ fontSize: '13px', height: '42px', padding: '8px 14px', fontWeight: '800', color: 'var(--bardahl-yellow)', width: '100%', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                {/* Ligne 2 : Paiement Proposé + Mode d'Expédition (Large et aéré) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) minmax(280px, 1.5fr)', gap: '14px', alignItems: 'flex-start' }}>
                  {/* Paiement Proposé */}
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '800', color: '#FFFFFF', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Coins size={14} style={{ color: 'var(--bardahl-yellow)' }} />
                      Paiement Proposé
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value)}
                      className="input-field"
                      style={{ fontSize: '13px', height: '42px', padding: '8px 14px', boxSizing: 'border-box', width: '100%', fontWeight: '600' }}
                    >
                      <option value="Chèque">Chèque</option>
                      <option value="Traite 60J">Traite 60 Jours</option>
                      <option value="Traite 90J">Traite 90 Jours</option>
                      <option value="Virement bancaire">Virement bancaire</option>
                      <option value="Espèces">Espèces</option>
                    </select>
                  </div>

                  {/* Mode d'Expédition (Spacieux, plus de texte tronqué) */}
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '800', color: '#FFFFFF', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Truck size={14} style={{ color: 'var(--bardahl-yellow)' }} />
                      Mode d'Expédition
                    </label>
                    <select
                      value={modeExpedition}
                      onChange={e => setModeExpedition(e.target.value)}
                      className="input-field"
                      style={{ fontSize: '13px', height: '42px', padding: '8px 14px', boxSizing: 'border-box', width: '100%', fontWeight: '600' }}
                    >
                      <option value="Transport Bardahl">Transport Bardahl (Livraison directe)</option>
                      <option value="Messagerie CTM / Ghazala">Messagerie CTM / Ghazala</option>
                      <option value="Comptoir / Enlèvement">Comptoir / Enlèvement sur place</option>
                    </select>
                  </div>
                </div>

              </div>

              {/* Section 2: Sélection des Articles (Catalogue Bardahl) */}
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#FFFFFF', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Package size={16} style={{ color: 'var(--bardahl-yellow)' }} />
                    Ajouter des articles ({products.length} articles disponibles)
                  </h4>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Family Selector */}
                    <select
                      value={selectedProductCategoryFilter}
                      onChange={e => setSelectedProductCategoryFilter(e.target.value)}
                      className="input-field"
                      style={{
                        width: 'auto',
                        minWidth: '240px',
                        height: '42px',
                        lineHeight: '40px',
                        padding: '0 36px 0 14px',
                        fontSize: '13px',
                        fontWeight: '700',
                        boxSizing: 'border-box'
                      }}
                    >
                      <option value="ALL">Toutes les Familles</option>
                      {activeFamilies.map(f => (
                        <option key={f.code} value={f.code}>{f.icon} {f.label}</option>
                      ))}
                    </select>

                    {/* Search in products */}
                    <input
                      type="text"
                      placeholder="Chercher référence ou nom..."
                      value={productSearchQuery}
                      onChange={e => setProductSearchQuery(e.target.value)}
                      className="input-field"
                      style={{
                        width: '220px',
                        height: '42px',
                        padding: '8px 14px',
                        fontSize: '13px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Quick Add Product Chips (Scrollable) */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                  {filteredProductsCatalog.slice(0, 30).map(p => {
                    const fam = getFamilyInfo(p.category, activeFamilies)
                    const cartonUnits = p.unitsPerBox || getProductUnitsPerCarton(p) || 1
                    return (
                      <div
                        key={p.id || p.reference}
                        onClick={() => handleAddProductItem(p)}
                        style={{
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid rgba(255,255,255,0.08)',
                          background: 'rgba(255,255,255,0.03)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = 'var(--bardahl-yellow)'
                          e.currentTarget.style.background = 'rgba(255, 208, 0, 0.08)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                          e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                        }}
                      >
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontSize: '12px', fontWeight: '800', color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <span style={{ color: 'var(--bardahl-yellow)', marginRight: '6px' }}>[{p.reference || p.code}]</span>
                            {p.name}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                            {fam.icon} {fam.label} • {cartonUnits} un./ct
                          </div>
                        </div>

                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '12px', fontWeight: '800', color: 'var(--bardahl-yellow)' }}>
                            {(parseFloat(p.priceTtc) || 0).toFixed(2)} DH
                          </div>
                          <button
                            type="button"
                            style={{ background: 'var(--bardahl-yellow)', color: '#000000', border: 'none', borderRadius: '4px', padding: '2px 6px', fontSize: '10px', fontWeight: '800', cursor: 'pointer', marginTop: '2px' }}
                          >
                            + Ajouter
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Section 2: Tableau des Articles Sélectionnés dans le Devis */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#FFFFFF', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Gift size={16} style={{ color: 'var(--bardahl-yellow)' }} />
                    <span>Articles dans le Devis ({selectedProducts.length})</span>
                  </h4>
                  {selectedProducts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedProducts([])}
                      style={{ background: 'none', border: 'none', color: '#FF453A', fontSize: '11px', cursor: 'pointer', fontWeight: '700' }}
                    >
                      Tout vider
                    </button>
                  )}
                </div>

                {/* Application Rapide de la Remise sur Tout le Devis */}
                {selectedProducts.length > 0 && (
                  <div style={{
                    marginBottom: '12px',
                    padding: '8px 14px',
                    background: 'rgba(255, 208, 0, 0.05)',
                    border: '1px solid rgba(255, 208, 0, 0.2)',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', color: 'var(--bardahl-yellow)', fontWeight: '900' }}>%</span>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--bardahl-yellow)' }}>
                        Application Rapide de la Remise sur Tout le Panier :
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Remise au choix :</span>
                        <input
                          type="text"
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
                            width: '60px',
                            height: '28px',
                            background: '#181C24',
                            border: '1px solid var(--border-card)',
                            borderRadius: '6px',
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
                            padding: '4px 10px',
                            height: '28px',
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

                      <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>

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
                              padding: '4px 8px',
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
                        <th style={{ minWidth: '80px', textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedProducts.length === 0 ? (
                        <tr>
                          <td colSpan="9" style={{ textAlign: 'center', padding: '36px 16px', color: 'var(--text-secondary)' }}>
                            <ShoppingBag style={{ width: '36px', height: '36px', color: 'var(--text-muted)', margin: '0 auto 8px', display: 'block' }} />
                            <div style={{ fontWeight: '800', color: '#FFFFFF', fontSize: '14px' }}>Aucun article dans ce devis</div>
                            <div style={{ fontSize: '12px', marginTop: '4px', color: 'var(--text-secondary)' }}>
                              Recherchez un produit ou une référence ci-dessus pour composer le devis.
                            </div>
                          </td>
                        </tr>
                      ) : (
                        selectedProducts.map((item, idx) => {
                          const promoDiscount = promoAnalysis.lineDiscounts && promoAnalysis.lineDiscounts[idx] ? promoAnalysis.lineDiscounts[idx] : 0
                          const parsedRemise = parsePercent(item.remisePercent !== undefined && item.remisePercent !== '' ? item.remisePercent : item.remise)
                          const hasManualOverride = parsedRemise !== null && parsedRemise > 0
                          const currentRemise = hasManualOverride ? parsedRemise : promoDiscount
                          const lineGross = (parseFloat(item.priceTtc) || 0) * (parseInt(item.qty, 10) || 0)
                          const lineDiscountVal = lineGross * (currentRemise / 100)
                          const lineNet = Math.max(0, lineGross - lineDiscountVal)
                          const upb = item.unitsPerBox || item.unitsPerCarton || 1
                          const cartons = Math.floor((parseInt(item.qty, 10) || 0) / upb)
                          const remainderUnits = (parseInt(item.qty, 10) || 0) % upb
                          const itemCat = getFamilyInfo(item.category, activeFamilies)

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
                                  {itemCat.label || item.category || 'Bardahl'}
                                </span>
                              </td>

                              {/* Quantité en unités + conversion instantanée cartons */}
                              <td style={{ textAlign: 'center' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', background: '#0D0F12', border: '1px solid rgba(255, 208, 0, 0.4)', borderRadius: '8px', padding: '2px' }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const minAllowed = ((item.manualGratuit && item.manualGratuit > 0) || (item.qtyGratuit && item.qtyGratuit > 0)) ? 0 : 1
                                      handleQtyChange(idx, Math.max(minAllowed, (parseInt(item.qty, 10) || 0) - 1))
                                    }}
                                    style={{ width: '28px', height: '28px', background: 'transparent', border: 'none', color: 'var(--bardahl-yellow)', fontSize: '16px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    title="Diminuer d'une unité"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min={((item.manualGratuit && item.manualGratuit > 0) || (item.qtyGratuit && item.qtyGratuit > 0)) ? "0" : "1"}
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

                                {/* Carton interactive button */}
                                <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '3px', maxWidth: '106px', width: '100%' }}>
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
                                          borderRadius: '4px',
                                          width: '18px',
                                          height: '22px',
                                          fontSize: '11px',
                                          fontWeight: '900',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          padding: 0,
                                          flexShrink: 0
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
                                        flex: 1,
                                        height: '22px',
                                        background: 'linear-gradient(135deg, rgba(255, 208, 0, 0.2), rgba(255, 149, 0, 0.15))',
                                        border: '1px solid var(--bardahl-yellow)',
                                        color: 'var(--bardahl-yellow)',
                                        borderRadius: '5px',
                                        padding: '0 4px',
                                        fontSize: '10px',
                                        fontWeight: '800',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '3px',
                                        transition: 'all 0.15s ease',
                                        whiteSpace: 'nowrap'
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
                                      <span style={{ fontSize: '11px' }}>📦</span>
                                      <span>{cartons} Carton{cartons > 1 ? 's' : ''}</span>
                                      <span style={{ fontSize: '9px', opacity: 0.9, fontWeight: '900' }}>+1 📦</span>
                                    </button>
                                  </div>

                                  {remainderUnits > 0 && (
                                    <span style={{ color: 'var(--text-secondary)', fontSize: '9px', marginTop: '1px' }}>
                                      (+{remainderUnits} un.)
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Gratuit */}
                              <td style={{ textAlign: 'center' }}>
                                {(() => {
                                  const freeItem = (promoAnalysis.freeItems || []).find(fi => fi.reference === item.reference || fi.productId === item.productId)
                                  const autoCartons = freeItem ? (parseInt(freeItem.qtyGratuit, 10) || 0) : 0
                                  const hasAutoGift = autoCartons > 0

                                  if (hasAutoGift) {
                                    const freeUnits = autoCartons * upb
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
                                        title={`Gratuité calculée automatiquement via l'offre ${freeItem?.promoName || ''}`}
                                        >
                                          🔒 🎁 {autoCartons} carton{autoCartons > 1 ? 's' : ''}
                                        </span>
                                        <span style={{ fontSize: '10px', color: '#34C759', fontWeight: 'bold' }}>
                                          ({freeUnits} un. auto)
                                        </span>
                                      </div>
                                    )
                                  }

                                  const isPromoReached = promoAnalysis.selectedPromoStatus
                                    ? promoAnalysis.selectedPromoStatus.isReached
                                    : (promoAnalysis.appliedPromotions && promoAnalysis.appliedPromotions.length > 0)
                                  const hasDistinctGift = (promoAnalysis.freeItems || []).some(fi => fi.reference !== item.reference && fi.productId !== item.productId)

                                  if (isPromoReached && hasDistinctGift) {
                                    return (
                                      <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                                        <span style={{
                                          background: 'rgba(52, 199, 89, 0.15)',
                                          color: '#34C759',
                                          border: '1px solid rgba(52, 199, 89, 0.35)',
                                          borderRadius: '6px',
                                          padding: '3px 8px',
                                          fontWeight: '800',
                                          fontSize: '11px',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px'
                                        }}>
                                          🎁 Voir ligne cadeau
                                        </span>
                                        <span style={{ fontSize: '9px', color: '#34C759', marginTop: '2px', fontWeight: 'bold' }}>
                                          Offre validée
                                        </span>
                                      </div>
                                    )
                                  }

                                  const currentManualGratuit = item.manualGratuit !== undefined ? item.manualGratuit : (item.qtyGratuit || 0)
                                  return (
                                    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                                      <div style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        background: currentManualGratuit > 0 ? 'rgba(52, 199, 89, 0.12)' : '#0D0F12',
                                        border: currentManualGratuit > 0 ? '1px solid rgba(52, 199, 89, 0.5)' : '1px solid var(--border-card)',
                                        borderRadius: '8px',
                                        padding: '2px'
                                      }}>
                                        <button
                          type="button"
                          onClick={() => handleManualGratuitChange(idx, Math.max(0, (parseInt(currentManualGratuit, 10) || 0) - 1))}
                          style={{ width: '24px', height: '24px', background: 'transparent', border: 'none', color: currentManualGratuit > 0 ? '#34C759' : 'var(--text-secondary)', fontSize: '14px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Diminuer la gratuité manuelle"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={currentManualGratuit}
                          onChange={e => handleManualGratuitChange(idx, e.target.value)}
                          style={{
                            width: '38px',
                            height: '24px',
                            textAlign: 'center',
                            background: 'transparent',
                            border: 'none',
                            color: currentManualGratuit > 0 ? '#34C759' : '#8E95A5',
                            fontWeight: '800',
                            fontSize: '12px',
                            outline: 'none'
                          }}
                          title="Gratuité saisie manuellement (unités)"
                        />
                        <button
                          type="button"
                          onClick={() => handleManualGratuitChange(idx, (parseInt(currentManualGratuit, 10) || 0) + 1)}
                          style={{ width: '24px', height: '24px', background: 'transparent', border: 'none', color: '#34C759', fontSize: '14px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Augmenter la gratuité manuelle"
                        >
                          +
                        </button>
                      </div>
                      
                      {item.qty > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            handleManualGratuitChange(idx, item.qty)
                            handleQtyChange(idx, 0)
                          }}
                          style={{
                            fontSize: '9px',
                            color: 'var(--bardahl-yellow)',
                            background: 'transparent',
                            border: 'none',
                            textDecoration: 'underline',
                            cursor: 'pointer',
                            padding: 0
                          }}
                          title="Passer cette ligne en 100% offert / échantillon (qty=0)"
                        >
                          Offrir 100%
                        </button>
                      ) : (
                        <span style={{ fontSize: '9px', color: '#34C759', fontWeight: 'bold' }}>
                          Échantillon (0 DH)
                        </span>
                      )}
                    </div>
                  )
                })()}
              </td>

              {/* Prix U. TTC modifiable */}
              <td style={{ textAlign: 'right' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px' }}>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={item.customPriceStr !== undefined ? item.customPriceStr : item.priceTtc}
                    onChange={e => handlePriceChange(idx, e.target.value)}
                    style={{
                      width: '65px',
                      height: '26px',
                      textAlign: 'right',
                      background: '#0D0F12',
                      border: '1px solid rgba(255, 208, 0, 0.4)',
                      borderRadius: '6px',
                      color: '#FFFFFF',
                      fontWeight: '800',
                      fontSize: '12px',
                      padding: '0 4px',
                      outline: 'none'
                    }}
                    title="Prix unitaire TTC modifiable directement par le commercial"
                  />
                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>DH</span>
                </div>
              </td>

              {/* Remise (%) avec décimales et alerte override */}
              <td style={{ textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', background: currentRemise > 0 ? 'rgba(0, 122, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)', border: currentRemise > 0 ? '1px solid #007AFF' : '1px solid var(--border-card)', borderRadius: '8px', padding: '2px 6px' }}>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={(item.remisePercent !== undefined && item.remisePercent !== '' && parseFloat(item.remisePercent) > 0) ? item.remisePercent : (promoDiscount > 0 ? promoDiscount : (item.remisePercent || ''))}
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
                    title="Remise commerciale en % sur cet article"
                  />
                  <span style={{ fontSize: '11px', fontWeight: 'bold', color: currentRemise > 0 ? '#007AFF' : 'var(--text-secondary)', paddingRight: '2px' }}>%</span>
                </div>
                {hasManualOverride && promoDiscount > 0 && parsedRemise !== promoDiscount && (
                  <div style={{ marginTop: '3px', display: 'flex', justifyContent: 'center' }}>
                    <span
                      style={{
                        cursor: 'help',
                        fontSize: '13px',
                        lineHeight: 1,
                        display: 'inline-block'
                      }}
                      title={`Remise manuelle de ${item.remisePercent}% appliquée au lieu de ${promoDiscount}% prévue par l'offre commerciale`}
                    >
                      ⚠️
                    </span>
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

              {/* Action delete */}
              <td style={{ textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={() => handleRemoveProductLine(idx)}
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
                    title="Retirer la ligne"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </td>
            </tr>
          )
        })
      )}

      {/* Affichage automatique des cadeaux promotionnels distincts */}
      {promoAnalysis.freeItems && promoAnalysis.freeItems
        .filter(fi => !selectedProducts.some(sp => sp.reference === fi.reference || sp.productId === fi.productId))
        .map((fi, fiIdx) => {
          const giftProd = products.find(p => p.reference === fi.reference || p.id === fi.productId)
          const upb = giftProd?.unitsPerBox || giftProd?.unitsPerCarton || (giftProd ? getProductUnitsPerCarton(giftProd) : 12) || 12
          const cartons = parseInt(fi.qtyGratuit, 10) || 1
          const giftCategory = giftProd?.category || 'Bardahl'
          const fam = getFamilyInfo(giftCategory, activeFamilies)

          return (
            <tr key={`promo_gift_${fiIdx}`} style={{ background: 'rgba(52, 199, 89, 0.08)', borderLeft: '3px solid #34C759' }}>
              <td>
                <span style={{
                  fontWeight: '900',
                  fontSize: '11px',
                  color: '#34C759',
                  background: 'rgba(52, 199, 89, 0.18)',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  display: 'inline-block'
                }}>
                  {fi.reference}
                </span>
              </td>
              <td>
                <strong style={{ color: '#FFFFFF', fontSize: '13px', display: 'block' }}>{fi.productName}</strong>
                <div style={{ fontSize: '10px', color: '#34C759', marginTop: '2px', fontWeight: '600' }}>
                  Offert via « {fi.promoName} »
                </div>
              </td>
              <td>
                <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '5px', background: 'rgba(52, 199, 89, 0.2)', color: '#34C759', fontWeight: '700' }}>
                  {fam.label || giftCategory}
                </span>
              </td>
              <td style={{ textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{ color: '#8E95A5', fontSize: '12px', fontWeight: '700' }}>
                    0 un.
                  </span>
                  <span style={{ fontSize: '9px', color: '#34C759', fontWeight: '800' }}>
                    Inclus Promo
                  </span>
                </div>
              </td>
              <td style={{ textAlign: 'center' }}>
                <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
                  <span style={{
                    background: 'rgba(52, 199, 89, 0.22)',
                    color: '#34C759',
                    border: '1px solid rgba(52, 199, 89, 0.5)',
                    borderRadius: '7px',
                    padding: '4px 10px',
                    fontWeight: '900',
                    fontSize: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    boxShadow: '0 2px 6px rgba(52, 199, 89, 0.2)'
                  }}>
                    🎁 {cartons} carton{cartons > 1 ? 's' : ''}
                  </span>
                </div>
              </td>
              <td style={{ textAlign: 'right' }}>
                {giftProd?.priceTtc ? (
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textDecoration: 'line-through' }}>
                      {(parseFloat(giftProd.priceTtc) || 0).toFixed(2)} DH
                    </div>
                    <div style={{ fontSize: '10px', color: '#34C759', fontWeight: 'bold' }}>
                      0.00 DH
                    </div>
                  </div>
                ) : (
                  <span style={{ color: '#34C759', fontWeight: '700', fontSize: '12px' }}>0.00 DH</span>
                )}
              </td>
              <td style={{ textAlign: 'center' }}>
                <span style={{
                  background: 'rgba(52, 199, 89, 0.15)',
                  color: '#34C759',
                  border: '1px solid rgba(52, 199, 89, 0.3)',
                  borderRadius: '6px',
                  padding: '2px 8px',
                  fontSize: '11px',
                  fontWeight: '900'
                }}>
                  100%
                </span>
              </td>
              <td style={{ textAlign: 'right', fontWeight: '900', color: '#34C759', fontSize: '13px' }}>
                0.00 DH
              </td>
              <td style={{ textAlign: 'center' }}>
                <span style={{
                  fontSize: '10px',
                  background: 'rgba(52, 199, 89, 0.18)',
                  color: '#34C759',
                  border: '1px solid rgba(52, 199, 89, 0.35)',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontWeight: '800'
                }}>
                  🎁 Offert
                </span>
              </td>
            </tr>
          )
        })}
    </tbody>
  </table>
</div>
              </div>

              {/* Section 3: Promotions & Offres Commerciales */}
              <div style={{ background: '#14171F', padding: '16px', borderRadius: '14px', border: '1px solid var(--border-card)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <label style={{ fontSize: '13px', fontWeight: '800', color: 'var(--bardahl-yellow)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Sparkles size={16} /> Promotions & Offres Commerciales
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
                          const typeLabel = p.type === 'TYPE_1' ? 'Type 1 Remise' : p.type === 'TYPE_2' ? 'Type 2 Gratuit' : p.type === 'TYPE_3' ? "Type 3 Bon d'achat" : p.type === 'TYPE_5' ? 'Type 5 Prix Vente' : 'Type 4 CA Famille'
                          const targetInfo = p.targetType === 'FAMILY' 
                            ? (p.targetFamilies && p.targetFamilies.length > 1 ? `Familles ${p.targetFamilies.join(', ')}` : `Famille ${p.targetFamily}`)
                            : (p.targetProductName || p.targetProductRef)
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
                    <span>🚫 Mode sans promotion activé. Aucune remise ni gratuité promotionnelle ne sera calculée sur ce devis.</span>
                  </div>
                ) : selectedPromoId === 'AUTO' ? (
                  promoAnalysis.appliedPromotions && promoAnalysis.appliedPromotions.length > 0 ? (
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
                                Bon : -{(parseFloat(ap.voucherAmount) || 0).toFixed(2)} DH
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '10px 14px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid var(--border-card)', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>✨ L'application détecte automatiquement les meilleures remises et gratuités selon les quantités et seuils atteints.</span>
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
                          `La condition sur ${promoAnalysis.selectedPromoStatus.targetLabel} est validée (${promoAnalysis.selectedPromoStatus.currentVal} ${promoAnalysis.selectedPromoStatus.unitLabel}). Tous les avantages ont été appliqués sur votre devis.`
                        ) : (
                          `Vous avez actuellement ${promoAnalysis.selectedPromoStatus.currentVal} ${promoAnalysis.selectedPromoStatus.unitLabel} sur ${promoAnalysis.selectedPromoStatus.targetLabel}. Ajoutez encore ${promoAnalysis.selectedPromoStatus.missingValue} ${promoAnalysis.selectedPromoStatus.unitLabel} pour activer cette offre.`
                        )}
                      </p>

                      {!promoAnalysis.selectedPromoStatus.isReached && (
                        <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={() => handleSelectPromotion(selectedPromoId)}
                            style={{
                              background: 'var(--bardahl-yellow)',
                              color: '#000',
                              fontWeight: '900',
                              fontSize: '11px',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                          >
                            <Sparkles size={13} /> Activer cette offre automatiquement (+ {promoAnalysis.selectedPromoStatus.missingValue} {promoAnalysis.selectedPromoStatus.unitLabel})
                          </button>
                        </div>
                      )}

                      {/* Carte détaillée des modifications manuelles de remise */}
                      {(() => {
                        const manualOverrides = selectedProducts.map((sp, idx) => {
                          const promoDiscount = promoAnalysis.lineDiscounts && promoAnalysis.lineDiscounts[idx] ? promoAnalysis.lineDiscounts[idx] : 0
                          const parsedRemise = parsePercent(sp.remisePercent !== undefined && sp.remisePercent !== '' ? sp.remisePercent : sp.remise)
                          if (parsedRemise !== null && promoDiscount > 0 && parsedRemise !== promoDiscount) {
                            return {
                              product: sp,
                              manualRemise: parsedRemise,
                              promoRemise: promoDiscount
                            }
                          }
                          return null
                        }).filter(Boolean)

                        if (manualOverrides.length === 0) return null

                        return (
                          <div style={{
                            marginTop: '10px',
                            padding: '10px 14px',
                            background: 'rgba(255, 149, 0, 0.12)',
                            border: '1px solid rgba(255, 149, 0, 0.45)',
                            borderRadius: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '14px' }}>⚠️</span>
                              <strong style={{ color: '#FF9500', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                Détail des modifications de remise commerciale (Saisie Manuelle) :
                              </strong>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
                              {manualOverrides.map((mo, moIdx) => (
                                <div key={moIdx} style={{ fontSize: '11px', color: '#F1F5F9', lineHeight: '1.4', paddingLeft: '12px', position: 'relative' }}>
                                  <span style={{ position: 'absolute', left: '2px', color: '#FF9500', fontWeight: 'bold' }}>•</span>
                                  <strong style={{ color: '#FFFFFF' }}>{mo.product.productName}</strong>{' '}
                                  <span style={{ color: 'var(--bardahl-yellow)', fontWeight: 'bold' }}>({mo.product.reference})</span> :{' '}
                                  Remise manuelle de <strong style={{ color: '#FF9500' }}>{mo.manualRemise}%</strong> appliquée au lieu de{' '}
                                  <strong style={{ color: '#34C759' }}>{mo.promoRemise}%</strong> prévue initialement par les conditions de la promotion.
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      })()}

                      {/* Box Quantité Restante de Produit (Stock Restant Déduit des articles du devis + Cadeaux offerts) */}
                      {(() => {
                        const chosenPromo = promoAnalysis.selectedPromoStatus.promo
                        let targetProds = []
                        if (chosenPromo.targetType === 'FAMILY') {
                          const famList = (chosenPromo.targetFamilies && chosenPromo.targetFamilies.length > 0)
                            ? chosenPromo.targetFamilies.map(f => f.toLowerCase().trim())
                            : (chosenPromo.targetFamily ? chosenPromo.targetFamily.split(',').map(s => s.trim().toLowerCase()).filter(Boolean) : [])
                          const famProdsInCart = selectedProducts.filter(sp => {
                            const famInfo = getFamilyInfo(sp.category, activeFamilies)
                            return famList.some(f => (famInfo.label || '').toLowerCase() === f || (famInfo.code || '').toLowerCase() === f)
                          })
                          if (famProdsInCart.length > 0) {
                            targetProds = famProdsInCart.map(sp => products.find(p => p.id === sp.productId || p.reference === sp.reference) || sp)
                          } else {
                            targetProds = products.filter(p => {
                              const famInfo = getFamilyInfo(p.category, activeFamilies)
                              return famList.some(f => (famInfo.label || '').toLowerCase() === f || (famInfo.code || '').toLowerCase() === f)
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

                        // Collect distinct free gifts that are not already in targetProds
                        const distinctGifts = (promoAnalysis.freeItems || []).filter(fi => 
                          !targetProds.some(tp => tp.reference === fi.reference || tp.id === fi.productId)
                        )

                        if ((!targetProds || targetProds.length === 0) && distinctGifts.length === 0) return null

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
                                Déduction en temps réel selon articles du devis & cadeaux offerts
                              </span>
                            </div>

                            {/* Target Products in Cart */}
                            {targetProds.map(tp => {
                              const currentStock = parseInt(tp.stock !== undefined ? tp.stock : 100, 10)
                              const inCartItem = selectedProducts.find(sp => sp.productId === tp.id || sp.reference === tp.reference)
                              const inCartUnits = inCartItem ? (parseInt(inCartItem.qty, 10) || 0) : 0
                              const freeItemForTp = (promoAnalysis.freeItems || []).find(fi => fi.reference === tp.reference || fi.productId === tp.id)
                              const freeCartonsForTp = freeItemForTp ? (parseInt(freeItemForTp.qtyGratuit, 10) || 0) : 0
                              const upb = tp.unitsPerBox || tp.unitsPerCarton || getProductUnitsPerCarton(tp) || 1
                              const freeUnitsForTp = freeCartonsForTp * upb
                              const totalDeducted = inCartUnits + freeUnitsForTp
                              const remainingStock = Math.max(0, currentStock - totalDeducted)
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
                                      (Stock magasin : {currentStock} un.{inCartUnits > 0 ? ` | Dans ce devis : -${inCartUnits} un.` : ''}{freeUnitsForTp > 0 ? ` + 🎁 -${freeUnitsForTp} un.` : ''})
                                    </span>
                                  </div>
                                </div>
                              )
                            })}

                            {/* Distinct Free Gift Products */}
                            {distinctGifts.map((fi, fiIdx) => {
                              const giftProd = products.find(p => p.reference === fi.reference || p.id === fi.productId)
                              const upb = giftProd?.unitsPerBox || giftProd?.unitsPerCarton || (giftProd ? getProductUnitsPerCarton(giftProd) : 12) || 12
                              const cartons = parseInt(fi.qtyGratuit, 10) || 1
                              const giftUnits = cartons * upb
                              const currentStock = parseInt(giftProd?.stock !== undefined ? giftProd.stock : 100, 10)
                              const remainingStock = Math.max(0, currentStock - giftUnits)
                              const remainingCartons = Math.floor(remainingStock / upb)
                              const remainingLooseUnits = remainingStock % upb

                              return (
                                <div
                                  key={`distinct_gift_stock_${fiIdx}`}
                                  style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: '8px',
                                    padding: '7px 10px',
                                    background: 'rgba(52, 199, 89, 0.08)',
                                    borderRadius: '6px',
                                    border: '1px solid rgba(52, 199, 89, 0.25)'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{
                                      fontSize: '11px',
                                      fontWeight: '900',
                                      color: '#34C759',
                                      background: 'rgba(52, 199, 89, 0.2)',
                                      padding: '2px 7px',
                                      borderRadius: '4px'
                                    }}>
                                      {fi.reference}
                                    </span>
                                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#FFFFFF' }}>
                                      {fi.productName}
                                    </span>
                                    <span style={{
                                      background: '#34C759',
                                      color: '#0D0F12',
                                      fontSize: '9px',
                                      fontWeight: '900',
                                      padding: '1px 6px',
                                      borderRadius: '4px'
                                    }}>
                                      🎁 CADEAU OFFERT
                                    </span>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                    <span style={{
                                      background: remainingStock > 0 ? 'rgba(52, 199, 89, 0.22)' : 'rgba(255, 69, 58, 0.22)',
                                      color: remainingStock > 0 ? '#34C759' : '#FF453A',
                                      border: remainingStock > 0 ? '1px solid rgba(52, 199, 89, 0.45)' : '1px solid rgba(255, 69, 58, 0.45)',
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

                                    <span style={{ fontSize: '11px', color: '#34C759', fontWeight: '700' }}>
                                      (Stock magasin : {currentStock} un. | 🎁 Cadeau déduit : -{giftUnits} un. [{cartons} carton{cartons > 1 ? 's' : ''}])
                                    </span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )
                      })()}

                      {/* Badges Remise / Cadeau / Bon */}
                      {promoAnalysis.appliedPromotions.length > 0 && (
                        <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {promoAnalysis.appliedPromotions[0].discountPercent > 0 && (
                            <span style={{ background: 'rgba(0, 122, 255, 0.2)', color: '#007AFF', padding: '3px 8px', borderRadius: '6px', fontWeight: '800', fontSize: '11px' }}>
                              Remise : {promoAnalysis.appliedPromotions[0].discountPercent}%
                            </span>
                          )}
                          {promoAnalysis.appliedPromotions[0].type === 'TYPE_5' && (promoAnalysis.appliedPromotions[0].unitPrice > 0) && (
                            <span style={{ background: 'rgba(255, 208, 0, 0.2)', color: 'var(--bardahl-yellow)', padding: '3px 8px', borderRadius: '6px', fontWeight: '800', fontSize: '11px' }}>
                              🏷️ Prix Vente Dégressif : {promoAnalysis.appliedPromotions[0].unitPrice.toFixed(2)} DH TTC / un.
                            </span>
                          )}
                          {promoAnalysis.appliedPromotions[0].giftSummary && (
                            <span style={{ background: 'rgba(52, 199, 89, 0.2)', color: '#34C759', padding: '3px 8px', borderRadius: '6px', fontWeight: '800', fontSize: '11px' }}>
                              🎁 {promoAnalysis.appliedPromotions[0].giftSummary}
                            </span>
                          )}
                          {promoAnalysis.appliedPromotions[0].voucherAmount > 0 && (
                            <span style={{ background: 'rgba(255, 149, 0, 0.2)', color: '#FF9500', padding: '3px 8px', borderRadius: '6px', fontWeight: '800', fontSize: '11px' }}>
                              Bon Immédiat : -{(parseFloat(promoAnalysis.appliedPromotions[0]?.voucherAmount) || 0).toFixed(2)} DH
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
                        CHOIX DE LA PROMOTION (Plusieurs offres applicables)
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
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 4: Remise Globale, Remarques & Récapitulatif Financier */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                
                {/* Remarques & Remise globale */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                        Remise Globale (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={remisePercent}
                        onChange={e => {
                          setRemisePercent(parseFloat(e.target.value) || 0)
                          setRemiseMontant(0)
                        }}
                        className="input-field"
                        placeholder="Ex: 5%"
                        style={{ height: '36px', fontSize: '13px' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                        Ou Remise Fixe (DH)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={remiseMontant}
                        onChange={e => {
                          setRemiseMontant(parseFloat(e.target.value) || 0)
                          setRemisePercent(0)
                        }}
                        className="input-field"
                        placeholder="Ex: 200 DH"
                        style={{ height: '36px', fontSize: '13px' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
                      Remarques / Conditions particulières
                    </label>
                    <textarea
                      value={remarque}
                      onChange={e => setRemarque(e.target.value)}
                      className="input-field"
                      placeholder="Précisions sur la livraison, conditions de paiement..."
                      rows={2}
                      style={{ fontSize: '12px', resize: 'vertical' }}
                    />
                  </div>
                </div>

                {/* Financial Summary Box */}
                <div style={{ background: '#12151C', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255, 208, 0, 0.25)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <span>Total Brut TTC :</span>
                    <span>{wizardCalculations.brutTtc.toFixed(2)} DH</span>
                  </div>

                  {wizardCalculations.totalDiscount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#FF453A', fontWeight: '700' }}>
                      <span>Total Remises Accordées :</span>
                      <span>-{wizardCalculations.totalDiscount.toFixed(2)} DH</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <span>Total Hors Taxes (HT) :</span>
                    <span>{wizardCalculations.totalHt.toFixed(2)} DH</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <span>TVA Légale (20%) :</span>
                    <span>{wizardCalculations.totalTva.toFixed(2)} DH</span>
                  </div>

                  <div style={{ borderTop: '1px solid rgba(255, 208, 0, 0.3)', paddingTop: '8px', marginTop: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', fontWeight: '900', color: '#FFFFFF' }}>TOTAL NET TTC :</span>
                    <span style={{ fontSize: '20px', fontWeight: '900', color: 'var(--bardahl-yellow)' }}>
                      {wizardCalculations.totalTtc.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH
                    </span>
                  </div>
                </div>

              </div>

            </div>

            {/* Modal Footer with Actions */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', background: '#141820', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowWizard(false)}
                className="btn-secondary"
                style={{ padding: '10px 18px', fontSize: '13px' }}
              >
                Annuler
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => handleSaveDevis(false)}
                  className="btn-secondary"
                  style={{ padding: '10px 18px', fontSize: '13px', borderColor: 'var(--bardahl-yellow)', color: 'var(--bardahl-yellow)', fontWeight: '700' }}
                >
                  Enregistrer le Devis
                </button>

                {/* Instant conversion button */}
                <button
                  type="button"
                  onClick={() => handleSaveDevis(true)}
                  className="btn-bardahl"
                  style={{
                    padding: '10px 22px',
                    fontSize: '13px',
                    fontWeight: '800',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'linear-gradient(135deg, #34C759 0%, #28A745 100%)',
                    color: '#FFFFFF'
                  }}
                  title="Enregistre et transforme immédiatement en Bon de Commande officiel"
                >
                  <ArrowRight size={16} /> Enregistrer & Convertir en Commande
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── MODAL: CONFIRMATION DE CONVERSION EN COMMANDE ── */}
      {convertingDevis && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          zIndex: 10000
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '540px', padding: '24px', borderColor: 'rgba(52, 199, 89, 0.4)' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ background: 'rgba(52, 199, 89, 0.15)', color: '#34C759', padding: '12px', borderRadius: '12px' }}>
                <CheckCircle2 size={28} />
              </div>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#FFFFFF', margin: 0 }}>
                  Convertir en Bon de Commande
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                  Transformation automatique du Devis N° {convertingDevis.devisNumber}
                </p>
              </div>
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Client :</span>
                <strong style={{ color: '#FFFFFF' }}>{convertingDevis.clientName}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Commercial :</span>
                <span style={{ color: '#E2E8F0' }}>{convertingDevis.commercialName || 'Direction Bardahl'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Nombre d'articles :</span>
                <span style={{ color: '#E2E8F0' }}>{(convertingDevis.items || []).length} article(s)</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Montant Total TTC :</span>
                <strong style={{ color: 'var(--bardahl-yellow)', fontSize: '15px' }}>
                  {(parseFloat(convertingDevis.totalTtc) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH
                </strong>
              </div>
            </div>

            <div style={{ background: 'rgba(0, 122, 255, 0.08)', border: '1px solid rgba(0, 122, 255, 0.25)', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#A0AEC0', marginBottom: '20px' }}>
              ℹ️ Cette action créera immédiatement un <strong>Bon de Commande officiel (BC-MM/YY-...)</strong>, déduira le stock nécessaire des articles et marquera le devis comme <strong>« Converti »</strong>.
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setConvertingDevis(null)}
                className="btn-secondary"
                style={{ padding: '10px 18px', fontSize: '13px' }}
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmConversion}
                className="btn-bardahl"
                style={{
                  padding: '10px 22px',
                  fontSize: '13px',
                  fontWeight: '800',
                  background: 'linear-gradient(135deg, #34C759 0%, #28A745 100%)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <ArrowRight size={16} /> Confirmer la conversion
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── MODAL: SUCCÈS DE CONVERSION AVEC LIEN DIRECT ── */}
      {conversionSuccessInfo && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          zIndex: 10001
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '480px', padding: '24px', textAlign: 'center', borderColor: '#34C759' }}>
            
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(52, 199, 89, 0.15)', color: '#34C759', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CheckCircle2 size={32} />
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#FFFFFF', marginBottom: '8px' }}>
              Conversion Réussie avec Succès !
            </h3>
            
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
              Le devis <strong>{conversionSuccessInfo.devisNumber}</strong> a été transformé avec succès en Bon de Commande officiel <strong>{conversionSuccessInfo.orderNumber}</strong>.
            </p>

            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '24px', textAlign: 'left', fontSize: '12px' }}>
              <div>Client : <strong>{conversionSuccessInfo.clientName}</strong></div>
              <div>Montant : <strong style={{ color: 'var(--bardahl-yellow)' }}>{(conversionSuccessInfo.totalTtc || 0).toFixed(2)} DH TTC</strong></div>
              <div>Statut : <span style={{ color: '#007AFF', fontWeight: '700' }}>Validé / Enregistré</span></div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
              <button
                onClick={() => setConversionSuccessInfo(null)}
                className="btn-secondary"
                style={{ padding: '10px 18px', fontSize: '13px' }}
              >
                Fermer
              </button>
              
              <button
                onClick={() => {
                  setConversionSuccessInfo(null)
                  if (setActiveTab) setActiveTab('orders')
                }}
                className="btn-bardahl"
                style={{ padding: '10px 20px', fontSize: '13px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <span>Accéder au Bon de Commande</span> <ArrowRight size={16} />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── MODAL: DÉTAILS COMPLETS DU DEVIS ── */}
      {selectedDevisDetails && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          zIndex: 9999
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '840px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden' }}>
            
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255, 208, 0, 0.05)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: '900', color: 'var(--bardahl-yellow)', margin: 0 }}>
                    {selectedDevisDetails.devisNumber}
                  </h3>
                  {renderStatusBadge(selectedDevisDetails.status)}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Émis le {selectedDevisDetails.date}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => generateDevisPdf(selectedDevisDetails)}
                  className="btn-secondary"
                  style={{ padding: '8px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <FileText size={14} style={{ color: 'var(--bardahl-yellow)' }} /> Télécharger PDF
                </button>

                <button
                  onClick={() => setSelectedDevisDetails(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
              
              {/* Official Bardahl Company Header Card */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(20,23,31,0.95) 0%, rgba(28,32,42,0.95) 100%)',
                border: '1px solid rgba(255, 208, 0, 0.35)',
                borderRadius: '12px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <img
                    src="/bardahl_logo.png"
                    alt="Bardahl"
                    style={{ height: '44px', width: 'auto', filter: 'drop-shadow(0 2px 8px rgba(255,208,0,0.3))' }}
                  />
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: '900', color: '#FFFFFF', margin: 0, letterSpacing: '0.5px' }}>
                      {BARDAHL_COMPANY_INFO.fullName}
                    </h4>
                    <div style={{ fontSize: '11px', color: 'var(--bardahl-yellow)', fontWeight: '700', marginTop: '2px' }}>
                      {BARDAHL_COMPANY_INFO.capital}
                    </div>
                    <div style={{ fontSize: '10.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      {BARDAHL_COMPANY_INFO.address}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right', fontSize: '10.5px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  <div><strong style={{ color: '#FFFFFF' }}>ICE :</strong> {BARDAHL_COMPANY_INFO.ice} | <strong style={{ color: '#FFFFFF' }}>RC :</strong> {BARDAHL_COMPANY_INFO.rc}</div>
                  <div><strong style={{ color: '#FFFFFF' }}>T.P. :</strong> {BARDAHL_COMPANY_INFO.tp} | <strong style={{ color: '#FFFFFF' }}>C.N.S.S. :</strong> {BARDAHL_COMPANY_INFO.cnss} | <strong style={{ color: '#FFFFFF' }}>I.F. :</strong> {BARDAHL_COMPANY_INFO.if}</div>
                  <div><strong style={{ color: '#FFFFFF' }}>Tél :</strong> {BARDAHL_COMPANY_INFO.phones}</div>
                  <div><strong style={{ color: '#FFFFFF' }}>Email :</strong> {BARDAHL_COMPANY_INFO.email} | <strong style={{ color: 'var(--bardahl-yellow)' }}>{BARDAHL_COMPANY_INFO.website}</strong></div>
                </div>
              </div>

              {/* Client & Commercial info cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <h5 style={{ fontSize: '12px', fontWeight: '800', color: 'var(--bardahl-yellow)', marginBottom: '8px', textTransform: 'uppercase' }}>Client</h5>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#FFFFFF' }}>{selectedDevisDetails.clientName}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {selectedDevisDetails.clientAddress && <div>{selectedDevisDetails.clientAddress}</div>}
                    <div>{selectedDevisDetails.clientCity || 'Maroc'} {selectedDevisDetails.clientIce ? `• ICE: ${selectedDevisDetails.clientIce}` : ''}</div>
                    {selectedDevisDetails.clientPhone && <div>Tél: {selectedDevisDetails.clientPhone}</div>}
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <h5 style={{ fontSize: '12px', fontWeight: '800', color: 'var(--bardahl-yellow)', marginBottom: '8px', textTransform: 'uppercase' }}>Modalités Commerciales</h5>
                  <div style={{ fontSize: '12px', color: '#FFFFFF' }}>Commercial : <strong>{selectedDevisDetails.commercialName || 'Direction Bardahl'}</strong></div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    <div>Paiement : <strong>{selectedDevisDetails.paymentMethod || 'Chèque'}</strong></div>
                    <div>Expédition : <strong>{selectedDevisDetails.modeExpedition || 'Transport Bardahl'}</strong></div>
                    {selectedDevisDetails.remarque && <div style={{ marginTop: '4px', fontStyle: 'italic' }}>Note : « {selectedDevisDetails.remarque} »</div>}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h5 style={{ fontSize: '13px', fontWeight: '800', color: '#FFFFFF', marginBottom: '10px' }}>
                  Articles ({ (selectedDevisDetails.items || []).length })
                </h5>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                        <th style={{ padding: '8px' }}>Réf.</th>
                        <th style={{ padding: '8px' }}>Désignation Produit</th>
                        <th style={{ padding: '8px', textAlign: 'center' }}>Quantité</th>
                        <th style={{ padding: '8px', textAlign: 'center' }}>Gratuité</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>P.U TTC</th>
                        <th style={{ padding: '8px', textAlign: 'center' }}>Remise</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Total TTC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedDevisDetails.items || []).map((it, idx) => {
                        const qty = parseInt(it.qty !== undefined ? it.qty : (it.quantity || 0), 10)
                        const gratuit = parseInt(it.qtyGratuit !== undefined ? it.qtyGratuit : (it.freeQuantity || 0), 10)
                        const tag = String(it.promoTag || '')
                        const isPureGift = (qty === 0 || parseFloat(it.priceTtc || 0) === 0 || tag.includes('Offert') || tag.includes('Cadeau')) && gratuit > 0
                        const pu = isPureGift ? 0 : (parseFloat(it.priceTtc || it.unitPriceTtc || 0) || 0)
                        const rem = isPureGift ? 0 : (parseFloat(it.remise || it.remisePercent || it.discountPercentage || 0) || 0)
                        const lineBrut = (isPureGift ? 0 : qty) * pu
                        const lineNet = lineBrut * (1 - rem / 100)
                        return (
                          <tr key={idx} style={{
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            background: isPureGift ? 'rgba(52, 199, 89, 0.08)' : 'transparent'
                          }}>
                            <td style={{ padding: '8px', fontWeight: '700', color: isPureGift ? '#34C759' : 'var(--bardahl-yellow)' }}>{it.reference || it.productReference || it.code}</td>
                            <td style={{ padding: '8px', color: '#FFFFFF' }}>
                              {isPureGift ? `🎁 ${it.productName}` : it.productName}
                              {isPureGift && tag && (
                                <div style={{ fontSize: '10px', color: '#34C759', fontWeight: '700' }}>{tag}</div>
                              )}
                            </td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>
                              <strong>{isPureGift ? 0 : qty}</strong> un. {!isPureGift && it.cartons > 0 && <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>({it.cartons} ct)</span>}
                            </td>
                            <td style={{ padding: '8px', textAlign: 'center', color: gratuit > 0 ? '#34C759' : 'var(--text-secondary)', fontWeight: gratuit > 0 ? '800' : 'normal' }}>
                              {gratuit > 0 ? `+${gratuit} Offert` : '-'}
                            </td>
                            <td style={{ padding: '8px', textAlign: 'right', color: isPureGift ? '#34C759' : 'inherit' }}>{pu.toFixed(2)} DH</td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>{rem > 0 ? `${rem}%` : '-'}</td>
                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: '800', color: isPureGift ? '#34C759' : 'var(--bardahl-yellow)' }}>
                              {lineNet.toFixed(2)} DH
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Totals */}
              <div style={{ marginLeft: 'auto', width: '280px', background: '#12151C', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,208,0,0.3)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <span>Total H.T :</span>
                  <span>{(parseFloat(selectedDevisDetails.totalHt) || 0).toFixed(2)} DH</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <span>TVA (20%) :</span>
                  <span>{(parseFloat(selectedDevisDetails.totalTva) || 0).toFixed(2)} DH</span>
                </div>
                <div style={{ borderTop: '1px solid rgba(255,208,0,0.3)', paddingTop: '6px', marginTop: '2px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ color: '#FFFFFF' }}>TOTAL TTC :</strong>
                  <strong style={{ fontSize: '18px', color: 'var(--bardahl-yellow)' }}>
                    {(parseFloat(selectedDevisDetails.totalTtc) || 0).toFixed(2)} DH
                  </strong>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)', background: '#141820', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Changer le statut :</span>
                {['EN_ATTENTE', 'VALIDE', 'REFUSE'].map(st => (
                  <button
                    key={st}
                    onClick={() => {
                      handleChangeStatus(selectedDevisDetails, st)
                      setSelectedDevisDetails(prev => ({ ...prev, status: st }))
                    }}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: selectedDevisDetails.status === st ? 'var(--bardahl-yellow)' : 'rgba(255,255,255,0.05)',
                      color: selectedDevisDetails.status === st ? '#000000' : '#E2E8F0',
                      cursor: 'pointer',
                      fontWeight: '700'
                    }}
                  >
                    {st === 'EN_ATTENTE' ? 'En attente' : st === 'VALIDE' ? 'Validé' : 'Refusé'}
                  </button>
                ))}
              </div>

              {selectedDevisDetails.status !== 'CONVERTI' && (
                <button
                  onClick={() => {
                    const dev = selectedDevisDetails
                    setSelectedDevisDetails(null)
                    handleInitiateConversion(dev)
                  }}
                  className="btn-bardahl"
                  style={{
                    padding: '8px 18px',
                    fontSize: '13px',
                    fontWeight: '800',
                    background: 'linear-gradient(135deg, #34C759 0%, #28A745 100%)',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <ArrowRight size={16} /> Convertir en Bon de Commande
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
