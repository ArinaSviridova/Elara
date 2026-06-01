import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { BODY_MODES, ACTIVE_CONDITIONS, GENDER_IDENTITIES_SHORT, ORIENTATIONS, resolveProfileModules } from '../lib/profileModules'

const GOALS = [
  { key: 'cycle', icon: '🩸', ru: 'Цикл и фазы', en: 'Cycle and phases', enables: ['calendar', 'cycle', 'periodPrediction'] },
  { key: 'mood', icon: '🌙', ru: 'Настроение и энергия', en: 'Mood and energy', enables: ['diary', 'moodTracking'] },
  { key: 'meds', icon: '💊', ru: 'Таблетки и назначения', en: 'Meds and prescriptions', enables: ['health', 'medications'] },
  { key: 'labs', icon: '🧪', ru: 'Анализы и PDF', en: 'Labs and PDFs', enables: ['healthArchive', 'aiPdf'] },
  { key: 'vaccines', icon: '💉', ru: 'Прививки и дозы', en: 'Vaccines and doses', enables: ['vaccines', 'reminders'] },
  { key: 'intimacy', icon: '🌹', ru: 'Интим, либидо и согласие', en: 'Intimacy, libido, and consent', enables: ['intimacy', 'libido'] },
  { key: 'contraception', icon: '🛡', ru: 'Контрацепция / СТМ', en: 'Contraception / STM', enables: ['contraception', 'stm'] },
  { key: 'pregnancy_planning', icon: '🕊', ru: 'Подготовка к беременности', en: 'Pregnancy planning', enables: ['preconception', 'checkups'] },
  { key: 'pregnancy', icon: '👶', ru: 'Беременность', en: 'Pregnancy', bodyMode: 'pregnancy', enables: ['baby', 'pregnancy'] },
  { key: 'postpartum', icon: '🫂', ru: 'Послеродовой / кормление', en: 'Postpartum / breastfeeding', condition: 'postpartum', enables: ['postpartum', 'lactation'] },
  { key: 'chronic', icon: '🧩', ru: 'Хронические состояния', en: 'Chronic conditions', enables: ['conditions', 'symptoms'] },
  { key: 'circle', icon: '🔄', ru: 'Круг и общие окна', en: 'Circle and shared windows', enables: ['circle', 'sync'] },
]

const BODY_GOAL_HINTS = {
  menstruating: {
    show: ['Календарь цикла', 'Фазы', 'Месячные', 'ПМС', 'СТМ по желанию'],
    calculate: ['среднюю длину цикла', 'овуляцию и фертильное окно', 'ПМС и лютеиновую фазу'],
    suggest: ['когда снизить нагрузку', 'что добавить в отчёт врачу', 'когда данные цикла выглядят нестабильно'],
  },
  amenorrhea: {
    show: ['Симптомы', 'анализы', 'препараты', 'назначения'],
    calculate: ['самочувствие и повторяемость симптомов без прогноза месячных'],
    suggest: ['что обсудить с врачом, если месячных нет неожиданно', 'какие факторы могут влиять: стресс, вес, ГАТ/ЗГТ, щитовидка, препараты'],
  },
  pregnancy_planning: {
    show: ['цикл', 'овуляцию', 'фертильное окно', 'чекапы', 'прививки', 'подготовку партнёра'],
    calculate: ['фертильное окно', 'дни с лучшей вероятностью зачатия', 'регулярность цикла и точки для врача'],
    suggest: ['когда проверить ИППП, прививки, фолиевую кислоту и базовые анализы', 'что обсудить с врачом до попыток'],
  },
  pregnancy: {
    show: ['экран “Малыш”', 'недели беременности', 'обследования', 'красные флаги', 'витамины и назначения'],
    calculate: ['срок беременности и ближайшие контрольные точки'],
    suggest: ['когда обсудить анализы, прививки, давление, симптомы и визиты'],
  },
  menopause: {
    show: ['сон', 'приливы', 'настроение', 'сухость', 'либидо', 'давление', 'кости'],
    calculate: ['повторяемость симптомов и влияние сна/стресса'],
    suggest: ['что обсудить по МГТ, костям, давлению и сердечно-сосудистым рискам'],
  },
  prefer_not: {
    show: ['дневник', 'анализы', 'препараты', 'прививки', 'назначения', 'общие чекапы'],
    calculate: ['самочувствие без предположений о теле'],
    suggest: ['нейтральные подсказки без цикла и репродуктивных допущений'],
  },
}

function getLabel(item, lang) {
  return `${item.emoji || item.icon || ''} ${lang === 'en' ? item.en : item.ru}`.trim()
}

function guessAgeMode(year) {
  const y = Number(year)
  if (!Number.isFinite(y) || y < 1900) return 'adult'
  const age = new Date().getFullYear() - y
  if (age < 18) return 'teen'
  if (age >= 60) return 'older_adult'
  return 'adult'
}

function storageKey(userId) {
  return `elara_onboarding_v2_${userId || 'anon'}`
}

function sanitizeConditionsForBodyMode(bodyMode, conditions = []) {
  const list = Array.isArray(conditions) ? conditions : []
  if (bodyMode === 'pregnancy_planning') {
    return list.filter(key => key !== 'pregnancy_planning_marker' && key !== 'pregnancy_planning')
  }
  return list
}

export default function OnboardingPage({ onComplete, defaultReturn = '/profile' }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const rawReturnTo = searchParams.get('return') || defaultReturn || '/profile'
  const returnTo = rawReturnTo === 'profile' ? '/profile' : (rawReturnTo.startsWith('/') ? rawReturnTo : (defaultReturn || '/profile'))
  const { user, profile, updateProfile } = useAuth()
  const { lang, setLang } = useLang()
  const rl = (ru, en) => (lang === 'en' ? en : ru)

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [goals, setGoals] = useState(() => {
    const initial = []
    if (profile?.body_mode === 'pregnancy_planning') initial.push('pregnancy_planning')
    if (profile?.body_mode === 'pregnancy') initial.push('pregnancy')
    if ((profile?.active_conditions || []).includes('postpartum')) initial.push('postpartum')
    return initial
  })
  const [name, setName] = useState(profile?.name || '')
  const [birthYear, setBirthYear] = useState(profile?.birth_year || '')
  const [gender, setGender] = useState(profile?.gender || 'prefer_not')
  const [orientation, setOrientation] = useState(profile?.orientation || 'prefer_not')
  const [pronouns, setPronouns] = useState(profile?.pronouns || '')
  const [bodyMode, setBodyMode] = useState(profile?.body_mode || 'prefer_not')
  const [activeConditions, setActiveConditions] = useState(profile?.active_conditions || [])
  const [privacy, setPrivacy] = useState({
    appPin: false,
    diaryLock: false,
    ghostPinHint: false,
    circleOnlyGeneral: true,
  })

  const inferredBodyMode = useMemo(() => {
    if (goals.includes('pregnancy')) return 'pregnancy'
    if (goals.includes('pregnancy_planning')) return 'pregnancy_planning'
    if (goals.includes('cycle') || goals.includes('contraception')) return 'menstruating'
    return bodyMode
  }, [goals, bodyMode])

  const inferredConditions = useMemo(() => {
    const set = new Set(activeConditions)
    if (goals.includes('postpartum')) set.add('postpartum')
    if (goals.includes('chronic')) set.add('other_condition')
    return sanitizeConditionsForBodyMode(inferredBodyMode, [...set])
  }, [goals, activeConditions, inferredBodyMode])

  const modules = useMemo(() => resolveProfileModules({
    ...profile,
    body_mode: inferredBodyMode,
    active_conditions: inferredConditions,
  }), [profile, inferredBodyMode, inferredConditions])

  const enabledFromGoals = useMemo(() => {
    const set = new Set()
    goals.forEach(key => {
      const goal = GOALS.find(g => g.key === key)
      ;(goal?.enables || []).forEach(item => set.add(item))
    })
    Object.entries(modules || {}).forEach(([key, value]) => {
      if (value === true) set.add(key)
    })
    return [...set]
  }, [goals, modules])

  const hint = BODY_GOAL_HINTS[inferredBodyMode] || BODY_GOAL_HINTS.prefer_not

  function toggleGoal(key) {
    setGoals(prev => prev.includes(key) ? prev.filter(item => item !== key) : [...prev, key])
  }

  function toggleCondition(key) {
    setActiveConditions(prev => prev.includes(key) ? prev.filter(item => item !== key) : [...prev, key])
  }

  function finishLater() {
    localStorage.setItem(storageKey(user?.id), JSON.stringify({ completed: true, skipped: true, at: new Date().toISOString() }))
    onComplete?.()
    navigate(returnTo, { replace: true })
  }

  async function finish() {
    setSaving(true)
    const finalBodyMode = inferredBodyMode
    const finalConditions = inferredConditions
    const data = {
      completed: true,
      skipped: false,
      at: new Date().toISOString(),
      goals,
      body_mode: finalBodyMode,
      active_conditions: finalConditions,
      privacy,
      enabled: enabledFromGoals,
      explanation: {
        show: hint.show,
        calculate: hint.calculate,
        suggest: hint.suggest,
      },
    }

    localStorage.setItem(storageKey(user?.id), JSON.stringify(data))
    localStorage.setItem(`elara_setup_goals_${user?.id || 'anon'}`, JSON.stringify(goals))
    localStorage.setItem(`elara_setup_privacy_${user?.id || 'anon'}`, JSON.stringify(privacy))
    localStorage.setItem(`elara_setup_summary_${user?.id || 'anon'}`, JSON.stringify(data.explanation))

    if (privacy.diaryLock && user?.id) {
      localStorage.setItem(`elara_diary_lock_${user.id}`, '1')
      window.dispatchEvent(new Event('elara-lock-change'))
    }

    const nextHealth = finalBodyMode === 'pregnancy_planning'
      ? { ...(profile?.health || {}) }
      : {
          ...(profile?.health || {}),
          preconception_partner_id: null,
          preconception_partner_name: null,
          preconception_partner_gender: null,
        }

    await updateProfile({
      name: name.trim() || profile?.name || '',
      birth_year: birthYear ? parseInt(birthYear) : null,
      age_mode: guessAgeMode(birthYear),
      gender,
      orientation,
      pronouns,
      body_mode: finalBodyMode,
      active_conditions: finalConditions,
      health: nextHealth,
      language: lang,
    })

    setSaving(false)
    onComplete?.()
    navigate(returnTo, { replace: true })
  }

  const progress = Math.round(((step + 1) / 5) * 100)

  return (
    <div className="page-enter" style={{ flex:1, overflowY:'auto', padding:'24px 18px 28px', display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
        <div>
          <div style={{ fontSize:12, color:'var(--text3)', letterSpacing:'0.12em', textTransform:'uppercase' }}>{rl('Первичная настройка','First setup')}</div>
          <h1 style={{ fontSize:30, margin:'4px 0 0' }}>Elara</h1>
        </div>
        <button type="button" onClick={finishLater} className="btn btn-ghost" style={{ width:'auto', padding:'8px 12px', fontSize:12 }}>
          {rl('Настрою позже','Later')}
        </button>
      </div>

      <div style={{ height:5, background:'var(--bg3)', borderRadius:999, overflow:'hidden' }}>
        <div style={{ width:`${progress}%`, height:'100%', background:'var(--accent)', transition:'width 0.2s' }} />
      </div>

      {step === 0 && (
        <section className="card" style={{ padding:16, display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <h2 style={{ fontSize:22, marginBottom:6 }}>{rl('Что тебе важно отслеживать?','What do you want to track?')}</h2>
            <p style={{ margin:0, fontSize:13, color:'var(--text3)', lineHeight:1.55 }}>
              {rl('Выбери всё актуальное. Elara соберёт интерфейс под тебя, а не вывалит все медицинские шкафы сразу.', 'Choose what matters. Elara will shape the interface around you.')}
            </p>
          </div>

          <div style={{ display:'grid', gap:8 }}>
            {GOALS.map(goal => {
              const active = goals.includes(goal.key)
              return (
                <button key={goal.key} type="button" onClick={() => toggleGoal(goal.key)} style={{
                  border:`1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                  background: active ? 'var(--accent-soft)' : 'var(--bg2)',
                  color: active ? 'var(--accent)' : 'var(--text)',
                  borderRadius:13,
                  padding:'12px 13px',
                  display:'flex',
                  alignItems:'center',
                  gap:10,
                  cursor:'pointer',
                  textAlign:'left',
                }}>
                  <span style={{ fontSize:21 }}>{goal.icon}</span>
                  <span style={{ flex:1, fontSize:14, fontWeight:600 }}>{lang === 'en' ? goal.en : goal.ru}</span>
                  {active && <span>✓</span>}
                </button>
              )
            })}
          </div>

          <button type="button" className="btn btn-primary" disabled={!goals.length} onClick={() => setStep(1)}>
            {rl('Дальше','Next')}
          </button>
        </section>
      )}

      {step === 1 && (
        <section className="card" style={{ padding:16, display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <h2 style={{ fontSize:22, marginBottom:6 }}>{rl('Базовые данные','Basic details')}</h2>
            <p style={{ margin:0, fontSize:13, color:'var(--text3)', lineHeight:1.55 }}>
              {rl('Возраст нужен для прививок, чекапов и подсказок. Это не режим 18+ или “детский режим”, просто параметр.', 'Age helps with vaccines, checkups, and suggestions. It is not a separate “18+ mode”, just a parameter.')}
            </p>
          </div>

          <label style={{ display:'grid', gap:6 }}>
            <span style={{ fontSize:12, color:'var(--text3)' }}>{rl('Имя','Name')}</span>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Elara" />
          </label>

          <label style={{ display:'grid', gap:6 }}>
            <span style={{ fontSize:12, color:'var(--text3)' }}>{rl('Год рождения','Birth year')}</span>
            <input value={birthYear} onChange={e => setBirthYear(e.target.value.replace(/\D/g, '').slice(0,4))} placeholder="1998" inputMode="numeric" />
          </label>

          <label style={{ display:'grid', gap:6 }}>
            <span style={{ fontSize:12, color:'var(--text3)' }}>{rl('Язык','Language')}</span>
            <select value={lang} onChange={e => setLang(e.target.value)} style={{ padding:'12px 14px', borderRadius:12, border:'1px solid var(--border)', background:'var(--bg3)', color:'var(--text)' }}>
              <option value="ru">🇷🇺 Русский</option>
              <option value="en">🇬🇧 English</option>
            </select>
          </label>

          <div style={{ display:'flex', gap:8 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setStep(0)} style={{ flex:1 }}>{rl('Назад','Back')}</button>
            <button type="button" className="btn btn-primary" onClick={() => setStep(2)} style={{ flex:2 }}>{rl('Дальше','Next')}</button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="card" style={{ padding:16, display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <h2 style={{ fontSize:22, marginBottom:6 }}>{rl('Тело и контекст','Body and context')}</h2>
            <p style={{ margin:0, fontSize:13, color:'var(--text3)', lineHeight:1.55 }}>
              {rl('Это нужно не для ярлыков, а чтобы Elara понимала, что показывать, считать и не трогать.', 'This is not for labels. It helps Elara know what to show, calculate, and leave alone.')}
            </p>
          </div>

          <label style={{ display:'grid', gap:6 }}>
            <span style={{ fontSize:12, color:'var(--text3)' }}>{rl('Режим тела','Body mode')}</span>
            <select value={inferredBodyMode} onChange={e => {
              const newMode = e.target.value
              setBodyMode(newMode)
              if (newMode === 'pregnancy_planning') {
                setActiveConditions(prev => sanitizeConditionsForBodyMode(newMode, prev))
              }
              if (newMode !== 'pregnancy_planning') setGoals(prev => prev.filter(g => g !== 'pregnancy_planning'))
              if (newMode !== 'pregnancy') setGoals(prev => prev.filter(g => g !== 'pregnancy'))
            }} style={{ padding:'12px 14px', borderRadius:12, border:'1px solid var(--border)', background:'var(--bg3)', color:'var(--text)' }}>
              {BODY_MODES.map(mode => <option key={mode.key} value={mode.key}>{getLabel(mode, lang)}</option>)}
            </select>
          </label>

          <div style={{ display:'grid', gap:8 }}>
            <div style={{ fontSize:12, color:'var(--text3)' }}>{rl('Дополнительно, если актуально','Additional, if relevant')}</div>
            {ACTIVE_CONDITIONS
              .filter(cond => {
                // pregnancy_planning_marker скрываем если body_mode уже pregnancy_planning
                if (cond.key === 'pregnancy_planning_marker' && inferredBodyMode === 'pregnancy_planning') return false
                return true
              })
              .map(cond => {
              const active = inferredConditions.includes(cond.key)
              return (
                <button key={cond.key} type="button" onClick={() => toggleCondition(cond.key)} style={{
                  padding:'10px 12px', borderRadius:12, border:`1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
                  background: active ? 'var(--accent-soft)' : 'var(--bg2)', color: active ? 'var(--accent)' : 'var(--text)',
                  display:'flex', alignItems:'center', gap:9, cursor:'pointer', textAlign:'left', fontSize:13,
                }}>
                  <span>{cond.emoji}</span><span style={{ flex:1 }}>{lang === 'en' ? cond.en : cond.ru}</span>{active && <span>✓</span>}
                </button>
              )
            })}
          </div>

          <div style={{ display:'flex', gap:8 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setStep(1)} style={{ flex:1 }}>{rl('Назад','Back')}</button>
            <button type="button" className="btn btn-primary" onClick={() => setStep(3)} style={{ flex:2 }}>{rl('Дальше','Next')}</button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="card" style={{ padding:16, display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <h2 style={{ fontSize:22, marginBottom:6 }}>{rl('Приватность','Privacy')}</h2>
            <p style={{ margin:0, fontSize:13, color:'var(--text3)', lineHeight:1.55 }}>
              {rl('Можно включить базовую защиту сейчас. Потом всё меняется в профиле, без драматического обряда.', 'You can enable basic protection now. Everything can be changed later in Profile.')}
            </p>
          </div>

          {[
            ['appPin', '🔒', rl('Включить PIN на приложение','Enable app PIN'), rl('PIN можно настроить в профиле после входа.', 'PIN can be configured in Profile later.')],
            ['diaryLock', '📓', rl('Запрашивать пароль для дневника','Require diary password'), rl('Сам пароль задаётся в настройках приватности.', 'The password itself is set in privacy settings.')],
            ['ghostPinHint', '🎭', rl('Показать подсказку про скрытый PIN','Show Ghost PIN hint'), rl('Полезно, если нужен безопасный экран.', 'Useful if you need a safe screen.')],
            ['circleOnlyGeneral', '🫂', rl('В круге по умолчанию показывать только общий статус','Show only general status in Circle by default'), rl('Интим, дневник, лекарства и анализы не открываются без явного разрешения.', 'Intimacy, diary, meds, and labs never open without explicit permission.')],
          ].map(([key, icon, title, desc]) => (
            <button key={key} type="button" onClick={() => setPrivacy(prev => ({ ...prev, [key]: !prev[key] }))} style={{
              padding:'12px 13px', borderRadius:13, border:`1.5px solid ${privacy[key] ? 'var(--accent)' : 'var(--border)'}`,
              background: privacy[key] ? 'var(--accent-soft)' : 'var(--bg2)', color:'var(--text)', cursor:'pointer', textAlign:'left',
              display:'flex', gap:10, alignItems:'flex-start',
            }}>
              <span style={{ fontSize:20 }}>{icon}</span>
              <span style={{ flex:1 }}>
                <span style={{ display:'block', fontSize:14, fontWeight:700 }}>{title}</span>
                <span style={{ display:'block', fontSize:12, color:'var(--text3)', marginTop:4, lineHeight:1.45 }}>{desc}</span>
              </span>
              {privacy[key] && <span style={{ color:'var(--accent)' }}>✓</span>}
            </button>
          ))}

          <div style={{ display:'flex', gap:8 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setStep(2)} style={{ flex:1 }}>{rl('Назад','Back')}</button>
            <button type="button" className="btn btn-primary" onClick={() => setStep(4)} style={{ flex:2 }}>{rl('Посмотреть итог','See summary')}</button>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="card" style={{ padding:16, display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <h2 style={{ fontSize:22, marginBottom:6 }}>{rl('Что Elara будет делать','What Elara will do')}</h2>
            <p style={{ margin:0, fontSize:13, color:'var(--text3)', lineHeight:1.55 }}>
              {rl('Вот что приложение будет показывать, считать и подсказывать. Потом это меняется в меню: Профиль -> Режим тела, Персонализация AI, Приватность, Оформление.', 'Here is what the app will show, calculate, and suggest. You can change it later in Profile -> Body mode, AI personalization, Privacy, Appearance.')}
            </p>
          </div>

          <div style={{ display:'grid', gap:10 }}>
            <div style={{ padding:12, borderRadius:12, background:'var(--bg2)', border:'1px solid var(--border)' }}>
              <div style={{ fontSize:13, fontWeight:800, marginBottom:8 }}>👁 {rl('Показывать','Show')}</div>
              <ul style={{ margin:'0 0 0 18px', padding:0, color:'var(--text2)', fontSize:13, lineHeight:1.65 }}>
                {hint.show.map(item => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <div style={{ padding:12, borderRadius:12, background:'var(--bg2)', border:'1px solid var(--border)' }}>
              <div style={{ fontSize:13, fontWeight:800, marginBottom:8 }}>🧮 {rl('Считать','Calculate')}</div>
              <ul style={{ margin:'0 0 0 18px', padding:0, color:'var(--text2)', fontSize:13, lineHeight:1.65 }}>
                {hint.calculate.map(item => <li key={item}>{item}</li>)}
              </ul>
            </div>
            <div style={{ padding:12, borderRadius:12, background:'var(--bg2)', border:'1px solid var(--border)' }}>
              <div style={{ fontSize:13, fontWeight:800, marginBottom:8 }}>✨ {rl('Подсказывать','Suggest')}</div>
              <ul style={{ margin:'0 0 0 18px', padding:0, color:'var(--text2)', fontSize:13, lineHeight:1.65 }}>
                {hint.suggest.map(item => <li key={item}>{item}</li>)}
              </ul>
            </div>
          </div>

          {!!enabledFromGoals.length && (
            <div>
              <div style={{ fontSize:12, color:'var(--text3)', marginBottom:8 }}>{rl('Активные фокусы','Active focuses')}</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                {enabledFromGoals.slice(0, 18).map(item => (
                  <span key={item} style={{ padding:'5px 8px', borderRadius:999, background:'var(--accent-soft)', color:'var(--accent)', fontSize:11 }}>{item}</span>
                ))}
              </div>
            </div>
          )}

          <div style={{ padding:12, borderRadius:12, background:'rgba(250,204,21,0.08)', border:'1px solid rgba(250,204,21,0.18)', fontSize:12, color:'var(--text2)', lineHeight:1.55 }}>
            {rl('Важно: Elara не ставит диагнозы, не назначает лечение и не меняет дозировки. Она помогает заметить закономерности, собрать данные и подготовиться к врачу.', 'Important: Elara does not diagnose, prescribe, or change dosages. It helps notice patterns, collect data, and prepare for a clinician.')}
          </div>

          <div style={{ display:'flex', gap:8 }}>
            <button type="button" className="btn btn-ghost" onClick={() => setStep(3)} style={{ flex:1 }}>{rl('Назад','Back')}</button>
            <button type="button" className="btn btn-primary" disabled={saving} onClick={finish} style={{ flex:2 }}>
              {saving ? rl('Сохраняю...','Saving...') : rl('Сохранить и начать','Save and start')}
            </button>
          </div>

          {/* Подсказка: где всё найти потом */}
          <div style={{ padding:'12px 14px', background:'rgba(167,139,250,0.06)', borderRadius:12, border:'1px solid rgba(167,139,250,0.2)' }}>
            <div style={{ fontSize:12, color:'var(--accent)', fontWeight:500, marginBottom:8 }}>
              💡 {rl('Где найти всё это потом:', 'Where to find everything later:')}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              {[
                { icon:'🧬', path: rl('Профиль → Режим тела', 'Profile → Body mode'), desc: rl('Цикл, беременность, менопауза, гормоны', 'Cycle, pregnancy, menopause, hormones') },
                { icon:'✦', path: rl('Профиль → Персонализация AI', 'Profile → AI personalization'), desc: rl('Жанры, стиль советов, модули', 'Genres, advice style, modules') },
                { icon:'🔒', path: rl('Профиль → Приватность', 'Profile → Privacy'), desc: rl('Кто видит твои данные', 'Who sees your data') },
                { icon:'👥', path: rl('Круг', 'Circle'), desc: rl('Добавить людей, настроить доступы', 'Add people, manage access') },
                { icon:'💡', path: rl('Профиль → Как работает Elara', 'Profile → How Elara works'), desc: rl('Полный гайд по логике приложения', 'Full guide to app logic') },
              ].map((item, idx) => (
                <div key={idx} style={{ display:'flex', gap:8, alignItems:'flex-start', fontSize:12, color:'var(--text2)' }}>
                  <span style={{ flexShrink:0 }}>{item.icon}</span>
                  <div>
                    <span style={{ color:'var(--text)', fontWeight:500 }}>{item.path}</span>
                    {' — '}{item.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
