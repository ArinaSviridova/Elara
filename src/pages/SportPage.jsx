import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang, useRl } from '../context/LangContext'
import AIAdvice from '../components/AIAdvice'
import { DnDActivityButton } from '../components/DnDWidget'
import { notifyCircleChange } from '../lib/socialNotifications'

const WORKOUT_CATEGORIES = [
  { key:'cardio', emoji:'❤️', ru:'Кардио', en:'Cardio', items:[
    { key:'run', emoji:'🏃', ru:'Бег', en:'Running' },
    { key:'walk', emoji:'🚶', ru:'Ходьба', en:'Walking' },
    { key:'hike', emoji:'🥾', ru:'Хайкинг', en:'Hiking' },
    { key:'swim', emoji:'🏊', ru:'Плавание', en:'Swimming' },
    { key:'cycle', emoji:'🚴', ru:'Велосипед', en:'Cycling' },
    { key:'spin', emoji:'🎯', ru:'Спиннинг', en:'Spinning' },
    { key:'row', emoji:'🚣', ru:'Гребля', en:'Rowing' },
    { key:'jump_rope', emoji:'⭕', ru:'Скакалка', en:'Jump rope' },
    { key:'elliptical', emoji:'〰️', ru:'Эллипсоид', en:'Elliptical' },
    { key:'stair', emoji:'🪜', ru:'Степпер', en:'Stair climbing' },
    { key:'nordic_walk', emoji:'🏕', ru:'Скандинавская ходьба', en:'Nordic walking' },
    { key:'rollerblade', emoji:'🛼', ru:'Ролики', en:'Rollerblading' },
    { key:'ski', emoji:'⛷', ru:'Лыжи', en:'Skiing' },
    { key:'snowboard', emoji:'🏂', ru:'Сноуборд', en:'Snowboarding' },
    { key:'ice_skate', emoji:'⛸', ru:'Коньки', en:'Ice skating' },
  ]},
  { key:'strength', emoji:'💪', ru:'Силовые', en:'Strength', items:[
    { key:'strength_gym', emoji:'🏋️', ru:'Силовая (зал)', en:'Weight training' },
    { key:'crossfit', emoji:'🔥', ru:'Кроссфит', en:'CrossFit' },
    { key:'calisthenics', emoji:'🤸', ru:'Калистеника', en:'Calisthenics' },
    { key:'powerlifting', emoji:'🏆', ru:'Пауэрлифтинг', en:'Powerlifting' },
    { key:'bodyweight', emoji:'💪', ru:'С весом тела', en:'Bodyweight' },
    { key:'kettlebell', emoji:'🔔', ru:'Гиря', en:'Kettlebell' },
    { key:'trx', emoji:'🪢', ru:'TRX', en:'TRX' },
    { key:'resistance', emoji:'🟣', ru:'Резина/эспандер', en:'Resistance bands' },
    { key:'circuit', emoji:'⚡', ru:'Круговая', en:'Circuit training' },
    { key:'tabata', emoji:'⏱', ru:'Табата', en:'Tabata' },
    { key:'functional', emoji:'🎯', ru:'Функциональная', en:'Functional' },
  ]},
  { key:'hiit_sport', emoji:'⚡', ru:'ВИИТ и единоборства', en:'HIIT & combat', items:[
    { key:'hiit', emoji:'⚡', ru:'HIIT', en:'HIIT' },
    { key:'sprint', emoji:'💨', ru:'Спринты', en:'Sprints' },
    { key:'boxing', emoji:'🥊', ru:'Бокс', en:'Boxing' },
    { key:'kickboxing', emoji:'🦵', ru:'Кикбоксинг', en:'Kickboxing' },
    { key:'martial', emoji:'🥋', ru:'Боевые искусства', en:'Martial arts' },
    { key:'mma', emoji:'🏟', ru:'MMA', en:'MMA' },
    { key:'muay_thai', emoji:'🇹🇭', ru:'Муай-тай', en:'Muay Thai' },
    { key:'judo', emoji:'🥋', ru:'Дзюдо', en:'Judo' },
    { key:'wrestling', emoji:'🤼', ru:'Борьба', en:'Wrestling' },
    { key:'fencing', emoji:'🤺', ru:'Фехтование', en:'Fencing' },
  ]},
  { key:'flexibility', emoji:'🧘', ru:'Гибкость и восстановление', en:'Flexibility & recovery', items:[
    { key:'yoga', emoji:'🧘', ru:'Йога', en:'Yoga' },
    { key:'pilates', emoji:'🌸', ru:'Пилатес', en:'Pilates' },
    { key:'stretch', emoji:'🤸', ru:'Растяжка', en:'Stretching' },
    { key:'mfr', emoji:'🪄', ru:'МФР/foam roll', en:'Foam rolling' },
    { key:'tai_chi', emoji:'☯️', ru:'Тайцзи', en:'Tai chi' },
    { key:'barre', emoji:'🩰', ru:'Барр/балет', en:'Barre' },
    { key:'mobility', emoji:'💜', ru:'Мобильность', en:'Mobility' },
    { key:'rest', emoji:'😴', ru:'Активный отдых', en:'Active rest' },
    { key:'massage', emoji:'💆', ru:'Массаж', en:'Massage' },
    { key:'sauna', emoji:'🔥', ru:'Сауна/баня', en:'Sauna' },
  ]},
  { key:'team', emoji:'👥', ru:'Командные и игровые', en:'Team & games', items:[
    { key:'football', emoji:'⚽', ru:'Футбол', en:'Soccer/Football' },
    { key:'basketball', emoji:'🏀', ru:'Баскетбол', en:'Basketball' },
    { key:'volleyball', emoji:'🏐', ru:'Волейбол', en:'Volleyball' },
    { key:'tennis', emoji:'🎾', ru:'Теннис', en:'Tennis' },
    { key:'badminton', emoji:'🏸', ru:'Бадминтон', en:'Badminton' },
    { key:'pingpong', emoji:'🏓', ru:'Настольный теннис', en:'Table tennis' },
    { key:'hockey', emoji:'🏒', ru:'Хоккей', en:'Hockey' },
    { key:'rugby', emoji:'🏉', ru:'Регби', en:'Rugby' },
    { key:'squash', emoji:'🎯', ru:'Сквош', en:'Squash' },
    { key:'golf', emoji:'⛳', ru:'Гольф', en:'Golf' },
  ]},
  { key:'dance_art', emoji:'💃', ru:'Танцы', en:'Dance', items:[
    { key:'dance', emoji:'💃', ru:'Танцы (общее)', en:'Dancing' },
    { key:'zumba', emoji:'🎵', ru:'Зумба', en:'Zumba' },
    { key:'hiphop', emoji:'🎤', ru:'Хип-хоп', en:'Hip-hop' },
    { key:'contemporary', emoji:'🎭', ru:'Контемпорари', en:'Contemporary' },
    { key:'aerial', emoji:'🎪', ru:'Воздушная гимнастика', en:'Aerial' },
    { key:'acrobatics', emoji:'🤸', ru:'Акробатика', en:'Acrobatics' },
    { key:'pole', emoji:'💫', ru:'Пилон', en:'Pole dance' },
  ]},
  { key:'outdoor', emoji:'🌿', ru:'Экстрим и на улице', en:'Outdoor & extreme', items:[
    { key:'skate', emoji:'🛹', ru:'Скейтборд', en:'Skateboarding' },
    { key:'surf', emoji:'🏄', ru:'Сёрфинг', en:'Surfing' },
    { key:'climb', emoji:'🧗', ru:'Скалолазание', en:'Rock climbing' },
    { key:'kayak', emoji:'🚣', ru:'Каяк/SUP', en:'Kayak/SUP' },
    { key:'triathlon', emoji:'🏅', ru:'Триатлон', en:'Triathlon' },
    { key:'marathon', emoji:'🏁', ru:'Марафон', en:'Marathon' },
    { key:'parkour', emoji:'🏃', ru:'Паркур', en:'Parkour' },
    { key:'bmx', emoji:'🚲', ru:'BMX', en:'BMX' },
    { key:'horse', emoji:'🐴', ru:'Верховая езда', en:'Horse riding' },
  ]},
  { key:'mindful', emoji:'🌙', ru:'Осознанные практики', en:'Mindful', items:[
    { key:'sex', emoji:'🌹', ru:'Интимная активность', en:'Intimate activity' },
    { key:'breathwork', emoji:'🌬', ru:'Дыхательные практики', en:'Breathwork' },
    { key:'aqua', emoji:'💧', ru:'Аква-аэробика', en:'Aqua aerobics' },
    { key:'bowling', emoji:'🎳', ru:'Боулинг', en:'Bowling' },
    { key:'custom', emoji:'✏️', ru:'Своё (вручную)', en:'Custom' },
  ]},
]


const SUPPLEMENT_CATEGORIES = [
  { key:'performance', emoji:'💪', ru:'Сила и выносливость', en:'Performance', items:[
    { key:'creatine', emoji:'⚡', ru:'Креатин', en:'Creatine', kcal:0 },
    { key:'bcaa', emoji:'🔵', ru:'BCAA', en:'BCAA', kcal:20 },
    { key:'eaa', emoji:'🟣', ru:'EAA', en:'EAA', kcal:25 },
    { key:'beta_alanine', emoji:'🔥', ru:'Бета-аланин', en:'Beta-alanine', kcal:0 },
    { key:'citrulline', emoji:'🍋', ru:'Цитруллин', en:'Citrulline', kcal:0 },
    { key:'pre_workout', emoji:'⚡', ru:'Предтренировочный', en:'Pre-workout', kcal:15 },
    { key:'carnitine', emoji:'🔶', ru:'Л-карнитин', en:'L-carnitine', kcal:0 },
  ]},
  { key:'protein_mass', emoji:'🥛', ru:'Белок и масса', en:'Protein & mass', items:[
    { key:'whey', emoji:'🥛', ru:'Сывороточный протеин', en:'Whey protein', kcal:120 },
    { key:'casein', emoji:'🌙', ru:'Казеин', en:'Casein', kcal:120 },
    { key:'plant_protein', emoji:'🌱', ru:'Растительный протеин', en:'Plant protein', kcal:110 },
    { key:'gainer', emoji:'🏋️', ru:'Гейнер', en:'Mass gainer', kcal:350 },
    { key:'collagen', emoji:'✨', ru:'Коллаген', en:'Collagen', kcal:35 },
  ]},
  { key:'vitamins', emoji:'☀️', ru:'Витамины и минералы', en:'Vitamins & minerals', items:[
    { key:'vitamin_d', emoji:'☀️', ru:'Витамин D3', en:'Vitamin D3', kcal:0 },
    { key:'vitamin_c', emoji:'🍊', ru:'Витамин C', en:'Vitamin C', kcal:0 },
    { key:'b_complex', emoji:'🔋', ru:'Комплекс B', en:'B-complex', kcal:0 },
    { key:'b12', emoji:'💊', ru:'B12', en:'B12', kcal:0 },
    { key:'folate', emoji:'🟢', ru:'Фолат/В9', en:'Folate/B9', kcal:0 },
    { key:'iron', emoji:'🩸', ru:'Железо', en:'Iron', kcal:0 },
    { key:'zinc', emoji:'⚡', ru:'Цинк', en:'Zinc', kcal:0 },
    { key:'magnesium', emoji:'🌙', ru:'Магний', en:'Magnesium', kcal:0 },
    { key:'calcium', emoji:'🦷', ru:'Кальций', en:'Calcium', kcal:0 },
    { key:'potassium', emoji:'🍌', ru:'Калий', en:'Potassium', kcal:0 },
    { key:'selenium', emoji:'🟡', ru:'Селен', en:'Selenium', kcal:0 },
    { key:'multivitamin', emoji:'💊', ru:'Мультивитамины', en:'Multivitamin', kcal:0 },
    { key:'protein_ref', emoji:'🥛', ru:'Протеин (прежний)', en:'Protein', kcal:120 },
    { key:'omega3', emoji:'🐟', ru:'Омега-3', en:'Omega-3', kcal:45 },
    { key:'electrolytes', emoji:'💧', ru:'Электролиты', en:'Electrolytes', kcal:5 },
  ]},
  { key:'health', emoji:'💜', ru:'Здоровье и гормоны', en:'Health & hormones', items:[
    { key:'probiotics', emoji:'🦠', ru:'Пробиотики', en:'Probiotics', kcal:0 },
    { key:'ashwagandha', emoji:'🌿', ru:'Ашваганда', en:'Ashwagandha', kcal:0 },
    { key:'melatonin', emoji:'🌙', ru:'Мелатонин', en:'Melatonin', kcal:0 },
    { key:'coq10', emoji:'❤️', ru:'Коэнзим Q10', en:'CoQ10', kcal:0 },
    { key:'turmeric', emoji:'🟡', ru:'Куркумин', en:'Curcumin', kcal:0 },
    { key:'maca', emoji:'🌾', ru:'Мака', en:'Maca root', kcal:15 },
    { key:'vitex', emoji:'🌸', ru:'Витекс', en:'Vitex', kcal:0 },
    { key:'evening_prim', emoji:'🌻', ru:'Масло примулы', en:'Evening primrose', kcal:40 },
    { key:'inositol', emoji:'🍊', ru:'Инозитол', en:'Inositol', kcal:0 },
  ]},
  { key:'recovery', emoji:'🔄', ru:'Восстановление', en:'Recovery', items:[
    { key:'glutamine', emoji:'🔄', ru:'Глютамин', en:'Glutamine', kcal:0 },
    { key:'tart_cherry', emoji:'🍒', ru:'Экстракт вишни', en:'Tart cherry', kcal:10 },
    { key:'sleep_supp', emoji:'😴', ru:'Комплекс для сна', en:'Sleep support', kcal:0 },
    { key:'zma', emoji:'💊', ru:'ZMA', en:'ZMA', kcal:0 },
  ]},
]


const INTENSITY = [
  { key:'light', ru:'Лёгкая', en:'Light', emoji:'🌿' },
  { key:'moderate', ru:'Средняя', en:'Moderate', emoji:'🔥' },
  { key:'intense', ru:'Интенсивная', en:'Intense', emoji:'⚡' },
]

function sportLocalKey(userId, date) {
  return `elara_sport_log_${userId}_${date}`
}

function readLocalSportLog(userId, date) {
  try { return JSON.parse(localStorage.getItem(sportLocalKey(userId, date)) || 'null') } catch { return null }
}

function saveLocalSportLog(userId, date, payload) {
  localStorage.setItem(sportLocalKey(userId, date), JSON.stringify(payload))
}


export default function SportPage() {
  const { user, profile } = useAuth()
  const { lang } = useLang()
  const rl = useRl()
  const today = new Date().toISOString().slice(0,10)

  const [workoutSearch, setWorkoutSearch] = useState('')
  const [suppSearch, setSuppSearch] = useState('')
  const [workouts, setWorkouts] = useState([])
  const [customWorkout, setCustomWorkout] = useState('')
  const [supplements, setSupplements] = useState([])
  const [intensity, setIntensity] = useState('moderate')
  const [duration, setDuration] = useState(30)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dbUnavailable, setDbUnavailable] = useState(false)

  const todayMood = profile?.todayMood || null
  const isMale = ['male','trans_male'].includes(profile?.gender) || ['no_period','menopause'].includes(profile?.body_mode)

  useEffect(() => {
    if (user?.id) loadTodayLog()
  }, [user?.id])

  async function loadTodayLog() {
    if (!user?.id) return

    const localLog = readLocalSportLog(user.id, today)
    if (localLog) applySportLog(localLog)

    const { data, error } = await supabase
      .from('sport_logs').select('*').eq('user_id', user.id).eq('date', today).maybeSingle()
    if (error) {
      console.warn('Sport logs fallback to localStorage:', error)
      setDbUnavailable(true)
      return
    }
    setDbUnavailable(false)
    if (data) {
      applySportLog(data)
      saveLocalSportLog(user.id, today, data)
    }
  }

  function applySportLog(data) {
    if (!data) return
    setWorkouts(data.workouts || [])
    setSupplements(data.supplements || [])
    setIntensity(data.intensity || 'moderate')
    setDuration(data.duration || 30)
    setNotes(data.notes || '')
    setCustomWorkout(data.custom_workout || '')
  }

  async function handleSave() {
    if (!user?.id || saving) return

    setSaving(true)

    const payload = {
      user_id: user.id,
      date: today,
      workouts,
      supplements,
      intensity,
      duration,
      notes,
      custom_workout: customWorkout,
    }

    saveLocalSportLog(user.id, today, payload)

    const { error } = await supabase.from('sport_logs').upsert(payload, { onConflict: 'user_id,date' })

    setSaving(false)

    if (error) {
      console.warn('Sport log was saved locally only:', error)
      setDbUnavailable(true)
    } else {
      setDbUnavailable(false)
      notifyCircleChange({ userId:user.id, profile, changeType:'sport', details:payload, lang, actionUrl:'/sport' }).catch(()=>{})
    }

    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function toggleItem(arr, setArr, key) {
    setArr(prev => prev.includes(key) ? prev.filter(k=>k!==key) : [...prev, key])
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
          <>
          <input value={workoutSearch} onChange={e => setWorkoutSearch(e.target.value)}
            placeholder={rl('Поиск активности...','Search activity...')}
            style={{ width:'100%', padding:'8px 12px', borderRadius:10, border:'1px solid var(--border)',
              background:'var(--bg3)', color:'var(--text)', fontSize:13, marginBottom:8 }}
          />
          {WORKOUT_CATEGORIES.map((cat, ci) => {
            const filtered = workoutSearch
              ? cat.items.filter(w => (lang==='en'?w.en:w.ru).toLowerCase().includes(workoutSearch.toLowerCase()))
              : cat.items
            if (!filtered.length) return null
            return <div key={cat.key}>
              <div style={{ fontSize:11, color:'var(--text3)', fontWeight:600, textTransform:'uppercase',
                letterSpacing:'0.06em', marginBottom:5, marginTop:8, display:'flex', alignItems:'center', gap:4 }}>
                {cat.emoji} {lang==='en'?cat.en:cat.ru}
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                {filtered.map((w, wi) =>
                  <button key={cat.key+'_'+w.key+'_'+ci+'_'+wi}
                    onClick={() => toggleItem(workouts, setWorkouts, w.key)}
                    style={{ padding:'6px 10px', borderRadius:20, fontSize:12, cursor:'pointer',
                      border:`1px solid ${workouts.includes(w.key)?'var(--accent)':'var(--border)'}`,
                      background:workouts.includes(w.key)?'var(--accent-soft)':'transparent',
                      color:workouts.includes(w.key)?'var(--accent)':'var(--text2)' }}>
                    {w.emoji} {lang==='en'?w.en:w.ru}
                  </button>
                )}
              </div>
            </div>
          })}
        </>
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
            <input type="range" min="5" max="180" step="1" value={duration}
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
          <>
          <input value={suppSearch} onChange={e => setSuppSearch(e.target.value)}
            placeholder={rl('Поиск добавки...','Search supplement...')}
            style={{ width:'100%', padding:'8px 12px', borderRadius:10, border:'1px solid var(--border)',
              background:'var(--bg3)', color:'var(--text)', fontSize:13, marginBottom:8 }}
          />
          {SUPPLEMENT_CATEGORIES.map((cat, ci) => {
            const filteredS = suppSearch
              ? cat.items.filter(s => (lang==='en'?s.en:s.ru).toLowerCase().includes(suppSearch.toLowerCase()))
              : cat.items
            if (!filteredS.length) return null
            return <div key={cat.key}>
              <div style={{ fontSize:11, color:'var(--text3)', fontWeight:600, textTransform:'uppercase',
                letterSpacing:'0.06em', marginBottom:5, marginTop:8, display:'flex', alignItems:'center', gap:4 }}>
                {cat.emoji} {lang==='en'?cat.en:cat.ru}
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                {filteredS.map((s, si) =>
                  <button key={cat.key+'_'+s.key+'_'+ci+'_'+si}
                    onClick={() => toggleItem(supplements, setSupplements, s.key)}
                    style={{ padding:'6px 10px', borderRadius:20, fontSize:12, cursor:'pointer',
                      border:`1px solid ${supplements.includes(s.key)?'var(--accent)':'var(--border)'}`,
                      background:supplements.includes(s.key)?'var(--accent-soft)':'transparent',
                      color:supplements.includes(s.key)?'var(--accent)':'var(--text2)' }}>
                    {s.emoji} {lang==='en'?s.en:s.ru}
                    {s.kcal>0&&<span style={{fontSize:10,opacity:0.6,marginLeft:3}}>{s.kcal}кк</span>}
                  </button>
                )}
              </div>
            </div>
          })}
        </>
        <div style={{ fontSize:10, color:'var(--text3)', marginTop:8 }}>📚 PMC5466949 · PMC9183656</div>
        </div>
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
      {dbUnavailable && (
        <div style={{ fontSize:11, color:'#fb923c', lineHeight:1.45 }}>
          {rl('Тренировка сохранена локально. Для синхронизации между устройствами добавь таблицу sport_logs из SQL-миграции.', 'Workout saved locally. Add sport_logs from the SQL migration for cross-device sync.')}
        </div>
      )}

      {/* Научная база */}
      <div style={{ padding:'12px 14px', background:'var(--bg2)', borderRadius:10, border:'1px solid var(--border)', fontSize:11, color:'var(--text3)', lineHeight:1.7 }}>
        <span>📚 </span>{rl('Основано на:','Based on:')}<span> PMC1470658 · PMC4241904 · PMC3522336</span>
      </div>
    </div>
  )
}
