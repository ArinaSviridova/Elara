import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import AIAdvice from '../components/AIAdvice'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const MOOD_EMOJI = {
  happy:'😊', calm:'🌿', sad:'🌧', anxious:'💭',
  tired:'😴', irritated:'⚡', energetic:'🔥', romantic:'🌷',
  conflicted:'😤', grateful:'🙏'
}

const BODY_MODE_INFO = {
  no_period: {
    emoji: '🌙',
    titleRu: 'Твоё пространство',
    titleEn: 'Your space',
    descRu: 'Здесь твои персональные рекомендации, настроение и дневник — без привязки к циклу.',
    descEn: 'Here are your personal recommendations, mood and diary — not cycle-based.',
  },
  menopause: {
    emoji: '🌸',
    titleRu: 'Менопауза',
    titleEn: 'Menopause',
    descRu: 'Рекомендации адаптированы под твои потребности.',
    descEn: 'Recommendations are adapted to your needs.',
  },
  on_hormones: {
    emoji: '💊',
    titleRu: 'Гормональная терапия',
    titleEn: 'Hormone therapy',
    descRu: 'Не забывай принимать гормоны вовремя. AI советы учитывают твой режим.',
    descEn: 'Don\'t forget your hormones on time. AI advice considers your regimen.',
  },
}

const HORMONE_TIPS = {
  on_hormones: [
    { time: 'Утром', tip: 'Принять эстроген натощак или с едой — в одно и то же время каждый день', emoji: '🌅' },
    { time: 'Важно', tip: 'Если пропустила приём — прими как можно скорее, но не удваивай дозу', emoji: '⚠️' },
    { time: 'Следить', tip: 'Настроение, энергия и сон — главные индикаторы правильной дозы', emoji: '📊' },
  ],
  menopause: [
    { time: 'Сегодня', tip: 'Выпей 8 стаканов воды и побудь на солнце хотя бы 20 минут', emoji: '☀️' },
    { time: 'Питание', tip: 'Кальций и витамин D особенно важны сейчас', emoji: '🥛' },
    { time: 'Движение', tip: 'Умеренная нагрузка снижает приливы и улучшает настроение', emoji: '🚶' },
  ],
}

export default function NoPeriodPage({ bodyMode }) {
  const { user } = useAuth()
  const { lang } = useLang()
  const rl = (ru, en) => lang === 'en' ? en : ru
  const today = new Date().toISOString().slice(0,10)
  const [todayMood, setTodayMood] = useState(null)

  const info = BODY_MODE_INFO[bodyMode] || BODY_MODE_INFO.no_period
  const tips = HORMONE_TIPS[bodyMode] || []

  useEffect(() => {
    supabase.from('mood_entries').select('mood').eq('user_id', user.id).eq('date', today)
      .maybeSingle().then(({ data }) => { if (data) setTodayMood(data.mood) })
  }, [])

  async function saveMood(mood) {
    if (todayMood === mood) {
      await supabase.from('mood_entries').delete().eq('user_id', user.id).eq('date', today)
      setTodayMood(null)
    } else {
      await supabase.from('mood_entries').upsert(
        { user_id: user.id, date: today, mood },
        { onConflict: 'user_id,date' }
      )
      setTodayMood(mood)
    }
  }

  return (
    <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', padding:'24px 20px', gap:16, overflowY:'auto' }}>

      {/* Заголовок */}
      <div style={{ textAlign:'center', padding:'20px 0 8px' }}>
        <div style={{ fontSize:48, marginBottom:8 }}>{info.emoji}</div>
        <h2 style={{ fontSize:28, fontFamily:'Cormorant Garamond, serif' }}>
          {lang==='en' ? info.titleEn : info.titleRu}
        </h2>
        <p style={{ fontSize:13, color:'var(--text2)', marginTop:6, lineHeight:1.6 }}>
          {lang==='en' ? info.descEn : info.descRu}
        </p>
      </div>

      {/* Напоминания о гормонах */}
      {tips.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
            {rl('Рекомендации','Recommendations')}
          </div>
          {tips.map((tip, i) => (
            <div key={i} className="card" style={{ padding:'12px 14px', display:'flex', gap:12 }}>
              <span style={{ fontSize:22, flexShrink:0 }}>{tip.emoji}</span>
              <div>
                <div style={{ fontSize:11, color:'var(--accent)', marginBottom:3 }}>{tip.time}</div>
                <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.5 }}>{tip.tip}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Настроение */}
      <div className="card" style={{ padding:'14px' }}>
        <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>
          {rl('Как ты сегодня?','How are you today?')}
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
          {Object.entries(MOOD_EMOJI).map(([mood, emoji]) => (
            <button key={mood} onClick={() => saveMood(mood)} title={mood} style={{
              padding:'8px 11px', borderRadius:20, fontSize:16, cursor:'pointer',
              border:`1.5px solid ${todayMood===mood?'var(--accent)':'transparent'}`,
              background:todayMood===mood?'var(--accent-soft)':'var(--bg3)',
              transition:'all 0.15s',
            }}>{emoji}</button>
          ))}
        </div>
        {todayMood && (
          <div style={{ fontSize:12, color:'var(--text2)', marginTop:8 }}>{todayMood}</div>
        )}
      </div>

      {/* AI совет */}
      <AIAdvice
        requestType="self_advice"
        todayMood={todayMood}
        label={rl('✦ Персональный совет', '✦ Personal advice')}
      />

      {/* Напоминание о лекарствах */}
      {bodyMode === 'on_hormones' && (
        <div style={{ background:'rgba(167,139,250,0.1)', borderRadius:12, padding:'14px 16px', border:'1px solid rgba(167,139,250,0.3)' }}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:6 }}>
            💊 {rl('Гормоны сегодня?','Hormones today?')}
          </div>
          <p style={{ fontSize:12, color:'var(--text2)', margin:0, lineHeight:1.5 }}>
            {rl('Зайди в раздел Таблетки чтобы отметить приём и настроить напоминание.',
               'Go to Medications to log your intake and set a reminder.')}
          </p>
        </div>
      )}
    </div>
  )
}
