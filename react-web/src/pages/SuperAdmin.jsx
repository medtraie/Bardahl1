import React, { useState, useMemo } from 'react'
import { 
  ShieldCheck, ShieldAlert, Plus, Users, UserCheck, Eye, 
  Trash2, Edit3, Key, Mail, Phone, Building, Search, 
  CheckCircle2, AlertTriangle, Database, ArrowRight, Copy, Check
} from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function SuperAdmin({ setActiveTab }) {
  const { 
    currentUser, 
    tenantUsers = [], 
    addTenantUser, 
    updateTenantUser, 
    deleteTenantUser,
    inspectTenant,
    commercials = [],
    clients = [],
    orders = []
  } = useApp()

  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [copiedSql, setCopiedSql] = useState(false)
  const [showSqlModal, setShowSqlModal] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    email: '',
    password: '',
    phone: '',
    isActive: true
  })

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return tenantUsers.filter(u => {
      const q = searchTerm.toLowerCase().trim()
      if (!q) return true
      const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase()
      const company = (u.company_name || '').toLowerCase()
      const email = (u.email || '').toLowerCase()
      const phone = (u.phone || '').toLowerCase()
      return fullName.includes(q) || company.includes(q) || email.includes(q) || phone.includes(q)
    })
  }, [tenantUsers, searchTerm])

  const handleOpenAddModal = () => {
    setEditingUser(null)
    setFormData({
      name: '',
      companyName: '',
      email: '',
      password: 'User@' + Math.floor(1000 + Math.random() * 9000),
      phone: '+212 6 ',
      isActive: true
    })
    setShowModal(true)
  }

  const handleOpenEditModal = (user) => {
    setEditingUser(user)
    setFormData({
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
      companyName: user.company_name || '',
      email: user.email,
      password: user.avatar_url || '',
      phone: user.phone || '',
      isActive: user.is_active !== false
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.email || !formData.name) return

    if (editingUser) {
      await updateTenantUser({
        ...editingUser,
        name: formData.name,
        companyName: formData.companyName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        isActive: formData.isActive
      })
      alert(`Compte de ${formData.name} mis à jour avec succès !`)
    } else {
      await addTenantUser({
        name: formData.name,
        companyName: formData.companyName,
        email: formData.email,
        password: formData.password || '123456',
        phone: formData.phone,
        isActive: formData.isActive
      })
      alert(`Nouveau compte utilisateur pour "${formData.name}" créé avec succès ! Son application est initialisée vide et 100% isolée.`)
    }
    setShowModal(false)
  }

  const handleDelete = async (user) => {
    const confirm = window.confirm(
      `⚠️ ATTENTION : Voulez-vous vraiment supprimer définitivement le compte "${user.email}" ?\n\nToutes les données de ce tenant seront supprimées.`
    )
    if (confirm) {
      await deleteTenantUser(user.id)
      alert(`Compte supprimé avec succès.`)
    }
  }

  const handleInspect = (user) => {
    inspectTenant(user)
    if (typeof setActiveTab === 'function') {
      setActiveTab('dashboard')
    }
  }

  const handleToggleStatus = async (user) => {
    const nextStatus = user.is_active === false
    await updateTenantUser({
      ...user,
      isActive: nextStatus,
      is_active: nextStatus
    })
  }

  const sqlCode = `-- EXÉCUTER CE SCRIPT DANS SUPABASE SQL EDITOR SI NÉCESSAIRE :
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);

ALTER TABLE public.commercials ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_commercials_user_id ON public.commercials(user_id);`

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlCode)
    setCopiedSql(true)
    setTimeout(() => setCopiedSql(false), 2500)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(255, 69, 58, 0.15) 0%, rgba(255, 208, 0, 0.1) 100%)',
        border: '1px solid rgba(255, 69, 58, 0.35)',
        borderRadius: '16px',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              background: '#FF453A',
              color: '#FFFFFF',
              fontSize: '11px',
              fontWeight: '900',
              padding: '3px 8px',
              borderRadius: '6px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              SUPER ADMIN
            </span>
            <h1 style={{ fontSize: '22px', fontWeight: '900', color: '#FFFFFF', margin: 0 }}>
              Panel Super Administrateur & Isolation Multi-Tenants
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px', maxWidth: '750px' }}>
            Gestion centralisée des comptes administrateurs / tenants. Chaque compte créé dispose d’une application entièrement vide et hermétique : 
            l’<strong>Utilisateur A</strong> ne voit que ses données, l’<strong>Utilisateur B</strong> ne voit que les siennes, et les anciennes lignes sans <code style={{ color: 'var(--bardahl-yellow)' }}>user_id</code> restent invisibles.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            onClick={() => setShowSqlModal(true)}
            className="btn-secondary"
            style={{ fontSize: '12px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Database style={{ width: '15px', height: '15px', color: 'var(--bardahl-yellow)' }} /> Script SQL Supabase
          </button>
          <button 
            onClick={handleOpenAddModal}
            className="btn-bardahl"
            style={{ fontSize: '12px', padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus style={{ width: '16px', height: '16px' }} /> Créer Nouveau Compte Tenant
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(255, 208, 0, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--bardahl-yellow)' }}>
            <Users style={{ width: '22px', height: '22px' }} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>Comptes Tenants</div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#FFFFFF', marginTop: '2px' }}>{tenantUsers.length}</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(52, 199, 89, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34C759' }}>
            <UserCheck style={{ width: '22px', height: '22px' }} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>Comptes Actifs</div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#34C759', marginTop: '2px' }}>
              {tenantUsers.filter(u => u.is_active !== false).length}
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(0, 122, 255, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#007AFF' }}>
            <ShieldCheck style={{ width: '22px', height: '22px' }} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase' }}>Isolation Stricte</div>
            <div style={{ fontSize: '13px', fontWeight: '900', color: '#007AFF', marginTop: '4px' }}>
              Active (user_id strict)
            </div>
          </div>
        </div>
      </div>

      {/* Search & Accounts Table */}
      <div className="glass-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder="Rechercher par nom, email, entreprise..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input-field"
              style={{ paddingLeft: '38px', fontSize: '12px' }}
            />
          </div>

          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Affichage de <strong>{filteredUsers.length}</strong> compte(s)
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="custom-table" style={{ width: '100%', margin: 0 }}>
            <thead>
              <tr>
                <th>Utilisateur / Tenant</th>
                <th>Entreprise</th>
                <th>Email de Connexion</th>
                <th>Téléphone</th>
                <th>Statut</th>
                <th style={{ textAlign: 'center' }}>Actions & Inspection</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
                    Aucun compte utilisateur trouvé. Cliquez sur "Créer Nouveau Compte Tenant" pour en ajouter un.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => {
                  const isActive = user.is_active !== false
                  const displayName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email

                  return (
                    <tr key={user.id} style={{ opacity: isActive ? 1 : 0.65 }}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '10px',
                            background: isActive ? 'linear-gradient(135deg, var(--bardahl-yellow), #E5B800)' : '#3A3F4D',
                            color: isActive ? '#000000' : '#FFFFFF',
                            fontWeight: '900',
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {displayName.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: '800', color: '#FFFFFF', fontSize: '13px' }}>{displayName}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                              ID: {user.id.substring(0, 13)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '700', color: '#E2E8F0' }}>
                          <Building style={{ width: '14px', height: '14px', color: 'var(--bardahl-yellow)' }} />
                          {user.company_name || 'Organisation Bardahl'}
                        </div>
                      </td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#FFFFFF', fontWeight: '600' }}>
                          <Mail style={{ width: '13px', height: '13px', color: 'var(--text-secondary)' }} />
                          {user.email}
                        </div>
                      </td>

                      <td>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {user.phone || '+212 6 00 00 00 00'}
                        </div>
                      </td>

                      <td>
                        <button
                          onClick={() => handleToggleStatus(user)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: '800',
                            cursor: 'pointer',
                            background: isActive ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 69, 58, 0.15)',
                            color: isActive ? '#34C759' : '#FF453A',
                            border: isActive ? '1px solid rgba(52, 199, 89, 0.4)' : '1px solid rgba(255, 69, 58, 0.4)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title="Cliquer pour activer / désactiver ce compte"
                        >
                          {isActive ? <CheckCircle2 style={{ width: '12px', height: '12px' }} /> : <AlertTriangle style={{ width: '12px', height: '12px' }} />}
                          {isActive ? 'Actif' : 'Désactivé'}
                        </button>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {/* Inspect Session Button */}
                          <button
                            onClick={() => handleInspect(user)}
                            className="btn-bardahl"
                            style={{
                              padding: '6px 12px',
                              fontSize: '11px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px'
                            }}
                            title="Inspecter l'application du point de vue de cet utilisateur (Vérifier qu'elle est bien vide ou isolée)"
                          >
                            <Eye style={{ width: '13px', height: '13px' }} /> Inspecter Session
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => handleOpenEditModal(user)}
                            className="btn-secondary"
                            style={{ padding: '6px 9px', fontSize: '11px', color: 'var(--bardahl-yellow)', borderColor: 'var(--bardahl-yellow)' }}
                            title="Modifier les coordonnées et mot de passe"
                          >
                            <Edit3 style={{ width: '13px', height: '13px' }} />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDelete(user)}
                            style={{
                              padding: '6px 9px',
                              fontSize: '11px',
                              color: '#FF453A',
                              background: 'rgba(255, 69, 58, 0.12)',
                              border: '1px solid rgba(255, 69, 58, 0.35)',
                              borderRadius: '8px',
                              cursor: 'pointer'
                            }}
                            title="Supprimer définitivement ce compte"
                          >
                            <Trash2 style={{ width: '13px', height: '13px' }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create / Edit Tenant User */}
      {showModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px'
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '520px', padding: '24px', borderColor: 'var(--bardahl-yellow)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users style={{ width: '20px', height: '20px', color: 'var(--bardahl-yellow)' }} />
                <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#FFFFFF', margin: 0 }}>
                  {editingUser ? "Modifier le Compte Utilisateur" : "Créer un Nouveau Compte (Espace Isolé)"}
                </h2>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '18px' }}>
              En créant ce compte, l'utilisateur disposera d'un espace complètement vide. Il ne pourra voir que ses propres données et ne verra aucune donnée des autres comptes.
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px', fontWeight: '700' }}>
                  Nom Complet de l'Administrateur *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Mohammed Alami"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px', fontWeight: '700' }}>
                  Nom de l'Entreprise / Organisation
                </label>
                <input
                  type="text"
                  placeholder="ex: Bardahl Souss / SARL Lubrifiants"
                  value={formData.companyName}
                  onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px', fontWeight: '700' }}>
                  Adresse Email (Identifiant de Connexion) *
                </label>
                <input
                  type="email"
                  required
                  placeholder="ex: alami@bardahl.ma"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="input-field"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px', fontWeight: '700' }}>
                    Mot de Passe *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Mot de passe"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '5px', fontWeight: '700' }}>
                    Téléphone
                  </label>
                  <input
                    type="text"
                    placeholder="+212 6..."
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="input-field"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                <input
                  type="checkbox"
                  id="isActiveCheck"
                  checked={formData.isActive}
                  onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--bardahl-yellow)', cursor: 'pointer' }}
                />
                <label htmlFor="isActiveCheck" style={{ fontSize: '13px', color: '#FFFFFF', fontWeight: '700', cursor: 'pointer' }}>
                  Compte Actif (Autorisé à se connecter)
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                  style={{ padding: '10px 16px' }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn-bardahl"
                  style={{ padding: '10px 20px' }}
                >
                  {editingUser ? "Enregistrer les Modifications" : "Créer le Compte Isolé"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: SQL Migration Script */}
      {showSqlModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px'
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '640px', padding: '24px', borderColor: 'var(--bardahl-yellow)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database style={{ width: '20px', height: '20px', color: 'var(--bardahl-yellow)' }} />
                <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#FFFFFF', margin: 0 }}>
                  Script SQL Supabase pour Isolation Stricte
                </h2>
              </div>
              <button 
                onClick={() => setShowSqlModal(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              Copiez ce script et exécutez-le dans le <strong>SQL Editor</strong> de Supabase pour créer les clés étrangères <code style={{ color: 'var(--bardahl-yellow)' }}>user_id</code> sur les tables clients, commandes et commerciaux :
            </p>

            <pre style={{
              background: '#0D0F12',
              padding: '14px',
              borderRadius: '10px',
              border: '1px solid var(--border-card)',
              color: '#34C759',
              fontSize: '11.5px',
              fontFamily: 'monospace',
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
              marginBottom: '16px'
            }}>
              {sqlCode}
            </pre>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={handleCopySql}
                className="btn-bardahl"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', fontSize: '12px' }}
              >
                {copiedSql ? <Check style={{ width: '15px', height: '15px' }} /> : <Copy style={{ width: '15px', height: '15px' }} />}
                {copiedSql ? "Copié dans le presse-papier !" : "Copier le Script SQL"}
              </button>
              <button
                onClick={() => setShowSqlModal(false)}
                className="btn-secondary"
                style={{ padding: '10px 16px', fontSize: '12px' }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
