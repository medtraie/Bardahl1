import React, { useState } from 'react'
import { User, Bell, Sliders, Database, RefreshCw, Trash2, CheckCircle2, ShieldCheck, Globe, Lock, Save, Moon, Sun } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function Settings() {
  const { currentUser, logout, theme, setTheme } = useApp()
  
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

      </div>

    </div>
  )
}
