// Личный список активностей "на будущее"
// Можно добавлять фильмы, места, мероприятия — и потом предлагать их в Круге
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang, useRl } from '../context/LangContext'

const TYPE_OPTIONS = [
  { key:'movie_night', emoji:'🎬', ru:'Кино / сериал',       en:'Movie / series' },
  { key:'cafe',        emoji:'☕', ru:'Кафе / ресторан',     en:'Cafe / restaurant' },
  { key:'spa',         emoji:'🛁', ru:'Баня / сауна / спа',  en:'Sauna / spa' },
  { key:'walk',        emoji:'🚶', ru:'Прогулка / место',    en:'Walk / place' },
  { key:'sport',       emoji:'🏃', ru:'Спорт / активность',  en:'Sport / activity' },
  { key:'party',       emoji:'🎉', ru:'Вечеринка / бар',     en:'Party / bar' },
  { key:'trip',        emoji:'✈️', ru:'Поездка / выезд',     en:'Trip / outing' },
  { key:'event',       emoji:'🎭', ru:'Мероприятие',         en:'Event' },
  { key:'custom',      emoji:'✨', ru:'Своё',                en:'Custom' },
]

export default function ActivityWishlistPage() {
  const { user } = useAuth()
  const { lang } = useLang()
  const rl = useRl()
  const navigate = useNavigate()

  const [wishes, setWishes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState('active') // active | done | all

  // Форма добавления
  const [title, setTitle] = useState('')
  const [type, setType] = useState('custom')
  const [details, setDetails] = useState('')
  const [location, setLocation] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('activity_wishes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setWishes(data || [])
    setLoading(false)
  }

  async function add() {
    if (!title.trim()) return
    setSaving(true)
    await supabase.from('activity_wishes').insert({
      user_id: user.id,
      title: title.trim(),
      activity_type: type,
      details: details.trim() || null,
      location: location.trim() || null,
    })
    setTitle(''); setDetails(''); setLocation(''); setType('custom')
    setShowAdd(false)
    setSaving(false)
    load()
  }

  async function toggleDone(wish) {
    await supabase.from('activity_wishes')
      .update({ is_done: !wish.is_done })
      .eq('id', wish.id)
    setWishes(prev => prev.map(w => w.id === wish.id ? { ...w, is_done: !w.is_done } : w))
  }

  async function remove(id) {
    await supabase.from('activity_wishes').delete().eq('id', id)
    setWishes(prev => prev.filter(w => w.id !== id))
  }

  const filtered = wishes.filter(w =>
    filter === 'all' ? true : filter === 'done' ? w.is_done : !w.is_done
  )

  const getType = (key) => TYPE_OPTIONS.find(t => t.key === key) || TYPE_OPTIONS[8]

  return (
    <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', overflowY:'auto' }}>
      {/* Заголовок */}
      <div style={{ padding:'20px 16px 0', display:'flex', alignItems:'center', gap:10 }}>
        <button onClick={() => navigate(-1)} style={{ background:'none', border:'none', color:'var(--text2)', cursor:'pointer', fontSize:20 }}>‹</button>
        <div style={{ flex:1 }}>
          <h2 style={{ fontSize:22, margin:0 }}>✨ {rl('Список активностей','Activity wishlist')}</h2>
          <p style={{ fontSize:12, color:'var(--text3)', margin:'4px 0 0', lineHeight:1.4 }}>
            {rl('Фильмы, места, мероприятия — предлагай из списка в Круге','Films, places, events — suggest from list in Circle')}
          </p>
        </div>
        <button onClick={() => setShowAdd(p => !p)} style={{
          width:36, height:36, borderRadius:'50%', border:'none',
          background:showAdd?'var(--accent)':'var(--bg2)', color:showAdd?'#fff':'var(--text2)',
          fontSize:22, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
          transition:'all 0.2s',
        }}>+</button>
      </div>

      {/* Форма добавления */}
      {showAdd && (
        <div style={{ margin:'12px 16px 0', padding:'16px', background:'var(--bg2)', borderRadius:14, border:'1px solid var(--border)' }}>
          <div style={{ fontSize:13, fontWeight:500, marginBottom:12 }}>
            {rl('Добавить активность','Add activity')}
          </div>

          {/* Тип */}
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:10 }}>
            {TYPE_OPTIONS.map(t => (
              <button key={t.key} onClick={() => setType(t.key)} style={{
                padding:'5px 10px', borderRadius:20, fontSize:11, cursor:'pointer',
                border:`1px solid ${type===t.key?'var(--accent)':'var(--border)'}`,
                background:type===t.key?'var(--accent-soft)':'transparent',
                color:type===t.key?'var(--accent)':'var(--text3)',
              }}>{t.emoji} {lang==='en'?t.en:t.ru}</button>
            ))}
          </div>

          {/* Название */}
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            placeholder={rl('Название, фильм, место...','Name, film, place...')}
            style={{ width:'100%', marginBottom:8, padding:'10px 12px', borderRadius:10,
              border:'1px solid var(--border)', background:'var(--bg3)', color:'var(--text)', fontSize:13 }}
            autoFocus
          />

          {/* Детали и место */}
          <input
            value={details}
            onChange={e => setDetails(e.target.value)}
            placeholder={rl('Детали (необязательно)','Details (optional)')}
            style={{ width:'100%', marginBottom:8, padding:'10px 12px', borderRadius:10,
              border:'1px solid var(--border)', background:'var(--bg3)', color:'var(--text)', fontSize:13 }}
          />
          <input
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder={rl('Место (необязательно)','Location (optional)')}
            style={{ width:'100%', marginBottom:12, padding:'10px 12px', borderRadius:10,
              border:'1px solid var(--border)', background:'var(--bg3)', color:'var(--text)', fontSize:13 }}
          />

          <div style={{ display:'flex', gap:8 }}>
            <button onClick={add} disabled={saving || !title.trim()} className="btn btn-primary" style={{ flex:1, padding:'10px' }}>
              {saving ? '⟳' : rl('Добавить','Add')}
            </button>
            <button onClick={() => setShowAdd(false)} className="btn btn-ghost" style={{ padding:'10px 16px' }}>
              {rl('Отмена','Cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Фильтры */}
      <div style={{ display:'flex', gap:6, padding:'12px 16px 0' }}>
        {[{k:'active',ru:'Хочу',en:'Want'},{k:'done',ru:'Сделано',en:'Done'},{k:'all',ru:'Все',en:'All'}].map(f => (
          <button key={f.k} onClick={() => setFilter(f.k)} style={{
            padding:'6px 14px', borderRadius:20, fontSize:12, cursor:'pointer',
            border:`1px solid ${filter===f.k?'var(--accent)':'var(--border)'}`,
            background:filter===f.k?'var(--accent-soft)':'transparent',
            color:filter===f.k?'var(--accent)':'var(--text2)',
          }}>{lang==='en'?f.en:f.ru} {filter===f.k && `(${filtered.length})`}</button>
        ))}
      </div>

      {/* Список */}
      <div style={{ padding:'10px 16px 80px', display:'flex', flexDirection:'column', gap:8 }}>
        {loading ? (
          <div style={{ textAlign:'center', color:'var(--text3)', padding:'40px 0' }}>⟳</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', color:'var(--text3)', padding:'40px 0', lineHeight:2 }}>
            {filter === 'active'
              ? rl('Список пуст. Добавь фильм, место или мероприятие!','List is empty. Add a movie, place or event!')
              : rl('Ничего нет','Nothing here')}
          </div>
        ) : (
          filtered.map(wish => {
            const t = getType(wish.activity_type)
            return (
              <div key={wish.id} style={{
                padding:'12px 14px', background:'var(--bg2)', borderRadius:12,
                border:`1px solid ${wish.is_done?'var(--border)':'var(--border)'}`,
                opacity:wish.is_done?0.6:1, transition:'opacity 0.2s',
              }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:10 }}>
                  {/* Чекбокс */}
                  <button onClick={() => toggleDone(wish)} style={{
                    width:22, height:22, borderRadius:6, flexShrink:0, marginTop:1,
                    border:`2px solid ${wish.is_done?'#4ade80':'var(--border)'}`,
                    background:wish.is_done?'#4ade80':'transparent',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    cursor:'pointer', fontSize:12, color:'#fff',
                  }}>
                    {wish.is_done && '✓'}
                  </button>

                  {/* Контент */}
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                      <span style={{ fontSize:14 }}>{t.emoji}</span>
                      <span style={{
                        fontSize:14, fontWeight:500,
                        textDecoration:wish.is_done?'line-through':'none',
                        color:'var(--text)',
                      }}>{wish.title}</span>
                      <span style={{ fontSize:10, padding:'2px 7px', borderRadius:10, background:'var(--bg3)', color:'var(--text3)' }}>
                        {lang==='en'?t.en:t.ru}
                      </span>
                    </div>
                    {wish.details && (
                      <div style={{ fontSize:12, color:'var(--text2)', marginTop:3 }}>{wish.details}</div>
                    )}
                    {wish.location && (
                      <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>📍 {wish.location}</div>
                    )}
                  </div>

                  {/* Удалить */}
                  <button onClick={() => remove(wish.id)} style={{
                    background:'none', border:'none', color:'var(--text3)',
                    cursor:'pointer', fontSize:16, padding:'0 4px', lineHeight:1, flexShrink:0,
                  }}>×</button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
