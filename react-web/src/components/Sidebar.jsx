import React from 'react'
import { 
  LayoutDashboard, Users, Boxes, Receipt, 
  Contact, LineChart, Settings, LogOut, ShieldCheck, UserCheck,
  Sun, Moon
} from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function Sidebar({ activeTab, setActiveTab }) {
  const { currentUser, logout, theme, toggleTheme } = useApp()

  const navItems = [
    { id: 'dashboard', label: 'Tableau de Bord', icon: LayoutDashboard, adminOnly: false },
    { id: 'clients', label: 'Clients', icon: Users, adminOnly: false },
    { id: 'products', label: 'Catalogue Produits', icon: Boxes, adminOnly: false },
    { id: 'orders', label: 'Bons de Commande', icon: Receipt, adminOnly: false },
    { id: 'commercials', label: 'Équipe Commerciale', icon: Contact, adminOnly: true },
    { id: 'analytics', label: 'Analyses Ventes', icon: LineChart, adminOnly: true },
    { id: 'settings', label: 'Paramètres', icon: Settings, adminOnly: false },
  ]

  const isAdmin = currentUser?.role === 'ADMIN'
  const filteredNav = navItems.filter(item => !item.adminOnly || isAdmin)

  return (
    <aside className="sidebar">
      {/* Brand Header with Prominent Official Bardahl Logo */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border-card)', textAlign: 'center' }}>
        <img
          src="/bardahl_logo.png"
          alt="Official Bardahl Logo"
          style={{ width: '130px', height: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 4px 12px rgba(255, 208, 0, 0.45))' }}
        />
        <span style={{ color: 'var(--bardahl-yellow)', fontSize: '11px', fontWeight: '800', letterSpacing: '1px' }}>MAGHREB S.A</span>
      </div>

      {/* Navigation Buttons */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        {filteredNav.map((item) => {
          const IconComponent = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
            >
              <IconComponent style={{ width: '20px', height: '20px', flexShrink: 0 }} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>

      {/* Theme Toggle Button (Mode Sombre / Mode Clair) */}
      <div style={{ marginBottom: '14px' }}>
        <button
          onClick={toggleTheme}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            borderRadius: '12px',
            background: theme === 'dark' ? 'rgba(255, 208, 0, 0.08)' : '#F1F5F9',
            border: `1px solid ${theme === 'dark' ? 'rgba(255, 208, 0, 0.25)' : '#CBD5E1'}`,
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          title={theme === 'dark' ? 'Passer au Mode Clair' : 'Passer au Mode Sombre'}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {theme === 'dark' ? (
              <Moon style={{ width: '16px', height: '16px', color: 'var(--bardahl-yellow)' }} />
            ) : (
              <Sun style={{ width: '16px', height: '16px', color: '#D97706' }} />
            )}
            <span>{theme === 'dark' ? 'Mode Sombre' : 'Mode Clair'}</span>
          </div>

          <div style={{
            width: '36px',
            height: '20px',
            borderRadius: '10px',
            background: theme === 'dark' ? '#2B313E' : '#E2E8F0',
            position: 'relative',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: theme === 'dark' ? 'flex-end' : 'flex-start'
          }}>
            <div style={{
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: theme === 'dark' ? 'var(--bardahl-yellow)' : '#D97706',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}></div>
          </div>
        </button>
      </div>

      {/* User Profile Footer */}
      <div style={{ paddingTop: '16px', borderTop: '1px solid var(--border-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
          <div style={{
            width: '38px',
            height: '38px',
            background: isAdmin ? 'var(--bardahl-yellow)' : '#007AFF',
            color: isAdmin ? '#0D0F12' : '#FFFFFF',
            borderRadius: '50%',
            fontWeight: '900',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            flexShrink: 0
          }}>
            {currentUser?.initials || (isAdmin ? 'DB' : 'CB')}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {currentUser?.name || (isAdmin ? 'Direction Bardahl' : 'Commercial')}
            </div>
            <div style={{ fontSize: '11px', color: isAdmin ? 'var(--bardahl-yellow)' : '#007AFF', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '700' }}>
              {isAdmin ? <ShieldCheck style={{ width: '12px', height: '12px' }} /> : <UserCheck style={{ width: '12px', height: '12px' }} />}
              {isAdmin ? 'Administrateur' : 'Commercial'}
            </div>
          </div>
        </div>
        <button
          onClick={logout}
          style={{ color: '#FF453A', padding: '6px', cursor: 'pointer', borderRadius: '8px', flexShrink: 0 }}
          title="Déconnexion"
        >
          <LogOut style={{ width: '18px', height: '18px' }} />
        </button>
      </div>
    </aside>
  )
}
