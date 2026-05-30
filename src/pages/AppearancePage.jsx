import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../context/LangContext'
import { useTheme } from '../context/ThemeContext'

const COLOR_FIELDS = [
  { key: '--bg', ru: 'Фон', en: 'Background' },
  { key: '--bg2', ru: 'Карточки', en: 'Cards' },
  { key: '--bg3', ru: 'Вложенные блоки', en: 'Inner blocks' },
  { key: '--text', ru: 'Основной текст', en: 'Main text' },
  { key: '--text2', ru: 'Второй текст', en: 'Secondary text' },
  { key: '--text3', ru: 'Подсказки', en: 'Muted text' },
  { key: '--accent', ru: 'Акцент', en: 'Accent' },
  { key: '--self', ru: 'Личный цвет', en: 'Personal color' },
]

const PRESETS = [
  {
    name: 'Черника',
    colors: { '--bg':'#070710','--bg2':'#11111f','--bg3':'#1b1b2d','--text':'#f2f0ff','--text2':'#a8a0c9','--text3':'#6d6689','--accent':'#a78bfa','--self':'#f472b6' },
  },
  {
    name: 'Кровавая луна',
    colors: { '--bg':'#100608','--bg2':'#1a0b0f','--bg3':'#271018','--text':'#ffecef','--text2':'#c68a94','--text3':'#7b4b53','--accent':'#fb7185','--self':'#f59e0b' },
  },
  {
    name: 'Мох и золото',
    colors: { '--bg':'#070c08','--bg2':'#101811','--bg3':'#172319','--text':'#eef7ee','--text2':'#93b293','--text3':'#5d735d','--accent':'#a3e635','--self':'#facc15' },
  },
  {
    name: 'Молочный свет',
    colors: { '--bg':'#f7f1ea','--bg2':'#fffaf3','--bg3':'#efe4d6','--text':'#241c18','--text2':'#66544a','--text3':'#9a877b','--accent':'#9f6b4f','--self':'#c084fc' },
  },
]

function soft(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return 'rgba(255,255,255,0.12)'
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r},${g},${b},0.14)`
}

export default function AppearancePage() {
  const navigate = useNavigate()
  const { lang } = useLang()
  const { themes, themeKey, setThemeKey, customTheme, saveCustomTheme, resetCustomTheme } = useTheme()
  const rl = (ru, en) => (lang === 'en' ? en : ru)
  const [draft, setDraft] = useState(() => ({ ...customTheme }))
  const [saved, setSaved] = useState(false)

  const previewStyle = useMemo(() => ({
    background: draft['--bg'],
    color: draft['--text'],
    border: `1px solid ${draft['--border'] || 'rgba(255,255,255,0.1)'}`,
  }), [draft])

  function updateColor(key, value) {
    setDraft(prev => ({
      ...prev,
      [key]: value,
      ...(key === '--accent' ? { '--accent-soft': soft(value) } : {}),
    }))
  }

  function applyPreset(preset) {
    setDraft(prev => ({
      ...prev,
      ...preset.colors,
      name: preset.name,
      '--accent-soft': soft(preset.colors['--accent']),
    }))
  }

  function save() {
    saveCustomTheme(draft)
    setSaved(true)
    setTimeout(() => setSaved(false), 1200)
  }

  return (
    <div className="page-enter" style={{ flex:1, overflowY:'auto', padding:'20px 16px 28px', display:'flex', flexDirection:'column', gap:14 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <button type="button" onClick={() => navigate('/profile')} className="btn btn-ghost" style={{ width:'auto', padding:'8px 10px' }}>‹</button>
        <div>
          <h2 style={{ fontSize:28 }}>🎨 {rl('Оформление','Appearance')}</h2>
          <p style={{ margin:0, fontSize:12, color:'var(--text3)', lineHeight:1.5 }}>
            {rl('Выбирай готовую тему или собери свои цвета. Потому что да, иногда человеку нужен не “шалфей”, а кислотная ведьма.', 'Choose a preset or build your own colors.')}
          </p>
        </div>
      </div>

      <div className="card" style={{ padding:14 }}>
        <div style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>{rl('Готовые темы','Preset themes')}</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {Object.entries(themes).map(([key, th]) => (
            <button key={key} type="button" onClick={() => setThemeKey(key)} style={{
              display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, cursor:'pointer',
              border:`1px solid ${themeKey === key ? th['--accent'] : 'var(--border)'}`,
              background:themeKey === key ? th['--accent-soft'] : 'var(--bg2)',
              color:'var(--text)',
            }}>
              <div style={{ display:'flex', gap:4 }}>
                {[th['--bg2'], th['--accent'], th['--self']].map((c, i) => <span key={i} style={{ width:14, height:14, borderRadius:999, background:c, border:'1px solid rgba(255,255,255,0.12)' }} />)}
              </div>
              <span style={{ fontSize:13 }}>{th.name}</span>
              {themeKey === key && <span style={{ marginLeft:'auto', color:th['--accent'] }}>✓</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding:14 }}>
        <div style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>{rl('Моя цветовая гамма','My color palette')}</div>
        <input value={draft.name || ''} onChange={e => setDraft(prev => ({ ...prev, name:e.target.value }))} placeholder={rl('Название темы','Theme name')} style={{ marginBottom:10 }} />

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {COLOR_FIELDS.map(field => (
            <label key={field.key} style={{ display:'flex', flexDirection:'column', gap:6, fontSize:11, color:'var(--text3)' }}>
              {lang === 'en' ? field.en : field.ru}
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <input type="color" value={draft[field.key] || '#000000'} onChange={e => updateColor(field.key, e.target.value)} style={{ width:42, height:38, padding:3 }} />
                <input value={draft[field.key] || ''} onChange={e => updateColor(field.key, e.target.value)} style={{ padding:'10px 8px', fontSize:12 }} />
              </div>
            </label>
          ))}
        </div>

        <div style={{ display:'flex', gap:8, marginTop:12, flexWrap:'wrap' }}>
          {PRESETS.map(p => (
            <button key={p.name} type="button" onClick={() => applyPreset(p)} style={{ padding:'7px 10px', borderRadius:999, border:'1px solid var(--border)', background:'var(--bg3)', color:'var(--text2)', fontSize:11, cursor:'pointer' }}>
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ ...previewStyle, padding:16 }}>
        <div style={{ fontSize:11, opacity:0.65, textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:8 }}>{rl('Превью','Preview')}</div>
        <div style={{ background:draft['--bg2'], borderRadius:14, padding:14, border:`1px solid ${draft['--border'] || 'rgba(255,255,255,0.1)'}` }}>
          <div style={{ fontSize:16, fontWeight:700, color:draft['--text'] }}>{rl('Сегодня важно','Important today')}</div>
          <p style={{ fontSize:12, color:draft['--text2'], margin:'6px 0 12px', lineHeight:1.5 }}>
            {rl('Записаться на следующую дозу, отметить симптом и не превращать интерфейс в болото.', 'Book the next dose, log a symptom, and keep the interface sane.')}
          </p>
          <button type="button" style={{ padding:'9px 12px', borderRadius:10, border:'none', background:draft['--accent'], color:draft['--bg'], fontSize:12 }}>
            {rl('Действие','Action')}
          </button>
        </div>
      </div>

      <div style={{ display:'flex', gap:8 }}>
        <button type="button" onClick={save} className="btn btn-primary">{saved ? '✓' : rl('Сохранить мою тему','Save my theme')}</button>
        <button type="button" onClick={resetCustomTheme} className="btn btn-ghost" style={{ width:'auto' }}>↺</button>
      </div>
    </div>
  )
}
