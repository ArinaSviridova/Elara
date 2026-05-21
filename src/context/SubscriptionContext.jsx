import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const SubContext = createContext(null)

// Обновлённая миграция для новых типов кодов
// Добавь в subscription_migration.sql:
// ALTER TABLE promo_codes DROP CONSTRAINT IF EXISTS promo_codes_type_check;
// ALTER TABLE promo_codes ADD CONSTRAINT promo_codes_type_check
//   CHECK (type IN ('free_plus','free_family','discount_50_plus','discount_50_family','extra_trial'));

export function SubscriptionProvider({ children }) {
  const { user } = useAuth()
  const [sub, setSub] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) fetchSub()
    else { setSub(null); setLoading(false) }
  }, [user])

  async function fetchSub() {
    const { data } = await supabase
      .from('subscriptions').select('*').eq('user_id', user.id).maybeSingle()
    // Если нет записи — создаём trial
    if (!data) {
      const { data: newSub } = await supabase
        .from('subscriptions')
        .upsert({ user_id: user.id, plan: 'trial', trial_ends_at: new Date(Date.now() + 7*24*60*60*1000) }, { onConflict: 'user_id' })
        .select().maybeSingle()
      setSub(newSub)
    } else setSub(data)
    setLoading(false)
  }

  function getPlan() {
    if (!sub) return 'free'
    const now = new Date()
    if (sub.plan === 'trial' && new Date(sub.trial_ends_at) > now) return 'trial'
    if ((sub.plan === 'plus' || sub.plan === 'family') &&
        (!sub.plan_ends_at || new Date(sub.plan_ends_at) > now)) return sub.plan
    return 'free'
  }

  const plan = getPlan()
  const isPlus = ['plus','family','trial'].includes(plan)
  const isFamily = ['family','trial'].includes(plan)
  const isTrial = plan === 'trial'

  function trialDaysLeft() {
    if (!sub?.trial_ends_at) return 0
    return Math.max(0, Math.ceil((new Date(sub.trial_ends_at) - new Date()) / (1000*60*60*24)))
  }

  async function applyPromoCode(code) {
    const { data: promo } = await supabase
      .from('promo_codes').select('*').eq('code', code.trim().toUpperCase()).maybeSingle()
    if (!promo) return { error: 'Код не найден' }
    if (promo.uses >= promo.max_uses) return { error: 'Код уже использован' }
    if (promo.expires_at && new Date(promo.expires_at) < new Date()) return { error: 'Код истёк' }

    const { error: useErr } = await supabase
      .from('promo_uses').insert({ code_id: promo.id, user_id: user.id })
    if (useErr) return { error: 'Ты уже использовала этот код' }

    await supabase.from('promo_codes').update({ uses: promo.uses + 1 }).eq('id', promo.id)

    if (promo.type === 'free_plus') {
      await supabase.from('subscriptions')
        .upsert({ user_id: user.id, plan: 'plus', plan_ends_at: null }, { onConflict: 'user_id' })
      await fetchSub()
      return { success: true, type: 'free_plus' }
    }
    if (promo.type === 'free_family') {
      await supabase.from('subscriptions')
        .upsert({ user_id: user.id, plan: 'family', plan_ends_at: null }, { onConflict: 'user_id' })
      await fetchSub()
      return { success: true, type: 'free_family' }
    }
    if (promo.type === 'extra_trial') {
      await supabase.from('subscriptions')
        .upsert({ user_id: user.id, plan: 'trial', trial_ends_at: new Date(Date.now() + 14*24*60*60*1000) }, { onConflict: 'user_id' })
      await fetchSub()
      return { success: true, type: 'extra_trial' }
    }
    if (promo.type === 'discount_50_plus') return { success: true, type: 'discount_50_plus', discount: 50, for: 'plus' }
    if (promo.type === 'discount_50_family') return { success: true, type: 'discount_50_family', discount: 50, for: 'family' }

    return { success: true, type: promo.type }
  }

  // Stripe — открываем checkout в браузере
  // Когда подключишь Stripe, замени эти URL на реальные Payment Links
  function openStripeCheckout(planId, discount = false) {
    const links = {
      plus_month:  'https://buy.stripe.com/ЗАМЕНИ_НА_СВОЙ_LINK',
      plus_year:   'https://buy.stripe.com/ЗАМЕНИ_НА_СВОЙ_LINK',
      family_month:'https://buy.stripe.com/ЗАМЕНИ_НА_СВОЙ_LINK',
      family_year: 'https://buy.stripe.com/ЗАМЕНИ_НА_СВОЙ_LINK',
    }
    const url = links[planId]
    if (url && !url.includes('ЗАМЕНИ')) window.open(url, '_blank')
    else alert('Оплата скоро будет доступна! Пока используй промокод.')
  }

  return (
    <SubContext.Provider value={{
      sub, plan, isPlus, isFamily, isTrial, loading,
      trialDaysLeft, applyPromoCode, openStripeCheckout,
      refetch: fetchSub
    }}>
      {children}
    </SubContext.Provider>
  )
}

export const useSub = () => useContext(SubContext)

export function PlusGate({ children, fallback = null }) {
  const { isPlus } = useSub()
  return isPlus ? children : (fallback || null)
}

export function FamilyGate({ children, fallback = null }) {
  const { isFamily } = useSub()
  return isFamily ? children : (fallback || null)
}
