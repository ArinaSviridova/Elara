import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang, useRl } from '../context/LangContext'

const DATA_TYPE_LABELS = {
  calendar:  { emoji:'📅', ru:'Календарь',    en:'Calendar' },
  mood:      { emoji:'🌙', ru:'Настроение',   en:'Mood' },
  cycle:     { emoji:'🩸', ru:'Цикл',         en:'Cycle' },
  libido:    { emoji:'🌹', ru:'Либидо',       en:'Libido' },
  meds:      { emoji:'💊', ru:'Лекарства',    en:'Medications' },
  status:    { emoji:'⚡', ru:'Статус дня',   en:'Day status' },
  pain:      { emoji:'💫', ru:'Боль',         en:'Pain' },
  diary:     { emoji:'📓', ru:'Дневник',      en:'Diary' },
  dysphoria: { emoji:'💜', ru:'Дисфория',     en:'Dysphoria' },
}

function timeAgo(dateStr, lang) {
  const diff = (Date.now() - new Date(dateStr)) / 1000
  if (diff < 60) return lang === 'en' ? 'just now' : 'только что'
  if (diff < 3600) return lang === 'en' ? `${Math.floor(diff/60)}m ago` : `${Math.floor(diff/60)} мин назад`
  if (diff < 86400) return lang === 'en' ? `${Math.floor(diff/3600)}h ago` : `${Math.floor(diff/3600)} ч назад`
  const days = Math.floor(diff/86400)
  return lang === 'en' ? `${days}d ago` : `${days} дн назад`
}

export default function ViewLogPage() {
  const { user } = useAuth()
  const { lang } = useLang()
  const rl = useRl()
  const navigate = useNavigate()

  const [logs, setLogs] = useState([])
  const [viewers, setViewers] = useState({}) // viewer_id -> profile
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all | today | week

  useEffect(() => { loadLogs() }, [filter])

  async function loadLogs() {
    setLoading(true)
    let q = supabase.from('view_logs')
      .select('*')
      .eq('owner_id', user.id)
      .order('viewed_at', { ascending: false })
      .limit(100)

    if (filter === 'today') {
      q = q.gte('viewed_at', new Date().toISOString().slice(0,10) + 'T00:00:00')
    } else if (filter === 'week') {
      const week = new Date(Date.now() - 7*86400000).toISOString()
      q = q.gte('viewed_at', week)
    }

    const { data } = await q
    setLogs(data || [])

    // Загрузим имена просматривавших
    const ids = [...new Set((data||[]).map(l => l.viewer_id))]
    if (ids.length) {
      const { data: profiles } = await supabase.from('profiles').select('id,name,avatar_url').in('id', ids)
      const map = {}
      ;(profiles||[]).forEach(p => { map[p.id] = p })
      setViewers(map)
    }
    setLoading(false)
  }

  // Группируем по viewer_id
  const grouped = {}
  logs.forEach(log => {
    const vid = log.viewer_id
    if (!grouped[vid]) grouped[vid] = []
    grouped[vid].push(log)
  })

  return (
    <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', padding:'20px 16px', gap:14, overflowY:'auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <button onClick={() => navigate(-1)} style={{ background:'none', border:'none', color:'var(--text2)', cursor:'pointer', fontSize:20 }}>‹</button>
        <h2 style={{ fontSize:22 }}>👁 {rl('Кто что видел','Who saw what')}</h2>
      </div>

      <p style={{ fontSize:12, color:'var(--text3)', lineHeight:1.6, margin:0 }}>
        {rl('Журнал просмотров твоих данных из круга друзей.','Log of who viewed your shared data.')}
      </p>

      {/* Фильтр */}
      <div style={{ display:'flex', gap:6 }}>
        {[
          { key:'all', ru:'Всё время', en:'All time' },
          { key:'today', ru:'Сегодня', en:'Today' },
          { key:'week', ru:'Эта неделя', en:'This week' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            padding:'6px 14px', borderRadius:20, fontSize:12, cursor:'pointer',
            border:`1px solid ${filter===f.key?'var(--accent)':'var(--border)'}`,
            background:filter===f.key?'var(--accent-soft)':'transparent',
            color:filter===f.key?'var(--accent)':'var(--text2)',
          }}>{lang==='en'?f.en:f.ru}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign:'center', color:'var(--text3)', padding:'40px 0' }}>
          ⟳ {rl('Загружаю...','Loading...')}
        </div>
      ) : logs.length === 0 ? (
        <div style={{ textAlign:'center', color:'var(--text3)', padding:'40px 0', fontSize:14, lineHeight:2 }}>
          👁<br />{rl('Никто ещё не просматривал твои данные.','Nobody has viewed your data yet.')}
        </div>
      ) : (
        Object.entries(grouped).map(([viewerId, viewerLogs]) => {
          const viewer = viewers[viewerId]
          const lastSeen = viewerLogs[0]?.viewed_at
          const dataTypes = [...new Set(viewerLogs.map(l => l.data_type))]

          return (
            <div key={viewerId} className="card" style={{ padding:'14px 16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
                <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--accent-soft)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, overflow:'hidden', flexShrink:0 }}>
                  {viewer?.avatar_url
                    ? <img src={viewer.avatar_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    : viewer?.name?.[0]?.toUpperCase() || '?'
                  }
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:500 }}>{viewer?.name || rl('Неизвестно','Unknown')}</div>
                  <div style={{ fontSize:11, color:'var(--text3)' }}>
                    {rl('Последний просмотр','Last viewed')}: {timeAgo(lastSeen, lang)}
                  </div>
                </div>
                <div style={{ fontSize:11, color:'var(--text3)' }}>
                  {viewerLogs.length}×
                </div>
              </div>

              <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                {dataTypes.map(dt => {
                  const info = DATA_TYPE_LABELS[dt] || { emoji:'📊', ru:dt, en:dt }
                  const count = viewerLogs.filter(l=>l.data_type===dt).length
                  return (
                    <span key={dt} style={{ fontSize:11, padding:'3px 9px', borderRadius:20, background:'var(--bg3)', color:'var(--text2)', border:'1px solid var(--border)' }}>
                      {info.emoji} {lang==='en'?info.en:info.ru} {count>1?`×${count}`:''}
                    </span>
                  )
                })}
              </div>
            </div>
          )
        })
      )}

      {logs.length > 0 && (
        <div style={{ fontSize:11, color:'var(--text3)', textAlign:'center', lineHeight:1.6 }}>
          {rl('Видны только просмотры из твоего круга. Анонимные просмотры не записываются.','Only views from your circle are shown. Anonymous views are not logged.')}
        </div>
      )}
    </div>
  )
}

// Утилита для записи просмотра (вызывать в SyncPage и FriendsPage)
export async function logView(ownerId, viewerId, dataType) {
  if (!ownerId || !viewerId || ownerId === viewerId) return
  await supabase.from('view_logs').insert({
    owner_id: ownerId,
    viewer_id: viewerId,
    data_type: dataType,
    viewed_at: new Date().toISOString(),
  }).catch(() => null)
}
