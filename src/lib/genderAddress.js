// ─── Динамическое обращение по роду ───────────────────────────────────────
// profile.pronouns: 'she' | 'he' | 'they' | '' (auto по gender)
// profile.address_style: 'auto' | 'neutral' | 'minimal' | 'classic'
// profile.gender: 'cis_woman' | 'cis_man' | 'non_binary' | etc

/**
 * Определяет режим обращения по профилю
 * @returns 'she' | 'he' | 'they' | 'neutral'
 */
export function getAddressMode(profile) {
  const p = profile?.pronouns || ''
  if (p === 'she' || p === 'она' || p === 'she/her') return 'she'
  if (p === 'he'  || p === 'он'  || p === 'he/him')  return 'he'
  if (p === 'they'|| p === 'они' || p === 'they/them') return 'they'

  // Авто — определяем по гендеру
  const g = profile?.gender || ''
  if (['cis_woman', 'trans_woman', 'female', 'woman'].includes(g)) return 'she'
  if (['cis_man', 'trans_man', 'male', 'man'].includes(g)) return 'he'
  if (['non_binary', 'nonbinary', 'agender', 'genderfluid',
       'genderqueer', 'two_spirit', 'neutrois', 'maverique'].includes(g)) return 'they'

  return 'neutral' // неизвестно — нейтральная скобочная форма
}

/**
 * Возвращает нужную форму слова по обращению
 * @param {object} profile
 * @param {string} she   - женская форма (почувствовала)
 * @param {string} he    - мужская форма (почувствовал)
 * @param {string} they  - форма "они" (почувствовали) — если не задана, используется neutral
 * @param {string} neutral - нейтральная скобочная форма (почувствовал(а)) — если не задана, строится авто
 */
export function gForm(profile, she, he, they = null, neutral = null) {
  const mode = getAddressMode(profile)
  const autoNeutral = neutral || (she === he ? she : `${he}(а)`)

  if (mode === 'she')     return she
  if (mode === 'he')      return he
  if (mode === 'they')    return they || `${he}(и)` || autoNeutral
  return autoNeutral  // neutral или неизвестно
}

/**
 * Склоняет глагол-связку для "они"
 * ты чувствовал → вы/они чувствовали
 * (простое правило: добавляем -и к основе прошедшего времени)
 */
export function gVerb(profile, she, he, they = null) {
  return gForm(profile, she, he, they)
}

/**
 * Краткая форма: возвращает "он"/"она"/"они"/"этот человек"
 */
export function gPronoun(profile) {
  const mode = getAddressMode(profile)
  if (mode === 'she') return 'она'
  if (mode === 'he')  return 'он'
  if (mode === 'they') return 'они'
  return 'этот человек'
}
