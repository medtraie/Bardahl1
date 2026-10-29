import React, { useState, useMemo } from 'react'
import {
  ShieldCheck, ShieldAlert, Smartphone, Plus, Trash2, Edit3,
  Search, RefreshCw, CheckCircle2, XCircle, AlertTriangle,
  Lock, Unlock, Clock, FileSpreadsheet, KeyRound, Laptop,
  HelpCircle, UserCheck, ChevronRight, X
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { exportMacDevicesToExcel } from '../utils/excelExporter'

export default function MacFiltering() {
  const {
    currentUser,
    commercials = [],
    isGlobalMacFilteringActive,
    toggleGlobalMacFiltering,
    commercialsMacStatus,
    toggleCommercialMacFiltering,
    commercialDevices = [],
    addCommercialDevice,
    updateCommercialDevice,
    deleteCommercialDevice,
    commercialsLastLogin = {},
    macSecurityLogs = [],
    approveBlockedAttempt
  } = useApp()

  const isAdmin = currentUser?.role === 'ADMIN' || (currentUser?.email || '').toLowerCase() === 'bardahl@gmail.com'

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL') // ALL | PROTECTED | UNPROTECTED
  const [activeTab, setActiveTab] = useState('DEVICES') // 'DEVICES' | 'AUDIT_LOGS'

  // Modal State for Adding / Editing MAC
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedCommercial, setSelectedCommercial] = useState(null)
  const [editingDevice, setEditingDevice] = useState(null)
  const [macInput, setMacInput] = useState('')
  const [deviceNameInput, setDeviceNameInput] = useState('')
  const [deviceModelInput, setDeviceModelInput] = useState('')
  const [modalError, setModalError] = useState('')

  // Access control guard
  if (!isAdmin) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto', background: 'rgba(255, 69, 58, 0.1)', border: '1px solid rgba(255, 69, 58, 0.4)', borderRadius: '16px', padding: '32px' }}>
          <ShieldAlert size={48} style={{ color: '#FF453A', margin: '0 auto 16px auto' }} />
          <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#FFFFFF', marginBottom: '8px' }}>
            Accès Réservé à la Direction Bardahl
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Ce panneau de filtrage MAC et sécurité matérielle des appareils Android est exclusivement géré par le compte Administrateur Global.
          </p>
        </div>
      </div>
    )
  }

  // Format MAC input with colons automatically
  const handleMacInputChange = (val) => {
    let clean = val.replace(/[^a-fA-F0-9]/g, '').toUpperCase().slice(0, 12)
    let formatted = ''
    for (let i = 0; i < clean.length; i += 2) {
      if (i > 0) formatted += ':'
      formatted += clean.substring(i, i + 2)
    }
    setMacInput(formatted)
  }

  // Open modal to add MAC for a commercial
  const handleOpenAddModal = (comm) => {
    const devices = commercialDevices.filter(d => d.commercialId === (comm.dbId || comm.id))
    if (devices.length >= 3) {
      alert(`Limite atteinte : Le commercial ${comm.name} dispose déjà de 3 adresses MAC autorisées (maximum strict). Veuillez supprimer un appareil existant avant d'en ajouter un nouveau.`)
      return
    }
    setSelectedCommercial(comm)
    setEditingDevice(null)
    setMacInput('')
    setDeviceNameInput(`Appareil #${devices.length + 1}`)
    setDeviceModelInput('')
    setModalError('')
    setModalOpen(true)
  }

  // Open modal to edit existing MAC
  const handleOpenEditModal = (comm, device) => {
    setSelectedCommercial(comm)
    setEditingDevice(device)
    setMacInput(device.macAddress || '')
    setDeviceNameInput(device.deviceName || '')
    setDeviceModelInput(device.deviceModel || '')
    setModalError('')
    setModalOpen(true)
  }

  // Save Modal (Add or Edit)
  const handleSaveModal = async (e) => {
    e.preventDefault()
    setModalError('')

    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/
    const cleanMac = macInput.trim().toUpperCase()

    if (!macRegex.test(cleanMac)) {
      setModalError("Adresse MAC invalide. Format attendu : XX:XX:XX:XX:XX:XX (Ex: 4E:8A:3C:91:2E:75)")
      return
    }

    try {
      const commId = selectedCommercial.dbId || selectedCommercial.id
      if (editingDevice) {
        await updateCommercialDevice(editingDevice.id, {
          macAddress: cleanMac,
          deviceName: deviceNameInput.trim() || 'Appareil Android',
          deviceModel: deviceModelInput.trim() || 'Android Device'
        })
      } else {
        await addCommercialDevice(commId, {
          macAddress: cleanMac,
          deviceName: deviceNameInput.trim() || 'Appareil Android',
          deviceModel: deviceModelInput.trim() || 'Android Device'
        })
      }
      setModalOpen(false)
    } catch (err) {
      setModalError(err.message || "Erreur lors de l'enregistrement de l'appareil.")
    }
  }

  // Export to Excel handler
  const handleExportExcel = () => {
    const enrichedCommercials = commercials.map(c => {
      const commId = c.dbId || c.id
      const devices = commercialDevices.filter(d => d.commercialId === commId)
      const isMacActive = commercialsMacStatus[commId] !== false
      const lastLogin = commercialsLastLogin[commId] || null
      return {
        ...c,
        devices,
        isMacFilteringActive: isMacActive,
        lastLogin
      }
    })
    exportMacDevicesToExcel(enrichedCommercials, macSecurityLogs)
  }

  // Filtered commercials list
  const filteredCommercials = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return commercials.filter(comm => {
      const commId = comm.dbId || comm.id
      const isProtected = commercialsMacStatus[commId] !== false
      const devices = commercialDevices.filter(d => d.commercialId === commId)
      
      const matchSearch = 
        !q ||
        comm.name.toLowerCase().includes(q) ||
        comm.matricule.toLowerCase().includes(q) ||
        comm.email.toLowerCase().includes(q) ||
        devices.some(d => d.macAddress.toLowerCase().includes(q) || (d.deviceName || '').toLowerCase().includes(q) || (d.deviceModel || '').toLowerCase().includes(q))

      const matchStatus = 
        statusFilter === 'ALL' ||
        (statusFilter === 'PROTECTED' && isProtected) ||
        (statusFilter === 'UNPROTECTED' && !isProtected)

      return matchSearch && matchStatus
    })
  }, [commercials, searchTerm, statusFilter, commercialsMacStatus, commercialDevices])

  // KPIs
  const totalCommercialsCount = commercials.length
  const totalDevicesCount = commercialDevices.length
  const blockedAttemptsCount = macSecurityLogs.filter(l => l.status === 'BLOCKED').length
  const protectedCommercialsCount = commercials.filter(c => commercialsMacStatus[c.dbId || c.id] !== false).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* ── HEADER & MASTER SWITCH ── */}
      <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px', borderColor: isGlobalMacFilteringActive ? 'rgba(52, 199, 89, 0.4)' : 'rgba(255, 69, 58, 0.4)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: isGlobalMacFilteringActive ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 69, 58, 0.15)',
              color: isGlobalMacFilteringActive ? '#34C759' : '#FF453A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#FFFFFF', margin: 0 }}>
                Filtrage MAC & Contrôle Matériel Android
              </h2>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Verrouillage strict des connexions : Maximum 3 adresses MAC autorisées par commercial
              </span>
            </div>
          </div>
        </div>

        {/* Global Master Switch & Export */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          
          <button
            onClick={handleExportExcel}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: '700' }}
          >
            <FileSpreadsheet size={16} style={{ color: '#34C759' }} /> Exporter l'Audit (Excel)
          </button>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: 'rgba(255,255,255,0.04)',
            padding: '8px 16px',
            borderRadius: '14px',
            border: isGlobalMacFilteringActive ? '1px solid rgba(52, 199, 89, 0.3)' : '1px solid rgba(255, 69, 58, 0.3)'
          }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '12px', fontWeight: '800', color: isGlobalMacFilteringActive ? '#34C759' : '#FF453A' }}>
                {isGlobalMacFilteringActive ? 'PROTECTION GLOBALE ACTIVE' : 'PROTECTION GLOBALE SUSPENDUE'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {isGlobalMacFilteringActive ? 'Contrôle actif sur tout le réseau' : 'Toutes les connexions acceptées'}
              </div>
            </div>

            <button
              onClick={toggleGlobalMacFiltering}
              style={{
                background: isGlobalMacFilteringActive ? '#34C759' : '#FF453A',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '30px',
                padding: '6px 14px',
                fontWeight: '800',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: isGlobalMacFilteringActive ? '0 0 15px rgba(52, 199, 89, 0.4)' : '0 0 15px rgba(255, 69, 58, 0.4)',
                transition: 'all 0.2s'
              }}
            >
              {isGlobalMacFilteringActive ? <Lock size={14} /> : <Unlock size={14} />}
              {isGlobalMacFilteringActive ? 'Désactiver' : 'Activer'}
            </button>
          </div>

        </div>
      </div>

      {/* ── 4 KPI CARDS ── */}
      <div className="kpi-grid">
        
        {/* KPI 1: Commerciaux Sous Surveillance */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Commerciaux Surveillés
            </span>
            <div style={{ fontSize: '26px', fontWeight: '900', color: '#FFFFFF', margin: '6px 0 2px' }}>
              {protectedCommercialsCount} / {totalCommercialsCount}
            </div>
            <span style={{ fontSize: '11px', color: '#34C759', fontWeight: '700' }}>
              ● {Math.round((protectedCommercialsCount / (totalCommercialsCount || 1)) * 100)}% sous protection MAC
            </span>
          </div>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(0, 122, 255, 0.15)', color: '#007AFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserCheck size={22} />
          </div>
        </div>

        {/* KPI 2: Appareils Android Enregistrés */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Appareils Enregistrés
            </span>
            <div style={{ fontSize: '26px', fontWeight: '900', color: 'var(--bardahl-yellow)', margin: '6px 0 2px' }}>
              {totalDevicesCount} <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>/ {totalCommercialsCount * 3} max</span>
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Slots utilisés sur l'ensemble de la flotte
            </span>
          </div>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(255, 208, 0, 0.15)', color: 'var(--bardahl-yellow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Smartphone size={22} />
          </div>
        </div>

        {/* KPI 3: Tentatives Bloquées / Intrusions */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Tentatives Bloquées
            </span>
            <div style={{ fontSize: '26px', fontWeight: '900', color: blockedAttemptsCount > 0 ? '#FF453A' : '#34C759', margin: '6px 0 2px' }}>
              {blockedAttemptsCount}
            </div>
            <span style={{ fontSize: '11px', color: blockedAttemptsCount > 0 ? '#FF453A' : '#34C759', fontWeight: '700' }}>
              {blockedAttemptsCount > 0 ? 'Connexions non autorisées rejetées' : 'Aucune intrusion détectée'}
            </span>
          </div>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(255, 69, 58, 0.15)', color: '#FF453A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldAlert size={22} />
          </div>
        </div>

        {/* KPI 4: Statut du Réseau */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
              Sécurité Flotte Android
            </span>
            <div style={{ fontSize: '22px', fontWeight: '900', color: '#34C759', margin: '6px 0 2px' }}>
              VERROUILLÉ
            </div>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              Mode 3 Adresses MAC Max Actif
            </span>
          </div>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(52, 199, 89, 0.15)', color: '#34C759', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <KeyRound size={22} />
          </div>
        </div>

      </div>

      {/* ── TABS SELECTOR (DEVICES VS AUDIT LOGS) ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
        <button
          onClick={() => setActiveTab('DEVICES')}
          style={{
            background: activeTab === 'DEVICES' ? 'rgba(255, 208, 0, 0.15)' : 'transparent',
            color: activeTab === 'DEVICES' ? 'var(--bardahl-yellow)' : 'var(--text-secondary)',
            border: activeTab === 'DEVICES' ? '1px solid var(--bardahl-yellow)' : '1px solid transparent',
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: '800',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Smartphone size={16} /> Gestion des Appareils par Commercial ({commercials.length})
        </button>

        <button
          onClick={() => setActiveTab('AUDIT_LOGS')}
          style={{
            background: activeTab === 'AUDIT_LOGS' ? 'rgba(255, 69, 58, 0.15)' : 'transparent',
            color: activeTab === 'AUDIT_LOGS' ? '#FF453A' : 'var(--text-secondary)',
            border: activeTab === 'AUDIT_LOGS' ? '1px solid rgba(255, 69, 58, 0.4)' : '1px solid transparent',
            padding: '10px 20px',
            borderRadius: '10px',
            fontWeight: '800',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <ShieldAlert size={16} /> Journal des Tentatives & Sécurité ({macSecurityLogs.length})
          {blockedAttemptsCount > 0 && (
            <span style={{ background: '#FF453A', color: '#FFFFFF', padding: '2px 7px', borderRadius: '10px', fontSize: '11px', fontWeight: '900' }}>
              {blockedAttemptsCount}
            </span>
          )}
        </button>
      </div>

      {/* ── TAB 1: GESTION DES APPAREILS PAR COMMERCIAL ── */}
      {activeTab === 'DEVICES' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Search & Filter Bar */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '280px', maxWidth: '420px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
              <input
                type="text"
                placeholder="Rechercher un commercial, adresse MAC, téléphone..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '38px', height: '42px', fontSize: '13px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="input-field"
                style={{ height: '42px', width: 'auto', minWidth: '180px', fontSize: '13px', fontWeight: '700' }}
              >
                <option value="ALL">Tous les statuts ({commercials.length})</option>
                <option value="PROTECTED">Protection Active ({protectedCommercialsCount})</option>
                <option value="UNPROTECTED">Protection Désactivée ({totalCommercialsCount - protectedCommercialsCount})</option>
              </select>
            </div>
          </div>

          {/* Grid of Commercials with their 3 device slots */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredCommercials.map(comm => {
              const commId = comm.dbId || comm.id
              const isMacActive = commercialsMacStatus[commId] !== false
              const devices = commercialDevices.filter(d => d.commercialId === commId)
              const lastLogin = commercialsLastLogin[commId] || null
              const slotsRemaining = 3 - devices.length

              return (
                <div key={commId} className="glass-card" style={{ padding: '20px', borderColor: isMacActive ? 'rgba(255, 208, 0, 0.25)' : 'rgba(255, 69, 58, 0.3)' }}>
                  
                  {/* Top Bar of Commercial Card */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <div style={{
                        minWidth: '96px',
                        height: '40px',
                        padding: '0 14px',
                        borderRadius: '10px',
                        background: 'rgba(255, 208, 0, 0.1)',
                        border: '1.5px solid rgba(255, 208, 0, 0.4)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--bardahl-yellow)',
                        fontWeight: '900',
                        fontSize: '13px',
                        letterSpacing: '0.8px',
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.25)'
                      }}>
                        {comm.matricule || 'COM'}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#FFFFFF', margin: 0 }}>
                            {comm.name}
                          </h3>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            ({comm.email})
                          </span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                          <span>Régions : {(comm.regions || []).join(', ') || comm.city || 'Maroc'}</span>
                          <span>•</span>
                          <span style={{ color: devices.length === 3 ? '#FF9500' : 'var(--bardahl-yellow)', fontWeight: '700' }}>
                            {devices.length} / 3 Appareils Alloués
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Per-commercial controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      
                      {/* Active/Inactive Switch for this commercial */}
                      <button
                        onClick={() => toggleCommercialMacFiltering(commId)}
                        style={{
                          background: isMacActive ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 69, 58, 0.15)',
                          border: isMacActive ? '1px solid rgba(52, 199, 89, 0.4)' : '1px solid rgba(255, 69, 58, 0.4)',
                          color: isMacActive ? '#34C759' : '#FF453A',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: '800',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        {isMacActive ? <Lock size={13} /> : <Unlock size={13} />}
                        {isMacActive ? 'Filtrage ACTIF' : 'Filtrage DÉSACTIVÉ'}
                      </button>

                      {/* Add Button if slot available */}
                      {slotsRemaining > 0 ? (
                        <button
                          onClick={() => handleOpenAddModal(comm)}
                          className="btn-bardahl"
                          style={{ padding: '7px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <Plus size={14} /> + Ajouter MAC ({slotsRemaining} restante{slotsRemaining > 1 ? 's' : ''})
                        </button>
                      ) : (
                        <span style={{ fontSize: '11px', fontWeight: '800', color: '#FF9500', background: 'rgba(255, 149, 0, 0.15)', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(255, 149, 0, 0.3)' }}>
                          3/3 Maximum atteint
                        </span>
                      )}

                    </div>

                  </div>

                  {/* 3 VISUAL DEVICE SLOTS */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                    
                    {/* Render Registered Devices */}
                    {devices.map((device, idx) => (
                      <div
                        key={device.id}
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: device.isActive ? '1px solid rgba(52, 199, 89, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '12px',
                          padding: '14px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '10px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Smartphone size={18} style={{ color: device.isActive ? '#34C759' : 'var(--text-secondary)' }} />
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: '800', color: '#FFFFFF' }}>
                                {device.deviceName || `Appareil #${idx + 1}`}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                {device.deviceModel || 'Modèle non spécifié'}
                              </div>
                            </div>
                          </div>

                          <span style={{
                            fontSize: '10px',
                            fontWeight: '800',
                            padding: '3px 7px',
                            borderRadius: '6px',
                            background: device.isActive ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 255, 255, 0.1)',
                            color: device.isActive ? '#34C759' : 'var(--text-secondary)'
                          }}>
                            Slot #{idx + 1}
                          </span>
                        </div>

                        {/* MAC Address Display Box */}
                        <div style={{
                          background: '#0D0F12',
                          border: '1px solid rgba(255, 208, 0, 0.25)',
                          borderRadius: '8px',
                          padding: '8px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>MAC :</span>
                          <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: '800', color: 'var(--bardahl-yellow)', letterSpacing: '0.8px' }}>
                            {device.macAddress}
                          </span>
                        </div>

                        {/* Actions (Toggle active, Edit, Delete) */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                            Ajouté le {new Date(device.addedAt).toLocaleDateString('fr-FR')}
                          </span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              onClick={() => handleOpenEditModal(comm, device)}
                              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
                              title="Modifier les informations"
                            >
                              <Edit3 size={14} />
                            </button>

                            <button
                              onClick={() => {
                                if (confirm(`Supprimer l'appareil "${device.deviceName}" (${device.macAddress}) ?\nCe téléphone ne pourra plus accéder à l'application Bardahl Android.`)) {
                                  deleteCommercialDevice(device.id)
                                }
                              }}
                              style={{ background: 'none', border: 'none', color: '#FF453A', cursor: 'pointer', padding: '4px' }}
                              title="Supprimer cet appareil"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                      </div>
                    ))}

                    {/* Render Empty Slots */}
                    {Array.from({ length: slotsRemaining }).map((_, slotIdx) => (
                      <div
                        key={`empty_${slotIdx}`}
                        onClick={() => handleOpenAddModal(comm)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.01)',
                          border: '1px dashed rgba(255, 255, 255, 0.15)',
                          borderRadius: '12px',
                          padding: '24px 16px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = 'var(--bardahl-yellow)'
                          e.currentTarget.style.background = 'rgba(255, 208, 0, 0.04)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)'
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.01)'
                        }}
                      >
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                          <Plus size={16} />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                          Slot #{devices.length + slotIdx + 1} Libre
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--bardahl-yellow)' }}>
                          + Enregistrer une adresse MAC
                        </span>
                      </div>
                    ))}

                  </div>

                  {/* Bottom Connection Status Indicator */}
                  <div style={{
                    background: 'rgba(0,0,0,0.3)',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                    fontSize: '11px',
                    color: 'var(--text-secondary)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Clock size={13} style={{ color: 'var(--bardahl-yellow)' }} />
                      <span>Dernière connexion Android :</span>
                      {lastLogin?.date ? (
                        <strong style={{ color: '#FFFFFF' }}>
                          {new Date(lastLogin.date).toLocaleString('fr-FR')} ({lastLogin.deviceModel || 'Android'} • MAC: {lastLogin.mac || 'Inconnue'})
                        </strong>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>Aucune connexion récente enregistrée</span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: isMacActive ? '#34C759' : '#FF453A',
                        display: 'inline-block'
                      }}></span>
                      <span>{isMacActive ? 'Accès restreint aux MACs enregistrées' : 'Accès ouvert'}</span>
                    </div>
                  </div>

                </div>
              )
            })}
          </div>

        </div>
      )}

      {/* ── TAB 2: JOURNAL DE SÉCURITÉ & AUDIT LOGS ── */}
      {activeTab === 'AUDIT_LOGS' && (
        <div className="glass-card" style={{ padding: '20px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '900', color: '#FFFFFF', margin: 0 }}>
                Historique des Tentatives de Connexion & Événements de Sécurité
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                Surveillance en direct des refus d'accès et des connexions autorisées sur l'application Android
              </p>
            </div>

            <button
              onClick={handleExportExcel}
              className="btn-secondary"
              style={{ padding: '8px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <FileSpreadsheet size={14} style={{ color: '#34C759' }} /> Exporter Logs (Excel)
            </button>
          </div>

          {macSecurityLogs.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <ShieldCheck size={36} style={{ color: '#34C759', margin: '0 auto 12px auto' }} />
              <p style={{ fontSize: '14px', fontWeight: '700', color: '#FFFFFF' }}>Aucun incident de sécurité enregistré</p>
              <p style={{ fontSize: '12px' }}>Toutes les connexions récentes proviennent d'appareils dûment autorisés.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Date & Heure</th>
                    <th>Commercial</th>
                    <th>Adresse MAC Tentée</th>
                    <th>Modèle Appareil</th>
                    <th>Statut</th>
                    <th>Motif & Réseau</th>
                    <th style={{ textAlign: 'right' }}>Action Rapide</th>
                  </tr>
                </thead>
                <tbody>
                  {macSecurityLogs.map(log => {
                    const isBlocked = log.status === 'BLOCKED'
                    return (
                      <tr key={log.id} style={{ background: isBlocked ? 'rgba(255, 69, 58, 0.05)' : undefined }}>
                        <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {new Date(log.createdAt || log.created_at || Date.now()).toLocaleString('fr-FR')}
                        </td>
                        <td>
                          <strong style={{ color: '#FFFFFF' }}>{log.commercialName || log.commercial_name || 'Commercial'}</strong>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{log.commercialEmail || log.commercial_email}</div>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'monospace', fontWeight: '800', color: isBlocked ? '#FF453A' : 'var(--bardahl-yellow)', fontSize: '12px' }}>
                            {log.attemptedMac || log.attempted_mac || '-'}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px' }}>
                          {log.deviceModel || log.device_model || 'Android Device'}
                        </td>
                        <td>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '800',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            background: isBlocked ? 'rgba(255, 69, 58, 0.15)' : 'rgba(52, 199, 89, 0.15)',
                            color: isBlocked ? '#FF453A' : '#34C759',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            {isBlocked ? <XCircle size={12} /> : <CheckCircle2 size={12} />}
                            {isBlocked ? 'REFUSÉ / BLOQUÉ' : 'AUTORISÉ'}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', color: isBlocked ? '#FF453A' : 'var(--text-secondary)' }}>
                          {log.reason || (isBlocked ? 'Adresse MAC non autorisée' : 'Appareil reconnu')}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {isBlocked && (
                            <button
                              onClick={async () => {
                                try {
                                  await approveBlockedAttempt(log.id)
                                  alert(`Appareil approuvé avec succès ! L'adresse MAC ${log.attemptedMac || log.attempted_mac} a été ajoutée aux autorisations du commercial.`)
                                } catch (e) {
                                  alert(e.message || "Impossible d'approuver cet appareil.")
                                }
                              }}
                              style={{
                                background: '#FFD000',
                                color: '#000000',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '5px 10px',
                                fontSize: '11px',
                                fontWeight: '800',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <CheckCircle2 size={12} /> Autoriser cet appareil
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

      {/* ── MODAL: AJOUTER / MODIFIER ADRESSE MAC ── */}
      {modalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          zIndex: 9999
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '480px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <KeyRound size={20} style={{ color: 'var(--bardahl-yellow)' }} />
                <h3 style={{ fontSize: '17px', fontWeight: '900', color: '#FFFFFF', margin: 0 }}>
                  {editingDevice ? "Modifier l'Appareil Android" : "Ajouter une Adresse MAC Autorisée"}
                </h3>
              </div>
              <button onClick={() => setModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
              Pour le commercial : <strong style={{ color: '#FFFFFF' }}>{selectedCommercial?.name}</strong> ({selectedCommercial?.matricule})
            </p>

            {/* Error banner */}
            {modalError && (
              <div style={{ background: 'rgba(255, 69, 58, 0.15)', border: '1px solid rgba(255, 69, 58, 0.4)', borderRadius: '8px', padding: '10px 12px', color: '#FF453A', fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveModal} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Adresse MAC */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#FFFFFF', marginBottom: '6px', display: 'block' }}>
                  Adresse MAC de l'Appareil *
                </label>
                <input
                  type="text"
                  placeholder="Ex: 4E:8A:3C:91:2E:75"
                  value={macInput}
                  onChange={e => handleMacInputChange(e.target.value)}
                  className="input-field"
                  style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase', height: '42px' }}
                  required
                />
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>
                  Format 6 octets hexadécimaux séparés par des deux-points (XX:XX:XX:XX:XX:XX)
                </span>
              </div>

              {/* Nom du téléphone */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#FFFFFF', marginBottom: '6px', display: 'block' }}>
                  Nom / Désignation de l'Appareil
                </label>
                <input
                  type="text"
                  placeholder="Ex: Samsung Pro Karim, Tablette Vente..."
                  value={deviceNameInput}
                  onChange={e => setDeviceNameInput(e.target.value)}
                  className="input-field"
                  style={{ height: '42px', fontSize: '13px' }}
                />
              </div>

              {/* Modèle de l'appareil */}
              <div>
                <label style={{ fontSize: '12px', fontWeight: '800', color: '#FFFFFF', marginBottom: '6px', display: 'block' }}>
                  Modèle Matériel (Optionnel)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Samsung Galaxy A54, Xiaomi Redmi 12..."
                  value={deviceModelInput}
                  onChange={e => setDeviceModelInput(e.target.value)}
                  className="input-field"
                  style={{ height: '42px', fontSize: '13px' }}
                />
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn-secondary"
                  style={{ padding: '10px 18px', fontSize: '13px' }}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="btn-bardahl"
                  style={{ padding: '10px 22px', fontSize: '13px', fontWeight: '800' }}
                >
                  {editingDevice ? 'Mettre à jour' : 'Enregistrer l’appareil'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  )
}
