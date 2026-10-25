import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
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
  dbGetUsers,       dbAddTenantUser,  dbUpdateTenantUser,  dbDeleteTenantUser,
  dbUpdateOrderStatus,
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
    userId: row.user_id || null,
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

  let clientUserId = row.user_id || null
  if (!clientUserId && row.address && row.address.includes('UID:')) {
    const match = row.address.match(/UID:([a-zA-Z0-9_-]+)/)
    if (match) clientUserId = match[1]
  }
  const cleanAddress = (row.address || '').replace(/\|\s*UID:[a-zA-Z0-9_-]+/gi, '').trim()

  return {
    id: row.id,
    dbId: row.id,
    userId: clientUserId,
    companyName: row.company_name || '',
    ice: row.ice || '',
    rc: row.rc || '',
    codeClient: row.if_code || '',
    region: row.patente || '',
    address: cleanAddress || row.city || '',
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
  const orderUserId = row.user_id || parsedObs.userId || extras.userId || null

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
    userId: orderUserId,
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
  const [tenantUsers, setTenantUsers] = useState([])
  const [isInspecting, setIsInspecting] = useState(false)
  const [inspectedUser, setInspectedUser] = useState(null)
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
        setProductFamilies(prev => {
          const map = new Map()
          DEFAULT_BARDAHL_FAMILIES.forEach(f => map.set(f.code, f))
          prev.forEach(f => map.set(f.code, f))
          remote.forEach(f => {
            const existing = map.get(f.code) || {}
            map.set(f.code, { ...existing, ...f })
          })
          const merged = Array.from(map.values())
          try { localStorage.setItem('bardahl_product_families', JSON.stringify(merged)) } catch (e) {}
          setGlobalProductFamilies(merged)
          return merged
        })
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
      const [commsRows, clientsRows, ordersRows, productsRows, familiesRows, usersRows] = await Promise.all([
        dbGetCommercials(),
        dbGetClients(),
        dbGetOrders(),
        dbGetProducts().catch(() => null),
        dbGetProductFamilies().catch(() => null),
        dbGetUsers().catch(() => null),
      ])

      if (usersRows && Array.isArray(usersRows)) {
        setTenantUsers(usersRows)
      }

      const appComms = commsRows.map(rowToCommercial)
      const appClients = clientsRows.map(r => {
        const client = rowToClient(r)
        // Enrich with commercial info
        const comm = appComms.find(c => c.dbId === r.commercial_id)
        if (comm) {
          client.commercialName = comm.name
          client.commercialEmail = comm.email
          if (!client.userId && comm.userId) {
            client.userId = comm.userId
          }
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
          if (!order.userId && comm.userId) {
            order.userId = comm.userId
          }
        }
        if (client) {
          order.clientName = client.companyName
          if (!order.userId && client.userId) {
            order.userId = client.userId
          }
        }
        return order
      })

      setCommercials(appComms)
      setClients(appClients)
      setOrders(appOrders)

      if (productsRows && productsRows.length > 0) {
        setLocalProducts(prev => {
          const map = new Map()
          prev.forEach(p => map.set(p.reference || p.id, p))
          productsRows.forEach(p => {
            const key = p.reference || p.id
            const existing = map.get(p.reference) || map.get(p.id)
            map.set(key, { ...(existing || {}), ...p })
          })
          return Array.from(map.values())
        })
      }

      if (familiesRows && familiesRows.length > 0) {
        setProductFamilies(prev => {
          const map = new Map()
          DEFAULT_BARDAHL_FAMILIES.forEach(f => map.set(f.code, f))
          prev.forEach(f => map.set(f.code, f))
          familiesRows.forEach(f => {
            const existing = map.get(f.code) || {}
            map.set(f.code, { ...existing, ...f })
          })
          const merged = Array.from(map.values())
          try { localStorage.setItem('bardahl_product_families', JSON.stringify(merged)) } catch (e) {}
          setGlobalProductFamilies(merged)
          return merged
        })
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
    const chUsr  = subscribeToTable('users',       refreshAll)
    return () => {
      unsubscribeChannel(chComm)
      unsubscribeChannel(chCli)
      unsubscribeChannel(chOrd)
      unsubscribeChannel(chFam)
      unsubscribeChannel(chUsr)
    }
  }, [refreshAll])

  // ── TENANT USERS CRUD (Super Admin) ──────────────────────────────────────────
  const addTenantUser = useCallback(async (u) => {
    const created = await dbAddTenantUser(u)
    if (created) {
      setTenantUsers(prev => [created, ...prev.filter(x => x.id !== created.id)])
    }
    return created
  }, [])

  const updateTenantUser = useCallback(async (u) => {
    const updated = await dbUpdateTenantUser(u)
    if (updated) {
      setTenantUsers(prev => prev.map(x => x.id === u.id ? { ...x, ...updated } : x))
    }
    return updated || u
  }, [])

  const deleteTenantUser = useCallback(async (id) => {
    const ok = await dbDeleteTenantUser(id)
    if (ok) {
      setTenantUsers(prev => prev.filter(x => x.id !== id))
      // Clean up local state data belonging to this tenant
      setCommercials(prev => prev.filter(c => c.userId !== id))
      setClients(prev => prev.filter(c => c.userId !== id))
      setOrders(prev => prev.filter(o => o.userId !== id))
    }
    return ok
  }, [])

  const inspectTenant = useCallback((targetUser) => {
    setIsInspecting(true)
    setInspectedUser(targetUser)
    const displayName = `${targetUser.first_name || ''} ${targetUser.last_name || ''}`.trim() || targetUser.email
    setCurrentUser({
      id: targetUser.id,
      name: displayName,
      email: targetUser.email,
      role: 'ADMIN',
      companyName: targetUser.company_name || 'Organisation',
      isSuperAdmin: false,
      initials: ((targetUser.first_name?.[0] || 'U') + (targetUser.last_name?.[0] || 'A')).toUpperCase(),
      commercialDbId: `admin_${targetUser.id}`,
    })
  }, [])

  const exitInspection = useCallback(() => {
    setIsInspecting(false)
    setInspectedUser(null)
    setCurrentUser({
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Direction Bardahl (Super Admin)',
      email: 'bardahl@gmail.com',
      role: 'SUPER_ADMIN',
      isSuperAdmin: true,
      initials: 'SA',
      commercialDbId: ADMIN_COMMERCIAL_ID,
    })
  }, [])

  // ── AUTH ─────────────────────────────────────────────────────────────────────
  const login = useCallback(async (inputEmail, inputPassword) => {
    const email = (inputEmail || '').trim().toLowerCase()
    const pwd   = (inputPassword || '').trim()

    if (!email) throw new Error('Veuillez saisir votre adresse email.')

    // 1. Super Admin login
    if (email === 'bardahl@gmail.com' || email === 'superadmin@bardahl.ma') {
      if (pwd && pwd !== '123456' && pwd !== 'admin') throw new Error('Mot de passe incorrect.')
      const user = {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Direction Bardahl (Super Admin)',
        email,
        role: 'SUPER_ADMIN',
        isSuperAdmin: true,
        initials: 'SA',
        commercialDbId: ADMIN_COMMERCIAL_ID,
      }
      setCurrentUser(user)
      setIsInspecting(false)
      setInspectedUser(null)
      return user
    }

    // 2. Tenant Admin login (accounts created via Panel Super Administrateur)
    const foundTenant = tenantUsers.find(u => (u.email || '').toLowerCase() === email)
    if (foundTenant) {
      if (foundTenant.is_active === false) {
        throw new Error('Ce compte utilisateur a été désactivé par le Super Administrateur.')
      }
      const expectedPwd = foundTenant.avatar_url || '123456'
      if (pwd && expectedPwd && pwd !== expectedPwd) {
        throw new Error('Mot de passe incorrect.')
      }
      const displayName = `${foundTenant.first_name || ''} ${foundTenant.last_name || ''}`.trim() || foundTenant.email
      const tenantUser = {
        id: foundTenant.id,
        name: displayName,
        email: foundTenant.email,
        role: 'ADMIN',
        companyName: foundTenant.company_name || 'Organisation',
        isSuperAdmin: false,
        initials: ((foundTenant.first_name?.[0] || 'U') + (foundTenant.last_name?.[0] || 'A')).toUpperCase(),
        commercialDbId: `admin_${foundTenant.id}`,
      }
      setCurrentUser(tenantUser)
      setIsInspecting(false)
      setInspectedUser(null)
      return tenantUser
    }

    // 3. Commercial login - check against Supabase data
    const comm = commercials.find(c => (c.email || '').toLowerCase() === email)
    if (comm) {
      if (pwd !== (comm.password || '123456')) throw new Error('Mot de passe incorrect.')
      if (comm.isActive === false) throw new Error('Ce compte commercial est actuellement désactivé.')

      const user = {
        name: comm.name,
        email: comm.email,
        role: 'COMMERCIAL',
        id: comm.id,
        initials: comm.name.split(' ').filter(Boolean).map(n => n[0]).join(''),
        commercialDbId: comm.dbId || comm.id,
        tenantUserId: comm.userId,
      }
      setCurrentUser(user)
      setIsInspecting(false)
      setInspectedUser(null)
      return user
    }

    throw new Error(`Aucun compte trouvé pour "${email}".`)
  }, [commercials, tenantUsers])

  const logout = useCallback(() => {
    setIsInspecting(false)
    setInspectedUser(null)
    setCurrentUser(null)
  }, [])

  // ── EFFECTIVE TENANT ID ─────────────────────────────────────────────────────
  const effectiveTenantId = useMemo(() => {
    if (!currentUser) return null
    if (currentUser.role === 'COMMERCIAL') {
      return currentUser.tenantUserId || null
    }
    return currentUser.id || null
  }, [currentUser])

  // ── COMMERCIALS CRUD ────────────────────────────────────────────────────────
  const addCommercial = useCallback(async (c) => {
    const rawSectors = Array.isArray(c.sectors) && c.sectors.length > 0 ? c.sectors : (c.city ? c.city.split('|')[0].split(',') : ['Casablanca'])
    const sectorClean = rawSectors.map(s => s.trim()).filter(Boolean)
    const regionsClean = Array.isArray(c.regions) && c.regions.length > 0 ? c.regions : (c.region ? c.region.split(',') : ['Casablanca-Settat'])
    const statusTag = c.isActive === false ? 'INACTIF' : 'ACTIF'
    const cityPayload = `${sectorClean.join(', ')} | Régions: ${regionsClean.join(', ')} | Statut: ${statusTag}`

    const commPayload = {
      ...c,
      userId: effectiveTenantId,
      user_id: effectiveTenantId,
      city: cityPayload
    }

    const row = await dbAddCommercial(commPayload)
    if (!row) return null
    const appComm = {
      ...rowToCommercial(row),
      userId: effectiveTenantId,
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
  }, [effectiveTenantId])

  const updateCommercial = useCallback(async (c) => {
    const targetId = c.id || c.dbId
    const rawSectors = Array.isArray(c.sectors) && c.sectors.length > 0 ? c.sectors : (c.city ? c.city.split('|')[0].split(',') : ['Casablanca'])
    const sectorClean = rawSectors.map(s => s.trim()).filter(Boolean)
    const regionsClean = Array.isArray(c.regions) && c.regions.length > 0 ? c.regions : (c.region ? c.region.split(',') : ['Casablanca-Settat'])
    const statusTag = c.isActive === false ? 'INACTIF' : 'ACTIF'
    const cityPayload = `${sectorClean.join(', ')} | Régions: ${regionsClean.join(', ')} | Statut: ${statusTag}`

    const updatePayload = {
      ...c,
      id: targetId,
      userId: c.userId || effectiveTenantId,
      city: cityPayload
    }

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

    const row = await dbUpdateCommercial(updatePayload)
    if (!row) {
      const fallbackComm = { ...c, id: targetId, userId: c.userId || effectiveTenantId, regions: regionsClean, sectors: sectorClean, isActive: c.isActive !== false }
      setCommercials(prev => prev.map(x => (x.id === targetId || x.dbId === targetId) ? fallbackComm : x))
      return fallbackComm
    }
    const appComm = {
      ...rowToCommercial(row),
      userId: c.userId || effectiveTenantId,
      regions: regionsClean,
      sectors: sectorClean,
      isActive: c.isActive !== false
    }
    setCommercials(prev => prev.map(x => (x.id === row.id || x.dbId === row.id || x.id === targetId) ? appComm : x))
    return appComm
  }, [effectiveTenantId])

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

    const clientPayload = {
      ...c,
      userId: effectiveTenantId,
      commercialDbId: commDbId
    }

    const row = await dbAddClient(clientPayload)
    if (!row) return null

    const appClient = {
      ...rowToClient(row),
      userId: effectiveTenantId
    }
    const comm = commercials.find(cm => cm.dbId === commDbId || cm.id === commDbId)
    if (comm) { appClient.commercialName = comm.name; appClient.commercialEmail = comm.email }
    setClients(prev => [...prev, appClient])
    return appClient
  }, [currentUser, commercials, effectiveTenantId])

  const updateClient = useCallback(async (c) => {
    const targetId = c.id || c.dbId
    const updatePayload = {
      ...c,
      userId: c.userId || effectiveTenantId
    }
    const row = await dbUpdateClient(updatePayload)
    if (!row) {
      // Fallback: update local state if db update returned null
      const comm = commercials.find(cm => cm.dbId === c.commercialDbId || cm.id === c.commercialDbId)
      const fallbackClient = {
        ...c,
        userId: c.userId || effectiveTenantId,
        commercialName: comm ? comm.name : c.commercialName,
        commercialEmail: comm ? comm.email : c.commercialEmail
      }
      setClients(prev => prev.map(x => (x.id === targetId || x.dbId === targetId) ? fallbackClient : x))
      return fallbackClient
    }

    const appClient = {
      ...rowToClient(row),
      userId: c.userId || effectiveTenantId
    }
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
  }, [clients, commercials, effectiveTenantId])

  const deleteClient = useCallback(async (id) => {
    const ok = await dbDeleteClient(id)
    if (ok) setClients(prev => prev.filter(x => x.id !== id))
  }, [])

  // ── ORDERS CRUD ──────────────────────────────────────────────────────────────
  const addOrder = useCallback(async (o) => {
    const isCurrentUserAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN' || (currentUser?.email || '').toLowerCase() === 'bardahl@gmail.com'
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
      userId: effectiveTenantId,
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
      userId: effectiveTenantId,
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

    const appOrder = { ...rowToOrder(row, extras), userId: effectiveTenantId }
    setOrders(prev => [appOrder, ...prev.filter(x => x.id !== row.id && x.orderNumber !== appOrder.orderNumber)])
    return appOrder
  }, [currentUser, commercials, clients, effectiveTenantId])

  const updateOrder = useCallback(async (o) => {
    const updatePayload = {
      ...o,
      userId: o.userId || effectiveTenantId
    }
    const row = await dbUpdateOrder(updatePayload)
    if (!row) return null

    const extras = {
      userId: o.userId || effectiveTenantId,
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

    const appOrder = { ...rowToOrder(row, extras), userId: o.userId || effectiveTenantId }
    setOrders(prev => prev.map(x => (x.id === row.id || x.dbId === row.id) ? appOrder : x))
    return appOrder
  }, [effectiveTenantId])

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
      userId: effectiveTenantId,
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
  }, [effectiveTenantId])

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

  // ── STRICT MULTI-TENANT DATA ISOLATION ──────────────────────────────────────
  // Rules requested:
  // - Utilisateur A : voit uniquement ses données.
  // - Utilisateur B : voit uniquement ses données.
  // - Nouveau compte : application vide.
  // - Les anciennes lignes qui n’ont pas de user_id ne seront visibles par personne.

  const tenantCommercials = useMemo(() => {
    if (!effectiveTenantId) return []
    return commercials.filter(c => c.userId && String(c.userId).trim() === String(effectiveTenantId).trim())
  }, [commercials, effectiveTenantId])

  const tenantClients = useMemo(() => {
    if (!effectiveTenantId) return []
    return clients.filter(cl => {
      if (cl.userId && String(cl.userId).trim() === String(effectiveTenantId).trim()) return true
      if (cl.commercialDbId) {
        const comm = tenantCommercials.find(cm => cm.dbId === cl.commercialDbId || cm.id === cl.commercialDbId)
        if (comm && comm.userId && String(comm.userId).trim() === String(effectiveTenantId).trim()) return true
      }
      return false
    })
  }, [clients, effectiveTenantId, tenantCommercials])

  const tenantOrders = useMemo(() => {
    if (!effectiveTenantId) return []
    return orders.filter(o => {
      if (o.userId && String(o.userId).trim() === String(effectiveTenantId).trim()) return true
      if (o.commercialDbId) {
        const comm = tenantCommercials.find(cm => cm.dbId === o.commercialDbId || cm.id === o.commercialDbId)
        if (comm && comm.userId && String(comm.userId).trim() === String(effectiveTenantId).trim()) return true
      }
      return false
    })
  }, [orders, effectiveTenantId, tenantCommercials])

  // Commercial role-based further filter
  const visibleClients = useMemo(() => {
    if (currentUser?.role === 'COMMERCIAL') {
      return tenantClients.filter(c => c.commercialDbId === currentUser.commercialDbId || c.commercialId === currentUser.commercialDbId)
    }
    return tenantClients
  }, [tenantClients, currentUser])

  const visibleOrders = useMemo(() => {
    if (currentUser?.role === 'COMMERCIAL') {
      return tenantOrders.filter(o => o.commercialDbId === currentUser.commercialDbId || o.commercialId === currentUser.commercialDbId)
    }
    return tenantOrders
  }, [tenantOrders, currentUser])

  const tenantCompensations = useMemo(() => {
    if (!effectiveTenantId) return []
    return clientCompensations.filter(c => c.userId && String(c.userId).trim() === String(effectiveTenantId).trim())
  }, [clientCompensations, effectiveTenantId])

  return (
    <AppContext.Provider value={{
      currentUser, login, logout, loading,
      theme, setTheme, toggleTheme,
      // Multi-tenant & Super Admin state
      tenantUsers, addTenantUser, updateTenantUser, deleteTenantUser,
      inspectTenant, exitInspection, isInspecting, inspectedUser,
      // Isolated data (strictly per user_id)
      clients: visibleClients, allClients: tenantClients,
      addClient, updateClient, deleteClient,
      products: localProducts, addProduct, updateProduct, deleteProduct, deductProductsStock, restoreProductsStock,
      productFamilies, addProductFamily, updateProductFamily, deleteProductFamily, toggleProductFamily,
      orders: visibleOrders, allOrders: tenantOrders,
      addOrder, updateOrder, deleteOrder, updateOrderStatus,
      clientCompensations: tenantCompensations, addClientCompensation, updateClientCompensation, consumeClientCompensation, deleteClientCompensation,
      commercials: tenantCommercials, allCommercials: commercials, addCommercial, updateCommercial, deleteCommercial,
      promotions, addPromotion, updatePromotion, deletePromotion, togglePromotion,
      refreshAll,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}
