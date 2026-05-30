import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang, useRl } from '../context/LangContext'

// Алгоритм совпадения окошек
function calculateHangoutScore(a, b, eventType) {
  if (!a || !b) return 0
  const ea = a.energy || 3, eb = b.energy || 3
  const ma = a.mood || 3, mb = b.mood || 3
  const pa = a.pain || 0, pb = b.pain || 0
  const sa = a.social_battery || 3, sb = b.social_battery || 3
  const la = a.libido || 2, lb = b.libido || 2

  switch (eventType) {
    case 'party': return (ea+eb+sa+sb)/4 - (pa+pb)/4
    case 'cafe': return (ma+mb+sa+sb)/4 - (pa+pb)/6
    case 'walk': return (ea+eb)/2 - (pa+pb)/4
    case 'sex': return (la+lb)/2 - (pa+pb)/2
    case 'quiet_evening': return (ma+mb)/2 - Math.abs(ea-eb)/2
    case 'sport': return (ea+eb)/2 - (pa+pb)/2
    case 'work': return (ea+eb)/2 + Math.min(ea,eb)*0.5
    case 'care': return Math.max(0, 5 - (ma+mb)/2) // Нужна поддержка когда настроение низкое
    default: return (ea+eb+ma+mb)/4
  }
}

const EVENT_TYPES = [
  { key:'cafe', emoji:'☕', ru:'Кафе', en:'Cafe' },
  { key:'walk', emoji:'🚶', ru:'Прогулка', en:'Walk' },
  { key:'party', emoji:'🎉', ru:'Тусовка', en:'Party' },
  { key:'quiet_evening', emoji:'🌙', ru:'Тихий вечер', en:'Quiet evening' },
  { key:'sport', emoji:'🏃', ru:'Спорт', en:'Sport' },
  { key:'sex', emoji:'🌹', ru:'Близость', en:'Intimacy' },
  { key:'work', emoji:'💻', ru:'Работа/проект', en:'Work/project' },
  { key:'care', emoji:'💜', ru:'Забота и поддержка', en:'Care & support' },
]

const STATUS_LABELS = [
  { score: 4, emoji:'🚀', ru:'Отличный день для активности', en:'Great day for activity', color:'#4ade80' },
  { score: 3, emoji:'☀️', ru:'Норм, можно планировать', en:'Fine, can plan ahead', color:'#facc15' },
  { score: 2, emoji:'🌤', ru:'Средне, выбирайте аккуратно', en:'So-so, choose carefully', color:'#fb923c' },
  { score: 1, emoji:'🌧', ru:'Лучше тихо и дома', en:'Better quiet at home', color:'#94a3b8' },
]

export default function DayStatusWidget({ compact = false, moodEmojis = null, todayMoods = [], onToggleMood = null, moodTitle = null, translateMood = null }) {
  const { user, profile } = useAuth()
  const { lang } = useLang()
  const rl = useRl()
  const today = new Date().toISOString().slice(0,10)

  const [status, setStatus] = useState(null)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    energy: 3, mood: 3, pain: 0, social_battery: 3, libido: 2, available: true, tags: []
  })

  useEffect(() => { loadStatus() }, [])

  async function loadStatus() {
    const { data } = await supabase.from('day_statuses')
      .select('*').eq('user_id', user.id).eq('date', today).maybeSingle()
    if (data) { setStatus(data); setForm(data) }
    else setEditing(true)
  }

  async function saveStatus() {
    setSaving(true)
    await supabase.from('day_statuses').upsert(
      { user_id: user.id, date: today, ...form },
      { onConflict: 'user_id,date' }
    )
    setStatus({...form, date: today})
    setEditing(false)
    setSaving(false)
  }

  const SliderRow = ({ label, field, min=0, max=5, emoji }) => (
    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
      <span style={{ width:20, textAlign:'center' }}>{emoji}</span>
      <span style={{ fontSize:12, color:'var(--text2)', minWidth:90 }}>{label}</span>
      <input type="range" min={min} max={max} step={1} value={form[field]}
        onChange={e => setForm(p=>({...p, [field]: Number(e.target.value)}))}
        style={{ flex:1, accentColor:'var(--accent)' }} />
      <span style={{ fontSize:13, fontWeight:500, minWidth:16, color:'var(--accent)' }}>{form[field]}</span>
    </div>
  )

  if (compact && status) {
    const avgScore = ((status.energy||0)+(status.mood||0)+(5-((status.pain||0)*1.5)))/3
    const label = STATUS_LABELS.find(s => avgScore >= s.score) || STATUS_LABELS[3]
    return (
      <div style={{ padding:'8px 12px', borderRadius:8, background:`${label.color}15`, border:`1px solid ${label.color}30`, display:'flex', alignItems:'center', gap:8, fontSize:12 }}>
        <span>{label.emoji}</span>
        <span style={{ color:label.color }}>{lang==='en'?label.en:label.ru}</span>
        <button onClick={() => setEditing(true)} style={{ marginLeft:'auto', background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:11 }}>✎</button>
      </div>
    )
  }

  return (
    <div className="card" style={{ padding:'14px 16px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <div style={{ fontSize:13, fontWeight:500 }}>
          {rl('Как ты сегодня?', 'How are you today?')}
        </div>
        {status && !editing && (
          <button onClick={() => setEditing(true)} style={{ background:'none', border:'1px solid var(--border)', borderRadius:6, color:'var(--text3)', fontSize:11, padding:'3px 9px', cursor:'pointer' }}>
            {rl('Изменить','Edit')}
          </button>
        )}
      </div>

      {editing ? (
        <div>
          <SliderRow label={rl('Энергия','Energy')} field="energy" emoji="⚡" />
          <SliderRow label={rl('Настроение','Mood')} field="mood" emoji="🌙" />
          <SliderRow label={rl('Боль','Pain')} field="pain" min={0} max={5} emoji="💫" />
          <SliderRow label={rl('Соц. батарейка','Social battery')} field="social_battery" emoji="🔋" />
          <SliderRow label={rl('Либидо','Libido')} field="libido" emoji="🌹" />

          {moodEmojis && onToggleMood && (
            <div style={{ marginTop:12, marginBottom:8 }}>
              <div style={{ fontSize:11, color:'var(--text3)', marginBottom:7 }}>{moodTitle || rl('Эмоциональные отметки','Mood marks')}</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {Object.entries(moodEmojis).map(([mood, emoji]) => (
                  <button key={mood} onClick={() => onToggleMood(mood)} style={{
                    padding:'6px 10px', borderRadius:20, cursor:'pointer',
                    border:`1.5px solid ${todayMoods.includes(mood)?'var(--accent)':'var(--border)'}`,
                    background:todayMoods.includes(mood)?'var(--accent-soft)':'transparent',
                    transition:'all 0.15s', display:'flex', alignItems:'center', gap:5,
                  }}>
                    <span style={{ fontSize:16 }}>{emoji}</span>
                    <span style={{ fontSize:11, color:todayMoods.includes(mood)?'var(--accent)':'var(--text3)' }}>
                      {translateMood ? translateMood(mood) : mood}
                    </span>
                  </button>
                ))}
              </div>
              {todayMoods.length > 0 && (
                <div style={{ fontSize:12, color:'var(--text2)', marginTop:7 }}>
                  {todayMoods.map(m => translateMood ? translateMood(m) : m).join(', ')}
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop:10, marginBottom:8 }}>
            <div style={{ fontSize:11, color:'var(--text3)', marginBottom:7 }}>{rl('Тэги дня','Day tags')}</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {EVENT_TYPES.map(t => (
                <button key={t.key} onClick={() => setForm(p=>({...p, tags: p.tags.includes(t.key)?p.tags.filter(x=>x!==t.key):[...p.tags,t.key]}))} style={{
                  padding:'5px 10px', borderRadius:20, fontSize:11, cursor:'pointer',
                  border:`1px solid ${form.tags.includes(t.key)?'var(--accent)':'var(--border)'}`,
                  background:form.tags.includes(t.key)?'var(--accent-soft)':'transparent',
                  color:form.tags.includes(t.key)?'var(--accent)':'var(--text3)',
                }}>
                  {t.emoji} {lang==='en'?t.en:t.ru}
                </button>
              ))}
            </div>
          </div>

          <button onClick={saveStatus} disabled={saving} className="btn btn-primary" style={{ marginTop:8, fontSize:13 }}>
            {saving ? '⟳' : rl('Сохранить','Save')}
          </button>
        </div>
      ) : status && (
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {[
            { field:'energy', emoji:'⚡', label:rl('Энергия','Energy') },
            { field:'mood', emoji:'🌙', label:rl('Настроение','Mood') },
            { field:'social_battery', emoji:'🔋', label:rl('Соц. батарейка','Social battery') },
          ].map(r => (
            <div key={r.field} style={{ display:'flex', alignItems:'center', gap:10 }}>
              <span>{r.emoji}</span>
              <span style={{ fontSize:12, color:'var(--text3)', flex:1 }}>{r.label}</span>
              <div style={{ display:'flex', gap:2 }}>
                {[1,2,3,4,5].map(i => (
                  <div key={i} style={{ width:10, height:10, borderRadius:'50%', background:i<=(status[r.field]||0)?'var(--accent)':'var(--bg3)' }} />
                ))}
              </div>
            </div>
          ))}
          {moodEmojis && todayMoods.length > 0 && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginTop:4 }}>
              {todayMoods.map(m => (
                <span key={m} style={{ fontSize:11, color:'var(--text2)', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:20, padding:'4px 8px' }}>
                  {moodEmojis[m]} {translateMood ? translateMood(m) : m}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export { calculateHangoutScore, EVENT_TYPES, STATUS_LABELS }
