import React, { useState } from 'react'
import { Contact, UserPlus, MapPin, Target, Phone, Mail, Award, CheckCircle2, Lock, ShieldCheck, ShieldAlert, Edit3, Trash2, FileText, Download, Power, AlertTriangle, Plus, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { generatePortfolioByCommercialPdf } from '../utils/pdfGenerator'

const AVAILABLE_SECTORS = [
  'Casablanca', 'Mohammedia', 'Rabat', 'Salé', 'Kénitra',
  'Tanger', 'Tétouan', 'Marrakech', 'Agadir', 'Fès',
  'Meknès', 'Oujda', 'El Jadida', 'Safi', 'Béni Mellal', 'Nador'
]

export default function Commercials() {
  const { commercials, clients = [], orders = [], addCommercial, updateCommercial, deleteCommercial } = useApp()
  const [showModal, setShowModal] = useState(false)
  const [editingCommercial, setEditingCommercial] = useState(null)
  const [customSectorInput, setCustomSectorInput] = useState('')

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
      
      {/* Header & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#FFFFFF' }}>Équipe Commerciale Bardahl</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Gestion de l'équipe commerciale ({commercials.length}) - Multi-secteurs, Activation & Suivi Performance
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

      {/* 3-Column Commercials Grid */}
      <div className="commercials-grid">
        {commercials.map(c => {
          const isCommActive = c.isActive !== false
          const current = c.current || 0
          const target = c.target || 150000
          const percent = Math.min(100, Math.round((current / target) * 100))
          const commSectors = parseSectors(c.city || c.sectors)

          return (
            <div
              key={c.id}
              className="glass-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                opacity: isCommActive ? 1 : 0.7,
                border: isCommActive ? '1px solid var(--border-card)' : '1px solid rgba(255, 69, 58, 0.4)'
              }}
            >
              <div>
                {/* Header Profile with Active Badge */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '14px',
                      background: isCommActive ? 'var(--bardahl-yellow)' : '#3A3F4D',
                      color: isCommActive ? '#0D0F12' : '#FFFFFF',
                      fontWeight: '900',
                      fontSize: '18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: isCommActive ? '0 4px 15px rgba(255, 208, 0, 0.35)' : 'none'
                    }}>
                      {c.name ? c.name.split(' ').map(n => n[0]).join('') : 'CB'}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#FFFFFF' }}>{c.name}</h3>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Matricule : <strong style={{ color: '#FFFFFF' }}>{c.matricule}</strong></span>
                    </div>
                  </div>

                  {/* Status Indicator */}
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

                {/* Multiple Assigned Sectors Display */}
                <div style={{ marginBottom: '14px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                    <MapPin style={{ width: '12px', height: '12px', color: 'var(--bardahl-yellow)' }} /> Secteurs / Villes Assignés :
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {commSectors.map((sec, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background: 'rgba(255, 208, 0, 0.12)',
                          color: 'var(--bardahl-yellow)',
                          border: '1px solid rgba(255, 208, 0, 0.3)'
                        }}
                      >
                        {sec}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Contact details */}
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Phone style={{ width: '14px', height: '14px', color: 'var(--bardahl-yellow)' }} />
                    <span>{c.phone || '+212 6 61 22 33 44'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Mail style={{ width: '14px', height: '14px', color: 'var(--bardahl-yellow)' }} />
                    <strong style={{ color: '#FFFFFF' }}>{c.email}</strong>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Lock style={{ width: '14px', height: '14px', color: '#34C759' }} />
                    <span>Mot de passe : <strong style={{ color: '#34C759' }}>{c.password || '••••••'}</strong></span>
                  </div>
                </div>

                {/* Progress Bar & Performance Target */}
                <div style={{ background: 'var(--bg-obsidian)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-card)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '700', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Target style={{ width: '14px', height: '14px', color: 'var(--bardahl-yellow)' }} /> Réalisé ce mois
                    </span>
                    <span style={{ color: 'var(--bardahl-yellow)' }}>{percent}%</span>
                  </div>

                  <div style={{ width: '100%', height: '8px', background: '#2B313E', borderRadius: '10px', overflow: 'hidden', marginBottom: '8px' }}>
                    <div style={{ width: `${percent}%`, height: '100%', background: 'linear-gradient(90deg, #FFD000, #34C759)', borderRadius: '10px', transition: 'width 0.5s ease' }}></div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: '800' }}>
                    <span style={{ color: '#FFD000' }}>{current.toLocaleString()} DH</span>
                    <span style={{ color: 'var(--text-secondary)' }}>Cible: {target.toLocaleString()} DH</span>
                  </div>
                </div>
              </div>

              {/* Card Footer with Toggle Active, Edit & Delete */}
              <div style={{ paddingTop: '12px', marginTop: '14px', borderTop: '1px solid var(--border-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <button
                  onClick={() => handleToggleActiveStatus(c)}
                  style={{
                    padding: '5px 10px',
                    fontSize: '11px',
                    fontWeight: '800',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: isCommActive ? 'rgba(255, 69, 58, 0.15)' : 'rgba(52, 199, 89, 0.15)',
                    color: isCommActive ? '#FF453A' : '#34C759',
                    border: isCommActive ? '1px solid rgba(255, 69, 58, 0.3)' : '1px solid rgba(52, 199, 89, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title={isCommActive ? "Désactiver temporairement ce commercial" : "Réactiver ce commercial"}
                >
                  <Power style={{ width: '12px', height: '12px' }} />
                  {isCommActive ? 'Désactiver' : 'Activer'}
                </button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => generatePortfolioByCommercialPdf(clients, commercials, c.dbId || c.id)}
                    className="btn-secondary"
                    style={{ padding: '4px 8px', fontSize: '11px', color: '#007AFF', borderColor: '#007AFF', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="Télécharger la liste des clients de ce commercial en PDF"
                  >
                    <FileText style={{ width: '13px', height: '13px' }} /> Clients
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
                    onClick={() => handleDeleteCommercial(c)}
                    style={{ padding: '4px 8px', fontSize: '11px', color: '#FF453A', background: 'rgba(255, 69, 58, 0.1)', border: '1px solid rgba(255, 69, 58, 0.3)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="Supprimer ou Désactiver"
                  >
                    <Trash2 style={{ width: '13px', height: '13px' }} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

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
