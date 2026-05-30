import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang, useRl } from '../context/LangContext'
import { supabase } from '../lib/supabase'
import { pregnancyPlanningItems, loadPregnancyToggles, savePregnancyToggles } from '../lib/pregnancyPlanningUi'

const TIMELINE_OPTIONS = [
  { key:'now', emoji:'⚡', ru:'Уже сейчас', en:'Right now' },
  { key:'1_3m', emoji:'🌱', ru:'В течение 1-3 месяцев', en:'Within 1-3 months' },
  { key:'3_6m', emoji:'🌿', ru:'Через 3-6 месяцев', en:'In 3-6 months' },
  { key:'6_12m', emoji:'🌳', ru:'Через 6-12 месяцев', en:'In 6-12 months' },
  { key:'1y+', emoji:'🌲', ru:'Через год или позже', en:'A year or more' },
  { key:'unknown', emoji:'💭', ru:'Пока не знаю', en:"Don't know yet" },
]

const SUPPLEMENT_OPTIONS = [
  { key:'folic', ru:'Фолиевая кислота', en:'Folic acid' },
  { key:'prenatal', ru:'Пренатальные витамины', en:'Prenatal vitamins' },
  { key:'vitD', ru:'Витамин D', en:'Vitamin D' },
  { key:'iron', ru:'Железо', en:'Iron' },
  { key:'other', ru:'Другое', en:'Other' },
  { key:'none', ru:'Пока ничего', en:'Nothing yet' },
]

const ACTIVITY_OPTIONS = [
  { key:'none', ru:'Почти нет активности', en:'Almost no activity' },
  { key:'light', ru:'Лёгкая активность', en:'Light activity' },
  { key:'walks', ru:'Регулярные прогулки', en:'Regular walks' },
  { key:'sport_1', ru:'Спорт 1-2 раза в неделю', en:'Sport 1-2x/week' },
  { key:'sport_3', ru:'Спорт 3+ раза в неделю', en:'Sport 3+x/week' },
  { key:'intense', ru:'Интенсивные тренировки', en:'Intense training' },
]

function uniqById(rows) {
  const map = new Map()
  ;(rows || []).forEach(row => {
    if (row?.id && !map.has(row.id)) map.set(row.id, row)
  })
  return [...map.values()]
}

function safeReturn(value, fallback = '/profile') {
  return value && value.startsWith('/') ? value : fallback
}

export default function PregnancyPlanningSetup() {
  const { user, profile, updateProfile } = useAuth()
  const { lang } = useLang()
  const rl = useRl()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const returnTo = safeReturn(params.get('return'), '/profile')

  const [step, setStep] = useState(1)
  const [timeline, setTimeline] = useState('')
  const [whoCarries, setWhoCarries] = useState('me')
  const [needsDonor, setNeedsDonor] = useState(false)
  const [needsClinic, setNeedsClinic] = useState(false)
  const [hadDoctor, setHadDoctor] = useState(false)
  const [doctorNotes, setDoctorNotes] = useState('')
  const [supplements, setSupplements] = useState([])
  const [activityLevel, setActivityLevel] = useState('walks')
  const [circleContacts, setCircleContacts] = useState([])
  const [selectedPartner, setSelectedPartner] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')

  const totalSteps = 5
  const progress = (step / totalSteps) * 100

  useEffect(() => {
    let cancelled = false
    async function loadCircle() {
      if (!user?.id) return
      setLoadError('')
      const found = []

      try {
        const { data: friends, error: friendsError } = await supabase
          .from('friendships')
          .select('*, friend:friend_id(*)')
          .eq('owner_id', user.id)
        if (friendsError) throw friendsError
        ;(friends || []).forEach(row => {
          if (row.friend) found.push({ ...row.friend, relation_type: row.relation_type || 'friend' })
        })
      } catch (err) {
        console.warn('friends load failed', err)
      }

      try {
        const { data: ownedGroups } = await supabase
          .from('groups')
          .select('*, members:group_members(*, user:user_id(*))')
          .eq('owner_id', user.id)
        ;(ownedGroups || []).forEach(group => {
          ;(group.members || []).forEach(member => {
            if (member.user && member.user.id !== user.id) found.push(member.user)
          })
        })
      } catch (err) {
        console.warn('owned groups load failed', err)
      }

      try {
        const { data: memberships } = await supabase
          .from('group_members')
          .select('*, group:group_id(*, owner:owner_id(*), members:group_members(*, user:user_id(*)))')
          .eq('user_id', user.id)
        ;(memberships || []).forEach(member => {
          if (member.group?.owner && member.group.owner.id !== user.id) found.push(member.group.owner)
          ;(member.group?.members || []).forEach(gm => {
            if (gm.user && gm.user.id !== user.id) found.push(gm.user)
          })
        })
      } catch (err) {
        console.warn('member groups load failed', err)
      }

      if (!cancelled) {
        setCircleContacts(uniqById(found))
      }
    }
    loadCircle()
    return () => { cancelled = true }
  }, [user?.id])

  const previewItems = useMemo(() => pregnancyPlanningItems(profile, rl), [profile, lang])

  function toggleSupplement(key) {
    if (key === 'none') {
      setSupplements(prev => prev.includes('none') ? [] : ['none'])
      return
    }
    setSupplements(prev => {
      const clean = prev.filter(x => x !== 'none')
      return clean.includes(key) ? clean.filter(x => x !== key) : [...clean, key]
    })
  }

  function buildBaseTasks() {
    return pregnancyPlanningItems(profile, rl).map(item => ({
      title: item.title,
      category: item.area,
      priority: item.priority || 'normal',
      who: item.area === 'partner' ? 'partner' : 'me',
      source: 'app_general_recommendation',
      status: 'todo',
    }))
  }

  async function syncTasksOnce() {
    const tasks = buildBaseTasks()
    if (!tasks.length || !user?.id) return

    let existing = []
    try {
      const { data } = await supabase
        .from('pregnancy_tasks')
        .select('id,title,category,status')
        .eq('user_id', user.id)
      existing = data || []
    } catch (err) {
      console.warn('pregnancy tasks select failed', err)
    }

    const existingKeys = new Set(existing.map(t => `${t.title}::${t.category}`))
    const toInsert = tasks.filter(t => !existingKeys.has(`${t.title}::${t.category}`))
    if (toInsert.length) {
      try {
        await supabase.from('pregnancy_tasks').insert(toInsert.map(t => ({ ...t, user_id: user.id })))
      } catch (err) {
        console.warn('pregnancy tasks insert failed', err)
      }
    }
  }

  async function sendPartnerRequest() {
    if (!selectedPartner?.id || !user?.id) return null

    let reqData = null
    try {
      const { data: existing } = await supabase
        .from('pregnancy_partner_requests')
        .select('*')
        .eq('from_user_id', user.id)
        .eq('to_user_id', selectedPartner.id)
        .maybeSingle()

      if (existing?.id) {
        reqData = existing
        await supabase
          .from('pregnancy_partner_requests')
          .update({ status: existing.status === 'declined' ? 'pending' : existing.status, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
      } else {
        const { data } = await supabase.from('pregnancy_partner_requests').insert({
          from_user_id: user.id,
          to_user_id: selectedPartner.id,
          status: 'pending',
          message: 'Приглашение к совместной подготовке к беременности',
        }).select().single()
        reqData = data
      }
    } catch (err) {
      console.warn('partner request failed', err)
    }

    if (reqData?.id) {
      try {
        await supabase.from('pregnancy_planning_profiles').upsert({
          user_id: user.id,
          partner_request_id: reqData.id,
          partner_status: reqData.status || 'pending',
        }, { onConflict: 'user_id' })
      } catch (err) {
        console.warn('partner profile link failed', err)
      }

      try {
        const { data: me } = await supabase.from('profiles').select('name').eq('id', user.id).single()
        await supabase.from('app_notifications').insert({
          user_id: selectedPartner.id,
          type: 'pregnancy_task',
          title: `${me?.name || 'Кто-то'} приглашает к подготовке к беременности`,
          body: 'Нажми «Перейти», чтобы ответить на приглашение',
          emoji: '🌱',
          source_type: 'pregnancy',
          source_id: reqData.id,
          action_url: `/pregnancy-partner-response?request=${reqData.id}`,
          priority: 'high',
        })
      } catch (err) {
        console.warn('notification failed', err)
      }
    }

    return reqData
  }

  async function finish() {
    if (!user?.id) return
    setSaving(true)
    setLoadError('')

    try {
      await supabase.from('pregnancy_planning_profiles').upsert({
        user_id: user.id,
        timeline,
        who_carries: whoCarries,
        needs_donor: needsDonor,
        needs_clinic: needsClinic,
        had_doctor_consult: hadDoctor,
        doctor_notes: doctorNotes || null,
        current_supplements: supplements,
        current_activity_level: activityLevel,
        onboarding_done: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
    } catch (err) {
      console.warn('pregnancy planning profile save failed', err)
    }

    await updateProfile({
      body_mode: 'pregnancy_planning',
      active_conditions: (profile?.active_conditions || []).filter(key => key !== 'pregnancy_planning_marker' && key !== 'pregnancy_planning'),
      health: {
        ...(profile?.health || {}),
        preconception_partner_id: selectedPartner?.id || null,
        preconception_partner_name: selectedPartner?.name || null,
        preconception_partner_gender: selectedPartner?.gender || selectedPartner?.gender_identity || null,
      },
    })
    await sendPartnerRequest()
    await syncTasksOnce()

    const toggles = loadPregnancyToggles(user.id)
    const next = { ...toggles }
    buildBaseTasks().forEach(task => {
      const match = previewItems.find(item => item.title === task.title)
      if (match && !next[match.id]) next[match.id] = 'todo'
    })
    savePregnancyToggles(user.id, next)

    setSaving(false)
    navigate(returnTo)
  }

  const StepBtn = ({ label, active, onClick, sub }) => (
    <button type="button" onClick={onClick} style={{
      padding:'12px 14px', borderRadius:14, cursor:'pointer', textAlign:'left', width:'100%',
      border:`1.5px solid ${active?'var(--accent)':'var(--border)'}`,
      background:active?'var(--accent-soft)':'var(--bg2)',
      color:active?'var(--accent)':'var(--text)', fontSize:13, marginBottom:7,
      display:'flex', alignItems:'flex-start', gap:10,
    }}>
      <span style={{ width:18 }}>{active ? '✓' : '•'}</span>
      <span style={{ flex:1 }}>
        <span style={{ fontWeight:700 }}>{label}</span>
        {sub && <span style={{ display:'block', color:'var(--text3)', fontSize:11, marginTop:3, lineHeight:1.4 }}>{sub}</span>}
      </span>
    </button>
  )

  return (
    <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', padding:'20px 16px', gap:16, overflowY:'auto', maxWidth:520, margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <button type="button" onClick={() => step > 1 ? setStep(s => s - 1) : navigate(returnTo)} style={{ background:'none', border:'1px solid var(--border)', borderRadius:12, color:'var(--text2)', cursor:'pointer', fontSize:20, width:38, height:38 }}>‹</button>
        <div>
          <h2 style={{ fontSize:22, margin:0 }}>🕊 {rl('Подготовка к беременности','Pregnancy planning')}</h2>
          <div style={{ fontSize:11, color:'var(--text3)', marginTop:3 }}>{rl(`Шаг ${step} из ${totalSteps}`,`Step ${step} of ${totalSteps}`)}</div>
        </div>
      </div>

      <div style={{ height:5, background:'var(--bg3)', borderRadius:999 }}>
        <div style={{ height:'100%', width:`${progress}%`, background:'var(--accent)', borderRadius:999, transition:'width 0.3s' }} />
      </div>

      <div className="card" style={{ padding:'12px 14px', borderColor:'rgba(134,239,172,0.28)', background:'rgba(34,197,94,0.08)', fontSize:12, color:'var(--text2)', lineHeight:1.55 }}>
        ℹ️ {rl('Elara даёт общую схему подготовки. Препараты, витамины, спорт и анализы - только после консультации с врачом.', 'Elara gives a general planning framework. Meds, vitamins, activity and tests - only after consulting a clinician.')}
      </div>

      {loadError && <div className="card" style={{ padding:12, color:'#fca5a5', fontSize:12 }}>{loadError}</div>}

      {step === 1 && (
        <div>
          <h3 style={{ fontSize:17, margin:'0 0 12px' }}>{rl('Через сколько планируется беременность?','When are you planning pregnancy?')}</h3>
          {TIMELINE_OPTIONS.map(o => <StepBtn key={o.key} label={`${o.emoji} ${lang === 'en' ? o.en : o.ru}`} active={timeline === o.key} onClick={() => setTimeline(o.key)} />)}
          <button type="button" onClick={() => timeline && setStep(2)} disabled={!timeline} className="btn btn-primary" style={{ marginTop:8 }}>{rl('Далее','Next')} →</button>
        </div>
      )}

      {step === 2 && (
        <div>
          <h3 style={{ fontSize:17, margin:'0 0 12px' }}>{rl('Сценарий беременности','Pregnancy scenario')}</h3>
          {[{k:'me',ru:'Я планирую вынашивать',en:'I plan to carry'},{k:'partner',ru:'Партнёр планирует вынашивать',en:'Partner plans to carry'},{k:'surrogate',ru:'Суррогатная программа',en:'Surrogacy'},{k:'unknown',ru:'Пока не решили',en:'Not decided yet'}].map(o => <StepBtn key={o.k} label={lang === 'en' ? o.en : o.ru} active={whoCarries === o.k} onClick={() => setWhoCarries(o.k)} />)}

          <div style={{ display:'grid', gap:8, margin:'12px 0' }}>
            <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'var(--text2)' }}><input type="checkbox" checked={needsDonor} onChange={e => setNeedsDonor(e.target.checked)} /> {rl('Может понадобиться донор','Donor may be needed')}</label>
            <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'var(--text2)' }}><input type="checkbox" checked={needsClinic} onChange={e => setNeedsClinic(e.target.checked)} /> {rl('Планируется клиника / репродуктолог','Clinic / fertility specialist planned')}</label>
          </div>

          <div className="card" style={{ padding:12, marginBottom:12 }}>
            <div style={{ fontSize:13, fontWeight:800, marginBottom:8 }}>{rl('Партнёр из круга','Partner from Circle')}</div>
            {circleContacts.length ? (
              <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
                {circleContacts.map(c => (
                  <button key={c.id} type="button" onClick={() => setSelectedPartner(selectedPartner?.id === c.id ? null : c)} style={{
                    padding:'10px 12px', borderRadius:12, cursor:'pointer', textAlign:'left',
                    border:`1px solid ${selectedPartner?.id === c.id ? 'var(--accent)' : 'var(--border)'}`,
                    background:selectedPartner?.id === c.id ? 'var(--accent-soft)' : 'var(--bg2)', color:'var(--text)',
                    display:'flex', alignItems:'center', gap:10,
                  }}>
                    <span style={{ width:28, height:28, borderRadius:'50%', background:c.avatar_color || 'var(--accent)', display:'inline-flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:900 }}>{c.name?.[0]?.toUpperCase() || '?'}</span>
                    <span style={{ flex:1 }}>{c.name || rl('Без имени','No name')}</span>
                    {selectedPartner?.id === c.id && <span>✓</span>}
                  </button>
                ))}
              </div>
            ) : (
              <p style={{ margin:0, fontSize:12, color:'var(--text3)', lineHeight:1.5 }}>{rl('В круге пока нет подходящих людей. Можно продолжить индивидуально и добавить партнёра позже.', 'No Circle contacts yet. Continue individually and add partner later.')}</p>
            )}
          </div>

          <button type="button" onClick={() => setStep(3)} className="btn btn-primary">{rl('Далее','Next')} →</button>
        </div>
      )}

      {step === 3 && (
        <div>
          <h3 style={{ fontSize:17, margin:'0 0 12px' }}>{rl('Врач и рекомендации','Doctor and recommendations')}</h3>
          <StepBtn label={rl('Уже была консультация врача','I already consulted a doctor')} active={hadDoctor} onClick={() => setHadDoctor(true)} />
          <StepBtn label={rl('Пока не была / не был','Not yet')} active={!hadDoctor} onClick={() => setHadDoctor(false)} />
          <textarea placeholder={rl('Если есть рекомендации врача, вставь сюда или загрузи заключение позже в здоровье...', 'If you have doctor recommendations, paste them here or upload later in Health...')} value={doctorNotes} onChange={e => setDoctorNotes(e.target.value)} style={{ minHeight:110, marginTop:8 }} />
          <button type="button" onClick={() => setStep(4)} className="btn btn-primary" style={{ marginTop:10 }}>{rl('Далее','Next')} →</button>
        </div>
      )}

      {step === 4 && (
        <div>
          <h3 style={{ fontSize:17, margin:'0 0 12px' }}>{rl('Препараты, витамины и спорт','Meds, vitamins and activity')}</h3>
          <div style={{ marginBottom:12 }}>
            <div style={{ fontSize:13, fontWeight:800, marginBottom:8 }}>{rl('Что уже принимаешь?','What are you taking?')}</div>
            {SUPPLEMENT_OPTIONS.map(o => <StepBtn key={o.key} label={lang === 'en' ? o.en : o.ru} active={supplements.includes(o.key)} onClick={() => toggleSupplement(o.key)} />)}
          </div>
          <div>
            <div style={{ fontSize:13, fontWeight:800, marginBottom:8 }}>{rl('Текущая активность','Current activity')}</div>
            {ACTIVITY_OPTIONS.map(o => <StepBtn key={o.key} label={lang === 'en' ? o.en : o.ru} active={activityLevel === o.key} onClick={() => setActivityLevel(o.key)} />)}
          </div>
          <button type="button" onClick={() => setStep(5)} className="btn btn-primary" style={{ marginTop:10 }}>{rl('Далее','Next')} →</button>
        </div>
      )}

      {step === 5 && (
        <div>
          <h3 style={{ fontSize:17, margin:'0 0 12px' }}>{rl('Что появится в приложении','What will appear in the app')}</h3>
          <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:14 }}>
            {previewItems.slice(0, 6).map(item => (
              <div key={item.id} className="card" style={{ padding:12, borderColor:'rgba(134,239,172,0.22)' }}>
                <div style={{ display:'flex', gap:10 }}>
                  <span style={{ fontSize:22 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize:14, fontWeight:850 }}>{item.title}</div>
                    <p style={{ margin:'4px 0 0', fontSize:12, color:'var(--text3)', lineHeight:1.45 }}>{item.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={finish} disabled={saving} className="btn btn-primary">{saving ? '...' : rl('Сохранить подготовку','Save planning')}</button>
          <button type="button" onClick={() => navigate(returnTo)} className="btn btn-ghost" style={{ marginTop:8 }}>{rl('Позже','Later')}</button>
        </div>
      )}
    </div>
  )
}
