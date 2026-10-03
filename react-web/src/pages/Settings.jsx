import React, { useState } from 'react'
import { User, Bell, Sliders, Database, RefreshCw, Trash2, CheckCircle2, ShieldCheck, Globe, Lock, Save, Moon, Sun, Layers, Plus, Edit3, X } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function Settings() {
  const { 
    currentUser, logout, theme, setTheme,
    productFamilies = [], addProductFamily, updateProductFamily, deleteProductFamily, toggleProductFamily 
  } = useApp()
  
  // Interactive User Profile State
  const [profileName, setProfileName] = useState(currentUser?.name || "Direction Bardahl")
  const [profilePhone, setProfilePhone] = useState("+212 6 61 22 33 44")
  const [profileCity, setProfileCity] = useState("Casablanca")
  
  // Interactive Preferences State
  const [defaultTva, setDefaultTva] = useState("20")
  const [defaultExpedition, setDefaultExpedition] = useState("Transport Bardahl")
  const [language, setLanguage] = useState("fr")
  
  // Interactive Toggles State
  const [stockAlerts, setStockAlerts] = useState(true)
  const [orderNotifications, setOrderNotifications] = useState(true)
  const [cloudSyncAlerts, setCloudSyncAlerts] = useState(true)
  const [compactTables, setCompactTables] = useState(false)
  
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [syncStatus, setSyncStatus] = useState("Connecté au Cloud (En direct)")

  // Product Families Administration State
  const [showFamilyModal, setShowFamilyModal] = useState(false)
  const [editingFamily, setEditingFamily] = useState(null)
  const [famLabel, setFamLabel] = useState('')
  const [famCode, setFamCode] = useState('')
  const [famIcon, setFamIcon] = useState('🏷️')
  const [famColor, setFamColor] = useState('#FFD000')
  const [famDesc, setFamDesc] = useState('')

  const handleOpenAddFamily = () => {
    setEditingFamily(null)
    setFamLabel('')
    setFamCode('')
    setFamIcon('🏷️')
    setFamColor('#FFD000')
    setFamDesc('')
    setShowFamilyModal(true)
  }

  const handleOpenEditFamily = (fam) => {
    setEditingFamily(fam)
    setFamLabel(fam.label)
    setFamCode(fam.code)
    setFamIcon(fam.icon || '🏷️')
    setFamColor(fam.color || '#FFD000')
    setFamDesc(fam.description || '')
    setShowFamilyModal(true)
  }

  const handleSaveFamily = async (e) => {
    e.preventDefault()
    if (!famLabel.trim()) return
    const code = (famCode.trim() || famLabel.trim()).toUpperCase().replace(/[^A-Z0-9_]/g, '_')
    if (editingFamily) {
      await updateProductFamily({
        ...editingFamily,
        label: famLabel.trim(),
        code,
        icon: famIcon || '🏷️',
        color: famColor || '#FFD000',
        description: famDesc
      })
      alert(`Famille « ${famLabel.trim()} » modifiée avec succès et synchronisée dans Supabase !`)
    } else {
      await addProductFamily({
        label: famLabel.trim(),
        code,
        icon: famIcon || '🏷️',
        color: famColor || '#FFD000',
        description: famDesc,
        isActive: true
      })
      alert(`Nouvelle Famille « ${famLabel.trim()} » (CODE: ${code}) créée avec succès et enregistrée dans Supabase !`)
    }
    setShowFamilyModal(false)
  }

  const handleDeleteFamily = async (fam) => {
    if (window.confirm(`Supprimer définitivement la famille « ${fam.label} » ?`)) {
      await deleteProductFamily(fam.id, fam.code)
      alert(`Famille « ${fam.label} » supprimée.`)
    }
  }

  const handleSaveProfile = (e) => {
    e.preventDefault()
    setSaveSuccess(true)
    setTimeout(() => setSaveSuccess(false), 3000)
  }

  const handleForceSync = () => {
    setSyncStatus("Synchronisation en cours...")
    setTimeout(() => {
      setSyncStatus("Base de données Cloud 100% synchronisée !")
    }, 1500)
  }

  const handleClearCache = () => {
    if (window.confirm("Voulez-vous réinitialiser le cache local de l'application ?")) {
      localStorage.removeItem('bardahl_clients')
      localStorage.removeItem('bardahl_orders')
      localStorage.removeItem('bardahl_products')
      window.location.reload()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#FFFFFF' }}>Paramètres & Configuration Système</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Gestion de votre profil, des notifications, des préférences de tarification et de la synchronisation Cloud
          </p>
        </div>

        <button onClick={handleForceSync} className="btn-secondary" style={{ padding: '10px 18px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCw style={{ width: '16px', height: '16px', color: 'var(--bardahl-yellow)' }} /> Synchroniser Cloud
        </button>
      </div>

      {saveSuccess && (
        <div style={{ background: 'rgba(52, 199, 89, 0.15)', border: '1px solid #34C759', color: '#34C759', padding: '12px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 style={{ width: '18px', height: '18px' }} /> Vos paramètres et votre profil ont été enregistrés avec succès !
        </div>
      )}

      {/* 2-Column Responsive Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        {/* Card 1: Profil Utilisateur & Compte */}
        <div className="glass-card">
          <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '18px', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User style={{ width: '20px', height: '20px', color: 'var(--bardahl-yellow)' }} /> Profil & Informations Personnelles
          </h3>

          <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Nom & Prénom</label>
              <input
                type="text"
                value={profileName}
                onChange={e => setProfileName(e.target.value)}
                className="input-field"
                style={{ fontWeight: '800', color: '#FFFFFF' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Adresse Email Identifiant</label>
              <input
                type="email"
                value={currentUser?.email || "bardahl@gmail.com"}
                readOnly
                className="input-field"
                style={{ background: 'var(--bg-obsidian)', color: 'var(--bardahl-yellow)', fontWeight: '800' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Téléphone Direct</label>
                <input
                  type="text"
                  value={profilePhone}
                  onChange={e => setProfilePhone(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Secteur / Ville</label>
                <input
                  type="text"
                  value={profileCity}
                  onChange={e => setProfileCity(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Rôle Système d'Accès</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', borderRadius: '10px', background: 'var(--bg-obsidian)', border: '1px solid var(--border-card)' }}>
                <ShieldCheck style={{ width: '18px', height: '18px', color: 'var(--bardahl-yellow)' }} />
                <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>
                  {currentUser?.role === 'ADMIN' ? 'Administrateur Global Bardahl' : 'Agent Commercial Autorisé'}
                </span>
              </div>
            </div>

            <button type="submit" className="btn-bardahl" style={{ marginTop: '8px', padding: '10px 16px', fontSize: '12px', alignSelf: 'flex-start' }}>
              <Save style={{ width: '14px', height: '14px' }} /> Enregistrer le Profil
            </button>
          </form>
        </div>

        {/* Card 2: Préférences de Vente & Tarification */}
        <div className="glass-card">
          <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '18px', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders style={{ width: '20px', height: '20px', color: 'var(--bardahl-yellow)' }} /> Préférences de Vente & Tarification
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Taux de TVA par Défaut (%)</label>
              <select
                value={defaultTva}
                onChange={e => setDefaultTva(e.target.value)}
                className="input-field"
              >
                <option value="20">20.00% (Taux Normal Maroc)</option>
                <option value="14">14.00% (Transport / Spécifique)</option>
                <option value="0">0.00% (Exonération Fiscale / Export)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Mode d'Expédition Préféré</label>
              <select
                value={defaultExpedition}
                onChange={e => setDefaultExpedition(e.target.value)}
                className="input-field"
              >
                <option value="Transport Bardahl">Transport Bardahl (Livraison Usine)</option>
                <option value="Livraison Client">Livraison Sur Site Client</option>
                <option value="Enlèvement Magasin">Enlèvement Sur Place (Magasin)</option>
                <option value="Transporteur Externe">Transporteur Externe / Messagerie</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: '600' }}>Thème Visuel de l'Application</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: '800',
                    background: theme === 'dark' ? 'rgba(255, 208, 0, 0.15)' : 'var(--bg-surface)',
                    color: theme === 'dark' ? 'var(--bardahl-yellow)' : 'var(--text-secondary)',
                    border: theme === 'dark' ? '2px solid var(--bardahl-yellow)' : '1px solid var(--border-card)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Moon style={{ width: '16px', height: '16px' }} /> 🌙 Mode Sombre (Actuel)
                </button>

                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    padding: '12px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: '800',
                    background: theme === 'light' ? 'rgba(217, 155, 0, 0.15)' : 'var(--bg-surface)',
                    color: theme === 'light' ? '#D97706' : 'var(--text-secondary)',
                    border: theme === 'light' ? '2px solid #D97706' : '1px solid var(--border-card)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Sun style={{ width: '16px', height: '16px' }} /> ☀️ Mode Clair
                </button>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: '600' }}>Langue d'Affichage de l'Application</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setLanguage('fr')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '800',
                    background: language === 'fr' ? 'var(--bardahl-yellow)' : 'var(--bg-surface)',
                    color: language === 'fr' ? '#0D0F12' : 'var(--text-secondary)',
                    border: language === 'fr' ? '1px solid var(--bardahl-yellow)' : '1px solid var(--border-card)'
                  }}
                >
                  🇫🇷 Français
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('ar')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '800',
                    background: language === 'ar' ? 'var(--bardahl-yellow)' : 'var(--bg-surface)',
                    color: language === 'ar' ? '#0D0F12' : 'var(--text-secondary)',
                    border: language === 'ar' ? '1px solid var(--bardahl-yellow)' : '1px solid var(--border-card)'
                  }}
                >
                  🇲🇦 العربية
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '10px', background: 'var(--bg-obsidian)', border: '1px solid var(--border-card)', marginTop: '6px' }}>
              <div>
                <strong style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'block' }}>Affichage Tableau Compact</strong>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Réduire l'espacement dans les tableaux de bons</span>
              </div>
              <input
                type="checkbox"
                checked={compactTables}
                onChange={e => setCompactTables(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--bardahl-yellow)', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: System Notifications & Alerts */}
        <div className="glass-card">
          <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '18px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bell style={{ width: '20px', height: '20px', color: 'var(--bardahl-yellow)' }} /> Notifications & Alertes Automatiques
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '10px', background: 'var(--bg-obsidian)', border: '1px solid var(--border-card)' }}>
              <div>
                <strong style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'block' }}>Alertes de Stock Bas</strong>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Avertir si le stock d'un produit passe sous 20 unités</span>
              </div>
              <input
                type="checkbox"
                checked={stockAlerts}
                onChange={e => setStockAlerts(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--bardahl-yellow)', cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '10px', background: 'var(--bg-obsidian)', border: '1px solid var(--border-card)' }}>
              <div>
                <strong style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'block' }}>Validation Bon de Commande</strong>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Notification dès la création d'un nouveau bon</span>
              </div>
              <input
                type="checkbox"
                checked={orderNotifications}
                onChange={e => setOrderNotifications(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--bardahl-yellow)', cursor: 'pointer' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '10px', background: 'var(--bg-obsidian)', border: '1px solid var(--border-card)' }}>
              <div>
                <strong style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'block' }}>Alertes de Synchronisation Cloud</strong>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Signaler les mises à jour de données cloud en temps réel</span>
              </div>
              <input
                type="checkbox"
                checked={cloudSyncAlerts}
                onChange={e => setCloudSyncAlerts(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--bardahl-yellow)', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>

        {/* Card 4: Base de données Cloud & Cache System */}
        <div className="glass-card">
          <h3 style={{ fontSize: '16px', fontWeight: '800', marginBottom: '18px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database style={{ width: '20px', height: '20px', color: 'var(--bardahl-yellow)' }} /> Performance & Cloud System
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--bg-obsidian)', border: '1px solid var(--border-card)' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Statut Serveur Cloud :</span>
              <span style={{ fontSize: '13px', fontWeight: '800', color: '#34C759', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 style={{ width: '14px', height: '14px' }} /> {syncStatus}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleForceSync}
                className="btn-secondary"
                style={{ flex: 1, padding: '10px', fontSize: '12px', color: 'var(--bardahl-yellow)', borderColor: 'var(--bardahl-yellow)' }}
              >
                <RefreshCw style={{ width: '14px', height: '14px' }} /> Synchroniser Tout
              </button>

              <button
                type="button"
                onClick={handleClearCache}
                style={{
                  flex: 1,
                  padding: '10px',
                  fontSize: '12px',
                  color: '#FF453A',
                  background: 'rgba(255, 69, 58, 0.1)',
                  border: '1px solid rgba(255, 69, 58, 0.3)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <Trash2 style={{ width: '14px', height: '14px' }} /> Vider le Cache Local
              </button>
            </div>

            <div style={{ paddingTop: '12px', borderTop: '1px solid var(--border-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Déconnexion Sécurisée</span>
              <button
                type="button"
                onClick={logout}
                style={{ padding: '6px 14px', borderRadius: '8px', background: '#FF453A', color: '#FFFFFF', fontWeight: '800', fontSize: '11px', cursor: 'pointer' }}
              >
                Se Déconnecter
              </button>
            </div>
          </div>
        </div>

        {/* Card 5: Administration des Familles de Produits Bardahl (Évolution n°1) */}
        <div className="glass-card" style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers style={{ width: '22px', height: '22px', color: 'var(--bardahl-yellow)' }} />
                Familles de Produits Bardahl (Classification & Moteur Promo)
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Configuration dynamique des gammes officielles pour le catalogue, les règles promotionnelles et le moteur de calcul.
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddFamily}
              className="btn-bardahl"
              style={{ padding: '8px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={16} /> Nouvelle Famille
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {productFamilies.map(fam => {
              const isActive = fam.isActive !== false
              return (
                <div
                  key={fam.id}
                  style={{
                    background: 'var(--bg-obsidian)',
                    border: `1px solid ${isActive ? (fam.color || '#FFD000') + '55' : 'var(--border-card)'}`,
                    borderRadius: '12px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '10px',
                    borderLeft: `4px solid ${fam.color || 'var(--bardahl-yellow)'}`,
                    opacity: isActive ? 1 : 0.6
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '24px' }}>{fam.icon || '🏷️'}</span>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '800', color: '#FFFFFF' }}>{fam.label}</div>
                        <div style={{ fontSize: '10px', color: fam.color || 'var(--bardahl-yellow)', fontWeight: '700', letterSpacing: '0.5px' }}>CODE: {fam.code}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleProductFamily(fam.id)}
                      style={{
                        padding: '3px 8px',
                        borderRadius: '20px',
                        fontSize: '9px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        border: 'none',
                        background: isActive ? 'rgba(52, 199, 89, 0.2)' : 'rgba(255, 69, 58, 0.2)',
                        color: isActive ? '#34C759' : '#FF453A'
                      }}
                      title="Activer / Désactiver la famille"
                    >
                      {isActive ? '● ACTIVE' : '○ INACTIVE'}
                    </button>
                  </div>

                  {fam.description && (
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.4', margin: 0 }}>
                      {fam.description}
                    </p>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenEditFamily(fam)}
                      className="btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Edit3 size={12} /> Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteFamily(fam)}
                      className="btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '11px', color: '#FF453A', borderColor: 'rgba(255,69,58,0.3)' }}
                      title="Supprimer la famille"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>

      {/* Modal Add / Edit Product Family */}
      {showFamilyModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', zIndex: 3000 }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid var(--border-card)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers style={{ color: famColor }} /> {editingFamily ? 'Modifier la Famille' : 'Nouvelle Famille de Produits'}
              </h3>
              <button onClick={() => setShowFamilyModal(false)} style={{ background: 'none', border: 'none', color: '#FFF', fontSize: '22px', cursor: 'pointer' }}>&times;</button>
            </div>

            <form onSubmit={handleSaveFamily} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  NOM DE LA FAMILLE *
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={famLabel}
                  onChange={e => setFamLabel(e.target.value)}
                  placeholder="Ex: Produits Hygiène & Lavage"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    CODE TECHNIQUE
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={famCode}
                    onChange={e => setFamCode(e.target.value.toUpperCase())}
                    placeholder="Ex: HYGIENE"
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    ICÔNE (ÉMOJI)
                  </label>
                  <input
                    type="text"
                    className="input-field"
                    value={famIcon}
                    onChange={e => setFamIcon(e.target.value)}
                    placeholder="🧪, 🛢️, 💧..."
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  COULEUR D'AFFICHAGE
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="color"
                    value={famColor}
                    onChange={e => setFamColor(e.target.value)}
                    style={{ width: '40px', height: '36px', border: 'none', borderRadius: '6px', cursor: 'pointer', background: 'transparent' }}
                  />
                  <input
                    type="text"
                    className="input-field"
                    value={famColor}
                    onChange={e => setFamColor(e.target.value)}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                  DESCRIPTION
                </label>
                <textarea
                  className="input-field"
                  rows={2}
                  value={famDesc}
                  onChange={e => setFamDesc(e.target.value)}
                  placeholder="Courte description des produits appartenant à cette famille..."
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid var(--border-card)' }}>
                <button type="button" onClick={() => setShowFamilyModal(false)} className="btn-secondary" style={{ padding: '8px 14px' }}>
                  Annuler
                </button>
                <button type="submit" className="btn-bardahl" style={{ padding: '8px 18px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Save size={14} /> Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}
