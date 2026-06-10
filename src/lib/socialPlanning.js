export const PLAN_TYPES = [
  { key:'spa', emoji:'🛁', ru:'СПА / баня / бассейн', en:'Spa / sauna / pool', load:'low', needsEnergy:2, needsSocial:2, avoidPeriod:true, avoidPms:true, avoidHighPain:true, calmOk:true },
  { key:'party', emoji:'🪩', ru:'Вечеринка / бар', en:'Party / bar', load:'high', needsEnergy:4, needsSocial:4, avoidPeriod:false, avoidPms:true, avoidHighPain:true },
  { key:'walk', emoji:'🚶', ru:'Прогулка', en:'Walk', load:'medium', needsEnergy:2, needsSocial:2, avoidPeriod:false, avoidPms:false, avoidHighPain:true },
  { key:'cooking', emoji:'🍳', ru:'Совместная готовка', en:'Cooking together', load:'low', needsEnergy:1, needsSocial:2, avoidPeriod:false, avoidPms:false, avoidHighPain:false, calmOk:true },
  { key:'home_date', emoji:'🏠', ru:'Домашний досуг', en:'Home hangout', load:'low', needsEnergy:1, needsSocial:1, avoidPeriod:false, avoidPms:false, avoidHighPain:false, calmOk:true },
  { key:'cafe', emoji:'☕', ru:'Кафе / ужин', en:'Cafe / dinner', load:'low', needsEnergy:2, needsSocial:2, avoidPeriod:false, avoidPms:false, avoidHighPain:false, calmOk:true },
  { key:'sport', emoji:'🏃', ru:'Спорт / активность', en:'Sport / activity', load:'high', needsEnergy:4, needsSocial:3, avoidPeriod:false, avoidPms:true, avoidHighPain:true, avoidHeavyFlow:true },
  { key:'trip', emoji:'🚗', ru:'Поездка / выезд', en:'Trip', load:'high', needsEnergy:4, needsSocial:3, avoidPeriod:true, avoidPms:true, avoidHighPain:true },
  { key:'quiet', emoji:'🛋', ru:'Спокойный отдых', en:'Quiet rest', load:'low', needsEnergy:1, needsSocial:1, avoidPeriod:false, avoidPms:false, avoidHighPain:false, calmOk:true },
  { key:'support', emoji:'🫶', ru:'Поддержка / забота', en:'Support / care', load:'low', needsEnergy:1, needsSocial:1, avoidPeriod:false, avoidPms:false, avoidHighPain:false, calmOk:true },
]

export const STATUS_META = {
  period: { emoji:'🩸', ru:'месячные', en:'period', energy:1, social:2, painRisk:3, isPeriod:true },
  pms: { emoji:'🌧', ru:'ПМС', en:'PMS', energy:2, social:2, painRisk:2, isPms:true },
  ovulation: { emoji:'✨', ru:'овуляция', en:'ovulation', energy:4, social:4, painRisk:1, isOvulation:true },
  fertile: { emoji:'🌿', ru:'фертильное окно', en:'fertile window', energy:4, social:4, painRisk:1 },
  follicular: { emoji:'🌱', ru:'фолликулярная фаза', en:'follicular phase', energy:3, social:3, painRisk:0 },
  luteal: { emoji:'🌙', ru:'лютеиновая фаза', en:'luteal phase', energy:3, social:3, painRisk:1 },
  regular: { emoji:'•', ru:'обычный день', en:'regular day', energy:3, social:3, painRisk:0 },
  high_energy: { emoji:'⚡', ru:'активно', en:'active', energy:5, social:4, painRisk:0 },
  energetic: { emoji:'⚡', ru:'активно', en:'active', energy:5, social:4, painRisk:0 },
  medium_energy: { emoji:'🔥', ru:'рабочий режим', en:'work mode', energy:3, social:3, painRisk:1 },
  calm: { emoji:'🌿', ru:'спокойно', en:'calm', energy:3, social:3, painRisk:0 },
  happy: { emoji:'😊', ru:'хорошее настроение', en:'good mood', energy:4, social:4, painRisk:0 },
  grateful: { emoji:'🤍', ru:'благодарность', en:'grateful', energy:3, social:4, painRisk:0 },
  romantic: { emoji:'🌷', ru:'романтичный настрой', en:'romantic mood', energy:3, social:3, painRisk:0 },
  low_energy: { emoji:'😴', ru:'низкая энергия', en:'low energy', energy:1, social:1, painRisk:1 },
  tired: { emoji:'😴', ru:'усталость', en:'tired', energy:1, social:1, painRisk:1 },
  stressed: { emoji:'💭', ru:'стресс', en:'stress', energy:1, social:1, painRisk:1 },
  anxious: { emoji:'💭', ru:'тревожно', en:'anxious', energy:1, social:1, painRisk:1 },
  irritated: { emoji:'⚡', ru:'раздражение', en:'irritated', energy:2, social:1, painRisk:1 },
  conflicted: { emoji:'🫠', ru:'противоречиво', en:'conflicted', energy:2, social:1, painRisk:1 },
  sad: { emoji:'🌧', ru:'грустно', en:'sad', energy:1, social:1, painRisk:1 },
}

export function toDateKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function buildDateRange(days = 21) {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return toDateKey(d)
  })
}

export function labelForStatus(status, lang = 'ru') {
  if (!status) return lang === 'en' ? 'no status' : 'статус не указан'
  const meta = STATUS_META[status]
  if (!meta) return status
  return `${meta.emoji} ${lang === 'en' ? meta.en : meta.ru}`
}

export function getDayState({ cycleType, mood, sportLog, hasCalendarAccess = true }) {
  const base = cycleType || mood || null
  const meta = STATUS_META[base] || null
  const workouts = sportLog?.workouts || []
  const hasSport = workouts.length > 0
  const intenseSport = sportLog?.intensity === 'intense'

  let energy = meta?.energy ?? 3
  let social = meta?.social ?? 3
  let painRisk = meta?.painRisk ?? 0

  if (hasSport) energy = Math.max(energy, intenseSport ? 4 : 3)
  if (base === 'period') painRisk = Math.max(painRisk, 3)
  if (base === 'pms') painRisk = Math.max(painRisk, 2)

  return {
    status: base,
    hasCalendarAccess,
    isPeriod: Boolean(meta?.isPeriod),
    isPms: Boolean(meta?.isPms),
    isOvulation: Boolean(meta?.isOvulation),
    energy,
    social,
    painRisk,
    hasSport,
    sportIntensity: sportLog?.intensity || null,
  }
}

export function scoreDayForPlan(dayState = {}, planType) {
  const plan = PLAN_TYPES.find(p => p.key === planType) || PLAN_TYPES[0]
  const reasons = []
  let score = 52

  score += ((dayState.energy ?? 3) - 3) * 10
  score += ((dayState.social ?? 3) - 3) * 7
  score -= (dayState.painRisk ?? 0) * 7

  if (plan.needsEnergy && (dayState.energy ?? 3) < plan.needsEnergy) {
    score -= (plan.needsEnergy - (dayState.energy ?? 3)) * 13
    reasons.push('low_energy')
  }
  if (plan.needsSocial && (dayState.social ?? 3) < plan.needsSocial) {
    score -= (plan.needsSocial - (dayState.social ?? 3)) * 10
    reasons.push('low_social')
  }
  if (plan.avoidPeriod && dayState.isPeriod) { score -= 28; reasons.push('period') }
  if (plan.avoidPms && dayState.isPms) { score -= 16; reasons.push('pms') }
  if (plan.avoidHighPain && (dayState.painRisk ?? 0) >= 3) { score -= 16; reasons.push('pain') }
  if (plan.avoidHeavyFlow && dayState.isPeriod) { score -= 14; reasons.push('bleeding') }
  if (plan.calmOk && (dayState.energy ?? 3) <= 2) score += 10
  if (plan.load === 'high' && dayState.isOvulation) score += 10
  if (plan.load === 'low' && (dayState.isPeriod || dayState.isPms)) score += 6

  return { score: Math.max(0, Math.min(100, Math.round(score))), reasons: Array.from(new Set(reasons)) }
}

export function collectGroupStats(states = []) {
  const usable = states.filter(Boolean)
  const total = usable.length
  const count = (fn) => usable.filter(fn).length
  const avg = (field, fallback = 3) => total ? usable.reduce((s, x) => s + Number(x?.[field] ?? fallback), 0) / total : fallback
  return {
    total,
    period: count(s => s.isPeriod),
    pms: count(s => s.isPms),
    ovulation: count(s => s.isOvulation),
    lowEnergy: count(s => Number(s.energy ?? 3) <= 2),
    highEnergy: count(s => Number(s.energy ?? 3) >= 4),
    highPain: count(s => Number(s.painRisk ?? 0) >= 3),
    avgEnergy: avg('energy'),
    avgSocial: avg('social'),
    periodRatio: total ? count(s => s.isPeriod) / total : 0,
    pmsRatio: total ? count(s => s.isPms) / total : 0,
    lowEnergyRatio: total ? count(s => Number(s.energy ?? 3) <= 2) / total : 0,
    highEnergyRatio: total ? count(s => Number(s.energy ?? 3) >= 4) / total : 0,
  }
}

export function groupScoreForDate(states, planType) {
  const usable = (states || []).filter(Boolean)
  if (!usable.length) return { score:0, level:'none', reasons:['no_people'], stats:collectGroupStats([]) }
  // Проверим есть ли реальные данные (не только дефолтные состояния)
  const hasRealData = usable.some(s => s && (s.cycleType || s.mood || s.energy !== undefined))
  if (!hasRealData) return { score:50, level:'ok', reasons:['no_data'], stats:collectGroupStats(usable) }

  const plan = PLAN_TYPES.find(p => p.key === planType) || PLAN_TYPES[0]
  const scored = usable.map(s => scoreDayForPlan(s, planType))
  const avg = scored.reduce((sum, s) => sum + s.score, 0) / scored.length
  const min = Math.min(...scored.map(s => s.score))
  const stats = collectGroupStats(usable)
  const reasons = Array.from(new Set(scored.flatMap(s => s.reasons)))

  // Важное отличие от старой логики: один человек в ПМС больше не валит всю группу в ноль.
  // Большинство задаёт общий ритм, меньшинство мягко сдвигает совет в спокойную сторону.
  let score = avg * 0.78 + min * 0.22

  if (plan.load === 'high') {
    if (stats.periodRatio >= 0.5) { score -= 26; reasons.push('many_period') }
    else if (stats.period > 0) { score -= 9; reasons.push('some_period') }
    if (stats.pmsRatio >= 0.5) { score -= 22; reasons.push('many_pms') }
    else if (stats.pms > 0) { score -= 8; reasons.push('some_pms') }
    if (stats.lowEnergyRatio >= 0.5) { score -= 18; reasons.push('many_low_energy') }
  }

  if (plan.load === 'medium') {
    if (stats.periodRatio >= 0.5 || stats.pmsRatio >= 0.5) { score -= 10; reasons.push('soften_plan') }
    if (stats.highEnergyRatio >= 0.5 && stats.periodRatio < 0.35 && stats.pmsRatio < 0.35) score += 8
  }

  if (plan.load === 'low') {
    if (stats.periodRatio >= 0.5 || stats.pmsRatio >= 0.5 || stats.lowEnergyRatio >= 0.5) score += 12
    if (stats.highEnergyRatio >= 0.65 && plan.key === 'quiet') score -= 6
  }

  score = Math.max(0, Math.min(100, Math.round(score)))
  return { score, level: score >= 72 ? 'good' : score >= 48 ? 'ok' : 'bad', reasons, stats }
}

export function rankedPlansForStates(states, lang = 'ru') {
  return PLAN_TYPES
    .map(plan => ({ plan, scoreInfo: groupScoreForDate(states, plan.key) }))
    .sort((a, b) => b.scoreInfo.score - a.scoreInfo.score)
}

export function bestPlanForStates(states, lang = 'ru') {
  return rankedPlansForStates(states, lang)[0]
}

export function groupCompositionText(stats = {}, lang = 'ru') {
  const rl = (ru, en) => lang === 'en' ? en : ru
  if (!stats.total) return rl('Нет открытых данных для расчёта.', 'No shared data for scoring.')
  const bits = []
  if (stats.period) bits.push(rl(`${stats.period}/${stats.total} месячные`, `${stats.period}/${stats.total} period`))
  if (stats.pms) bits.push(rl(`${stats.pms}/${stats.total} ПМС`, `${stats.pms}/${stats.total} PMS`))
  if (stats.ovulation) bits.push(rl(`${stats.ovulation}/${stats.total} овуляция`, `${stats.ovulation}/${stats.total} ovulation`))
  if (stats.lowEnergy) bits.push(rl(`${stats.lowEnergy}/${stats.total} низкий ресурс`, `${stats.lowEnergy}/${stats.total} low energy`))
  if (!bits.length) bits.push(rl('у большинства нейтральный или хороший ресурс', 'most people look neutral or okay'))
  return bits.join(' · ')
}

export function adviceForScore(scoreInfo, planKey, lang = 'ru') {
  const rl = (ru, en) => (lang === 'en' ? en : ru)
  const plan = PLAN_TYPES.find(p => p.key === planKey) || PLAN_TYPES[0]
  const stats = scoreInfo?.stats

  if (plan.key === 'cooking' && scoreInfo.level !== 'bad') return rl(`Хорошее окно для совместной готовки: низкая нагрузка, можно учесть ресурс группы и приготовить что-то простое.`, `Good window for cooking together: low load, easy to match the group capacity and keep it simple.`)
  if (plan.key === 'home_date' && scoreInfo.level !== 'bad') return rl(`Лучше домашний формат: еда, фильм, настолка или спокойный разговор без лишней нагрузки.`, `Home format fits: food, movie, board game or calm conversation without overload.`)
  if (scoreInfo.level === 'good') return rl(`Хорошее окно для “${plan.ru}”.`, `Good window for “${plan.en}”.`)
  if (scoreInfo.level === 'ok') return rl(`Можно, но лучше без перегруза: “${plan.ru}”.`, `Possible, but keep it gentle: “${plan.en}”.`)
  if (scoreInfo.reasons?.includes('many_period')) return rl('У многих месячные, лучше спокойный формат или забота.', 'Many are on period, choose a calm plan or care.')
  if (scoreInfo.reasons?.includes('many_pms')) return rl('У многих ПМС, лучше мягкий план без шумной нагрузки.', 'Many have PMS, keep it gentle.')
  if (scoreInfo.reasons?.includes('period')) return rl('Для этого формата месячные могут мешать.', 'Period days may be uncomfortable for this plan.')
  if (scoreInfo.reasons?.includes('pms')) return rl('Лучше спокойнее: у кого-то может быть ПМС или низкий ресурс.', 'Better keep it calmer: someone may have PMS or low capacity.')
  if (scoreInfo.reasons?.includes('low_energy')) return rl('Сегодня скорее спокойный отдых, а не активная программа.', 'Today looks better for quiet rest, not an active plan.')
  if (stats) return groupCompositionText(stats, lang)
  return rl('Не лучшее окно. Можно выбрать спокойный формат или другой день.', 'Not the best window. Choose a calmer plan or another day.')
}
