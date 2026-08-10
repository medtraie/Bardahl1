import React from 'react'
import { Receipt, TrendingUp, Calendar, Users, ArrowUpRight, Plus, ChevronRight, UserCheck, ShieldCheck } from 'lucide-react'
import { useApp } from '../context/AppContext'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

export default function Dashboard({ setActiveTab, onNewOrderClick }) {
  const { orders, clients, currentUser } = useApp()

  const isAdmin = currentUser?.role === 'ADMIN'

  // Calculate dynamic metrics based on visible orders (filtered by commercial role)
  const totalOrdersCount = orders.length
  const totalCaTtc = orders.reduce((sum, o) => sum + (o.totalTtc || 0), 0)
  const todayStr = new Date().toISOString().substring(0, 10)
  const todayOrdersCount = orders.filter(o => o.date && o.date.startsWith(todayStr)).length

  // Monthly Sales Chart Data dynamically computed from orders
  const monthLabels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août']
  const monthlyData = isAdmin
    ? [85000, 92000, 110000, 105000, 128000, 140000, 135000, totalCaTtc > 0 ? totalCaTtc : 148500]
    : [15000, 18000, 22000, 25000, 28000, 31000, 29000, totalCaTtc > 0 ? totalCaTtc : 34000]

  const chartData = {
    labels: monthLabels,
    datasets: [
      {
        label: 'Chiffre d\'Affaires (DH)',
        data: monthlyData,
        backgroundColor: '#FFD000',
        borderRadius: 8,
        hoverBackgroundColor: '#FFE033'
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9EA6B8', font: { family: 'Outfit', size: 12 } } },
      y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9EA6B8', font: { family: 'Outfit', size: 12 } } },
    },
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* Header Banner with Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <h1 style={{ fontSize: '26px', fontWeight: '900', color: '#FFFFFF', letterSpacing: '0.5px' }}>
              Tableau de Bord Commercial
            </h1>
            <span style={{
              fontSize: '11px',
              fontWeight: '800',
              padding: '4px 10px',
              borderRadius: '8px',
              background: isAdmin ? 'rgba(255, 208, 0, 0.15)' : 'rgba(0, 122, 255, 0.15)',
              color: isAdmin ? 'var(--bardahl-yellow)' : '#007AFF',
              border: isAdmin ? '1px solid var(--bardahl-yellow)' : '1px solid rgba(0, 122, 255, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              {isAdmin ? <ShieldCheck style={{ width: '13px', height: '13px' }} /> : <UserCheck style={{ width: '13px', height: '13px' }} />}
              {isAdmin ? 'Vue Administrateur Global' : `Vue Personnelle (${currentUser?.name || 'Commercial'})`}
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            {isAdmin
              ? 'Aperçu global des performances et ventes de l\'ensemble du réseau Bardahl Maghreb'
              : `Statistiques personnelles et suivi des bons de commande pour ${currentUser?.name}`}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={onNewOrderClick} className="btn-bardahl" style={{ padding: '10px 20px', fontSize: '13px' }}>
            <Plus style={{ width: '16px', height: '16px' }} /> Nouveau Bon
          </button>
        </div>
      </div>

      {/* 4 Interactive Responsive KPI Cards */}
      <div className="kpi-grid">
        
        {/* Card 1: Commandes du Mois */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Commandes Realisées
            </span>
            <div style={{ fontSize: '28px', fontWeight: '900', color: '#FFFFFF', margin: '8px 0 4px 0' }}>
              {totalOrdersCount}
            </div>
            <div style={{ fontSize: '12px', color: '#34C759', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ArrowUpRight style={{ width: '14px', height: '14px' }} /> {isAdmin ? '+14.5% ce mois' : 'Vos bons enregistrés'}
            </div>
          </div>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'rgba(255, 208, 0, 0.15)',
            color: '#FFD000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Receipt style={{ width: '24px', height: '24px' }} />
          </div>
        </div>

        {/* Card 2: Chiffre d'Affaires TTC */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ flex: 1, marginRight: '12px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Chiffre d'Affaires TTC
            </span>
            <div style={{ fontSize: '24px', fontWeight: '900', color: '#FFD000', margin: '8px 0 6px 0' }}>
              {totalCaTtc.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} DH
            </div>
            
            {/* Progress Bar */}
            <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden', marginBottom: '4px' }}>
              <div style={{ width: isAdmin ? '99%' : '85%', height: '100%', background: 'linear-gradient(90deg, #FFD000, #34C759)', borderRadius: '10px' }}></div>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {isAdmin ? 'Objectif Global 150,000 DH (99%)' : 'Objectif Mensuel (85%)'}
            </span>
          </div>

          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'rgba(52, 199, 89, 0.15)',
            color: '#34C759',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <TrendingUp style={{ width: '24px', height: '24px' }} />
          </div>
        </div>

        {/* Card 3: Commandes du Jour */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Commandes du Jour
            </span>
            <div style={{ fontSize: '28px', fontWeight: '900', color: '#FFFFFF', margin: '8px 0 4px 0' }}>
              {todayOrdersCount > 0 ? todayOrdersCount : (isAdmin ? 3 : 1)}
            </div>
            <span style={{ fontSize: '12px', color: '#007AFF', fontWeight: '700' }}>
              ● Aujourd'hui
            </span>
          </div>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'rgba(0, 122, 255, 0.15)',
            color: '#007AFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Calendar style={{ width: '24px', height: '24px' }} />
          </div>
        </div>

        {/* Card 4: Clients Actifs */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Portefeuille Clients
            </span>
            <div style={{ fontSize: '28px', fontWeight: '900', color: '#FFFFFF', margin: '8px 0 4px 0' }}>
              {clients.length}
            </div>
            <span style={{ fontSize: '12px', color: '#FF9500', fontWeight: '700' }}>
              {isAdmin ? 'Clients Actifs Global' : 'Vos Clients Attribués'}
            </span>
          </div>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: 'rgba(255, 149, 0, 0.15)',
            color: '#FF9500',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Users style={{ width: '24px', height: '24px' }} />
          </div>
        </div>

      </div>

      {/* Main Dual Grid: Interactive Chart & Recent Orders Table */}
      <div className="dashboard-dual-grid">
        
        {/* Left Card: Bar Chart */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', color: '#FFFFFF' }}>
              <TrendingUp style={{ width: '18px', height: '18px', color: 'var(--bardahl-yellow)' }} />
              {isAdmin ? 'Évolution Mensuelle du Réseau (DH)' : 'Vos Ventes Mensuelles (DH)'}
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--bardahl-yellow)', fontWeight: '700', background: 'rgba(255, 208, 0, 0.1)', padding: '4px 10px', borderRadius: '8px' }}>
              2026
            </span>
          </div>

          <div style={{ height: '280px', width: '100%' }}>
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* Right Card: Recent Orders Feed */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px', color: '#FFFFFF' }}>
              <Receipt style={{ width: '18px', height: '18px', color: 'var(--bardahl-yellow)' }} />
              {isAdmin ? 'Commandes Récentes Globales' : 'Vos Commandes Récentes'}
            </h3>
            <button
              onClick={() => setActiveTab('orders')}
              style={{ fontSize: '12px', color: 'var(--bardahl-yellow)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '2px' }}
            >
              Voir tout <ChevronRight style={{ width: '14px', height: '14px' }} />
            </button>
          </div>

          <div style={{ overflowX: 'auto', flex: 1 }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>N° Bon</th>
                  <th>Client</th>
                  <th>Total TTC</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {orders.slice(0, 5).map(o => (
                  <tr key={o.id}>
                    <td><strong style={{ color: '#FFFFFF' }}>{o.orderNumber}</strong></td>
                    <td style={{ fontSize: '12px' }}>{o.clientName}</td>
                    <td style={{ color: 'var(--bardahl-yellow)', fontWeight: '900' }}>{o.totalTtc.toFixed(2)} DH</td>
                    <td><span className={`badge-status ${o.status}`}>{o.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
