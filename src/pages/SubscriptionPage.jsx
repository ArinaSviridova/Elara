import { useState } from 'react'
import { useSub } from '../context/SubscriptionContext'
import { useLang } from '../context/LangContext'

export default function SubscriptionPage() {
  const { plan, isTrial, trialDaysLeft, applyPromoCode, openStripeCheckout } = useSub()
  const { lang } = useLang()
  const [promoCode, setPromoCode] = useState('')
  const [promoMsg, setPromoMsg] = useState(null) // { text, ok }
  const [promoLoading, setPromoLoading] = useState(false)
  const [billingPeriod, setBillingPeriod] = useState('year') // month | year
  const rl = (ru, en) => lang === 'en' ? en : ru

  const FEATURES_FREE = {
    ru: ['Календарь цикла + базовый прогноз', 'До 3 подруг', 'Дневник (без AI)', '1 группа', 'Настроение по дням'],
    en: ['Cycle calendar + basic forecast', 'Up to 3 friends', 'Diary (no AI)', '1 group', 'Daily mood'],
  }
  const FEATURES_PLUS = {
    ru: ['Всё из Free', 'AI советы тебе и партнёру', 'AI анализ дневника + предложение тегов', 'Прогноз настроения по фазам', 'Неограниченные группы и подруги', 'Трекер беременности', 'Умные push-уведомления', 'Таблетки + AI время приёма'],
    en: ['Everything in Free', 'AI advice for you & partner', 'AI diary analysis + tag suggestions', 'Mood forecast by phase', 'Unlimited groups & friends', 'Pregnancy tracker', 'Smart push notifications', 'Medications + AI timing'],
  }
  const FEATURES_FAMILY = {
    ru: ['Всё из Plus', 'Режим подростка + родительский контроль', 'До 10 человек в аккаунте', 'AI персонализация (характер, предпочтения)', 'Трекер интимной жизни', 'Скрытый партнёр для подростка', 'Приоритетная поддержка'],
    en: ['Everything in Plus', 'Teen mode + parental control', 'Up to 10 people', 'AI personalization', 'Intimacy tracker', 'Hidden partner for teens', 'Priority support'],
  }

  // Определяем валюту по локали устройства
  const locale = navigator.language || navigator.languages?.[0] || 'ru-RU'
  const region = locale.split('-')[1] || locale.split('_')[1] || ''
  
  // Базовые цены в USD: Plus год $19.9, Plus мес $3.99, Family год $34.9, Family мес $5.99
  const RATES = { RU: 90, UA: 41, BY: 3.2, KZ: 450, GE: 2.7, AM: 390, AZ: 1.7, MD: 18, UZ: 12500, KG: 89 }
  const SYMBOLS = { RU: '₽', UA: '₴', BY: 'Br', KZ: '₸', GE: '₾', AM: '֏', AZ: '₼', MD: 'L', UZ: "so'm", KG: 'с' }
  
  function getLocalPrice(usdAmount, period) {
    const rate = RATES[region]
    if (!rate) return period === 'yr' ? `$${usdAmount}/yr` : `$${usdAmount}/mo`
    const raw = usdAmount * rate
    // Округляем до ближайших 50
    const rounded = Math.ceil(raw / 50) * 50
    const sym = SYMBOLS[region]
    const periodLabel = period === 'yr' ? (lang === 'en' ? '/yr' : '/год') : (lang === 'en' ? '/mo' : '/мес')
    return `${rounded.toLocaleString()} ${sym}${periodLabel}`
  }

  const prices = billingPeriod === 'year'
    ? { plus: getLocalPrice(19.9, 'yr'), family: getLocalPrice(34.9, 'yr') }
    : { plus: getLocalPrice(3.99, 'mo'), family: getLocalPrice(5.99, 'mo') }

  async function handlePromo(e) {
    e.preventDefault()
    setPromoLoading(true); setPromoMsg(null)
    const result = await applyPromoCode(promoCode)
    if (result.error) {
      setPromoMsg({ text: result.error, ok: false })
    } else {
      const msgs = {
        free_plus:        rl('✓ Elara Plus активирован навсегда! 🎉', '✓ Elara Plus activated forever! 🎉'),
        free_family:      rl('✓ Elara Family активирован навсегда! 🎉', '✓ Elara Family activated forever! 🎉'),
        extra_trial:      rl('✓ Пробный период продлён до 14 дней!', '✓ Trial extended to 14 days!'),
        discount_50_plus: rl('✓ Скидка 50% на Plus! Применится при оплате.', '✓ 50% off Plus! Applied at checkout.'),
        discount_50_family: rl('✓ Скидка 50% на Family! Применится при оплате.', '✓ 50% off Family! Applied at checkout.'),
      }
      setPromoMsg({ text: msgs[result.type] || '✓ Код применён!', ok: true })
    }
    setPromoLoading(false)
  }

  function PlanCard({ name, price, features, locked, color, planId, current, recommended }) {
    return (
      <div style={{
        background:'var(--bg2)', borderRadius:14, padding:'16px',
        border:`1.5px solid ${current ? color : 'var(--border)'}`,
        position:'relative', marginBottom:10,
      }}>
        {recommended && (
          <div style={{ position:'absolute', top:-10, left:16, background:color, color:'#0a0a0a', fontSize:10, padding:'2px 10px', borderRadius:20, fontWeight:500 }}>
            {rl('Рекомендуем','Recommended')}
          </div>
        )}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
          <div style={{ fontSize:16, fontWeight:500, color }}>{name}</div>
          {price && <div style={{ fontSize:12, color:'var(--text2)' }}>{price}</div>}
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:5, marginBottom:12 }}>
          {features.map(f => (
            <div key={f} style={{ display:'flex', gap:7, fontSize:12, color:'var(--text2)' }}>
              <span style={{ color:'#4ade80', flexShrink:0 }}>✓</span>{f}
            </div>
          ))}
          {locked?.map(f => (
            <div key={f} style={{ display:'flex', gap:7, fontSize:12, color:'var(--text3)' }}>
              <span style={{ flexShrink:0 }}>🔒</span>{f}
            </div>
          ))}
        </div>
        {current ? (
          <div style={{ fontSize:12, color, textAlign:'center' }}>✓ {rl('Текущий план','Current plan')}</div>
        ) : planId && (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
            <button onClick={() => openStripeCheckout(planId+'_month')} style={{
              padding:'9px', borderRadius:8, border:`1px solid ${color}`, background:'transparent',
              color, fontSize:11, cursor:'pointer',
            }}>{rl('Помесячно','Monthly')}</button>
            <button onClick={() => openStripeCheckout(planId+'_year')} style={{
              padding:'9px', borderRadius:8, border:'none', background:color,
              color:'#0a0a0a', fontSize:11, cursor:'pointer', fontWeight:500,
            }}>{rl('Год — выгоднее','Yearly — save 40%')}</button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', padding:'24px 20px', gap:16, overflowY:'auto' }}>
      <h2 style={{ fontSize:30 }}>{rl('Подписка','Subscription')}</h2>

      {/* Текущий статус */}
      <div style={{ background:'var(--bg2)', borderRadius:12, padding:'14px 16px', border:'1px solid var(--border)' }}>
        <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:4 }}>
          {rl('Сейчас','Status')}
        </div>
        <div style={{ fontSize:18, fontFamily:'Cormorant Garamond, serif', color:'var(--accent)' }}>
          {plan === 'trial' ? rl('Пробный период', 'Free Trial')
            : plan === 'plus' ? 'Elara Plus ✦'
            : plan === 'family' ? 'Elara Family 🌸'
            : rl('Бесплатный','Free')}
        </div>
        {isTrial && (
          <div style={{ fontSize:12, color: trialDaysLeft() <= 2 ? '#f87171' : '#facc15', marginTop:4 }}>
            {rl(`Осталось ${trialDaysLeft()} дн — все функции открыты`, `${trialDaysLeft()} days left — all features unlocked`)}
          </div>
        )}
      </div>

      {/* Планы */}
      <PlanCard
        name={rl('🌙 Free','🌙 Free')}
        price={rl('Бесплатно','Free forever')}
        features={lang==='en'?FEATURES_FREE.en:FEATURES_FREE.ru}
        locked={[rl('AI советы','AI advice'), rl('Прогноз настроения','Mood forecast')]}
        color="var(--text3)"
        current={plan === 'free'}
      />
      <PlanCard
        name="✦ Elara Plus"
        price={prices.plus}
        features={lang==='en'?FEATURES_PLUS.en:FEATURES_PLUS.ru}
        locked={[rl('Режим подростка','Teen mode')]}
        color="#a78bfa"
        planId="plus"
        current={plan === 'plus'}
        recommended
      />
      <PlanCard
        name="🌸 Elara Family"
        price={prices.family}
        features={lang==='en'?FEATURES_FAMILY.en:FEATURES_FAMILY.ru}
        color="#f472b6"
        planId="family"
        current={plan === 'family'}
      />

      {/* Промокод */}
      <div className="card" style={{ padding:'16px' }}>
        <div style={{ fontSize:13, fontWeight:500, marginBottom:4 }}>
          🎁 {rl('Промокод','Promo code')}
        </div>
        <div style={{ fontSize:11, color:'var(--text3)', marginBottom:10 }}>
          {rl('Есть личный код? Получи бесплатный доступ или скидку', 'Have a code? Get free access or discount')}
        </div>
        <form onSubmit={handlePromo} style={{ display:'flex', gap:8 }}>
          <input
            placeholder={rl('ELARA-PLUS-01','ELARA-PLUS-01')}
            value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase())}
            style={{ flex:1, letterSpacing:'0.1em', fontSize:14 }}
          />
          <button type="submit" className="btn btn-primary" disabled={promoLoading || !promoCode.trim()} style={{ width:'auto', padding:'0 16px', fontSize:12 }}>
            {promoLoading ? '...' : rl('Применить','Apply')}
          </button>
        </form>
        {promoMsg && (
          <p style={{ fontSize:13, marginTop:8, color: promoMsg.ok ? '#4ade80' : '#f87171', lineHeight:1.4 }}>
            {promoMsg.text}
          </p>
        )}
      </div>

      {/* Про PWA и платежи */}
      <div style={{ background:'var(--bg2)', borderRadius:10, padding:'12px 14px', border:'1px solid var(--border)' }}>
        <div style={{ fontSize:11, color:'var(--text3)', marginBottom:4 }}>{rl('Про оплату','About payments')}</div>
        <p style={{ fontSize:12, color:'var(--text2)', lineHeight:1.6, margin:0 }}>
          {rl(
            'Оплата через Stripe — безопасно, без комиссии Google/Apple. Скоро откроем приём платежей. Пока используй промокод или оставайся на trial.',
            'Payments via Stripe — secure, no Google/Apple commission. Coming soon. Use a promo code or stay on trial for now.'
          )}
        </p>
      </div>
    </div>
  )
}
