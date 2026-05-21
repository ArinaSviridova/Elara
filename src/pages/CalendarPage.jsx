import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { predictCycle, getPhaseForDate } from '../lib/cyclePredictor'
import AIAdvice from '../components/AIAdvice'
import NoPeriodPage from './NoPeriodPage'

const TYPE_META = {
  period:    { color: '#f87171', emoji: '🩸', labelRu: 'Менструация', labelEn: 'Period' },
  pms:       { color: '#fb923c', emoji: '🌧', labelRu: 'ПМС',         labelEn: 'PMS' },
  ovulation: { color: '#facc15', emoji: '✨', labelRu: 'Овуляция',    labelEn: 'Ovulation' },
  fertile:   { color: '#4ade80', emoji: '🌿', labelRu: 'Фертильные',  labelEn: 'Fertile' },
}

const MOOD_EMOJI = {
  happy:'😊', calm:'🌿', sad:'🌧', anxious:'💭',
  tired:'😴', irritated:'⚡', energetic:'🔥', romantic:'🌷',
  conflicted:'😤', grateful:'🙏'
}

function toKey(d) { return d.toISOString().slice(0,10) }

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
  const cur = new Date(start); cur.setHours(0,0,0,0)
  const endD = new Date(end); endD.setHours(0,0,0,0)
  while (cur <= endD) {
    dates.push(cur.toISOString().slice(0,10))
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
// 'normal'       — обычный, тап открывает меню дня
// 'first:period' — ждём первый день менструации
// 'last:period'  — первый день выбран, ждём последний
// 'first:pms' / 'last:pms' / etc — то же для других типов
// 'del-first:period' / 'del-last:period' — удаление

export default function CalendarPage() {
  const { user, profile } = useAuth()
  const { t, lang } = useLang()
  const bodyMode = profile?.body_mode || 'has_period'

  // Если нет месячных — показываем персональный экран
  if (bodyMode === 'no_period' || bodyMode === 'menopause' || bodyMode === 'on_hormones') {
    return <NoPeriodPage bodyMode={bodyMode} />
  }

  return <CycleCalendar />
}

function CycleCalendar() {
  const { user, profile } = useAuth()
  const { t, lang } = useLang()
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

  const rl = (ru, en) => lang==='en' ? en : ru

  const fetchData = useCallback(async () => {
    const startDate = new Date(year, month, 1).toISOString().slice(0,10)
    const endDate = new Date(year, month+1, 0).toISOString().slice(0,10)
    const twoYearsAgo = new Date(); twoYearsAgo.setFullYear(twoYearsAgo.getFullYear()-2)

    const [{ data: entriesData }, { data: moodData }, { data: membersData }, { data: allPeriods }] = await Promise.all([
      supabase.from('cycle_entries').select('*').gte('date', startDate).lte('date', endDate),
      supabase.from('mood_entries').select('*').eq('user_id', user.id).gte('date', startDate).lte('date', endDate),
      supabase.from('group_members').select('*, user:user_id(id, name)').eq('user_id', user.id),
      supabase.from('cycle_entries').select('date')
        .eq('user_id', user.id).eq('type', 'period')
        .gte('date', twoYearsAgo.toISOString().slice(0,10))
        .order('date'),
    ])

    setMembers(membersData || [])

    if (allPeriods && allPeriods.length >= 3) {
      const history = buildHistoryFromEntries(allPeriods)
      if (history.length >= 2) setPrediction(predictCycle(history))
    }

    const map = {}
    ;(entriesData || []).forEach(e => {
      if (!map[e.date]) map[e.date] = []
      const member = (membersData || []).find(m => m.user_id === e.user_id)
      const color = e.user_id === user.id ? TYPE_META[e.type]?.color : member?.member_color || '#888'
      map[e.date].push({ ...e, color })
    })
    setEntries(map)

    const moodMap = {}
    ;(moodData || []).forEach(m => { moodMap[m.date] = m.mood })
    setMoods(moodMap)
  }, [year, month, user.id])

  useEffect(() => { fetchData() }, [fetchData])

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

  async function saveMood(mood) {
    const dateKey = toKey(today)
    if (moods[dateKey] === mood) {
      await supabase.from('mood_entries').delete().eq('user_id', user.id).eq('date', dateKey)
    } else {
      await supabase.from('mood_entries').upsert(
        { user_id: user.id, date: dateKey, mood },
        { onConflict: 'user_id,date' }
      )
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

    // Ждём последний день — применяем диапазон
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

    // Нормальный режим — открываем меню
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

  function prevMonth() { if (month===0){setYear(y=>y-1);setMonth(11)}else setMonth(m=>m-1) }
  function nextMonth() { if (month===11){setYear(y=>y+1);setMonth(0)}else setMonth(m=>m+1) }

  const days = getMonthDays(year, month)
  const todayKey = toKey(today)
  const selectedKey = selected ? toKey(selected) : null
  const todayMood = moods[todayKey]
  const upcomingPhases = getUpcomingPhases(prediction)
  const currentPhase = prediction ? getPhaseForDate(today, prediction.predictions) : null
  const isInDeleteMode = markMode.startsWith('del-')
  const isPickingDay = markMode !== 'normal'
  const isPickingLast = markMode.startsWith('last:') || markMode.startsWith('del-last:')

  function phaseLabel(type) { return lang==='en' ? TYPE_META[type]?.labelEn : TYPE_META[type]?.labelRu }
  function formatDate(date) {
    const d = new Date(date)
    return `${d.getDate()} ${t.months[d.getMonth()].slice(0,3).toLowerCase()}`
  }

  // Подсветка диапазона пока выбираем второй день
  function isInPreviewRange(key) {
    if (!isPickingLast || !firstDay) return false
    const a = firstDay < key ? firstDay : key
    const b = firstDay < key ? key : firstDay
    return key >= a && key <= b
  }

  return (
    <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', padding:'18px 16px', gap:14, overflowY:'auto' }}>

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
      {prediction && (
        <div style={{ background:'var(--bg2)', borderRadius:14, padding:'14px 16px', border:'1px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: upcomingPhases.length > 0 ? 12 : 0 }}>
            <div>
              {currentPhase ? (
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ fontSize:20 }}>{TYPE_META[currentPhase.type]?.emoji}</span>
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
                  border:`1px solid ${TYPE_META[ev.type]?.color}33`, textAlign:'center'
                }}>
                  <div style={{ fontSize:16 }}>{TYPE_META[ev.type]?.emoji}</div>
                  <div style={{ fontSize:10, color:'var(--text2)', marginTop:2 }}>{phaseLabel(ev.type)}</div>
                  {ev.days === 0 ? (
                    <div style={{ fontSize:11, color:TYPE_META[ev.type]?.color, fontWeight:500 }}>
                      {rl('Сегодня','Today')}
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize:18, fontFamily:'Cormorant Garamond, serif', color:TYPE_META[ev.type]?.color, lineHeight:1 }}>{ev.days}</div>
                      <div style={{ fontSize:9, color:'var(--text3)' }}>{rl('дн','d')} · {formatDate(ev.date)}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Панель отметки */}
      {!isPickingDay ? (
        <div style={{ background:'var(--bg2)', borderRadius:12, padding:'12px 14px', border:'1px solid var(--border)' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div>
              <div style={{ fontSize:10, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:7 }}>
                + {rl('Отметить','Mark')}
              </div>
              <div style={{ display:'flex', gap:6 }}>
                {Object.entries(TYPE_META).map(([type, meta]) => (
                  <button key={type} onClick={() => startMark(type)}
                    title={phaseLabel(type)}
                    style={{
                      flex:1, padding:'9px 3px', borderRadius:8, fontSize:15, cursor:'pointer',
                      border:`1px solid var(--border)`, background:'var(--bg3)',
                      display:'flex', flexDirection:'column', alignItems:'center', gap:2,
                      transition:'all 0.15s',
                    }}>
                    {meta.emoji}
                    <span style={{ fontSize:8, color:'var(--text3)' }}>{phaseLabel(type)?.slice(0,3)}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize:10, color:'#f87171', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:7 }}>
                − {rl('Удалить','Delete')}
              </div>
              <div style={{ display:'flex', gap:6 }}>
                {Object.entries(TYPE_META).map(([type, meta]) => (
                  <button key={type} onClick={() => startDelete(type)}
                    title={`${rl('Удалить','Delete')} ${phaseLabel(type)}`}
                    style={{
                      flex:1, padding:'9px 3px', borderRadius:8, fontSize:15, cursor:'pointer',
                      border:'1px solid rgba(248,113,113,0.25)', background:'var(--bg3)',
                      display:'flex', flexDirection:'column', alignItems:'center', gap:2,
                      opacity:0.75, transition:'all 0.15s',
                    }}>
                    {meta.emoji}
                    <span style={{ fontSize:8, color:'#f87171' }}>✕</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ fontSize:11, color:'var(--text3)', marginTop:10, textAlign:'center' }}>
            {rl('Нажми тип → первый день → последний день','Tap type → first day → last day')}
          </div>
        </div>
      ) : (
        /* Активный режим — баннер подсказки */
        <div style={{
          background: isInDeleteMode ? 'rgba(248,113,113,0.1)' : 'var(--accent-soft)',
          border:`1.5px solid ${isInDeleteMode ? '#f87171' : 'var(--accent)'}`,
          borderRadius:12, padding:'12px 16px',
          display:'flex', alignItems:'center', justifyContent:'space-between',
        }}>
          <div>
            <div style={{ fontSize:14, color: isInDeleteMode ? '#f87171' : 'var(--accent)', fontWeight:500 }}>
              {TYPE_META[activeType]?.emoji} {phaseLabel(activeType)}
              {isInDeleteMode && <span style={{ marginLeft:6, fontSize:12 }}>— {rl('удаление','deleting')}</span>}
            </div>
            <div style={{ fontSize:12, color:'var(--text2)', marginTop:3 }}>
              {!isPickingLast
                ? rl('👆 Нажми на первый день','👆 Tap the first day')
                : rl(`Начало: ${firstDay} — нажми последний день`, `Start: ${firstDay} — tap the last day`)}
            </div>
          </div>
          <button onClick={cancelMode} style={{
            background:'none', border:'1px solid var(--border)', borderRadius:6,
            color:'var(--text2)', fontSize:12, padding:'6px 12px', cursor:'pointer',
          }}>
            {rl('Отмена','Cancel')}
          </button>
        </div>
      )}

      {/* Легенда */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
        {Object.entries(TYPE_META).map(([type, meta]) => (
          <div key={type} style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'var(--text2)' }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:meta.color }} />
            <span>{phaseLabel(type)}</span>
          </div>
        ))}
        {prediction && (
          <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:11, color:'var(--text3)' }}>
            <div style={{ width:8, height:8, borderRadius:2, background:'var(--text3)', opacity:0.35 }} />
            <span>{rl('прогноз','predicted')}</span>
          </div>
        )}
      </div>

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
          const myColor = myEntry ? TYPE_META[myEntry.type]?.color : null
          const predictedPhase = !myEntry && prediction ? getPhaseForDate(date, prediction.predictions) : null
          const predColor = predictedPhase ? TYPE_META[predictedPhase.type]?.color : null
          const friendEntries = dayEntries.filter(e => e.user_id !== user.id)
          const dayMood = moods[key]
          const previewColor = isInDeleteMode ? '#f87171' : 'var(--accent)'

          return (
            <button key={key} onClick={() => handleDayClick(date)} style={{
              background:
                isFirst ? (isInDeleteMode ? 'rgba(248,113,113,0.2)' : 'var(--accent-soft)')
                : inPreview ? (isInDeleteMode ? 'rgba(248,113,113,0.1)' : 'rgba(var(--accent-rgb,168,139,250),0.12)')
                : isSelected ? 'var(--bg3)'
                : myColor ? `${myColor}20`
                : predColor ? `${predColor}0d`
                : 'transparent',
              border:
                isFirst ? `2px solid ${previewColor}`
                : inPreview ? `1px solid ${previewColor}55`
                : isToday ? '1.5px solid var(--accent)'
                : isSelected ? '1px solid var(--border)'
                : '1px solid transparent',
              borderRadius:10, padding:'4px 2px 3px', cursor:'pointer',
              display:'flex', flexDirection:'column', alignItems:'center', gap:1,
              minHeight:50, transition:'background 0.1s, border 0.1s',
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

              {myEntry
                ? <span style={{ fontSize:10, lineHeight:1 }}>{TYPE_META[myEntry.type]?.emoji}</span>
                : predictedPhase
                  ? <span style={{ fontSize:9, lineHeight:1, opacity:0.4 }}>{TYPE_META[predictedPhase.type]?.emoji}</span>
                  : null}

              {friendEntries.length > 0 && (
                <div style={{ display:'flex', gap:2 }}>
                  {friendEntries.slice(0,3).map((e,idx) => (
                    <div key={idx} style={{ width:4, height:4, borderRadius:'50%', background:e.color, opacity:0.8 }} />
                  ))}
                </div>
              )}

              {dayMood && <span style={{ fontSize:8, lineHeight:1 }}>{MOOD_EMOJI[dayMood]}</span>}
            </button>
          )
        })}
      </div>

      {/* Меню дня (только в нормальном режиме) */}
      {selected && markMode === 'normal' && (
        <div className="card" style={{ padding:'14px 16px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
            <div style={{ fontSize:12, color:'var(--text3)', letterSpacing:'0.08em', textTransform:'uppercase' }}>
              {selected.getDate()} {t.months[selected.getMonth()].toLowerCase()}
            </div>
            {prediction && (() => {
              const p = getPhaseForDate(selected, prediction.predictions)
              return p ? (
                <span style={{ fontSize:11, color:TYPE_META[p.type]?.color }}>
                  {TYPE_META[p.type]?.emoji} {phaseLabel(p.type)}
                  {p.predicted && <span style={{ color:'var(--text3)', marginLeft:4 }}>({rl('прогноз','predicted')})</span>}
                </span>
              ) : null
            })()}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
            {Object.entries(TYPE_META).map(([type, meta]) => {
              const active = entries[selectedKey]?.some(e => e.type===type && e.user_id===user.id)
              return (
                <button key={type} onClick={() => toggleType(type, selectedKey)} style={{
                  background:active?`${meta.color}22`:'var(--bg3)',
                  border:`1.5px solid ${active?meta.color:'transparent'}`,
                  borderRadius:10, padding:'11px 12px', cursor:'pointer',
                  display:'flex', alignItems:'center', gap:8,
                  color:'var(--text)', fontSize:12, transition:'all 0.15s',
                }}>
                  <span style={{ fontSize:18 }}>{meta.emoji}</span>
                  <div>
                    <div>{phaseLabel(type)}</div>
                    {active && <div style={{ fontSize:10, color:meta.color }}>✓ {rl('отмечено','marked')}</div>}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Настроение */}
      <div className="card" style={{ padding:'12px 14px' }}>
        <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>
          {t.moodToday}
        </div>
        <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
          {Object.entries(MOOD_EMOJI).map(([mood, emoji]) => (
            <button key={mood} onClick={() => saveMood(mood)} title={t[mood]||mood} style={{
              padding:'7px 10px', borderRadius:20, fontSize:16, cursor:'pointer',
              border:`1.5px solid ${todayMood===mood?'var(--accent)':'transparent'}`,
              background:todayMood===mood?'var(--accent-soft)':'var(--bg3)',
              transition:'all 0.15s',
            }}>{emoji}</button>
          ))}
        </div>
        {todayMood && <div style={{ fontSize:12, color:'var(--text2)', marginTop:6 }}>{t[todayMood]||todayMood}</div>}
      </div>

      <AIAdvice requestType="self_advice" cyclePhase={currentPhase?.type} todayMood={todayMood} />

      {/* Подруги */}
      {members.length > 0 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, paddingBottom:4 }}>
          <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--text2)' }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--self)' }} />{t.me}
          </div>
          {members.map(m => (
            <div key={m.id} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--text2)' }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:m.member_color }} />{m.user?.name}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
