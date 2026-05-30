import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import AIAdvice from '../components/AIAdvice'

// Данные о плоде и событиях по неделям
const WEEK_DATA = {
  4:  { size: 'маковое зёрнышко', sizeMm: 1, emoji: '🌱', desc: 'Эмбрион прикрепился к стенке матки. Формируется нервная трубка.' },
  6:  { size: 'чечевица', sizeMm: 6, emoji: '🫘', desc: 'Бьётся маленькое сердце — 100-160 ударов в минуту.' },
  8:  { size: 'малина', sizeMm: 16, emoji: '🍇', desc: 'Формируются все основные органы. Появляются крошечные пальчики.' },
  10: { size: 'клубника', sizeMm: 30, emoji: '🍓', desc: 'Малыш уже двигается, хотя ты этого не чувствуешь. Мозг активно развивается.' },
  12: { size: 'слива', sizeMm: 55, emoji: '🫐', desc: 'Первый триместр позади! Риск выкидыша значительно снижается.' },
  14: { size: 'лимон', sizeMm: 87, emoji: '🍋', desc: 'Малыш умеет гримасничать и сосать большой пальчик.' },
  16: { size: 'авокадо', sizeMm: 117, emoji: '🥑', desc: 'Формируются уши — малыш начинает слышать твой голос.' },
  18: { size: 'манго', sizeMm: 143, emoji: '🥭', desc: 'Можно узнать пол! Появляются первые движения — «порхание бабочек».' },
  20: { size: 'банан', sizeMm: 165, emoji: '🍌', desc: 'Половина пути! Покрывается защитной смазкой — вернiксом.' },
  22: { size: 'кукуруза', sizeMm: 193, emoji: '🌽', desc: 'Мозг развивается очень быстро. Малыш реагирует на свет и звук.' },
  24: { size: 'дыня', sizeMm: 300, emoji: '🍈', desc: 'Открывает и закрывает глазки. Может икать — ты это почувствуешь!' },
  28: { size: 'баклажан', sizeMm: 380, emoji: '🍆', desc: 'Третий триместр! Мозг быстро растёт, формируются извилины.' },
  32: { size: 'кочан капусты', sizeMm: 430, emoji: '🥬', desc: 'Занимает позицию головой вниз. Тренирует дыхание.' },
  36: { size: 'папайя', sizeMm: 480, emoji: '🌺', desc: 'Почти готов! Набирает ~30г жира в день. Лёгкие созрели.' },
  38: { size: 'тыква', sizeMm: 500, emoji: '🎃', desc: 'Полностью готов к рождению. Ждём!' },
  40: { size: 'арбуз', sizeMm: 510, emoji: '🍉', desc: 'ПДР наступил! Доверяй своему телу — всё получится 💙' },
}

// Скрининги и УЗИ по неделям
const PREGNANCY_EVENTS = [
  { week: 10, type: 'screening', title: 'Первый скрининг', desc: 'УЗИ + анализ крови (ХГЧ, PAPP-A). Оценка риска хромосомных аномалий.' },
  { week: 12, type: 'ultrasound', title: 'УЗИ 1 триместра', desc: 'Измерение ТВП, длины носовой кости. Важнейшее УЗИ!' },
  { week: 16, type: 'test', title: 'Анализ крови', desc: 'Общий анализ крови, ферритин, глюкоза.' },
  { week: 18, type: 'ultrasound', title: 'УЗИ 2 триместра', desc: 'Анатомия плода, пол, место прикрепления плаценты.' },
  { week: 20, type: 'screening', title: 'Второй скрининг', desc: 'Детальное изучение анатомии, допплер сосудов.' },
  { week: 24, type: 'test', title: 'Тест на диабет (ГТТ)', desc: 'Глюкозотолерантный тест. Обязателен для всех.' },
  { week: 28, type: 'appointment', title: 'Антирезусный иммуноглобулин', desc: 'Если у тебя Rh-отрицательная кровь.' },
  { week: 30, type: 'ultrasound', title: 'УЗИ 3 триместра', desc: 'Положение плода, вес, количество вод, плацента.' },
  { week: 32, type: 'screening', title: 'Третий скрининг + допплер', desc: 'Оценка кровотока. КТГ (если назначено).' },
  { week: 36, type: 'test', title: 'Мазок на стрептококк', desc: 'Посев из влагалища и прямой кишки.' },
  { week: 38, type: 'appointment', title: 'Сумка в роддом', desc: 'Самое время собрать! Документы, одежда, предметы первой необходимости.' },
]

function getWeekInfo(week) {
  const weeks = Object.keys(WEEK_DATA).map(Number).sort((a,b) => b-a)
  const closest = weeks.find(w => week >= w)
  return closest ? WEEK_DATA[closest] : null
}

function getUpcomingEvents(week) {
  return PREGNANCY_EVENTS
    .filter(e => e.week >= week && e.week <= week + 6)
    .sort((a,b) => a.week - b.week)
}

const EVENT_ICONS = {
  ultrasound: '🔊',
  screening: '🧪',
  test: '💉',
  appointment: '📋',
  vaccination: '💊',
}

const SYMPTOM_OPTIONS = [
  'тошнота', 'усталость', 'изжога', 'боли в спине', 'отёки',
  'головокружение', 'перепады настроения', 'бессонница', 'схватки Брэкстона',
  'тяга к еде', 'отвращение к запахам', 'частое мочеиспускание',
]

const EMOTION_OPTIONS = ['радость', 'тревога', 'умиротворение', 'страх', 'нетерпение', 'усталость', 'любовь', 'растерянность']


// Карточка совета с навигацией
function TipCard({ tip, navigate, lang }) {
  const [open, setOpen] = useState(false)
  const rl = (ru, en) => lang === 'en' ? en : ru
  return (
    <div style={{ borderRadius:12, border:'1px solid var(--border)', overflow:'hidden' }}>
      <button onClick={() => setOpen(p=>!p)} style={{
        width:'100%', padding:'12px 14px', background:'var(--bg2)', border:'none',
        cursor:'pointer', display:'flex', alignItems:'center', gap:10, textAlign:'left',
      }}>
        <span style={{ fontSize:20, flexShrink:0 }}>{tip.emoji}</span>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:500, color:'var(--text)' }}>{tip.title}</div>
        </div>
        <span style={{ color:'var(--text3)', fontSize:12, transition:'transform 0.2s', transform:open?'rotate(180deg)':'none' }}>▼</span>
      </button>
      {open && (
        <div style={{ padding:'0 14px 14px', background:'var(--bg2)', borderTop:'1px solid var(--border)' }}>
          <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6, margin:'10px 0' }}>{tip.body}</p>
          {tip.ref && (
            <div style={{ fontSize:11, color:'var(--text3)', padding:'6px 10px', background:'var(--bg3)', borderRadius:8, marginBottom:10, lineHeight:1.5 }}>
              📚 {tip.refText}
            </div>
          )}
          <button onClick={() => navigate(tip.url)} style={{
            width:'100%', padding:'10px', borderRadius:10,
            background:'var(--accent-soft)', border:'1px solid var(--accent)',
            color:'var(--accent)', fontSize:13, cursor:'pointer', fontWeight:500,
          }}>
            {tip.label} →
          </button>
        </div>
      )}
    </div>
  )
}

export default function PregnancyPage() {
  const navigate = useNavigate()
  const { user, profile, updateProfile } = useAuth()
  const { lang } = useLang()
  const rl = (ru, en) => lang === 'en' ? en : ru
  const today = new Date().toISOString().slice(0,10)

  const [week, setWeek] = useState(profile?.pregnancy_week || 8)
  const [log, setLog] = useState(null)
  const [weight, setWeight] = useState('')
  const [bpS, setBpS] = useState('')
  const [bpD, setBpD] = useState('')
  const [symptoms, setSymptoms] = useState([])
  const [emotions, setEmotions] = useState([])
  const [kicks, setKicks] = useState('')
  const [water, setWater] = useState('')
  const [meds, setMeds] = useState({ folic_acid: false, iron: false, vitamin_d: false })
  const [customVitamins, setCustomVitamins] = useState([])
  const [newVitamin, setNewVitamin] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState('today') // today | info | events | meds

  useEffect(() => { loadLog() }, [])

  async function loadLog() {
    const { data } = await supabase
      .from('pregnancy_log').select('*').eq('user_id', user.id).eq('date', today).maybeSingle()
    if (data) {
      setWeek(data.week || profile?.pregnancy_week || 8)
      setWeight(data.weight || '')
      setBpS(data.bp_systolic || '')
      setBpD(data.bp_diastolic || '')
      setSymptoms(data.symptoms || [])
      setEmotions(data.emotions || [])
      setKicks(data.kicks_count || '')
      setWater(data.water_ml || '')
      setMeds({ folic_acid: data.folic_acid || false, iron: data.iron || false, vitamin_d: data.vitamin_d || false })
      setNotes(data.notes || '')
    }
  }

  async function handleSave() {
    setSaving(true)
    await supabase.from('pregnancy_log').upsert({
      user_id: user.id, date: today, week: parseInt(week),
      weight: weight ? parseFloat(weight) : null,
      bp_systolic: bpS ? parseInt(bpS) : null,
      bp_diastolic: bpD ? parseInt(bpD) : null,
      symptoms, emotions,
      kicks_count: kicks ? parseInt(kicks) : null,
      water_ml: water ? parseInt(water) : null,
      ...meds, notes,
    }, { onConflict: 'user_id,date' })
    await updateProfile({ pregnancy_week: parseInt(week) })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function toggle(arr, setArr, val) {
    setArr(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val])
  }

  const weekInfo = getWeekInfo(week)
  const upcoming = getUpcomingEvents(week)
  const dueWeek = 40
  const weeksLeft = Math.max(0, dueWeek - week)

  return (
    <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', gap:0, overflowY:'auto' }}>

      {/* Шапка */}
      <div style={{ padding:'20px 16px 12px', background:'var(--bg2)', borderBottom:'1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <h2 style={{ fontSize:26 }}>🌸 {rl('Беременность','Pregnancy')}</h2>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:11, color:'var(--text3)' }}>{rl('осталось','left')}</div>
            <div style={{ fontSize:20, fontFamily:'Cormorant Garamond, serif', color:'var(--accent)' }}>{weeksLeft} {rl('нед','wk')}</div>
          </div>
        </div>

        {/* Прогресс-бар */}
        <div style={{ height:6, background:'var(--bg3)', borderRadius:3, marginBottom:8 }}>
          <div style={{ height:'100%', width:`${Math.min(100,(week/40)*100)}%`, background:'var(--accent)', borderRadius:3, transition:'width 0.3s' }} />
        </div>

        {/* Неделя */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:16 }}>
          <button onClick={() => setWeek(w => Math.max(4,w-1))} style={{ background:'none', border:'none', color:'var(--text2)', cursor:'pointer', fontSize:22 }}>‹</button>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:40, fontFamily:'Cormorant Garamond, serif', color:'var(--accent)', lineHeight:1 }}>{week}</div>
            <div style={{ fontSize:12, color:'var(--text3)' }}>{rl('неделя','week')}</div>
          </div>
          <button onClick={() => setWeek(w => Math.min(42,w+1))} style={{ background:'none', border:'none', color:'var(--text2)', cursor:'pointer', fontSize:22 }}>›</button>
        </div>

        {/* Размер плода */}
        {weekInfo && (
          <div style={{ textAlign:'center', marginTop:8 }}>
            <span style={{ fontSize:32 }}>{weekInfo.emoji}</span>
            <div style={{ fontSize:12, color:'var(--text2)' }}>
              {rl('Размер: ','Size: ')}{weekInfo.size} ({weekInfo.sizeMm < 10 ? weekInfo.sizeMm + ' мм' : weekInfo.sizeMm < 100 ? weekInfo.sizeMm + ' мм' : Math.round(weekInfo.sizeMm/10) + ' см'})
            </div>
          </div>
        )}
      </div>

      {/* Табы */}
      <div style={{ display:'flex', borderBottom:'1px solid var(--border)', background:'var(--bg2)' }}>
        {[
          { id:'today', label:rl('Сегодня','Today') },
          { id:'info', label:rl('Плод','Baby') },
          { id:'events', label:rl('Скрининги','Screenings') },
          { id:'meds', label:rl('Витамины','Vitamins') },
          { id:'prep', label:rl('Подготовка','Prep') },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex:1, padding:'10px 4px', background:'none', border:'none', cursor:'pointer',
            fontSize:11, letterSpacing:'0.04em',
            color: tab===t.id ? 'var(--accent)' : 'var(--text3)',
            borderBottom: tab===t.id ? '2px solid var(--accent)' : '2px solid transparent',
            transition:'all 0.15s',
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ flex:1, padding:'16px', display:'flex', flexDirection:'column', gap:14 }}>

        {/* ТАБ: СЕГОДНЯ */}
        {tab === 'today' && (
          <>
            {/* Показатели */}
            <div className="card" style={{ padding:'14px' }}>
              <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>{rl('Показатели','Stats')}</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <div style={{ fontSize:11, color:'var(--text3)', marginBottom:4 }}>{rl('Вес (кг)','Weight (kg)')}</div>
                  <input type="number" placeholder="62.5" value={weight} onChange={e => setWeight(e.target.value)} step="0.1" />
                </div>
                <div>
                  <div style={{ fontSize:11, color:'var(--text3)', marginBottom:4 }}>{rl('Давление','Blood pressure')}</div>
                  <div style={{ display:'flex', gap:6 }}>
                    <input type="number" placeholder="120" value={bpS} onChange={e => setBpS(e.target.value)} />
                    <input type="number" placeholder="80" value={bpD} onChange={e => setBpD(e.target.value)} />
                  </div>
                </div>
                {week >= 20 && (
                  <div>
                    <div style={{ fontSize:11, color:'var(--text3)', marginBottom:4 }}>{rl('Шевелений в час','Kicks/hour')}</div>
                    <input type="number" placeholder="10" value={kicks} onChange={e => setKicks(e.target.value)} />
                  </div>
                )}
                <div>
                  <div style={{ fontSize:11, color:'var(--text3)', marginBottom:4 }}>{rl('Воды (мл)','Water (ml)')}</div>
                  <input type="number" placeholder="2000" value={water} onChange={e => setWater(e.target.value)} step="100" />
                </div>
              </div>
            </div>

            {/* Симптомы */}
            <div className="card" style={{ padding:'14px' }}>
              <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>{rl('Симптомы','Symptoms')}</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                {SYMPTOM_OPTIONS.map(s => (
                  <button key={s} onClick={() => toggle(symptoms, setSymptoms, s)} style={{
                    padding:'6px 12px', borderRadius:20, fontSize:12, cursor:'pointer',
                    border:`1px solid ${symptoms.includes(s) ? 'var(--accent)' : 'var(--border)'}`,
                    background:symptoms.includes(s) ? 'var(--accent-soft)' : 'transparent',
                    color:symptoms.includes(s) ? 'var(--accent)' : 'var(--text2)',
                  }}>{s}</button>
                ))}
              </div>
            </div>

            {/* Эмоции */}
            <div className="card" style={{ padding:'14px' }}>
              <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>{rl('Эмоции','Emotions')}</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                {EMOTION_OPTIONS.map(e => (
                  <button key={e} onClick={() => toggle(emotions, setEmotions, e)} style={{
                    padding:'6px 12px', borderRadius:20, fontSize:12, cursor:'pointer',
                    border:`1px solid ${emotions.includes(e) ? '#f472b6' : 'var(--border)'}`,
                    background:emotions.includes(e) ? 'rgba(244,114,182,0.12)' : 'transparent',
                    color:emotions.includes(e) ? '#f472b6' : 'var(--text2)',
                  }}>{e}</button>
                ))}
              </div>
            </div>

            {/* Заметки */}
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder={rl('Заметки дня...','Notes for today...')}
              style={{ minHeight:80, resize:'none', fontFamily:'Cormorant Garamond, serif', fontSize:16, lineHeight:1.7 }} />

            <AIAdvice requestType="pregnancy_tip" label={rl('✦ Совет на эту неделю','✦ Tip for this week')} />

            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saved ? '✓' : saving ? '...' : rl('Сохранить','Save')}
            </button>
          </>
        )}

        {/* ТАБ: ПЛОД */}
        {tab === 'info' && weekInfo && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div className="card" style={{ padding:'20px', textAlign:'center' }}>
              <div style={{ fontSize:60, marginBottom:12 }}>{weekInfo.emoji}</div>
              <div style={{ fontSize:18, fontFamily:'Cormorant Garamond, serif', marginBottom:8 }}>
                {rl('Неделя','Week')} {week} — {weekInfo.size}
              </div>
              <p style={{ fontSize:14, color:'var(--text2)', lineHeight:1.7 }}>{weekInfo.desc}</p>
            </div>

            {/* Что сейчас происходит */}
            {[
              { w:[4,12], title:rl('Первый триместр','First trimester'), text:rl('Закладываются все органы и системы. Самый важный период для правильного питания и отказа от вредных привычек.','All organs and systems are forming. Most important period for nutrition and avoiding harmful habits.'), color:'#f472b6' },
              { w:[13,26], title:rl('Второй триместр','Second trimester'), text:rl('Малыш активно растёт. Обычно самый комфортный период — тошнота уходит, живот ещё не мешает.','Baby is growing actively. Usually most comfortable — nausea subsides, belly not too big yet.'), color:'#facc15' },
              { w:[27,40], title:rl('Третий триместр','Third trimester'), text:rl('Малыш набирает вес и готовится к рождению. Пора собирать сумку в роддом!','Baby gains weight and prepares for birth. Time to pack your hospital bag!'), color:'#4ade80' },
            ].filter(t => week >= t.w[0] && week <= t.w[1]).map((t,i) => (
              <div key={i} className="card" style={{ padding:'14px', borderLeft:`3px solid ${t.color}` }}>
                <div style={{ fontSize:14, fontWeight:500, marginBottom:6 }}>{t.title}</div>
                <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6, margin:0 }}>{t.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* ТАБ: СКРИНИНГИ */}
        {tab === 'events' && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6 }}>
              {rl('Приблизительный график — уточни у своего врача.','Approximate schedule — confirm with your doctor.')}
            </p>
            {PREGNANCY_EVENTS.map((ev, i) => {
              const isPast = ev.week < week
              const isCurrent = ev.week >= week && ev.week <= week + 2
              const isSoon = ev.week > week + 2 && ev.week <= week + 6
              return (
                <div key={i} className="card" style={{
                  padding:'14px', display:'flex', gap:12, alignItems:'flex-start',
                  opacity: isPast ? 0.45 : 1,
                  border:`1px solid ${isCurrent ? 'var(--accent)' : 'var(--border)'}`,
                  background: isCurrent ? 'var(--accent-soft)' : 'var(--bg2)',
                }}>
                  <span style={{ fontSize:22, flexShrink:0 }}>{EVENT_ICONS[ev.type]}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                      <span style={{ fontSize:13, fontWeight:500 }}>{ev.title}</span>
                      <span style={{ fontSize:10, padding:'1px 7px', borderRadius:20,
                        background: isCurrent ? 'var(--accent)' : 'var(--bg3)',
                        color: isCurrent ? 'var(--bg)' : 'var(--text3)',
                      }}>{rl(`${ev.week} нед`, `wk ${ev.week}`)}</span>
                      {isSoon && <span style={{ fontSize:10, color:'#facc15' }}>⏱ {rl('скоро','soon')}</span>}
                      {isPast && <span style={{ fontSize:10, color:'var(--text3)' }}>✓</span>}
                    </div>
                    <p style={{ fontSize:12, color:'var(--text2)', margin:0, lineHeight:1.5 }}>{ev.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ТАБ: ВИТАМИНЫ */}
        {tab === 'meds' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6 }}>
              {rl('Отмечай что приняла сегодня. Рекомендации ниже — только информация, не замена назначениям врача.', 'Track what you took today. Recommendations below are informational only, not a substitute for doctor\'s prescriptions.')}
            </p>

            {[
              { key:'folic_acid', emoji:'🌿', name:rl('Фолиевая кислота','Folic acid'), rec:rl('400-800 мкг/день. Особенно важна в 1 триместре для нервной трубки.','400-800 mcg/day. Critical in 1st trimester for neural tube.'), weeks:[4,16] },
              { key:'iron', emoji:'💊', name:rl('Железо','Iron'), rec:rl('60 мг/день при анемии. Лучше пить с витамином С, не с молоком.','60mg/day for anemia. Best with vitamin C, not dairy.'), weeks:[1,40] },
              { key:'vitamin_d', emoji:'☀️', name:rl('Витамин D','Vitamin D'), rec:rl('1000-2000 МЕ/день. Влияет на кости и иммунитет малыша.','1000-2000 IU/day. Affects baby\'s bones and immunity.'), weeks:[1,40] },
            ].map(med => (
              <div key={med.key} className="card" style={{ padding:'14px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
                  <span style={{ fontSize:24 }}>{med.emoji}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:500 }}>{med.name}</div>
                    <div style={{ fontSize:11, color:'var(--text3)' }}>{med.rec}</div>
                  </div>
                  <button onClick={() => setMeds(m => ({ ...m, [med.key]: !m[med.key] }))} style={{
                    width:44, height:24, borderRadius:12, cursor:'pointer', border:'none', flexShrink:0,
                    background:meds[med.key] ? 'var(--accent)' : 'var(--bg3)', position:'relative', transition:'all 0.2s',
                  }}>
                    <div style={{ position:'absolute', top:2, left:meds[med.key]?22:2, width:20, height:20, borderRadius:'50%', background:'#fff', transition:'left 0.2s' }} />
                  </button>
                </div>
                {meds[med.key] && (
                  <div style={{ fontSize:11, color:'#4ade80', paddingTop:8, borderTop:'1px solid var(--border)' }}>
                    ✓ {rl('Принято сегодня','Taken today')}
                  </div>
                )}
              </div>
            ))}

            <div style={{ background:'rgba(248,113,113,0.08)', borderRadius:10, padding:'12px 14px', fontSize:12, color:'var(--text2)', lineHeight:1.6, border:'1px solid rgba(248,113,113,0.2)' }}>
              ⚠️ {rl('Все витамины и дозировки — только по согласованию с врачом. Информация носит ознакомительный характер.', 'All vitamins and dosages — only as agreed with your doctor. Information is for reference only.')}
            </div>

            {/* Свои витамины */}
            <div className="card" style={{ padding:'14px' }}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:10 }}>
                + {rl('Мои витамины','My vitamins')}
              </div>
              <div style={{ display:'flex', gap:8, marginBottom:10 }}>
                <input placeholder={rl('Название витамина...','Vitamin name...')}
                  value={newVitamin} onChange={e => setNewVitamin(e.target.value)}
                  style={{ flex:1 }} />
                <button type="button" onClick={() => {
                  if (newVitamin.trim()) {
                    setCustomVitamins(p => [...p, { name: newVitamin.trim(), taken: false }])
                    setNewVitamin('')
                  }
                }} style={{ background:'var(--accent-soft)', border:'1px solid var(--border)', borderRadius:8, color:'var(--accent)', padding:'0 14px', cursor:'pointer', fontSize:12, flexShrink:0 }}>
                  + {rl('Добавить','Add')}
                </button>
              </div>
              {customVitamins.map((v, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderTop:'1px solid var(--border)' }}>
                  <span style={{ fontSize:16 }}>💊</span>
                  <span style={{ flex:1, fontSize:13 }}>{v.name}</span>
                  <button onClick={() => setCustomVitamins(p => p.map((x,j) => j===i?{...x,taken:!x.taken}:x))} style={{
                    width:40, height:22, borderRadius:11, cursor:'pointer', border:'none', flexShrink:0,
                    background:v.taken?'var(--accent)':'var(--bg3)', position:'relative', transition:'all 0.2s',
                  }}>
                    <div style={{ position:'absolute', top:2, left:v.taken?20:2, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left 0.2s' }} />
                  </button>
                  <button onClick={() => setCustomVitamins(p => p.filter((_,j) => j!==i))} style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:16 }}>×</button>
                </div>
              ))}
            </div>

            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saved ? '✓' : saving ? '...' : rl('Сохранить','Save')}
            </button>
          </div>
        )}


        {/* ТАБ: ПОДГОТОВКА */}
        {tab === 'prep' && (
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <div style={{ background:'rgba(248,113,113,0.08)', borderRadius:10, padding:'12px 14px', fontSize:12, color:'var(--text2)', lineHeight:1.6, border:'1px solid rgba(248,113,113,0.2)' }}>
              ⚠️ {rl('Спорт во время беременности и при подготовке к ней - только если врач не ограничивал нагрузку. При боли, кровотечении, головокружении, сильной одышке или резком ухудшении самочувствия тренировку нужно остановить и обратиться за медицинской помощью.',
                       'Exercise during pregnancy and preconception - only if your clinician has not restricted activity. Stop and seek medical help with pain, bleeding, dizziness, strong shortness of breath or sudden worsening.')}
            </div>

            <div className="card" style={{ padding:'14px' }}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:8 }}>🌿 {rl('До беременности: что укреплять','Before pregnancy: what to prepare')}</div>
              <p style={{ fontSize:12, color:'var(--text2)', lineHeight:1.6, margin:'0 0 10px' }}>
                {rl('Цель - не “убиться в зале”, а спокойно подготовить тазовое дно, ягодицы, ноги, спину, дыхание и выносливость. Человеческое тело почему-то требует обслуживания, как старый ноутбук, но с эмоциями.',
                   'The goal is not to destroy yourself at the gym, but to prepare pelvic floor, glutes, legs, back, breathing and endurance.')}
              </p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {[
                  ['🫧', rl('Дыхание + тазовое дно','Breathing + pelvic floor')],
                  ['🍑', rl('Ягодичный мост','Glute bridge')],
                  ['🪑', rl('Присед к стулу','Chair squat')],
                  ['🦵', rl('Step-up / выпады назад','Step-up / reverse lunge')],
                  ['🧘', rl('Мобилити бёдер и таза','Hip and pelvic mobility')],
                  ['🚶', rl('Ходьба / плавание','Walking / swimming')],
                  ['🧱', rl('Bird-dog / dead bug','Bird-dog / dead bug')],
                  ['🎗', rl('Тяга резинки к себе','Resistance band rows')],
                ].map(([emoji, label]) => (
                  <div key={label} style={{ padding:'9px 10px', borderRadius:10, background:'var(--bg3)', fontSize:12, color:'var(--text2)', lineHeight:1.35 }}>
                    <span style={{ marginRight:6 }}>{emoji}</span>{label}
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding:'14px' }}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:8 }}>📅 {rl('Мягкий недельный шаблон','Gentle weekly template')}</div>
              {[
                rl('2 раза в неделю - силовая 20-30 минут: ноги, ягодицы, спина, кор.','2 times/week - strength 20-30 min: legs, glutes, back, core.'),
                rl('3-5 раз в неделю - ходьба или лёгкое кардио 20-40 минут.','3-5 times/week - walking or light cardio 20-40 min.'),
                rl('3-5 минут в день - тазовое дно: сокращение, удержание и обязательно расслабление.','3-5 min/day - pelvic floor: contractions, holds and relaxation.'),
                rl('1-2 раза в неделю - мобилити таза, бёдер и грудного отдела.','1-2 times/week - pelvic, hip and thoracic mobility.'),
              ].map((text, i) => (
                <div key={i} style={{ display:'flex', gap:8, fontSize:12, color:'var(--text2)', lineHeight:1.55, marginBottom:7 }}>
                  <span style={{ color:'var(--accent)' }}>✓</span><span>{text}</span>
                </div>
              ))}
            </div>

            <div className="card" style={{ padding:'14px' }}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:8 }}>🤰 {rl('Во время беременности','During pregnancy')}</div>
              <p style={{ fontSize:12, color:'var(--text2)', lineHeight:1.6, margin:0 }}>
                {rl('После наступления беременности приложение должно снизить интенсивность рекомендаций и показывать только безопасные общие варианты: ходьба, мягкая мобилити, дыхание, тазовое дно - если врач не против. Никаких “героических” тренировок, потому что героизм в приложениях обычно заканчивается кнопкой “удалить”.',
                   'Once pregnant, the app should lower intensity and show only general safe options: walking, gentle mobility, breathing, pelvic floor - if your clinician agrees.')}
              </p>
            </div>
          </div>
        )}


      {/* ── Советы с навигацией ─────────────────────────────────────── */}
      <div style={{ padding:'16px' }}>
        <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>
          Советы и навигация
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {[
            {
              emoji:'💊', title:'Препараты и витамины',
              body:'Фолиевая кислота, железо, витамин D — обсуди с врачом. Все назначения только по рекомендации.',
              url:'/health', label:'Открыть Здоровье',
              ref:'PMID26462967', refText:'Фолиевая кислота снижает риск дефектов нервной трубки на 70%',
            },
            {
              emoji:'📅', title:'Визиты и скрининги',
              body:'Первый скрининг 10–13 нед, второй 18–21 нед, УЗИ 32 нед. Ведите записи всех визитов.',
              url:'/health', label:'Архив анализов',
              ref:'ACOG', refText:'Рекомендации Американской коллегии акушеров-гинекологов',
            },
            {
              emoji:'🩸', title:'Цикл и дни до этого',
              body:'Посмотри историю цикла чтобы уточнить дату последних месячных для расчёта срока.',
              url:'/calendar', label:'Открыть Календарь',
              ref:'WHO', refText:'ВОЗ: расчёт срока по последней менструации',
            },
            {
              emoji:'🏃', title:'Активность',
              body:'Умеренная активность безопасна в большинстве случаев. 30 мин ходьбы в день — хорошее начало. Спорт — по согласованию с врачом.',
              url:'/sport', label:'Дневник активности',
              ref:'PMID31582291', refText:'Физическая активность снижает риск гестационного диабета',
            },
            {
              emoji:'😴', title:'Сон и самочувствие',
              body:'Отмечай самочувствие каждый день: тошнота, усталость, настроение. Это поможет врачу.',
              url:'/today', label:'Отметить сегодня',
              ref:null, refText:null,
            },
            {
              emoji:'🫂', title:'Партнёр и поддержка',
              body:'Если есть партнёр — подключи его к подготовке. Совместное планирование снижает тревогу.',
              url:'/friends', label:'Открыть Круг',
              ref:'PMID28989900', refText:'Поддержка партнёра связана с лучшими исходами беременности',
            },
          ].map((tip, i) => (
            <TipCard key={i} tip={tip} navigate={navigate} lang={lang} />
          ))}
        </div>
      </div>

      </div>
    </div>
  )
}
