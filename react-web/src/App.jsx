import React, { useState } from 'react'
import { useApp } from './context/AppContext'
import Login from './pages/Login'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Dashboard from './pages/Dashboard'
import Clients from './pages/Clients'
import Products from './pages/Products'
import Orders from './pages/Orders'
import Commercials from './pages/Commercials'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'

export default function App() {
  const { currentUser } = useApp()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [openOrderWizardTrigger, setOpenOrderWizardTrigger] = useState(0)

  if (!currentUser) {
    return <Login />
  }

  const handleOpenNewOrder = () => {
    setActiveTab('orders')
    setOpenOrderWizardTrigger(prev => prev + 1)
  }

  const titles = {
    dashboard: "Tableau de Bord",
    clients: "Gestion des Clients",
    products: "Catalogue Produits Bardahl",
    orders: "Bons de Commande",
    commercials: "Équipe Commerciale & Performance",
    analytics: "Analyses Business Intelligence",
    settings: "Paramètres & Entreprise"
  }

  return (
    <div className="app-container">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="main-content">
        <Header title={titles[activeTab] || "Bardahl Maroc"} onNewOrderClick={handleOpenNewOrder} />
        
        {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} onNewOrderClick={handleOpenNewOrder} />}
        {activeTab === 'clients' && <Clients />}
        {activeTab === 'products' && <Products />}
        {activeTab === 'orders' && <Orders openWizardTrigger={openOrderWizardTrigger} />}
        {activeTab === 'commercials' && <Commercials />}
        {activeTab === 'analytics' && <Analytics />}
        {activeTab === 'settings' && <Settings />}
      </main>
    </div>
  )
}
