// Виджет с научными инсайтами — появляется в CalendarPage
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang, useRl } from '../context/LangContext'

// Когнитивные режимы по фазам (Gemini recommendations)
const COGNITIVE_MODES = {
  follicular: {
    emoji: '🧠',
    mode: 'Архитектор',
    modeEn: 'Architect',
    tip: 'Мозг максимально пластичен — эстроген повышает дофамин. Лучшее время для новых проектов, обучения и мозговых штурмов.',
    tipEn: 'Brain is most plastic — estrogen boosts dopamine. Best time for new projects, learning and brainstorming.',
    ref: 'PMC8453714',
  },
  ovulation: {
    emoji: '💬',
    mode: 'Дипломат',
    modeEn: 'Diplomat',
    tip: 'Пик эстрогена и тестостерона — максимальные вербальные способности и уверенность. Идеально для переговоров, презентаций, нетворкинга.',
    tipEn: 'Peak estrogen and testosterone — maximum verbal skills and confidence. Ideal for negotiations, presentations, networking.',
    ref: 'PMC3721046',
  },
  luteal: {
    emoji: '📋',
    mode: 'Аудитор',
    modeEn: 'Auditor',
    tip: 'Прогестерон снижает креативность, но повышает усидчивость и внимание к деталям. Лучшее время для рутины, редактуры и завершения задач.',
    tipEn: 'Progesterone reduces creativity but boosts attention to detail. Best for routine, editing and finishing tasks.',
    ref: 'PMC10212816',
  },
  pms: {
    emoji: '🌙',
    mode: 'Визионер',
    modeEn: 'Visionary',
    tip: 'Оба полушария работают усиленно. Сильная интуиция — время для стратегического планирования и анализа прошедшего месяца.',
    tipEn: 'Both hemispheres work intensely. Strong intuition — time for strategic planning and monthly review.',
    ref: 'PMC10512516',
  },
  period: {
    emoji: '💜',
    mode: 'Восстановление',
    modeEn: 'Recovery',
    tip: 'Минимальный уровень гормонов. Делегируй задачи, избегай жёстких дедлайнов. Интуиция и эмпатия — на высоте.',
    tipEn: 'Minimum hormone levels. Delegate tasks, avoid hard deadlines. Intuition and empathy are strongest.',
    ref: 'PMC8905256',
  },
}

// Спортивные рекомендации
const SPORT_RECS = {
  follicular: { rec: '🏃 ВИИТ, кроссфит, кардио — организм работает на гликолизе', recEn: '🏃 HIIT, crossfit, cardio — body runs on glycolysis', ref: 'PMC4241904' },
  ovulation:  { rec: '⚠️ Риск травм связок! Избегай прыжков и резких движений — релаксин снижает стабильность', recEn: '⚠️ Ligament injury risk! Avoid jumps — relaxin reduces stability', ref: 'PMC4241904' },
  luteal:     { rec: '🧘 Йога, пилатес, лёгкие веса — тело переключилось на сжигание жиров', recEn: '🧘 Yoga, pilates, light weights — body switches to fat burning', ref: 'PMC4241904' },
  pms:        { rec: '🚶 Лёгкая прогулка или растяжка — не форсируй', recEn: '🚶 Light walk or stretching — don\'t force it', ref: 'PMC8905256' },
  period:     { rec: '💆 Мягкие практики — низкоинтенсивный спорт или отдых', recEn: '💆 Gentle practices — low-intensity or rest', ref: 'PMC8905256' },
}

// Нутриция
const NUTRITION_RECS = {
  follicular: { tip: '🥗 Лёгкие блюда, углеводы для энергии', tipEn: '🥗 Light meals, carbs for energy' },
  ovulation:  { tip: '🥦 Антиоксиданты и клетчатка — поддержи овуляцию', tipEn: '🥦 Antioxidants and fiber — support ovulation' },
  luteal:     { tip: '🍫 Тяга к сладкому физиологична — прогестерон снижает чувствительность к инсулину. Магний (100–200 мг) снижает тягу и ПМС', tipEn: '🍫 Sugar cravings are physiological — progesterone reduces insulin sensitivity. Magnesium (100–200 mg) reduces cravings and PMS' },
  pms:        { tip: '🫐 Железо из еды + витамин C для усвоения. Избегай кофе и алкоголя', tipEn: '🫐 Iron from food + vitamin C for absorption. Avoid coffee and alcohol' },
  period:     { tip: '🫘 Железосодержащие продукты (гречка, шпинат). Не забывай про воду', tipEn: '🫘 Iron-rich foods (buckwheat, spinach). Stay hydrated' },
}

export default function InsightsWidget({ currentPhase }) {
  const { profile } = useAuth()
  const { lang } = useLang()
  const rl = useRl()
  const [tab, setTab] = useState('brain')

  if (!currentPhase || !COGNITIVE_MODES[currentPhase]) return null

  const cognitive = COGNITIVE_MODES[currentPhase]
  const sport = SPORT_RECS[currentPhase]
  const nutrition = NUTRITION_RECS[currentPhase]

  const TABS = [
    { id:'brain', label:rl('🧠 Мозг','🧠 Brain') },
    { id:'sport', label:rl('🏃 Спорт','🏃 Sport') },
    { id:'food', label:rl('🥗 Питание','🥗 Nutrition') },
  ]

  return (
    <div className="card" style={{ padding:0, overflow:'hidden' }}>
      <div style={{ display:'flex', borderBottom:'1px solid var(--border)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex:1, padding:'9px 4px', background:'none', border:'none', cursor:'pointer', fontSize:11,
            color:tab===t.id?'var(--accent)':'var(--text3)',
            borderBottom:tab===t.id?'2px solid var(--accent)':'2px solid transparent',
          }}>{t.label}</button>
        ))}
      </div>
      <div style={{ padding:'12px 14px' }}>
        {tab === 'brain' && (
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
              <span style={{ fontSize:20 }}>{cognitive.emoji}</span>
              <div>
                <div style={{ fontSize:12, fontWeight:500 }}>{rl(`Режим: ${cognitive.mode}`, `Mode: ${cognitive.modeEn}`)}</div>
              </div>
            </div>
            <p style={{ fontSize:12, color:'var(--text2)', lineHeight:1.6, margin:'0 0 8px' }}>
              {lang === 'en' ? cognitive.tipEn : cognitive.tip}
            </p>
            <div style={{ fontSize:10, color:'var(--text3)' }}>📚 PMC {cognitive.ref}</div>
          </div>
        )}
        {tab === 'sport' && sport && (
          <div>
            <p style={{ fontSize:12, color:'var(--text2)', lineHeight:1.6, margin:'0 0 8px' }}>
              {lang === 'en' ? sport.recEn : sport.rec}
            </p>
            <div style={{ fontSize:10, color:'var(--text3)' }}>📚 {sport.ref}</div>
          </div>
        )}
        {tab === 'food' && nutrition && (
          <p style={{ fontSize:12, color:'var(--text2)', lineHeight:1.6, margin:0 }}>
            {lang === 'en' ? nutrition.tipEn : nutrition.tip}
          </p>
        )}
      </div>
    </div>
  )
}
