import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import InfoTooltip from '../components/InfoTooltip'
import { FLOW_OPTIONS } from '../lib/periodPatterns'
import { isPregnancyPlanningActive, loadPregnancyToggles, savePregnancyToggles, pregnancyPlanningItems, togglePregnancyItemStatus, loadPregnancyDrafts, addPregnancyDraft, removePregnancyDraft } from '../lib/pregnancyPlanningUi'

// Типы месячных для профиля
export const PERIOD_COLORS = [
  { key:'bright_red', ru:'Ярко-красные (свежая кровь)', emoji:'🔴' },
  { key:'dark_brown', ru:'Тёмно-коричневые (окислившаяся кровь)', emoji:'🟤' },
  { key:'black', ru:'Чёрные (застойная кровь)', emoji:'⚫' },
  { key:'pink', ru:'Розовые (разбавленные слизью)', emoji:'🩷' },
  { key:'orange_grey', ru:'Оранжевые/серые ⚠️ (возможна инфекция)', emoji:'🟠' },
]

export const PERIOD_CONSISTENCY = [
  { key:'liquid', ru:'Жидкие и однородные' },
  { key:'clots', ru:'Со сгустками (фрагменты эндометрия)' },
  { key:'mucous', ru:'Слизистые' },
  { key:'watery', ru:'Водянистые' },
]

export const PERIOD_PAIN = [
  { key:'none', ru:'Безболезненные (норма)' },
  { key:'mild', ru:'Тянущие (лёгкий дискомфорт)' },
  { key:'cramps', ru:'Схваткообразные (интенсивные)' },
  { key:'sharp', ru:'Острые ⚠️ (требуют внимания врача)' },
  { key:'primary_dysm', ru:'Первичная альгодисменорея (физиологическая)' },
  { key:'secondary_dysm', ru:'Вторичная альгодисменорея (патологическая)' },
]

export const PERIOD_VOLUME = [
  { key:'spotting', ru:'Скудные (мажущие)' },
  { key:'normal', ru:'Нормальные (умеренные)' },
  { key:'heavy', ru:'Обильные (профузные)' },
  { key:'prolonged', ru:'Затяжные (более 7–8 дней)' },
  { key:'short', ru:'Короткие (менее 2 дней)' },
]

const CONTRACEPTION_TYPES = [
  { key:'none', ru:'Без контрацепции', emoji:'❌' },
  { key:'condom', ru:'Презерватив', emoji:'🛡' },
  { key:'pill', ru:'Гормональные таблетки', emoji:'💊' },
  { key:'iud_copper', ru:'Спираль (медная)', emoji:'🔩' },
  { key:'iud_hormone', ru:'Спираль (гормональная)', emoji:'🌀' },
  { key:'implant', ru:'Подкожный имплант', emoji:'💉' },
  { key:'patch', ru:'Пластырь', emoji:'🩹' },
  { key:'ring', ru:'Вагинальное кольцо', emoji:'💍' },
  { key:'injection', ru:'Инъекция (Депо-Провера)', emoji:'🩺' },
  { key:'interrupted', ru:'Прерванный половой акт', emoji:'⏸' },
  { key:'calendar', ru:'Календарный метод', emoji:'📅' },
  { key:'stm', ru:'СТМ / симптотермальный метод', emoji:'🌡️' },
  { key:'emergency', ru:'Экстренная контрацепция (Эскапел и т.п.)', emoji:'🆘' },
  { key:'sterilization', ru:'Стерилизация', emoji:'♾' },
]

const CHRONIC_DISEASES = [
  '🩸 Эндометриоз', '🌀 СПКЯ (синдром поликистозных яичников)', '🔴 Миома матки',
  '🧬 Аденомиоз', '💔 Тиреоидит/гипотиреоз', '🔵 Гипертиреоз',
  '🩺 Сахарный диабет 1 типа', '🩺 Сахарный диабет 2 типа',
  '💊 Антифосфолипидный синдром', '🫀 Заболевания сердца',
  '🧠 Депрессия', '🌪 Тревожное расстройство', '🧠 Биполярное расстройство',
  '💫 Мигрень', '🦴 Остеопороз', '🌿 Анемия', '🔬 ВПЧ',
  '🦠 ВИЧ', '💉 Гепатит B/C', '🌸 Вульводиния', '🔥 Интерстициальный цистит',
  '🩹 Хроническая боль', '🌾 Целиакия', '🥛 Непереносимость лактозы',
  '🧬 Синдром Тернера', '💜 Синдром Рейно',
]

export default function HealthPage() {
  const { user, profile, updateProfile } = useAuth()
  const { t, lang } = useLang()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const rl = (ru, en) => lang === 'en' ? en : ru
  const pregnancyActive = isPregnancyPlanningActive(profile)
  const [pregnancyToggles, setPregnancyToggles] = useState(() => loadPregnancyToggles(user?.id))
  const [pregnancyDrafts, setPregnancyDrafts] = useState(() => loadPregnancyDrafts(user?.id))
  const [expandedPregnancy, setExpandedPregnancy] = useState({})

  const [tab, setTab] = useState(params.get('tab') === 'assignments' ? 'assignments' : (params.get('pregnancy') ? 'pregnancy' : 'body')) // body | period | contraception | diseases | meds
  const [height, setHeight] = useState(profile?.health?.height || '')
  const [weight, setWeight] = useState(profile?.health?.weight || '')
  const [birthDate, setBirthDate] = useState(profile?.birth_date || '')
  const [contraception, setContraception] = useState(profile?.health?.contraception || 'none')
  const [diseases, setDiseases] = useState([...new Set(profile?.health?.diseases || [])])
  const [customDisease, setCustomDisease] = useState('')
  const [cycleRegularity, setCycleRegularity] = useState(profile?.health?.cycle_regularity || 'unknown')
  const [avgCycleLength, setAvgCycleLength] = useState(profile?.health?.avg_cycle_length || 28)
  const [avgPeriodLength, setAvgPeriodLength] = useState(profile?.health?.avg_period_length || 5)
  const [periodVolume, setPeriodVolume] = useState(profile?.health?.period_volume || 'medium')
  const [painBeginning, setPainBeginning] = useState(profile?.health?.period_pain_pattern?.beginning ?? 4)
  const [painMiddle, setPainMiddle] = useState(profile?.health?.period_pain_pattern?.middle ?? 2)
  const [painEnd, setPainEnd] = useState(profile?.health?.period_pain_pattern?.end ?? 1)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [selectedConditionInfo, setSelectedConditionInfo] = useState(null)
  const [hasNutritionMenu, setHasNutritionMenu] = useState(false)

  // Проверяем есть ли меню питания
  useEffect(() => {
    if (!user?.id) return
    try {
      const raw = localStorage.getItem(`elara_last_menu_${user.id}`)
      setHasNutritionMenu(!!raw)
    } catch {}
  }, [user?.id])

  // ИМТ
  const bmi = height && weight ? (parseFloat(weight) / ((parseFloat(height)/100)**2)).toFixed(1) : null
  const bmiLabel = bmi
    ? bmi < 18.5 ? '⚠️ Недостаточный вес'
    : bmi < 25 ? '✓ Норма'
    : bmi < 30 ? '⚠️ Избыточный вес'
    : '⚠️ Ожирение'
    : ''

  async function handleSave() {
    setSaving(true)
    await updateProfile({
      birth_date: birthDate || null,
      health: {
        ...(profile?.health || {}),
        height: height ? parseFloat(height) : null,
        weight: weight ? parseFloat(weight) : null,
        contraception,
        diseases,
        cycle_regularity: cycleRegularity,
        avg_cycle_length: avgCycleLength,
        avg_period_length: avgPeriodLength,
        period_volume: periodVolume,
        period_pain_pattern: {
          beginning: Number(painBeginning),
          middle: Number(painMiddle),
          end: Number(painEnd),
        },
      }
    })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function toggleDisease(d) {
    setDiseases(prev => prev.includes(d) ? prev.filter(x=>x!==d) : [...prev, d])
  }

  function conditionPlainName(condition) {
    return String(condition || '').replace(/[🩸🌀🔴🧬💔🔵🩺💊🫀🧠🌪💫🦴🌿🔬🦠🌸🔥🩹🌾🥛⚡]/g, '').trim()
  }

  function buildAiConditionNote(condition) {
    const name = conditionPlainName(condition) || rl('это состояние', 'this condition')
    return {
      description: rl(
        `${name}: справочное описание добавлено локально. Elara не ставит диагноз и не назначает лечение. Это состояние стоит обсудить с врачом, особенно если есть симптомы, планирование беременности, лекарства, спорт или контрацепция.`,
        `${name}: reference description added locally. Elara does not diagnose or prescribe treatment. Discuss it with a clinician, especially if you have symptoms, pregnancy planning, medications, sport, or contraception questions.`
      ),
      questions: [
        rl(`Какие обследования или контроль нужны при состоянии: ${name}?`, `Which checks or follow-up are needed for ${name}?`),
        rl('Есть ли ограничения по спорту, лекарствам, беременности или контрацепции?', 'Are there any limits around sport, medications, pregnancy, or contraception?'),
        rl('Какие симптомы должны стать поводом обратиться за помощью быстрее?', 'Which symptoms should prompt earlier medical help?'),
      ],
    }
  }

  async function addAiConditionDescription(condition) {
    // loading
    setSelectedConditionInfo(prev => prev ? { ...prev, aiLoading: true } : prev)

    try {
      const { data, error } = await supabase.functions.invoke('ai-advisor', {
        body: { requestType: 'describe_condition', userId: user.id, condition, language: lang }
      })
      if (!error) {
        const aiText = data?.description || ''
        if (aiText && aiText.length > 20) {
          setSelectedConditionInfo(prev => prev ? { ...prev, aiLoading: false, aiDescription: aiText } : prev)
          const nextHealth = { ...(profile?.health || {}),
            condition_notes: { ...(profile?.health?.condition_notes||{}), [condition]: { description: aiText, questions: [] } },
            condition_sources: { ...(profile?.health?.condition_sources||{}), [condition]: rl('AI — Elara', 'AI — Elara') },
          }
          await updateProfile({ health: nextHealth })
          return
        }
      }
    } catch (err) {
      console.warn('AI condition:', err)
      // 400 = edge function не задеплоена с новым хэндлером
      setSelectedConditionInfo(prev => prev ? {
        ...prev, aiLoading: false,
        aiDescription: null,
        aiError: lang === 'en'
          ? 'AI service unavailable. Try later or deploy the updated edge function.'
          : 'AI сервис недоступен. Попробуй позже или задеплой обновлённую edge function.'
      } : prev)
    }

    // Fallback
    const note = buildAiConditionNote(condition)
    const nextHealth = { ...(profile?.health || {}),
      condition_notes: { ...(profile?.health?.condition_notes||{}), [condition]: note },
      condition_sources: { ...(profile?.health?.condition_sources||{}),
        [condition]: rl('AI-черновик Elara, проверь с врачом', 'Elara AI draft, verify with clinician') },
    }
    await updateProfile({ health: nextHealth })
    setSelectedConditionInfo(prev => prev ? {
      ...prev, aiLoading: false, aiDescription: note.description,
      description: note.description, questions: note.questions,
    } : prev)
  }

  function conditionInfo(condition) {
    const notes = profile?.health?.condition_notes || {}
    const sources = profile?.health?.condition_sources || {}
    const assignments = profile?.health?.assignments || []
    const linkedAssignments = assignments.filter(a => {
      const hay = `${a.title || ''} ${a.text || ''} ${a.note || ''} ${a.condition || ''}`.toLowerCase()
      return hay.includes(String(condition).replace(/[🩸🌀🔴🧬💔🔵🩺💊🫀🧠🌪💫🦴🌿🔬🦠🌸🔥🩹🌾🥛]/g,'').trim().toLowerCase().slice(0, 12))
    })
    return {
      title: condition,
      description: notes[condition]?.description || notes[condition] || rl('Это состояние добавлено вручную или распознано AI. Elara может учитывать его в рекомендациях, но не ставит диагноз и не заменяет врача. Проверь формулировку, источник и связанные назначения.', 'This condition was added manually or detected by AI. Elara may use it for recommendations, but it is not a diagnosis or a doctor replacement. Check wording, source and linked assignments.'),
      source: sources[condition] || rl('Источник не указан', 'Source not specified'),
      assignments: linkedAssignments,
      questions: notes[condition]?.questions || [rl('Какие обследования или наблюдения нужны именно в моём случае?', 'Which checks or follow-up do I need personally?'), rl('Влияет ли это на спорт, лекарства, беременность или контрацепцию?', 'Does this affect sport, meds, pregnancy or contraception?')],
    }
  }

  function togglePregnancyItem(itemId) {
    const next = { ...pregnancyToggles, [itemId]: togglePregnancyItemStatus(pregnancyToggles?.[itemId]) }
    setPregnancyToggles(next)
    savePregnancyToggles(user?.id, next)
  }

  function handlePregnancyAction(item, action) {
    if (!action) return
    if (action.kind === 'navigate') {
      navigate(action.path || item.path || '/health?pregnancy=1')
      return
    }
    const draft = {
      type: action.kind,
      sourceItem: item.id,
      title: item.title,
      note: item.details || item.text,
      dosage: item.suggestedMedication?.dosage || null,
    }
    const next = addPregnancyDraft(user?.id, draft)
    setPregnancyDrafts(next)
    if (action.kind === 'medication') navigate('/medications?pregnancy=1')
    if (action.kind === 'doctor_upload') navigate('/health-archive?pregnancy=1')
    if (action.kind === 'sport_plan') navigate('/sport?pregnancy=1')
  }

  function deletePregnancyDraft(id) {
    setPregnancyDrafts(removePregnancyDraft(user?.id, id))
  }

  function togglePregnancyDetails(id) {
    setExpandedPregnancy(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const pregnancyHealthItems = pregnancyPlanningItems(profile, rl).filter(item => ['health','calendar','partner','sport'].includes(item.area))

  const TABS = [
    { id:'body', label:rl('Тело','Body') },
    ...(pregnancyActive ? [{ id:'pregnancy', label:rl('🕊 Подготовка','Planning') }] : []),
    { id:'period', label:rl('Месячные','Period') },
    { id:'contraception', label:rl('Контрацепция','Contraception') },
    { id:'diseases', label:rl('Заболевания','Conditions') },
    { id:'assignments', label:rl('Назначения','Assignments') },
    { id:'analyses', label:rl('Анализы','Labs') },
    { id:'archive', label:rl('Архив','Archive') },
  ]

  return (
    <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', overflowY:'auto' }}>
      {/* Шапка */}
      <div style={{ padding:'20px 16px 0', background:'var(--bg2)', borderBottom:'1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginBottom:12 }}>
          <h2 style={{ fontSize:26 }}>🩺 {rl('Здоровье','Health')}</h2>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'flex-end' }}>
            <button onClick={() => navigate('/weight')} className="btn btn-ghost" style={{ width:'auto', padding:'6px 12px', fontSize:12 }}>
              ⚖️ {rl('Вес','Weight')}
            </button>
            <button onClick={() => navigate('/medications')} className="btn btn-ghost" style={{ width:'auto', padding:'6px 12px', fontSize:12 }}>
              💊 {rl('Таблетки','Meds')}
            </button>
          </div>
        </div>
        <div style={{ display:'flex', gap:0, overflowX:'auto' }}>
          {TABS.map(tb => (
            <button key={tb.id} onClick={() => setTab(tb.id)} style={{
              padding:'8px 12px', background:'none', border:'none', cursor:'pointer', fontSize:12, whiteSpace:'nowrap',
              color:tab===tb.id?'var(--accent)':'var(--text3)',
              borderBottom:tab===tb.id?'2px solid var(--accent)':'2px solid transparent',
            }}>{tb.label}</button>
          ))}
        </div>
      </div>

      <div style={{ flex:1, padding:'16px', display:'flex', flexDirection:'column', gap:14 }}>

        {tab === 'pregnancy' && pregnancyActive && (
          <>
            <div className="card" style={{ padding:'16px', border:'1px solid rgba(134,239,172,0.35)', background:'linear-gradient(180deg, rgba(34,197,94,0.14), rgba(255,255,255,0.035))' }}>
              <div style={{ display:'flex', justifyContent:'space-between', gap:10, alignItems:'flex-start' }}>
                <div>
                  <h3 style={{ margin:'0 0 6px', fontSize:18, color:'#dcfce7' }}>🕊 {rl('Подготовка к беременности','Pregnancy planning')}</h3>
                  <p style={{ margin:0, fontSize:12, lineHeight:1.55, color:'rgba(255,255,255,0.68)' }}>
                    {rl('Здесь живут именно медицинские и организационные тумблеры подготовки: врач, анализы, прививки, цикл, партнёр. Приложение не назначает лечение, а помогает собрать список для врача.', 'Medical and organization toggles live here: doctor, labs, vaccines, cycle, partner. Elara helps prepare a doctor checklist, not treatment.')}
                  </p>
                </div>
                <span style={{ padding:'5px 10px', borderRadius:999, background:'#bbf7d0', color:'#052e16', fontSize:11, fontWeight:900 }}>
                  {rl('ГОРИТ','ACTIVE')}
                </span>
              </div>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {pregnancyHealthItems.map(item => {
                const done = pregnancyToggles?.[item.id] === 'done'
                return (
                  <div key={item.id} className="card" style={{ padding:'14px', borderColor: done ? 'rgba(134,239,172,0.18)' : 'rgba(134,239,172,0.34)', opacity: done ? 0.62 : 1 }}>
                    <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                      <button type="button" onClick={() => togglePregnancyItem(item.id)} style={{ width:38, height:38, borderRadius:14, border:'1px solid rgba(134,239,172,0.35)', background:done?'#bbf7d0':'rgba(255,255,255,0.05)', color:done?'#052e16':'#bbf7d0', cursor:'pointer', fontWeight:900 }}>
                        {done ? '✓' : item.icon}
                      </button>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:15, fontWeight:800, color:'#f0fdf4', textDecoration: done ? 'line-through' : 'none' }}>{item.title}</div>
                        <p style={{ margin:'5px 0 10px', fontSize:12, color:'rgba(255,255,255,0.64)', lineHeight:1.5 }}>{item.text}</p>
                        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                          <button type="button" onClick={() => togglePregnancyItem(item.id)} className="btn btn-ghost" style={{ width:'auto', padding:'7px 10px', fontSize:12 }}>
                            {done ? rl('Вернуть в задачи','Mark todo') : rl('Отметить сделанным','Mark done')}
                          </button>
                          <button type="button" onClick={() => togglePregnancyDetails(item.id)} className="btn btn-ghost" style={{ width:'auto', padding:'7px 10px', fontSize:12 }}>
                            {expandedPregnancy[item.id] ? rl('Скрыть детали','Hide details') : rl('Подробнее','Details')}
                          </button>
                          {item.path !== '/health?pregnancy=1' && (
                            <button type="button" onClick={() => navigate(item.path)} className="btn btn-primary" style={{ width:'auto', padding:'7px 10px', fontSize:12 }}>
                              {item.cta} →
                            </button>
                          )}
                        </div>
                        {expandedPregnancy[item.id] && (
                          <div style={{ marginTop:10, padding:12, borderRadius:14, background:'rgba(255,255,255,0.055)', border:'1px solid rgba(134,239,172,0.22)' }}>
                            <p style={{ margin:'0 0 10px', fontSize:12, color:'rgba(255,255,255,0.72)', lineHeight:1.55 }}>{item.details || item.text}</p>
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

            {pregnancyDrafts.filter(d => d.type !== 'medication').length > 0 && (
              <div className="card" style={{ padding:'14px', border:'1px solid rgba(134,239,172,0.24)' }}>
                <div style={{ fontSize:14, fontWeight:850, color:'#dcfce7', marginBottom:8 }}>{rl('Добавлено из рекомендаций','Added from recommendations')}</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {pregnancyDrafts.filter(d => d.type !== 'medication').map(draft => (
                    <div key={draft.id} style={{ padding:10, borderRadius:14, background:'rgba(255,255,255,0.045)', border:'1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
                        <div>
                          <div style={{ fontSize:13, fontWeight:800 }}>{draft.title}</div>
                          <p style={{ margin:'4px 0 0', fontSize:11, lineHeight:1.45, color:'rgba(255,255,255,0.58)' }}>{draft.note}</p>
                        </div>
                        <button type="button" onClick={() => deletePregnancyDraft(draft.id)} style={{ border:'none', background:'transparent', color:'var(--text3)', cursor:'pointer', fontSize:18 }}>×</button>
                      </div>
                      <div style={{ display:'flex', gap:7, flexWrap:'wrap', marginTop:8 }}>
                        {draft.type === 'analysis' && <button type="button" onClick={() => navigate('/health-archive?pregnancy=1')} className="btn btn-primary" style={{ width:'auto', padding:'7px 10px', fontSize:11 }}>{rl('Перейти к анализам','Open labs')}</button>}
                        {draft.type === 'doctor_upload' && <button type="button" onClick={() => navigate('/health-archive?pregnancy=1')} className="btn btn-primary" style={{ width:'auto', padding:'7px 10px', fontSize:11 }}>{rl('Загрузить файл','Upload file')}</button>}
                        {draft.type === 'sport_plan' && <button type="button" onClick={() => navigate('/sport?pregnancy=1')} className="btn btn-primary" style={{ width:'auto', padding:'7px 10px', fontSize:11 }}>{rl('Открыть спорт','Open sport')}</button>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Тело */}
        {tab === 'body' && (
          <>
            <div className="card" style={{ padding:'14px' }}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:12 }}>📏 {rl('Физические данные','Physical data')}</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div>
                  <div style={{ fontSize:11, color:'var(--text3)', marginBottom:5 }}>{rl('Рост (см)','Height (cm)')}</div>
                  <input type="number" placeholder="165" value={height} onChange={e => setHeight(e.target.value)} />
                </div>
                <div>
                  <div style={{ fontSize:11, color:'var(--text3)', marginBottom:5 }}>{rl('Вес в профиле (кг)','Profile weight (kg)')}</div>
                  <input type="number" placeholder="60" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} />
                </div>
              </div>
              {bmi && (
                <div style={{ marginTop:10, padding:'10px 12px', background:'var(--bg3)', borderRadius:8, fontSize:13 }}>
                  ИМТ: <strong style={{ color:'var(--accent)' }}>{bmi}</strong> — {bmiLabel}
                </div>
              )}
              <button type="button" onClick={() => navigate('/weight')}
                style={{ width:'100%', marginTop:12, padding:'13px 14px', borderRadius:14, cursor:'pointer',
                  display:'flex', alignItems:'center', gap:12, textAlign:'left',
                  background:'linear-gradient(135deg, rgba(96,165,250,0.13), rgba(167,139,250,0.09))',
                  border:'1px solid rgba(96,165,250,0.28)', color:'var(--text)' }}>
                <span style={{ fontSize:22 }}>📈</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:700 }}>{rl('График веса','Weight chart')}</div>
                  <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>
                    {rl('Ввод за сегодня или прошлые дни, история и динамика','Log today or previous days, history and trend')}
                  </div>
                </div>
                <span style={{ color:'rgba(96,165,250,0.85)', fontSize:18 }}>›</span>
              </button>
            </div>

            <div className="card" style={{ padding:'14px' }}>
              <div style={{ fontSize:11, color:'var(--text3)', marginBottom:5 }}>{rl('Дата рождения','Date of birth')}</div>
              <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)}
                max={new Date().toISOString().slice(0,10)} />
              {birthDate && (
                <div style={{ fontSize:12, color:'var(--text2)', marginTop:8 }}>
                  {rl('Возраст','Age')}: {new Date().getFullYear() - new Date(birthDate).getFullYear()} {rl('лет','years')}
                </div>
              )}
            </div>
          </>
        )}

        {/* Питание */}
        {hasNutritionMenu && (
          <div style={{ padding:'10px 14px', borderRadius:10, marginTop:4,
            background:'rgba(74,222,128,0.08)', border:'1px solid rgba(74,222,128,0.2)',
            display:'flex', alignItems:'center', gap:10, fontSize:12 }}>
            <span>✅</span>
            <span style={{ color:'var(--text2)', flex:1 }}>
              {rl('Меню на неделю готово','Weekly menu is ready')}
            </span>
            <button type="button" onClick={() => navigate('/today')}
              style={{ color:'#4ade80', background:'none', border:'none', cursor:'pointer', fontSize:12, fontWeight:600 }}>
              {rl('Сегодня →','Today →')}
            </button>
          </div>
        )}
        {/* Рекомендации по тренировкам */}
        <button type="button" onClick={() => navigate('/sport')}
          style={{ width:'100%', padding:'14px 16px', borderRadius:14, cursor:'pointer',
            display:'flex', alignItems:'center', gap:12, textAlign:'left',
            background:'linear-gradient(135deg, rgba(251,191,36,0.10), rgba(251,113,133,0.05))',
            border:'1px solid rgba(251,191,36,0.25)', color:'var(--text)', marginTop:4 }}>
          <span style={{ fontSize:22 }}>🏋️</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:600 }}>{rl('Тренировки и активность','Workouts & activity')}</div>
            <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>
              {rl('AI-план с учётом здоровья, цикла и добавок','AI plan considering health, cycle & supplements')}
            </div>
          </div>
          <span style={{ color:'rgba(251,191,36,0.7)', fontSize:18 }}>›</span>
        </button>

        <button type="button" onClick={() => navigate('/nutrition')}
          style={{ width:'100%', padding:'14px 16px', borderRadius:14, cursor:'pointer',
            display:'flex', alignItems:'center', gap:12, textAlign:'left',
            background:'linear-gradient(135deg, rgba(74,222,128,0.12), rgba(167,139,250,0.08))',
            border:'1px solid rgba(74,222,128,0.3)', color:'var(--text)', marginTop:8 }}>
          <span style={{ fontSize:22 }}>🥗</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:600 }}>{rl('Питание и меню', 'Nutrition & menu')}</div>
            <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>
              {rl('AI-меню на неделю, рецепты, учёт КБЖУ', 'AI weekly menu, recipes, macros')}
            </div>
          </div>
          <span style={{ color:'rgba(74,222,128,0.7)', fontSize:18 }}>›</span>
        </button>

        {/* Месячные */}
        {tab === 'period' && (
          <>
            <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6 }}>
              {rl('Здесь настраивается не “что сегодня”, а твой обычный паттерн: регулярность, длина, объём и боль по этапам месячных. Цвет и консистенция отмечаются в календаре по конкретному дню.',
                 'This is your usual pattern: regularity, length, flow and pain by period stage. Color and consistency are logged per day in the calendar.')}
            </p>

            <div className="card" style={{ padding:'14px' }}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:10 }}>{rl('Регулярность цикла','Cycle regularity')}</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
                {[
                  { key:'regular', ru:'Регулярный', en:'Regular' },
                  { key:'irregular', ru:'Нерегулярный', en:'Irregular' },
                  { key:'unknown', ru:'Не знаю', en:'Not sure' },
                ].map(item => (
                  <button key={item.key} onClick={() => setCycleRegularity(item.key)} style={{
                    padding:'9px 10px', borderRadius:8, fontSize:12, cursor:'pointer',
                    border:`1px solid ${cycleRegularity===item.key?'var(--accent)':'var(--border)'}`,
                    background:cycleRegularity===item.key?'var(--accent-soft)':'transparent',
                    color:cycleRegularity===item.key?'var(--accent)':'var(--text2)',
                  }}>{lang === 'en' ? item.en : item.ru}</button>
                ))}
              </div>
              {cycleRegularity === 'irregular' && (
                <p style={{ fontSize:11, color:'var(--text3)', margin:'8px 0 0', lineHeight:1.5 }}>
                  {rl('При нерегулярном цикле приложение будет показывать прогноз как окно дат, а не как точный день. Наконец-то календарь признаёт, что он не пророк.',
                     'For irregular cycles, forecasts are shown as a date window rather than one exact day.')}
                </p>
              )}
            </div>

            <div className="card" style={{ padding:'14px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <div style={{ fontSize:13, fontWeight:500 }}>{rl('Обычная длина цикла','Usual cycle length')}</div>
                <span style={{ fontSize:20, fontWeight:700, color:'var(--accent)' }}>{avgCycleLength}</span>
              </div>
              <input type="range" min="18" max="45" step="1" value={avgCycleLength}
                onChange={e => setAvgCycleLength(Number(e.target.value))}
                style={{ width:'100%', accentColor:'var(--accent)' }} />
              <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text3)', marginTop:4 }}>
                <span>18</span><span>28</span><span>45</span>
              </div>
            </div>

            <div className="card" style={{ padding:'14px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <div style={{ fontSize:13, fontWeight:500 }}>{rl('Обычная длина месячных','Usual period length')}</div>
                <span style={{ fontSize:20, fontWeight:700, color:'var(--accent)' }}>{avgPeriodLength}</span>
              </div>
              <input type="range" min="2" max="10" step="1" value={avgPeriodLength}
                onChange={e => setAvgPeriodLength(Number(e.target.value))}
                style={{ width:'100%', accentColor:'var(--accent)' }} />
              <p style={{ fontSize:11, color:'var(--text3)', margin:'8px 0 0', lineHeight:1.5 }}>
                {rl('Используется для автоотметки месячных и прогноза “день 1/2/3”. Потом каждый день можно скорректировать вручную.',
                   'Used for auto-marking and day-by-day period forecast. You can adjust each day manually.')}
              </p>
            </div>

            <div className="card" style={{ padding:'14px' }}>
              <div style={{ fontSize:13, fontWeight:500, marginBottom:10 }}>{rl('Обычная сила выделений','Usual flow')}</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                {FLOW_OPTIONS.map(item => (
                  <button key={item.key} onClick={() => setPeriodVolume(item.key)} style={{
                    padding:'7px 10px', borderRadius:18, fontSize:12, cursor:'pointer',
                    border:`1px solid ${periodVolume===item.key?'var(--accent)':'var(--border)'}`,
                    background:periodVolume===item.key?'var(--accent-soft)':'transparent',
                    color:periodVolume===item.key?'var(--accent)':'var(--text2)',
                  }}>{item.emoji} {lang === 'en' ? item.en : item.ru}</button>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding:'14px', display:'flex', flexDirection:'column', gap:12 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:500 }}>{rl('Обычная боль по этапам месячных','Usual pain by period stage')}</div>
                <div style={{ fontSize:11, color:'var(--text3)', marginTop:4, lineHeight:1.5 }}>
                  {rl('Это не сегодняшняя боль. Сегодняшнюю боль отмечай в календаре на конкретном дне кровотечения.',
                     'This is not today\'s pain. Log today\'s pain in the calendar on the exact bleeding day.')}
                </div>
              </div>
              {[
                { key:'beginning', label:rl('В начале','Beginning'), value:painBeginning, setter:setPainBeginning },
                { key:'middle', label:rl('В середине','Middle'), value:painMiddle, setter:setPainMiddle },
                { key:'end', label:rl('В конце','End'), value:painEnd, setter:setPainEnd },
              ].map(item => (
                <div key={item.key}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                    <span style={{ fontSize:11, color:'var(--text3)' }}>{item.label}</span>
                    <span style={{ fontSize:12, color:'var(--accent)' }}>{item.value}/10</span>
                  </div>
                  <input type="range" min="0" max="10" step="1" value={item.value}
                    onChange={e => item.setter(Number(e.target.value))}
                    style={{ width:'100%', accentColor:'var(--accent)' }} />
                </div>
              ))}
            </div>
          </>
        )}

        {/* Контрацепция */}
        {tab === 'contraception' && (
          <>
            <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6 }}>
              {rl('AI учитывает метод контрацепции при рекомендациях и анализе цикла.',
                 'AI considers your contraception method in recommendations and cycle analysis.')}
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
              {CONTRACEPTION_TYPES.map(ct => (
                <button key={ct.key} onClick={() => setContraception(ct.key)} style={{
                  padding:'11px 14px', borderRadius:8, fontSize:13, cursor:'pointer', textAlign:'left', display:'flex', alignItems:'center', gap:10,
                  border:`1px solid ${contraception===ct.key?'var(--accent)':'var(--border)'}`,
                  background:contraception===ct.key?'var(--accent-soft)':'transparent',
                  color:contraception===ct.key?'var(--accent)':'var(--text2)',
                }}>
                  <span style={{ fontSize:18 }}>{ct.emoji}</span>
                  <span>{ct.ru}</span>
                  {contraception===ct.key && <span style={{ marginLeft:'auto', color:'var(--accent)' }}>✓</span>}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Заболевания */}
        {tab === 'diseases' && (
          <>
            <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6 }}>
              {rl('AI учитывает заболевания в советах и анализе. Информация хранится зашифрованно.',
                 'AI considers conditions in advice and analysis. Data is stored securely.')}
            </p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
              {[...new Set([...CHRONIC_DISEASES, ...diseases.filter(d => !CHRONIC_DISEASES.includes(d))])].map((d, di) => (
                <button key={`d-${di}-${d}`} onClick={() => toggleDisease(d)} style={{
                  padding:'7px 12px', borderRadius:20, fontSize:12, cursor:'pointer',
                  border:`1px solid ${diseases.includes(d)?'var(--accent)':'var(--border)'}`,
                  background:diseases.includes(d)?'var(--accent-soft)':'transparent',
                  color:diseases.includes(d)?'var(--accent)':'var(--text2)',
                  display:'flex', alignItems:'center', gap:4,
                }}>
                  <span onClick={(e) => { e.stopPropagation(); toggleDisease(d) }}>{d}</span>
                  <span onClick={(e) => { e.stopPropagation(); const info = conditionInfo(d); setSelectedConditionInfo({ ...info, aiDescription: null, aiLoading: false }) }} style={{ marginLeft:4, width:18, height:18, borderRadius:'50%', border:'1px solid var(--border)', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'var(--text3)' }}>?</span>
                </button>
              ))}
            </div>
            <div style={{ display:'flex', gap:8, marginTop:4 }}>
              <input placeholder={rl('Добавить своё заболевание...','Add your condition...')}
                value={customDisease} onChange={e => setCustomDisease(e.target.value)} style={{ flex:1 }} />
              <button onClick={() => {
                if (customDisease.trim() && !diseases.includes(customDisease)) {
                  setDiseases(prev => [...prev, customDisease.trim()])
                  setCustomDisease('')
                }
              }} style={{ background:'var(--accent-soft)', border:'1px solid var(--border)', borderRadius:8, color:'var(--accent)', fontSize:12, padding:'0 14px', cursor:'pointer', flexShrink:0 }}>
                + {rl('Добавить','Add')}
              </button>
            </div>
          </>
        )}

        {tab === 'assignments' && (
          <>
            <div className="card" style={{ padding:14, border:'1px solid rgba(167,139,250,0.28)', background:'linear-gradient(135deg, rgba(167,139,250,0.10), rgba(255,255,255,0.03))' }}>
              <div style={{ fontSize:16, fontWeight:800 }}>📋 {rl('Назначения врача и задачи здоровья','Doctor assignments and health tasks')}</div>
              <p style={{ margin:'7px 0 0', fontSize:12, color:'var(--text2)', lineHeight:1.55 }}>
                {rl('Здесь должны лежать назначения из врача, AI-разбора документов и твоих ручных заметок. Elara не назначает лечение, а помогает не потерять список.', 'Doctor instructions, AI-parsed documents and manual notes live here. Elara does not prescribe treatment, it keeps the checklist visible.')}
              </p>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:12 }}>
                <button type="button" className="btn btn-primary" style={{ width:'auto', padding:'8px 12px', fontSize:12 }} onClick={() => navigate('/health-archive?upload=1')}>{rl('Загрузить назначение','Upload assignment')}</button>
                <button type="button" className="btn btn-ghost" style={{ width:'auto', padding:'8px 12px', fontSize:12 }} onClick={() => navigate('/medications')}>{rl('Открыть таблетки','Open meds')}</button>
              </div>
            </div>
            {((profile?.health?.assignments || []).length || pregnancyDrafts.length) ? (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {[...(profile?.health?.assignments || []), ...pregnancyDrafts].map((a, idx) => (
                  <div key={a.id || idx} className="card" style={{ padding:14 }}>
                    <div style={{ fontSize:14, fontWeight:800 }}>{a.title || a.name || rl('Назначение','Assignment')}</div>
                    <div style={{ fontSize:12, color:'var(--text2)', lineHeight:1.5, marginTop:4 }}>{a.note || a.text || a.description || rl('Описание не заполнено. Можно добавить вручную или загрузить заключение врача.', 'No description yet. Add manually or upload a doctor file.')}</div>
                    <div style={{ display:'flex', gap:8, marginTop:10, flexWrap:'wrap' }}>
                      <button className="btn btn-ghost" style={{ width:'auto', padding:'7px 10px', fontSize:12 }} onClick={() => navigate('/medications')}>{rl('В таблетки','To meds')}</button>
                      <button className="btn btn-ghost" style={{ width:'auto', padding:'7px 10px', fontSize:12 }} onClick={() => navigate('/health-archive')}>{rl('В архив','To archive')}</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card" style={{ padding:14, color:'var(--text2)', fontSize:13, lineHeight:1.5 }}>
                {rl('Пока назначений нет. Загрузи заключение врача или добавь задачу из рекомендаций подготовки к беременности.', 'No assignments yet. Upload a doctor note or add a task from pregnancy planning recommendations.')}
              </div>
            )}
          </>
        )}


        {tab === 'analyses' && (
          <div className="card" style={{ padding:14, border:'1px solid rgba(96,165,250,0.24)' }}>
            <div style={{ fontSize:16, fontWeight:800 }}>🧪 {rl('Анализы','Labs')}</div>
            <p style={{ margin:'7px 0 12px', fontSize:12, color:'var(--text2)', lineHeight:1.55 }}>
              {rl('Анализы хранятся в архиве здоровья. Отсюда можно быстро открыть загрузку PDF, фото или заключения врача.', 'Labs live in the health archive. Open it to upload PDFs, photos, or doctor notes.')}
            </p>
            <button type="button" className="btn btn-primary" onClick={() => navigate('/health-archive?upload=1')}>
              {rl('Открыть анализы и загрузку','Open labs and upload')}
            </button>
          </div>
        )}

        {tab === 'archive' && (
          <div className="card" style={{ padding:14, border:'1px solid rgba(96,165,250,0.24)' }}>
            <div style={{ fontSize:16, fontWeight:800 }}>📁 {rl('Архив здоровья','Health archive')}</div>
            <p style={{ margin:'7px 0 12px', fontSize:12, color:'var(--text2)', lineHeight:1.55 }}>
              {rl('Здесь ссылка на отдельный экран архива: файлы, AI-анализ документов, назначения и заметки.', 'This opens the archive screen: files, AI document analysis, assignments, and notes.')}
            </p>
            <button type="button" className="btn btn-primary" onClick={() => navigate('/health-archive')}>
              {rl('Открыть архив здоровья','Open health archive')}
            </button>
          </div>
        )}

        {selectedConditionInfo && (
          <div className="card" style={{ padding:16, border:'1px solid rgba(167,139,250,0.35)', background:'var(--bg2)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', gap:10 }}>
              <div style={{ fontSize:16, fontWeight:800 }}>{selectedConditionInfo.title}</div>
              <button type="button" onClick={() => setSelectedConditionInfo(null)} className="btn btn-ghost" style={{ width:'auto', padding:'4px 8px' }}>×</button>
            </div>
            <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6 }}>{typeof selectedConditionInfo.description === 'string' ? selectedConditionInfo.description : selectedConditionInfo.description?.description}</p>
            <div style={{ fontSize:12, color:'var(--text3)', lineHeight:1.5 }}>Источник: {selectedConditionInfo.source}</div>
            {selectedConditionInfo.aiDescription ? (
              <div style={{ marginTop:10, padding:'10px 12px', borderRadius:10,
                background:'rgba(74,222,128,0.07)', border:'1px solid rgba(74,222,128,0.2)' }}>
                <div style={{ fontSize:11, color:'#4ade80', fontWeight:600, marginBottom:6 }}>✨ AI-описание</div>
                <p style={{ fontSize:12, color:'var(--text2)', lineHeight:1.65, margin:0 }}>
                  {selectedConditionInfo.aiDescription}
                </p>
              </div>
            ) : selectedConditionInfo.aiLoading ? (
              <div style={{ marginTop:10, fontSize:12, color:'var(--text3)', padding:'8px 0' }}>
                ⏳ {rl('Загружаю описание...','Loading description...')}
              </div>
            ) : selectedConditionInfo.aiError ? (
              <div style={{ marginTop:8, fontSize:11, color:'rgba(248,113,113,0.8)', lineHeight:1.5 }}>
                {selectedConditionInfo.aiError}
                <button type="button"
                  onClick={() => addAiConditionDescription(selectedConditionInfo.title)}
                  style={{ marginLeft:8, background:'none', border:'none', color:'var(--accent)',
                    cursor:'pointer', fontSize:11, textDecoration:'underline' }}>
                  {rl('Повторить','Retry')}
                </button>
              </div>
            ) : (
              <button type="button"
                onClick={() => addAiConditionDescription(selectedConditionInfo.title)}
                className="btn btn-ghost"
                style={{ width:'auto', padding:'7px 10px', fontSize:12, marginTop:10 }}>
                ✨ {rl('Найти описание AI','Find AI description')}
              </button>
            )}
            {selectedConditionInfo.assignments.length > 0 && <div style={{ marginTop:10, fontSize:12 }}><strong>{rl('Связанные назначения','Linked assignments')}:</strong> {selectedConditionInfo.assignments.map(a => a.title || a.name).join(', ')}</div>}
            <div style={{ marginTop:10 }}>
              <div style={{ fontSize:12, fontWeight:700, marginBottom:5 }}>{rl('Что уточнить у врача','Questions for doctor')}</div>
              <ul style={{ margin:'0 0 0 18px', padding:0, color:'var(--text2)', fontSize:12, lineHeight:1.5 }}>
                {selectedConditionInfo.questions.map((q, i) => <li key={i}>{q}</li>)}
              </ul>
            </div>
          </div>
        )}

        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saved ? '✓' : saving ? '...' : rl('Сохранить','Save')}
        </button>
      </div>
    </div>
  )
}
