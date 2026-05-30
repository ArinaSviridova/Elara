// Хук управления уведомлениями + утилита создания
import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

// ── Создать уведомление ──────────────────────────────────────────────────────
export async function createNotification(userId, {
  type,
  title,
  body = null,
  emoji = '🔔',
  sourceType = null,
  sourceId = null,
  actionUrl = null,
  priority = 'normal',
}) {
  if (!userId) return
  const { error } = await supabase.from('app_notifications').insert({
    user_id: userId,
    type, title, body, emoji,
    source_type: sourceType,
    source_id: sourceId,
    action_url: actionUrl,
    priority,
  })
  if (error) console.error('createNotification error:', error)
}

// ── Шаблоны уведомлений ──────────────────────────────────────────────────────
export const Notifs = {
  activityInvite: (userId, fromName, activityText, inviteId) =>
    createNotification(userId, {
      type: 'activity_invite',
      title: `${fromName} предлагает: ${activityText}`,
      body: 'Нажми «Перейти» чтобы ответить',
      emoji: '📅',
      sourceType: 'sync',
      sourceId: inviteId,
      actionUrl: '/sync',
      priority: 'normal',
    }),

  partnerMessage: (userId, fromName, message, inviteId) =>
    createNotification(userId, {
      type: 'partner_message',
      title: `Сообщение от ${fromName}`,
      body: message,
      emoji: '💌',
      sourceType: 'friends',
      sourceId: inviteId,
      actionUrl: '/friends',
      priority: 'normal',
    }),

  medReminder: (userId, medName, time) =>
    createNotification(userId, {
      type: 'med_reminder',
      title: 'Напоминание о препарате',
      body: `Время принять: ${medName}`,
      emoji: '💊',
      sourceType: 'medications',
      actionUrl: '/health',
      priority: 'high',
    }),

  cycleAlert: (userId, message, daysUntil) =>
    createNotification(userId, {
      type: 'cycle_alert',
      title: message,
      body: daysUntil != null ? `Через ${daysUntil} дн.` : null,
      emoji: '🩸',
      sourceType: 'calendar',
      actionUrl: '/calendar',
      priority: 'normal',
    }),

  healthAlert: (userId, title, body, url = '/health') =>
    createNotification(userId, {
      type: 'health_alert',
      title,
      body,
      emoji: '⚡',
      sourceType: 'health',
      actionUrl: url,
      priority: 'high',
    }),

  pregnancyTask: (userId, taskTitle, taskId) =>
    createNotification(userId, {
      type: 'pregnancy_task',
      title: `Задача: ${taskTitle}`,
      body: 'Нажми «Перейти» чтобы отметить',
      emoji: '🌱',
      sourceType: 'pregnancy',
      sourceId: taskId,
      actionUrl: '/pregnancy',
      priority: 'normal',
    }),
}

// ── Хук для чтения уведомлений ───────────────────────────────────────────────
export function useNotifications(userId) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('app_notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('is_dismissed', false)
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifications(data || [])
    setUnreadCount((data || []).filter(n => !n.is_read).length)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    load()
    if (!userId) return

    // Уникальное имя канала на каждый монтаж чтобы избежать конфликтов
    const channelName = `notifs_${userId}_${Date.now()}`
    let channel = null

    try {
      channel = supabase
        .channel(channelName)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'app_notifications',
          filter: `user_id=eq.${userId}`,
        }, () => load())
        .subscribe()
    } catch (e) {
      console.warn('Realtime subscription error:', e)
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel).catch(() => {})
      }
    }
  }, [userId, load])

  const markRead = useCallback(async (id) => {
    await supabase.from('app_notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }, [])

  const markAllRead = useCallback(async () => {
    if (!userId) return
    await supabase.from('app_notifications')
      .update({ is_read: true })
      .eq('user_id', userId).eq('is_read', false)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    setUnreadCount(0)
  }, [userId])

  const dismiss = useCallback(async (id) => {
    await supabase.from('app_notifications').update({ is_dismissed: true }).eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
    setUnreadCount(prev => {
      const was = notifications.find(n => n.id === id)
      return was && !was.is_read ? Math.max(0, prev - 1) : prev
    })
  }, [notifications])

  const dismissAll = useCallback(async () => {
    if (!userId) return
    await supabase.from('app_notifications')
      .update({ is_dismissed: true })
      .eq('user_id', userId)
    setNotifications([])
    setUnreadCount(0)
  }, [userId])

  return { notifications, unreadCount, loading, load, markRead, markAllRead, dismiss, dismissAll }
}

// ── Лёгкий хук только для счётчика непрочитанных (без Realtime) ─────────────
// Используется в BottomNav чтобы не создавать дублирующий Realtime канал
export function useUnreadCount(userId) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    async function fetch() {
      const { count: c } = await supabase
        .from('app_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)
        .eq('is_dismissed', false)
      if (!cancelled) setCount(c || 0)
    }

    fetch()
    // Polling раз в 30 секунд - не создаёт Realtime конфликтов
    const interval = setInterval(fetch, 30000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [userId])

  return count
}
