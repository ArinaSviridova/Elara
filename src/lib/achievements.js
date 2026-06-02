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
    titleRu: 'Исследователь',
    titleEn: 'Explorer',
    descRu: 'Открыл(а) 5 страниц модулей',
    descEn: 'Opened 5 module pages',
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
export async function retroCheckAchievements(supabase, profile, updateProfile) {
  if (!profile || !supabase) return []
  const uid = profile.id
  const earned = []

  async function award(key) {
    if (hasAchievement(profile, key)) return
    const ok = await earnAchievement(supabase, profile, key, updateProfile)
    if (ok) earned.push(key)
    // Обновим локальный профиль чтобы следующий award видел обновлённый список
    if (ok) profile = { ...profile, achievements: [...(profile.achievements||[]), { key, earned_at: new Date().toISOString() }] }
  }

  // ── first_login — всегда ──
  await award('first_login')

  // ── profile_complete ──
  if (profile.body_mode && profile.body_mode !== 'prefer_not' && profile.gender) {
    await award('profile_complete')
  }

  // ── Цикл ──
  const { count: cycleCount } = await supabase
    .from('cycle_entries').select('id', { count: 'exact', head: true })
    .eq('user_id', uid)

  if (cycleCount > 0) {
    await award('first_cycle_log')
  }

  // Считаем уникальные циклы (cycle_number или months)
  if (cycleCount >= 30) await award('cycles_3')
  if (cycleCount >= 90) await award('cycles_6')

  // ── Настроение / дневник ──
  const { count: moodCount } = await supabase
    .from('mood_entries').select('id', { count: 'exact', head: true })
    .eq('user_id', uid)

  if (moodCount > 0) await award('first_mood')
  if (moodCount >= 10) await award('diary_10')

  // ── Лекарства ──
  const meds = profile?.health?.medications || profile?.health?.meds || []
  if (meds.length > 0) await award('first_medication')

  // ── Спорт ──
  const { count: sportCount } = await supabase
    .from('sport_logs').select('id', { count: 'exact', head: true })
    .eq('user_id', uid)

  if (sportCount > 0) await award('first_sport')
  if (sportCount >= 10) await award('sport_10')

  // ── Тесты ──
  const testResults = profile?.test_results || {}
  const testCount = Object.keys(testResults).length
  if (testCount > 0) await award('first_test')
  if (testCount >= 3) await award('tests_3')

  // ── Круг / друзья ──
  const { count: friendCount } = await supabase
    .from('friendships').select('id', { count: 'exact', head: true })
    .eq('owner_id', uid)

  if (friendCount > 0) await award('first_friend')

  // ── Беременность ──
  if (profile?.body_mode === 'pregnancy_planning' || profile?.body_mode === 'pregnancy') {
    await award('pregnancy_prep')
  }

  return earned
}
