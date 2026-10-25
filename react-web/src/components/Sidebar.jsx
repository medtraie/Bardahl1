import React, { useState, useEffect, useCallback, useRef } from 'react'
import { 
  LayoutDashboard, Users, Boxes, Receipt, 
  Contact, LineChart, Settings, LogOut, ShieldCheck, UserCheck,
  Sun, Moon, Gift, Activity, GripVertical, ShieldAlert
} from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function Sidebar({ activeTab, setActiveTab }) {
  const { currentUser, logout, theme, toggleTheme } = useApp()

  const isSuperAdmin = currentUser?.isSuperAdmin || currentUser?.role === 'SUPER_ADMIN' || (currentUser?.email || '').toLowerCase() === 'bardahl@gmail.com'
  const isAdmin = currentUser?.role === 'ADMIN' || isSuperAdmin

  const navItems = [
    { id: 'dashboard', label: 'Tableau de Bord', icon: LayoutDashboard, adminOnly: false },
    { id: 'clients', label: 'Clients', icon: Users, adminOnly: false },
    { id: 'products', label: 'Catalogue Produits', icon: Boxes, adminOnly: false },
    { id: 'promotions', label: 'Promotions & Offres', icon: Gift, adminOnly: false },
    { id: 'orders', label: 'Bons de Commande', icon: Receipt, adminOnly: false },
    { id: 'stock_movements', label: 'Mouvements de Stock', icon: Activity, adminOnly: true },
    { id: 'commercials', label: 'Équipe Commerciale', icon: Contact, adminOnly: true },
    { id: 'analytics', label: 'Analyses Ventes', icon: LineChart, adminOnly: true },
    { id: 'super_admin', label: 'Panel Super Admin', icon: ShieldAlert, superAdminOnly: true },
    { id: 'settings', label: 'Paramètres', icon: Settings, adminOnly: false },
  ]

  const filteredNav = navItems.filter(item => {
    if (item.superAdminOnly) return isSuperAdmin
    if (item.adminOnly) return isAdmin
    return true
  })

  const activeIndex = Math.max(0, filteredNav.findIndex(item => item.id === activeTab))

  // Smart Navigation Slider state
  const sliderTrackRef = useRef(null)
  const [isDraggingSlider, setIsDraggingSlider] = useState(false)
  const [isHoveringSlider, setIsHoveringSlider] = useState(false)
  const lastWheelTime = useRef(0)

  // Calculate nav index from mouse Y position
  const calculateIndexFromY = useCallback((clientY) => {
    if (!sliderTrackRef.current) return 0
    const rect = sliderTrackRef.current.getBoundingClientRect()
    const relY = clientY - rect.top
    const total = filteredNav.length
    if (total <= 1) return 0
    const ratio = Math.max(0, Math.min(1, relY / rect.height))
    const idx = Math.min(total - 1, Math.max(0, Math.round(ratio * (total - 1))))
    return idx
  }, [filteredNav])

  // Mouse Down on track or thumb to start dragging
  const handleSliderTrackMouseDown = (e) => {
    e.preventDefault()
    setIsDraggingSlider(true)
    const idx = calculateIndexFromY(e.clientY)
    if (filteredNav[idx] && filteredNav[idx].id !== activeTab) {
      setActiveTab(filteredNav[idx].id)
    }
  }

  // Window mousemove / mouseup while dragging
  useEffect(() => {
    if (!isDraggingSlider) return

    const handleMouseMove = (e) => {
      const idx = calculateIndexFromY(e.clientY)
      if (filteredNav[idx] && filteredNav[idx].id !== activeTab) {
        setActiveTab(filteredNav[idx].id)
      }
    }

    const handleMouseUp = () => {
      setIsDraggingSlider(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'ns-resize'

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
  }, [isDraggingSlider, calculateIndexFromY, activeTab, setActiveTab, filteredNav])

  // Smooth mouse wheel navigation between sections
  const handleWheelNav = (e) => {
    const now = Date.now()
    if (now - lastWheelTime.current < 170) return
    if (Math.abs(e.deltaY) < 18) return

    const direction = e.deltaY > 0 ? 1 : -1
    const nextIdx = activeIndex + direction
    if (nextIdx >= 0 && nextIdx < filteredNav.length) {
      lastWheelTime.current = now
      setActiveTab(filteredNav[nextIdx].id)
    }
  }

  const thumbPercent = (activeIndex / Math.max(1, filteredNav.length - 1)) * 100
  const activeNavLabel = filteredNav[activeIndex]?.label || 'Section'

  return (
    <aside className="sidebar">
      {/* Brand Header with Prominent Official Bardahl Logo */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid var(--border-card)', textAlign: 'center' }}>
        <img
          src="/bardahl_logo.png"
          alt="Official Bardahl Logo"
          style={{ width: '130px', height: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 4px 12px rgba(255, 208, 0, 0.45))' }}
        />
        <span style={{ color: 'var(--bardahl-yellow)', fontSize: '11px', fontWeight: '800', letterSpacing: '1px' }}>MAGHREB S.A</span>
      </div>

      {/* Navigation Area with Smart Mouse Slider (شريط سحب ذكي للتنقل السلس بالماوس بين الأقسام) */}
      <div 
        className="sidebar-nav-wrapper"
        onWheel={handleWheelNav}
      >
        {/* Navigation Buttons List */}
        <nav className="sidebar-nav-list">
          {filteredNav.map((item) => {
            const IconComponent = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              >
                <IconComponent style={{ width: '19px', height: '19px', flexShrink: 0 }} />
                <span>{item.label}</span>
                {isActive && <span className="nav-item-active-dot" />}
              </button>
            )
          })}
        </nav>

        {/* Smart Vertical Navigation Slider (شريط السحب الذكي التفاعلي مع الماوس) */}
        <div 
          ref={sliderTrackRef}
          className={`nav-slider-track ${isDraggingSlider ? 'dragging' : ''}`}
          onMouseDown={handleSliderTrackMouseDown}
          onMouseEnter={() => setIsHoveringSlider(true)}
          onMouseLeave={() => setIsHoveringSlider(false)}
          title="شريط سحب ذكي: اسحب بالماوس أو حرّك عجلة الفأرة للتنقل السلس بين الأقسام"
        >
          {/* Vertical Slider Rail */}
          <div className="nav-slider-rail" />

          {/* Section Marker Ticks */}
          <div className="nav-slider-ticks">
            {filteredNav.map((item, idx) => (
              <div 
                key={item.id}
                onClick={(e) => {
                  e.stopPropagation()
                  setActiveTab(item.id)
                }}
                className={`nav-slider-tick ${idx === activeIndex ? 'active' : ''}`}
                style={{ top: `${(idx / Math.max(1, filteredNav.length - 1)) * 100}%` }}
                title={item.label}
              />
            ))}
          </div>

          {/* Draggable Slider Thumb / Scrubber (مقبض شريط السحب المتجاوب مع الماوس) */}
          <div 
            className="nav-slider-thumb"
            style={{ top: `${thumbPercent}%` }}
          >
            <div className="slider-thumb-grip">
              <GripVertical style={{ width: '10px', height: '12px', color: '#0D0F12' }} />
            </div>

            {/* Smart Floating Preview Badge while dragging or hovering */}
            {(isDraggingSlider || isHoveringSlider) && (
              <div className="nav-slider-preview-badge">
                <span>{activeNavLabel}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Theme Toggle Button (Mode Sombre / Mode Clair) */}
      <div style={{ marginTop: '12px', marginBottom: '14px' }}>
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
      <div style={{ paddingTop: '14px', borderTop: '1px solid var(--border-card)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
