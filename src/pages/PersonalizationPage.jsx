
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'

const PERSONALITY = [
  { key:'introvert', ru:'🌙 Интроверт', en:'🌙 Introvert' },
  { key:'extrovert', ru:'☀️ Экстраверт', en:'☀️ Extrovert' },
  { key:'sensitive', ru:'🌸 Чувствительный', en:'🌸 Sensitive' },
  { key:'rational', ru:'🧠 Рациональная', en:'🧠 Rational' },
  { key:'creative', ru:'🎨 Творческий', en:'🎨 Creative' },
  { key:'spontaneous', ru:'⚡ Спонтанная', en:'⚡ Spontaneous' },
  { key:'analytical', ru:'🔬 Аналитический', en:'🔬 Analytical' },
  { key:'empath', ru:'💜 Эмпат', en:'💜 Empath' },
  { key:'perfectionist', ru:'💎 Перфекционистка', en:'💎 Perfectionist' },
  { key:'homebody', ru:'🏠 Домашняя', en:'🏠 Homebody' },
  { key:'social', ru:'👥 Социальный', en:'👥 Social' },
]

const CARE_PREFS = [
  { key:'sleep', ru:'😴 Сон', en:'😴 Sleep' },
  { key:'alone', ru:'🤫 Тишина и одиночество', en:'🤫 Quiet alone time' },
  { key:'journaling', ru:'📝 Дневник', en:'📝 Journaling' },
  { key:'walk', ru:'🚶 Прогулка', en:'🚶 Walk' },
  { key:'nature', ru:'🌿 Природа', en:'🌿 Nature' },
  { key:'music', ru:'🎵 Музыка', en:'🎵 Music' },
  { key:'friends', ru:'👯 Близкие люди', en:'👯 Close people' },
  { key:'warm_bath', ru:'🛁 Тёплая ванна', en:'🛁 Warm bath' },
  { key:'food', ru:'🍫 Комфортная еда', en:'🍫 Comfort food' },
  { key:'gym', ru:'💪 Движение', en:'💪 Movement' },
  { key:'gaming', ru:'🎮 Игры', en:'🎮 Games' },
]

const MUSIC_GENRES = [
  { key:'pop', ru:'🎤 Поп' }, { key:'rock', ru:'🎸 Рок' }, { key:'indie', ru:'🌙 Инди' },
  { key:'rnb', ru:'🎶 R&B' }, { key:'hiphop', ru:'🔥 Хип-хоп / Рэп' },
  { key:'electronic', ru:'🎛 Электронная' }, { key:'classical', ru:'🎻 Классика' },
  { key:'jazz', ru:'🎷 Джаз' }, { key:'metal', ru:'🤘 Метал' }, { key:'lofi', ru:'☕ Lo-fi' },
]

const MOVIE_GENRES = [
  { key:'romance', ru:'💕 Мелодрамы' }, { key:'comedy', ru:'😂 Комедии' },
  { key:'thriller', ru:'😰 Триллеры' }, { key:'horror', ru:'👻 Хорроры' },
  { key:'scifi', ru:'🚀 Фантастика' }, { key:'fantasy', ru:'🧙 Фэнтези' },
  { key:'documentary', ru:'📽 Документальное' }, { key:'anime', ru:'🎌 Аниме' },
  { key:'drama', ru:'🎭 Драмы' }, { key:'crime', ru:'🔍 Детективы' },
]

const BOOK_GENRES = [
  { key:'fiction', ru:'📖 Художественная литература' }, { key:'romance_book', ru:'💕 Романы' },
  { key:'self_dev', ru:'🌱 Саморазвитие' }, { key:'psychology', ru:'🧠 Психология' },
  { key:'sci_lit', ru:'🔬 Научпоп' }, { key:'fantasy_book', ru:'🧙 Фэнтези' },
  { key:'biography', ru:'🌟 Биографии' }, { key:'poetry', ru:'🌸 Поэзия' },
]

const MODULE_GROUPS = [
  { key:'privacy', ru:'🔐 Приватность', en:'🔐 Privacy' },
  { key:'mind', ru:'🧠 Психика и самочувствие', en:'🧠 Mind & wellbeing' },
  { key:'intimacy', ru:'🌹 Интим и отношения', en:'🌹 Intimacy & relationships' },
  { key:'reproductive', ru:'🍼 Репродуктивные режимы', en:'🍼 Reproductive modes' },
  { key:'age', ru:'🌙 Возрастные состояния', en:'🌙 Age-related modes' },
  { key:'body', ru:'💪 Тело и гормоны', en:'💪 Body & hormones' },
  { key:'education', ru:'🃏 Обучение', en:'🃏 Learning' },
]

const AI_MODULES = [
  {
    key:'teen_stealth', group:'privacy', ai:true,
    ru:'🎭 Подростковая приватность', en:'🎭 Teen privacy',
    descRu:'Скрытый PIN, маскированные уведомления и безопасный экран.',
    descEn:'Ghost PIN, masked notifications, and a safe screen.',
    whereRu:'Профиль, дневник, интим, уведомления.', whereEn:'Profile, diary, intimacy, notifications.',
    detailsRu:'Нужен для ситуаций, где телефон могут смотреть другие. Это не про секреты ради секретов, а про базовую безопасность данных.',
    detailsEn:'Useful when someone else may look at the phone. This is not secrecy for drama, it is basic data safety.',
  },
  {
    key:'teen_sex_ed', group:'education', ai:true,
    ru:'🃏 Карточки миф/правда', en:'🃏 Myth/truth cards',
    descRu:'Короткое sex-ed обучение без стыда и запугивания.', descEn:'Short sex-ed learning without shame or fear tactics.',
    whereRu:'Подростковый режим, интим, обучение.', whereEn:'Teen mode, intimacy, learning.',
    detailsRu:'Карточки объясняют согласие, ИППП, ВПЧ, презервативы и экстренные ситуации нормальным языком, не голосом школьного плаката из ада.',
    detailsEn:'Cards explain consent, STIs, HPV, condoms, and urgent situations in normal language, not a cursed school poster voice.',
  },
  {
    key:'consent_check', group:'intimacy', ai:true,
    ru:'🤝 Проверка согласия', en:'🤝 Consent check',
    descRu:'Мягкие вопросы про комфорт, давление и границы.', descEn:'Gentle questions about comfort, pressure, and boundaries.',
    whereRu:'Интимный трекер, партнёрский режим.', whereEn:'Intimacy tracker, partner mode.',
    detailsRu:'Помогает отмечать не только факт близости, но и качество контакта: было ли комфортно, безопасно, без давления.',
    detailsEn:'Tracks not just intimacy itself, but contact quality: comfort, safety, and pressure-free consent.',
  },
  {
    key:'sti_checkups', group:'intimacy', ai:false,
    ru:'🧪 ИППП-чекапы', en:'🧪 STI check-ups',
    descRu:'Напоминания о тестах, ВПЧ, презервативах, PrEP/PEP как теме для врача.', descEn:'Testing reminders, HPV, condoms, PrEP/PEP as clinician topics.',
    whereRu:'Интим, здоровье, напоминания.', whereEn:'Intimacy, health, reminders.',
    detailsRu:'Не назначает лечение. Подсказывает, когда логично обсудить тесты, вакцинацию ВПЧ или консультацию после риска.',
    detailsEn:'Does not prescribe treatment. Suggests when to discuss testing, HPV vaccination, or care after a risk event.',
  },
  {
    key:'cycle_mood_libido', group:'mind', ai:true,
    ru:'🩸 Цикл + настроение + либидо', en:'🩸 Cycle + mood + libido',
    descRu:'Связь цикла, стресса, сна, боли и желания.', descEn:'Links cycle, stress, sleep, pain, and desire.',
    whereRu:'Календарь, дневник, интим, отчёт врачу.', whereEn:'Calendar, diary, intimacy, doctor report.',
    detailsRu:'Ищет закономерности: не “ты драматизируешь”, а “это повторяется перед месячными, после недосыпа или при боли”.',
    detailsEn:'Looks for patterns: not “you are dramatic”, but “this repeats before bleeding, after poor sleep, or with pain”.',
  },
  {
    key:'doctor_report', group:'mind', ai:false,
    ru:'📋 Отчёт для врача', en:'📋 Doctor report',
    descRu:'Собирает факты по циклу, боли, анализам, препаратам.', descEn:'Collects cycle, pain, labs, and medication facts.',
    whereRu:'Экспорт, здоровье, анализы, таблетки.', whereEn:'Export, health, labs, medications.',
    detailsRu:'Собирает факты в нормальный отчёт, чтобы на приёме не вспоминать всё по памяти как на экзамене без подготовки.',
    detailsEn:'Turns logs into a structured report so you do not have to remember everything like an unprepared exam.',
  },
  {
    key:'vaccines_lifespan', group:'body', ai:false,
    ru:'💉 Прививки и ревакцинация', en:'💉 Vaccines & boosters',
    descRu:'Календарь прививок по возрасту, беременности, детям, родителям и рискам.', descEn:'Vaccine schedule by age, pregnancy, children, parents, and risk factors.',
    whereRu:'Здоровье → Прививки, напоминания, планирование беременности.', whereEn:'Health → Vaccines, reminders, pregnancy planning.',
    detailsRu:'Elara не назначает вакцины, а помогает вести карту: когда сделали, когда следующая доза, что сказал врач и какие вопросы не забыть.',
    detailsEn:'Elara does not prescribe vaccines. It helps track what was done, next dose timing, clinician notes, and questions to ask.',
  },
  {
    key:'hormones_stm', group:'reproductive', ai:true,
    ru:'🌡 Гормоны / СТМ / контрацепция', en:'🌡 Hormones / STM / contraception',
    descRu:'Температура, слизь, контрацепция и гормональные факторы.', descEn:'Temperature, mucus, contraception, and hormonal factors.',
    whereRu:'Календарь, здоровье, выбранный день.', whereEn:'Calendar, health, selected day.',
    detailsRu:'Особенно для СТМ: нужны ежедневные отметки, обучение и здравый смысл. Приложение не защищает от ИППП и не заменяет инструктора.',
    detailsEn:'Especially for STM: it needs daily logs, training, and common sense. The app does not prevent STIs or replace an instructor.',
  },
  {
    key:'chronic_templates', group:'mind', ai:false,
    ru:'🧩 Шаблоны хронических состояний', en:'🧩 Chronic condition templates',
    descRu:'Эндометриоз, СПКЯ, мигрень, анемия, щитовидка, СРК.', descEn:'Endometriosis, PCOS, migraine, anemia, thyroid, IBS.',
    whereRu:'Здоровье, дневник, анализы, отчёт врачу.', whereEn:'Health, diary, labs, doctor report.',
    detailsRu:'Включает подсказки и поля под конкретные состояния. Не ставит диагнозы, потому что это приложение, а не врач в кармане.',
    detailsEn:'Adds fields and hints for specific conditions. It does not diagnose, because it is an app, not a pocket doctor.',
  },
  {
    key:'pregnancy_planning', group:'reproductive', ai:false,
    ru:'🕊 Планирование беременности', en:'🕊 Pregnancy planning',
    descRu:'Можно включить в любом возрасте. Обследования подстраиваются под возраст и контекст.', descEn:'Can be enabled at any age. Check-ups adapt to age and context.',
    whereRu:'Цикл, здоровье, анализы, напоминания.', whereEn:'Cycle, health, labs, reminders.',
    detailsRu:'Возраст не включает и не выключает планирование. Он только меняет список того, что обсудить с врачом.',
    detailsEn:'Age does not enable or disable planning. It only changes what to discuss with a clinician.',
  },
  {
    key:'pregnancy_mode', group:'reproductive', ai:false,
    ru:'👶 Режим беременности', en:'👶 Pregnancy mode',
    descRu:'Неделя, обследования, симптомы, витамины и красные флаги.', descEn:'Week, check-ups, symptoms, vitamins, and red flags.',
    whereRu:'Главный экран, здоровье, лекарства, анализы.', whereEn:'Home screen, health, medications, labs.',
    detailsRu:'Показывает недельный режим и чек-листы, но не делает акушерских решений. Да, даже если очень хочется автоматизировать всё живое.',
    detailsEn:'Shows weekly mode and checklists, but does not make obstetric decisions.',
  },
  {
    key:'postpartum_support', group:'reproductive', ai:false,
    ru:'🫂 Послеродовое восстановление', en:'🫂 Postpartum support',
    descRu:'Сон, настроение, лактация, быстрые отметки, поддержка партнёра.', descEn:'Sleep, mood, lactation, quick logs, partner support.',
    whereRu:'Здоровье, дневник, круг, напоминания.', whereEn:'Health, diary, circle, reminders.',
    detailsRu:'Для периода, где времени нет даже на мысль “а как я вообще”. Быстрые отметки, мягкие флаги и поддержка.',
    detailsEn:'For the period when even thinking “how am I” feels ambitious. Quick logs, gentle flags, support.',
  },
  {
    key:'peri_menopause', group:'age', ai:true,
    ru:'🌙 Перименопауза / менопауза', en:'🌙 Perimenopause / menopause',
    descRu:'Приливы, сон, MRS, сухость, либидо, кости, давление.', descEn:'Hot flashes, sleep, MRS, dryness, libido, bones, blood pressure.',
    whereRu:'Здоровье, дневник, тесты, анализы.', whereEn:'Health, diary, tests, labs.',
    detailsRu:'Помогает не списывать всё на “возраст”, эту ленивую корзину для всего непонятного.',
    detailsEn:'Helps avoid dumping everything into “age”, that lazy basket for every unclear symptom.',
  },
  {
    key:'healthy_aging', group:'age', ai:false,
    ru:'🦴 Здоровое старение', en:'🦴 Healthy aging',
    descRu:'Саркопения, баланс, сон, память, падения, препараты.', descEn:'Sarcopenia, balance, sleep, memory, falls, medications.',
    whereRu:'Спорт, здоровье, лекарства, дневник.', whereEn:'Sport, health, medications, diary.',
    detailsRu:'Фокус на автономности: мышцы, баланс, память, сон и аккуратный дневник лекарств.',
    detailsEn:'Focuses on autonomy: muscle, balance, memory, sleep, and medication tracking.',
  },
  {
    key:'male_health', group:'body', ai:true,
    ru:'💪 Мужское здоровье', en:'💪 Male health',
    descRu:'Сон, тестостерон, IIEF-5, ADAM, тазовая боль, фертильность.', descEn:'Sleep, testosterone, IIEF-5, ADAM, pelvic pain, fertility.',
    whereRu:'Здоровье, тесты, спорт, интим.', whereEn:'Health, tests, sport, intimacy.',
    detailsRu:'Без цирка “терпи, ты мужик”: сон, либидо, энергия, тазовая боль и фертильность - нормальные темы.',
    detailsEn:'No “man up” circus: sleep, libido, energy, pelvic pain, and fertility are valid topics.',
  },
  {
    key:'gaht_support', group:'body', ai:true,
    ru:'⚧ ГАТ / ЗГТ', en:'⚧ GAHT / HRT',
    descRu:'Терапия, анализы, настроение, либидо, кожа, дисфория.', descEn:'Therapy, labs, mood, libido, skin, dysphoria.',
    whereRu:'Здоровье, лекарства, анализы, дневник.', whereEn:'Health, medications, labs, diary.',
    detailsRu:'Elara не меняет нормы анализов сама. Она помогает собрать вопросы и отметить, что обсудить с врачом.',
    detailsEn:'Elara does not change lab reference ranges by itself. It helps collect questions for a clinician.',
  },
  {
    key:'lgbtq_couples', group:'intimacy', ai:false,
    ru:'🌈 ЛГБТК+ пары', en:'🌈 LGBTQ+ couples',
    descRu:'Партнёрский режим без гендерных предположений, приватность и согласие.', descEn:'Partner mode without gender assumptions, privacy and consent.',
    whereRu:'Круг, интим, синхронизация, партнёрский режим.', whereEn:'Circle, intimacy, sync, partner mode.',
    detailsRu:'Убирает “мужчина/женщина” как дефолт вселенной. Наконец-то интерфейс чуть меньше похож на форму из 2007.',
    detailsEn:'Removes “male/female” as the default universe. The interface becomes slightly less 2007.',
  },
]

function loadJson(key, fallback = {}) {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)) }
  catch { return fallback }
}

function unique(arr) {
  return [...new Set((arr || []).filter(Boolean))]
}

function getAge(profile) {
  const birthDate = profile?.birth_date ? new Date(profile.birth_date) : null
  if (birthDate && !Number.isNaN(birthDate.getTime())) {
    const now = new Date()
    let age = now.getFullYear() - birthDate.getFullYear()
    const m = now.getMonth() - birthDate.getMonth()
    if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) age -= 1
    return age
  }
  const y = Number(profile?.birth_year)
  if (!Number.isFinite(y) || y < 1900) return null
  return new Date().getFullYear() - y
}

function getAgeBand(age) {
  if (age !== null && age < 18) return 'teen'
  if (!age) return 'adult_unknown'
  if (age < 25) return '18_25'
  if (age < 35) return '25_35'
  if (age < 45) return '35_45'
  if (age < 60) return '45_60'
  return '60_plus'
}

function scoreIsAtLeast(result, levels = []) {
  if (!result) return false
  return levels.includes(result.level)
}

function deriveFromTests(results = {}, profile = {}) {
  const tags = []
  const care = []
  const modules = []
  const reasons = {}

  function addModule(key, reason) {
    modules.push(key)
    if (reason) reasons[key] = reason
  }

  const big5 = results.big5
  if (big5?.tags?.length) {
    for (const tag of big5.tags) {
      if (tag.includes('Экстраверт')) tags.push('extrovert')
      if (tag.includes('Интроверт')) tags.push('introvert')
      if (tag.includes('Амбиверт')) tags.push('social')
      if (tag.includes('Перфекционист')) tags.push('perfectionist')
      if (tag.includes('Твор')) tags.push('creative')
      if (tag.includes('Чувств')) tags.push('sensitive')
      if (tag.includes('Рацион')) tags.push('rational')
      if (tag.includes('Эмпат')) tags.push('empath')
    }
  }

  if (scoreIsAtLeast(results.gad7, ['mild','moderate','severe']) || scoreIsAtLeast(results.bai, ['mild','moderate','severe'])) {
    tags.push('sensitive')
    care.push('alone','journaling','music','walk','sleep')
    addModule('cycle_mood_libido', 'по тревоге и дневнику лучше отслеживать сон, стресс и телесные триггеры')
  }
  if (scoreIsAtLeast(results.phq9, ['mild','moderate','moderately_severe','severe']) || scoreIsAtLeast(results.bdi2, ['mild','moderate','severe'])) {
    care.push('sleep','nature','journaling','friends')
    addModule('doctor_report', 'при просадке настроения полезно собрать факты для врача, а не героически всё помнить')
  }
  if (scoreIsAtLeast(results.asrs, ['moderate','high'])) {
    tags.push('spontaneous')
    care.push('gaming','music','walk')
    addModule('cycle_mood_libido', 'при СДВГ-фокусе Elara будет дробить советы и учитывать перегруз')
  }
  if (scoreIsAtLeast(results.psst, ['pms','pmdd'])) {
    addModule('cycle_mood_libido', 'ПМС/ПМДР стоит связывать с фазами цикла и нагрузкой')
    addModule('doctor_report', 'циклические симптомы удобно показывать врачу как паттерн')
    care.push('warm_bath','sleep','alone','food')
  }
  if (scoreIsAtLeast(results.psqi, ['moderate','poor']) || scoreIsAtLeast(results.ess, ['mild','moderate','severe'])) {
    addModule('healthy_aging', 'сон попал в приоритеты, потому что без него всё остальное разваливается довольно живописно')
    care.push('sleep','reading')
  }
  if (scoreIsAtLeast(results.fsfi, ['mild','risk']) || scoreIsAtLeast(results.iief5, ['mild','moderate','severe'])) {
    addModule('consent_check', 'интимный блок будет учитывать комфорт, боль, желание и контекст')
    addModule('sti_checkups', 'при интимных фокусах полезны профилактические напоминания')
  }
  if (scoreIsAtLeast(results.adam, ['positive'])) addModule('male_health', 'ADAM дал повод держать мужское здоровье в фокусе')

  const age = getAge(profile)
  const ageBand = getAgeBand(age)
  const gender = profile?.gender
  const orientation = profile?.orientation
  const bodyMode = profile?.body_mode
  const conditions = profile?.active_conditions || profile?.health?.conditions || []

  if (ageBand && ageBand !== 'adult_unknown') addModule('vaccines_lifespan', 'возраст указан, значит можно собрать карту прививок и ревакцинаций')

  if (ageBand === 'teen') {
    addModule('teen_stealth', 'для подросткового режима важна приватность')
    addModule('teen_sex_ed', 'подростковый режим лучше работает с короткими карточками без стыда')
    addModule('consent_check', 'границы и согласие лучше встроить сразу, а не когда уже поздно')
  }
  if (ageBand === '18_25') { addModule('sti_checkups', 'в этом возрасте полезны чекапы и профилактика'); addModule('cycle_mood_libido') }
  if (ageBand === '25_35') { addModule('doctor_report'); addModule('hormones_stm'); addModule('chronic_templates') }
  if (ageBand === '35_45') { addModule('chronic_templates'); addModule('doctor_report') }
  if (ageBand === '45_60') { addModule('peri_menopause'); addModule('doctor_report') }
  if (ageBand === '60_plus') { addModule('healthy_aging'); addModule('doctor_report') }

  if (bodyMode === 'menstruating') { addModule('cycle_mood_libido'); addModule('hormones_stm') }
  if (bodyMode === 'pregnancy' || bodyMode === 'pregnant') addModule('pregnancy_mode')
  if (bodyMode === 'menopause') addModule('peri_menopause')
  if (conditions.includes('postpartum')) addModule('postpartum_support')
  if (conditions.includes('pcos') || conditions.includes('endometriosis')) { addModule('chronic_templates'); addModule('doctor_report') }
  if (conditions.includes('hormone_therapy')) addModule('gaht_support')
  if (['trans_woman','trans_man','non_binary','genderfluid','agender'].includes(gender)) addModule('gaht_support')
  if (['gay','lesbian','bisexual','pansexual','queer'].includes(orientation)) { addModule('lgbtq_couples'); addModule('sti_checkups') }
  if (gender === 'cis_man' || gender === 'male' || gender === 'trans_man') addModule('male_health')

  return { personality: unique(tags), carePrefs: unique(care), modules: unique(modules), reasons, ageBand }
}

function pregnancyPlanningChecklist(age, rl) {
  const base = [
    rl('фолиевая кислота до зачатия и в ранние сроки - обсудить дозу с врачом','folic acid before conception and in early pregnancy - discuss dose with a clinician'),
    rl('обновить список лекарств и БАДов: что можно, что заменить, что нельзя','review medications and supplements: what is safe, what to replace, what to avoid'),
    rl('проверить прививки и иммунитет по показаниям','review vaccines and immunity where relevant'),
    rl('собрать базовые анализы и хронические состояния в отчёт для врача','collect basic labs and chronic conditions in a doctor report'),
  ]
  if (!age) return base
  if (age < 25) return [...base, rl('акцент на ИППП-чекапах, контрацептивной истории и регулярности цикла','focus on STI checks, contraceptive history, and cycle regularity')]
  if (age < 35) return [...base, rl('цикл, овуляция, ферритин, витамин D, щитовидка по показаниям','cycle, ovulation, ferritin, vitamin D, thyroid where relevant')]
  if (age < 40) return [...base, rl('овариальный резерв, давление, глюкоза, липиды, семейный анамнез по показаниям','ovarian reserve, blood pressure, glucose, lipids, family history where relevant')]
  return [...base, rl('давление, глюкоза, сердечно-сосудистые факторы и генетическое консультирование по показаниям','blood pressure, glucose, cardiovascular factors, and genetic counseling where relevant')]
}

export default function PersonalizationPage() {
  const { user, profile, updateProfile } = useAuth()
  const navigate = useNavigate()
  const { lang } = useLang()
  const rl = (ru, en) => lang === 'en' ? en : ru

  const prefs = profile?.preferences || {}
  const testResults = useMemo(() => user?.id ? loadJson(`elara_test_results_${user.id}`, {}) : {}, [user?.id])
  const suggested = useMemo(() => deriveFromTests(testResults, profile || {}), [testResults, profile])
  const age = getAge(profile)

  const [personality, setPersonality] = useState(profile?.personality_tags?.length ? profile.personality_tags : suggested.personality)
  const [carePrefs, setCarePrefs] = useState(prefs.care_prefs?.length ? prefs.care_prefs : suggested.carePrefs)
  const [musicGenres, setMusicGenres] = useState(prefs.music_genres || [])
  const [movieGenres, setMovieGenres] = useState(prefs.movie_genres || [])
  const [bookGenres, setBookGenres] = useState(prefs.book_genres || [])
  const [aiModules, setAiModules] = useState(prefs.ai_modules?.length ? prefs.ai_modules : suggested.modules)
  const [customPrefs, setCustomPrefs] = useState(prefs.custom || '')
  const [tab, setTab] = useState('recommended')
  const [openModule, setOpenModule] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function toggle(arr, setArr, key) {
    setArr(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  function applyTestPersonalization() {
    setPersonality(prev => unique([...prev, ...suggested.personality]))
    setCarePrefs(prev => unique([...prev, ...suggested.carePrefs]))
    setAiModules(prev => unique([...prev, ...suggested.modules]))
  }

  function rebuildFromTests() {
    setPersonality(suggested.personality)
    setCarePrefs(suggested.carePrefs)
    setAiModules(suggested.modules)
  }

  async function handleSave() {
    setSaving(true)
    await updateProfile({
      personality_tags: personality,
      preferences: {
        ...prefs,
        care_prefs: carePrefs,
        music_genres: musicGenres,
        movie_genres: movieGenres,
        book_genres: bookGenres,
        ai_modules: aiModules,
        ai_personalization_source: Object.keys(testResults).length ? 'tests+manual' : 'manual',
        custom: customPrefs,
      },
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function ChipSection({ title, items, selected, onToggle, color = 'var(--accent)', small = false }) {
    return (
      <div>
        <div style={{ fontSize:12, fontWeight:600, color:'var(--text)', marginBottom:10 }}>{title}</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
          {items.map(item => {
            const active = selected.includes(item.key)
            const label = lang === 'en' && item.en ? item.en : item.ru
            return (
              <button key={item.key} type="button" onClick={() => onToggle(item.key)} style={{
                padding: small ? '6px 10px' : '7px 12px', borderRadius:20, fontSize:small ? 11 : 12, cursor:'pointer',
                border:`1px solid ${active ? color : 'var(--border)'}`,
                background:active ? `${color}22` : 'transparent',
                color:active ? color : 'var(--text2)',
              }}>{label}</button>
            )
          })}
        </div>
      </div>
    )
  }

  function ModuleCard({ m }) {
    const active = aiModules.includes(m.key)
    const recommended = suggested.modules.includes(m.key)
    const expanded = openModule === m.key
    return (
      <div className="card" style={{ padding:'13px 14px', border:active ? '1px solid var(--accent)' : '1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
          <button type="button" onClick={() => toggle(aiModules, setAiModules, m.key)} aria-label={active ? 'disable' : 'enable'} style={{
            width:42, height:24, borderRadius:999, border:`1px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
            background:active ? 'var(--accent-soft)' : 'var(--bg3)', cursor:'pointer', position:'relative', flexShrink:0, marginTop:1,
          }}>
            <span style={{ position:'absolute', top:3, left:active ? 21 : 3, width:16, height:16, borderRadius:'50%', background:active ? 'var(--accent)' : 'var(--text3)', transition:'left .15s' }} />
          </button>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
              <div style={{ fontSize:14, fontWeight:650 }}>{lang === 'en' ? m.en : m.ru}</div>
              {m.ai && <span style={{ fontSize:10, padding:'2px 7px', borderRadius:999, background:'var(--accent-soft)', color:'var(--accent)', border:'1px solid var(--accent)33' }}>AI</span>}
              {recommended && <span style={{ fontSize:10, padding:'2px 7px', borderRadius:999, background:'rgba(250,204,21,0.12)', color:'#facc15', border:'1px solid rgba(250,204,21,0.25)' }}>{rl('рекомендовано','suggested')}</span>}
              {active && <span style={{ marginLeft:'auto', color:'var(--accent)', fontSize:12 }}>✓</span>}
            </div>
            <p style={{ margin:'6px 0 0', color:'var(--text2)', fontSize:12, lineHeight:1.5 }}>{lang === 'en' ? m.descEn : m.descRu}</p>
            <div style={{ fontSize:11, color:'var(--text3)', marginTop:7, lineHeight:1.45 }}>
              <strong>{rl('Где работает:','Works in:')}</strong> {lang === 'en' ? m.whereEn : m.whereRu}
            </div>
            {recommended && suggested.reasons[m.key] && <div style={{ fontSize:11, color:'var(--accent)', marginTop:7, lineHeight:1.45 }}>✦ {suggested.reasons[m.key]}</div>}
            <button type="button" onClick={() => setOpenModule(expanded ? null : m.key)} style={{ marginTop:9, fontSize:11, color:'var(--accent)', background:'none', border:'none', padding:0, cursor:'pointer' }}>
              {expanded ? rl('Скрыть','Hide') : rl('Подробнее','Details')}
            </button>
            {expanded && (
              <div style={{ marginTop:9, padding:'10px 11px', borderRadius:10, background:'var(--bg3)', color:'var(--text2)', fontSize:12, lineHeight:1.55 }}>
                {lang === 'en' ? m.detailsEn : m.detailsRu}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const completedCount = Object.keys(testResults).length
  const activeModules = AI_MODULES.filter(m => aiModules.includes(m.key))
  const recommendedModules = AI_MODULES.filter(m => suggested.modules.includes(m.key))
  const allByTab = tab === 'active' ? activeModules : tab === 'recommended' ? recommendedModules : AI_MODULES
  const pregnancyPlanningOn = aiModules.includes('pregnancy_planning')
  const planningChecklist = pregnancyPlanningChecklist(age, rl)

  return (
    <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', padding:'24px 20px', gap:18, overflowY:'auto' }}>
      <h2 style={{ fontSize:28 }}>✦ {rl('Персонализация AI','AI Personalization')}</h2>
      <p style={{ fontSize:13, color:'var(--text2)', marginTop:-10, lineHeight:1.6 }}>
        {rl('Гибридный режим: Elara предлагает настройки по тестам, а ты потом вручную дотыкываешь всё, что нужно. Алгоритм не король, максимум - стажёр с блокнотом.', 'Hybrid mode: Elara suggests settings from tests, and you can adjust everything manually.')}
      </p>

      <div className="card" style={{ padding:'14px 16px', display:'flex', flexDirection:'column', gap:12 }}>
        <div style={{ display:'flex', justifyContent:'space-between', gap:12, alignItems:'flex-start' }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700 }}>🧪 {rl('Настроить по тестам','Set up from tests')}</div>
            <p style={{ margin:'6px 0 0', fontSize:12, color:'var(--text2)', lineHeight:1.55 }}>
              {completedCount
                ? rl(`Пройдено тестов: ${completedCount}. Можно собрать стартовые фокусы и потом поправить руками.`, `${completedCount} tests completed. Build starter focus areas, then edit manually.`)
                : rl('Пройди тесты, чтобы Elara предложила фокусы и стиль поддержки.', 'Take tests so Elara can suggest focus areas, modules, and support style.')}
            </p>
          </div>
          <button onClick={() => navigate('/tests')} className="btn btn-ghost" style={{ width:'auto', padding:'7px 14px', fontSize:12, flexShrink:0 }}>
            {rl('Пройти тесты','Take tests')}
          </button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
          <button onClick={applyTestPersonalization} className="btn btn-primary" disabled={!completedCount && !suggested.modules.length} style={{ fontSize:12 }}>
            ✦ {rl('Добавить по тестам','Add from tests')}
          </button>
          <button onClick={rebuildFromTests} className="btn btn-ghost" disabled={!completedCount && !suggested.modules.length} style={{ fontSize:12 }}>
            ↺ {rl('Пересобрать','Rebuild')}
          </button>
        </div>
      </div>

      <div className="card" style={{ padding:'14px 16px' }}>
        <div style={{ fontSize:14, fontWeight:700, marginBottom:9 }}>✨ {rl('Активные фокусы','Active focus areas')}</div>
        {activeModules.length === 0 ? (
          <p style={{ margin:0, fontSize:12, color:'var(--text3)', lineHeight:1.6 }}>{rl('Пока ничего не включено. Вкладка “Рекомендовано” ждёт, как грустный консультант в торговом центре.', 'Nothing enabled yet. The recommended tab is waiting.')}</p>
        ) : (
          <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
            {activeModules.map(m => <span key={m.key} style={{ padding:'5px 10px', borderRadius:999, background:'var(--accent-soft)', color:'var(--accent)', fontSize:11, border:'1px solid var(--accent)33' }}>{lang === 'en' ? m.en : m.ru}</span>)}
          </div>
        )}
      </div>

      <div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8, marginBottom:12 }}>
          {[
            ['recommended', rl('Рекомендовано','Suggested')],
            ['all', rl('Все функции','All features')],
            ['active', rl('Активно','Active')],
          ].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} style={{
              padding:'9px 8px', borderRadius:10, fontSize:12, cursor:'pointer',
              border:`1px solid ${tab === key ? 'var(--accent)' : 'var(--border)'}`,
              background:tab === key ? 'var(--accent-soft)' : 'var(--bg2)',
              color:tab === key ? 'var(--accent)' : 'var(--text2)',
            }}>{label}</button>
          ))}
        </div>

        {tab === 'recommended' && recommendedModules.length === 0 && (
          <div className="card" style={{ padding:'16px', color:'var(--text3)', fontSize:13, lineHeight:1.6 }}>
            {rl('Нет рекомендаций. Пройди тесты или добавь модули вручную. Удивительно, но приложение пока не читает мысли через экран.', 'No recommendations yet. Take tests or add modules manually.')}
          </div>
        )}

        {MODULE_GROUPS.map(group => {
          const items = allByTab.filter(m => m.group === group.key)
          if (!items.length) return null
          return (
            <div key={group.key} style={{ marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:700, margin:'0 0 8px 2px' }}>{lang === 'en' ? group.en : group.ru}</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>{items.map(m => <ModuleCard key={m.key} m={m} />)}</div>
            </div>
          )
        })}
      </div>

      {pregnancyPlanningOn && (
        <div className="card" style={{ padding:'14px 16px', border:'1px solid rgba(244,114,182,0.25)' }}>
          <div style={{ fontSize:13, fontWeight:700, marginBottom:8 }}>🕊 {rl('Планирование беременности','Pregnancy planning')}</div>
          <p style={{ fontSize:12, color:'var(--text2)', lineHeight:1.6, margin:'0 0 10px' }}>
            {rl('Этот модуль можно включить в любом возрасте. Возраст меняет не право планировать, а список обследований и вопросов к врачу.', 'This module can be enabled at any age. Age changes the checklist, not the right to plan.')}
          </p>
          <ul style={{ margin:'0 0 0 18px', padding:0, color:'var(--text2)', fontSize:12, lineHeight:1.7 }}>{planningChecklist.map(item => <li key={item}>{item}</li>)}</ul>
        </div>
      )}

      <ChipSection title={rl('🧬 Я по натуре...','🧬 My character...')} items={PERSONALITY} selected={personality} onToggle={k => toggle(personality, setPersonality, k)} />
      <ChipSection title={rl('💆 Когда плохо, помогает...','💆 When I am down...')} items={CARE_PREFS} selected={carePrefs} onToggle={k => toggle(carePrefs, setCarePrefs, k)} color="#f472b6" />
      <ChipSection title={rl('🎵 Любимая музыка','🎵 Favourite music')} items={MUSIC_GENRES} selected={musicGenres} onToggle={k => toggle(musicGenres, setMusicGenres, k)} color="#a78bfa" small />
      <ChipSection title={rl('🎬 Любимое кино','🎬 Favourite movies')} items={MOVIE_GENRES} selected={movieGenres} onToggle={k => toggle(movieGenres, setMovieGenres, k)} color="#facc15" small />
      <ChipSection title={rl('📚 Любимые книги','📚 Favourite books')} items={BOOK_GENRES} selected={bookGenres} onToggle={k => toggle(bookGenres, setBookGenres, k)} color="#86c896" small />

      <div>
        <div style={{ fontSize:12, fontWeight:600, color:'var(--text)', marginBottom:8 }}>{rl('✍️ Расскажи о себе своими словами','✍️ Tell about yourself in your own words')}</div>
        <textarea value={customPrefs} onChange={e => setCustomPrefs(e.target.value)} placeholder={rl('Например: не люблю советы “просто соберись”, утром мне нужна тишина, при стрессе забываю есть...','E.g.: I hate “just pull yourself together” advice, need quiet mornings, forget to eat under stress...')} style={{ minHeight:90, resize:'vertical', lineHeight:1.6 }} />
      </div>

      <div style={{ background:'var(--bg2)', borderRadius:10, padding:'12px 14px', border:'1px solid var(--border)', fontSize:12, color:'var(--text2)', lineHeight:1.6 }}>
        ✦ {rl('AI будет учитывать тесты, активные модули и ручные настройки. Медицинские решения он не назначает, а помогает собрать данные и вопросы для врача.', 'AI uses tests, active modules, and manual settings. It does not make medical decisions, it helps collect data and questions for clinicians.')}
      </div>

      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saved ? '✓' : saving ? '...' : rl('Сохранить','Save')}</button>
    </div>
  )
}
