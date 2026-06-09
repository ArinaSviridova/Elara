import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'

export default function AIAdvice({
  requestType = 'self_advice',
  targetUserId,
  groupId,
  label,
  cyclePhase,
  todayMood,
  diaryTags,
  extraContext
}) {
  const { user, profile } = useAuth()
  const { lang } = useLang()
  const [advice, setAdvice] = useState('')
  const [loading, setLoading] = useState(false)
  const rl = (ru, en, be) => lang === 'en' ? en : (lang === 'be' ? (be || ru) : ru)

  const rawGender = profile?.gender || profile?.gender_identity || ''
  const noCycleBodyMode = ['male', 'no_period', 'amenorrhea', 'menopause', 'pregnancy'].includes(profile?.body_mode)
  const explicitCycleEnabled = Array.isArray(profile?.body_modules) && profile.body_modules.includes('cycle')
  const shouldUseCycleContext = !(['male', 'man', 'cis_man'].includes(rawGender) && !explicitCycleEnabled) && !noCycleBodyMode
  const safeCyclePhase = shouldUseCycleContext ? cyclePhase : null

  const VARIETY_HINTS_RU = [
    'Дай конкретный совет без ванны и прогулки. Пусть это будет микро-действие на 2-10 минут.',
    'Предложи практичный совет про еду, воду, отдых, границы, быт или аптечку. Не повторяй стандартные прогулки.',
    'Сделай совет свежим: один маленький шаг, без универсальной банальности.',
    'Дай совет с учётом пола, body_mode и контекста. Не упоминай цикл, если он отключён.',
    'Предложи нестандартную, но безопасную заботу: подготовить еду, снизить нагрузку, написать просьбу, проверить запас.'
  ]
  const VARIETY_HINTS_EN = [
    'Give a specific tip without bath or walk. Make it a 2-10 minute micro-action.',
    'Suggest a practical tip about food, water, rest, boundaries, home care or first-aid kit. Avoid generic walks.',
    'Make the advice fresh: one small step, not a universal cliché.',
    'Respect gender, body_mode and context. Do not mention cycle phases when cycle is disabled.',
    'Suggest safe non-obvious care: prepare food, reduce load, send a request, check supplies.'
  ]

  // Перевод технических ключей фаз
  const translatePhase = (phase) => {
    const PHASE_LABELS = {
      period:     rl('Менструация', 'Period'),
      pms:        rl('ПМС', 'PMS'),
      ovulation:  rl('Овуляция', 'Ovulation'),
      fertile:    rl('Фертильное окно', 'Fertile window'),
      follicular: rl('Фолликулярная фаза', 'Follicular phase'),
      luteal:     rl('Лютеиновая фаза', 'Luteal phase'),
      regular:    rl('Обычный день', 'Regular day'),
    }
    return PHASE_LABELS[phase] || phase
  }

  async function fetchAdvice() {
    setLoading(true)
    setAdvice('')
    try {
      const today = new Date().toISOString().slice(0,10)

      // Загружаем актуальный контекст из БД
      const [{ data: diary }, { data: moodEntry }, { data: cycleEntry }] = await Promise.all([
        supabase.from('diary_entries').select('tags').eq('user_id', user.id).eq('date', today).maybeSingle(),
        supabase.from('mood_entries').select('mood').eq('user_id', user.id).eq('date', today).maybeSingle(),
        supabase.from('cycle_entries').select('type').eq('user_id', user.id).eq('date', today).limit(1).maybeSingle(),
      ])

      const storageKey = `elara_ai_advice_last_${user.id}_${requestType}`
      const lastAdvice = localStorage.getItem(storageKey) || ''
      const hintPool = lang === 'en' ? VARIETY_HINTS_EN : VARIETY_HINTS_RU
      const varietySeed = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      const varietyHint = hintPool[Math.floor(Math.random() * hintPool.length)]

      const { data, error } = await supabase.functions.invoke('ai-advisor', {
        body: {
          userId: user.id,
          requestType,
          targetUserId: targetUserId || user.id,
          groupId,
          language: lang,
          contextOverride: {
            cyclePhase: safeCyclePhase || (shouldUseCycleContext ? cycleEntry?.type : null),
            mood: todayMood || moodEntry?.mood,
            diaryTags: diaryTags || diary?.tags || [],
            bodyMode: profile?.body_mode,
            gender: profile?.gender,
            addressStyle: profile?.address_style || 'auto',
            pronouns: profile?.pronouns || '',
            pregnancyWeek: profile?.pregnancy_week,
            personalityTags: profile?.personality_tags || [],
            carePrefs: profile?.preferences?.care_prefs || [],
            extraContext: extraContext || null,
            varietySeed,
            varietyHint,
            avoidRepeating: lastAdvice,
            avoidGenericSuggestions: ['ванна', 'прогулка', 'bath', 'walk'],
          }
        }
      })

      if (error) throw error
      const nextAdvice = data?.advice || rl('Выбери одно маленькое действие: вода, еда, отдых или честная просьба о помощи. Организм не подписывался на марафон героизма.', 'Pick one tiny action: water, food, rest, or an honest request for help. Your body did not sign up for heroic nonsense.', 'Паклапаціся пра сябе сёння 🤍')
      setAdvice(nextAdvice)
      localStorage.setItem(storageKey, nextAdvice)
    } catch (e) {
      console.error('AI advice error:', e)
      setAdvice(rl('Не удалось получить совет. Попробуй позже.', 'Could not get advice. Try again later.', 'Не ўдалося атрымаць параду.'))
    }
    setLoading(false)
  }

  return (
    <div className="card" style={{ padding:'14px 16px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: advice ? 12 : 0 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:500, color:'var(--text)', display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ color:'var(--accent)' }}>✦</span>
            {label || rl('Совет на сегодня', "Today’s advice", 'Парада на сёння')}
          </div>
          {!advice && !loading && (
            <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>
              {safeCyclePhase
                ? rl(`Фаза: ${translatePhase(safeCyclePhase)}`, `Phase: ${translatePhase(safeCyclePhase)}`, `Фаза: ${translatePhase(safeCyclePhase)}`)
                : rl('Персональный — нажми чтобы получить', 'Personal — tap to get', 'Персанальны — націсні')}
            </div>
          )}
        </div>
        <button
          onClick={fetchAdvice}
          disabled={loading}
          style={{
            background:'var(--accent-soft)',
            border:'1px solid var(--border)',
            borderRadius:8,
            color:'var(--accent)',
            fontSize:12,
            padding:'7px 14px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            flexShrink:0,
            transition:'opacity 0.15s',
          }}
        >
          {loading
            ? rl('Думаю...', 'Thinking...', 'Думаю...')
            : advice
              ? '↻'
              : rl('Получить', 'Get', 'Атрымаць')}
        </button>
      </div>

      {advice && (
        <p style={{
          fontSize:15,
          color:'var(--text)',
          lineHeight:1.8,
          fontFamily:'Cormorant Garamond, serif',
          fontStyle:'italic',
          borderTop:'1px solid var(--border)',
          paddingTop:12,
          margin:0,
        }}>
          {advice}
        </p>
      )}
    </div>
  )
}
