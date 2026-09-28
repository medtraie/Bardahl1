import React, { useState, useMemo } from 'react'
import {
  Contact, UserPlus, MapPin, Target, Phone, Mail, Award, CheckCircle2,
  Lock, ShieldCheck, ShieldAlert, Edit3, Trash2, FileText, Download,
  Power, AlertTriangle, Plus, X, LayoutGrid, List, BarChart3, TrendingUp,
  ShoppingCart, Package, Users, Search, Filter, Eye, ChevronRight,
  ArrowUpRight, Sparkles, CheckCircle, Clock
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { generatePortfolioByCommercialPdf, generateOrderPdf } from '../utils/pdfGenerator'

const AVAILABLE_SECTORS = [
  'Casablanca', 'Mohammedia', 'Rabat', 'Salé', 'Kénitra',
  'Tanger', 'Tétouan', 'Marrakech', 'Agadir', 'Fès',
  'Meknès', 'Oujda', 'El Jadida', 'Safi', 'Béni Mellal', 'Nador'
]

// Helper to format currency
const formatMoney = (val) => {
  const num = parseFloat(val) || 0
  return num.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Helper to detect Bardahl product family
const detectBardahlFamily = (name = '', ref = '') => {
  const s = (name + ' ' + ref).toLowerCase()
  if (s.includes('10w') || s.includes('5w') || s.includes('0w') || s.includes('15w') || s.includes('20w') || s.includes('huile') || s.includes('xtra') || s.includes('xts') || s.includes('lubrifiant')) {
    return 'Lubrifiants Auto'
  }
  if (s.includes('liquide') || s.includes('refroidissement') || s.includes('frein') || s.includes('dot') || s.includes('lave') || s.includes('antigel') || s.includes('fluide')) {
    return 'Fluides & LR'
  }
  if (s.includes('spray') || s.includes('aérosol') || s.includes('aerosol') || s.includes('nettoyant') || s.includes('dégraissant') || s.includes('degraissant') || s.includes('freins spray')) {
    return 'Aérosols & Nettoyants'
  }
  if (s.includes('graisse') || s.includes('industrie') || s.includes('hydraulic') || s.includes('hydraulique') || s.includes('pâte')) {
    return 'Industrie & Graisses'
  }
  return 'Additifs & Traitements'
}

// Analytics calculation engine for a commercial
const calculateCommercialStats = (comm, allOrders = [], allClients = []) => {
  // Robust matching for commercial orders
  const commOrders = allOrders.filter(o => {
    if (!o) return false
    if (comm.id && o.commercialDbId === comm.id) return true
    if (comm.dbId && o.commercialDbId === comm.dbId) return true
    if (comm.name && o.commercialName && comm.name.trim().toLowerCase() === o.commercialName.trim().toLowerCase()) return true
    if (comm.email && o.commercialEmail && comm.email.trim().toLowerCase() === o.commercialEmail.trim().toLowerCase()) return true
    return false
  })

  // Match assigned clients
  const assignedClients = allClients.filter(cl => {
    if (!cl) return false
    if (comm.id && cl.commercialDbId === comm.id) return true
    if (comm.dbId && cl.commercialDbId === comm.dbId) return true
    if (comm.name && cl.commercialName && comm.name.trim().toLowerCase() === cl.commercialName.trim().toLowerCase()) return true
    if (comm.email && cl.commercialEmail && comm.email.trim().toLowerCase() === cl.commercialEmail.trim().toLowerCase()) return true
    return false
  })

  const invoicesCount = commOrders.length
  const validatedOrders = commOrders.filter(o => o.status === 'VALIDATED')
  const totalOrdersTtc = commOrders.reduce((sum, o) => sum + (parseFloat(o.totalTtc) || 0), 0)
  const totalOrdersHt = commOrders.reduce((sum, o) => sum + (parseFloat(o.totalHt) || (parseFloat(o.totalTtc) / 1.20) || 0), 0)

  // Use recorded orders CA, or fallback to comm.current
  const totalTtc = totalOrdersTtc > 0 ? totalOrdersTtc : (parseFloat(comm.current) || 0)
  const totalHt = totalOrdersHt > 0 ? totalOrdersHt : (totalTtc / 1.20)
  const target = parseFloat(comm.target) || 150000
  const targetPercent = target > 0 ? Math.min(999, Math.round((totalTtc / target) * 100)) : 0
  const panierMoyen = invoicesCount > 0 ? (totalTtc / invoicesCount) : 0

  // Aggregation of sold products
  const productMap = {}
  const familyMap = {
    'Additifs & Traitements': { count: 0, revenue: 0 },
    'Fluides & LR': { count: 0, revenue: 0 },
    'Lubrifiants Auto': { count: 0, revenue: 0 },
    'Aérosols & Nettoyants': { count: 0, revenue: 0 },
    'Industrie & Graisses': { count: 0, revenue: 0 },
  }

  commOrders.forEach(order => {
    (order.items || []).forEach(it => {
      const pName = it.productName || it.name || 'Produit Bardahl'
      const pRef = it.reference || ''
      const key = (it.productId || pRef || pName).trim().toLowerCase()
      const qty = parseInt(it.quantity || it.qty || 1, 10)
      const pTotal = parseFloat(it.totalTtc || (qty * (parseFloat(it.priceTtc) || 0))) || 0
      const family = detectBardahlFamily(pName, pRef)

      if (!productMap[key]) {
        productMap[key] = {
          key,
          name: pName,
          reference: pRef,
          family: family,
          quantity: 0,
          revenue: 0,
          ordersCount: 0,
        }
      }
      productMap[key].quantity += qty
      productMap[key].revenue += pTotal
      productMap[key].ordersCount += 1

      if (familyMap[family]) {
        familyMap[family].count += qty
        familyMap[family].revenue += pTotal
      }
    })
  })

  const sortedProducts = Object.values(productMap).sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue)
  const topProduct = sortedProducts[0] || null

  return {
    commercial: comm,
    invoicesCount,
    validatedCount: validatedOrders.length,
    totalTtc,
    totalHt,
    target,
    targetPercent,
    panierMoyen,
    assignedClientsCount: assignedClients.length,
    assignedClients,
    orders: commOrders.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)),
    topProduct,
    topProductsList: sortedProducts.slice(0, 5),
    familyMap
  }
}

export default function Commercials() {
  const { commercials = [], clients = [], orders = [], addCommercial, updateCommercial, deleteCommercial } = useApp()

  // Display & Filter States
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'table'
  const [searchTerm, setSearchTerm] = useState('')
  const [sectorFilter, setSectorFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL') // 'ALL' | 'ACTIVE' | 'INACTIVE'

  // Modal States
  const [showModal, setShowModal] = useState(false)
  const [editingCommercial, setEditingCommercial] = useState(null)
  const [customSectorInput, setCustomSectorInput] = useState('')
  const [selectedCommercialAnalytics, setSelectedCommercialAnalytics] = useState(null)

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    sectors: ['Casablanca'],
    matricule: '',
    phone: '',
    email: '',
    password: '',
    target: 150000,
    current: 0,
    isActive: true
  })

  const parseSectors = (cityString) => {
    if (!cityString) return ['Casablanca']
    if (Array.isArray(cityString)) return cityString
    return cityString.split(',').map(s => s.trim()).filter(Boolean)
  }

  // Calculate stats for all commercials
  const commercialsStats = useMemo(() => {
    return commercials.map(comm => calculateCommercialStats(comm, orders, clients))
  }, [commercials, orders, clients])

  // Network Executive Team Summary
  const teamSummary = useMemo(() => {
    const totalComms = commercials.length
    const activeComms = commercials.filter(c => c.isActive !== false).length
    const totalInvoices = orders.length
    const totalRevenueTtc = commercialsStats.reduce((sum, s) => sum + s.totalTtc, 0)
    const totalRevenueHt = commercialsStats.reduce((sum, s) => sum + s.totalHt, 0)

    // Leader: commercial with highest revenue
    const leader = [...commercialsStats].sort((a, b) => b.totalTtc - a.totalTtc)[0] || null

    return {
      totalComms,
      activeComms,
      inactiveComms: totalComms - activeComms,
      totalInvoices,
      totalRevenueTtc,
      totalRevenueHt,
      leader
    }
  }, [commercials, orders, commercialsStats])

  // Filtered commercials list
  const filteredCommercialsStats = useMemo(() => {
    return commercialsStats.filter(stat => {
      const c = stat.commercial
      const commSectors = parseSectors(c.city || c.sectors)

      // Status filter
      if (statusFilter === 'ACTIVE' && c.isActive === false) return false
      if (statusFilter === 'INACTIVE' && c.isActive !== false) return false

      // Sector filter
      if (sectorFilter !== 'ALL') {
        const hasSector = commSectors.some(s => s.toLowerCase() === sectorFilter.toLowerCase())
        if (!hasSector) return false
      }

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim()
        const matchName = (c.name || '').toLowerCase().includes(q)
        const matchMatricule = (c.matricule || '').toLowerCase().includes(q)
        const matchEmail = (c.email || '').toLowerCase().includes(q)
        const matchPhone = (c.phone || '').toLowerCase().includes(q)
        const matchCity = commSectors.some(s => s.toLowerCase().includes(q))
        if (!matchName && !matchMatricule && !matchEmail && !matchPhone && !matchCity) return false
      }

      return true
    })
  }, [commercialsStats, searchTerm, sectorFilter, statusFilter])

  // Add / Edit Handlers
  const handleOpenAddModal = () => {
    setEditingCommercial(null)
    setFormData({
      name: '',
      sectors: ['Casablanca'],
      matricule: `COM-00${commercials.length + 1}`,
      phone: '',
      email: '',
      password: '',
      target: 150000,
      current: 0,
      isActive: true
    })
    setCustomSectorInput('')
    setShowModal(true)
  }

  const handleOpenEditModal = (comm) => {
    setEditingCommercial(comm)
    setFormData({
      name: comm.name || '',
      sectors: parseSectors(comm.city || comm.sectors),
      matricule: comm.matricule || '',
      phone: comm.phone || '',
      email: comm.email || '',
      password: comm.password || '123456',
      target: comm.target || 150000,
      current: comm.current || 0,
      isActive: comm.isActive !== false
    })
    setCustomSectorInput('')
  }

  const handleToggleSector = (sector) => {
    const exists = formData.sectors.includes(sector)
    if (exists) {
      if (formData.sectors.length > 1) {
        setFormData({ ...formData, sectors: formData.sectors.filter(s => s !== sector) })
      }
    } else {
      setFormData({ ...formData, sectors: [...formData.sectors, sector] })
    }
  }

  const handleAddCustomSector = () => {
    const s = customSectorInput.trim()
    if (s && !formData.sectors.includes(s)) {
      setFormData({ ...formData, sectors: [...formData.sectors, s] })
      setCustomSectorInput('')
    }
  }

  const handleToggleActiveStatus = (comm) => {
    const updatedStatus = comm.isActive === false ? true : false
    const updatedComm = {
      ...comm,
      isActive: updatedStatus
    }
    updateCommercial(updatedComm)
  }

  const handleDeleteCommercial = (comm) => {
    const commOrdersCount = orders.filter(o => o.commercialName === comm.name || o.commercialDbId === comm.id).length
    const commClientsCount = clients.filter(c => c.commercialName === comm.name || c.commercialDbId === comm.id).length

    if (commOrdersCount > 0 || commClientsCount > 0) {
      const confirmDeactivate = window.confirm(
        `⚠️ ATTENTION : Le commercial "${comm.name}" a ${commOrdersCount} bon(s) de commande et ${commClientsCount} client(s) associés.\n\nPour conserver l'historique des ventes et des rapports, il est fortement recommandé de DÉSACTIVER son compte.\n\nCliquez sur "OK" pour DÉSACTIVER le compte, ou "Annuler" pour abandonner.`
      )
      if (confirmDeactivate) {
        updateCommercial({ ...comm, isActive: false })
      }
    } else {
      if (window.confirm(`Voulez-vous vraiment supprimer définitivement le compte commercial de "${comm.name}" ?`)) {
        deleteCommercial(comm.id)
      }
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name || !formData.email) return

    const sectorString = formData.sectors.join(', ')

    if (editingCommercial) {
      const updatedComm = {
        ...editingCommercial,
        name: formData.name,
        city: sectorString,
        sectors: formData.sectors,
        matricule: formData.matricule,
        phone: formData.phone,
        email: formData.email,
        password: formData.password,
        target: parseFloat(formData.target) || 150000,
        current: parseFloat(formData.current) || 0,
        isActive: formData.isActive
      }
      updateCommercial(updatedComm)
      setEditingCommercial(null)
      alert(`Compte commercial de ${updatedComm.name} mis à jour avec succès !`)
    } else {
      const newComm = {
        id: 'comm_' + Date.now(),
        name: formData.name,
        matricule: formData.matricule || `COM-00${commercials.length + 1}`,
        city: sectorString,
        sectors: formData.sectors,
        phone: formData.phone || '+212 6 61 00 00 00',
        email: formData.email,
        password: formData.password || '123456',
        target: parseFloat(formData.target) || 150000,
        current: parseFloat(formData.current) || 0,
        isActive: formData.isActive
      }

      addCommercial(newComm)
      setShowModal(false)
      alert(`Compte Commercial pour ${newComm.name} créé avec succès !`)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Header & Global Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#FFFFFF' }}>Équipe Commerciale Bardahl</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Gestion de l'équipe commerciale ({commercials.length}) • Performance Individuelle, Facturation & Produits Phares
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => generatePortfolioByCommercialPdf(clients, commercials)}
            className="btn-secondary"
            style={{ padding: '10px 16px', fontSize: '13px', color: 'var(--bardahl-yellow)', borderColor: 'var(--bardahl-yellow)', display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Télécharger l'état consolidé du portefeuille clients par représentant (PDF)"
          >
            <Download style={{ width: '16px', height: '16px' }} /> PDF Portefeuille (Tous)
          </button>

          <button onClick={handleOpenAddModal} className="btn-bardahl" style={{ padding: '10px 20px', fontSize: '13px' }}>
            <UserPlus style={{ width: '16px', height: '16px' }} /> Ajouter Commercial
          </button>
        </div>
      </div>

      {/* Team Executive Summary KPI Bar */}
      <div className="kpi-grid">
        {/* Card 1: Team Size */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255, 208, 0, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bardahl-yellow)' }}>
            <Users style={{ width: '24px', height: '24px' }} />
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Force de Vente
            </span>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#FFFFFF', marginTop: '2px' }}>
              {teamSummary.totalComms} Commerciaux
            </div>
            <div style={{ fontSize: '11px', color: '#34C759', fontWeight: '700', marginTop: '2px' }}>
              ✓ {teamSummary.activeComms} Actifs {teamSummary.inactiveComms > 0 ? `• ${teamSummary.inactiveComms} Inactifs` : ''}
            </div>
          </div>
        </div>

        {/* Card 2: Total Invoices / Orders */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(0, 122, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#007AFF' }}>
            <ShoppingCart style={{ width: '24px', height: '24px' }} />
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Factures & Bons Émis
            </span>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#FFFFFF', marginTop: '2px' }}>
              {teamSummary.totalInvoices} Factures / Bons
            </div>
            <div style={{ fontSize: '11px', color: '#007AFF', fontWeight: '700', marginTop: '2px' }}>
              Réseau commercial actif
            </div>
          </div>
        </div>

        {/* Card 3: Total Revenue */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(52, 199, 89, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34C759' }}>
            <TrendingUp style={{ width: '24px', height: '24px' }} />
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              CA Réseau Réalisé
            </span>
            <div style={{ fontSize: '18px', fontWeight: '900', color: 'var(--bardahl-yellow)', marginTop: '2px' }}>
              {formatMoney(teamSummary.totalRevenueTtc)} <span style={{ fontSize: '12px' }}>DH TTC</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              HT : {formatMoney(teamSummary.totalRevenueHt)} DH
            </div>
          </div>
        </div>

        {/* Card 4: Network Sales Leader */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255, 149, 0, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF9500' }}>
            <Award style={{ width: '24px', height: '24px' }} />
          </div>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Leader des Ventes
            </span>
            <div style={{ fontSize: '16px', fontWeight: '900', color: '#FFFFFF', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '170px' }}>
              {teamSummary.leader ? teamSummary.leader.commercial.name : '—'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--bardahl-yellow)', fontWeight: '700', marginTop: '2px' }}>
              {teamSummary.leader ? `${formatMoney(teamSummary.leader.totalTtc)} DH (${teamSummary.leader.invoicesCount} factures)` : 'Aucune donnée'}
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar: Search, Filters & View Toggle (Grille vs Liste) */}
      <div className="glass-card" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        {/* Left: Search & Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: '1 1 auto' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', minWidth: '260px', flex: '1 1 280px' }}>
            <Search style={{ width: '15px', height: '15px', position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder="Rechercher par nom, matricule, ville, email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '36px', height: '38px', fontSize: '12px', borderRadius: '10px' }}
            />
          </div>

          {/* Sector Filter */}
          <div style={{ position: 'relative', minWidth: '185px' }}>
            <MapPin style={{ width: '14px', height: '14px', position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--bardahl-yellow)', pointerEvents: 'none' }} />
            <select
              value={sectorFilter}
              onChange={e => setSectorFilter(e.target.value)}
              style={{
                width: '100%',
                height: '38px',
                paddingLeft: '34px',
                paddingRight: '30px',
                fontSize: '12px',
                fontWeight: '700',
                color: '#FFFFFF',
                backgroundColor: 'var(--bg-obsidian)',
                border: '1px solid var(--border-card)',
                borderRadius: '10px',
                cursor: 'pointer',
                outline: 'none',
                appearance: 'none',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23FFD000' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 10px center'
              }}
            >
              <option value="ALL" style={{ background: '#14171F', color: '#FFFFFF' }}>Tous les Secteurs</option>
              {AVAILABLE_SECTORS.map(sec => (
                <option key={sec} value={sec} style={{ background: '#14171F', color: '#FFFFFF' }}>{sec}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div style={{ position: 'relative', minWidth: '175px' }}>
            <Filter style={{ width: '13px', height: '13px', position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--bardahl-yellow)', pointerEvents: 'none' }} />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{
                width: '100%',
                height: '38px',
                paddingLeft: '34px',
                paddingRight: '30px',
                fontSize: '12px',
                fontWeight: '700',
                color: '#FFFFFF',
                backgroundColor: 'var(--bg-obsidian)',
                border: '1px solid var(--border-card)',
                borderRadius: '10px',
                cursor: 'pointer',
                outline: 'none',
                appearance: 'none',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23FFD000' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 10px center'
              }}
            >
              <option value="ALL" style={{ background: '#14171F', color: '#FFFFFF' }}>Tous les Statuts</option>
              <option value="ACTIVE" style={{ background: '#14171F', color: '#FFFFFF' }}>✓ Actifs uniquement</option>
              <option value="INACTIVE" style={{ background: '#14171F', color: '#FFFFFF' }}>⏸ Désactivés uniquement</option>
            </select>
          </div>
        </div>

        {/* Right: View Toggle (Grille vs Liste) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-surface)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-card)' }}>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            style={{
              padding: '6px 14px',
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
            title="Affichage en Grille (Cartes)"
          >
            <LayoutGrid style={{ width: '15px', height: '15px' }} /> Grille
          </button>

          <button
            type="button"
            onClick={() => setViewMode('table')}
            style={{
              padding: '6px 14px',
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
            title="Affichage en Liste (Tableau)"
          >
            <List style={{ width: '15px', height: '15px' }} /> Liste
          </button>
        </div>
      </div>

      {/* Main Content: Dual Display (Cards vs Table) */}
      {filteredCommercialsStats.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '50px 20px' }}>
          <AlertTriangle style={{ width: '42px', height: '42px', color: 'var(--bardahl-yellow)', margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#FFFFFF' }}>Aucun commercial trouvé</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Aucun membre de l'équipe commerciale ne correspond aux critères de recherche actuels.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* ──────── MODE 1: GRILLE (CARTES ENRICHIES AVEC ANALYTICS) ──────── */
        <div className="commercials-grid">
          {filteredCommercialsStats.map(stat => {
            const c = stat.commercial
            const isCommActive = c.isActive !== false
            const commSectors = parseSectors(c.city || c.sectors)

            return (
              <div
                key={c.id}
                className="glass-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  opacity: isCommActive ? 1 : 0.75,
                  border: isCommActive ? '1px solid var(--border-card)' : '1px solid rgba(255, 69, 58, 0.4)',
                  position: 'relative'
                }}
              >
                <div>
                  {/* Card Header: Avatar + Info + Status */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '14px',
                        background: isCommActive ? 'linear-gradient(135deg, var(--bardahl-yellow), #E5B800)' : '#3A3F4D',
                        color: isCommActive ? '#0D0F12' : '#FFFFFF',
                        fontWeight: '900',
                        fontSize: '17px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: isCommActive ? '0 4px 15px rgba(255, 208, 0, 0.3)' : 'none'
                      }}>
                        {c.name ? c.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'CB'}
                      </div>
                      <div>
                        <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#FFFFFF', lineHeight: 1.2 }}>{c.name}</h3>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          Matricule : <strong style={{ color: '#FFFFFF' }}>{c.matricule}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Active/Inactive Badge */}
                    <span style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      padding: '3px 8px',
                      borderRadius: '8px',
                      background: isCommActive ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 69, 58, 0.15)',
                      color: isCommActive ? '#34C759' : '#FF453A',
                      border: isCommActive ? '1px solid rgba(52, 199, 89, 0.4)' : '1px solid rgba(255, 69, 58, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {isCommActive ? <ShieldCheck style={{ width: '12px', height: '12px' }} /> : <ShieldAlert style={{ width: '12px', height: '12px' }} />}
                      {isCommActive ? 'Actif' : 'Désactivé'}
                    </span>
                  </div>

                  {/* Sectors Badges */}
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {commSectors.map((sec, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: '10px',
                            fontWeight: '700',
                            padding: '2px 7px',
                            borderRadius: '6px',
                            background: 'rgba(255, 208, 0, 0.1)',
                            color: 'var(--bardahl-yellow)',
                            border: '1px solid rgba(255, 208, 0, 0.25)'
                          }}
                        >
                          📍 {sec}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Contact details */}
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Phone style={{ width: '13px', height: '13px', color: 'var(--bardahl-yellow)' }} />
                      <span>{c.phone || '+212 6 61 00 00 00'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Mail style={{ width: '13px', height: '13px', color: 'var(--bardahl-yellow)' }} />
                      <span style={{ color: '#FFFFFF' }}>{c.email}</span>
                    </div>
                  </div>

                  {/* 🌟 INTEGRATED ANALYTICS HIGHLIGHT BOX (Factures, CA & Top Produit) */}
                  <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-card)', marginBottom: '12px' }}>
                    {/* 3 Analytics Metrics Columns */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>Factures</div>
                        <div style={{ fontSize: '14px', fontWeight: '900', color: '#007AFF', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <ShoppingCart style={{ width: '12px', height: '12px' }} /> {stat.invoicesCount}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>CA Réalisé</div>
                        <div style={{ fontSize: '14px', fontWeight: '900', color: 'var(--bardahl-yellow)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {formatMoney(stat.totalTtc)}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>Clients</div>
                        <div style={{ fontSize: '14px', fontWeight: '900', color: '#34C759', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          <Users style={{ width: '12px', height: '12px' }} /> {stat.assignedClientsCount}
                        </div>
                      </div>
                    </div>

                    {/* Top Selling Product Pill */}
                    <div style={{ background: 'rgba(255, 208, 0, 0.06)', padding: '8px 10px', borderRadius: '8px', border: '1px dashed rgba(255, 208, 0, 0.3)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--bardahl-yellow)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Award style={{ width: '12px', height: '12px' }} /> Produit Phare Vendu :
                        </span>
                        {stat.topProduct && (
                          <span style={{ fontSize: '10px', fontWeight: '800', color: '#34C759' }}>
                            {stat.topProduct.quantity} unités
                          </span>
                        )}
                      </div>
                      {stat.topProduct ? (
                        <div style={{ fontSize: '11px', fontWeight: '700', color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {stat.topProduct.name}
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', marginLeft: '6px' }}>
                            ({formatMoney(stat.topProduct.revenue)} DH)
                          </span>
                        </div>
                      ) : (
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          En attente de commandes enregistrées
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Monthly Performance Target Gauge */}
                  <div style={{ background: 'var(--bg-obsidian)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-card)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: '700', marginBottom: '6px' }}>
                      <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Target style={{ width: '12px', height: '12px', color: 'var(--bardahl-yellow)' }} /> Objectif Mensuel
                      </span>
                      <span style={{
                        color: stat.targetPercent >= 100 ? '#34C759' : stat.targetPercent >= 60 ? 'var(--bardahl-yellow)' : '#FF9500',
                        fontWeight: '900'
                      }}>
                        {stat.targetPercent}%
                      </span>
                    </div>

                    <div style={{ width: '100%', height: '6px', background: '#2B313E', borderRadius: '10px', overflow: 'hidden', marginBottom: '6px' }}>
                      <div style={{
                        width: `${Math.min(100, stat.targetPercent)}%`,
                        height: '100%',
                        background: stat.targetPercent >= 100 ? '#34C759' : 'linear-gradient(90deg, #FFD000, #34C759)',
                        borderRadius: '10px',
                        transition: 'width 0.5s ease'
                      }}></div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: '800' }}>
                      <span style={{ color: 'var(--bardahl-yellow)' }}>{formatMoney(stat.totalTtc)} DH</span>
                      <span style={{ color: 'var(--text-secondary)' }}>Cible : {formatMoney(stat.target)} DH</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div style={{ paddingTop: '12px', marginTop: '12px', borderTop: '1px solid var(--border-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '6px' }}>
                  {/* Left: Analytics BI Button */}
                  <button
                    onClick={() => setSelectedCommercialAnalytics(stat)}
                    className="btn-bardahl"
                    style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="Ouvrir la fiche d'analyses BI complète de ce commercial"
                  >
                    <BarChart3 style={{ width: '13px', height: '13px' }} /> Analyses
                  </button>

                  {/* Right Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <button
                      onClick={() => handleToggleActiveStatus(c)}
                      style={{
                        padding: '5px 8px',
                        fontSize: '11px',
                        fontWeight: '700',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: isCommActive ? 'rgba(255, 69, 58, 0.12)' : 'rgba(52, 199, 89, 0.12)',
                        color: isCommActive ? '#FF453A' : '#34C759',
                        border: isCommActive ? '1px solid rgba(255, 69, 58, 0.3)' : '1px solid rgba(52, 199, 89, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                      title={isCommActive ? "Désactiver ce commercial" : "Réactiver ce commercial"}
                    >
                      <Power style={{ width: '11px', height: '11px' }} />
                    </button>

                    <button
                      onClick={() => generatePortfolioByCommercialPdf(clients, commercials, c.dbId || c.id)}
                      className="btn-secondary"
                      style={{ padding: '5px 8px', fontSize: '11px', color: '#007AFF', borderColor: '#007AFF', display: 'flex', alignItems: 'center', gap: '4px' }}
                      title="Télécharger la liste des clients de ce commercial en PDF"
                    >
                      <FileText style={{ width: '12px', height: '12px' }} />
                    </button>

                    <button
                      onClick={() => handleOpenEditModal(c)}
                      className="btn-secondary"
                      style={{ padding: '5px 8px', fontSize: '11px', color: 'var(--bardahl-yellow)', borderColor: 'var(--bardahl-yellow)' }}
                      title="Modifier les coordonnées et objectifs"
                    >
                      <Edit3 style={{ width: '12px', height: '12px' }} />
                    </button>

                    <button
                      onClick={() => handleDeleteCommercial(c)}
                      style={{ padding: '5px 8px', fontSize: '11px', color: '#FF453A', background: 'rgba(255, 69, 58, 0.1)', border: '1px solid rgba(255, 69, 58, 0.3)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      title="Supprimer définitivement"
                    >
                      <Trash2 style={{ width: '12px', height: '12px' }} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* ──────── MODE 2: LISTE / TABLEAU MODERNE (AVEC COLONNES ANALYTICS) ──────── */
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="custom-table" style={{ margin: 0, width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ minWidth: '190px' }}>Commercial</th>
                  <th style={{ minWidth: '90px' }}>Statut</th>
                  <th style={{ minWidth: '150px' }}>Secteurs Assignés</th>
                  <th style={{ minWidth: '100px', textAlign: 'center' }}>Factures</th>
                  <th style={{ minWidth: '140px' }}>CA Réalisé (TTC)</th>
                  <th style={{ minWidth: '220px' }}>Produit Plus Vendu (Top Vente)</th>
                  <th style={{ minWidth: '170px' }}>Objectif & Réalisation</th>
                  <th style={{ minWidth: '80px', textAlign: 'center' }}>Clients</th>
                  <th style={{ minWidth: '160px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCommercialsStats.map(stat => {
                  const c = stat.commercial
                  const isCommActive = c.isActive !== false
                  const commSectors = parseSectors(c.city || c.sectors)

                  return (
                    <tr key={c.id} style={{ opacity: isCommActive ? 1 : 0.75 }}>
                      {/* Commercial Profile */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: isCommActive ? 'var(--bardahl-yellow)' : '#3A3F4D',
                            color: isCommActive ? '#0D0F12' : '#FFFFFF',
                            fontWeight: '900',
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {c.name ? c.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'CB'}
                          </div>
                          <div>
                            <div style={{ fontWeight: '800', color: '#FFFFFF', fontSize: '13px' }}>{c.name}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              {c.matricule} • {c.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Statut Badge */}
                      <td>
                        <button
                          onClick={() => handleToggleActiveStatus(c)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '8px',
                            fontSize: '10px',
                            fontWeight: '800',
                            cursor: 'pointer',
                            background: isCommActive ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 69, 58, 0.15)',
                            color: isCommActive ? '#34C759' : '#FF453A',
                            border: isCommActive ? '1px solid rgba(52, 199, 89, 0.4)' : '1px solid rgba(255, 69, 58, 0.4)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="Cliquer pour changer le statut"
                        >
                          {isCommActive ? <ShieldCheck style={{ width: '11px', height: '11px' }} /> : <ShieldAlert style={{ width: '11px', height: '11px' }} />}
                          {isCommActive ? 'Actif' : 'Désactivé'}
                        </button>
                      </td>

                      {/* Secteurs */}
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '200px' }}>
                          {commSectors.slice(0, 3).map((sec, idx) => (
                            <span
                              key={idx}
                              style={{
                                fontSize: '10px',
                                fontWeight: '700',
                                padding: '2px 6px',
                                borderRadius: '5px',
                                background: 'rgba(255, 208, 0, 0.1)',
                                color: 'var(--bardahl-yellow)',
                                border: '1px solid rgba(255, 208, 0, 0.25)'
                              }}
                            >
                              {sec}
                            </span>
                          ))}
                          {commSectors.length > 3 && (
                            <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: '700', alignSelf: 'center' }}>
                              +{commSectors.length - 3}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Factures Émises */}
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '3px 8px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: '800',
                          background: 'rgba(0, 122, 255, 0.12)',
                          color: '#007AFF',
                          border: '1px solid rgba(0, 122, 255, 0.3)'
                        }}>
                          <ShoppingCart style={{ width: '11px', height: '11px' }} /> {stat.invoicesCount} bons
                        </span>
                      </td>

                      {/* CA Réalisé */}
                      <td>
                        <div style={{ fontWeight: '900', color: 'var(--bardahl-yellow)', fontSize: '13px' }}>
                          {formatMoney(stat.totalTtc)} DH
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                          HT : {formatMoney(stat.totalHt)} DH
                        </div>
                      </td>

                      {/* Produit Plus Vendu */}
                      <td>
                        {stat.topProduct ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <div style={{ fontWeight: '700', color: '#FFFFFF', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '210px' }}>
                              🏆 {stat.topProduct.name}
                            </div>
                            <div style={{ fontSize: '10px', color: '#34C759', fontWeight: '800' }}>
                              {stat.topProduct.quantity} vendus • {formatMoney(stat.topProduct.revenue)} DH
                            </div>
                          </div>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                            Aucune vente enregistrée
                          </span>
                        )}
                      </td>

                      {/* Objectif vs Réalisé */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '800', color: stat.targetPercent >= 100 ? '#34C759' : 'var(--bardahl-yellow)' }}>
                            {stat.targetPercent}%
                          </span>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                            Cible: {formatMoney(stat.target)} DH
                          </span>
                        </div>
                        <div style={{ width: '100%', height: '5px', background: '#2B313E', borderRadius: '10px', overflow: 'hidden' }}>
                          <div style={{
                            width: `${Math.min(100, stat.targetPercent)}%`,
                            height: '100%',
                            background: stat.targetPercent >= 100 ? '#34C759' : 'linear-gradient(90deg, #FFD000, #34C759)',
                            borderRadius: '10px'
                          }}></div>
                        </div>
                      </td>

                      {/* Clients Portefeuille */}
                      <td style={{ textAlign: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#34C759' }}>
                          {stat.assignedClientsCount}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <button
                            onClick={() => setSelectedCommercialAnalytics(stat)}
                            className="btn-bardahl"
                            style={{ padding: '5px 8px', fontSize: '10px', display: 'flex', alignItems: 'center', gap: '3px' }}
                            title="Consulter les analyses complètes de ce commercial"
                          >
                            <BarChart3 style={{ width: '12px', height: '12px' }} /> BI
                          </button>

                          <button
                            onClick={() => generatePortfolioByCommercialPdf(clients, commercials, c.dbId || c.id)}
                            className="btn-secondary"
                            style={{ padding: '5px 8px', fontSize: '10px', color: '#007AFF', borderColor: '#007AFF' }}
                            title="Télécharger la liste des clients en PDF"
                          >
                            <FileText style={{ width: '12px', height: '12px' }} />
                          </button>

                          <button
                            onClick={() => handleOpenEditModal(c)}
                            className="btn-secondary"
                            style={{ padding: '5px 8px', fontSize: '10px', color: 'var(--bardahl-yellow)', borderColor: 'var(--bardahl-yellow)' }}
                            title="Modifier"
                          >
                            <Edit3 style={{ width: '12px', height: '12px' }} />
                          </button>

                          <button
                            onClick={() => handleDeleteCommercial(c)}
                            style={{ padding: '5px 8px', fontSize: '10px', color: '#FF453A', background: 'rgba(255, 69, 58, 0.1)', border: '1px solid rgba(255, 69, 58, 0.3)', borderRadius: '6px', cursor: 'pointer' }}
                            title="Supprimer"
                          >
                            <Trash2 style={{ width: '12px', height: '12px' }} />
                          </button>
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

      {/* ──────── MODAL D'ANALYSES BI INDIVIDUELLE DU COMMERCIAL ──────── */}
      {selectedCommercialAnalytics && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 1000 }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '860px', maxHeight: '92vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px', padding: '24px' }}>

            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '14px', borderBottom: '1px solid var(--border-card)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '50px',
                  height: '50px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, var(--bardahl-yellow), #E5B800)',
                  color: '#0D0F12',
                  fontWeight: '900',
                  fontSize: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 15px rgba(255, 208, 0, 0.3)'
                }}>
                  {selectedCommercialAnalytics.commercial.name ? selectedCommercialAnalytics.commercial.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'CB'}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#FFFFFF' }}>
                      {selectedCommercialAnalytics.commercial.name}
                    </h2>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: '800',
                      padding: '2px 7px',
                      borderRadius: '6px',
                      background: selectedCommercialAnalytics.commercial.isActive !== false ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 69, 58, 0.15)',
                      color: selectedCommercialAnalytics.commercial.isActive !== false ? '#34C759' : '#FF453A',
                      border: selectedCommercialAnalytics.commercial.isActive !== false ? '1px solid rgba(52, 199, 89, 0.4)' : '1px solid rgba(255, 69, 58, 0.4)'
                    }}>
                      {selectedCommercialAnalytics.commercial.isActive !== false ? '✓ En Activité' : '⏸ Désactivé'}
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Matricule : <strong style={{ color: '#FFFFFF' }}>{selectedCommercialAnalytics.commercial.matricule}</strong> • Secteurs : <strong style={{ color: 'var(--bardahl-yellow)' }}>{parseSectors(selectedCommercialAnalytics.commercial.city || selectedCommercialAnalytics.commercial.sectors).join(', ')}</strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedCommercialAnalytics(null)}
                style={{ color: 'var(--text-secondary)', fontSize: '24px', cursor: 'pointer', background: 'none', border: 'none', padding: '4px' }}
                title="Fermer"
              >
                <X style={{ width: '22px', height: '22px' }} />
              </button>
            </div>

            {/* 4 Performance KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
              <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-card)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>CA Réalisé (TTC)</span>
                <div style={{ fontSize: '16px', fontWeight: '900', color: 'var(--bardahl-yellow)', marginTop: '4px' }}>
                  {formatMoney(selectedCommercialAnalytics.totalTtc)} DH
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  HT : {formatMoney(selectedCommercialAnalytics.totalHt)} DH
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-card)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>Volume Factures</span>
                <div style={{ fontSize: '16px', fontWeight: '900', color: '#007AFF', marginTop: '4px' }}>
                  {selectedCommercialAnalytics.invoicesCount} Factures
                </div>
                <div style={{ fontSize: '10px', color: '#34C759', marginTop: '2px' }}>
                  {selectedCommercialAnalytics.validatedCount} validées
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-card)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>Panier Moyen</span>
                <div style={{ fontSize: '16px', fontWeight: '900', color: '#FFFFFF', marginTop: '4px' }}>
                  {formatMoney(selectedCommercialAnalytics.panierMoyen)} DH
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Moyenne / commande
                </div>
              </div>

              <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-card)' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>Atteinte Objectif</span>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '900',
                  color: selectedCommercialAnalytics.targetPercent >= 100 ? '#34C759' : 'var(--bardahl-yellow)',
                  marginTop: '4px'
                }}>
                  {selectedCommercialAnalytics.targetPercent}%
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Cible : {formatMoney(selectedCommercialAnalytics.target)} DH
                </div>
              </div>
            </div>

            {/* Top 5 Best-Selling Products Section */}
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#FFFFFF', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award style={{ width: '16px', height: '16px', color: 'var(--bardahl-yellow)' }} />
                Top 5 Produits Bardahl les Plus Vendus par ce Commercial
              </h3>

              <div style={{ borderRadius: '12px', border: '1px solid var(--border-card)', overflow: 'hidden' }}>
                <table className="custom-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ width: '50px' }}>Rang</th>
                      <th>Produit Bardahl</th>
                      <th>Famille</th>
                      <th style={{ textAlign: 'center' }}>Quantité Vendue</th>
                      <th style={{ textAlign: 'right' }}>Chiffre d'Affaires</th>
                      <th style={{ textAlign: 'right' }}>Part du CA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCommercialAnalytics.topProductsList.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                          Aucun produit vendu pour le moment dans les bons de commande de ce commercial.
                        </td>
                      </tr>
                    ) : (
                      selectedCommercialAnalytics.topProductsList.map((prod, idx) => {
                        const share = selectedCommercialAnalytics.totalTtc > 0
                          ? Math.round((prod.revenue / selectedCommercialAnalytics.totalTtc) * 100)
                          : 0

                        return (
                          <tr key={idx}>
                            <td>
                              <span style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '11px',
                                fontWeight: '900',
                                background: idx === 0 ? 'var(--bardahl-yellow)' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : 'rgba(255,255,255,0.1)',
                                color: idx < 3 ? '#0D0F12' : '#FFFFFF'
                              }}>
                                #{idx + 1}
                              </span>
                            </td>
                            <td>
                              <div style={{ fontWeight: '800', color: '#FFFFFF', fontSize: '13px' }}>{prod.name}</div>
                              {prod.reference && (
                                <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Réf : {prod.reference}</div>
                              )}
                            </td>
                            <td>
                              <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(255, 208, 0, 0.1)', color: 'var(--bardahl-yellow)', fontWeight: '700' }}>
                                {prod.family}
                              </span>
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: '800', color: '#34C759', fontSize: '13px' }}>
                              {prod.quantity} unités
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: '900', color: 'var(--bardahl-yellow)', fontSize: '13px' }}>
                              {formatMoney(prod.revenue)} DH
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: '800', color: '#007AFF', fontSize: '12px' }}>
                              {share}%
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Sales Distribution Across Bardahl Families */}
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#FFFFFF', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp style={{ width: '16px', height: '16px', color: 'var(--bardahl-yellow)' }} />
                Répartition des Ventes par Gamme de Produits
              </h3>

              <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-card)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Object.entries(selectedCommercialAnalytics.familyMap).map(([family, data]) => {
                  const percent = selectedCommercialAnalytics.totalTtc > 0
                    ? Math.round((data.revenue / selectedCommercialAnalytics.totalTtc) * 100)
                    : 0

                  return (
                    <div key={family}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700', marginBottom: '4px' }}>
                        <span style={{ color: '#FFFFFF' }}>{family}</span>
                        <span style={{ color: 'var(--bardahl-yellow)' }}>
                          {formatMoney(data.revenue)} DH ({data.count} pcs - {percent}%)
                        </span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: '#2B313E', borderRadius: '10px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${percent}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, #FFD000, #34C759)',
                          borderRadius: '10px'
                        }}></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Recent Orders / Invoices History */}
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#FFFFFF', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShoppingCart style={{ width: '16px', height: '16px', color: 'var(--bardahl-yellow)' }} />
                Derniers Bons de Commande Émis ({selectedCommercialAnalytics.orders.length})
              </h3>

              <div style={{ borderRadius: '12px', border: '1px solid var(--border-card)', overflow: 'hidden' }}>
                <table className="custom-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th>N° Bon</th>
                      <th>Date</th>
                      <th>Client</th>
                      <th>Ville</th>
                      <th>Statut</th>
                      <th style={{ textAlign: 'right' }}>Total TTC</th>
                      <th style={{ textAlign: 'center' }}>PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCommercialAnalytics.orders.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: 'var(--text-secondary)' }}>
                          Aucun bon de commande associé à ce commercial.
                        </td>
                      </tr>
                    ) : (
                      selectedCommercialAnalytics.orders.slice(0, 5).map(o => (
                        <tr key={o.id}>
                          <td><strong style={{ color: '#FFFFFF' }}>{o.orderNumber}</strong></td>
                          <td>{o.date}</td>
                          <td>{o.clientName || 'Client Bardahl'}</td>
                          <td>{o.clientCity || '—'}</td>
                          <td>
                            <span className={`badge-status ${o.status}`}>{o.status}</span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: '900', color: 'var(--bardahl-yellow)' }}>
                            {formatMoney(o.totalTtc)} DH
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              onClick={() => generateOrderPdf(o)}
                              className="btn-secondary"
                              style={{ padding: '4px 8px', fontSize: '10px' }}
                              title="Télécharger le bon en PDF"
                            >
                              <FileText style={{ width: '11px', height: '11px' }} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Actions Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--border-card)' }}>
              <button
                onClick={() => generatePortfolioByCommercialPdf(clients, commercials, selectedCommercialAnalytics.commercial.dbId || selectedCommercialAnalytics.commercial.id)}
                className="btn-secondary"
                style={{ padding: '8px 14px', fontSize: '12px', color: '#007AFF', borderColor: '#007AFF', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Download style={{ width: '14px', height: '14px' }} /> PDF Portefeuille Clients
              </button>

              <button
                onClick={() => setSelectedCommercialAnalytics(null)}
                className="btn-bardahl"
                style={{ padding: '8px 20px', fontSize: '12px' }}
              >
                Fermer la Fiche BI
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Commercial Account Modal with Multi-Sectors Selection */}
      {(showModal || editingCommercial) && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 1000 }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border-card)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Contact style={{ width: '20px', height: '20px', color: 'var(--bardahl-yellow)' }} />
                {editingCommercial ? `Modifier le Profil de ${editingCommercial.name}` : 'Nouveau Commercial (Multi-Secteurs)'}
              </h3>
              <button onClick={() => { setShowModal(false); setEditingCommercial(null); }} style={{ color: 'var(--text-secondary)', fontSize: '24px', cursor: 'pointer', background: 'none', border: 'none' }}>
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '700' }}>Nom et Prénom *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="input-field"
                  placeholder="Ex: Hicham Bennani"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '700' }}>Adresse Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="input-field"
                    placeholder="hicham@bardahl.ma"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '700' }}>Mot de Passe *</label>
                  <input
                    type="text"
                    required
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="input-field"
                    placeholder="123456"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '700' }}>Téléphone *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="input-field"
                    placeholder="+212 6 61 55 66 77"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '700' }}>Matricule *</label>
                  <input
                    type="text"
                    required
                    value={formData.matricule}
                    onChange={e => setFormData({...formData, matricule: e.target.value})}
                    className="input-field"
                    placeholder="COM-004"
                  />
                </div>
              </div>

              {/* Multi-Sectors Assignment */}
              <div style={{ background: '#14171F', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-card)' }}>
                <label style={{ fontSize: '12px', color: 'var(--bardahl-yellow)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px', fontWeight: '800' }}>
                  <MapPin style={{ width: '14px', height: '14px' }} /> Secteurs & Villes Disponibles (Sélection Multiple) :
                </label>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                  {AVAILABLE_SECTORS.map(sec => {
                    const isSelected = formData.sectors.includes(sec)
                    return (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => handleToggleSector(sec)}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          background: isSelected ? 'var(--bardahl-yellow)' : '#0D0F12',
                          color: isSelected ? '#0D0F12' : 'var(--text-secondary)',
                          border: isSelected ? '1px solid var(--bardahl-yellow)' : '1px solid var(--border-card)'
                        }}
                      >
                        {isSelected ? `✓ ${sec}` : sec}
                      </button>
                    )
                  })}
                </div>

                {/* Add Custom Sector */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    value={customSectorInput}
                    onChange={e => setCustomSectorInput(e.target.value)}
                    placeholder="Autre secteur / ville..."
                    className="input-field"
                    style={{ fontSize: '11px', padding: '6px 10px' }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomSector(); } }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomSector}
                    className="btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '11px', whiteSpace: 'nowrap' }}
                  >
                    <Plus style={{ width: '14px', height: '14px' }} /> Ajouter
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '700' }}>Objectif Mensuel (DH) *</label>
                  <input
                    type="number"
                    required
                    value={formData.target}
                    onChange={e => setFormData({...formData, target: parseFloat(e.target.value) || 0})}
                    className="input-field"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '700' }}>Statut du Compte</label>
                  <select
                    value={formData.isActive ? 'ACTIF' : 'INACTIF'}
                    onChange={e => setFormData({ ...formData, isActive: e.target.value === 'ACTIF' })}
                    className="input-field"
                  >
                    <option value="ACTIF">✓ Actif (En activité)</option>
                    <option value="INACTIF">⏸ Désactivé (Inactif)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid var(--border-card)' }}>
                <button type="button" onClick={() => { setShowModal(false); setEditingCommercial(null); }} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '12px' }}>
                  Annuler
                </button>
                <button type="submit" className="btn-bardahl" style={{ padding: '8px 16px', fontSize: '12px' }}>
                  <CheckCircle2 style={{ width: '16px', height: '16px' }} /> {editingCommercial ? 'Enregistrer Modifications' : 'Créer Compte Commercial'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
