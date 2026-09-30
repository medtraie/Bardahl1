import React, { useState, useEffect, useMemo } from 'react'
import { 
  Gift, Tag, Plus, Edit3, Trash2, CheckCircle2, XCircle, 
  Layers, ShoppingBag, DollarSign, Calendar, Sparkles, AlertCircle, Percent,
  Search, Check, X, LayoutGrid, List, BarChart2, TrendingUp, Users, Package, Award, ArrowUpRight, FileText,
  Zap, AlertTriangle
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { DEFAULT_BARDAHL_FAMILIES, getFamilyInfo } from '../data/familiesData'

export const BARDAHL_FAMILIES = DEFAULT_BARDAHL_FAMILIES
export { getFamilyInfo }

export default function Promotions({ openNewPromoTrigger } = {}) {
  const { 
    orders = [], promotions, addPromotion, updatePromotion, deletePromotion, togglePromotion, 
    products, currentUser, productFamilies = [] 
  } = useApp()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [showModal, setShowModal] = useState(false)
  const [editingPromo, setEditingPromo] = useState(null)
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'table'
  const [selectedAnalyticsPromo, setSelectedAnalyticsPromo] = useState(null)

  const isAdmin = currentUser?.role === 'ADMIN'

  // Dynamic active product families
  const activeFamilies = useMemo(() => {
    return (productFamilies && productFamilies.length > 0)
      ? productFamilies.filter(f => f.isActive !== false)
      : DEFAULT_BARDAHL_FAMILIES
  }, [productFamilies])

  // Form State
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formType, setFormType] = useState('TYPE_1')
  const [formTargetType, setFormTargetType] = useState('PRODUCT')
  const [formTargetFamily, setFormTargetFamily] = useState(DEFAULT_BARDAHL_FAMILIES[0].label)
  
  // Évolution n°2 : Multi-références produit
  const [formTargetProductRefs, setFormTargetProductRefs] = useState([])
  const [formTargetProductRef, setFormTargetProductRef] = useState('')
  const [targetSearchQuery, setTargetSearchQuery] = useState('')
  const [showTargetDropdown, setShowTargetDropdown] = useState(false)

  const [formThreshold, setFormThreshold] = useState(10)
  const [formDiscountPercent, setFormDiscountPercent] = useState(5)
  const [formFreeItemType, setFormFreeItemType] = useState('SAME_PRODUCT')
  const [formFreeProductRef, setFormFreeProductRef] = useState('')
  const [freeProductSearchQuery, setFreeProductSearchQuery] = useState('')
  const [showFreeDropdown, setShowFreeDropdown] = useState(false)

  const [formFreeQuantity, setFormFreeQuantity] = useState(1)
  const [formVoucherAmount, setFormVoucherAmount] = useState(0)
  const [formIsActive, setFormIsActive] = useState(true)
  const [formStartDate, setFormStartDate] = useState('2026-01-01')
  const [formEndDate, setFormEndDate] = useState('2026-12-31')
  
  // Évolution n°3, 4 & 5 : Paliers dynamiques (Tranches progressives)
  const [hasTiers, setHasTiers] = useState(true)
  const [tiers, setTiers] = useState([
    { id: 't1', min: 1, max: 9, discountPercent: 0, freeQuantity: 0, voucherAmount: 0 },
    { id: 't2', min: 10, max: 29, discountPercent: 10, freeQuantity: 1, voucherAmount: 0 },
    { id: 't3', min: 30, max: '', discountPercent: 15, freeQuantity: 2, voucherAmount: 0 }
  ])

  // Validation en temps réel des paliers dynamiques (Règles métier du rapport)
  const tierValidation = useMemo(() => {
    if (!hasTiers) return { isValid: true, error: null }
    if (!tiers || tiers.length === 0) {
      return { isValid: false, error: "Veuillez configurer au moins un palier pour la promotion." }
    }

    for (let i = 0; i < tiers.length; i++) {
      const t = tiers[i]
      const minVal = parseFloat(t.min)
      if (isNaN(minVal) || minVal < 0) {
        return { isValid: false, error: `Palier ${i + 1} : la valeur de début doit être un nombre positif ou nul.` }
      }
      
      const maxVal = (t.max !== null && t.max !== '' && t.max !== undefined && !isNaN(t.max)) ? parseFloat(t.max) : null
      if (maxVal !== null && maxVal < minVal) {
        return { isValid: false, error: `Palier ${i + 1} : la valeur de fin (${maxVal}) doit être supérieure ou égale au début (${minVal}).` }
      }

      const disc = parseFloat(t.discountPercent || 0)
      if (isNaN(disc) || disc < 0 || disc > 100) {
        return { isValid: false, error: `Palier ${i + 1} : le taux de remise doit être compris entre 0% et 100%.` }
      }

      // Contrôle anti-chevauchement avec la tranche précédente
      if (i > 0) {
        const prev = tiers[i - 1]
        const prevMax = (prev.max !== null && prev.max !== '' && prev.max !== undefined && !isNaN(prev.max)) ? parseFloat(prev.max) : null
        
        if (prevMax === null) {
          return { isValid: false, error: `Le palier ${i} est ouvert (« et plus »). Impossible d'ajouter un palier après une tranche ouverte.` }
        }
        if (minVal <= prevMax) {
          return { isValid: false, error: `Chevauchement détecté : le palier ${i + 1} (début: ${minVal}) doit commencer après la fin du palier ${i} (fin: ${prevMax}).` }
        }
      }
    }

    return { isValid: true, error: null }
  }, [hasTiers, tiers])

  // Extract unique categories from products mapped to clean families
  const families = activeFamilies.map(f => f.label)

  // Selected product lookups
  const selectedTargetProduct = products.find(p => p.reference === formTargetProductRef) || products[0]
  const selectedFreeProduct = products.find(p => p.reference === formFreeProductRef) || products[0]

  // Filtered product lists for searchable autocomplete pickers
  const filteredTargetProducts = products.filter(p => {
    if (!targetSearchQuery.trim()) return true
    const q = targetSearchQuery.toLowerCase()
    return (p.name || '').toLowerCase().includes(q) ||
           (p.reference || '').toLowerCase().includes(q) ||
           (p.category || '').toLowerCase().includes(q)
  })

  const filteredFreeProducts = products.filter(p => {
    if (!freeProductSearchQuery.trim()) return true
    const q = freeProductSearchQuery.toLowerCase()
    return (p.name || '').toLowerCase().includes(q) ||
           (p.reference || '').toLowerCase().includes(q) ||
           (p.category || '').toLowerCase().includes(q)
  })

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.target-product-picker-container')) {
        setShowTargetDropdown(false)
      }
      if (!e.target.closest('.free-product-picker-container')) {
        setShowFreeDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Integrated Performance Analytics per Promotion
  const promoAnalytics = useMemo(() => {
    const stats = {}
    promotions.forEach(p => {
      stats[p.id] = {
        invoicesCount: 0,
        cartonsCount: 0,
        freeCartonsCount: 0,
        revenueTtc: 0,
        discountDh: 0,
        voucherDh: 0,
        clientsMap: new Map(),
        matchedOrders: []
      }
    })

    if (!orders || orders.length === 0) return stats

    orders.forEach(order => {
      const applied = order.appliedPromotions || []
      const note = (order.promoNote || '').toLowerCase()

      promotions.forEach(promo => {
        const promoStat = stats[promo.id]
        if (!promoStat) return

        const isApplied = applied.some(ap => ap.promoId === promo.id || (ap.name && ap.name.toLowerCase() === promo.name.toLowerCase())) ||
                          (note && note.includes(promo.name.toLowerCase())) ||
                          (order.items && order.items.some(it => it.promoTag && it.promoTag.toLowerCase().includes(promo.name.toLowerCase())))

        if (isApplied) {
          promoStat.invoicesCount += 1
          promoStat.matchedOrders.push(order)

          const clientKey = order.clientId || order.clientName || 'Client'
          if (!promoStat.clientsMap.has(clientKey)) {
            promoStat.clientsMap.set(clientKey, { name: order.clientName || 'Client', cartons: 0, ordersCount: 0, totalAmount: 0 })
          }
          const clientData = promoStat.clientsMap.get(clientKey)
          clientData.ordersCount += 1

          let orderCartons = 0
          let orderFree = 0
          let orderRev = 0

          if (order.items && order.items.length > 0) {
            order.items.forEach(it => {
              const itRef = it.reference || it.productReference
              const itId = it.productId
              const isTarget = promo.targetType === 'PRODUCT'
                ? (itId === promo.targetProductId || itRef === promo.targetProductRef)
                : (promo.targetFamily && (it.category || '').toUpperCase().includes(promo.targetFamily.toUpperCase()))

              const isTagged = it.promoTag && it.promoTag.toLowerCase().includes(promo.name.toLowerCase())

              if (isTarget || isTagged) {
                const q = parseInt(it.qty || it.quantity || 0, 10)
                const f = parseInt(it.qtyGratuit || it.freeQuantity || 0, 10)
                const p = parseFloat(it.priceTtc || it.unitPriceTtc || 0)
                orderCartons += q
                orderFree += f
                orderRev += (q * p)
              }
            })
          }

          if (orderCartons === 0 && isApplied) {
            orderCartons = promo.threshold || 10
          }

          promoStat.cartonsCount += orderCartons
          promoStat.freeCartonsCount += orderFree
          promoStat.revenueTtc += orderRev
          clientData.cartons += orderCartons
          clientData.totalAmount += orderRev

          if (promo.discountPercent > 0 && orderRev > 0) {
            promoStat.discountDh += (orderRev * (promo.discountPercent / 100))
          } else if (order.totalDiscount > 0) {
            promoStat.discountDh += (order.totalDiscount / Math.max(1, applied.length || 1))
          }

          if (promo.type === 'TYPE_3' && promo.voucherAmount > 0) {
            promoStat.voucherDh += promo.voucherAmount
          }
        }
      })
    })

    return stats
  }, [orders, promotions])

  // Global KPIs across all promotions
  const globalStats = useMemo(() => {
    let totalInvoices = 0
    let totalCartons = 0
    let totalFree = 0
    let totalDiscount = 0
    let totalRevenue = 0

    Object.values(promoAnalytics).forEach(st => {
      totalInvoices += st.invoicesCount
      totalCartons += st.cartonsCount
      totalFree += st.freeCartonsCount
      totalDiscount += (st.discountDh + st.voucherDh)
      totalRevenue += st.revenueTtc
    })

    return { totalInvoices, totalCartons, totalFree, totalDiscount, totalRevenue }
  }, [promoAnalytics])

  const filteredPromos = promotions.filter(p => {
    // Les comptes commerciaux ne voient que les promotions actives
    if (!isAdmin && p.isActive === false) return false

    const matchesSearch = (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
                          (p.targetFamily || '').toLowerCase().includes(search.toLowerCase()) ||
                          (p.description || '').toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter === 'ALL' || p.type === typeFilter
    const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? p.isActive !== false : p.isActive === false)
    return matchesSearch && matchesType && matchesStatus
  })

  const handleAddTargetProduct = (prod) => {
    if (!prod || !prod.reference) return
    if (!formTargetProductRefs.includes(prod.reference)) {
      setFormTargetProductRefs(prev => [...prev, prod.reference])
    }
    setTargetSearchQuery('')
    setShowTargetDropdown(false)
  }

  const handleRemoveTargetProduct = (refToRemove) => {
    setFormTargetProductRefs(prev => prev.filter(r => r !== refToRemove))
  }

  const handleClearAllTargetProducts = () => {
    setFormTargetProductRefs([])
  }

  const handleAddTier = () => {
    setTiers(prev => {
      const last = prev[prev.length - 1]
      let nextMin = 1
      if (last) {
        if (last.max !== null && last.max !== '' && !isNaN(last.max)) {
          nextMin = parseFloat(last.max) + (formType === 'TYPE_4' ? 1 : 1)
        } else {
          nextMin = parseFloat(last.min || 0) + 10
        }
      }
      return [
        ...prev,
        {
          id: `t_${Date.now()}`,
          min: nextMin,
          max: '',
          discountPercent: Math.min(100, (last ? parseFloat(last.discountPercent || 0) : 0) + 5),
          freeQuantity: (last ? parseInt(last.freeQuantity || 0, 10) : 0) + 1,
          voucherAmount: (last ? parseFloat(last.voucherAmount || 0) : 0)
        }
      ]
    })
  }

  const handleRemoveTier = (idx) => {
    if (tiers.length <= 1) {
      alert("Une promotion par paliers doit contenir au moins une tranche.")
      return
    }
    setTiers(prev => prev.filter((_, i) => i !== idx))
  }

  const handleUpdateTier = (idx, field, value) => {
    setTiers(prev => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t))
  }

  const handleOpenAdd = () => {
    if (!isAdmin) return
    setEditingPromo(null)
    setFormName('')
    setFormDesc('')
    setFormType('TYPE_1')
    setFormTargetType('PRODUCT')
    const initialProduct = products[0]
    setFormTargetProductRefs(initialProduct ? [initialProduct.reference] : ['34131'])
    setFormTargetProductRef(initialProduct?.reference || '34131')
    const detectedFam = initialProduct ? getFamilyInfo(initialProduct.category, activeFamilies).label : (activeFamilies[0]?.label || 'Additifs & Traitements')
    setFormTargetFamily(detectedFam)
    setTargetSearchQuery('')
    setShowTargetDropdown(false)

    setFormThreshold(10)
    setFormDiscountPercent(5)
    setFormFreeItemType('SAME_PRODUCT')
    setFormFreeProductRef(initialProduct?.reference || '34131')
    setFreeProductSearchQuery('')
    setShowFreeDropdown(false)

    setFormFreeQuantity(1)
    setFormVoucherAmount(0)
    setFormIsActive(true)
    setFormStartDate('2026-01-01')
    setFormEndDate('2026-12-31')
    setHasTiers(true)
    setTiers([
      { id: 't1', min: 1, max: 9, discountPercent: 0, freeQuantity: 0, voucherAmount: 0 },
      { id: 't2', min: 10, max: 29, discountPercent: 10, freeQuantity: 1, voucherAmount: 0 },
      { id: 't3', min: 30, max: '', discountPercent: 15, freeQuantity: 2, voucherAmount: 0 }
    ])
    setShowModal(true)
  }

  useEffect(() => {
    if (isAdmin && openNewPromoTrigger && openNewPromoTrigger > 0) {
      handleOpenAdd()
    }
  }, [openNewPromoTrigger, isAdmin])

  const handleOpenEdit = (promo) => {
    setEditingPromo(promo)
    setFormName(promo.name || '')
    setFormDesc(promo.description || '')
    setFormType(promo.type || 'TYPE_1')
    setFormTargetType(promo.targetType || (promo.targetProductRef || promo.targetProductRefs ? 'PRODUCT' : 'FAMILY'))
    
    // Multi-références
    const refs = (promo.targetProductRefs && Array.isArray(promo.targetProductRefs) && promo.targetProductRefs.length > 0)
      ? promo.targetProductRefs
      : (promo.targetProductRef ? [promo.targetProductRef] : (products[0] ? [products[0].reference] : []))
    setFormTargetProductRefs(refs)
    setFormTargetProductRef(refs[0] || '')

    const firstProd = products.find(p => p.reference === refs[0])
    const detectedFam = firstProd ? getFamilyInfo(firstProd.category, activeFamilies).label : (promo.targetFamily || activeFamilies[0]?.label || 'Additifs & Traitements')
    setFormTargetFamily(promo.targetFamily || detectedFam)
    setTargetSearchQuery('')
    setShowTargetDropdown(false)

    setFormThreshold(promo.threshold || 10)
    setFormDiscountPercent(promo.discountPercent || 0)
    setFormFreeItemType(promo.freeItemType || 'SAME_PRODUCT')
    setFormFreeProductRef(promo.freeProductRef || products[0]?.reference || '')
    setFreeProductSearchQuery('')
    setShowFreeDropdown(false)

    setFormFreeQuantity(promo.freeQuantity || 0)
    setFormVoucherAmount(promo.voucherAmount || 0)
    setFormIsActive(promo.isActive !== false)
    setFormStartDate(promo.startDate || '2026-01-01')
    setFormEndDate(promo.endDate || '2026-12-31')

    if (promo.tiers && Array.isArray(promo.tiers) && promo.tiers.length > 0) {
      setHasTiers(true)
      setTiers(promo.tiers.map((t, idx) => ({
        id: t.id || `t_${idx + 1}`,
        min: t.min !== undefined && t.min !== null ? t.min : (t.threshold || 0),
        max: (t.max !== null && t.max !== undefined && t.max !== '') ? t.max : '',
        discountPercent: t.discountPercent !== undefined ? t.discountPercent : 0,
        freeQuantity: t.freeQuantity !== undefined ? t.freeQuantity : 0,
        voucherAmount: t.voucherAmount !== undefined ? t.voucherAmount : 0
      })))
    } else {
      setHasTiers(false)
      setTiers([
        { id: 't1', min: 1, max: 9, discountPercent: 0, freeQuantity: 0, voucherAmount: 0 },
        { id: 't2', min: 10, max: 29, discountPercent: promo.discountPercent || 10, freeQuantity: promo.freeQuantity || 1, voucherAmount: promo.voucherAmount || 0 },
        { id: 't3', min: 30, max: '', discountPercent: (promo.discountPercent || 10) + 5, freeQuantity: (promo.freeQuantity || 1) + 1, voucherAmount: promo.voucherAmount || 0 }
      ])
    }
    setShowModal(true)
  }

  const handleSave = (e) => {
    e.preventDefault()
    if (!formName.trim()) {
      alert("Veuillez indiquer un nom pour la promotion.")
      return
    }

    if (formTargetType === 'PRODUCT' && formTargetProductRefs.length === 0) {
      alert("Veuillez sélectionner au moins une référence produit pour la promotion.")
      return
    }

    if (hasTiers && !tierValidation.isValid) {
      alert(tierValidation.error || "Les tranches de paliers configurées sont invalides.")
      return
    }

    const freeProductObj = products.find(p => p.reference === formFreeProductRef)
    const firstTargetProductObj = products.find(p => p.reference === formTargetProductRefs[0])

    // Cleaned tiers data
    const cleanTiers = hasTiers ? tiers.map((t, idx) => ({
      id: t.id || `tier_${idx + 1}`,
      min: parseFloat(t.min) || 0,
      max: (t.max !== null && t.max !== '' && t.max !== undefined && !isNaN(t.max)) ? parseFloat(t.max) : null,
      discountPercent: parseFloat(t.discountPercent) || 0,
      freeQuantity: parseInt(t.freeQuantity, 10) || 0,
      voucherAmount: parseFloat(t.voucherAmount) || 0
    })) : undefined

    // Determine fallback threshold from first non-zero advantage tier or formThreshold
    let fallbackThreshold = parseFloat(formThreshold) || 1
    let fallbackDiscount = parseFloat(formDiscountPercent) || 0
    let fallbackFreeQty = parseInt(formFreeQuantity, 10) || 0
    let fallbackVoucher = parseFloat(formVoucherAmount) || 0

    if (cleanTiers && cleanTiers.length > 0) {
      const activeTier = cleanTiers.find(t => t.discountPercent > 0 || t.freeQuantity > 0 || t.voucherAmount > 0) || cleanTiers[0]
      fallbackThreshold = activeTier.min
      fallbackDiscount = activeTier.discountPercent
      fallbackFreeQty = activeTier.freeQuantity
      fallbackVoucher = activeTier.voucherAmount
    }

    const payload = {
      name: formName.trim(),
      description: formDesc.trim(),
      type: formType,
      targetType: formTargetType,
      targetFamily: formTargetType === 'FAMILY' ? formTargetFamily : undefined,
      targetProductRefs: formTargetType === 'PRODUCT' ? formTargetProductRefs : undefined,
      targetProductRef: formTargetType === 'PRODUCT' ? formTargetProductRefs[0] : undefined,
      targetProductName: formTargetType === 'PRODUCT' 
        ? (formTargetProductRefs.length > 1 ? `${formTargetProductRefs.length} références Bardahl` : (firstTargetProductObj?.name || formTargetProductRefs[0]))
        : undefined,
      targetProductId: formTargetType === 'PRODUCT' ? (firstTargetProductObj?.id || formTargetProductRefs[0]) : undefined,
      threshold: fallbackThreshold,
      discountPercent: fallbackDiscount,
      hasTiers: hasTiers,
      tiers: cleanTiers,
      freeItemType: formType === 'TYPE_2' ? formFreeItemType : undefined,
      freeProductRef: (formType === 'TYPE_2' && formFreeItemType === 'DIFFERENT_PRODUCT') ? (formFreeProductRef || products[0]?.reference) : undefined,
      freeProductName: (formType === 'TYPE_2' && formFreeItemType === 'DIFFERENT_PRODUCT') ? (freeProductObj?.name || formFreeProductRef || products[0]?.name) : undefined,
      freeProductId: (formType === 'TYPE_2' && formFreeItemType === 'DIFFERENT_PRODUCT') ? (freeProductObj?.id || formFreeProductRef || products[0]?.id) : undefined,
      freeQuantity: formType === 'TYPE_2' ? fallbackFreeQty : 0,
      voucherAmount: formType === 'TYPE_3' ? fallbackVoucher : 0,
      isActive: formIsActive,
      startDate: formStartDate,
      endDate: formEndDate
    }

    if (editingPromo) {
      updatePromotion({ ...editingPromo, ...payload })
    } else {
      addPromotion(payload)
    }

    setShowModal(false)
    setEditingPromo(null)
  }

  const handleDelete = (promo) => {
    if (window.confirm(`Supprimer la promotion « ${promo.name} » ?`)) {
      deletePromotion(promo.id)
    }
  }

  const getTypeBadge = (type) => {
    switch (type) {
      case 'TYPE_1':
        return <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', background: 'rgba(0, 122, 255, 0.15)', color: '#007AFF', border: '1px solid rgba(0, 122, 255, 0.3)' }}>Type 1: Cartons → Remise %</span>
      case 'TYPE_2':
        return <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', background: 'rgba(52, 199, 89, 0.15)', color: '#34C759', border: '1px solid rgba(52, 199, 89, 0.3)' }}>Type 2: Cartons → Remise + Gratuit</span>
      case 'TYPE_3':
        return <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', background: 'rgba(255, 149, 0, 0.15)', color: '#FF9500', border: '1px solid rgba(255, 149, 0, 0.3)' }}>Type 3: Cartons → Remise + Bon d'Achat</span>
      case 'TYPE_4':
        return <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '800', background: 'rgba(175, 82, 222, 0.15)', color: '#AF52DE', border: '1px solid rgba(175, 82, 222, 0.3)' }}>Type 4: Montant Famille → Remise %</span>
      default:
        return null
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Banner & Action */}
      <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Gift style={{ color: 'var(--bardahl-yellow)', width: '26px', height: '26px' }} />
            Gestion des Promotions & Offres Commerciales
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
            Définition et calcul automatique des remises, cartons gratuits (Options A & B, Paliers) et bons d'achat
          </p>
        </div>
      </div>

      {/* Summary KPI Cards with Real Sales Impact */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="glass-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '800', textTransform: 'uppercase' }}>TOTAL OFFRES</span>
            <Tag size={16} style={{ color: 'var(--bardahl-yellow)' }} />
          </div>
          <div style={{ fontSize: '26px', fontWeight: '900', color: '#FFFFFF', marginTop: '4px' }}>
            {isAdmin ? promotions.length : promotions.filter(p => p.isActive !== false).length}
          </div>
          <div style={{ fontSize: '11px', color: '#34C759', marginTop: '2px', fontWeight: '700' }}>
            {isAdmin 
              ? `● ${promotions.filter(p => p.isActive !== false).length} actives / ${promotions.filter(p => p.isActive === false).length} inactives`
              : `● ${promotions.filter(p => p.isActive !== false).length} offres actives disponibles`}
          </div>
        </div>

        <div className="glass-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: '#007AFF', fontWeight: '800', textTransform: 'uppercase' }}>BONS / FACTURES AVEC OFFRE</span>
            <FileText size={16} style={{ color: '#007AFF' }} />
          </div>
          <div style={{ fontSize: '26px', fontWeight: '900', color: '#007AFF', marginTop: '4px' }}>
            {globalStats.totalInvoices}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Commandes ayant activé des promotions
          </div>
        </div>

        <div className="glass-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: 'var(--bardahl-yellow)', fontWeight: '800', textTransform: 'uppercase' }}>CARTONS VENDUS SOUS PROMO</span>
            <Package size={16} style={{ color: 'var(--bardahl-yellow)' }} />
          </div>
          <div style={{ fontSize: '26px', fontWeight: '900', color: 'var(--bardahl-yellow)', marginTop: '4px' }}>
            {globalStats.totalCartons} <span style={{ fontSize: '14px', fontWeight: 'normal', color: 'var(--text-secondary)' }}>cartons</span>
          </div>
          <div style={{ fontSize: '11px', color: '#34C759', marginTop: '2px', fontWeight: '700' }}>
            🎁 Dont +{globalStats.totalFree} cartons gratuits offerts
          </div>
        </div>

        <div className="glass-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: '#FF9500', fontWeight: '800', textTransform: 'uppercase' }}>IMPACT REMISES & BONS (DH)</span>
            <DollarSign size={16} style={{ color: '#FF9500' }} />
          </div>
          <div style={{ fontSize: '22px', fontWeight: '900', color: '#FF9500', marginTop: '4px' }}>
            -{globalStats.totalDiscount.toFixed(2)} DH
          </div>
          <div style={{ fontSize: '11px', color: '#34C759', marginTop: '2px', fontWeight: '700' }}>
            CA Généré : {globalStats.totalRevenue.toFixed(2)} DH
          </div>
        </div>
      </div>

      {/* Filters Bar with Dual View Mode Toggle */}
      <div className="glass-card" style={{ padding: '14px 16px', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '280px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '220px' }}>
            <input
              type="text"
              className="input-field"
              placeholder="🔎 Rechercher par nom d'offre, famille ou produit..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input-field" style={{ width: '190px' }}>
            <option value="ALL">Tous les Types</option>
            <option value="TYPE_1">Type 1 : Cartons → Remise</option>
            <option value="TYPE_2">Type 2 : Cartons → Remise + Gratuit</option>
            <option value="TYPE_3">Type 3 : Cartons → Remise + Bon</option>
            <option value="TYPE_4">Type 4 : Montant Famille → Remise</option>
          </select>

          {isAdmin && (
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field" style={{ width: '130px' }}>
              <option value="ALL">Tous Statuts</option>
              <option value="ACTIVE">Actives</option>
              <option value="INACTIVE">Inactives</option>
            </select>
          )}
        </div>

        {/* View Mode Toggle: Grid Cards vs List Table */}
        <div style={{ display: 'flex', alignItems: 'center', background: '#0D0F12', borderRadius: '10px', padding: '3px', border: '1px solid var(--border-card)' }}>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '800',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: viewMode === 'grid' ? 'var(--bardahl-yellow)' : 'transparent',
              color: viewMode === 'grid' ? '#0D0F12' : 'var(--text-secondary)',
              transition: 'all 0.2s'
            }}
          >
            <LayoutGrid size={15} /> Grille
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '800',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: viewMode === 'table' ? 'var(--bardahl-yellow)' : 'transparent',
              color: viewMode === 'table' ? '#0D0F12' : 'var(--text-secondary)',
              transition: 'all 0.2s'
            }}
          >
            <List size={15} /> Liste
          </button>
        </div>
      </div>

      {/* Main Promotions Content: Grid or Table View */}
      {filteredPromos.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px' }}>
          <AlertCircle size={40} style={{ color: 'var(--text-secondary)', margin: '0 auto 12px' }} />
          <h4 style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: '700' }}>Aucune promotion trouvée</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
            {isAdmin ? 'Modifiez vos filtres ou créez une nouvelle offre commerciale.' : 'Aucune offre promotionnelle active pour cette sélection.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* 1. Grid Cards View */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
          {filteredPromos.map(promo => {
            const isActive = promo.isActive !== false
            const stat = promoAnalytics[promo.id] || { invoicesCount: 0, cartonsCount: 0, freeCartonsCount: 0, revenueTtc: 0, discountDh: 0 }
            return (
              <div 
                key={promo.id} 
                className="glass-card" 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'space-between',
                  borderLeft: `4px solid ${(isActive || !isAdmin) ? 'var(--bardahl-yellow)' : '#555'}`,
                  opacity: (isActive || !isAdmin) ? 1 : 0.65
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                    {getTypeBadge(promo.type)}
                    {isAdmin && (
                      <button
                        onClick={() => togglePromotion(promo.id)}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '20px',
                          fontSize: '10px',
                          fontWeight: '800',
                          cursor: 'pointer',
                          border: 'none',
                          background: isActive ? 'rgba(52, 199, 89, 0.2)' : 'rgba(255, 69, 58, 0.2)',
                          color: isActive ? '#34C759' : '#FF453A'
                        }}
                        title="Activer / Désactiver la promotion"
                      >
                        {isActive ? '● ACTIVE' : '○ INACTIVE'}
                      </button>
                    )}
                  </div>

                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#FFFFFF', marginBottom: '6px' }}>
                    {promo.name}
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: '1.4' }}>
                    {promo.description}
                  </p>

                  <div style={{ background: '#0D0F12', borderRadius: '10px', padding: '12px', border: '1px solid var(--border-card)', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Cible :</span>
                      {promo.targetType === 'FAMILY' ? (
                        <strong style={{ color: 'var(--bardahl-yellow)' }}>Famille {promo.targetFamily}</strong>
                      ) : (
                        <div style={{ textAlign: 'right' }}>
                          {promo.targetProductRefs && promo.targetProductRefs.length > 1 ? (
                            <span style={{ color: 'var(--bardahl-yellow)', fontWeight: 'bold' }}>
                              🏷️ {promo.targetProductRefs.length} réf. Bardahl ({promo.targetProductRefs.slice(0, 3).join(', ')}{promo.targetProductRefs.length > 3 ? '...' : ''})
                            </span>
                          ) : (
                            <strong style={{ color: 'var(--bardahl-yellow)' }}>
                              {promo.targetProductName || promo.targetProductRef || 'Produit Spécifique'}
                            </strong>
                          )}
                        </div>
                      )}
                    </div>

                    {promo.tiers && promo.tiers.length > 0 ? (
                      <div style={{ marginTop: '4px', paddingTop: '6px', borderTop: '1px dashed #2B313E' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '11px', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
                          ⚡ Paliers progressifs ({promo.tiers.length} tranches) :
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {promo.tiers.map((t, i) => {
                            const minVal = t.min !== undefined ? t.min : t.threshold
                            const maxVal = (t.max !== null && t.max !== undefined && t.max !== '') ? t.max : '∞'
                            const unit = promo.type === 'TYPE_4' ? 'DH' : 'cartons'
                            return (
                              <div key={i} style={{ fontSize: '11px', color: '#DDD', display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '3px 6px', borderRadius: '4px' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>
                                  Tranche {i + 1} ({minVal} à {maxVal} {unit}) :
                                </span>
                                <strong>
                                  <span style={{ color: '#007AFF' }}>{t.discountPercent}%</span>
                                  {t.freeQuantity > 0 && <span style={{ color: '#34C759', marginLeft: '6px' }}>+{t.freeQuantity} gratuit</span>}
                                  {t.voucherAmount > 0 && <span style={{ color: '#FF9500', marginLeft: '6px' }}>-{t.voucherAmount} DH</span>}
                                </strong>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Condition :</span>
                          <strong>
                            {promo.type === 'TYPE_4' ? `Dès ${promo.threshold.toFixed(2)} DH` : `Dès ${promo.threshold} cartons`}
                          </strong>
                        </div>

                        {promo.discountPercent > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Remise :</span>
                            <strong style={{ color: '#007AFF' }}>{promo.discountPercent}%</strong>
                          </div>
                        )}

                        {promo.type === 'TYPE_2' && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-secondary)' }}>Cadeau :</span>
                            <span style={{ color: '#34C759', fontWeight: 'bold' }}>
                              +{promo.freeQuantity} carton(s) {promo.freeItemType === 'SAME_PRODUCT' ? '(Même réf.)' : `(${promo.freeProductName || promo.freeProductRef})`}
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    {promo.type === 'TYPE_3' && promo.voucherAmount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Bon d'Achat :</span>
                        <strong style={{ color: '#FF9500' }}>-{promo.voucherAmount.toFixed(2)} DH (Immédiat)</strong>
                      </div>
                    )}
                  </div>

                  {/* Real-time Sales Analytics Pill */}
                  <div style={{
                    marginTop: '12px',
                    padding: '8px 12px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '11px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#FFFFFF' }}>
                      <FileText size={13} style={{ color: 'var(--bardahl-yellow)' }} />
                      <strong>{stat.invoicesCount}</strong> <span style={{ color: 'var(--text-secondary)' }}>factures</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#FFFFFF' }}>
                      <Package size={13} style={{ color: '#007AFF' }} />
                      <strong>{stat.cartonsCount}</strong> <span style={{ color: 'var(--text-secondary)' }}>cartons</span>
                    </div>
                    {stat.freeCartonsCount > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#34C759' }}>
                        <Gift size={13} />
                        <strong>+{stat.freeCartonsCount}</strong>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedAnalyticsPromo(promo)}
                      style={{
                        background: 'rgba(255, 208, 0, 0.15)',
                        color: 'var(--bardahl-yellow)',
                        border: '1px solid rgba(255, 208, 0, 0.3)',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        fontWeight: '800',
                        fontSize: '10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      title="Voir l'analyse des ventes et clients"
                    >
                      <BarChart2 size={12} /> Analyses
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border-card)' }}>
                  <button
                    onClick={() => setSelectedAnalyticsPromo(promo)}
                    className="btn-secondary"
                    style={{ padding: '6px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--bardahl-yellow)', borderColor: 'rgba(255, 208, 0, 0.4)' }}
                  >
                    <BarChart2 size={13} /> Stats Ventes
                  </button>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => handleOpenEdit(promo)}
                        className="btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '5px' }}
                      >
                        <Edit3 size={13} /> Modifier
                      </button>
                      <button
                        onClick={() => handleDelete(promo)}
                        style={{ padding: '6px 10px', fontSize: '11px', color: '#FF453A', background: 'rgba(255, 69, 58, 0.1)', border: '1px solid rgba(255, 69, 58, 0.3)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                      >
                        <Trash2 size={13} /> Supprimer
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* 2. Structured Table / List View */
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table">
              <thead>
                <tr>
                  {isAdmin && <th style={{ minWidth: '90px' }}>Statut</th>}
                  <th style={{ minWidth: '130px' }}>Type d'Offre</th>
                  <th>Promotion & Cible</th>
                  <th style={{ minWidth: '120px' }}>Condition Seuil</th>
                  <th style={{ minWidth: '150px' }}>Avantages Offerts</th>
                  <th style={{ minWidth: '160px' }}>Performance Ventes</th>
                  <th style={{ minWidth: '110px' }}>Validité</th>
                  <th style={{ minWidth: '140px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPromos.map(promo => {
                  const isActive = promo.isActive !== false
                  const stat = promoAnalytics[promo.id] || { invoicesCount: 0, cartonsCount: 0, freeCartonsCount: 0, revenueTtc: 0, discountDh: 0 }
                  return (
                    <tr key={promo.id}>
                      {isAdmin && (
                        <td>
                          <button
                            onClick={() => togglePromotion(promo.id)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '10px',
                              fontWeight: '800',
                              cursor: 'pointer',
                              border: 'none',
                              background: isActive ? 'rgba(52, 199, 89, 0.2)' : 'rgba(255, 69, 58, 0.2)',
                              color: isActive ? '#34C759' : '#FF453A'
                            }}
                          >
                            {isActive ? '● ACTIVE' : '○ INACTIVE'}
                          </button>
                        </td>
                      )}
                      <td>{getTypeBadge(promo.type)}</td>
                      <td>
                        <strong style={{ color: '#FFFFFF', display: 'block', fontSize: '13px' }}>{promo.name}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {promo.targetType === 'FAMILY' ? (
                            <span style={{ color: 'var(--bardahl-yellow)', fontWeight: 'bold' }}>
                              🏷️ Famille {promo.targetFamily}
                            </span>
                          ) : (
                            <div>
                              {promo.targetProductRefs && promo.targetProductRefs.length > 1 ? (
                                <span style={{ color: 'var(--bardahl-yellow)', fontWeight: 'bold', background: 'rgba(255, 208, 0, 0.1)', padding: '2px 6px', borderRadius: '4px' }}>
                                  🏷️ {promo.targetProductRefs.length} réf. Bardahl ({promo.targetProductRefs.slice(0, 3).join(', ')}{promo.targetProductRefs.length > 3 ? '...' : ''})
                                </span>
                              ) : (
                                <span style={{ color: 'var(--bardahl-yellow)', fontWeight: 'bold' }}>
                                  📦 {promo.targetProductName || promo.targetProductRef || 'Produit Spécifique'}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        {promo.tiers && promo.tiers.length > 0 ? (
                          <div>
                            <span style={{ fontWeight: '800', color: '#AF52DE', fontSize: '12px', display: 'block' }}>
                              ⚡ Paliers ({promo.tiers.length} tranches)
                            </span>
                            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                              {promo.tiers[0].min || 0} à {promo.tiers[promo.tiers.length - 1].max || '∞'} {promo.type === 'TYPE_4' ? 'DH' : 'ctns'}
                            </span>
                          </div>
                        ) : (
                          <span style={{ fontWeight: '800', color: '#FFF', fontSize: '12px' }}>
                            {promo.type === 'TYPE_4' ? `Dès ${promo.threshold.toFixed(2)} DH` : `Dès ${promo.threshold} cartons`}
                          </span>
                        )}
                      </td>
                      <td>
                        {promo.tiers && promo.tiers.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11px' }}>
                            {promo.tiers.map((t, idx) => {
                              const minVal = t.min !== undefined ? t.min : t.threshold
                              const maxVal = (t.max !== null && t.max !== undefined && t.max !== '') ? t.max : '∞'
                              const unit = promo.type === 'TYPE_4' ? 'DH' : 'ctns'
                              return (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
                                  <span style={{ color: 'var(--text-secondary)', fontSize: '10px' }}>[{minVal}-{maxVal} {unit}]:</span>
                                  <strong style={{ color: '#007AFF' }}>{t.discountPercent}%</strong>
                                  {t.freeQuantity > 0 && <span style={{ color: '#34C759', fontWeight: 'bold' }}>+{t.freeQuantity} gratuit</span>}
                                  {t.voucherAmount > 0 && <span style={{ color: '#FF9500', fontWeight: 'bold' }}>-{t.voucherAmount} DH</span>}
                                </div>
                              )
                            })}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px' }}>
                            {promo.discountPercent > 0 && (
                              <span style={{ color: '#007AFF', fontWeight: 'bold' }}>
                                Remise : {promo.discountPercent}%
                              </span>
                            )}
                            {promo.freeQuantity > 0 && promo.type === 'TYPE_2' && (
                              <span style={{ color: '#34C759', fontWeight: 'bold' }}>
                                🎁 +{promo.freeQuantity} carton(s) gratuit(s)
                              </span>
                            )}
                            {promo.voucherAmount > 0 && promo.type === 'TYPE_3' && (
                              <span style={{ color: '#FF9500', fontWeight: 'bold' }}>
                                Bon : -{promo.voucherAmount.toFixed(2)} DH
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '11px' }}>
                          <span style={{ color: '#FFFFFF', fontWeight: 'bold' }}>
                            📄 {stat.invoicesCount} factures • 📦 {stat.cartonsCount} cartons
                          </span>
                          <span style={{ color: '#34C759', fontSize: '10px' }}>
                            CA : {stat.revenueTtc.toFixed(2)} DH
                          </span>
                        </div>
                      </td>
                      <td style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {promo.startDate ? `${promo.startDate.slice(5)} au ${promo.endDate ? promo.endDate.slice(5) : '31-12'}` : 'Permanente'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            onClick={() => setSelectedAnalyticsPromo(promo)}
                            className="btn-secondary"
                            style={{ padding: '6px 8px', fontSize: '11px', color: 'var(--bardahl-yellow)', borderColor: 'rgba(255, 208, 0, 0.4)' }}
                            title="Voir l'analyse des ventes"
                          >
                            <BarChart2 size={13} />
                          </button>
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => handleOpenEdit(promo)}
                                className="btn-secondary"
                                style={{ padding: '6px 8px', fontSize: '11px' }}
                                title="Modifier"
                              >
                                <Edit3 size={13} />
                              </button>
                              <button
                                onClick={() => handleDelete(promo)}
                                style={{ padding: '6px 8px', fontSize: '11px', color: '#FF453A', background: 'rgba(255, 69, 58, 0.1)', border: '1px solid rgba(255, 69, 58, 0.3)', borderRadius: '6px', cursor: 'pointer' }}
                                title="Supprimer"
                              >
                                <Trash2 size={13} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Add / Edit Promotion */}
      {showModal && isAdmin && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 2000 }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '640px', maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', paddingBottom: '10px', borderBottom: '1px solid var(--border-card)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles style={{ color: 'var(--bardahl-yellow)' }} />
                {editingPromo ? 'Modifier la Promotion' : 'Nouvelle Promotion Commerciale'}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#FFF', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
            </div>

            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  TYPE DE PROMOTION *
                </label>
                <select value={formType} onChange={e => setFormType(e.target.value)} className="input-field" style={{ width: '100%', fontWeight: '700' }}>
                  <option value="TYPE_1">Type 1 — Quantité de cartons → Remise (%)</option>
                  <option value="TYPE_2">Type 2 — Quantité de cartons → Remise + Carton(s) Gratuit(s)</option>
                  <option value="TYPE_3">Type 3 — Quantité de cartons → Remise + Bon d'Achat (DH)</option>
                  <option value="TYPE_4">Type 4 — Montant total d'une famille → Remise (%)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  NOM DE L'OFFRE *
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Ex: Promo Volume Additifs (5% dès 10 cartons)"
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  DESCRIPTION
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  placeholder="Explication claire de l'avantage pour le commercial"
                />
              </div>

              {/* Target Type & Product/Family Selection */}
              <div style={{ background: '#0D0F12', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-card)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--bardahl-yellow)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={15} /> CIBLE DE LA PROMOTION *
                  </label>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {formTargetType === 'PRODUCT' ? 'Offre sur une référence précise' : 'Offre sur toute une gamme'}
                  </span>
                </div>

                {/* Segmented Toggle Buttons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setFormTargetType('PRODUCT')}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: formTargetType === 'PRODUCT' ? '2px solid var(--bardahl-yellow)' : '1px solid var(--border-card)',
                      background: formTargetType === 'PRODUCT' ? 'rgba(255, 208, 0, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      color: formTargetType === 'PRODUCT' ? 'var(--bardahl-yellow)' : 'var(--text-secondary)',
                      fontWeight: '800',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <ShoppingBag size={16} /> 📦 Produit Spécifique (Réf)
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormTargetType('FAMILY')}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: formTargetType === 'FAMILY' ? '2px solid var(--bardahl-yellow)' : '1px solid var(--border-card)',
                      background: formTargetType === 'FAMILY' ? 'rgba(255, 208, 0, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                      color: formTargetType === 'FAMILY' ? 'var(--bardahl-yellow)' : 'var(--text-secondary)',
                      fontWeight: '800',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <Layers size={16} /> 🏷️ Famille de Produits Entière
                  </button>
                </div>

                {/* Sub-selector depending on Target Type */}
                {formTargetType === 'FAMILY' ? (
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                      🏷️ FAMILLE DE PRODUITS ENTIÈRE (Sélectionnez la famille Bardahl ciblée)
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                      {activeFamilies.map(fam => {
                        const isSelected = formTargetFamily === fam.label
                        return (
                          <div
                            key={fam.id}
                            onClick={() => setFormTargetFamily(fam.label)}
                            style={{
                              padding: '10px 12px',
                              borderRadius: '8px',
                              border: isSelected ? `2px solid ${fam.color}` : '1px solid var(--border-card)',
                              background: isSelected ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <span style={{ fontSize: '20px' }}>{fam.icon}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '12px', fontWeight: isSelected ? '800' : '600', color: isSelected ? fam.color : '#FFFFFF' }}>
                                {fam.label}
                              </div>
                            </div>
                            {isSelected && <CheckCircle2 size={16} style={{ color: fam.color }} />}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="target-product-picker-container" style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-secondary)' }}>
                        RÉFÉRENCES PRODUITS CIBLÉES ({formTargetProductRefs.length} article{formTargetProductRefs.length > 1 ? 's' : ''} sélectionné{formTargetProductRefs.length > 1 ? 's' : ''})
                      </label>
                      {formTargetProductRefs.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearAllTargetProducts}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#FF453A',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            padding: '2px 6px'
                          }}
                        >
                          Tout effacer
                        </button>
                      )}
                    </div>

                    {/* Selected Multi-Reference Chips Container */}
                    <div style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '8px',
                      marginBottom: '10px',
                      minHeight: formTargetProductRefs.length === 0 ? 'auto' : '44px',
                      padding: formTargetProductRefs.length === 0 ? '12px' : '8px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}>
                      {formTargetProductRefs.length === 0 ? (
                        <span style={{ fontSize: '12px', color: '#FF9500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <AlertCircle size={14} /> Aucune référence sélectionnée. Recherchez et ajoutez un ou plusieurs articles ci-dessous.
                        </span>
                      ) : (
                        formTargetProductRefs.map(ref => {
                          const prod = products.find(p => p.reference === ref) || { reference: ref, name: ref, category: 'Bardahl' }
                          const famInfo = getFamilyInfo(prod.category, activeFamilies)
                          return (
                            <span
                              key={ref}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: 'rgba(255, 208, 0, 0.12)',
                                border: '1px solid rgba(255, 208, 0, 0.35)',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                fontSize: '11px',
                                color: '#FFFFFF'
                              }}
                            >
                              <span style={{ background: 'var(--bardahl-yellow)', color: '#000', fontWeight: '900', padding: '1px 5px', borderRadius: '3px', fontSize: '10px' }}>
                                {ref}
                              </span>
                              <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {prod.name}
                              </span>
                              <span style={{ color: famInfo.color, fontSize: '10px', fontWeight: 'bold' }}>
                                ({famInfo.label.split(' ')[0]})
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveTargetProduct(ref)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#FF453A',
                                  fontWeight: '900',
                                  fontSize: '14px',
                                  cursor: 'pointer',
                                  marginLeft: '2px',
                                  lineHeight: 1
                                }}
                                title="Retirer cette référence"
                              >
                                &times;
                              </button>
                            </span>
                          )
                        })
                      )}
                    </div>

                    {/* Search Input Field */}
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="🔎 Taper une référence ou un nom pour ajouter un produit..."
                        value={targetSearchQuery}
                        onChange={e => {
                          setTargetSearchQuery(e.target.value)
                          setShowTargetDropdown(true)
                        }}
                        onFocus={() => setShowTargetDropdown(true)}
                        style={{ paddingRight: targetSearchQuery ? '36px' : '14px' }}
                      />
                      {targetSearchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setTargetSearchQuery('')
                            setShowTargetDropdown(true)
                          }}
                          style={{
                            position: 'absolute',
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            fontSize: '16px'
                          }}
                        >
                          &times;
                        </button>
                      )}
                    </div>

                    {/* Dropdown Options List */}
                    {showTargetDropdown && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        marginTop: '4px',
                        background: '#14171F',
                        border: '1px solid var(--border-card)',
                        borderRadius: '10px',
                        boxShadow: '0 12px 35px rgba(0,0,0,0.85)',
                        maxHeight: '220px',
                        overflowY: 'auto',
                        zIndex: 2500
                      }}>
                        {filteredTargetProducts.length === 0 ? (
                          <div style={{ padding: '14px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
                            Aucun produit trouvé pour "{targetSearchQuery}"
                          </div>
                        ) : (
                          filteredTargetProducts.slice(0, 100).map(p => {
                            const isSelected = formTargetProductRefs.includes(p.reference)
                            return (
                              <div
                                key={p.id}
                                onClick={() => {
                                  if (isSelected) {
                                    handleRemoveTargetProduct(p.reference)
                                  } else {
                                    handleAddTargetProduct(p)
                                  }
                                }}
                                style={{
                                  padding: '8px 12px',
                                  cursor: 'pointer',
                                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                                  background: isSelected ? 'rgba(52, 199, 89, 0.15)' : 'transparent',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '10px',
                                  transition: 'background 0.15s'
                                }}
                                onMouseEnter={e => !isSelected && (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                                onMouseLeave={e => !isSelected && (e.currentTarget.style.background = 'transparent')}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{
                                    background: isSelected ? '#34C759' : 'rgba(255,255,255,0.1)',
                                    color: isSelected ? '#000' : '#FFF',
                                    fontWeight: '800',
                                    fontSize: '11px',
                                    padding: '2px 6px',
                                    borderRadius: '4px'
                                  }}>
                                    {p.reference}
                                  </span>
                                  <span style={{ color: '#FFFFFF', fontSize: '12px', fontWeight: '600' }}>
                                    {p.name}
                                  </span>
                                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '2px 5px', borderRadius: '4px' }}>
                                    {p.category}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ color: 'var(--bardahl-yellow)', fontWeight: '700', fontSize: '12px' }}>
                                    {(parseFloat(p.priceTtc) || 0).toFixed(2)} DH
                                  </span>
                                  {isSelected ? (
                                    <span style={{ fontSize: '11px', color: '#34C759', fontWeight: 'bold' }}>✓ Ajouté</span>
                                  ) : (
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>+ Ajouter</span>
                                  )}
                                </div>
                              </div>
                            )
                          })
                        )}
                        {filteredTargetProducts.length > 100 && (
                          <div style={{ padding: '8px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '11px', background: '#0D0F12' }}>
                            Affichage des 100 premiers résultats sur {filteredTargetProducts.length}. Précisez votre recherche pour affiner.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Conditions & Paliers Dynamiques */}
              <div style={{ background: '#0D0F12', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-card)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--bardahl-yellow)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Zap size={16} /> CONDITIONS D'ÉLIGIBILITÉ & PALIERS *
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: '#FFF' }}>
                    <input
                      type="checkbox"
                      checked={hasTiers}
                      onChange={e => setHasTiers(e.target.checked)}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--bardahl-yellow)' }}
                    />
                    <strong style={{ color: hasTiers ? 'var(--bardahl-yellow)' : 'var(--text-secondary)' }}>
                      ⚡ Activer les tranches / paliers dynamiques (Évolutions 3, 4, 5)
                    </strong>
                  </label>
                </div>

                {hasTiers ? (
                  <div>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                      Configurez des tranches progressives ({formType === 'TYPE_4' ? 'en montant DH TTC' : 'en nombre de cartons'}). Pour la dernière tranche, laissez la case <strong>Fin (Max)</strong> vide pour signifier « et plus » (tranche ouverte sans limite).
                    </p>

                    <div style={{ overflowX: 'auto', marginBottom: '10px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                        <thead>
                          <tr style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid var(--border-card)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                            <th style={{ padding: '8px 10px', width: '65px' }}>Tranche</th>
                            <th style={{ padding: '8px 10px', minWidth: '100px' }}>
                              Début ({formType === 'TYPE_4' ? 'DH' : 'Ctns'}) *
                            </th>
                            <th style={{ padding: '8px 10px', minWidth: '110px' }}>
                              Fin ({formType === 'TYPE_4' ? 'DH' : 'Ctns'})
                            </th>
                            <th style={{ padding: '8px 10px', minWidth: '95px' }}>
                              Remise (%)
                            </th>
                            {formType === 'TYPE_2' && (
                              <th style={{ padding: '8px 10px', minWidth: '100px' }}>
                                🎁 Cartons offerts
                              </th>
                            )}
                            {formType === 'TYPE_3' && (
                              <th style={{ padding: '8px 10px', minWidth: '100px' }}>
                                Bon d'achat (DH)
                              </th>
                            )}
                            <th style={{ padding: '8px 10px', width: '45px', textAlign: 'center' }}>Suppr.</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tiers.map((tier, idx) => (
                            <tr key={tier.id || idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                              <td style={{ padding: '6px 10px', fontWeight: '800', color: 'var(--bardahl-yellow)' }}>
                                N°{idx + 1}
                              </td>
                              <td style={{ padding: '6px 10px' }}>
                                <input
                                  type="number"
                                  min="0"
                                  step={formType === 'TYPE_4' ? '1' : '1'}
                                  value={tier.min}
                                  onChange={e => handleUpdateTier(idx, 'min', e.target.value)}
                                  className="input-field"
                                  style={{ width: '100%', fontSize: '12px', padding: '6px 8px' }}
                                  required
                                />
                              </td>
                              <td style={{ padding: '6px 10px' }}>
                                <input
                                  type="number"
                                  min="0"
                                  step={formType === 'TYPE_4' ? '1' : '1'}
                                  placeholder="et plus (∞)"
                                  value={tier.max === null || tier.max === undefined ? '' : tier.max}
                                  onChange={e => handleUpdateTier(idx, 'max', e.target.value === '' ? '' : e.target.value)}
                                  className="input-field"
                                  style={{ width: '100%', fontSize: '12px', padding: '6px 8px' }}
                                />
                              </td>
                              <td style={{ padding: '6px 10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.5"
                                    value={tier.discountPercent}
                                    onChange={e => handleUpdateTier(idx, 'discountPercent', e.target.value)}
                                    className="input-field"
                                    style={{ width: '100%', fontSize: '12px', padding: '6px 8px' }}
                                  />
                                  <span style={{ color: 'var(--text-secondary)' }}>%</span>
                                </div>
                              </td>
                              {formType === 'TYPE_2' && (
                                <td style={{ padding: '6px 10px' }}>
                                  <input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={tier.freeQuantity}
                                    onChange={e => handleUpdateTier(idx, 'freeQuantity', e.target.value)}
                                    className="input-field"
                                    style={{ width: '100%', fontSize: '12px', padding: '6px 8px', color: '#34C759', fontWeight: 'bold' }}
                                  />
                                </td>
                              )}
                              {formType === 'TYPE_3' && (
                                <td style={{ padding: '6px 10px' }}>
                                  <input
                                    type="number"
                                    min="0"
                                    step="10"
                                    value={tier.voucherAmount}
                                    onChange={e => handleUpdateTier(idx, 'voucherAmount', e.target.value)}
                                    className="input-field"
                                    style={{ width: '100%', fontSize: '12px', padding: '6px 8px', color: '#FF9500', fontWeight: 'bold' }}
                                  />
                                </td>
                              )}
                              <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveTier(idx)}
                                  disabled={tiers.length <= 1}
                                  style={{
                                    background: 'rgba(255, 69, 58, 0.15)',
                                    border: '1px solid rgba(255, 69, 58, 0.3)',
                                    color: '#FF453A',
                                    borderRadius: '6px',
                                    padding: '4px 6px',
                                    cursor: tiers.length <= 1 ? 'not-allowed' : 'pointer',
                                    opacity: tiers.length <= 1 ? 0.4 : 1
                                  }}
                                  title="Supprimer ce palier"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <button
                        type="button"
                        onClick={handleAddTier}
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--bardahl-yellow)', borderColor: 'rgba(255, 208, 0, 0.4)', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        <Plus size={14} /> Ajouter une tranche / palier
                      </button>

                      {!tierValidation.isValid ? (
                        <div style={{ padding: '6px 12px', borderRadius: '6px', background: 'rgba(255, 69, 58, 0.15)', border: '1px solid #FF453A', color: '#FF453A', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <AlertTriangle size={14} />
                          <span>{tierValidation.error}</span>
                        </div>
                      ) : (
                        <div style={{ fontSize: '11px', color: '#34C759', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CheckCircle2 size={13} />
                          <span>Paliers cohérents et ordonnés.</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Mode Seuil Unique */
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        {formType === 'TYPE_4' ? 'SEUIL MONTANT MINIMAL (DH TTC) *' : 'SEUIL MINIMAL CARTONS ACHETÉS *'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        className="input-field"
                        value={formThreshold}
                        onChange={e => setFormThreshold(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        TAUX DE REMISE COMMERCIALE (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        className="input-field"
                        value={formDiscountPercent}
                        onChange={e => setFormDiscountPercent(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Specific Options for Type 2 (Carton gratuit) */}
              {formType === 'TYPE_2' && (
                <div style={{ background: '#0D0F12', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-card)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#34C759', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Gift size={16} /> CONFIGURATION DE L'ARTICLE GRATUIT OFFERT (VALEUR 0.00 DH TTC)
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: hasTiers ? '1fr' : '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        MODALITÉ DU CADEAU
                      </label>
                      <select value={formFreeItemType} onChange={e => setFormFreeItemType(e.target.value)} className="input-field" style={{ width: '100%', fontSize: '12px' }}>
                        <option value="SAME_PRODUCT">Option A : Même référence que le produit commandé</option>
                        <option value="DIFFERENT_PRODUCT">Option B : Autre référence offerte en cadeau</option>
                      </select>
                    </div>

                    {!hasTiers && (
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                          QUANTITÉ OFFERTE (CARTONS)
                        </label>
                        <input
                          type="number"
                          min="1"
                          className="input-field"
                          value={formFreeQuantity}
                          onChange={e => setFormFreeQuantity(e.target.value)}
                          style={{ fontSize: '12px' }}
                        />
                      </div>
                    )}
                  </div>

                  {formFreeItemType === 'DIFFERENT_PRODUCT' && (
                    <div className="free-product-picker-container" style={{ position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                          SÉLECTIONNER LE PRODUIT CADEAU (RECHERCHE AUTOCOMPLETE)
                        </label>
                        {selectedFreeProduct && (
                          <span style={{ fontSize: '11px', color: '#34C759', fontWeight: 'bold' }}>
                            Réf : {selectedFreeProduct.reference}
                          </span>
                        )}
                      </div>

                      {selectedFreeProduct && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: 'rgba(52, 199, 89, 0.1)',
                          border: '1px solid rgba(52, 199, 89, 0.3)',
                          borderRadius: '8px',
                          marginBottom: '8px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ background: '#34C759', color: '#000', fontWeight: '900', padding: '2px 6px', borderRadius: '4px', fontSize: '11px' }}>
                              {selectedFreeProduct.reference}
                            </span>
                            <span style={{ fontWeight: '700', color: '#FFF', fontSize: '12px' }}>
                              {selectedFreeProduct.name}
                            </span>
                          </div>
                          <span style={{ fontSize: '11px', color: '#34C759', fontWeight: 'bold' }}>
                            🎁 Offert à 0.00 DH TTC
                          </span>
                        </div>
                      )}

                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          className="input-field"
                          placeholder="🔎 Rechercher le produit offert par réf ou nom..."
                          value={freeProductSearchQuery}
                          onChange={e => {
                            setFreeProductSearchQuery(e.target.value)
                            setShowFreeDropdown(true)
                          }}
                          onFocus={() => setShowFreeDropdown(true)}
                          style={{ fontSize: '12px', paddingRight: freeProductSearchQuery ? '36px' : '14px' }}
                        />
                        {freeProductSearchQuery && (
                          <button
                            type="button"
                            onClick={() => {
                              setFreeProductSearchQuery('')
                              setShowFreeDropdown(true)
                            }}
                            style={{
                              position: 'absolute',
                              right: '10px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              fontSize: '16px'
                            }}
                          >
                            &times;
                          </button>
                        )}
                      </div>

                      {showFreeDropdown && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          marginTop: '4px',
                          background: '#14171F',
                          border: '1px solid var(--border-card)',
                          borderRadius: '8px',
                          boxShadow: '0 12px 35px rgba(0,0,0,0.85)',
                          maxHeight: '180px',
                          overflowY: 'auto',
                          zIndex: 2500
                        }}>
                          {filteredFreeProducts.length === 0 ? (
                            <div style={{ padding: '10px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
                              Aucun produit trouvé pour "{freeProductSearchQuery}"
                            </div>
                          ) : (
                            filteredFreeProducts.slice(0, 100).map(p => {
                              const isSelected = p.reference === formFreeProductRef
                              return (
                                <div
                                  key={p.id}
                                  onClick={() => {
                                    setFormFreeProductRef(p.reference)
                                    setFreeProductSearchQuery('')
                                    setShowFreeDropdown(false)
                                  }}
                                  style={{
                                    padding: '8px 12px',
                                    cursor: 'pointer',
                                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                                    background: isSelected ? 'rgba(52, 199, 89, 0.2)' : 'transparent',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '8px'
                                  }}
                                  onMouseEnter={e => !isSelected && (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                                  onMouseLeave={e => !isSelected && (e.currentTarget.style.background = 'transparent')}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{
                                      background: isSelected ? '#34C759' : 'rgba(255,255,255,0.1)',
                                      color: isSelected ? '#000' : '#FFF',
                                      fontWeight: '800',
                                      fontSize: '11px',
                                      padding: '2px 5px',
                                      borderRadius: '4px'
                                    }}>
                                      {p.reference}
                                    </span>
                                    <span style={{ color: '#FFFFFF', fontSize: '12px', fontWeight: '600' }}>
                                      {p.name}
                                    </span>
                                  </div>
                                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                    {p.category}
                                  </span>
                                </div>
                              )
                            })
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Specific Options for Type 3 (Bon d'achat) */}
              {formType === 'TYPE_3' && !hasTiers && (
                <div style={{ background: '#0D0F12', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-card)' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#FF9500', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <DollarSign size={16} /> MONTANT DU BON D'ACHAT
                  </h4>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Ce bon d'achat est à montant fixe et est <strong>déduit immédiatement sur la commande actuelle</strong>.
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="number"
                      min="1"
                      className="input-field"
                      value={formVoucherAmount}
                      onChange={e => setFormVoucherAmount(e.target.value)}
                      placeholder="Ex: 100"
                      style={{ width: '140px', fontSize: '14px', fontWeight: 'bold', color: '#FF9500' }}
                      required
                    />
                    <span style={{ fontWeight: 'bold', color: '#FF9500' }}>DH TTC (Déduit immédiatement)</span>
                  </div>
                </div>
              )}

              {/* Validity & Active Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', alignItems: 'center' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    DATE DÉBUT
                  </label>
                  <input
                    type="date"
                    className="input-field"
                    value={formStartDate}
                    onChange={e => setFormStartDate(e.target.value)}
                    style={{ fontSize: '12px' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    DATE FIN
                  </label>
                  <input
                    type="date"
                    className="input-field"
                    value={formEndDate}
                    onChange={e => setFormEndDate(e.target.value)}
                    style={{ fontSize: '12px' }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '16px' }}>
                  <input
                    type="checkbox"
                    id="promoActiveCheck"
                    checked={formIsActive}
                    onChange={e => setFormIsActive(e.target.checked)}
                  />
                  <label htmlFor="promoActiveCheck" style={{ fontSize: '13px', fontWeight: 'bold', color: '#FFF', cursor: 'pointer' }}>
                    Offre Active
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border-card)' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  Annuler
                </button>
                <button type="submit" className="btn-primary">
                  {editingPromo ? 'Enregistrer les modifications' : 'Créer la Promotion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detailed Performance & Sales Analytics */}
      {selectedAnalyticsPromo && (() => {
        const promo = selectedAnalyticsPromo
        const stat = promoAnalytics[promo.id] || { 
          invoicesCount: 0, 
          cartonsCount: 0, 
          freeCartonsCount: 0, 
          revenueTtc: 0, 
          discountDh: 0, 
          voucherDh: 0,
          clientsMap: new Map(), 
          matchedOrders: [] 
        }
        const clientsList = Array.from(stat.clientsMap.values()).sort((a, b) => b.totalAmount - a.totalAmount)
        const matchedOrders = stat.matchedOrders || []

        return (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 2200
          }}>
            <div className="glass-card" style={{ width: '100%', maxWidth: '850px', maxHeight: '92vh', overflowY: 'auto' }}>
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid var(--border-card)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{
                      background: 'rgba(255, 208, 0, 0.15)',
                      color: 'var(--bardahl-yellow)',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '800',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <BarChart2 size={13} /> ANALYSE DE PERFORMANCE COMMERCIALE
                    </span>
                    {getTypeBadge(promo.type)}
                  </div>
                  <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#FFFFFF', margin: 0 }}>
                    {promo.name}
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
                    {promo.description || 'Suivi en temps réel de l\'application de l\'offre sur les bons de commande'}
                  </p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setSelectedAnalyticsPromo(null)} 
                  style={{ background: 'none', border: 'none', color: '#FFF', fontSize: '26px', cursor: 'pointer', lineHeight: 1 }}
                >
                  &times;
                </button>
              </div>

              {/* 4 Big KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '22px' }}>
                {/* Invoices */}
                <div style={{ background: '#0D0F12', borderRadius: '10px', padding: '14px', border: '1px solid var(--border-card)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700' }}>
                    <FileText size={14} style={{ color: 'var(--bardahl-yellow)' }} />
                    Factures / Bons
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: '#FFFFFF', marginTop: '6px' }}>
                    {stat.invoicesCount} <span style={{ fontSize: '13px', fontWeight: 'normal', color: 'var(--text-secondary)' }}>bons</span>
                  </div>
                  <div style={{ fontSize: '11px', color: stat.invoicesCount > 0 ? '#34C759' : 'var(--text-secondary)', marginTop: '4px' }}>
                    {stat.invoicesCount > 0 ? '✓ Offre activement commandée' : 'Aucune commande enregistrée'}
                  </div>
                </div>

                {/* Cartons Sold */}
                <div style={{ background: '#0D0F12', borderRadius: '10px', padding: '14px', border: '1px solid var(--border-card)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700' }}>
                    <Package size={14} style={{ color: '#007AFF' }} />
                    Cartons Vendus
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: '#007AFF', marginTop: '6px' }}>
                    {stat.cartonsCount} <span style={{ fontSize: '13px', fontWeight: 'normal', color: 'var(--text-secondary)' }}>cartons</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Volume commercial total
                  </div>
                </div>

                {/* Free Cartons */}
                <div style={{ background: '#0D0F12', borderRadius: '10px', padding: '14px', border: '1px solid var(--border-card)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700' }}>
                    <Gift size={14} style={{ color: '#34C759' }} />
                    Cartons Offerts 🎁
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '900', color: '#34C759', marginTop: '6px' }}>
                    {stat.freeCartonsCount} <span style={{ fontSize: '13px', fontWeight: 'normal', color: 'var(--text-secondary)' }}>gratuits</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Offerts aux clients
                  </div>
                </div>

                {/* Revenue Generated */}
                <div style={{ background: '#0D0F12', borderRadius: '10px', padding: '14px', border: '1px solid var(--border-card)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '11px', textTransform: 'uppercase', fontWeight: '700' }}>
                    <TrendingUp size={14} style={{ color: 'var(--bardahl-yellow)' }} />
                    CA Généré (TTC)
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: '900', color: 'var(--bardahl-yellow)', marginTop: '6px' }}>
                    {stat.revenueTtc.toFixed(2)} <span style={{ fontSize: '12px' }}>DH</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#FF9500', marginTop: '4px' }}>
                    Remises déduites: -{stat.discountDh.toFixed(2)} DH
                  </div>
                </div>
              </div>

              {/* Section 1: Répartition par Client */}
              <div style={{ marginBottom: '22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                    <Users size={16} style={{ color: 'var(--bardahl-yellow)' }} />
                    Clients ayant profité de cette offre ({clientsList.length})
                  </h4>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Trié par volume d'achat
                  </span>
                </div>

                {clientsList.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', background: '#0D0F12', borderRadius: '10px', border: '1px solid var(--border-card)', color: 'var(--text-secondary)', fontSize: '12px' }}>
                    Aucune commande n'a encore enregistré cette promotion.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', background: '#0D0F12', borderRadius: '10px', border: '1px solid var(--border-card)' }}>
                    <table className="custom-table" style={{ margin: 0 }}>
                      <thead>
                        <tr>
                          <th>Client</th>
                          <th style={{ textAlign: 'center' }}>Bons de Commande</th>
                          <th style={{ textAlign: 'center' }}>Volume Cartons</th>
                          <th style={{ textAlign: 'right' }}>Montant Total Acheté</th>
                          <th style={{ textAlign: 'right' }}>Part du CA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientsList.map((cl, i) => {
                          const share = stat.revenueTtc > 0 ? ((cl.totalAmount / stat.revenueTtc) * 100).toFixed(1) : 0
                          return (
                            <tr key={i}>
                              <td>
                                <strong style={{ color: '#FFFFFF' }}>{cl.name}</strong>
                              </td>
                              <td style={{ textAlign: 'center', fontWeight: 'bold' }}>
                                {cl.ordersCount}
                              </td>
                              <td style={{ textAlign: 'center', color: '#007AFF', fontWeight: '800' }}>
                                {cl.cartons} cartons
                              </td>
                              <td style={{ textAlign: 'right', color: 'var(--bardahl-yellow)', fontWeight: '800' }}>
                                {cl.totalAmount.toFixed(2)} DH
                              </td>
                              <td style={{ textAlign: 'right', color: '#34C759', fontWeight: '700' }}>
                                {share}%
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Section 2: Historique des Commandes Récentes */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                    <FileText size={16} style={{ color: '#007AFF' }} />
                    Derniers Bons de Commande Associés ({matchedOrders.length})
                  </h4>
                </div>

                {matchedOrders.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', background: '#0D0F12', borderRadius: '10px', border: '1px solid var(--border-card)', color: 'var(--text-secondary)', fontSize: '12px' }}>
                    Les commandes apparaîtront ici dès que les commerciaux sélectionneront cette promotion.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', background: '#0D0F12', borderRadius: '10px', border: '1px solid var(--border-card)' }}>
                    <table className="custom-table" style={{ margin: 0 }}>
                      <thead>
                        <tr>
                          <th>N° Bon</th>
                          <th>Date</th>
                          <th>Client</th>
                          <th style={{ textAlign: 'right' }}>Total TTC</th>
                          <th style={{ textAlign: 'center' }}>Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matchedOrders.slice(0, 15).map(ord => (
                          <tr key={ord.id}>
                            <td>
                              <strong style={{ color: 'var(--bardahl-yellow)' }}>{ord.orderNumber || ord.id?.slice(0, 8)}</strong>
                            </td>
                            <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              {ord.date ? ord.date.slice(0, 10) : (ord.createdAt ? ord.createdAt.slice(0, 10) : 'N/A')}
                            </td>
                            <td>
                              <span style={{ color: '#FFF', fontWeight: '600' }}>{ord.clientName || 'Client'}</span>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: '800', color: '#FFFFFF' }}>
                              {(parseFloat(ord.finalTotalTtc || ord.totalTtc) || 0).toFixed(2)} DH
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: '12px',
                                fontSize: '10px',
                                fontWeight: '800',
                                background: ord.status === 'LIVRE' ? 'rgba(52, 199, 89, 0.2)' : 'rgba(0, 122, 255, 0.2)',
                                color: ord.status === 'LIVRE' ? '#34C759' : '#007AFF'
                              }}>
                                {ord.status || 'VALIDE'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '14px', borderTop: '1px solid var(--border-card)' }}>
                <button 
                  type="button" 
                  onClick={() => setSelectedAnalyticsPromo(null)} 
                  className="btn-primary"
                  style={{ padding: '8px 20px' }}
                >
                  Fermer les analyses
                </button>
              </div>
            </div>
          </div>
        )
      })()}

    </div>
  )
}
