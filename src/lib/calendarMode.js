export const CALENDAR_LAYERS = [
  { key: 'symptoms', icon: '🌡', ru: 'Симптомы', en: 'Symptoms' },
  { key: 'mood', icon: '◈', ru: 'Настроение', en: 'Mood' },
  { key: 'meds', icon: '💊', ru: 'Таблетки', en: 'Meds' },
  { key: 'appointments', icon: '📋', ru: 'Назначения', en: 'Appointments' },
  { key: 'vaccines', icon: '💉', ru: 'Прививки', en: 'Vaccines' },
  { key: 'checkups', icon: '🩺', ru: 'Чекапы', en: 'Checkups' },

  { key: 'cycle', icon: '🩸', ru: 'Цикл', en: 'Cycle' },
  { key: 'stm', icon: '🌡️', ru: 'СТМ', en: 'STM' },
  { key: 'intimacy', icon: '🌹', ru: 'Интим', en: 'Intimacy' },
  { key: 'dysphoria', icon: '⚧', ru: 'Дисфория', en: 'Dysphoria' },

  { key: 'preconception', icon: '🕊', ru: 'Подготовка к беременности', en: 'Pregnancy planning' },
  { key: 'pregnancy', icon: '👶', ru: 'Беременность', en: 'Pregnancy' },
  { key: 'postpartum', icon: '🫂', ru: 'Послеродовой', en: 'Postpartum' },
  { key: 'lactation', icon: '🍼', ru: 'Кормление', en: 'Lactation' },
  { key: 'menopause', icon: '🌙', ru: 'Менопауза', en: 'Menopause' },
  { key: 'circle', icon: '✦', ru: 'Круг', en: 'Circle' },

  { key: 'teen_wellbeing', icon: '🧃', ru: 'Подростковое самочувствие', en: 'Teen wellbeing' },
  { key: 'safe_sex_ed', icon: '🛡', ru: 'Безопасность и sex-ed', en: 'Safety & sex-ed' },
  { key: 'consent', icon: '🤝', ru: 'Согласие и границы', en: 'Consent & boundaries' },
  { key: 'privacy', icon: '🔒', ru: 'Приватность', en: 'Privacy' },
]

const DEFAULT_BASE_LAYERS = [
  'symptoms',
  'mood',
  'meds',
  'appointments',
  'vaccines',
  'checkups',
]

function uniq(items) {
  return [...new Set((items || []).filter(Boolean))]
}

function hasAny(list = [], values = []) {
  return values.some(value => list.includes(value))
}

function getAge(profile) {
  const year = Number(profile?.birth_year || profile?.birthYear)

  if (!Number.isFinite(year) || year < 1900) return null

  return new Date().getFullYear() - year
}

export function isTeenProfile(profile = {}) {
  const age = getAge(profile)

  return (
    profile?.is_teen === true ||
    profile?.profile_type === 'teen' ||
    profile?.age_group === 'teen' ||
    (Number.isFinite(age) && age >= 10 && age <= 17)
  )
}

export function resolveCalendarConfig(profile = {}) {
  const bodyMode = profile?.body_mode || 'prefer_not'
  const conditions = profile?.active_conditions || []
  const health = profile?.health || {}
  const modules = profile?.ai_modules || profile?.enabled_modules || {}
  const age = getAge(profile)
  const teen = isTeenProfile(profile)

  // Определяем пол — мужчинам не показываем цикл без явного включения
  const rawGender = profile?.gender || profile?.gender_identity || ''
  const isMaleProfile = ['cis_man', 'trans_man', 'male', 'man'].includes(rawGender)
  // Явное включение цикла в body_modules перекрывает гендер (напр. трансмужчина с циклом)
  const explicitCycleEnabled = Array.isArray(profile?.body_modules) && profile.body_modules.includes('cycle')
  const maleWithoutCycle = isMaleProfile && !explicitCycleEnabled

  // Режимы без месячных
  const noPeriodsMode = ['amenorrhea', 'menopause', 'prefer_not', 'male'].includes(bodyMode)

  const wantsCycle =
    !maleWithoutCycle &&
    !noPeriodsMode && (
      bodyMode === 'menstruating' ||
      health?.show_cycle === true ||
      modules?.cycleMoodLibido === true ||
      modules?.cycle === true
    )

  const wantsPreconception =
    bodyMode === 'pregnancy_planning' ||
    bodyMode === 'preconception' ||
    modules?.preconception === true ||
    modules?.pregnancyPlanning === true

  const wantsPregnancy =
    bodyMode === 'pregnancy' ||
    bodyMode === 'pregnant' ||
    modules?.pregnancy === true

  const wantsPostpartum =
    hasAny(conditions, ['postpartum']) ||
    modules?.postpartum === true

  const wantsLactation =
    hasAny(conditions, ['breastfeeding', 'lactation']) ||
    health?.breastfeeding === true ||
    modules?.lactation === true

  const wantsMenopause =
    bodyMode === 'menopause' ||
    hasAny(conditions, ['menopause', 'perimenopause']) ||
    modules?.menopause === true

  const wantsGaht =
    hasAny(conditions, ['hormone_therapy']) ||
    modules?.gaht === true ||
    modules?.hrt === true

  const wantsDysphoria =
    health?.show_dysphoria_in_calendar === true ||
    modules?.dysphoria === true ||
    hasAny(conditions, ['dysphoria_tracking'])

  const wantsStm =
    health?.contraception === 'stm' ||
    modules?.stm === true ||
    health?.calendar_layers?.stm === true

  const wantsMaleHealth =
    modules?.maleHealth === true ||
    profile?.gender_identity === 'cis_man' ||
    profile?.gender === 'male'

  const wantsTeenSexEd =
    modules?.teenSexEd === true ||
    modules?.safeSexEd === true ||
    modules?.consentCheck === true ||
    health?.teen_sex_ed === true

  let primaryMode = 'neutral'

  if (wantsPregnancy) primaryMode = 'pregnancy'
  else if (wantsPreconception) primaryMode = 'preconception'
  else if (wantsPostpartum) primaryMode = 'postpartum'
  else if (wantsMenopause) primaryMode = 'menopause'
  else if (wantsCycle) primaryMode = 'cycle'
  else if (wantsGaht) primaryMode = 'gaht'
  else if (wantsMaleHealth) primaryMode = 'male'

  let enabledLayers = [...DEFAULT_BASE_LAYERS]
  let hiddenLayers = []
  let recommendations = []

  let titleRu = 'Календарь здоровья'
  let titleEn = 'Health calendar'
  let subtitleRu = 'Симптомы, лекарства, прививки, назначения и дневник по дням.'
  let subtitleEn = 'Symptoms, meds, vaccines, appointments, and daily logs.'

  let bottomLabelRu = 'Календарь'
  let bottomLabelEn = 'Calendar'
  let bottomIcon = '◯'

  if (primaryMode === 'cycle') {
    enabledLayers.push('cycle', 'intimacy')

    if (wantsStm) enabledLayers.push('stm')

    titleRu = 'Календарь цикла'
    titleEn = 'Cycle calendar'
    subtitleRu = 'Фазы, кровотечения, симптомы, настроение, интим и СТМ, если он включён.'
    subtitleEn = 'Phases, bleeding, symptoms, mood, intimacy, and STM if enabled.'

    recommendations = [
      'Фазы показываются только внутри конкретного цикла, а не размазываются на весь месяц.',
      'Если данных мало, Elara пишет “примерный прогноз” и не притворяется оракулом в халате.',
    ]
  }


  if (primaryMode === 'preconception') {
    enabledLayers.push('cycle', 'stm', 'intimacy', 'preconception', 'checkups', 'vaccines')

    titleRu = 'Подготовка к беременности'
    titleEn = 'Pregnancy planning'
    subtitleRu = 'Цикл, овуляция, фертильное окно, чекапы, прививки, анализы и подготовка партнёра.'
    subtitleEn = 'Cycle, ovulation, fertile window, checkups, vaccines, labs, and partner preparation.'

    bottomLabelRu = 'Планирование'
    bottomLabelEn = 'Planning'
    bottomIcon = '🕊'

    recommendations = [
      'Прогноз цикла и овуляции остаётся включённым, потому что именно он нужен для планирования.',
      'Elara поднимает наверх фертильное окно, ИППП-скрининг, прививки, фолиевую кислоту и вопросы для врача.',
      'Это не режим беременности: он не отключает цикл и не показывает недели беременности.',
    ]
  }

  if (primaryMode === 'pregnancy') {
    enabledLayers.push('pregnancy', 'mood')
    hiddenLayers.push('cycle', 'stm', 'ovulation', 'pms', 'fertile')

    titleRu = 'Малыш'
    titleEn = 'Baby'
    subtitleRu = 'Срок, обследования, симптомы, препараты, прививки и красные флаги.'
    subtitleEn = 'Gestational week, checkups, symptoms, meds, vaccines, and red flags.'

    bottomLabelRu = 'Малыш'
    bottomLabelEn = 'Baby'
    bottomIcon = '👶'

    recommendations = [
      'Прогноз месячных, овуляции и ПМС отключён. История цикла сохраняется в архиве.',
      'Календарь поднимает наверх визиты, анализы, давление, препараты и прививки по сроку.',
    ]
  }

  if (primaryMode === 'postpartum') {
    enabledLayers.push('postpartum', 'lactation', 'mood')
    hiddenLayers.push('ovulation', 'pms', 'fertile')

    titleRu = 'Восстановление'
    titleEn = 'Recovery'
    subtitleRu = 'Сон, настроение, кровотечение, боль, лактация, препараты и поддержка.'
    subtitleEn = 'Sleep, mood, bleeding, pain, lactation, meds, and support.'

    bottomLabelRu = 'Восстановление'
    bottomLabelEn = 'Recovery'
    bottomIcon = '🫂'

    recommendations = [
      'Обычный прогноз цикла не включается, пока пользователь сам не отметит, что цикл вернулся.',
      'Фокус на восстановлении, лохиях, боли, сне, настроении, лактации и визитах.',
    ]
  }

  if (primaryMode === 'menopause') {
    enabledLayers.push('menopause', 'mood')
    hiddenLayers.push('cycle', 'stm', 'ovulation', 'pms', 'fertile')

    titleRu = 'Ритм'
    titleEn = 'Rhythm'
    subtitleRu = 'Сон, приливы, настроение, сухость, либидо, давление, МГТ и чекапы.'
    subtitleEn = 'Sleep, hot flashes, mood, dryness, libido, blood pressure, MHT, and checkups.'

    bottomLabelRu = 'Ритм'
    bottomLabelEn = 'Rhythm'
    bottomIcon = '🌙'

    recommendations = [
      'Кровотечения показываются как симптом или событие, а не как “нормальный цикл”.',
      'Elara будет внимательнее к приливам, сну, давлению, костям и МГТ как теме для врача.',
    ]
  }

  if (primaryMode === 'gaht') {
    enabledLayers.push('meds', 'mood')

    if (wantsDysphoria) enabledLayers.push('dysphoria')

    titleRu = 'Гормоны и самочувствие'
    titleEn = 'Hormones & wellbeing'
    subtitleRu = 'Терапия, анализы, настроение, энергия, либидо, кожа, сон и дисфория, если включена.'
    subtitleEn = 'Therapy, labs, mood, energy, libido, skin, sleep, and dysphoria if enabled.'

    recommendations = [
      'Elara не меняет референсы анализов сама. Она показывает, что обсудить с врачом.',
      'Дисфория показывается в календаре только если пользователь включил этот слой.',
    ]
  }

  if (primaryMode === 'male') {
    enabledLayers.push('intimacy')

    titleRu = 'Календарь здоровья'
    titleEn = 'Health calendar'
    subtitleRu = 'Сон, стресс, либидо, энергия, препараты, фертильность и чекапы.'
    subtitleEn = 'Sleep, stress, libido, energy, meds, fertility, and checkups.'

    recommendations = [
      'Цикл, ПМС и овуляция не показываются, если пользователь сам их не включил.',
      'Если включена подготовка к беременности, Elara покажет ИППП-чекапы, прививки и обследования для партнёра со сперматозоидами.',
    ]
  }

  if (teen) {
    enabledLayers.push('teen_wellbeing', 'privacy')
    hiddenLayers.push('stm', 'fertile', 'ovulation')

    titleRu = primaryMode === 'cycle' ? 'Календарь самочувствия' : titleRu
    titleEn = primaryMode === 'cycle' ? 'Wellbeing calendar' : titleEn

    if (primaryMode === 'cycle') {
      subtitleRu = 'Месячные, боль, настроение, сон, стресс, энергия и мягкие подсказки без перегруза.'
      subtitleEn = 'Periods, pain, mood, sleep, stress, energy, and simple supportive tips.'
    }

    recommendations.push(
      'Для подросткового профиля фертильные дни, овуляция и СТМ скрыты по умолчанию.',
      'Календарь не показывает “безопасные дни” и не использует фертильность как подсказку для контрацепции.',
      'Дневник, интим и дисфория не показываются родителю без отдельного разрешения.'
    )

    if (wantsTeenSexEd) {
      enabledLayers.push('safe_sex_ed', 'consent')
      recommendations.push(
        'Если включён sex-ed слой, Elara мягко подскажет про согласие, защиту и что делать, если что-то пошло не так.'
      )
    }
  }

  if (wantsLactation) enabledLayers.push('lactation')
  if (wantsDysphoria || wantsGaht) enabledLayers.push('dysphoria')
  if (health?.calendar_layers?.circle === true) enabledLayers.push('circle')
  if (health?.calendar_layers?.intimacy === true) enabledLayers.push('intimacy')

  const manualLayers = health?.calendar_layers || {}

  Object.entries(manualLayers).forEach(([key, value]) => {
    if (value === true) enabledLayers.push(key)
    if (value === false) hiddenLayers.push(key)
  })

  if (teen && health?.show_fertility_details !== true) {
    hiddenLayers.push('stm', 'fertile', 'ovulation')
  }

  enabledLayers = uniq(enabledLayers).filter(layer => !hiddenLayers.includes(layer))
  hiddenLayers = uniq(hiddenLayers)

  return {
    primaryMode,
    age,
    teen,

    titleRu,
    titleEn,
    subtitleRu,
    subtitleEn,

    bottomLabelRu,
    bottomLabelEn,
    bottomIcon,

    enabledLayers,
    hiddenLayers,
    recommendations,

    showCycle: enabledLayers.includes('cycle') && !hiddenLayers.includes('cycle'),
    showStm: enabledLayers.includes('stm') && !hiddenLayers.includes('stm'),
    showDysphoria: enabledLayers.includes('dysphoria') && !hiddenLayers.includes('dysphoria'),
    showIntimacy: enabledLayers.includes('intimacy') && !hiddenLayers.includes('intimacy'),
    showPreconception: enabledLayers.includes('preconception') && !hiddenLayers.includes('preconception'),
    showPregnancy: enabledLayers.includes('pregnancy') && !hiddenLayers.includes('pregnancy'),
    showPostpartum: enabledLayers.includes('postpartum') && !hiddenLayers.includes('postpartum'),
    showLactation: enabledLayers.includes('lactation') && !hiddenLayers.includes('lactation'),

    showTeenWellbeing: enabledLayers.includes('teen_wellbeing') && !hiddenLayers.includes('teen_wellbeing'),
    showTeenSexEd: enabledLayers.includes('safe_sex_ed') && !hiddenLayers.includes('safe_sex_ed'),
    showConsent: enabledLayers.includes('consent') && !hiddenLayers.includes('consent'),
    showPrivacy: enabledLayers.includes('privacy') && !hiddenLayers.includes('privacy'),

    hideFertilityDetails:
      teen &&
      health?.show_fertility_details !== true,
  }
}

export function layerLabel(key, lang = 'ru') {
  const layer = CALENDAR_LAYERS.find(item => item.key === key)

  if (!layer) return key

  return `${layer.icon} ${lang === 'en' ? layer.en : layer.ru}`
}

export function getCalendarBottomTab(profile, lang = 'ru') {
  const config = resolveCalendarConfig(profile)

  return {
    path: '/calendar',
    icon: config.bottomIcon,
    label: lang === 'en' ? config.bottomLabelEn : config.bottomLabelRu,
  }
}