import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'

const DESIRE_EMOJIS = ['😐','🌡️','🔥','💫','⚡']

export default function IntimacyPage() {
  const { user } = useAuth()
  const { lang } = useLang()
  const rl = (ru, en) => lang === 'en' ? en : ru
  const today = new Date().toISOString().slice(0,10)

  const [entry, setEntry] = useState(null)
  const [desireLevel, setDesireLevel] = useState(0)
  const [hadSex, setHadSex] = useState(false)
  const [sexType, setSexType] = useState('none')
  const [partnerType, setPartnerType] = useState('none')
  const [visiblePartner, setVisiblePartner] = useState(false)
  const [visibleFriends, setVisibleFriends] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => { loadEntry() }, [])

  async function loadEntry() {
    const { data } = await supabase
      .from('intimacy_entries').select('*').eq('user_id', user.id).eq('date', today).maybeSingle()
    if (data) {
      setDesireLevel(data.desire_level || 0)
      setHadSex(data.had_sex || false)
      setSexType(data.sex_type || 'none')
      setPartnerType(data.partner_type || 'none')
      setVisiblePartner(data.visible_to_partner || false)
      setVisibleFriends(data.visible_to_friends || false)
    }
  }

  async function handleSave() {
    setSaving(true)
    await supabase.from('intimacy_entries').upsert({
      user_id: user.id, date: today,
      desire_level: desireLevel || null,
      had_sex: hadSex,
      sex_type: hadSex ? sexType : 'none',
      partner_type: hadSex ? partnerType : 'none',
      visible_to_partner: visiblePartner,
      visible_to_friends: visibleFriends,
    }, { onConflict: 'user_id,date' })
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function Toggle({ value, onChange, color }) {
    return (
      <button onClick={() => onChange(!value)} style={{
        width:44, height:24, borderRadius:12, cursor:'pointer', border:'none',
        background: value ? (color || 'var(--accent)') : 'var(--bg3)',
        position:'relative', transition:'all 0.2s', flexShrink:0,
      }}>
        <div style={{ position:'absolute', top:2, left:value?22:2, width:20, height:20, borderRadius:'50%', background:'#fff', transition:'left 0.2s' }} />
      </button>
    )
  }

  return (
    <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', padding:'24px 20px', gap:16, overflowY:'auto' }}>
      <h2 style={{ fontSize:28 }}>🌹 {rl('Интимное','Intimacy')}</h2>
      <p style={{ fontSize:13, color:'var(--text3)', lineHeight:1.5, marginTop:-8 }}>
        {rl('Приватно. Видишь только ты — если не разрешишь иначе.','Private. Only you see this — unless you allow otherwise.')}
      </p>

      {/* Уровень желания */}
      <div className="card" style={{ padding:'14px' }}>
        <div style={{ fontSize:12, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>
          {rl('Уровень желания сегодня','Desire level today')}
        </div>
        <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
          {DESIRE_EMOJIS.map((emoji, i) => (
            <button key={i} onClick={() => setDesireLevel(desireLevel === i+1 ? 0 : i+1)} style={{
              fontSize:28, padding:'8px', borderRadius:12, cursor:'pointer',
              border:`2px solid ${desireLevel === i+1 ? 'var(--accent)' : 'transparent'}`,
              background: desireLevel === i+1 ? 'var(--accent-soft)' : 'var(--bg3)',
              transition:'all 0.15s',
            }}>{emoji}</button>
          ))}
        </div>
        {desireLevel > 0 && (
          <div style={{ textAlign:'center', fontSize:12, color:'var(--text3)', marginTop:8 }}>
            {['','Низкое','Умеренное','Среднее','Высокое','Очень высокое'][desireLevel]}
          </div>
        )}
      </div>

      {/* Был ли секс */}
      <div className="card" style={{ padding:'14px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: hadSex ? 14 : 0 }}>
          <div style={{ fontSize:14, color:'var(--text)' }}>{rl('Была сексуальная активность','Sexual activity today')}</div>
          <Toggle value={hadSex} onChange={setHadSex} color='#f472b6' />
        </div>

        {hadSex && (
          <div style={{ display:'flex', flexDirection:'column', gap:12, paddingTop:12, borderTop:'1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize:11, color:'var(--text3)', marginBottom:8 }}>{rl('Тип','Type')}</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                {[
                  { key:'protected', ru:'Защищённый', en:'Protected' },
                  { key:'unprotected', ru:'Незащищённый', en:'Unprotected' },
                  { key:'interrupted', ru:'Прерванный', en:'Interrupted' },
                  { key:'solo', ru:'Мастурбация', en:'Solo' },
                ].map(t => (
                  <button key={t.key} onClick={() => setSexType(t.key)} style={{
                    padding:'9px', borderRadius:8, fontSize:12, cursor:'pointer',
                    border:`1px solid ${sexType===t.key ? '#f472b6' : 'var(--border)'}`,
                    background:sexType===t.key ? 'rgba(244,114,182,0.12)' : 'transparent',
                    color:sexType===t.key ? '#f472b6' : 'var(--text2)',
                  }}>{lang==='en'?t.en:t.ru}</button>
                ))}
              </div>
            </div>

            {sexType !== 'solo' && (
              <div>
                <div style={{ fontSize:11, color:'var(--text3)', marginBottom:8 }}>{rl('Партнёр','Partner')}</div>
                <div style={{ display:'flex', gap:8 }}>
                  {[
                    { key:'regular', ru:'Постоянный', en:'Regular' },
                    { key:'casual', ru:'Случайный', en:'Casual' },
                  ].map(p => (
                    <button key={p.key} onClick={() => setPartnerType(p.key)} style={{
                      flex:1, padding:'9px', borderRadius:8, fontSize:12, cursor:'pointer',
                      border:`1px solid ${partnerType===p.key ? 'var(--accent)' : 'var(--border)'}`,
                      background:partnerType===p.key ? 'var(--accent-soft)' : 'transparent',
                      color:partnerType===p.key ? 'var(--accent)' : 'var(--text2)',
                    }}>{lang==='en'?p.en:p.ru}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Приватность */}
      <div className="card" style={{ padding:'14px' }}>
        <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>
          {rl('Кто видит','Visibility')}
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <Toggle value={visiblePartner} onChange={setVisiblePartner} color='#f472b6' />
            <span style={{ fontSize:13, color:'var(--text2)' }}>{rl('Видит партнёр','Partner can see')}</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <Toggle value={visibleFriends} onChange={setVisibleFriends} />
            <span style={{ fontSize:13, color:'var(--text2)' }}>{rl('Видят подруги','Friends can see')}</span>
          </div>
        </div>
        <p style={{ fontSize:11, color:'var(--text3)', marginTop:10, lineHeight:1.5 }}>
          {rl('Партнёр видит только уровень желания и тип — без деталей.','Partner sees only desire level and type — no details.')}
        </p>
      </div>

      <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
        {saved ? '✓' : saving ? '...' : rl('Сохранить','Save')}
      </button>
    </div>
  )
}
