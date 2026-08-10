import React from 'react'
import { PlusCircle } from 'lucide-react'

export default function Header({ title, onNewOrderClick }) {
  return (
    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
      <div>
        <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#FFFFFF', letterSpacing: '0.5px' }}>{title}</h2>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button onClick={onNewOrderClick} className="btn-bardahl" style={{ padding: '10px 20px', fontSize: '13px' }}>
          <PlusCircle style={{ width: '16px', height: '16px' }} /> Nouveau Bon
        </button>
      </div>
    </header>
  )
}
