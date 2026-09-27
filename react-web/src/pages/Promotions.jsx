import React, { useState, useEffect, useMemo } from 'react'
import { 
  Gift, Tag, Plus, Edit3, Trash2, CheckCircle2, XCircle, 
  Layers, ShoppingBag, DollarSign, Calendar, Sparkles, AlertCircle, Percent,
  Search, Check, X, LayoutGrid, List, BarChart2, TrendingUp, Users, Package, Award, ArrowUpRight, FileText
} from 'lucide-react'
import { useApp } from '../context/AppContext'

export const BARDAHL_FAMILIES = [
  { id: 'ADDITIFS', label: 'Additifs & Traitements', icon: '🧪', color: '#007AFF' },
  { id: 'FLUIDES_LR', label: 'Fluides & LR', icon: '💧', color: '#00C7BE' },
  { id: 'LUB_AUTO', label: 'Lubrifiants Auto', icon: '🛢️', color: '#FFD000' },
  { id: 'IND_AEROSOLS', label: 'Aérosols & Nettoyants', icon: '💨', color: '#AF52DE' },
  { id: 'IND_GRAISSES', label: 'Industrie & Graisses', icon: '⚙️', color: '#FF9500' }
]

export const getFamilyInfo = (categoryOrFamily) => {
  if (!categoryOrFamily) return BARDAHL_FAMILIES[0]
  const c = categoryOrFamily.toUpperCase().trim()
  if (c.includes('ADDITIF')) return BARDAHL_FAMILIES[0]
  if (c.includes('FLUIDE') || c.includes('LR')) return BARDAHL_FAMILIES[1]
  if (c.includes('LUB') || c.includes('HUILE') || c.includes('AUTO') || c.includes('MOTO')) return BARDAHL_FAMILIES[2]
  if (c.includes('AEROSOL') || c.includes('NETTOYANT')) return BARDAHL_FAMILIES[3]
  if (c.includes('GRAISSE') || c.includes('IND') || c.includes('ALIM')) return BARDAHL_FAMILIES[4]
  return { id: c, label: categoryOrFamily, icon: '🏷️', color: '#8E8E93' }
}

export default function Promotions() {
  const { orders = [], promotions, addPromotion, updatePromotion, deletePromotion, togglePromotion, products, currentUser } = useApp()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [showModal, setShowModal] = useState(false)
  const [editingPromo, setEditingPromo] = useState(null)
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'table'
  const [selectedAnalyticsPromo, setSelectedAnalyticsPromo] = useState(null)

  const isAdmin = currentUser?.role === 'ADMIN'

  // Form State
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formType, setFormType] = useState('TYPE_1')
  const [formTargetType, setFormTargetType] = useState('PRODUCT')
  const [formTargetFamily, setFormTargetFamily] = useState(BARDAHL_FAMILIES[0].label)
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
  
  // Tiers (Paliers)
  const [hasTiers, setHasTiers] = useState(false)
  const [tiers, setTiers] = useState([
    { threshold: 10, discountPercent: 5, freeQuantity: 1 },
    { threshold: 20, discountPercent: 7, freeQuantity: 2 },
    { threshold: 30, discountPercent: 10, freeQuantity: 3 }
  ])

  // Extract unique categories from products mapped to clean families
  const families = BARDAHL_FAMILIES.map(f => f.label)

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
    const matchesSearch = (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
                          (p.targetFamily || '').toLowerCase().includes(search.toLowerCase()) ||
                          (p.description || '').toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter === 'ALL' || p.type === typeFilter
    const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? p.isActive !== false : p.isActive === false)
    return matchesSearch && matchesType && matchesStatus
  })

  const handleOpenAdd = () => {
    setEditingPromo(null)
    setFormName('')
    setFormDesc('')
    setFormType('TYPE_1')
    setFormTargetType('PRODUCT')
    const initialProduct = products[0]
    setFormTargetProductRef(initialProduct?.reference || '34131')
    const detectedFam = initialProduct ? getFamilyInfo(initialProduct.category).label : BARDAHL_FAMILIES[0].label
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
    setHasTiers(false)
    setTiers([
      { threshold: 10, discountPercent: 5, freeQuantity: 1 },
      { threshold: 20, discountPercent: 7, freeQuantity: 2 },
      { threshold: 30, discountPercent: 10, freeQuantity: 3 }
    ])
    setShowModal(true)
  }

  const handleOpenEdit = (promo) => {
    setEditingPromo(promo)
    setFormName(promo.name || '')
    setFormDesc(promo.description || '')
    setFormType(promo.type || 'TYPE_1')
    setFormTargetType(promo.targetType || (promo.targetProductRef ? 'PRODUCT' : 'FAMILY'))
    const prod = products.find(p => p.reference === promo.targetProductRef)
    const detectedFam = prod ? getFamilyInfo(prod.category).label : (promo.targetFamily || BARDAHL_FAMILIES[0].label)
    setFormTargetFamily(detectedFam)
    setFormTargetProductRef(promo.targetProductRef || products[0]?.reference || '')
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
    if (promo.tiers && promo.tiers.length > 0) {
      setHasTiers(true)
      setTiers(promo.tiers)
    } else {
      setHasTiers(false)
      setTiers([
        { threshold: 10, discountPercent: 5, freeQuantity: 1 },
        { threshold: 20, discountPercent: 7, freeQuantity: 2 },
        { threshold: 30, discountPercent: 10, freeQuantity: 3 }
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

    const freeProductObj = products.find(p => p.reference === formFreeProductRef)
    const targetProductObj = products.find(p => p.reference === formTargetProductRef)

    const payload = {
      name: formName.trim(),
      description: formDesc.trim(),
      type: formType,
      targetType: formTargetType,
      targetFamily: formTargetType === 'FAMILY' ? formTargetFamily : undefined,
      targetProductRef: formTargetType === 'PRODUCT' ? (formTargetProductRef || products[0]?.reference) : undefined,
      targetProductName: formTargetType === 'PRODUCT' ? (targetProductObj?.name || formTargetProductRef || products[0]?.name) : undefined,
      targetProductId: formTargetType === 'PRODUCT' ? (targetProductObj?.id || formTargetProductRef || products[0]?.id) : undefined,
      threshold: parseFloat(formThreshold) || 1,
      discountPercent: parseFloat(formDiscountPercent) || 0,
      freeItemType: formType === 'TYPE_2' ? formFreeItemType : undefined,
      freeProductRef: (formType === 'TYPE_2' && formFreeItemType === 'DIFFERENT_PRODUCT') ? (formFreeProductRef || products[0]?.reference) : undefined,
      freeProductName: (formType === 'TYPE_2' && formFreeItemType === 'DIFFERENT_PRODUCT') ? (freeProductObj?.name || formFreeProductRef || products[0]?.name) : undefined,
      freeProductId: (formType === 'TYPE_2' && formFreeItemType === 'DIFFERENT_PRODUCT') ? (freeProductObj?.id || formFreeProductRef || products[0]?.id) : undefined,
      freeQuantity: formType === 'TYPE_2' ? (parseInt(formFreeQuantity, 10) || 1) : 0,
      tiers: (formType === 'TYPE_2' && hasTiers) ? tiers : undefined,
      voucherAmount: formType === 'TYPE_3' ? (parseFloat(formVoucherAmount) || 0) : 0,
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
        {isAdmin && (
          <button onClick={handleOpenAdd} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} /> Nouvelle Promotion
          </button>
        )}
      </div>

      {/* Summary KPI Cards with Real Sales Impact */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="glass-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '800', textTransform: 'uppercase' }}>TOTAL OFFRES</span>
            <Tag size={16} style={{ color: 'var(--bardahl-yellow)' }} />
          </div>
          <div style={{ fontSize: '26px', fontWeight: '900', color: '#FFFFFF', marginTop: '4px' }}>{promotions.length}</div>
          <div style={{ fontSize: '11px', color: '#34C759', marginTop: '2px', fontWeight: '700' }}>
            ● {promotions.filter(p => p.isActive !== false).length} actives / {promotions.filter(p => p.isActive === false).length} inactives
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

          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field" style={{ width: '130px' }}>
            <option value="ALL">Tous Statuts</option>
            <option value="ACTIVE">Actives</option>
            <option value="INACTIVE">Inactives</option>
          </select>
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
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>Modifiez vos filtres ou créez une nouvelle offre commerciale.</p>
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
                  borderLeft: `4px solid ${isActive ? 'var(--bardahl-yellow)' : '#555'}`,
                  opacity: isActive ? 1 : 0.65
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                    {getTypeBadge(promo.type)}
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
                  </div>

                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#FFFFFF', marginBottom: '6px' }}>
                    {promo.name}
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: '1.4' }}>
                    {promo.description}
                  </p>

                  <div style={{ background: '#0D0F12', borderRadius: '10px', padding: '12px', border: '1px solid var(--border-card)', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Cible :</span>
                      <strong style={{ color: 'var(--bardahl-yellow)' }}>
                        {promo.targetType === 'FAMILY' ? `Famille ${promo.targetFamily}` : (promo.targetProductName || promo.targetProductRef)}
                      </strong>
                    </div>

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

                    {promo.tiers && promo.tiers.length > 0 && (
                      <div style={{ marginTop: '4px', paddingTop: '4px', borderTop: '1px dashed #2B313E' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '11px', display: 'block', marginBottom: '2px' }}>Paliers exclusifs :</span>
                        {promo.tiers.map((t, i) => (
                          <div key={i} style={{ fontSize: '11px', color: '#DDD', display: 'flex', justifyContent: 'space-between' }}>
                            <span>• {t.threshold} cartons :</span>
                            <strong>{t.discountPercent}% + {t.freeQuantity} offert</strong>
                          </div>
                        ))}
                      </div>
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
                  <th style={{ minWidth: '90px' }}>Statut</th>
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
                      <td>{getTypeBadge(promo.type)}</td>
                      <td>
                        <strong style={{ color: '#FFFFFF', display: 'block', fontSize: '13px' }}>{promo.name}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: 'var(--bardahl-yellow)', fontWeight: 'bold' }}>
                            {promo.targetType === 'FAMILY' ? `Famille ${promo.targetFamily}` : (promo.targetProductName || promo.targetProductRef)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: '800', color: '#FFF', fontSize: '12px' }}>
                          {promo.type === 'TYPE_4' ? `Dès ${promo.threshold.toFixed(2)} DH` : `Dès ${promo.threshold} cartons`}
                        </span>
                      </td>
                      <td>
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
                          {promo.tiers && promo.tiers.length > 0 && (
                            <span style={{ color: '#AF52DE', fontSize: '10px' }}>
                              ({promo.tiers.length} paliers configurés)
                            </span>
                          )}
                        </div>
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
      {showModal && (
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
                      {BARDAHL_FAMILIES.map(fam => {
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                        RECHERCHER ET SÉLECTIONNER LE PRODUIT ({products.length} références)
                      </label>
                      {selectedTargetProduct && (
                        <span style={{ fontSize: '11px', color: 'var(--bardahl-yellow)', fontWeight: 'bold' }}>
                          Réf : {selectedTargetProduct.reference}
                        </span>
                      )}
                    </div>

                    {/* Selected Product Card Banner with Automatic Family Detection */}
                    {selectedTargetProduct && (() => {
                      const famInfo = getFamilyInfo(selectedTargetProduct.category)
                      return (
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                          padding: '12px 14px',
                          background: 'rgba(255, 208, 0, 0.08)',
                          border: '1px solid rgba(255, 208, 0, 0.3)',
                          borderRadius: '10px',
                          marginBottom: '10px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ background: 'var(--bardahl-yellow)', color: '#000', fontWeight: '900', padding: '3px 8px', borderRadius: '6px', fontSize: '12px' }}>
                                {selectedTargetProduct.reference}
                              </span>
                              <div>
                                <div style={{ fontWeight: '800', color: '#FFFFFF', fontSize: '13px' }}>
                                  {selectedTargetProduct.name}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                  Prix : <span style={{ color: 'var(--bardahl-yellow)', fontWeight: 'bold' }}>{(parseFloat(selectedTargetProduct.priceTtc) || 0).toFixed(2)} DH TTC</span>
                                </div>
                              </div>
                            </div>
                            <span style={{ fontSize: '11px', color: '#34C759', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle2 size={14} /> Produit sélectionné
                            </span>
                          </div>

                          {/* Auto-detected Family Tag Banner */}
                          <div style={{
                            padding: '8px 12px',
                            background: 'rgba(0, 0, 0, 0.4)',
                            borderRadius: '8px',
                            border: `1px solid ${famInfo.color}40`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '8px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '18px' }}>{famInfo.icon}</span>
                              <div>
                                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px' }}>
                                  🏷️ Famille de Produits Entière (Détection Automatique)
                                </div>
                                <div style={{ color: famInfo.color, fontWeight: '800', fontSize: '13px' }}>
                                  {famInfo.label}
                                </div>
                              </div>
                            </div>

                            {/* The 5 Bardahl Official Families Mini Badges */}
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {BARDAHL_FAMILIES.map(fam => {
                                const isCurrent = fam.label === famInfo.label
                                return (
                                  <span
                                    key={fam.id}
                                    style={{
                                      fontSize: '10px',
                                      fontWeight: isCurrent ? '800' : '500',
                                      padding: '3px 7px',
                                      borderRadius: '6px',
                                      background: isCurrent ? fam.color : 'rgba(255,255,255,0.06)',
                                      color: isCurrent ? '#000000' : 'var(--text-secondary)',
                                      border: isCurrent ? `1px solid ${fam.color}` : '1px solid transparent',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '3px'
                                    }}
                                  >
                                    <span>{fam.icon}</span>
                                    <span>{fam.label.split(' ')[0]}</span>
                                    {isCurrent && <Check size={11} />}
                                  </span>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      )
                    })()}

                    {/* Search Input Field */}
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className="input-field"
                        placeholder="🔎 Taper une référence ou nom (ex: 34131, 10W40, Additif...)"
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
                            const isSelected = p.reference === formTargetProductRef
                            return (
                              <div
                                key={p.id}
                                onClick={() => {
                                  setFormTargetProductRef(p.reference)
                                  const detected = getFamilyInfo(p.category)
                                  setFormTargetFamily(detected.label)
                                  setTargetSearchQuery('')
                                  setShowTargetDropdown(false)
                                }}
                                style={{
                                  padding: '10px 14px',
                                  cursor: 'pointer',
                                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                                  background: isSelected ? 'rgba(255, 208, 0, 0.15)' : 'transparent',
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
                                    background: isSelected ? 'var(--bardahl-yellow)' : 'rgba(255,255,255,0.1)',
                                    color: isSelected ? '#000' : '#FFF',
                                    fontWeight: '800',
                                    fontSize: '11px',
                                    padding: '2px 6px',
                                    borderRadius: '4px'
                                  }}>
                                    {p.reference}
                                  </span>
                                  <span style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: '600' }}>
                                    {p.name}
                                  </span>
                                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>
                                    {p.category}
                                  </span>
                                </div>
                                <div style={{ color: 'var(--bardahl-yellow)', fontWeight: '700', fontSize: '12px', whiteSpace: 'nowrap' }}>
                                  {(parseFloat(p.priceTtc) || 0).toFixed(2)} DH
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

              {/* Threshold & Discount */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    {formType === 'TYPE_4' ? 'SEUIL MONTANT (DH TTC) *' : 'SEUIL CARTONS ACHETÉS *'}
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
                    TAUX DE REMISE (%)
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

              {/* Specific Options for Type 2 (Carton gratuit) */}
              {formType === 'TYPE_2' && (
                <div style={{ background: '#0D0F12', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-card)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#34C759', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Gift size={16} /> CONFIGURATION DU CARTON GRATUIT
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        CHOIX DE RÉFÉRENCE
                      </label>
                      <select value={formFreeItemType} onChange={e => setFormFreeItemType(e.target.value)} className="input-field" style={{ width: '100%', fontSize: '12px' }}>
                        <option value="SAME_PRODUCT">Option A : Même référence</option>
                        <option value="DIFFERENT_PRODUCT">Option B : Autre référence offerte</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        QUANTITÉ GRATUITE (CARTONS)
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
                  </div>

                  {formFreeItemType === 'DIFFERENT_PRODUCT' && (
                    <div className="free-product-picker-container" style={{ position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                          RÉFÉRENCE OFFERTE EN CADEAU (RECHERCHE AUTOCOMPLETE)
                        </label>
                        {selectedFreeProduct && (
                          <span style={{ fontSize: '11px', color: '#34C759', fontWeight: 'bold' }}>
                            Réf : {selectedFreeProduct.reference}
                          </span>
                        )}
                      </div>

                      {/* Selected Gift Card Banner */}
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
                            🎁 Offert
                          </span>
                        </div>
                      )}

                      {/* Search Input Field */}
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

                      {/* Dropdown Options List */}
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

                  {/* Section 5 : Paliers exclusifs */}
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-card)' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: '#FFF' }}>
                      <input type="checkbox" checked={hasTiers} onChange={e => setHasTiers(e.target.checked)} />
                      <strong>Activer plusieurs paliers pour cette promotion (Section 5)</strong>
                    </label>
                    {hasTiers && (
                      <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          Paliers exclusifs : le système applique le palier le plus élevé atteint.
                        </span>
                        {tiers.map((tier, idx) => (
                          <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', width: '60px' }}>Palier {idx + 1} :</span>
                            <input
                              type="number"
                              placeholder="Seuil cartons"
                              value={tier.threshold}
                              onChange={e => {
                                const val = parseInt(e.target.value, 10) || 0
                                setTiers(prev => prev.map((t, i) => i === idx ? { ...t, threshold: val } : t))
                              }}
                              className="input-field"
                              style={{ width: '90px', fontSize: '12px', padding: '4px 6px' }}
                            />
                            <span style={{ fontSize: '11px' }}>cartons →</span>
                            <input
                              type="number"
                              placeholder="Remise %"
                              value={tier.discountPercent}
                              onChange={e => {
                                const val = parseFloat(e.target.value) || 0
                                setTiers(prev => prev.map((t, i) => i === idx ? { ...t, discountPercent: val } : t))
                              }}
                              className="input-field"
                              style={{ width: '70px', fontSize: '12px', padding: '4px 6px' }}
                            />
                            <span style={{ fontSize: '11px' }}>% +</span>
                            <input
                              type="number"
                              placeholder="Qté gratuite"
                              value={tier.freeQuantity}
                              onChange={e => {
                                const val = parseInt(e.target.value, 10) || 0
                                setTiers(prev => prev.map((t, i) => i === idx ? { ...t, freeQuantity: val } : t))
                              }}
                              className="input-field"
                              style={{ width: '70px', fontSize: '12px', padding: '4px 6px' }}
                            />
                            <span style={{ fontSize: '11px' }}>gratuit</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Specific Options for Type 3 (Bon d'achat) */}
              {formType === 'TYPE_3' && (
                <div style={{ background: '#0D0F12', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-card)' }}>
                  <h4 style={{ fontSize: '13px', fontWeight: '800', color: '#FF9500', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <DollarSign size={16} /> MONTANT DU BON D'ACHAT (SECTION 6 & 7)
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
