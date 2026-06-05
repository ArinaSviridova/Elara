import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { supabase } from '../lib/supabase'
import { earnAchievement, hasAchievement } from '../lib/achievements'
import { showAchievementToast } from '../components/AchievementToast'

// ─── Константы ──────────────────────────────────────────────────────────────

const GOALS = [
  { key: 'lose',      emoji: '📉', ru: 'Похудеть',           en: 'Lose weight' },
  { key: 'maintain',  emoji: '⚖️', ru: 'Поддержать вес',     en: 'Maintain weight' },
  { key: 'gain',      emoji: '📈', ru: 'Набрать массу',       en: 'Gain muscle' },
  { key: 'energy',    emoji: '⚡', ru: 'Больше энергии',      en: 'More energy' },
  { key: 'health',    emoji: '💜', ru: 'Общее здоровье',      en: 'General health' },
  { key: 'hormones',  emoji: '🌙', ru: 'Поддержка гормонов',  en: 'Hormone support' },
]

const LIFESTYLES = [
  { key: 'sedentary',   ru: 'Сидячий (офис, мало движения)',         en: 'Sedentary (office, little movement)' },
  { key: 'light',       ru: 'Лёгкая активность (1-2 тренировки/нед)', en: 'Light activity (1-2 workouts/week)' },
  { key: 'moderate',    ru: 'Умеренная (3-5 тренировок/нед)',          en: 'Moderate (3-5 workouts/week)' },
  { key: 'active',      ru: 'Активная (спорт каждый день)',            en: 'Active (daily sport)' },
  { key: 'very_active', ru: 'Очень активная (интенсивный спорт)',      en: 'Very active (intense training)' },
]

const DIETS = [
  { key: 'omnivore',       emoji: '🍖', ru: 'Обычное питание',      en: 'Omnivore' },
  { key: 'vegetarian',     emoji: '🥗', ru: 'Вегетарианство',       en: 'Vegetarian' },
  { key: 'vegan',          emoji: '🌱', ru: 'Веганство',             en: 'Vegan' },
  { key: 'pescatarian',    emoji: '🐟', ru: 'Пескетарианство',       en: 'Pescatarian' },
  { key: 'keto',           emoji: '🥑', ru: 'Кето',                  en: 'Keto' },
  { key: 'paleo',          emoji: '🥩', ru: 'Палео',                 en: 'Paleo' },
  { key: 'mediterranean',  emoji: '🫒', ru: 'Средиземноморское',     en: 'Mediterranean' },
  { key: 'gluten_free',    emoji: '🌾', ru: 'Без глютена',           en: 'Gluten-free' },
  { key: 'lactose_free',   emoji: '🥛', ru: 'Без лактозы',           en: 'Lactose-free' },
]

const COUNTRIES = [
  { code: 'GE', name: 'Грузия / Georgia',     currency: 'GEL', symbol: '₾', rate: 2.7 },
  { code: 'US', name: 'США / USA',             currency: 'USD', symbol: '$', rate: 1 },
  { code: 'DE', name: 'Германия / Germany',    currency: 'EUR', symbol: '€', rate: 0.93 },
  { code: 'FR', name: 'Франция / France',      currency: 'EUR', symbol: '€', rate: 0.93 },
  { code: 'PL', name: 'Польша / Poland',       currency: 'PLN', symbol: 'zł', rate: 4.1 },
  { code: 'TR', name: 'Турция / Turkey',       currency: 'TRY', symbol: '₺', rate: 32 },
  { code: 'UA', name: 'Украина / Ukraine',     currency: 'UAH', symbol: '₴', rate: 41 },
  { code: 'KZ', name: 'Казахстан / Kazakhstan', currency: 'KZT', symbol: '₸', rate: 450 },
  { code: 'AM', name: 'Армения / Armenia',     currency: 'AMD', symbol: '֏', rate: 390 },
  { code: 'AZ', name: 'Азербайджан / Azerbaijan', currency: 'AZN', symbol: '₼', rate: 1.7 },
  { code: 'RU', name: 'Россия / Russia',       currency: 'RUB', symbol: '₽', rate: 90 },
  { code: 'BY', name: 'Беларусь / Belarus',    currency: 'BYN', symbol: 'Br', rate: 3.2 },
  { code: 'GB', name: 'Великобритания / UK',   currency: 'GBP', symbol: '£', rate: 0.79 },
  { code: 'OTHER', name: 'Другая / Other',     currency: 'USD', symbol: '$', rate: 1 },
]

const MEAL_EMOJI = { breakfast: '☀️', lunch: '🍽', dinner: '🌙', snack: '🍎' }
const MEAL_LABELS_RU = { breakfast: 'Завтрак', lunch: 'Обед', dinner: 'Ужин', snack: 'Перекус' }
const MEAL_LABELS_EN = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' }

// ─── Главный компонент ──────────────────────────────────────────────────────

export default function NutritionPage() {
  const navigate = useNavigate()
  const { user, profile, updateProfile } = useAuth()
  const { lang } = useLang()
  const rl = (ru, en) => lang === 'en' ? en : ru
  const ml = MEAL_LABELS_RU

  // Настройки меню
  const [goal, setGoal]                   = useState('maintain')
  const [lifestyle, setLifestyle]         = useState('moderate')
  const [diet, setDiet]                   = useState('omnivore')
  const [kcal, setKcal]                   = useState('')
  const [includeProducts, setInclude]     = useState('')
  const [excludeProducts, setExclude]     = useState('')
  const [allergies, setAllergies]         = useState('')

  // Порции
  const [servings, setServings]           = useState(1) // 1 = на 1 день, 2 = на 2 дня
  const [batchCook, setBatchCook]         = useState(false)

  // Партнёр
  const [withPartner, setWithPartner]     = useState(false)
  const [partners, setPartners]           = useState([]) // список друзей
  const [selectedPartner, setSelectedPartner] = useState(null)
  const [partnerKcal, setPartnerKcal]     = useState('')
  const [partnerGoal, setPartnerGoal]     = useState('maintain')

  // Бюджет
  const [budgetEnabled, setBudgetEnabled] = useState(false)
  const [budgetUsd, setBudgetUsd]         = useState('')
  const [country, setCountry]             = useState('GE')
  const [budgetLocal, setBudgetLocal]     = useState('')
  const [budgetInputMode, setBudgetMode]  = useState('local') // 'usd' | 'local'

  // UI
  const [view, setView]       = useState('settings') // settings | menu | recipe
  const [loading, setLoading] = useState(false)
  const [savedMenus, setSavedMenus]   = useState([])
  const [activeMenu, setActiveMenu]   = useState(null)
  const [activeRecipe, setActiveRecipe] = useState(null)
  const [recipeLoading, setRecipeLoading] = useState(null) // название блюда которое грузится
  const [editingMeal, setEditingMeal] = useState(null)
  const [replaceSuggestions, setReplaceSuggestions] = useState([])
  const [suggestLoading, setSuggestLoading] = useState(false)

  const countryData = COUNTRIES.find(c => c.code === country) || COUNTRIES[0]

  // Конвертация бюджета
  function getBudgetInUsd() {
    if (budgetInputMode === 'usd') return parseFloat(budgetUsd) || 0
    const local = parseFloat(budgetLocal) || 0
    return local / countryData.rate
  }

  function getBudgetDisplay() {
    const usd = getBudgetInUsd()
    if (!usd) return ''
    if (budgetInputMode === 'local') return `${budgetLocal} ${countryData.symbol} (~$${usd.toFixed(0)})`
    return `$${usd.toFixed(0)} (~${(usd * countryData.rate).toFixed(0)} ${countryData.symbol})`
  }

  // Загрузка
  useEffect(() => {
    if (!user?.id) return
    loadSettings()
    loadSavedMenus()
    loadFriends()
  }, [user?.id])

  useEffect(() => {
    if (!profile || !user?.id || hasAchievement(profile, 'nutrition_started')) return
    earnAchievement(supabase, profile, 'nutrition_started', updateProfile).then(ok => {
      if (ok) showAchievementToast('nutrition_started')
    }).catch(() => {})
  }, [profile?.id, user?.id])

  function loadSettings() {
    try {
      const s = JSON.parse(localStorage.getItem(`elara_nutrition_settings_${user.id}`) || '{}')
      if (s.goal) setGoal(s.goal)
      if (s.lifestyle) setLifestyle(s.lifestyle)
      if (s.diet) setDiet(s.diet)
      if (s.kcal) setKcal(s.kcal)
      if (s.includeProducts) setInclude(s.includeProducts)
      if (s.excludeProducts) setExclude(s.excludeProducts)
      if (s.allergies) setAllergies(s.allergies)
      if (s.country) setCountry(s.country)
      if (s.batchCook !== undefined) setBatchCook(s.batchCook)
      if (s.servings) setServings(s.servings)
    } catch {}
  }

  function saveSettings() {
    try {
      localStorage.setItem(`elara_nutrition_settings_${user.id}`, JSON.stringify({
        goal, lifestyle, diet, kcal, includeProducts, excludeProducts,
        allergies, country, batchCook, servings
      }))
    } catch {}
  }

  async function loadFriends() {
    if (!user?.id) return
    try {
      const { data } = await supabase
        .from('friendships')
        .select('friend_id, friend:friend_id(id, name, avatar_url)')
        .eq('owner_id', user.id)
      setPartners((data || []).map(f => f.friend).filter(Boolean))
    } catch {}
  }

  async function loadSavedMenus() {
    try {
      const local = localStorage.getItem(`elara_menus_${user.id}`)
      if (local) setSavedMenus(JSON.parse(local).filter(m => m && m.id))
    } catch {}
    try {
      const { data } = await supabase
        .from('nutrition_menus')
        .select('id, title, created_at, days, settings, recipes, kcal_per_day, tips, protein_g, fat_g, carbs_g')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (data?.length > 0) {
        setSavedMenus(data)
        try { localStorage.setItem(`elara_menus_${user.id}`, JSON.stringify(data)) } catch {}
      }
    } catch {}
  }

  async function saveMenu(menu) {
    if (!user?.id) return menu
    const id = 'local_' + Date.now()
    const menuData = {
      id, user_id: user.id,
      title: menu.title || rl('Меню на неделю', 'Weekly menu'),
      days: menu.days, tips: menu.tips || [],
      kcal_per_day: menu.kcal_per_day || 0,
      partner_kcal_per_day: menu.partner_kcal_per_day || 0,
      protein_g: menu.protein_g || 0,
      fat_g: menu.fat_g || 0,
      carbs_g: menu.carbs_g || 0,
      recipes: {},
      shared_with: withPartner && selectedPartner?.id ? selectedPartner.id : null,
      shared_with_name: withPartner && selectedPartner?.name ? selectedPartner.name : null,
      settings: { goal, lifestyle, diet, kcal },
      created_at: new Date().toISOString(),
    }
    const existing = (() => { try { return JSON.parse(localStorage.getItem(`elara_menus_${user.id}`) || '[]') } catch { return [] } })()
    const updated = [menuData, ...existing.filter(m => m && m.id)].slice(0, 10)
    try { localStorage.setItem(`elara_menus_${user.id}`, JSON.stringify(updated)) } catch {}
    try { localStorage.setItem(`elara_last_menu_${user.id}`, JSON.stringify(menuData)) } catch {}
    setSavedMenus(updated)
    supabase.from('nutrition_menus').insert({ ...menuData, id: undefined }).select().single()
      .then(({ data }) => {
        if (data?.id) {
          const withId = { ...menuData, id: data.id }
          setSavedMenus(prev => prev.map(m => m.id === id ? withId : m))
          try { localStorage.setItem(`elara_last_menu_${user.id}`, JSON.stringify(withId)) } catch {}
        }
      }).then(() => {
        // Уведомляем партнёра о совместном меню
        if (withPartner && selectedPartner?.id) {
          supabase.from('app_notifications').insert({
            user_id: selectedPartner.id,
            type: 'shared_menu',
            title: rl('Совместное меню', 'Shared menu'),
            body: rl(
              `${profile?.name || 'Пользователь'} создал(а) совместное меню питания с тобой!`,
              `${profile?.name || 'User'} created a joint meal plan with you!`
            ),
            data: { from_user_id: user.id, from_name: profile?.name || '' },
            created_at: new Date().toISOString(),
          }).then(()=>{}).catch(()=>{})
        }
      }).catch(()=>{})
    return menuData
  }

  async function deleteMenu(menuId) {
    if (!confirm(rl('Удалить это меню?', 'Delete this menu?'))) return
    const updated = savedMenus.filter(m => m.id !== menuId)
    setSavedMenus(updated)
    try { localStorage.setItem(`elara_menus_${user.id}`, JSON.stringify(updated)) } catch {}
    if (!menuId.startsWith('local_')) {
      try { await supabase.from('nutrition_menus').delete().eq('id', menuId) } catch {}
    }
    if (activeMenu?.id === menuId) { setActiveMenu(null); setView('settings') }
  }

  // ─── ГЕНЕРАЦИЯ МЕНЮ ───────────────────────────────────────────────────────

  async function generateMenu() {
    setLoading(true)
    saveSettings()
    try {
      const goalLabel     = GOALS.find(g => g.key === goal)?.[lang==='en'?'en':'ru'] || goal
      const lifestyleLabel = LIFESTYLES.find(l => l.key === lifestyle)?.[lang==='en'?'en':'ru'] || lifestyle
      const dietLabel     = DIETS.find(d => d.key === diet)?.[lang==='en'?'en':'ru'] || diet
      const partnerName   = selectedPartner?.name || rl('Партнёр', 'Partner')
      const partnerGoalLabel = GOALS.find(g => g.key === partnerGoal)?.[lang==='en'?'en':'ru'] || partnerGoal
      const budgetText    = budgetEnabled && getBudgetInUsd() > 0
        ? `Бюджет на неделю: ${getBudgetDisplay()} — учитывай цены страны ${countryData.name}` : ''
      const batchText     = batchCook ? `Готовить заранее на ${servings} порции — повторяй блюда соответственно.` : 'Каждое блюдо строго на 1 порцию.'

      const { data, error } = await supabase.functions.invoke('ai-advisor', {
        body: {
          requestType: 'generate_nutrition',
          userId: user.id,
          goal, lifestyle, diet, kcal,
          includeProducts, excludeProducts, allergies,
          budget: budgetEnabled ? getBudgetDisplay() : '',
          country: budgetEnabled ? countryData.name : '',
          batchCook, servings,
          withPartner, partnerName,
          partnerKcal: withPartner ? partnerKcal : '',
          partnerGoal: withPartner ? partnerGoalLabel : '',
          language: lang,
        }
      })

      if (error) throw new Error(error.message)

      const menu = data?.menu
      if (!menu?.days?.length) {
        const raw = data?.raw || ''
        throw new Error(raw.slice(0, 120) || rl('Не удалось сгенерировать меню', 'Failed to generate menu'))
      }

      setActiveMenu(menu)
      setView('menu')
      try { const saved = await saveMenu(menu); if (saved?.id) setActiveMenu(saved) } catch {}
    } catch (err) {
      alert(rl('Ошибка: ', 'Error: ') + err.message)
    } finally {
      setLoading(false)
    }
  }

  // ─── РЕЦЕПТ ───────────────────────────────────────────────────────────────

  async function getRecipe(mealName) {
    const cached = activeMenu?.recipes?.[mealName]
    if (cached) { setActiveRecipe({ name: mealName, text: cached }); setView('recipe'); return }

    setRecipeLoading(mealName)
    try {
      const portions = batchCook ? servings : 1
      const { data, error } = await supabase.functions.invoke('ai-advisor', {
        body: { requestType: 'get_recipe', userId: user.id, mealName, portions, language: lang }
      })
      if (error) throw new Error(error.message)
      const text = data?.recipe || ''
      if (!text || text.length < 20) throw new Error(rl('Рецепт не получен', 'Recipe not received'))

      const updatedMenu = { ...activeMenu, recipes: { ...(activeMenu?.recipes || {}), [mealName]: text } }
      setActiveMenu(updatedMenu)
      if (updatedMenu.id) {
        supabase.from('nutrition_menus').update({ recipes: updatedMenu.recipes }).eq('id', updatedMenu.id).then(()=>{}).catch(()=>{})
        setSavedMenus(prev => prev.map(m => m.id === updatedMenu.id ? updatedMenu : m))
      }
      setActiveRecipe({ name: mealName, text })
      setView('recipe')
    } catch (err) {
      alert(rl('Ошибка: ', 'Error: ') + err.message)
    } finally {
      setRecipeLoading(null)
    }
  }

  // ─── ЗАМЕНА БЛЮДА ─────────────────────────────────────────────────────────

  async function confirmReplaceMeal(newName) {
    if (!newName.trim() || !editingMeal) return
    const { dayIdx, mealIdx } = editingMeal
    const updated = { ...activeMenu, days: activeMenu.days.map((d, di) =>
      di === dayIdx ? { ...d, meals: d.meals.map((m, mi) =>
        mi === mealIdx ? { ...m, name: newName.trim() } : m) } : d) }
    setActiveMenu(updated)
    setEditingMeal(null)
    if (updated.id) {
      supabase.from('nutrition_menus').update({ days: updated.days }).eq('id', updated.id).then(()=>{}).catch(()=>{})
      setSavedMenus(prev => prev.map(m => m.id === updated.id ? updated : m))
    }
  }

  // ─── RENDER ───────────────────────────────────────────────────────────────

  const mealLabels = lang === 'en' ? MEAL_LABELS_EN : MEAL_LABELS_RU

  return (
    <div className="page-enter" style={{ flex:1, overflowY:'auto', padding:'18px 16px 28px' }}>

      {/* Хедер */}
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
        <button type="button" className="btn btn-ghost" style={{ width:'auto', padding:'8px 11px' }}
          onClick={() => view === 'recipe' ? setView('menu') : view === 'menu' ? setView('settings') : navigate(-1)}>
          ‹
        </button>
        <div style={{ flex:1 }}>
          <h2 style={{ fontSize:22, margin:0 }}>
            🥗 {view==='recipe' ? activeRecipe?.name : view==='menu'
              ? rl('Меню на неделю','Weekly menu') : rl('Питание','Nutrition')}
          </h2>
          {view==='menu' && activeMenu && (
            <p style={{ margin:'2px 0 0', fontSize:12, color:'var(--text3)' }}>
              {activeMenu.kcal_per_day} {rl('ккал/день','kcal/day')}
              {activeMenu.partner_kcal_per_day > 0 && ` · ${rl('партнёр','partner')}: ${activeMenu.partner_kcal_per_day} ${rl('ккал','kcal')}`}
              {' '}· B:{activeMenu.protein_g}г Ж:{activeMenu.fat_g}г У:{activeMenu.carbs_g}г
            </p>
          )}
        </div>
      </div>

      {/* ══ НАСТРОЙКИ ══════════════════════════════════════════════════════ */}
      {view === 'settings' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Сохранённые меню */}
          {savedMenus.filter(m=>m&&m.id).length > 0 && (
            <div className="card" style={{ padding:14 }}>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:10 }}>
                📋 {rl('Мои меню','My menus')} ({savedMenus.filter(m=>m&&m.id).length})
              </div>
              {savedMenus.filter(m=>m&&m.id).map(m => (
                <div key={m.id} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                  <button type="button" onClick={() => { setActiveMenu(m); setView('menu') }}
                    style={{ flex:1, textAlign:'left', background:'var(--bg3)', border:'1px solid var(--border)',
                      borderRadius:10, padding:'8px 12px', color:'var(--text)', cursor:'pointer', fontSize:13 }}>
                    {m.title || rl('Меню','Menu')}
                    <span style={{ fontSize:11, color:'var(--text3)', marginLeft:8 }}>
                      {m.kcal_per_day ? `${m.kcal_per_day} ${rl('ккал','kcal')} · ` : ''}
                      {new Date(m.created_at).toLocaleDateString(lang==='en'?'en':'ru')}
                    </span>
                  </button>
                  <button type="button" onClick={() => deleteMenu(m.id)}
                    style={{ background:'none', border:'none', color:'rgba(248,113,113,0.7)', cursor:'pointer', fontSize:16, padding:'4px' }}>✕</button>
                </div>
              ))}
            </div>
          )}

          {/* Цель */}
          <div className="card" style={{ padding:14 }}>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:10 }}>🎯 {rl('Цель','Goal')}</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
              {GOALS.map(g => (
                <button type="button" key={g.key} onClick={() => setGoal(g.key)}
                  style={{ padding:'7px 12px', borderRadius:20, fontSize:13, cursor:'pointer',
                    border:`1px solid ${goal===g.key?'var(--accent)':'var(--border)'}`,
                    background: goal===g.key?'var(--accent-soft)':'transparent',
                    color: goal===g.key?'var(--accent)':'var(--text2)' }}>
                  {g.emoji} {lang==='en'?g.en:g.ru}
                </button>
              ))}
            </div>
          </div>

          {/* Образ жизни */}
          <div className="card" style={{ padding:14 }}>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:10 }}>🏃 {rl('Образ жизни','Lifestyle')}</div>
            {LIFESTYLES.map(l => (
              <button type="button" key={l.key} onClick={() => setLifestyle(l.key)}
                style={{ display:'block', width:'100%', textAlign:'left', padding:'8px 12px', borderRadius:10,
                  marginBottom:5, fontSize:12, cursor:'pointer',
                  border:`1px solid ${lifestyle===l.key?'var(--accent)':'var(--border)'}`,
                  background: lifestyle===l.key?'var(--accent-soft)':'transparent',
                  color: lifestyle===l.key?'var(--accent)':'var(--text2)' }}>
                {lang==='en'?l.en:l.ru}
              </button>
            ))}
          </div>

          {/* Тип питания */}
          <div className="card" style={{ padding:14 }}>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:10 }}>🍽 {rl('Тип питания','Diet type')}</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
              {DIETS.map(d => (
                <button type="button" key={d.key} onClick={() => setDiet(d.key)}
                  style={{ padding:'7px 12px', borderRadius:20, fontSize:13, cursor:'pointer',
                    border:`1px solid ${diet===d.key?'var(--accent)':'var(--border)'}`,
                    background: diet===d.key?'var(--accent-soft)':'transparent',
                    color: diet===d.key?'var(--accent)':'var(--text2)' }}>
                  {d.emoji} {lang==='en'?d.en:d.ru}
                </button>
              ))}
            </div>
          </div>

          {/* Детали */}
          <div className="card" style={{ padding:14, display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ fontSize:13, fontWeight:600 }}>⚙️ {rl('Детали','Details')}</div>

            <div>
              <div style={{ fontSize:11, color:'var(--text3)', marginBottom:5 }}>🔥 {rl('Калорийность в день (ккал)','Daily calories (kcal)')}</div>
              <input type="number" value={kcal} onChange={e => setKcal(e.target.value)}
                placeholder={rl('например 1800 (авто если пусто)','e.g. 1800 (auto if empty)')}
                style={{ width:'100%', padding:'9px 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg2)', color:'var(--text)', fontSize:13 }} />
            </div>

            <div>
              <div style={{ fontSize:11, color:'var(--text3)', marginBottom:5 }}>✅ {rl('Включить продукты','Include products')}</div>
              <input value={includeProducts} onChange={e => setInclude(e.target.value)}
                placeholder={rl('авокадо, гречка, курица...','avocado, buckwheat, chicken...')}
                style={{ width:'100%', padding:'9px 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg2)', color:'var(--text)', fontSize:13 }} />
            </div>

            <div>
              <div style={{ fontSize:11, color:'var(--text3)', marginBottom:5 }}>❌ {rl('Исключить продукты','Exclude products')}</div>
              <input value={excludeProducts} onChange={e => setExclude(e.target.value)}
                placeholder={rl('молоко, орехи, глютен...','milk, nuts, gluten...')}
                style={{ width:'100%', padding:'9px 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg2)', color:'var(--text)', fontSize:13 }} />
            </div>

            <div>
              <div style={{ fontSize:11, color:'var(--text3)', marginBottom:5 }}>⚠️ {rl('Аллергии','Allergies')}</div>
              <input value={allergies} onChange={e => setAllergies(e.target.value)}
                placeholder={rl('лактоза, арахис...','lactose, peanuts...')}
                style={{ width:'100%', padding:'9px 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg2)', color:'var(--text)', fontSize:13 }} />
            </div>
          </div>

          {/* Порции / batch cooking */}
          <div className="card" style={{ padding:14 }}>
            <div style={{ fontSize:13, fontWeight:600, marginBottom:12 }}>🍱 {rl('Порции','Servings')}</div>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <button type="button" onClick={() => { setBatchCook(false); setServings(1) }}
                style={{ padding:'10px 14px', borderRadius:10, textAlign:'left', cursor:'pointer', fontSize:13,
                  border:`1px solid ${!batchCook?'var(--accent)':'var(--border)'}`,
                  background: !batchCook?'var(--accent-soft)':'transparent',
                  color: !batchCook?'var(--accent)':'var(--text2)' }}>
                <div style={{ fontWeight:600 }}>🍽 {rl('На 1 порцию (по умолчанию)','Per 1 serving (default)')}</div>
                <div style={{ fontSize:11, marginTop:3, opacity:0.8 }}>
                  {rl('Каждый рецепт строго на одну порцию, все ингредиенты в сыром/сухом виде',
                    'Each recipe strictly for one serving, all ingredients raw/dry weight')}
                </div>
              </button>
              <button type="button" onClick={() => setBatchCook(true)}
                style={{ padding:'10px 14px', borderRadius:10, textAlign:'left', cursor:'pointer', fontSize:13,
                  border:`1px solid ${batchCook?'var(--accent)':'var(--border)'}`,
                  background: batchCook?'var(--accent-soft)':'transparent',
                  color: batchCook?'var(--accent)':'var(--text2)' }}>
                <div style={{ fontWeight:600 }}>📦 {rl('Готовить заранее','Batch cooking')}</div>
                <div style={{ fontSize:11, marginTop:3, opacity:0.8 }}>
                  {rl('Блюдо готовится сразу на несколько дней — повторяется в меню',
                    'Dish is cooked in bulk for several days — repeats in the menu')}
                </div>
              </button>
              {batchCook && (
                <div style={{ display:'flex', alignItems:'center', gap:12, paddingLeft:4 }}>
                  <div style={{ fontSize:12, color:'var(--text3)' }}>{rl('Приготовить на','Cook for')}</div>
                  {[2,3,4].map(n => (
                    <button type="button" key={n} onClick={() => setServings(n)}
                      style={{ width:42, height:42, borderRadius:10, fontSize:14, cursor:'pointer',
                        fontWeight: servings===n?700:400,
                        border:`1px solid ${servings===n?'var(--accent)':'var(--border)'}`,
                        background: servings===n?'var(--accent-soft)':'transparent',
                        color: servings===n?'var(--accent)':'var(--text2)' }}>
                      {n}
                    </button>
                  ))}
                  <div style={{ fontSize:12, color:'var(--text3)' }}>{rl('дня','days')}</div>
                </div>
              )}
            </div>
          </div>

          {/* Партнёр */}
          <div className="card" style={{ padding:14 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: withPartner?12:0 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600 }}>👫 {rl('Готовить вместе','Cook together')}</div>
                <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>
                  {rl('Меню на двоих — разные цели, общий список продуктов','Joint menu — different goals, shared shopping list')}
                </div>
              </div>
              <button type="button" onClick={() => setWithPartner(!withPartner)}
                style={{ width:46, height:26, borderRadius:13, cursor:'pointer', border:'none', padding:0, flexShrink:0,
                  background: withPartner?'var(--accent)':'var(--bg3)',
                  transition:'background 0.2s', position:'relative' }}>
                <div style={{ width:20, height:20, borderRadius:'50%', background:'white',
                  position:'absolute', top:3, transition:'left 0.2s',
                  left: withPartner ? 23 : 3 }} />
              </button>
            </div>
            {withPartner && (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {partners.length > 0 ? (
                  <div>
                    <div style={{ fontSize:11, color:'var(--text3)', marginBottom:6 }}>{rl('Выбери человека','Select person')}</div>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                      {partners.map(p => (
                        <button type="button" key={p.id} onClick={() => setSelectedPartner(p)}
                          style={{ padding:'7px 12px', borderRadius:20, fontSize:12, cursor:'pointer',
                            border:`1px solid ${selectedPartner?.id===p.id?'var(--accent)':'var(--border)'}`,
                            background: selectedPartner?.id===p.id?'var(--accent-soft)':'transparent',
                            color: selectedPartner?.id===p.id?'var(--accent)':'var(--text2)' }}>
                          {p.avatar_url ? '👤' : '👤'} {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize:12, color:'var(--text3)', padding:'8px 0' }}>
                    {rl('Добавь людей в Круг чтобы выбрать партнёра','Add people to Circle to select a partner')}
                    <button type="button" onClick={() => navigate('/friends')}
                      style={{ marginLeft:8, color:'var(--accent)', background:'none', border:'none', cursor:'pointer', fontSize:12 }}>
                      {rl('Открыть Круг →','Open Circle →')}
                    </button>
                  </div>
                )}
                <div>
                  <div style={{ fontSize:11, color:'var(--text3)', marginBottom:5 }}>
                    {rl('Цель партнёра','Partner\'s goal')}
                  </div>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                    {GOALS.slice(0,4).map(g => (
                      <button type="button" key={g.key} onClick={() => setPartnerGoal(g.key)}
                        style={{ padding:'5px 10px', borderRadius:16, fontSize:12, cursor:'pointer',
                          border:`1px solid ${partnerGoal===g.key?'var(--accent)':'var(--border)'}`,
                          background: partnerGoal===g.key?'var(--accent-soft)':'transparent',
                          color: partnerGoal===g.key?'var(--accent)':'var(--text2)' }}>
                        {g.emoji} {lang==='en'?g.en:g.ru}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:11, color:'var(--text3)', marginBottom:5 }}>
                    🔥 {rl('Калорийность партнёра (необязательно)','Partner\'s calories (optional)')}
                  </div>
                  <input type="number" value={partnerKcal} onChange={e => setPartnerKcal(e.target.value)}
                    placeholder={rl('например 2200','e.g. 2200')}
                    style={{ width:'100%', padding:'8px 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg2)', color:'var(--text)', fontSize:13 }} />
                </div>
              </div>
            )}
          </div>

          {/* Бюджет — красивый toggle */}
          <div className="card" style={{ padding:14 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: budgetEnabled?14:0 }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600 }}>💰 {rl('Бюджет на неделю','Weekly budget')}</div>
                <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>
                  {rl('Необязательно — AI учтёт стоимость продуктов','Optional — AI will account for food costs')}
                </div>
              </div>
              <button type="button" onClick={() => setBudgetEnabled(!budgetEnabled)}
                style={{ width:46, height:26, borderRadius:13, cursor:'pointer', border:'none', padding:0, flexShrink:0,
                  background: budgetEnabled?'#4ade80':'var(--bg3)', transition:'background 0.2s', position:'relative' }}>
                <div style={{ width:20, height:20, borderRadius:'50%', background:'white',
                  position:'absolute', top:3, transition:'left 0.2s',
                  left: budgetEnabled ? 23 : 3 }} />
              </button>
            </div>
            {budgetEnabled && (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                <div>
                  <div style={{ fontSize:11, color:'var(--text3)', marginBottom:6 }}>🌍 {rl('Страна','Country')}</div>
                  <select value={country} onChange={e => setCountry(e.target.value)}
                    style={{ width:'100%', padding:'9px 12px', borderRadius:10, border:'1px solid var(--border)', background:'var(--bg2)', color:'var(--text)', fontSize:13 }}>
                    {COUNTRIES.map(c => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <button type="button" onClick={() => setBudgetMode('local')}
                    style={{ flex:1, padding:'7px', borderRadius:8, fontSize:12, cursor:'pointer',
                      border:`1px solid ${budgetInputMode==='local'?'#4ade80':'var(--border)'}`,
                      background: budgetInputMode==='local'?'rgba(74,222,128,0.1)':'transparent',
                      color: budgetInputMode==='local'?'#4ade80':'var(--text3)' }}>
                    {countryData.symbol} {countryData.currency}
                  </button>
                  <button type="button" onClick={() => setBudgetMode('usd')}
                    style={{ flex:1, padding:'7px', borderRadius:8, fontSize:12, cursor:'pointer',
                      border:`1px solid ${budgetInputMode==='usd'?'#4ade80':'var(--border)'}`,
                      background: budgetInputMode==='usd'?'rgba(74,222,128,0.1)':'transparent',
                      color: budgetInputMode==='usd'?'#4ade80':'var(--text3)' }}>
                    $ USD
                  </button>
                </div>
                <div style={{ position:'relative' }}>
                  <span style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text3)', fontSize:14 }}>
                    {budgetInputMode==='local' ? countryData.symbol : '$'}
                  </span>
                  <input
                    type="number"
                    value={budgetInputMode==='local' ? budgetLocal : budgetUsd}
                    onChange={e => budgetInputMode==='local' ? setBudgetLocal(e.target.value) : setBudgetUsd(e.target.value)}
                    placeholder={budgetInputMode==='local' ? `например ${Math.round(50 * countryData.rate)}` : 'e.g. 50'}
                    style={{ width:'100%', padding:'9px 12px 9px 28px', borderRadius:10, border:'1px solid #4ade8060', background:'var(--bg2)', color:'var(--text)', fontSize:13 }}
                  />
                </div>
                {getBudgetInUsd() > 0 && (
                  <div style={{ fontSize:11, color:'#4ade80', textAlign:'center' }}>
                    ≈ ${getBudgetInUsd().toFixed(0)} USD · {(getBudgetInUsd() * countryData.rate).toFixed(0)} {countryData.symbol} · ~{(getBudgetInUsd() / 7).toFixed(0)}$/день
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Кнопка генерации */}
          <button type="button" onClick={generateMenu} disabled={loading}
            style={{ width:'100%', padding:'15px', borderRadius:14, cursor:'pointer',
              background: loading?'var(--bg3)':'linear-gradient(135deg, var(--accent), #4ade80)',
              border:'none', color: loading?'var(--text3)':'#0a0a0a', fontSize:15, fontWeight:700 }}>
            {loading ? `⏳ ${rl('Составляю меню...','Creating menu...')}` : `✨ ${rl('Сгенерировать меню на неделю','Generate weekly menu')}`}
          </button>

          <div style={{ fontSize:11, color:'var(--text3)', textAlign:'center', lineHeight:1.6 }}>
            ⚠️ {rl('Рекомендации носят информационный характер. Проконсультируйся с врачом или диетологом.',
              'Recommendations are informational only. Consult a doctor or dietitian.')}
          </div>
        </div>
      )}

      {/* ══ МЕНЮ ═══════════════════════════════════════════════════════════ */}
      {view === 'menu' && activeMenu && (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

          {/* Советы */}
          {activeMenu.tips?.length > 0 && (
            <div className="card" style={{ padding:14, background:'rgba(74,222,128,0.06)', border:'1px solid rgba(74,222,128,0.2)' }}>
              <div style={{ fontSize:12, fontWeight:600, color:'#4ade80', marginBottom:8 }}>💡 {rl('Рекомендации','Tips')}</div>
              {activeMenu.tips.map((tip, i) => (
                <div key={i} style={{ fontSize:12, color:'var(--text2)', lineHeight:1.65, marginBottom:3 }}>• {tip}</div>
              ))}
            </div>
          )}

          {/* Дни */}
          {(activeMenu.days || []).map((day, dayIdx) => (
            <div key={dayIdx} className="card" style={{ padding:0, overflow:'hidden' }}>
              <div style={{ padding:'10px 14px', background:'var(--bg3)', fontSize:13, fontWeight:700, borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between' }}>
                <span>{day.day}</span>
                <span style={{ fontSize:11, color:'var(--text3)', fontWeight:400 }}>
                  {(day.meals||[]).reduce((s,m)=>s+(m.kcal||0),0)} {rl('ккал','kcal')}
                </span>
              </div>
              {(day.meals||[]).map((meal, mealIdx) => (
                <div key={mealIdx} style={{ padding:'11px 14px', borderBottom: mealIdx<day.meals.length-1?'1px solid var(--border)':'none',
                  display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:18, flexShrink:0 }}>{MEAL_EMOJI[meal.type]||'🍽'}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:11, color:'var(--text3)', marginBottom:2 }}>
                      {mealLabels[meal.type]} · {meal.time}
                    </div>
                    <div style={{ fontSize:14, fontWeight:500, color:'var(--text)' }}>{meal.name}</div>
                    <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>~{meal.kcal} {rl('ккал','kcal')}</div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:4, flexShrink:0 }}>
                    {/* Кнопка Рецепт */}
                    <button type="button" onClick={() => getRecipe(meal.name)}
                      disabled={recipeLoading === meal.name}
                      style={{ padding:'5px 10px', borderRadius:8, fontSize:11, cursor:'pointer',
                        border:`1px solid ${activeMenu?.recipes?.[meal.name]?'rgba(74,222,128,0.5)':'var(--accent)'}`,
                        background: activeMenu?.recipes?.[meal.name]?'rgba(74,222,128,0.1)':'var(--accent-soft)',
                        color: activeMenu?.recipes?.[meal.name]?'#4ade80':'var(--accent)',
                        fontWeight:500, whiteSpace:'nowrap' }}>
                      {recipeLoading===meal.name ? '⏳' : activeMenu?.recipes?.[meal.name] ? '✓ '+rl('Рецепт','Recipe') : rl('Рецепт','Recipe')}
                    </button>
                    {/* Кнопка Заменить */}
                    <button type="button" onClick={async () => {
                        setEditingMeal({ dayIdx, mealIdx, meal })
                        setReplaceSuggestions([])
                        setSuggestLoading(true)
                        try {
                          const { data } = await supabase.functions.invoke('ai-advisor', {
                            body: { requestType: 'suggest_replacements', mealName: meal.name,
                              mealKcal: meal.kcal, diet, language: lang }
                          })
                          setReplaceSuggestions(data?.suggestions || [])
                        } catch {} finally { setSuggestLoading(false) }
                      }}
                      style={{ padding:'5px 10px', borderRadius:8, fontSize:11, cursor:'pointer',
                        border:'1px solid var(--border)', background:'transparent', color:'var(--text3)' }}>
                      {rl('Заменить','Replace')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ))}

          <button type="button" onClick={() => setView('settings')}
            style={{ width:'100%', padding:'12px', borderRadius:12, cursor:'pointer',
              background:'var(--bg2)', border:'1px solid var(--border)', color:'var(--text2)', fontSize:13 }}>
            ✦ {rl('Создать новое меню','Create new menu')}
          </button>
        </div>
      )}

      {/* ══ РЕЦЕПТ ═════════════════════════════════════════════════════════ */}
      {view === 'recipe' && activeRecipe && (
        <div className="card" style={{ padding:16 }}>
          {batchCook && servings > 1 && (
            <div style={{ marginBottom:12, padding:'8px 12px', borderRadius:8,
              background:'rgba(167,139,250,0.1)', border:'1px solid rgba(167,139,250,0.2)', fontSize:12, color:'var(--accent)' }}>
              📦 {rl(`Рецепт на ${servings} порции (ингредиенты в сыром/сухом виде)`,
                `Recipe for ${servings} servings (ingredients raw/dry weight)`)}
            </div>
          )}
          {!batchCook && (
            <div style={{ marginBottom:12, padding:'8px 12px', borderRadius:8,
              background:'rgba(74,222,128,0.07)', border:'1px solid rgba(74,222,128,0.15)', fontSize:12, color:'#4ade80' }}>
              🍽 {rl('Рецепт на 1 порцию — все ингредиенты в сыром/сухом виде',
                '1 serving recipe — all ingredients in raw/dry weight')}
            </div>
          )}
          <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.85 }}>
            {activeRecipe.text.split('\n').map((line, i) => {
              if (line.startsWith('## ')) return <div key={i} style={{ fontSize:14, fontWeight:700, color:'var(--accent)', marginTop:14, marginBottom:6 }}>{line.replace('## ','')}</div>
              if (line.startsWith('# '))  return <div key={i} style={{ fontSize:15, fontWeight:700, color:'var(--text)', marginTop:16, marginBottom:8 }}>{line.replace('# ','')}</div>
              if (line.startsWith('- ') || line.startsWith('• ')) return <div key={i} style={{ paddingLeft:12, marginBottom:3 }}><span style={{ color:'var(--accent)', marginRight:6 }}>•</span>{line.replace(/^[-•] /,'')}</div>
              if (/^\d+\./.test(line)) return <div key={i} style={{ paddingLeft:4, marginBottom:4 }}>{line}</div>
              if (line.trim()==='') return <div key={i} style={{ height:6 }} />
              return <div key={i} style={{ marginBottom:2 }}>{line}</div>
            })}
          </div>
          <button type="button" onClick={() => setView('menu')}
            style={{ marginTop:16, width:'100%', padding:'11px', borderRadius:10, cursor:'pointer',
              background:'var(--bg3)', border:'1px solid var(--border)', color:'var(--text2)', fontSize:13 }}>
            ‹ {rl('Назад к меню','Back to menu')}
          </button>
        </div>
      )}

      {/* ══ МОДАЛКА ЗАМЕНЫ ═════════════════════════════════════════════════ */}
      {editingMeal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', zIndex:100,
          display:'flex', alignItems:'flex-end', justifyContent:'center' }}
          onClick={e => { if (e.target===e.currentTarget) setEditingMeal(null) }}>
          <div style={{ background:'var(--bg2)', borderRadius:'16px 16px 0 0', padding:20, width:'100%', maxWidth:480 }}>
            <div style={{ fontSize:15, fontWeight:600, marginBottom:8 }}>{rl('Заменить блюдо','Replace dish')}</div>
            <div style={{ fontSize:12, color:'var(--text3)', marginBottom:10 }}>{rl('Сейчас:','Current:')} {editingMeal.meal?.name}</div>
            {/* Варианты замены */}
            {suggestLoading && (
              <div style={{ fontSize:12, color:'var(--text3)', padding:'8px 0', textAlign:'center' }}>
                ⏳ {rl('Подбираю варианты...','Finding suggestions...')}
              </div>
            )}
            {!suggestLoading && replaceSuggestions.length > 0 && (
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:11, color:'var(--text3)', marginBottom:8 }}>
                  {rl('Похожие по калорийности (±100 ккал):','Similar calories (±100 kcal):')}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {replaceSuggestions.map((s, i) => (
                    <button type="button" key={i}
                      onClick={() => { confirmReplaceMeal(s.name); setReplaceSuggestions([]) }}
                      style={{ padding:'9px 12px', borderRadius:10, textAlign:'left', cursor:'pointer',
                        border:'1px solid var(--border)', background:'var(--bg3)', color:'var(--text)' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                        <span style={{ fontSize:13, fontWeight:500 }}>{s.name}</span>
                        <span style={{ fontSize:11, color:'var(--accent)', flexShrink:0, marginLeft:8 }}>
                          ~{s.kcal} {rl('ккал','kcal')}
                        </span>
                      </div>
                      {s.note && <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>{s.note}</div>}
                    </button>
                  ))}
                </div>
                <div style={{ fontSize:11, color:'var(--text3)', marginTop:8, marginBottom:4 }}>
                  {rl('или введи своё:','or type your own:')}
                </div>
              </div>
            )}
            <input autoFocus id="replace-input" placeholder={rl('Новое название блюда...','New dish name...')}
              onKeyDown={e => { if (e.key==='Enter') confirmReplaceMeal(e.target.value) }}
              style={{ width:'100%', padding:'11px 14px', borderRadius:10, border:'1px solid var(--border)',
                background:'var(--bg3)', color:'var(--text)', fontSize:14, marginBottom:12 }} />
            <div style={{ display:'flex', gap:8 }}>
              <button type="button" onClick={() => setEditingMeal(null)}
                style={{ flex:1, padding:'11px', borderRadius:10, cursor:'pointer', background:'var(--bg3)', border:'1px solid var(--border)', color:'var(--text2)', fontSize:13 }}>
                {rl('Отмена','Cancel')}
              </button>
              <button type="button" onClick={() => confirmReplaceMeal(document.getElementById('replace-input')?.value||'')}
                style={{ flex:2, padding:'11px', borderRadius:10, cursor:'pointer', background:'var(--accent)', border:'none', color:'#0a0a0a', fontSize:13, fontWeight:600 }}>
                {rl('Заменить','Replace')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
