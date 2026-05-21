import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'

const PERSONALITY_OPTIONS = [
  { key:'introvert', ru:'Интроверт', en:'Introvert', emoji:'🌙' },
  { key:'extrovert', ru:'Экстраверт', en:'Extrovert', emoji:'☀️' },
  { key:'sensitive', ru:'Чувствительная', en:'Sensitive', emoji:'🌸' },
  { key:'rational', ru:'Рациональная', en:'Rational', emoji:'🧠' },
  { key:'creative', ru:'Творческая', en:'Creative', emoji:'🎨' },
  { key:'sporty', ru:'Активная/спорт', en:'Active/sporty', emoji:'🏃' },
  { key:'homebody', ru:'Домашняя', en:'Homebody', emoji:'🏠' },
  { key:'social', ru:'Социальная', en:'Social', emoji:'👥' },
  { key:'ambitious', ru:'Амбициозная', en:'Ambitious', emoji:'🚀' },
  { key:'spiritual', ru:'Духовная', en:'Spiritual', emoji:'✨' },
]

const CARE_PREFS = [
  { key:'warm_bath', ru:'Тёплая ванна', en:'Warm bath', emoji:'🛁' },
  { key:'nature', ru:'Прогулка на природе', en:'Walk in nature', emoji:'🌿' },
  { key:'music', ru:'Музыка', en:'Music', emoji:'🎵' },
  { key:'friends', ru:'Время с подругами', en:'Time with friends', emoji:'👯' },
  { key:'alone', ru:'Время в тишине', en:'Quiet alone time', emoji:'🤫' },
  { key:'food', ru:'Вкусная еда', en:'Comfort food', emoji:'🍫' },
  { key:'movies', ru:'Кино/сериалы', en:'Movies/series', emoji:'🎬' },
  { key:'journaling', ru:'Написать в дневник', en:'Journaling', emoji:'📝' },
  { key:'meditation', ru:'Медитация', en:'Meditation', emoji:'🧘' },
  { key:'shopping', ru:'Шопинг', en:'Shopping', emoji:'🛍️' },
  { key:'reading', ru:'Чтение', en:'Reading', emoji:'📚' },
  { key:'gym', ru:'Тренировка', en:'Workout', emoji:'💪' },
]

export default function PersonalizationPage() {
  const { profile, updateProfile } = useAuth()
  const { lang } = useLang()
  const rl = (ru, en) => lang === 'en' ? en : ru

  const [selected, setSelected] = useState(profile?.personality_tags || [])
  const [carePrefs, setCarePrefs] = useState(
(profile?.preferences)?.care_prefs || []  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function togglePersonality(key) {
    setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  function toggleCare(key) {
    setCarePrefs(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  async function handleSave() {
    setSaving(true)
    await updateProfile({
      personality_tags: selected,
      preferences: { care_prefs: carePrefs },
    })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', padding:'24px 20px', gap:20, overflowY:'auto' }}>
      <div>
        <h2 style={{ fontSize:28 }}>{rl('Персонализация','Personalization')}</h2>
        <p style={{ fontSize:13, color:'var(--text2)', marginTop:6, lineHeight:1.6 }}>
          {rl('Расскажи о себе — AI будет давать советы именно под тебя', 'Tell us about yourself — AI will give advice tailored just for you')}
        </p>
      </div>

      {/* Характер */}
      <div>
        <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>
          {rl('Я по натуре...','I am...')}
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
          {PERSONALITY_OPTIONS.map(p => (
            <button key={p.key} onClick={() => togglePersonality(p.key)} style={{
              padding:'8px 14px', borderRadius:20, fontSize:13, cursor:'pointer',
              border:`1px solid ${selected.includes(p.key) ? 'var(--accent)' : 'var(--border)'}`,
              background:selected.includes(p.key) ? 'var(--accent-soft)' : 'transparent',
              color:selected.includes(p.key) ? 'var(--accent)' : 'var(--text2)',
              display:'flex', alignItems:'center', gap:6, transition:'all 0.15s',
            }}>
              <span>{p.emoji}</span>
              <span>{lang==='en'?p.en:p.ru}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Уход за собой */}
      <div>
        <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>
          {rl('Когда мне плохо, помогает...','When I\'m down, I feel better with...')}
        </div>
        <p style={{ fontSize:12, color:'var(--text3)', marginBottom:10 }}>
          {rl('AI будет предлагать именно эти способы заботы о себе','AI will suggest these self-care options specifically')}
        </p>
        <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
          {CARE_PREFS.map(p => (
            <button key={p.key} onClick={() => toggleCare(p.key)} style={{
              padding:'8px 14px', borderRadius:20, fontSize:13, cursor:'pointer',
              border:`1px solid ${carePrefs.includes(p.key) ? '#f472b6' : 'var(--border)'}`,
              background:carePrefs.includes(p.key) ? 'rgba(244,114,182,0.12)' : 'transparent',
              color:carePrefs.includes(p.key) ? '#f472b6' : 'var(--text2)',
              display:'flex', alignItems:'center', gap:6, transition:'all 0.15s',
            }}>
              <span>{p.emoji}</span>
              <span>{lang==='en'?p.en:p.ru}</span>
            </button>
          ))}
        </div>
      </div>

      {(selected.length > 0 || carePrefs.length > 0) && (
        <div style={{ background:'var(--bg2)', borderRadius:10, padding:'12px 14px', border:'1px solid var(--border)', fontSize:12, color:'var(--text2)', lineHeight:1.6 }}>
          ✦ {rl('AI будет учитывать это в каждом совете и рекомендации','AI will factor this into every piece of advice')}
        </div>
      )}

      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
        {saved ? '✓' : saving ? '...' : rl('Сохранить','Save')}
      </button>
    </div>
  )
}
