import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { allProductsData } from '../data/productsData'
import { defaultPromotions } from '../data/promotionsData'
import { DEFAULT_BARDAHL_FAMILIES, setGlobalProductFamilies } from '../data/familiesData'
import { getRegionForCity, getStoredRegions } from '../data/regionsData'
import {
  dbGetCommercials, dbAddCommercial, dbUpdateCommercial, dbDeleteCommercial,
  dbGetClients,     dbAddClient,      dbUpdateClient,      dbDeleteClient,
  dbGetOrders,      dbAddOrder,       dbUpdateOrder,       dbDeleteOrder,
  dbGetPromotions,  dbAddPromotion,   dbUpdatePromotion,   dbDeletePromotion,
  dbGetProducts,    dbAddProduct,     dbUpdateProduct,     dbDeleteProduct,
  dbGetProductFamilies, dbAddProductFamily, dbUpdateProductFamily, dbDeleteProductFamily,
  dbUpdateOrderStatus,
  dbGetDevis, dbAddDevis, dbUpdateDevis, dbDeleteDevis,
  dbGetCommercialDevices, dbAddCommercialDevice, dbUpdateCommercialDevice, dbDeleteCommercialDevice,
  dbGetMacSecurityLogs, dbAddMacSecurityLog, dbGetMacSecurityConfig, dbSaveMacSecurityConfig,
  subscribeToTable, unsubscribeChannel,
} from '../lib/supabase'

export const ADMIN_COMMERCIAL_ID = 'e7fa1dfe-4bfc-49fb-82a6-142e4724942c'
export const ADMIN_COMMERCIAL_NAME = 'Créé par Administrateur'

const AppContext = createContext()

// ─── Row converters: Supabase row → App object ────────────────────────────────

function rowToCommercial(row) {
  let sectors = []
  let explicitRegions = []
  const rawCity = row.city || ''

  // Determine active status from city tag or local storage cache
  const isInactiveInCity = rawCity.includes('Statut: INACTIF') || rawCity.includes('[Status: INACTIVE]')
  let localInactive = false
  if (typeof localStorage !== 'undefined') {
    try {
      const savedStatus = JSON.parse(localStorage.getItem('bardahl_commercials_status') || '{}')
      if (savedStatus[row.id] !== undefined) localInactive = (savedStatus[row.id] === false)
      else if (row.matricule && savedStatus[row.matricule] !== undefined) localInactive = (savedStatus[row.matricule] === false)
    } catch (e) {}
  }
  const isActive = !isInactiveInCity && !localInactive

  // Clean rawCity before splitting sectors and regions so status tag doesn't pollute them
  const cleanCity = rawCity.replace(/\|\s*Statut:\s*\w+/gi, '').replace(/\[Status:\s*\w+\]/gi, '').trim()

  if (cleanCity.includes('| Régions:')) {
    const parts = cleanCity.split('| Régions:')
    sectors = parts[0].split(',').map(s => s.trim()).filter(Boolean)
    explicitRegions = parts[1].split(',').map(r => r.trim()).filter(Boolean)
  } else if (cleanCity.includes('[Régions:')) {
    const match = cleanCity.match(/\[Régions:(.*?)\]/)
    if (match) {
      explicitRegions = match[1].split(',').map(r => r.trim()).filter(Boolean)
      sectors = cleanCity.replace(/\[Régions:.*?\]/, '').split(',').map(s => s.trim()).filter(Boolean)
    }
  } else {
    sectors = cleanCity.split(',').map(s => s.trim()).filter(Boolean)
  }

  // Check localStorage cache if explicit regions not in city string
  if (explicitRegions.length === 0 && typeof localStorage !== 'undefined') {
    try {
      const saved = JSON.parse(localStorage.getItem('bardahl_commercial_regions') || '{}')
      const entry = saved[row.id] || (row.matricule ? saved[row.matricule] : null)
      if (entry?.regions && entry.regions.length > 0) {
        explicitRegions = entry.regions
      }
    } catch (e) {}
  }

  const regions = explicitRegions.length > 0
    ? explicitRegions
    : (() => {
        const stored = typeof getStoredRegions === 'function' ? getStoredRegions() : null
        const regionsSet = new Set()
        sectors.forEach(s => {
          const reg = getRegionForCity(s, stored)
          if (reg) regionsSet.add(reg)
        })
        const inferred = Array.from(regionsSet)
        if (inferred.length === 0 && cleanCity) {
          const fallbackReg = getRegionForCity(cleanCity, stored)
          if (fallbackReg) inferred.push(fallbackReg)
        }
        return inferred.length > 0 ? inferred : ['Casablanca-Settat']
      })()

  return {
    id: row.id,
    dbId: row.id,
    name: row.name || `Commercial ${row.matricule}`,
    email: row.email || '',
    password: row.password || '123456',
    matricule: row.matricule || '',
    city: row.city || '',
    sectors: sectors.length > 0 ? sectors : [cleanCity || 'Casablanca'],
    regions: regions,
    phone: row.phone || '',
    target: row.target_monthly_sales || 150000,
    current: row.current_month_sales || 0,
    isActive: isActive,
  }
}

function rowToClient(row) {
  const typeMap = {
    gros: 'Grossiste',
    garage: 'Grossiste',
    station: 'Revendeur',
    detail: 'Particulier',
    flotte: 'Grand compte',
    fleet: 'Grand compte',
    industriel: 'Grand compte'
  }
  return {
    id: row.id,
    dbId: row.id,
    companyName: row.company_name || '',
    ice: row.ice || '',
    rc: row.rc || '',
    codeClient: row.if_code || '',
    region: row.patente || '',
    address: row.address || '',
    city: row.city || '',
    phone: row.phone || '',
    clientEmail: row.email || '',
    type: typeMap[(row.client_type || 'gros').toLowerCase()] || 'Grossiste',
    isActive: row.is_active !== false,
    commercialDbId: row.commercial_id,
    // Will be enriched after fetch
    commercialName: '',
    commercialEmail: '',
  }
}

function rowToOrder(row, extras = {}) {
  const statusMap = { 
    validated: 'VALIDATED', 
    draft: 'EN_ATTENTE', 
    sent: 'SENT', 
    delivered: 'DELIVERED', 
    cancelled: 'CANCELLED' 
  }
  const totalTtc = row.total_ttc || 0

  let parsedObs = {}
  if (row.observations) {
    try {
      const trimmed = row.observations.trim()
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        parsedObs = JSON.parse(trimmed)
      }
    } catch (e) {
      // not json
    }
  }

  const obsRaw = row.observations || ''
  const paymentMethod = extras.paymentMethod || parsedObs.paymentMethod ||
    (obsRaw.includes('Carte Bancaire') ? 'Carte Bancaire' :
     obsRaw.includes('Espèces') ? 'Espèces' :
     obsRaw.includes('Virement') ? 'Virement' : 'Chèque')

  const modeExpedition = extras.modeExpedition || parsedObs.modeExpedition ||
    (obsRaw.includes('Client Récupère') ? 'Client Récupère' :
     obsRaw.includes('Transporteur Privé') ? 'Transporteur Privé' : 'Transport Bardahl')

  const promoNote = extras.promoNote || parsedObs.promoNote || ''
  const remarque = extras.remarque || parsedObs.remarque ||
    (parsedObs.items ? '' : obsRaw.replace(/Paiement:[^|]+/g, '').replace(/Expédition:[^|]+/g, '').replace(/Promo:[^|]+/g, '').replace(/Remarque:[^|]+/g, '').trim())

  let items = (extras.items && extras.items.length > 0) ? extras.items :
              (parsedObs.items && parsedObs.items.length > 0) ? parsedObs.items : []

  if (items.length === 0 && totalTtc > 0) {
    items = [
      {
        productId: 'la1',
        reference: '34131',
        productName: 'Bardahl XTRA 10W40 1L',
        qty: 1,
        qtyGratuit: 0,
        priceTtc: totalTtc,
        remise: 0
      }
    ]
  }

  const totalFreeItems = items.reduce((sum, it) => sum + (parseInt(it.qtyGratuit || it.freeQuantity || 0, 10)), 0)

  return {
    id: row.id,
    dbId: row.id,
    orderNumber: row.order_number || '',
    date: row.order_date ? String(row.order_date).substring(0, 10) : '',
    status: statusMap[(row.status || 'draft').toLowerCase()] || (row.status === 'EN_ATTENTE' ? 'EN_ATTENTE' : 'EN_ATTENTE'),
    totalHt: row.total_ht || (totalTtc / 1.20),
    totalDiscount: row.total_discount || 0,
    totalTva: row.total_tva || (totalTtc - (totalTtc / 1.20)),
    totalTtc: totalTtc,
    observations: obsRaw,
    remarque: remarque,
    promoNote: promoNote,
    isSynced: row.is_synced !== false,
    commercialDbId: row.commercial_id,
    clientDbId: row.client_id,
    // Enriched from extras, parsedObs, or joined data
    commercialName: (
      row.commercial_id === ADMIN_COMMERCIAL_ID ||
      parsedObs.commercialEmail === 'bardahl@gmail.com' ||
      extras.commercialEmail === 'bardahl@gmail.com' ||
      (parsedObs.commercialName && (parsedObs.commercialName.toLowerCase().includes('direction') || parsedObs.commercialName.toLowerCase().includes('admin'))) ||
      (extras.commercialName && (extras.commercialName.toLowerCase().includes('direction') || extras.commercialName.toLowerCase().includes('admin')))
    ) ? ADMIN_COMMERCIAL_NAME : (extras.commercialName || parsedObs.commercialName || ''),
    commercialEmail: (
      row.commercial_id === ADMIN_COMMERCIAL_ID ||
      parsedObs.commercialEmail === 'bardahl@gmail.com' ||
      extras.commercialEmail === 'bardahl@gmail.com' ||
      (parsedObs.commercialName && (parsedObs.commercialName.toLowerCase().includes('direction') || parsedObs.commercialName.toLowerCase().includes('admin'))) ||
      (extras.commercialName && (extras.commercialName.toLowerCase().includes('direction') || extras.commercialName.toLowerCase().includes('admin')))
    ) ? 'bardahl@gmail.com' : (extras.commercialEmail || parsedObs.commercialEmail || ''),
    clientName: extras.clientName || parsedObs.clientName || '',
    clientIce: extras.clientIce || parsedObs.clientIce || '',
    clientCity: extras.clientCity || parsedObs.clientCity || '',
    clientPhone: extras.clientPhone || parsedObs.clientPhone || '',
    paymentMethod: paymentMethod,
    modeExpedition: modeExpedition,
    remisePercent: extras.remisePercent || parsedObs.remisePercent || 0,
    remiseMontant: extras.remiseMontant || parsedObs.remiseMontant || 0,
    voucherDiscount: parseFloat(extras.voucherDiscount || parsedObs.voucherDiscount || 0),
    avoirDeduction: parseFloat(extras.avoirDeduction || parsedObs.avoirDeduction || 0),
    avoirOrderNumber: extras.avoirOrderNumber || parsedObs.avoirOrderNumber || '',
    totalFreeItems: parseInt(extras.totalFreeItems || parsedObs.totalFreeItems || totalFreeItems, 10),
    appliedPromotions: extras.appliedPromotions || parsedObs.appliedPromotions || [],
    hasAnormalPrice: extras.hasAnormalPrice !== undefined ? !!extras.hasAnormalPrice : (parsedObs.hasAnormalPrice || false),
    items: items,
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }) {
  // ONLY session stored locally
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const sess = JSON.parse(localStorage.getItem('bardahl_session') || 'null')
      if (sess && (sess.email || '').toLowerCase() === 'bardahl@gmail.com') {
        return { ...sess, commercialDbId: ADMIN_COMMERCIAL_ID }
      }
      return sess
    }
    catch { return null }
  })

  const [loading, setLoading] = useState(true)
  const [commercials, setCommercials] = useState([])
  const [clients, setClients] = useState([])
  const [orders, setOrders] = useState([])
  const [localProducts, setLocalProducts] = useState(() => {
    try {
      const saved = localStorage.getItem('bardahl_custom_products')
      if (saved) {
        const custom = JSON.parse(saved)
        const map = new Map()
        allProductsData.forEach(p => map.set(p.reference || p.id, p))
        custom.forEach(p => {
          const key = p.reference || p.id
          map.set(key, { ...(map.get(key) || {}), ...p })
        })
        return Array.from(map.values())
      }
    } catch (e) {
      console.warn('Error loading custom products cache:', e)
    }
    return allProductsData
  })

  // Commercial Promotions State
  const [promotions, setPromotions] = useState(() => {
    try {
      const saved = localStorage.getItem('bardahl_promotions')
      return saved ? JSON.parse(saved) : defaultPromotions
    } catch {
      return defaultPromotions
    }
  })

  // Sync promotions from Supabase if table exists
  useEffect(() => {
    async function loadRemotePromos() {
      const remote = await dbGetPromotions()
      if (remote && remote.length > 0) {
        setPromotions(remote)
      }
    }
    loadRemotePromos()
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('bardahl_promotions', JSON.stringify(promotions))
    } catch (e) {
      console.error('Error saving promotions to localStorage:', e)
    }
  }, [promotions])

  // Administrable Product Families State
  const [productFamilies, setProductFamilies] = useState(() => {
    try {
      const saved = localStorage.getItem('bardahl_product_families')
      if (saved) {
        const parsed = JSON.parse(saved)
        setGlobalProductFamilies(parsed)
        return parsed
      }
    } catch {
    }
    setGlobalProductFamilies(DEFAULT_BARDAHL_FAMILIES)
    return DEFAULT_BARDAHL_FAMILIES
  })

  // Sync families from Supabase on mount
  useEffect(() => {
    async function loadFamilies() {
      const remote = await dbGetProductFamilies()
      if (remote && remote.length > 0) {
        setProductFamilies(remote)
        try { localStorage.setItem('bardahl_product_families', JSON.stringify(remote)) } catch (e) {}
        setGlobalProductFamilies(remote)
      }
    }
    loadFamilies()
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('bardahl_product_families', JSON.stringify(productFamilies))
      setGlobalProductFamilies(productFamilies)
    } catch (e) {
      console.error('Error saving product families to localStorage:', e)
    }
  }, [productFamilies])

  // Local storage for extra order data (items, paymentMethod, modeExpedition)
  // These fields don't exist in Supabase orders table
  // ── DEVIS / ESTIMATIONS STATE ───────────────────────────────────────────
  const [devis, setDevis] = useState(() => {
    try {
      const saved = localStorage.getItem('bardahl_devis_records')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('bardahl_devis_records', JSON.stringify(devis))
    } catch (e) {
      console.error('Error saving devis to localStorage:', e)
    }
  }, [devis])

  const [orderExtras, setOrderExtras] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bardahl_order_extras') || '{}') }
    catch { return {} }
  })

  useEffect(() => {
    localStorage.setItem('bardahl_order_extras', JSON.stringify(orderExtras))
  }, [orderExtras])

  // Local storage for Client Compensations / Avoirs de Régularisation Remise
  const [clientCompensations, setClientCompensations] = useState(() => {
    try {
      const saved = localStorage.getItem('bardahl_client_compensations')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('bardahl_client_compensations', JSON.stringify(clientCompensations))
    } catch (e) {
      console.error('Compensations storage error:', e)
    }
  }, [clientCompensations])

  // Theme State: 'dark' (default) or 'light'
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('bardahl_theme') || 'dark' }
    catch { return 'dark' }
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('bardahl_theme', theme) }
    catch (e) { console.error('Theme storage error:', e) }
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }, [])

  useEffect(() => {
    if (currentUser) localStorage.setItem('bardahl_session', JSON.stringify(currentUser))
    else localStorage.removeItem('bardahl_session')
  }, [currentUser])

  // ── Fetch ALL data from Supabase ────────────────────────────────────────────
  const refreshAll = useCallback(async () => {
    setLoading(true)
    try {
      const [commsRows, clientsRows, ordersRows, productsRows, familiesRows, devisRows] = await Promise.all([
        dbGetCommercials(),
        dbGetClients(),
        dbGetOrders(),
        dbGetProducts().catch(() => null),
        dbGetProductFamilies().catch(() => null),
        dbGetDevis().catch(() => null),
      ])

      const appComms = commsRows.map(rowToCommercial)
      const appClients = clientsRows.map(r => {
        const client = rowToClient(r)
        // Enrich with commercial info
        const comm = appComms.find(c => c.dbId === r.commercial_id)
        if (comm) {
          client.commercialName = comm.name
          client.commercialEmail = comm.email
        }
        return client
      })

      const localExtras = JSON.parse(localStorage.getItem('bardahl_order_extras') || '{}')
      const appOrders = ordersRows.map(r => {
        const extras = localExtras[r.id] || {}
        const order = rowToOrder(r, extras)
        // Enrich with commercial & client names
        const comm = appComms.find(c => c.dbId === r.commercial_id)
        const client = appClients.find(c => c.dbId === r.client_id)
        const isAdminOrder = (
          r.commercial_id === ADMIN_COMMERCIAL_ID ||
          order.commercialEmail === 'bardahl@gmail.com' ||
          (order.commercialName && (order.commercialName.toLowerCase().includes('admin') || order.commercialName.toLowerCase().includes('direction')))
        )
        if (isAdminOrder) {
          order.commercialName = ADMIN_COMMERCIAL_NAME
          order.commercialEmail = 'bardahl@gmail.com'
          order.commercialDbId = ADMIN_COMMERCIAL_ID
        } else if (comm) {
          order.commercialName = comm.name
          order.commercialEmail = comm.email
        }
        if (client) order.clientName = client.companyName
        return order
      })

      setCommercials(appComms)
      setClients(appClients)
      setOrders(appOrders)

      if (devisRows && Array.isArray(devisRows)) {
        const enrichedDevis = devisRows.map(d => {
          const comm = appComms.find(c => c.dbId === d.commercialDbId)
          const cli = appClients.find(c => c.dbId === d.clientDbId)
          return {
            ...d,
            commercialName: comm ? comm.name : d.commercialName,
            commercialEmail: comm ? comm.email : d.commercialEmail,
            clientName: cli ? cli.companyName : d.clientName,
            clientIce: cli ? cli.ice : d.clientIce,
            clientCity: cli ? cli.city : d.clientCity
          }
        })
        setDevis(enrichedDevis)
      }

      if (productsRows && productsRows.length > 0) {
        setLocalProducts(productsRows)
      }

      if (familiesRows && familiesRows.length > 0) {
        setProductFamilies(familiesRows)
        try { localStorage.setItem('bardahl_product_families', JSON.stringify(familiesRows)) } catch (e) {}
        setGlobalProductFamilies(familiesRows)
      }
    } catch (err) {
      console.error('refreshAll error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refreshAll() }, [refreshAll])

  // ── Realtime: auto-refresh ALL browsers on any DB change ───────────────────
  useEffect(() => {
    const chComm = subscribeToTable('commercials', refreshAll)
    const chCli  = subscribeToTable('clients',     refreshAll)
    const chOrd  = subscribeToTable('orders',      refreshAll)
    const chFam  = subscribeToTable('product_families', refreshAll)
    const chDev  = subscribeToTable('devis', refreshAll)
    return () => {
      unsubscribeChannel(chComm)
      unsubscribeChannel(chCli)
      unsubscribeChannel(chOrd)
      unsubscribeChannel(chFam)
      unsubscribeChannel(chDev)
    }
  }, [refreshAll])

  // ── AUTH ─────────────────────────────────────────────────────────────────────
  const login = useCallback((inputEmail, inputPassword) => {
    const email = (inputEmail || '').trim().toLowerCase()
    const pwd   = (inputPassword || '').trim()

    if (!email) throw new Error('Veuillez saisir votre adresse email.')

    // Admin login
    if (email === 'bardahl@gmail.com') {
      const user = {
        name: 'Direction Bardahl',
        email,
        role: 'ADMIN',
        initials: 'DB',
        commercialDbId: ADMIN_COMMERCIAL_ID,
      }
      setCurrentUser(user)
      return user
    }

    // Commercial login - check against Supabase data
    const comm = commercials.find(c => (c.email || '').toLowerCase() === email)
    if (!comm) throw new Error(`Aucun compte trouvé pour "${email}".`)
    if (pwd !== (comm.password || '123456')) throw new Error('Mot de passe incorrect.')

    const user = {
      name: comm.name,
      email: comm.email,
      role: 'COMMERCIAL',
      initials: comm.name.split(' ').filter(Boolean).map(n => n[0]).join(''),
      commercialDbId: comm.dbId,
    }
    setCurrentUser(user)
    return user
  }, [commercials])

  const logout = useCallback(() => setCurrentUser(null), [])

  // ── COMMERCIALS CRUD ────────────────────────────────────────────────────────
  const addCommercial = useCallback(async (c) => {
    const rawSectors = Array.isArray(c.sectors) && c.sectors.length > 0 ? c.sectors : (c.city ? c.city.split('|')[0].split(',') : ['Casablanca'])
    const sectorClean = rawSectors.map(s => s.trim()).filter(Boolean)
    const regionsClean = Array.isArray(c.regions) && c.regions.length > 0 ? c.regions : (c.region ? c.region.split(',') : ['Casablanca-Settat'])
    const statusTag = c.isActive === false ? 'INACTIF' : 'ACTIF'
    const cityPayload = `${sectorClean.join(', ')} | Régions: ${regionsClean.join(', ')} | Statut: ${statusTag}`

    const row = await dbAddCommercial({ ...c, city: cityPayload })
    if (!row) return null
    const appComm = {
      ...rowToCommercial(row),
      regions: regionsClean,
      sectors: sectorClean,
      isActive: c.isActive !== false
    }
    try {
      const saved = JSON.parse(localStorage.getItem('bardahl_commercial_regions') || '{}')
      saved[row.id] = { regions: regionsClean, sectors: sectorClean }
      if (c.matricule) saved[c.matricule] = { regions: regionsClean, sectors: sectorClean }
      localStorage.setItem('bardahl_commercial_regions', JSON.stringify(saved))
    } catch (e) {}

    try {
      const savedStatus = JSON.parse(localStorage.getItem('bardahl_commercials_status') || '{}')
      savedStatus[row.id] = c.isActive !== false
      if (c.matricule) savedStatus[c.matricule] = c.isActive !== false
      localStorage.setItem('bardahl_commercials_status', JSON.stringify(savedStatus))
    } catch (e) {}

    setCommercials(prev => [...prev, appComm])
    return appComm
  }, [])

  const updateCommercial = useCallback(async (c) => {
    const targetId = c.id || c.dbId
    const rawSectors = Array.isArray(c.sectors) && c.sectors.length > 0 ? c.sectors : (c.city ? c.city.split('|')[0].split(',') : ['Casablanca'])
    const sectorClean = rawSectors.map(s => s.trim()).filter(Boolean)
    const regionsClean = Array.isArray(c.regions) && c.regions.length > 0 ? c.regions : (c.region ? c.region.split(',') : ['Casablanca-Settat'])
    const statusTag = c.isActive === false ? 'INACTIF' : 'ACTIF'
    const cityPayload = `${sectorClean.join(', ')} | Régions: ${regionsClean.join(', ')} | Statut: ${statusTag}`

    try {
      const saved = JSON.parse(localStorage.getItem('bardahl_commercial_regions') || '{}')
      saved[targetId] = { regions: regionsClean, sectors: sectorClean }
      if (c.matricule) saved[c.matricule] = { regions: regionsClean, sectors: sectorClean }
      localStorage.setItem('bardahl_commercial_regions', JSON.stringify(saved))
    } catch (e) {}

    try {
      const savedStatus = JSON.parse(localStorage.getItem('bardahl_commercials_status') || '{}')
      savedStatus[targetId] = c.isActive !== false
      if (c.matricule) savedStatus[c.matricule] = c.isActive !== false
      localStorage.setItem('bardahl_commercials_status', JSON.stringify(savedStatus))
    } catch (e) {}

    const row = await dbUpdateCommercial({ ...c, id: targetId, city: cityPayload })
    if (!row) {
      const fallbackComm = { ...c, id: targetId, regions: regionsClean, sectors: sectorClean, isActive: c.isActive !== false }
      setCommercials(prev => prev.map(x => (x.id === targetId || x.dbId === targetId) ? fallbackComm : x))
      return fallbackComm
    }
    const appComm = {
      ...rowToCommercial(row),
      regions: regionsClean,
      sectors: sectorClean,
      isActive: c.isActive !== false
    }
    setCommercials(prev => prev.map(x => (x.id === row.id || x.dbId === row.id || x.id === targetId) ? appComm : x))
    return appComm
  }, [])

  const deleteCommercial = useCallback(async (id) => {
    const ok = await dbDeleteCommercial(id)
    if (ok) {
      setCommercials(prev => prev.filter(x => x.id !== id && x.dbId !== id))
      // Detach locally from clients and orders
      setClients(prev => prev.map(cl => (cl.commercialDbId === id || cl.commercialId === id) ? { ...cl, commercialDbId: null, commercialName: 'Direction Bardahl' } : cl))
      setOrders(prev => prev.map(o => (o.commercialDbId === id || o.commercialId === id) ? { ...o, commercialDbId: null, commercialName: 'Direction Bardahl' } : o))
      try {
        const savedStatus = JSON.parse(localStorage.getItem('bardahl_commercials_status') || '{}')
        delete savedStatus[id]
        localStorage.setItem('bardahl_commercials_status', JSON.stringify(savedStatus))
      } catch (e) {}
      try {
        const savedRegions = JSON.parse(localStorage.getItem('bardahl_commercial_regions') || '{}')
        delete savedRegions[id]
        localStorage.setItem('bardahl_commercial_regions', JSON.stringify(savedRegions))
      } catch (e) {}
    }
    return ok
  }, [])

  // ── CLIENTS CRUD ─────────────────────────────────────────────────────────────
  const addClient = useCallback(async (c) => {
    const commDbId = c.commercialDbId ||
      currentUser?.commercialDbId ||
      commercials.find(cm => (cm.email || '').toLowerCase() === (currentUser?.email || '').toLowerCase())?.dbId ||
      null

    const row = await dbAddClient({ ...c, commercialDbId: commDbId })
    if (!row) return null

    const appClient = rowToClient(row)
    const comm = commercials.find(cm => cm.dbId === commDbId || cm.id === commDbId)
    if (comm) { appClient.commercialName = comm.name; appClient.commercialEmail = comm.email }
    setClients(prev => [...prev, appClient])
    return appClient
  }, [currentUser, commercials])

  const updateClient = useCallback(async (c) => {
    const targetId = c.id || c.dbId
    const row = await dbUpdateClient(c)
    if (!row) {
      // Fallback: update local state if db update returned null
      const comm = commercials.find(cm => cm.dbId === c.commercialDbId || cm.id === c.commercialDbId)
      const fallbackClient = {
        ...c,
        commercialName: comm ? comm.name : c.commercialName,
        commercialEmail: comm ? comm.email : c.commercialEmail
      }
      setClients(prev => prev.map(x => (x.id === targetId || x.dbId === targetId) ? fallbackClient : x))
      return fallbackClient
    }

    const appClient = rowToClient(row)
    const comm = commercials.find(cm => cm.dbId === appClient.commercialDbId || cm.id === appClient.commercialDbId)
    if (comm) {
      appClient.commercialName = comm.name
      appClient.commercialEmail = comm.email
    } else {
      const existing = clients.find(x => x.id === row.id || x.dbId === row.id || x.id === targetId)
      if (existing) { appClient.commercialName = existing.commercialName; appClient.commercialEmail = existing.commercialEmail }
    }
    setClients(prev => prev.map(x => (x.id === row.id || x.dbId === row.id || x.id === targetId || x.dbId === targetId) ? appClient : x))
    return appClient
  }, [clients, commercials])

  const deleteClient = useCallback(async (id) => {
    const ok = await dbDeleteClient(id)
    if (ok) setClients(prev => prev.filter(x => x.id !== id))
  }, [])

  // ── ORDERS CRUD ──────────────────────────────────────────────────────────────
  const addOrder = useCallback(async (o) => {
    const isCurrentUserAdmin = currentUser?.role === 'ADMIN' || (currentUser?.email || '').toLowerCase() === 'bardahl@gmail.com'
    let commDbId = o.commercialDbId || (isCurrentUserAdmin ? ADMIN_COMMERCIAL_ID : currentUser?.commercialDbId)
    if (!commDbId) {
      if (isCurrentUserAdmin) {
        commDbId = ADMIN_COMMERCIAL_ID
      } else {
        const matchedComm = commercials.find(cm => (cm.email || '').toLowerCase() === (currentUser?.email || '').toLowerCase())
          || (o.commercialName ? commercials.find(cm => cm.name.toLowerCase().includes(o.commercialName.toLowerCase())) : null)
          || commercials[0]
        commDbId = matchedComm?.dbId || matchedComm?.id
      }
    }

    const clientRecord = clients.find(c =>
      c.companyName === o.clientName || c.id === o.clientDbId || c.dbId === o.clientDbId
    ) || clients[0]
    const clientDbId = clientRecord?.dbId || clientRecord?.id || o.clientDbId

    if (!commDbId || !clientDbId) {
      console.error('addOrder: missing IDs', { commDbId, clientDbId })
      return null
    }

    const finalCommName = (isCurrentUserAdmin || commDbId === ADMIN_COMMERCIAL_ID)
      ? ADMIN_COMMERCIAL_NAME
      : (o.commercialName || currentUser?.name || 'Commercial Bardahl')
    const finalCommEmail = (isCurrentUserAdmin || commDbId === ADMIN_COMMERCIAL_ID)
      ? 'bardahl@gmail.com'
      : (o.commercialEmail || currentUser?.email || 'commercial@bardahl.ma')

    const orderPayload = {
      ...o,
      commercialDbId: commDbId,
      clientDbId: clientDbId,
      clientName: clientRecord?.companyName || o.clientName,
      clientIce: clientRecord?.ice || o.clientIce || '',
      clientCity: clientRecord?.city || o.clientCity || '',
      clientPhone: clientRecord?.phone || o.clientPhone || '',
      commercialName: finalCommName,
      commercialEmail: finalCommEmail,
      hasAnormalPrice: !!o.hasAnormalPrice
    }

    const row = await dbAddOrder(orderPayload)
    if (!row) return null

    // Save extras locally (items, paymentMethod, modeExpedition)
    const extras = {
      items: o.items || [],
      paymentMethod: o.paymentMethod || 'Chèque',
      modeExpedition: o.modeExpedition || 'Transport Bardahl',
      remarque: o.remarque || '',
      promoNote: o.promoNote || '',
      remisePercent: o.remisePercent || 0,
      remiseMontant: o.remiseMontant || 0,
      voucherDiscount: parseFloat(o.voucherDiscount) || 0,
      avoirDeduction: parseFloat(o.avoirDeduction) || 0,
      avoirOrderNumber: o.avoirOrderNumber || '',
      totalFreeItems: parseInt(o.totalFreeItems, 10) || 0,
      appliedPromotions: o.appliedPromotions || [],
      hasAnormalPrice: !!o.hasAnormalPrice,
      commercialName: orderPayload.commercialName,
      commercialEmail: orderPayload.commercialEmail,
      clientName: orderPayload.clientName,
      clientIce: orderPayload.clientIce,
      clientCity: orderPayload.clientCity,
      clientPhone: orderPayload.clientPhone,
    }
    setOrderExtras(prev => ({ ...prev, [row.id]: extras }))

    const appOrder = { ...rowToOrder(row, extras) }
    setOrders(prev => [appOrder, ...prev.filter(x => x.id !== row.id && x.orderNumber !== appOrder.orderNumber)])
    return appOrder
  }, [currentUser, commercials, clients])

  const updateOrder = useCallback(async (o) => {
    const row = await dbUpdateOrder(o)
    if (!row) return null

    const extras = {
      items: o.items || [],
      paymentMethod: o.paymentMethod || 'Chèque',
      modeExpedition: o.modeExpedition || 'Transport Bardahl',
      remarque: o.remarque || '',
      promoNote: o.promoNote || '',
      remisePercent: o.remisePercent || 0,
      remiseMontant: o.remiseMontant || 0,
      voucherDiscount: parseFloat(o.voucherDiscount) || 0,
      avoirDeduction: parseFloat(o.avoirDeduction) || 0,
      avoirOrderNumber: o.avoirOrderNumber || '',
      totalFreeItems: parseInt(o.totalFreeItems, 10) || 0,
      appliedPromotions: o.appliedPromotions || [],
      hasAnormalPrice: !!o.hasAnormalPrice,
      commercialName: o.commercialName || '',
      commercialEmail: o.commercialEmail || '',
      clientName: o.clientName || '',
      clientIce: o.clientIce || '',
      clientCity: o.clientCity || '',
      clientPhone: o.clientPhone || '',
    }
    setOrderExtras(prev => ({ ...prev, [row.id]: extras }))

    const appOrder = { ...rowToOrder(row, extras) }
    setOrders(prev => prev.map(x => (x.id === row.id || x.dbId === row.id) ? appOrder : x))
    return appOrder
  }, [])

  const deleteOrder = useCallback(async (id) => {
    setOrderExtras(prev => { const n = { ...prev }; delete n[id]; return n })
    setOrders(prev => prev.filter(x => x.id !== id && x.dbId !== id))
    try {
      await dbDeleteOrder(id)
    } catch (e) {
      console.warn('Error deleting order from Supabase:', e)
    }
  }, [])

  const updateOrderStatus = useCallback(async (orderId, newStatus) => {
    setOrders(prev => prev.map(o => (o.id === orderId || o.dbId === orderId) ? { ...o, status: newStatus } : o))
    await dbUpdateOrderStatus(orderId, newStatus).catch(e => console.warn('Supabase status update error:', e))
  }, [])

  // ── PRODUCTS CRUD ────────────────────────────────────────────────────────────
  const addProduct = useCallback(async (p) => {
    const newProd = {
      ...p,
      id: p.id || `prod_${Date.now()}`,
      unitsPerBox: parseInt(p.unitsPerBox, 10) || 1,
      priceTtc: parseFloat(p.priceTtc) || 0,
      stock: parseInt(p.stock, 10) || 100,
      isCustom: true
    }
    setLocalProducts(prev => {
      const updated = [newProd, ...prev.filter(x => x.id !== newProd.id && x.reference !== newProd.reference)]
      try {
        const customOnly = updated.filter(x => x.isCustom || String(x.id).startsWith('prod_'))
        localStorage.setItem('bardahl_custom_products', JSON.stringify(customOnly))
      } catch (e) {
        console.warn('Error caching custom product:', e)
      }
      return updated
    })
    const remote = await dbAddProduct(newProd).catch(e => console.warn('Supabase product add error:', e))
    return remote || newProd
  }, [])

  const updateProduct = useCallback(async (p) => {
    const updatedProd = {
      ...p,
      unitsPerBox: parseInt(p.unitsPerBox, 10) || 1,
      priceTtc: parseFloat(p.priceTtc) || 0,
      stock: parseInt(p.stock, 10) || 100
    }
    setLocalProducts(prev => {
      const updated = prev.map(x => (x.id === p.id || (p.reference && x.reference === p.reference)) ? { ...x, ...updatedProd } : x)
      try {
        const customOnly = updated.filter(x => x.isCustom || String(x.id).startsWith('prod_') || x.id === p.id || (p.reference && x.reference === p.reference))
        localStorage.setItem('bardahl_custom_products', JSON.stringify(customOnly))
      } catch (e) {
        console.warn('Error caching updated product:', e)
      }
      return updated
    })
    const remote = await dbUpdateProduct(updatedProd).catch(e => console.warn('Supabase product update error:', e))
    return remote || updatedProd
  }, [])

  const deleteProduct = useCallback(async (id) => {
    const targetProd = localProducts.find(p => p.id === id)
    setLocalProducts(prev => {
      const updated = prev.filter(x => x.id !== id)
      try {
        const customOnly = updated.filter(x => x.isCustom || String(x.id).startsWith('prod_'))
        localStorage.setItem('bardahl_custom_products', JSON.stringify(customOnly))
      } catch (e) {}
      return updated
    })
    await dbDeleteProduct(id, targetProd?.reference).catch(e => console.warn('Supabase product delete error:', e))
  }, [localProducts])

  const deductProductsStock = useCallback(async (itemsToDeduct) => {
    if (!itemsToDeduct || itemsToDeduct.length === 0) return
    setLocalProducts(prev => {
      const updated = prev.map(prod => {
        const matchedItems = itemsToDeduct.filter(it => 
          (it.productId && (it.productId === prod.id || it.productId === prod.reference)) ||
          (it.reference && (it.reference === prod.reference || it.reference === prod.id))
        )
        if (matchedItems.length > 0) {
          const totalQtyDeducted = matchedItems.reduce((sum, it) => {
            const q = parseInt(it.qty, 10) || 0
            const g = parseInt(it.qtyGratuit, 10) || 0
            return sum + q + g
          }, 0)
          const currentStock = parseInt(prod.stock !== undefined ? prod.stock : 100, 10)
          const newStock = Math.max(0, currentStock - totalQtyDeducted)
          const updatedProd = { ...prod, stock: newStock }
          dbUpdateProduct(updatedProd).catch(e => console.warn('Supabase stock deduction error:', e))
          return updatedProd
        }
        return prod
      })
      try {
        const customOnly = updated.filter(x => x.isCustom || String(x.id).startsWith('prod_') || itemsToDeduct.some(it => it.reference === x.reference || it.productId === x.id))
        localStorage.setItem('bardahl_custom_products', JSON.stringify(customOnly))
      } catch (e) {
        console.warn('Error saving stock in local storage:', e)
      }
      return updated
    })
  }, [])

  const restoreProductsStock = useCallback(async (itemsToRestore) => {
    if (!itemsToRestore || itemsToRestore.length === 0) return
    setLocalProducts(prev => {
      const updated = prev.map(prod => {
        const matchedItems = itemsToRestore.filter(it => 
          (it.productId && (it.productId === prod.id || it.productId === prod.reference)) ||
          (it.reference && (it.reference === prod.reference || it.reference === prod.id))
        )
        if (matchedItems.length > 0) {
          const totalQtyRestored = matchedItems.reduce((sum, it) => {
            const q = parseInt(it.qty, 10) || 0
            const g = parseInt(it.qtyGratuit, 10) || 0
            return sum + q + g
          }, 0)
          const currentStock = parseInt(prod.stock !== undefined ? prod.stock : 100, 10)
          const newStock = currentStock + totalQtyRestored
          const updatedProd = { ...prod, stock: newStock }
          dbUpdateProduct(updatedProd).catch(e => console.warn('Supabase stock restore error:', e))
          return updatedProd
        }
        return prod
      })
      try {
        const customOnly = updated.filter(x => x.isCustom || String(x.id).startsWith('prod_') || itemsToRestore.some(it => it.reference === x.reference || it.productId === x.id))
        localStorage.setItem('bardahl_custom_products', JSON.stringify(customOnly))
      } catch (e) {}
      return updated
    })
  }, [])

  // ── DEVIS / ESTIMATIONS CRUD ──────────────────────────────────────────────
  const addDevis = useCallback(async (d) => {
    const isCurrentUserAdmin = currentUser?.role === 'ADMIN' || (currentUser?.email || '').toLowerCase() === 'bardahl@gmail.com'
    let commDbId = d.commercialDbId || (isCurrentUserAdmin ? ADMIN_COMMERCIAL_ID : currentUser?.commercialDbId)
    if (!commDbId) {
      const matchedComm = commercials.find(cm => (cm.email || '').toLowerCase() === (currentUser?.email || '').toLowerCase())
        || (d.commercialName ? commercials.find(cm => cm.name.toLowerCase().includes(d.commercialName.toLowerCase())) : null)
        || commercials[0]
      commDbId = matchedComm?.dbId || matchedComm?.id
    }
    const comm = commercials.find(cm => cm.dbId === commDbId || cm.id === commDbId)
    const client = clients.find(cl => cl.id === d.clientDbId || cl.dbId === d.clientDbId)

    const nextDevisNumber = d.devisNumber || `DEV-2026-${String(devis.length + 1).padStart(4, '0')}`
    const newDevis = {
      ...d,
      id: d.id || `dev_${Date.now()}`,
      devisNumber: nextDevisNumber,
      date: d.date || new Date().toISOString().substring(0, 10),
      validityDate: d.validityDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
      status: d.status || 'EN_ATTENTE',
      commercialDbId: commDbId,
      commercialName: (commDbId === ADMIN_COMMERCIAL_ID || isCurrentUserAdmin) ? 'Direction Bardahl' : (comm?.name || d.commercialName || 'Commercial Bardahl'),
      commercialEmail: (commDbId === ADMIN_COMMERCIAL_ID || isCurrentUserAdmin) ? 'bardahl@gmail.com' : (comm?.email || d.commercialEmail || currentUser?.email || ''),
      clientDbId: d.clientDbId,
      clientName: client?.companyName || d.clientName || 'Client',
      clientIce: client?.ice || d.clientIce || '',
      clientCity: client?.city || d.clientCity || '',
      clientAddress: client?.address || d.clientAddress || '',
      clientPhone: client?.phone || d.clientPhone || '',
      paymentMethod: d.paymentMethod || 'Chèque',
      modeExpedition: d.modeExpedition || 'Transport Bardahl',
      items: d.items || [],
      totalHt: parseFloat(d.totalHt) || 0,
      totalDiscount: parseFloat(d.totalDiscount) || 0,
      totalTva: parseFloat(d.totalTva) || 0,
      totalTtc: parseFloat(d.totalTtc) || 0,
      remisePercent: parseFloat(d.remisePercent || 0),
      remiseMontant: parseFloat(d.remiseMontant || 0),
      remarque: d.remarque || '',
      createdAt: new Date().toISOString()
    }

    setDevis(prev => [newDevis, ...prev.filter(x => x.id !== newDevis.id && x.devisNumber !== newDevis.devisNumber)])
    dbAddDevis(newDevis).catch(err => console.warn('Supabase devis add notice:', err))
    return newDevis
  }, [currentUser, commercials, clients, devis.length])

  const updateDevis = useCallback(async (d) => {
    const targetId = d.id || d.dbId
    const updated = {
      ...d,
      updatedAt: new Date().toISOString()
    }
    setDevis(prev => prev.map(x => (x.id === targetId || x.dbId === targetId || x.devisNumber === d.devisNumber) ? updated : x))
    dbUpdateDevis(updated).catch(err => console.warn('Supabase devis update notice:', err))
    return updated
  }, [])

  const deleteDevis = useCallback(async (id) => {
    setDevis(prev => prev.filter(x => x.id !== id && x.dbId !== id))
    dbDeleteDevis(id).catch(err => console.warn('Supabase devis delete notice:', err))
  }, [])

  const convertDevisToOrder = useCallback(async (devisId, options = {}) => {
    const targetDevis = devis.find(d => d.id === devisId || d.dbId === devisId || d.devisNumber === devisId)
    if (!targetDevis) throw new Error("Devis introuvable pour la conversion.")

    const isCurrentUserAdmin = currentUser?.role === 'ADMIN' || (currentUser?.email || '').toLowerCase() === 'bardahl@gmail.com'
    const generatedOrderNumber = options.orderNumber || `BC-2026-${String(4332 + orders.length + 1).padStart(6, '0')}`

    const newOrder = {
      id: `ord_${Date.now()}`,
      orderNumber: generatedOrderNumber,
      date: new Date().toISOString().substring(0, 10),
      clientDbId: targetDevis.clientDbId,
      clientId: targetDevis.clientDbId,
      clientName: targetDevis.clientName,
      clientIce: targetDevis.clientIce,
      clientCity: targetDevis.clientCity,
      clientAddress: targetDevis.clientAddress,
      clientPhone: targetDevis.clientPhone,
      commercialDbId: targetDevis.commercialDbId,
      commercialName: targetDevis.commercialName,
      commercialEmail: targetDevis.commercialEmail,
      status: isCurrentUserAdmin ? 'VALIDATED' : 'EN_ATTENTE',
      totalHt: targetDevis.totalHt,
      totalDiscount: targetDevis.totalDiscount,
      totalTva: targetDevis.totalTva,
      totalTtc: targetDevis.totalTtc,
      remisePercent: targetDevis.remisePercent || 0,
      remiseMontant: targetDevis.remiseMontant || 0,
      paymentMethod: targetDevis.paymentMethod || 'Chèque',
      modeExpedition: targetDevis.modeExpedition || 'Transport Bardahl',
      remarque: targetDevis.remarque ? `[Converti depuis Devis ${targetDevis.devisNumber}] ${targetDevis.remarque}` : `Converti depuis Devis ${targetDevis.devisNumber}`,
      items: targetDevis.items || [],
      appliedPromotions: targetDevis.appliedPromotions || [],
      totalFreeItems: targetDevis.totalFreeItems || 0,
      hasAnormalPrice: targetDevis.hasAnormalPrice || false,
      fromDevisNumber: targetDevis.devisNumber,
      fromDevisId: targetDevis.id
    }

    // 1. Create order
    const createdOrder = await addOrder(newOrder)

    // 2. Deduct product stock
    if (deductProductsStock && newOrder.items && newOrder.items.length > 0) {
      deductProductsStock(newOrder.items)
    }

    // 3. Update devis status to CONVERTI
    const updatedDevis = {
      ...targetDevis,
      status: 'CONVERTI',
      convertedOrderNumber: createdOrder?.orderNumber || generatedOrderNumber,
      convertedOrderId: createdOrder?.id || newOrder.id,
      convertedAt: new Date().toISOString()
    }
    await updateDevis(updatedDevis)

    return { order: createdOrder || newOrder, devis: updatedDevis }
  }, [devis, currentUser, orders.length, addOrder, deductProductsStock, updateDevis])



  // ── PROMOTIONS CRUD ──────────────────────────────────────────────────────────
  const addPromotion = useCallback((p) => {
    const newPromo = { ...p, id: `promo_${Date.now()}` }
    setPromotions(prev => [newPromo, ...prev])
    dbAddPromotion(newPromo).catch(e => console.warn('Supabase promo add:', e))
    return newPromo
  }, [])

  const updatePromotion = useCallback((p) => {
    setPromotions(prev => prev.map(x => x.id === p.id ? p : x))
    dbUpdatePromotion(p).catch(e => console.warn('Supabase promo update:', e))
    return p
  }, [])

  const deletePromotion = useCallback((id) => {
    setPromotions(prev => prev.filter(x => x.id !== id))
    dbDeletePromotion(id).catch(e => console.warn('Supabase promo delete:', e))
  }, [])

  const togglePromotion = useCallback((id) => {
    setPromotions(prev => {
      const updated = prev.map(x => {
        if (x.id === id) {
          const toggled = { ...x, isActive: !x.isActive }
          dbUpdatePromotion(toggled).catch(e => console.warn('Supabase promo toggle:', e))
          return toggled
        }
        return x
      })
      return updated
    })
  }, [])

  // ── FAMILLES DE PRODUITS ADMINISTRABLES ──────────────────────────────────────
  const addProductFamily = useCallback(async (fam) => {
    const code = (fam.code || fam.label || '').toUpperCase().replace(/[^A-Z0-9_]/g, '_')
    const newFam = {
      id: fam.id || `fam_${Date.now()}`,
      code,
      label: fam.label || 'Nouvelle Famille',
      icon: fam.icon || '🏷️',
      color: fam.color || '#FFD000',
      description: fam.description || '',
      isActive: fam.isActive !== false
    }
    setProductFamilies(prev => {
      const filtered = prev.filter(f => f.id !== newFam.id && f.code !== newFam.code)
      const updated = [...filtered, newFam]
      try { localStorage.setItem('bardahl_product_families', JSON.stringify(updated)) } catch (e) {}
      setGlobalProductFamilies(updated)
      return updated
    })
    const remote = await dbAddProductFamily(newFam).catch(e => console.warn('Supabase family add error:', e))
    return remote || newFam
  }, [])

  const updateProductFamily = useCallback(async (fam) => {
    const code = (fam.code || fam.label || '').toUpperCase().replace(/[^A-Z0-9_]/g, '_')
    const updatedFam = { ...fam, code }
    setProductFamilies(prev => {
      const updated = prev.map(f => (f.id === fam.id || f.code === fam.code || f.code === code) ? { ...f, ...updatedFam } : f)
      try { localStorage.setItem('bardahl_product_families', JSON.stringify(updated)) } catch (e) {}
      setGlobalProductFamilies(updated)
      return updated
    })
    await dbUpdateProductFamily(updatedFam).catch(e => console.warn('Supabase family update error:', e))
    return updatedFam
  }, [])

  const deleteProductFamily = useCallback(async (id, code) => {
    setProductFamilies(prev => {
      const updated = prev.filter(f => f.id !== id && (!code || f.code !== code))
      try { localStorage.setItem('bardahl_product_families', JSON.stringify(updated)) } catch (e) {}
      setGlobalProductFamilies(updated)
      return updated
    })
    await dbDeleteProductFamily(id, code).catch(e => console.warn('Supabase family delete error:', e))
  }, [])

  const toggleProductFamily = useCallback(async (id) => {
    let toggledFam = null
    setProductFamilies(prev => {
      const updated = prev.map(f => {
        if (f.id === id) {
          toggledFam = { ...f, isActive: !f.isActive }
          return toggledFam
        }
        return f
      })
      try { localStorage.setItem('bardahl_product_families', JSON.stringify(updated)) } catch (e) {}
      setGlobalProductFamilies(updated)
      return updated
    })
    if (toggledFam) {
      await dbUpdateProductFamily(toggledFam).catch(e => console.warn('Supabase family toggle error:', e))
    }
  }, [])

  // ── CLIENT COMPENSATIONS & AVOIRS DE RÉGULARISATION ─────────────────────────
  const addClientCompensation = useCallback((comp) => {
    const newComp = {
      id: comp.id || `comp_${Date.now()}`,
      orderId: comp.orderId || null,
      orderNumber: comp.orderNumber || '',
      clientId: comp.clientId || '',
      clientName: comp.clientName || 'Client Bardahl',
      date: comp.date || new Date().toISOString().slice(0, 10),
      items: comp.items || [],
      totalAmountDh: parseFloat(comp.totalAmountDh) || 0,
      equivalentPercent: parseFloat(comp.equivalentPercent) || 0,
      chosenMode: comp.chosenMode || 'DH', // 'DH' | 'PERCENT'
      reason: comp.reason || 'Régularisation remise commerciale',
      status: comp.status || 'PENDING', // 'PENDING' | 'CONSUMED' | 'CANCELLED'
      consumedOnOrderNumber: comp.consumedOnOrderNumber || null,
      consumedDate: comp.consumedDate || null,
      createdAt: new Date().toISOString()
    }
    setClientCompensations(prev => [newComp, ...prev.filter(c => c.id !== newComp.id)])
    return newComp
  }, [])

  const updateClientCompensation = useCallback((comp) => {
    setClientCompensations(prev => prev.map(c => c.id === comp.id ? { ...c, ...comp } : c))
  }, [])

  const consumeClientCompensation = useCallback((id, nextOrderNumber) => {
    setClientCompensations(prev => prev.map(c => {
      if (c.id === id) {
        return {
          ...c,
          status: 'CONSUMED',
          consumedOnOrderNumber: nextOrderNumber,
          consumedDate: new Date().toISOString().slice(0, 10)
        }
      }
      return c
    }))
  }, [])

  const deleteClientCompensation = useCallback((id) => {
    setClientCompensations(prev => prev.filter(c => c.id !== id))
  }, [])

  // ── MAC FILTERING & DEVICE SECURITY STATE ──────────────────────────────────
  const [isGlobalMacFilteringActive, setIsGlobalMacFilteringActive] = useState(() => {
    try {
      const saved = localStorage.getItem('bardahl_global_mac_filtering')
      return saved !== null ? JSON.parse(saved) : true
    } catch {
      return true
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('bardahl_global_mac_filtering', JSON.stringify(isGlobalMacFilteringActive))
    } catch (e) {}
  }, [isGlobalMacFilteringActive])

  // Specific commercial MAC filtering toggles (commercialId -> boolean)
  const [commercialsMacStatus, setCommercialsMacStatus] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('bardahl_commercials_mac_status') || '{}')
    } catch {
      return {}
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('bardahl_commercials_mac_status', JSON.stringify(commercialsMacStatus))
    } catch (e) {}
  }, [commercialsMacStatus])

  // Commercial authorized devices list (up to 3 per commercial)
  const [commercialDevices, setCommercialDevices] = useState(() => {
    try {
      const saved = localStorage.getItem('bardahl_commercial_devices')
      if (saved) return JSON.parse(saved)
    } catch (e) {}
    return []
  })

  useEffect(() => {
    try {
      localStorage.setItem('bardahl_commercial_devices', JSON.stringify(commercialDevices))
    } catch (e) {}
  }, [commercialDevices])

  // Last login records per commercial (commercialId -> { date, mac, deviceModel, ip, appVersion, status })
  const [commercialsLastLogin, setCommercialsLastLogin] = useState(() => {
    try {
      const saved = localStorage.getItem('bardahl_commercials_last_login')
      if (saved) return JSON.parse(saved)
    } catch (e) {}
    return {}
  })

  useEffect(() => {
    try {
      localStorage.setItem('bardahl_commercials_last_login', JSON.stringify(commercialsLastLogin))
    } catch (e) {}
  }, [commercialsLastLogin])

  // Security Audit Logs
  const [macSecurityLogs, setMacSecurityLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('bardahl_mac_security_logs')
      if (saved) return JSON.parse(saved)
    } catch (e) {}
    return []
  })

  useEffect(() => {
    try {
      localStorage.setItem('bardahl_mac_security_logs', JSON.stringify(macSecurityLogs))
    } catch (e) {}
  }, [macSecurityLogs])

  // Refresh MAC Filtering data from Supabase logs table
  const refreshMacData = useCallback(async () => {
    try {
      const [devices, logs, config] = await Promise.all([
        dbGetCommercialDevices(),
        dbGetMacSecurityLogs(),
        dbGetMacSecurityConfig()
      ])

      if (devices && Array.isArray(devices)) {
        setCommercialDevices(devices)
      }
      if (logs && Array.isArray(logs)) {
        setMacSecurityLogs(logs)
        const lastLogins = {}
        logs.forEach(l => {
          if (l.commercialId && !lastLogins[l.commercialId]) {
            lastLogins[l.commercialId] = {
              date: l.createdAt,
              mac: l.attemptedMac,
              deviceModel: l.deviceModel,
              ip: l.ipAddress,
              status: l.status,
              appVersion: 'Android'
            }
          }
        })
        setCommercialsLastLogin(prev => ({ ...prev, ...lastLogins }))
      }
      if (config) {
        if (config.isGlobalFilteringActive !== undefined) {
          setIsGlobalMacFilteringActive(config.isGlobalFilteringActive)
        }
        if (config.commercialsMacStatus) {
          setCommercialsMacStatus(config.commercialsMacStatus)
        }
      }
    } catch (e) {
      console.warn('refreshMacData error:', e)
    }
  }, [])

  useEffect(() => {
    refreshMacData()
    const chLogs = subscribeToTable('logs', refreshMacData)
    return () => {
      unsubscribeChannel(chLogs)
    }
  }, [refreshMacData])

  // Toggle Global MAC filtering
  const toggleGlobalMacFiltering = useCallback((active) => {
    setIsGlobalMacFilteringActive(prev => {
      const nextVal = (active !== undefined ? active : !prev)
      dbSaveMacSecurityConfig({
        isGlobalFilteringActive: nextVal,
        commercialsMacStatus: commercialsMacStatus
      }).catch(e => console.warn('Save MAC config error:', e))
      return nextVal
    })
  }, [commercialsMacStatus])

  // Toggle filtering for specific commercial
  const toggleCommercialMacFiltering = useCallback((commercialId) => {
    setCommercialsMacStatus(prev => {
      const current = prev[commercialId] !== false
      const nextStatus = { ...prev, [commercialId]: !current }
      dbSaveMacSecurityConfig({
        isGlobalFilteringActive: isGlobalMacFilteringActive,
        commercialsMacStatus: nextStatus
      }).catch(e => console.warn('Save MAC config error:', e))
      return nextStatus
    })
  }, [isGlobalMacFilteringActive])

  // Add new MAC device for commercial (STRICT 3 MAC LIMIT!)
  const addCommercialDevice = useCallback(async (commercialId, deviceData) => {
    const existing = commercialDevices.filter(d => d.commercialId === commercialId)
    if (existing.length >= 3) {
      throw new Error("Limite atteinte : Chaque commercial ne peut avoir que 3 adresses MAC autorisées au maximum.")
    }

    const cleanMac = (deviceData.macAddress || '').toUpperCase().trim()
    if (!cleanMac || cleanMac.length < 11) {
      throw new Error("Format d'adresse MAC invalide. Exemple attendu : 00:1A:2B:3C:4D:5E")
    }

    if (existing.some(d => d.macAddress === cleanMac)) {
      throw new Error(`Cette adresse MAC (${cleanMac}) est déjà enregistrée pour ce commercial.`)
    }

    const newDevice = {
      id: `dev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      commercialId: commercialId,
      macAddress: cleanMac,
      deviceName: deviceData.deviceName || `Appareil #${existing.length + 1}`,
      deviceModel: deviceData.deviceModel || 'Android Device',
      isActive: true,
      addedAt: new Date().toISOString(),
      lastUsedAt: null
    }

    setCommercialDevices(prev => [newDevice, ...prev])
    await dbAddCommercialDevice(newDevice)
    return newDevice
  }, [commercialDevices])

  // Update existing device
  const updateCommercialDevice = useCallback(async (deviceId, updatedFields) => {
    const target = commercialDevices.find(d => d.id === deviceId || d.dbRowId === deviceId)
    const cleanMac = updatedFields.macAddress ? updatedFields.macAddress.toUpperCase().trim() : (target?.macAddress || '')
    const updated = { ...(target || {}), ...updatedFields, macAddress: cleanMac, updatedAt: new Date().toISOString() }

    setCommercialDevices(prev => prev.map(d => (d.id === deviceId || d.dbRowId === deviceId) ? updated : d))
    await dbUpdateCommercialDevice(updated)
  }, [commercialDevices])

  // Delete device (frees up slot)
  const deleteCommercialDevice = useCallback(async (deviceId) => {
    setCommercialDevices(prev => prev.filter(d => d.id !== deviceId && d.dbRowId !== deviceId))
    await dbDeleteCommercialDevice(deviceId)
  }, [])

  // 1-Click Approval of blocked attempt from audit log
  const approveBlockedAttempt = useCallback(async (logId) => {
    const log = macSecurityLogs.find(l => l.id === logId)
    if (!log) return false

    const commId = log.commercialId || log.commercial_id
    if (!commId) throw new Error("Commercial non identifié dans ce log.")

    await addCommercialDevice(commId, {
      macAddress: log.attemptedMac || log.attempted_mac,
      deviceName: `${log.deviceModel || 'Appareil Android'} (Approuvé)`,
      deviceModel: log.deviceModel || 'Android Device'
    })

    setMacSecurityLogs(prev => prev.map(l => l.id === logId ? { ...l, status: 'AUTHORIZED', reason: 'Approuvé par Direction Bardahl' } : l))
    return true
  }, [macSecurityLogs, addCommercialDevice])

  // Record login event from device
  const recordDeviceLogin = useCallback(async (commercialId, deviceInfo = {}) => {
    const nowIso = new Date().toISOString()
    const currentMac = (deviceInfo.macAddress || '').toUpperCase().trim()
    const model = deviceInfo.deviceModel || 'Android Device'

    setCommercialsLastLogin(prev => ({
      ...prev,
      [commercialId]: {
        date: nowIso,
        mac: currentMac,
        deviceModel: model,
        ip: deviceInfo.ip || 'Réseau Mobile / 4G',
        appVersion: deviceInfo.appVersion || 'v2.5.0'
      }
    }))

    setCommercialDevices(prev => prev.map(d => {
      if (d.commercialId === commercialId && d.macAddress === currentMac) {
        return { ...d, lastUsedAt: nowIso, deviceModel: model }
      }
      return d
    }))

    const comm = commercials.find(c => c.id === commercialId || c.dbId === commercialId)
    const log = {
      id: `log_${Date.now()}`,
      commercialId: commercialId,
      commercialName: comm ? comm.name : 'Commercial Bardahl',
      commercialEmail: comm ? comm.email : '',
      attemptedMac: currentMac,
      deviceModel: model,
      status: 'AUTHORIZED',
      reason: 'Connexion réussie',
      ipAddress: deviceInfo.ip || 'Réseau Mobile / 4G',
      createdAt: nowIso
    }
    setMacSecurityLogs(prev => [log, ...prev.slice(0, 99)])
    await dbAddMacSecurityLog(log)
  }, [commercials])

  // ── Role-based visibility ────────────────────────────────────────────────────
  const isAdmin = currentUser?.role === 'ADMIN'

  const visibleClients = isAdmin
    ? (Array.isArray(clients) ? clients : [])
    : (Array.isArray(clients) ? clients : []).filter(c => {
        const comm = (Array.isArray(commercials) ? commercials : []).find(cm => cm.dbId === c.commercialDbId)
        return comm && (comm.email || '').toLowerCase() === (currentUser?.email || '').toLowerCase()
      })

  const visibleOrders = isAdmin
    ? (Array.isArray(orders) ? orders : [])
    : (Array.isArray(orders) ? orders : []).filter(o => {
        const comm = (Array.isArray(commercials) ? commercials : []).find(cm => cm.dbId === o.commercialDbId)
        return comm && (comm.email || '').toLowerCase() === (currentUser?.email || '').toLowerCase()
      })

  const visibleDevis = isAdmin
    ? (Array.isArray(devis) ? devis : [])
    : (Array.isArray(devis) ? devis : []).filter(d => {
        const comm = (Array.isArray(commercials) ? commercials : []).find(cm => cm.dbId === d.commercialDbId)
        const commEmail = (comm?.email || d.commercialEmail || '').toLowerCase()
        const userEmail = (currentUser?.email || '').toLowerCase()
        return (d.commercialDbId && d.commercialDbId === currentUser?.commercialDbId) ||
               (commEmail && commEmail === userEmail)
      })

  return (
    <AppContext.Provider value={{
      currentUser, login, logout, loading,
      theme, setTheme, toggleTheme,
      clients: visibleClients, allClients: clients,
      addClient, updateClient, deleteClient,
      products: localProducts, addProduct, updateProduct, deleteProduct, deductProductsStock, restoreProductsStock,
      productFamilies, addProductFamily, updateProductFamily, deleteProductFamily, toggleProductFamily,
      orders: visibleOrders, allOrders: orders,
      addOrder, updateOrder, deleteOrder, updateOrderStatus,
      devis: visibleDevis, allDevis: devis,
      addDevis, updateDevis, deleteDevis, convertDevisToOrder,
      clientCompensations, addClientCompensation, updateClientCompensation, consumeClientCompensation, deleteClientCompensation,
      commercials, addCommercial, updateCommercial, deleteCommercial,
      promotions, addPromotion, updatePromotion, deletePromotion, togglePromotion,
      isGlobalMacFilteringActive, toggleGlobalMacFiltering,
      commercialsMacStatus, toggleCommercialMacFiltering,
      commercialDevices, addCommercialDevice, updateCommercialDevice, deleteCommercialDevice,
      commercialsLastLogin, macSecurityLogs, approveBlockedAttempt, recordDeviceLogin,
      refreshMacData,
      refreshAll,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}
