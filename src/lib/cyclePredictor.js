export function predictCycle(history) {
  if (!history || history.length < 2) return null

  // Считаем среднюю длину цикла по ВСЕМ доступным данным
  const lengths = history
    .filter(h => h.cycle_length && h.cycle_length > 15 && h.cycle_length < 60)
    .map(h => h.cycle_length)

  // Если мало данных с cycle_length — считаем из дат напрямую
  const derivedLengths = []
  for (let i = 1; i < history.length; i++) {
    const diff = Math.round(
      (new Date(history[i].period_start) - new Date(history[i-1].period_start)) / (1000*60*60*24)
    )
    if (diff > 15 && diff < 60) derivedLengths.push(diff)
  }

  const allLengths = [...lengths, ...derivedLengths]

  // Медиана для устойчивости к выбросам
  allLengths.sort((a,b) => a-b)
  const avgCycleLength = allLengths.length > 0
    ? allLengths[Math.floor(allLengths.length / 2)]
    : 28

  // Средняя длина менструации по всем записям
  const durations = history
    .filter(h => h.period_start && h.period_end)
    .map(h => {
      const d = Math.round((new Date(h.period_end) - new Date(h.period_start)) / (1000*60*60*24)) + 1
      return d
    })
    .filter(d => d > 0 && d < 14)

  durations.sort((a,b) => a-b)
  const avgPeriodLength = durations.length > 0
    ? durations[Math.floor(durations.length / 2)]
    : 5

  const last = history[history.length - 1]
  const lastStart = new Date(last.period_start)

  const predictions = []
  let current = new Date(lastStart)

  for (let i = 0; i < 8; i++) {
    const periodStart = new Date(current)
    const periodEnd = new Date(current)
    periodEnd.setDate(periodEnd.getDate() + avgPeriodLength - 1)

    const pmsStart = new Date(periodStart)
    pmsStart.setDate(pmsStart.getDate() - 5)

    const ovulation = new Date(periodStart)
    ovulation.setDate(ovulation.getDate() + Math.round(avgCycleLength / 2) - 2)

    const fertileStart = new Date(ovulation)
    fertileStart.setDate(fertileStart.getDate() - 2)
    const fertileEnd = new Date(ovulation)
    fertileEnd.setDate(fertileEnd.getDate() + 2)

    predictions.push({
      periodStart, periodEnd, pmsStart, ovulation, fertileStart, fertileEnd,
      cycleLength: avgCycleLength, periodLength: avgPeriodLength,
      isPredicted: i > 0,
    })

    current = new Date(current)
    current.setDate(current.getDate() + avgCycleLength)
  }

  return {
    avgCycleLength,
    avgPeriodLength,
    totalCycles: allLengths.length,
    predictions,
  }
}

export function getPhaseForDate(date, predictions) {
  if (!predictions) return null
  const d = new Date(date); d.setHours(0,0,0,0)
  for (const p of predictions) {
    const ps = new Date(p.periodStart); ps.setHours(0,0,0,0)
    const pe = new Date(p.periodEnd); pe.setHours(0,0,0,0)
    const pms = new Date(p.pmsStart); pms.setHours(0,0,0,0)
    const ov = new Date(p.ovulation); ov.setHours(0,0,0,0)
    const fs = new Date(p.fertileStart); fs.setHours(0,0,0,0)
    const fe = new Date(p.fertileEnd); fe.setHours(0,0,0,0)
    if (d >= ps && d <= pe) return { type:'period', predicted:p.isPredicted }
    if (d >= pms && d < ps) return { type:'pms', predicted:p.isPredicted }
    if (d.getTime() === ov.getTime()) return { type:'ovulation', predicted:p.isPredicted }
    if (d >= fs && d <= fe) return { type:'fertile', predicted:p.isPredicted }
  }
  return null
}

export function findFreeWindows(allPredictions, days = 90) {
  const today = new Date(); today.setHours(0,0,0,0)
  const windows = []; let windowStart = null
  for (let i = 0; i < days; i++) {
    const d = new Date(today); d.setDate(d.getDate() + i)
    const allFree = allPredictions.every(pred => {
      const phase = getPhaseForDate(d, pred.predictions)
      return !phase || (phase.type !== 'period' && phase.type !== 'pms')
    })
    if (allFree) { if (!windowStart) windowStart = new Date(d) }
    else if (windowStart) {
      const windowEnd = new Date(d); windowEnd.setDate(windowEnd.getDate() - 1)
      const length = Math.round((windowEnd - windowStart) / (1000*60*60*24)) + 1
      if (length >= 2) windows.push({ start: windowStart, end: windowEnd, length })
      windowStart = null
    }
  }
  return windows.slice(0, 3)
}
