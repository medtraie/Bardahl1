import React, { useState, useEffect } from 'react'
import { Search, FileSpreadsheet, Plus, FileText, Trash2, Edit3, CheckCircle2, CreditCard, Hash, Percent, Filter, Truck, MessageSquare, Gift, Tag, Sparkles } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { generateOrderPdf } from '../utils/pdfGenerator'
import { exportOrdersToExcel } from '../utils/excelExporter'

export default function Orders({ openWizardTrigger }) {
  const { orders, clients, products, commercials, addOrder, updateOrder, deleteOrder, currentUser } = useApp()
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
  const [selectedProducts, setSelectedProducts] = useState([])

  // Searchable Select States
  const [clientSearchQuery, setClientSearchQuery] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [productSearchQuery, setProductSearchQuery] = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)

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

  const filteredProductOptions = products.filter(p => {
    const q = productSearchQuery.toLowerCase()
    return (p.name || '').toLowerCase().includes(q) ||
           (p.reference || '').toLowerCase().includes(q) ||
           (p.code || '').toLowerCase().includes(q)
  })

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
    setSelectedProducts(order.items ? order.items.map(i => ({
      productId: i.productId || i.reference,
      productName: i.productName || i.name,
      reference: i.reference || i.code,
      priceTtc: parseFloat(i.priceTtc || i.unitPriceTtc || 0),
      qty: parseInt(i.qty || i.quantity || 1, 10),
      qtyGratuit: parseInt(i.qtyGratuit || i.freeQty || 0, 10),
      promoTag: i.promoTag || ''
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
          priceTtc: parseFloat(prod.priceTtc) || 0,
          qty: 1,
          qtyGratuit: 0,
          promoTag: ''
        }])
      }
    }
  }

  const handleQtyChange = (index, newQty) => {
    const val = parseInt(newQty, 10)
    if (isNaN(val) || val <= 0) {
      setSelectedProducts(prev => prev.filter((_, i) => i !== index))
    } else {
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

  // Global Financial Calculations (Global Discount & Free Promo items)
  const grossTotalTtc = selectedProducts.reduce((sum, item) => sum + (item.priceTtc * item.qty), 0)
  const totalFreeItemsCount = selectedProducts.reduce((sum, item) => sum + (item.qtyGratuit || 0), 0)
  const discountFromPercent = grossTotalTtc * (remisePercent / 100)
  const totalDiscountAmount = discountFromPercent + (parseFloat(remiseMontant) || 0)
  const netTotalTtc = Math.max(0, grossTotalTtc - totalDiscountAmount)
  const totalHt = netTotalTtc / 1.20
  const totalTva = netTotalTtc - totalHt

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

    if (editingOrder) {
      const updatedOrder = {
        ...editingOrder,
        orderNumber: activeOrderNumber,
        clientName: client ? client.companyName : editingOrder.clientName,
        paymentMethod: paymentMethod,
        modeExpedition: modeExpedition,
        remarque: remarque,
        remisePercent: remisePercent,
        remiseMontant: parseFloat(remiseMontant) || 0,
        promoNote: promoNote,
        totalHt: totalHt,
        totalDiscount: totalDiscountAmount,
        totalTva: totalTva,
        totalTtc: netTotalTtc,
        totalFreeItems: totalFreeItemsCount,
        items: selectedProducts
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
        remisePercent: remisePercent,
        remiseMontant: parseFloat(remiseMontant) || 0,
        promoNote: promoNote,
        status: "VALIDATED",
        totalHt: totalHt,
        totalDiscount: totalDiscountAmount,
        totalTva: totalTva,
        totalTtc: netTotalTtc,
        totalFreeItems: totalFreeItemsCount,
        items: selectedProducts
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 1000 }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '840px', maxHeight: '90vh', overflowY: 'auto', borderColor: 'rgba(255, 208, 0, 0.4)' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--border-card)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText style={{ width: '22px', height: '22px', color: 'var(--bardahl-yellow)' }} />
                {editingOrder ? `Modifier Bon de Commande ${editingOrder.orderNumber}` : 'Création Bon de Commande Bardahl'}
              </h3>
              <button onClick={() => { setShowOrderWizard(false); setEditingOrder(null); setClientSearchQuery(''); setProductSearchQuery(''); }} style={{ color: 'var(--text-secondary)', fontSize: '24px', cursor: 'pointer', background: 'none', border: 'none' }}>
                &times;
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              <div style={{ background: '#14171F', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-card)' }}>
                <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--bardahl-yellow)', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Hash style={{ width: '16px', height: '16px' }} /> N° de Bon
                </label>
                <input type="text" value={customOrderNumber} onChange={e => setCustomOrderNumber(e.target.value)} placeholder={suggestedOrderNumber} className="input-field" />
              </div>

              {/* Step 1: Select Client */}
              <div className="client-search-container" style={{ position: 'relative' }}>
                <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--bardahl-yellow)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
                  1. Sélectionner le Client *
                </label>
                <div style={{ position: 'relative' }}>
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
                  />
                  {showClientDropdown && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border-card)',
                      borderRadius: '12px', maxHeight: '200px', overflowY: 'auto', zIndex: 1010, boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                    }}>
                      {filteredClientOptions.map(c => (
                        <div key={c.id} onClick={() => { setSelectedClient(c.id); setClientSearchQuery(`${c.companyName} (${c.city})`); setShowClientDropdown(false); }} style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #222' }}>
                          <strong style={{ color: 'var(--bardahl-yellow)' }}>{c.codeClient}</strong> - {c.companyName} ({c.city})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Step 2: Mode de Paiement & Expédition */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--bardahl-yellow)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CreditCard style={{ width: '16px', height: '16px' }} /> 2. Mode de Paiement
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '6px' }}>
                    {['Chèque', 'Virement', 'Carte Bancaire', 'Espèces', 'Traite'].map(method => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        style={{
                          padding: '8px 6px', borderRadius: '8px', fontSize: '11px', fontWeight: '800', cursor: 'pointer',
                          background: paymentMethod === method ? 'var(--bardahl-yellow)' : '#14171F',
                          color: paymentMethod === method ? '#0D0F12' : 'var(--text-secondary)',
                          border: paymentMethod === method ? '1px solid var(--bardahl-yellow)' : '1px solid var(--border-card)'
                        }}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--bardahl-yellow)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Truck style={{ width: '16px', height: '16px' }} /> 3. Mode d'Expédition
                  </label>
                  <select value={modeExpedition} onChange={e => setModeExpedition(e.target.value)} className="input-field">
                    <option value="Transport Bardahl">Transport Bardahl</option>
                    <option value="Livraison Client">Livraison Client</option>
                    <option value="Enlèvement Magasin">Enlèvement Magasin</option>
                    <option value="Transporteur Externe">Transporteur Externe</option>
                  </select>
                </div>
              </div>

              {/* Step 3: Add Products */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--bardahl-yellow)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Gift style={{ width: '16px', height: '16px' }} /> 4. Articles & Gratuités *
                  </label>
                  <div className="product-search-container" style={{ position: 'relative', width: '340px' }}>
                    <input
                      type="text" className="input-field" placeholder="🔎 Rechercher article..."
                      value={productSearchQuery}
                      onChange={e => { setProductSearchQuery(e.target.value); setShowProductDropdown(true); }}
                      onFocus={() => setShowProductDropdown(true)}
                    />
                    {showProductDropdown && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#14171F', borderRadius: '8px', maxHeight: '200px', overflowY: 'auto', zIndex: 1010 }}>
                        {filteredProductOptions.map(p => (
                          <div key={p.id} onClick={() => { handleAddProduct(p.id); setProductSearchQuery(''); setShowProductDropdown(false); }} style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #222' }}>
                            {p.reference} - {p.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ borderRadius: '12px', border: '1px solid var(--border-card)', overflow: 'hidden' }}>
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th style={{ minWidth: '70px' }}>Réf.</th>
                        <th>Produit</th>
                        <th style={{ textAlign: 'center', minWidth: '120px' }}>Qté</th>
                        <th style={{ textAlign: 'center', minWidth: '120px' }}>Gratuit</th>
                        <th style={{ minWidth: '90px' }}>Prix U.</th>
                        <th style={{ minWidth: '100px' }}>Total</th>
                        <th style={{ minWidth: '90px', textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedProducts.map((item, idx) => (
                        <tr key={idx}>
                          <td><span style={{ fontWeight: '700', color: 'var(--bardahl-yellow)' }}>{item.reference}</span></td>
                          <td>
                            <strong>{item.productName}</strong>
                            {item.promoTag && <div style={{ fontSize: '10px', color: '#34C759', fontWeight: 'bold', marginTop: '2px' }}>{item.promoTag}</div>}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', background: '#0D0F12', border: '1px solid rgba(255, 208, 0, 0.4)', borderRadius: '8px', padding: '2px' }}>
                              <button
                                type="button"
                                onClick={() => handleQtyChange(idx, Math.max(1, (parseInt(item.qty, 10) || 1) - 1))}
                                style={{ width: '28px', height: '30px', background: 'transparent', border: 'none', color: 'var(--bardahl-yellow)', fontSize: '16px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={item.qty}
                                onChange={e => handleQtyChange(idx, e.target.value)}
                                style={{
                                  width: '45px',
                                  height: '30px',
                                  textAlign: 'center',
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#FFFFFF',
                                  fontWeight: '800',
                                  fontSize: '14px',
                                  outline: 'none'
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleQtyChange(idx, (parseInt(item.qty, 10) || 0) + 1)}
                                style={{ width: '28px', height: '30px', background: 'transparent', border: 'none', color: 'var(--bardahl-yellow)', fontSize: '16px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
                                style={{ width: '28px', height: '30px', background: 'transparent', border: 'none', color: '#34C759', fontSize: '16px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="0"
                                value={item.qtyGratuit}
                                onChange={e => handleQtyGratuitChange(idx, e.target.value)}
                                style={{
                                  width: '45px',
                                  height: '30px',
                                  textAlign: 'center',
                                  background: 'transparent',
                                  border: 'none',
                                  color: item.qtyGratuit > 0 ? '#34C759' : '#8E95A5',
                                  fontWeight: '800',
                                  fontSize: '14px',
                                  outline: 'none'
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleQtyGratuitChange(idx, (parseInt(item.qtyGratuit, 10) || 0) + 1)}
                                style={{ width: '28px', height: '30px', background: 'transparent', border: 'none', color: '#34C759', fontSize: '16px', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{item.priceTtc.toFixed(2)} DH</td>
                          <td style={{ color: 'var(--bardahl-yellow)', fontWeight: '800' }}>{(item.priceTtc * item.qty).toFixed(2)} DH</td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <button
                                type="button"
                                onClick={() => handleTogglePromoLine(idx, '10+1')}
                                style={{
                                  fontSize: '11px',
                                  fontWeight: '800',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  background: item.promoTag ? 'rgba(52, 199, 89, 0.2)' : '#14171F',
                                  color: item.promoTag ? '#34C759' : 'var(--text-secondary)',
                                  border: item.promoTag ? '1px solid #34C759' : '1px solid var(--border-card)',
                                  cursor: 'pointer'
                                }}
                                title="Appliquer Promo 10+1"
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
                                  padding: '4px 8px',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                                title="Supprimer la ligne"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Step 4: Remise Commerciale GLOBALE sur le Total (Non linéaire) */}
              <div style={{ background: '#14171F', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-card)' }}>
                <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--bardahl-yellow)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Percent style={{ width: '16px', height: '16px' }} /> 5. Remise Commerciale Globale (Non linéaire)
                </label>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {[0, 5, 10, 15, 20].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => { setRemisePercent(pct); setRemiseMontant(0); }}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '800',
                          background: (remisePercent === pct && !remiseMontant) ? 'var(--bardahl-yellow)' : '#0D0F12',
                          color: (remisePercent === pct && !remiseMontant) ? '#0D0F12' : 'var(--text-secondary)',
                          border: (remisePercent === pct && !remiseMontant) ? '1px solid var(--bardahl-yellow)' : '1px solid var(--border-card)',
                          cursor: 'pointer'
                        }}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>% Personnalisé :</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={remisePercent}
                      onChange={e => { setRemisePercent(parseFloat(e.target.value) || 0); setRemiseMontant(0); }}
                      placeholder="%"
                      className="input-field"
                      style={{ width: '70px', fontSize: '12px', padding: '6px 8px' }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Ou Montant Fixe (DH) :</span>
                    <input
                      type="number"
                      min="0"
                      value={remiseMontant}
                      onChange={e => { setRemiseMontant(parseFloat(e.target.value) || 0); setRemisePercent(0); }}
                      placeholder="Montant DH"
                      className="input-field"
                      style={{ width: '100px', fontSize: '12px', padding: '6px 8px', color: 'var(--bardahl-yellow)', fontWeight: 'bold' }}
                    />
                  </div>
                </div>
              </div>

              {/* Step 5: Remarks */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--bardahl-yellow)', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles style={{ width: '15px', height: '15px' }} /> Note Promotionnelle
                  </label>
                  <input
                    type="text"
                    value={promoNote}
                    onChange={e => setPromoNote(e.target.value)}
                    placeholder="Ex: Offre 10+1 Offert / Campagne Vidange"
                    className="input-field"
                    style={{ fontSize: '12px' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--bardahl-yellow)', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MessageSquare style={{ width: '15px', height: '15px' }} /> Instructions de Livraison
                  </label>
                  <input
                    type="text"
                    value={remarque}
                    onChange={e => setRemarque(e.target.value)}
                    placeholder="Ex: Livrer avant 12h."
                    className="input-field"
                    style={{ fontSize: '12px' }}
                  />
                </div>
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

                {totalDiscountAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#FF453A', fontWeight: '800' }}>
                    <span>Remise Commerciale Globale {remisePercent > 0 ? `(${remisePercent}%)` : ''} :</span>
                    <span>-{totalDiscountAmount.toFixed(2)} DH</span>
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
