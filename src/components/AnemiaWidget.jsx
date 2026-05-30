// Виджет скрининга анемии
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang, useRl } from '../context/LangContext'

export default function AnemiaWidget() {
  const { user } = useAuth()
  const { lang } = useLang()
  const rl = useRl()
  const [showAlert, setShowAlert] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => { checkAnemiaRisk() }, [])

  async function checkAnemiaRisk() {
    if (localStorage.getItem('elara_anemia_dismissed')) { setDismissed(true); return }

    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    // Ищем сочетание обильных месячных + усталость/туман
    const { data: healthLogs } = await supabase
      .from('cycle_entries')
      .select('date, type')
      .eq('user_id', user.id)
      .eq('type', 'period')
      .gte('date', threeMonthsAgo.toISOString().slice(0, 10))

    const { data: moodLogs } = await supabase
      .from('mood_entries')
      .select('date, mood')
      .eq('user_id', user.id)
      .in('mood', ['tired', 'exhausted'])
      .gte('date', threeMonthsAgo.toISOString().slice(0, 10))

    const { data: profile } = await supabase
      .from('profiles')
      .select('health')
      .eq('id', user.id)
      .single()

    const hasHeavyPeriod = profile?.data?.health?.period_volume === 'heavy' || profile?.data?.health?.period_volume === 'prolonged'
    const frequentFatigue = (moodLogs?.length || 0) >= 6

    if (hasHeavyPeriod && frequentFatigue) {
      setShowAlert(true)
    }
  }

  function dismiss() {
    localStorage.setItem('elara_anemia_dismissed', '1')
    setShowAlert(false)
    setDismissed(true)
  }

  if (!showAlert || dismissed) return null

  return (
    <div style={{
      padding:'14px 16px', borderRadius:12,
      background:'rgba(251,146,60,0.08)',
      border:'1px solid rgba(251,146,60,0.3)',
    }}>
      <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
        <span style={{ fontSize:20, flexShrink:0 }}>🩸</span>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:500, color:'#fb923c', marginBottom:4 }}>
            💡 {rl('Возможен скрытый дефицит железа', 'Possible hidden iron deficiency')}
          </div>
          <p style={{ fontSize:12, color:'var(--text2)', lineHeight:1.5, margin:'0 0 8px' }}>
            {rl(
              'Мы заметили паттерн: обильные месячные + частая усталость. Это классические признаки латентного железодефицита, когда гемоглобин ещё в норме, но ферритин уже истощён.',
              'We noticed a pattern: heavy periods + frequent fatigue. Classic signs of latent iron deficiency — hemoglobin still normal but ferritin depleted.'
            )}
          </p>
          <p style={{ fontSize:12, color:'var(--text2)', lineHeight:1.5, margin:'0 0 10px' }}>
            {rl('Рекомендуем обсудить с врачом анализ на ферритин (точнее, чем просто гемоглобин).', 'Consider asking your doctor about a ferritin test (more accurate than just hemoglobin).')}
          </p>
          <div style={{ fontSize:10, color:'var(--text3)', marginBottom:8 }}>
            📚 PubMed 37538011 · PMC7695235
          </div>
          <button onClick={dismiss} style={{ background:'none', border:'1px solid var(--border)', borderRadius:6, color:'var(--text3)', fontSize:11, padding:'4px 10px', cursor:'pointer' }}>
            {rl('Понятно, не показывать','Got it, dismiss')}
          </button>
        </div>
      </div>
    </div>
  )
}
