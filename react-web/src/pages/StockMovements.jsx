import React, { useState, useMemo } from 'react'
import {
  Boxes, Package, AlertTriangle, TrendingDown, ArrowDownRight, ArrowUpRight,
  Filter, FileSpreadsheet, FileText, Search, Gift, Sparkles, CheckCircle2,
  AlertCircle, RefreshCw, ShieldAlert, Layers, BarChart3, ChevronRight, Sliders
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { getProductUnitsPerCarton } from '../data/productsData'
import { getFamilyInfo } from '../data/familiesData'
import { exportStockMovementsToExcel } from '../utils/excelExporter'
import { generateStockReportPdf } from '../utils/pdfGenerator'

export default function StockMovements() {
  const { products = [], orders = [], promotions = [], productFamilies = [], currentUser } = useApp()

  const isAdmin = currentUser?.role === 'ADMIN'

  // Filter States
  const [selectedPromoId, setSelectedPromoId] = useState('ALL')
  const [selectedProdRef, setSelectedProdRef] = useState('ALL')
  const [movementTypeFilter, setMovementTypeFilter] = useState('ALL')
  const [stockStatusFilter, setStockStatusFilter] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  // 1. Build Comprehensive Stock Matrix & Activity Ledger
  const { productStockMatrix, movementLedger, activePromoProducts } = useMemo(() => {
    // Map product metadata
    const prodMap = new Map()
    products.forEach(p => {
      const ref = p.reference || p.id
      prodMap.set(ref, p)
      if (p.id) prodMap.set(p.id, p)
    })

    // Active promotions and their targeted product references/families
    const activePromos = promotions.filter(p => p.isActive !== false)
    const promoProdsSet = new Set()

    activePromos.forEach(p => {
      if (p.targetType === 'FAMILY') {
        products.forEach(prod => {
          const famInfo = getFamilyInfo(prod.category, productFamilies)
          if ((famInfo.label || '').toLowerCase() === (p.targetFamily || '').toLowerCase() ||
              (famInfo.code || '').toLowerCase() === (p.targetFamily || '').toLowerCase()) {
            promoProdsSet.add(prod.reference || prod.id)
          }
        })
      } else {
        const targetRefs = (p.targetProductRefs && Array.isArray(p.targetProductRefs) && p.targetProductRefs.length > 0)
          ? p.targetProductRefs
          : (p.targetProductRef ? [p.targetProductRef] : (p.targetProductId ? [p.targetProductId] : []))
        
        targetRefs.forEach(r => promoProdsSet.add(r))
      }

      if (p.freeProductRef) promoProdsSet.add(p.freeProductRef)
      if (p.freeProductId) promoProdsSet.add(p.freeProductId)
    })

    // Ledger entries
    const ledger = []

    orders.forEach(order => {
      const isCancelled = order.status === 'CANCELLED'
      const itemsList = order.items || []

      itemsList.forEach((it, idx) => {
        const prod = prodMap.get(it.reference) || prodMap.get(it.productId) || it
        const upb = prod.unitsPerBox || getProductUnitsPerCarton(prod) || 12
        const qtyOrdered = parseInt(it.qty || 0, 10)
        const qtyFree = parseInt(it.qtyGratuit || it.freeQuantity || 0, 10)
        const ref = it.reference || prod.reference || 'REF'
        const name = it.productName || prod.name || 'Produit Bardahl'
        const category = prod.category || 'Bardahl'

        // Check matching promo
        const matchedPromo = activePromos.find(ap => 
          ap.name === it.promoTag || (it.promoTag && it.promoTag.includes(ap.name))
        ) || (order.appliedPromotions && order.appliedPromotions[0])

        const promoName = matchedPromo ? matchedPromo.name : (it.promoTag || 'Standard')

        if (isCancelled) {
          if (qtyOrdered > 0 || qtyFree > 0) {
            const totalRestoredUnits = qtyOrdered + qtyFree
            ledger.push({
              id: `led_cancel_${order.id}_${idx}`,
              date: order.date || '',
              orderNumber: order.orderNumber,
              type: 'RESTITUTION',
              typeLabel: '↩️ Restitution (Annulation)',
              reference: ref,
              productName: name,
              category,
              units: totalRestoredUnits,
              cartons: Math.ceil(totalRestoredUnits / upb),
              promoName,
              clientName: order.clientName,
              commercialName: order.commercialName,
              remainingStock: parseInt(prod.stock !== undefined ? prod.stock : 100, 10)
            })
          }
        } else {
          // Regular Sales Outflow
          if (qtyOrdered > 0) {
            ledger.push({
              id: `led_sale_${order.id}_${idx}`,
              date: order.date || '',
              orderNumber: order.orderNumber,
              type: 'VENTE',
              typeLabel: '📦 Vente Bon de Commande',
              reference: ref,
              productName: name,
              category,
              units: qtyOrdered,
              cartons: Math.floor(qtyOrdered / upb),
              promoName,
              clientName: order.clientName,
              commercialName: order.commercialName,
              remainingStock: parseInt(prod.stock !== undefined ? prod.stock : 100, 10)
            })
          }

          // Free Gift Outflow
          if (qtyFree > 0) {
            ledger.push({
              id: `led_gift_${order.id}_${idx}`,
              date: order.date || '',
              orderNumber: order.orderNumber,
              type: 'CADEAU',
              typeLabel: '🎁 Cadeau Offert Déduit',
              reference: ref,
              productName: name,
              category,
              units: qtyFree,
              cartons: Math.floor(qtyFree / upb) || 1,
              promoName,
              clientName: order.clientName,
              commercialName: order.commercialName,
              remainingStock: parseInt(prod.stock !== undefined ? prod.stock : 100, 10)
            })
          }
        }
      })
    })

    // Sort ledger by date descending
    ledger.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))

    // Build Product Matrix
    const matrix = products.map(p => {
      const ref = p.reference || p.id
      const upb = p.unitsPerBox || getProductUnitsPerCarton(p) || 12
      const currentStock = parseInt(p.stock !== undefined ? p.stock : 100, 10)

      let totalSalesUnits = 0
      let totalGiftUnits = 0
      let totalRestoredUnits = 0

      ledger.forEach(l => {
        if (l.reference === ref || l.productName === p.name) {
          if (l.type === 'VENTE') totalSalesUnits += l.units
          if (l.type === 'CADEAU') totalGiftUnits += l.units
          if (l.type === 'RESTITUTION') totalRestoredUnits += l.units
        }
      })

      const isPromoTarget = promoProdsSet.has(ref) || promoProdsSet.has(p.id)
      const linkedPromosList = activePromos.filter(ap => {
        if (ap.targetType === 'FAMILY') {
          const famInfo = getFamilyInfo(p.category, productFamilies)
          return (famInfo.label || '').toLowerCase() === (ap.targetFamily || '').toLowerCase() ||
                 (famInfo.code || '').toLowerCase() === (ap.targetFamily || '').toLowerCase()
        }
        const tRefs = (ap.targetProductRefs && Array.isArray(ap.targetProductRefs)) ? ap.targetProductRefs : [ap.targetProductRef || ap.targetProductId]
        return tRefs.includes(ref) || tRefs.includes(p.id) || ap.freeProductRef === ref || ap.freeProductId === p.id
      })

      let stockStatus = 'OK'
      if (currentStock <= 12) stockStatus = 'CRITICAL'
      else if (currentStock <= 36) stockStatus = 'WARNING'

      return {
        ...p,
        reference: ref,
        unitsPerBox: upb,
        stock: currentStock,
        cartonsStock: Math.floor(currentStock / upb),
        totalSalesUnits,
        totalGiftUnits,
        totalRestoredUnits,
        isPromoTarget,
        linkedPromos: linkedPromosList,
        stockStatus
      }
    })

    return {
      productStockMatrix: matrix,
      movementLedger: ledger,
      activePromoProducts: Array.from(promoProdsSet)
    }
  }, [products, orders, promotions, productFamilies])

  // Filtered Ledger and Matrix
  const filteredMatrix = useMemo(() => {
    return productStockMatrix.filter(item => {
      // Promo filter
      if (selectedPromoId === 'PROMO_ONLY' && !item.isPromoTarget) return false
      if (selectedPromoId !== 'ALL' && selectedPromoId !== 'PROMO_ONLY') {
        const hasPromo = item.linkedPromos.some(p => p.id === selectedPromoId)
        if (!hasPromo) return false
      }

      // Product reference filter
      if (selectedProdRef !== 'ALL' && item.reference !== selectedProdRef && item.id !== selectedProdRef) {
        return false
      }

      // Stock status filter
      if (stockStatusFilter !== 'ALL' && item.stockStatus !== stockStatusFilter) {
        return false
      }

      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matchRef = (item.reference || '').toLowerCase().includes(q)
        const matchName = (item.name || '').toLowerCase().includes(q)
        const matchCat = (item.category || '').toLowerCase().includes(q)
        const matchPromo = item.linkedPromos.some(p => p.name.toLowerCase().includes(q))
        return matchRef || matchName || matchCat || matchPromo
      }

      return true
    })
  }, [productStockMatrix, selectedPromoId, selectedProdRef, stockStatusFilter, searchQuery])

  const filteredLedger = useMemo(() => {
    return movementLedger.filter(leg => {
      // Promo filter
      if (selectedPromoId !== 'ALL' && selectedPromoId !== 'PROMO_ONLY') {
        const promoObj = promotions.find(p => p.id === selectedPromoId)
        if (promoObj && leg.promoName !== promoObj.name && !leg.promoName.includes(promoObj.name)) {
          return false
        }
      }

      // Product reference filter
      if (selectedProdRef !== 'ALL' && leg.reference !== selectedProdRef) {
        return false
      }

      // Movement type filter
      if (movementTypeFilter !== 'ALL' && leg.type !== movementTypeFilter) {
        return false
      }

      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matchRef = (leg.reference || '').toLowerCase().includes(q)
        const matchName = (leg.productName || '').toLowerCase().includes(q)
        const matchOrder = (leg.orderNumber || '').toLowerCase().includes(q)
        const matchClient = (leg.clientName || '').toLowerCase().includes(q)
        const matchComm = (leg.commercialName || '').toLowerCase().includes(q)
        const matchPromo = (leg.promoName || '').toLowerCase().includes(q)
        return matchRef || matchName || matchOrder || matchClient || matchComm || matchPromo
      }

      return true
    })
  }, [movementLedger, selectedPromoId, selectedProdRef, movementTypeFilter, searchQuery, promotions])

  // Summary KPIs
  const kpiStats = useMemo(() => {
    const totalPromoItems = productStockMatrix.filter(p => p.isPromoTarget).length
    const criticalStockCount = productStockMatrix.filter(p => p.stockStatus === 'CRITICAL').length
    const warningStockCount = productStockMatrix.filter(p => p.stockStatus === 'WARNING').length
    const totalGiftsUnits = movementLedger.filter(l => l.type === 'CADEAU').reduce((sum, l) => sum + l.units, 0)
    const totalSalesUnits = movementLedger.filter(l => l.type === 'VENTE').reduce((sum, l) => sum + l.units, 0)

    return {
      totalPromoItems,
      criticalStockCount,
      warningStockCount,
      totalGiftsUnits,
      totalSalesUnits
    }
  }, [productStockMatrix, movementLedger])

  // Handle Export Actions
  const handleExportExcel = () => {
    const promoFilterObj = promotions.find(p => p.id === selectedPromoId)
    const label = promoFilterObj ? promoFilterObj.name : (selectedPromoId === 'PROMO_ONLY' ? 'Offres_Commerciales' : 'Toutes_les_Offres')
    exportStockMovementsToExcel(filteredLedger, label)
  }

  const handleExportPdf = () => {
    const promoFilterObj = promotions.find(p => p.id === selectedPromoId)
    const label = promoFilterObj ? promoFilterObj.name : (selectedPromoId === 'PROMO_ONLY' ? 'Offres Commerciales' : 'Global (Toutes Offres)')
    generateStockReportPdf(filteredLedger, label)
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <ShieldAlert style={{ width: '48px', height: '48px', color: '#FF453A', margin: '0 auto 16px' }} />
        <h2 style={{ color: '#FFF', fontSize: '18px', fontWeight: '800' }}>Accès Restreint — Direction Bardahl</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '8px' }}>
          Le module « Mouvements de Stock » est réservé exclusivement à l'administration et à la direction générale Bardahl.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ── Header Title & Actions Bar ──────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Boxes size={22} color="var(--bardahl-yellow)" />
            Mouvements de Stock & Inventaire Bardahl
          </h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Gestion intelligente, suivi des consommations sous promotions et alertes de réapprovisionnement en temps réel.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={handleExportExcel}
            className="btn-secondary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '9px 14px', fontSize: '12px', fontWeight: '800' }}
            title="Télécharger le journal des mouvements au format Excel"
          >
            <FileSpreadsheet size={16} color="#34C759" /> Export Excel
          </button>

          <button
            onClick={handleExportPdf}
            className="btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', padding: '9px 14px', fontSize: '12px', fontWeight: '900' }}
            title="Télécharger le rapport de stock au format PDF"
          >
            <FileText size={16} /> Rapport PDF
          </button>
        </div>
      </div>

      {/* ── KPI Summary Cards Grid ──────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        <div style={{ background: '#14171F', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-card)', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: 'rgba(255, 208, 0, 0.15)', padding: '12px', borderRadius: '10px', color: 'var(--bardahl-yellow)' }}>
            <Sparkles size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>Produits Sous Offre</div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#FFF', marginTop: '2px' }}>
              {kpiStats.totalPromoItems} <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>/ {products.length} réf.</span>
            </div>
          </div>
        </div>

        <div style={{ background: '#14171F', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-card)', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: 'rgba(52, 199, 89, 0.15)', padding: '12px', borderRadius: '10px', color: '#34C759' }}>
            <Gift size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>Cadeaux Offerts Déduits</div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#34C759', marginTop: '2px' }}>
              {kpiStats.totalGiftsUnits} <span style={{ fontSize: '11px', color: '#34C759' }}>un.</span>
            </div>
          </div>
        </div>

        <div style={{ background: '#14171F', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-card)', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: 'rgba(0, 122, 255, 0.15)', padding: '12px', borderRadius: '10px', color: '#007AFF' }}>
            <BarChart3 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>Unités Vendues en Bons</div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#007AFF', marginTop: '2px' }}>
              {kpiStats.totalSalesUnits} <span style={{ fontSize: '11px', color: '#007AFF' }}>un.</span>
            </div>
          </div>
        </div>

        <div style={{ background: '#14171F', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-card)', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ background: kpiStats.criticalStockCount > 0 ? 'rgba(255, 69, 58, 0.18)' : 'rgba(255, 149, 0, 0.15)', padding: '12px', borderRadius: '10px', color: kpiStats.criticalStockCount > 0 ? '#FF453A' : '#FF9500' }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>Alertes Stock Bas</div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: kpiStats.criticalStockCount > 0 ? '#FF453A' : '#FF9500', marginTop: '2px' }}>
              {kpiStats.criticalStockCount} <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>critique(s) ({kpiStats.warningStockCount} alerte(s))</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Smart Filters & Search Bar ──────────────────────────────────────── */}
      <div style={{ background: '#14171F', padding: '16px', borderRadius: '14px', border: '1px solid var(--border-card)', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <label style={{ fontSize: '13px', fontWeight: '800', color: 'var(--bardahl-yellow)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={16} /> Filtres & Intelligence Stock
          </label>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Sélectionnez une promotion ou un produit pour analyser ses mouvements
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {/* Filter 1: Commercial Offer */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
              Offre Promotionnelle :
            </label>
            <select
              value={selectedPromoId}
              onChange={e => setSelectedPromoId(e.target.value)}
              className="input-field"
              style={{ width: '100%', fontSize: '12px', fontWeight: '700' }}
            >
              <option value="ALL">🌐 Toutes les Offres & Catalogue Standard</option>
              <option value="PROMO_ONLY">✨ Produits sous Offre Uniquement</option>
              <optgroup label="── Offres Commerciales Defined ──">
                {promotions.map(p => (
                  <option key={p.id} value={p.id}>
                    [{p.type}] {p.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Filter 2: Product Reference */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
              Produit / Référence :
            </label>
            <select
              value={selectedProdRef}
              onChange={e => setSelectedProdRef(e.target.value)}
              className="input-field"
              style={{ width: '100%', fontSize: '12px', fontWeight: '700' }}
            >
              <option value="ALL">📦 Tous les Produits</option>
              {products.map(p => (
                <option key={p.id || p.reference} value={p.reference || p.id}>
                  [{p.reference}] {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 3: Movement Type */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
              Type de Mouvement :
            </label>
            <select
              value={movementTypeFilter}
              onChange={e => setMovementTypeFilter(e.target.value)}
              className="input-field"
              style={{ width: '100%', fontSize: '12px', fontWeight: '700' }}
            >
              <option value="ALL">🔄 Tous les Mouvements</option>
              <option value="VENTE">📦 Ventes Bons de Commande</option>
              <option value="CADEAU">🎁 Cadeaux Promotionnels Offerts</option>
              <option value="RESTITUTION">↩️ Restitutions (Annulations)</option>
            </select>
          </div>

          {/* Filter 4: Stock Alert Level */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
              Niveau de Stock :
            </label>
            <select
              value={stockStatusFilter}
              onChange={e => setStockStatusFilter(e.target.value)}
              className="input-field"
              style={{ width: '100%', fontSize: '12px', fontWeight: '700' }}
            >
              <option value="ALL">📊 Tous les Niveaux</option>
              <option value="CRITICAL">🔴 Stock Critique (≤ 12 un.)</option>
              <option value="WARNING">🟧 Seuil d'Alerte (≤ 36 un.)</option>
              <option value="OK">🟢 Stock Normal (&gt; 36 un.)</option>
            </select>
          </div>
        </div>

        {/* Search Bar Input */}
        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', width: '16px', height: '16px' }} />
          <input
            type="text"
            placeholder="Rechercher une référence, désignation, bon de commande, client ou commercial..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="input-field"
            style={{ width: '100%', paddingLeft: '38px', fontSize: '12px' }}
          />
        </div>
      </div>

      {/* ── Table 1: Matrix Status per Product & Promo Consumption ─────────── */}
      <div style={{ background: '#14171F', borderRadius: '14px', border: '1px solid var(--border-card)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#FFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={16} color="var(--bardahl-yellow)" />
            État des Stocks Disponible & Consommation par Offre ({filteredMatrix.length} référence(s))
          </h3>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Déduction en temps réel selon ventes & cadeaux offerts
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table" style={{ width: '100%', margin: 0 }}>
            <thead>
              <tr>
                <th style={{ minWidth: '80px' }}>Réf.</th>
                <th style={{ minWidth: '220px' }}>Désignation Produit</th>
                <th style={{ minWidth: '110px' }}>Gamme</th>
                <th style={{ textAlign: 'center', minWidth: '100px' }}>Stock Magasin</th>
                <th style={{ textAlign: 'center', minWidth: '100px' }}>Ventes (Bons)</th>
                <th style={{ textAlign: 'center', minWidth: '100px' }}>🎁 Cadeaux</th>
                <th style={{ textAlign: 'center', minWidth: '130px' }}>Stock Restant Dispo</th>
                <th style={{ minWidth: '160px' }}>Offres Commerciales Liées</th>
                <th style={{ textAlign: 'center', minWidth: '100px' }}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {filteredMatrix.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                    Aucun produit ne correspond aux filtres sélectionnés.
                  </td>
                </tr>
              ) : (
                filteredMatrix.map(prod => {
                  const isCritical = prod.stockStatus === 'CRITICAL'
                  const isWarning = prod.stockStatus === 'WARNING'

                  return (
                    <tr key={prod.id || prod.reference} style={{ background: isCritical ? 'rgba(255, 69, 58, 0.05)' : 'transparent' }}>
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
                          {prod.reference}
                        </span>
                      </td>

                      <td>
                        <strong style={{ color: '#FFFFFF', fontSize: '12px', display: 'block' }}>{prod.name}</strong>
                        <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                          Conditionnement : {prod.packaging || `${prod.unitsPerBox} un./ctn`}
                        </span>
                      </td>

                      <td>
                        <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '5px', background: '#2B313E', color: '#CBD5E1', fontWeight: '700' }}>
                          {prod.category || 'Bardahl'}
                        </span>
                      </td>

                      <td style={{ textAlign: 'center', fontWeight: '700', color: '#CBD5E1', fontSize: '12px' }}>
                        {prod.stock + prod.totalSalesUnits + prod.totalGiftUnits} un.
                      </td>

                      <td style={{ textAlign: 'center', fontWeight: '800', color: '#007AFF', fontSize: '12px' }}>
                        {prod.totalSalesUnits > 0 ? `-${prod.totalSalesUnits} un.` : '0'}
                      </td>

                      <td style={{ textAlign: 'center', fontWeight: '800', color: '#34C759', fontSize: '12px' }}>
                        {prod.totalGiftUnits > 0 ? `🎁 -${prod.totalGiftUnits} un.` : '0'}
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          background: isCritical ? 'rgba(255, 69, 58, 0.2)' : isWarning ? 'rgba(255, 149, 0, 0.2)' : 'rgba(52, 199, 89, 0.18)',
                          color: isCritical ? '#FF453A' : isWarning ? '#FF9500' : '#34C759',
                          border: isCritical ? '1px solid rgba(255, 69, 58, 0.4)' : isWarning ? '1px solid rgba(255, 149, 0, 0.4)' : '1px solid rgba(52, 199, 89, 0.4)',
                          padding: '3px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '900',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}>
                          <span>📦</span>
                          <span>{prod.stock} un. ({prod.cartonsStock} ctn)</span>
                        </span>
                      </td>

                      <td>
                        {prod.linkedPromos && prod.linkedPromos.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            {prod.linkedPromos.map(lp => (
                              <span key={lp.id} style={{ fontSize: '10px', color: '#34C759', fontWeight: '700', background: 'rgba(52, 199, 89, 0.12)', padding: '1px 6px', borderRadius: '4px', width: 'fit-content' }}>
                                ✨ {lp.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Catalog Standard</span>
                        )}
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        {isCritical ? (
                          <span style={{ background: 'rgba(255, 69, 58, 0.2)', color: '#FF453A', border: '1px solid rgba(255, 69, 58, 0.4)', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '900', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <AlertCircle size={11} /> Critique
                          </span>
                        ) : isWarning ? (
                          <span style={{ background: 'rgba(255, 149, 0, 0.2)', color: '#FF9500', border: '1px solid rgba(255, 149, 0, 0.4)', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '900', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <AlertTriangle size={11} /> Alerte
                          </span>
                        ) : (
                          <span style={{ background: 'rgba(52, 199, 89, 0.15)', color: '#34C759', border: '1px solid rgba(52, 199, 89, 0.3)', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={11} /> Normal
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Table 2: Chronological Movement Audit Ledger ──────────────────── */}
      <div style={{ background: '#14171F', borderRadius: '14px', border: '1px solid var(--border-card)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border-card)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#FFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RefreshCw size={16} color="#007AFF" />
            Journal Chronologique des Mouvements de Stock ({filteredLedger.length} opération(s))
          </h3>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            Historique complet des sorties par bon, cadeaux et restitutions
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table" style={{ width: '100%', margin: 0 }}>
            <thead>
              <tr>
                <th style={{ minWidth: '85px' }}>Date</th>
                <th style={{ minWidth: '100px' }}>N° Bon</th>
                <th style={{ minWidth: '140px' }}>Type Mouvement</th>
                <th style={{ minWidth: '80px' }}>Réf.</th>
                <th style={{ minWidth: '200px' }}>Désignation Produit</th>
                <th style={{ textAlign: 'center', minWidth: '110px' }}>Quantité</th>
                <th style={{ minWidth: '150px' }}>Offre Commerciale</th>
                <th style={{ minWidth: '140px' }}>Client</th>
                <th style={{ minWidth: '130px' }}>Commercial</th>
              </tr>
            </thead>
            <tbody>
              {filteredLedger.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>
                    Aucun mouvement enregistre pour les criteres selectionnes.
                  </td>
                </tr>
              ) : (
                filteredLedger.map(led => (
                  <tr key={led.id}>
                    <td style={{ fontSize: '11px', color: '#CBD5E1', fontWeight: '600' }}>
                      {led.date}
                    </td>

                    <td>
                      <span style={{ fontSize: '11px', color: 'var(--bardahl-yellow)', fontWeight: '800' }}>
                        {led.orderNumber || '-'}
                      </span>
                    </td>

                    <td>
                      {led.type === 'VENTE' ? (
                        <span style={{ background: 'rgba(0, 122, 255, 0.15)', color: '#007AFF', border: '1px solid rgba(0, 122, 255, 0.3)', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <ArrowDownRight size={12} /> Vente Bon
                        </span>
                      ) : led.type === 'CADEAU' ? (
                        <span style={{ background: 'rgba(52, 199, 89, 0.18)', color: '#34C759', border: '1px solid rgba(52, 199, 89, 0.35)', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '900', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Gift size={12} /> Cadeau Offert 🎁
                        </span>
                      ) : (
                        <span style={{ background: 'rgba(255, 149, 0, 0.15)', color: '#FF9500', border: '1px solid rgba(255, 149, 0, 0.3)', padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <ArrowUpRight size={12} /> Restitution (Annulation)
                        </span>
                      )}
                    </td>

                    <td>
                      <span style={{ fontWeight: '800', fontSize: '11px', color: '#FFF' }}>
                        {led.reference}
                      </span>
                    </td>

                    <td style={{ fontSize: '12px', fontWeight: '700', color: '#FFF' }}>
                      {led.productName}
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontWeight: '900', fontSize: '12px', color: led.type === 'RESTITUTION' ? '#34C759' : (led.type === 'CADEAU' ? '#34C759' : '#007AFF') }}>
                        {led.type === 'RESTITUTION' ? '+' : '-'}{led.units} un. ({led.cartons} ctn)
                      </span>
                    </td>

                    <td style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {led.promoName || 'Standard'}
                    </td>

                    <td style={{ fontSize: '11px', color: '#FFF', fontWeight: '600' }}>
                      {led.clientName || '-'}
                    </td>

                    <td style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {led.commercialName || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
