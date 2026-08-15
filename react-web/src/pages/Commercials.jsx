import React, { useState } from 'react'
import { Contact, UserPlus, MapPin, Target, Phone, Mail, Award, CheckCircle2, Lock, ShieldCheck, Edit3, Trash2, FileText, Download } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { generatePortfolioByCommercialPdf } from '../utils/pdfGenerator'

export default function Commercials() {
  const { commercials, clients = [], addCommercial, updateCommercial, deleteCommercial } = useApp()
  const [showModal, setShowModal] = useState(false)
  const [editingCommercial, setEditingCommercial] = useState(null)

  const [formData, setFormData] = useState({
    name: '', city: '', matricule: '', phone: '', email: '', password: '', target: 150000, current: 0
  })

  const handleOpenAddModal = () => {
    setEditingCommercial(null)
    setFormData({ name: '', city: '', matricule: '', phone: '', email: '', password: '', target: 150000, current: 0 })
    setShowModal(true)
  }

  const handleOpenEditModal = (comm) => {
    setEditingCommercial(comm)
    setFormData({
      name: comm.name || '',
      city: comm.city || '',
      matricule: comm.matricule || '',
      phone: comm.phone || '',
      email: comm.email || '',
      password: comm.password || '123456',
      target: comm.target || 150000,
      current: comm.current || 0
    })
  }

  const handleDeleteCommercial = (comm) => {
    if (window.confirm(`Voulez-vous vraiment supprimer le compte commercial de "${comm.name}" ?`)) {
      deleteCommercial(comm.id)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name || !formData.email) return

    if (editingCommercial) {
      const updatedComm = {
        ...editingCommercial,
        name: formData.name,
        city: formData.city,
        matricule: formData.matricule,
        phone: formData.phone,
        email: formData.email,
        password: formData.password,
        target: parseFloat(formData.target) || 150000,
        current: parseFloat(formData.current) || 0
      }
      updateCommercial(updatedComm)
      setEditingCommercial(null)
      alert(`Compte commercial de ${updatedComm.name} modifié avec succès !`)
    } else {
      const newComm = {
        id: 'comm_' + Date.now(),
        name: formData.name,
        matricule: formData.matricule || `COM-00${commercials.length + 1}`,
        city: formData.city || 'Casablanca',
        phone: formData.phone || '+212 6 61 00 00 00',
        email: formData.email,
        password: formData.password || '123456',
        target: parseFloat(formData.target) || 150000,
        current: parseFloat(formData.current) || 0
      }

      addCommercial(newComm)
      setShowModal(false)
      alert(`Compte Commercial pour ${newComm.name} (${newComm.email}) créé avec succès !`)
    }

    setFormData({ name: '', city: '', matricule: '', phone: '', email: '', password: '', target: 150000, current: 0 })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#FFFFFF' }}>Équipe Commerciale Bardahl</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Gestion de l'équipe commerciale ({commercials.length}) - Ajouter, Modifier, Supprimer
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
          const current = c.current || 0
          const target = c.target || 150000
          const percent = Math.min(100, Math.round((current / target) * 100))

          return (
            <div key={c.id} className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    background: 'var(--bardahl-yellow)',
                    color: '#0D0F12',
                    fontWeight: '900',
                    fontSize: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 15px rgba(255, 208, 0, 0.35)'
                  }}>
                    {c.name ? c.name.split(' ').map(n => n[0]).join('') : 'CB'}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#FFFFFF' }}>{c.name}</h3>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <MapPin style={{ width: '12px', height: '12px', color: 'var(--bardahl-yellow)' }} />
                      <strong style={{ color: '#FFFFFF' }}>{c.city}</strong> | Mat: {c.matricule}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Phone style={{ width: '14px', height: '14px', color: 'var(--bardahl-yellow)' }} />
                    <span>{c.phone || '+212 6 61 22 33 44'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Mail style={{ width: '14px', height: '14px', color: 'var(--bardahl-yellow)' }} />
                    <strong style={{ color: '#FFFFFF' }}>{c.email || `${c.name.toLowerCase().replace(/\s+/g, '.')}@bardahl.ma`}</strong>
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

              {/* Card Footer with Modifier & Supprimer Buttons */}
              <div style={{ paddingTop: '12px', marginTop: '14px', borderTop: '1px solid var(--border-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', color: '#34C759', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck style={{ width: '12px', height: '12px' }} /> Actif
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => generatePortfolioByCommercialPdf(clients, commercials, c.dbId || c.id)}
                    className="btn-secondary"
                    style={{ padding: '4px 8px', fontSize: '11px', color: '#007AFF', borderColor: '#007AFF', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="Télécharger la liste des clients de ce commercial en PDF"
                  >
                    <FileText style={{ width: '13px', height: '13px' }} /> Clients PDF
                  </button>
                  <button
                    onClick={() => handleOpenEditModal(c)}
                    className="btn-secondary"
                    style={{ padding: '4px 8px', fontSize: '11px', color: 'var(--bardahl-yellow)', borderColor: 'var(--bardahl-yellow)' }}
                    title="Modifier"
                  >
                    <Edit3 style={{ width: '13px', height: '13px' }} /> Modifier
                  </button>
                  <button
                    onClick={() => handleDeleteCommercial(c)}
                    style={{ padding: '4px 8px', fontSize: '11px', color: '#FF453A', background: 'rgba(255, 69, 58, 0.1)', border: '1px solid rgba(255, 69, 58, 0.3)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="Supprimer"
                  >
                    <Trash2 style={{ width: '13px', height: '13px' }} /> Supprimer
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add / Edit Commercial Account Modal */}
      {(showModal || editingCommercial) && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 1000 }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '480px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#FFFFFF', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Contact style={{ width: '20px', height: '20px', color: 'var(--bardahl-yellow)' }} />
              {editingCommercial ? `Modifier le Profil de ${editingCommercial.name}` : 'Nouveau Commercial (Email & Mdps)'}
            </h3>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Nom et Prénom *</label>
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
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Adresse Email Identifiant *</label>
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
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Mot de Passe *</label>
                  <input
                    type="text"
                    required
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="input-field"
                    placeholder="Ex: 123456"
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
                    placeholder="+212 6 61 55 66 77"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Matricule *</label>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Secteur / Ville *</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={e => setFormData({...formData, city: e.target.value})}
                    className="input-field"
                    placeholder="Tanger"
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Objectif Mensuel (DH) *</label>
                  <input
                    type="number"
                    required
                    value={formData.target}
                    onChange={e => setFormData({...formData, target: parseFloat(e.target.value) || 0})}
                    className="input-field"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-card)' }}>
                <button type="button" onClick={() => { setShowModal(false); setEditingCommercial(null); }} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '12px' }}>
                  Annuler
                </button>
                <button type="submit" className="btn-bardahl" style={{ padding: '8px 16px', fontSize: '12px' }}>
                  <CheckCircle2 style={{ width: '16px', height: '16px' }} /> {editingCommercial ? 'Enregistrer Modifications' : 'Créer Compte User Commercial'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
