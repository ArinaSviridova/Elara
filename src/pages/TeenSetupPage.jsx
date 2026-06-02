import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTeen } from '../context/TeenModeContext'
import { useLang } from '../context/LangContext'
import { supabase } from '../lib/supabase'

// Советы для подростков по стилю
const TEEN_TIPS = {
  first_period: {
    cycleInfo: 'В первые 1-2 года цикл может быть нерегулярным — это абсолютно нормально. Твоё тело только учится.',
    irregular: 'Если между менструациями прошло больше 90 дней — стоит поговорить с врачом или мамой.',
    pms: 'Перепады настроения перед месячными — это гормоны, не ты. Это пройдёт.',
    ovulation: 'Овуляция — это когда созревает яйцеклетка. В этот период беременность возможна даже при нерегулярном цикле.',
  },
  early_teen: {
    cycleInfo: 'Нормальный цикл — от 21 до 45 дней. У подростков он часто нестабильный первые 2-3 года.',
    irregular: 'Стресс, учёба, спорт — всё влияет на цикл. Это нормально.',
    pms: 'ПМС у подростков бывает сильнее чем у взрослых. Тепло, отдых и магний помогают.',
    ovulation: 'Фертильный период — примерно середина цикла. Важно знать если ты сексуально активна.',
  },
  teen: {
    cycleInfo: 'Твой цикл — твои данные. Чем дольше ведёшь дневник, тем точнее прогноз.',
    irregular: 'Нерегулярность в 16-18 лет всё ещё бывает нормой. Но резкие изменения стоит обсудить с врачом.',
    pms: 'Если ПМС сильно влияет на жизнь — это повод к гинекологу, не просто «так бывает».',
    ovulation: 'Знание своего цикла = понимание своего тела. Это важный навык на всю жизнь.',
  },
}

export default function TeenSetupPage({ onDone }) {
  const { user, profile, updateProfile } = useAuth()
  const { addParent } = useTeen()
  const { lang } = useLang()
  const rl = (ru, en) => lang === 'en' ? en : ru

  const [step, setStep] = useState(1) // 1=возраст, 2=объяснение, 3=родитель, 4=готово
  const [birthYear, setBirthYear] = useState('')
  const [parentCode, setParentCode] = useState('')
  const [hidePartner, setHidePartner] = useState(false)
  const [permissions, setPermissions] = useState({
    can_see_calendar: false,
    can_see_moods: false,
    gets_irregular_alerts: true,
    gets_delay_alerts: true,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const age = birthYear ? new Date().getFullYear() - parseInt(birthYear) : null
  const style = !age ? 'teen' : age < 13 ? 'first_period' : age <= 15 ? 'early_teen' : 'teen'
  const tips = TEEN_TIPS[style]

  async function saveAgeMode() {
    setLoading(true)
    await updateProfile({
      age_mode: 'teen',
      birth_year: parseInt(birthYear),
    })
    setLoading(false)
    setStep(2)
  }

  async function handleAddParent() {
    if (!parentCode.trim()) { setStep(4); return }
    setLoading(true); setError('')
    const result = await addParent(parentCode, permissions)
    if (result.error) { setError(result.error); setLoading(false); return }

    // Сохраняем настройку скрытия партнёра
    await updateProfile({
      teen_settings: { hide_partner: hidePartner },
    })
    setLoading(false)
    setStep(4)
  }

  // Шаг 1 — возраст
  if (step === 1) return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'32px 24px', gap:24 }}>
      <div>
        <div style={{ fontSize:40, marginBottom:12, textAlign:'center' }}>🌸</div>
        <h2 style={{ fontSize:26, textAlign:'center', marginBottom:8 }}>
          {rl('Привет! Это приложение для тебя', 'Hi! This app is for you')}
        </h2>
        <p style={{ fontSize:14, color:'var(--text2)', textAlign:'center', lineHeight:1.7 }}>
          {rl('Скажи в каком году ты родился(ась) — мы адаптируем приложение под твой возраст', 'Tell us your birth year — we\'ll adapt the app for your age')}
        </p>
      </div>
      <div>
        <div style={{ fontSize:12, color:'var(--text3)', marginBottom:6 }}>{rl('Год рождения','Birth year')}</div>
        <input
          type="number" placeholder="2008" min="2000" max={new Date().getFullYear() - 10}
          value={birthYear} onChange={e => setBirthYear(e.target.value)}
          style={{ fontSize:20, textAlign:'center', letterSpacing:'0.1em' }}
        />
        {age && age < 13 && (
          <p style={{ fontSize:12, color:'var(--accent)', marginTop:8, textAlign:'center' }}>
            🌸 {rl('Похоже у тебя недавно начались первые месячные. Мы будем особенно бережны!', 'Looks like you recently got your first period. We\'ll be extra gentle!')}
          </p>
        )}
      </div>
      <button className="btn btn-primary" onClick={saveAgeMode} disabled={!birthYear || loading || !age || age > 19 || age < 10}>
        {loading ? '...' : rl('Продолжить','Continue')}
      </button>
    </div>
  )

  // Шаг 2 — объяснения о цикле
  if (step === 2) return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', padding:'24px 20px', gap:16, overflowY:'auto' }}>
      <div style={{ fontSize:30, textAlign:'center', margin:'8px 0' }}>📚</div>
      <h2 style={{ fontSize:24, textAlign:'center' }}>
        {rl('Немного о цикле','A bit about your cycle')}
      </h2>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {[
          { emoji:'🩸', text: tips.cycleInfo },
          { emoji:'📅', text: tips.irregular },
          { emoji:'🌧', text: tips.pms },
          { emoji:'✨', text: tips.ovulation },
        ].map((tip, i) => (
          <div key={i} style={{ background:'var(--bg2)', borderRadius:12, padding:'14px 16px', border:'1px solid var(--border)', display:'flex', gap:12 }}>
            <span style={{ fontSize:20, flexShrink:0 }}>{tip.emoji}</span>
            <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6, margin:0 }}>{tip.text}</p>
          </div>
        ))}
      </div>
      <p style={{ fontSize:12, color:'var(--text3)', textAlign:'center', lineHeight:1.6 }}>
        {rl('Всё что ты вносишь — только твоё. Никто не видит без твоего разрешения.', 'Everything you enter is yours. No one sees it without your permission.')}
      </p>
      <button className="btn btn-primary" onClick={() => setStep(3)}>
        {rl('Понятно, продолжить','Got it, continue')}
      </button>
    </div>
  )

  // Шаг 3 — добавление родителя
  if (step === 3) return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', padding:'24px 20px', gap:16, overflowY:'auto' }}>
      <div style={{ fontSize:30, textAlign:'center', margin:'8px 0' }}>👩‍👧</div>
      <h2 style={{ fontSize:24, textAlign:'center' }}>
        {rl('Добавить маму или папу?','Add a parent?')}
      </h2>
      <p style={{ fontSize:13, color:'var(--text2)', textAlign:'center', lineHeight:1.6 }}>
        {rl('Это необязательно! Только ты решаешь что им видно. Можно пропустить.', 'This is optional! Only you decide what they see. You can skip.')}
      </p>

      <div className="card" style={{ padding:'14px 16px' }}>
        <div style={{ fontSize:13, fontWeight:500, marginBottom:10 }}>{rl('Код родителя (необязательно)','Parent\'s code (optional)')}</div>
        <input placeholder={rl('Код из приложения мамы/папы','Code from parent\'s app')} value={parentCode}
          onChange={e => setParentCode(e.target.value.toUpperCase())} style={{ letterSpacing:'0.15em' }} />
      </div>

      {parentCode.trim() && (
        <div className="card" style={{ padding:'14px 16px' }}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:12 }}>
            {rl('Что видит родитель — ты выбираешь','What parent sees — your choice')}
          </div>
          {[
            { key:'can_see_calendar', ru:'Видит мой календарь цикла', en:'Sees my cycle calendar' },
            { key:'can_see_moods', ru:'Видит моё настроение', en:'Sees my mood' },
            { key:'gets_irregular_alerts', ru:'Получает уведомление если цикл нерегулярный', en:'Gets alert if cycle is irregular' },
            { key:'gets_delay_alerts', ru:'Получает уведомление при задержке более 7 дней', en:'Gets alert if period is 7+ days late' },
          ].map(item => (
            <div key={item.key} style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
              <button onClick={() => setPermissions(p => ({ ...p, [item.key]: !p[item.key] }))} style={{
                width:40, height:22, borderRadius:11, cursor:'pointer', border:'none', flexShrink:0,
                background:permissions[item.key] ? 'var(--accent)' : 'var(--bg3)', position:'relative', transition:'all 0.2s',
              }}>
                <div style={{ position:'absolute', top:2, left:permissions[item.key]?20:2, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left 0.2s' }} />
              </button>
              <span style={{ fontSize:12, color:'var(--text2)' }}>{lang==='en'?item.en:item.ru}</span>
            </div>
          ))}

          <div style={{ borderTop:'1px solid var(--border)', paddingTop:12, marginTop:4 }}>
            <div style={{ fontSize:13, fontWeight:500, marginBottom:8, color:'#f472b6' }}>
              🔒 {rl('Скрыть партнёра от родителя?','Hide partner from parent?')}
            </div>
            <p style={{ fontSize:12, color:'var(--text3)', marginBottom:10, lineHeight:1.5 }}>
              {rl('Если включить — партнёр не будет виден в приложении когда зайдёт родитель. Только ты знаешь.', 'If enabled — partner won\'t be visible when a parent opens the app. Only you know.')}
            </p>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <button onClick={() => setHidePartner(h => !h)} style={{
                width:40, height:22, borderRadius:11, cursor:'pointer', border:'none', flexShrink:0,
                background:hidePartner ? '#f472b6' : 'var(--bg3)', position:'relative', transition:'all 0.2s',
              }}>
                <div style={{ position:'absolute', top:2, left:hidePartner?20:2, width:18, height:18, borderRadius:'50%', background:'#fff', transition:'left 0.2s' }} />
              </button>
              <span style={{ fontSize:12, color:'var(--text2)' }}>{rl('Скрыть партнёра','Hide partner')}</span>
            </div>
          </div>
        </div>
      )}

      {error && <p style={{ color:'#f87171', fontSize:13 }}>{error}</p>}

      <button className="btn btn-primary" onClick={handleAddParent} disabled={loading}>
        {loading ? '...' : parentCode.trim() ? rl('Добавить и продолжить','Add & continue') : rl('Пропустить','Skip')}
      </button>
    </div>
  )

  // Шаг 4 — готово
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'32px 24px', gap:20, textAlign:'center' }}>
      <div style={{ fontSize:60 }}>🌸</div>
      <h2 style={{ fontSize:26 }}>{rl('Всё готово!','All set!')}</h2>
      <p style={{ fontSize:14, color:'var(--text2)', lineHeight:1.7 }}>
        {rl('Приложение настроено для тебя. Помни — здесь всё твоё, в безопасности.', 'The app is set up for you. Remember — everything here is yours, safe and private.')}
      </p>



      {/* Приватность — скрытые разделы */}
      <div style={{ padding:'14px', background:'rgba(248,113,113,0.06)', borderRadius:12, border:'1px solid rgba(248,113,113,0.15)', marginBottom:4 }}>
        <div style={{ fontSize:13, fontWeight:500, marginBottom:6 }}>🔒 {rl('Двойной PIN (необязательно)', 'Dual PIN (optional)')}</div>
        <p style={{ fontSize:12, color:'var(--text2)', lineHeight:1.5, margin:'0 0 8px' }}>
          {rl(
            'Можно настроить два PIN-кода: реальный открывает всё приложение, ложный — скрывает интимные разделы. Удобно если кто-то смотрит через плечо.',
            'Set two PINs: real one opens everything, decoy one hides intimate sections. Useful if someone is looking over your shoulder.'
          )}
        </p>
        <div style={{ fontSize:11, color:'var(--text3)' }}>
          {rl('Настроить можно в Профиль → Безопасность', 'Set up in Profile → Security')}
        </div>
      </div>

      <button className="btn btn-primary" onClick={onDone}>
        {rl('Начать','Start')}
      </button>
    </div>
  )
}
