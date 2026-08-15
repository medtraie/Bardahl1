import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { allProductsData } from '../data/productsData'
import {
  dbGetCommercials, dbAddCommercial, dbUpdateCommercial, dbDeleteCommercial,
  dbGetClients,     dbAddClient,      dbUpdateClient,      dbDeleteClient,
  dbGetOrders,      dbAddOrder,       dbUpdateOrder,       dbDeleteOrder,
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
  const statusMap = { validated: 'VALIDATED', draft: 'DRAFT', sent: 'SENT' }
  const totalTtc = row.total_ttc || 0

  // Ensure items list is never empty
  let items = extras.items && extras.items.length > 0 ? extras.items : []
  if (items.length === 0 && totalTtc > 0) {
    items = [
      {
        productId: 'la1',
        reference: '34131',
        productName: 'Bardahl XTRA 10W40 1L',
        qty: 1,
        priceTtc: totalTtc,
        remise: 0
      }
    ]
  }

  return {
    id: row.id,
    dbId: row.id,
    orderNumber: row.order_number || '',
    date: row.order_date ? String(row.order_date).substring(0, 10) : '',
    status: statusMap[(row.status || 'draft').toLowerCase()] || 'DRAFT',
    totalHt: row.total_ht || (totalTtc / 1.20),
    totalDiscount: row.total_discount || 0,
    totalTva: row.total_tva || (totalTtc - (totalTtc / 1.20)),
    totalTtc: totalTtc,
    observations: row.observations || '',
    remarque: extras.remarque || row.observations || '',
    isSynced: row.is_synced !== false,
    commercialDbId: row.commercial_id,
    clientDbId: row.client_id,
    // Enriched from extras or joined data
    commercialName: extras.commercialName || '',
    commercialEmail: extras.commercialEmail || '',
    clientName: extras.clientName || '',
    paymentMethod: extras.paymentMethod || 'Chèque',
    modeExpedition: extras.modeExpedition || 'Transport Bardahl',
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
  const [localProducts, setLocalProducts] = useState(allProductsData)

  // Local storage for extra order data (items, paymentMethod, modeExpedition)
  // These fields don't exist in Supabase orders table
  const [orderExtras, setOrderExtras] = useState(() => {
    try { return JSON.parse(localStorage.getItem('bardahl_order_extras') || '{}') }
    catch { return {} }
  })

  useEffect(() => {
    localStorage.setItem('bardahl_order_extras', JSON.stringify(orderExtras))
  }, [orderExtras])

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
      const [commsRows, clientsRows, ordersRows] = await Promise.all([
        dbGetCommercials(),
        dbGetClients(),
        dbGetOrders(),
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
    return () => {
      unsubscribeChannel(chComm)
      unsubscribeChannel(chCli)
      unsubscribeChannel(chOrd)
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

  // ── PRODUCTS CRUD (local only) ───────────────────────────────────────────────
  const addProduct    = useCallback((p) => setLocalProducts(prev => [{ ...p, id: `p_${Date.now()}` }, ...prev]), [])
  const updateProduct = useCallback((p) => setLocalProducts(prev => prev.map(x => x.id === p.id ? p : x)), [])
  const deleteProduct = useCallback((id) => setLocalProducts(prev => prev.filter(x => x.id !== id)), [])

  // ── ORDERS CRUD ──────────────────────────────────────────────────────────────
  const addOrder = useCallback(async (o) => {
    const commDbId = currentUser?.commercialDbId ||
      commercials.find(cm => (cm.email || '').toLowerCase() === (currentUser?.email || '').toLowerCase())?.dbId

    const clientRecord = clients.find(c =>
      c.companyName === o.clientName || c.id === o.clientDbId
    )
    const clientDbId = clientRecord?.dbId || o.clientDbId

    if (!commDbId || !clientDbId) {
      console.error('addOrder: missing IDs', { commDbId, clientDbId })
      return null
    }

    const row = await dbAddOrder({ ...o, commercialDbId: commDbId, clientDbId })
    if (!row) return null

    // Save extras locally (items, paymentMethod, modeExpedition not in DB)
    const extras = {
      items: o.items || [],
      paymentMethod: o.paymentMethod || '',
      modeExpedition: o.modeExpedition || '',
      remarque: o.remarque || '',
      commercialName: currentUser?.name || '',
      commercialEmail: currentUser?.email || '',
      clientName: clientRecord?.companyName || o.clientName || '',
    }
    setOrderExtras(prev => ({ ...prev, [row.id]: extras }))

    const appOrder = { ...rowToOrder(row, extras) }
    setOrders(prev => [appOrder, ...prev])
    return appOrder
  }, [currentUser, commercials, clients])

  const updateOrder = useCallback(async (o) => {
    const row = await dbUpdateOrder(o)
    if (!row) return null

    const extras = {
      items: o.items || [],
      paymentMethod: o.paymentMethod || '',
      modeExpedition: o.modeExpedition || '',
      remarque: o.remarque || '',
      commercialName: o.commercialName || '',
      commercialEmail: o.commercialEmail || '',
      clientName: o.clientName || '',
    }
    setOrderExtras(prev => ({ ...prev, [row.id]: extras }))

    const appOrder = { ...rowToOrder(row, extras) }
    setOrders(prev => prev.map(x => x.id === row.id ? appOrder : x))
    return appOrder
  }, [])

  const deleteOrder = useCallback(async (id) => {
    const ok = await dbDeleteOrder(id)
    if (!ok) return
    setOrderExtras(prev => { const n = { ...prev }; delete n[id]; return n })
    setOrders(prev => prev.filter(x => x.id !== id))
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
      orders: visibleOrders, allOrders: orders,
      addOrder, updateOrder, deleteOrder,
      commercials, addCommercial, updateCommercial, deleteCommercial,
      refreshAll,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}
