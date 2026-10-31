import React, { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Search, Package, Tag, Filter, Plus, Edit3, Trash2, Box, Layers } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { DEFAULT_BARDAHL_FAMILIES, getFamilyInfo } from '../data/familiesData'
import { getProductUnitsPerCarton } from '../data/productsData'

export default function Products() {
  const { products, addProduct, updateProduct, deleteProduct, productFamilies = [], currentUser } = useApp()
  const isAdmin = currentUser?.role === 'ADMIN' || (currentUser?.email || '').toLowerCase() === 'bardahl@gmail.com'

  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)

  const activeFamilies = useMemo(() => {
    return (productFamilies && productFamilies.length > 0)
      ? productFamilies.filter(f => f.isActive !== false)
      : DEFAULT_BARDAHL_FAMILIES
  }, [productFamilies])

  const [formData, setFormData] = useState({
    code: '', reference: '', name: '', category: 'FA0015', packaging: 'Carton de 12', unitsPerBox: '12', priceTtc: '', stock: '100'
  })

  const categories = useMemo(() => [
    { id: 'ALL', label: 'Toutes les Familles' },
    ...activeFamilies.map(f => ({ id: f.code, label: `${f.icon} ${f.label}` }))
  ], [activeFamilies])

  const filteredProducts = products.filter(p => {
    const q = search.trim().toLowerCase()
    const matchesSearch = !q ||
      (p.name || '').toLowerCase().includes(q) ||
      (p.code || '').toLowerCase().includes(q) ||
      (p.reference || '').toLowerCase().includes(q)

    if (!matchesSearch) return false
    if (selectedCategory === 'ALL') return true

    const fam = getFamilyInfo(p.category, activeFamilies)
    return fam.code === selectedCategory || (p.category || '').toUpperCase().includes(selectedCategory)
  })

  const handleOpenAddModal = () => {
    if (!isAdmin) return
    setFormData({ code: '', reference: '', name: '', category: activeFamilies[0]?.code || 'FA0015', packaging: 'Carton de 12', unitsPerBox: '12', priceTtc: '', stock: '100' })
    setShowAddModal(true)
  }

  const handleOpenEditModal = (p) => {
    if (!isAdmin) return
    setEditingProduct(p)
    const detectedUnits = p.unitsPerBox || getProductUnitsPerCarton(p.reference, p.packaging) || '12'
    setFormData({
      code: p.code || '',
      reference: p.reference || '',
      name: p.name || '',
      category: p.category || activeFamilies[0]?.code || 'FA0015',
      packaging: p.packaging || `Carton de ${detectedUnits}`,
      unitsPerBox: String(detectedUnits),
      priceTtc: p.priceTtc || '',
      stock: p.stock || '100'
    })
  }

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    if (!isAdmin) return
    const parsedUnits = parseInt(formData.unitsPerBox, 10) || 12
    const cleanPackaging = formData.packaging.trim() || `Carton de ${parsedUnits}`
    await addProduct({
      ...formData,
      priceTtc: parseFloat(formData.priceTtc) || 0,
      stock: parseInt(formData.stock, 10) || 100,
      unitsPerBox: parsedUnits,
      packaging: cleanPackaging
    })
    const fam = getFamilyInfo(formData.category, activeFamilies)
    setShowAddModal(false)
    alert(`Produit « ${formData.name} » ajouté avec succès !\nFamille : ${fam.icon} ${fam.label}\nConditionnement : ${cleanPackaging}\nEnregistré dans la base de données.`)
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!isAdmin) return
    const parsedUnits = parseInt(formData.unitsPerBox, 10) || 12
    const cleanPackaging = formData.packaging.trim() || `Carton de ${parsedUnits}`
    await updateProduct({
      ...editingProduct,
      ...formData,
      priceTtc: parseFloat(formData.priceTtc) || 0,
      stock: parseInt(formData.stock, 10) || 100,
      unitsPerBox: parsedUnits,
      packaging: cleanPackaging
    })
    const fam = getFamilyInfo(formData.category, activeFamilies)
    setEditingProduct(null)
    alert(`Fiche produit « ${formData.name} » modifiée avec succès !\nFamille associée : ${fam.icon} ${fam.label}\nConditionnement : ${formData.unitsPerBox} unités par carton.\nEnregistré dans la base de données.`)
  }

  const handleDelete = async (p) => {
    if (!isAdmin) return
    if (window.confirm(`Voulez-vous vraiment supprimer le produit "${p.name}" ?`)) {
      await deleteProduct(p.id)
      alert(`Produit « ${p.name} » supprimé.`)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header & Filter Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#FFFFFF' }}>Catalogue Officiel des Produits Bardahl</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {filteredProducts.length} références disponibles {isAdmin ? '(Ajouter, Modifier, Supprimer)' : ''}
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

          {isAdmin && (
            <button onClick={handleOpenAddModal} className="btn-bardahl" style={{ padding: '10px 20px', fontSize: '13px' }}>
              <Plus style={{ width: '16px', height: '16px' }} /> Ajouter Produit
            </button>
          )}
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
              className={`filter-chip ${isSelected ? 'active' : ''}`}
              style={{
                background: isSelected ? 'var(--bardahl-yellow)' : 'var(--bg-card)',
                color: isSelected ? '#0D0F12' : 'var(--text-secondary)',
                border: `1px solid ${isSelected ? 'var(--bardahl-yellow)' : 'var(--border-card)'}`,
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: isSelected ? '800' : '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {cat.label}
            </button>
          )
        })}
      </div>

      {/* Products Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {filteredProducts.map(p => (
          <div
            key={p.id}
            className="glass-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div>
              {/* Product Header / Reference */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--bardahl-yellow)', background: 'rgba(255, 208, 0, 0.1)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(255, 208, 0, 0.25)' }}>
                  Réf. {p.reference}
                </span>
                {p.code && (
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    {p.code}
                  </span>
                )}
              </div>

              {/* Product Name */}
              <h3 style={{ fontSize: '14px', fontWeight: '800', color: '#FFFFFF', marginBottom: '10px', lineHeight: '1.4' }}>
                {p.name}
              </h3>

              {/* Family Tag */}
              <div style={{ marginBottom: '12px' }}>
                {(() => {
                  const fam = getFamilyInfo(p.category, activeFamilies)
                  return (
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      fontWeight: '700',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: 'var(--text-secondary)'
                    }}>
                      <span>{fam.icon}</span>
                      <span>{fam.label}</span>
                    </span>
                  )
                })()}
              </div>

              {/* Product Specs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '10px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.05)', fontSize: '11px' }}>
                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '10px' }}>Conditionnement</span>
                  <span style={{ color: '#E2E8F0', fontWeight: '700' }}>{p.packaging || 'Carton'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '10px' }}>Unités / Carton</span>
                  <span style={{ color: 'var(--bardahl-yellow)', fontWeight: '800' }}>
                    {p.unitsPerBox || getProductUnitsPerCarton(p.reference, p.packaging) || '12'} pcs
                  </span>
                </div>
              </div>
            </div>

            <div style={{ paddingTop: '12px', marginTop: '14px', borderTop: '1px solid var(--border-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '18px', fontWeight: '900', color: 'var(--bardahl-yellow)' }}>{(p.priceTtc || 0).toFixed(2)} DH</span>
                <span style={{ fontSize: '10px', color: 'var(--text-secondary)', display: 'block' }}>Prix Unit. TTC</span>
              </div>

              {isAdmin && (
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
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Ajouter / Modifier Produit (Admin Only) */}
      {isAdmin && (showAddModal || editingProduct) && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 9999 }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '520px' }}>
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
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Famille de produits *</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    className="input-field"
                  >
                    {activeFamilies.map(fam => (
                      <option key={fam.code} value={fam.code}>
                        {fam.icon} {fam.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Unités par carton *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.unitsPerBox}
                    onChange={e => setFormData({...formData, unitsPerBox: e.target.value})}
                    className="input-field"
                    placeholder="Ex: 6, 12, 24"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Conditionnement</label>
                  <input
                    type="text"
                    value={formData.packaging}
                    onChange={e => setFormData({...formData, packaging: e.target.value})}
                    className="input-field"
                    placeholder="Carton de 12"
                  />
                </div>
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
        </div>,
        document.body
      )}
    </div>
  )
}
