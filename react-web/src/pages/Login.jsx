import React, { useState } from 'react'
import { ShieldCheck, Mail, Lock, LogIn, UserCheck, Shield, AlertTriangle } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function Login() {
  const { login } = useApp()
  const [email, setEmail] = useState('bardahl@gmail.com')
  const [password, setPassword] = useState('123456')
  const [errorMsg, setErrorMsg] = useState('')

  const isEmailAdmin = email.trim().toLowerCase() === 'bardahl@gmail.com'

  const handleSubmit = (e) => {
    e.preventDefault()
    setErrorMsg('')
    try {
      login(email, password, isEmailAdmin ? 'ADMIN' : 'COMMERCIAL')
    } catch (err) {
      setErrorMsg(err.message || 'Erreur de connexion.')
    }
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'radial-gradient(circle at center, #181C24 0%, #0D0F12 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      zIndex: 1000
    }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '440px', textAlign: 'center', borderColor: 'rgba(255, 208, 0, 0.4)' }}>
        
        {/* Official Yellow Checkered Flag Bardahl Logo */}
        <img
          src="/bardahl_logo.png"
          alt="Official Bardahl Logo"
          style={{
            width: '150px',
            height: 'auto',
            margin: '0 auto 16px auto',
            display: 'block',
            filter: 'drop-shadow(0 8px 25px rgba(255, 208, 0, 0.45))'
          }}
        />

        <h1 style={{ fontSize: '24px', fontWeight: '900', letterSpacing: '0.5px', color: '#FFFFFF', marginBottom: '4px' }}>
          BARDAHL MAROC
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
          Système de Gestion Commerciale & Bons de Commande
        </p>

        {/* Error Alert Box */}
        {errorMsg && (
          <div style={{
            background: 'rgba(255, 69, 58, 0.15)',
            border: '1px solid rgba(255, 69, 58, 0.4)',
            color: '#FF453A',
            padding: '10px 14px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '700',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textAlign: 'left'
          }}>
            <AlertTriangle style={{ width: '16px', height: '16px', flexShrink: 0 }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Dynamic Account Role Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '10px 16px',
          borderRadius: '12px',
          marginBottom: '20px',
          fontSize: '12px',
          fontWeight: '800',
          background: isEmailAdmin ? 'rgba(255, 208, 0, 0.15)' : 'rgba(0, 122, 255, 0.15)',
          color: isEmailAdmin ? 'var(--bardahl-yellow)' : '#007AFF',
          border: isEmailAdmin ? '1px solid var(--bardahl-yellow)' : '1px solid rgba(0, 122, 255, 0.3)'
        }}>
          {isEmailAdmin ? <Shield style={{ width: '16px', height: '16px' }} /> : <UserCheck style={{ width: '16px', height: '16px' }} />}
          {isEmailAdmin ? "Compte Administrateur Global (bardahl@gmail.com)" : "Compte Agent Commercial Supabase"}
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '600' }}>
              <Mail style={{ width: '14px', height: '14px', color: 'var(--bardahl-yellow)' }} /> Adresse Email Identifiant
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrorMsg(''); }}
              className="input-field"
              placeholder="bardahl@gmail.com ou email commercial"
              required
            />
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: '600' }}>
              <Lock style={{ width: '14px', height: '14px', color: 'var(--bardahl-yellow)' }} /> Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrorMsg(''); }}
              className="input-field"
              placeholder="Entrez votre mot de passe"
              required
            />
          </div>

          <button type="submit" className="btn-bardahl" style={{ width: '100%', marginTop: '8px', padding: '14px' }}>
            <LogIn style={{ width: '18px', height: '18px' }} /> SE CONNECTER
          </button>
        </form>

        {/* Quick Demo Shortcuts */}
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-card)', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
          <div>Tester Connexion Admin : <button onClick={() => { setEmail('bardahl@gmail.com'); setPassword('123456'); setErrorMsg(''); }} style={{ color: 'var(--bardahl-yellow)', textDecoration: 'underline', fontWeight: '800' }}>bardahl@gmail.com</button></div>
          <div>Tester Connexion Commercial : <button onClick={() => { setEmail('karim@bardahl.ma'); setPassword('123'); setErrorMsg(''); }} style={{ color: '#007AFF', textDecoration: 'underline', fontWeight: '800' }}>karim@bardahl.ma</button></div>
        </div>

      </div>
    </div>
  )
}
