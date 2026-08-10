import React, { useState } from 'react'
import { Search, FileSpreadsheet, Plus, FileText, Trash2, Edit3, CheckCircle2, CreditCard, Hash, Percent, Filter, Truck, MessageSquare, User } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { generateOrderPdf } from '../utils/pdfGenerator'
import { exportOrdersToExcel } from '../utils/excelExporter'

export default function Orders({ onNewOrderClick }) {
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
  const [selectedProducts, setSelectedProducts] = useState([])

  const suggestedOrderNumber = `BC-2026-00${4332 + orders.length + 1}`
  const activeOrderNumber = customOrderNumber.trim() || suggestedOrderNumber

  const filteredOrders = orders.filter(o => {
    const matchesSearch = o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
                          o.clientName.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'ALL' || o.status === statusFilter
    const matchesCommercial = commercialFilter === 'ALL' ||
      (o.commercialName && o.commercialName.trim().toLowerCase() === commercialFilter.trim().toLowerCase())
    return matchesSearch && matchesStatus && matchesCommercial
  })

  const handleOpenAddWizard = () => {
    setEditingOrder(null)
    setCustomOrderNumber('')
    setSelectedClient('')
    setPaymentMethod('Chèque')
    setModeExpedition('Transport Bardahl')
    setRemarque('')
    setRemisePercent(0)
    setSelectedProducts([])
    setShowOrderWizard(true)
  }

  const handleOpenEditWizard = (order) => {
    setEditingOrder(order)
    setCustomOrderNumber(order.orderNumber || '')
    const matchedClient = clients.find(c => c.companyName === order.clientName)
    setSelectedClient(matchedClient ? matchedClient.id : '')
    setPaymentMethod(order.paymentMethod || 'Chèque')
    setModeExpedition(order.modeExpedition || 'Transport Bardahl')
    setRemarque(order.remarque || '')
    setRemisePercent(order.remisePercent || 0)
    setSelectedProducts(order.items ? order.items.map(i => ({
      productId: i.productId || i.reference,
      productName: i.productName,
      reference: i.reference,
      priceTtc: i.priceTtc,
      qty: i.qty,
      remise: i.remise || 0
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
          priceTtc: prod.priceTtc,
          qty: 1,
          remise: 0
        }])
      }
    }
  }

  const handleQtyChange = (index, newQty) => {
    if (newQty <= 0) {
      setSelectedProducts(prev => prev.filter((_, i) => i !== index))
    } else {
      setSelectedProducts(prev => prev.map((p, i) => i === index ? { ...p, qty: parseInt(newQty) } : p))
    }
  }

  // Financial Calculations
  const grossTotalTtc = selectedProducts.reduce((sum, item) => sum + (item.priceTtc * item.qty), 0)
  const totalDiscountAmount = grossTotalTtc * (remisePercent / 100)
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
        totalHt: totalHt,
        totalDiscount: totalDiscountAmount,
        totalTva: totalTva,
        totalTtc: netTotalTtc,
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
        commercialName: currentUser?.name || "Karim Benjelloun",
        commercialEmail: currentUser?.email || "karim@bardahl.ma",
        clientName: client ? client.companyName : "Client Bardahl",
        paymentMethod: paymentMethod,
        modeExpedition: modeExpedition,
        remarque: remarque,
        remisePercent: remisePercent,
        status: "VALIDATED",
        totalHt: totalHt,
        totalDiscount: totalDiscountAmount,
        totalTva: totalTva,
        totalTtc: netTotalTtc,
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
    setSelectedProducts([])
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#FFFFFF' }}>Gestion des Bons de Commande</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Historique (Filtre Commercial, Ajouter, Modifier, Supprimer, Export Excel & PDF)
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={() => exportOrdersToExcel(orders)} className="btn-secondary" style={{ padding: '10px 18px', fontSize: '13px' }}>
            <FileSpreadsheet style={{ width: '16px', height: '16px' }} /> Export Excel
          </button>
          <button onClick={handleOpenAddWizard} className="btn-bardahl" style={{ padding: '10px 20px', fontSize: '13px' }}>
            <Plus style={{ width: '16px', height: '16px' }} /> Nouveau Bon de Commande
          </button>
        </div>
      </div>

      {/* Filter Tabs, Search & Commercial Filter Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        
        {/* Search Bar */}
        <div style={{ position: 'relative', width: '280px' }}>
          <Search style={{ width: '16px', height: '16px', color: 'var(--bardahl-yellow)', position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Rechercher N° Bon, Client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field"
            style={{ paddingLeft: '40px' }}
          />
        </div>

        {/* Commercial Filter & Status Filter Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          
          {/* Commercial Dropdown Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <User style={{ width: '15px', height: '15px', color: 'var(--bardahl-yellow)' }} />
            <select
              value={commercialFilter}
              onChange={(e) => setCommercialFilter(e.target.value)}
              className="input-field"
              style={{ width: 'auto', minWidth: '180px', fontSize: '12px', padding: '8px 12px', fontWeight: '700' }}
            >
              <option value="ALL">Tous les Commercials ({commercials.length})</option>
              {commercials.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto' }}>
            <Filter style={{ width: '15px', height: '15px', color: 'var(--bardahl-yellow)', flexShrink: 0 }} />
            {[
              { id: 'ALL', label: 'Tous les Bons' },
              { id: 'VALIDATED', label: 'Validés' },
              { id: 'DRAFT', label: 'Brouillons' },
              { id: 'DELIVERED', label: 'Livrés' }
            ].map(tab => {
              const isSelected = statusFilter === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '700',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.2s ease',
                    background: isSelected ? 'var(--bardahl-yellow)' : 'var(--bg-surface)',
                    color: isSelected ? '#0D0F12' : 'var(--text-secondary)',
                    border: isSelected ? '1px solid var(--bardahl-yellow)' : '1px solid var(--border-card)'
                  }}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

        </div>

      </div>

      {/* Structured Orders Table Card */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>N° Bon</th>
                <th>Date</th>
                <th>Commercial</th>
                <th>Client</th>
                <th>Mode Paiement</th>
                <th>Expédition</th>
                <th>Total TTC</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                    Aucun bon de commande ne correspond à vos critères de recherche.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(o => (
                  <tr key={o.id}>
                    <td><strong style={{ color: '#FFFFFF', fontSize: '14px' }}>{o.orderNumber}</strong></td>
                    <td>{o.date}</td>
                    <td><span style={{ fontWeight: '700', color: '#FFFFFF' }}>{o.commercialName}</span></td>
                    <td><strong style={{ color: '#FFFFFF' }}>{o.clientName}</strong></td>
                    <td><span style={{ color: 'var(--bardahl-yellow)', fontWeight: '700', fontSize: '12px' }}>{o.paymentMethod || 'Chèque'}</span></td>
                    <td><span style={{ color: '#007AFF', fontWeight: '600', fontSize: '11px' }}>{o.modeExpedition || 'Transport Bardahl'}</span></td>
                    <td style={{ color: 'var(--bardahl-yellow)', fontWeight: '900', fontSize: '15px' }}>{(o.totalTtc || 0).toFixed(2)} DH</td>
                    <td><span className={`badge-status ${o.status}`}>{o.status}</span></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          onClick={() => generateOrderPdf(o)}
                          className="btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '11px' }}
                          title="PDF"
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
          <div className="glass-card" style={{ width: '100%', maxWidth: '780px', maxHeight: '90vh', overflowY: 'auto', borderColor: 'rgba(255, 208, 0, 0.4)' }}>
            
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '12px', borderBottom: '1px solid var(--border-card)' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText style={{ width: '22px', height: '22px', color: 'var(--bardahl-yellow)' }} />
                {editingOrder ? `Modifier Bon de Commande ${editingOrder.orderNumber}` : 'Création Bon de Commande Bardahl'}
              </h3>
              <button onClick={() => { setShowOrderWizard(false); setEditingOrder(null); }} style={{ color: 'var(--text-secondary)', fontSize: '24px', cursor: 'pointer' }}>
                &times;
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* Step 0: Numéro de Série Modifiable */}
              <div style={{ background: '#14171F', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-card)' }}>
                <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--bardahl-yellow)', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Hash style={{ width: '16px', height: '16px' }} /> Numéro de Série du Bon (Modifiable)
                </label>
                <input
                  type="text"
                  value={customOrderNumber}
                  onChange={e => setCustomOrderNumber(e.target.value)}
                  placeholder={suggestedOrderNumber}
                  className="input-field"
                  style={{ fontWeight: '800', color: '#FFFFFF' }}
                />
              </div>

              {/* Step 1: Select Client */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--bardahl-yellow)', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
                  1. Sélectionner le Client *
                </label>
                <select
                  value={selectedClient}
                  onChange={e => setSelectedClient(e.target.value)}
                  className="input-field"
                >
                  <option value="">-- Choisir un client dans votre portefeuille --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.companyName} ({c.city}) - ICE: {c.ice}</option>
                  ))}
                </select>
              </div>

              {/* Step 2: Mode de Paiement & Mode d'Expédition (Dual Column) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--bardahl-yellow)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CreditCard style={{ width: '16px', height: '16px' }} /> 2. Mode de Paiement
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {['Chèque', 'Virement', 'Espèces', 'Traite'].map(method => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        style={{
                          padding: '8px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: '800',
                          transition: 'all 0.2s ease',
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
                  <select
                    value={modeExpedition}
                    onChange={e => setModeExpedition(e.target.value)}
                    className="input-field"
                    style={{ fontSize: '12px', padding: '10px' }}
                  >
                    <option value="Transport Bardahl">Transport Bardahl (Livraison Usine)</option>
                    <option value="Livraison Client">Livraison Sur Site Client</option>
                    <option value="Enlèvement Magasin">Enlèvement Sur Place (Magasin)</option>
                    <option value="Transporteur Externe">Transporteur Externe / Messagerie</option>
                  </select>
                </div>
              </div>

              {/* Step 3: Add Products */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--bardahl-yellow)', textTransform: 'uppercase' }}>
                    4. Articles de la Commande *
                  </label>
                  <select
                    onChange={e => { handleAddProduct(e.target.value); e.target.value = '' }}
                    className="input-field"
                    style={{ width: 'auto', fontSize: '12px', padding: '6px 12px' }}
                  >
                    <option value="">+ Ajouter un produit du catalogue (194 produits)</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} - {p.priceTtc} DH</option>
                    ))}
                  </select>
                </div>

                <div style={{ borderRadius: '12px', border: '1px solid var(--border-card)', overflow: 'hidden' }}>
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Réf.</th>
                        <th>Désignation Produit</th>
                        <th>Qté</th>
                        <th>Prix U. TTC</th>
                        <th>Total TTC</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedProducts.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                            Aucun produit ajouté. Utilisez le menu ci-dessus pour ajouter des articles.
                          </td>
                        </tr>
                      ) : (
                        selectedProducts.map((item, idx) => (
                          <tr key={idx}>
                            <td>{item.reference}</td>
                            <td><strong style={{ color: '#FFFFFF' }}>{item.productName}</strong></td>
                            <td>
                              <input
                                type="number"
                                min="1"
                                value={item.qty}
                                onChange={e => handleQtyChange(idx, e.target.value)}
                                className="input-field"
                                style={{ width: '60px', textAlign: 'center', padding: '4px', fontSize: '12px', fontWeight: '800' }}
                              />
                            </td>
                            <td>{item.priceTtc.toFixed(2)} DH</td>
                            <td style={{ color: 'var(--bardahl-yellow)', fontWeight: '900' }}>{(item.priceTtc * item.qty).toFixed(2)} DH</td>
                            <td>
                              <button onClick={() => handleQtyChange(idx, 0)} style={{ color: '#FF453A', padding: '4px' }}>
                                <Trash2 style={{ width: '16px', height: '16px' }} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Step 4: Remise Commerciale (%) */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--bardahl-yellow)', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Percent style={{ width: '16px', height: '16px' }} /> 5. Remise Commerciale (%)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {[0, 5, 10, 15, 20].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setRemisePercent(pct)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '800',
                        transition: 'all 0.2s ease',
                        background: remisePercent === pct ? 'var(--bardahl-yellow)' : '#14171F',
                        color: remisePercent === pct ? '#0D0F12' : 'var(--text-secondary)',
                        border: remisePercent === pct ? '1px solid var(--bardahl-yellow)' : '1px solid var(--border-card)'
                      }}
                    >
                      {pct}%
                    </button>
                  ))}
                  <input
                    type="number"
                    value={remisePercent}
                    onChange={e => setRemisePercent(parseFloat(e.target.value) || 0)}
                    placeholder="Remise %"
                    className="input-field"
                    style={{ width: '90px', fontSize: '12px', padding: '6px 10px', marginLeft: '8px' }}
                  />
                </div>
              </div>

              {/* Step 5: Remarques / Instructions d'expedition */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', color: 'var(--bardahl-yellow)', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <MessageSquare style={{ width: '16px', height: '16px' }} /> 6. Remarques / Instructions de Livraison
                </label>
                <textarea
                  value={remarque}
                  onChange={e => setRemarque(e.target.value)}
                  placeholder="Ex: Livrer le matin avant 12h. Attention aux horaires d'accès camion."
                  className="input-field"
                  style={{ minHeight: '60px', resize: 'vertical' }}
                />
              </div>

              {/* Financial Calculation Summary Card */}
              <div style={{ background: '#14171F', padding: '16px', borderRadius: '14px', border: '1px solid rgba(255, 208, 0, 0.4)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  <span>Montant Brut TTC :</span>
                  <span>{grossTotalTtc.toFixed(2)} DH</span>
                </div>
                {remisePercent > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#FF453A', fontWeight: '800' }}>
                    <span>Remise Commerciale ({remisePercent}%) :</span>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '900', color: 'var(--bardahl-yellow)', paddingTop: '8px', borderTop: '1px solid var(--border-card)' }}>
                  <span>TOTAL NET TTC :</span>
                  <span>{netTotalTtc.toFixed(2)} DH</span>
                </div>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-card)' }}>
                <button type="button" onClick={() => { setShowOrderWizard(false); setEditingOrder(null); }} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '12px' }}>
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
