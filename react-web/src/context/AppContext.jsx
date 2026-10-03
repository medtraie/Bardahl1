import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { allProductsData } from '../data/productsData'
import { defaultPromotions } from '../data/promotionsData'
import { DEFAULT_BARDAHL_FAMILIES, setGlobalProductFamilies } from '../data/familiesData'
import {
  dbGetCommercials, dbAddCommercial, dbUpdateCommercial, dbDeleteCommercial,
  dbGetClients,     dbAddClient,      dbUpdateClient,      dbDeleteClient,
  dbGetOrders,      dbAddOrder,       dbUpdateOrder,       dbDeleteOrder,
  dbGetPromotions,  dbAddPromotion,   dbUpdatePromotion,   dbDeletePromotion,
  dbGetProducts,    dbAddProduct,     dbUpdateProduct,     dbDeleteProduct,
  dbGetProductFamilies, dbAddProductFamily, dbUpdateProductFamily, dbDeleteProductFamily,
  dbUpdateOrderStatus,
  subscribeToTable, unsubscribeChannel,
} from '../lib/supabase'

const AppContext = createContext()

// ─── Row converters: Supabase row → App object ────────────────────────────────

function rowToCommercial(row) {
  return {
    id: row.id,
    dbId: row.id,
    name: row.name || `Commercial ${row.matricule}`,
    email: row.email || '',
    password: row.password || '123456',
    matricule: row.matricule || '',
    city: row.city || '',
    phone: row.phone || '',
    target: row.target_monthly_sales || 150000,
    current: row.current_month_sales || 0,
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
    commercialName: extras.commercialName || parsedObs.commercialName || '',
    commercialEmail: extras.commercialEmail || parsedObs.commercialEmail || '',
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
    items: items,
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }) {
  // ONLY session stored locally
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bardahl_session') || 'null') }
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
      const [commsRows, clientsRows, ordersRows, productsRows, familiesRows] = await Promise.all([
        dbGetCommercials(),
        dbGetClients(),
        dbGetOrders(),
        dbGetProducts().catch(() => null),
        dbGetProductFamilies().catch(() => null),
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
        if (comm) { order.commercialName = comm.name; order.commercialEmail = comm.email }
        if (client) order.clientName = client.companyName
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
    return () => {
      unsubscribeChannel(chComm)
      unsubscribeChannel(chCli)
      unsubscribeChannel(chOrd)
      unsubscribeChannel(chFam)
    }
  }, [refreshAll])

  // ── AUTH ─────────────────────────────────────────────────────────────────────
  const login = useCallback((inputEmail, inputPassword) => {
    const email = (inputEmail || '').trim().toLowerCase()
    const pwd   = (inputPassword || '').trim()

    if (!email) throw new Error('Veuillez saisir votre adresse email.')

    // Admin login
    if (email === 'bardahl@gmail.com') {
      const user = { name: 'Direction Bardahl', email, role: 'ADMIN', initials: 'DB' }
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
    const row = await dbAddCommercial(c)
    if (!row) return null
    const appComm = rowToCommercial(row)
    setCommercials(prev => [...prev, appComm])
    return appComm
  }, [])

  const updateCommercial = useCallback(async (c) => {
    const row = await dbUpdateCommercial(c)
    if (!row) return null
    const appComm = rowToCommercial(row)
    setCommercials(prev => prev.map(x => x.id === row.id ? appComm : x))
    return appComm
  }, [])

  const deleteCommercial = useCallback(async (id) => {
    const ok = await dbDeleteCommercial(id)
    if (ok) setCommercials(prev => prev.filter(x => x.id !== id))
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
    let commDbId = o.commercialDbId || currentUser?.commercialDbId
    if (!commDbId) {
      const matchedComm = commercials.find(cm => (cm.email || '').toLowerCase() === (currentUser?.email || '').toLowerCase())
        || (o.commercialName ? commercials.find(cm => cm.name.toLowerCase().includes(o.commercialName.toLowerCase())) : null)
        || commercials[0]
      commDbId = matchedComm?.dbId || matchedComm?.id
    }

    const clientRecord = clients.find(c =>
      c.companyName === o.clientName || c.id === o.clientDbId || c.dbId === o.clientDbId
    ) || clients[0]
    const clientDbId = clientRecord?.dbId || clientRecord?.id || o.clientDbId

    if (!commDbId || !clientDbId) {
      console.error('addOrder: missing IDs', { commDbId, clientDbId })
      return null
    }

    const orderPayload = {
      ...o,
      commercialDbId: commDbId,
      clientDbId: clientDbId,
      clientName: clientRecord?.companyName || o.clientName,
      clientIce: clientRecord?.ice || o.clientIce || '',
      clientCity: clientRecord?.city || o.clientCity || '',
      clientPhone: clientRecord?.phone || o.clientPhone || '',
      commercialName: o.commercialName || currentUser?.name || 'Direction Bardahl',
      commercialEmail: o.commercialEmail || currentUser?.email || 'bardahl@gmail.com'
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

  // ── Role-based visibility ────────────────────────────────────────────────────
  const isAdmin = currentUser?.role === 'ADMIN'

  const visibleClients = isAdmin
    ? clients
    : clients.filter(c => {
        const comm = commercials.find(cm => cm.dbId === c.commercialDbId)
        return comm && (comm.email || '').toLowerCase() === (currentUser?.email || '').toLowerCase()
      })

  const visibleOrders = isAdmin
    ? orders
    : orders.filter(o => {
        const comm = commercials.find(cm => cm.dbId === o.commercialDbId)
        return comm && (comm.email || '').toLowerCase() === (currentUser?.email || '').toLowerCase()
      })

  return (
    <AppContext.Provider value={{
      currentUser, login, logout, loading,
      theme, setTheme, toggleTheme,
      clients: visibleClients, allClients: clients,
      addClient, updateClient, deleteClient,
      products: localProducts, addProduct, updateProduct, deleteProduct,
      productFamilies, addProductFamily, updateProductFamily, deleteProductFamily, toggleProductFamily,
      orders: visibleOrders, allOrders: orders,
      addOrder, updateOrder, deleteOrder, updateOrderStatus,
      clientCompensations, addClientCompensation, updateClientCompensation, consumeClientCompensation, deleteClientCompensation,
      commercials, addCommercial, updateCommercial, deleteCommercial,
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
