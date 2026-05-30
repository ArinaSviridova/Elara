export function isPregnancyPlanningActive(profile) {
  const bodyMode = profile?.body_mode
  const conditions = Array.isArray(profile?.active_conditions) ? profile.active_conditions : []
  return bodyMode === 'pregnancy_planning'
    || bodyMode === 'pregnancy'
    || conditions.includes('pregnancy_planning')
    || conditions.includes('pregnancy_planning_marker')
}

export function pregnancyStorageKey(userId) {
  return `elara_pregnancy_planning_toggles_${userId || 'anon'}`
}

export function pregnancyDraftsKey(userId) {
  return `elara_pregnancy_planning_drafts_${userId || 'anon'}`
}

export function loadPregnancyToggles(userId) {
  try {
    return JSON.parse(localStorage.getItem(pregnancyStorageKey(userId)) || '{}')
  } catch {
    return {}
  }
}

export function savePregnancyToggles(userId, next) {
  try { localStorage.setItem(pregnancyStorageKey(userId), JSON.stringify(next || {})) } catch {}
}

export function loadPregnancyDrafts(userId) {
  try {
    return JSON.parse(localStorage.getItem(pregnancyDraftsKey(userId)) || '[]')
  } catch {
    return []
  }
}

export function savePregnancyDrafts(userId, drafts) {
  try { localStorage.setItem(pregnancyDraftsKey(userId), JSON.stringify(drafts || [])) } catch {}
}

export function addPregnancyDraft(userId, draft) {
  const current = loadPregnancyDrafts(userId)
  const id = draft?.id || `${draft?.type || 'draft'}_${draft?.sourceItem || 'custom'}_${Date.now()}`
  const exists = current.some(item => item.id === id || (item.type === draft.type && item.sourceItem === draft.sourceItem && item.title === draft.title))
  const next = exists ? current : [{ ...draft, id, createdAt: new Date().toISOString() }, ...current]
  savePregnancyDrafts(userId, next)
  return next
}

export function removePregnancyDraft(userId, draftId) {
  const next = loadPregnancyDrafts(userId).filter(item => item.id !== draftId)
  savePregnancyDrafts(userId, next)
  return next
}

export function hasSpermRole(profile) {
  const gender = String(profile?.gender || profile?.gender_identity || profile?.sex || '').toLowerCase()
  const bodyMode = profile?.body_mode
  return bodyMode === 'male' || gender.includes('male') || gender.includes('муж') || gender.includes('man')
}

export function hasCycleRole(profile) {
  const bodyMode = profile?.body_mode
  return ['menstrual_cycle', 'pregnancy_planning', 'pregnancy'].includes(bodyMode) || !hasSpermRole(profile)
}

function commonActions(type, rl) {
  if (type === 'health') {
    return [
      { kind:'health_note', label:rl('Добавить в здоровье','Add to health') },
      { kind:'analysis', label:rl('Добавить анализ','Add lab') },
      { kind:'doctor_upload', label:rl('Загрузить назначение врача','Upload doctor note') },
    ]
  }
  if (type === 'medications') {
    return [
      { kind:'medication', label:rl('Добавить в таблетки','Add to meds') },
      { kind:'doctor_upload', label:rl('Загрузить назначение врача','Upload doctor note') },
    ]
  }
  if (type === 'sport') {
    return [
      { kind:'sport_plan', label:rl('Добавить спорт-задачу','Add sport task') },
      { kind:'navigate', path:'/sport?pregnancy=1', label:rl('Открыть спорт','Open sport') },
    ]
  }
  return []
}

export function pregnancyPlanningItems(profile, rl = (ru) => ru) {
  const sperm = hasSpermRole(profile)
  const cycle = hasCycleRole(profile)
  const items = [
    {
      id: 'doctor_visit', area: 'health', icon: '🩺',
      title: rl('Записаться к врачу', 'Book a doctor visit'),
      text: rl('Гинеколог / семейный врач / репродуктолог по ситуации. Приложение даёт чеклист, а назначения подтверждает врач.', 'Gynecologist / family doctor / fertility specialist depending on the situation.'),
      details: rl('Смысл шага - принести врачу список вопросов: лекарства, хронические состояния, прививки, анализы, планируемые сроки, спорт и особенности цикла. Если врач уже дал рекомендации, их можно загрузить или внести вручную.', 'Bring a checklist to the clinician: meds, conditions, vaccines, labs, timeline, activity and cycle specifics. Upload or enter doctor recommendations if you already have them.'),
      cta: rl('Открыть здоровье', 'Open health'), path: '/health?pregnancy=1', priority: 'high',
      actions: commonActions('health', rl),
    },
    {
      id: 'sti_screening', area: 'health', icon: '🧪',
      title: rl('ИППП-скрининг', 'STI screening'),
      text: rl('Проверить инфекции до попыток - скучно, зато полезно. Для пары лучше планировать синхронно.', 'Check infections before trying. Boring, useful, tragically adult.'),
      details: rl('Подготовка пары обычно безопаснее, когда оба понимают свой статус. Elara не назначает конкретный список анализов: сохрани это как задачу и уточни у врача, что именно сдавать локально.', 'Planning is safer when both people understand their status. Elara does not prescribe a lab panel: save this task and ask a clinician what to test locally.'),
      cta: rl('Открыть здоровье', 'Open health'), path: '/health?pregnancy=1', priority: 'high',
      actions: commonActions('health', rl),
    },
    {
      id: 'vaccines', area: 'health', icon: '💉',
      title: rl('Проверить прививки', 'Check vaccines'),
      text: rl('Некоторые прививки лучше проверить заранее. Конкретику - с врачом и по локальным правилам.', 'Some vaccines are better checked in advance. Confirm with a clinician.'),
      details: rl('Это пункт для проверки, а не самоназначения. Сохрани его в здоровье, загрузи старые записи о прививках или обсуди с врачом, что актуально именно для тебя и партнёра.', 'This is a check item, not self-prescribing. Save it to health, upload vaccine records or ask a clinician what applies to you and your partner.'),
      cta: rl('Открыть здоровье', 'Open health'), path: '/health?pregnancy=1', priority: 'normal',
      actions: commonActions('health', rl),
    },
    {
      id: 'med_review', area: 'medications', icon: '💊',
      title: rl('Проверить лекарства', 'Review medications'),
      text: rl('Все препараты, БАДы и витамины лучше сверить с врачом до беременности. Самоназначения - в мусорку, где им и место.', 'Review meds and supplements with a clinician before pregnancy.'),
      details: rl('Добавь текущие препараты в “Таблетки”, чтобы не забыть показать врачу. Особенно важно всё, что принимается регулярно, гормоны, обезболивающие, психиатрические препараты, БАДы и витамины.', 'Add current meds to Medications so you can show them to a clinician. Especially regular meds, hormones, painkillers, psychiatric meds, supplements and vitamins.'),
      cta: rl('Открыть таблетки', 'Open meds'), path: '/medications?pregnancy=1', priority: 'high',
      actions: commonActions('medications', rl),
    },
    {
      id: 'folic_discuss', area: 'medications', icon: '🌿',
      title: rl('Обсудить фолиевую кислоту', 'Discuss folic acid'),
      text: rl('Не начинаем “по совету приложения”. Обсуди дозировку и формат с врачом.', 'Do not start because an app said so. Discuss dose and format with a clinician.'),
      details: rl('Фолиевая кислота часто обсуждается до беременности, но дозировка и формат зависят от человека, лекарств, анамнеза и локальных протоколов. Поэтому кнопка ниже добавляет пункт для обсуждения, а не назначение.', 'Folic acid is commonly discussed before pregnancy, but dose and format depend on person, meds, history and local guidance. The button adds a discussion item, not a prescription.'),
      cta: rl('Открыть таблетки', 'Open meds'), path: '/medications?pregnancy=1', priority: 'high',
      suggestedMedication: { name: rl('Фолиевая кислота - обсудить с врачом', 'Folic acid - discuss with clinician'), dosage: rl('дозировку подтвердить у врача', 'confirm dose with clinician') },
      actions: commonActions('medications', rl),
    },
    {
      id: 'activity_plan', area: 'sport', icon: '🏃',
      title: rl('Настроить спорт и нагрузку', 'Set activity plan'),
      text: rl('Мягкая регулярность обычно полезнее героического рывка. При боли, хронических состояниях и беременности - только после врача.', 'Gentle consistency beats heroic chaos. Ask a clinician when needed.'),
      details: rl('Задача - выбрать безопасную регулярность: прогулки, лёгкая растяжка, умеренная активность, восстановление. Если есть боль, беременность, хронические состояния или интенсивные тренировки, лучше согласовать нагрузку с врачом.', 'Choose safe consistency: walks, gentle stretching, moderate activity, recovery. If there is pain, pregnancy, chronic conditions or intense training, confirm activity with a clinician.'),
      cta: rl('Открыть спорт', 'Open sport'), path: '/sport?pregnancy=1', priority: 'normal',
      actions: commonActions('sport', rl),
    },
    {
      id: 'sleep_recovery', area: 'sport', icon: '🌙',
      title: rl('Сон и восстановление', 'Sleep and recovery'),
      text: rl('Подготовка - это не только анализы. Сон, стресс и восстановление тоже влияют на ресурс пары.', 'Planning is not only labs. Sleep, stress and recovery matter too.'),
      details: rl('Это мягкий пункт: отмечай сон, усталость и перегруз. При тревоге, бессоннице или сильном истощении лучше обсуждать это со специалистом, а не героически страдать, как принято у людей.', 'Soft item: log sleep, fatigue and overload. Anxiety, insomnia or severe exhaustion are better discussed with a professional.'),
      cta: rl('Открыть спорт', 'Open sport'), path: '/sport?pregnancy=1', priority: 'normal',
      actions: commonActions('sport', rl),
    },
  ]

  if (cycle) {
    items.push({
      id: 'cycle_window', area: 'calendar', icon: '🗓',
      title: rl('Проверить цикл и фертильные окна', 'Check cycle and fertile windows'),
      text: rl('Отметь последние месячные и среднюю длину цикла, чтобы прогноз не гадал на кофейной гуще.', 'Log last period and cycle length so the forecast has something better than vibes.'),
      details: rl('Фертильное окно - это прогноз, а не гарантия. Чем больше фактических циклов отмечено, тем аккуратнее подсказки. При нерегулярном цикле лучше считать прогноз примерным.', 'Fertile window is a forecast, not a guarantee. More logged cycles make it more useful. Irregular cycles should be treated as approximate.'),
      cta: rl('Открыть календарь', 'Open calendar'), path: '/calendar', priority: 'normal',
      actions: [{ kind:'navigate', path:'/calendar', label:rl('Открыть календарь','Open calendar') }],
    })
  }

  if (sperm) {
    items.push({
      id: 'sperm_partner_health', area: 'partner', icon: '🧬',
      title: rl('Партнёрская подготовка', 'Partner preparation'),
      text: rl('ИППП, лекарства, никотин, алкоголь, сон, перегрев. Спермограмма - по показаниям и после врача.', 'STIs, meds, nicotine, alcohol, sleep, overheating. Semen analysis when indicated.'),
      details: rl('Для партнёра со сперматозоидами фокус не на “помогай морально и молчи”, а на реальной подготовке: ИППП, лекарства, сон, никотин, алкоголь, перегрев, врач по показаниям.', 'For a partner with sperm, focus on real preparation: STIs, meds, sleep, nicotine, alcohol, overheating, clinician when indicated.'),
      cta: rl('Открыть круг', 'Open circle'), path: '/friends', priority: 'normal',
      actions: [{ kind:'navigate', path:'/friends', label:rl('Открыть круг','Open circle') }, { kind:'health_note', label:rl('Добавить в здоровье','Add to health') }],
    })
  } else {
    items.push({
      id: 'partner_choose', area: 'partner', icon: '🕊',
      title: rl('Выбрать партнёра для подготовки', 'Choose planning partner'),
      text: rl('Если партнёр есть в кругу, можно связать подготовку и получить совместные карточки задач.', 'If partner is in Circle, link planning and get shared tasks.'),
      details: rl('Партнёр не обязателен для индивидуальной подготовки. Но если человек добавлен в круг, Elara может показать совместные карточки: кому к врачу, кому проверять анализы, кому пересмотреть лекарства и нагрузку.', 'Partner is not required for individual planning. If linked in Circle, Elara can show shared cards: doctor, labs, meds, activity.'),
      cta: rl('Открыть мастер', 'Open setup'), path: '/pregnancy-planning-setup?return=/today', priority: 'normal',
      actions: [{ kind:'navigate', path:'/pregnancy-planning-setup?return=/today', label:rl('Открыть мастер','Open setup') }],
    })
  }

  return items
}

export function pendingPregnancyItems(profile, toggles, rl) {
  return pregnancyPlanningItems(profile, rl).filter(item => toggles?.[item.id] !== 'done')
}

export function togglePregnancyItemStatus(current) {
  return current === 'done' ? 'todo' : 'done'
}
