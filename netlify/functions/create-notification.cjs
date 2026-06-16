const { createClient } = require('@supabase/supabase-js')

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function pick(obj, keys) {
  const out = {}
  keys.forEach(k => { if (obj[k] !== undefined) out[k] = obj[k] })
  return out
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://fdquuhnkwhmohweiudlx.supabase.co'
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }) }

  let body = {}
  try { body = JSON.parse(event.body || '{}') } catch {}
  const token = (event.headers.authorization || event.headers.Authorization || '').replace(/^Bearer\s+/i, '')
  if (!token) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Missing auth token' }) }

  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: authData, error: authError } = await supabase.auth.getUser(token)
  const actorId = authData?.user?.id
  if (authError || !actorId) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid auth token' }) }

  const recipientId = body.user_id || body.userId || body.recipientId
  if (!recipientId || !body.title) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing user_id or title' }) }

  const insert = {
    user_id: recipientId,
    actor_id: body.actor_id || actorId,
    type: body.type || 'general',
    title: body.title,
    body: body.body || null,
    emoji: body.emoji || '🔔',
    source_type: body.source_type || body.sourceType || null,
    source_id: body.source_id || body.sourceId || null,
    action_url: body.action_url || body.actionUrl || '/',
    priority: body.priority || 'normal',
    data: { ...(body.data || {}), actor_id: body.actor_id || actorId },
    created_at: new Date().toISOString(),
  }

  let inserted = null
  let insertError = null
  try {
    const res = await supabase.from('app_notifications').insert(insert).select('*').single()
    inserted = res.data; insertError = res.error
  } catch (e) { insertError = e }

  if (insertError) {
    const fallback = pick(insert, ['user_id','actor_id','type','title','body','data','created_at'])
    const res = await supabase.from('app_notifications').insert(fallback).select('*').single()
    inserted = res.data; insertError = res.error
  }

  if (insertError || !inserted) return { statusCode: 500, headers, body: JSON.stringify({ error: insertError?.message || 'Insert failed' }) }

  // Best-effort push. Do not fail the in-app notification if Web Push is missing.
  try {
    const webpush = require('web-push')
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:hello@elara-health.life'
    if (vapidPublicKey && vapidPrivateKey) {
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)
      const { data: subs } = await supabase.from('push_subscriptions').select('id, endpoint, p256dh, auth, auth_key').eq('user_id', recipientId).eq('is_active', true)
      const payload = JSON.stringify({
        notificationId: inserted.id,
        type: inserted.type,
        title: inserted.title || 'Elara',
        body: inserted.body || '',
        actionUrl: inserted.action_url || insert.action_url || '/',
        priority: inserted.priority || insert.priority || 'normal',
        icon: '/pwa-192.png',
        badge: '/pwa-192.png',
        tag: inserted.id,
      })
      const expired = []
      await Promise.all((subs || []).map(async row => {
        const auth = row.auth || row.auth_key
        if (!row.endpoint || !row.p256dh || !auth) return
        try { await webpush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth } }, payload) }
        catch (err) { if (err.statusCode === 404 || err.statusCode === 410) expired.push(row.id) }
      }))
      if (expired.length) await supabase.from('push_subscriptions').update({ is_active:false, updated_at:new Date().toISOString() }).in('id', expired)
    }
  } catch (e) { console.warn('create-notification push skipped', e.message) }

  return { statusCode: 200, headers, body: JSON.stringify({ id: inserted.id, notification: inserted }) }
}
