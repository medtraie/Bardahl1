import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://uoknnkrphtlsmvrdkeov.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVva25ua3JwaHRsc212cmRrZW92Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTg3ODA2OCwiZXhwIjoyMTAxNDU0MDY4fQ.iN0xqCHWT_ZeqUAIuxwgJ0_AsVmKLPgVlj87mc3YX4s'

export const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// ─────────────────────────────────────────────────────────────────────────────
// VERIFIED SUPABASE TABLE SCHEMAS (discovered via service_role):
//
// commercials: id, user_id, matricule, city,
//              target_monthly_sales, current_month_sales, total_orders_count
//
// clients: id, commercial_id, company_name, ice, rc, if_code, patente,
//          address, city, phone, email, gps_latitude, gps_longitude,
//          client_type('garage'|'station'|'fleet'), is_active
//
// orders: id, order_number, commercial_id, client_id, order_date, status,
//         total_ht, total_discount, total_tva, total_ttc,
//         signature_url, observations, is_synced, offline_created_at
// ─────────────────────────────────────────────────────────────────────────────

// ─── AUTH USERS (via auth.users) ─────────────────────────────────────────────

export async function dbCreateAuthUser(email, password, metadata = {}) {
  // Create auth user via admin API
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  })
  if (error) { console.error('dbCreateAuthUser:', error.message); return null }
  return data.user
}

// ─── COMMERCIALS ─────────────────────────────────────────────────────────────

export async function dbGetCommercials() {
  const { data, error } = await supabase
    .from('commercials')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) { console.error('dbGetCommercials:', error.message); return [] }
  return data || []
}

export async function dbAddCommercial(c) {
  const payload = {
    matricule: c.matricule || 'COM-000',
    city: c.city || 'Casablanca',
    target_monthly_sales: parseFloat(c.target) || 150000,
    current_month_sales: parseFloat(c.current) || 0,
    total_orders_count: 0,
    name: c.name || '',
    email: c.email || '',
    password: c.password || '123456',
    phone: c.phone || '',
  }

  const { data, error } = await supabase.from('commercials').insert([payload]).select().single()
  if (error) { console.error('dbAddCommercial:', error.message); return null }
  return data
}

export async function dbUpdateCommercial(c) {
  const payload = {
    matricule: c.matricule,
    city: c.city,
    target_monthly_sales: parseFloat(c.target) || 150000,
    current_month_sales: parseFloat(c.current) || 0,
    name: c.name || '',
    email: c.email || '',
    password: c.password || '123456',
    phone: c.phone || '',
  }

  const { data, error } = await supabase.from('commercials').update(payload).eq('id', c.id).select().single()
  if (error) { console.error('dbUpdateCommercial:', error.message); return null }
  return data
}

export async function dbDeleteCommercial(id) {
  const { error } = await supabase.from('commercials').delete().eq('id', id)
  if (error) { console.error('dbDeleteCommercial:', error.message); return false }
  return true
}

// ─── CLIENTS ─────────────────────────────────────────────────────────────────

export async function dbGetClients() {
  const allClients = []
  const pageSize = 1000
  let page = 0
  let hasMore = true

  while (hasMore) {
    const from = page * pageSize
    const to = from + pageSize - 1
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to)

    if (error) {
      console.error('dbGetClients error:', error.message)
      break
    }

    if (data && data.length > 0) {
      allClients.push(...data)
      if (data.length < pageSize) {
        hasMore = false
      } else {
        page++
      }
    } else {
      hasMore = false
    }
  }

  return allClients
}

export async function dbAddClient(c) {
  const typeMapToDb = {
    'Grossiste': 'gros',
    'Revendeur': 'station',
    'Particulier': 'detail',
    'Grand compte': 'flotte',
    'gros': 'gros',
    'station': 'station',
    'detail': 'detail',
    'flotte': 'flotte',
    'Garage': 'garage',
    'garage': 'garage',
    'Station': 'station',
    'Flotte': 'flotte'
  }
  const cleanIce = (c.ice && c.ice.trim()) ? c.ice.trim() : (c.codeClient ? '0015' + c.codeClient.replace(/\D/g, '').padStart(5, '0') + '000001' : '0015' + Date.now().toString().slice(-9))

  const insertData = {
    commercial_id: c.commercialDbId || null,
    company_name: c.companyName || 'Client Bardahl',
    ice: cleanIce,
    rc: c.rc || '',
    if_code: c.codeClient || '',
    patente: c.region || '',
    address: c.address || c.city || 'Casablanca, Maroc',
    city: c.city || 'Casablanca',
    phone: c.phone || '+212 5 22 00 00 00',
    email: c.clientEmail || '',
    client_type: typeMapToDb[c.type] || 'gros',
    is_active: true,
  }

  const { data, error } = await supabase.from('clients').insert([insertData]).select().single()
  if (error) { console.error('dbAddClient error:', error.message); return null }
  return data
}

export async function dbUpdateClient(c) {
  const typeMapToDb = {
    'Grossiste': 'gros',
    'Revendeur': 'station',
    'Particulier': 'detail',
    'Grand compte': 'flotte',
    'gros': 'gros',
    'station': 'station',
    'detail': 'detail',
    'flotte': 'flotte',
    'Garage': 'garage',
    'garage': 'garage',
    'Station': 'station',
    'Flotte': 'flotte'
  }

  const targetId = c.dbId || c.id
  const cleanIce = (c.ice && c.ice.trim()) ? c.ice.trim() : (c.codeClient ? '0015' + c.codeClient.replace(/\D/g, '').padStart(5, '0') + '000001' : '001500000000000')

  const updateData = {
    commercial_id: c.commercialDbId || null,
    company_name: c.companyName || 'Client Bardahl',
    ice: cleanIce,
    rc: c.rc || '',
    if_code: c.codeClient || '',
    patente: c.region || '',
    address: c.address || c.city || 'Casablanca, Maroc',
    city: c.city || 'Casablanca',
    phone: c.phone || '+212 5 22 00 00 00',
    email: c.clientEmail || '',
    client_type: typeMapToDb[c.type] || 'gros',
    updated_at: new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('clients')
    .update(updateData)
    .eq('id', targetId)
    .select()
    .single()

  if (error) {
    console.error('dbUpdateClient error:', error.message, error.details)
    // If update failed because record didn't exist in Supabase yet, attempt insert fallback
    const { data: inserted, error: insertError } = await supabase
      .from('clients')
      .insert([{ id: (targetId && targetId.includes('-')) ? targetId : undefined, ...updateData }])
      .select()
      .single()

    if (insertError) {
      console.error('dbUpdateClient Insert Fallback error:', insertError.message)
      return null
    }
    return inserted
  }

  return data
}

export async function dbDeleteClient(id) {
  const { error } = await supabase.from('clients').delete().eq('id', id)
  if (error) { console.error('dbDeleteClient:', error.message); return false }
  return true
}

// ─── ORDERS ──────────────────────────────────────────────────────────────────

export async function dbGetOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      commercial:commercial_id(id, matricule, city),
      client:client_id(id, company_name, city, phone)
    `)
    .order('created_at', { ascending: false })
  if (error) {
    const { data: d2, error: e2 } = await supabase.from('orders').select('*').order('created_at', { ascending: false })
    if (e2) { console.error('dbGetOrders:', e2.message); return [] }
    return d2 || []
  }
  return data || []
}

export async function dbAddOrder(o) {
  const statusMap = { VALIDATED: 'validated', DRAFT: 'draft', SENT: 'sent' }
  const dbStatus = statusMap[(o.status || 'DRAFT').toUpperCase()] || 'draft'

  // Pack items and full order metadata into observations JSON
  const observationsPayload = JSON.stringify({
    items: o.items || [],
    paymentMethod: o.paymentMethod || 'Chèque',
    modeExpedition: o.modeExpedition || 'Transport Bardahl',
    remarque: o.remarque || '',
    promoNote: o.promoNote || '',
    remisePercent: o.remisePercent || 0,
    remiseMontant: o.remiseMontant || 0,
    commercialName: o.commercialName || '',
    commercialEmail: o.commercialEmail || '',
    clientName: o.clientName || '',
    clientIce: o.clientIce || '',
    clientCity: o.clientCity || '',
    clientPhone: o.clientPhone || '',
  })

  const { data, error } = await supabase.from('orders').insert([{
    commercial_id: o.commercialDbId,
    client_id: o.clientDbId,
    order_number: o.orderNumber || `BC-${Date.now()}`,
    order_date: o.date || new Date().toISOString(),
    status: dbStatus,
    total_ht: parseFloat(o.totalHt) || 0,
    total_discount: parseFloat(o.totalDiscount) || 0,
    total_tva: parseFloat(o.totalTva) || 0,
    total_ttc: parseFloat(o.totalTtc) || 0,
    observations: observationsPayload,
    is_synced: true,
  }]).select().single()
  if (error) { console.error('dbAddOrder:', error.message); return null }
  return data
}

export async function dbUpdateOrder(o) {
  const statusMap = { VALIDATED: 'validated', DRAFT: 'draft', SENT: 'sent' }
  const dbStatus = statusMap[(o.status || 'DRAFT').toUpperCase()] || 'draft'

  const observationsPayload = JSON.stringify({
    items: o.items || [],
    paymentMethod: o.paymentMethod || 'Chèque',
    modeExpedition: o.modeExpedition || 'Transport Bardahl',
    remarque: o.remarque || '',
    promoNote: o.promoNote || '',
    remisePercent: o.remisePercent || 0,
    remiseMontant: o.remiseMontant || 0,
    commercialName: o.commercialName || '',
    commercialEmail: o.commercialEmail || '',
    clientName: o.clientName || '',
    clientIce: o.clientIce || '',
    clientCity: o.clientCity || '',
    clientPhone: o.clientPhone || '',
  })

  const targetId = o.id || o.dbId
  const { data, error } = await supabase.from('orders').update({
    order_number: o.orderNumber,
    order_date: o.date || new Date().toISOString(),
    status: dbStatus,
    total_ht: parseFloat(o.totalHt) || 0,
    total_discount: parseFloat(o.totalDiscount) || 0,
    total_tva: parseFloat(o.totalTva) || 0,
    total_ttc: parseFloat(o.totalTtc) || 0,
    observations: observationsPayload,
  }).eq('id', targetId).select().single()
  if (error) { console.error('dbUpdateOrder:', error.message); return null }
  return data
}

export async function dbDeleteOrder(id) {
  const { error } = await supabase.from('orders').delete().eq('id', id)
  if (error) { console.error('dbDeleteOrder:', error.message); return false }
  return true
}

// ─── REALTIME ────────────────────────────────────────────────────────────────

export function subscribeToTable(table, callback) {
  const channel = supabase
    .channel(`realtime-${table}-${Date.now()}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
    .subscribe()
  return channel
}

export function unsubscribeChannel(channel) {
  if (channel) supabase.removeChannel(channel)
}
