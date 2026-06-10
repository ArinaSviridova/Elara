import { supabase } from './supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

export function isPushSupported() {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
}

export async function getPushState(userId) {
  if (!isPushSupported()) return { supported: false, enabled: false, permission: 'unsupported' }
  const permission = Notification.permission
  let subscription = null
  try {
    const registration = await navigator.serviceWorker.ready
    subscription = await registration.pushManager.getSubscription()
  } catch (e) {}

  let saved = false
  if (userId && subscription) {
    const { data } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('endpoint', subscription.endpoint)
      .eq('is_active', true)
      .maybeSingle()
    saved = Boolean(data?.id)
  }

  return { supported: true, enabled: permission === 'granted' && Boolean(subscription) && saved, permission, subscription }
}

export async function enablePushNotifications(userId) {
  if (!userId) throw new Error('No user')
  if (!isPushSupported()) throw new Error('Push notifications are not supported in this browser')
  if (!VAPID_PUBLIC_KEY) throw new Error('Missing VITE_VAPID_PUBLIC_KEY')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notification permission was not granted')

  const registration = await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }

  const json = subscription.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint: subscription.endpoint,
    p256dh: json.keys?.p256dh,
    auth: json.keys?.auth,
    auth_key: json.keys?.auth,
    user_agent: navigator.userAgent,
    is_active: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'endpoint' })

  if (error) throw error
  return subscription
}

export async function disablePushNotifications(userId) {
  if (!isPushSupported()) return
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (subscription) {
    await supabase.from('push_subscriptions')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('endpoint', subscription.endpoint)
      .eq('user_id', userId)
    await subscription.unsubscribe()
  }
}

export async function sendBrowserPushForNotification(notificationId) {
  if (!notificationId) return
  try {
    const { data: { session } } = await supabase.auth.getSession()
    await fetch('/.netlify/functions/send-push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: JSON.stringify({ notificationId }),
    })
  } catch (e) {
    console.warn('send push failed', e)
  }
}
