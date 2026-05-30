
import { supabase } from './supabase'
import { getDayState, labelForStatus, groupScoreForDate, bestPlanForStates } from './socialPlanning'
import { predictCycle, getDetailedPhaseForDate } from './cyclePredictor'

export const CYCLE_TYPES = ['period', 'pms', 'ovulation', 'fertile', 'follicular', 'luteal', 'regular']

export function toDateKey(value) {
  const d = value instanceof Date ? new Date(value) : new Date(String(value) + 'T00:00:00')
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayKey() {
  return toDateKey(new Date())
}

export function addDays(value, days) {
  const d = value instanceof Date ? new Date(value) : new Date(String(value) + 'T00:00:00')
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + days)
  return d
}

export function addMonths(monthDate, delta) {
  const d = monthDate instanceof Date ? new Date(monthDate) : new Date(String(monthDate) + 'T00:00:00')
  d.setDate(1)
  d.setMonth(d.getMonth() + delta)
  return d
}

export function monthTitle(monthDate, lang = 'ru') {
  const d = monthDate instanceof Date ? monthDate : new Date(String(monthDate) + 'T00:00:00')
  const title = d.toLocaleDateString(lang === 'en' ? 'en-US' : 'ru-RU', { month: 'long', year: 'numeric' })
  return title.charAt(0).toUpperCase() + title.slice(1)
}

export function shortDay(dateKey) {
  return Number(String(dateKey).slice(8, 10))
}

export function monthGridDates(monthDate) {
  const first = monthDate instanceof Date ? new Date(monthDate) : new Date(String(monthDate) + 'T00:00:00')
  first.setDate(1)
  first.setHours(0, 0, 0, 0)
  const start = new Date(first)
  const weekday = start.getDay() || 7
  start.setDate(start.getDate() - weekday + 1)

  const last = new Date(first)
  last.setMonth(first.getMonth() + 1)
  last.setDate(0)
  const end = new Date(last)
  const endWeekday = end.getDay() || 7
  end.setDate(end.getDate() + (7 - endWeekday))

  const dates = []
  const cursor = new Date(start)
  while (cursor <= end) {
    dates.push(toDateKey(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return dates
}

export function normalizePermission(row, relationType) {
  const isPartner = relationType === 'partner'
  return {
    can_view_status: row?.can_view_status ?? true,
    can_view_calendar: row?.can_view_calendar ?? isPartner,
    can_view_mood: row?.can_view_mood ?? isPartner,
    can_view_cycle_summary: row?.can_view_cycle_summary ?? false,
    can_view_period_days: row?.can_view_period_days ?? false,
    can_view_sport: row?.can_view_sport ?? isPartner,
    can_view_notes: row?.can_view_notes ?? false,
    can_view_medications: row?.can_view_medications ?? false,
  }
}

export function canSeeCycle(perm = {}) {
  return Boolean(perm?.can_view_calendar || perm?.can_view_period_days || perm?.can_view_cycle_summary)
}

function pickCycleType(rows = []) {
  for (const type of CYCLE_TYPES) {
    if (rows.some(row => row.type === type || row.cycle_type === type || row.cycleType === type)) return type
  }
  return rows[0]?.type || rows[0]?.cycle_type || rows[0]?.cycleType || null
}

function buildHistoryFromPeriodRows(periodRows = [], health = {}) {
  const sorted = [...periodRows].filter(row => row?.date).sort((a, b) => String(a.date).localeCompare(String(b.date)))
  if (!sorted.length) return []
  const groups = []
  let group = [sorted[0].date]

  for (let i = 1; i < sorted.length; i += 1) {
    const prev = new Date(sorted[i - 1].date + 'T00:00:00')
    const cur = new Date(sorted[i].date + 'T00:00:00')
    const diff = Math.round((cur - prev) / (1000 * 60 * 60 * 24))
    if (diff <= 2) group.push(sorted[i].date)
    else {
      groups.push(group)
      group = [sorted[i].date]
    }
  }
  groups.push(group)

  const avgPeriodLength = Math.max(1, Math.min(10, Number(health?.avg_period_length || health?.period_length || 5) || 5))

  return groups.map((g, idx) => {
    const start = g[0]
    const end = g.length === 1 ? toDateKey(addDays(start, avgPeriodLength - 1)) : g[g.length - 1]
    const prevStart = idx > 0 ? groups[idx - 1][0] : null
    const cycleLen = prevStart
      ? Math.round((new Date(start + 'T00:00:00') - new Date(prevStart + 'T00:00:00')) / (1000 * 60 * 60 * 24))
      : null
    return {
      period_start: start,
      period_end: end,
      cycle_length: cycleLen && cycleLen > 10 && cycleLen < 60 ? cycleLen : null,
    }
  })
}

function predictedTypeForDate(date, prediction) {
  if (!prediction?.predictions?.length) return null
  const phase = getDetailedPhaseForDate(date, prediction.predictions)
  const type = phase?.type || phase?.basic?.type || null
  return type === 'regular' ? null : type
}

export async function loadOwnerDays({ ownerId, dates, permissions, isSelf = false }) {
  const startDate = dates[0]
  const endDate = dates[dates.length - 1]
  const p = permissions || {}
  const allowCycle = isSelf || canSeeCycle(p)
  const allowMood = isSelf || p.can_view_calendar || p.can_view_mood
  const allowSport = isSelf || p.can_view_calendar || p.can_view_sport

  const [cycleRes, historyRes, moodRes, sportRes, profileRes] = await Promise.all([
    allowCycle ? supabase.from('cycle_entries').select('date,type').eq('user_id', ownerId).gte('date', startDate).lte('date', endDate) : Promise.resolve({ data: [], error: null }),
    allowCycle ? supabase.from('cycle_entries').select('date,type').eq('user_id', ownerId).eq('type', 'period').order('date') : Promise.resolve({ data: [], error: null }),
    allowMood ? supabase.from('mood_entries').select('date,mood').eq('user_id', ownerId).gte('date', startDate).lte('date', endDate).order('created_at', { ascending:false }) : Promise.resolve({ data: [], error: null }),
    allowSport ? supabase.from('sport_logs').select('date,workouts,intensity,duration').eq('user_id', ownerId).gte('date', startDate).lte('date', endDate) : Promise.resolve({ data: [], error: null }),
    allowCycle ? supabase.from('profiles').select('health').eq('id', ownerId).maybeSingle() : Promise.resolve({ data: null, error: null }),
  ])

  if (cycleRes.error) console.warn('cycle_entries read error', ownerId, cycleRes.error)
  if (historyRes.error) console.warn('cycle_entries history read error', ownerId, historyRes.error)
  if (moodRes.error) console.warn('mood_entries read error', ownerId, moodRes.error)
  if (sportRes.error) console.warn('sport_logs read error', ownerId, sportRes.error)
  if (profileRes.error) console.warn('profiles health read error', ownerId, profileRes.error)

  const cycleByDate = {}
  ;(cycleRes.data || []).forEach(row => {
    if (!cycleByDate[row.date]) cycleByDate[row.date] = []
    cycleByDate[row.date].push(row)
  })

  const moodByDate = {}
  ;(moodRes.data || []).forEach(row => {
    if (!moodByDate[row.date]) moodByDate[row.date] = []
    if (row.mood) moodByDate[row.date].push(row.mood)
  })

  const sportByDate = {}
  ;(sportRes.data || []).forEach(row => { sportByDate[row.date] = row })

  let prediction = null
  if (allowCycle) {
    const history = buildHistoryFromPeriodRows(historyRes.data || [], profileRes.data?.health || {})
    if (history.length >= 1) {
      try { prediction = predictCycle(history) }
      catch (err) { console.warn('cycle prediction error', ownerId, err) }
    }
  }

  const out = {}
  dates.forEach(date => {
    const actualCycleType = allowCycle ? pickCycleType(cycleByDate[date] || []) : null
    const predictedCycleType = allowCycle ? predictedTypeForDate(date, prediction) : null
    const cycleType = actualCycleType || predictedCycleType
    const mood = allowMood ? (moodByDate[date]?.[0] || null) : null
    const sportLog = allowSport ? (sportByDate[date] || null) : null
    out[date] = getDayState({ cycleType, mood, sportLog, hasCalendarAccess: allowCycle || allowMood || allowSport })
    out[date].cycleType = cycleType
    out[date].mood = mood
  })
  return out
}

export function statusVisual(status) {
  switch (status) {
    case 'period': return { bg:'rgba(248,113,113,0.14)', border:'rgba(248,113,113,0.35)', dot:'#fb7185' }
    case 'pms': return { bg:'rgba(148,163,184,0.10)', border:'rgba(148,163,184,0.25)', dot:'#94a3b8' }
    case 'ovulation': return { bg:'rgba(250,204,21,0.16)', border:'rgba(250,204,21,0.35)', dot:'#facc15' }
    case 'fertile': return { bg:'rgba(74,222,128,0.14)', border:'rgba(74,222,128,0.32)', dot:'#86efac' }
    case 'follicular': return { bg:'rgba(96,165,250,0.10)', border:'rgba(96,165,250,0.22)', dot:'#93c5fd' }
    case 'luteal': return { bg:'rgba(168,85,247,0.10)', border:'rgba(168,85,247,0.22)', dot:'#c084fc' }
    case 'happy':
    case 'calm':
    case 'romantic': return { bg:'rgba(250,204,21,0.12)', border:'rgba(250,204,21,0.20)', dot:'#facc15' }
    default: return { bg:'var(--bg2)', border:'var(--border)', dot:'rgba(255,255,255,0.18)' }
  }
}

export function CircleMonthCalendar({
  monthDate,
  daily = {},
  contacts = [],
  dailyByUser = {},
  myDaily = {},
  planType = 'cafe',
  mode = 'person',
  lang = 'ru',
  showScore = false,
  selectedDate = null,
  onDayClick,
  showBestPlan = false,
}) {
  const dates = monthGridDates(monthDate)
  const currentMonth = monthDate.getMonth()
  const weekLabels = lang === 'en' ? ['Mo','Tu','We','Th','Fr','Sa','Su'] : ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']
  const today = todayKey()

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:6, marginBottom:8 }}>
        {weekLabels.map(w => <div key={w} style={{ textAlign:'center', color:'var(--text3)', fontSize:11 }}>{w}</div>)}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7, minmax(0, 1fr))', gap:7 }}>
        {dates.map(date => {
          const d = new Date(date + 'T00:00:00')
          const isOtherMonth = d.getMonth() !== currentMonth
          const personState = daily[date]
          const states = mode === 'group'
            ? [myDaily[date], ...contacts.map(c => dailyByUser[c.user_id]?.[date] || getDayState({ hasCalendarAccess:false }))].filter(Boolean)
            : [personState].filter(Boolean)
          const score = showScore ? groupScoreForDate(states, planType) : null
          const best = showBestPlan ? bestPlanForStates(states, lang) : null
          const status = personState?.status || null
          const visual = mode === 'group' && showScore
            ? (score.level === 'good' ? { bg:'rgba(74,222,128,0.16)', border:'rgba(74,222,128,0.34)', dot:'#86efac' } : score.level === 'ok' ? { bg:'rgba(250,204,21,0.12)', border:'rgba(250,204,21,0.26)', dot:'#facc15' } : statusVisual(status))
            : statusVisual(status)
          const active = selectedDate === date
          return (
            <button key={date} type="button" onClick={() => onDayClick?.(date)} style={{
              minHeight:78,
              borderRadius:14,
              padding:'8px 7px',
              background:active ? 'linear-gradient(135deg, rgba(255,255,255,0.16), rgba(255,255,255,0.05))' : visual.bg,
              border:`1px solid ${active ? 'rgba(255,255,255,0.86)' : date === today ? 'rgba(255,255,255,0.62)' : visual.border}`,
              opacity:isOtherMonth ? 0.42 : 1,
              display:'flex',
              flexDirection:'column',
              gap:4,
              overflow:'hidden',
              cursor:onDayClick ? 'pointer' : 'default',
              textAlign:'left',
              color:'inherit',
              boxShadow:active ? '0 12px 28px rgba(0,0,0,0.30)' : 'none',
            }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:4 }}>
                <strong style={{ fontSize:14, color:'var(--text)' }}>{shortDay(date)}</strong>
                <span style={{ width:6, height:6, borderRadius:'50%', background:visual.dot, flexShrink:0 }} />
              </div>
              {mode === 'group' && showScore ? (
                <>
                  <div style={{ fontSize:10, color:score.level === 'good' ? '#86efac' : 'var(--text3)', lineHeight:1.25 }}>{score.score}%</div>
                  {best?.plan && <div style={{ fontSize:10, color:'var(--text2)', lineHeight:1.2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{best.plan.emoji} {lang === 'en' ? best.plan.en : best.plan.ru}</div>}
                </>
              ) : (
                <>
                  <div style={{ fontSize:10, color:'var(--text3)', lineHeight:1.25 }}>{labelForStatus(status, lang)}</div>
                  {best?.plan && <div style={{ fontSize:10, color:'var(--text2)', lineHeight:1.2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{best.plan.emoji} {lang === 'en' ? best.plan.en : best.plan.ru}</div>}
                </>
              )}
              {mode === 'group' && contacts.length > 0 && (
                <div style={{ display:'flex', gap:2, marginTop:'auto' }}>
                  {contacts.slice(0, 5).map(c => {
                    const s = dailyByUser[c.user_id]?.[date]?.status
                    return <span key={c.user_id} title={c.name} style={{ width:5, height:5, borderRadius:'50%', background:statusVisual(s).dot, opacity:s ? 1 : 0.25 }} />
                  })}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function PrettyButton({ children, onClick, variant = 'ghost', style = {}, disabled = false }) {
  const primary = variant === 'primary'
  return (
    <button onClick={onClick} disabled={disabled} style={{
      border: primary ? '1px solid rgba(255,255,255,0.55)' : '1px solid rgba(255,255,255,0.12)',
      borderRadius:16,
      background: primary
        ? 'linear-gradient(135deg, rgba(255,255,255,0.92), rgba(255,255,255,0.72))'
        : 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
      color: primary ? '#0a0a0a' : 'var(--text)',
      boxShadow: primary ? '0 14px 32px rgba(0,0,0,0.24)' : '0 10px 24px rgba(0,0,0,0.18)',
      padding:'11px 14px',
      cursor:disabled ? 'not-allowed' : 'pointer',
      fontSize:13,
      fontWeight:600,
      display:'inline-flex',
      alignItems:'center',
      justifyContent:'center',
      gap:8,
      opacity:disabled ? 0.55 : 1,
      ...style,
    }}>{children}</button>
  )
}
