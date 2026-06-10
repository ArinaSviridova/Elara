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
