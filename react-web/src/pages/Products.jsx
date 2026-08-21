import React, { useState } from 'react'
import { Search, Package, Tag, Filter, Plus, Edit3, Trash2, Box } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function Products() {
  const { products, addProduct, updateProduct, deleteProduct } = useApp()
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)

  const [formData, setFormData] = useState({
    code: '', reference: '', name: '', category: 'Additifs', packaging: 'Bidon 1L', priceTtc: '', stock: '100'
  })

  const categories = [
    { id: 'ALL', label: 'Tous les Produits' },
    { id: 'ADDITIFS', label: 'Additifs & Traitements' },
    { id: 'FLUIDES', label: 'Fluides & LR' },
    { id: 'LUBRIFIANTS', label: 'Lubrifiants Auto' },
    { id: 'AEROSOLS', label: 'Aérosols & Nettoyants' },
    { id: 'INDUSTRIE', label: 'Industrie & Graisses' },
  ]

  const filteredProducts = products.filter(p => {
    const q = search.trim().toLowerCase()
    const matchesSearch = !q ||
      (p.name || '').toLowerCase().includes(q) ||
      (p.code || '').toLowerCase().includes(q) ||
      (p.reference || '').toLowerCase().includes(q)

    if (!matchesSearch) return false
    if (selectedCategory === 'ALL') return true

    const pCat = (p.category || '').toUpperCase()
    const pName = (p.name || '').toUpperCase()

    if (selectedCategory === 'ADDITIFS') {
      return pCat.includes('ADDITIF') || pName.includes('ADDITIF') || pName.includes('TRAITEMENT') || pName.includes('CLEANER') || pName.includes('STOP FUITE') || pName.includes('INJECTEUR')
    }
    if (selectedCategory === 'FLUIDES') {
      return pCat.includes('FLUIDE') || pCat.includes('LR') || pName.includes('XCL') || pName.includes('REFROIDISSEMENT') || pName.includes('DOT') || pName.includes('RAD')
    }
    if (selectedCategory === 'LUBRIFIANTS') {
      return pCat.includes('LUBRIFIANT') || pCat.includes('HUILE') || pName.includes('10W') || pName.includes('5W') || pName.includes('XTRA') || pName.includes('PLASMA') || pName.includes('HUILE')
    }
    if (selectedCategory === 'AEROSOLS') {
      return pCat.includes('AEROSOL') || pName.includes('SPRAY') || pName.includes('AEROSOL') || pName.includes('BRAKE') || pName.includes('DEGRIPPANT') || pName.includes('NETTOYANT')
    }
    if (selectedCategory === 'INDUSTRIE') {
      return pCat.includes('INDUSTRIE') || pCat.includes('GRAISSE') || pName.includes('GRAISSE') || pName.includes('LITHIUM') || pName.includes('HYDRAULIQUE') || pName.includes('PONT')
    }
    return pCat.includes(selectedCategory)
  })

  const handleOpenAddModal = () => {
    setFormData({ code: '', reference: '', name: '', category: 'Additifs', packaging: 'Bidon 1L', priceTtc: '', stock: '100' })
    setShowAddModal(true)
  }

  const handleOpenEditModal = (p) => {
    setEditingProduct(p)
    setFormData({
      code: p.code || '',
      reference: p.reference || '',
      name: p.name || '',
      category: p.category || 'Additifs',
      packaging: p.packaging || 'Bidon 1L',
      priceTtc: p.priceTtc ? p.priceTtc.toString() : '',
      stock: p.stock ? p.stock.toString() : '100'
    })
  }

  const handleAddSubmit = (e) => {
    e.preventDefault()
    addProduct(formData)
    setShowAddModal(false)
    setFormData({ code: '', reference: '', name: '', category: 'Additifs', packaging: 'Bidon 1L', priceTtc: '', stock: '100' })
  }

  const handleEditSubmit = (e) => {
    e.preventDefault()
    if (!editingProduct) return
    updateProduct({
      ...editingProduct,
      ...formData,
      priceTtc: parseFloat(formData.priceTtc) || 0,
      stock: parseInt(formData.stock) || 100
    })
    setEditingProduct(null)
  }

  const handleDelete = (p) => {
    if (window.confirm(`Voulez-vous vraiment supprimer le produit "${p.name}" ?`)) {
      deleteProduct(p.id)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header & Filter Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#FFFFFF' }}>Catalogue Officiel des Produits Bardahl</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {filteredProducts.length} références disponibles (Ajouter, Modifier, Supprimer)
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '280px' }}>
            <Search style={{ width: '16px', height: '16px', color: 'var(--bardahl-yellow)', position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Chercher nom, réf, code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '40px' }}
            />
          </div>

          <button onClick={handleOpenAddModal} className="btn-bardahl" style={{ padding: '10px 20px', fontSize: '13px' }}>
            <Plus style={{ width: '16px', height: '16px' }} /> Ajouter Produit
          </button>
        </div>
      </div>

      {/* Category Selection Filter Chips */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
        <Filter style={{ width: '16px', height: '16px', color: 'var(--bardahl-yellow)', flexShrink: 0 }} />
        {categories.map(cat => {
          const isSelected = selectedCategory === cat.id
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                padding: '8px 16px',
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
              {cat.label}
            </button>
          )
        })}
      </div>

      {/* 3-Column Responsive Product Cards Grid */}
      <div className="products-grid">
        {filteredProducts.map(p => (
          <div key={p.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    background: 'rgba(255, 208, 0, 0.15)',
                    color: '#FFD000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Package style={{ width: '20px', height: '20px' }} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '14px', fontWeight: '800', color: '#FFFFFF', lineHeight: '1.3' }}>{p.name}</h4>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Réf: <strong style={{ color: 'var(--bardahl-yellow)' }}>{p.reference}</strong></span>
                  </div>
                </div>

                {p.viscosity && p.viscosity !== 'N/A' && (
                  <span style={{
                    background: 'var(--bardahl-yellow)',
                    color: '#0D0F12',
                    fontSize: '10px',
                    fontWeight: '900',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    flexShrink: 0
                  }}>
                    {p.viscosity}
                  </span>
                )}
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div>Code Article : <strong style={{ color: '#FFFFFF' }}>{p.code}</strong></div>
                <div>Conditionnement : <strong style={{ color: '#FFFFFF' }}>{p.packaging}</strong></div>
              </div>
            </div>

            <div style={{ paddingTop: '12px', marginTop: '14px', borderTop: '1px solid var(--border-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '18px', fontWeight: '900', color: 'var(--bardahl-yellow)' }}>{(p.priceTtc || 0).toFixed(2)} DH</span>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block' }}>Prix Unit. TTC</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => handleOpenEditModal(p)}
                  className="btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--bardahl-yellow)', borderColor: 'var(--bardahl-yellow)' }}
                  title="Modifier"
                >
                  <Edit3 style={{ width: '13px', height: '13px' }} /> Modifier
                </button>
                <button
                  onClick={() => handleDelete(p)}
                  style={{ padding: '4px 8px', fontSize: '11px', color: '#FF453A', background: 'rgba(255, 69, 58, 0.1)', border: '1px solid rgba(255, 69, 58, 0.3)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  title="Supprimer"
                >
                  <Trash2 style={{ width: '13px', height: '13px' }} /> Supprimer
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Ajouter / Modifier Produit */}
      {(showAddModal || editingProduct) && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 1000 }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '480px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#FFFFFF', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Box style={{ width: '20px', height: '20px', color: 'var(--bardahl-yellow)' }} />
              {editingProduct ? 'Modifier Produit Bardahl' : 'Ajouter un Produit au Catalogue'}
            </h3>
            
            <form onSubmit={editingProduct ? handleEditSubmit : handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Désignation Produit *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="input-field"
                  placeholder="Ex: Bardahl Nettoyant Injecteurs 300ml"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Référence *</label>
                  <input
                    type="text"
                    required
                    value={formData.reference}
                    onChange={e => setFormData({...formData, reference: e.target.value})}
                    className="input-field"
                    placeholder="1108"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Code Article</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={e => setFormData({...formData, code: e.target.value})}
                    className="input-field"
                    placeholder="BAR-1108"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Prix TTC (DH) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.priceTtc}
                    onChange={e => setFormData({...formData, priceTtc: e.target.value})}
                    className="input-field"
                    placeholder="120.00"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Conditionnement</label>
                  <input
                    type="text"
                    value={formData.packaging}
                    onChange={e => setFormData({...formData, packaging: e.target.value})}
                    className="input-field"
                    placeholder="Flacon 300ml"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Catégorie</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    className="input-field"
                  >
                    <option value="Additifs">Additifs</option>
                    <option value="Fluides">Fluides & LR</option>
                    <option value="Lubrifiants">Lubrifiants Auto</option>
                    <option value="Industrie">Industrie & Specs</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Stock Disponible</label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={e => setFormData({...formData, stock: e.target.value})}
                    className="input-field"
                    placeholder="100"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-card)' }}>
                <button type="button" onClick={() => { setShowAddModal(false); setEditingProduct(null); }} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '12px' }}>
                  Annuler
                </button>
                <button type="submit" className="btn-bardahl" style={{ padding: '8px 16px', fontSize: '12px' }}>
                  {editingProduct ? 'Enregistrer Modifications' : 'Ajouter Produit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
