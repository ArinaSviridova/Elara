import { useMemo, useState } from 'react'
import NotificationsPanel from '../components/NotificationsPanel'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import AIAdvice from '../components/AIAdvice'
import { isPregnancyPlanningActive, loadPregnancyToggles, savePregnancyToggles, pendingPregnancyItems, pregnancyPlanningItems, togglePregnancyItemStatus, addPregnancyDraft } from '../lib/pregnancyPlanningUi'

function safeJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback))
  } catch {
    return fallback
  }
}

function daysUntil(date) {
  if (!date) return null

  const target = new Date(`${date}T00:00:00`)
  if (Number.isNaN(target.getTime())) return null

  const now = new Date()
  now.setHours(0, 0, 0, 0)

  return Math.round((target - now) / (1000 * 60 * 60 * 24))
}

function formatDate(date, lang = 'ru') {
  if (!date) return ''

  try {
    return new Date(`${date}T00:00:00`).toLocaleDateString(
      lang === 'en' ? 'en-US' : 'ru-RU',
      { day: 'numeric', month: 'long' }
    )
  } catch {
    return date
  }
}

function collectNextVaccine(vaccinations) {
  const done = vaccinations?.done || {}
  const candidates = []

  Object.entries(done).forEach(([key, rec]) => {
    if (!rec || typeof rec === 'string') return

    if (rec.next_date) {
      candidates.push({ key, date: rec.next_date, label: key })
    }

    ;(rec.doses || []).forEach(dose => {
      if (!dose.done_date && dose.planned_date) {
        candidates.push({
          key,
          date: dose.planned_date,
          label: dose.label || key,
        })
      }
    })
  })

  return candidates
    .map(item => ({ ...item, left: daysUntil(item.date) }))
    .filter(item => item.left !== null && item.left >= -7)
    .sort((a, b) => a.left - b.left)[0] || null
}

const quickLinkCardStyle = {
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 24,
  background: 'linear-gradient(180deg, rgba(255,255,255,0.045), rgba(255,255,255,0.018))',
  padding: '18px 16px',
  minHeight: 142,
  textAlign: 'left',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  boxShadow: '0 12px 32px rgba(0,0,0,0.22)',
  cursor: 'pointer',
}

const quickLinkIconStyle = {
  width: 44,
  height: 44,
  borderRadius: 15,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(255,255,255,0.07)',
  color: '#F5F7FB',
  fontSize: 24,
  lineHeight: 1,
}

const quickLinkTitleStyle = {
  color: '#F5F7FB',
  fontSize: 18,
  fontWeight: 850,
  lineHeight: 1.2,
  marginBottom: 6,
  textShadow: '0 1px 0 rgba(0,0,0,0.35)',
}

const quickLinkSubtitleStyle = {
  color: 'rgba(255,255,255,0.68)',
  fontSize: 12,
  fontWeight: 500,
  lineHeight: 1.45,
}

export default function TodayPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { lang } = useLang()
  const [showQuick, setShowQuick] = useState(false)
  const [detailMode, setDetailMode] = useState(
    localStorage.getItem('elara_explain_mode') || 'short'
  )

  const rl = (ru, en) => (lang === 'en' ? en : ru)

  const health = profile?.health || {}
  const assignments = health.assignments || []
  const activeAssignments = assignments.filter(a => !a.done && !a.archived)
  const nextVaccine = collectNextVaccine(health.vaccinations)
  const testDrafts = safeJson('elara_test_drafts', {})
  const draftCount = Object.values(testDrafts || {}).filter(
    d => d && d.answers && Object.keys(d.answers).length
  ).length
  const tests = safeJson(`elara_test_results_${profile?.id || 'anon'}`, {})
  const testCount = Object.keys(tests || {}).length
  const pregnancyActive = isPregnancyPlanningActive(profile)
  const [pregnancyToggles, setPregnancyToggles] = useState(() => loadPregnancyToggles(profile?.id || user?.id))
  const [expandedPregnancy, setExpandedPregnancy] = useState({})

  const pregnancyItems = useMemo(() => pregnancyPlanningItems(profile, rl), [profile, lang])
  const pendingPregnancy = useMemo(
    () => pendingPregnancyItems(profile, pregnancyToggles, rl),
    [profile, pregnancyToggles, lang]
  )

  const currentPhase = profile?.currentPhase?.type || profile?.currentPhase || profile?.cycle_phase || null

  function setPregnancyStatus(itemId) {
    const next = {
      ...pregnancyToggles,
      [itemId]: togglePregnancyItemStatus(pregnancyToggles?.[itemId]),
    }
    setPregnancyToggles(next)
    savePregnancyToggles(profile?.id || user?.id, next)
  }

  function handlePregnancyAction(item, action) {
    if (!action) return
    const userId = profile?.id || user?.id
    if (action.kind === 'navigate') {
      navigate(action.path || item.path || '/today')
      return
    }
    if (action.kind === 'medication') {
      addPregnancyDraft(userId, {
        type: 'medication',
        sourceItem: item.id,
        title: item.suggestedMedication?.name || item.title,
        dosage: item.suggestedMedication?.dosage || rl('обсудить с врачом', 'discuss with clinician'),
        note: item.details || item.text,
      })
      navigate('/medications?pregnancy=1')
      return
    }
    if (action.kind === 'health_note' || action.kind === 'analysis' || action.kind === 'doctor_upload' || action.kind === 'sport_plan') {
      addPregnancyDraft(userId, {
        type: action.kind,
        sourceItem: item.id,
        title: item.title,
        note: item.details || item.text,
      })
      if (action.kind === 'analysis') navigate('/health?pregnancy=1')
      else if (action.kind === 'doctor_upload') navigate('/health-archive?pregnancy=1')
      else if (action.kind === 'sport_plan') navigate('/sport?pregnancy=1')
      else navigate('/health?pregnancy=1')
      return
    }
    navigate(item.path || '/today')
  }

  function togglePregnancyDetails(id) {
    setExpandedPregnancy(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const todayCards = useMemo(() => {
    const cards = []

    cards.push({
      icon: '＋',
      title: rl('Быстрая отметка', 'Quick log'),
      text: rl(
        'Добавь таблетку, симптом, настроение, интим или день цикла без охоты по меню.',
        'Add a med, symptom, mood, intimacy, or cycle day without menu archaeology.'
      ),
      action: rl('Добавить', 'Add'),
      onClick: () => setShowQuick(true),
    })

    if (nextVaccine) {
      cards.push({
        icon: '💉',
        title: rl('Следующая доза / прививка', 'Next dose / vaccine'),
        text:
          nextVaccine.left <= 31
            ? rl(
                `Плановая дата: ${formatDate(nextVaccine.date, lang)}. Если нужно, запишись заранее.`,
                `Planned date: ${formatDate(nextVaccine.date, lang)}. Book ahead if needed.`
              )
            : rl(
                `Следующая дата: ${formatDate(nextVaccine.date, lang)}.`,
                `Next date: ${formatDate(nextVaccine.date, lang)}.`
              ),
        action: rl('Открыть прививки', 'Open vaccines'),
        onClick: () => navigate('/health'),
      })
    }

    if (activeAssignments.length) {
      cards.push({
        icon: '📋',
        title: rl('Есть назначения врача', 'You have prescriptions'),
        text: rl(
          `${activeAssignments.length} назначение(я) стоит проверить: лекарства, анализы или контроль.`,
          `${activeAssignments.length} prescription item(s) to check: meds, labs, or follow-up.`
        ),
        action: rl('Открыть', 'Open'),
        onClick: () => navigate('/health?tab=assignments'),
      })
    }

    if (draftCount) {
      cards.push({
        icon: '🧠',
        title: rl('Недопройденные тесты', 'Unfinished tests'),
        text: rl(
          `${draftCount} тест(а) можно продолжить. Приложение впервые не стерло твой прогресс, праздник.`,
          `${draftCount} test(s) can be continued.`
        ),
        action: rl('Продолжить', 'Continue'),
        onClick: () => navigate('/tests'),
      })
    }

    if (!testCount) {
      cards.push({
        icon: '✨',
        title: rl('Настроить Elara под себя', 'Personalize Elara'),
        text: rl(
          'Пройди тесты, и Elara предложит фокусы без гадания на кофейной гуще.',
          'Take tests and Elara will suggest focus modules.'
        ),
        action: rl('Пройти тесты', 'Take tests'),
        onClick: () => navigate('/tests'),
      })
    }

    return cards.slice(0, 5)
  }, [nextVaccine, activeAssignments.length, draftCount, testCount, lang, navigate])

  const quickActions = [
    { icon: '💊', label: rl('Таблетку', 'Medication'), path: '/medications' },
    { icon: '🧪', label: rl('Анализ', 'Lab report'), path: '/health-archive' },
    { icon: '📋', label: rl('Назначение', 'Prescription'), path: '/health' },
    { icon: '💉', label: rl('Прививку', 'Vaccine'), path: '/health' },
    { icon: '🩸', label: rl('Месячные', 'Period'), path: '/calendar' },
    { icon: '🌡', label: rl('Симптом', 'Symptom'), path: '/health' },
    { icon: '🌹', label: rl('Интим', 'Intimacy'), path: '/intimacy' },
    { icon: '◈', label: rl('Настроение', 'Mood'), path: '/diary' },
    { icon: '🕊', label: rl('Подготовку', 'Planning'), path: '/pregnancy-planning-setup?return=/today' },
  ]

  const quickLinks = [
    {
      icon: '◯',
      title: rl('Календарь', 'Calendar'),
      subtitle: rl('Цикл, фазы, симптомы и отметки по дням', 'Cycle, phases, symptoms, and daily logs'),
      path: '/calendar',
    },
    {
      icon: '🩺',
      title: rl('Здоровье', 'Health'),
      subtitle: rl('Препараты, анализы, прививки и назначения', 'Meds, labs, vaccines, and prescriptions'),
      path: '/health',
    },
    ...(pregnancyActive ? [{
      icon: '🕊',
      title: rl('Подготовка', 'Planning'),
      subtitle: rl('Горящие задачи до беременности: врач, анализы, витамины, спорт', 'Pregnancy planning tasks: doctor, labs, vitamins, activity'),
      path: '/pregnancy-planning-setup?return=/today',
    }] : []),
    {
      icon: '◈',
      title: rl('Дневник', 'Diary'),
      subtitle: rl('Настроение, заметки, состояние и личные записи', 'Mood, notes, wellbeing, and private entries'),
      path: '/diary',
    },
    {
      icon: '✨',
      title: rl('AI-фокусы', 'AI focuses'),
      subtitle: rl('Персонализация, подсказки и активные модули', 'Personalization, insights, and active modules'),
      path: '/personalization',
    },
  ]

  function setMode(mode) {
    setDetailMode(mode)
    localStorage.setItem('elara_explain_mode', mode)
  }

  return (
    <div
      className="page-enter"
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px 16px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div>
          <h2 style={{ fontSize: 28, marginBottom: 4 }}>
            ✦ {rl('Сегодня', 'Today')}
          </h2>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: 'var(--text3)',
              lineHeight: 1.5,
            }}
          >
            {new Date().toLocaleDateString(lang === 'en' ? 'en-US' : 'ru-RU', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/search')}
          className="btn btn-ghost"
          style={{ width: 'auto', padding: '8px 12px', fontSize: 13 }}
        >
          🔎
        </button>
      </div>

      {/* Уведомления */}
      <NotificationsPanel />

      {/* Совет на сегодня */}
      <AIAdvice cyclePhase={currentPhase} />



      <button
        type="button"
        onClick={() => navigate('/search')}
        style={{
          width: '100%',
          padding: '12px 14px',
          borderRadius: 14,
          border: '1px solid var(--border)',
          background: 'var(--bg2)',
          color: 'rgba(255,255,255,0.68)',
          textAlign: 'left',
          fontSize: 13,
          cursor: 'pointer',
        }}
      >
        🔎 {rl('Найти таблетки, анализы, тесты, прививки...', 'Find meds, labs, tests, vaccines...')}
      </button>


      {pregnancyActive && (
        <section
          style={{
            border: '1px solid rgba(134,239,172,0.42)',
            background: 'linear-gradient(180deg, rgba(34,197,94,0.16), rgba(15,23,42,0.18))',
            borderRadius: 28,
            padding: 16,
            boxShadow: '0 24px 70px rgba(34,197,94,0.16)',
          }}
        >
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, marginBottom:12 }}>
            <div>
              <h3 style={{ fontSize:22, margin:'0 0 6px', color:'#dcfce7' }}>🕊 {rl('Подготовка к беременности', 'Pregnancy planning')}</h3>
              <p style={{ margin:0, color:'rgba(220,252,231,0.78)', fontSize:13, lineHeight:1.55 }}>
                {rl('Эти карточки горят, пока режим активен. Отмечай выполненное прямо здесь, а детали смотри в здоровье и таблетках.', 'These cards stay highlighted while planning mode is active. Mark done here and open Health or Meds for details.')}
              </p>
            </div>
            <span style={{ padding:'6px 12px', borderRadius:999, background:'#bbf7d0', color:'#052e16', fontSize:12, fontWeight:900 }}>
              {rl('АКТИВНО', 'ACTIVE')}
            </span>
          </div>

          <div className="card" style={{ padding:14, borderColor:'rgba(134,239,172,0.25)', background:'rgba(255,255,255,0.055)', marginBottom:12 }}>
            <div style={{ fontSize:18, fontWeight:900, color:'#dcfce7' }}>
              ✅ {rl('Задачи подготовки горят', 'Planning tasks are active')}
            </div>
            <p style={{ margin:'6px 0 12px', color:'rgba(255,255,255,0.72)', fontSize:13, lineHeight:1.55 }}>
              {rl(
                `${pendingPregnancy.length} задач(и) ждут: ${pendingPregnancy.slice(0,2).map(i => i.title).join(', ') || 'всё отмечено'}.`,
                `${pendingPregnancy.length} task(s) pending: ${pendingPregnancy.slice(0,2).map(i => i.title).join(', ') || 'all done'}.`
              )}
            </p>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <button type="button" onClick={() => navigate('/health?pregnancy=1')} className="btn btn-primary" style={{ width:'auto', padding:'8px 12px', fontSize:12 }}>
                {rl('Открыть здоровье', 'Open health')} →
              </button>
              <button type="button" onClick={() => navigate('/medications?pregnancy=1')} className="btn btn-ghost" style={{ width:'auto', padding:'8px 12px', fontSize:12 }}>
                {rl('Открыть таблетки', 'Open meds')} →
              </button>
            </div>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {pregnancyItems.slice(0, 8).map(item => {
              const done = pregnancyToggles?.[item.id] === 'done'
              return (
                <div key={item.id} className="card" style={{ padding:14, borderColor: done ? 'rgba(134,239,172,0.20)' : 'rgba(134,239,172,0.34)', opacity: done ? 0.62 : 1 }}>
                  <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                    <button
                      type="button"
                      onClick={() => setPregnancyStatus(item.id)}
                      style={{
                        width:34, height:34, borderRadius:12,
                        border:'1px solid rgba(134,239,172,0.35)',
                        background: done ? '#bbf7d0' : 'rgba(255,255,255,0.06)',
                        color: done ? '#052e16' : '#bbf7d0',
                        fontWeight:900, cursor:'pointer', flexShrink:0,
                      }}
                    >
                      {done ? '✓' : item.icon}
                    </button>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:15, fontWeight:900, color:'#f0fdf4', textDecoration: done ? 'line-through' : 'none' }}>{item.title}</div>
                      <p style={{ margin:'5px 0 10px', color:'rgba(255,255,255,0.64)', fontSize:12, lineHeight:1.5 }}>{item.text}</p>
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                        <button type="button" onClick={() => togglePregnancyDetails(item.id)} className="btn btn-ghost" style={{ width:'auto', padding:'7px 11px', fontSize:12 }}>
                          {expandedPregnancy[item.id] ? rl('Скрыть детали','Hide details') : rl('Подробнее','Details')}
                        </button>
                        <button type="button" onClick={() => navigate(item.path)} className="btn btn-primary" style={{ width:'auto', padding:'7px 11px', fontSize:12 }}>
                          {item.cta} →
                        </button>
                      </div>
                      {expandedPregnancy[item.id] && (
                        <div style={{ marginTop:10, padding:12, borderRadius:14, background:'rgba(255,255,255,0.055)', border:'1px solid rgba(134,239,172,0.22)' }}>
                          <p style={{ margin:'0 0 10px', color:'rgba(255,255,255,0.72)', fontSize:12, lineHeight:1.55 }}>{item.details || item.text}</p>
                          <div style={{ display:'flex', gap:7, flexWrap:'wrap' }}>
                            {(item.actions || []).map((action, actionIdx) => (
                              <button key={actionIdx} type="button" onClick={() => handlePregnancyAction(item, action)} className="btn btn-ghost" style={{ width:'auto', padding:'7px 10px', fontSize:11 }}>
                                {action.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <div className="card" style={{ padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#F5F7FB' }}>
              {rl('Режим объяснений', 'Explanation mode')}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.62)', marginTop: 3 }}>
              {rl(
                'Кратко, когда всё понятно. Подробно, когда мозг требует инструкцию.',
                'Short when it is clear. Detailed when your brain demands a manual.'
              )}
            </div>
          </div>

          <div style={{ display: 'flex', background: 'var(--bg3)', borderRadius: 999, padding: 3 }}>
            {['short', 'long'].map(mode => (
              <button
                key={mode}
                type="button"
                onClick={() => setMode(mode)}
                style={{
                  border: 'none',
                  borderRadius: 999,
                  padding: '6px 9px',
                  background: detailMode === mode ? 'var(--accent-soft)' : 'transparent',
                  color: detailMode === mode ? 'var(--accent)' : 'rgba(255,255,255,0.55)',
                  fontSize: 11,
                  cursor: 'pointer',
                }}
              >
                {mode === 'short' ? rl('Кратко', 'Short') : rl('Подробно', 'Detailed')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section>
        <h3 style={{ fontSize: 16, marginBottom: 10, color: '#F5F7FB' }}>
          {rl('Что важно сейчас', 'Important now')}
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {todayCards.map((card, idx) => (
            <div key={idx}>
              <div className="card" style={{ padding: 14 }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 24 }}>{card.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#F5F7FB' }}>
                      {card.title}
                    </div>
                    <p
                      style={{
                        fontSize: 12,
                        color: 'rgba(255,255,255,0.66)',
                        lineHeight: 1.55,
                        margin: '5px 0 10px',
                      }}
                    >
                      {card.text}
                    </p>
                    <button
                      type="button"
                      onClick={event => {
                        event.preventDefault()
                        event.stopPropagation()
                        card.onClick?.()
                      }}
                      className="btn btn-primary"
                      style={{
                        width: 'auto',
                        padding: '8px 12px',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      {card.action}
                    </button>
                  </div>
                </div>
              </div>

              {idx === 0 && showQuick && (
                <div
                  className="card"
                  style={{
                    padding: 14,
                    marginTop: 8,
                    borderColor: 'var(--accent)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 10,
                    }}
                  >
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#F5F7FB' }}>
                      ＋ {rl('Что добавить?', 'What to add?')}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowQuick(false)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        color: 'rgba(255,255,255,0.65)',
                        fontSize: 18,
                        cursor: 'pointer',
                      }}
                    >
                      ×
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {quickActions.map(action => (
                      <button
                        key={action.label}
                        type="button"
                        onClick={() => navigate(action.path)}
                        style={{
                          padding: '12px 10px',
                          borderRadius: 12,
                          border: '1px solid rgba(255,255,255,0.10)',
                          background: 'rgba(255,255,255,0.035)',
                          color: '#F5F7FB',
                          textAlign: 'left',
                          fontSize: 13,
                          fontWeight: 650,
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ fontSize: 18, marginRight: 6 }}>{action.icon}</span>
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 style={{ fontSize: 18, marginBottom: 14, color: '#F5F7FB', fontWeight: 750 }}>
          {rl('Быстрые переходы', 'Quick paths')}
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {quickLinks.map(item => (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              style={quickLinkCardStyle}
            >
              <div style={quickLinkIconStyle}>{item.icon}</div>

              <div>
                <div style={quickLinkTitleStyle}>{item.title}</div>
                <div style={quickLinkSubtitleStyle}>{item.subtitle}</div>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
