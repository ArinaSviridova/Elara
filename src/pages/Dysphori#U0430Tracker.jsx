import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang, useRl } from '../context/LangContext'

const TRIGGERS = [
  { key:'mirror', ru:'Зеркало', en:'Mirror' },
  { key:'clothes', ru:'Одежда', en:'Clothes' },
  { key:'voice', ru:'Голос', en:'Voice' },
  { key:'body', ru:'Ощущение тела', en:'Body feeling' },
  { key:'misgendering', ru:'Мисгендеринг', en:'Misgendering' },
  { key:'name_pronouns', ru:'Имя / местоимения', en:'Name / pronouns' },
  { key:'social', ru:'Социальная ситуация', en:'Social situation' },
  { key:'documents', ru:'Документы', en:'Documents' },
  { key:'period', ru:'Кровотечение / цикл', en:'Bleeding / cycle' },
  { key:'intimacy', ru:'Интим', en:'Intimacy' },
]

const BODY_CONTEXTS = [
  { key:'chest', ru:'Грудь / грудная клетка', en:'Chest' },
  { key:'face', ru:'Лицо', en:'Face' },
  { key:'voice', ru:'Голос', en:'Voice' },
  { key:'hair', ru:'Волосы', en:'Hair' },
  { key:'genitals', ru:'Гениталии', en:'Genitals' },
  { key:'height_shape', ru:'Рост / форма тела', en:'Height / body shape' },
  { key:'clothes', ru:'Одежда', en:'Clothes' },
  { key:'public_space', ru:'Публичное пространство', en:'Public space' },
]

const HELPS = [
  { key:'no_touch', ru:'Не трогать тело', en:"Don't touch my body" },
  { key:'write', ru:'Написать мне', en:'Text me' },
  { key:'food', ru:'Принести еду', en:'Bring food' },
  { key:'no_appearance', ru:'Не обсуждать внешность', en:"Don't discuss appearance" },
  { key:'go_out', ru:'Помочь выйти из дома', en:'Help me get outside' },
  { key:'meds_reminder', ru:'Напомнить про лекарства', en:'Remind about meds' },
  { key:'distraction', ru:'Отвлечь / поговорить', en:'Distract / talk' },
  { key:'alone', ru:'Оставить одну/одного', en:'Leave me alone' },
  { key:'affirmation', ru:'Подтвердить мою идентичность', en:'Affirm my identity' },
]

function todayKey() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function safeJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) }
  catch { return fallback }
}

export default function DysphoriaTracker() {
  const { user, profile } = useAuth()
  const { lang } = useLang()
  const rl = useRl()
  const [date, setDate] = useState(todayKey())
  const [dysphoriaLevel, setDysphoriaLevel] = useState(0)
  const [euphoriaLevel, setEuphoriaLevel] = useState(0)
  const [triggers, setTriggers] = useState([])
  const [bodyContexts, setBodyContexts] = useState([])
  const [helps, setHelps] = useState(profile?.dysphoria_plan || [])
  const [notes, setNotes] = useState('')
  const [includeInDoctorReport, setIncludeInDoctorReport] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showPlan, setShowPlan] = useState(false)

  const storageKey = user?.id ? `elara_dysphoria_logs_${user.id}` : 'elara_dysphoria_logs_anon'

  useEffect(() => {
    const logs = safeJson(storageKey, {})
    const current = logs[date]
    if (!current) {
      setDysphoriaLevel(0)
      setEuphoriaLevel(0)
      setTriggers([])
      setBodyContexts([])
      setNotes('')
      setIncludeInDoctorReport(false)
      return
    }

    setDysphoriaLevel(Number(current.dysphoria_level ?? current.level ?? 0))
    setEuphoriaLevel(Number(current.euphoria_level ?? 0))
    setTriggers(current.triggers || [])
    setBodyContexts(current.body_contexts || [])
    setNotes(current.notes || '')
    setIncludeInDoctorReport(Boolean(current.include_in_doctor_report))
  }, [date, storageKey])

  function toggleArr(setArr, key) {
    setArr(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  async function save() {
    const payload = {
      date,
      dysphoria_level: dysphoriaLevel,
      euphoria_level: euphoriaLevel,
      triggers,
      body_contexts: bodyContexts,
      notes,
      include_in_doctor_report: includeInDoctorReport,
      visible_to_partner: false,
      updated_at: new Date().toISOString(),
    }

    const logs = safeJson(storageKey, {})
    const nextLogs = { ...logs, [date]: payload }
    localStorage.setItem(storageKey, JSON.stringify(nextLogs))

    try {
      await supabase.from('dysphoria_logs').upsert({
        user_id: user.id,
        date,
        level: dysphoriaLevel,
        euphoria_level: euphoriaLevel,
        triggers,
        body_contexts: bodyContexts,
        notes,
        include_in_doctor_report: includeInDoctorReport,
        visible_to_partner: false,
      }, { onConflict: 'user_id,date' })
    } catch {
      // Локальная запись уже сохранена. Таблица может быть не создана на MVP, не устраиваем трагедию на ровном месте.
    }

    if (showPlan) {
      await supabase.from('profiles').update({ dysphoria_plan: helps }).eq('id', user.id)
    }

    window.dispatchEvent(new Event('elara:dysphoria-updated'))
    setSaved(true)
    setTimeout(() => setSaved(false), 1600)
  }

  const LEVEL_LABELS = [
    { n:0, emoji:'😌', ru:'Нет', en:'None', color:'#4ade80' },
    { n:1, emoji:'🤍', ru:'Лёгкая', en:'Mild', color:'#94a3b8' },
    { n:2, emoji:'💛', ru:'Умеренная', en:'Moderate', color:'#facc15' },
    { n:3, emoji:'🧡', ru:'Сильная', en:'Strong', color:'#fb923c' },
    { n:4, emoji:'🔴', ru:'Очень сильная', en:'Very strong', color:'#f87171' },
  ]

  return (
    <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', padding:'20px 16px', gap:14, overflowY:'auto' }}>
      <h2 style={{ fontSize:22 }}>⚧ {rl('Дневник дисфории','Dysphoria diary')}</h2>

      <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6, margin:0 }}>
        {rl(
          'Личный дневник дисфории и эйфории. В календарь попадёт только маленький маркер, а в отчёт врачу запись добавится только по твоему согласию.',
          'A private diary for dysphoria and euphoria. The calendar only shows a small marker, and doctor reports include it only with your consent.'
        )}
      </p>

      <div className="card" style={{ padding:'14px' }}>
        <div style={{ fontSize:12, color:'var(--text3)', marginBottom:8 }}>{rl('Дата','Date')}</div>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width:'100%', padding:'12px', borderRadius:10, background:'var(--bg2)', border:'1px solid var(--border)', color:'var(--text)' }} />
      </div>

      <div className="card" style={{ padding:'14px' }}>
        <div style={{ fontSize:12, color:'var(--text3)', marginBottom:10 }}>{rl('Уровень дисфории','Dysphoria level')}</div>
        <div style={{ display:'flex', gap:8 }}>
          {LEVEL_LABELS.map(l => (
            <button key={l.n} type="button" onClick={() => setDysphoriaLevel(l.n)} style={{
              flex:1, padding:'12px 4px', borderRadius:10, cursor:'pointer', fontSize:20,
              border:`2px solid ${dysphoriaLevel===l.n?l.color:'transparent'}`,
              background:dysphoriaLevel===l.n?`${l.color}20`:'var(--bg3)',
              display:'flex', flexDirection:'column', alignItems:'center', gap:4,
            }}>
              <span>{l.emoji}</span>
              <span style={{ fontSize:9, color:dysphoriaLevel===l.n?l.color:'var(--text3)' }}>{lang==='en'?l.en:l.ru}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding:'14px' }}>
        <div style={{ fontSize:12, color:'var(--text3)', marginBottom:10 }}>{rl('Уровень гендерной эйфории','Gender euphoria level')}</div>
        <input type="range" min="0" max="10" value={euphoriaLevel} onChange={e => setEuphoriaLevel(Number(e.target.value))} style={{ width:'100%' }} />
        <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'var(--text2)' }}>
          <span>0</span><strong>✨ {euphoriaLevel}/10</strong><span>10</span>
        </div>
      </div>

      {(dysphoriaLevel > 0 || euphoriaLevel > 0) && (
        <div className="card" style={{ padding:'14px' }}>
          <div style={{ fontSize:12, color:'var(--text3)', marginBottom:8 }}>{rl('Что повлияло?','What affected it?')}</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {TRIGGERS.map(t => (
              <button key={t.key} type="button" onClick={() => toggleArr(setTriggers, t.key)} style={{
                padding:'6px 12px', borderRadius:20, fontSize:12, cursor:'pointer',
                border:`1px solid ${triggers.includes(t.key)?'#a78bfa':'var(--border)'}`,
                background:triggers.includes(t.key)?'rgba(167,139,250,0.12)':'transparent',
                color:triggers.includes(t.key)?'#a78bfa':'var(--text2)',
              }}>{lang==='en'?t.en:t.ru}</button>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ padding:'14px' }}>
        <div style={{ fontSize:12, color:'var(--text3)', marginBottom:8 }}>{rl('Контекст тела / ситуации','Body or situation context')}</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
          {BODY_CONTEXTS.map(item => (
            <button key={item.key} type="button" onClick={() => toggleArr(setBodyContexts, item.key)} style={{
              padding:'6px 12px', borderRadius:20, fontSize:12, cursor:'pointer',
              border:`1px solid ${bodyContexts.includes(item.key)?'var(--accent)':'var(--border)'}`,
              background:bodyContexts.includes(item.key)?'var(--accent-soft)':'transparent',
              color:bodyContexts.includes(item.key)?'var(--accent)':'var(--text2)',
            }}>{lang==='en'?item.en:item.ru}</button>
          ))}
        </div>
      </div>

      <textarea
        placeholder={rl('Заметка для себя. Что помогло? Что ухудшило?','Private note. What helped? What made it worse?')}
        value={notes} onChange={e => setNotes(e.target.value)}
        style={{ borderRadius:10, padding:'12px', fontSize:13, minHeight:90, resize:'vertical', background:'var(--bg2)', border:'1px solid var(--border)', color:'var(--text)' }}
      />

      <label className="card" style={{ padding:'12px 14px', display:'flex', gap:10, alignItems:'flex-start', cursor:'pointer' }}>
        <input type="checkbox" checked={includeInDoctorReport} onChange={e => setIncludeInDoctorReport(e.target.checked)} />
        <span style={{ fontSize:12, color:'var(--text2)', lineHeight:1.5 }}>
          {rl('Можно добавлять эти записи в отчёт врачу. По умолчанию такие данные скрыты.', 'Allow these logs in doctor reports. By default this data is hidden.')}
        </span>
      </label>

      <div className="card" style={{ padding:'14px' }}>
        <button type="button" onClick={() => setShowPlan(p=>!p)} style={{ background:'none', border:'none', cursor:'pointer', width:'100%', textAlign:'left', padding:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ fontSize:13, fontWeight:500 }}>💜 {rl('Мой план поддержки','My support plan')}</div>
            <span style={{ color:'var(--text3)', fontSize:14 }}>{showPlan?'▲':'▼'}</span>
          </div>
          <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>
            {rl('Что помогает когда плохо - для себя и близких','What helps when I feel low - for myself and close ones')}
          </div>
        </button>

        {showPlan && (
          <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:6 }}>
            {HELPS.map(h => (
              <button key={h.key} type="button" onClick={() => toggleArr(setHelps, h.key)} style={{
                padding:'10px 12px', borderRadius:8, cursor:'pointer', textAlign:'left', fontSize:13,
                border:`1px solid ${helps.includes(h.key)?'var(--accent)':'var(--border)'}`,
                background:helps.includes(h.key)?'var(--accent-soft)':'transparent',
                color:helps.includes(h.key)?'var(--accent)':'var(--text2)',
                display:'flex', alignItems:'center', gap:10,
              }}>
                {helps.includes(h.key) ? '✓' : '○'}
                {lang==='en'?h.en:h.ru}
              </button>
            ))}
          </div>
        )}
      </div>

      <button type="button" className="btn btn-primary" onClick={save}>
        {saved ? '✓' : rl('Сохранить','Save')}
      </button>
    </div>
  )
}
