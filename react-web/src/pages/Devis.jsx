import React, { useState, useEffect, useMemo } from 'react'
import {
  Search, Plus, FileText, Trash2, Edit3, CheckCircle2,
  Filter, Truck, MessageSquare, Package, X, ShoppingBag,
  Calculator, ArrowRight, Clock, AlertTriangle, RefreshCw,
  Coins, ChevronDown, User, FileSpreadsheet, Send, CheckSquare,
  ArrowUpRight, Building2, MapPin, Eye, Phone, Calendar
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { generateDevisPdf } from '../utils/pdfGenerator'
import { exportDevisToExcel } from '../utils/excelExporter'
import { getProductUnitsPerCarton } from '../data/productsData'
import { getFamilyInfo, DEFAULT_BARDAHL_FAMILIES } from '../data/familiesData'
import { BARDAHL_COMPANY_INFO } from '../data/companyData'

export default function Devis({ openWizardTrigger, setActiveTab }) {
  const {
    devis = [],
    clients = [],
    products = [],
    commercials = [],
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
    return `DEV-2026-${String(devis.length + 1).padStart(4, '0')}`
  }, [devis.length])

  const handleOpenWizard = (dev = null) => {
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
      setSelectedProducts(dev.items ? dev.items.map(it => ({ ...it })) : [])
    } else {
      setEditingDevis(null)
      setCustomDevisNumber(suggestedDevisNumber)
      setSelectedClient('')
      setClientSearchQuery('')
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

  // Add product to devis wizard selection
  const handleAddProductItem = (prod) => {
    const existingIndex = selectedProducts.findIndex(p => p.productId === prod.id || p.reference === prod.reference)
    const cartonUnits = prod.unitsPerBox || getProductUnitsPerCarton(prod) || 1
    if (existingIndex >= 0) {
      // Increase by 1 carton (or 1 unit)
      setSelectedProducts(prev => prev.map((item, idx) => {
        if (idx === existingIndex) {
          const newQty = item.qty + cartonUnits
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
          priceTtc: parseFloat(prod.priceTtc) || 0,
          unitsPerCarton: cartonUnits,
          cartons: 1,
          qty: cartonUnits,
          remise: 0,
          qtyGratuit: 0
        }
      ])
    }
  }

  // Update product line quantity / remise in devis wizard
  const handleUpdateProductLine = (index, field, value) => {
    setSelectedProducts(prev => prev.map((item, idx) => {
      if (idx !== index) return item
      const updated = { ...item }
      if (field === 'qty') {
        const q = Math.max(0, parseInt(value, 10) || 0)
        updated.qty = q
        updated.cartons = Math.floor(q / (item.unitsPerCarton || 1))
      } else if (field === 'cartons') {
        const c = Math.max(0, parseInt(value, 10) || 0)
        updated.cartons = c
        updated.qty = c * (item.unitsPerCarton || 1)
      } else if (field === 'remise') {
        updated.remise = Math.max(0, Math.min(100, parseFloat(value) || 0))
      } else if (field === 'priceTtc') {
        updated.priceTtc = Math.max(0, parseFloat(value) || 0)
      }
      return updated
    }))
  }

  const handleRemoveProductLine = (index) => {
    setSelectedProducts(prev => prev.filter((_, idx) => idx !== index))
  }

  // Financial calculations for devis wizard
  const wizardCalculations = useMemo(() => {
    let brutTtc = 0
    let linesDiscount = 0

    selectedProducts.forEach(it => {
      const lineBrut = (it.qty || 0) * (it.priceTtc || 0)
      const lineRemiseDh = lineBrut * ((it.remise || 0) / 100)
      brutTtc += lineBrut
      linesDiscount += lineRemiseDh
    })

    const afterLinesDiscount = Math.max(0, brutTtc - linesDiscount)
    const globalRemiseDh = remiseMontant > 0 
      ? remiseMontant 
      : (remisePercent > 0 ? (afterLinesDiscount * (remisePercent / 100)) : 0)

    const finalTtc = Math.max(0, afterLinesDiscount - globalRemiseDh)
    const totalHt = Math.round((finalTtc / 1.20) * 100) / 100
    const totalTva = Math.round((finalTtc - totalHt) * 100) / 100
    const totalDiscount = Math.round((linesDiscount + globalRemiseDh) * 100) / 100

    return {
      brutTtc,
      linesDiscount,
      globalRemiseDh,
      totalDiscount,
      totalHt,
      totalTva,
      totalTtc: Math.round(finalTtc * 100) / 100
    }
  }, [selectedProducts, remisePercent, remiseMontant])

  // Save Devis Handler
  const handleSaveDevis = async (andConvertNow = false) => {
    if (!selectedClient && !clientSearchQuery) {
      alert("Veuillez sélectionner un client pour ce devis.")
      return
    }
    if (selectedProducts.length === 0) {
      alert("Veuillez ajouter au moins un produit au devis.")
      return
    }

    const matchedClient = clients.find(c => c.id === selectedClient || c.dbId === selectedClient)
    const clientName = matchedClient?.companyName || clientSearchQuery.split('(')[0].trim() || 'Client Bardahl'
    const clientIce = matchedClient?.ice || ''
    const clientCity = matchedClient?.city || ''
    const clientAddress = matchedClient?.address || ''
    const clientPhone = matchedClient?.phone || ''

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
      remisePercent,
      remiseMontant,
      items: selectedProducts,
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
          <div className="glass-card" style={{ width: '100%', maxWidth: '960px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden' }}>
            
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
                        placeholder="Rechercher par nom, ville, ICE..."
                        value={clientSearchQuery}
                        onChange={e => {
                          setClientSearchQuery(e.target.value)
                          setShowClientDropdown(true)
                          if (!e.target.value) setSelectedClient('')
                        }}
                        onFocus={() => setShowClientDropdown(true)}
                        className="input-field"
                        style={{ paddingLeft: '36px', paddingRight: '32px', fontSize: '13px', height: '42px', fontWeight: '600', width: '100%', boxSizing: 'border-box' }}
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

              {/* Section 3: Tableau des Articles Sélectionnés dans le Devis */}
              <div>
                <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#FFFFFF', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Articles dans le Devis ({selectedProducts.length})</span>
                  {selectedProducts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedProducts([])}
                      style={{ background: 'none', border: 'none', color: '#FF453A', fontSize: '11px', cursor: 'pointer', fontWeight: '700' }}
                    >
                      Tout vider
                    </button>
                  )}
                </h4>

                {selectedProducts.length === 0 ? (
                  <div style={{ padding: '30px', textAlign: 'center', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '10px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                    Aucun article sélectionné. Cliquez sur un article ci-dessus pour l'ajouter au devis.
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', textAlign: 'left' }}>
                          <th style={{ padding: '8px' }}>Réf. & Article</th>
                          <th style={{ padding: '8px', textAlign: 'center', width: '100px' }}>Cartons</th>
                          <th style={{ padding: '8px', textAlign: 'center', width: '100px' }}>Unités</th>
                          <th style={{ padding: '8px', textAlign: 'right', width: '110px' }}>P.U TTC (DH)</th>
                          <th style={{ padding: '8px', textAlign: 'center', width: '80px' }}>Remise %</th>
                          <th style={{ padding: '8px', textAlign: 'right', width: '120px' }}>Total TTC</th>
                          <th style={{ padding: '8px', width: '40px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedProducts.map((it, idx) => {
                          const lineBrut = (it.qty || 0) * (it.priceTtc || 0)
                          const lineNet = lineBrut * (1 - (it.remise || 0) / 100)
                          return (
                            <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                              <td style={{ padding: '8px' }}>
                                <div style={{ fontWeight: '800', color: '#FFFFFF' }}>{it.productName}</div>
                                <div style={{ fontSize: '10px', color: 'var(--bardahl-yellow)' }}>
                                  Réf: {it.reference} • {it.unitsPerCarton} un./carton
                                </div>
                              </td>
                              
                              <td style={{ padding: '8px', textAlign: 'center' }}>
                                <input
                                  type="number"
                                  min="0"
                                  value={it.cartons}
                                  onChange={e => handleUpdateProductLine(idx, 'cartons', e.target.value)}
                                  className="input-field"
                                  style={{ width: '70px', height: '32px', textAlign: 'center', padding: '2px', fontSize: '12px', margin: '0 auto' }}
                                />
                              </td>

                              <td style={{ padding: '8px', textAlign: 'center' }}>
                                <input
                                  type="number"
                                  min="1"
                                  value={it.qty}
                                  onChange={e => handleUpdateProductLine(idx, 'qty', e.target.value)}
                                  className="input-field"
                                  style={{ width: '75px', height: '32px', textAlign: 'center', padding: '2px', fontSize: '12px', margin: '0 auto', fontWeight: '700' }}
                                />
                              </td>

                              <td style={{ padding: '8px', textAlign: 'right' }}>
                                <input
                                  type="number"
                                  step="0.1"
                                  value={it.priceTtc}
                                  onChange={e => handleUpdateProductLine(idx, 'priceTtc', e.target.value)}
                                  className="input-field"
                                  style={{ width: '90px', height: '32px', textAlign: 'right', padding: '2px 6px', fontSize: '12px', marginLeft: 'auto' }}
                                />
                              </td>

                              <td style={{ padding: '8px', textAlign: 'center' }}>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={it.remise}
                                  onChange={e => handleUpdateProductLine(idx, 'remise', e.target.value)}
                                  className="input-field"
                                  style={{ width: '60px', height: '32px', textAlign: 'center', padding: '2px', fontSize: '12px', margin: '0 auto' }}
                                />
                              </td>

                              <td style={{ padding: '8px', textAlign: 'right', fontWeight: '800', color: 'var(--bardahl-yellow)' }}>
                                {lineNet.toFixed(2)} DH
                              </td>

                              <td style={{ padding: '8px', textAlign: 'center' }}>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveProductLine(idx)}
                                  style={{ background: 'none', border: 'none', color: '#FF453A', cursor: 'pointer', padding: '4px' }}
                                  title="Retirer"
                                >
                                  <X size={14} />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
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
              ℹ️ Cette action créera immédiatement un <strong>Bon de Commande officiel (BC-2026-...)</strong>, déduira le stock nécessaire des articles et marquera le devis comme <strong>« Converti »</strong>.
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
                        <th style={{ padding: '8px', textAlign: 'right' }}>P.U TTC</th>
                        <th style={{ padding: '8px', textAlign: 'center' }}>Remise</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Total TTC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedDevisDetails.items || []).map((it, idx) => {
                        const lineBrut = (it.qty || 0) * (it.priceTtc || 0)
                        const lineNet = lineBrut * (1 - (it.remise || 0) / 100)
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td style={{ padding: '8px', fontWeight: '700', color: 'var(--bardahl-yellow)' }}>{it.reference || it.code}</td>
                            <td style={{ padding: '8px', color: '#FFFFFF' }}>{it.productName}</td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>
                              <strong>{it.qty}</strong> un. {it.cartons > 0 && <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>({it.cartons} ct)</span>}
                            </td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>{(parseFloat(it.priceTtc) || 0).toFixed(2)} DH</td>
                            <td style={{ padding: '8px', textAlign: 'center' }}>{it.remise > 0 ? `${it.remise}%` : '-'}</td>
                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: '800', color: 'var(--bardahl-yellow)' }}>
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
