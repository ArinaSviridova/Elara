import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang, useRl } from '../context/LangContext'
import { isPregnancyPlanningActive, loadPregnancyToggles, savePregnancyToggles, pregnancyPlanningItems, togglePregnancyItemStatus, loadPregnancyDrafts, removePregnancyDraft } from '../lib/pregnancyPlanningUi'
import AIAdvice from '../components/AIAdvice'
import InfoTooltip from '../components/InfoTooltip'
import { DnDActivityButton } from '../components/DnDWidget'

const WORKOUT_TYPES = [
  { key:'strength', emoji:'💪', ru:'Силовая', en:'Strength' },
  { key:'cardio', emoji:'🏃', ru:'Кардио', en:'Cardio' },
  { key:'hiit', emoji:'⚡', ru:'HIIT', en:'HIIT' },
  { key:'yoga', emoji:'🧘', ru:'Йога/растяжка', en:'Yoga/stretch' },
  { key:'mfr', emoji:'🪄', ru:'МФР/раскатка', en:'Myofascial release' },
  { key:'walk', emoji:'🚶', ru:'Прогулка', en:'Walk' },
  { key:'swim', emoji:'🏊', ru:'Плавание', en:'Swimming' },
  { key:'run', emoji:'🏃', ru:'Бег', en:'Running' },
  { key:'cycle', emoji:'🚴', ru:'Велосипед', en:'Cycling' },
  { key:'sex', emoji:'🌹', ru:'Интимная активность', en:'Intimate activity' },
  { key:'rest',       emoji:'😴', ru:'Активный отдых', en:'Active rest' },
  { key:'skate',      emoji:'🛹', ru:'Скейт',          en:'Skateboarding' },
  { key:'martial',    emoji:'🥊', ru:'Боевые искусства',en:'Martial arts' },
  { key:'crossfit',   emoji:'🏋️', ru:'Кроссфит',        en:'CrossFit' },
  { key:'boxing',     emoji:'🥊', ru:'Бокс',            en:'Boxing' },
  { key:'dance',      emoji:'💃', ru:'Танцы',           en:'Dancing' },
  { key:'hiit',       emoji:'⚡', ru:'ВИИТ',            en:'HIIT' },
  { key:'pilates',    emoji:'🧘', ru:'Пилатес',         en:'Pilates' },
  { key:'custom',     emoji:'✏️', ru:'Своё',            en:'Custom' },
,
  { key:'skate',   emoji:'🛹', ru:'Скейт',           en:'Skateboarding' },
  { key:'martial', emoji:'🥊', ru:'Боевые искусства', en:'Martial arts' },
  { key:'boxing',  emoji:'🥊', ru:'Бокс',             en:'Boxing' },
  { key:'crossfit',emoji:'🏋️', ru:'Кроссфит',         en:'CrossFit' },
  { key:'dance',   emoji:'💃', ru:'Танцы',             en:'Dancing' },
  { key:'pilates', emoji:'🧘', ru:'Пилатес',           en:'Pilates' },
  { key:'custom',  emoji:'✏️', ru:'Своё (вручную)',    en:'Custom (manual)' },
]

const SUPPLEMENTS = [
  { key:'creatine', emoji:'💊', ru:'Креатин', en:'Creatine', note:'PMC5466949' },
  { key:'protein', emoji:'🥛', ru:'Протеин', en:'Protein', note:'PMC5466949' },
  { key:'omega3', emoji:'🐟', ru:'Омега-3', en:'Omega-3', note:'PMC9183656' },
  { key:'magnesium', emoji:'🌙', ru:'Магний', en:'Magnesium' },
  { key:'vitamin_d', emoji:'☀️', ru:'Витамин D', en:'Vitamin D' },
  { key:'zinc', emoji:'⚡', ru:'Цинк', en:'Zinc' },
  { key:'electrolytes', emoji:'💧', ru:'Электролиты', en:'Electrolytes' },
  { key:'collagen', emoji:'✨', ru:'Коллаген', en:'Collagen' },
  { key:'iron', emoji:'🩸', ru:'Железо', en:'Iron' },
  { key:'b12', emoji:'🔋', ru:'B12', en:'B12' },
]

const INTENSITY = [
  { key:'light', ru:'Лёгкая', en:'Light', emoji:'🌿' },
  { key:'moderate', ru:'Средняя', en:'Moderate', emoji:'🔥' },
  { key:'intense', ru:'Интенсивная', en:'Intense', emoji:'⚡' },
]

export default function SportPage() {
  const { user, profile } = useAuth()
  const { lang } = useLang()
  const rl = useRl()
  const today = new Date().toISOString().slice(0,10)

  const [workouts, setWorkouts] = useState([])
  const [customWorkout, setCustomWorkout] = useState('')
  const [supplements, setSupplements] = useState([])
  const [intensity, setIntensity] = useState('moderate')
  const [duration, setDuration] = useState(30)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [todayLog, setTodayLog] = useState(null)
  const pregnancyActive = isPregnancyPlanningActive(profile)
  const [pregnancyToggles, setPregnancyToggles] = useState(() => loadPregnancyToggles(user?.id))
  const [pregnancyDrafts, setPregnancyDrafts] = useState(() => loadPregnancyDrafts(user?.id))
  const [expandedPregnancy, setExpandedPregnancy] = useState({})

  const todayMood = profile?.todayMood || null
  const isMale = ['male','trans_male'].includes(profile?.gender) || ['no_period','menopause'].includes(profile?.body_mode)

  useEffect(() => { loadTodayLog() }, [])

  async function loadTodayLog() {
    const { data } = await supabase
      .from('sport_logs').select('*').eq('user_id', user.id).eq('date', today).maybeSingle()
    if (data) {
      setWorkouts(data.workouts || [])
      setSupplements(data.supplements || [])
      setIntensity(data.intensity || 'moderate')
      setDuration(data.duration || 30)
      setNotes(data.notes || '')
      setCustomWorkout(data.custom_workout || '')
      setTodayLog(data)
    }
  }

  async function handleSave() {
    setSaving(true)
    await supabase.from('sport_logs').upsert({
      user_id: user.id, date: today,
      workouts, supplements, intensity, duration, notes, custom_workout: customWorkout
    }, { onConflict: 'user_id,date' })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function toggleItem(arr, setArr, key) {
    setArr(prev => prev.includes(key) ? prev.filter(k=>k!==key) : [...prev, key])
  }

  function togglePregnancyItem(itemId) {
    const next = { ...pregnancyToggles, [itemId]: togglePregnancyItemStatus(pregnancyToggles?.[itemId]) }
    setPregnancyToggles(next)
    savePregnancyToggles(user?.id, next)
  }

  function addDraftToSport(draft) {
    if (draft?.sourceItem === 'activity_plan') setWorkouts(prev => prev.includes('walk') ? prev : [...prev, 'walk'])
    if (draft?.sourceItem === 'sleep_recovery') setNotes(prev => prev || rl('Фокус подготовки: сон и восстановление. Обсудить нагрузку с врачом при боли, беременности или хронических состояниях.', 'Planning focus: sleep and recovery. Confirm activity with a clinician if pain, pregnancy or chronic conditions.'))
    setPregnancyDrafts(removePregnancyDraft(user?.id, draft.id))
  }

  // AI контекст для спортивных рекомендаций
  const sportContext = workouts.length > 0 ? `Тренировки сегодня: ${workouts.join(', ')}, интенсивность: ${intensity}` : null

  return (
    <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', padding:'20px 16px', gap:14, overflowY:'auto' }}>
      <h2 style={{ fontSize:26 }}>
        {isMale ? '💪' : '🏃'} {rl('Активность сегодня','Today\'s activity')}
      </h2>

      {/* Тип тренировки */}
      <div className="card" style={{ padding:'14px' }}>
        <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>
          {rl('Вид активности (можно несколько)','Activity type (multiple)')}
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
          {WORKOUT_TYPES.map(w => (
            <button key={w.key} onClick={() => toggleItem(workouts, setWorkouts, w.key)} style={{
              padding:'7px 12px', borderRadius:20, fontSize:12, cursor:'pointer',
              border:`1px solid ${workouts.includes(w.key)?'var(--accent)':'var(--border)'}`,
              background:workouts.includes(w.key)?'var(--accent-soft)':'transparent',
              color:workouts.includes(w.key)?'var(--accent)':'var(--text2)',
              display:'flex', alignItems:'center', gap:5,
            }}>
              <span>{w.emoji}</span> <span>{lang==='en'?w.en:w.ru}</span>
            </button>
          ))}
        </div>
        {/* Ручной ввод для своей активности */}
        {workouts.includes('custom') && (
          <div style={{ marginTop:8 }}>
            <input
              value={customWorkout}
              onChange={e => setCustomWorkout(e.target.value)}
              placeholder={rl('Введи название активности...','Enter activity name...')}
              style={{ width:'100%', padding:'9px 12px', borderRadius:10, border:'1px solid var(--border)',
                background:'var(--bg2)', color:'var(--text)', fontSize:13 }}
            />
          </div>
        )}
      </div>

      {/* Интенсивность + длительность */}
      {workouts.length > 0 && (
        <div className="card" style={{ padding:'14px', display:'flex', flexDirection:'column', gap:10 }}>
          <div>
            <div style={{ fontSize:11, color:'var(--text3)', marginBottom:8 }}>{rl('Интенсивность','Intensity')}</div>
            <div style={{ display:'flex', gap:6 }}>
              {INTENSITY.map(i => (
                <button key={i.key} onClick={() => setIntensity(i.key)} style={{
                  flex:1, padding:'9px', borderRadius:8, fontSize:12, cursor:'pointer',
                  border:`1px solid ${intensity===i.key?'var(--accent)':'var(--border)'}`,
                  background:intensity===i.key?'var(--accent-soft)':'transparent',
                  color:intensity===i.key?'var(--accent)':'var(--text2)',
                }}>
                  {i.emoji} {lang==='en'?i.en:i.ru}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
              <div style={{ fontSize:11, color:'var(--text3)' }}>{rl('Длительность','Duration')}</div>
              <div style={{ fontSize:13, fontWeight:500, color:'var(--accent)' }}>{duration} {rl('мин','min')}</div>
            </div>
            <input type="range" min="5" max="180" step="5" value={duration}
              onChange={e => setDuration(Number(e.target.value))}
              style={{ width:'100%', accentColor:'var(--accent)' }} />
          </div>
        </div>
      )}

      {/* Добавки */}
      <div className="card" style={{ padding:'14px' }}>
        <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>
          💊 {rl('Принял(а) сегодня','Taken today')}
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
          {SUPPLEMENTS.map(s => (
            <button key={s.key} onClick={() => toggleItem(supplements, setSupplements, s.key)} style={{
              padding:'7px 12px', borderRadius:20, fontSize:12, cursor:'pointer',
              border:`1px solid ${supplements.includes(s.key)?'#4ade80':'var(--border)'}`,
              background:supplements.includes(s.key)?'rgba(74,222,128,0.1)':'transparent',
              color:supplements.includes(s.key)?'#4ade80':'var(--text2)',
              display:'flex', alignItems:'center', gap:5,
            }}>
              <span>{s.emoji}</span> <span>{lang==='en'?s.en:s.ru}</span>
              <InfoTooltip id={`supplement_${s.key}`} />
            </button>
          ))}
        </div>
        <div style={{ fontSize:10, color:'var(--text3)', marginTop:8 }}>📚 PMC5466949 · PMC9183656</div>
      </div>

      {/* AI Тренер */}
      <AIAdvice
        requestType="sport_advice"
        cyclePhase={profile?.currentPhase}
        todayMood={todayMood}
        extraContext={sportContext}
        label={`🤖 ${rl('AI-тренер: совет на сегодня','AI Coach: today\'s advice')}`}
      />

      {/* D&D для выбора спорта */}
      <DnDActivityButton activity="sport" />

      {/* Заметка */}
      <div>
        <div style={{ fontSize:11, color:'var(--text3)', marginBottom:5 }}>{rl('Заметка','Note')}</div>
        <input placeholder={rl('Самочувствие после тренировки...','How did the workout feel...')}
          value={notes} onChange={e => setNotes(e.target.value)} />
      </div>

      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
        {saved ? '✓' : saving ? '...' : rl('Сохранить','Save')}
      </button>

      {/* Научная база */}
      <div style={{ padding:'12px 14px', background:'var(--bg2)', borderRadius:10, border:'1px solid var(--border)', fontSize:11, color:'var(--text3)', lineHeight:1.7 }}>
        📚 {rl('Основано на:','Based on:')} PMC1470658 (спорт и психика), PMC4241904 (кортизол), PMC3522336 (сон и тестостерон)
      </div>
    </div>
  )
}
