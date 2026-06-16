function dateOnly(value) {
  const d = value instanceof Date ? new Date(value) : new Date(`${value}T00:00:00`)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(value, days) {
  const d = dateOnly(value)
  d.setDate(d.getDate() + days)
  return d
}

function toKey(value) {
  const d = dateOnly(value)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function inRange(d, start, end) {
  if (!start || !end) return false
  const x = dateOnly(d).getTime()
  const s = dateOnly(start).getTime()
  const e = dateOnly(end).getTime()
  if (e < s) return false
  return x >= s && x <= e
}

function daysDiff(a, b) {
  return Math.round((dateOnly(a) - dateOnly(b)) / (1000 * 60 * 60 * 24))
}

function median(values, fallback) {
  const clean = values.filter(v => Number.isFinite(v)).sort((a, b) => a - b)
  if (!clean.length) return fallback
  return clean[Math.floor(clean.length / 2)]
}

function average(values) {
  const clean = values.filter(v => Number.isFinite(v))
  if (!clean.length) return null
  return clean.reduce((sum, v) => sum + v, 0) / clean.length
}

function clamp(n, min, max, fallback) {
  const v = Number(n)
  if (!Number.isFinite(v)) return fallback
  return Math.max(min, Math.min(max, v))
}

function makeCycleWindow({
  periodStart,
  periodEnd,
  nextPeriodStart,
  cycleLength,
  periodLength,
  lutealLength,
  isPredicted,
  isHistorical,
  source = 'average',
}) {
  const periodStartDate = dateOnly(periodStart)
  const rawNextStartDate = dateOnly(nextPeriodStart)
  const rawCycleLength = daysDiff(rawNextStartDate, periodStartDate)
  const safeCycleLength = clamp(cycleLength || rawCycleLength, 18, 45, 28)

  // Если между двумя отметками слишком большая дыра, не растягиваем фазы на весь провал.
  // Иначе календарь честно рисует месяц фолликулярной фазы, и человечество снова проигрывает интерфейсу.
  const nextStartDate = rawCycleLength > 45 || rawCycleLength < 18
    ? addDays(periodStartDate, safeCycleLength)
    : rawNextStartDate

  const cycleEnd = addDays(nextStartDate, -1)
  const safePeriodLength = clamp(periodLength, 1, 13, 5)
  const safeLutealLength = clamp(lutealLength, 10, 18, 14)

  const periodEndDate = periodEnd ? dateOnly(periodEnd) : addDays(periodStartDate, safePeriodLength - 1)
  const safePeriodEnd = periodEndDate > cycleEnd ? cycleEnd : periodEndDate

  const ovulation = addDays(nextStartDate, -safeLutealLength)
  const fertileStart = addDays(ovulation, -5)
  const fertileEnd = addDays(ovulation, 1)
  const follicularStart = addDays(safePeriodEnd, 1)
  const follicularEnd = addDays(fertileStart, -1)
  const pmsStart = addDays(nextStartDate, -5)
  const pmsEnd = cycleEnd
  const lutealStart = addDays(ovulation, 1)
  const lutealEnd = addDays(pmsStart, -1)

  return {
    cycleStart: periodStartDate,
    cycleEnd,
    periodStart: periodStartDate,
    periodEnd: safePeriodEnd,
    nextPeriodStart: nextStartDate,
    follicularStart,
    follicularEnd,
    fertileStart,
    fertileEnd,
    ovulation,
    lutealStart,
    lutealEnd,
    pmsStart,
    pmsEnd,
    cycleLength: safeCycleLength,
    periodLength: safePeriodLength,
    lutealLength: safeLutealLength,
    isPredicted,
    isHistorical,
    source,
  }
}

export function predictCycle(history) {
  if (!history || history.length < 1) return null

  const sorted = [...history]
    .filter(h => h.period_start)
    .sort((a, b) => String(a.period_start).localeCompare(String(b.period_start)))

  if (!sorted.length) return null

  const explicitLengths = sorted
    .filter(h => h.cycle_length && Number(h.cycle_length) > 15 && Number(h.cycle_length) <= 45)
    .map(h => Number(h.cycle_length))

  const derivedLengths = []
  for (let i = 1; i < sorted.length; i++) {
    const diff = daysDiff(sorted[i].period_start, sorted[i - 1].period_start)
    if (diff >= 18 && diff <= 45) derivedLengths.push(diff)
  }

  const allLengths = [...explicitLengths, ...derivedLengths]
  const avgCycleLength = median(allLengths, 28)

  const durations = sorted
    .filter(h => h.period_start && h.period_end)
    .map(h => daysDiff(h.period_end, h.period_start) + 1)
    .filter(d => d > 0 && d < 14)

  const avgPeriodLength = median(durations, 5)

  const lutealLengths = sorted
    .map(h => Number(h.luteal_length))
    .filter(d => d >= 10 && d <= 18)

  const avgLutealLength = median(lutealLengths, 14)
  const windows = []

  // Реальные исторические циклы между отмеченными началами месячных.
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i]
    const next = sorted[i + 1]
    const cycleLength = daysDiff(next.period_start, current.period_start)
    if (cycleLength <= 15) continue

    const useActualNextStart = cycleLength >= 18 && cycleLength <= 45
    const nextPeriodStart = useActualNextStart
      ? next.period_start
      : toKey(addDays(current.period_start, avgCycleLength))

    const periodLength = current.period_end
      ? Math.max(1, Math.min(13, daysDiff(current.period_end, current.period_start) + 1))
      : avgPeriodLength

    windows.push(makeCycleWindow({
      periodStart: current.period_start,
      periodEnd: current.period_end,
      nextPeriodStart,
      cycleLength: useActualNextStart ? cycleLength : avgCycleLength,
      periodLength,
      lutealLength: avgLutealLength,
      isPredicted: !useActualNextStart,
      isHistorical: true,
      source: useActualNextStart ? 'history' : 'history_average_due_gap',
    }))
  }

  // Прогноз назад. Это закрывает прошлые месяцы, где пользователь не отмечал овуляцию/ПМС.
  const first = sorted[0]
  let backwardNextStart = dateOnly(first.period_start)

  for (let i = 0; i < 18; i++) {
    const previousStart = addDays(backwardNextStart, -avgCycleLength)

    windows.push(makeCycleWindow({
      periodStart: previousStart,
      periodEnd: addDays(previousStart, avgPeriodLength - 1),
      nextPeriodStart: backwardNextStart,
      cycleLength: avgCycleLength,
      periodLength: avgPeriodLength,
      lutealLength: avgLutealLength,
      isPredicted: true,
      isHistorical: true,
      source: 'average_backcast',
    }))

    backwardNextStart = previousStart
  }

  // Текущий и будущие циклы от последней отмеченной менструации.
  const last = sorted[sorted.length - 1]

  let currentStart = dateOnly(last.period_start)
  let currentPeriodLength = last.period_end
    ? Math.max(1, Math.min(13, daysDiff(last.period_end, last.period_start) + 1))
    : avgPeriodLength

  for (let i = 0; i < 12; i++) {
    const nextPeriodStart = addDays(currentStart, avgCycleLength)

    windows.push(makeCycleWindow({
      periodStart: currentStart,
      periodEnd: addDays(currentStart, currentPeriodLength - 1),
      nextPeriodStart,
      cycleLength: avgCycleLength,
      periodLength: currentPeriodLength,
      lutealLength: avgLutealLength,
      isPredicted: i > 0,
      isHistorical: false,
      source: i === 0 ? 'current_average' : 'future_average',
    }))

    currentStart = nextPeriodStart
    currentPeriodLength = avgPeriodLength
  }

  const predictions = windows
    .filter(w => w?.cycleStart && w?.cycleEnd && w.cycleEnd >= w.cycleStart)
    .sort((a, b) => a.cycleStart - b.cycleStart)

  return {
    avgCycleLength,
    avgPeriodLength,
    avgLutealLength,
    totalCycles: sorted.length,
    totalCycleIntervals: allLengths.length,
    historicalCount: predictions.filter(p => p.isHistorical).length,
    predictions,
    historicalPredictions: predictions.filter(p => p.isHistorical),
    futurePredictions: predictions.filter(p => !p.isHistorical),
  }
}

export function detectStmWindow(stmLogs = {}, periodPrediction = null) {
  if (!periodPrediction) return null

  const cycleStart = periodPrediction.cycleStart || periodPrediction.periodStart
  const cycleEnd = periodPrediction.cycleEnd || addDays(periodPrediction.nextPeriodStart, -1)

  const logs = Object.values(stmLogs || {})
    .filter(l => l?.date)
    .map(l => ({
      ...l,
      date: toKey(l.date),
      temp: (l.temperature ?? l.temp) === '' || (l.temperature ?? l.temp) == null ? null : Number(l.temperature ?? l.temp),
    }))
    .filter(l => inRange(l.date, cycleStart, cycleEnd))
    .sort((a, b) => a.date.localeCompare(b.date))

  if (!logs.length) return null

  const fertileMucus = new Set(['watery', 'eggwhite', 'stretchy', 'slippery'])
  const fertileSensation = new Set(['wet', 'slippery', 'lubricative'])
  const isFertileMucus = l => fertileMucus.has(l.mucus) || fertileSensation.has(l.sensation)

  const fertileLogs = logs.filter(isFertileMucus)
  const firstFertile = fertileLogs[0]?.date || null
  const peakDay = fertileLogs.length ? fertileLogs[fertileLogs.length - 1].date : null

  let thirdHighDay = null

  for (let i = 6; i <= logs.length - 3; i++) {
    const prev6 = logs
      .slice(i - 6, i)
      .filter(l => !l.temp_disturbed)
      .map(l => l.temp)
      .filter(Number.isFinite)

    const next3 = logs
      .slice(i, i + 3)
      .filter(l => !l.temp_disturbed)
      .map(l => l.temp)

    if (prev6.length >= 5 && next3.length === 3 && next3.every(Number.isFinite)) {
      const coverline = Math.max(...prev6) + 0.2

      if (next3.every(v => v >= coverline)) {
        thirdHighDay = logs[i + 2].date
        break
      }
    }
  }

  const endCandidates = []
  if (thirdHighDay) endCandidates.push(addDays(thirdHighDay, 0))
  if (peakDay) endCandidates.push(addDays(peakDay, 3))

  const fertileEnd = endCandidates.length
    ? endCandidates.sort((a, b) => a - b)[endCandidates.length - 1]
    : null

  return {
    fertileStart: firstFertile ? dateOnly(firstFertile) : null,
    fertileEnd,
    peakDay: peakDay ? dateOnly(peakDay) : null,
    thirdHighDay: thirdHighDay ? dateOnly(thirdHighDay) : null,
    hasEnoughData: Boolean(firstFertile && fertileEnd),
  }
}

export function getPhaseForDate(date, predictions) {
  return getDetailedPhaseForDate(date, predictions)?.basic || null
}

export function getDetailedPhaseForDate(date, predictions, stmLogs = {}) {
  if (!predictions?.length) return null

  const d = dateOnly(date)

  // Берём только окно конкретного цикла. Без этого фолликулярная фаза может размазываться на весь месяц.
  const candidates = predictions.filter(p =>
    inRange(d, p.cycleStart || p.periodStart, p.cycleEnd || addDays(p.nextPeriodStart, -1))
  )

  if (!candidates.length) {
    return {
      type: 'regular',
      predicted: false,
      historical: false,
      source: 'none',
    }
  }

  // Если есть историческое окно и прогнозное окно на одну дату, историческое важнее.
  const p = candidates.sort((a, b) => Number(a.isPredicted) - Number(b.isPredicted))[0]
  const stmWindow = detectStmWindow(stmLogs, p)

  const fertileStart = stmWindow?.hasEnoughData
    ? stmWindow.fertileStart
    : p.fertileStart

  const fertileEnd = stmWindow?.hasEnoughData
    ? stmWindow.fertileEnd
    : p.fertileEnd

  const source = stmWindow?.hasEnoughData
    ? 'stm+cycle'
    : (p.source || 'cycle')

  if (inRange(d, p.periodStart, p.periodEnd)) {
    return {
      type: 'period',
      predicted: p.isPredicted,
      historical: p.isHistorical,
      source,
      basic: { type: 'period', predicted: p.isPredicted },
    }
  }

  if (toKey(d) === toKey(p.ovulation)) {
    return {
      type: 'ovulation',
      predicted: p.isPredicted,
      historical: p.isHistorical,
      source,
      basic: { type: 'ovulation', predicted: p.isPredicted },
    }
  }

  if (inRange(d, fertileStart, fertileEnd)) {
    return {
      type: 'fertile',
      predicted: p.isPredicted,
      historical: p.isHistorical,
      source,
      basic: { type: 'fertile', predicted: p.isPredicted },
    }
  }

  if (inRange(d, p.pmsStart, p.pmsEnd)) {
    return {
      type: 'pms',
      predicted: p.isPredicted,
      historical: p.isHistorical,
      source,
      basic: { type: 'pms', predicted: p.isPredicted },
    }
  }

  if (inRange(d, p.lutealStart, p.lutealEnd)) {
    return {
      type: 'luteal',
      predicted: p.isPredicted,
      historical: p.isHistorical,
      source,
    }
  }

  if (inRange(d, p.follicularStart, p.follicularEnd)) {
    return {
      type: 'follicular',
      predicted: p.isPredicted,
      historical: p.isHistorical,
      source,
    }
  }

  return {
    type: 'regular',
    predicted: p.isPredicted,
    historical: p.isHistorical,
    source,
  }
}

export function analyzeLibido(intimacyEntries = [], cyclePrediction = null) {
  const entries = (intimacyEntries || [])
    .filter(e => e?.date)
    .map(e => ({
      ...e,
      desire_level: e.desire_level == null ? null : Number(e.desire_level),
      sex_count: Number(e.sex_count || (e.had_sex ? 1 : 0)),
      masturbation_count: Number(e.masturbation_count || (e.had_masturbation ? 1 : 0)),
    }))
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))

  const desireEntries = entries.filter(e => Number.isFinite(e.desire_level) && e.desire_level > 0)
  const sexEntries = entries.filter(e => e.had_sex || e.sex_count > 0)
  const masturbationEntries = entries.filter(e => e.had_masturbation || e.masturbation_count > 0)

  const desireAverage = average(desireEntries.map(e => e.desire_level))
  const totalSexEvents = sexEntries.reduce(
    (sum, e) => sum + Math.max(1, Number(e.sex_count || 1)),
    0
  )
  const totalMasturbationEvents = masturbationEntries.reduce(
    (sum, e) => sum + Math.max(1, Number(e.masturbation_count || 1)),
    0
  )

  const firstDate = entries[0]?.date ? dateOnly(entries[0].date) : null
  const lastDate = entries[entries.length - 1]?.date ? dateOnly(entries[entries.length - 1].date) : null
  const spanDays = firstDate && lastDate ? Math.max(1, daysDiff(lastDate, firstDate) + 1) : 0
  const weeks = spanDays ? Math.max(1, spanDays / 7) : 0

  const byPhase = {}

  for (const e of entries) {
    const phase = cyclePrediction?.predictions
      ? getDetailedPhaseForDate(e.date, cyclePrediction.predictions)?.type || 'unknown'
      : 'unknown'

    if (!byPhase[phase]) {
      byPhase[phase] = {
        phase,
        entries: 0,
        desireEntries: 0,
        desireSum: 0,
        sexDays: 0,
        sexEvents: 0,
        masturbationDays: 0,
        masturbationEvents: 0,
      }
    }

    byPhase[phase].entries += 1

    if (Number.isFinite(e.desire_level) && e.desire_level > 0) {
      byPhase[phase].desireEntries += 1
      byPhase[phase].desireSum += e.desire_level
    }

    if (e.had_sex || e.sex_count > 0) {
      byPhase[phase].sexDays += 1
      byPhase[phase].sexEvents += Math.max(1, Number(e.sex_count || 1))
    }

    if (e.had_masturbation || e.masturbation_count > 0) {
      byPhase[phase].masturbationDays += 1
      byPhase[phase].masturbationEvents += Math.max(1, Number(e.masturbation_count || 1))
    }
  }

  const phases = Object.values(byPhase).map(p => ({
    ...p,
    avgDesire: p.desireEntries ? p.desireSum / p.desireEntries : null,
  }))

  const strongestPhase = phases
    .filter(p => Number.isFinite(p.avgDesire))
    .sort((a, b) => b.avgDesire - a.avgDesire)[0] || null

  let libidoBand = 'not_enough_data'

  if (desireEntries.length >= 3) {
    if (desireAverage < 2) libidoBand = 'low'
    else if (desireAverage < 3.5) libidoBand = 'medium'
    else libidoBand = 'high'
  }

  return {
    totalEntries: entries.length,
    desireEntries: desireEntries.length,
    desireAverage,
    libidoBand,
    sexDays: sexEntries.length,
    sexEvents: totalSexEvents,
    masturbationDays: masturbationEntries.length,
    masturbationEvents: totalMasturbationEvents,
    sexPerWeek: weeks ? totalSexEvents / weeks : null,
    masturbationPerWeek: weeks ? totalMasturbationEvents / weeks : null,
    spanDays,
    byPhase: phases,
    strongestPhase,
  }
}

export function findFreeWindows(allPredictions, days = 90) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const windows = []
  let windowStart = null

  for (let i = 0; i < days; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() + i)

    const allFree = allPredictions.every(pred => {
      const phase = getPhaseForDate(d, pred.predictions)
      return !phase || (phase.type !== 'period' && phase.type !== 'pms')
    })

    if (allFree) {
      if (!windowStart) windowStart = new Date(d)
    } else if (windowStart) {
      const windowEnd = new Date(d)
      windowEnd.setDate(windowEnd.getDate() - 1)

      const length = Math.round((windowEnd - windowStart) / (1000 * 60 * 60 * 24)) + 1
      if (length >= 2) windows.push({ start: windowStart, end: windowEnd, length })

      windowStart = null
    }
  }

  return windows.slice(0, 3)
}