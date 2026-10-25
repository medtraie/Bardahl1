import React, { useState } from 'react'
import { useApp } from './context/AppContext'
import Login from './pages/Login'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import Products from './pages/Products'
import Promotions from './pages/Promotions'
import Orders from './pages/Orders'
import Commercials from './pages/Commercials'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import StockMovements from './pages/StockMovements'
import SuperAdmin from './pages/SuperAdmin'

export default function App() {
  const { currentUser, isInspecting, inspectedUser, exitInspection } = useApp()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [openOrderWizardTrigger, setOpenOrderWizardTrigger] = useState(0)
  const [openNewPromoTrigger, setOpenNewPromoTrigger] = useState(0)

  if (!currentUser) {
    return <Login />
  }

  const handleOpenNewOrder = () => {
    setActiveTab('orders')
    setOpenOrderWizardTrigger(prev => prev + 1)
  }

  const handleOpenNewPromo = () => {
    setActiveTab('promotions')
    setOpenNewPromoTrigger(prev => prev + 1)
  }

  const titles = {
    dashboard: "Tableau de Bord",
    clients: "Gestion des Clients",
    products: "Catalogue Produits Bardahl",
    promotions: "Promotions & Offres Commerciales",
    orders: "Bons de Commande",
    commercials: "Équipe Commerciale & Performance",
    stock_movements: "Mouvements de Stock & Inventaire",
    analytics: "Analyses Business Intelligence",
    settings: "Paramètres & Entreprise",
    super_admin: "Panel Super Administrateur"
  }

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.isSuperAdmin

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="main-content">
        {isInspecting && (
          <div style={{
            background: 'linear-gradient(90deg, #FF9500 0%, #FF2D55 100%)',
            color: '#000000',
            fontWeight: '800',
            fontSize: '13px',
            padding: '10px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            boxShadow: '0 4px 15px rgba(255, 149, 0, 0.4)',
            zIndex: 90
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px' }}>🛡️</span>
              <span>
                Mode Super Administrateur : Vous inspectez la session de <strong>{inspectedUser?.company_name || inspectedUser?.first_name || 'Utilisateur'}</strong> ({inspectedUser?.email}) — Données strictement isolées.
              </span>
            </div>
            <button 
              onClick={exitInspection}
              style={{
                background: '#000000',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Quitter l'inspection
            </button>
          </div>
        )}

        <Header 
          title={titles[activeTab] || "Bardahl Maroc"} 
          onNewOrderClick={handleOpenNewOrder} 
          showNewOrderButton={isAdmin && activeTab === 'promotions'} 
          actionButtonText={activeTab === 'promotions' ? "Nouvelle Promotion" : "Nouveau Bon"}
          onActionClick={activeTab === 'promotions' ? handleOpenNewPromo : handleOpenNewOrder}
        />
        
        <div key={activeTab} className="page-transition-content">
          {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} onNewOrderClick={handleOpenNewOrder} />}
          {activeTab === 'clients' && <Clients />}
          {activeTab === 'products' && <Products />}
          {activeTab === 'promotions' && <Promotions openNewPromoTrigger={openNewPromoTrigger} />}
          {activeTab === 'orders' && <Orders openWizardTrigger={openOrderWizardTrigger} />}
          {activeTab === 'commercials' && <Commercials />}
          {activeTab === 'stock_movements' && <StockMovements />}
          {activeTab === 'analytics' && <Analytics />}
          {activeTab === 'settings' && <Settings />}
          {activeTab === 'super_admin' && <SuperAdmin setActiveTab={setActiveTab} />}
        </div>
      </main>
    </div>
  )
}
