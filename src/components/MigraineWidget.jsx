// Предиктивный виджет мигреней
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang, useRl } from '../context/LangContext'

export default function MigraineWidget({ daysUntilPeriod, cycleDay, cycleLength }) {
  const { user } = useAuth()
  const { lang } = useLang()
  const rl = useRl()
  const [hasMigrainePattern, setHasMigrainePattern] = useState(false)
  const [migraineRisk, setMigraineRisk] = useState(null)

  useEffect(() => { analyzeMigrainePattern() }, [])

  async function analyzeMigrainePattern() {
    // Ищем теги "мигрень" или "головная боль" в дневнике за последние 3 месяца
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    const { data } = await supabase
      .from('diary_entries')
      .select('date, tags')
      .eq('user_id', user.id)
      .gte('date', threeMonthsAgo.toISOString().slice(0, 10))

    const migraineDays = (data || []).filter(d =>
      d.tags?.some(t => t.toLowerCase().includes('мигрень') || t.toLowerCase().includes('голов') || t.toLowerCase().includes('migraine'))
    )

    if (migraineDays.length >= 2) {
      setHasMigrainePattern(true)
    }
  }

  // Эстрогеновое окно уязвимости: за 3 дня до месячных
  useEffect(() => {
    if (daysUntilPeriod !== null && daysUntilPeriod !== undefined) {
      if (daysUntilPeriod <= 3 && daysUntilPeriod >= -1) {
        setMigraineRisk('high')
      } else if (daysUntilPeriod <= 5) {
        setMigraineRisk('medium')
      } else {
        setMigraineRisk(null)
      }
    }
  }, [daysUntilPeriod])

  if (!hasMigrainePattern || !migraineRisk) return null

  const isHigh = migraineRisk === 'high'

  return (
    <div style={{
      padding:'12px 14px', borderRadius:10,
      background: isHigh ? 'rgba(167,139,250,0.1)' : 'rgba(167,139,250,0.06)',
      border: `1px solid ${isHigh ? 'rgba(167,139,250,0.4)' : 'rgba(167,139,250,0.2)'}`,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
        <span style={{ fontSize:16 }}>💫</span>
        <div style={{ fontSize:12, fontWeight:500, color:'#a78bfa' }}>
          {isHigh
            ? rl('⚠️ Окно риска гормональной мигрени', '⚠️ Hormonal migraine risk window')
            : rl('Возможна мигрень через 2–3 дня', 'Possible migraine in 2–3 days')
          }
        </div>
      </div>
      <p style={{ fontSize:12, color:'var(--text2)', lineHeight:1.5, margin:'0 0 8px' }}>
        {isHigh
          ? rl('Физиологическое падение эстрогена перед месячными — типичный триггер. Проверь аптечку, пей больше воды.', 'Physiological estrogen drop before period — typical trigger. Check your medicine cabinet, drink more water.')
          : rl('Эстроген начинает снижаться. Если у тебя бывают мигрени — хорошее время для профилактики.', 'Estrogen starting to drop. If you get migraines — good time for prevention.')
        }
      </p>
      <div style={{ fontSize:10, color:'var(--text3)' }}>
        📚 {rl('На основе','Based on')} PMC10512516 · PMC3620011
      </div>
    </div>
  )
}
