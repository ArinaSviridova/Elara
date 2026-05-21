import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'

const isSecure = location.protocol === 'https:' || location.hostname === 'localhost'

async function encryptText(text, password) {
  if (!isSecure || !crypto.subtle) {
    return btoa(unescape(encodeURIComponent(text))) + '.' + password.length
  }
  const enc = new TextEncoder()
  const km = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'])
  const key = await crypto.subtle.deriveKey(
    { name:'PBKDF2', salt:enc.encode('elara-v1'), iterations:100000, hash:'SHA-256' },
    km, { name:'AES-GCM', length:256 }, false, ['encrypt','decrypt']
  )
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt({ name:'AES-GCM', iv }, key, enc.encode(text))
  const combined = new Uint8Array(iv.byteLength + encrypted.byteLength)
  combined.set(iv,0); combined.set(new Uint8Array(encrypted), iv.byteLength)
  return btoa(String.fromCharCode(...combined))
}

async function decryptText(enc64, password) {
  try {
    if (!isSecure || !crypto.subtle) {
      const parts = enc64.split('.')
      if (parts[1] !== String(password.length)) return null
      return decodeURIComponent(escape(atob(parts[0])))
    }
    const enc = new TextEncoder()
    const km = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'])
    const key = await crypto.subtle.deriveKey(
      { name:'PBKDF2', salt:enc.encode('elara-v1'), iterations:100000, hash:'SHA-256' },
      km, { name:'AES-GCM', length:256 }, false, ['encrypt','decrypt']
    )
    const combined = new Uint8Array(atob(enc64).split('').map(c=>c.charCodeAt(0)))
    const decrypted = await crypto.subtle.decrypt({ name:'AES-GCM', iv:combined.slice(0,12) }, key, combined.slice(12))
    return new TextDecoder().decode(decrypted)
  } catch { return null }
}

const TAG_TREE = {
  '😊 радость': {
    color: '#facc15',
    children: ['влюблённость 💕', 'гордость ⭐', 'благодарность 🙏', 'эйфория 🎉', 'спокойствие 🌊']
  },
  '😢 грусть': {
    color: '#60a5fa',
    children: ['тоска 🌧', 'разочарование 😔', 'одиночество 🌑', 'ностальгия 🍂', 'слёзы 💧']
  },
  '😤 злость': {
    color: '#f87171',
    children: ['раздражение ⚡', 'обида 💔', 'ссора 🔥', 'несправедливость ⚖️', 'разочарование в людях 👥']
  },
  '😰 тревога': {
    color: '#fb923c',
    children: ['беспокойство 😬', 'страх 😨', 'паника 🌀', 'неуверенность 🤔', 'стресс 💥']
  },
  '😴 усталость': {
    color: '#a78bfa',
    children: ['выгорание 🔥', 'перегрузка 📚', 'плохой сон 🌙', 'физическая усталость 💪', 'апатия 🪨']
  },
  '💑 отношения': {
    color: '#f472b6',
    children: ['нежность 🥰', 'близость 🤍', 'конфликт 💬', 'непонимание 🤷', 'скучаю 📞', 'поддержка 🫂']
  },
  '👯 подруги': {
    color: '#4ade80',
    children: ['встреча 🥂', 'разговор по душам 💬', 'поддержка подруги 🤗', 'веселье 🎊', 'конфликт с подругой 😶']
  },
  '👨‍👩‍👧 семья': {
    color: '#22d3ee',
    children: ['тепло дома 🏠', 'напряжение 😬', 'забота о близких 💛', 'скучаю по семье 🌸']
  },
  '🩸 цикл': {
    color: '#f87171',
    children: ['боль 😣', 'спазмы 💊', 'слабость 😮‍💨', 'вздутие 😮', 'перепады настроения 🎭', 'ПМС-волна 🌊']
  },
  '💊 здоровье': {
    color: '#86efac',
    children: ['головная боль 🤕', 'недомогание 🤒', 'врач 🏥', 'лекарства 💉', 'хорошее самочувствие ✨']
  },
  '🌸 тело': {
    color: '#f9a8d4',
    children: ['довольна собой 💃', 'не нравлюсь себе 😕', 'спорт 🏃', 'питание 🥗', 'уход за собой 🛁']
  },
  '💼 работа/учёба': {
    color: '#94a3b8',
    children: ['успех 🏆', 'провал 😞', 'дедлайн ⏰', 'вдохновение 💡', 'скучно 😑', 'похвала 🌟']
  },
  '🌍 события': {
    color: '#fbbf24',
    children: ['хорошие новости 📰', 'плохие новости 😟', 'неожиданность 😲', 'важное решение 🎯', 'путешествие ✈️']
  },
  '✨ духовное': {
    color: '#c4b5fd',
    children: ['медитация 🧘', 'осознанность 🌿', 'благодарность богу 🙏', 'вдохновение 🌟', 'смысл жизни 💭']
  },
}

// Все теги плоским списком для предложений AI
const ALL_TAGS_FLAT = Object.entries(TAG_TREE).flatMap(([parent, meta]) => [parent, ...meta.children])

export default function DiaryPage() {
  const { user } = useAuth()
  const { t, lang } = useLang()
  const today = new Date().toISOString().slice(0,10)

  const [unlocked, setUnlocked] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [sessionPw, setSessionPw] = useState('')
  const [hasPassword, setHasPassword] = useState(false)
  const [text, setText] = useState('')
  const [selectedTags, setSelectedTags] = useState([])
  const [expandedParent, setExpandedParent] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [wrongPw, setWrongPw] = useState(false)
  const [selectedDate, setSelectedDate] = useState(today)

  // AI состояния
  const [aiSupport, setAiSupport] = useState('')
  const [aiSuggestedTags, setAiSuggestedTags] = useState([])
  const [aiLoading, setAiLoading] = useState(false)

  // Пуш партнёру
  const [pushPartners, setPushPartners] = useState([])
  const [selectedPushPartners, setSelectedPushPartners] = useState([])
  const [sendingPush, setSendingPush] = useState(false)

  const rl = (ru, en) => lang === 'en' ? en : ru

  useEffect(() => {
    // Проверяем сохранённый пароль — сначала сессия, потом localStorage
    const sessionPw = sessionStorage.getItem('elara_diary_pw')
    const localPw = localStorage.getItem(`elara_diary_pw_val_${user.id}`)
    const storedPw = sessionPw || localPw

    if (storedPw) {
      setSessionPw(storedPw)
      setHasPassword(true)
      setUnlocked(true)
    } else {
      const hasPw = localStorage.getItem(`elara_diary_pw_${user.id}`)
      if (hasPw) setHasPassword(true)
    }
    fetchPushPartners()
  }, [])

  useEffect(() => {
    if (unlocked && sessionPw) loadEntry(selectedDate)
  }, [selectedDate, unlocked])

  async function fetchPushPartners() {
    const { data: myGroups } = await supabase.from('groups').select('id').eq('owner_id', user.id)
    const myGroupIds = (myGroups || []).map(g => g.id)
    if (!myGroupIds.length) return
    const { data } = await supabase
      .from('group_members')
      .select('*, user:user_id(id, name)')
      .in('group_id', myGroupIds)
      .neq('user_id', user.id)
      .eq('can_receive_ai_advice', true)
    setPushPartners(data || [])
  }

  async function handleUnlock(e) {
    e.preventDefault(); setWrongPw(false)
    if (!hasPassword) {
      // Сохраняем пароль в оба хранилища
      sessionStorage.setItem('elara_diary_pw', passwordInput)
      localStorage.setItem(`elara_diary_pw_val_${user.id}`, passwordInput)
      localStorage.setItem(`elara_diary_pw_${user.id}`, '1')
      setSessionPw(passwordInput); setHasPassword(true); setUnlocked(true)
      loadEntry(selectedDate); return
    }
    const { data } = await supabase
      .from('diary_entries').select('encrypted_text')
      .eq('user_id', user.id).not('encrypted_text', 'is', null).limit(1).maybeSingle()
    if (!data) {
      sessionStorage.setItem('elara_diary_pw', passwordInput)
      localStorage.setItem(`elara_diary_pw_val_${user.id}`, passwordInput)
      setSessionPw(passwordInput); setUnlocked(true); loadEntry(selectedDate); return
    }
    const result = await decryptText(data.encrypted_text, passwordInput)
    if (result === null) { setWrongPw(true); return }
    sessionStorage.setItem('elara_diary_pw', passwordInput)
    localStorage.setItem(`elara_diary_pw_val_${user.id}`, passwordInput)
    setSessionPw(passwordInput); setUnlocked(true); loadEntry(selectedDate)
  }

  async function loadEntry(date) {
    const { data } = await supabase
      .from('diary_entries').select('encrypted_text, tags')
      .eq('user_id', user.id).eq('date', date).maybeSingle()
    if (!data) { setText(''); setSelectedTags([]); setAiSuggestedTags([]); setAiSupport(''); return }
    setSelectedTags(data.tags || [])
    setAiSuggestedTags([])
    setAiSupport('')
    if (data.encrypted_text && sessionPw) {
      const dec = await decryptText(data.encrypted_text, sessionPw)
      setText(dec || '')
    } else setText('')
  }

  async function handleSave() {
    setSaving(true)
    const encrypted = text.trim() ? await encryptText(text, sessionPw) : null
    await supabase.from('diary_entries').upsert({
      user_id: user.id, date: selectedDate,
      encrypted_text: encrypted, tags: selectedTags,
    }, { onConflict: 'user_id,date' })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // AI читает текст → даёт поддержку + предлагает теги
  async function getAIAnalysis() {
    if (!text.trim() && selectedTags.length === 0) return
    setAiLoading(true); setAiSupport(''); setAiSuggestedTags([])
    try {
      const { data, error } = await supabase.functions.invoke('ai-advisor', {
        body: {
          userId: user.id,
          requestType: 'diary_full_analysis',
          language: lang,
          diaryText: text.trim(),        // текст дневника — только для тебя
          diaryTags: selectedTags,
          allAvailableTags: ALL_TAGS_FLAT,
        }
      })
      if (error) throw error
      if (data?.advice) setAiSupport(data.advice)
      if (data?.suggestedTags && Array.isArray(data.suggestedTags)) {
        // Показываем только теги которые ещё не выбраны
        setAiSuggestedTags(data.suggestedTags.filter(tag =>
          !selectedTags.includes(tag) && ALL_TAGS_FLAT.includes(tag)
        ).slice(0, 8))
      }
    } catch {
      setAiSupport(rl('Не удалось получить анализ. Попробуй позже.', 'Could not analyze. Try again later.'))
    }
    setAiLoading(false)
  }

  async function sendPushToPartners() {
    if (!selectedPushPartners.length) return
    setSendingPush(true)
    try {
      await supabase.functions.invoke('ai-advisor', {
        body: {
          userId: user.id,
          requestType: 'partner_diary_push',
          targetUserIds: selectedPushPartners,
          diaryTags: selectedTags,  // партнёру — только теги, без текста
          language: lang,
        }
      })
      alert(rl('Совет отправлен 🤍', 'Advice sent 🤍'))
    } catch { }
    setSendingPush(false)
  }

  function toggleTag(tag) {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
    // Убираем тег из предложений если добавили
    setAiSuggestedTags(prev => prev.filter(t => t !== tag))
  }

  function handleParentTag(parent) {
    toggleTag(parent)
    setExpandedParent(prev => prev === parent ? null : parent)
  }

  if (!unlocked) return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', padding:'32px 24px' }}>
      <div style={{ textAlign:'center', marginBottom:32 }}>
        <div style={{ fontSize:44, marginBottom:12 }}>🔒</div>
        <h2 style={{ fontSize:28, marginBottom:8 }}>{rl('Дневник','Diary')}</h2>
        <p style={{ color:'var(--text2)', fontSize:14, lineHeight:1.6 }}>
          {hasPassword
            ? rl('Дневник защищён паролем','Diary is password protected')
            : rl('Придумай пароль — только ты его знаешь','Set a password — only you will know it')}
        </p>
      </div>
      <form onSubmit={handleUnlock} style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <input type="password" placeholder={rl('Пароль дневника','Diary password')}
          value={passwordInput} onChange={e => { setPasswordInput(e.target.value); setWrongPw(false) }} autoFocus />
        {wrongPw && <p style={{ color:'#f87171', fontSize:13 }}>{rl('Неверный пароль','Wrong password')}</p>}
        <button type="submit" className="btn btn-primary" disabled={!passwordInput}>
          {hasPassword ? rl('Открыть','Unlock') : rl('Установить пароль','Set password')}
        </button>
      </form>
    </div>
  )

  const canAnalyze = text.trim().length > 10 || selectedTags.length > 0

  return (
    <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', padding:'20px 16px', gap:14, overflowY:'auto' }}>

      {/* Шапка */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <h2 style={{ fontSize:28 }}>{rl('Дневник','Diary')}</h2>
        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
          style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text)', padding:'6px 10px', fontSize:12 }} />
      </div>

      {/* Текст дневника */}
      <div style={{ position:'relative' }}>
        <textarea value={text} onChange={e => { setText(e.target.value); setAiSuggestedTags([]); setAiSupport('') }}
          placeholder={rl(
            'Что у тебя сегодня... можно писать что угодно, это только твоё 🔒',
            'What\'s on your mind today... this is yours only 🔒'
          )}
          style={{
            width:'100%', minHeight:160, resize:'vertical',
            fontFamily:'Cormorant Garamond, serif', fontSize:17, lineHeight:1.8,
            padding:'14px 14px 36px',
          }}
        />
        <div style={{ position:'absolute', bottom:10, right:12, fontSize:10, color:'var(--text3)', display:'flex', alignItems:'center', gap:4 }}>
          <span>🔒</span><span>{isSecure ? 'AES-256' : 'dev'}</span>
        </div>
      </div>

      {/* Кнопка анализа AI */}
      <button
        onClick={getAIAnalysis}
        disabled={aiLoading || !canAnalyze}
        style={{
          padding:'12px 16px', borderRadius:12, cursor: canAnalyze ? 'pointer' : 'not-allowed',
          border:`1px solid ${aiLoading ? 'var(--border)' : 'var(--accent)'}`,
          background: canAnalyze ? 'var(--accent-soft)' : 'var(--bg2)',
          color: canAnalyze ? 'var(--accent)' : 'var(--text3)',
          fontSize:13, fontWeight:500, transition:'all 0.2s',
          display:'flex', alignItems:'center', justifyContent:'center', gap:8,
          opacity: canAnalyze ? 1 : 0.5,
        }}
      >
        {aiLoading
          ? <><span style={{ animation:'spin 1s linear infinite', display:'inline-block' }}>✦</span> {rl('Читаю...','Reading...')}</>
          : <>✦ {rl('Получить поддержку и теги от AI','Get AI support & tag suggestions')}</>
        }
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* AI результат */}
      {(aiSupport || aiSuggestedTags.length > 0) && (
        <div style={{ background:'var(--bg2)', borderRadius:14, padding:'16px', border:'1px solid var(--accent)33', display:'flex', flexDirection:'column', gap:12 }}>

          {/* Поддержка */}
          {aiSupport && (
            <p style={{
              fontSize:15, color:'var(--text)', lineHeight:1.75,
              fontFamily:'Cormorant Garamond, serif', fontStyle:'italic', margin:0,
            }}>{aiSupport}</p>
          )}

          {/* Предложенные теги */}
          {aiSuggestedTags.length > 0 && (
            <div>
              <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>
                {rl('AI предлагает теги — нажми чтобы добавить','AI suggests tags — tap to add')}
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
                {aiSuggestedTags.map(tag => {
                  // Находим цвет родителя
                  const parentEntry = Object.entries(TAG_TREE).find(([p, m]) =>
                    p === tag || m.children.includes(tag)
                  )
                  const color = parentEntry?.[1]?.color || 'var(--accent)'
                  return (
                    <button key={tag} onClick={() => toggleTag(tag)} style={{
                      padding:'7px 13px', borderRadius:20, fontSize:13, cursor:'pointer',
                      border:`1.5px dashed ${color}`,
                      background:`${color}15`,
                      color:'var(--text)',
                      display:'flex', alignItems:'center', gap:5, transition:'all 0.15s',
                    }}>
                      <span style={{ fontSize:11, color }}>+</span> {tag}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Теги — дерево */}
      <div style={{ background:'var(--bg2)', borderRadius:14, padding:'14px', border:'1px solid var(--border)' }}>
        <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>
          {rl('Теги дня','Day tags')}
          <span style={{ marginLeft:6, textTransform:'none', letterSpacing:0, color:'var(--text3)', fontStyle:'italic' }}>
            {rl('· идут партнёру вместо текста','· sent to partner instead of text')}
          </span>
        </div>

        <div style={{ display:'flex', flexWrap:'wrap', gap:7, marginBottom: expandedParent ? 10 : 0 }}>
          {Object.entries(TAG_TREE).map(([parent, meta]) => {
            const isSelected = selectedTags.includes(parent)
            const isExpanded = expandedParent === parent
            const hasSelectedChildren = meta.children.some(c => selectedTags.includes(c))
            return (
              <button key={parent} onClick={() => handleParentTag(parent)} style={{
                padding:'7px 12px', borderRadius:20, fontSize:13, cursor:'pointer',
                border:`1.5px solid ${isSelected || isExpanded ? meta.color : 'var(--border)'}`,
                background: isSelected ? meta.color+'28' : isExpanded ? meta.color+'15' : 'transparent',
                color:'var(--text)', transition:'all 0.15s',
                display:'flex', alignItems:'center', gap:5,
              }}>
                {parent}
                {hasSelectedChildren && !isSelected && (
                  <span style={{ width:5, height:5, borderRadius:'50%', background:meta.color, display:'inline-block' }} />
                )}
                <span style={{ fontSize:10 }}>{isExpanded ? '▲' : '▾'}</span>
              </button>
            )
          })}
        </div>

        {expandedParent && TAG_TREE[expandedParent] && (
          <div style={{
            background:'var(--bg3)', borderRadius:10, padding:'10px 12px',
            border:`1px solid ${TAG_TREE[expandedParent].color}44`,
            display:'flex', flexWrap:'wrap', gap:7,
          }}>
            {TAG_TREE[expandedParent].children.map(child => (
              <button key={child} onClick={() => toggleTag(child)} style={{
                padding:'6px 11px', borderRadius:20, fontSize:12, cursor:'pointer',
                border:`1px solid ${selectedTags.includes(child) ? TAG_TREE[expandedParent].color : 'var(--border)'}`,
                background:selectedTags.includes(child) ? TAG_TREE[expandedParent].color+'22' : 'transparent',
                color:'var(--text)', transition:'all 0.15s',
              }}>{child}</button>
            ))}
          </div>
        )}

        {selectedTags.length > 0 && (
          <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid var(--border)', display:'flex', flexWrap:'wrap', gap:6, alignItems:'center' }}>
            <span style={{ fontSize:11, color:'var(--text3)' }}>{rl('Выбрано:','Selected:')}</span>
            {selectedTags.map(tag => (
              <button key={tag} onClick={() => toggleTag(tag)} style={{
                padding:'4px 10px', borderRadius:20, fontSize:11, cursor:'pointer',
                background:'var(--accent-soft)', border:'1px solid var(--accent)',
                color:'var(--accent)', display:'flex', alignItems:'center', gap:4,
              }}>
                {tag} <span style={{ fontSize:10 }}>✕</span>
              </button>
            ))}
            <button onClick={() => { setSelectedTags([]); setAiSuggestedTags([]) }} style={{
              padding:'4px 8px', borderRadius:20, fontSize:11, cursor:'pointer',
              background:'none', border:'1px solid var(--border)', color:'var(--text3)',
            }}>{rl('очистить','clear')}</button>
          </div>
        )}
      </div>

      {/* Отправить партнёру */}
      {pushPartners.length > 0 && (
        <div className="card" style={{ padding:'14px 16px' }}>
          <div style={{ fontSize:13, fontWeight:500, color:'var(--text)', marginBottom:4 }}>
            💌 {rl('Отправить совет партнёру','Send advice to partner')}
          </div>
          <div style={{ fontSize:11, color:'var(--text3)', marginBottom:12, lineHeight:1.5 }}>
            {rl('Они получат совет как поддержать тебя — только теги, без текста дневника',
               "They'll get support advice — only tags, no diary text")}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:12 }}>
            {pushPartners.map(p => (
              <label key={p.id} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
                <input type="checkbox"
                  checked={selectedPushPartners.includes(p.user_id)}
                  onChange={e => setSelectedPushPartners(prev =>
                    e.target.checked ? [...prev, p.user_id] : prev.filter(id => id !== p.user_id)
                  )}
                  style={{ width:16, height:16, accentColor:'var(--accent)', cursor:'pointer' }}
                />
                <div style={{ width:28, height:28, borderRadius:'50%', background:p.member_color||'var(--accent-soft)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, color:'#0a0a0a', fontWeight:600 }}>
                  {p.user?.name?.[0]?.toUpperCase()}
                </div>
                <span style={{ fontSize:13, color:'var(--text)' }}>{p.user?.name}</span>
              </label>
            ))}
          </div>
          <button onClick={sendPushToPartners}
            disabled={sendingPush || !selectedPushPartners.length || !selectedTags.length}
            className="btn btn-ghost" style={{ fontSize:12 }}>
            {sendingPush ? rl('Отправляю...','Sending...') : `💌 ${rl('Отправить','Send')}`}
          </button>
          {!selectedTags.length && (
            <p style={{ fontSize:11, color:'var(--text3)', marginTop:6 }}>
              {rl('Добавь теги чтобы отправить','Add tags to send')}
            </p>
          )}
        </div>
      )}

      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
        {saved ? '✓' : saving ? '...' : rl('Сохранить','Save')}
      </button>
    </div>
  )
}
