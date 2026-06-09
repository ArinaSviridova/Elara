import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang, useRl } from '../context/LangContext'
import { notifyCircleChange } from '../lib/socialNotifications'

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

  useEffect(() => {
    if (user?.id) loadStatus()
  }, [user?.id, today])

  async function loadStatus() {
    if (!user?.id) return
    const { data } = await supabase.from('day_statuses')
      .select('*').eq('user_id', user.id).eq('date', today).maybeSingle()
    if (data) { setStatus(data); setForm(data) }
    else setEditing(true)
  }

  async function saveStatus() {
    if (!user?.id) return
    setSaving(true)
    const payload = {
      user_id: user.id,
      date: today,
      ...form,
      energy: Number(form.energy || 0),
      mood: Number(form.mood || 0),
      pain: Number(form.pain || 0),
      social_battery: Number(form.social_battery || 0),
      libido: Number(form.libido || 0),
    }
    const { error } = await supabase.from('day_statuses').upsert(payload, { onConflict: 'user_id,date' })
    if (!error) {
      notifyCircleChange({
        userId: user.id,
        profile,
        changeType: 'day_status',
        details: payload,
        lang,
        actionUrl: '/sync',
      }).catch(err => console.warn('day status notification failed', err))
    }
    setStatus(payload)
    setEditing(false)
    setSaving(false)
  }

  const updateSlider = (field, value, min = 0, max = 5) => {
    const numericValue = Number(value)
    const safeValue = Number.isFinite(numericValue) ? Math.min(max, Math.max(min, numericValue)) : min
    setForm(prev => ({ ...prev, [field]: safeValue }))
  }

  const SliderRow = ({ label, field, min=0, max=5, emoji }) => {
    const trackRef = useRef(null)
    const currentValue = Number(form[field] ?? min)
    const percent = ((currentValue - min) / (max - min)) * 100

    const setFromPointer = (event) => {
      const track = trackRef.current
      if (!track) return
      const rect = track.getBoundingClientRect()
      if (!rect.width) return
      const clientX = event.clientX ?? event.touches?.[0]?.clientX
      if (typeof clientX !== 'number') return
      const rawPercent = (clientX - rect.left) / rect.width
      const clampedPercent = Math.min(1, Math.max(0, rawPercent))
      const nextValue = min + clampedPercent * (max - min)
      updateSlider(field, nextValue, min, max)
    }

    const startDrag = (event) => {
      event.preventDefault()
      setFromPointer(event)
      event.currentTarget.setPointerCapture?.(event.pointerId)
    }

    return (
      <div className="fluid-slider-row" style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
        <span style={{ width:20, textAlign:'center' }}>{emoji}</span>
        <span style={{ fontSize:12, color:'var(--text2)', minWidth:90 }}>{label}</span>
        <div
          ref={trackRef}
          className="fluid-slider"
          role="slider"
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={currentValue}
          tabIndex={0}
          onPointerDown={startDrag}
          onPointerMove={event => {
            if (event.buttons === 1 || event.pressure > 0) setFromPointer(event)
          }}
          onKeyDown={event => {
            const delta = event.shiftKey ? 0.5 : 0.1
            if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
              event.preventDefault()
              updateSlider(field, currentValue - delta, min, max)
            }
            if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
              event.preventDefault()
              updateSlider(field, currentValue + delta, min, max)
            }
            if (event.key === 'Home') {
              event.preventDefault()
              updateSlider(field, min, min, max)
            }
            if (event.key === 'End') {
              event.preventDefault()
              updateSlider(field, max, min, max)
            }
          }}
          style={{ flex:1 }}
        >
          <div className="fluid-slider-track" />
          <div className="fluid-slider-fill" style={{ width:`${percent}%` }} />
          <div className="fluid-slider-thumb" style={{ left:`${percent}%` }} />
        </div>
        <span style={{ fontSize:13, fontWeight:500, minWidth:32, color:'var(--accent)', textAlign:'right' }}>
          {currentValue.toFixed(1)}
        </span>
      </div>
    )
  }

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
