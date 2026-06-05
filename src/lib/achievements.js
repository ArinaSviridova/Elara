// ─── Система ачивок Elara ─────────────────────────────────────────────────
// Хранится в profile.achievements как [{ key, earned_at }]

export const ACHIEVEMENTS = [
  // ── Старт ──
  {
    key: 'first_login',
    emoji: '✦',
    color: '#a78bfa',
    titleRu: 'Добро пожаловать в Elara',
    titleEn: 'Welcome to Elara',
    descRu: 'Ты зарегистрировалась и сделала первый шаг',
    descEn: 'You signed up and took the first step',
    category: 'start',
  },
  {
    key: 'profile_complete',
    emoji: '🧬',
    color: '#4ade80',
    titleRu: 'Профиль настроен',
    titleEn: 'Profile set up',
    descRu: 'Заполнен режим тела, гендер и обращение',
    descEn: 'Body mode, gender and pronouns configured',
    category: 'start',
  },
  {
    key: 'first_cycle_log',
    emoji: '🩸',
    color: '#f472b6',
    titleRu: 'Первая отметка цикла',
    titleEn: 'First cycle log',
    descRu: 'Отмечен первый день цикла',
    descEn: 'First cycle day logged',
    category: 'start',
  },
  {
    key: 'first_mood',
    emoji: '🌙',
    color: '#818cf8',
    titleRu: 'Настроение отмечено',
    titleEn: 'Mood logged',
    descRu: 'Первая запись настроения в дневнике',
    descEn: 'First mood entry in diary',
    category: 'start',
  },
  {
    key: 'first_medication',
    emoji: '💊',
    color: '#4ade80',
    titleRu: 'Первый препарат',
    titleEn: 'First medication',
    descRu: 'Добавлен первый препарат в список',
    descEn: 'First medication added to the list',
    category: 'start',
  },
  {
    key: 'first_test',
    emoji: '🧪',
    color: '#60a5fa',
    titleRu: 'Первый тест пройден',
    titleEn: 'First test completed',
    descRu: 'Пройден первый клинический скрининг',
    descEn: 'First clinical screening completed',
    category: 'start',
  },
  {
    key: 'first_sport',
    emoji: '🏃',
    color: '#f59e0b',
    titleRu: 'В движении',
    titleEn: 'In motion',
    descRu: 'Первая тренировка отмечена',
    descEn: 'First workout logged',
    category: 'start',
  },
  // ── Прогресс ──
  {
    key: 'streak_7',
    emoji: '🔥',
    color: '#f97316',
    titleRu: '7 дней подряд',
    titleEn: '7-day streak',
    descRu: 'Открывала приложение 7 дней без перерыва',
    descEn: 'Opened the app 7 days in a row',
    category: 'progress',
  },
  {
    key: 'streak_30',
    emoji: '🌟',
    color: '#facc15',
    titleRu: 'Месяц практики',
    titleEn: 'Month of practice',
    descRu: '30 дней использования Elara',
    descEn: '30 days of using Elara',
    category: 'progress',
  },
  {
    key: 'cycles_3',
    emoji: '🔄',
    color: '#f472b6',
    titleRu: '3 цикла данных',
    titleEn: '3 cycles of data',
    descRu: 'Достаточно для точных предсказаний',
    descEn: 'Enough for accurate predictions',
    category: 'progress',
  },
  {
    key: 'cycles_6',
    emoji: '💎',
    color: '#c084fc',
    titleRu: 'Полгода данных',
    titleEn: 'Half a year of data',
    descRu: '6 циклов — Elara хорошо тебя знает',
    descEn: '6 cycles — Elara knows you well',
    category: 'progress',
  },
  {
    key: 'diary_10',
    emoji: '📔',
    color: '#34d399',
    titleRu: '10 записей в дневнике',
    titleEn: '10 diary entries',
    descRu: 'Регулярный дневник — мощный инструмент',
    descEn: 'Regular diary is a powerful tool',
    category: 'progress',
  },
  {
    key: 'tests_3',
    emoji: '🔬',
    color: '#22d3ee',
    titleRu: 'Исследователь здоровья',
    titleEn: 'Health researcher',
    descRu: 'Пройдено 3 клинических теста',
    descEn: '3 clinical tests completed',
    category: 'progress',
  },
  {
    key: 'sport_10',
    emoji: '🏅',
    color: '#fb923c',
    titleRu: '10 тренировок',
    titleEn: '10 workouts',
    descRu: 'Регулярное движение — часть самозаботы',
    descEn: 'Regular movement is part of self-care',
    category: 'progress',
  },

  {
    key: 'nutrition_started',
    emoji: '🥗',
    color: '#4ade80',
    titleRu: 'Питание подключено',
    titleEn: 'Nutrition started',
    descRu: 'Открыт раздел питания и меню',
    descEn: 'Nutrition and meal planning opened',
    category: 'nutrition',
  },
  {
    key: 'first_aid_started',
    emoji: '🆘',
    color: '#fb7185',
    titleRu: 'Паника отменяется',
    titleEn: 'Panic cancelled',
    descRu: 'Открыт раздел первой помощи',
    descEn: 'First aid section opened',
    category: 'safety',
  },
  {
    key: 'kit_started',
    emoji: '🧰',
    color: '#60a5fa',
    titleRu: 'Аптечка без археологии',
    titleEn: 'Kit without archaeology',
    descRu: 'Открыт чек-лист домашней аптечки',
    descEn: 'Home first-aid kit checklist opened',
    category: 'safety',
  },
  // ── Социальные ──
  {
    key: 'first_friend',
    emoji: '👥',
    color: '#e879f9',
    titleRu: 'Первый в круге',
    titleEn: 'First in circle',
    descRu: 'Добавлен первый человек в круг',
    descEn: 'First person added to circle',
    category: 'social',
  },
  {
    key: 'first_proposal',
    emoji: '✨',
    color: '#f0abfc',
    titleRu: 'Предложение досуга',
    titleEn: 'Activity proposal',
    descRu: 'Отправлено первое предложение совместного досуга',
    descEn: 'First joint activity proposal sent',
    category: 'social',
  },
  {
    key: 'pregnancy_prep',
    emoji: '🕊',
    color: '#86efac',
    titleRu: 'Подготовка начата',
    titleEn: 'Preparation started',
    descRu: 'Активирован модуль подготовки к беременности',
    descEn: 'Pregnancy preparation module activated',
    category: 'social',
  },
  // ── Особые ──
  {
    key: 'night_owl',
    emoji: '🦉',
    color: '#94a3b8',
    titleRu: 'Полночная сова',
    titleEn: 'Night owl',
    descRu: 'Открыла приложение после полуночи',
    descEn: 'Opened the app after midnight',
    category: 'special',
  },
  {
    key: 'module_explorer',
    emoji: '🗺',
    color: '#7dd3fc',
    titleRu: 'Любознательный',
    titleEn: 'Curious Mind',
    descRu: 'Открыл(а) 5 разделов о здоровье',
    descEn: 'Opened 5 health sections',
    category: 'special',
  },
]

// Утилиты
export function getAchievement(key) {
  return ACHIEVEMENTS.find(a => a.key === key)
}

export function getEarnedAchievements(profile) {
  const earned = profile?.achievements || []
  return earned
    .map(e => ({ ...getAchievement(e.key), earned_at: e.earned_at }))
    .filter(Boolean)
}

export function hasAchievement(profile, key) {
  return (profile?.achievements || []).some(a => a.key === key)
}

export async function earnAchievement(supabase, profile, key, updateProfile) {
  if (hasAchievement(profile, key)) return false
  const current = profile?.achievements || []
  await updateProfile({
    achievements: [...current, { key, earned_at: new Date().toISOString() }]
  })
  return true
}

/**
 * Retroactive check — запускается один раз для существующих пользователей
 * Проверяет историю в БД и выдаёт все заслуженные ачивки
 */
export async function retroCheckAchievements(supabase, profile, updateProfile, userId) {
  if (!profile || !supabase) return []
  const uid = userId || profile.id
  const earned = []
  let localProfile = { ...profile }

  async function award(key) {
    if (hasAchievement(localProfile, key)) return
    const ok = await earnAchievement(supabase, localProfile, key, updateProfile)
    if (ok) {
      earned.push(key)
      localProfile = { ...localProfile,
        achievements: [...(localProfile.achievements||[]), { key, earned_at: new Date().toISOString() }]
      }
    }
  }

  await award('first_login')

  if (localProfile.body_mode && localProfile.body_mode !== 'prefer_not' && localProfile.gender) {
    await award('profile_complete')
  }

  // Цикл
  try {
    const { count: cycleCount } = await supabase
      .from('cycle_entries').select('id', { count: 'exact', head: true })
      .eq('user_id', uid)
    if (cycleCount > 0) await award('first_cycle_log')
    if (cycleCount >= 21) await award('cycles_3')
    if (cycleCount >= 42) await award('cycles_6')
  } catch {}

  // Настроение
  try {
    const { count: moodCount } = await supabase
      .from('mood_entries').select('id', { count: 'exact', head: true })
      .eq('user_id', uid)
    if (moodCount > 0) await award('first_mood')
    if (moodCount >= 10) await award('diary_10')
  } catch {}

  // Лекарства — таблица medications в Supabase
  try {
    const { count: medsCount } = await supabase
      .from('medications').select('id', { count: 'exact', head: true })
      .eq('user_id', uid)
    if (medsCount > 0) await award('first_medication')
  } catch {
    const meds = localProfile?.health?.medications || []
    if (meds.length > 0) await award('first_medication')
  }

  // Спорт
  try {
    const { count: sportCount } = await supabase
      .from('sport_logs').select('id', { count: 'exact', head: true })
      .eq('user_id', uid)
    if (sportCount > 0) await award('first_sport')
    if (sportCount >= 10) await award('sport_10')
  } catch {}

  // Тесты — хранятся в localStorage
  try {
    const raw = localStorage.getItem('elara_test_results_' + uid)
    const testResults = raw ? JSON.parse(raw) : {}
    const testCount = Object.keys(testResults).length
    if (testCount > 0) await award('first_test')
    if (testCount >= 3) await award('tests_3')
  } catch {}

  // Друзья
  try {
    const { count: friendCount } = await supabase
      .from('friendships').select('id', { count: 'exact', head: true })
      .eq('owner_id', uid)
    if (friendCount > 0) await award('first_friend')
  } catch {}

  // Беременность
  if (localProfile?.body_mode === 'pregnancy_planning' ||
      localProfile?.body_mode === 'pregnancy') {
    await award('pregnancy_prep')
  }

  // Стрики — по дате создания профиля
  try {
    const createdAt = localProfile?.created_at || localProfile?.inserted_at
    if (createdAt) {
      const daysSince = (Date.now() - new Date(createdAt).getTime()) / 86400000
      if (daysSince >= 7) await award('streak_7')
      if (daysSince >= 30) await award('streak_30')
    }
  } catch {}

  // Модули — localStorage
  try {
    const visited = JSON.parse(localStorage.getItem('elara_visited_modules') || '[]')
    if (visited.length >= 5) await award('module_explorer')
  } catch {}


  // Питание - локальные меню
  try {
    const menus = JSON.parse(localStorage.getItem('elara_menus_' + uid) || '[]')
    if (Array.isArray(menus) && menus.length > 0) await award('nutrition_started')
  } catch {}

  // Первая помощь / аптечка - локальные флаги
  try {
    const kit = JSON.parse(localStorage.getItem('elara_first_aid_kit_' + uid) || '{}')
    if (Object.keys(kit).length > 0) await award('kit_started')
  } catch {}

  return earned
}
