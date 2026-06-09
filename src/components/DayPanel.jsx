import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { FLOW_OPTIONS, PERIOD_COLOR_OPTIONS, PERIOD_CONSISTENCY_OPTIONS, buildPeriodDayPrediction, detectPeriodDeviation, getOptionLabel } from '../lib/periodPatterns'
import { useAuth } from '../context/AuthContext'

export default function DayPanel({
  date, dateKey, entries, moods, userId, prediction,
  t, lang, rl, TYPE_META, MOOD_EMOJI, phaseLabel,
  onToggleType, onMarkPeriodStart, fetchData,
  stmEnabled = false, stmLog = {}, onSaveStmLog, canEditCycle = true,
}) {
  const navigate = useNavigate()
  const [intimacy, setIntimacy] = useState(null)
  const [diaryTags, setDiaryTags] = useState([])
  const [hasDiary, setHasDiary] = useState(false)
  const [periodMode, setPeriodMode] = useState('single') // single | range | auto
  const [loading, setLoading] = useState(false)
  const [periodLog, setPeriodLog] = useState(null)
  const [periodProfile, setPeriodProfile] = useState({})
  const [savingPeriodLog, setSavingPeriodLog] = useState(false)

  const isToday = dateKey === new Date().toISOString().slice(0,10)
  const dayEntries = entries[dateKey] || []
  const dayMoods = moods[dateKey] || []
  const phase = canEditCycle && prediction ? getPhaseSafe(date, prediction.predictions) : null
  const ownPeriodEntries = Object.values(entries || {}).flat().filter(e => e.user_id === userId && e.type === 'period').sort((a,b) => String(a.date).localeCompare(String(b.date)))
  const periodStartForSelected = findPeriodStart(dateKey, ownPeriodEntries)
  const periodDay = periodStartForSelected ? Math.round((new Date(dateKey + 'T00:00:00') - new Date(periodStartForSelected + 'T00:00:00')) / (1000*60*60*24)) + 1 : null
  const isPeriodMarked = dayEntries.some(e => e.type === 'period' && e.user_id === userId)
  const shouldShowBleedingLog = canEditCycle && (isPeriodMarked || phase?.type === 'period')
  const expectedPeriod = shouldShowBleedingLog ? buildPeriodDayPrediction({ health: periodProfile, periodDay: periodDay || 1, lastCycleLogs: [] }) : null
  const periodDeviations = periodLog && expectedPeriod ? detectPeriodDeviation({ todayLog: periodLog, expected: expectedPeriod }) : []

  useEffect(() => { loadDayData() }, [dateKey])

  function getPhaseSafe(d, predictions) {
    try {
      const { getPhaseForDate } = require('../lib/cyclePredictor')
      return getPhaseForDate(d, predictions)
    } catch { return null }
  }


  function findPeriodStart(currentDate, periodEntries) {
    const current = new Date(currentDate + 'T00:00:00')
    let start = null
    for (const entry of [...periodEntries].reverse()) {
      const d = new Date(entry.date + 'T00:00:00')
      if (d > current) continue
      const diff = Math.round((current - d) / (1000*60*60*24))
      if (diff >= 0 && diff <= 10) start = entry.date
      if (diff > 10) break
    }
    return start
  }

  async function savePeriodDailyPatch(patch) {
    const next = { ...(periodLog || {}), ...patch }
    setPeriodLog(next)
    setSavingPeriodLog(true)
    await supabase.from('period_daily_logs').upsert({
      user_id: userId,
      date: dateKey,
      cycle_entry_date: periodStartForSelected || dateKey,
      period_day: periodDay || 1,
      flow: next.flow || null,
      pain_level: next.pain_level === '' || next.pain_level == null ? null : Number(next.pain_level),
      color: next.color || null,
      consistency: next.consistency || null,
      notes: next.notes || null,
    }, { onConflict: 'user_id,date' })
    setSavingPeriodLog(false)
  }

  function deviationText(issue) {
    if (issue.type === 'pain_high') return rl('Боль выше обычной для этого дня цикла. Если боль резкая, необычная или мешает обычной активности, лучше обратиться за медицинской помощью.','Pain is higher than usual for this period day. If it is sharp, unusual or affects normal activity, consider medical help.')
    if (issue.type === 'flow_heavier') return rl('Выделения сильнее обычного для этого дня. Если это необычно для тебя или есть слабость/головокружение, лучше обратиться к врачу.','Flow is heavier than usual for this day. If this is unusual or comes with weakness/dizziness, consider medical advice.')
    if (issue.type === 'flow_lighter') return rl('Выделения слабее обычного для этого дня. Просто отметь, чтобы прогноз адаптировался.','Flow is lighter than usual for this day. Log it so the forecast can adapt.')
    if (issue.type === 'very_heavy') return rl('Очень обильные выделения стоит отслеживать внимательно. При резком ухудшении самочувствия лучше обратиться за медицинской помощью.','Very heavy bleeding should be tracked carefully. If you feel worse suddenly, consider medical help.')
    if (issue.type === 'clots_heavy') return rl('Отмечены сгустки при обильных выделениях. Если это необычно для тебя, лучше обсудить с врачом.','Clots with heavy flow were logged. If this is unusual for you, consider discussing it with a clinician.')
    return ''
  }

  async function loadDayData() {
    setLoading(true)
    const [{ data: intimacyData }, { data: diaryData }, { data: periodData }, { data: profileData }] = await Promise.all([
      supabase.from('intimacy_entries').select('*').eq('user_id', userId).eq('date', dateKey).maybeSingle(),
      supabase.from('diary_entries').select('tags, encrypted_text').eq('user_id', userId).eq('date', dateKey).maybeSingle(),
      supabase.from('period_daily_logs').select('*').eq('user_id', userId).eq('date', dateKey).maybeSingle(),
      supabase.from('profiles').select('health').eq('id', userId).maybeSingle(),
    ])
    setIntimacy(intimacyData)
    setDiaryTags(diaryData?.tags || [])
    setHasDiary(!!(diaryData?.encrypted_text || diaryData?.tags?.length))
    setPeriodLog(periodData || null)
    setPeriodProfile(profileData?.health || {})
    setLoading(false)
  }

  async function markPeriodAuto() {
    // Сначала получаем среднюю длину из профиля (здоровье), потом из истории циклов
    const { data: profileData } = await supabase
      .from('profiles').select('health').eq('id', userId).single()
    const userAvg = profileData?.health?.avg_period_length
    // Приоритет: 1) указано в здоровье, 2) из предыдущих циклов, 3) дефолт 5
    const avgLen = userAvg || prediction?.avgPeriodLength || 5
    
    // Генерируем все дни периода с локальной датой (без UTC сдвига)
    const allDates = []
    for (let i = 0; i < avgLen; i++) {
      const d = new Date(dateKey + 'T00:00:00')
      d.setDate(d.getDate() + i)
      const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0')
      allDates.push(`${y}-${m}-${day}`)
    }
    await supabase.from('cycle_entries').upsert(
      allDates.map(date => ({ user_id: userId, date, type: 'period' })),
      { onConflict: 'user_id,date,type', ignoreDuplicates: true }
    )
    fetchData()
  }

  const PREGNANCY_PHASES = {
    kicks: { emoji: '👶', label: rl('Шевеления','Kicks') },
    symptoms: { emoji: '🤰', label: rl('Симптомы','Symptoms') },
    appointment: { emoji: '🏥', label: rl('Приём врача','Doctor visit') },
    ultrasound: { emoji: '🔊', label: rl('УЗИ','Ultrasound') },
  }

  return (
    <div className="card" style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:12 }}>
      {/* Заголовок */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ fontSize:14, fontWeight:500 }}>
          {date.getDate()} {t.months?.[date.getMonth()]?.toLowerCase() || ''}
          {isToday && <span style={{ fontSize:11, color:'var(--accent)', marginLeft:8 }}>({rl('сегодня','today')})</span>}
        </div>
        {phase && (
          <span style={{ fontSize:11, color:TYPE_META[phase.type]?.color }}>
            {TYPE_META[phase.type]?.emoji} {phaseLabel(phase.type)}
            {phase.predicted && <span style={{ color:'var(--text3)', marginLeft:4 }}>({rl('прогноз','pred.')})</span>}
          </span>
        )}
      </div>

      {/* Что уже отмечено */}
      {(dayEntries.length > 0 || dayMoods.length > 0 || intimacy || hasDiary) && (
        <div style={{ background:'var(--bg3)', borderRadius:8, padding:'10px 12px' }}>
          <div style={{ fontSize:11, color:'var(--text3)', marginBottom:7 }}>{rl('Отмечено в этот день:','Logged this day:')}</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {dayEntries.filter(e=>e.user_id===userId).map(e => (
              <span key={e.id} style={{ fontSize:12, padding:'3px 9px', borderRadius:20, background:`${TYPE_META[e.type]?.color}22`, color:TYPE_META[e.type]?.color, border:`1px solid ${TYPE_META[e.type]?.color}44` }}>
                {TYPE_META[e.type]?.emoji} {phaseLabel(e.type)}
              </span>
            ))}
            {dayMoods.map(m => (
              <span key={m} style={{ fontSize:12, padding:'3px 9px', borderRadius:20, background:'var(--bg2)', border:'1px solid var(--border)' }}>
                {MOOD_EMOJI[m]} {t[m]||m}
              </span>
            ))}
            {intimacy && (
              <span style={{ fontSize:12, padding:'3px 9px', borderRadius:20, background:'rgba(244,114,182,0.12)', border:'1px solid rgba(244,114,182,0.3)', color:'#f472b6' }}>
                {intimacy.had_sex ? '🌹' : '🌸'} {rl('Интимное','Intimacy')}
              </span>
            )}
            {hasDiary && (
              <span style={{ fontSize:12, padding:'3px 9px', borderRadius:20, background:'var(--bg2)', border:'1px solid var(--border)' }}>
                📝 {rl('Дневник','Diary')} {diaryTags.length > 0 && `(${diaryTags.slice(0,2).join(', ')}${diaryTags.length>2?'...':''})`}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Отметить фазу цикла */}
      {canEditCycle && <div>
        <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>
          {rl('Отметить','Mark')}
        </div>

        {/* Для менструации — специальный блок с вариантами */}
        <div style={{ marginBottom:8 }}>
          <div style={{ fontSize:12, color:'var(--text2)', marginBottom:6 }}>
            {TYPE_META.period?.emoji} {phaseLabel('period')}
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={() => { onToggleType('period', dateKey) }} style={{
              flex:1, padding:'8px', borderRadius:8, fontSize:11, cursor:'pointer',
              border:`1px solid ${dayEntries.some(e=>e.type==='period'&&e.user_id===userId)?'var(--accent)':'var(--border)'}`,
              background:dayEntries.some(e=>e.type==='period'&&e.user_id===userId)?'var(--accent-soft)':'transparent',
              color:dayEntries.some(e=>e.type==='period'&&e.user_id===userId)?'var(--accent)':'var(--text2)',
            }}>
              {rl('Один день','One day')}
            </button>
            <button onClick={markPeriodAuto} style={{
              flex:1, padding:'8px', borderRadius:8, fontSize:11, cursor:'pointer',
              border:'1px solid var(--border)', background:'transparent', color:'var(--text2)',
            }}>
              {rl(`Авто (~${prediction?.avgPeriodLength||5}дн)`,`Auto (~${prediction?.avgPeriodLength||5}d)`)}
            </button>
          </div>
        </div>

        {shouldShowBleedingLog && (
          <div className="card" style={{ padding:'12px', margin:'8px 0', border:'1px solid var(--border)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', gap:8, alignItems:'center', marginBottom:8 }}>
              <div>
                <div style={{ fontSize:12, fontWeight:500 }}>🩸 {rl('Кровотечение сегодня','Bleeding today')}</div>
                <div style={{ fontSize:10, color:'var(--text3)' }}>
                  {rl(`День ${periodDay || 1}. Прогноз: ${expectedPeriod?.expectedFlow ? getOptionLabel(FLOW_OPTIONS, expectedPeriod.expectedFlow, lang) : 'не задан'} · боль ${expectedPeriod?.expectedPain ?? '—'}/10`,
                      `Day ${periodDay || 1}. Expected: ${expectedPeriod?.expectedFlow ? getOptionLabel(FLOW_OPTIONS, expectedPeriod.expectedFlow, lang) : 'not set'} · pain ${expectedPeriod?.expectedPain ?? '—'}/10`)}
                </div>
              </div>
              {savingPeriodLog && <span style={{ fontSize:10, color:'var(--text3)' }}>...</span>}
            </div>

            <div style={{ fontSize:11, color:'var(--text3)', marginBottom:6 }}>{rl('Сила выделений','Flow')}</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:10 }}>
              {FLOW_OPTIONS.map(o => (
                <button key={o.key} onClick={() => savePeriodDailyPatch({ flow:o.key })} style={{
                  padding:'6px 9px', borderRadius:18, fontSize:11, cursor:'pointer',
                  border:`1px solid ${periodLog?.flow === o.key ? 'var(--accent)' : 'var(--border)'}`,
                  background:periodLog?.flow === o.key ? 'var(--accent-soft)' : 'transparent',
                  color:periodLog?.flow === o.key ? 'var(--accent)' : 'var(--text2)',
                }}>{o.emoji} {lang === 'en' ? o.en : o.ru}</button>
              ))}
            </div>

            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <div style={{ fontSize:11, color:'var(--text3)' }}>{rl('Боль сегодня','Pain today')}</div>
              <div style={{ fontSize:12, color:'var(--accent)' }}>{periodLog?.pain_level ?? 0}/10</div>
            </div>
            <input type="range" min="0" max="10" step="0.5" value={periodLog?.pain_level ?? 0}
              onChange={e => savePeriodDailyPatch({ pain_level:Number(e.target.value) })}
              style={{ width:'100%', accentColor:'var(--accent)', marginBottom:10 }} />

            <details style={{ marginTop:4 }}>
              <summary style={{ fontSize:11, color:'var(--text2)', cursor:'pointer' }}>{rl('Цвет и консистенция сегодня','Color and consistency today')}</summary>
              <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:8 }}>
                <div>
                  <div style={{ fontSize:10, color:'var(--text3)', marginBottom:5 }}>{rl('Цвет','Color')}</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {PERIOD_COLOR_OPTIONS.map(o => (
                      <button key={o.key} onClick={() => savePeriodDailyPatch({ color:o.key })} style={{
                        padding:'5px 8px', borderRadius:16, fontSize:10, cursor:'pointer',
                        border:`1px solid ${periodLog?.color === o.key ? 'var(--accent)' : 'var(--border)'}`,
                        background:periodLog?.color === o.key ? 'var(--accent-soft)' : 'transparent', color:'var(--text2)'
                      }}>{o.emoji} {lang === 'en' ? o.en : o.ru}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:10, color:'var(--text3)', marginBottom:5 }}>{rl('Консистенция','Consistency')}</div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {PERIOD_CONSISTENCY_OPTIONS.map(o => (
                      <button key={o.key} onClick={() => savePeriodDailyPatch({ consistency:o.key })} style={{
                        padding:'5px 8px', borderRadius:16, fontSize:10, cursor:'pointer',
                        border:`1px solid ${periodLog?.consistency === o.key ? 'var(--accent)' : 'var(--border)'}`,
                        background:periodLog?.consistency === o.key ? 'var(--accent-soft)' : 'transparent', color:'var(--text2)'
                      }}>{lang === 'en' ? o.en : o.ru}</button>
                    ))}
                  </div>
                </div>
              </div>
            </details>

            {periodDeviations.length > 0 && (
              <div style={{ marginTop:10, display:'flex', flexDirection:'column', gap:6 }}>
                {periodDeviations.slice(0,2).map((issue, idx) => (
                  <div key={idx} style={{ fontSize:11, color: issue.level === 'high' ? '#f87171' : 'var(--text2)', background:'var(--bg3)', borderRadius:8, padding:'8px 10px', lineHeight:1.45 }}>
                    {deviationText(issue)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Остальные типы */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
          {Object.entries(TYPE_META).filter(([t]) => t !== 'period').map(([type, meta]) => {
            const active = dayEntries.some(e=>e.type===type&&e.user_id===userId)
            return (
              <button key={type} onClick={() => onToggleType(type, dateKey)} style={{
                background:active?`${meta.color}22`:'var(--bg3)',
                border:`1.5px solid ${active?meta.color:'transparent'}`,
                borderRadius:10, padding:'10px 12px', cursor:'pointer',
                display:'flex', alignItems:'center', gap:8,
                color:'var(--text)', fontSize:12,
              }}>
                <span style={{ fontSize:16 }}>{meta.emoji}</span>
                <div>
                  <div>{phaseLabel(type)}</div>
                  {active && <div style={{ fontSize:10, color:meta.color }}>✓</div>}
                </div>
              </button>
            )
          })}
        </div>
      </div>}

      {!canEditCycle && (
        <div style={{ padding:'10px 12px', borderRadius:12, background:'var(--bg2)', border:'1px solid var(--border)', color:'var(--text2)', fontSize:12, lineHeight:1.5 }}>
          {rl('Цикл и месячные для этого профиля отключены. В этот день можно вести настроение, симптомы, интим, заметки и здоровье без фаз цикла.', 'Cycle and period tracking are disabled for this profile. You can still log mood, symptoms, intimacy, notes and health without cycle phases.')}
        </div>
      )}

      {/* STM — симптотермальный метод */}
      {stmEnabled && onSaveStmLog && (
        <div style={{ padding:'12px 14px', background:'var(--bg2)', borderRadius:12, border:'1px solid var(--border)' }}>
          <div style={{ fontSize:12, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:10 }}>
            🌡️ {rl('СТМ — температура и слизь', 'STM — temperature & mucus')}
          </div>
          
          {/* Базальная температура */}
          <div style={{ marginBottom:10 }}>
            <div style={{ fontSize:12, color:'var(--text2)', marginBottom:4 }}>{rl('Базальная температура (°C)','Basal temperature (°C)')}</div>
            <input
              type="number" step="0.01" min="35" max="40"
              value={stmLog.temp || ''}
              onChange={e => onSaveStmLog(dateKey, { temp: e.target.value ? parseFloat(e.target.value) : null })}
              placeholder="36.6"
              style={{ padding:'8px 10px', borderRadius:8, border:'1px solid var(--border)',
                background:'var(--bg3)', color:'var(--text)', fontSize:13, width:'100%' }}
            />
          </div>

          {/* Цервикальная слизь */}
          <div style={{ marginBottom:6 }}>
            <div style={{ fontSize:12, color:'var(--text2)', marginBottom:6 }}>{rl('Цервикальная слизь','Cervical mucus')}</div>
            <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
              {[
                { k:'dry',      ru:'Сухо',       en:'Dry' },
                { k:'sticky',   ru:'Клейкая',     en:'Sticky' },
                { k:'creamy',   ru:'Кремообразная',en:'Creamy' },
                { k:'watery',   ru:'Водянистая',  en:'Watery' },
                { k:'eggwhite', ru:'Яичный белок',en:'Egg white' },
              ].map(opt => {
                const active = stmLog.mucus === opt.k
                return (
                  <button key={opt.k} type="button"
                    onClick={() => onSaveStmLog(dateKey, { mucus: active ? null : opt.k })}
                    style={{
                      padding:'5px 10px', borderRadius:16, fontSize:11, cursor:'pointer',
                      border:`1px solid ${active?'var(--accent)':'var(--border)'}`,
                      background:active?'var(--accent-soft)':'transparent',
                      color:active?'var(--accent)':'var(--text2)',
                    }}>
                    {rl(opt.ru, opt.en)}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Состояние шейки матки - опционально */}
          <div>
            <div style={{ fontSize:12, color:'var(--text2)', marginBottom:6 }}>{rl('Шейка матки (необязательно)','Cervix (optional)')}</div>
            <div style={{ display:'flex', gap:5 }}>
              {[{k:'low_firm',ru:'Низкая/твёрдая',en:'Low/firm'},{k:'high_soft',ru:'Высокая/мягкая',en:'High/soft'}].map(opt => {
                const active = stmLog.cervix === opt.k
                return (
                  <button key={opt.k} type="button"
                    onClick={() => onSaveStmLog(dateKey, { cervix: active ? null : opt.k })}
                    style={{
                      padding:'5px 10px', borderRadius:16, fontSize:11, cursor:'pointer',
                      border:`1px solid ${active?'var(--accent)':'var(--border)'}`,
                      background:active?'var(--accent-soft)':'transparent',
                      color:active?'var(--accent)':'var(--text2)',
                    }}>
                    {rl(opt.ru, opt.en)}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

            {/* Быстрые ссылки на разделы */}
      <div>
        <div style={{ fontSize:11, color:'var(--text3)', marginBottom:8 }}>{rl('Добавить в этот день:','Add to this day:')}</div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {[
            { icon:'📝', label:rl('Дневник','Diary'), path:'/diary' },
            { icon:'🌹', label:rl('Интим','Intimacy'), path:'/intimacy' },
            { icon:'💊', label:rl('Таблетки','Meds'), path:'/medications' },
            { icon:'🩺', label:rl('Здоровье','Health'), path:'/health' },
          ].map(item => (
            <button key={item.path} onClick={() => navigate(item.path)} style={{
              padding:'7px 12px', borderRadius:20, fontSize:12, cursor:'pointer',
              border:'1px solid var(--border)', background:'var(--bg3)', color:'var(--text2)',
              display:'flex', alignItems:'center', gap:5,
            }}>
              <span>{item.icon}</span> <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
