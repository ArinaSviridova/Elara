import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang, useRl } from '../context/LangContext'
import { predictCycle, getPhaseForDate, getDetailedPhaseForDate, detectStmWindow } from '../lib/cyclePredictor'
import AIAdvice from '../components/AIAdvice'
import InsightsWidget from '../components/InsightsWidget'
import MigraineWidget from '../components/MigraineWidget'
import AnemiaWidget from '../components/AnemiaWidget'
import { resolveProfileModules } from '../lib/profileModules'
import { CALENDAR_LAYERS, layerLabel, resolveCalendarConfig } from '../lib/calendarMode'
import DayPanel from '../components/DayPanel'
import DayStatusWidget from '../components/DayStatusWidget'
import NoPeriodPage from './NoPeriodPage'
import PregnancyPage from './PregnancyPage'

const PREGNANCY_META = {
  kicks:       { color: '#f472b6', emoji: '👶', labelRu: 'Шевеления', labelEn: 'Kicks' },
  symptoms:    { color: '#fb923c', emoji: '🤰', labelRu: 'Симптомы', labelEn: 'Symptoms' },
  appointment: { color: '#60a5fa', emoji: '🏥', labelRu: 'Приём врача', labelEn: 'Doctor' },
  ultrasound:  { color: '#a78bfa', emoji: '🔊', labelRu: 'УЗИ', labelEn: 'Ultrasound' },
  vitamins:    { color: '#4ade80', emoji: '💊', labelRu: 'Витамины', labelEn: 'Vitamins' },
}

const TYPE_META = {
  period:    { color: '#f87171', emoji: '🩸', labelRu: 'Менструация', labelEn: 'Period' },
  pms:       { color: '#fb923c', emoji: '🌧', labelRu: 'ПМС',         labelEn: 'PMS' },
  ovulation: { color: '#facc15', emoji: '✨', labelRu: 'Овуляция',    labelEn: 'Ovulation' },
  fertile:   { color: '#4ade80', emoji: '🌿', labelRu: 'Фертильные',  labelEn: 'Fertile' },
}

const PHASE_META = {
  period:     { color: '#f87171', emoji: '🩸', labelRu: 'Менструация', labelEn: 'Period', shortRu: 'Менстр.', shortEn: 'Period' },
  pms:        { color: '#fb923c', emoji: '🌧', labelRu: 'ПМС', labelEn: 'PMS', shortRu: 'ПМС', shortEn: 'PMS' },
  ovulation:  { color: '#facc15', emoji: '✨', labelRu: 'Овуляция', labelEn: 'Ovulation', shortRu: 'Овул.', shortEn: 'Ovul.' },
  fertile:    { color: '#4ade80', emoji: '🌿', labelRu: 'Фертильные дни', labelEn: 'Fertile days', shortRu: 'Ферт.', shortEn: 'Fertile' },
  follicular: { color: '#60a5fa', emoji: '🌱', labelRu: 'Фолликулярная фаза', labelEn: 'Follicular phase', shortRu: 'Фоллик.', shortEn: 'Follic.' },
  luteal:     { color: '#c084fc', emoji: '🌙', labelRu: 'Лютеиновая фаза', labelEn: 'Luteal phase', shortRu: 'Лютеин.', shortEn: 'Luteal' },
  regular:    { color: '#9ca3af', emoji: '✦', labelRu: 'Обычный день', labelEn: 'Regular day', shortRu: 'Обычн.', shortEn: 'Regular' },
}

const MOOD_EMOJI = {
  happy:'😊', calm:'🌿', sad:'🌧', anxious:'💭',
  tired:'😴', irritated:'⚡', energetic:'🔥', romantic:'🌷',
  conflicted:'😤', grateful:'🙏'
}

function toKey(d) {
  // Используем локальную дату, не UTC - иначе сдвиг на день из-за таймзоны
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getMonthDays(year, month) {
  const first = new Date(year, month, 1)
  const last = new Date(year, month+1, 0)
  let dow = first.getDay(); dow = dow === 0 ? 6 : dow-1
  const days = []
  for (let i=0; i<dow; i++) days.push(null)
  for (let d=1; d<=last.getDate(); d++) days.push(new Date(year, month, d))
  return days
}

function datesBetween(start, end) {
  const dates = []
  const cur = new Date(start + 'T00:00:00') // локальное время
  const endD = new Date(end + 'T00:00:00')
  while (cur <= endD) {
    const y = cur.getFullYear()
    const m = String(cur.getMonth()+1).padStart(2,'0')
    const d = String(cur.getDate()).padStart(2,'0')
    dates.push(`${y}-${m}-${d}`)
    cur.setDate(cur.getDate()+1)
  }
  return dates
}

function buildHistoryFromEntries(periodEntries) {
  if (!periodEntries || periodEntries.length === 0) return []
  const sorted = [...periodEntries].sort((a,b) => a.date.localeCompare(b.date))
  const groups = []; let group = [sorted[0].date]
  for (let i=1; i<sorted.length; i++) {
    const diff = (new Date(sorted[i].date) - new Date(sorted[i-1].date)) / (1000*60*60*24)
    if (diff <= 2) group.push(sorted[i].date)
    else { groups.push(group); group = [sorted[i].date] }
  }
  groups.push(group)
  return groups.map((g, idx) => {
    const start = g[0]; const end = g[g.length-1]
    const prevStart = idx > 0 ? groups[idx-1][0] : null
    const cycleLen = prevStart ? Math.round((new Date(start)-new Date(prevStart))/(1000*60*60*24)) : null
    return {
      period_start: start, period_end: end,
      cycle_length: cycleLen && cycleLen > 10 && cycleLen < 60 ? cycleLen : null
    }
  })
}

function getUpcomingPhases(prediction) {
  if (!prediction) return []
  const today = new Date(); today.setHours(0,0,0,0)
  const events = []
  for (const p of prediction.predictions) {
    const ps = new Date(p.periodStart); ps.setHours(0,0,0,0)
    const pms = new Date(p.pmsStart); pms.setHours(0,0,0,0)
    const ov = new Date(p.ovulation); ov.setHours(0,0,0,0)
    const pe = new Date(p.periodEnd); pe.setHours(0,0,0,0)
    const daysToPs = Math.round((ps-today)/(1000*60*60*24))
    const daysToPms = Math.round((pms-today)/(1000*60*60*24))
    const daysToOv = Math.round((ov-today)/(1000*60*60*24))
    if (daysToPs >= 0 && daysToPs <= 90) events.push({ type:'period', days:daysToPs, date:ps })
    if (daysToPms >= 1 && daysToPms <= 90) events.push({ type:'pms', days:daysToPms, date:pms })
    if (daysToOv >= 0 && daysToOv <= 90) events.push({ type:'ovulation', days:daysToOv, date:ov })
    if (daysToPs < 0 && today <= pe) events.push({ type:'period', days:0, date:ps })
  }
  return events
    .sort((a,b) => a.days - b.days)
    .filter((e,i,arr) => arr.findIndex(x => x.type===e.type) === i)
    .slice(0, 3)
}

// Состояния режима:
// 'normal'       - обычный, тап открывает меню дня
// 'first:period' - ждём первый день менструации
// 'last:period'  - первый день выбран, ждём последний
// 'first:pms' / 'last:pms' / etc - то же для других типов
// 'del-first:period' / 'del-last:period' - удаление

export default function CalendarPage() {
  const { profile } = useAuth()
  const calendarConfig = resolveCalendarConfig(profile)

  if (calendarConfig.primaryMode === 'pregnancy') {
    return <PregnancyPage />
  }

  return <CycleCalendar calendarConfig={calendarConfig} />
}

function CycleCalendar({ calendarConfig }) {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { t, lang } = useLang()
  const activeMeta = TYPE_META
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [entries, setEntries] = useState({})
  const [moods, setMoods] = useState({})
  const [members, setMembers] = useState([])
  const [prediction, setPrediction] = useState(null)
  const [selected, setSelected] = useState(null)
  const [markMode, setMarkMode] = useState('normal')
  const [firstDay, setFirstDay] = useState(null)   // первый выбранный день
  const [activeType, setActiveType] = useState('period')
  const [quickType, setQuickType] = useState('period')
  const [quickDate, setQuickDate] = useState(toKey(new Date()))
  const [rangeStart, setRangeStart] = useState(toKey(new Date()))
  const [rangeEnd, setRangeEnd] = useState(toKey(new Date()))

  const rl = useRl()

  const [intimacyDays, setIntimacyDays] = useState({})
  const [healthSettings, setHealthSettings] = useState(profile?.health || {})
  const [showLayerSettings, setShowLayerSettings] = useState(false)
  const [dysphoriaDays, setDysphoriaDays] = useState({})
  const showCycle = calendarConfig?.showCycle
  const enabledLayers = calendarConfig?.enabledLayers || []

  const fetchData = useCallback(async () => {
    const d1 = new Date(year, month, 1)
    const d2 = new Date(year, month+1, 0)
    const pad = n => String(n).padStart(2,'0')
    const startDate = `${d1.getFullYear()}-${pad(d1.getMonth()+1)}-${pad(d1.getDate())}`
    const endDate = `${d2.getFullYear()}-${pad(d2.getMonth()+1)}-${pad(d2.getDate())}`
    const twoYearsAgo = new Date(); twoYearsAgo.setFullYear(twoYearsAgo.getFullYear()-2)
    const twoYearsAgoStr = `${twoYearsAgo.getFullYear()}-${pad(twoYearsAgo.getMonth()+1)}-${pad(twoYearsAgo.getDate())}`

    const [{ data: entriesData }, { data: moodData }, { data: membersData }, { data: allPeriods }, { data: intimacyData }, { data: profileData }] = await Promise.all([
      supabase.from('cycle_entries').select('*').gte('date', startDate).lte('date', endDate),
      supabase.from('mood_entries').select('*').eq('user_id', user.id).gte('date', startDate).lte('date', endDate),
      supabase.from('group_members').select('*, user:user_id(id, name)').eq('user_id', user.id),
      supabase.from('cycle_entries').select('date')
        .eq('user_id', user.id).eq('type', 'period')
        .order('date'),
      supabase.from('intimacy_entries').select('date,desire_level,had_sex,had_masturbation,sex_count,masturbation_count')
        .eq('user_id', user.id).gte('date', startDate).lte('date', endDate),
      supabase.from('profiles').select('health').eq('id', user.id).maybeSingle(),
    ])

    setMembers(membersData || [])
    const nextHealth = profileData?.health || profile?.health || {}
    setHealthSettings(nextHealth)

    try {
      const localDysphoria = JSON.parse(localStorage.getItem(`elara_dysphoria_logs_${user.id}`) || '{}')
      setDysphoriaDays(localDysphoria || {})
    } catch {
      setDysphoriaDays({})
    }

    // История цикла должна собираться только из МОИХ месячных.
    // Если allPeriods не вернулся из-за RLS/старой схемы, пробуем взять месячные из текущего месяца.
    // Да, это костыль, но лучше костыль, чем календарь с амнезией.
    const ownPeriodRows = (allPeriods?.length ? allPeriods : (entriesData || [])
      .filter(e => e.user_id === user.id && e.type === 'period')
      .map(e => ({ date: e.date })))
      .filter(e => e?.date)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))

    if (showCycle && ownPeriodRows.length >= 1) {
      const history = buildHistoryFromEntries(ownPeriodRows)
      const nextPrediction = predictCycle(history)
      setPrediction(nextPrediction)
    } else {
      setPrediction(null)
    }

    const map = {}
    ;(entriesData || []).forEach(e => {
      if (!map[e.date]) map[e.date] = []
      const member = (membersData || []).find(m => m.user_id === e.user_id)
      const color = e.user_id === user.id ? activeMeta[e.type]?.color : member?.member_color || '#888'
      map[e.date].push({ ...e, color })
    })
    setEntries(map)

    // Интимные дни
    const intimMap = {}
    ;(intimacyData || []).forEach(d => { intimMap[d.date] = d })
    setIntimacyDays(intimMap)

    // Храним массив настроений за день
    const moodMap = {}
    ;(moodData || []).forEach(m => {
      if (!moodMap[m.date]) moodMap[m.date] = []
      if (m.mood) moodMap[m.date].push(m.mood)
    })
    setMoods(moodMap)
  }, [year, month, user.id, profile?.health, showCycle])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    const handler = () => fetchData()
    window.addEventListener('elara:dysphoria-updated', handler)
    return () => window.removeEventListener('elara:dysphoria-updated', handler)
  }, [fetchData])

  async function toggleType(type, dateKey) {
    const existing = entries[dateKey]?.find(e => e.type===type && e.user_id===user.id)
    if (existing) {
      await supabase.from('cycle_entries').delete().eq('id', existing.id)
    } else {
      await supabase.from('cycle_entries').insert({ user_id: user.id, date: dateKey, type })
    }
    fetchData()
  }

  async function markRange(start, end, type) {
    const s = start < end ? start : end
    const e = start < end ? end : start
    const dates = datesBetween(s, e)
    await supabase.from('cycle_entries').upsert(
      dates.map(date => ({ user_id: user.id, date, type })),
      { onConflict: 'user_id,date,type', ignoreDuplicates: true }
    )
    fetchData()
  }

  async function deleteRange(start, end, type) {
    const s = start < end ? start : end
    const e = start < end ? end : start
    const dates = datesBetween(s, e)
    for (const date of dates) {
      await supabase.from('cycle_entries')
        .delete().eq('user_id', user.id).eq('date', date).eq('type', type)
    }
    fetchData()
  }

  async function markSingleDay(type, dateKey) {
    await supabase.from('cycle_entries').upsert(
      { user_id: user.id, date: dateKey, type },
      { onConflict: 'user_id,date,type', ignoreDuplicates: true }
    )
    fetchData()
  }

  async function deleteSingleDay(type, dateKey) {
    await supabase.from('cycle_entries')
      .delete().eq('user_id', user.id).eq('date', dateKey).eq('type', type)
    fetchData()
  }

  async function markQuickRange() {
    if (!rangeStart || !rangeEnd) return
    await markRange(rangeStart, rangeEnd, quickType)
  }

  async function deleteQuickRange() {
    if (!rangeStart || !rangeEnd) return
    await deleteRange(rangeStart, rangeEnd, quickType)
  }

  async function saveMood(mood) {
    const dateKey = toKey(today)
    const currentMoods = moods[dateKey] || []
    if (currentMoods.includes(mood)) {
      await supabase.from('mood_entries')
        .delete().eq('user_id', user.id).eq('date', dateKey).eq('mood', mood)
    } else {
      await supabase.from('mood_entries').insert({ user_id: user.id, date: dateKey, mood })
      // Автосохранение настроений в теги дневника
      const { data: diary } = await supabase
        .from('diary_entries').select('tags').eq('user_id', user.id).eq('date', dateKey).maybeSingle()
      const existingTags = diary?.tags || []
      const moodTag = `настроение: ${mood}`
      if (!existingTags.includes(moodTag)) {
        await supabase.from('diary_entries').upsert({
          user_id: user.id, date: dateKey,
          tags: [...existingTags.filter(t => !t.startsWith('настроение:')), moodTag],
        }, { onConflict: 'user_id,date' })
      }
    }
    fetchData()
  }

  function handleDayClick(date) {
    const key = toKey(date)

    // Ждём первый день
    if (markMode.startsWith('first:')) {
      setFirstDay(key)
      setMarkMode('last:' + markMode.slice(6))
      return
    }

    // Ждём последний день - применяем диапазон
    if (markMode.startsWith('last:')) {
      const type = markMode.slice(5)
      markRange(firstDay, key, type)
      setFirstDay(null)
      setMarkMode('normal')
      setSelected(null)
      return
    }

    // Ждём первый день удаления
    if (markMode.startsWith('del-first:')) {
      setFirstDay(key)
      setMarkMode('del-last:' + markMode.slice(10))
      return
    }

    // Ждём последний день удаления
    if (markMode.startsWith('del-last:')) {
      const type = markMode.slice(9)
      deleteRange(firstDay, key, type)
      setFirstDay(null)
      setMarkMode('normal')
      setSelected(null)
      return
    }

    // Нормальный режим - открываем меню
    setSelected(prev => prev && toKey(prev) === key ? null : date)
  }

  function startMark(type) {
    setActiveType(type)
    setMarkMode('first:' + type)
    setFirstDay(null)
    setSelected(null)
  }

  function startDelete(type) {
    setActiveType(type)
    setMarkMode('del-first:' + type)
    setFirstDay(null)
    setSelected(null)
  }

  function cancelMode() {
    setMarkMode('normal')
    setFirstDay(null)
    setSelected(null)
  }


  async function saveStmLog(dateKey, patch) {
    const currentHealth = healthSettings || {}
    const currentLogs = currentHealth.stm_logs || {}
    const prevLog = currentLogs[dateKey] || { date: dateKey }
    const nextLog = { ...prevLog, ...patch, date: dateKey }
    const nextLogs = { ...currentLogs, [dateKey]: nextLog }
    const nextHealth = { ...currentHealth, stm_logs: nextLogs }
    setHealthSettings(nextHealth)
    await supabase.from('profiles').update({ health: nextHealth }).eq('id', user.id)
  }

  function prevMonth() { if (month===0){setYear(y=>y-1);setMonth(11)}else setMonth(m=>m-1) }
  function nextMonth() { if (month===11){setYear(y=>y+1);setMonth(0)}else setMonth(m=>m+1) }

  const days = getMonthDays(year, month)
  const todayKey = toKey(today)
  const selectedKey = selected ? toKey(selected) : null
  const todayMoods = moods[todayKey] || []
  const upcomingPhases = showCycle
    ? getUpcomingPhases(prediction).filter(ev => !(calendarConfig?.hideFertilityDetails && ['ovulation', 'fertile'].includes(ev.type)))
    : []
  const stmEnabled = Boolean((calendarConfig?.showStm || healthSettings?.contraception === 'stm') && !calendarConfig?.hideFertilityDetails)
  const stmLogs = healthSettings?.stm_logs || {}
  const currentPhase = showCycle && prediction ? getDetailedPhaseForDate(today, prediction.predictions, stmEnabled ? stmLogs : {}) : null
  const isInDeleteMode = markMode.startsWith('del-')
  const isPickingDay = markMode !== 'normal'
  const isPickingLast = markMode.startsWith('last:') || markMode.startsWith('del-last:')

  function phaseLabel(type, short = false) {
    const meta = PHASE_META[type] || activeMeta[type]
    if (!meta) return type
    if (short) return lang === 'en' ? (meta.shortEn || meta.labelEn) : (meta.shortRu || meta.labelRu)
    return lang === 'en' ? meta.labelEn : meta.labelRu
  }
  function formatDate(date) {
    const d = new Date(date)
    return `${d.getDate()} ${t.months[d.getMonth()].slice(0,3).toLowerCase()}`
  }

  function normalizePhaseForDisplay(phase) {
    if (!phase) return phase
    if (calendarConfig?.hideFertilityDetails && ['ovulation', 'fertile'].includes(phase.type)) {
      return { ...phase, type: 'regular', hiddenReason: 'teen_fertility_details' }
    }
    return phase
  }

  // Подсветка диапазона пока выбираем второй день
  function isInPreviewRange(key) {
    if (!isPickingLast || !firstDay) return false
    const a = firstDay < key ? firstDay : key
    const b = firstDay < key ? key : firstDay
    return key >= a && key <= b
  }

  function toggleCalendarLayer(layerKey) {
    const currentHealth = healthSettings || {}
    const currentLayers = currentHealth.calendar_layers || {}
    const isEnabled = enabledLayers.includes(layerKey)
    const nextLayers = { ...currentLayers, [layerKey]: !isEnabled }
    const nextHealth = { ...currentHealth, calendar_layers: nextLayers }
    setHealthSettings(nextHealth)
    supabase.from('profiles').update({ health: nextHealth }).eq('id', user.id)
  }

  function getProfileDayMarkers(key) {
    const markers = []
    const assignments = healthSettings?.assignments || []
    const vaccinations = healthSettings?.vaccinations?.done || {}

    if (enabledLayers.includes('appointments')) {
      assignments.forEach(item => {
        const date = item?.date || item?.follow_up_date || item?.control_date || item?.next_date
        if (date === key) markers.push({ key:'assignment', icon:'📋', label:rl('назначение','assignment'), priority:5 })
      })
    }

    if (enabledLayers.includes('vaccines')) {
      Object.entries(vaccinations || {}).forEach(([vaccineKey, rec]) => {
        if (!rec || typeof rec === 'string') return
        if (rec.next_date === key) markers.push({ key:`vaccine-${vaccineKey}`, icon:'💉', label:rl('прививка','vaccine'), priority:6 })
        ;(rec.doses || []).forEach((dose, idx) => {
          if (!dose.done_date && dose.planned_date === key) {
            markers.push({ key:`vaccine-${vaccineKey}-${idx}`, icon:'💉', label:dose.label || rl('доза','dose'), priority:6 })
          }
        })
      })
    }

    if (enabledLayers.includes('dysphoria') && dysphoriaDays?.[key]) {
      const entry = dysphoriaDays[key]
      if (Number(entry.dysphoria_level || entry.level || 0) > 0) markers.push({ key:'dysphoria', icon:'⚧', label:rl('дисфория','dysphoria'), priority:10 })
      if (Number(entry.euphoria_level || 0) > 0) markers.push({ key:'euphoria', icon:'✨', label:rl('эйфория','euphoria'), priority:10 })
    }

    if (enabledLayers.includes('postpartum') && healthSettings?.postpartum_start) {
      const diff = Math.round((new Date(`${key}T00:00:00`) - new Date(`${healthSettings.postpartum_start}T00:00:00`)) / 86400000)
      if (diff >= 0 && diff <= 56) markers.push({ key:'postpartum', icon:'🫂', label:`${diff + 1} ${rl('день','day')}`, priority:2 })
    }

    if (enabledLayers.includes('lactation') && healthSettings?.breastfeeding) {
      markers.push({ key:'lactation', icon:'🍼', label:rl('ГВ','feeding'), priority:7 })
    }

    return markers.sort((a,b) => a.priority - b.priority)
  }

  return (
    <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', padding:'18px 16px', gap:14, overflowY:'auto' }}>

      <div className="card" style={{ padding:'14px 16px', border:'1px solid var(--border)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
          <div>
            <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em' }}>{rl('Режим календаря','Calendar mode')}</div>
            <h2 style={{ fontSize:22, marginTop:4 }}>{lang === 'en' ? calendarConfig.titleEn : calendarConfig.titleRu}</h2>
            <p style={{ fontSize:12, color:'var(--text2)', lineHeight:1.5, margin:'6px 0 0' }}>
              {lang === 'en' ? calendarConfig.subtitleEn : calendarConfig.subtitleRu}
            </p>
          </div>
          <button type="button" onClick={() => setShowLayerSettings(v => !v)} className="btn btn-ghost" style={{ width:'auto', padding:'8px 10px', fontSize:12 }}>
            {rl('Слои','Layers')}
          </button>
        </div>

        {showLayerSettings && (
          <div style={{ marginTop:12, display:'flex', flexWrap:'wrap', gap:8 }}>
            {CALENDAR_LAYERS.map(layer => {
              const active = enabledLayers.includes(layer.key)
              const lockedOff = calendarConfig.hiddenLayers?.includes(layer.key)
              return (
                <button key={layer.key} type="button" disabled={lockedOff} onClick={() => toggleCalendarLayer(layer.key)} style={{
                  padding:'7px 10px', borderRadius:999, border:`1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                  background:active ? 'var(--accent-soft)' : 'var(--bg3)', color: active ? 'var(--accent)' : 'var(--text2)',
                  opacity:lockedOff ? 0.45 : 1, fontSize:11, cursor:lockedOff ? 'not-allowed' : 'pointer',
                }}>
                  {layerLabel(layer.key, lang)} {active ? '✓' : ''}
                </button>
              )
            })}
          </div>
        )}

        {!!calendarConfig.recommendations?.length && (
          <details style={{ marginTop:12 }}>
            <summary style={{ cursor:'pointer', fontSize:12, color:'var(--text2)' }}>{rl('Что Elara будет учитывать','What Elara will consider')}</summary>
            <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:8 }}>
              {calendarConfig.recommendations.map((item, idx) => (
                <div key={idx} style={{ fontSize:12, color:'var(--text3)', lineHeight:1.5 }}>• {item}</div>
              ))}
            </div>
          </details>
        )}
      </div>


      {calendarConfig?.isTeen && (
        <TeenCalendarGuide
          rl={rl}
          showCycle={showCycle}
          showSafeSex={calendarConfig?.showSafeSex}
          showDysphoria={calendarConfig?.showDysphoria}
          hideFertilityDetails={calendarConfig?.hideFertilityDetails}
          onOpenDysphoria={() => navigate('/dysphoria')}
          onOpenHealth={() => navigate('/health')}
        />
      )}

      {/* Месяц */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <button onClick={prevMonth} style={{ background:'none', border:'none', color:'var(--text2)', cursor:'pointer', padding:8, fontSize:22 }}>‹</button>
        <div style={{ textAlign:'center' }}>
          <h2 style={{ fontSize:24 }}>{t.months[month]}</h2>
          <div style={{ fontSize:11, color:'var(--text3)' }}>{year}</div>
        </div>
        <button onClick={nextMonth} style={{ background:'none', border:'none', color:'var(--text2)', cursor:'pointer', padding:8, fontSize:22 }}>›</button>
      </div>

      {/* Прогноз */}
      {showCycle && prediction && (
        <div style={{ background:'var(--bg2)', borderRadius:14, padding:'14px 16px', border:'1px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: upcomingPhases.length > 0 ? 12 : 0 }}>
            <div>
              {currentPhase ? (
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:20 }}>{PHASE_META[currentPhase.type]?.emoji || activeMeta[currentPhase.type]?.emoji}</span>
                  <div>
                    <div style={{ fontSize:13, color:'var(--text)', fontWeight:500 }}>
                      {rl('Сейчас: ','Now: ')}{phaseLabel(currentPhase.type)}
                      {currentPhase.predicted && <span style={{ fontSize:10, color:'var(--text3)', marginLeft:6 }}>({rl('прогноз','predicted')})</span>}
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ fontSize:13, color:'var(--text2)' }}>✦ {rl('Обычные дни','Regular days')}</div>
              )}
            </div>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:10, color:'var(--text3)' }}>
                {rl('на основе','based on')} {prediction.totalCycles} {rl('цикл.','cycles')}
              </div>
              <div style={{ fontSize:15, fontFamily:'Cormorant Garamond, serif', color:'var(--text2)' }}>
                {rl('цикл','cycle')} {prediction.avgCycleLength} {rl('дн','d')}
              </div>
            </div>
          </div>

          {upcomingPhases.length > 0 && (
            <div style={{ display:'flex', gap:8 }}>
              {upcomingPhases.map((ev, i) => (
                <div key={i} style={{
                  flex:1, background:'var(--bg3)', borderRadius:10, padding:'10px 8px',
                  border:`1px solid ${(PHASE_META[ev.type]?.color || activeMeta[ev.type]?.color)}33`, textAlign:'center'
                }}>
                  <div style={{ fontSize:16 }}>{PHASE_META[ev.type]?.emoji || activeMeta[ev.type]?.emoji}</div>
                  <div style={{ fontSize:10, color:'var(--text2)', marginTop:2 }}>{phaseLabel(ev.type)}</div>
                  {ev.days === 0 ? (
                    <div style={{ fontSize:11, color:PHASE_META[ev.type]?.color || activeMeta[ev.type]?.color, fontWeight:500 }}>
                      {rl('Сегодня','Today')}
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize:18, fontFamily:'Cormorant Garamond, serif', color:PHASE_META[ev.type]?.color || activeMeta[ev.type]?.color, lineHeight:1 }}>{ev.days}</div>
                      <div style={{ fontSize:9, color:'var(--text3)' }}>{rl('дн','d')} · {formatDate(ev.date)}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showCycle && !prediction && (
        <div className="card" style={{ padding:'12px 14px', border:'1px solid var(--border)', color:'var(--text2)', fontSize:12, lineHeight:1.5 }}>
          🩸 {rl('Добавь хотя бы один день менструации в календаре - после этого Elara снова покажет фазы, овуляцию и ПМС.', 'Add at least one period day in the calendar - then Elara will show phases, ovulation, and PMS again.')}
        </div>
      )}

      {/* Отметки календаря теперь настраиваются в меню выбранного дня */}

      {/* Легенда */}
      {showCycle && <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
        {Object.entries(PHASE_META).filter(([type]) => type !== 'regular' && !(calendarConfig?.hideFertilityDetails && ['ovulation', 'fertile'].includes(type))).map(([type, meta]) => (
          <div key={type} style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'var(--text2)' }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:meta.color }} />
            <span>{phaseLabel(type)}</span>
          </div>
        ))}
        {showCycle && prediction && (
          <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'var(--text3)' }}>
            <div style={{ width:8, height:8, borderRadius:2, background:'var(--text3)', opacity:0.35 }} />
            <span>{rl('прогноз','predicted')}</span>
          </div>
        )}
      </div>}

      {/* Сетка */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:3 }}>
        {t.days.map(d => (
          <div key={d} style={{ fontSize:10, color:'var(--text3)', textAlign:'center', paddingBottom:3 }}>{d}</div>
        ))}
        {days.map((date, i) => {
          if (!date) return <div key={`e-${i}`} />
          const key = toKey(date)
          const dayEntries = entries[key] || []
          const isToday = key === todayKey
          const isSelected = key === selectedKey
          const isFirst = key === firstDay
          const inPreview = isInPreviewRange(key)
          const myEntry = dayEntries.find(e => e.user_id === user.id)
          const myColor = myEntry ? activeMeta[myEntry.type]?.color : null
          const predictedPhaseRaw = showCycle && !myEntry && prediction ? getDetailedPhaseForDate(date, prediction.predictions, stmEnabled ? stmLogs : {}) : null
          const predictedPhase = normalizePhaseForDisplay(predictedPhaseRaw)
          const predColor = predictedPhase ? (PHASE_META[predictedPhase.type]?.color || activeMeta[predictedPhase.type]?.color) : null
          const friendEntries = dayEntries.filter(e => e.user_id !== user.id)
          const dayMoods = moods[key] || []
          const intimacy = intimacyDays[key]
          const previewColor = isInDeleteMode ? '#f87171' : 'var(--accent)'
          const shownType = showCycle ? (myEntry ? myEntry.type : predictedPhase?.type) : null
          const shownMeta = shownType ? (PHASE_META[shownType] || activeMeta[shownType]) : null
          const dayMarkers = getProfileDayMarkers(key)

          return (
            <button key={key} onClick={() => handleDayClick(date)} style={{
              background:
                isFirst ? (isInDeleteMode ? 'rgba(248,113,113,0.2)' : 'var(--accent-soft)')
                : inPreview ? (isInDeleteMode ? 'rgba(248,113,113,0.1)' : 'rgba(var(--accent-rgb,168,139,250),0.12)')
                : isSelected ? 'var(--bg3)'
                : myColor ? `${myColor}24`
                : predColor ? `${predColor}16`
                : 'var(--bg2)',
              border:
                isFirst ? `2px solid ${previewColor}`
                : inPreview ? `1px solid ${previewColor}55`
                : isToday ? '1.5px solid var(--accent)'
                : isSelected ? '1px solid var(--border)'
                : myColor ? `1px solid ${myColor}66`
                : predColor ? `1px solid ${predColor}24`
                : '1px solid var(--border)',
              borderRadius:10, padding:'4px 2px 3px', cursor:'pointer',
              display:'flex', flexDirection:'column', alignItems:'center', gap:1,
              minHeight:64, transition:'background 0.1s, border 0.1s',
              position:'relative', overflow:'hidden',
            }}>
              {/* Полоска фазы снизу */}
              {(myColor || predColor) && (
                <div style={{
                  position:'absolute', bottom:0, left:0, right:0, height:3,
                  background: myColor || predColor,
                  opacity: myColor ? 0.85 : 0.3,
                  borderRadius:'0 0 8px 8px',
                }} />
              )}

              <span style={{
                fontSize:13, fontWeight:isToday?600:300,
                color:isToday?'var(--accent)':'var(--text)', marginTop:2,
              }}>{date.getDate()}</span>

              {shownMeta && (
                <>
                  <span style={{ fontSize:myEntry ? 10 : 9, lineHeight:1, opacity:myEntry ? 1 : 0.45 }}>{shownMeta.emoji}</span>
                  <span style={{
                    fontSize:8,
                    lineHeight:1.05,
                    color: myEntry ? shownMeta.color : (predictedPhase ? shownMeta.color : 'var(--text3)'),
                    opacity: myEntry ? 1 : 0.85,
                    maxWidth:'100%',
                    overflow:'hidden',
                    textOverflow:'ellipsis',
                    whiteSpace:'nowrap'
                  }}>
                    {phaseLabel(shownType, true)}
                  </span>
                </>
              )}

              {friendEntries.length > 0 && (
                <div style={{ display:'flex', gap:2 }}>
                  {friendEntries.slice(0,3).map((e,idx) => (
                    <div key={idx} style={{ width:4, height:4, borderRadius:'50%', background:e.color, opacity:0.8 }} />
                  ))}
                </div>
              )}

              {dayMoods?.length > 0 && <span style={{ fontSize:8, lineHeight:1 }}>{MOOD_EMOJI[dayMoods[0]]}</span>}
              {enabledLayers.includes('intimacy') && intimacy && (intimacy.had_sex || intimacy.had_masturbation) && (
                <span style={{ fontSize:7, lineHeight:1, opacity:0.7 }}>{intimacy.had_sex ? `🌹${Number(intimacy.sex_count || 1) > 1 ? '×' + Number(intimacy.sex_count || 1) : ''}` : `🌸${Number(intimacy.masturbation_count || 1) > 1 ? '×' + Number(intimacy.masturbation_count || 1) : ''}`}</span>
              )}

              {dayMarkers.length > 0 && (
                <div style={{ display:'flex', gap:2, marginTop:1, maxWidth:'100%', overflow:'hidden' }}>
                  {dayMarkers.slice(0, 3).map(marker => (
                    <span key={marker.key} title={marker.label} style={{ fontSize:8, lineHeight:1 }}>{marker.icon}</span>
                  ))}
                  {dayMarkers.length > 3 && <span style={{ fontSize:8, color:'var(--text3)' }}>+{dayMarkers.length - 3}</span>}
                </div>
              )}
            </button>
          )
        })}
      </div>



      {/* Меню дня (только в нормальном режиме) */}
      {selected && markMode === 'normal' && (
        <DayPanel
          date={selected}
          dateKey={selectedKey}
          entries={entries}
          moods={moods}
          userId={user.id}
          prediction={prediction}
          t={t}
          lang={lang}
          rl={rl}
          TYPE_META={activeMeta}
          PHASE_META={PHASE_META}
          MOOD_EMOJI={MOOD_EMOJI}
          phaseLabel={phaseLabel}
          onToggleType={toggleType}
          onMarkRange={markRange}
          onDeleteRange={deleteRange}
          fetchData={fetchData}
          stmEnabled={stmEnabled}
          stmLog={stmLogs[selectedKey] || { date: selectedKey }}
          stmLogs={stmLogs}
          onSaveStmLog={saveStmLog}
        />
      )}

      {showCycle && stmEnabled && (
        <StmMiniChart
          logs={stmLogs}
          prediction={prediction}
          rl={rl}
        />
      )}

      {/* Быстрые разделы здоровья под календарём */}
      <div className="card" style={{ padding:'14px', display:'flex', flexDirection:'column', gap:10 }}>
        <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
          {rl('Здоровье и уход','Health & care')}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {[
            { icon:'💊', label:rl('Таблетки','Medications'), path:'/medications' },
            { icon:'🏃', label:rl('Спорт и активность','Sport & activity'), path:'/sport' },
            { icon:'🩺', label:rl('Настройки здоровья','Health settings'), path:'/health' },
            { icon:'🔬', label:rl('Архив анализов','Health archive'), path:'/health-archive' },
            ...(enabledLayers.includes('dysphoria') ? [{ icon:'⚧', label:rl('Дневник дисфории','Dysphoria diary'), path:'/dysphoria' }] : []),
          ].map(item => (
            <button key={item.path} onClick={() => navigate(item.path)} style={{
              padding:'12px 10px', borderRadius:12, cursor:'pointer', textAlign:'left',
              border:'1px solid var(--border)', background:'var(--bg2)', color:'var(--text)',
              display:'flex', alignItems:'center', gap:8, minHeight:48,
            }}>
              <span style={{ fontSize:18 }}>{item.icon}</span>
              <span style={{ fontSize:12, lineHeight:1.25 }}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <DayStatusWidget
        compact={false}
        moodEmojis={MOOD_EMOJI}
        todayMoods={todayMoods}
        onToggleMood={saveMood}
        moodTitle={t.moodToday || rl('Эмоциональные отметки','Mood marks')}
        translateMood={(mood) => t[mood] || mood}
      />
      <AnemiaWidget />
      {showCycle && <MigraineWidget daysUntilPeriod={
        upcomingPhases.find(p => p.type === 'period')
          ? Math.ceil((new Date(upcomingPhases.find(p => p.type === 'period').date) - new Date()) / 86400000)
          : null
      } />}
      <InsightsWidget currentPhase={currentPhase?.type} />
      <AIAdvice requestType="self_advice" cyclePhase={currentPhase?.type} todayMood={todayMoods[0]} />

      {/* Подруги */}

    </div>
  )
}



function TeenCalendarGuide({ rl, showCycle, showSafeSex, showDysphoria, hideFertilityDetails, onOpenDysphoria, onOpenHealth }) {
  const [open, setOpen] = useState(false)

  const quickItems = [
    'настроение',
    'сон',
    'стресс',
    'боль',
    showCycle ? 'месячные' : null,
    'акне / кожа',
    'энергия',
    'хочу побыть в тишине',
  ].filter(Boolean)

  return (
    <div className="card" style={{ padding:'14px', border:'1px solid var(--border)', background:'var(--bg2)' }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        style={{
          width:'100%', border:'none', background:'transparent', color:'var(--text)', padding:0,
          display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, cursor:'pointer', textAlign:'left'
        }}
      >
        <div>
          <div style={{ fontSize:14, fontWeight:700 }}>🧭 {rl('Подростковый календарь', 'Teen calendar')}</div>
          <div style={{ marginTop:4, fontSize:12, color:'var(--text2)', lineHeight:1.45 }}>
            {rl('Фокус на самочувствии, приватности, цикле, прививках и безопасных подсказках без запугивания.', 'Focus on wellbeing, privacy, cycle, vaccines, and safe guidance without fear tactics.')}
          </div>
        </div>
        <span style={{ color:'var(--text2)' }}>{open ? '⌃' : '⌄'}</span>
      </button>

      {open && (
        <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
            {quickItems.map(item => (
              <span key={item} style={{ padding:'6px 9px', borderRadius:999, background:'var(--bg3)', border:'1px solid var(--border)', color:'var(--text2)', fontSize:11 }}>
                {item}
              </span>
            ))}
          </div>

          {showCycle && (
            <div style={{ padding:'10px 12px', borderRadius:12, background:'var(--bg3)', color:'var(--text2)', fontSize:12, lineHeight:1.5 }}>
              🩸 {rl('В дни месячных можно отмечать боль, настроение и объём. Если боль очень сильная, резкая или мешает жить - лучше поговорить со взрослым, которому доверяешь, или врачом.', 'On period days you can log pain, mood, and flow. If pain is severe, sudden, or disrupts daily life, talk to a trusted adult or clinician.')}
            </div>
          )}

          {hideFertilityDetails && (
            <div style={{ padding:'10px 12px', borderRadius:12, background:'var(--bg3)', color:'var(--text2)', fontSize:12, lineHeight:1.5 }}>
              🌿 {rl('Фертильные дни и “безопасные дни” скрыты по умолчанию. Календарь не будет использовать овуляцию как подсказку для контрацепции.', 'Fertile and “safe” days are hidden by default. The calendar will not use ovulation as contraception guidance.')}
            </div>
          )}

          {showSafeSex && (
            <div style={{ padding:'10px 12px', borderRadius:12, background:'var(--bg3)', color:'var(--text2)', fontSize:12, lineHeight:1.5 }}>
              🛡 {rl('Если отмечаешь интим, Elara мягко напомнит про согласие, защиту, ИППП-чекапы и что делать, если что-то пошло не так.', 'If intimacy is logged, Elara will gently remind about consent, protection, STI checkups, and what to do if something goes wrong.')}
            </div>
          )}

          {showDysphoria && (
            <button
              type="button"
              onClick={onOpenDysphoria}
              style={{ padding:'10px 12px', borderRadius:12, background:'var(--bg3)', border:'1px solid var(--border)', color:'var(--text)', fontSize:12, textAlign:'left', cursor:'pointer' }}
            >
              ⚧ {rl('Дневник дисфории приватный. В отчёт врачу он попадёт только если ты сама/сам это разрешишь.', 'The dysphoria diary is private. It goes into a doctor report only if you explicitly allow it.')}
            </button>
          )}

          <button
            type="button"
            onClick={onOpenHealth}
            style={{ padding:'10px 12px', borderRadius:12, background:'var(--accent-soft)', border:'1px solid var(--accent)', color:'var(--accent)', fontSize:12, textAlign:'left', cursor:'pointer' }}
          >
            💉 {rl('Прививки и чекапы можно смотреть в здоровье. Для подростков это может показываться и в профиле родителя, если семейный доступ включён.', 'Vaccines and checkups live in Health. For teens, they can also appear in a parent profile if family access is enabled.')}
          </button>
        </div>
      )}
    </div>
  )
}

function StmMiniChart({ logs = {}, prediction, rl }) {
  const rows = Object.values(logs || {})
    .filter(l => l?.date && l.temperature !== '' && l.temperature != null && !Number.isNaN(Number(l.temperature)))
    .sort((a,b) => a.date.localeCompare(b.date))
    .slice(-24)

  const latestWindow = prediction?.predictions?.[0] ? detectStmWindow(logs, prediction.predictions[0]) : null

  if (!rows.length) {
    return (
      <div className="card" style={{ padding:'14px', border:'1px solid var(--border)', background:'var(--bg2)' }}>
        <div style={{ fontSize:13, fontWeight:600, marginBottom:6 }}>🌡️ {rl('СТМ-график','STM chart')}</div>
        <div style={{ fontSize:12, color:'var(--text2)', lineHeight:1.5 }}>
          {rl('Добавляй базальную температуру и слизь в меню выбранного дня - здесь появится график.', 'Add basal temperature and mucus in the selected day menu - the chart will appear here.')}
        </div>
      </div>
    )
  }

  const temps = rows.map(r => Number(r.temperature))
  const min = Math.min(...temps) - 0.05
  const max = Math.max(...temps) + 0.05
  const w = 320, h = 96, pad = 14
  const points = rows.map((r, i) => {
    const x = pad + (rows.length === 1 ? 0 : i * ((w - pad*2) / (rows.length - 1)))
    const y = h - pad - ((Number(r.temperature) - min) / Math.max(0.1, max - min)) * (h - pad*2)
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="card" style={{ padding:'14px', border:'1px solid var(--border)', background:'var(--bg2)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', gap:10, alignItems:'flex-start', marginBottom:8 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:600 }}>🌡️ {rl('СТМ-график','STM chart')}</div>
          <div style={{ fontSize:11, color:'var(--text3)', marginTop:3 }}>
            {rl('Температура за последние отметки','Temperature from recent logs')}
          </div>
        </div>
        {latestWindow?.hasEnoughData && (
          <div style={{ fontSize:11, color:'var(--text2)', textAlign:'right', lineHeight:1.35 }}>
            {rl('Фертильное окно уточнено по СТМ','Fertile window refined by STM')}
          </div>
        )}
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width:'100%', height:110, display:'block' }}>
        <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" opacity="0.75" />
        {rows.map((r, i) => {
          const [x,y] = points.split(' ')[i].split(',').map(Number)
          return <circle key={r.date} cx={x} cy={y} r="2.8" fill="currentColor" opacity="0.9" />
        })}
      </svg>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text3)' }}>
        <span>{rows[0]?.date?.slice(5)}</span>
        <span>{min.toFixed(2)}-{max.toFixed(2)}°C</span>
        <span>{rows[rows.length - 1]?.date?.slice(5)}</span>
      </div>
    </div>
  )
}
