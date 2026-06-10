const webpush = require('web-push')
const { createClient } = require('@supabase/supabase-js')

exports.config = { schedule: '*/5 * * * *' }

const headers = { 'Content-Type': 'application/json' }

async function sendToUser({ supabase, webpushReady, notification }) {
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth, auth_key')
    .eq('user_id', notification.user_id)
    .eq('is_active', true)
  if (error || !subscriptions?.length || !webpushReady) return { sent:0, expired:[] }

  const payload = JSON.stringify({
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
  await Promise.all(subscriptions.map(async row => {
    const auth = row.auth || row.auth_key
    if (!row.endpoint || !row.p256dh || !auth) return
    try {
      await webpush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth } }, payload)
      sent += 1
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) expired.push(row.id)
      else console.warn('scheduled push send error', err.statusCode, err.body || err.message)
    }
  }))
  if (expired.length) await supabase.from('push_subscriptions').update({ is_active:false, updated_at:new Date().toISOString() }).in('id', expired)
  return { sent, expired }
}

exports.handler = async () => {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://fdquuhnkwhmohweiudlx.supabase.co'
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY
  const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:hello@elara-health.life'

  if (!serviceRoleKey) return { statusCode:200, headers, body:JSON.stringify({ processed:0, skipped:true, reason:'Missing SUPABASE_SERVICE_ROLE_KEY' }) }
  const supabase = createClient(supabaseUrl, serviceRoleKey, { auth:{ persistSession:false, autoRefreshToken:false } })

  const webpushReady = Boolean(vapidPublicKey && vapidPrivateKey)
  if (webpushReady) webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

  const now = new Date().toISOString()
  const { data: dueRows, error: dueError } = await supabase
    .from('scheduled_notifications')
    .select('*')
    .eq('status', 'pending')
    .lte('due_at', now)
    .order('due_at', { ascending:true })
    .limit(100)

  if (dueError) return { statusCode:500, headers, body:JSON.stringify({ error:dueError.message }) }
  if (!dueRows?.length) return { statusCode:200, headers, body:JSON.stringify({ processed:0 }) }

  let processed = 0
  let sent = 0
  for (const row of dueRows) {
    const { data: inserted, error: insertError } = await supabase
      .from('app_notifications')
      .insert({
        user_id: row.user_id,
        type: row.type || 'reminder',
        title: row.title || 'Elara',
        body: row.body || null,
        emoji: row.emoji || '🔔',
        source_type: row.source_type || 'reminders',
        source_id: row.source_id || row.id,
        action_url: row.action_url || '/',
        priority: row.priority || 'normal',
        data: row.data || {},
      })
      .select('*')
      .single()

    if (insertError) {
      await supabase.from('scheduled_notifications').update({ status:'failed', last_error:insertError.message, processed_at:new Date().toISOString() }).eq('id', row.id)
      continue
    }
    const result = await sendToUser({ supabase, webpushReady, notification: inserted })
    sent += result.sent || 0
    await supabase.from('scheduled_notifications').update({ status:'sent', notification_id:inserted.id, processed_at:new Date().toISOString() }).eq('id', row.id)
    processed += 1
  }

  return { statusCode:200, headers, body:JSON.stringify({ processed, sent }) }
}
