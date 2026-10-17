import React, { useState, useEffect, useCallback, useRef } from 'react'
import { 
  LayoutDashboard, Users, Boxes, Receipt, 
  Contact, LineChart, Settings, LogOut, ShieldCheck, UserCheck,
  Sun, Moon, Gift, Activity, ChevronLeft, ChevronRight, GripVertical
} from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function Sidebar({ activeTab, setActiveTab }) {
  const { currentUser, logout, theme, toggleTheme } = useApp()

  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem('bardahl_sidebar_width')
    return saved ? parseInt(saved, 10) : 270
  })
  const [isResizing, setIsResizing] = useState(false)

  const isCollapsed = sidebarWidth < 140

  const navItems = [
    { id: 'dashboard', label: 'Tableau de Bord', icon: LayoutDashboard, adminOnly: false },
    { id: 'clients', label: 'Clients', icon: Users, adminOnly: false },
    { id: 'products', label: 'Catalogue Produits', icon: Boxes, adminOnly: false },
    { id: 'promotions', label: 'Promotions & Offres', icon: Gift, adminOnly: false },
    { id: 'orders', label: 'Bons de Commande', icon: Receipt, adminOnly: false },
    { id: 'stock_movements', label: 'Mouvements de Stock', icon: Activity, adminOnly: true },
    { id: 'commercials', label: 'Équipe Commerciale', icon: Contact, adminOnly: true },
    { id: 'analytics', label: 'Analyses Ventes', icon: LineChart, adminOnly: true },
    { id: 'settings', label: 'Paramètres', icon: Settings, adminOnly: false },
  ]

  const isAdmin = currentUser?.role === 'ADMIN'
  const filteredNav = navItems.filter(item => !item.adminOnly || isAdmin)

  // Sync CSS custom variable
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth}px`)
  }, [sidebarWidth])

  // Mouse Drag to Resize Sidebar (شريط سحب ذكي متجاوب مع الماوس)
  const startResizing = useCallback((e) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  const stopResizing = useCallback(() => {
    setIsResizing(false)
  }, [])

  const resize = useCallback((e) => {
    if (!isResizing) return
    let newWidth = e.clientX
    if (newWidth < 120) {
      newWidth = 72 // Snap to compact icon-only mode
    } else if (newWidth > 380) {
      newWidth = 380
    } else if (newWidth < 200 && newWidth >= 120) {
      newWidth = 200
    }
    setSidebarWidth(newWidth)
    localStorage.setItem('bardahl_sidebar_width', newWidth)
    document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`)
  }, [isResizing])

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', resize)
      window.addEventListener('mouseup', stopResizing)
      document.body.style.userSelect = 'none'
      document.body.style.cursor = 'col-resize'
    } else {
      window.removeEventListener('mousemove', resize)
      window.removeEventListener('mouseup', stopResizing)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
    return () => {
      window.removeEventListener('mousemove', resize)
      window.removeEventListener('mouseup', stopResizing)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
  }, [isResizing, resize, stopResizing])

  const toggleCollapse = () => {
    const nextWidth = isCollapsed ? 270 : 72
    setSidebarWidth(nextWidth)
    localStorage.setItem('bardahl_sidebar_width', nextWidth)
    document.documentElement.style.setProperty('--sidebar-width', `${nextWidth}px`)
  }

  // Mouse drag-to-scroll for nav container
  const navRef = useRef(null)
  const isNavDragging = useRef(false)
  const navStartY = useRef(0)
  const navScrollTop = useRef(0)

  const handleNavMouseDown = (e) => {
    if (e.target.tagName.toLowerCase() === 'button' || e.target.closest('button')) return
    isNavDragging.current = true
    navStartY.current = e.pageY - (navRef.current?.offsetTop || 0)
    navScrollTop.current = navRef.current?.scrollTop || 0
  }

  const handleNavMouseMove = (e) => {
    if (!isNavDragging.current || !navRef.current) return
    e.preventDefault()
    const y = e.pageY - (navRef.current.offsetTop || 0)
    const walk = (y - navStartY.current) * 1.5
    navRef.current.scrollTop = navScrollTop.current - walk
  }

  const handleNavMouseUp = () => {
    isNavDragging.current = false
  }

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isResizing ? 'resizing' : ''}`}>
      {/* Brand Header with Prominent Official Bardahl Logo */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid var(--border-card)', textAlign: 'center', position: 'relative' }}>
        <img
          src="/bardahl_logo.png"
          alt="Official Bardahl Logo"
          style={{ width: isCollapsed ? '42px' : '130px', height: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 4px 12px rgba(255, 208, 0, 0.45))', transition: 'width 0.2s ease' }}
        />
        {!isCollapsed && (
          <span style={{ color: 'var(--bardahl-yellow)', fontSize: '11px', fontWeight: '800', letterSpacing: '1px' }}>MAGHREB S.A</span>
        )}
      </div>

      {/* Navigation Buttons with smart scroll and mouse response */}
      <nav 
        ref={navRef}
        className="sidebar-nav-container"
        onMouseDown={handleNavMouseDown}
        onMouseMove={handleNavMouseMove}
        onMouseUp={handleNavMouseUp}
        onMouseLeave={handleNavMouseUp}
      >
        {filteredNav.map((item) => {
          const IconComponent = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              title={isCollapsed ? item.label : undefined}
            >
              <IconComponent style={{ width: '20px', height: '20px', flexShrink: 0 }} />
              {!isCollapsed && <span>{item.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* Theme Toggle Button (Mode Sombre / Mode Clair) */}
      <div style={{ marginTop: '10px', marginBottom: '14px' }}>
        <button
          onClick={toggleTheme}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'space-between',
            padding: isCollapsed ? '10px 0' : '10px 14px',
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
          {isCollapsed ? (
            theme === 'dark' ? (
              <Moon style={{ width: '18px', height: '18px', color: 'var(--bardahl-yellow)' }} />
            ) : (
              <Sun style={{ width: '18px', height: '18px', color: '#D97706' }} />
            )
          ) : (
            <>
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
            </>
          )}
        </button>
      </div>

      {/* User Profile Footer */}
      <div style={{ paddingTop: '14px', borderTop: '1px solid var(--border-card)', display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
          <div 
            onClick={isCollapsed ? logout : undefined}
            style={{
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
              flexShrink: 0,
              cursor: isCollapsed ? 'pointer' : 'default'
            }}
            title={isCollapsed ? `${currentUser?.name || (isAdmin ? 'Direction Bardahl' : 'Commercial')} (Déconnexion)` : undefined}
          >
            {currentUser?.initials || (isAdmin ? 'DB' : 'CB')}
          </div>
          {!isCollapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {currentUser?.name || (isAdmin ? 'Direction Bardahl' : 'Commercial')}
              </div>
              <div style={{ fontSize: '11px', color: isAdmin ? 'var(--bardahl-yellow)' : '#007AFF', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '700' }}>
                {isAdmin ? <ShieldCheck style={{ width: '12px', height: '12px' }} /> : <UserCheck style={{ width: '12px', height: '12px' }} />}
                {isAdmin ? 'Administrateur' : 'Commercial'}
              </div>
            </div>
          )}
        </div>
        {!isCollapsed && (
          <button
            onClick={logout}
            style={{ color: '#FF453A', padding: '6px', cursor: 'pointer', borderRadius: '8px', flexShrink: 0 }}
            title="Déconnexion"
          >
            <LogOut style={{ width: '18px', height: '18px' }} />
          </button>
        )}
      </div>

      {/* Smart Draggable Resizer Bar (شريط سحب ذكي متجاوب مع الماوس) */}
      <div 
        className={`sidebar-resizer ${isResizing ? 'active' : ''}`}
        onMouseDown={startResizing}
        onDoubleClick={toggleCollapse}
        title="Glisser avec la souris pour redimensionner / Double-clic pour réduire ou agrandir"
      >
        <div className="resizer-handle-pill">
          <GripVertical style={{ width: '10px', height: '14px', color: '#0D0F12' }} />
        </div>
        
        {/* Quick Toggle Button on Hover */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            toggleCollapse()
          }}
          className="sidebar-quick-toggle"
          title={isCollapsed ? "Agrandir le menu" : "Réduire le menu"}
        >
          {isCollapsed ? <ChevronRight style={{ width: '12px', height: '12px' }} /> : <ChevronLeft style={{ width: '12px', height: '12px' }} />}
        </button>
      </div>
    </aside>
  )
}
