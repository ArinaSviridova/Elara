import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useLang } from '../context/LangContext'

export default function ProfilePage() {
  const { user, profile, updateProfile, signOut } = useAuth()
  const { themeKey, setThemeKey, themes } = useTheme()
  const { t, lang, setLang } = useLang()
  const navigate = useNavigate()
  const [name, setName] = useState(profile?.name || '')
  const [gender, setGender] = useState(profile?.gender || 'prefer_not')
  const [bodyMode, setBodyMode] = useState(profile?.body_mode || 'has_period')
  const [ageMode, setAgeMode] = useState(profile?.age_mode || 'adult')
  const [birthYear, setBirthYear] = useState(profile?.birth_year || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    await updateProfile({
      name: name.trim(), gender, body_mode: bodyMode, language: lang,
      age_mode: ageMode,
      birth_year: birthYear ? parseInt(birthYear) : null,
    })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', padding:'24px 20px', gap:18, overflowY:'auto' }}>
      <h2 style={{ fontSize:30 }}>{t.profileTitle}</h2>

      {/* Аватар */}
      <div style={{ textAlign:'center', padding:'18px', background:'var(--bg2)', borderRadius:16, border:'1px solid var(--border)' }}>
        <div style={{ width:56, height:56, borderRadius:'50%', background:'var(--accent-soft)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 10px', fontSize:22 }}>
          🌙
        </div>
        <div style={{ fontSize:18, fontFamily:'Cormorant Garamond, serif' }}>{profile?.name}</div>
        <div style={{ fontSize:11, color:'var(--text3)', letterSpacing:'0.2em', marginTop:4 }}>{profile?.invite_code}</div>
      </div>

      {/* Форма */}
      <form onSubmit={handleSave} className="card" style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div>
          <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>{t.editName}</div>
          <input value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>{t.gender}</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
            {Object.entries(t.genders).map(([key, label]) => (
              <button key={key} type="button" onClick={() => setGender(key)} style={{
                padding:'9px 12px', borderRadius:8, fontSize:12, cursor:'pointer', textAlign:'left',
                border:`1px solid ${gender===key?'var(--accent)':'var(--border)'}`,
                background:gender===key?'var(--accent-soft)':'transparent',
                color:gender===key?'var(--accent)':'var(--text2)',
              }}>{label}</button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:6 }}>{t.bodyMode}</div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {Object.entries(t.bodyModes).map(([key, label]) => (
              <button key={key} type="button" onClick={() => setBodyMode(key)} style={{
                padding:'10px 14px', borderRadius:8, fontSize:13, cursor:'pointer', textAlign:'left',
                border:`1px solid ${bodyMode===key?'var(--accent)':'var(--border)'}`,
                background:bodyMode===key?'var(--accent-soft)':'transparent',
                color:bodyMode===key?'var(--accent)':'var(--text2)',
              }}>{label}</button>
            ))}
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saved ? t.saved : saving ? '...' : t.save}
        </button>
      </form>

      {/* Возраст / режим */}
      <div className="card">
        <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>
          {lang==='en' ? 'Age mode' : 'Возрастной режим'}
        </div>
        <div style={{ display:'flex', gap:8, marginBottom: ageMode==='teen' ? 10 : 0 }}>
          <button onClick={() => setAgeMode('adult')} style={{
            flex:1, padding:'10px', borderRadius:8, fontSize:13, cursor:'pointer',
            border:`1px solid ${ageMode==='adult'?'var(--accent)':'var(--border)'}`,
            background:ageMode==='adult'?'var(--accent-soft)':'transparent',
            color:ageMode==='adult'?'var(--accent)':'var(--text2)',
          }}>{lang==='en'?'18+':'18+'}</button>
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
            <input
              type="number" placeholder="2008" min="2000" max={new Date().getFullYear()-10}
              value={birthYear} onChange={e => setBirthYear(e.target.value)}
              style={{ textAlign:'center', fontSize:16, letterSpacing:'0.1em' }}
            />
          </div>
        )}
        <button onClick={async () => {
          await updateProfile({ age_mode: ageMode, birth_year: birthYear ? parseInt(birthYear) : null })
          setSaved(true); setTimeout(() => setSaved(false), 1500)
        }} style={{ marginTop:10, background:'none', border:'1px solid var(--border)', borderRadius:6, color:'var(--text2)', fontSize:12, padding:'6px 12px', cursor:'pointer' }}>
          {saved ? '✓' : lang==='en'?'Save age mode':'Сохранить'}
        </button>
      </div>

      {/* Язык */}
      <div className="card">
        <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>{t.language}</div>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {[['ru','Русский 🇷🇺'],['be','Беларуская 🇧🇾'],['en','English 🇬🇧']].map(([code,label]) => (
            <button key={code} onClick={() => setLang(code)} style={{
              flex:1, minWidth:80, padding:'10px 8px', borderRadius:8, fontSize:12, cursor:'pointer',
              border:`1px solid ${lang===code?'var(--accent)':'var(--border)'}`,
              background:lang===code?'var(--accent-soft)':'transparent',
              color:lang===code?'var(--accent)':'var(--text2)',
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* Тема */}
      <div className="card">
        <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>{t.theme}</div>
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {Object.entries(themes).map(([key, th]) => (
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
              <span style={{ color:'var(--text)', fontSize:13 }}>{t.themes?.[key] || th.name}</span>
              {themeKey===key && <span style={{ marginLeft:'auto', color:'var(--accent)', fontSize:12 }}>✓</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Быстрые ссылки */}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        <button className="btn btn-ghost" onClick={() => navigate('/personalization')} style={{ justifyContent:'flex-start', gap:10 }}>
          ✦ {lang==='en'?'Personalization':lang==='be'?'Персаналізацыя AI':'Персонализация AI'}
        </button>
        {ageMode === 'teen' && (
          <button className="btn btn-ghost" onClick={() => navigate('/teen-parent')} style={{ justifyContent:'flex-start', gap:10, borderColor:'#f472b6', color:'#f472b6' }}>
            👩‍👧 {lang==='en'?'Add parent':lang==='be'?'Дадаць бацькоў':'Добавить родителя'}
          </button>
        )}
        {bodyMode === 'pregnant' && (
          <button className="btn btn-ghost" onClick={() => navigate('/pregnancy')} style={{ justifyContent:'flex-start', gap:10 }}>
            🌸 {lang==='en'?'Pregnancy tracker':lang==='be'?'Трэкер цяжарнасці':'Трекер беременности'}
          </button>
        )}
        <button className="btn btn-ghost" onClick={() => navigate('/intimacy')} style={{ justifyContent:'flex-start', gap:10 }}>
          🌹 {lang==='en'?'Intimacy tracker':lang==='be'?'Інтымны трэкер':'Интимный трекер'}
        </button>
        <button className="btn btn-ghost" onClick={() => navigate('/medications')} style={{ justifyContent:'flex-start', gap:10 }}>
          💊 {lang==='en'?'Medications':lang==='be'?'Таблеткі і вітаміны':'Таблетки и витамины'}
        </button>
        <button className="btn btn-ghost" onClick={() => navigate('/subscription')} style={{ borderColor:'var(--accent)', color:'var(--accent)' }}>
          ✦ {lang==='en'?'Subscription':lang==='be'?'Падпіска':'Подписка'}
        </button>
        <button className="btn btn-ghost" onClick={() => navigate('/feedback')} style={{ justifyContent:'flex-start', gap:10 }}>
          💬 {lang==='en'?'Feedback':lang==='be'?'Зваротная сувязь':'Обратная связь'}
        </button>
        {user?.email === 'krimikarina@gmail.com' && (
          <button className="btn btn-ghost" onClick={() => navigate('/admin')} style={{ color:'var(--accent)', borderColor:'var(--accent)' }}>
            ⚡ Админка
          </button>
        )}
        <button className="btn btn-ghost" onClick={signOut}>{t.signOut}</button>
      </div>
    </div>
  )
}
