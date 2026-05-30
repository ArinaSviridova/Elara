import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import {
  BODY_MODES,
  ACTIVE_CONDITIONS,
  checkCompatibility,
  resolveProfileModules,
  getGenderRecommendationCards,
  BODY_MODULE_LABELS,
} from '../lib/profileModules'

const MODE_RECOMMENDATIONS = {
  menstruating: [
    'Календарь цикла, фазы, боль, объём и симптомы по дням.',
    'Контрацепция, СТМ или овуляция будут доступны как дополнительные модули, если ты их включишь.',
    'Если боль, кровотечение или ПМС повторяются, Elara поможет собрать факты для отчёта врачу.',
  ],
  amenorrhea: [
    'Прогноз цикла отключается, но остаются симптомы, анализы, лекарства, прививки и самочувствие.',
    'Если месячных нет неожиданно, стоит обсудить с врачом стресс, вес, щитовидку, беременность, ГАТ/ЗГТ или препараты.',
  ],
  pregnancy_planning: [
    'Календарь оставляет месячные, овуляцию и фертильное окно, но добавляет фокус на подготовку к беременности.',
    'Elara будет поднимать чекапы, прививки, фолиевую кислоту, ИППП-скрининг и вопросы для врача.',
    'Если выбран партнёр из круга, рекомендации делятся по ролям и полу/режиму тела, а не сваливаются всем одинаковым супом.',
  ],
  pregnancy: [
    'Главный экран переключается на “Малыш”: срок, обследования, симптомы, витамины и красные флаги.',
    'Прививки, назначения и препараты показываются с беременными подсказками.',
    'Прогноз цикла отключается, история цикла сохраняется.',
  ],
  menopause: [
    'Фокус на приливах, сне, настроении, сухости, либидо, давлении и костях.',
    'Можно добавить MRS-тест, чекапы и подсказки по перименопаузе / менопаузе.',
  ],
  prefer_not: [
    'Elara не будет делать предположения о теле.',
    'Останутся дневник, лекарства, анализы, прививки, тесты и общие рекомендации.',
  ],
}

const CONDITION_RECOMMENDATIONS = {
  hormone_therapy: [
    'Добавятся анализы, препараты, настроение, кожа, либидо, сон и осторожные подсказки “обсудить с врачом”.',
    'Elara не меняет референсы анализов сама, а помогает понять, что стоит уточнить у врача.',
  ],
  hormonal_contraception: [
    'Прогнозы цикла могут быть менее точными. Важнее кровотечения, побочки, либидо, настроение и регулярность приёма.',
  ],
  pcos: [
    'Цикл может быть нерегулярным. Полезны акценты на глюкозу / HbA1c, липиды, акне, волосы, вес и овуляцию по показаниям.',
  ],
  endometriosis: [
    'Включается более внимательный трекинг боли, кровотечения, ЖКТ-симптомов, боли при сексе и обезболивающих.',
  ],
  postpartum: [
    'Фокус на сне, настроении, кровотечении, лактации, боли, восстановлении и поддержке.',
  ],
  pregnancy_planning_marker: [
    'Добавится фокус подготовки к беременности: овуляция, фертильное окно, чекапы, прививки, ИППП-скрининг и подготовка партнёра.',
    'Этот маркер можно включить как дополнительное состояние, даже если основной режим тела остаётся “Есть месячные”.',
  ],
  iud_copper: [
    'Может влиять на обильность и болезненность месячных. Elara будет внимательнее к кровотечению и боли.',
  ],
  other_condition: [
    'Можно добавить заметки, симптомы, анализы и назначения вручную.',
  ],
}

const FALLBACK_BODY_MODES = [
  { key: 'menstruating', ru: 'Есть месячные', en: 'Periods', emoji: '🩸' },
  { key: 'amenorrhea', ru: 'Нет месячных / аменорея', en: 'No periods / amenorrhea', emoji: '🌿' },
  { key: 'pregnancy_planning', ru: 'Подготовка к беременности', en: 'Pregnancy planning', emoji: '🕊' },
  { key: 'pregnancy', ru: 'Беременность', en: 'Pregnancy', emoji: '🤰' },
  { key: 'menopause', ru: 'Менопауза / перименопауза', en: 'Menopause / perimenopause', emoji: '🌸' },
  { key: 'prefer_not', ru: 'Не хочу указывать', en: 'Prefer not to say', emoji: '🔒' },
]

const FALLBACK_CONDITIONS = [
  { key: 'hormone_therapy', ru: 'Гормональная терапия (ГАТ/ЗГТ)', en: 'Hormone therapy', emoji: '💉' },
  { key: 'hormonal_contraception', ru: 'Гормональные контрацептивы', en: 'Hormonal contraception', emoji: '💊' },
  { key: 'pcos', ru: 'СПКЯ', en: 'PCOS', emoji: '🌀' },
  { key: 'endometriosis', ru: 'Эндометриоз', en: 'Endometriosis', emoji: '⚡' },
  { key: 'postpartum', ru: 'Послеродовой период', en: 'Postpartum', emoji: '👶' },
  { key: 'pregnancy_planning_marker', ru: 'Подготовка к беременности', en: 'Pregnancy planning', emoji: '🕊' },
  { key: 'breastfeeding', ru: 'Кормление / лактация', en: 'Breastfeeding / lactation', emoji: '🍼' },
  { key: 'dysphoria_tracking', ru: 'Дневник дисфории', en: 'Dysphoria diary', emoji: '⚧' },
  { key: 'iud_copper', ru: 'Медная спираль', en: 'Copper IUD', emoji: '🧷' },
  { key: 'other_condition', ru: 'Другое состояние', en: 'Other condition', emoji: '✍️' },
]

const MODULE_LABELS = {
  cycle: ['Цикл', 'Cycle', '🩸'],
  periodPrediction: ['Прогноз месячных', 'Period forecast', '📅'],
  ovulationPrediction: ['Овуляция', 'Ovulation', '✨'],
  bleedingTracking: ['Кровотечения', 'Bleeding', '🩸'],
  preconception: ['Подготовка к беременности', 'Pregnancy planning', '🕊'],
  pregnancyPlanning: ['Планирование', 'Planning', '🧬'],
  pregnancy: ['Беременность', 'Pregnancy', '👶'],
  menopause: ['Менопауза', 'Menopause', '🌸'],
  hormones: ['Гормоны', 'Hormones', '💉'],
  contraception: ['Контрацепция', 'Contraception', '🛡'],
  symptoms: ['Симптомы', 'Symptoms', '🌡'],
  medications: ['Таблетки', 'Medications', '💊'],
  sexualHealth: ['Сексуальное здоровье', 'Sexual health', '🌹'],
  socialSync: ['Круг', 'Circle', '🔄'],
  painTracking: ['Боль', 'Pain', '⚡'],
  moodTracking: ['Настроение', 'Mood', '🌙'],
  hotFlashes: ['Приливы', 'Hot flashes', '🔥'],
  postpartum: ['Послеродовой', 'Postpartum', '🫂'],
  lactation: ['Лактация', 'Lactation', '🍼'],
  dysphoria: ['Дисфория', 'Dysphoria', '⚧'],
}

function label(item, lang) {
  return `${item.emoji || ''} ${lang === 'en' ? item.en : item.ru}`.trim()
}

function safeBodyModes() {
  return Array.isArray(BODY_MODES) && BODY_MODES.length ? BODY_MODES : FALLBACK_BODY_MODES
}

function safeConditions() {
  return Array.isArray(ACTIVE_CONDITIONS) && ACTIVE_CONDITIONS.length
    ? ACTIVE_CONDITIONS
    : FALLBACK_CONDITIONS
}

function isPlanning(bodyMode, conditions = []) {
  return bodyMode === 'pregnancy_planning' || conditions.includes('pregnancy_planning_marker')
}

function sanitizeConditionsForBodyMode(bodyMode, conditions = []) {
  const list = Array.isArray(conditions) ? conditions : []
  if (bodyMode === 'pregnancy_planning') {
    return list.filter(key => key !== 'pregnancy_planning_marker' && key !== 'pregnancy_planning')
  }
  return list
}

function genderBucket(gender) {
  if (['cis_man', 'male', 'man', 'trans_woman'].includes(gender)) return 'sperm'
  if (['cis_woman', 'female', 'woman', 'trans_man'].includes(gender)) return 'cycle'
  return 'neutral'
}

function planningRecommendations({ selfGender, partner, rl }) {
  const self = genderBucket(selfGender)
  const partnerGender = genderBucket(partner?.gender || partner?.gender_identity)
  const list = []

  list.push({
    icon: '🩺',
    title: rl('База для обоих', 'Baseline for both'),
    text: rl(
      'ИППП-скрининг, прививки, хронические состояния, лекарства и вопросы врачу. Романтика, конечно, но с чеклистом, потому что тела любят бюрократию.',
      'STI screening, vaccines, chronic conditions, meds, and doctor questions.'
    ),
    path: '/health',
  })

  if (self === 'cycle') {
    list.push({ icon:'✨', title:rl('Овуляция и фертильное окно', 'Ovulation and fertile window'), text:rl('Календарь будет подсвечивать фертильные дни, овуляцию и дни, когда лучше не перегружаться.', 'Calendar highlights fertile days, ovulation, and lower-load days.'), path:'/calendar' })
    list.push({ icon:'💊', title:rl('Фолиевая кислота и препараты', 'Folic acid and meds'), text:rl('Добавь добавки и препараты в трекер, чтобы не держать всё в голове, этот хрупкий орган и так занят.', 'Track supplements and meds instead of keeping everything in your head.'), path:'/medications' })
  }

  if (self === 'sperm') {
    list.push({ icon:'🧬', title:rl('Мужской вклад в планирование', 'Male-factor planning'), text:rl('Elara поднимет ИППП-скрининг, прививки, лекарства, образ жизни и вопросы про спермограмму, если это актуально.', 'Elara highlights STI screening, vaccines, meds, lifestyle, and semen analysis questions when relevant.'), path:'/health' })
  }

  if (partner) {
    if (partnerGender === 'sperm') {
      list.push({ icon:'👤', title:rl(`Партнёр: ${partner.name}`, `Partner: ${partner.name}`), text:rl('Для партнёра со сперматозоидами: ИППП, прививки, лекарства, перегрев, алкоголь/никотин и спермограмма по показаниям.', 'For a sperm-producing partner: STI screening, vaccines, meds, heat exposure, alcohol/nicotine, and semen analysis when indicated.'), path:`/person/${partner.id}` })
    } else if (partnerGender === 'cycle') {
      list.push({ icon:'👥', title:rl(`Партнёрка: ${partner.name}`, `Partner: ${partner.name}`), text:rl('Если беременность планирует партнёрка с циклом, Elara будет смотреть её календарь доступа: овуляцию, фертильное окно, ПМС и нагрузку.', 'If the cycle-owning partner is planning pregnancy, Elara uses shared access: ovulation, fertile window, PMS, and load.'), path:`/person/${partner.id}` })
    } else {
      list.push({ icon:'🌈', title:rl('Пара без шаблонов', 'Non-template couple'), text:rl('Для гомо/квир-пар рекомендации зависят не от ярлыка пары, а от того, у кого есть цикл, кто вынашивает, нужен ли донор/клиника и что открыто в доступ.', 'For queer couples, recommendations depend on cycle, carrying partner, donor/clinic needs, and shared access.'), path:'/friends' })
    }
  } else {
    list.push({ icon:'👥', title:rl('Партнёр не выбран', 'No partner selected'), text:rl('Пока рекомендации индивидуальные. Если партнёр есть в круге, выбери его ниже, и Elara начнёт учитывать его пол/режим тела и доступы.', 'For now recommendations are individual. Choose a partner from Circle to include their gender/body mode and shared access.'), path:'/friends' })
  }

  return list
}

function focusCards({ modules, bodyMode, activeConditions, partner, profile, rl }) {
  const planning = isPlanning(bodyMode, activeConditions)
  if (planning) return planningRecommendations({ selfGender: profile?.gender || profile?.gender_identity, partner, rl })

  const cards = []
  if (modules.cycle) cards.push({ icon:'🩸', title:rl('Календарь цикла', 'Cycle calendar'), text:rl('Фазы, месячные, ПМС, овуляция и нагрузка по дням.', 'Phases, periods, PMS, ovulation, and daily load.'), path:'/calendar' })
  if (modules.pregnancy) cards.push({ icon:'👶', title:rl('Беременность', 'Pregnancy'), text:rl('Недели, обследования, симптомы, препараты и красные флаги.', 'Weeks, checkups, symptoms, meds, and red flags.'), path:'/pregnancy' })
  if (modules.menopause) cards.push({ icon:'🌸', title:rl('Ритм и симптомы', 'Rhythm and symptoms'), text:rl('Сон, приливы, настроение, сухость, давление и чекапы.', 'Sleep, hot flashes, mood, dryness, blood pressure, and checkups.'), path:'/calendar' })
  if (modules.hormones) cards.push({ icon:'💉', title:rl('Гормоны и анализы', 'Hormones and labs'), text:rl('Препараты, анализы, настроение, кожа, либидо и вопросы врачу.', 'Meds, labs, mood, skin, libido, and doctor questions.'), path:'/health' })
  cards.push({ icon:'🩺', title:rl('Здоровье', 'Health'), text:rl('Анализы, назначения, прививки и симптомы остаются под рукой.', 'Labs, prescriptions, vaccines, and symptoms stay visible.'), path:'/health' })
  return cards
}

function moduleText(key, lang) {
  const item = MODULE_LABELS[key]
  if (!item) return key
  return `${item[2]} ${lang === 'en' ? item[1] : item[0]}`
}

const cardButtonStyle = {
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'linear-gradient(135deg, rgba(255,255,255,0.07), rgba(255,255,255,0.025))',
  color: 'var(--text)',
  borderRadius: 18,
  padding: 13,
  textAlign: 'left',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  gap: 7,
  minHeight: 118,
  boxShadow: '0 12px 26px rgba(0,0,0,0.18)',
}

export default function BodyModePage() {
  const navigate = useNavigate()
  const { profile, updateProfile, user } = useAuth()
  const { lang } = useLang()
  const rl = (ru, en) => (lang === 'en' ? en : ru)

  const modes = safeBodyModes()
  const conditions = safeConditions()

  const [bodyMode, setBodyMode] = useState(profile?.body_mode || 'prefer_not')
  const [activeConditions, setActiveConditions] = useState(profile?.active_conditions || [])
  const [conditionToAdd, setConditionToAdd] = useState('')
  const [openBlock, setOpenBlock] = useState('focus')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [circlePeople, setCirclePeople] = useState([])
  const [planningPartnerId, setPlanningPartnerId] = useState(profile?.health?.preconception_partner_id || '')

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    supabase
      .from('friendships')
      .select('friend_id, relation_type, friend:friend_id(*)')
      .eq('owner_id', user.id)
      .then(({ data, error }) => {
        if (cancelled || error) return
        setCirclePeople((data || []).map(row => ({
          id: row.friend_id,
          name: row.friend?.name || rl('Пользователь', 'User'),
          gender: row.friend?.gender || row.friend?.gender_identity || 'prefer_not',
          body_mode: row.friend?.body_mode || 'prefer_not',
          relation_type: row.relation_type || 'friend',
          color: row.friend?.avatar_color,
        })))
      })
    return () => { cancelled = true }
  }, [user?.id, lang])

  const selectedMode = modes.find(mode => mode.key === bodyMode)
  const effectiveConditions = sanitizeConditionsForBodyMode(bodyMode, activeConditions)
  const selectedConditions = conditions.filter(condition => effectiveConditions.includes(condition.key))
  const availableConditions = conditions.filter(condition => !effectiveConditions.includes(condition.key) && !(bodyMode === 'pregnancy_planning' && condition.key === 'pregnancy_planning_marker'))
  const planningActive = isPlanning(bodyMode, effectiveConditions)
  const selectedPartner = circlePeople.find(person => person.id === planningPartnerId) || null
  const genderCards = getGenderRecommendationCards({ ...(profile || {}), body_mode: bodyMode, active_conditions: effectiveConditions }, lang)

  const modules = useMemo(() => {
    try {
      return resolveProfileModules({
        ...profile,
        body_mode: bodyMode,
        active_conditions: effectiveConditions,
      })
    } catch (error) {
      return {}
    }
  }, [profile, bodyMode, effectiveConditions])

  const warnings = useMemo(() => {
    try {
      return checkCompatibility(bodyMode, effectiveConditions, profile?.gender || profile?.gender_identity) || []
    } catch (error) {
      return []
    }
  }, [bodyMode, effectiveConditions, profile?.gender, profile?.gender_identity])

  const recommendations = useMemo(() => {
    const list = [...(MODE_RECOMMENDATIONS[bodyMode] || [])]
    effectiveConditions.forEach(key => list.push(...(CONDITION_RECOMMENDATIONS[key] || [])))
    return list.length
      ? list
      : [rl('Elara будет показывать только базовые разделы здоровья и не делать лишних предположений.', 'Elara will show only basic health sections and avoid extra assumptions.')]
  }, [bodyMode, effectiveConditions, rl])

  const cards = useMemo(() => focusCards({ modules, bodyMode, activeConditions: effectiveConditions, partner: selectedPartner, profile, rl }), [modules, bodyMode, activeConditions, selectedPartner, profile, rl])

  function addCondition(key) {
    if (!key) return
    setActiveConditions(prev => (prev.includes(key) ? prev : [...prev, key]))
    setConditionToAdd('')
  }

  function removeCondition(key) {
    setActiveConditions(prev => prev.filter(item => item !== key))
    if (key === 'pregnancy_planning_marker' && bodyMode !== 'pregnancy_planning') setPlanningPartnerId('')
  }

  async function save() {
    try {
      setSaving(true)
      setSaved(false)
      const nextHealth = {
        ...(profile?.health || {}),
        preconception_partner_id: planningActive ? planningPartnerId || null : null,
        preconception_partner_name: planningActive ? selectedPartner?.name || null : null,
        preconception_partner_gender: planningActive ? selectedPartner?.gender || null : null,
      }

      await updateProfile({
        body_mode: bodyMode,
        active_conditions: effectiveConditions,
        health: nextHealth,
      })

      setSaved(true)
      setTimeout(() => setSaved(false), 1600)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-enter" style={{ flex:1, overflowY:'auto', padding:'18px 16px 28px', display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
        <button type="button" onClick={() => navigate('/profile')} className="btn btn-ghost" style={{ width:'auto', padding:'8px 11px', marginTop:2 }}>‹</button>
        <div style={{ flex:1, minWidth:0 }}>
          <h2 style={{ fontSize:28, marginBottom:4 }}>🧬 {rl('Режим тела и рекомендации', 'Body mode and recommendations')}</h2>
          <p style={{ margin:0, fontSize:12, color:'var(--text3)', lineHeight:1.5 }}>
            {rl('Здесь выбирается медицинская логика приложения: что считать, что подсвечивать и какие вкладки поднимать наверх.', 'This controls app logic: what to calculate, highlight, and prioritize.')}
          </p>
        </div>
      </div>

      <div className="card" style={{ display:'flex', flexDirection:'column', gap:10, border:'1px solid rgba(167,139,250,0.25)', background:'linear-gradient(135deg, rgba(167,139,250,0.10), rgba(74,222,128,0.06))' }}>
        <div style={{ fontSize:13, fontWeight:800 }}>🧭 {rl('Проверка логики по профилю', 'Profile logic check')}</div>
        {genderCards.map(card => (
          <div key={card.key} style={{ padding:'9px 10px', borderRadius:12, background:'rgba(255,255,255,0.035)', border:'1px solid var(--border)' }}>
            <div style={{ fontSize:13, fontWeight:700 }}>{card.icon} {card.title}</div>
            <div style={{ fontSize:12, color:'var(--text2)', lineHeight:1.5 }}>{card.text}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding:15, borderColor: planningActive ? 'rgba(74,222,128,0.32)' : 'var(--border)' }}>
        <label style={{ display:'block', fontSize:12, color:'var(--text3)', marginBottom:8, letterSpacing:1.2, textTransform:'uppercase' }}>{rl('Режим тела', 'Body mode')}</label>
        <select value={bodyMode} onChange={event => {
          const nextMode = event.target.value
          setBodyMode(nextMode)
          if (nextMode === 'pregnancy_planning') {
            setActiveConditions(prev => sanitizeConditionsForBodyMode(nextMode, prev))
          }
          if (nextMode !== 'pregnancy_planning') setPlanningPartnerId('')
        }} style={{ width:'100%', padding:'14px 14px', borderRadius:14, background:'var(--bg3)', border:'1px solid var(--border)', color:'var(--text)', fontSize:15, outline:'none' }}>
          {modes.map(mode => <option key={mode.key} value={mode.key}>{label(mode, lang)}</option>)}
        </select>
        <div style={{ marginTop:10, fontSize:12, color:'var(--text3)', lineHeight:1.5 }}>
          {selectedMode?.description_ru || selectedMode?.description_en ? (lang === 'en' ? selectedMode.description_en : selectedMode.description_ru) : rl('Это влияет на календарь, рекомендации, видимые разделы и отчёты.', 'This affects calendar, recommendations, visible sections, and reports.')}
        </div>
      </div>

      <div className="card" style={{ padding:15 }}>
        <label style={{ display:'block', fontSize:12, color:'var(--text3)', marginBottom:8, letterSpacing:1.2, textTransform:'uppercase' }}>{rl('Дополнительные состояния', 'Additional states')}</label>
        <select value={conditionToAdd} onChange={event => { setConditionToAdd(event.target.value); addCondition(event.target.value) }} style={{ width:'100%', padding:'13px 14px', borderRadius:14, background:'var(--bg3)', border:'1px solid var(--border)', color:'var(--text)', fontSize:14, outline:'none' }}>
          <option value="">{rl('Добавить состояние...', 'Add a state...')}</option>
          {availableConditions.map(condition => <option key={condition.key} value={condition.key}>{label(condition, lang)}</option>)}
        </select>

        {selectedConditions.length > 0 ? (
          <div style={{ marginTop:12, display:'flex', flexWrap:'wrap', gap:8 }}>
            {selectedConditions.map(condition => (
              <button key={condition.key} type="button" onClick={() => removeCondition(condition.key)} title={rl('Нажми, чтобы убрать', 'Click to remove')} style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'7px 10px', borderRadius:999, border:'1px solid var(--accent)', background:'var(--accent-soft)', color:'var(--accent)', fontSize:12, cursor:'pointer' }}>
                <span>{condition.emoji}</span><span>{lang === 'en' ? condition.en : condition.ru}</span><span style={{ opacity:0.8 }}>×</span>
              </button>
            ))}
          </div>
        ) : <div style={{ marginTop:10, fontSize:12, color:'var(--text3)', lineHeight:1.5 }}>{rl('Дополнительные состояния не выбраны.', 'No additional states selected.')}</div>}
      </div>

      {planningActive && (
        <div className="card" style={{ padding:15, borderColor:'rgba(74,222,128,0.35)', background:'linear-gradient(180deg, rgba(74,222,128,0.08), rgba(255,255,255,0.02))' }}>
          <div style={{ fontSize:13, fontWeight:800, marginBottom:6 }}>🕊 {rl('Подготовка к беременности', 'Pregnancy planning')}</div>
          <p style={{ margin:'0 0 12px', fontSize:12, color:'var(--text3)', lineHeight:1.55 }}>
            {rl('Можно планировать индивидуально или выбрать партнёра из круга. Тогда подсказки будут учитывать пол/режим тела партнёра и то, что он открыл в доступ.', 'Plan individually or choose a Circle partner. Recommendations then account for partner gender/body mode and shared access.')}
          </p>
          <select value={planningPartnerId} onChange={event => setPlanningPartnerId(event.target.value)} style={{ width:'100%', padding:'13px 14px', borderRadius:14, background:'var(--bg3)', border:'1px solid var(--border)', color:'var(--text)', fontSize:14, outline:'none' }}>
            <option value="">{rl('Партнёр не выбран - индивидуальные рекомендации', 'No partner - individual recommendations')}</option>
            {circlePeople.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
          </select>
          {!circlePeople.length && <div style={{ marginTop:10, fontSize:12, color:'var(--text3)', lineHeight:1.5 }}>{rl('В круге пока нет людей. Добавь партнёра в “Круг”, и он появится здесь.', 'No people in Circle yet. Add a partner to Circle and they will appear here.')}</div>}
        </div>
      )}

      <div className="card" style={{ padding:15 }}>
        <button type="button" onClick={() => setOpenBlock(openBlock === 'focus' ? null : 'focus')} style={{ width:'100%', border:'none', background:'transparent', color:'var(--text)', padding:0, display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer', textAlign:'left' }}>
          <span style={{ fontSize:13, fontWeight:800 }}>🎯 {rl('Что будет подсвечено', 'What will be highlighted')}</span>
          <span style={{ color:'var(--text3)' }}>{openBlock === 'focus' ? '⌃' : '⌄'}</span>
        </button>
        {openBlock === 'focus' && (
          <div style={{ marginTop:12, display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(170px, 1fr))', gap:10 }}>
            {cards.map((card, index) => (
              <button key={`${card.title}-${index}`} type="button" onClick={() => navigate(card.path)} style={cardButtonStyle}>
                <span style={{ fontSize:24 }}>{card.icon}</span>
                <span style={{ fontSize:13, fontWeight:800 }}>{card.title}</span>
                <span style={{ fontSize:11, color:'var(--text3)', lineHeight:1.45 }}>{card.text}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {!!warnings.length && (
        <div className="card" style={{ padding:15, borderColor:'rgba(250,204,21,0.28)' }}>
          <div style={{ fontSize:13, fontWeight:700, marginBottom:8 }}>⚠️ {rl('Важные уточнения', 'Important notes')}</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {warnings.map((warning, index) => <div key={index} style={{ fontSize:12, color:'var(--text2)', lineHeight:1.55 }}>{lang === 'en' ? warning.message_en : warning.message_ru}</div>)}
          </div>
        </div>
      )}

      <div className="card" style={{ padding:15 }}>
        <button type="button" onClick={() => setOpenBlock(openBlock === 'recommendations' ? null : 'recommendations')} style={{ width:'100%', border:'none', background:'transparent', color:'var(--text)', padding:0, display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer', textAlign:'left' }}>
          <span style={{ fontSize:13, fontWeight:700 }}>✨ {rl('Рекомендации', 'Recommendations')}</span>
          <span style={{ color:'var(--text3)' }}>{openBlock === 'recommendations' ? '⌃' : '⌄'}</span>
        </button>
        {openBlock === 'recommendations' && (
          <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:9 }}>
            {recommendations.map((item, index) => <div key={index} style={{ padding:'10px 12px', borderRadius:11, background:'var(--bg3)', color:'var(--text2)', fontSize:12, lineHeight:1.55 }}>{item}</div>)}
          </div>
        )}
      </div>

      <div className="card" style={{ padding:15 }}>
        <button type="button" onClick={() => setOpenBlock(openBlock === 'modules' ? null : 'modules')} style={{ width:'100%', border:'none', background:'transparent', color:'var(--text)', padding:0, display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer', textAlign:'left' }}>
          <span style={{ fontSize:13, fontWeight:700 }}>{rl('Активные модули', 'Active modules')}</span>
          <span style={{ color:'var(--text3)' }}>{openBlock === 'modules' ? '⌃' : '⌄'}</span>
        </button>
        {openBlock === 'modules' && (
          <div style={{ marginTop:12, display:'flex', flexWrap:'wrap', gap:8 }}>
            {Object.entries(modules).filter(([, value]) => value === true).map(([key]) => <span key={key} style={{ padding:'6px 9px', borderRadius:999, background:'var(--accent-soft)', color:'var(--accent)', fontSize:11 }}>{moduleText(key, lang)}</span>)}
            {!Object.values(modules).some(Boolean) && <span style={{ fontSize:12, color:'var(--text3)' }}>{rl('Пока только базовые разделы.', 'Only basic sections for now.')}</span>}
          </div>
        )}
      </div>

      <button type="button" onClick={save} disabled={saving} className="btn btn-primary">
        {saving ? rl('Сохраняю...', 'Saving...') : saved ? '✓' : rl('Сохранить', 'Save')}
      </button>
    </div>
  )
}
