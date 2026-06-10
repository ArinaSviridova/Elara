import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Notifs } from '../lib/useNotifications'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { PLAN_TYPES, groupScoreForDate, adviceForScore, labelForStatus, rankedPlansForStates } from '../lib/socialPlanning'
import {
  CircleMonthCalendar,
  PrettyButton,
  addMonths,
  canSeeCycle,
  loadOwnerDays,
  monthGridDates,
  monthTitle,
  normalizePermission,
  todayKey,
} from '../lib/circleCalendar'

function Flag({ ok, text }) {
  return <div style={{ padding:'8px 10px', borderRadius:12, background: ok ? 'rgba(74,222,128,0.10)' : 'rgba(255,255,255,0.04)', border:`1px solid ${ok ? 'rgba(74,222,128,0.22)' : 'rgba(255,255,255,0.08)'}`, fontSize:11, color: ok ? '#86efac' : 'var(--text3)' }}>{ok ? '✓' : '·'} {text}</div>
}

function chipStyle(active) {
  return { padding:'8px 12px', borderRadius:999, fontSize:12, cursor:'pointer', border:`1px solid ${active ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.10)'}`, background:active ? 'linear-gradient(135deg, var(--accent-soft), rgba(255,255,255,0.08))' : 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))', color:active ? 'var(--accent)' : 'var(--text2)' }
}

function shortHumanDate(dateKey, lang) {
  return new Date(dateKey + 'T00:00:00').toLocaleDateString(lang === 'en' ? 'en-US' : 'ru-RU', { weekday:'long', day:'numeric', month:'long' })
}

function isPregnancyPrepContext(profile = {}, person = {}) {
  const ownConditions = Array.isArray(profile?.active_conditions) ? profile.active_conditions : []
  const personConditions = Array.isArray(person?.active_conditions) ? person.active_conditions : []
  const ownPlanning = profile?.body_mode === 'pregnancy_planning'
    || profile?.body_mode === 'pregnancy'
    || ownConditions.includes('pregnancy_planning_marker')
  const personPlanning = person?.body_mode === 'pregnancy_planning'
    || person?.body_mode === 'pregnancy'
    || personConditions.includes('pregnancy_planning_marker')

  const linkedByMe = profile?.health?.preconception_partner_id
    && String(profile.health.preconception_partner_id) === String(person?.id)
  const linkedByPerson = person?.health?.preconception_partner_id
    && String(person.health.preconception_partner_id) === String(profile?.id)

  return Boolean((ownPlanning && linkedByMe) || (personPlanning && linkedByPerson))
}

function reproductiveRole(profile = {}) {
  const gender = profile?.gender || profile?.gender_identity || 'prefer_not'
  const bodyMode = profile?.body_mode || 'prefer_not'
  const conditions = Array.isArray(profile?.active_conditions) ? profile.active_conditions : []
  const hasCycle = ['menstruating', 'pregnancy_planning'].includes(bodyMode) || conditions.includes('pregnancy_planning_marker')
  if (bodyMode === 'pregnancy') return 'pregnant'
  if (['cis_man', 'male', 'man'].includes(gender)) return 'sperm'
  if (['trans_woman'].includes(gender)) return hasCycle ? 'cycle' : 'sperm_possible'
  if (['cis_woman', 'female', 'woman', 'trans_man', 'non_binary', 'genderfluid'].includes(gender) || hasCycle) return 'cycle'
  return 'neutral'
}

function prepCardsForPair({ self, partner, rl }) {
  const selfRole = reproductiveRole(self)
  const partnerRole = reproductiveRole(partner)
  const cards = []
  const hasCycleSide = selfRole === 'cycle' || partnerRole === 'cycle' || selfRole === 'pregnant' || partnerRole === 'pregnant'
  const hasSpermSide = selfRole === 'sperm' || partnerRole === 'sperm' || selfRole === 'sperm_possible' || partnerRole === 'sperm_possible'

  if (hasCycleSide) {
    cards.push({ icon:'🩸', title:rl('Цикл и фертильное окно', 'Cycle and fertile window'), text:rl('Сверяем овуляцию, ПМС, месячные и дни, когда лучше не перегружаться.', 'Check ovulation, PMS, periods, and days to avoid overload.') })
    cards.push({ icon:'🕊', title:rl('План до беременности', 'Pre-pregnancy plan'), text:rl('Фолиевая кислота, чекапы, лекарства, прививки и вопросы врачу до попыток.', 'Folic acid, checkups, meds, vaccines, and doctor questions before trying.') })
  }

  if (hasSpermSide) {
    cards.push({ icon:'🧪', title:rl('Подготовка партнёра со сперматозоидами', 'Sperm-side preparation'), text:rl('ИППП-скрининг, прививки, лекарства, температура/баня, алкоголь/никотин и спермограмма по показаниям.', 'STI screening, vaccines, meds, heat exposure, alcohol/nicotine, and semen analysis when indicated.') })
  }

  if (!hasSpermSide && !hasCycleSide) {
    cards.push({ icon:'🤝', title:rl('Индивидуальный план', 'Individual plan'), text:rl('Пока роль партнёра не ясна, держим нейтральный список: чекапы, ИППП, прививки, лекарства и консультация.', 'When roles are unclear, keep a neutral list: checkups, STIs, vaccines, meds, and a consultation.') })
  }

  cards.push({ icon:'👥', title:rl('Что делаем вместе', 'What we do together'), text:rl('Согласуем дату, задачи, границы доступа и то, какие напоминания нужны обоим.', 'Align timing, tasks, access boundaries, and reminders for both people.') })
  return cards
}

async function sendActivityProposal({ fromUserId, fromName, recipientId, date, activityText, planLabel, lang }) {
  const clean = (activityText || planLabel || '').trim()
  if (!clean || !recipientId) return false
  const readableDate = new Date(date + 'T00:00:00').toLocaleDateString(lang === 'en' ? 'en-US' : 'ru-RU', { day:'numeric', month:'long' })
  const message = lang === 'en'
    ? `${fromName || 'Someone'} suggests “${clean}” on ${readableDate}`
    : `${fromName || 'Кто-то'} предлагает: “${clean}” ${readableDate}`

  const { data: invite } = await supabase.from('push_invites').insert({
    from_user_id: fromUserId,
    to_user_id: recipientId,
    activity_type: message,
    dice_result: null,
    status: 'pending',
    created_at: new Date().toISOString(),
  }).select('id').single()

  try {
    await supabase.functions.invoke('ai-advisor', {
      body: { requestType:'activity_invite', userId:fromUserId, targetUserIds:[recipientId], date, activityType:clean, note:message, language:lang }
    })
    // Создаём in-app уведомление и системный Web Push, если получатель разрешил push в PWA
    const { data: sender } = await supabase.from('profiles').select('name').eq('id', fromUserId).single()
    const senderName = sender?.name || 'Кто-то'
    await Notifs.activityInvite(recipientId, senderName, clean, invite?.id || null, `/sync?person=${recipientId}&date=${date}`)
  } catch {}
  return true
}

export default function PersonProfilePage() {
  const { id } = useParams()
  const { user, profile } = useAuth()
  const { lang } = useLang()
  const navigate = useNavigate()
  const rl = (ru, en) => lang === 'en' ? en : ru

  const [person, setPerson] = useState(null)
  const [relation, setRelation] = useState(null)
  const [permission, setPermission] = useState(null)
  const [daily, setDaily] = useState({})
  const [myDaily, setMyDaily] = useState({})
  const [planType, setPlanType] = useState('cafe')
  const [selectedDate, setSelectedDate] = useState(todayKey())
  const [customText, setCustomText] = useState('')
  const [myWishes, setMyWishes] = useState([])
  const [showWishPicker, setShowWishPicker] = useState(false)
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [monthDate, setMonthDate] = useState(() => {
    const d = new Date()
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [loading, setLoading] = useState(true)

  const dates = useMemo(() => monthGridDates(monthDate), [monthDate])

  useEffect(() => { loadProfile() }, [id, user?.id])

  useEffect(() => {
    if (!user?.id) return
    supabase.from('activity_wishes').select('*')
      .eq('user_id', user.id).eq('is_done', false)
      .order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => setMyWishes(data || []))
  }, [user?.id])
  useEffect(() => { if (person && permission) loadCalendar() }, [monthDate, person?.id, permission?.can_view_calendar, permission?.can_view_mood, permission?.can_view_period_days, permission?.can_view_cycle_summary])

  async function loadProfile() {
    if (!user?.id || !id) return
    setLoading(true)
    const [{ data: profileData }, { data: friendshipData }, { data: permissionData, error: permissionError }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
      supabase.from('friendships').select('*').eq('owner_id', user.id).eq('friend_id', id).maybeSingle(),
      supabase.from('sharing_permissions').select('*').eq('owner_id', id).eq('viewer_id', user.id).maybeSingle(),
    ])
    setPerson(profileData)
    setRelation(friendshipData)
    const perm = normalizePermission(permissionError ? null : permissionData, friendshipData?.relation_type)
    if (!permissionData && friendshipData?.is_visible) perm.can_view_calendar = true
    setPermission(perm)
    setLoading(false)
  }

  async function loadCalendar() {
    const currentDates = monthGridDates(monthDate)
    const [mine, theirs] = await Promise.all([
      loadOwnerDays({ ownerId:user.id, dates:currentDates, permissions:{ can_view_calendar:true, can_view_mood:true, can_view_sport:true, can_view_period_days:true, can_view_cycle_summary:true }, isSelf:true }),
      loadOwnerDays({ ownerId:id, dates:currentDates, permissions:permission || {} }),
    ])
    setMyDaily(mine)
    setDaily(theirs)
  }

  const selectedStates = [myDaily[selectedDate], daily[selectedDate]].filter(Boolean)
  const currentScore = groupScoreForDate(selectedStates, planType)
  const currentPlan = PLAN_TYPES.find(p => p.key === planType) || PLAN_TYPES[0]
  const ranked = rankedPlansForStates(selectedStates, lang).slice(0, 4)
  const today = todayKey()
  const todayScore = groupScoreForDate([myDaily[today], daily[today]].filter(Boolean), planType)
  const rows = dates.map(date => ({ date, score:groupScoreForDate([myDaily[date], daily[date]].filter(Boolean), planType) }))
  const best = rows.filter(r => r.date >= today && r.score.level !== 'bad').sort((a,b) => b.score.score - a.score.score).slice(0, 4)

  async function submitProposal() {
    const text = customText.trim() || (lang === 'en' ? currentPlan.en : currentPlan.ru)
    if (!text) return
    setSending(true)
    await sendActivityProposal({ fromUserId:user.id, fromName:profile?.name, recipientId:id, date:selectedDate, activityText:text, planLabel:lang === 'en' ? currentPlan.en : currentPlan.ru, lang })
    setSending(false)
    setSent(true)
    setTimeout(() => setSent(false), 2500)
  }

  if (loading) return <div style={{ padding:30, color:'var(--text3)', textAlign:'center' }}>⟳</div>
  if (!person) return <div style={{ padding:30, color:'var(--text3)' }}>{rl('Профиль не найден','Profile not found')}</div>

  const relationText = relation?.relation_type === 'partner' ? rl('Партнёр','Partner') : relation?.relation_type === 'family' ? rl('Семья','Family') : relation?.relation_type === 'support' ? rl('Поддержка','Support') : rl('Друг / подруга','Friend')
  const prepActive = isPregnancyPrepContext(profile, person)
  const prepCards = prepActive ? prepCardsForPair({ self:profile, partner:person, rl }) : []

  return (
    <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', padding:'20px 16px', gap:14, overflowY:'auto' }}>
      <button type="button" onClick={() => navigate('/friends')} style={{ background:'none', border:'none', color:'var(--text2)', cursor:'pointer', fontSize:13, display:'flex', alignItems:'center', gap:6, padding:0 }}>‹ {rl('Назад в круг','Back to circle')}</button>

      <div className="card" style={{ padding:'16px', display:'flex', alignItems:'center', gap:14 }}>
        <div style={{ width:56, height:56, borderRadius:'50%', background:person.avatar_color || 'var(--accent-soft)', display:'flex', alignItems:'center', justifyContent:'center', color:'#0a0a0a', fontSize:22, fontWeight:800 }}>{person.name?.[0]?.toUpperCase() || '?'}</div>
        <div style={{ flex:1 }}>
          <h2 style={{ fontSize:25, margin:0 }}>{person.name}</h2>
          <div style={{ fontSize:12, color:'var(--text3)', marginTop:4 }}>{relationText}</div>
        </div>
        <PrettyButton type="button" onClick={() => navigate(`/sync?person=${person.id}`)} style={{ padding:'9px 12px' }}>📅 {rl('Календарь','Calendar')}</PrettyButton>
      </div>

      <div className="card" style={{ padding:'14px' }}>
        <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>{rl('Открыто тебе','Shared with you')}</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <Flag ok={canSeeCycle(permission)} text={rl('Цикл и фазы','Cycle phases')} />
          <Flag ok={permission?.can_view_mood || permission?.can_view_calendar} text={rl('Настроение','Mood')} />
          <Flag ok={permission?.can_view_sport || permission?.can_view_calendar} text={rl('Активность','Activity')} />
          <Flag ok={permission?.can_view_status} text={rl('Общий статус','General status')} />
        </div>
      </div>

      {prepActive && (
        <div className="card" style={{ padding:'15px', border:'1px solid rgba(134,239,172,0.28)', background:'linear-gradient(135deg, rgba(74,222,128,0.10), rgba(255,255,255,0.025))' }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:10, marginBottom:12 }}>
            <div style={{ fontSize:26 }}>🕊</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:16, fontWeight:800, color:'var(--text)' }}>{rl('Совместная подготовка к беременности', 'Joint pregnancy preparation')}</div>
              <div style={{ fontSize:12, color:'var(--text2)', lineHeight:1.45, marginTop:4 }}>
                {rl('Карточки зависят от пола, режима тела и того, что человек открыл тебе в доступ. Не гадание на гормонах, а хоть какая-то навигация в хаосе.', 'Cards depend on gender, body mode, and shared access. Not hormone fortune-telling, just sane navigation through chaos.')}
              </div>
            </div>
          </div>
          <div style={{ display:'grid', gap:8 }}>
            {prepCards.map(card => (
              <div key={card.title} style={{ padding:'11px 12px', borderRadius:14, border:'1px solid rgba(255,255,255,0.10)', background:'rgba(0,0,0,0.16)', display:'flex', gap:10, alignItems:'flex-start' }}>
                <span style={{ fontSize:20 }}>{card.icon}</span>
                <span style={{ flex:1 }}>
                  <span style={{ display:'block', fontSize:13, fontWeight:750, color:'var(--text)' }}>{card.title}</span>
                  <span style={{ display:'block', fontSize:12, color:'var(--text2)', lineHeight:1.45, marginTop:3 }}>{card.text}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card" style={{ padding:'14px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, marginBottom:12 }}>
          <PrettyButton type="button" onClick={() => setMonthDate(addMonths(monthDate, -1))}>‹</PrettyButton>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontSize:20, color:'var(--text)', fontWeight:700 }}>{monthTitle(monthDate, lang)}</div>
            <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>{rl('Нажми на день, чтобы подобрать досуг', 'Tap a day to choose a plan')}</div>
          </div>
          <PrettyButton type="button" onClick={() => setMonthDate(addMonths(monthDate, 1))}>›</PrettyButton>
        </div>
        <CircleMonthCalendar monthDate={monthDate} daily={daily} mode="person" lang={lang} selectedDate={selectedDate} onDayClick={setSelectedDate} showBestPlan />
      </div>

      <div className="card" style={{ padding:'14px', border:'1px solid rgba(255,255,255,0.14)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', gap:10, alignItems:'flex-start', marginBottom:10 }}>
          <div>
            <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em' }}>{rl('Выбранный день','Selected day')}</div>
            <div style={{ fontSize:18, color:'var(--text)', fontWeight:700, marginTop:2 }}>{shortHumanDate(selectedDate, lang)}</div>
          </div>
          <div style={{ padding:'8px 10px', borderRadius:14, background:'rgba(74,222,128,0.10)', border:'1px solid rgba(74,222,128,0.25)', color:'#86efac', fontSize:13, fontWeight:700 }}>{currentScore.score}%</div>
        </div>
        <div style={{ fontSize:12, color:'var(--text2)', lineHeight:1.5, marginBottom:12 }}>
          {permission?.can_view_calendar || canSeeCycle(permission) ? labelForStatus(daily[selectedDate]?.status, lang) : rl('Подробный календарь не открыт.', 'Detailed calendar is not shared.')} · {adviceForScore(currentScore, planType, lang)}
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:12 }}>
          {ranked.map(({ plan, scoreInfo }, idx) => (
            <button key={plan.key} type="button" onClick={() => setPlanType(plan.key)} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:14, cursor:'pointer', textAlign:'left', border:`1px solid ${planType === plan.key ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.10)'}`, background:planType === plan.key ? 'linear-gradient(135deg, var(--accent-soft), rgba(255,255,255,0.07))' : 'rgba(255,255,255,0.035)', color:'var(--text)' }}>
              <span style={{ fontSize:20 }}>{plan.emoji}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700 }}>{idx === 0 ? rl('Лучше всего: ', 'Best: ') : ''}{lang === 'en' ? plan.en : plan.ru}</div>
                <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>{adviceForScore(scoreInfo, plan.key, lang)}</div>
              </div>
              <span style={{ fontSize:12, color:scoreInfo.score >= 72 ? '#86efac' : 'var(--text3)' }}>{scoreInfo.score}%</span>
            </button>
          ))}
        </div>
        <div style={{ display:'grid', gap:8 }}>
          <input value={customText} onChange={e => setCustomText(e.target.value)} placeholder={rl('Например: Го посидим у Кати', 'Example: Let’s hang at Kate’s')} style={{ borderRadius:14, padding:'12px 13px', background:'var(--bg2)', border:'1px solid var(--border)', color:'var(--text)', fontSize:13 }} />

          {/* Из моего списка активностей */}
          {myWishes.length > 0 && (
            <div>
              <button type="button" onClick={() => setShowWishPicker(p=>!p)} style={{
                width:'100%', padding:'9px 12px', borderRadius:12, cursor:'pointer', fontSize:12,
                border:`1px solid ${showWishPicker?'var(--accent)':'rgba(255,255,255,0.1)'}`,
                background:showWishPicker?'var(--accent-soft)':'rgba(255,255,255,0.04)',
                color:showWishPicker?'var(--accent)':'var(--text3)',
                display:'flex', alignItems:'center', justifyContent:'space-between',
              }}>
                <span>✨ {rl('Из моего списка','From my list')} ({myWishes.length})</span>
                <span style={{ fontSize:10 }}>{showWishPicker?'▲':'▼'}</span>
              </button>
              {showWishPicker && (
                <div style={{ marginTop:4, maxHeight:200, overflowY:'auto', display:'flex', flexDirection:'column', gap:4,
                  background:'rgba(255,255,255,0.04)', borderRadius:10, padding:'6px' }}>
                  {myWishes.map(w => {
                    const icons = {movie_night:'🎬',cafe:'☕',spa:'🛁',walk:'🚶',sport:'🏃',party:'🎉',trip:'✈️',event:'🎭',custom:'✨'}
                    const active = customText === w.title
                    return (
                      <button key={w.id} type="button" onClick={() => { setCustomText(w.title); setShowWishPicker(false) }}
                        style={{ padding:'8px 12px', borderRadius:8, cursor:'pointer', textAlign:'left',
                          border:`1px solid ${active?'var(--accent)':'rgba(255,255,255,0.08)'}`,
                          background:active?'var(--accent-soft)':'transparent',
                          display:'flex', alignItems:'center', gap:8 }}>
                        <span>{icons[w.activity_type]||'✨'}</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{w.title}</div>
                          {w.location && <div style={{ fontSize:10, color:'var(--text3)' }}>📍 {w.location}</div>}
                        </div>
                        {active && <span style={{ color:'var(--accent)', fontSize:12 }}>✓</span>}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <PrettyButton type="button" onClick={submitProposal} disabled={sending} variant="primary">{sending ? '⟳' : sent ? '✓' : '✉️'} {sent ? rl('Отправлено','Sent') : rl('Предложить','Suggest')}</PrettyButton>
        </div>
      </div>

      <div className="card" style={{ padding:'14px' }}>
        <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>{rl('Ближайшие хорошие дни','Closest good days')}</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {best.map(row => (
            <button key={row.date} type="button" onClick={() => setSelectedDate(row.date)} style={{ padding:'10px 12px', borderRadius:12, background:'rgba(74,222,128,0.10)', border:'1px solid rgba(74,222,128,0.25)', textAlign:'left', cursor:'pointer' }}>
              <div style={{ display:'flex', justifyContent:'space-between', gap:10 }}>
                <strong style={{ fontSize:13, color:'var(--text)' }}>{shortHumanDate(row.date, lang)}</strong>
                <span style={{ fontSize:12, color:'#4ade80' }}>{row.score.score}%</span>
              </div>
              <div style={{ fontSize:12, color:'var(--text2)', marginTop:4 }}>{adviceForScore(row.score, planType, lang)}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
