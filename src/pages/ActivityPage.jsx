import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang, useRl } from '../context/LangContext'
import { DnDActivityButton } from '../components/DnDWidget'

const ACTIVITY_OPTIONS = [
  { key:'dinner', emoji:'🍷', ru:'Ужин', en:'Dinner', be:'Вячэра' },
  { key:'cinema', emoji:'🎬', ru:'Кино', en:'Cinema', be:'Кіно' },
  { key:'walk', emoji:'🌿', ru:'Прогулка', en:'Walk', be:'Прагулка' },
  { key:'home', emoji:'🏠', ru:'Дома вместе', en:'Stay home', be:'Дома разам' },
  { key:'trip', emoji:'✈️', ru:'Поездка', en:'Trip', be:'Паездка' },
  { key:'gym', emoji:'🏋️', ru:'Тренировка вместе', en:'Workout together', be:'Трэніроўка' },
  { key:'yoga', emoji:'🧘', ru:'Йога/медитация', en:'Yoga/meditation', be:'Ёга' },
  { key:'run', emoji:'🏃', ru:'Пробежка', en:'Run together', be:'Прабежка' },
  { key:'swim', emoji:'🏊', ru:'Бассейн', en:'Swimming', be:'Басейн' },
  { key:'cafe', emoji:'☕', ru:'Кафе', en:'Cafe', be:'Кавярня' },
  { key:'museum', emoji:'🎨', ru:'Музей/выставка', en:'Museum', be:'Музей' },
  { key:'concert', emoji:'🎵', ru:'Концерт', en:'Concert', be:'Канцэрт' },
  { key:'spa', emoji:'💆', ru:'Спа/массаж', en:'Spa/massage', be:'Спа' },
  { key:'intimate', emoji:'🌹', ru:'Интимный вечер', en:'Intimate evening', be:'Інтымны вечар' },
  { key:'board_games', emoji:'🎲', ru:'Настолки', en:'Board games', be:'Настолкі' },
  { key:'custom', emoji:'✨', ru:'Своё', en:'Custom', be:'Сваё' },
]

export default function ActivityPage() {
  const { user } = useAuth()
  const { lang } = useLang()
  const rl = (ru, en, be) => lang === 'en' ? en : (lang === 'be' ? (be||ru) : ru)

  const [members, setMembers] = useState([])
  const [selectedMembers, setSelectedMembers] = useState([])
  const [activity, setActivity] = useState('')
  const [customActivity, setCustomActivity] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0,10))
  const [time, setTime] = useState('19:00')
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [freeWindows, setFreeWindows] = useState([])

  useEffect(() => { fetchMembers() }, [])

  async function fetchMembers() {
    const { data: myGroups } = await supabase.from('groups').select('id').eq('owner_id', user.id)
    const myGroupIds = (myGroups || []).map(g => g.id)
    if (!myGroupIds.length) return
    const { data } = await supabase
      .from('group_members')
      .select('*, user:user_id(id, name)')
      .in('group_id', myGroupIds)
      .neq('user_id', user.id)
    setMembers(data || [])
  }

  async function sendInvite() {
    if (!activity || !selectedMembers.length) return
    setSending(true)
    const actLabel = activity === 'custom'
      ? customActivity
      : ACTIVITY_OPTIONS.find(a => a.key === activity)?.[lang === 'en' ? 'en' : lang === 'be' ? 'be' : 'ru'] || activity

    try {
      await supabase.functions.invoke('ai-advisor', {
        body: {
          userId: user.id,
          requestType: 'activity_invite',
          targetUserIds: selectedMembers,
          activityType: actLabel,
          date, time, note, language: lang,
        }
      })
      setSent(true)
      setTimeout(() => setSent(false), 3000)
    } catch (e) { console.error(e) }
    setSending(false)
  }

  return (
    <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', padding:'24px 20px', gap:16, overflowY:'auto' }}>
      <h2 style={{ fontSize:28 }}>🗓 {rl('Провести время','Plan time','Правесці час')}</h2>
      <p style={{ fontSize:13, color:'var(--text2)', marginTop:-8, lineHeight:1.6 }}>
        {rl('Предложи партнёру или подругам провести время вместе','Suggest spending time together with partner or friends','Прапануй партнёру або сяброўкам правесці час разам')}
      </p>

      {/* Тип активности */}
      <div>
        <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>
          {rl('Что делаем?','What are we doing?','Што робім?')}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:7 }}>
          {ACTIVITY_OPTIONS.map(opt => (
            <button key={opt.key} onClick={() => setActivity(opt.key)} style={{
              padding:'10px 8px', borderRadius:10, cursor:'pointer', fontSize:12,
              border:`1px solid ${activity===opt.key?'var(--accent)':'var(--border)'}`,
              background:activity===opt.key?'var(--accent-soft)':'var(--bg2)',
              color:activity===opt.key?'var(--accent)':'var(--text2)',
              display:'flex', flexDirection:'column', alignItems:'center', gap:4,
            }}>
              <span style={{ fontSize:20 }}>{opt.emoji}</span>
              <span style={{ fontSize:10 }}>{lang==='en'?opt.en:lang==='be'?opt.be:opt.ru}</span>
            </button>
          ))}
        </div>
        {activity === 'custom' && (
          <input placeholder={rl('Введи своё...','Enter your activity...','Увядзі сваё...')}
            value={customActivity} onChange={e => setCustomActivity(e.target.value)}
            style={{ marginTop:8 }} autoFocus />
        )}
      </div>

      {/* Дата и время */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
        <div>
          <div style={{ fontSize:11, color:'var(--text3)', marginBottom:5 }}>{rl('Дата','Date','Дата')}</div>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div>
          <div style={{ fontSize:11, color:'var(--text3)', marginBottom:5 }}>{rl('Время','Time','Час')}</div>
          <input type="time" value={time} onChange={e => setTime(e.target.value)} />
        </div>
      </div>

      {/* Заметка */}
      <div>
        <div style={{ fontSize:11, color:'var(--text3)', marginBottom:5 }}>{rl('Заметка (необязательно)','Note (optional)','Нататка (неабавязкова)')}</div>
        <input placeholder={rl('Например: ресторан на Руставели...','E.g.: restaurant on Rustaveli...','Напрыклад: рэстаран...')}
          value={note} onChange={e => setNote(e.target.value)} />
      </div>

      {/* Кому */}
      {members.length > 0 && (
        <div>
          <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>
            {rl('Кому предложить','Who to invite','Каму прапанаваць')}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
            {members.map(m => (
              <label key={m.id} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}>
                <input type="checkbox"
                  checked={selectedMembers.includes(m.user_id)}
                  onChange={e => setSelectedMembers(prev =>
                    e.target.checked ? [...prev, m.user_id] : prev.filter(id => id !== m.user_id)
                  )}
                  style={{ width:16, height:16, accentColor:'var(--accent)' }} />
                <div style={{ width:30, height:30, borderRadius:'50%', background:m.member_color||'var(--accent-soft)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:600, color:'#0a0a0a' }}>
                  {m.user?.name?.[0]?.toUpperCase()}
                </div>
                <span style={{ fontSize:13, color:'var(--text)' }}>{m.user?.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {members.length === 0 && (
        <div style={{ background:'var(--bg2)', borderRadius:10, padding:'14px', fontSize:13, color:'var(--text3)', textAlign:'center' }}>
          {rl('Сначала добавь кого-то в Круг','First add someone to your Circle','Спачатку дадай кагосьці ў Круг')}
        </div>
      )}

      <DnDActivityButton activity={activity === 'custom' ? customActivity : ACTIVITY_OPTIONS.find(a=>a.key===activity)?.[lang==='en'?'en':lang==='be'?'be':'ru'] || activity} />

      {sent ? (
        <div style={{ textAlign:'center', padding:'16px', background:'rgba(74,222,128,0.1)', borderRadius:10, border:'1px solid #4ade80', fontSize:14, color:'#4ade80' }}>
          ✓ {rl('Приглашение отправлено!','Invitation sent!','Запрашэнне адпраўлена!')}
        </div>
      ) : (
        <button className="btn btn-primary" onClick={sendInvite}
          disabled={sending || !activity || !selectedMembers.length || (activity==='custom' && !customActivity)}>
          {sending
            ? rl('Отправляю...','Sending...','Адпраўляю...')
            : `🗓 ${rl('Предложить','Suggest','Прапанаваць')}`}
        </button>
      )}
    </div>
  )
}
