import React from 'react'
import { AlertTriangle, RefreshCw, Trash2, Home } from 'lucide-react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleClearCacheAndReload = () => {
    try {
      localStorage.removeItem('bardahl_session')
      localStorage.removeItem('bardahl_devis_records')
      localStorage.removeItem('bardahl_order_extras')
      sessionStorage.clear()
    } catch (e) {}
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'radial-gradient(circle at center, #181C24 0%, #0D0F12 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          zIndex: 99999,
          fontFamily: "'Outfit', sans-serif",
          color: '#F2F4F8'
        }}>
          <div style={{
            background: 'rgba(20, 23, 31, 0.95)',
            border: '1px solid rgba(255, 69, 58, 0.5)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(255, 69, 58, 0.2)',
            borderRadius: '20px',
            padding: '36px',
            maxWidth: '560px',
            width: '100%',
            textAlign: 'center'
          }}>
            {/* Header Icon */}
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '20px',
              background: 'rgba(255, 69, 58, 0.15)',
              border: '1px solid rgba(255, 69, 58, 0.4)',
              color: '#FF453A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px auto'
            }}>
              <AlertTriangle size={32} />
            </div>

            <h2 style={{ fontSize: '22px', fontWeight: '900', color: '#FFFFFF', marginBottom: '8px' }}>
              Une erreur inattendue est survenue
            </h2>
            <p style={{ fontSize: '13px', color: '#9EA6B8', marginBottom: '20px', lineHeight: '1.6' }}>
              Le système a rencontré une anomalie lors du chargement. Vos données de commande et catalogue restent en sécurité sur le serveur.
            </p>

            {this.state.error && (
              <div style={{
                background: 'rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '10px',
                padding: '12px',
                fontSize: '11px',
                color: '#FF6B6B',
                fontFamily: 'monospace',
                textAlign: 'left',
                maxHeight: '120px',
                overflowY: 'auto',
                marginBottom: '24px',
                wordBreak: 'break-all'
              }}>
                {this.state.error.toString()}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={this.handleReload}
                style={{
                  background: '#FFD000',
                  color: '#000000',
                  fontWeight: '800',
                  fontSize: '13px',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 14px rgba(255, 208, 0, 0.3)'
                }}
              >
                <RefreshCw size={16} /> Recharger la page
              </button>

              <button
                onClick={this.handleClearCacheAndReload}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: '#FFFFFF',
                  fontWeight: '700',
                  fontSize: '13px',
                  padding: '12px 20px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Trash2 size={16} /> Réinitialiser le cache & Reconnecter
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
