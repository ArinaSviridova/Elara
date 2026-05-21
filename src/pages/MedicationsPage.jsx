import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'

export default function MedicationsPage() {
  const { user } = useAuth()
  const { lang } = useLang()
  const rl = (ru, en, be) => lang === 'en' ? en : (lang === 'be' ? (be || ru) : ru)

  const [meds, setMeds] = useState([])
  const [form, setForm] = useState(null)
  const [name, setName] = useState('')
  const [dosage, setDosage] = useState('')
  const [times, setTimes] = useState(['09:00'])
  const [aiTip, setAiTip] = useState('')
  const [aiConflicts, setAiConflicts] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [allAiTip, setAllAiTip] = useState('')
  const [allAiLoading, setAllAiLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchMeds() }, [])

  async function fetchMeds() {
    const { data } = await supabase
      .from('medications').select('*').eq('user_id', user.id).eq('is_active', true).order('created_at')
    setMeds(data || [])
  }

  function openAdd() {
    setForm({}); setName(''); setDosage(''); setTimes(['09:00']); setAiTip(''); setAiConflicts('')
  }
  function openEdit(med) {
    setForm(med); setName(med.name); setDosage(med.dosage || ''); setTimes(med.times || ['09:00']); setAiTip(''); setAiConflicts('')
  }
  function closeForm() { setForm(null); setAiTip(''); setAiConflicts('') }
  function addTimeSlot() { setTimes(p => [...p, '12:00']) }
  function removeTimeSlot(i) { setTimes(p => p.filter((_, idx) => idx !== i)) }
  function updateTime(i, v) { setTimes(p => p.map((t, idx) => idx === i ? v : t)) }

  async function getAiTip() {
    if (!name.trim()) return
    setAiLoading(true); setAiTip(''); setAiConflicts('')
    try {
      const currentMeds = meds
        .filter(m => form?.id ? m.id !== form.id : true)
        .map(m => m.name)

      const { data, error } = await supabase.functions.invoke('ai-advisor', {
        body: {
          userId: user.id,
          requestType: 'medication_tip',
          language: lang,
          medicationName: name.trim(),
          dosage: dosage.trim(),
          currentMedications: currentMeds,
        }
      })

      if (error) throw error
      if (data?.advice) setAiTip(data.advice)
      if (data?.conflicts) setAiConflicts(data.conflicts)
    } catch (e) {
      console.error('AI error:', e)
      setAiTip(rl('Не удалось получить рекомендацию', 'Could not get recommendation', 'Не ўдалося атрымаць рэкамендацыю'))
    }
    setAiLoading(false)
  }

  async function getAllAiTip() {
    if (!meds.length) return
    setAllAiLoading(true); setAllAiTip('')
    try {
      const { data, error } = await supabase.functions.invoke('ai-advisor', {
        body: {
          userId: user.id,
          requestType: 'all_meds_analysis',
          language: lang,
          medications: meds.map(m => ({ name: m.name, dosage: m.dosage, times: m.times })),
        }
      })
      if (error) throw error
      setAllAiTip(data?.advice || '')
    } catch (e) {
      console.error('AI error:', e)
      setAllAiTip(rl('Не удалось получить анализ', 'Could not analyze', 'Не ўдалося прааналізаваць'))
    }
    setAllAiLoading(false)
  }

  async function handleSave(e) {
    e.preventDefault(); setSaving(true)
    const payload = { user_id: user.id, name, dosage, times: times.filter(Boolean) }
    if (form?.id) {
      await supabase.from('medications').update(payload).eq('id', form.id)
    } else {
      await supabase.from('medications').insert(payload)
    }
    closeForm(); fetchMeds(); setSaving(false)
  }

  async function deleteMed(id) {
    await supabase.from('medications').update({ is_active: false }).eq('id', id)
    fetchMeds()
  }

  async function scheduleNotification(med) {
    if (!('Notification' in window)) return
    const perm = await Notification.requestPermission()
    if (perm !== 'granted') return
    med.times?.forEach(timeStr => {
      const [h, m] = timeStr.split(':').map(Number)
      const next = new Date(); next.setHours(h, m, 0, 0)
      if (next <= new Date()) next.setDate(next.getDate() + 1)
      setTimeout(() => new Notification('Elara 💊', {
        body: `${rl('Время принять', 'Time to take', 'Час прыняць')}: ${med.name}${med.dosage ? ' · ' + med.dosage : ''}`,
        icon: '/favicon.svg',
      }), next - new Date())
    })
    alert(rl(`Напоминание: ${med.times?.join(', ')}`, `Reminder: ${med.times?.join(', ')}`, `Нагадванне: ${med.times?.join(', ')}`))
  }

  return (
    <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', padding:'24px 20px', gap:14, overflowY:'auto' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <h2 style={{ fontSize:28 }}>💊 {rl('Таблетки','Medications','Таблеткі')}</h2>
        {!form && (
          <button onClick={openAdd} className="btn btn-ghost" style={{ width:'auto', padding:'8px 14px', fontSize:12 }}>
            + {rl('Добавить','Add','Дадаць')}
          </button>
        )}
      </div>

      {/* Общий AI анализ всех таблеток */}
      {meds.length >= 2 && !form && (
        <div className="card" style={{ padding:'14px 16px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: allAiTip ? 10 : 0 }}>
            <div>
              <div style={{ fontSize:13, fontWeight:500, color:'var(--text)' }}>
                ✦ {rl('Общий анализ схемы', 'Overall regimen analysis', 'Агульны аналіз схемы')}
              </div>
              <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>
                {rl(`${meds.length} препаратов — AI проверит конфликты и время`, `${meds.length} medications — AI checks interactions & timing`, `${meds.length} прэпаратаў — AI правярае ўзаемадзеянні`)}
              </div>
            </div>
            <button onClick={getAllAiTip} disabled={allAiLoading} style={{
              background:'var(--accent-soft)', border:'1px solid var(--border)', borderRadius:8,
              color:'var(--accent)', fontSize:12, padding:'7px 14px', cursor:'pointer',
              opacity: allAiLoading ? 0.6 : 1, flexShrink:0,
            }}>
              {allAiLoading ? rl('Анализ...','Analyzing...','Аналізую...') : allAiTip ? '↻' : 'AI ✦'}
            </button>
          </div>
          {allAiTip && (
            <div style={{ borderTop:'1px solid var(--border)', paddingTop:10 }}>
              <p style={{ fontSize:14, color:'var(--text2)', lineHeight:1.7, margin:0, fontFamily:'Cormorant Garamond, serif', fontStyle:'italic' }}>
                {allAiTip}
              </p>
              <p style={{ fontSize:10, color:'var(--text3)', marginTop:6, marginBottom:0 }}>
                ⚠️ {rl('Это рекомендация AI — обязательно уточни у врача','AI tip — always confirm with doctor','Рэкамендацыя AI — абавязкова ўдакладні ў ўрача')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Форма добавления/редактирования */}
      {form !== null && (
        <form onSubmit={handleSave} className="card" style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ fontSize:13, fontWeight:500 }}>
              {form?.id ? rl('Редактировать','Edit','Рэдагаваць') : rl('Новое лекарство','New medication','Новы прэпарат')}
            </div>
            <button type="button" onClick={closeForm} style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:20 }}>×</button>
          </div>

          <div>
            <div style={{ fontSize:11, color:'var(--text3)', marginBottom:5 }}>{rl('Название','Name','Назва')}</div>
            <div style={{ display:'flex', gap:8 }}>
              <input
                placeholder={rl('Фолиевая кислота','Folic acid','Фаліевая кіслата')}
                value={name} onChange={e => { setName(e.target.value); setAiTip(''); setAiConflicts('') }}
                style={{ flex:1 }} required
              />
              <button type="button" onClick={getAiTip} disabled={aiLoading || !name.trim()} style={{
                background:'var(--accent-soft)', border:'1px solid var(--border)', borderRadius:8,
                color:'var(--accent)', fontSize:12, padding:'0 14px', cursor:'pointer', flexShrink:0,
                opacity: name.trim() ? 1 : 0.4,
              }}>
                {aiLoading ? '⟳' : 'AI ✦'}
              </button>
            </div>
          </div>

          {aiTip && (
            <div style={{ background:'var(--bg3)', borderRadius:10, padding:'12px 14px', border:'1px solid var(--accent)33' }}>
              <div style={{ fontSize:11, color:'var(--accent)', marginBottom:6, fontWeight:500 }}>
                ✦ {rl('Рекомендация AI','AI tip','Рэкамендацыя AI')}
              </div>
              <p style={{ fontSize:14, color:'var(--text2)', lineHeight:1.6, margin:0, fontFamily:'Cormorant Garamond, serif', fontStyle:'italic' }}>
                {aiTip}
              </p>
              <p style={{ fontSize:10, color:'var(--text3)', marginTop:6, marginBottom:0 }}>
                ⚠️ {rl('Не заменяет назначение врача','Not a substitute for medical advice','Не замяняе прызначэнне ўрача')}
              </p>
            </div>
          )}

          {aiConflicts && (
            <div style={{ background:'rgba(248,113,113,0.1)', borderRadius:10, padding:'12px 14px', border:'1px solid rgba(248,113,113,0.3)' }}>
              <div style={{ fontSize:11, color:'#f87171', marginBottom:6, fontWeight:500 }}>
                ⚠️ {rl('Возможные взаимодействия','Possible interactions','Магчымыя ўзаемадзеянні')}
              </div>
              <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6, margin:0 }}>{aiConflicts}</p>
            </div>
          )}

          <div>
            <div style={{ fontSize:11, color:'var(--text3)', marginBottom:5 }}>
              {rl('Доза (необязательно)','Dosage (optional)','Доза (неабавязкова)')}
            </div>
            <input placeholder="500mg" value={dosage} onChange={e => setDosage(e.target.value)} />
          </div>

          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
              <div style={{ fontSize:11, color:'var(--text3)' }}>{rl('Время приёма','Time(s)','Час прыёму')}</div>
              <button type="button" onClick={addTimeSlot} style={{
                background:'none', border:'1px solid var(--border)', borderRadius:6,
                color:'var(--text2)', fontSize:11, padding:'3px 10px', cursor:'pointer',
              }}>
                + {rl('Ещё время','Add time','Яшчэ час')}
              </button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {times.map((t, i) => (
                <div key={i} style={{ display:'flex', gap:8, alignItems:'center' }}>
                  <input type="time" value={t} onChange={e => updateTime(i, e.target.value)} style={{ flex:1 }} />
                  {times.length > 1 && (
                    <button type="button" onClick={() => removeTimeSlot(i)} style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:20, padding:0, flexShrink:0 }}>×</button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ display:'flex', gap:8 }}>
            <button type="button" onClick={closeForm} className="btn btn-ghost" style={{ flex:1 }}>
              {rl('Отмена','Cancel','Адмена')}
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving || !name.trim()} style={{ flex:2 }}>
              {saving ? '...' : rl('Сохранить','Save','Захаваць')}
            </button>
          </div>
        </form>
      )}

      {meds.length === 0 && form === null && (
        <div style={{ textAlign:'center', color:'var(--text3)', fontSize:14, marginTop:40, lineHeight:2 }}>
          💊<br/>{rl('Таблетки не добавлены','No medications added','Таблеткі не дададзены')}
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {meds.map(med => (
          <div key={med.id} className="card" style={{ padding:'14px 16px' }}>
            <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
              <span style={{ fontSize:22, flexShrink:0 }}>💊</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, color:'var(--text)', fontWeight:500 }}>{med.name}</div>
                {med.dosage && <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>{med.dosage}</div>}
                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:6 }}>
                  {(med.times || []).map((t, i) => (
                    <span key={i} style={{ fontSize:11, padding:'2px 9px', borderRadius:20, background:'var(--bg3)', color:'var(--text2)', border:'1px solid var(--border)' }}>
                      🕐 {t}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                <button onClick={() => scheduleNotification(med)} title={rl('Напомнить','Remind','Нагадаць')} style={{ background:'none', border:'1px solid var(--border)', borderRadius:6, color:'var(--text2)', cursor:'pointer', fontSize:13, padding:'4px 8px' }}>🔔</button>
                <button onClick={() => openEdit(med)} title={rl('Редактировать','Edit','Рэдагаваць')} style={{ background:'none', border:'1px solid var(--border)', borderRadius:6, color:'var(--text2)', cursor:'pointer', fontSize:13, padding:'4px 8px' }}>✎</button>
                <button onClick={() => deleteMed(med.id)} style={{ background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:18, padding:'0 2px' }}>×</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
