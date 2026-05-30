import { supabase } from './supabase'
import {
  buildDateRange,
  getDayState,
  groupScoreForDate,
  adviceForScore,
} from './socialPlanning'

export const DEFAULT_SHARED_PERMISSIONS = {
  can_view_status: true,
  can_view_availability: true,
  can_view_calendar: false,
  can_view_mood: false,
  can_view_sport: false,
  can_view_cycle_summary: false,
  can_view_period_days: false,
  can_view_tags: false,
  can_view_notes: false,
  can_view_medications: false,
  can_view_pregnancy: false,
  can_receive_cycle_notifications: false,
  can_receive_ai_advice: false,
}

export function normalizePermissions(raw = {}) {
  return {
    ...DEFAULT_SHARED_PERMISSIONS,
    ...(raw || {}),
  }
}

export function hasCalendarAccess(permissions = {}) {
  const p = normalizePermissions(permissions)

  return Boolean(
    p.can_view_calendar ||
    p.can_view_cycle_summary ||
    p.can_view_period_days ||
    p.can_view_mood ||
    p.can_view_sport ||
    p.can_view_tags ||
    p.can_view_notes ||
    p.can_view_medications ||
    p.can_view_pregnancy
  )
}

export function getPublicStatusFromDay(day = {}) {
  const cycleType = day.cycle_type || day.cycleType || null
  const mood = day.mood || day.mood_type || null

  if (cycleType === 'period') return 'period'
  if (cycleType === 'pms') return 'pms'
  if (cycleType === 'ovulation') return 'ovulation'
  if (cycleType === 'fertile') return 'fertile'

  if (mood) return mood

  return day.public_status || day.status || 'calm'
}

export function buildMaskedSharedDay({
  date,
  permissions = {},
  rawDay = {},
  sportLog = null,
}) {
  const p = normalizePermissions(permissions)
  const canSeeDetailedCalendar = hasCalendarAccess(p)
  const publicStatus = getPublicStatusFromDay(rawDay)

  const visibleCycleType =
    p.can_view_period_days || p.can_view_cycle_summary || p.can_view_calendar
      ? rawDay.cycle_type || rawDay.cycleType || null
      : null

  const visibleMood =
    p.can_view_mood || p.can_view_calendar
      ? rawDay.mood || rawDay.mood_type || null
      : null

  const visibleSport =
    p.can_view_sport || p.can_view_calendar
      ? sportLog
      : null

  const state = getDayState({
    cycleType: visibleCycleType || publicStatus,
    mood: visibleMood || publicStatus,
    sportLog: visibleSport,
    hasCalendarAccess: canSeeDetailedCalendar,
  })

  return {
    date,
    permissions: p,
    hasCalendarAccess: canSeeDetailedCalendar,
    publicStatus,
    state,
    visible: {
      cycleType: visibleCycleType,
      mood: visibleMood,
      sportLog: visibleSport,
      tags: p.can_view_tags || p.can_view_calendar ? rawDay.tags || [] : [],
      notes: p.can_view_notes || p.can_view_calendar ? rawDay.notes || rawDay.note || '' : '',
      medications: p.can_view_medications || p.can_view_calendar ? rawDay.medications || [] : [],
      pregnancy: p.can_view_pregnancy || p.can_view_calendar ? rawDay.pregnancy || null : null,
    },
  }
}

export async function getSharedPermissions(ownerId, viewerId) {
  if (!ownerId || !viewerId) return normalizePermissions()

  const { data, error } = await supabase
    .from('sharing_permissions')
    .select('*')
    .eq('owner_id', ownerId)
    .eq('viewer_id', viewerId)
    .maybeSingle()

  if (error) {
    console.warn('getSharedPermissions error:', error)
    return normalizePermissions()
  }

  return normalizePermissions(data)
}

export async function saveSharedPermissions(ownerId, viewerId, permissions = {}) {
  if (!ownerId || !viewerId) {
    throw new Error('ownerId and viewerId are required')
  }

  const payload = {
    owner_id: ownerId,
    viewer_id: viewerId,
    ...normalizePermissions(permissions),
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('sharing_permissions')
    .upsert(payload, {
      onConflict: 'owner_id,viewer_id',
    })
    .select()
    .maybeSingle()

  if (error) throw error

  return normalizePermissions(data)
}

export async function fetchSharedCalendarViaRpc({
  ownerId,
  viewerId,
  fromDate,
  toDate,
}) {
  if (!ownerId || !viewerId) return []

  const { data, error } = await supabase.rpc('get_shared_calendar', {
    target_user_id: ownerId,
    viewer_user_id: viewerId,
    from_date: fromDate,
    to_date: toDate,
  })

  if (error) {
    console.warn('get_shared_calendar rpc error:', error)
    return []
  }

  return Array.isArray(data) ? data : []
}

export async function fetchSharedCalendar({
  ownerId,
  viewerId,
  days = 21,
  skipPermissions = false,
}) {
  // Получаем viewerId из сессии если не передан
  if (!viewerId) {
    const { data } = await supabase.auth.getUser()
    viewerId = data?.user?.id
  }
  if (!viewerId || !ownerId) return []

  const dates = buildDateRange(days)
  const fromDate = dates[0]
  const toDate = dates[dates.length - 1]

  const permissions = skipPermissions
    ? { can_view_status: true, can_view_calendar: true, can_view_mood: true }
    : await getSharedPermissions(ownerId, viewerId)

  const rpcDays = await fetchSharedCalendarViaRpc({
    ownerId,
    viewerId,
    fromDate,
    toDate,
  })

  const byDate = new Map()

  for (const day of rpcDays) {
    const date = day.date || day.day || day.log_date
    if (!date) continue

    byDate.set(date, {
      ...day,
      cycle_type: day.cycle_type || day.cycleType || day.public_status || null,
      mood: day.mood || day.mood_type || day.public_status || null,
      tags: day.tags || [],
      notes: day.notes || day.note || '',
    })
  }

  return dates.map(date => {
    const rawDay = byDate.get(date) || {
      date,
      public_status: 'calm',
    }

    return buildMaskedSharedDay({
      date,
      permissions,
      rawDay,
      sportLog: rawDay.sport_log || rawDay.sportLog || null,
    })
  })
}

export async function fetchSharedCalendarMap({
  people = [],
  viewerId,
  days = 21,
  // Legacy API поддержка (вызов из SyncPage)
  supabase: _supabase,
  ownerId: legacyOwnerId,
  dates: legacyDates,
  hasCalendarAccess: legacyAccess,
} = {}) {
  const result = {}

  // Legacy вызов: fetchSharedCalendarMap({ supabase, ownerId, dates, hasCalendarAccess })
  if (legacyOwnerId) {
    const daysCount = legacyDates?.length || 21
    const sharedDays = await fetchSharedCalendar({
      ownerId: legacyOwnerId,
      viewerId: viewerId || (await getCurrentUserId()),
      days: daysCount,
      skipPermissions: legacyAccess === true,
    })
    result[legacyOwnerId] = sharedDays
    return result
  }

  if (!viewerId || !Array.isArray(people) || people.length === 0) {
    return result
  }

  await Promise.all(
    people.map(async person => {
      const ownerId =
        person.id ||
        person.user_id ||
        person.related_user_id ||
        person.profile_id

      if (!ownerId) return

      const sharedDays = await fetchSharedCalendar({
        ownerId,
        viewerId,
        days,
      })

      result[ownerId] = sharedDays
    })
  )

  return result
}

// Хелпер для получения текущего userId
async function getCurrentUserId() {
  const { data } = await supabase.auth.getUser()
  return data?.user?.id || null
}

export function buildPersonPlanWindows({
  sharedDays = [],
  planType = 'cafe',
  lang = 'ru',
}) {
  return sharedDays
    .map(day => {
      const scoreInfo = groupScoreForDate([day.state], planType)

      return {
        date: day.date,
        score: scoreInfo.score,
        level: scoreInfo.level,
        reasons: scoreInfo.reasons,
        advice: adviceForScore(scoreInfo, planType, lang),
        day,
      }
    })
    .sort((a, b) => b.score - a.score)
}

export function buildGroupPlanWindows({
  membersSharedDays = [],
  planType = 'cafe',
  lang = 'ru',
}) {
  const dates = buildDateRange(21)

  return dates
    .map(date => {
      const states = membersSharedDays
        .map(member => {
          const day = member.days?.find(d => d.date === date)
          return day?.state || null
        })
        .filter(Boolean)

      const scoreInfo = groupScoreForDate(states, planType)

      return {
        date,
        score: scoreInfo.score,
        level: scoreInfo.level,
        reasons: scoreInfo.reasons,
        advice: adviceForScore(scoreInfo, planType, lang),
        members: membersSharedDays.map(member => ({
          ...member,
          day: member.days?.find(d => d.date === date) || null,
        })),
      }
    })
    .sort((a, b) => b.score - a.score)
}

export function sharedAccessLabel(permissions = {}, lang = 'ru') {
  const p = normalizePermissions(permissions)
  const rl = (ru, en) => (lang === 'en' ? en : ru)

  if (p.can_view_calendar) {
    return rl('Полный календарь', 'Full calendar')
  }

  if (p.can_view_period_days || p.can_view_cycle_summary) {
    return rl('Календарь цикла', 'Cycle calendar')
  }

  if (p.can_view_mood && p.can_view_sport) {
    return rl('Настроение и активность', 'Mood and activity')
  }

  if (p.can_view_availability || p.can_view_status) {
    return rl('Только общий статус', 'Status only')
  }

  return rl('Нет доступа', 'No access')
}

export function canSuggestPlan(permissions = {}) {
  const p = normalizePermissions(permissions)

  return Boolean(
    p.can_view_availability ||
    p.can_view_status ||
    hasCalendarAccess(p)
  )
}