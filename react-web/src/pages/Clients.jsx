import React, { useState } from 'react'
import { Search, UserPlus, MapPin, Phone, Building, Hash, ShieldCheck, Edit3, Trash2, Eye, FileText, Download, TrendingUp, DollarSign, ShoppingBag, CheckCircle2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { generateClientPdf, generateOrderPdf } from '../utils/pdfGenerator'

export default function Clients() {
  const { clients, orders, addClient, updateClient, deleteClient } = useApp()
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingClient, setEditingClient] = useState(null)
  const [selectedDetailClient, setSelectedDetailClient] = useState(null)
  
  const [formData, setFormData] = useState({
    companyName: '', ice: '', rc: '', address: '', city: '', phone: '', type: 'Garage'
  })

  const filteredClients = clients.filter(c => 
    (c.companyName || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.ice || '').includes(search) ||
    (c.city || '').toLowerCase().includes(search.toLowerCase())
  )

  const handleOpenAddModal = () => {
    setFormData({ companyName: '', ice: '', rc: '', address: '', city: '', phone: '', type: 'Garage' })
    setShowAddModal(true)
  }

  const handleOpenEditModal = (client) => {
    setEditingClient(client)
    setFormData({
      companyName: client.companyName || '',
      ice: client.ice || '',
      rc: client.rc || '',
      address: client.address || '',
      city: client.city || '',
      phone: client.phone || '',
      type: client.type || 'Garage'
    })
  }

  const handleAddSubmit = (e) => {
    e.preventDefault()
    addClient({
      id: 'c_' + Date.now(),
      ...formData
    })
    setShowAddModal(false)
    setFormData({ companyName: '', ice: '', rc: '', address: '', city: '', phone: '', type: 'Garage' })
  }

  const handleEditSubmit = (e) => {
    e.preventDefault()
    if (!editingClient) return
    updateClient({
      ...editingClient,
      ...formData
    })
    setEditingClient(null)
  }

  const handleDelete = (client) => {
    if (window.confirm(`Voulez-vous vraiment supprimer le client "${client.companyName}" ?`)) {
      deleteClient(client.id)
    }
  }

  // Calculate orders for a specific client
  const getClientOrders = (client) => {
    if (!client) return []
    return orders.filter(o => 
      (o.clientName && o.clientName.trim().toLowerCase() === client.companyName.trim().toLowerCase()) ||
      (o.clientDbId && client.dbId && o.clientDbId === client.dbId)
    )
  }

  // Financial calculations for a client
  const getClientFinancials = (client) => {
    const clientOrders = getClientOrders(client)
    const totalCaTtc = clientOrders.reduce((sum, o) => sum + (parseFloat(o.totalTtc) || 0), 0)
    const totalHt = totalCaTtc / 1.20
    const totalTva = totalCaTtc - totalHt
    const validatedCount = clientOrders.filter(o => (o.status || '').toUpperCase() === 'VALIDATED').length
    
    return {
      clientOrders,
      totalCaTtc,
      totalHt,
      totalTva,
      totalOrders: clientOrders.length,
      validatedCount
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header & Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#FFFFFF' }}>Gestion du Portefeuille Clients</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {filteredClients.length} clients enregistrés (Détails CA, PDF, Ajouter, Modifier, Supprimer)
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '280px' }}>
            <Search style={{ width: '16px', height: '16px', color: 'var(--bardahl-yellow)', position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Rechercher par Nom, ICE, Ville..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '40px' }}
            />
          </div>

          <button onClick={handleOpenAddModal} className="btn-bardahl" style={{ padding: '10px 20px', fontSize: '13px' }}>
            <UserPlus style={{ width: '16px', height: '16px' }} /> Ajouter Client
          </button>
        </div>
      </div>

      {/* 3-Column Responsive Glassmorphic Cards Grid */}
      <div className="clients-grid">
        {filteredClients.map(c => {
          const { totalCaTtc, totalOrders } = getClientFinancials(c)
          return (
            <div key={c.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#FFFFFF' }}>{c.companyName}</h3>
                  <span className="badge-status VALIDATED" style={{ fontSize: '10px' }}>{c.type || 'Garage'}</span>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px', margin: '12px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Hash style={{ width: '14px', height: '14px', color: 'var(--bardahl-yellow)' }} />
                    <span>ICE : <strong style={{ color: '#FFFFFF' }}>{c.ice}</strong> | RC : {c.rc}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin style={{ width: '14px', height: '14px', color: 'var(--bardahl-yellow)' }} />
                    <span>{c.address}, <strong style={{ color: '#FFFFFF' }}>{c.city}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Phone style={{ width: '14px', height: '14px', color: 'var(--bardahl-yellow)' }} />
                    <span>{c.phone}</span>
                  </div>
                </div>

                {/* Quick CA Preview Badge */}
                <div style={{ background: '#14171F', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>CA Réalisé :</span>
                  <span style={{ fontSize: '13px', color: 'var(--bardahl-yellow)', fontWeight: '900' }}>
                    {totalCaTtc.toFixed(2)} DH <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 'normal' }}>({totalOrders} bon{totalOrders > 1 ? 's' : ''})</span>
                  </span>
                </div>
              </div>

              <div style={{ paddingTop: '12px', marginTop: '12px', borderTop: '1px solid var(--border-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', color: '#34C759', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck style={{ width: '12px', height: '12px' }} /> Client Actif
                </span>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {/* Button: Détails */}
                  <button
                    onClick={() => setSelectedDetailClient(c)}
                    className="btn-bardahl"
                    style={{ padding: '4px 10px', fontSize: '11px' }}
                    title="Voir les détails & Chiffre d'Affaires"
                  >
                    <Eye style={{ width: '13px', height: '13px' }} /> Détails
                  </button>

                  <button
                    onClick={() => handleOpenEditModal(c)}
                    className="btn-secondary"
                    style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--bardahl-yellow)', borderColor: 'var(--bardahl-yellow)' }}
                    title="Modifier"
                  >
                    <Edit3 style={{ width: '13px', height: '13px' }} />
                  </button>
                  <button
                    onClick={() => handleDelete(c)}
                    style={{ padding: '4px 8px', fontSize: '11px', color: '#FF453A', background: 'rgba(255, 69, 58, 0.1)', border: '1px solid rgba(255, 69, 58, 0.3)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="Supprimer"
                  >
                    <Trash2 style={{ width: '13px', height: '13px' }} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal 1: Détails & Chiffre d'Affaires Client */}
      {selectedDetailClient && (() => {
        const { clientOrders, totalCaTtc, totalHt, totalTva, totalOrders, validatedCount } = getClientFinancials(selectedDetailClient)
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 1000 }}>
            <div className="glass-card" style={{ width: '100%', maxWidth: '840px', maxHeight: '90vh', overflowY: 'auto', borderColor: 'var(--bardahl-yellow)' }}>
              
              {/* Modal Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid var(--border-card)' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#FFFFFF' }}>{selectedDetailClient.companyName}</h3>
                    <span className="badge-status VALIDATED" style={{ fontSize: '11px' }}>{selectedDetailClient.type || 'Garage'}</span>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    ICE : <strong style={{ color: '#FFFFFF' }}>{selectedDetailClient.ice}</strong> | RC : {selectedDetailClient.rc} | Ville : <strong style={{ color: '#FFFFFF' }}>{selectedDetailClient.city}</strong>
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={() => generateClientPdf(selectedDetailClient, clientOrders)}
                    className="btn-bardahl"
                    style={{ padding: '8px 16px', fontSize: '12px' }}
                  >
                    <Download style={{ width: '15px', height: '15px' }} /> Télécharger Rapport PDF
                  </button>

                  <button
                    onClick={() => setSelectedDetailClient(null)}
                    style={{ color: 'var(--text-secondary)', fontSize: '24px', cursor: 'pointer', background: 'none', border: 'none' }}
                  >
                    &times;
                  </button>
                </div>
              </div>

              {/* KPI Financial Cards Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                <div style={{ background: '#14171F', padding: '14px', borderRadius: '12px', border: '1px solid var(--bardahl-yellow)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <TrendingUp style={{ width: '14px', height: '14px', color: 'var(--bardahl-yellow)' }} /> Chiffre d'Affaires Total
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--bardahl-yellow)' }}>
                    {totalCaTtc.toFixed(2)} DH
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>Total TTC cumulé</div>
                </div>

                <div style={{ background: '#14171F', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-card)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <DollarSign style={{ width: '14px', height: '14px', color: '#007AFF' }} /> Total HT (Net)
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#FFFFFF' }}>
                    {totalHt.toFixed(2)} DH
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>TVA (20%): {totalTva.toFixed(2)} DH</div>
                </div>

                <div style={{ background: '#14171F', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-card)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShoppingBag style={{ width: '14px', height: '14px', color: '#34C759' }} /> Total Commandes
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '800', color: '#FFFFFF' }}>
                    {totalOrders} Bon{totalOrders > 1 ? 's' : ''}
                  </div>
                  <div style={{ fontSize: '10px', color: '#34C759', marginTop: '2px', fontWeight: '700' }}>
                    {validatedCount} bon{validatedCount > 1 ? 's' : ''} validé{validatedCount > 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              {/* Order History Table */}
              <div style={{ marginBottom: '16px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#FFFFFF', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText style={{ width: '16px', height: '16px', color: 'var(--bardahl-yellow)' }} />
                  Historique des Bons de Commande ({clientOrders.length})
                </h4>

                <div style={{ borderRadius: '12px', border: '1px solid var(--border-card)', overflow: 'hidden' }}>
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>N° Bon</th>
                        <th>Date</th>
                        <th>Mode Paiement</th>
                        <th>Expédition</th>
                        <th>Statut</th>
                        <th>Total TTC</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientOrders.length === 0 ? (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                            Aucun bon de commande trouvé pour ce client.
                          </td>
                        </tr>
                      ) : (
                        clientOrders.map(o => (
                          <tr key={o.id}>
                            <td><strong style={{ color: '#FFFFFF' }}>{o.orderNumber}</strong></td>
                            <td>{o.date}</td>
                            <td><span style={{ color: 'var(--bardahl-yellow)', fontWeight: '700' }}>{o.paymentMethod || 'Chèque'}</span></td>
                            <td><span style={{ color: '#007AFF', fontSize: '11px' }}>{o.modeExpedition || 'Transport Bardahl'}</span></td>
                            <td><span className={`badge-status ${o.status}`}>{o.status}</span></td>
                            <td style={{ color: 'var(--bardahl-yellow)', fontWeight: '900' }}>{(o.totalTtc || 0).toFixed(2)} DH</td>
                            <td>
                              <button
                                onClick={() => generateOrderPdf(o)}
                                className="btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '11px' }}
                                title="Télécharger PDF de cette commande"
                              >
                                <FileText style={{ width: '12px', height: '12px' }} /> PDF
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '14px', borderTop: '1px solid var(--border-card)' }}>
                <button
                  type="button"
                  onClick={() => setSelectedDetailClient(null)}
                  className="btn-secondary"
                  style={{ padding: '8px 18px', fontSize: '12px' }}
                >
                  Fermer
                </button>
                <button
                  type="button"
                  onClick={() => generateClientPdf(selectedDetailClient, clientOrders)}
                  className="btn-bardahl"
                  style={{ padding: '8px 18px', fontSize: '12px' }}
                >
                  <Download style={{ width: '14px', height: '14px' }} /> Télécharger Rapport PDF
                </button>
              </div>

            </div>
          </div>
        )
      })()}

      {/* Modal 2: Ajouter / Modifier Client */}
      {(showAddModal || editingClient) && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 1000 }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '480px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#FFFFFF', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building style={{ width: '20px', height: '20px', color: 'var(--bardahl-yellow)' }} />
              {editingClient ? 'Modifier la Fiche Client' : 'Nouveau Client Bardahl'}
            </h3>
            
            <form onSubmit={editingClient ? handleEditSubmit : handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Raison Sociale *</label>
                <input
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={e => setFormData({...formData, companyName: e.target.value})}
                  className="input-field"
                  placeholder="Ex: Auto Service Ain Sebaa"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>ICE (15 chiffres) *</label>
                  <input
                    type="text"
                    required
                    value={formData.ice}
                    onChange={e => setFormData({...formData, ice: e.target.value})}
                    className="input-field"
                    placeholder="001548792000088"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>RC</label>
                  <input
                    type="text"
                    value={formData.rc}
                    onChange={e => setFormData({...formData, rc: e.target.value})}
                    className="input-field"
                    placeholder="45892"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Adresse *</label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    className="input-field"
                    placeholder="Zone Ind. Ain Sebaa"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Ville *</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={e => setFormData({...formData, city: e.target.value})}
                    className="input-field"
                    placeholder="Casablanca"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Téléphone *</label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="input-field"
                    placeholder="+212 5 22 00 11 22"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Type Client</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value})}
                    className="input-field"
                  >
                    <option value="Garage">Garage</option>
                    <option value="Station">Station Service</option>
                    <option value="Flotte">Flotte Automobile</option>
                    <option value="Industriel">Industriel</option>
                    <option value="Grossiste">Grossiste</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-card)' }}>
                <button type="button" onClick={() => { setShowAddModal(false); setEditingClient(null); }} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '12px' }}>
                  Annuler
                </button>
                <button type="submit" className="btn-bardahl" style={{ padding: '8px 16px', fontSize: '12px' }}>
                  {editingClient ? 'Enregistrer Modifications' : 'Créer Client'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
