// ============================================================
// ЯДРО: Модульная система профиля
// Медицинские функции зависят от bodyMode + activeConditions
// НЕ от гендера
// ============================================================

export const BODY_MODES = [
  { key: 'menstruating', emoji: '🩸', ru: 'Есть месячные', en: 'Have periods' },
  { key: 'amenorrhea', emoji: '🌿', ru: 'Нет месячных / аменорея', en: 'No periods / amenorrhea' },
  { key: 'pregnancy_planning', emoji: '🕊', ru: 'Подготовка к беременности', en: 'Pregnancy planning' },
  { key: 'pregnancy', emoji: '🤰', ru: 'Беременность', en: 'Pregnancy' },
  { key: 'menopause', emoji: '🌸', ru: 'Менопауза / перименопауза', en: 'Menopause / perimenopause' },
  { key: 'prefer_not', emoji: '🔒', ru: 'Не хочу указывать', en: 'Prefer not to say' },
]

export const ACTIVE_CONDITIONS = [
  { key: 'hormone_therapy', emoji: '💉', ru: 'Гормональная терапия (ГАТ/ЗГТ)', en: 'Hormone therapy (HRT/GAHT)' },
  { key: 'hormonal_contraception', emoji: '💊', ru: 'Гормональные контрацептивы', en: 'Hormonal contraception' },
  { key: 'pcos', emoji: '🌀', ru: 'СПКЯ', en: 'PCOS' },
  { key: 'endometriosis', emoji: '⚡', ru: 'Эндометриоз', en: 'Endometriosis' },
  { key: 'postpartum', emoji: '👶', ru: 'Послеродовой период', en: 'Postpartum period' },
  { key: 'pregnancy_planning_marker', emoji: '🕊', ru: 'Подготовка к беременности', en: 'Pregnancy planning' },
  { key: 'breastfeeding', emoji: '🍼', ru: 'Кормление / лактация', en: 'Breastfeeding / lactation' },
  { key: 'dysphoria_tracking', emoji: '⚧', ru: 'Дневник дисфории', en: 'Dysphoria diary' },
  { key: 'iud_copper', emoji: '🔧', ru: 'Медная спираль (ВМС)', en: 'Copper IUD' },
  { key: 'other_condition', emoji: '📋', ru: 'Другое', en: 'Other' },
]

export const GENDER_IDENTITIES_SHORT = [
  { key: 'cis_woman', ru: 'Женщина (цисгендерная)', en: 'Cisgender woman', ui: 'woman' },
  { key: 'cis_man', ru: 'Мужчина (цисгендерный)', en: 'Cisgender man', ui: 'man' },
  { key: 'trans_woman', ru: 'Трансженщина', en: 'Trans woman', ui: 'trans woman' },
  { key: 'trans_man', ru: 'Трансмужчина', en: 'Trans man', ui: 'trans man' },
  { key: 'non_binary', ru: 'Небинарный/Небинарная', en: 'Non-binary', ui: 'non-binary' },
  { key: 'genderfluid', ru: 'Гендерфлюид', en: 'Genderfluid', ui: 'genderfluid' },
  { key: 'agender', ru: 'Агендерный/Агендерная', en: 'Agender', ui: 'agender', descRu: 'Человек, не идентифицирующий себя ни с каким гендером или не испытывающий гендерной идентичности.', descEn: 'A person who does not identify with any gender or lacks a gender identity.' },
  { key: 'questioning', ru: 'В поиске', en: 'Questioning', ui: 'questioning' },
  { key: 'prefer_not', ru: 'Не хочу указывать', en: 'Prefer not to say', ui: 'hidden' },
  { key: 'custom', ru: 'Другой вариант', en: 'Other', ui: 'custom' },
]

export const GENDER_IDENTITIES_EXTENDED = [
  { key: 'cis_woman', ru: 'Женщина (цисгендерная)', en: 'Cisgender woman', ui: 'woman',
    descRu: 'Человек, рождённый с женскими биологическими характеристиками и идентифицирующий себя как женщина. «Цисгендерная» означает совпадение гендерной идентичности с полом при рождении.',
    descEn: 'A person born with female biological characteristics who identifies as a woman. "Cisgender" means gender identity matches sex assigned at birth.' },
  { key: 'cis_man', ru: 'Мужчина (цисгендерный)', en: 'Cisgender man', ui: 'man',
    descRu: 'Человек, рождённый с мужскими биологическими характеристиками и идентифицирующий себя как мужчина.',
    descEn: 'A person born with male biological characteristics who identifies as a man.' },
  { key: 'trans_woman', ru: 'Трансженщина', en: 'Trans woman', ui: 'trans woman',
    descRu: 'Женщина, которой при рождении был присвоен мужской пол. Транс-идентичность — это часть нормального человеческого разнообразия, признанная ВОЗ.',
    descEn: 'A woman who was assigned male at birth. Trans identity is part of normal human diversity, recognized by the WHO.' },
  { key: 'trans_man', ru: 'Трансмужчина', en: 'Trans man', ui: 'trans man',
    descRu: 'Мужчина, которому при рождении был присвоен женский пол. Может иметь или не иметь менструальный цикл — Elara адаптируется под твои настройки.',
    descEn: 'A man who was assigned female at birth. May or may not have a menstrual cycle — Elara adapts to your settings.' },
  { key: 'non_binary', ru: 'Небинарный/Небинарная', en: 'Non-binary', ui: 'non-binary',
    descRu: 'Человек, чья гендерная идентичность не вписывается в рамки «мужчина/женщина». Небинарность — широкий спектр идентичностей.',
    descEn: 'A person whose gender identity does not fit within the male/female binary. Non-binary is a broad spectrum of identities.' },
  { key: 'genderfluid', ru: 'Гендерфлюид', en: 'Genderfluid', ui: 'genderfluid',
    descRu: 'Человек, чья гендерная идентичность изменяется со временем или в зависимости от ситуации — между женским, мужским или другими идентичностями.',
    descEn: 'A person whose gender identity shifts over time or context — between feminine, masculine, or other identities.' },
  { key: 'agender', ru: 'Агендерный/Агендерная', en: 'Agender', ui: 'agender', descRu: 'Человек, не идентифицирующий себя ни с каким гендером или не испытывающий гендерной идентичности.', descEn: 'A person who does not identify with any gender or lacks a gender identity.' },
  { key: 'bigender', ru: 'Бигендерный', en: 'Bigender', ui: 'bigender' },
  { key: 'pangender', ru: 'Пангендерный', en: 'Pangender', ui: 'pangender' },
  { key: 'two_spirit', ru: 'Двухдухный (Two-Spirit)', en: 'Two-Spirit', ui: 'two-spirit' },
  { key: 'enby', ru: 'Энби (Enby)', en: 'Enby', ui: 'enby' },
  { key: 'demigirl', ru: 'Демидевушка', en: 'Demigirl', ui: 'demigirl' },
  { key: 'demiboy', ru: 'Демипарень', en: 'Demiboy', ui: 'demiboy' },
  { key: 'neutrois', ru: 'Нейтруа', en: 'Neutrois', ui: 'neutrois', descRu: 'Нейтральная или нулевая гендерная идентичность, часто связанная с желанием нейтрального тела.', descEn: 'A neutral or null gender identity, often associated with a desire for a neutral body.' },
  { key: 'androgyne', ru: 'Андрогин', en: 'Androgyne', ui: 'androgyne' },
  { key: 'maverique', ru: 'Маверик', en: 'Maverique', ui: 'maverique', descRu: 'Идентичность за пределами бинарных и небинарных концепций гендера, самостоятельная и независимая.', descEn: 'An identity existing outside of binary and non-binary gender concepts, autonomous and independent.' },
  { key: 'intergender', ru: 'Интергендерный', en: 'Intergender', ui: 'intergender' },
  { key: 'questioning', ru: 'В поиске', en: 'Questioning', ui: 'questioning' },
  { key: 'prefer_not', ru: 'Не хочу указывать', en: 'Prefer not to say', ui: 'hidden' },
  { key: 'custom', ru: 'Свой вариант', en: 'Custom', ui: 'custom' },
]

export const BODY_MODULE_OPTIONS = [
  { key: 'cycle', emoji: '🩸', ru: 'Цикл / кровотечения', en: 'Cycle / bleeding', description_ru: 'Включает календарь цикла, дни кровотечения, симптомы, ПМС и историю.', description_en: 'Enables cycle calendar, bleeding days, symptoms, PMS and history.' },
  { key: 'ovulation', emoji: '✨', ru: 'Овуляция и фертильное окно', en: 'Ovulation and fertile window', description_ru: 'Показывает овуляцию, окно зачатия и прогнозы, если есть данные цикла.', description_en: 'Shows ovulation, conception window and forecasts when cycle data exists.' },
  { key: 'pregnancy_planning', emoji: '🕊', ru: 'Подготовка к беременности', en: 'Pregnancy planning', description_ru: 'Врач, анализы, прививки, витамины, спорт, партнёр и совместные задачи.', description_en: 'Doctor, labs, vaccines, vitamins, sport, partner and shared tasks.' },
  { key: 'pregnancy', emoji: '🤰', ru: 'Беременность', en: 'Pregnancy', description_ru: 'Срок, визиты, назначения, симптомы, красные флаги и поддержка партнёра.', description_en: 'Gestational age, visits, prescriptions, symptoms, red flags and partner support.' },
  { key: 'postpartum', emoji: '🍼', ru: 'Послеродовой период / лактация', en: 'Postpartum / lactation', description_ru: 'Сон, восстановление, лактация, боль, настроение и поддержка.', description_en: 'Sleep, recovery, lactation, pain, mood and support.' },
  { key: 'hormone_therapy', emoji: '💉', ru: 'Гормональная терапия', en: 'Hormone therapy', description_ru: 'Препараты, анализы, самочувствие, либидо, кожа, настроение и напоминания.', description_en: 'Meds, labs, wellbeing, libido, skin, mood and reminders.' },
  { key: 'sperm_related_fertility', emoji: '🧬', ru: 'Партнёрская фертильность / сперматозоиды', en: 'Partner fertility / sperm', description_ru: 'ИППП, прививки, лекарства, перегрев, образ жизни и спермограмма по показаниям.', description_en: 'STI, vaccines, meds, heat exposure, lifestyle and semen analysis when indicated.' },
  { key: 'contraception', emoji: '🛡', ru: 'Контрацепция / СТМ', en: 'Contraception / STM', description_ru: 'Методы контрацепции, СТМ, риски, напоминания и вопросы врачу.', description_en: 'Contraception methods, STM, risks, reminders and doctor questions.' },
  { key: 'mood', emoji: '🧠', ru: 'Настроение / стресс', en: 'Mood / stress', description_ru: 'Настроение, стресс, тревога, энергия и социальная батарейка.', description_en: 'Mood, stress, anxiety, energy and social battery.' },
  { key: 'sport', emoji: '🏃', ru: 'Спорт и восстановление', en: 'Sport and recovery', description_ru: 'Нагрузка, прогулки, восстановление, подготовка к беременности и рекомендации по фазам.', description_en: 'Load, walks, recovery, pregnancy planning and phase-aware recommendations.' },
  { key: 'health', emoji: '🧾', ru: 'Анализы, назначения и здоровье', en: 'Labs, assignments and health', description_ru: 'Заболевания, AI-описания, анализы, назначения врача и отчёт.', description_en: 'Conditions, AI explanations, labs, doctor assignments and report.' },
  { key: 'intimacy', emoji: '🌹', ru: 'Интимный трекер', en: 'Intimacy tracker', description_ru: 'Желание, комфорт, боль, контрацепция и несколько партнёров за сутки.', description_en: 'Desire, comfort, pain, contraception and multiple partners per day.' },
  { key: 'dysphoria', emoji: '⚧', ru: 'Дневник дисфории', en: 'Dysphoria diary', description_ru: 'Отдельный приватный дневник телесного и гендерного самочувствия.', description_en: 'Private diary for body and gender wellbeing.' },
]

export const BODY_MODULE_LABELS = Object.fromEntries(BODY_MODULE_OPTIONS.map(item => [item.key, item]))
BODY_MODULE_LABELS.sperm_fertility = BODY_MODULE_LABELS.sperm_related_fertility

export const ORIENTATIONS = [
  { key: 'heterosexual', ru: 'Гетеросексуальная/ый', en: 'Heterosexual', descRu: 'Романтическое и/или сексуальное влечение к людям противоположного гендера.', descEn: 'Romantic and/or sexual attraction to people of a different gender.' },
  { key: 'gay', ru: 'Гей', en: 'Gay', descRu: 'Мужчина, испытывающий влечение к другим мужчинам. Иногда используется как общий термин для гомосексуальности.', descEn: 'A man attracted to other men. Sometimes used as a general term for homosexuality.' },
  { key: 'lesbian', ru: 'Лесбиянка', en: 'Lesbian', descRu: 'Женщина или небинарный человек, испытывающий влечение преимущественно к женщинам.', descEn: 'A woman or non-binary person attracted primarily to women.' },
  { key: 'bisexual', ru: 'Бисексуальная/ый', en: 'Bisexual', descRu: 'Влечение к людям своего и других гендеров. Не требует «одинакового» влечения к разным гендерам.', descEn: 'Attraction to people of one\'s own and other genders. Does not require equal attraction to different genders.' },
  { key: 'pansexual', ru: 'Пансексуальная/ый', en: 'Pansexual', descRu: 'Влечение к людям вне зависимости от их гендера. Гендер партнёра не является определяющим фактором.', descEn: 'Attraction to people regardless of their gender. Partner\'s gender is not a defining factor.' },
  { key: 'asexual', ru: 'Асексуальная/ый', en: 'Asexual', descRu: 'Отсутствие или слабое сексуальное влечение к другим людям. Может сопровождаться романтическим влечением.', descEn: 'Little or no sexual attraction to others. May still experience romantic attraction.' },
  { key: 'demisexual', ru: 'Демисексуальная/ый', en: 'Demisexual', descRu: 'Сексуальное влечение возникает только после формирования глубокой эмоциональной связи. Относится к асексуальному спектру.', descEn: 'Sexual attraction only arises after forming a deep emotional bond. Part of the asexual spectrum.' },
  { key: 'queer', ru: 'Квир', en: 'Queer', descRu: 'Зонтичный термин для людей с нетрадиционными гендерными или сексуальными идентичностями. Используется как самоназвание.', descEn: 'An umbrella term for people with non-normative gender or sexual identities, used as self-identification.' },
  { key: 'questioning', ru: 'В поиске', en: 'Questioning', descRu: 'Человек, исследующий или сомневающийся в своей сексуальной ориентации или гендерной идентичности.', descEn: 'A person exploring or questioning their sexual orientation or gender identity.' },
  { key: 'prefer_not', ru: 'Не хочу указывать', en: 'Prefer not to say' },
  { key: 'custom', ru: 'Другой вариант', en: 'Other' },
]

export function normalizeGenderIdentity(value) {
  const map = {
    woman: 'cis_woman', female: 'cis_woman', girl: 'cis_woman',
    man: 'cis_man', male: 'cis_man', boy: 'cis_man',
    nonbinary: 'non_binary', non_binary: 'non_binary', nb: 'non_binary',
    demi_girl: 'demigirl', demi_boy: 'demiboy', maverick: 'maverique',
  }
  return map[value] || value || 'prefer_not'
}

export function getGenderPreset(identity) {
  const gender = normalizeGenderIdentity(identity)
  const neutral = {
    language_ru: 'Нейтральный интерфейс. Elara не делает медицинских выводов по гендеру.',
    modules: ['mood', 'sport', 'health', 'intimacy'],
    recommendations_ru: [
      'Выбери телесные модули отдельно: цикл, беременность, гормональная терапия, подготовка, контрацепция, спорт и здоровье.',
      'Гендер влияет на обращение и приватность, а медицинская логика строится по включённым модулям.',
    ],
  }
  const presets = {
    cis_woman: { language_ru: 'Обычная логика цикла, беременности и здоровья, если эти модули включены.', modules: ['cycle','ovulation','pregnancy_planning','contraception','mood','sport','health','intimacy'], recommendations_ru: ['Цикл, ПМС, овуляция, контрацепция, подготовка к беременности и спорт по фазам доступны как отдельные блоки.', 'Если подготовка к беременности активна, Elara подсветит врача, анализы, прививки, витамины и партнёра.'] },
    cis_man: { language_ru: 'Мужской профиль: без личного прогноза месячных, если цикл не включён вручную.', modules: ['sperm_related_fertility','pregnancy_planning','mood','sport','health','intimacy'], recommendations_ru: ['При подготовке к беременности Elara подсветит ИППП, прививки, лекарства, сон, перегрев, никотин/алкоголь и спермограмму по показаниям.', 'Если партнёр открыл цикл, можно видеть совместный календарь и рекомендации поддержки.'] },
    trans_woman: { language_ru: 'Трансженщина: гормональная терапия и партнёрская подготовка включаются только как выбранные модули.', modules: ['hormone_therapy','sperm_related_fertility','pregnancy_planning','mood','sport','health','intimacy','dysphoria'], recommendations_ru: ['Elara не включает месячные автоматически. Можно включить ГАТ/ЗГТ, таблетки, анализы, либидо, настроение и партнёрскую подготовку.', 'Если беременность планируется с партнёром, рекомендации идут по ролям тела, а не по ярлыку пары.'] },
    trans_man: { language_ru: 'Трансмужчина: цикл, беременность и ГАТ/ЗГТ выбираются отдельно.', modules: ['cycle','ovulation','pregnancy_planning','hormone_therapy','contraception','mood','sport','health','intimacy','dysphoria'], recommendations_ru: ['Если цикл есть, можно использовать нейтральные слова: кровотечение, телесный цикл, окно зачатия.', 'При подготовке к беременности Elara предложит уточнить роль, ГАТ/ЗГТ, врача и партнёра.'] },
    non_binary: neutral,
    enby: neutral,
    genderfluid: { ...neutral, language_ru: 'Гендерфлюид: можно менять язык/обращение, а телесные модули остаются независимыми.' },
    agender: { ...neutral, language_ru: 'Агендерный интерфейс: минимум гендерных формулировок, логика только по выбранным модулям.' },
    bigender: neutral,
    pangender: neutral,
    two_spirit: { ...neutral, language_ru: 'Two-Spirit - культурная идентичность, не медицинский режим. Elara спрашивает телесные модули отдельно.' },
    demigirl: neutral,
    demiboy: neutral,
    neutrois: neutral,
    androgyne: neutral,
    maverique: neutral,
    intergender: { ...neutral, language_ru: 'Интергендерность не равна интерсекс-вариации. Если нужны медицинские модули, включи их отдельно.' },
    questioning: { ...neutral, language_ru: 'В поиске: можно не указывать ярлык и пользоваться только нужными функциями тела и здоровья.' },
    prefer_not: { ...neutral, language_ru: 'Можно не указывать гендер. Elara будет спрашивать только нужные функции.' },
    custom: neutral,
  }
  return presets[gender] || neutral
}

export function getDefaultBodyModulesForGender(identity) {
  return getGenderPreset(identity).modules
}

export function resolveBodyModules(profile = {}) {
  const explicit = Array.isArray(profile?.body_modules) ? profile.body_modules : []
  if (explicit.length) return [...new Set(explicit)]
  const gender = normalizeGenderIdentity(profile?.gender || profile?.gender_identity)
  const preset = getDefaultBodyModulesForGender(gender)
  const bodyMode = profile?.body_mode || 'prefer_not'
  const conditions = profile?.active_conditions || []
  const extra = []
  if (bodyMode === 'menstruating') extra.push('cycle', 'ovulation')
  if (bodyMode === 'pregnancy_planning') extra.push('pregnancy_planning')
  if (bodyMode === 'pregnancy') extra.push('pregnancy')
  if (bodyMode === 'menopause') extra.push('health')
  if (conditions.includes('hormone_therapy')) extra.push('hormone_therapy')
  if (conditions.includes('pregnancy_planning_marker')) extra.push('pregnancy_planning')
  if (conditions.includes('dysphoria_tracking')) extra.push('dysphoria')
  if (conditions.includes('hormonal_contraception') || conditions.includes('iud_copper')) extra.push('contraception')
  return [...new Set([...preset, ...extra])]
}

export function resolveProfileModules(profile = {}) {
  const bodyMode = profile?.body_mode || 'prefer_not'
  const conditions = profile?.active_conditions || []
  const gender = normalizeGenderIdentity(profile?.gender || profile?.gender_identity || 'prefer_not')
  const bodyModules = resolveBodyModules(profile)
  const has = key => bodyModules.includes(key) || (key === 'sperm_related_fertility' && bodyModules.includes('sperm_fertility')) || (key === 'sperm_fertility' && bodyModules.includes('sperm_related_fertility'))
  const spermSide = has('sperm_related_fertility') || has('sperm_fertility') || ['cis_man', 'trans_woman'].includes(gender)
  const cycleSide = has('cycle') || ['cis_woman', 'trans_man'].includes(gender)

  const modules = {
    cycle: false,
    periodPrediction: false,
    ovulationPrediction: false,
    bleedingTracking: false,
    predictionConfidence: 'normal',

    preconception: false,
    pregnancyPlanning: false,
    pregnancy: false,
    menopause: false,
    spermFertility: false,

    hormones: false,
    contraception: false,
    stm: false,
    symptoms: true,
    medications: true,
    sexualHealth: true,
    socialSync: true,
    painTracking: false,
    moodTracking: true,
    sport: true,
    health: true,
    analyses: true,

    hotFlashes: false,
    postpartum: false,
    lactation: false,
    dysphoria: false,
  }

  if (has('cycle') || bodyMode === 'menstruating') {
    modules.cycle = true
    modules.periodPrediction = true
    modules.bleedingTracking = true
    modules.ovulationPrediction = has('ovulation') || bodyMode === 'pregnancy_planning' || profile?.wants_ovulation_tracking === true
  }

  if (bodyMode === 'amenorrhea') {
    modules.cycle = has('cycle')
    modules.periodPrediction = false
  }

  if (has('pregnancy_planning') || bodyMode === 'pregnancy_planning' || conditions.includes('pregnancy_planning_marker')) {
    modules.preconception = true
    modules.pregnancyPlanning = true
    modules.sexualHealth = true
    modules.medications = true
    modules.moodTracking = true
    modules.symptoms = true
    modules.sport = true

    if (cycleSide && !spermSide || has('cycle')) {
      modules.cycle = true
      modules.periodPrediction = true
      modules.ovulationPrediction = true
      modules.bleedingTracking = true
    }
    if (spermSide || has('sperm_related_fertility') || has('sperm_fertility')) {
      modules.spermFertility = true
    }
  }

  if (has('pregnancy') || bodyMode === 'pregnancy') {
    modules.pregnancy = true
    modules.cycle = false
    modules.periodPrediction = false
    modules.ovulationPrediction = false
    modules.bleedingTracking = true
    modules.painTracking = true
  }

  if (bodyMode === 'menopause') {
    modules.menopause = true
    modules.cycle = false
    modules.periodPrediction = false
    modules.bleedingTracking = true
    modules.hotFlashes = true
    modules.moodTracking = true
  }

  if (has('hormone_therapy') || conditions.includes('hormone_therapy')) {
    modules.hormones = true
    modules.medications = true
    modules.moodTracking = true
    modules.predictionConfidence = modules.periodPrediction ? 'low' : modules.predictionConfidence
  }

  if (has('contraception') || conditions.includes('hormonal_contraception') || conditions.includes('iud_copper')) {
    modules.contraception = true
    modules.stm = true
    modules.medications = true
    modules.predictionConfidence = modules.periodPrediction ? 'low' : modules.predictionConfidence
  }

  if (conditions.includes('pcos')) {
    modules.symptoms = true
    modules.predictionConfidence = 'low'
  }

  if (conditions.includes('endometriosis')) {
    modules.symptoms = true
    modules.painTracking = true
  }

  if (conditions.includes('postpartum') || has('postpartum')) {
    modules.postpartum = true
    modules.moodTracking = true
    modules.bleedingTracking = true
  }

  if (conditions.includes('breastfeeding') || has('postpartum')) {
    modules.lactation = true
    modules.moodTracking = true
    modules.medications = true
  }

  if (conditions.includes('dysphoria_tracking') || has('dysphoria')) {
    modules.dysphoria = true
    modules.moodTracking = true
  }

  if (has('intimacy')) modules.sexualHealth = true
  if (has('sport')) modules.sport = true
  if (has('health')) modules.health = true
  return modules
}

export function getGenderRecommendationCards(profile = {}, lang = 'ru') {
  const ru = lang !== 'en'
  const gender = normalizeGenderIdentity(profile?.gender || profile?.gender_identity)
  const preset = getGenderPreset(gender)
  const modules = resolveBodyModules(profile)
  const active = resolveProfileModules(profile)
  const cards = [
    {
      key: 'logic', icon: '🧭',
      title: ru ? 'Как Elara понимает этот профиль' : 'How Elara reads this profile',
      text: ru ? preset.language_ru : 'Gender controls language and UX. Body modules control health logic.',
    },
    {
      key: 'modules', icon: '🧩',
      title: ru ? 'Активные функции тела' : 'Active body features',
      text: modules.map(key => BODY_MODULE_LABELS[key]?.ru || key).join(', '),
    },
  ]
  if (active.pregnancyPlanning) cards.push({ key:'prep', icon:'🕊', title:ru?'Подготовка к беременности':'Pregnancy planning', text: active.spermFertility ? (ru?'Фокус на ИППП, прививках, лекарствах, образе жизни, перегреве и партнёрской роли.':'Focus on STI, vaccines, meds, lifestyle, heat exposure and partner role.') : (ru?'Фокус на враче, анализах, прививках, фертильном окне, витаминах и партнёре.':'Focus on doctor, labs, vaccines, fertile window, vitamins and partner.') })
  if (active.hormones) cards.push({ key:'hrt', icon:'💉', title:ru?'Гормональная терапия':'Hormone therapy', text:ru?'Elara поднимет препараты, анализы, настроение, либидо и вопросы врачу.':'Elara highlights meds, labs, mood, libido and doctor questions.' })
  if (active.cycle) cards.push({ key:'cycle', icon:'🩸', title:ru?'Цикл включён':'Cycle enabled', text:ru?'Прогнозы строятся по данным цикла, но могут быть менее точными при ГАТ/ЗГТ, СПКЯ или контрацепции.':'Forecasts use cycle data, but may be less accurate with HRT/GAHT, PCOS or contraception.' })
  return cards
}

export function checkCompatibility(bodyMode, activeConditions = [], genderIdentity) {
  const warnings = []

  if (bodyMode === 'pregnancy_planning') {
    warnings.push({
      type: 'info',
      message_ru: 'Подготовка к беременности сохраняет прогноз цикла и овуляции, но добавляет фокус на фертильное окно, анализы, прививки и подготовку партнёра.',
      message_en: 'Pregnancy planning keeps cycle and ovulation prediction, and adds fertility window, labs, vaccines, and partner preparation focus.',
    })
  }

  if (bodyMode === 'pregnancy') {
    warnings.push({
      type: 'info',
      message_ru: 'При беременности прогноз месячных и овуляции будет отключён. Данные цикла сохранятся в истории.',
      message_en: 'During pregnancy, period and ovulation predictions will be disabled. Cycle history will be preserved.',
    })
  }

  if (bodyMode === 'amenorrhea') {
    warnings.push({
      type: 'info',
      message_ru: 'Прогноз цикла отключён. Ты можешь отслеживать самочувствие, симптомы и лекарства.',
      message_en: 'Cycle prediction is disabled. You can track wellbeing, symptoms, and medications.',
    })
  }

  if (bodyMode === 'menopause') {
    warnings.push({
      type: 'info',
      message_ru: 'Прогноз месячных заменён на отслеживание кровотечений и симптомов.',
      message_en: 'Period prediction replaced with bleeding and symptom tracking.',
    })
  }

  if (activeConditions.includes('pregnancy_planning_marker')) {
    warnings.push({
      type: 'info',
      message_ru: 'Маркер подготовки к беременности добавляет фокус на овуляцию, фертильное окно, чекапы, прививки и подготовку партнёра, даже если основной режим тела остаётся обычным циклом.',
      message_en: 'Pregnancy planning marker adds ovulation, fertile window, checkups, vaccines, and partner preparation focus, even when the main body mode stays regular cycle.',
    })
  }

  if (activeConditions.includes('pcos') && bodyMode === 'menstruating') {
    warnings.push({
      type: 'info',
      message_ru: 'При СПКЯ цикл может быть нерегулярным - прогнозы могут быть менее точными.',
      message_en: 'With PCOS, your cycle may be irregular - predictions may be less accurate.',
    })
  }

  if (activeConditions.includes('hormone_therapy') && bodyMode === 'menstruating') {
    warnings.push({
      type: 'info',
      message_ru: 'На фоне гормональной терапии цикл может меняться - прогнозы могут быть менее точными.',
      message_en: 'Hormone therapy may affect your cycle - predictions may be less accurate.',
    })
  }

  const cisMen = ['cis_man']


  if (bodyMode === 'pregnancy_planning' && cisMen.includes(genderIdentity)) {
    warnings.push({
      type: 'info',
      message_ru: 'Для мужского профиля подготовка к беременности не включает прогноз месячных. Elara будет подсвечивать ИППП-скрининг, прививки, препараты, образ жизни и обследования, которые могут быть важны для партнёра со сперматозоидами.',
      message_en: 'For a male profile, pregnancy planning does not enable period prediction. Elara highlights STI screening, vaccines, meds, lifestyle, and male-factor checks.',
    })
  }

  if (bodyMode === 'pregnancy_planning' && ['trans_woman', 'non_binary', 'genderfluid', 'prefer_not'].includes(genderIdentity)) {
    warnings.push({
      type: 'info',
      message_ru: 'Elara не угадывает репродуктивную роль по гендеру. Если беременность планируется с партнёром, выбери партнёра в “Режиме тела” - рекомендации станут точнее.',
      message_en: 'Elara does not infer reproductive role from gender. Choose a partner in Body mode to make recommendations more precise.',
    })
  }

  if (cisMen.includes(genderIdentity) && bodyMode === 'menstruating') {
    warnings.push({
      type: 'soft_check',
      message_ru: 'Ты выбрал режим "Есть месячные". Убедись, что выбор верный. Если нет - можно изменить режим тела.',
      message_en: 'You selected "Have periods" mode. Make sure this is correct. You can change it anytime.',
    })
  }

  return warnings
}

export function calculateAvailabilityScore(dayStatus = {}, eventType) {
  const e = dayStatus.energy || 3
  const m = dayStatus.mood || 3
  const p = dayStatus.pain || 0
  const s = dayStatus.social_battery || 3
  const l = dayStatus.libido || 2

  let score = e * 2 + m + s * 2 - p * 2

  if (eventType === 'party') score += s * 2 - (e < 3 ? 4 : 0)
  if (eventType === 'cafe') score += (m + s) / 2 - p / 3
  if (eventType === 'walk') score += e - p / 2
  if (eventType === 'sex') score += l * 2 - p * 2
  if (eventType === 'quiet_evening') score += 3 - (p > 3 ? 2 : 0)
  if (eventType === 'sport') score += e - p
  if (eventType === 'work_session') score += e + Math.min(e, 4) * 0.5
  if (eventType === 'support') score = Math.max(0, 5 - (m + e) / 2) * 3
  if (eventType === 'trip') score += (e + m + s) / 3 - p

  if (dayStatus.meds_due) score -= 1

  return Math.max(0, Math.min(10, score))
}

export function calculateGroupScore(userStatuses = [], eventType) {
  if (!userStatuses.length) return 0
  const scores = userStatuses.map(status => calculateAvailabilityScore(status, eventType))
  return Math.min(...scores)
}

export const EVENT_TYPE_LABELS = [
  { key: 'coffee', emoji: '☕', ru: 'Кофе', en: 'Coffee' },
  { key: 'walk', emoji: '🚶', ru: 'Прогулка', en: 'Walk' },
  { key: 'party', emoji: '🎉', ru: 'Тусовка', en: 'Party' },
  { key: 'quiet_evening', emoji: '🌙', ru: 'Тихий вечер', en: 'Quiet evening' },
  { key: 'sport', emoji: '🏃', ru: 'Спорт', en: 'Sport' },
  { key: 'sex', emoji: '🌹', ru: 'Близость', en: 'Intimacy' },
  { key: 'work_session', emoji: '💻', ru: 'Работа / проект', en: 'Work / project' },
  { key: 'support', emoji: '💜', ru: 'Забота / поддержка', en: 'Care / support' },
  { key: 'trip', emoji: '✈️', ru: 'Поездка', en: 'Trip' },
]

export function generateRecommendations({
  modules = {},
  todayLog = {},
  daysBeforePeriod = null,
  painLevel = 0,
  missedMed = false,
  lang = 'ru',
}) {
  const recs = []
  const ru = lang !== 'en'

  if (
    modules.periodPrediction &&
    daysBeforePeriod !== null &&
    daysBeforePeriod <= 2 &&
    daysBeforePeriod >= 0
  ) {
    recs.push({
      priority: 'medium',
      emoji: '🩸',
      text: ru ? 'Скоро начало цикла - подготовься.' : 'Period expected soon - get prepared.',
    })
  }

  if (modules.medications && missedMed) {
    recs.push({
      priority: 'high',
      emoji: '💊',
      text: ru
        ? 'Отмечен пропуск приёма. Проверь инструкцию или обсуди с врачом.'
        : 'Missed dose detected. Check instructions or consult your doctor.',
    })
  }

  if (modules.painTracking && painLevel >= 8) {
    recs.push({
      priority: 'high',
      emoji: '⚡',
      text: ru
        ? 'Сильная боль. Если это необычно или резко усилилось - обратись за помощью.'
        : 'High pain level. If unusual or sudden - seek medical help.',
    })
  }

  if (modules.predictionConfidence === 'low') {
    recs.push({
      priority: 'low',
      emoji: '📊',
      text: ru
        ? 'Прогнозы цикла могут быть менее точными из-за особенностей твоего состояния.'
        : 'Cycle predictions may be less accurate due to your health conditions.',
    })
  }

  if (modules.socialSync && todayLog?.energy <= 2) {
    recs.push({
      priority: 'low',
      emoji: '🌙',
      text: ru
        ? 'Сегодня лучше планировать спокойные встречи.'
        : 'Low energy today - better to plan quiet activities.',
    })
  }

  return recs
}