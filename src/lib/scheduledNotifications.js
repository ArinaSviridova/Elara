import { supabase } from './supabase'

export function nextDateTimeForClock(timeText, now = new Date()) {
  const match = String(timeText || '').match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const d = new Date(now)
  d.setHours(Number(match[1]), Number(match[2]), 0, 0)
  if (d.getTime() <= now.getTime() + 30_000) d.setDate(d.getDate() + 1)
  return d
}

export async function scheduleAppNotification({
  userId,
  dueAt,
  type = 'reminder',
  title,
  body = null,
  emoji = '🔔',
  actionUrl = '/',
  sourceType = 'reminders',
  sourceId = null,
  priority = 'normal',
  data = {},
}) {
  if (!userId || !dueAt || !title) return { ok:false, error:'missing_fields' }
  const { data: row, error } = await supabase
    .from('scheduled_notifications')
    .insert({
      user_id: userId,
      due_at: dueAt instanceof Date ? dueAt.toISOString() : dueAt,
      type,
      title,
      body,
      emoji,
      action_url: actionUrl,
      source_type: sourceType,
      source_id: sourceId,
      priority,
      data,
      status: 'pending',
    })
    .select('id')
    .single()
  if (error) return { ok:false, error:error.message }
  return { ok:true, id:row?.id }
}

export async function scheduleMedicationReminders({ userId, med, lang = 'ru', daysAhead = 7 }) {
  const times = Array.isArray(med?.times) ? med.times : []
  if (!userId || !med?.id || !times.length) return { ok:false, count:0, error:'no_times' }
  const rows = []
  const now = new Date()
  for (let day = 0; day < daysAhead; day += 1) {
    for (const time of times) {
      const first = nextDateTimeForClock(time, now)
      if (!first) continue
      const due = new Date(first)
      due.setDate(first.getDate() + day)
      rows.push({
        user_id: userId,
        due_at: due.toISOString(),
        type: 'med_reminder',
        title: lang === 'en' ? 'Medication reminder' : 'Напоминание о препарате',
        body: lang === 'en' ? `Time to take: ${med.name}` : `Время принять: ${med.name}`,
        emoji: '💊',
        source_type: 'medications',
        source_id: String(med.id),
        action_url: '/health',
        priority: 'high',
        data: { medId: med.id, medName: med.name, time },
        status: 'pending',
      })
    }
  }
  if (!rows.length) return { ok:false, count:0, error:'no_valid_times' }
  const { error } = await supabase.from('scheduled_notifications').insert(rows)
  if (error) return { ok:false, count:0, error:error.message }
  return { ok:true, count:rows.length }
}

export const DAILY_REMINDER_TYPES = ['daily_checkin', 'daily_sport', 'daily_nutrition']

export function defaultDailyReminderSettings(lang = 'ru') {
  return {
    checkin: { enabled: true, time: '09:30' },
    sport: { enabled: false, time: '18:30' },
    nutrition: { enabled: false, time: '10:00' },
    language: lang,
  }
}

function dailyReminderRow({ userId, key, time, lang = 'ru' }) {
  const isEn = lang === 'en'
  const due = nextDateTimeForClock(time || '09:30')
  const map = {
    checkin: {
      type: 'daily_checkin', emoji: '🌙', action_url: '/today',
      title: isEn ? 'Daily check-in' : 'Ежедневная отметка',
      body: isEn ? 'Log your mood, energy and wellbeing.' : 'Отметь настроение, энергию и самочувствие.',
    },
    sport: {
      type: 'daily_sport', emoji: '🏃', action_url: '/sport',
      title: isEn ? 'Movement check' : 'Отметь активность',
      body: isEn ? 'Log sport, stretching or rest so advice stays relevant.' : 'Отметь спорт, растяжку или отдых, чтобы советы были точнее.',
    },
    nutrition: {
      type: 'daily_nutrition', emoji: '🥗', action_url: '/nutrition',
      title: isEn ? 'Nutrition check' : 'Питание на сегодня',
      body: isEn ? 'Check your meal plan or update nutrition notes.' : 'Проверь меню или отметь питание на сегодня.',
    },
  }
  const item = map[key]
  if (!item || !due) return null
  return {
    user_id: userId,
    due_at: due.toISOString(),
    type: item.type,
    title: item.title,
    body: item.body,
    emoji: item.emoji,
    source_type: 'daily_reminders',
    source_id: key,
    action_url: item.action_url,
    priority: 'normal',
    data: { recurring: 'daily', reminderKey: key, time, language: lang },
    status: 'pending',
  }
}

export async function rescheduleDailyReminderSettings({ userId, settings, lang = 'ru' }) {
  if (!userId) return { ok:false, error:'no_user' }
  const clean = settings || defaultDailyReminderSettings(lang)
  await supabase
    .from('scheduled_notifications')
    .delete()
    .eq('user_id', userId)
    .eq('source_type', 'daily_reminders')
    .eq('status', 'pending')

  const rows = []
  if (clean.checkin?.enabled) rows.push(dailyReminderRow({ userId, key:'checkin', time:clean.checkin.time || '09:30', lang }))
  if (clean.sport?.enabled) rows.push(dailyReminderRow({ userId, key:'sport', time:clean.sport.time || '18:30', lang }))
  if (clean.nutrition?.enabled) rows.push(dailyReminderRow({ userId, key:'nutrition', time:clean.nutrition.time || '10:00', lang }))

  const finalRows = rows.filter(Boolean)
  if (finalRows.length) {
    const { error } = await supabase.from('scheduled_notifications').insert(finalRows)
    if (error) return { ok:false, error:error.message }
  }

  const { data: profileData } = await supabase.from('profiles').select('health').eq('id', userId).maybeSingle()
  const nextHealth = { ...(profileData?.health || {}), daily_reminders: clean }
  await supabase.from('profiles').update({ health: nextHealth }).eq('id', userId)
  return { ok:true, count:finalRows.length }
}
