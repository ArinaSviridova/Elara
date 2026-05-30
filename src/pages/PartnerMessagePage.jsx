// Сообщение партнёру одной кнопкой — п.23 ТЗ
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang, useRl } from '../context/LangContext'
import { supabase } from '../lib/supabase'
import { Notifs } from '../lib/useNotifications'

const MESSAGE_TEMPLATES = [
  { key: 'quiet_evening', emoji: '🌙', ru: 'Сегодня мне нужен спокойный вечер', en: 'I need a quiet evening today' },
  { key: 'no_touch', emoji: '🤍', ru: 'Я не хочу телесного контакта, но хочу быть рядом', en: "I don't want physical contact but want to be near" },
  { key: 'med_reminder', emoji: '💊', ru: 'Можешь напомнить мне принять препарат?', en: 'Can you remind me to take my medication?' },
  { key: 'postpone', emoji: '📅', ru: 'Давай перенесём встречу на другой день?', en: "Let's reschedule for another day?" },
  { key: 'need_food', emoji: '🍜', ru: 'Мне было бы приятно если бы ты принёс/принесла еду', en: "I'd love it if you brought some food" },
  { key: 'need_talk', emoji: '💬', ru: 'Можешь написать мне? Хочу поговорить', en: 'Can you text me? I want to talk' },
  { key: 'need_alone', emoji: '🚪', ru: 'Мне нужно немного времени одной/одному', en: 'I need some time alone' },
  { key: 'good_day', emoji: '☀️', ru: 'Сегодня хороший день — можем встретиться!', en: "Today's a good day — we can meet!" },
  { key: 'low_energy', emoji: '🔋', ru: 'Низкая энергия сегодня, планируй без меня', en: 'Low energy today, plan without me' },
  { key: 'custom', emoji: '✏️', ru: 'Своё сообщение', en: 'Custom message' },
]

export default function PartnerMessagePage() {
  const { user, profile } = useAuth()
  const { lang } = useLang()
  const rl = useRl()
  const navigate = useNavigate()

  const [selected, setSelected] = useState(null)
  const [customText, setCustomText] = useState('')
  const [recipients, setRecipients] = useState([])
  const [friends, setFriends] = useState([])
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [aiGenerate, setAiGenerate] = useState(false)

  useState(() => {
    // Загружаем список друзей
    supabase.from('friendships').select('friend_id, profiles!friend_id(id, name, avatar_url)')
      .eq('owner_id', user.id)
      .then(({ data }) => setFriends(data?.map(f => f.profiles) || []))
  }, [])

  async function generateAIMessage() {
    setAiGenerate(true)
    const { data } = await supabase.functions.invoke('ai-advisor', {
      body: {
        userId: user.id,
        requestType: 'partner_message',
        language: lang,
        template: selected?.key,
        mood: profile?.today_mood,
        context: 'gentle_message',
      }
    })
    if (data?.message) setCustomText(data.message)
    setAiGenerate(false)
  }

  async function send() {
    if (!selected || recipients.length === 0) return
    setSending(true)
    const text = selected.key === 'custom' ? customText : (lang === 'en' ? selected.en : selected.ru)

    // Отправляем через push_invites как специальный тип
    for (const rid of recipients) {
      await supabase.from('push_invites').insert({
        from_user_id: user.id,
        to_user_id: rid,
        activity_type: `message:${selected.key}`,
        dice_result: null,
        status: 'pending',
        created_at: new Date().toISOString(),
      }).catch(() => null)
    }

    // Создаём уведомления
    try {
      const { data: sender } = await supabase.from('profiles').select('name').eq('id', user.id).single()
      const senderName = sender?.name || 'Кто-то'
      const msgText = selected.key === 'custom' ? customText : (lang === 'en' ? selected.en : selected.ru)
      await Promise.all(recipients.map(rid =>
        Notifs.partnerMessage(rid, senderName, msgText, null)
      ))
    } catch {}
    setSending(false)
    setSent(true)
    setTimeout(() => navigate(-1), 2000)
  }

  return (
    <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', padding:'20px 16px', gap:16, overflowY:'auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <button onClick={() => navigate(-1)} style={{ background:'none', border:'none', color:'var(--text2)', cursor:'pointer', fontSize:20 }}>‹</button>
        <h2 style={{ fontSize:22 }}>💌 {rl('Написать близкому','Message a loved one')}</h2>
      </div>

      <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6, margin:0 }}>
        {rl('Иногда сложно найти слова. Выбери шаблон — или напиши своё.','Sometimes it\'s hard to find words. Choose a template or write your own.')}
      </p>

      {/* Шаблоны */}
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {MESSAGE_TEMPLATES.map(t => (
          <button key={t.key} onClick={() => { setSelected(t); if(t.key!=='custom') setCustomText('') }} style={{
            padding:'12px 14px', borderRadius:10, cursor:'pointer', textAlign:'left',
            display:'flex', alignItems:'center', gap:12,
            border:`1.5px solid ${selected?.key===t.key?'var(--accent)':'var(--border)'}`,
            background:selected?.key===t.key?'var(--accent-soft)':'var(--bg2)',
          }}>
            <span style={{ fontSize:20 }}>{t.emoji}</span>
            <span style={{ fontSize:13, color:selected?.key===t.key?'var(--accent)':'var(--text)' }}>
              {lang==='en'?t.en:t.ru}
            </span>
          </button>
        ))}
      </div>

      {/* Своё сообщение */}
      {selected?.key === 'custom' && (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          <textarea
            placeholder={rl('Напиши своё сообщение...','Write your message...')}
            value={customText} onChange={e => setCustomText(e.target.value)}
            style={{ borderRadius:10, padding:'12px', fontSize:13, minHeight:80, resize:'vertical', background:'var(--bg2)', border:'1px solid var(--border)', color:'var(--text)' }}
          />
          <button onClick={generateAIMessage} disabled={aiGenerate} style={{
            background:'var(--accent-soft)', border:'1px solid var(--accent)', borderRadius:8,
            color:'var(--accent)', fontSize:12, padding:'7px 14px', cursor:'pointer', width:'fit-content',
          }}>
            {aiGenerate ? '⟳' : '✦'} {rl('Помоги сформулировать','Help me phrase it')}
          </button>
        </div>
      )}

      {/* Получатели */}
      {selected && friends.length > 0 && (
        <div className="card" style={{ padding:'14px' }}>
          <div style={{ fontSize:12, color:'var(--text3)', marginBottom:8 }}>
            {rl('Кому отправить?','Send to?')}
          </div>
          {friends.map(f => {
            const active = recipients.includes(f.id)
            return (
              <div key={f.id} onClick={() => setRecipients(prev => active?prev.filter(r=>r!==f.id):[...prev,f.id])}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', cursor:'pointer', borderBottom:'1px solid var(--border)' }}>
                <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--accent-soft)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, overflow:'hidden' }}>
                  {f.avatar_url ? <img src={f.avatar_url} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : f.name?.[0]}
                </div>
                <span style={{ flex:1, fontSize:13 }}>{f.name}</span>
                <div style={{ width:18, height:18, borderRadius:4, border:`1.5px solid ${active?'var(--accent)':'var(--border)'}`, background:active?'var(--accent)':'transparent', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {active && <span style={{ fontSize:11, color:'var(--bg)' }}>✓</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {sent ? (
        <div style={{ textAlign:'center', padding:'20px', color:'#4ade80', fontSize:14 }}>
          ✓ {rl('Отправлено!','Sent!')}
        </div>
      ) : (
        <button
          onClick={send}
          disabled={!selected || recipients.length === 0 || sending || (selected.key==='custom' && !customText.trim())}
          className="btn btn-primary"
        >
          {sending ? '⟳' : rl('Отправить 💌','Send 💌')}
        </button>
      )}
    </div>
  )
}
