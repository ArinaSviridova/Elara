export const APP_ZONES = {
  today: {
    path: '/',
    icon: '✦',
    titleRu: 'Сегодня',
    titleEn: 'Today',
    purposeRu: '3-5 важных действий на сегодня, быстрые отметки и ближайшие напоминания.',
    purposeEn: '3-5 important actions for today, quick logs, and upcoming reminders.',
  },
  calendar: {
    path: '/calendar',
    icon: '◯',
    titleRu: 'Календарь',
    titleEn: 'Calendar',
    purposeRu: 'Цикл, фазы, СТМ, настроение по дням, интимные отметки и общие окна.',
    purposeEn: 'Cycle, phases, STM, daily mood, intimacy logs, and shared windows.',
  },
  health: {
    path: '/health',
    icon: '🩺',
    titleRu: 'Здоровье',
    titleEn: 'Health',
    purposeRu: 'Назначения, таблетки, анализы, прививки, чекапы, симптомы и экстренный профиль.',
    purposeEn: 'Prescriptions, meds, labs, vaccines, checkups, symptoms, and emergency profile.',
  },
  circle: {
    path: '/friends',
    icon: '✦',
    titleRu: 'Круг',
    titleEn: 'Circle',
    purposeRu: 'Люди, группы, доступы, синхронизация и общие окна.',
    purposeEn: 'People, groups, access, sync, and shared windows.',
  },
  profile: {
    path: '/profile',
    icon: '⊹',
    titleRu: 'Профиль',
    titleEn: 'Profile',
    purposeRu: 'Персонализация AI, приватность, тело и цели, научная база и настройки.',
    purposeEn: 'AI personalization, privacy, body and goals, research base, and settings.',
  },
}

export const FEATURE_PLACEMENT = [
  {
    key: 'cycle_phases',
    zone: 'calendar',
    titleRu: 'Фазы цикла',
    titleEn: 'Cycle phases',
    whyRu: 'Это календарная логика, а не медицинская вкладка.',
    whyEn: 'This is calendar logic, not a health settings screen.',
  },
  {
    key: 'stm',
    zone: 'calendar',
    titleRu: 'СТМ',
    titleEn: 'STM',
    whyRu: 'Ежедневные признаки удобнее заполнять по дню.',
    whyEn: 'Daily signs are easiest to log from a selected day.',
  },
  {
    key: 'medications',
    zone: 'health',
    titleRu: 'Таблетки',
    titleEn: 'Medications',
    whyRu: 'Это назначение/приём/история препарата.',
    whyEn: 'This is prescription, intake, and medication history.',
  },
  {
    key: 'vaccines',
    zone: 'health',
    titleRu: 'Прививки',
    titleEn: 'Vaccines',
    whyRu: 'Это медицинский паспорт и напоминания о дозах.',
    whyEn: 'This is a medical passport and dose reminders.',
  },
  {
    key: 'doctor_report',
    zone: 'health',
    titleRu: 'Отчёт врачу',
    titleEn: 'Doctor report',
    whyRu: 'Собирает данные из здоровья, календаря и назначений.',
    whyEn: 'Collects data from health, calendar, and prescriptions.',
  },
  {
    key: 'quick_log',
    zone: 'today',
    titleRu: 'Быстрая отметка',
    titleEn: 'Quick log',
    whyRu: 'Частые действия должны быть на главном экране.',
    whyEn: 'Frequent actions belong on the main screen.',
  },
  {
    key: 'ai_personalization',
    zone: 'profile',
    titleRu: 'Персонализация AI',
    titleEn: 'AI personalization',
    whyRu: 'Это настройка поведения приложения.',
    whyEn: 'This configures app behavior.',
  },
  {
    key: 'circle_sync',
    zone: 'circle',
    titleRu: 'Синхронизация круга',
    titleEn: 'Circle sync',
    whyRu: 'Это доступы, люди и общие окна.',
    whyEn: 'This is access, people, and shared windows.',
  },
]

export function suggestZoneForFeature(featureKey) {
  return FEATURE_PLACEMENT.find(item => item.key === featureKey)?.zone || 'health'
}