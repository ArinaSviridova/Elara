import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Notifs } from '../lib/useNotifications'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import {
  PLAN_TYPES,
  groupScoreForDate,
  adviceForScore,
  getDayState,
  labelForStatus,
  rankedPlansForStates,
  groupCompositionText,
} from '../lib/socialPlanning'
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

const REL_LABELS = {
  friend: ['Друг / подруга', 'Friend'],
  partner: ['Партнёр', 'Partner'],
  family: ['Семья', 'Family'],
  support: ['Поддержка', 'Support'],
}

function chipStyle(active) {
  return {
    padding:'9px 13px', borderRadius:999, fontSize:12, cursor:'pointer',
    border:`1px solid ${active ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.10)'}`,
    background:active ? 'linear-gradient(135deg, var(--accent-soft), rgba(255,255,255,0.08))' : 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
    color:active ? 'var(--accent)' : 'var(--text2)',
    boxShadow:active ? '0 10px 26px rgba(0,0,0,0.22)' : 'none',
  }
}

function shortHumanDate(dateKey, lang) {
  return new Date(dateKey + 'T00:00:00').toLocaleDateString(lang === 'en' ? 'en-US' : 'ru-RU', { weekday:'long', day:'numeric', month:'long' })
}

async function sendActivityProposal({ fromUserId, fromName, recipients, date, activityText, planLabel, lang }) {
  const clean = (activityText || planLabel || '').trim()
  if (!clean || !recipients.length) return false
  const readableDate = new Date(date + 'T00:00:00').toLocaleDateString(lang === 'en' ? 'en-US' : 'ru-RU', { day:'numeric', month:'long' })
  const message = lang === 'en'
    ? `${fromName || 'Someone'} suggests “${clean}” on ${readableDate}`
    : `${fromName || 'Кто-то'} предлагает: “${clean}” ${readableDate}`

  await Promise.all(recipients.map(id => supabase.from('push_invites').insert({
    from_user_id: fromUserId,
    to_user_id: id,
    activity_type: message,
    dice_result: null,
    status: 'pending',
    created_at: new Date().toISOString(),
  }).then(() => true).catch(() => false)))

  try {
    await supabase.functions.invoke('ai-advisor', {
      body: {
        requestType: 'activity_invite',
        userId: fromUserId,
        targetUserIds: recipients,
        date,
        activityType: clean,
        note: message,
        language: lang,
      }
    })
  } catch {}
  // Создаём уведомления для каждого получателя
  try {
    const { data: sender } = await supabase.from('profiles').select('name').eq('id', fromUserId).single()
    const senderName = sender?.name || 'Кто-то'
    await Promise.all(recipients.map(rid =>
      Notifs.activityInvite(rid, senderName, clean, null)
    ))
  } catch {}
  return true
}

function DayPlannerPanel({ date, states, selectedContacts, myState, planType, setPlanType, lang, rl, user, profile }) {
  const [customText, setCustomText] = useState('')
  const [movieMode, setMovieMode] = useState('any')
  const [myWishes, setMyWishes] = useState([])
  const [showWishPicker, setShowWishPicker] = useState(false)
  const [showMovieAsk, setShowMovieAsk] = useState(false)
  const [showMovieRecs, setShowMovieRecs] = useState(false)
  const [movieRecs, setMovieRecs] = useState([])
  const [loadingMovies, setLoadingMovies] = useState(false)
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const ranked = rankedPlansForStates(states, lang).slice(0, 4)

  useEffect(() => {
    if (!user?.id) return
    supabase.from('activity_wishes')
      .select('*').eq('user_id', user.id).eq('is_done', false)
      .order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => setMyWishes(data || []))
  }, [user?.id])
  const current = groupScoreForDate(states, planType)
  const currentPlan = PLAN_TYPES.find(p => p.key === planType) || PLAN_TYPES[0]
  const recipients = selectedContacts.map(c => c.user_id)
  const composition = groupCompositionText(current.stats, lang)

  async function submit() {
    const text = customText.trim() || (lang === 'en' ? currentPlan.en : currentPlan.ru)
    if (!text || !recipients.length) return
    setSending(true)
    await sendActivityProposal({
      fromUserId:user.id,
      fromName:profile?.name,
      recipients,
      date,
      activityText:text,
      planLabel:lang === 'en' ? currentPlan.en : currentPlan.ru,
      lang,
    })
    setSending(false)
    setSent(true)
    setTimeout(() => setSent(false), 2500)
  }

  return (
    <div className="card" style={{ padding:'14px', border:'1px solid rgba(255,255,255,0.14)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:10, marginBottom:10 }}>
        <div>
          <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em' }}>{rl('Выбранный день','Selected day')}</div>
          <div style={{ fontSize:18, color:'var(--text)', fontWeight:700, marginTop:2 }}>{shortHumanDate(date, lang)}</div>
        </div>
        <div style={{ padding:'8px 10px', borderRadius:14, background:'rgba(74,222,128,0.10)', border:'1px solid rgba(74,222,128,0.25)', color:'#86efac', fontSize:13, fontWeight:700 }}>{current.score}%</div>
      </div>

      <div style={{ fontSize:12, color:'var(--text2)', lineHeight:1.5, marginBottom:12 }}>
        {composition}. {adviceForScore(current, planType, lang)}
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:12 }}>
        {ranked.map(({ plan, scoreInfo }, idx) => (
          <button key={plan.key} type="button" onClick={() => setPlanType(plan.key)} style={{
            display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:14, cursor:'pointer', textAlign:'left',
            border:`1px solid ${planType === plan.key ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.10)'}`,
            background:planType === plan.key ? 'linear-gradient(135deg, var(--accent-soft), rgba(255,255,255,0.07))' : 'rgba(255,255,255,0.035)',
            color:'var(--text)',
          }}>
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
        <input
          value={customText}
          onChange={e => setCustomText(e.target.value)}
          placeholder={rl('Например: Го посидим у Кати', 'E.g. hang out together')}
          style={{ borderRadius:14, padding:'12px 13px', background:'var(--bg2)', border:'1px solid var(--border)', color:'var(--text)', fontSize:13 }}
        />
        
        {/* Кнопка "Из моего списка" */}
        {myWishes.length > 0 && (
          <div>
            <button onClick={() => setShowWishPicker(p => !p)} style={{
              width:'100%', padding:'10px 14px', borderRadius:12, cursor:'pointer',
              border:`1px solid ${showWishPicker?'var(--accent)':'var(--border)'}`,
              background:showWishPicker?'var(--accent-soft)':'var(--bg2)',
              color:showWishPicker?'var(--accent)':'var(--text2)',
              display:'flex', alignItems:'center', justifyContent:'space-between', fontSize:13,
            }}>
              <span>✨ {rl('Из моего списка','From my wishlist')} ({myWishes.length})</span>
              <span style={{ fontSize:11 }}>{showWishPicker?'▲':'▼'}</span>
            </button>

            {showWishPicker && (
              <div style={{ marginTop:6, display:'flex', flexDirection:'column', gap:5, maxHeight:280, overflowY:'auto',
                padding:'8px', background:'var(--bg2)', borderRadius:10, border:'1px solid var(--border)' }}>
                {myWishes.map(w => {
                  const typeEmoji = {
                    movie_night:'🎬', cafe:'☕', spa:'🛁', walk:'🚶',
                    sport:'🏃', party:'🎉', trip:'✈️', event:'🎭', custom:'✨'
                  }[w.activity_type] || '✨'
                  const isSelected = customText === w.title
                  return (
                    <button key={w.id} onClick={() => {
                      setCustomText(w.title)
                      // Переключим тип плана если нужно
                      if (w.activity_type === 'movie_night') { /* оставим movie_night если уже */ }
                      setShowWishPicker(false)
                    }} style={{
                      padding:'10px 12px', borderRadius:9, cursor:'pointer', textAlign:'left',
                      border:`1px solid ${isSelected?'var(--accent)':'var(--border)'}`,
                      background:isSelected?'var(--accent-soft)':'var(--bg3)',
                      display:'flex', alignItems:'flex-start', gap:8,
                    }}>
                      <span style={{ fontSize:16, flexShrink:0 }}>{typeEmoji}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, color:isSelected?'var(--accent)':'var(--text)', fontWeight:isSelected?500:400 }}>
                          {w.title}
                        </div>
                        {(w.details || w.location) && (
                          <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>
                            {w.details}{w.location?` · 📍${w.location}`:''}
                          </div>
                        )}
                      </div>
                      {isSelected && <span style={{ color:'var(--accent)', fontSize:14, flexShrink:0 }}>✓</span>}
                    </button>
                  )
                })}
                <button onClick={() => { setShowWishPicker(false); window.location.href='/activity-wishlist' }}
                  style={{ padding:'8px', borderRadius:8, border:'1px dashed var(--border)',
                    background:'transparent', color:'var(--text3)', fontSize:11, cursor:'pointer', marginTop:2 }}>
                  + {rl('Управлять списком','Manage list')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Custom досуг — свой вариант */}
        {planType === 'custom' && (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <textarea
              placeholder={rl('Например: «Го посидим у Кати»', 'E.g. hang out together')}
              value={customText} onChange={e => setCustomText(e.target.value)}
              style={{ borderRadius:10, padding:'10px 12px', fontSize:13, minHeight:60, resize:'vertical',
                background:'var(--bg2)', border:'1px solid var(--border)', color:'var(--text)' }}
            />
          </div>
        )}

        {/* Movie night — кино/сериал */}
        {planType === 'movie_night' && (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>

            {/* Шаг 1: кино или сериал */}
            <div style={{ display:'flex', gap:6 }}>
              {[{k:'movie',ru:'🎬 Кино',en:'🎬 Movie'},{k:'tv',ru:'📺 Сериал',en:'📺 Series'},{k:'any',ru:'🍿 Не важно',en:'🍿 Any'}].map(o => (
                <button key={o.k} onClick={() => { setMovieMode(o.k); setShowMovieAsk(false); setShowMovieRecs(false); setMovieRecs([]) }} style={{
                  flex:1, padding:'9px 6px', borderRadius:10,
                  border:`1.5px solid ${movieMode===o.k?'var(--accent)':'var(--border)'}`,
                  background:movieMode===o.k?'var(--accent-soft)':'var(--bg2)',
                  color:movieMode===o.k?'var(--accent)':'var(--text2)', fontSize:12, cursor:'pointer', transition:'all 0.15s',
                }}>{lang==='en'?o.en:o.ru}</button>
              ))}
            </div>

            {/* Шаг 2: хотите порекомендую? */}
            {!showMovieAsk && !showMovieRecs && (
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => setShowMovieAsk(true)} style={{
                  flex:1, padding:'10px', borderRadius:10, border:'1px solid var(--accent)',
                  background:'var(--accent-soft)', color:'var(--accent)', fontSize:13, cursor:'pointer',
                }}>
                  ✦ {rl('Хочешь, порекомендую?','Want me to recommend?')}
                </button>
                <button onClick={() => setShowMovieAsk('manual')} style={{
                  flex:1, padding:'10px', borderRadius:10, border:'1px solid var(--border)',
                  background:'var(--bg2)', color:'var(--text2)', fontSize:13, cursor:'pointer',
                }}>
                  ✏️ {rl('Выберу сама','I choose')}
                </button>
              </div>
            )}

            {/* Шаг 3a: Да — загружаем рекомендации */}
            {showMovieAsk === true && !showMovieRecs && (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <div style={{ fontSize:12, color:'var(--text3)', lineHeight:1.5 }}>
                  {rl(
                    `Подберу из IMDb Top ${movieMode==='movie'?'Movies':movieMode==='tv'?'TV Shows':'Movies & TV'}. Учту настроение группы.`,
                    `Picking from IMDb Top ${movieMode==='movie'?'Movies':movieMode==='tv'?'TV Shows':'Movies & TV'}. Considering group mood.`
                  )}
                </div>
                <button onClick={async () => {
                  setLoadingMovies(true)
                  try {
                    const { data } = await supabase.functions.invoke('ai-advisor', {
                      body: {
                        userId: user?.id, requestType: 'movie_recommendation',
                        movieMode, lang,
                        groupMoods: states.map(s => s?.mood).filter(Boolean),
                      }
                    })
                    if (data?.movies?.length) { setMovieRecs(data.movies); setShowMovieRecs(true) }
                  } catch(e) { console.error(e) }
                  setLoadingMovies(false)
                }} disabled={loadingMovies} style={{
                  padding:'11px', borderRadius:10, border:'none',
                  background:loadingMovies?'var(--bg3)':'var(--accent)',
                  color:'#fff', fontSize:13, cursor:'pointer', fontWeight:500,
                }}>
                  {loadingMovies ? `⟳ ${rl('Подбираю из IMDb...','Searching IMDb...')}` : `🎬 ${rl('Подобрать','Find')}`}
                </button>
              </div>
            )}

            {/* Шаг 3b: Нет — поле для ввода */}
            {showMovieAsk === 'manual' && (
              <input
                placeholder={rl('Например: Гарри Поттер, аниме, документалка...','E.g. Harry Potter, anime, documentary...')}
                value={customText} onChange={e => setCustomText(e.target.value)}
                style={{ padding:'10px 12px', borderRadius:10, border:'1px solid var(--border)',
                  background:'var(--bg2)', color:'var(--text)', fontSize:13 }}
              />
            )}

            {/* Шаг 4: Рекомендации из IMDb */}
            {showMovieRecs && movieRecs.length > 0 && (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.07em' }}>
                  {rl('Из IMDb Top:','From IMDb Top:')}
                </div>
                {movieRecs.map((m, i) => (
                  <div key={i} style={{
                    padding:'12px 14px', background:'var(--bg2)', borderRadius:12,
                    border:'1px solid var(--border)', cursor:'pointer',
                    outline:customText===m.title?'2px solid var(--accent)':'none',
                  }} onClick={() => setCustomText(m.title)}>
                    <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:4 }}>
                      <span style={{ fontSize:14, fontWeight:600 }}>{m.title}</span>
                      <span style={{ fontSize:11, color:'var(--text3)' }}>{m.year}</span>
                      <span style={{ fontSize:11, color:'var(--text3)', marginLeft:'auto' }}>⭐ {m.rating || 'IMDb'}</span>
                    </div>
                    <div style={{ fontSize:11, color:'#a78bfa', marginBottom:4 }}>{m.genre}</div>
                    <div style={{ fontSize:12, color:'var(--text2)', lineHeight:1.5 }}>
                      {lang==='en'?m.reason_en:m.reason}
                    </div>
                    {m.imdb_url && (
                      <a href={m.imdb_url} target="_blank" rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        style={{ fontSize:11, color:'var(--accent)', display:'inline-block', marginTop:6 }}>
                        IMDb →
                      </a>
                    )}
                  </div>
                ))}
                <button onClick={() => { setShowMovieRecs(false); setShowMovieAsk(false); setMovieRecs([]) }}
                  style={{ fontSize:11, color:'var(--text3)', background:'none', border:'none', cursor:'pointer', textAlign:'left' }}>
                  {rl('← Ещё варианты','← More options')}
                </button>
              </div>
            )}
          </div>
        )}


        <PrettyButton onClick={submit} disabled={sending || recipients.length === 0} variant="primary">
          {sending ? '⟳' : sent ? '✓' : '✉️'} {sent ? rl('Предложение отправлено','Proposal sent') : rl('Предложить всем','Suggest to everyone')}
        </PrettyButton>
        <div style={{ fontSize:11, color:'var(--text3)', lineHeight:1.45 }}>
          {rl('Всем выбранным людям уйдёт пуш/инвайт через таблицу push_invites и функцию уведомлений, если она подключена.', 'Selected people get a push/invite through push_invites and notification function when connected.')}
        </div>
      </div>
    </div>
  )
}

export default function SyncPage() {
  const { user, profile } = useAuth()
  const { lang } = useLang()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const rl = (ru, en) => lang === 'en' ? en : ru

  const [groups, setGroups] = useState([])
  const [contacts, setContacts] = useState([])
  const [permissions, setPermissions] = useState({})
  const [dailyByUser, setDailyByUser] = useState({})
  const [myDaily, setMyDaily] = useState({})
  const [selectedTarget, setSelectedTarget] = useState('all')
  const [planType, setPlanType] = useState('cafe')
  const [movieMode, setMovieMode] = useState('any')  // movie | tv | any
  const [customText, setCustomText] = useState('')
  const [showMovieDialog, setShowMovieDialog] = useState(false)
  const [movieRecs, setMovieRecs] = useState([])
  const [loadingMovies, setLoadingMovies] = useState(false)
  const [selectedDate, setSelectedDate] = useState(todayKey())
  const [monthDate, setMonthDate] = useState(() => {
    const d = new Date()
    d.setDate(1)
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [loading, setLoading] = useState(true)
  const dates = useMemo(() => monthGridDates(monthDate), [monthDate])

  useEffect(() => { loadSyncData() }, [user?.id, searchParams])
  useEffect(() => { loadCalendarData() }, [contacts.length, monthDate, selectedTarget, permissions])

  async function loadSyncData() {
    if (!user?.id) return
    setLoading(true)
    const [{ data: ownedGroups }, { data: myMemberships }, { data: friendships }] = await Promise.all([
      supabase.from('groups').select('*, members:group_members(*, user:user_id(id, name, avatar_color, body_mode))').eq('owner_id', user.id),
      supabase.from('group_members').select('*, group:group_id(*, owner:owner_id(id, name, avatar_color, body_mode))').eq('user_id', user.id),
      supabase.from('friendships').select('*, friend:friend_id(id, name, avatar_color, body_mode)').eq('owner_id', user.id),
    ])

    const normalizedGroups = []
    ;(ownedGroups || []).forEach(g => normalizedGroups.push({ ...g, isOwner:true, members:g.members || [] }))
    ;(myMemberships || []).forEach(row => {
      if (!row.group || normalizedGroups.some(g => g.id === row.group_id)) return
      normalizedGroups.push({ ...row.group, isOwner:false, members:[], myMembership:row })
    })
    setGroups(normalizedGroups)

    const contactMap = new Map()
    function addContact(raw) {
      if (!raw?.user_id || raw.user_id === user.id) return
      const prev = contactMap.get(raw.user_id)
      contactMap.set(raw.user_id, {
        user_id: raw.user_id,
        name: raw.name || prev?.name || rl('Пользователь','User'),
        color: raw.color || prev?.color || 'var(--accent-soft)',
        relation_type: raw.relation_type || prev?.relation_type || 'friend',
        groups: Array.from(new Set([...(prev?.groups || []), ...(raw.groups || [])])),
        legacyCalendarAccess: raw.legacyCalendarAccess ?? prev?.legacyCalendarAccess ?? false,
      })
    }

    ;(friendships || []).forEach(f => addContact({ user_id:f.friend_id, name:f.friend?.name, color:f.friend_color, relation_type:f.relation_type || 'friend', legacyCalendarAccess:!!f.is_visible }))
    ;(ownedGroups || []).forEach(g => (g.members || []).forEach(m => addContact({ user_id:m.user_id, name:m.user?.name, color:m.member_color, relation_type:m.relation_type || 'friend', groups:[g.id], legacyCalendarAccess:!!m.can_see_calendar })))
    ;(myMemberships || []).forEach(m => {
      if (m.group?.owner_id) addContact({ user_id:m.group.owner_id, name:m.group.owner?.name, color:m.member_color, relation_type:m.relation_type || 'friend', groups:[m.group_id], legacyCalendarAccess:!!m.can_see_calendar })
    })

    const allContacts = Array.from(contactMap.values())
    setContacts(allContacts)

    const ids = allContacts.map(c => c.user_id)
    const permissionMap = {}
    if (ids.length) {
      const { data: permData } = await supabase.from('sharing_permissions').select('*').in('owner_id', ids).eq('viewer_id', user.id)
      ;(permData || []).forEach(p => { permissionMap[p.owner_id] = p })
    }
    allContacts.forEach(c => {
      const normalized = normalizePermission(permissionMap[c.user_id], c.relation_type)
      if (!permissionMap[c.user_id] && c.legacyCalendarAccess) normalized.can_view_calendar = true
      permissionMap[c.user_id] = normalized
    })
    setPermissions(permissionMap)

    const preselectedPerson = searchParams.get('person')
    const preselectedGroup = searchParams.get('group')
    if (preselectedPerson && allContacts.some(c => c.user_id === preselectedPerson)) setSelectedTarget(`person:${preselectedPerson}`)
    else if (preselectedGroup && normalizedGroups.some(g => g.id === preselectedGroup)) setSelectedTarget(`group:${preselectedGroup}`)
    setLoading(false)
  }

  const selectedContacts = useMemo(() => {
    if (selectedTarget === 'all') return contacts
    if (selectedTarget.startsWith('person:')) return contacts.filter(c => c.user_id === selectedTarget.slice(7))
    if (selectedTarget.startsWith('group:')) return contacts.filter(c => c.groups.includes(selectedTarget.slice(6)))
    return contacts
  }, [contacts, selectedTarget])

  async function loadCalendarData() {
    if (!user?.id) return
    const currentDates = monthGridDates(monthDate)
    const myMap = await loadOwnerDays({ ownerId:user.id, dates:currentDates, permissions:{ can_view_calendar:true, can_view_mood:true, can_view_sport:true, can_view_period_days:true, can_view_cycle_summary:true }, isSelf:true })
    setMyDaily(myMap)
    if (!selectedContacts.length) { setDailyByUser({}); return }
    const pairs = await Promise.all(selectedContacts.map(async c => [c.user_id, await loadOwnerDays({ ownerId:c.user_id, dates:currentDates, permissions:permissions[c.user_id] })]))
    setDailyByUser(Object.fromEntries(pairs))
  }

  const displayedPerson = selectedTarget.startsWith('person:') ? selectedContacts[0] : (selectedContacts.length === 1 ? selectedContacts[0] : null)
  const displayedPersonDaily = displayedPerson ? dailyByUser[displayedPerson.user_id] || {} : {}
  const showPersonMode = Boolean(displayedPerson)
  const statesForDate = (date) => [myDaily[date], ...selectedContacts.map(c => dailyByUser[c.user_id]?.[date] || getDayState({ hasCalendarAccess:false }))].filter(Boolean)
  const selectedStates = statesForDate(selectedDate)

  const bestRows = dates
    .map(date => ({ date, score:groupScoreForDate(statesForDate(date), planType), states:statesForDate(date) }))
    .filter(r => r.date >= todayKey() && r.score.level !== 'bad')
    .sort((a,b) => b.score.score - a.score.score)
    .slice(0, 4)

  return (
    <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', padding:'20px 16px', gap:14, overflowY:'auto' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
        <div>
          <h2 style={{ fontSize:28 }}>📅 {rl('Общий календарь','Shared calendar')}</h2>
          <p style={{ fontSize:12, color:'var(--text3)', marginTop:4, lineHeight:1.45 }}>{rl('Нажми на день: Elara подберёт досуг по открытым статусам людей.', 'Tap a day: Elara suggests a plan from shared statuses.')}</p>
        </div>
        <PrettyButton onClick={() => navigate('/friends')} style={{ whiteSpace:'nowrap' }}>← {rl('Круг','Circle')}</PrettyButton>
        <PrettyButton onClick={() => navigate('/activity-wishlist')} style={{ whiteSpace:'nowrap' }}>✨ {rl('Мой список','My list')}</PrettyButton>
      </div>

      {loading ? <div style={{ textAlign:'center', padding:30, color:'var(--text3)' }}>⟳</div> : contacts.length === 0 ? (
        <div className="card" style={{ textAlign:'center', color:'var(--text3)', fontSize:13, lineHeight:1.8, padding:'24px 18px' }}>🌙<br/>{rl('Добавь человека или группу, чтобы появился общий календарь.', 'Add a person or group to see a shared calendar.')}</div>
      ) : <>
        <div className="card" style={{ padding:'14px' }}>
          <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>{rl('С кем','With whom')}</div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
            <button type="button" onClick={() => setSelectedTarget('all')} style={chipStyle(selectedTarget === 'all')}>{rl('Все связи','All')} ({contacts.length})</button>
            {groups.map(g => <button type="button" key={g.id} onClick={() => setSelectedTarget(`group:${g.id}`)} style={chipStyle(selectedTarget === `group:${g.id}`)}>👥 {g.name}</button>)}
            {contacts.map(c => <button type="button" key={c.user_id} onClick={() => setSelectedTarget(`person:${c.user_id}`)} style={chipStyle(selectedTarget === `person:${c.user_id}`)}>• {c.name}</button>)}
          </div>
        </div>

        <div className="card" style={{ padding:'14px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, marginBottom:12 }}>
            <PrettyButton onClick={() => setMonthDate(addMonths(monthDate, -1))}>‹</PrettyButton>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:20, color:'var(--text)', fontWeight:700 }}>{monthTitle(monthDate, lang)}</div>
              <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>{showPersonMode ? rl('Календарь человека + подбор досуга', 'Person calendar + plan picker') : rl('Календарь группы + лучший формат для большинства', 'Group calendar + best plan for the majority')}</div>
            </div>
            <PrettyButton onClick={() => setMonthDate(addMonths(monthDate, 1))}>›</PrettyButton>
          </div>
          <CircleMonthCalendar
            monthDate={monthDate}
            daily={showPersonMode ? displayedPersonDaily : {}}
            contacts={selectedContacts}
            dailyByUser={dailyByUser}
            myDaily={myDaily}
            planType={planType}
            mode={showPersonMode ? 'person' : 'group'}
            showScore
            showBestPlan
            selectedDate={selectedDate}
            onDayClick={setSelectedDate}
            lang={lang}
          />
        </div>

        <DayPlannerPanel
          date={selectedDate}
          states={selectedStates}
          selectedContacts={selectedContacts}
          myState={myDaily[selectedDate]}
          planType={planType}
          setPlanType={setPlanType}
          lang={lang}
          rl={rl}
          user={user}
          profile={profile}
        />

        <div className="card" style={{ padding:'14px' }}>
          <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>{rl('Ближайшие удачные окна','Closest good windows')}</div>
          {bestRows.length === 0 ? <p style={{ fontSize:13, color:'var(--text3)', lineHeight:1.6 }}>{rl('Пока нет хороших окон. Попробуй спокойный формат или меньше людей.', 'No good windows yet. Try a calmer plan or fewer people.')}</p> : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {bestRows.map(row => (
                <button type="button" key={row.date} onClick={() => setSelectedDate(row.date)} style={{ padding:'10px 12px', borderRadius:12, background:'rgba(74,222,128,0.10)', border:'1px solid rgba(74,222,128,0.25)', textAlign:'left', cursor:'pointer' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', gap:10 }}>
                    <strong style={{ fontSize:13, color:'var(--text)' }}>{shortHumanDate(row.date, lang)}</strong>
                    <span style={{ fontSize:12, color:'#4ade80' }}>{row.score.score}%</span>
                  </div>
                  <div style={{ fontSize:12, color:'var(--text2)', marginTop:4 }}>{adviceForScore(row.score, planType, lang)}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em' }}>{rl('Выбранные люди','Selected people')}</div>
          {selectedContacts.map(c => {
            const perm = permissions[c.user_id] || normalizePermission(null, c.relation_type)
            const rel = REL_LABELS[c.relation_type] || REL_LABELS.friend
            const access = canSeeCycle(perm) || perm.can_view_mood || perm.can_view_calendar
            return (
              <div key={c.user_id} className="card" style={{ padding:'12px 14px', display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ width:38, height:38, borderRadius:'50%', background:c.color || 'var(--accent-soft)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, fontWeight:700, color:'#0a0a0a' }}>{c.name?.[0]?.toUpperCase() || '?'}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, color:'var(--text)' }}>{c.name}</div>
                  <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>{lang === 'en' ? rel[1] : rel[0]} · {access ? rl('доступ есть','access granted') : rl('доступ ограничен','limited access')}</div>
                </div>
                <PrettyButton onClick={() => navigate(`/person/${c.user_id}`)} style={{ padding:'8px 11px', fontSize:12 }}>{rl('Профиль','Profile')}</PrettyButton>
              </div>
            )
          })}
        </div>
      </>}
    </div>
  )
}
