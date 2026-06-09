import { supabase } from './supabase'
import { createNotification } from './useNotifications'

function unique(list) {
  return Array.from(new Set((list || []).filter(Boolean)))
}

async function safeSelect(query) {
  try {
    const { data, error } = await query
    if (error) return []
    return data || []
  } catch {
    return []
  }
}

export async function getCircleRecipients(userId, { includeGroups = true } = {}) {
  if (!userId) return []

  const directRows = await safeSelect(
    supabase
      .from('friendships')
      .select('friend_id, relation_type, is_visible')
      .eq('owner_id', userId)
      .eq('is_visible', true)
  )

  const recipients = directRows.map(row => row.friend_id)

  if (includeGroups) {
    const myGroups = await safeSelect(
      supabase.from('groups').select('id').eq('owner_id', userId)
    )
    const myGroupIds = myGroups.map(g => g.id)

    if (myGroupIds.length) {
      const memberRows = await safeSelect(
        supabase.from('group_members').select('user_id').in('group_id', myGroupIds)
      )
      recipients.push(...memberRows.map(row => row.user_id))
    }

    const memberGroups = await safeSelect(
      supabase.from('group_members').select('group_id').eq('user_id', userId)
    )
    const memberGroupIds = memberGroups.map(g => g.group_id)

    if (memberGroupIds.length) {
      const groupRows = await safeSelect(
        supabase.from('groups').select('id, owner_id').in('id', memberGroupIds)
      )
      recipients.push(...groupRows.map(row => row.owner_id))

      const peerRows = await safeSelect(
        supabase.from('group_members').select('user_id').in('group_id', memberGroupIds)
      )
      recipients.push(...peerRows.map(row => row.user_id))
    }
  }

  return unique(recipients).filter(id => id !== userId)
}

export function changeTitle(changeType, name, lang = 'ru') {
  const who = name || (lang === 'en' ? 'Someone' : 'Кто-то')
  const map = {
    day_status: [
      `${who} обновил(а) самочувствие`,
      `${who} updated their wellbeing`,
    ],
    mood: [
      `${who} добавил(а) отметку настроения`,
      `${who} logged a mood mark`,
    ],
    cycle: [
      `${who} обновил(а) календарь`,
      `${who} updated the calendar`,
    ],
    sport: [
      `${who} сохранил(а) активность`,
      `${who} saved an activity`,
    ],
    weight: [
      `${who} обновил(а) вес`,
      `${who} updated weight`,
    ],
    intimacy: [
      `${who} обновил(а) личную отметку`,
      `${who} updated a private log`,
    ],
  }
  const pair = map[changeType] || [`${who} обновил(а) данные`, `${who} updated data`]
  return lang === 'en' ? pair[1] : pair[0]
}

export function changeBody(changeType, details = {}, lang = 'ru') {
  if (changeType === 'day_status') {
    return lang === 'en'
      ? `Energy ${details.energy ?? '-'}, mood ${details.mood ?? '-'}, pain ${details.pain ?? '-'}. Open Circle to see shared details.`
      : `Энергия ${details.energy ?? '-'}, настроение ${details.mood ?? '-'}, боль ${details.pain ?? '-'}. Открой круг, чтобы посмотреть доступные детали.`
  }
  if (changeType === 'sport') {
    return lang === 'en'
      ? `Activity was saved for today. Open Circle or profile to view shared details.`
      : `Активность сохранена на сегодня. Открой круг или профиль, чтобы посмотреть доступные детали.`
  }
  if (changeType === 'cycle') {
    return lang === 'en'
      ? `Calendar mark changed for ${details.date || 'a day'}.`
      : `Отметка календаря изменена: ${details.date || 'день'}.`
  }
  if (changeType === 'mood') {
    return lang === 'en'
      ? `Mood mark: ${details.mood || 'updated'}.`
      : `Отметка настроения: ${details.mood || 'обновлена'}.`
  }
  if (changeType === 'weight') {
    return lang === 'en'
      ? `Weight history was updated. Shared viewers will see it only where access allows.`
      : `История веса обновлена. Видно только там, где есть доступ.`
  }
  return lang === 'en' ? 'Open Elara to see the update.' : 'Открой Elara, чтобы посмотреть обновление.'
}

export async function notifyCircleChange({ userId, profile, changeType, details = {}, lang = 'ru', actionUrl = '/friends' }) {
  if (!userId) return []
  const recipients = await getCircleRecipients(userId)
  if (!recipients.length) return []
  const title = changeTitle(changeType, profile?.name, lang)
  const body = changeBody(changeType, details, lang)
  await Promise.all(recipients.map(rid => createNotification(rid, {
    type: `circle_${changeType}`,
    title,
    body,
    emoji: changeType === 'sport' ? '🏃' : changeType === 'weight' ? '⚖️' : changeType === 'cycle' ? '◯' : '💫',
    sourceType: 'friends',
    sourceId: userId,
    actionUrl,
    priority: 'normal',
  })))
  return recipients
}
