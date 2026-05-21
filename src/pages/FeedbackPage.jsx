import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'

const FAQ = [
  {
    q: { ru: 'Как отменить подписку?', en: 'How to cancel subscription?' },
    a: { ru: 'Зайди в Профиль → Подписка → внизу страницы есть кнопка отмены. Если оплатила через промокод — напиши нам, отменим вручную.', en: 'Go to Profile → Subscription → cancel button at the bottom. If you paid via promo code — write to us.' },
  },
  {
    q: { ru: 'Случайно списали деньги — что делать?', en: 'I was charged by mistake — what to do?' },
    a: { ru: '1. Напиши нам через форму ниже\n2. Укажи email и дату платежа\n3. Мы вернём деньги в течение 3-5 рабочих дней', en: '1. Write to us below\n2. Include email and payment date\n3. We\'ll refund within 3-5 business days' },
  },
  {
    q: { ru: 'Почему AI даёт одинаковые советы?', en: 'Why does AI give the same advice?' },
    a: { ru: 'Заполни Персонализацию в профиле — характер и предпочтения. Также выбери настроение на главном экране — советы станут личными.', en: 'Fill in Personalization in profile — character and preferences. Also select mood on the main screen.' },
  },
  {
    q: { ru: 'Как добавить партнёра?', en: 'How to add a partner?' },
    a: { ru: 'Круг → Добавить → введи код партнёра. Попроси его открыть Профиль — там есть его личный код.', en: 'Circle → Add → enter partner\'s code. Ask them to open Profile — their personal code is there.' },
  },
  {
    q: { ru: 'Дневник не открывается без пароля', en: 'Diary asks for password every time' },
    a: { ru: 'Обнови приложение — в новой версии пароль запоминается. Если проблема осталась, напиши нам.', en: 'Update the app — the new version remembers the password. If the issue persists, write to us.' },
  },
  {
    q: { ru: 'Как работает прогноз цикла?', en: 'How does cycle prediction work?' },
    a: { ru: 'Алгоритм считает медиану всех твоих циклов. Чем больше данных — тем точнее. Минимум 2-3 цикла для первого прогноза.', en: 'The algorithm calculates the median of all your cycles. More data = more accurate. Minimum 2-3 cycles for first prediction.' },
  },
]

export default function FeedbackPage() {
  const { user, profile } = useAuth()
  const { lang } = useLang()
  const rl = (ru, en) => lang === 'en' ? en : ru

  const [openFaq, setOpenFaq] = useState(null)
  const [type, setType] = useState('bug')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState(user?.email || '')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!message.trim()) return
    setSending(true); setError('')
    try {
      const { error: fnErr } = await supabase.functions.invoke('send-feedback', {
        body: {
          userId: user?.id,
          userName: profile?.name,
          userEmail: email,
          type,
          message: message.trim(),
          lang,
        }
      })
      if (fnErr) throw fnErr
      setSent(true); setMessage('')
    } catch {
      setError(rl('Не удалось отправить. Попробуй позже или напиши на elara.support@gmail.com', 'Could not send. Try later or email elara.support@gmail.com'))
    }
    setSending(false)
  }

  const TYPES = [
    { key:'bug', emoji:'🐛', ru:'Ошибка', en:'Bug' },
    { key:'idea', emoji:'💡', ru:'Идея', en:'Idea' },
    { key:'payment', emoji:'💳', ru:'Оплата', en:'Payment' },
    { key:'other', emoji:'💬', ru:'Другое', en:'Other' },
  ]

  return (
    <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', padding:'24px 20px', gap:16, overflowY:'auto' }}>
      <h2 style={{ fontSize:28 }}>💬 {rl('Обратная связь','Feedback')}</h2>

      {/* FAQ */}
      <div>
        <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>
          {rl('Частые вопросы','FAQ')}
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {FAQ.map((faq, i) => (
            <div key={i} className="card" style={{ padding:'12px 14px', cursor:'pointer' }} onClick={() => setOpenFaq(openFaq===i?null:i)}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:10 }}>
                <div style={{ fontSize:13, color:'var(--text)', fontWeight:500 }}>
                  {lang==='en'?faq.q.en:faq.q.ru}
                </div>
                <span style={{ color:'var(--text3)', fontSize:16, flexShrink:0 }}>{openFaq===i?'▲':'▾'}</span>
              </div>
              {openFaq===i && (
                <div style={{ fontSize:13, color:'var(--text2)', marginTop:10, lineHeight:1.7, whiteSpace:'pre-line' }}>
                  {lang==='en'?faq.a.en:faq.a.ru}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Форма */}
      {sent ? (
        <div style={{ textAlign:'center', padding:'30px 20px' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>✓</div>
          <h3 style={{ fontSize:20 }}>{rl('Отправлено!','Sent!')}</h3>
          <p style={{ fontSize:13, color:'var(--text2)', marginTop:8 }}>
            {rl('Обычно отвечаем в течение 24 часов','We usually reply within 24 hours')}
          </p>
          <button className="btn btn-ghost" style={{ marginTop:16 }} onClick={() => setSent(false)}>
            {rl('Написать ещё','Send another')}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div>
            <div style={{ fontSize:11, color:'var(--text3)', marginBottom:8 }}>{rl('Тема','Topic')}</div>
            <div style={{ display:'flex', gap:6 }}>
              {TYPES.map(t => (
                <button key={t.key} type="button" onClick={() => setType(t.key)} style={{
                  flex:1, padding:'9px 4px', borderRadius:8, fontSize:12, cursor:'pointer',
                  border:`1px solid ${type===t.key?'var(--accent)':'var(--border)'}`,
                  background:type===t.key?'var(--accent-soft)':'transparent',
                  color:type===t.key?'var(--accent)':'var(--text2)',
                  display:'flex', flexDirection:'column', alignItems:'center', gap:3,
                }}>
                  <span>{t.emoji}</span>
                  <span style={{ fontSize:10 }}>{lang==='en'?t.en:t.ru}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize:11, color:'var(--text3)', marginBottom:5 }}>Email</div>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />
          </div>

          <div>
            <div style={{ fontSize:11, color:'var(--text3)', marginBottom:5 }}>{rl('Сообщение','Message')}</div>
            <textarea value={message} onChange={e => setMessage(e.target.value)} required
              placeholder={rl('Опиши что случилось...','Describe what happened...')}
              style={{ minHeight:120, resize:'vertical' }} />
          </div>

          {error && <p style={{ color:'#f87171', fontSize:12, lineHeight:1.5 }}>{error}</p>}

          <button type="submit" className="btn btn-primary" disabled={sending || !message.trim()}>
            {sending ? rl('Отправляю...','Sending...') : rl('Отправить','Send')}
          </button>
        </form>
      )}
    </div>
  )
}
