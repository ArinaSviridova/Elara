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

      // Загружаем актуальный контекст из БД. Ошибки отдельных таблиц не должны ломать AI-совет.
      const safeOne = async (query) => {
        try { const { data } = await query; return data || null } catch { return null }
      }
      const safeMany = async (query) => {
        try { const { data } = await query; return data || [] } catch { return [] }
      }
      const [diary, moodEntry, cycleEntry, dayStatus, sportLog, recentSportRows, weightRows, activeMeds, nutritionRows] = await Promise.all([
        safeOne(supabase.from('diary_entries').select('tags, text').eq('user_id', user.id).eq('date', today).maybeSingle()),
        safeOne(supabase.from('mood_entries').select('mood').eq('user_id', user.id).eq('date', today).maybeSingle()),
        shouldUseCycleContext ? safeOne(supabase.from('cycle_entries').select('type').eq('user_id', user.id).eq('date', today).limit(1).maybeSingle()) : Promise.resolve(null),
        safeOne(supabase.from('day_statuses').select('energy,mood,pain,social_battery,libido,tags').eq('user_id', user.id).eq('date', today).maybeSingle()),
        safeOne(supabase.from('sport_logs').select('date,workouts,intensity,duration,notes,custom_workout,supplements').eq('user_id', user.id).eq('date', today).maybeSingle()),
        safeMany(supabase.from('sport_logs').select('date,workouts,intensity,duration,notes,custom_workout,supplements').eq('user_id', user.id).order('date', { ascending:false }).limit(10)),
        safeMany(supabase.from('weight_logs').select('date,weight_kg,note').eq('user_id', user.id).order('date', { ascending:false }).limit(10)),
        safeMany(supabase.from('medications').select('name,dosage,med_type,times,is_active').eq('user_id', user.id).eq('is_active', true).limit(10)),
        safeMany(supabase.from('nutrition_menus').select('*').eq('user_id', user.id).order('created_at', { ascending:false }).limit(3)),
      ])

      const sortedWeights = [...(weightRows || [])].sort((a,b) => String(a.date).localeCompare(String(b.date)))
      const firstWeight = sortedWeights[0]?.weight_kg != null ? Number(sortedWeights[0].weight_kg) : null
      const lastWeight = sortedWeights[sortedWeights.length - 1]?.weight_kg != null ? Number(sortedWeights[sortedWeights.length - 1].weight_kg) : null
      const weightTrend = firstWeight != null && lastWeight != null
        ? `${firstWeight.toFixed(1)}kg -> ${lastWeight.toFixed(1)}kg (${(lastWeight - firstWeight >= 0 ? '+' : '')}${(lastWeight - firstWeight).toFixed(1)}kg)`
        : null

      const nutritionSummary = (nutritionRows || []).map(n => {
        const meals = Array.isArray(n.days)
          ? n.days.flatMap(d => d.meals || []).slice(0, 8).map(m => [m.type, m.name, m.kcal ? `${m.kcal}kcal` : null].filter(Boolean).join(': '))
          : []
        return [n.title, meals.length ? meals.join(', ') : JSON.stringify(n.items || [])].filter(Boolean).join(' - ')
      }).filter(Boolean).join('; ')

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
            extraContext: [
              extraContext,
              dayStatus ? `today status: energy ${dayStatus.energy}, mood ${dayStatus.mood}, pain ${dayStatus.pain}, social battery ${dayStatus.social_battery}, libido ${dayStatus.libido}` : null,
              sportLog ? `today sport: ${(sportLog.workouts || []).join(', ')}, intensity ${sportLog.intensity}, duration ${sportLog.duration} min, supplements ${(sportLog.supplements || []).join(', ') || 'none'}, notes ${sportLog.notes || 'none'}` : null,
              recentSportRows?.length ? `recent sport history: ${recentSportRows.map(s => `${s.date}: ${(s.workouts || []).join('+') || 'none'}, ${s.intensity || 'moderate'}, ${s.duration || 0}min${s.custom_workout ? `, custom ${s.custom_workout}` : ''}${s.notes ? `, notes ${s.notes}` : ''}`).join('; ')}` : null,
              weightRows?.length ? `recent weight logs: ${weightRows.map(w => `${w.date}:${w.weight_kg}kg`).join('; ')}${weightTrend ? ` | weight trend: ${weightTrend}` : ''}` : null,
              activeMeds?.length ? `active meds: ${activeMeds.map(m => [m.name, m.dosage, m.med_type, Array.isArray(m.times) ? m.times.join('/') : null].filter(Boolean).join(' ')).join('; ')}` : null,
              nutritionSummary ? `nutrition/menu context: ${nutritionSummary}` : null,
            ].filter(Boolean).join(' | ') || null,
            userProfileSummary: {
              name: profile?.name,
              gender: profile?.gender,
              bodyMode: profile?.body_mode,
              modules: profile?.body_modules || [],
              goals: profile?.goals || profile?.preferences?.goals || [],
              carePrefs: profile?.preferences?.care_prefs || [],
            },
            personalizationRules: shouldUseCycleContext
              ? 'Use cycle context only when useful. Prioritize actual user data over generic wellness tips. Mention the exact relevant logs when helpful: recent workouts, weight trend, nutrition/menu and active meds. Do not invent missing data.'
              : 'Do not mention menstrual cycle, follicular phase, ovulation, luteal phase, PMS or period. Personalize using energy, mood, sleep, recent workouts, meds, weight trend, food/menu and support context. Mention exact relevant logs when helpful and do not invent missing data.',
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
