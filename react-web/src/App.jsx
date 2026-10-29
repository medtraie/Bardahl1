import React, { useState } from 'react'
import { useApp } from './context/AppContext'
import Login from './pages/Login'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import Products from './pages/Products'
import Promotions from './pages/Promotions'
import Devis from './pages/Devis'
import Orders from './pages/Orders'
import Commercials from './pages/Commercials'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import StockMovements from './pages/StockMovements'

export default function App() {
  const { currentUser } = useApp()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [openOrderWizardTrigger, setOpenOrderWizardTrigger] = useState(0)
  const [openNewPromoTrigger, setOpenNewPromoTrigger] = useState(0)
  const [openDevisWizardTrigger, setOpenDevisWizardTrigger] = useState(0)

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

  const handleOpenNewDevis = () => {
    setActiveTab('devis')
    setOpenDevisWizardTrigger(prev => prev + 1)
  }

  const titles = {
    dashboard: "Tableau de Bord",
    clients: "Gestion des Clients",
    products: "Catalogue Produits Bardahl",
    promotions: "Promotions & Offres Commerciales",
    devis: "Devis & Estimations Commerciales",
    orders: "Bons de Commande",
    commercials: "Équipe Commerciale & Performance",
    stock_movements: "Mouvements de Stock & Inventaire",
    analytics: "Analyses Business Intelligence",
    settings: "Paramètres & Entreprise"
  }

  const isAdmin = currentUser?.role === 'ADMIN'

  // Header action button configuration based on active section
  const isShowHeaderButton = 
    activeTab === 'devis' || 
    activeTab === 'orders' || 
    activeTab === 'dashboard' || 
    (isAdmin && activeTab === 'promotions')

  const getActionButtonText = () => {
    if (activeTab === 'promotions') return "Nouvelle Promotion"
    if (activeTab === 'devis') return "Nouveau Devis"
    return "Nouveau Bon"
  }

  const handleHeaderAction = () => {
    if (activeTab === 'promotions') return handleOpenNewPromo()
    if (activeTab === 'devis') return handleOpenNewDevis()
    return handleOpenNewOrder()
  }

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="main-content">
        <Header 
          title={titles[activeTab] || "Bardahl Maroc"} 
          onNewOrderClick={handleOpenNewOrder} 
          showNewOrderButton={isShowHeaderButton} 
          actionButtonText={getActionButtonText()}
          onActionClick={handleHeaderAction}
        />
        
        <div key={activeTab} className="page-transition-content">
          {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} onNewOrderClick={handleOpenNewOrder} />}
          {activeTab === 'clients' && <Clients />}
          {activeTab === 'products' && <Products />}
          {activeTab === 'promotions' && <Promotions openNewPromoTrigger={openNewPromoTrigger} />}
          {activeTab === 'devis' && <Devis setActiveTab={setActiveTab} openWizardTrigger={openDevisWizardTrigger} />}
          {activeTab === 'orders' && <Orders openWizardTrigger={openOrderWizardTrigger} />}
          {activeTab === 'commercials' && <Commercials />}
          {activeTab === 'stock_movements' && <StockMovements />}
          {activeTab === 'analytics' && <Analytics />}
          {activeTab === 'settings' && <Settings />}
        </div>
      </main>
    </div>
  )
}
