import { useEffect, useState } from 'react'
import { PinSetup } from '../components/AppLock'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useLang } from '../context/LangContext'
import InfoTooltip from '../components/InfoTooltip'
import { GENDER_IDENTITIES_EXTENDED, ORIENTATIONS, BODY_MODULE_OPTIONS, BODY_MODULE_LABELS, getDefaultBodyModulesForGender, resolveBodyModules, getGenderRecommendationCards } from '../lib/profileModules'

function IdentityInfoPopup({ item, lang, onClose }) {
  if (!item) return null
  const desc = lang === 'en' ? item.descEn : item.descRu
  if (!desc) return null
  return (
    <div style={{ marginTop:8, padding:'10px 12px', borderRadius:10,
      background:'rgba(167,139,250,0.08)', border:'1px solid rgba(167,139,250,0.2)',
      fontSize:12, color:'var(--text2)', lineHeight:1.65, position:'relative' }}>
      <button type="button" onClick={onClose}
        style={{ position:'absolute', top:6, right:8, background:'none', border:'none',
          color:'var(--text3)', cursor:'pointer', fontSize:14, lineHeight:1 }}>×</button>
      <strong style={{ color:'var(--text)', display:'block', marginBottom:4 }}>
        {lang === 'en' ? item.en : item.ru}
      </strong>
      {desc}
    </div>
  )
}

export default function ProfilePage() {
  const { user, profile, updateProfile, signOut } = useAuth()
  const { themeKey, setThemeKey, themes } = useTheme()
  const { t, lang, setLang } = useLang()
  const navigate = useNavigate()
  const [name, setName] = useState(profile?.name || '')
  const [gender, setGender] = useState(profile?.gender || profile?.gender_identity || 'prefer_not')
  const [customGenderLabel, setCustomGenderLabel] = useState(profile?.gender_label_custom || '')
  const [bodyModules, setBodyModules] = useState(() => resolveBodyModules(profile || {}))
  const [addressStyle, setAddressStyle] = useState(profile?.address_style || 'auto')
  const [orientation, setOrientation] = useState(profile?.orientation || 'prefer_not')
  const [pronouns, setPronouns] = useState(profile?.pronouns || '')
  const [ageMode, setAgeMode] = useState(profile?.age_mode || 'adult')
  const [birthYear, setBirthYear] = useState(profile?.birth_year || '')
  const [saving, setSaving] = useState(false)
  const [showBodyModules, setShowBodyModules] = useState(false)
  const [genderInfoKey, setGenderInfoKey] = useState(null)
  const [orientInfoKey, setOrientInfoKey] = useState(null)
  const [saved, setSaved] = useState(false)
  const [secretTaps, setSecretTaps] = useState(0)
  const [hasPIN, setHasPIN] = useState(!!localStorage.getItem('elara_pin_hash'))
  const [showPinSettings, setShowPinSettings] = useState(false)
  const [diaryLockEnabled, setDiaryLockEnabled] = useState(() => {
    const explicit = user?.id ? localStorage.getItem(`elara_diary_lock_${user.id}`) : null
    const legacy = user?.id ? localStorage.getItem(`elara_diary_pw_${user.id}`) === '1' : false
    return explicit === '1' || (explicit === null && legacy)
  })
  const [diaryPasswordSet, setDiaryPasswordSet] = useState(() => user?.id ? !!localStorage.getItem(`elara_diary_pw_hash_${user.id}`) || localStorage.getItem(`elara_diary_pw_${user.id}`) === '1' : false)

  useEffect(() => {
    const refreshPrivacyState = () => {
      setHasPIN(!!localStorage.getItem('elara_pin_hash'))
      if (!user?.id) return
      const explicit = localStorage.getItem(`elara_diary_lock_${user.id}`)
      const legacy = localStorage.getItem(`elara_diary_pw_${user.id}`) === '1'
      setDiaryLockEnabled(explicit === '1' || (explicit === null && legacy))
      setDiaryPasswordSet(!!localStorage.getItem(`elara_diary_pw_hash_${user.id}`) || legacy)
    }
    refreshPrivacyState()
    window.addEventListener('storage', refreshPrivacyState)
    window.addEventListener('elara-lock-change', refreshPrivacyState)
    window.addEventListener('focus', refreshPrivacyState)
    return () => {
      window.removeEventListener('storage', refreshPrivacyState)
      window.removeEventListener('elara-lock-change', refreshPrivacyState)
      window.removeEventListener('focus', refreshPrivacyState)
    }
  }, [user?.id])

  async function setPIN(pin) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin))
    const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('')
    localStorage.setItem('elara_pin_hash', hash)
    sessionStorage.setItem('elara_unlocked', '1')
    setHasPIN(true)
  }

  function removePIN() {
    localStorage.removeItem('elara_pin_hash')
    sessionStorage.setItem('elara_unlocked', '1')
    setHasPIN(false)
  }

  function toggleDiaryLock() {
    if (!user?.id) return
    const next = !diaryLockEnabled
    setDiaryLockEnabled(next)
    if (next) {
      localStorage.setItem(`elara_diary_lock_${user.id}`, '1')
    } else {
      // Выключаем запрос пароля, но не уничтожаем ключ сразу.
      // Иначе старые зашифрованные записи можно случайно потерять для чтения.
      localStorage.setItem(`elara_diary_lock_${user.id}`, '0')
    }
    window.dispatchEvent(new Event('elara-lock-change'))
    setSaved(true); setTimeout(() => setSaved(false), 1000)
  }

  function handleSecretTap() {
    const next = secretTaps + 1
    setSecretTaps(next)
    if (next >= 7) { setSecretTaps(0); if (user?.email === 'krimikarina@gmail.com') navigate('/admin') }
    setTimeout(() => setSecretTaps(0), 3000)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)

    await updateProfile({
      name: name.trim(),
      gender,
      gender_identity: gender,
      gender_label_custom: customGenderLabel.trim() || null,
      body_modules: bodyModules,
      address_style: addressStyle,
      orientation,
      pronouns,
      language: lang,
      age_mode: ageMode,
      birth_year: birthYear ? parseInt(birthYear) : null,
    })

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const isTeen = ageMode === 'teen'

  // Скрываем менструальные настройки для мужчин и тех, у кого нет месячных
  // Гендер НЕ управляет медицинскими модулями - только bodyMode

  return (
    <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', padding:'24px 20px', gap:18, overflowY:'auto' }}>
      <h2 style={{ fontSize:30 }}>{t.profileTitle}</h2>

      {/* Аватар — 7 тапов = админка */}
      <div style={{ textAlign:'center', padding:'18px', background:'var(--bg2)', borderRadius:16, border:'1px solid var(--border)' }}>
        <div style={{ position:'relative', width:72, height:72, margin:'0 auto 10px', cursor:'default' }}
          onClick={handleSecretTap}>
          <div style={{ width:72, height:72, borderRadius:'50%', background:'var(--accent-soft)', border:'2px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, overflow:'hidden' }}>
            <span style={{ fontSize:28 }}>{profile?.name?.[0]?.toUpperCase() || '✦'}</span>
          </div>
          
        </div>
        <div style={{ fontSize:18, fontFamily:'Cormorant Garamond, serif' }}>{profile?.name}</div>
        <div style={{ fontSize:11, color:'var(--text3)', letterSpacing:'0.2em', marginTop:4 }}>{profile?.invite_code}</div>
        {secretTaps > 3 && secretTaps < 7 && (
          <div style={{ fontSize:9, color:'var(--text3)', marginTop:4 }}>{'·'.repeat(7 - secretTaps)}</div>
        )}
      </div>

      {/* ── Гайд по приложению — сразу под аватаркой ── */}
      <button type="button" onClick={() => navigate('/how-it-works')}
        style={{ width:'100%', padding:'14px 16px', borderRadius:14, cursor:'pointer',
          display:'flex', alignItems:'center', gap:12, textAlign:'left',
          background:'linear-gradient(135deg, rgba(167,139,250,0.15), rgba(74,222,128,0.08))',
          border:'1px solid rgba(167,139,250,0.35)', color:'var(--text)' }}>
        <span style={{ fontSize:22 }}>💡</span>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:15, fontWeight:600 }}>{lang==='en'?'App guide':'Гайд по приложению'}</div>
          <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>
            {lang==='en'?'Navigation, AI, privacy, FAQ':'Навигация, AI, приватность, FAQ'}
          </div>
        </div>
        <span style={{ fontSize:18, color:'rgba(167,139,250,0.7)' }}>›</span>
      </button>

      {/* Ачивки */}
      <button type="button" onClick={() => navigate('/achievements')}
        style={{ width:'100%', padding:'12px 16px', borderRadius:12, cursor:'pointer',
          display:'flex', alignItems:'center', gap:12, textAlign:'left',
          background:'var(--bg2)', border:'1px solid var(--border)', color:'var(--text)' }}>
        <span style={{ fontSize:20 }}>🏆</span>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:500 }}>
            {lang==='en'?'Achievements':'Достижения'}
          </div>
          <div style={{ fontSize:11, color:'var(--text3)', marginTop:1 }}>
            {((profile?.achievements)||[]).length} {lang==='en'?'earned':'получено'}
          </div>
        </div>
        <span style={{ color:'var(--text3)' }}>›</span>
      </button>

      <button
        type="button"
        onClick={() => navigate('/body-mode')}
        className="card"
        style={{
          width:'100%',
          padding:16,
          display:'flex',
          alignItems:'center',
          justifyContent:'space-between',
          gap:12,
          textAlign:'left',
          cursor:'pointer',
          border:'1px solid var(--border)',
          color:'var(--text)',
        }}
      >
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          <div style={{ fontSize:16, fontWeight:700 }}>
            🧬 {lang==='en'?'Body mode and recommendations':'Режим тела и рекомендации'}
          </div>
          <div style={{ fontSize:12, color:'var(--text3)', lineHeight:1.5 }}>
            {lang==='en'
              ? 'Periods, pregnancy, menopause, GAHT/HRT, PCOS, postpartum period and other body states.'
              : 'Месячные, беременность, менопауза, ГАТ/ЗГТ, СПКЯ, послеродовой период и другие состояния.'}
          </div>
        </div>
        <span style={{ fontSize:24, color:'var(--text3)', flexShrink:0 }}>›</span>
      </button>

      <button
        type="button"
        onClick={() => navigate('/profile-setup')}
        className="card"
        style={{
          width:'100%',
          padding:16,
          display:'flex',
          alignItems:'center',
          justifyContent:'space-between',
          gap:12,
          textAlign:'left',
          cursor:'pointer',
          border:'1px solid var(--border)',
          color:'var(--text)',
        }}
      >
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          <div style={{ fontSize:16, fontWeight:700 }}>
            ✨ {lang==='en'?'Setup wizard':'Мастер настройки'}
          </div>
          <div style={{ fontSize:12, color:'var(--text3)', lineHeight:1.5 }}>
            {lang==='en'
              ? 'Review goals, body mode, privacy and what Elara will show, calculate and suggest.'
              : 'Цели, режим тела, приватность и итог: что Elara будет показывать, считать и подсказывать.'}
          </div>
        </div>
        <span style={{ fontSize:24, color:'var(--text3)', flexShrink:0 }}>›</span>
      </button>

      {/* Форма */}
      <form onSubmit={handleSave} className="card" style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div>
          <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>{t.editName}</div>
          <input value={name} onChange={e => setName(e.target.value)} />
        </div>

        {/* Гендер — выпадающее меню */}
        <div>
          {/* Местоимения — необязательно */}
          <div>
            <div style={{ fontSize:11, color:'var(--text3)', marginBottom:5 }}>
              {lang==='en'?'Pronouns (optional)':'Местоимения (необязательно)'}
            </div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:4 }}>
              {['она/её','он/его','они/их','без местоимений'].map(p => (
                <button key={p} type="button" onClick={() => setPronouns(p===pronouns?'':p)} style={{
                  padding:'5px 12px', borderRadius:20, fontSize:12, cursor:'pointer',
                  border:`1px solid ${pronouns===p?'var(--accent)':'var(--border)'}`,
                  background:pronouns===p?'var(--accent-soft)':'transparent',
                  color:pronouns===p?'var(--accent)':'var(--text2)',
                }}>{p}</button>
              ))}
            </div>
            <input placeholder={lang==='en'?'Or type your own...':'Или свой вариант...'}
              value={pronouns} onChange={e => setPronouns(e.target.value)}
              style={{ fontSize:12 }} />
          </div>

          <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>{t.gender}</div>
          <select value={gender} onChange={e => {
            const next = e.target.value
            setGender(next)
            setBodyModules(prev => prev?.length ? prev : getDefaultBodyModulesForGender(next))
          }}
            style={{ width:'100%', padding:'12px 14px', borderRadius:8, background:'var(--bg2)', border:'1px solid var(--border)', color:'var(--text)', fontSize:13, cursor:'pointer' }}>
            {GENDER_IDENTITIES_EXTENDED.map(item => (
              <option key={item.key} value={item.key}>{lang === 'en' ? item.en : item.ru}</option>
            ))}
          </select>
          <IdentityInfoPopup
            item={GENDER_IDENTITIES_EXTENDED.find(x => x.key === genderInfoKey)}
            lang={lang}
            onClose={() => setGenderInfoKey(null)}
          />

          {gender === 'custom' && (
            <input
              value={customGenderLabel}
              onChange={e => setCustomGenderLabel(e.target.value)}
              placeholder={lang==='en'?'Type your identity label':'Напиши свой вариант'}
              style={{ marginTop:8, fontSize:12 }}
            />
          )}
        </div>

        <div className="card" style={{ padding:14 }}>
          <button type="button" onClick={() => setShowBodyModules(p=>!p)} style={{
            width:'100%', display:'flex', justifyContent:'space-between', alignItems:'center',
            background:'none', border:'none', cursor:'pointer', padding:0, textAlign:'left',
          }}>
            <span style={{ fontSize:13, fontWeight:700, color:'var(--text)' }}>🧩 {lang==='en'?'Body modules':'Функции тела'} ({bodyModules.length})</span>
            <span style={{ color:'var(--text3)', fontSize:14 }}>{showBodyModules ? '▲' : '▼'}</span>
          </button>
          {showBodyModules && (
            <div style={{ marginTop:10 }}>
              <div style={{ fontSize:12, color:'var(--text3)', lineHeight:1.5, marginBottom:10 }}>
                {lang==='en'
                  ? 'These modules control medical and calendar logic, not appearance.'
                  : 'Эти модули управляют медицинской и календарной логикой, а не интерфейсом.'}
              </div>
              <div style={{ display:'grid', gap:8 }}>
                {BODY_MODULE_OPTIONS.map(item => {
                  const active = bodyModules.includes(item.key)
                  return (
                    <button key={item.key} type="button"
                      onClick={() => setBodyModules(prev => active ? prev.filter(x => x !== item.key) : [...prev, item.key])}
                      style={{
                        textAlign:'left', padding:'10px 12px', borderRadius:12, cursor:'pointer',
                        border:`1px solid ${active?'var(--accent)':'var(--border)'}`,
                        background:active?'var(--accent-soft)':'transparent', color:'var(--text)'
                      }}>
                      <div style={{ display:'flex', justifyContent:'space-between', gap:8 }}>
                        <strong>{item.emoji} {lang === 'en' ? item.en : item.ru}</strong>
                        <span style={{ color:active?'var(--accent)':'var(--text3)' }}>{active?'✓':'+'}</span>
                      </div>
                      <div style={{ fontSize:11, color:'var(--text3)', lineHeight:1.45, marginTop:4 }}>
                        {lang === 'en' ? item.description_en : item.description_ru}
                      </div>
                    </button>
                  )
                })}
              </div>
              <div style={{ display:'flex', gap:8, marginTop:10, flexWrap:'wrap' }}>
                <button type="button" onClick={() => setBodyModules(getDefaultBodyModulesForGender(gender))}
                  className="btn btn-ghost" style={{ width:'auto', padding:'7px 11px', fontSize:12 }}>
                  {lang==='en'?'Use suggested':'Поставить рекомендованные'}
                </button>
                <button type="button" onClick={() => setBodyModules([])}
                  className="btn btn-ghost" style={{ width:'auto', padding:'7px 11px', fontSize:12 }}>
                  {lang==='en'?'Clear':'Очистить'}
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="card" style={{ padding:14, background:'linear-gradient(135deg, rgba(167,139,250,0.12), rgba(74,222,128,0.07))', border:'1px solid var(--border)' }}>
          <div style={{ fontSize:13, fontWeight:700, marginBottom:8 }}>✨ {lang==='en'?'Logic for your settings':'Логика под твои настройки'}</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {getGenderRecommendationCards({ ...(profile || {}), gender, gender_identity: gender, body_modules: bodyModules }, lang).map(card => (
              <div key={card.key} style={{ padding:'9px 10px', borderRadius:12, border:'1px solid var(--border)', background:'rgba(255,255,255,0.035)' }}>
                <div style={{ fontSize:13, fontWeight:700 }}>{card.icon} {card.title}</div>
                <div style={{ fontSize:12, color:'var(--text2)', lineHeight:1.5, marginTop:3 }}>{card.text}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontSize:11, color:'var(--text3)', marginBottom:5 }}>{lang==='en'?'Wording style':'Стиль формулировок'}</div>
          <select value={addressStyle} onChange={e => setAddressStyle(e.target.value)} style={{ width:'100%', padding:'12px 14px', borderRadius:8, background:'var(--bg2)', border:'1px solid var(--border)', color:'var(--text)', fontSize:13 }}>
            <option value="auto">{lang==='en'?'Auto by language/pronouns':'Авто по языку и местоимениям'}</option>
            <option value="neutral">{lang==='en'?'Neutral words':'Нейтральные слова: кровотечение, телесный цикл'}</option>
            <option value="minimal">{lang==='en'?'Minimal labels/icons':'Минимум слов, больше значков'}</option>
            <option value="classic">{lang==='en'?'Classic medical terms':'Обычные мед. термины: месячные, овуляция'}</option>
          </select>
        </div>

        {/* Ориентация — ВСЕГДА показывается независимо от пола/гендера */}
        {t.orientations && (
          <div>
            <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>
              {lang==='en'?'Orientation':lang==='be'?'Арыентацыя':'Ориентация'}
            </div>
            <div style={{ display:'flex', gap:6, alignItems:'center' }}>
              <select value={orientation} onChange={e => setOrientation(e.target.value)}
                style={{ flex:1, padding:'12px 14px', borderRadius:8, background:'var(--bg2)', border:'1px solid var(--border)', color:'var(--text)', fontSize:13, cursor:'pointer' }}>
                {Object.entries(t.orientations).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
          <IdentityInfoPopup
            item={ORIENTATIONS?.find(x => x.key === orientInfoKey)}
            lang={lang}
            onClose={() => setOrientInfoKey(null)}
          />
              <InfoTooltip id={orientation} label={t.orientations?.[orientation]} />
            </div>
          </div>
        )}


        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saved ? t.saved : saving ? '...' : t.save}
        </button>
      </form>

      {/* Возраст */}
      <div className="card">
        <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>
          {lang==='en'?'Age mode':lang==='be'?'Узроставы рэжым':'Возрастной режим'}
        </div>
        <div style={{ display:'flex', gap:8, marginBottom: ageMode==='teen'?10:0 }}>
          <button onClick={() => setAgeMode('adult')} style={{
            flex:1, padding:'10px', borderRadius:8, fontSize:13, cursor:'pointer',
            border:`1px solid ${ageMode==='adult'?'var(--accent)':'var(--border)'}`,
            background:ageMode==='adult'?'var(--accent-soft)':'transparent',
            color:ageMode==='adult'?'var(--accent)':'var(--text2)',
          }}>18+</button>
          <button onClick={() => setAgeMode('teen')} style={{
            flex:1, padding:'10px', borderRadius:8, fontSize:13, cursor:'pointer',
            border:`1px solid ${ageMode==='teen'?'#f472b6':'var(--border)'}`,
            background:ageMode==='teen'?'rgba(244,114,182,0.12)':'transparent',
            color:ageMode==='teen'?'#f472b6':'var(--text2)',
          }}>🌸 {lang==='en'?'Under 18':'До 18'}</button>
        </div>
        {ageMode === 'teen' && (
          <div>
            <div style={{ fontSize:11, color:'var(--text3)', marginBottom:6 }}>{lang==='en'?'Birth year':'Год рождения'}</div>
            <input type="number" placeholder="2008" min="2000" max={new Date().getFullYear()-10}
              value={birthYear} onChange={e => setBirthYear(e.target.value)}
              style={{ textAlign:'center', fontSize:16, letterSpacing:'0.1em' }} />
          </div>
        )}
        <button onClick={async () => {
          await updateProfile({ age_mode: ageMode, birth_year: birthYear ? parseInt(birthYear) : null })
          setSaved(true); setTimeout(() => setSaved(false), 1500)
        }} style={{ marginTop:10, background:'none', border:'1px solid var(--border)', borderRadius:6, color:'var(--text2)', fontSize:12, padding:'6px 12px', cursor:'pointer' }}>
          {saved ? '✓' : lang==='en'?'Save':'Сохранить'}
        </button>
        {ageMode === 'teen' && (
          <button onClick={() => navigate('/teen-parent')} style={{
            marginTop:8, width:'100%', padding:'11px', borderRadius:8, fontSize:13, cursor:'pointer',
            border:'1px solid #f472b6', background:'rgba(244,114,182,0.08)',
            color:'#f472b6', display:'flex', alignItems:'center', justifyContent:'center', gap:8,
          }}>
            👩‍👧 {lang==='en'?'Add parent':'Добавить родителя'}
          </button>
        )}
      </div>

      {/* Язык */}
      <div className="card">
        <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>{t.language}</div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {(() => {
            const stored = localStorage.getItem('elara_enabled_langs')
            const enabled = stored ? JSON.parse(stored) : ['ru','be','en']
            const ALL = [
              { code:'ru', label:'Русский 🇷🇺' },
              { code:'be', label:'Беларуская 🇧🇾' },
              { code:'en', label:'English 🇬🇧' },
              { code:'uk', label:'Українська 🇺🇦' },
              { code:'pl', label:'Polski 🇵🇱' },
              { code:'de', label:'Deutsch 🇩🇪' },
              { code:'fr', label:'Français 🇫🇷' },
              { code:'tr', label:'Türkçe 🇹🇷' },
              { code:'es', label:'Español 🇪🇸' },
              { code:'kz', label:'Қазақша 🇰🇿' },
            ]
            return ALL.filter(l => enabled.includes(l.code)).map(({ code, label }) => (
              <button key={code} onClick={() => setLang(code)} style={{
                padding:'9px 12px', borderRadius:8, fontSize:12, cursor:'pointer',
                border:`1px solid ${lang===code?'var(--accent)':'var(--border)'}`,
                background:lang===code?'var(--accent-soft)':'transparent',
                color:lang===code?'var(--accent)':'var(--text2)',
              }}>{label}</button>
            ))
          })()}
        </div>
        {lang !== 'ru' && (
          <button onClick={() => {
            localStorage.removeItem(`elara_t_${lang}`)
            window.location.reload()
          }} style={{ marginTop:8, fontSize:11, color:'var(--text3)', background:'none', border:'1px solid var(--border)', borderRadius:6, padding:'4px 10px', cursor:'pointer' }}>
            🔄 {lang==='en'?'Re-translate interface':'Переперевести интерфейс'}
          </button>
        )}
      </div>

      {/* Тема */}
      <div className="card">
        <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>{t.theme}</div>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {Object.entries(themes)
            .filter(([, th]) => isTeen ? !!th.teen : !th.teen)
            .map(([key, th]) => (
            <button key={key} onClick={() => setThemeKey(key)} style={{
              display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
              borderRadius:8, cursor:'pointer', transition:'all 0.15s',
              border:themeKey===key?`1px solid ${th['--accent']}`:'1px solid var(--border)',
              background:themeKey===key?th['--accent-soft']:'transparent',
            }}>
              <div style={{ display:'flex', gap:4 }}>
                {[th['--accent'],th['--self'],th['--text2']].map((c,i) => (
                  <div key={i} style={{ width:13, height:13, borderRadius:'50%', background:c }} />
                ))}
              </div>
              <span style={{ color:'var(--text)', fontSize:13 }}>{th.name}</span>
              {themeKey===key && <span style={{ marginLeft:'auto', color:'var(--accent)', fontSize:12 }}>✓</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Меню профиля */}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {/* Медицинские и рабочие настройки выше всего */}
        {profile?.body_mode === 'on_hormones' && (
          <button className="btn btn-ghost" onClick={() => navigate('/dysphoria')} style={{ justifyContent:'flex-start', gap:10, color:'#a78bfa', borderColor:'rgba(167,139,250,0.3)' }}>
            💜 {lang==='en'?'Dysphoria journal':'Дневник дисфории'}
          </button>
        )}
        {profile?.body_mode === 'pregnant' && (
          <button className="btn btn-ghost" onClick={() => navigate('/pregnancy')} style={{ justifyContent:'flex-start', gap:10 }}>
            🌸 {lang==='en'?'Pregnancy':'Беременность'}
          </button>
        )}
        <button className="btn btn-ghost" onClick={() => navigate('/appearance')} style={{ justifyContent:'flex-start', gap:10 }}>
          🎨 {lang==='en'?'Appearance':'Оформление'}
        </button>
        <button className="btn btn-ghost" onClick={() => navigate('/notification-settings')} style={{ justifyContent:'flex-start', gap:10 }}>
          🔔 {lang==='en'?'Notifications':'Уведомления'}
        </button>
        <button className="btn btn-ghost" onClick={() => navigate('/modules')} style={{ justifyContent:'flex-start', gap:10 }}>
          ⚙️ {lang==='en'?'What to track':'Что отслеживать'}
        </button>
        <button className="btn btn-ghost" onClick={() => navigate('/export')} style={{ justifyContent:'flex-start', gap:10 }}>
          📋 {lang==='en'?'Doctor report / export':'Отчёт для врача'}
        </button>
        <button className="btn btn-ghost" onClick={() => navigate('/view-log')} style={{ justifyContent:'flex-start', gap:10 }}>
          👁 {lang==='en'?'Who viewed my data':'Кто смотрел мои данные'}
        </button>
        <button className="btn btn-ghost" onClick={() => navigate('/tests')} style={{ justifyContent:'flex-start', gap:10 }}>
          🧪 {lang==='en'?'Clinical tests':'Клинические тесты'}
        </button>
        <button className="btn btn-ghost" onClick={() => navigate('/personalization')} style={{ justifyContent:'flex-start', gap:10 }}>
          ✦ {lang==='en'?'Personalization':'Персонализация AI'}
        </button>
        <button className="btn btn-ghost" onClick={() => navigate('/feedback')} style={{ justifyContent:'flex-start', gap:10 }}>
          💬 {lang==='en'?'Feedback':'Обратная связь'}
        </button>

        {/* PIN и скрытый PIN */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', background:'var(--bg2)', borderRadius:10, border:'1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize:13 }}>🔒 {lang==='en'?'Privacy lock':'Приватный вход'}</div>
            <div style={{ fontSize:11, color:'var(--text3)', lineHeight:1.45 }}>
              {hasPIN
                ? (lang==='en'?'PIN is set. Ghost PIN can hide sensitive sections.':'PIN установлен. Скрытый PIN можно настроить внутри.')
                : (lang==='en'?'Set a real PIN first, then add Ghost PIN.':'Сначала установи основной PIN, потом можно добавить скрытый PIN.')}
            </div>
            {ageMode === 'teen' && (
              <div style={{ fontSize:11, color:'#f472b6', marginTop:4 }}>
                🎭 {lang==='en'?'Teen mode: Ghost PIN is available here.':'Подростковый режим: здесь настраивается скрытый PIN.'}
              </div>
            )}
          </div>
          <button onClick={() => setShowPinSettings(true)} style={{ padding:'6px 12px', borderRadius:8, border:'1px solid var(--border)', background:'var(--bg3)', color:'var(--accent)', fontSize:12, cursor:'pointer' }}>
            {hasPIN ? (lang==='en'?'Settings':'Настроить') : (lang==='en'?'Set PIN':'Установить')}
          </button>
        </div>

        {/* Пароль дневника */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', background:'var(--bg2)', borderRadius:10, border:'1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize:13 }}>📓 {lang==='en'?'Diary password':'Пароль дневника'}</div>
            <div style={{ fontSize:11, color:'var(--text3)', lineHeight:1.45 }}>
              {diaryLockEnabled
                ? (diaryPasswordSet
                    ? (lang==='en'?'Enabled. Diary opens with a separate password.':'Включён. Дневник открывается отдельным паролем.')
                    : (lang==='en'?'Enabled. Open Diary to create the password.':'Включён. Открой дневник, чтобы задать пароль.'))
                : (lang==='en'?'Off. Diary opens without an extra password.':'Выключен. Дневник открывается без отдельного пароля.')}
            </div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <button type="button" onClick={() => navigate('/diary')} style={{ padding:'6px 10px', borderRadius:8, border:'1px solid var(--border)', background:'transparent', color:'var(--text2)', fontSize:12, cursor:'pointer' }}>
              {lang==='en'?'Open':'Открыть'}
            </button>
            <button type="button" onClick={toggleDiaryLock} style={{
              width:44, height:24, borderRadius:12, cursor:'pointer', border:'none', flexShrink:0,
              background:diaryLockEnabled?'#f472b6':'var(--bg3)', position:'relative', transition:'all 0.2s',
            }}>
              <div style={{ position:'absolute', top:2, left:diaryLockEnabled?22:2, width:20, height:20, borderRadius:'50%', background:'#fff', transition:'left 0.2s' }} />
            </button>
          </div>
        </div>

        {/* Режим маскировки уведомлений */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', background:'var(--bg2)', borderRadius:10, border:'1px solid var(--border)' }}>
          <div>
            <div style={{ fontSize:13 }}>🔔 {lang==='en'?'Hidden notifications':'Скрытые уведомления'}</div>
            <div style={{ fontSize:11, color:'var(--text3)' }}>{lang==='en'? '"Reminder" instead of medication name':'"Напоминание" вместо названия препарата'}</div>
          </div>
          <button onClick={() => {
            const cur = localStorage.getItem('elara_mask_notifications')
            if (cur) localStorage.removeItem('elara_mask_notifications')
            else localStorage.setItem('elara_mask_notifications', '1')
            setSaved(true); setTimeout(() => setSaved(false), 800)
          }} style={{
            width:44, height:24, borderRadius:12, cursor:'pointer', border:'none', flexShrink:0,
            background:localStorage.getItem('elara_mask_notifications')?'#60a5fa':'var(--bg3)',
            position:'relative', transition:'all 0.2s',
          }}>
            <div style={{ position:'absolute', top:2, left:localStorage.getItem('elara_mask_notifications')?22:2, width:20, height:20, borderRadius:'50%', background:'#fff', transition:'left 0.2s' }} />
          </button>
        </div>

        {/* Информационные и продуктовые пункты ближе к низу */}
        <div style={{ height:8 }} />
        <button className="btn btn-ghost" onClick={() => navigate('/subscription')} style={{ justifyContent:'flex-start', gap:10, borderColor:'var(--accent)', color:'var(--accent)' }}>
          ✦ {lang==='en'?'Subscription':'Подписка'}
        </button>
        
        <button className="btn btn-ghost" onClick={() => navigate('/research')} style={{ justifyContent:'flex-start', gap:10 }}>
          📚 {lang==='en'?'Research base':'Научная база'}
        </button>
        <button className="btn btn-ghost" onClick={() => navigate('/about')} style={{ justifyContent:'flex-start', gap:10 }}>
          🌙 {lang==='en'?'About Elara':'О нас — Elara'}
        </button>

        {/* Развлекательные режимы ниже информационных пунктов */}
        {[
          { key:'elara_dnd_mode', emoji:'🎲', ru:'Режим D&D', en:'D&D Mode', descRu:'Бросать D20 для принятия решений', descEn:'Roll D20 to make decisions', color:'#a78bfa' },
          { key:'elara_oracle_mode', emoji:'🃏', ru:'Карта дня (МАК)', en:'Card of day (MAC)', descRu:'Метафорические карты в Дневнике', descEn:'Metaphoric cards in Diary', color:'#f472b6' },
        ].map(item => {
          const active = !!localStorage.getItem(item.key)
          return (
            <div key={item.key} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 14px', background:'var(--bg2)', borderRadius:10, border:'1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize:13 }}>{item.emoji} {lang==='en'?item.en:item.ru}</div>
                <div style={{ fontSize:11, color:'var(--text3)' }}>{lang==='en'?item.descEn:item.descRu}</div>
              </div>
              <button onClick={() => {
                if (active) localStorage.removeItem(item.key)
                else localStorage.setItem(item.key, '1')
                setSaved(true); setTimeout(() => setSaved(false), 800)
              }} style={{
                width:44, height:24, borderRadius:12, cursor:'pointer', border:'none', flexShrink:0,
                background: active ? item.color : 'var(--bg3)', position:'relative', transition:'all 0.2s',
              }}>
                <div style={{ position:'absolute', top:2, left:active?22:2, width:20, height:20, borderRadius:'50%', background:'#fff', transition:'left 0.2s' }} />
              </button>
            </div>
          )
        })}

        <button className="btn btn-ghost" onClick={signOut}>{t.signOut}</button>

        {/* Режим разработчика - в самом низу и только для аккаунта разработчика */}
        {user?.email === 'krimikarina@gmail.com' && (
          <button className="btn btn-ghost" onClick={() => navigate('/admin')}
            style={{ opacity:0.35, fontSize:11, color:'var(--text3)', border:'1px dashed var(--border)', justifyContent:'center' }}>
            ⚡ {lang==='en'?'Developer mode':'Режим разработчика'}
          </button>
        )}
      </div>

      {showPinSettings && (
        <div onClick={() => {
          setShowPinSettings(false)
          setHasPIN(!!localStorage.getItem('elara_pin_hash'))
        }} style={{
          position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.55)',
          display:'flex', alignItems:'center', justifyContent:'center', padding:18,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            width:'min(420px, 100%)', maxHeight:'90vh', overflowY:'auto',
            background:'var(--bg)', border:'1px solid var(--border)',
            borderRadius:18, boxShadow:'0 20px 60px rgba(0,0,0,0.35)',
          }}>
            <PinSetup onClose={() => {
              setShowPinSettings(false)
              setHasPIN(!!localStorage.getItem('elara_pin_hash'))
            }} />
          </div>
        </div>
      )}
    </div>
  )
}
