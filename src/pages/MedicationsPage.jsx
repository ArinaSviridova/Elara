import { useEffect, useMemo, useState } from 'react'
import InfoTooltip from '../components/InfoTooltip'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useRl } from '../context/LangContext'
import { isPregnancyPlanningActive, loadPregnancyToggles, savePregnancyToggles, pregnancyPlanningItems, togglePregnancyItemStatus, loadPregnancyDrafts, removePregnancyDraft } from '../lib/pregnancyPlanningUi'

const EMERGENCY_MEDS = {
  nsaid: ['Ибупрофен', 'Найз (Нимесулид)', 'Диклофенак', 'Кеторолак', 'Напроксен', 'Мефенамовая кислота'],
  hormonal: ['Эскапел (Левоноргестрел)', 'Постинор', 'Элла (Улипристал)', 'КОК (любые)', 'Прогестерон'],
  antibiotic: ['Амоксициллин', 'Азитромицин', 'Метронидазол', 'Доксициклин', 'Флуконазол'],
  pain: ['Парацетамол', 'Аспирин', 'Спазмалгон', 'Но-шпа', 'Баралгин'],
  vitamin: ['Витамин D', 'Магний B6', 'Фолиевая кислота', 'Железо', 'Цинк', 'Омега-3'],
  other: ['Мелатонин', 'Лоперамид', 'Смекта', 'Активированный уголь', 'Валерьяна'],
}

const TYPE_LABELS = {
  nsaid:'НПВС', hormonal:'Гормональные', antibiotic:'Антибиотики', pain:'Обезболивающие', vitamin:'Витамины', other:'Другое'
}

const EMERGENCY_REASONS = [
  { key:'period_pain', ru:'Боль при месячных', en:'Period pain' },
  { key:'headache', ru:'Головная боль / мигрень', en:'Headache / migraine' },
  { key:'fever', ru:'Температура / простуда', en:'Fever / cold' },
  { key:'stomach', ru:'ЖКТ / живот', en:'Stomach / gut' },
  { key:'allergy', ru:'Аллергия', en:'Allergy' },
  { key:'sex_risk', ru:'После риска в сексе', en:'After sexual risk' },
  { key:'sleep', ru:'Сон / тревога', en:'Sleep / anxiety' },
  { key:'other', ru:'Другая причина', en:'Other reason' },
]

const DAYS_OF_WEEK = [
  { key: 1, short: 'Пн' }, { key: 2, short: 'Вт' }, { key: 3, short: 'Ср' },
  { key: 4, short: 'Чт' }, { key: 5, short: 'Пт' }, { key: 6, short: 'Сб' },
  { key: 0, short: 'Вс' },
]

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function loadJson(key, fallback = {}) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) }
  catch { return fallback }
}

export default function MedicationsPage() {
  const { user, profile } = useAuth()
  const rl = useRl()

  const [activeMeds, setActiveMeds] = useState([])
  const [inactiveMeds, setInactiveMeds] = useState([])
  const [formMode, setFormMode] = useState(null) // add | edit
  const [editingId, setEditingId] = useState(null)
  const [name, setName] = useState('')
  const [dosage, setDosage] = useState('')
  const [times, setTimes] = useState(['09:00'])
  const [allDays, setAllDays] = useState(true)
  const [selectedDays, setSelectedDays] = useState([1,2,3,4,5,6,0])
  const [startDate, setStartDate] = useState(todayKey())
  const [endDate, setEndDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [aiTip, setAiTip] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [allAiTip, setAllAiTip] = useState('')
  const [allAiLoading, setAllAiLoading] = useState(false)
  const [intakeStatus, setIntakeStatus] = useState(() => loadJson('elara_med_intake_status', {}))
  const [medHistory, setMedHistory] = useState(() => loadJson('elara_med_history', {}))

  const [showEmergency, setShowEmergency] = useState(false)
  const [emType, setEmType] = useState('nsaid')
  const [emName, setEmName] = useState('')
  const [emCustom, setEmCustom] = useState('')
  const [emDosage, setEmDosage] = useState('')
  const [emReason, setEmReason] = useState('period_pain')
  const [emReasonText, setEmReasonText] = useState('')
  const [emSaving, setEmSaving] = useState(false)
  const [emSaved, setEmSaved] = useState(false)

  const pregnancyActive = isPregnancyPlanningActive(profile)
  const [pregnancyToggles, setPregnancyToggles] = useState(() => loadPregnancyToggles(user?.id))
  const [pregnancyDrafts, setPregnancyDrafts] = useState(() => loadPregnancyDrafts(user?.id))
  const [expandedPregnancy, setExpandedPregnancy] = useState({})
  const pregnancyMedItems = pregnancyPlanningItems(profile, rl).filter(item => item.area === 'medications')

  function togglePregnancyItem(itemId) {
    const next = { ...pregnancyToggles, [itemId]: togglePregnancyItemStatus(pregnancyToggles?.[itemId]) }
    setPregnancyToggles(next)
    savePregnancyToggles(user?.id, next)
  }

  function startMedicationFromItem(item) {
    resetForm()
    setFormMode('add')
    setName(item?.suggestedMedication?.name || item?.title || '')
    setDosage(item?.suggestedMedication?.dosage || rl('обсудить с врачом', 'discuss with clinician'))
    setAiTip(item?.details || item?.text || '')
  }

  function startMedicationFromDraft(draft) {
    resetForm()
    setFormMode('add')
    setName(draft?.title || '')
    setDosage(draft?.dosage || rl('обсудить с врачом', 'discuss with clinician'))
    setAiTip(draft?.note || '')
    setPregnancyDrafts(removePregnancyDraft(user?.id, draft.id))
  }

  function togglePregnancyDetails(id) {
    setExpandedPregnancy(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const meds = activeMeds
  const completedMeds = useMemo(() => inactiveMeds, [inactiveMeds])

  useEffect(() => { fetchMeds() }, [])

  function persistIntakeStatus(next) {
    setIntakeStatus(next)
    localStorage.setItem('elara_med_intake_status', JSON.stringify(next))
  }

  function persistMedHistory(next) {
    setMedHistory(next)
    localStorage.setItem('elara_med_history', JSON.stringify(next))
  }

  async function fetchMeds() {
    if (!user?.id) return
    const { data } = await supabase
      .from('medications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at')

    const rows = data || []
    setActiveMeds(rows.filter(m => m.is_active !== false))
    setInactiveMeds(rows.filter(m => m.is_active === false))
  }

  function resetForm() {
    setFormMode(null)
    setEditingId(null)
    setName('')
    setDosage('')
    setTimes(['09:00'])
    setAllDays(true)
    setSelectedDays([1,2,3,4,5,6,0])
    setStartDate(todayKey())
    setEndDate('')
    setAiTip('')
  }

  function openAdd() {
    resetForm()
    setFormMode('add')
  }

  function openEdit(med) {
    const history = medHistory[med.id] || {}
    setFormMode('edit')
    setEditingId(med.id)
    setName(med.name || '')
    setDosage(med.dosage || '')
    setTimes(med.times?.length ? med.times : ['09:00'])
    setAllDays(med.all_days !== false)
    setSelectedDays(med.days_of_week || [1,2,3,4,5,6,0])
    setStartDate(history.startDate || med.created_at?.slice(0,10) || todayKey())
    setEndDate(history.endDate || '')
    setAiTip('')
  }

  function addTime() { setTimes(prev => [...prev, '12:00']) }
  function removeTime(i) { setTimes(prev => prev.filter((_, idx) => idx !== i)) }
  function updateTime(i, v) { setTimes(prev => prev.map((t, idx) => idx === i ? v : t)) }
  function toggleDay(d) { setSelectedDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]) }

  async function getAiTip() {
    if (!name.trim()) return
    setAiLoading(true)
    setAiTip('')
    try {
      const { data } = await supabase.functions.invoke('ai-advisor', {
        body: {
          userId: user.id,
          requestType: 'medication_tip',
          medicationName: name.trim(),
          dosage: dosage.trim(),
          intakeTimes: times.filter(Boolean),
          currentMedications: activeMeds.filter(m => m.id !== editingId).map(m => m.name),
        }
      })
      setAiTip(data?.advice || data?.conflicts || rl('AI не вернул подсказку. Бывает. Железка задумалась о вечном.','AI did not return advice.'))
    } catch {
      setAiTip(rl('Не удалось получить подсказку. Проверь Edge Function позже.','Could not get advice.'))
    }
    setAiLoading(false)
  }

  async function getAllAiTip() {
    if (!activeMeds.length) return
    setAllAiLoading(true)
    setAllAiTip('')
    try {
      const { data } = await supabase.functions.invoke('ai-advisor', {
        body: {
          userId: user.id,
          requestType: 'all_meds_analysis',
          medications: activeMeds.map(m => ({ name:m.name, dosage:m.dosage, times:m.times })),
        }
      })
      setAllAiTip(data?.advice || '')
    } catch {
      setAllAiTip(rl('Не удалось проанализировать препараты.','Could not analyze medications.'))
    }
    setAllAiLoading(false)
  }

  async function handleSave(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    const payload = {
      user_id: user.id,
      name: name.trim(),
      dosage: dosage.trim() || null,
      times: times.filter(Boolean),
      all_days: allDays,
      days_of_week: allDays ? [0,1,2,3,4,5,6] : selectedDays,
      is_active: true,
    }

    if (editingId) {
      await supabase.from('medications').update(payload).eq('id', editingId)
      persistMedHistory({
        ...medHistory,
        [editingId]: { ...(medHistory[editingId] || {}), startDate: startDate || null, endDate: endDate || null },
      })
    } else {
      const { data } = await supabase.from('medications').insert(payload).select().single()
      if (data?.id) {
        persistMedHistory({
          ...medHistory,
          [data.id]: { startDate: startDate || todayKey(), endDate: null },
        })
      }
    }

    resetForm()
    await fetchMeds()
    setSaving(false)
  }

  async function markNotStarted(med) {
    const next = { ...intakeStatus, [med.id]: 'not_taking' }
    persistIntakeStatus(next)
    persistMedHistory({
      ...medHistory,
      [med.id]: { ...(medHistory[med.id] || {}), status: 'not_started', startDate: null, endDate: null },
    })
  }

  async function markTaking(med) {
    const next = { ...intakeStatus, [med.id]: 'taking' }
    persistIntakeStatus(next)
    persistMedHistory({
      ...medHistory,
      [med.id]: { ...(medHistory[med.id] || {}), status: 'taking', startDate: medHistory[med.id]?.startDate || todayKey(), endDate: null },
    })
  }

  async function finishMed(med) {
    const end = endDate || todayKey()
    persistIntakeStatus({ ...intakeStatus, [med.id]: 'not_taking' })
    persistMedHistory({
      ...medHistory,
      [med.id]: { ...(medHistory[med.id] || {}), status: 'finished', startDate: startDate || medHistory[med.id]?.startDate || null, endDate: end },
    })
    await supabase.from('medications').update({ is_active: false }).eq('id', med.id)
    resetForm()
    fetchMeds()
  }

  async function deleteMed(id) {
    persistIntakeStatus({ ...intakeStatus, [id]: 'not_taking' })
    await supabase.from('medications').update({ is_active: false }).eq('id', id)
    fetchMeds()
  }

  async function saveEmergency() {
    const medName = emName || emCustom.trim()
    if (!medName) return
    setEmSaving(true)
    const today = todayKey()
    const reasonLabel = EMERGENCY_REASONS.find(r => r.key === emReason)?.ru || emReason
    const purpose = emReason === 'other' ? emReasonText : reasonLabel
    const payload = {
      user_id: user.id,
      date: today,
      name: medName,
      med_type: emType,
      dosage: emDosage || null,
    }

    // В текущей базе emergency_meds может не иметь колонки purpose.
    // Не отправляем её в Supabase, чтобы не ловить 400 в консоли.
    // Цель приёма пока храним локально рядом с записью.
    const { error } = await supabase.from('emergency_meds').insert(payload)
    const key = `elara_emergency_med_reasons_${user.id}`
    const current = loadJson(key, [])
    localStorage.setItem(key, JSON.stringify([...current, { ...payload, purpose, savedAt: new Date().toISOString(), supabaseError: error?.message || null }]))
    setEmName('')
    setEmCustom('')
    setEmDosage('')
    setEmReasonText('')
    setEmSaving(false)
    setEmSaved(true)
    setTimeout(() => setEmSaved(false), 2000)
  }

  async function scheduleNotification(med) {
    if (!('Notification' in window)) return
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') return
    alert(rl(`Напоминание: ${med.times?.join(', ')}`, `Reminder: ${med.times?.join(', ')}`))
  }

  function statusLabel(med) {
    const status = intakeStatus[med.id]
    if (status === 'not_taking') return rl('Пока не принимаю','Not taking yet')
    return rl('Принимаю','Taking')
  }

  function renderForm(forMed = null) {
    const isEdit = Boolean(forMed)
    return (
      <form onSubmit={handleSave} className="card" style={{ display:'flex', flexDirection:'column', gap:12, marginTop:isEdit ? 12 : 0, border:'1px solid var(--accent)33' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontSize:13, fontWeight:600 }}>{isEdit ? rl('Редактирование под выбранным препаратом','Edit selected medication') : rl('Новое лекарство','New medication')}</div>
          <button type="button" onClick={resetForm} style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:20 }}>×</button>
        </div>

        <div>
          <div style={{ fontSize:11, color:'var(--text3)', marginBottom:5 }}>{rl('Название','Name')}</div>
          <div style={{ display:'flex', gap:8 }}>
            <input placeholder="Ибупрофен" value={name} onChange={e => setName(e.target.value)} style={{ flex:1 }} required />
            <button type="button" onClick={getAiTip} disabled={aiLoading || !name.trim()} style={{ background:'var(--accent-soft)', border:'1px solid var(--border)', borderRadius:8, color:'var(--accent)', fontSize:12, padding:'0 14px', cursor:'pointer', opacity:name.trim()?1:0.4 }}>
              {aiLoading ? '⟳' : 'AI ✦'}
            </button>
          </div>
        </div>

        {aiTip && (
          <div style={{ background:'var(--bg3)', borderRadius:10, padding:'12px 14px', border:'1px solid var(--accent)33' }}>
            <div style={{ fontSize:11, color:'var(--accent)', marginBottom:6, fontWeight:500 }}>✦ {rl('Подсказка','Note')}</div>
            <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6, margin:0 }}>{aiTip}</p>
          </div>
        )}

        <div>
          <div style={{ fontSize:11, color:'var(--text3)', marginBottom:5 }}>{rl('Доза','Dosage')}</div>
          <input placeholder="500mg" value={dosage} onChange={e => setDosage(e.target.value)} />
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <div>
            <div style={{ fontSize:11, color:'var(--text3)', marginBottom:5 }}>{rl('Начала принимать','Started taking')}</div>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize:11, color:'var(--text3)', marginBottom:5 }}>{rl('Закончила / закончил','Finished')}</div>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>

        <div>
          <div style={{ fontSize:11, color:'var(--text3)', marginBottom:8 }}>{rl('Дни приёма','Days')}</div>
          <div style={{ display:'flex', gap:6, marginBottom:8 }}>
            <button type="button" onClick={() => setAllDays(true)} style={{ flex:1, padding:'8px', borderRadius:8, fontSize:12, cursor:'pointer', border:`1px solid ${allDays?'var(--accent)':'var(--border)'}`, background:allDays?'var(--accent-soft)':'transparent', color:allDays?'var(--accent)':'var(--text2)' }}>{rl('Каждый день','Every day')}</button>
            <button type="button" onClick={() => setAllDays(false)} style={{ flex:1, padding:'8px', borderRadius:8, fontSize:12, cursor:'pointer', border:`1px solid ${!allDays?'var(--accent)':'var(--border)'}`, background:!allDays?'var(--accent-soft)':'transparent', color:!allDays?'var(--accent)':'var(--text2)' }}>{rl('Выбрать дни','Select days')}</button>
          </div>
          {!allDays && (
            <div style={{ display:'flex', gap:6 }}>
              {DAYS_OF_WEEK.map(d => (
                <button key={d.key} type="button" onClick={() => toggleDay(d.key)} style={{ flex:1, padding:'8px 4px', borderRadius:8, fontSize:11, cursor:'pointer', border:`1px solid ${selectedDays.includes(d.key)?'var(--accent)':'var(--border)'}`, background:selectedDays.includes(d.key)?'var(--accent-soft)':'transparent', color:selectedDays.includes(d.key)?'var(--accent)':'var(--text2)' }}>{d.short}</button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
            <div style={{ fontSize:11, color:'var(--text3)' }}>{rl('Время приёма','Time')}</div>
            <button type="button" onClick={addTime} style={{ background:'none', border:'1px solid var(--border)', borderRadius:6, color:'var(--text2)', fontSize:11, padding:'3px 10px', cursor:'pointer' }}>+ {rl('Ещё','Add')}</button>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            {times.map((t, i) => (
              <div key={i} style={{ display:'flex', gap:8, alignItems:'center' }}>
                <input type="time" value={t} onChange={e => updateTime(i, e.target.value)} style={{ flex:1 }} />
                {times.length > 1 && <button type="button" onClick={() => removeTime(i)} style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:20, padding:0 }}>×</button>}
              </div>
            ))}
          </div>
        </div>

        {isEdit && forMed && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <button type="button" onClick={() => markNotStarted(forMed)} className="btn btn-ghost" style={{ fontSize:12 }}>
              {rl('Пока не принимаю','Not taking yet')}
            </button>
            <button type="button" onClick={() => finishMed(forMed)} className="btn btn-ghost" style={{ fontSize:12, color:'#f87171', borderColor:'rgba(248,113,113,0.35)' }}>
              {rl('Уже не принимаю','Finished / no longer taking')}
            </button>
            <button type="button" onClick={() => markTaking(forMed)} className="btn btn-ghost" style={{ fontSize:12, gridColumn:'1 / -1' }}>
              {rl('Отметить как принимаю','Mark as taking')}
            </button>
          </div>
        )}

        <div style={{ display:'flex', gap:8 }}>
          <button type="button" onClick={resetForm} className="btn btn-ghost" style={{ flex:1 }}>{rl('Отмена','Cancel')}</button>
          <button type="submit" className="btn btn-primary" disabled={saving || !name.trim()} style={{ flex:2 }}>{saving ? '...' : rl('Сохранить','Save')}</button>
        </div>
      </form>
    )
  }

  return (
    <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', padding:'20px 16px', gap:14, overflowY:'auto' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
        <h2 style={{ fontSize:26 }}>💊 {rl('Таблетки','Medications')}</h2>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => setShowEmergency(e => !e)} style={{ padding:'7px 12px', borderRadius:8, fontSize:12, cursor:'pointer', flexShrink:0, border:`1px solid ${showEmergency?'#f87171':'var(--border)'}`, background:showEmergency?'rgba(248,113,113,0.1)':'transparent', color:showEmergency?'#f87171':'var(--text2)' }}>
            🆘 {rl('Внеплановый','Emergency')}
          </button>
          {!formMode && <button onClick={openAdd} className="btn btn-ghost" style={{ width:'auto', padding:'7px 12px', fontSize:12 }}>+ {rl('Добавить','Add')}</button>}
        </div>
      </div>

      {pregnancyActive && (
        <div className="card" style={{ padding:'16px', border:'1px solid rgba(134,239,172,0.35)', background:'linear-gradient(180deg, rgba(34,197,94,0.14), rgba(255,255,255,0.035))' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, marginBottom:12 }}>
            <div>
              <h3 style={{ margin:'0 0 6px', color:'#dcfce7', fontSize:18 }}>🕊 {rl('Подготовка к беременности','Pregnancy planning')}</h3>
              <p style={{ margin:0, fontSize:12, color:'rgba(255,255,255,0.68)', lineHeight:1.55 }}>
                {rl('Тут тумблеры именно по препаратам и витаминам. Elara не назначает лечение: всё ниже - список для обсуждения с врачом.', 'These toggles are for meds and vitamins. Elara does not prescribe treatment: this is a clinician checklist.')}
              </p>
            </div>
            <span style={{ padding:'5px 10px', borderRadius:999, background:'#bbf7d0', color:'#052e16', fontSize:11, fontWeight:900 }}>{rl('ГОРИТ','ACTIVE')}</span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {pregnancyMedItems.map(item => {
              const done = pregnancyToggles?.[item.id] === 'done'
              return (
                <div key={item.id} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px', borderRadius:16, border:'1px solid rgba(134,239,172,0.22)', background:'rgba(255,255,255,0.045)', opacity:done?0.62:1 }}>
                  <button type="button" onClick={() => togglePregnancyItem(item.id)} style={{ width:34, height:34, borderRadius:12, border:'1px solid rgba(134,239,172,0.35)', background:done?'#bbf7d0':'rgba(255,255,255,0.05)', color:done?'#052e16':'#bbf7d0', cursor:'pointer', fontWeight:900 }}>
                    {done ? '✓' : item.icon}
                  </button>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:850, color:'#f0fdf4', textDecoration:done?'line-through':'none' }}>{item.title}</div>
                    <p style={{ margin:'4px 0 9px', fontSize:12, color:'rgba(255,255,255,0.62)', lineHeight:1.5 }}>{item.text}</p>
                    <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
                      <button type="button" onClick={() => togglePregnancyItem(item.id)} className="btn btn-ghost" style={{ width:'auto', padding:'7px 10px', fontSize:12 }}>
                        {done ? rl('Вернуть в задачи','Mark todo') : rl('Отметить сделанным','Mark done')}
                      </button>
                      <button type="button" onClick={() => togglePregnancyDetails(item.id)} className="btn btn-ghost" style={{ width:'auto', padding:'7px 10px', fontSize:12 }}>
                        {expandedPregnancy[item.id] ? rl('Скрыть детали','Hide details') : rl('Подробнее','Details')}
                      </button>
                      <button type="button" onClick={() => startMedicationFromItem(item)} className="btn btn-primary" style={{ width:'auto', padding:'7px 10px', fontSize:12 }}>
                        {rl('Добавить в таблетки','Add to meds')}
                      </button>
                    </div>
                    {expandedPregnancy[item.id] && (
                      <div style={{ marginTop:10, padding:12, borderRadius:14, background:'rgba(255,255,255,0.055)', border:'1px solid rgba(134,239,172,0.22)' }}>
                        <p style={{ margin:0, fontSize:12, color:'rgba(255,255,255,0.72)', lineHeight:1.55 }}>{item.details || item.text}</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {pregnancyDrafts.filter(d => d.type === 'medication').length > 0 && (
            <div style={{ marginTop:12, padding:12, borderRadius:16, background:'rgba(255,255,255,0.045)', border:'1px solid rgba(134,239,172,0.18)' }}>
              <div style={{ fontSize:13, fontWeight:850, color:'#dcfce7', marginBottom:8 }}>{rl('Черновики из рекомендаций','Recommendation drafts')}</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {pregnancyDrafts.filter(d => d.type === 'medication').map(draft => (
                  <div key={draft.id} style={{ display:'flex', gap:8, alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, fontWeight:800 }}>{draft.title}</div>
                      <div style={{ fontSize:11, color:'rgba(255,255,255,0.55)' }}>{draft.dosage || draft.note}</div>
                    </div>
                    <button type="button" onClick={() => startMedicationFromDraft(draft)} className="btn btn-primary" style={{ width:'auto', padding:'7px 10px', fontSize:11 }}>{rl('Добавить','Add')}</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showEmergency && (
        <div className="card" style={{ padding:'14px', border:'1px solid rgba(248,113,113,0.3)' }}>
          <div style={{ fontSize:13, fontWeight:600, marginBottom:10, color:'#f87171' }}>🆘 {rl('Внеплановый приём','Emergency intake')}</div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
            {Object.entries(TYPE_LABELS).map(([key, label]) => (
              <button key={key} onClick={() => { setEmType(key); setEmName('') }} style={{ padding:'6px 10px', borderRadius:20, fontSize:12, cursor:'pointer', border:`1px solid ${emType===key?'#f87171':'var(--border)'}`, background:emType===key?'rgba(248,113,113,0.12)':'transparent', color:emType===key?'#f87171':'var(--text2)' }}>{label}</button>
            ))}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:7, marginBottom:10 }}>
            {EMERGENCY_MEDS[emType]?.map(med => (
              <div key={med} style={{ display:'flex', alignItems:'center', gap:4 }}>
                <button onClick={() => setEmName(med)} style={{ flex:1, padding:'9px 12px', borderRadius:8, fontSize:13, cursor:'pointer', textAlign:'left', border:`1px solid ${emName===med?'#f87171':'var(--border)'}`, background:emName===med?'rgba(248,113,113,0.1)':'transparent', color:emName===med?'#f87171':'var(--text2)' }}>{med}</button>
                <InfoTooltip id={med} />
              </div>
            ))}
            <input placeholder={rl('Другое лекарство вручную','Other medication')} value={emCustom} onChange={e => { setEmCustom(e.target.value); setEmName('') }} />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <div>
              <div style={{ fontSize:11, color:'var(--text3)', marginBottom:4 }}>{rl('Доза','Dosage')}</div>
              <input placeholder="200mg" value={emDosage} onChange={e => setEmDosage(e.target.value)} />
            </div>
            <div>
              <div style={{ fontSize:11, color:'var(--text3)', marginBottom:4 }}>{rl('Зачем выпила / выпил','Reason')}</div>
              <select value={emReason} onChange={e => setEmReason(e.target.value)}>
                {EMERGENCY_REASONS.map(r => <option key={r.key} value={r.key}>{rl(r.ru, r.en)}</option>)}
              </select>
            </div>
          </div>
          {emReason === 'other' && <input style={{ marginTop:8 }} placeholder={rl('Опиши цель приёма','Describe the reason')} value={emReasonText} onChange={e => setEmReasonText(e.target.value)} />}
          <button className="btn btn-primary" onClick={saveEmergency} disabled={emSaving || (!emName && !emCustom.trim())} style={{ marginTop:10, fontSize:12, background:'rgba(248,113,113,0.8)' }}>
            {emSaved ? '✓' : emSaving ? '...' : rl('Записать','Log')}
          </button>
        </div>
      )}

      {activeMeds.length >= 2 && !formMode && (
        <div className="card" style={{ padding:'14px 16px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: allAiTip ? 10 : 0 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:500 }}>✦ {rl('Общий анализ','Overall analysis')}</div>
              <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>{activeMeds.length} {rl('активных препаратов','active medications')}</div>
            </div>
            <button onClick={getAllAiTip} disabled={allAiLoading} style={{ background:'var(--accent-soft)', border:'1px solid var(--border)', borderRadius:8, color:'var(--accent)', fontSize:12, padding:'7px 14px', cursor:'pointer', opacity:allAiLoading ? 0.6 : 1 }}>
              {allAiLoading ? rl('Анализ...','Analyzing...') : allAiTip ? '↻' : 'AI ✦'}
            </button>
          </div>
          {allAiTip && <p style={{ fontSize:14, color:'var(--text2)', lineHeight:1.7, margin:0, fontFamily:'Cormorant Garamond,serif', fontStyle:'italic', borderTop:'1px solid var(--border)', paddingTop:10 }}>{allAiTip}</p>}
        </div>
      )}

      {formMode === 'add' && renderForm()}

      {activeMeds.length === 0 && !formMode && (
        <div style={{ textAlign:'center', color:'var(--text3)', fontSize:14, marginTop:40, lineHeight:2 }}>💊<br/>{rl('Лекарства не добавлены','No medications added')}</div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {activeMeds.map(med => {
          const history = medHistory[med.id] || {}
          return (
            <div key={med.id} className="card" style={{ padding:'14px 16px' }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                <span style={{ fontSize:22, flexShrink:0 }}>💊</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:600 }}>{med.name}</div>
                  {med.dosage && <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>{med.dosage}</div>}
                  <div style={{ fontSize:11, color:intakeStatus[med.id] === 'not_taking' ? '#facc15' : '#4ade80', marginTop:4 }}>{statusLabel(med)}</div>
                  {(history.startDate || history.endDate) && <div style={{ fontSize:10, color:'var(--text3)', marginTop:3 }}>{[history.startDate && `${rl('с','from')} ${history.startDate}`, history.endDate && `${rl('до','to')} ${history.endDate}`].filter(Boolean).join(' · ')}</div>}
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:6 }}>
                    {(med.times || []).map((t, i) => <span key={i} style={{ fontSize:11, padding:'2px 9px', borderRadius:20, background:'var(--bg3)', color:'var(--text2)', border:'1px solid var(--border)' }}>🕐 {t}</span>)}
                    {!med.all_days && (med.days_of_week || []).length < 7 && <span style={{ fontSize:11, padding:'2px 9px', borderRadius:20, background:'var(--bg3)', color:'var(--text3)', border:'1px solid var(--border)' }}>{(med.days_of_week || []).map(d => DAYS_OF_WEEK.find(x => x.key === d)?.short || d).join(', ')}</span>}
                  </div>
                </div>
                <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                  <button onClick={() => scheduleNotification(med)} title={rl('Напомнить','Remind')} style={{ background:'none', border:'1px solid var(--border)', borderRadius:6, color:'var(--text2)', cursor:'pointer', fontSize:13, padding:'4px 8px' }}>🔔</button>
                  <button onClick={() => openEdit(med)} title={rl('Редактировать','Edit')} style={{ background:'none', border:'1px solid var(--border)', borderRadius:6, color:'var(--text2)', cursor:'pointer', fontSize:13, padding:'4px 8px' }}>✎</button>
                  <button onClick={() => deleteMed(med.id)} title={rl('Убрать','Remove')} style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:18 }}>×</button>
                </div>
              </div>
              {formMode === 'edit' && editingId === med.id && renderForm(med)}
            </div>
          )
        })}
      </div>

      {completedMeds.length > 0 && (
        <div style={{ marginTop:10 }}>
          <div style={{ fontSize:12, color:'var(--text3)', margin:'0 0 8px 2px', letterSpacing:'0.06em' }}>
            {rl('Завершённые / неактивные препараты','Finished / inactive medications')}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {completedMeds.map(med => {
              const history = medHistory[med.id] || {}
              return (
                <div key={med.id} className="card" style={{ padding:'12px 14px', opacity:0.72 }}>
                  <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                    <span>✓</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:500 }}>{med.name}</div>
                      <div style={{ fontSize:11, color:'var(--text3)' }}>{[med.dosage, history.startDate && `${rl('с','from')} ${history.startDate}`, history.endDate && `${rl('до','to')} ${history.endDate}`].filter(Boolean).join(' · ')}</div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
