import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang, useRl } from '../context/LangContext'
import AIAdvice from '../components/AIAdvice'
import DayStatusWidget from '../components/DayStatusWidget'
import InfoTooltip from '../components/InfoTooltip'
import { supabase } from '../lib/supabase'

const MOOD_EMOJI = {
  happy:'😊', calm:'🌿', sad:'🌧', anxious:'💭',
  tired:'😴', irritated:'⚡', energetic:'🔥', romantic:'🌷',
  conflicted:'😤', grateful:'🙏'
}

const BODY_MODE_INFO = {
  no_period: {
    emoji: '🌙',
    titleRu: 'Твоё пространство', titleEn: 'Your space',
    descRu: 'Персональные рекомендации, настроение и дневник — без привязки к циклу.',
    descEn: 'Personal recommendations, mood and diary — not cycle-based.',
    tabRu: 'Моё', tabEn: 'Mine',
  },
  menopause: {
    emoji: '🌸',
    titleRu: 'Мой день', titleEn: 'My day',
    descRu: 'Рекомендации адаптированы под твои потребности.',
    descEn: 'Recommendations are adapted to your needs.',
    tabRu: 'Мой день', tabEn: 'My day',
  },
  on_hormones: {
    emoji: '💊',
    titleRu: 'Мой день', titleEn: 'My day',
    descRu: 'Не забывай принимать гормоны вовремя.',
    descEn: "Don't forget your hormones on time.",
    tabRu: 'Здоровье', tabEn: 'Health',
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

export default function NoPeriodPage({ bodyMode, modules: modulesProp }) {
  const activeModules = modulesProp || {
    hormones: bodyMode === 'on_hormones',
    menopause: bodyMode === 'menopause',
    pregnancy: bodyMode === 'pregnant',
    symptoms: true, medications: true, moodTracking: true,
  }
  const { user, profile } = useAuth()
  const { t, lang } = useLang()
  const rl = useRl()
  const navigate = useNavigate()
  const today = new Date().toISOString().slice(0,10)
  const [todayMoods, setTodayMoods] = useState([])

  const info = BODY_MODE_INFO[bodyMode] || BODY_MODE_INFO.no_period
  const tips = HORMONE_TIPS[bodyMode] || []

  useEffect(() => {
    supabase.from('mood_entries').select('mood').eq('user_id', user.id).eq('date', today)
      .then(({ data }) => {
        if (data) setTodayMoods(data.map(d => d.mood).filter(Boolean))
      })
  }, [])

  async function saveMood(mood) {
    if (todayMoods.includes(mood)) {
      await supabase.from('mood_entries').delete().eq('user_id', user.id).eq('date', today).eq('mood', mood)
      setTodayMoods(prev => prev.filter(m => m !== mood))
    } else {
      await supabase.from('mood_entries').insert({ user_id: user.id, date: today, mood })
      setTodayMoods(prev => [...prev, mood])
    }
  }

  return (
    <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', padding:'24px 20px', gap:16, overflowY:'auto' }}>
      <div style={{ textAlign:'center', padding:'20px 0 8px' }}>
        <div style={{ fontSize:48, marginBottom:8 }}>{info.emoji}</div>
        <h2 style={{ fontSize:28, fontFamily:'Cormorant Garamond, serif' }}>
          {lang==='en' ? info.titleEn : info.titleRu}
        </h2>
        <p style={{ fontSize:13, color:'var(--text2)', marginTop:6, lineHeight:1.6 }}>
          {lang==='en' ? info.descEn : info.descRu}
        </p>
      </div>

      <DayStatusWidget />


      {/* Быстрые разделы здоровья */}
      <div className="card" style={{ padding:'14px', display:'flex', flexDirection:'column', gap:10 }}>
        <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
          {rl('Здоровье и уход','Health & care')}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          {[
            { icon:'💊', label:rl('Таблетки','Medications'), path:'/medications' },
            { icon:'🏃', label:rl('Спорт и активность','Sport & activity'), path:'/sport' },
            { icon:'🩺', label:rl('Настройки здоровья','Health settings'), path:'/health' },
            { icon:'🔬', label:rl('Архив анализов','Health archive'), path:'/health-archive' },
          ].map(item => (
            <button key={item.path} onClick={() => navigate(item.path)} style={{
              padding:'12px 10px', borderRadius:12, cursor:'pointer', textAlign:'left',
              border:'1px solid var(--border)', background:'var(--bg2)', color:'var(--text)',
              display:'flex', alignItems:'center', gap:8, minHeight:48,
            }}>
              <span style={{ fontSize:18 }}>{item.icon}</span>
              <span style={{ fontSize:12, lineHeight:1.25 }}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Напоминания */}
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

      {/* Настроение — мульти-выбор с подписями */}
      <div className="card" style={{ padding:'14px' }}>
        <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>
          {t.moodToday || rl('Как ты сегодня?','How are you today?')}
        </div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {Object.entries(MOOD_EMOJI).map(([mood, emoji]) => (
            <button key={mood} onClick={() => saveMood(mood)} style={{
              padding:'6px 10px', borderRadius:20, cursor:'pointer',
              border:`1.5px solid ${todayMoods.includes(mood)?'var(--accent)':'transparent'}`,
              background:todayMoods.includes(mood)?'var(--accent-soft)':'var(--bg3)',
              transition:'all 0.15s', display:'flex', alignItems:'center', gap:5,
            }}>
              <span style={{ fontSize:16 }}>{emoji}</span>
              <span style={{ fontSize:11, color:todayMoods.includes(mood)?'var(--accent)':'var(--text3)' }}>
                {t[mood] || mood}
              </span>
            </button>
          ))}
        </div>
        {todayMoods.length > 0 && (
          <div style={{ fontSize:12, color:'var(--text2)', marginTop:8 }}>
            {todayMoods.map(m => t[m]||m).join(' · ')}
          </div>
        )}
      </div>

      {/* Спортивный блок для мужчин и без месячных */}
      {(bodyMode === 'no_period' || bodyMode === 'menopause' || bodyMode === 'on_hormones') && (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
            🏃 {rl('Активность и спорт','Activity & sport')}
          </div>
          {[
            { emoji:'💪', title:rl('Силовые тренировки','Strength'), tip:rl('Сила зависит от тестостерона и кортизола. Лучший результат — утром при пике гормонов.','Strength depends on testosterone and cortisol. Best results in the morning.') },
            { emoji:'🧘', title:rl('Восстановление','Recovery'), tip:rl('Хронический стресс снижает тестостерон. Медитация и сон — часть тренировки.','Chronic stress lowers testosterone. Meditation and sleep are part of training.') },
            { emoji:'🏊', title:rl('Кардио','Cardio'), tip:rl('Умеренное кардио улучшает настроение через эндорфины. Не переусердствуй — избыток снижает тестостерон.','Moderate cardio improves mood via endorphins. Don\'t overdo — excess lowers testosterone.') },
          ].map((item, i) => (
            <div key={i} className="card" style={{ padding:'12px 14px', display:'flex', gap:12 }}>
              <span style={{ fontSize:22, flexShrink:0 }}>{item.emoji}</span>
              <div>
                <div style={{ fontSize:12, fontWeight:500, marginBottom:3 }}>{item.title}</div>
                <div style={{ fontSize:12, color:'var(--text2)', lineHeight:1.5 }}>{item.tip}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AIAdvice requestType="self_advice" todayMood={todayMoods[0]}
        label={rl('✦ Персональный совет','✦ Personal advice')} />

      {bodyMode === 'on_hormones' && (
        <div style={{ background:'rgba(167,139,250,0.1)', borderRadius:12, padding:'14px 16px', border:'1px solid rgba(167,139,250,0.3)' }}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:6 }}>
            💊 {rl('Гормоны сегодня?','Hormones today?')}
          </div>
          <p style={{ fontSize:12, color:'var(--text2)', margin:0, lineHeight:1.5 }}>
            {rl('Зайди в Таблетки чтобы отметить приём.','Go to Medications to log your intake.')}
          </p>
        </div>
      )}

      {/* Трекер дисфории — только для ГАТ режима */}
      {bodyMode === 'on_hormones' && (
        <button onClick={() => window.location.href='/dysphoria'} className="btn btn-ghost"
          style={{ display:'flex', alignItems:'center', gap:10, justifyContent:'flex-start', borderColor:'rgba(167,139,250,0.4)', color:'#a78bfa' }}>
          💜 {rl('Дневник дисфории','Dysphoria journal')}
        </button>
      )}

    </div>
  )
}
