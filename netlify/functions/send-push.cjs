const webpush = require('web-push')
const { createClient } = require('@supabase/supabase-js')

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://fdquuhnkwhmohweiudlx.supabase.co'
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
  const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:hello@elara-health.life'

  if (!serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
    return { statusCode: 200, headers, body: JSON.stringify({ sent: 0, skipped: true, reason: 'Missing push env vars' }) }
  }

  let payload
  try { payload = JSON.parse(event.body || '{}') } catch { payload = {} }
  const notificationId = payload.notificationId
  if (!notificationId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'notificationId is required' }) }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

  const { data: notification, error: notifError } = await supabase
    .from('app_notifications')
    .select('*')
    .eq('id', notificationId)
    .maybeSingle()

  if (notifError || !notification) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: notifError?.message || 'Notification not found' }) }
  }

  const { data: subscriptions, error: subError } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth, auth_key')
    .eq('user_id', notification.user_id)
    .eq('is_active', true)

  if (subError) return { statusCode: 500, headers, body: JSON.stringify({ error: subError.message }) }
  if (!subscriptions?.length) return { statusCode: 200, headers, body: JSON.stringify({ sent: 0, reason: 'No active subscriptions' }) }

  const body = JSON.stringify({
    notificationId: notification.id,
    type: notification.type,
    title: notification.title || 'Elara',
    body: notification.body || '',
    actionUrl: notification.action_url || '/',
    priority: notification.priority || 'normal',
    icon: '/pwa-192.png',
    badge: '/pwa-192.png',
    tag: notification.id,
  })

  let sent = 0
  const expired = []
  await Promise.all(subscriptions.map(async (row) => {
    const pushSubscription = {
      endpoint: row.endpoint,
      keys: { p256dh: row.p256dh, auth: row.auth || row.auth_key },
    }
    try {
      await webpush.sendNotification(pushSubscription, body)
      sent += 1
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) expired.push(row.id)
      else console.warn('webpush send error', err.statusCode, err.body || err.message)
    }
  }))

  if (expired.length) {
    await supabase.from('push_subscriptions').update({ is_active: false }).in('id', expired)
  }

  return { statusCode: 200, headers, body: JSON.stringify({ sent, expired: expired.length }) }
}
