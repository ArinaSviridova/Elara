import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang, useRl } from '../context/LangContext'
import { notifyCircleChange } from '../lib/socialNotifications'

function todayKey() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function localKey(userId) {
  return `elara_weight_logs_${userId}`
}

function readLocal(userId) {
  try { return JSON.parse(localStorage.getItem(localKey(userId)) || '[]') } catch { return [] }
}

function saveLocal(userId, rows) {
  localStorage.setItem(localKey(userId), JSON.stringify(rows))
}

function normalizeRows(rows = []) {
  return rows
    .filter(r => r?.date && Number(r.weight_kg || r.weight) > 0)
    .map(r => ({ ...r, weight_kg: Number(r.weight_kg || r.weight) }))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
}

function WeightChart({ rows, rl }) {
  const data = normalizeRows(rows).slice(-60)
  if (data.length < 2) {
    return (
      <div style={{ padding:'18px 14px', background:'var(--bg2)', borderRadius:14, border:'1px solid var(--border)', color:'var(--text2)', fontSize:13, lineHeight:1.5 }}>
        {rl('Добавь хотя бы две отметки веса - и тут появится график. Одна точка, увы, это не тренд, а одиночество с координатами.', 'Add at least two weight entries and the chart will appear here.')}
      </div>
    )
  }

  const values = data.map(r => r.weight_kg)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = Math.max(1, max - min)
  const w = 340, h = 150, pad = 18
  const points = data.map((r, i) => {
    const x = pad + (i * ((w - pad * 2) / Math.max(1, data.length - 1)))
    const y = h - pad - ((r.weight_kg - min) / range) * (h - pad * 2)
    return { x, y, row:r }
  })
  const poly = points.map(p => `${p.x},${p.y}`).join(' ')
  const first = data[0].weight_kg
  const last = data[data.length - 1].weight_kg
  const delta = last - first

  return (
    <div className="card" style={{ padding:'14px', border:'1px solid var(--border)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', gap:12, alignItems:'flex-start', marginBottom:10 }}>
        <div>
          <div style={{ fontSize:14, fontWeight:700 }}>📈 {rl('График веса', 'Weight chart')}</div>
          <div style={{ fontSize:11, color:'var(--text3)', marginTop:3 }}>{rl('Последние 60 отметок', 'Last 60 entries')}</div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:18, color:'var(--accent)', fontFamily:'Cormorant Garamond, serif' }}>{last.toFixed(1)} кг</div>
          <div style={{ fontSize:11, color: delta === 0 ? 'var(--text3)' : (delta > 0 ? '#fb923c' : '#4ade80') }}>
            {delta > 0 ? '+' : ''}{delta.toFixed(1)} кг
          </div>
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width:'100%', height:170, display:'block', color:'var(--accent)' }}>
        <line x1={pad} x2={w-pad} y1={pad} y2={pad} stroke="currentColor" opacity="0.12" />
        <line x1={pad} x2={w-pad} y1={h/2} y2={h/2} stroke="currentColor" opacity="0.10" />
        <line x1={pad} x2={w-pad} y1={h-pad} y2={h-pad} stroke="currentColor" opacity="0.12" />
        <polyline points={poly} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
        {points.map(p => <circle key={`${p.row.date}-${p.row.weight_kg}`} cx={p.x} cy={p.y} r="3" fill="currentColor" />)}
      </svg>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text3)' }}>
        <span>{data[0]?.date?.slice(5)}</span>
        <span>{min.toFixed(1)}-{max.toFixed(1)} кг</span>
        <span>{data[data.length - 1]?.date?.slice(5)}</span>
      </div>
    </div>
  )
}

export default function WeightPage() {
  const { user, profile } = useAuth()
  const { lang } = useLang()
  const rl = useRl()
  const [date, setDate] = useState(todayKey())
  const [weight, setWeight] = useState('')
  const [rows, setRows] = useState([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dbUnavailable, setDbUnavailable] = useState(false)

  const sorted = useMemo(() => normalizeRows(rows), [rows])

  useEffect(() => { if (user?.id) loadRows() }, [user?.id])

  async function loadRows() {
    const localRows = readLocal(user.id)
    setRows(localRows)

    const { data, error } = await supabase
      .from('weight_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: true })

    if (error) {
      console.warn('Weight logs fallback to localStorage:', error)
      setDbUnavailable(true)
      return
    }

    const normalized = normalizeRows(data || [])
    setRows(normalized.length ? normalized : localRows)
    saveLocal(user.id, normalized.length ? normalized : localRows)
    setDbUnavailable(false)
  }

  async function saveWeight(e) {
    e.preventDefault()
    if (!user?.id || !date || !Number(weight)) return
    setSaving(true)

    const nextRow = { user_id:user.id, date, weight_kg:Number(weight), created_at:new Date().toISOString() }
    const nextRows = normalizeRows([...(rows || []).filter(r => r.date !== date), nextRow])
    setRows(nextRows)
    saveLocal(user.id, nextRows)

    const { error } = await supabase.from('weight_logs').upsert(nextRow, { onConflict:'user_id,date' })
    if (error) {
      console.warn('Weight log was saved locally only:', error)
      setDbUnavailable(true)
    } else {
      setDbUnavailable(false)
      notifyCircleChange({ userId:user.id, profile, changeType:'weight', details:nextRow, lang, actionUrl:'/weight' }).catch(()=>{})
    }

    setWeight('')
    setSaved(true)
    setSaving(false)
    setTimeout(() => setSaved(false), 1800)
  }

  async function removeRow(row) {
    const nextRows = rows.filter(r => r.date !== row.date)
    setRows(nextRows)
    saveLocal(user.id, nextRows)
    await supabase.from('weight_logs').delete().eq('user_id', user.id).eq('date', row.date)
  }

  return (
    <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', padding:'20px 16px', gap:14, overflowY:'auto' }}>
      <h2 style={{ fontSize:26 }}>⚖️ {rl('Вес', 'Weight')}</h2>
      <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.55, marginTop:-8 }}>
        {rl('Вводи вес когда удобно. Elara сохранит историю и покажет динамику без истерики из-за одной цифры.', 'Log weight whenever useful. Elara keeps the history and shows the trend.')}
      </p>

      <form onSubmit={saveWeight} className="card" style={{ padding:'14px', display:'flex', flexDirection:'column', gap:10 }}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <label style={{ display:'flex', flexDirection:'column', gap:5, fontSize:11, color:'var(--text3)' }}>
            {rl('Дата', 'Date')}
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </label>
          <label style={{ display:'flex', flexDirection:'column', gap:5, fontSize:11, color:'var(--text3)' }}>
            {rl('Вес, кг', 'Weight, kg')}
            <input type="number" step="0.1" min="20" max="350" value={weight} onChange={e => setWeight(e.target.value)} placeholder="62.5" />
          </label>
        </div>
        <button className="btn btn-primary" disabled={saving || !Number(weight)}>
          {saved ? '✓' : saving ? '...' : rl('Сохранить вес', 'Save weight')}
        </button>
        {dbUnavailable && (
          <div style={{ fontSize:11, color:'#fb923c', lineHeight:1.45 }}>
            {rl('Сейчас данные дублируются локально. Чтобы сохранялось между устройствами, добавь таблицу weight_logs из SQL-файла миграции.', 'Currently saved locally too. Add weight_logs from the migration SQL for cross-device sync.')}
          </div>
        )}
      </form>

      <WeightChart rows={sorted} rl={rl} />

      <div className="card" style={{ padding:'14px' }}>
        <div style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>🧾 {rl('История', 'History')}</div>
        {sorted.length === 0 ? (
          <div style={{ fontSize:12, color:'var(--text3)' }}>{rl('Пока нет отметок.', 'No entries yet.')}</div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            {[...sorted].reverse().slice(0, 30).map(row => (
              <div key={row.date} style={{ display:'flex', alignItems:'center', gap:10, background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:10, padding:'9px 10px' }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, color:'var(--text)' }}>{Number(row.weight_kg).toFixed(1)} кг</div>
                  <div style={{ fontSize:10, color:'var(--text3)' }}>{new Date(`${row.date}T00:00:00`).toLocaleDateString(lang === 'en' ? 'en-US' : 'ru-RU')}</div>
                </div>
                <button type="button" onClick={() => removeRow(row)} style={{ border:'none', background:'transparent', color:'var(--text3)', cursor:'pointer', fontSize:18 }}>×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
