// ─── Обращение по роду ──────────────────────────────────────
// Используется везде где нужно учесть address_style / pronouns пользователя

/**
 * Возвращает правильную форму слова по обращению профиля
 * fem - женская форма (почувствовала)
 * masc - мужская форма (почувствовал)  
 * neutral - нейтральная (почувствовал(а))
 * 
 * @param {object} profile - профиль пользователя
 * @param {string} fem - женская форма
 * @param {string} masc - мужская форма
 * @param {string} [neutral] - нейтральная форма (опционально)
 */
export function gForm(profile, fem, masc, neutral = null) {
  const style = profile?.address_style || 'auto'
  const gender = profile?.gender || ''
  
  // Определяем обращение
  const isMale = style === 'male' || 
    (!style || style === 'auto') && ['cis_man', 'trans_man', 'male', 'man'].includes(gender)
  const isFemale = style === 'female' || 
    (!style || style === 'auto') && ['cis_woman', 'trans_woman', 'female', 'woman'].includes(gender)
  const isNeutral = style === 'neutral' || style === 'they' ||
    ['non_binary', 'nonbinary', 'agender', 'genderfluid'].includes(gender)

  if (isMale) return masc
  if (isFemale) return fem
  if (isNeutral) return neutral || `${masc}(а)`
  // По умолчанию нейтральная или женская (большинство пользователей)
  return neutral || fem
}

/**
 * Обращение "ты" / "вы" по настройкам
 */
export function getAddressForm(profile) {
  return profile?.address_style === 'formal' ? 'вы' : 'ты'
}

/**
 * Приветствие с правильным родом
 * Возвращает "ты справилась" / "ты справился" / "ты справился(ась)"
 */
export function gVerb(profile, fem, masc) {
  return gForm(profile, fem, masc)
}
