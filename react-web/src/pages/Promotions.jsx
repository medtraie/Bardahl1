import React, { useState } from 'react'
import { 
  Gift, Tag, Plus, Edit3, Trash2, CheckCircle2, XCircle, 
  Layers, ShoppingBag, DollarSign, Calendar, Sparkles, AlertCircle, Percent
} from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function Promotions() {
  const { promotions, addPromotion, updatePromotion, deletePromotion, togglePromotion, products, currentUser } = useApp()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [showModal, setShowModal] = useState(false)
  const [editingPromo, setEditingPromo] = useState(null)

  const isAdmin = currentUser?.role === 'ADMIN'

  // Form State
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formType, setFormType] = useState('TYPE_1')
  const [formTargetType, setFormTargetType] = useState('FAMILY')
  const [formTargetFamily, setFormTargetFamily] = useState('ADDITIFS')
  const [formTargetProductRef, setFormTargetProductRef] = useState('')
  const [formThreshold, setFormThreshold] = useState(10)
  const [formDiscountPercent, setFormDiscountPercent] = useState(5)
  const [formFreeItemType, setFormFreeItemType] = useState('SAME_PRODUCT')
  const [formFreeProductRef, setFormFreeProductRef] = useState('')
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

  // Extract unique categories from products
  const families = Array.from(new Set(products.map(p => (p.category || 'AUTRES').toUpperCase()))).sort()

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
    setFormTargetType('FAMILY')
    setFormTargetFamily(families[0] || 'ADDITIFS')
    setFormTargetProductRef(products[0]?.reference || '34131')
    setFormThreshold(10)
    setFormDiscountPercent(5)
    setFormFreeItemType('SAME_PRODUCT')
    setFormFreeProductRef(products[0]?.reference || '34131')
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
    setFormTargetType(promo.targetType || 'FAMILY')
    setFormTargetFamily(promo.targetFamily || families[0] || 'ADDITIFS')
    setFormTargetProductRef(promo.targetProductRef || products[0]?.reference || '')
    setFormThreshold(promo.threshold || 10)
    setFormDiscountPercent(promo.discountPercent || 0)
    setFormFreeItemType(promo.freeItemType || 'SAME_PRODUCT')
    setFormFreeProductRef(promo.freeProductRef || '')
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
      targetProductRef: formTargetType === 'PRODUCT' ? formTargetProductRef : undefined,
      targetProductName: formTargetType === 'PRODUCT' ? (targetProductObj?.name || formTargetProductRef) : undefined,
      targetProductId: formTargetType === 'PRODUCT' ? (targetProductObj?.id || formTargetProductRef) : undefined,
      threshold: parseFloat(formThreshold) || 1,
      discountPercent: parseFloat(formDiscountPercent) || 0,
      freeItemType: formType === 'TYPE_2' ? formFreeItemType : undefined,
      freeProductRef: (formType === 'TYPE_2' && formFreeItemType === 'DIFFERENT_PRODUCT') ? formFreeProductRef : undefined,
      freeProductName: (formType === 'TYPE_2' && formFreeItemType === 'DIFFERENT_PRODUCT') ? (freeProductObj?.name || formFreeProductRef) : undefined,
      freeProductId: (formType === 'TYPE_2' && formFreeItemType === 'DIFFERENT_PRODUCT') ? (freeProductObj?.id || formFreeProductRef) : undefined,
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

      {/* Summary KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="glass-card" style={{ padding: '16px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '700' }}>TOTAL PROMOTIONS</span>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#FFFFFF', marginTop: '4px' }}>{promotions.length}</div>
        </div>
        <div className="glass-card" style={{ padding: '16px' }}>
          <span style={{ fontSize: '12px', color: '#34C759', fontWeight: '700' }}>OFFRES ACTIVES</span>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#34C759', marginTop: '4px' }}>
            {promotions.filter(p => p.isActive !== false).length}
          </div>
        </div>
        <div className="glass-card" style={{ padding: '16px' }}>
          <span style={{ fontSize: '12px', color: 'var(--bardahl-yellow)', fontWeight: '700' }}>AVEC CARTONS GRATUITS</span>
          <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--bardahl-yellow)', marginTop: '4px' }}>
            {promotions.filter(p => p.type === 'TYPE_2').length}
          </div>
        </div>
        <div className="glass-card" style={{ padding: '16px' }}>
          <span style={{ fontSize: '12px', color: '#FF9500', fontWeight: '700' }}>BONS D'ACHAT FIXES</span>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#FF9500', marginTop: '4px' }}>
            {promotions.filter(p => p.type === 'TYPE_3').length}
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="glass-card" style={{ padding: '16px', display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '240px' }}>
          <input
            type="text"
            className="input-field"
            placeholder="🔎 Rechercher par nom d'offre, famille ou produit..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
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
      </div>

      {/* Promotions List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '16px' }}>
        {filteredPromos.length === 0 ? (
          <div className="glass-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
            <AlertCircle size={40} style={{ color: 'var(--text-secondary)', margin: '0 auto 12px' }} />
            <h4 style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: '700' }}>Aucune promotion trouvée</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>Modifiez vos filtres ou créez une nouvelle offre commerciale.</p>
          </div>
        ) : (
          filteredPromos.map(promo => {
            const isActive = promo.isActive !== false
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
                </div>

                {isAdmin && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border-card)' }}>
                    <button
                      onClick={() => handleOpenEdit(promo)}
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Edit3 size={14} /> Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(promo)}
                      style={{ padding: '6px 12px', fontSize: '12px', color: '#FF453A', background: 'rgba(255, 69, 58, 0.1)', border: '1px solid rgba(255, 69, 58, 0.3)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Trash2 size={14} /> Supprimer
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

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

              {/* Target Type */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    CIBLE DE LA PROMOTION
                  </label>
                  <select value={formTargetType} onChange={e => setFormTargetType(e.target.value)} className="input-field" style={{ width: '100%' }}>
                    <option value="FAMILY">Famille de Produits Entière</option>
                    <option value="PRODUCT">Produit / Référence Spécifique</option>
                  </select>
                </div>

                <div>
                  {formTargetType === 'FAMILY' ? (
                    <>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        FAMILLE CONCERNÉE
                      </label>
                      <select value={formTargetFamily} onChange={e => setFormTargetFamily(e.target.value)} className="input-field" style={{ width: '100%' }}>
                        {families.map(fam => (
                          <option key={fam} value={fam}>{fam}</option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <>
                      <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        PRODUIT CONCERNÉ
                      </label>
                      <select value={formTargetProductRef} onChange={e => setFormTargetProductRef(e.target.value)} className="input-field" style={{ width: '100%' }}>
                        {products.map(p => (
                          <option key={p.id} value={p.reference}>[{p.reference}] {p.name}</option>
                        ))}
                      </select>
                    </>
                  )}
                </div>
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
                    <div>
                      <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        RÉFÉRENCE OFFERTE EN CADEAU
                      </label>
                      <select value={formFreeProductRef} onChange={e => setFormFreeProductRef(e.target.value)} className="input-field" style={{ width: '100%', fontSize: '12px' }}>
                        {products.map(p => (
                          <option key={p.id} value={p.reference}>[{p.reference}] {p.name}</option>
                        ))}
                      </select>
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

    </div>
  )
}
