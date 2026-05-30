export const FLOW_OPTIONS = [
  { key:'spotting', ru:'Мажущие', en:'Spotting', weight:1, emoji:'▫️' },
  { key:'light', ru:'Скудные', en:'Light', weight:2, emoji:'💧' },
  { key:'medium', ru:'Умеренные', en:'Medium', weight:3, emoji:'🩸' },
  { key:'heavy', ru:'Обильные', en:'Heavy', weight:4, emoji:'🩸🩸' },
  { key:'very_heavy', ru:'Очень обильные', en:'Very heavy', weight:5, emoji:'⚠️' },
]

export const PERIOD_COLOR_OPTIONS = [
  { key:'bright_red', ru:'Ярко-красные', en:'Bright red', emoji:'🔴' },
  { key:'dark_red', ru:'Тёмно-красные', en:'Dark red', emoji:'🔴' },
  { key:'brown', ru:'Коричневые', en:'Brown', emoji:'🟤' },
  { key:'pink', ru:'Розовые', en:'Pink', emoji:'🩷' },
  { key:'other', ru:'Другое', en:'Other', emoji:'•' },
]

export const PERIOD_CONSISTENCY_OPTIONS = [
  { key:'normal', ru:'Обычные', en:'Typical' },
  { key:'watery', ru:'Водянистые', en:'Watery' },
  { key:'mucus', ru:'Слизистые', en:'Mucus-like' },
  { key:'clots', ru:'Со сгустками', en:'With clots' },
  { key:'other', ru:'Другое', en:'Other' },
]

export function getOptionLabel(options, key, lang = 'ru') {
  const found = options.find(o => o.key === key)
  if (!found) return key || ''
  return lang === 'en' ? found.en : found.ru
}

export function getFlowWeight(flow) {
  return FLOW_OPTIONS.find(f => f.key === flow)?.weight || null
}

export function getPeriodSegment(periodDay, avgPeriodLength = 5) {
  const len = Math.max(2, Number(avgPeriodLength) || 5)
  const day = Math.max(1, Number(periodDay) || 1)

  if (day <= Math.ceil(len / 3)) return 'beginning'
  if (day >= Math.max(2, Math.floor((len * 2) / 3) + 1)) return 'end'

  return 'middle'
}

export function getExpectedPainBySegment(health = {}, periodDay = 1) {
  const segment = getPeriodSegment(periodDay, health.avg_period_length || 5)
  const pattern = health.period_pain_pattern || {}
  const value = pattern[segment]

  return Number.isFinite(Number(value)) ? Number(value) : null
}

export function getExpectedFlowForDay(health = {}, periodDay = 1) {
  const pattern = health.period_flow_pattern || {}
  const value = pattern[`day${periodDay}`]

  return value || health.period_volume || null
}

export function buildPeriodDayPrediction({ health = {}, periodDay = 1, lastCycleLogs = [] }) {
  const sameDayLogs = lastCycleLogs.filter(l => Number(l.period_day) === Number(periodDay))

  const avgPain = sameDayLogs.length
    ? Math.round(
        sameDayLogs.reduce((sum, l) => sum + (Number(l.pain_level) || 0), 0) / sameDayLogs.length
      )
    : getExpectedPainBySegment(health, periodDay)

  const flowCounts = {}

  sameDayLogs.forEach(l => {
    if (!l.flow) return
    flowCounts[l.flow] = (flowCounts[l.flow] || 0) + 1
  })

  const expectedFlow = Object.entries(flowCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0]
    || getExpectedFlowForDay(health, periodDay)

  return {
    periodDay,
    expectedPain: avgPain,
    expectedFlow,
    confidence: sameDayLogs.length >= 3
      ? 'high'
      : sameDayLogs.length >= 1
        ? 'medium'
        : 'profile',
  }
}

export function detectPeriodDeviation({ todayLog = {}, expected = {} }) {
  const issues = []

  const pain = Number(todayLog.pain_level)

  if (Number.isFinite(pain) && Number.isFinite(Number(expected.expectedPain))) {
    const diff = pain - Number(expected.expectedPain)

    if (diff >= 3) {
      issues.push({
        type: 'pain_high',
        level: diff >= 5 ? 'high' : 'medium',
      })
    }
  }

  const todayFlow = getFlowWeight(todayLog.flow)
  const expectedFlow = getFlowWeight(expected.expectedFlow)

  if (todayFlow && expectedFlow) {
    const diff = todayFlow - expectedFlow

    if (diff >= 2) {
      issues.push({
        type: 'flow_heavier',
        level: diff >= 3 ? 'high' : 'medium',
      })
    }

    if (diff <= -2) {
      issues.push({
        type: 'flow_lighter',
        level: 'low',
      })
    }
  }

  if (todayLog.flow === 'very_heavy') {
    issues.push({
      type: 'very_heavy',
      level: 'high',
    })
  }

  if (todayLog.consistency === 'clots' && todayFlow >= 4) {
    issues.push({
      type: 'clots_heavy',
      level: 'medium',
    })
  }

  return issues
}