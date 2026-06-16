import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { supabase } from '../lib/supabase'
import { earnAchievement, hasAchievement } from '../lib/achievements'
import { showAchievementToast } from '../components/AchievementToast'
import { createNotification } from '../lib/useNotifications'

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
  { code: 'GE', ru: 'Грузия',          en: 'Georgia',        currency: 'GEL', symbol: '₾', rate: 2.7 },
  { code: 'US', ru: 'США',             en: 'USA',            currency: 'USD', symbol: '$', rate: 1 },
  { code: 'DE', ru: 'Германия',        en: 'Germany',        currency: 'EUR', symbol: '€', rate: 0.93 },
  { code: 'FR', ru: 'Франция',         en: 'France',         currency: 'EUR', symbol: '€', rate: 0.93 },
  { code: 'PL', ru: 'Польша',          en: 'Poland',         currency: 'PLN', symbol: 'zł', rate: 4.1 },
  { code: 'TR', ru: 'Турция',          en: 'Turkey',         currency: 'TRY', symbol: '₺', rate: 32 },
  { code: 'UA', ru: 'Украина',         en: 'Ukraine',        currency: 'UAH', symbol: '₴', rate: 41 },
  { code: 'KZ', ru: 'Казахстан',       en: 'Kazakhstan',     currency: 'KZT', symbol: '₸', rate: 450 },
  { code: 'AM', ru: 'Армения',         en: 'Armenia',        currency: 'AMD', symbol: '֏', rate: 390 },
  { code: 'AZ', ru: 'Азербайджан',     en: 'Azerbaijan',     currency: 'AZN', symbol: '₼', rate: 1.7 },
  { code: 'RU', ru: 'Россия',          en: 'Russia',         currency: 'RUB', symbol: '₽', rate: 90 },
  { code: 'BY', ru: 'Беларусь',        en: 'Belarus',        currency: 'BYN', symbol: 'Br', rate: 3.2 },
  { code: 'GB', ru: 'Великобритания',  en: 'UK',             currency: 'GBP', symbol: '£', rate: 0.79 },
  { code: 'OTHER', ru: 'Другая',       en: 'Other',          currency: 'USD', symbol: '$', rate: 1 },
]

const MEAL_EMOJI = { breakfast: '☀️', lunch: '🍽', dinner: '🌙', snack: '🍎' }
const MEAL_LABELS_RU = { breakfast: 'Завтрак', lunch: 'Обед', dinner: 'Ужин', snack: 'Перекус' }
const MEAL_LABELS_EN = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' }

const PRODUCT_HINTS = [
  { re: /куриц|chicken|индейк|turkey|говядин|beef|рыб|fish|лосос|salmon|тунец|tuna|яйц|egg|тофу|tofu|нут|chickpea|чечевиц|lentil|фасол|beans/i, categoryRu:'Белок', categoryEn:'Protein' },
  { re: /греч|buckwheat|рис|rice|бурый рис|овсян|oat|паст|pasta|киноа|quinoa|хлеб|bread|лаваш|potato|картоф/i, categoryRu:'Крупы и углеводы', categoryEn:'Grains & carbs' },
  { re: /шпинат|spinach|огур|cucumber|помид|tomato|перец|pepper|морков|carrot|капуст|cabbage|цветн|cauliflower|брокк|broccoli|зелень|salad|lettuce|овощ|vegetable/i, categoryRu:'Овощи и зелень', categoryEn:'Vegetables & greens' },
  { re: /яблок|apple|банан|banana|ягод|berry|апельс|orange|фрукт|fruit|груш|pear/i, categoryRu:'Фрукты и ягоды', categoryEn:'Fruit & berries' },
  { re: /йогурт|yogurt|творог|cottage|сыр|cheese|молок|milk|кефир|kefir/i, categoryRu:'Молочные / альтернативы', categoryEn:'Dairy / alternatives' },
  { re: /орех|nuts|миндаль|almond|грецк|walnut|семеч|seeds|авокад|avocado|оливк|olive|масло|oil/i, categoryRu:'Жиры и добавки', categoryEn:'Fats & extras' },
]

const INGREDIENT_RULES = [
  { re: /греч|buckwheat/i, items: [{ ru:'Гречка - 1 пачка / 700 г', en:'Buckwheat - 1 pack / 700 g' }] },
  { re: /бурый рис|brown rice/i, items: [{ ru:'Бурый рис - 1 пачка / 700 г', en:'Brown rice - 1 pack / 700 g' }] },
  { re: /рис|rice/i, items: [{ ru:'Рис - 1 пачка / 700 г', en:'Rice - 1 pack / 700 g' }] },
  { re: /овсян|oat/i, items: [{ ru:'Овсянка - 1 пачка', en:'Oats - 1 pack' }] },
  { re: /паст|pasta/i, items: [{ ru:'Паста - 1 пачка', en:'Pasta - 1 pack' }] },
  { re: /киноа|quinoa/i, items: [{ ru:'Киноа - 1 пачка', en:'Quinoa - 1 pack' }] },
  { re: /картоф|potato/i, items: [{ ru:'Картофель - 1-1.5 кг', en:'Potatoes - 1-1.5 kg' }] },

  { re: /курин|куриц|chicken/i, items: [{ ru:'Куриная грудка / филе - 800-1000 г', en:'Chicken breast / fillet - 800-1000 g' }] },
  { re: /индейк|turkey/i, items: [{ ru:'Индейка - 700-900 г', en:'Turkey - 700-900 g' }] },
  { re: /говядин|beef/i, items: [{ ru:'Говядина - 700-900 г', en:'Beef - 700-900 g' }] },
  { re: /лосос|salmon/i, items: [{ ru:'Лосось - 500-700 г', en:'Salmon - 500-700 g' }] },
  { re: /тунец|tuna/i, items: [{ ru:'Тунец - 2-4 банки / 500 г', en:'Tuna - 2-4 cans / 500 g' }] },
  { re: /рыб|fish/i, items: [{ ru:'Рыба - 600-800 г', en:'Fish - 600-800 g' }] },
  { re: /яйц|egg/i, items: [{ ru:'Яйца - 10 шт', en:'Eggs - 10 pcs' }] },
  { re: /тофу|tofu/i, items: [{ ru:'Тофу - 500-700 г', en:'Tofu - 500-700 g' }] },
  { re: /чечевиц|lentil/i, items: [{ ru:'Чечевица - 1 пачка / 500 г', en:'Lentils - 1 pack / 500 g' }] },
  { re: /нут|chickpea/i, items: [{ ru:'Нут - 1 пачка / 500 г или 3 банки', en:'Chickpeas - 1 pack / 500 g or 3 cans' }] },
  { re: /фасол|beans/i, items: [{ ru:'Фасоль - 2-3 банки или 500 г сухой', en:'Beans - 2-3 cans or 500 g dry' }] },

  { re: /брокк|broccoli/i, items: [{ ru:'Брокколи - 700-1000 г', en:'Broccoli - 700-1000 g' }] },
  { re: /цветн|cauliflower/i, items: [{ ru:'Цветная капуста - 1 кочан / 700 г', en:'Cauliflower - 1 head / 700 g' }] },
  { re: /шпинат|spinach/i, items: [{ ru:'Шпинат - 300-500 г', en:'Spinach - 300-500 g' }] },
  { re: /огур|cucumber/i, items: [{ ru:'Огурцы - 5-7 шт', en:'Cucumbers - 5-7 pcs' }] },
  { re: /помид|tomato/i, items: [{ ru:'Помидоры - 6-8 шт', en:'Tomatoes - 6-8 pcs' }] },
  { re: /морков|carrot/i, items: [{ ru:'Морковь - 5-7 шт', en:'Carrots - 5-7 pcs' }] },
  { re: /капуст|cabbage/i, items: [{ ru:'Капуста - 1 кочан', en:'Cabbage - 1 head' }] },
  { re: /перец|pepper/i, items: [{ ru:'Сладкий перец - 4-6 шт', en:'Bell peppers - 4-6 pcs' }] },
  { re: /зелень|greens|lettuce|salad/i, items: [{ ru:'Зелень / салат - 2-3 пучка', en:'Greens / lettuce - 2-3 bunches' }] },
  { re: /овощ|vegetable/i, items: [{ ru:'Смесь овощей - 1.5-2 кг', en:'Mixed vegetables - 1.5-2 kg' }] },

  { re: /миндаль|almond/i, items: [{ ru:'Миндаль - 200 г', en:'Almonds - 200 g' }] },
  { re: /грецк|walnut/i, items: [{ ru:'Грецкие орехи - 200 г', en:'Walnuts - 200 g' }] },
  { re: /орех|nuts/i, items: [{ ru:'Орехи - 200-300 г', en:'Nuts - 200-300 g' }] },
  { re: /масло|oil/i, items: [{ ru:'Оливковое / растительное масло', en:'Olive / cooking oil' }] },
  { re: /йогурт|yogurt/i, items: [{ ru:'Йогурт без сахара - 4-6 порций', en:'Unsweetened yogurt - 4-6 servings' }] },
  { re: /творог|cottage/i, items: [{ ru:'Творог - 600-800 г', en:'Cottage cheese - 600-800 g' }] },
]

const DEFAULT_WEEKLY_ITEMS = [
  { ru:'Оливковое / растительное масло', en:'Olive / cooking oil' },
  { ru:'Соль, перец, специи', en:'Salt, pepper, spices' },
  { ru:'Лук - 4-6 шт', en:'Onions - 4-6 pcs' },
  { ru:'Чеснок - 1 головка', en:'Garlic - 1 bulb' },
  { ru:'Лимон - 2-3 шт', en:'Lemons - 2-3 pcs' },
]


const NUTRITION_EVIDENCE = [
  {
    id: 'PMID25182101',
    ruTitle: 'Популярные диеты дают похожий результат, если человек может их соблюдать',
    enTitle: 'Named diets work similarly when adherence is realistic',
    ru: 'Метаанализ JAMA: низкоуглеводные и низкожировые подходы помогают снижать вес, а разница между конкретными брендами диет небольшая. Поэтому Elara подбирает меню под привычки, бюджет и ограничения, а не под одну “идеальную” диету.',
    en: 'JAMA meta-analysis: low-carb and low-fat approaches both support weight loss, while differences between named diets are small. Elara prioritizes a plan the user can sustain.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/25182101/'
  },
  {
    id: 'PMID19246357',
    ruTitle: 'Соотношение БЖУ не важнее дефицита и долгосрочного соблюдения',
    enTitle: 'Macronutrient ratio is less important than calorie deficit and adherence',
    ru: 'Двухлетнее РКИ NEJM: диеты с разным соотношением жиров, белков и углеводов приводили к клинически значимому снижению веса при снижении калорийности.',
    en: 'Two-year NEJM RCT: reduced-calorie diets led to clinically meaningful weight loss regardless of which macronutrient they emphasized.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/19246357/'
  },
  {
    id: 'PMID31443231',
    ruTitle: 'Для удержания веса особенно важен белок',
    enTitle: 'Higher protein intake supports weight-loss maintenance',
    ru: 'Систематический обзор и метаанализ по удержанию веса: повышенная доля белка помогает насыщению и снижает риск повторного набора веса.',
    en: 'Systematic review and meta-analysis: higher protein intake supports satiety and may reduce weight regain after weight loss.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/31443231/'
  },
  {
    id: 'PMID41599940',
    ruTitle: 'Удержание веса связано с овощами, фруктами и цельными продуктами',
    enTitle: 'Weight-loss maintenance is linked to fruits, vegetables and healthier patterns',
    ru: 'Анализ паттернов питания при удержании веса: успешное удержание чаще связано с рационом, богатым овощами, фруктами и менее обработанными продуктами.',
    en: 'Dietary pattern analysis: successful weight-loss maintenance is associated with more fruits, vegetables and less ultra-processed food.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/41599940/'
  },
  {
    id: 'PMID41200142',
    ruTitle: 'При метаболическом синдроме разные паттерны помогают разным маркерам',
    enTitle: 'Different dietary patterns affect different metabolic-syndrome markers',
    ru: 'Сетевой метаанализ РКИ: веганский паттерн лучше ранжировался для талии, кетогенный - для давления и триглицеридов, средиземноморский - для глюкозы натощак. Это не “назначение диеты”, а подсказка для персонализации.',
    en: 'Network meta-analysis of RCTs: vegan ranked well for waist circumference, ketogenic for blood pressure and triglycerides, Mediterranean for fasting glucose. This guides personalization, not diagnosis.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/41200142/'
  },
]

function nutritionEvidencePrompt(lang = 'ru') {
  const isEn = lang === 'en'
  return isEn
    ? `Evidence rules for nutrition in Elara:
1. Do not claim one perfect diet exists for everyone. Prioritize long-term adherence.
2. For weight loss, create a realistic calorie deficit while respecting preferences, budget and restrictions.
3. Keep protein present in every main meal, especially for weight maintenance.
4. Prefer vegetables, fruit, legumes, whole grains, fish/lean protein/plant protein and minimally processed foods.
5. Reduce ultra-processed foods, refined carbs and excess saturated fat when possible.
6. If diet is vegan/keto/Mediterranean, adapt the plan safely and practically.
Sources: PMID 25182101, PMID 19246357, PMID 31443231, PMID 41599940, PMID 41200142.`
    : `Правила доказательного питания для Elara:
1. Не утверждай, что существует одна идеальная диета для всех. Главный принцип - долгосрочная приверженность.
2. Для похудения делай реалистичный дефицит калорий с учётом привычек, бюджета и ограничений.
3. В каждом основном приёме пищи должен быть источник белка, особенно для удержания веса.
4. Делай упор на овощи, фрукты, бобовые, цельные крупы, рыбу/постный белок/растительный белок и минимально обработанные продукты.
5. По возможности снижай долю ультра-обработанной еды, рафинированных углеводов и избытка насыщенных жиров.
6. Если выбран веганский, кето или средиземноморский паттерн, адаптируй меню безопасно и практично.
Источники: PMID 25182101, PMID 19246357, PMID 31443231, PMID 41599940, PMID 41200142.`
}

function getDietEvidenceNote(diet, goal, lang = 'ru') {
  const isEn = lang === 'en'
  if (goal === 'lose') return isEn
    ? 'Evidence logic: choose a pattern you can sustain; weight loss mostly depends on a realistic energy deficit rather than a “magic” diet.'
    : 'Научная логика: выбираем паттерн, который реально соблюдать; похудение в основном зависит от устойчивого дефицита энергии, а не от “магической” диеты.'
  if (goal === 'maintain') return isEn
    ? 'Evidence logic: protein and a minimally processed pattern help maintain results after weight loss.'
    : 'Научная логика: белок и менее обработанный рацион помогают удерживать результат после снижения веса.'
  if (diet === 'vegan') return isEn
    ? 'Evidence logic: vegan patterns may help waist circumference in metabolic-syndrome studies; watch protein, B12, iron, calcium and omega-3.'
    : 'Научная логика: веганский паттерн в исследованиях метаболического синдрома лучше ранжировался для талии; важно следить за белком, B12, железом, кальцием и омега-3.'
  if (diet === 'keto') return isEn
    ? 'Evidence logic: ketogenic patterns can improve triglycerides and blood pressure in some studies, but are restrictive and need medical caution with chronic conditions.'
    : 'Научная логика: кето-паттерн в некоторых исследованиях лучше влиял на триглицериды и давление, но он ограничительный и требует осторожности при хронических состояниях.'
  if (diet === 'mediterranean') return isEn
    ? 'Evidence logic: Mediterranean patterns are strong for cardiometabolic markers and fasting glucose; use vegetables, legumes, fish, olive oil and whole grains.'
    : 'Научная логика: средиземноморский паттерн хорошо поддерживает кардиометаболические маркеры и глюкозу натощак; база - овощи, бобовые, рыба, оливковое масло и цельные крупы.'
  return isEn
    ? 'Evidence logic: Elara prioritizes adherence, protein, vegetables, whole foods and realistic routine over rigid diet labels.'
    : 'Научная логика: Elara ставит выше всего приверженность, белок, овощи, цельные продукты и реалистичную рутину, а не жёсткие ярлыки диет.'
}

function cleanIngredientLine(line) {
  return String(line || '')
    .replace(/^[-•*]\s*/, '')
    .replace(/^\d+[.)]\s*/, '')
    .replace(/^[✓✔]\s*/, '')
    .trim()
}

function stripMarkdown(text) {
  return String(text || '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^\s{0,3}>\s?/gm, '')
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
}

function cleanRecipeText(text) {
  return stripMarkdown(text)
    .replace(/\bIngredients\b\s*:?/gi, 'Ингредиенты:')
    .replace(/\bInstructions\b\s*:?/gi, 'Приготовление:')
    .replace(/\bPreparation\b\s*:?/gi, 'Приготовление:')
    .replace(/\bCooking\b\s*:?/gi, 'Приготовление:')
    .replace(/\bMethod\b\s*:?/gi, 'Приготовление:')
    .replace(/\bServings\b\s*:?/gi, 'Порции:')
    .replace(/\bCalories\b\s*:?/gi, 'Калории:')
    .replace(/\bProtein\b\s*:?/gi, 'Белок:')
    .replace(/\bFats?\b\s*:?/gi, 'Жиры:')
    .replace(/\bCarbs?\b\s*:?/gi, 'Углеводы:')
    .replace(/\bStep\s*(\d+)/gi, 'Шаг $1')
    .trim()
}
function looksLikeIngredient(line) {
  const text = cleanIngredientLine(line)
  if (!text || text.length < 3 || text.length > 90) return false
  if (/^(разогрей|смешай|нарежь|обжарь|варить|готовь|serve|mix|cook|heat|slice|bake|fry|step|шаг)/i.test(text)) return false
  return /(\d+\s?(г|гр|kg|кг|ml|мл|tbsp|tsp|ст\.л|ч\.л)|по вкусу|pinch|cup|cups|slice|slices|шт|piece|pieces)/i.test(text)
}

function getProductCategory(item, lang) {
  const hit = PRODUCT_HINTS.find(h => h.re.test(item))
  if (hit) return lang === 'en' ? hit.categoryEn : hit.categoryRu
  return lang === 'en' ? 'Other' : 'Другое'
}

function scaleIngredientText(raw, multiplier = 1) {
  if (!raw || multiplier === 1) return raw
  return String(raw).replace(/(\d+(?:[.,]\d+)?)(\s*(?:-|–)\s*)(\d+(?:[.,]\d+)?)(\s*(?:г|гр|кг|мл|л|шт|пучка|пучков|порций|servings|serving|g|kg|ml|l|pcs|pieces|bunches|cups?))/gi, (_, a, sep, b, unit) => {
    const x = parseFloat(String(a).replace(',', '.')) * multiplier
    const y = parseFloat(String(b).replace(',', '.')) * multiplier
    const fmt = n => Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10).replace('.', ',')
    return `${fmt(x)}${sep}${fmt(y)}${unit}`
  }).replace(/(\d+(?:[.,]\d+)?)(\s*(?:г|гр|кг|мл|л|шт|пучка|пучков|порций|servings|serving|g|kg|ml|l|pcs|pieces|bunches|cups?))/gi, (_, a, unit) => {
    const x = parseFloat(String(a).replace(',', '.')) * multiplier
    const fmt = n => Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10).replace('.', ',')
    return `${fmt(x)}${unit}`
  })
}

function getPartnerCalorieSplit(userKcal, partnerKcal) {
  const userValue = parseFloat(userKcal) || 0
  const partnerValue = parseFloat(partnerKcal) || 0
  if (!userValue || !partnerValue) return { userKcal: userValue, partnerKcal: partnerValue, userShare: 0.5, partnerShare: 0.5, totalKcal: userValue + partnerValue }
  const total = userValue + partnerValue
  return {
    userKcal: userValue,
    partnerKcal: partnerValue,
    userShare: userValue / total,
    partnerShare: partnerValue / total,
    totalKcal: total
  }
}

function formatPercent(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`
}

function buildShoppingList(menu, lang, multiplier = 1) {
  const groups = new Map()
  const add = (raw, note='', scale = true) => {
    const item = cleanIngredientLine(scale ? scaleIngredientText(raw, multiplier) : raw)
    if (!item) return
    const key = item.toLowerCase().replace(/\s+/g, ' ')
    const category = getProductCategory(item, lang)
    if (!groups.has(category)) groups.set(category, new Map())
    if (!groups.get(category).has(key)) groups.get(category).set(key, { item, note })
  }

  const addRuleItems = (mealName, note) => {
    let matched = false
    INGREDIENT_RULES.forEach(rule => {
      if (rule.re.test(mealName)) {
        matched = true
        rule.items.forEach(x => add(lang === 'en' ? x.en : x.ru, note))
      }
    })
    if (/салат|salad/i.test(mealName) && !/огур|помид|капуст|морков|cucumber|tomato|cabbage|carrot/i.test(mealName)) {
      add(lang === 'en' ? 'Greens / lettuce - 2-3 bunches' : 'Зелень / салат - 2-3 пучка', note)
      add(lang === 'en' ? 'Cucumbers - 5-7 pcs' : 'Огурцы - 5-7 шт', note)
      add(lang === 'en' ? 'Tomatoes - 6-8 pcs' : 'Помидоры - 6-8 шт', note)
    }
    return matched
  }

  Object.values(menu?.recipes || {}).forEach(recipe => {
    String(recipe || '').split('\n').forEach(line => {
      if (looksLikeIngredient(line)) add(line, lang === 'en' ? 'from recipe' : 'из рецепта', false)
    })
  })

  ;(menu?.days || []).forEach(day => {
    ;(day.meals || []).forEach(meal => {
      const name = meal?.name || ''
      if (!name) return
      const note = lang === 'en' ? 'for the week' : 'на неделю'
      const matched = addRuleItems(name, note)
      if (!matched) add(name, lang === 'en' ? 'from menu' : 'из меню')
    })
  })

  DEFAULT_WEEKLY_ITEMS.forEach(x => add(lang === 'en' ? x.en : x.ru, lang === 'en' ? 'basic pantry' : 'база'))

  if (groups.size === 0 && (menu?.days || []).length) {
    add(lang === 'en' ? 'Protein source for each main meal' : 'Источник белка для основных блюд')
    add(lang === 'en' ? 'Vegetables and greens for the week' : 'Овощи и зелень на неделю')
    add(lang === 'en' ? 'Carbs from the weekly menu: grains, potatoes or bread' : 'Углеводы из меню: крупы, картофель или хлеб')
    add(lang === 'en' ? 'Fruit or berries for snacks' : 'Фрукты или ягоды для перекусов')
  }

  const order = lang === 'en'
    ? ['Protein', 'Grains & carbs', 'Vegetables & greens', 'Fruit & berries', 'Dairy / alternatives', 'Fats & extras', 'Other']
    : ['Белок', 'Крупы и углеводы', 'Овощи и зелень', 'Фрукты и ягоды', 'Молочные / альтернативы', 'Жиры и добавки', 'Другое']

  return Array.from(groups.entries())
    .map(([category, itemsMap]) => ({ category, items: Array.from(itemsMap.values()).slice(0, 24) }))
    .filter(g => g.items.length)
    .sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category))
}

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
      if (s.withPartner !== undefined) setWithPartner(Boolean(s.withPartner))
      if (s.partnerKcal) setPartnerKcal(s.partnerKcal)
      if (s.partnerGoal) setPartnerGoal(s.partnerGoal)
    } catch {}
  }

  function saveSettings() {
    try {
      localStorage.setItem(`elara_nutrition_settings_${user.id}`, JSON.stringify({
        goal, lifestyle, diet, kcal, includeProducts, excludeProducts,
        allergies, country, batchCook, servings, withPartner, partnerKcal, partnerGoal
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
        .select('*')
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
      settings: { goal, lifestyle, diet, kcal, batchCook, servings, withPartner, partnerKcal, partnerGoal },
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
          createNotification(selectedPartner.id, {
            type: 'shared_menu',
            title: rl('Совместное меню', 'Shared menu'),
            body: rl(
              `${profile?.name || 'Пользователь'} создал(а) совместное меню питания с тобой!`,
              `${profile?.name || 'User'} created a joint meal plan with you!`
            ),
            emoji: '🥗',
            sourceType: 'nutrition',
            actionUrl: '/nutrition',
            priority: 'normal',
            data: { from_user_id: user.id, from_name: profile?.name || '' },
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
        ? `Бюджет на неделю: ${getBudgetDisplay()} — учитывай цены страны ${lang === 'en' ? countryData.en : countryData.ru}` : ''
      const peopleCount    = withPartner ? 2 : 1
      const calorieSplit   = getPartnerCalorieSplit(kcal, partnerKcal)
      const totalRecipePortions = (batchCook ? (servings || 1) : 1) * peopleCount
      const batchText     = batchCook
        ? (withPartner
          ? `Готовить с партнёром: каждый рецепт и список ингредиентов сразу на ${totalRecipePortions} порции (${peopleCount} человека × ${servings || 1} дня).`
          : `Готовить заранее на ${servings} порции — повторяй блюда соответственно.`)
        : (withPartner
          ? 'Готовить с партнёром: каждый завтрак, обед, ужин и перекус сразу на двоих; ингредиенты и рецепты умножай на 2.'
          : 'Каждое блюдо строго на 1 порцию.')

      const { data, error } = await supabase.functions.invoke('ai-advisor', {
        body: {
          requestType: 'generate_nutrition',
          userId: user.id,
          goal, lifestyle, diet, kcal,
          includeProducts, excludeProducts, allergies,
          budget: budgetEnabled ? getBudgetDisplay() : '',
          country: budgetEnabled ? (lang === 'en' ? countryData.en : countryData.ru) : '',
          batchCook, servings,
          peopleCount,
          totalRecipePortions,
          calorieSplit: withPartner ? calorieSplit : null,
          withPartner, partnerName,
          partnerKcal: withPartner ? partnerKcal : '',
          partnerGoal: withPartner ? partnerGoalLabel : '',
          language: lang,
          evidenceRules: nutritionEvidencePrompt(lang),
          evidenceNote: getDietEvidenceNote(diet, goal, lang),
          evidenceSources: NUTRITION_EVIDENCE.map(x => ({ id: x.id, url: x.url, title: lang === 'en' ? x.enTitle : x.ruTitle })),
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
    if (cached) { setActiveRecipe({ name: mealName, text: cleanRecipeText(cached) }); setView('recipe'); return }

    setRecipeLoading(mealName)
    try {
      const menuIsForTwo = withPartner || Boolean(activeMenu?.shared_with || activeMenu?.shared_with_name || activeMenu?.settings?.withPartner)
      const peopleCount = menuIsForTwo ? 2 : 1
      const recipePartnerKcal = activeMenu?.partner_kcal_per_day || partnerKcal
      const recipeUserKcal = activeMenu?.kcal_per_day || kcal
      const calorieSplit = getPartnerCalorieSplit(recipeUserKcal, recipePartnerKcal)
      const portions = (batchCook ? servings : 1) * peopleCount
      const portionMode = menuIsForTwo
        ? (batchCook ? 'partner_batch' : 'partner')
        : (batchCook ? 'batch' : 'single')
      const { data, error } = await supabase.functions.invoke('ai-advisor', {
        body: {
          requestType: 'get_recipe',
          userId: user.id,
          mealName,
          portions,
          peopleCount,
          portionMode,
          withPartner: menuIsForTwo,
          partnerName: activeMenu?.shared_with_name || selectedPartner?.name || '',
          userKcal: recipeUserKcal || '',
          partnerKcal: recipePartnerKcal || '',
          calorieSplit: menuIsForTwo ? calorieSplit : null,
          batchDays: batchCook ? servings : 1,
          language: lang,
          evidenceRules: nutritionEvidencePrompt(lang),
          evidenceNote: getDietEvidenceNote(diet, goal, lang),
          evidenceSources: NUTRITION_EVIDENCE.map(x => ({ id: x.id, url: x.url, title: lang === 'en' ? x.enTitle : x.ruTitle })),
          formatRules: lang === 'en'
            ? 'Plain text only. No markdown. Add a short Evidence logic section without citations in brackets.'
            : 'Ответ строго на русском. Не используй английские заголовки и markdown-разметку: без **, #, списков с markdown-синтаксисом. Пиши простым текстом. Добавь короткий блок "Научная логика" простым текстом.'
        }
      })
      if (error) throw new Error(error.message)
      const text = cleanRecipeText(data?.recipe || '')
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
  const menuIsForTwo = withPartner || Boolean(activeMenu?.shared_with || activeMenu?.shared_with_name || activeMenu?.settings?.withPartner)
  const shoppingMultiplier = menuIsForTwo ? 2 : 1
  const shoppingList = useMemo(() => buildShoppingList(activeMenu, lang, shoppingMultiplier), [activeMenu, lang, shoppingMultiplier])

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

          <div className="card" style={{ padding:14, border:'1px solid rgba(74,222,128,0.22)', background:'rgba(74,222,128,0.055)' }}>
            <div style={{ fontSize:15, fontWeight:800, marginBottom:6 }}>🔬 {rl('На чём основаны меню','Evidence behind menus')}</div>
            <div style={{ fontSize:12, color:'var(--text2)', lineHeight:1.55, marginBottom:10 }}>
              {rl('Elara не ищет одну “идеальную” диету. Меню строится вокруг приверженности, реалистичного дефицита/поддержания калорий, белка в основных приёмах, овощей, цельных продуктов и твоих ограничений.',
                'Elara does not chase one “perfect” diet. Menus are built around adherence, realistic energy deficit/maintenance, protein at main meals, vegetables, whole foods and your restrictions.')}
            </div>
            <div style={{ display:'grid', gap:6 }}>
              {NUTRITION_EVIDENCE.slice(0, 5).map(src => (
                <a key={src.id} href={src.url} target="_blank" rel="noreferrer"
                  style={{ display:'block', padding:'8px 10px', borderRadius:10, background:'var(--bg2)', border:'1px solid var(--border)', color:'var(--text2)', textDecoration:'none', fontSize:11, lineHeight:1.35 }}>
                  <b style={{ color:'var(--accent)' }}>{src.id}</b> · {lang === 'en' ? src.enTitle : src.ruTitle}
                </a>
              ))}
            </div>
          </div>

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
                  {rl('Меню и рецепты на двоих — ингредиенты сразу ×2','Joint menu and recipes — ingredients ×2')}
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
                  {/* calorie split preview */}
                  {kcal && partnerKcal && (
                    <div style={{ marginTop:7, fontSize:11, color:'var(--text3)', lineHeight:1.45 }}>
                      {(() => {
                        const split = getPartnerCalorieSplit(kcal, partnerKcal)
                        return rl(
                          `Порции будут разными: тебе ${formatPercent(split.userShare)}, партнёру ${formatPercent(split.partnerShare)} от общего блюда. Ингредиенты считаются суммарно на двоих.`,
                          `Portions will differ: you ${formatPercent(split.userShare)}, partner ${formatPercent(split.partnerShare)} of the shared dish. Ingredients are calculated as a total for two.`
                        )
                      })()}
                    </div>
                  )}
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
                      <option key={c.code} value={c.code}>{lang === 'en' ? c.en : c.ru}</option>
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

          {menuIsForTwo && activeMenu?.kcal_per_day && activeMenu?.partner_kcal_per_day ? (
            <div className="card" style={{ padding:14, border:'1px solid rgba(236,72,153,0.22)', background:'rgba(236,72,153,0.055)' }}>
              <div style={{ fontSize:14, fontWeight:800, marginBottom:6 }}>👫 {rl('Порции для двоих','Portions for two')}</div>
              <div style={{ fontSize:12, color:'var(--text2)', lineHeight:1.55 }}>
                {(() => {
                  const split = getPartnerCalorieSplit(activeMenu.kcal_per_day, activeMenu.partner_kcal_per_day)
                  return rl(
                    `Общие блюда готовятся на двоих, но порции разные: тебе примерно ${formatPercent(split.userShare)} блюда, партнёру ${formatPercent(split.partnerShare)}. В рецептах ингредиенты считаются общим количеством, с распределением по вашим калориям.`,
                    `Shared meals are cooked for two, but portions differ: about ${formatPercent(split.userShare)} for you and ${formatPercent(split.partnerShare)} for partner. Recipes use total ingredients with a split based on your calories.`
                  )
                })()}
              </div>
            </div>
          ) : null}

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

          <div className="card" style={{ padding:14, border:'1px solid rgba(167,139,250,0.22)', background:'rgba(167,139,250,0.055)' }}>
            <div style={{ fontSize:15, fontWeight:800, marginBottom:6 }}>🔬 {rl('Научная логика этого меню','Evidence logic for this menu')}</div>
            <div style={{ fontSize:12, color:'var(--text2)', lineHeight:1.55, marginBottom:10 }}>
              {getDietEvidenceNote(diet, goal, lang)}
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
              {NUTRITION_EVIDENCE.map(src => (
                <a key={src.id} href={src.url} target="_blank" rel="noreferrer"
                  style={{ padding:'5px 8px', borderRadius:999, border:'1px solid var(--border)', color:'var(--accent)', textDecoration:'none', fontSize:11 }}>
                  {src.id}
                </a>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding:14, border:'1px solid rgba(74,222,128,0.22)', background:'rgba(74,222,128,0.055)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', gap:10, alignItems:'flex-start', marginBottom:10 }}>
              <div>
                <div style={{ fontSize:15, fontWeight:800 }}>🛒 {rl('Список продуктов на неделю','Weekly shopping list')}</div>
                <div style={{ fontSize:11, color:'var(--text3)', lineHeight:1.45, marginTop:2 }}>
                  {menuIsForTwo
                    ? rl('Собран на двоих: основные продукты, примерные количества на неделю и базовые специи. Открытые рецепты уточняют граммовки.', 'Built for two: core ingredients, approximate weekly amounts and basic pantry items. Opened recipes refine quantities.')
                    : rl('Собран сразу из блюд меню: основные продукты, примерные количества на неделю и базовые специи. Открытые рецепты уточняют граммовки.', 'Built immediately from menu dishes: core ingredients, approximate weekly amounts and basic pantry items. Opened recipes refine quantities.')}
                </div>
              </div>
              <button type="button" onClick={() => navigator.clipboard?.writeText(shoppingList.map(g => `${g.category}:\n${g.items.map(x => `- ${x.item}`).join('\n')}`).join('\n\n'))}
                className="btn btn-ghost" style={{ width:'auto', padding:'7px 10px', fontSize:11 }}>
                {rl('Скопировать','Copy')}
              </button>
            </div>
            {shoppingList.length ? (
              <div style={{ display:'grid', gap:10 }}>
                {shoppingList.map(group => (
                  <div key={group.category} style={{ padding:'10px 12px', borderRadius:12, background:'var(--bg2)', border:'1px solid var(--border)' }}>
                    <div style={{ fontSize:12, fontWeight:800, color:'var(--accent)', marginBottom:6 }}>{group.category}</div>
                    <div style={{ display:'grid', gap:6 }}>
                      {group.items.map((x, idx) => (
                        <label key={`${group.category}-${idx}`} style={{ display:'grid', gridTemplateColumns:'18px 1fr', gap:9, alignItems:'start', fontSize:12, color:'var(--text2)', lineHeight:1.45, textAlign:'left', width:'100%' }}>
                          <input type="checkbox" style={{ marginTop:2, width:14, height:14 }} />
                          <span style={{ minWidth:0, overflowWrap:'anywhere' }}>{x.item}{x.note ? <span style={{ color:'var(--text3)' }}> · {x.note}</span> : null}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize:12, color:'var(--text3)' }}>{rl('Сначала создай меню.', 'Create a menu first.')}</div>
            )}
          </div>

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
          {(() => {
            const recipePeople = withPartner || Boolean(activeMenu?.shared_with || activeMenu?.shared_with_name || activeMenu?.settings?.withPartner) ? 2 : 1
            const recipePortions = (batchCook ? servings : 1) * recipePeople
            const isPartnerRecipe = recipePeople === 2
            return (
              <div style={{ marginBottom:12, padding:'8px 12px', borderRadius:8,
                background:isPartnerRecipe?'rgba(236,72,153,0.09)':(batchCook?'rgba(167,139,250,0.1)':'rgba(74,222,128,0.07)'),
                border:`1px solid ${isPartnerRecipe?'rgba(236,72,153,0.22)':(batchCook?'rgba(167,139,250,0.2)':'rgba(74,222,128,0.15)')}`,
                fontSize:12, color:isPartnerRecipe?'#f472b6':(batchCook?'var(--accent)':'#4ade80') }}>
                {isPartnerRecipe
                  ? `👫 ${rl(`Рецепт сразу на двоих: ${recipePortions} порции, все ингредиенты уже умножены`, `Recipe for two: ${recipePortions} servings, ingredients already multiplied`)}`
                  : batchCook
                    ? `📦 ${rl(`Рецепт на ${servings} порции (ингредиенты в сыром/сухом виде)`, `Recipe for ${servings} servings (ingredients raw/dry weight)`)}`
                    : `🍽 ${rl('Рецепт на 1 порцию — все ингредиенты в сыром/сухом виде', '1 serving recipe — all ingredients in raw/dry weight')}`}
              </div>
            )
          })()}
          <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.85 }}>
            {activeRecipe.text.split('\n').map((rawLine, i) => {
              const line = cleanRecipeText(rawLine)
              if (line.startsWith('## ')) return <div key={i} style={{ fontSize:14, fontWeight:700, color:'var(--accent)', marginTop:14, marginBottom:6 }}>{line.replace('## ','')}</div>
              if (line.startsWith('# '))  return <div key={i} style={{ fontSize:15, fontWeight:700, color:'var(--text)', marginTop:16, marginBottom:8 }}>{line.replace('# ','')}</div>
              if (line.startsWith('- ') || line.startsWith('• ')) return <div key={i} style={{ paddingLeft:12, marginBottom:3 }}><span style={{ color:'var(--accent)', marginRight:6 }}>•</span>{line.replace(/^[-•] /,'')}</div>
              if (/^\d+\./.test(line)) return <div key={i} style={{ paddingLeft:4, marginBottom:4 }}>{line}</div>
              if (line.trim()==='') return <div key={i} style={{ height:6 }} />
              return <div key={i} style={{ marginBottom:2 }}>{line}</div>
            })}
          </div>
          <div style={{ marginTop:14, padding:'10px 12px', borderRadius:12, background:'var(--bg2)', border:'1px solid var(--border)' }}>
            <div style={{ fontSize:12, fontWeight:800, marginBottom:6 }}>🔬 {rl('Исследования, на которых основан подход','Studies behind this approach')}</div>
            <div style={{ display:'grid', gap:6 }}>
              {NUTRITION_EVIDENCE.map(src => (
                <a key={src.id} href={src.url} target="_blank" rel="noreferrer"
                  style={{ color:'var(--accent)', fontSize:11, textDecoration:'none', lineHeight:1.35 }}>
                  {src.id} · {lang === 'en' ? src.enTitle : src.ruTitle}
                </a>
              ))}
            </div>
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
