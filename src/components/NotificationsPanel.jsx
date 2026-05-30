// Панель уведомлений — встраивается в TodayPage
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../lib/useNotifications'
import { useAuth } from '../context/AuthContext'
import { useLang, useRl } from '../context/LangContext'

const PRIORITY_COLOR = {
  urgent: '#f87171',
  high:   '#fb923c',
  normal: 'var(--accent)',
  low:    'var(--text3)',
}

const TYPE_ICON = {
  activity_invite:  '📅',
  partner_message:  '💌',
  med_reminder:     '💊',
  cycle_alert:      '🩸',
  health_alert:     '⚡',
  pregnancy_task:   '🌱',
  push_invite:      '🎲',
  custom:           '🔔',
}

function timeAgo(dateStr, lang) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const min  = Math.floor(diff / 60000)
  const hour = Math.floor(diff / 3600000)
  const day  = Math.floor(diff / 86400000)
  if (lang === 'en') {
    if (min < 2)   return 'just now'
    if (min < 60)  return `${min}m ago`
    if (hour < 24) return `${hour}h ago`
    return `${day}d ago`
  }
  if (min < 2)   return 'только что'
  if (min < 60)  return `${min} мин назад`
  if (hour < 24) return `${hour} ч назад`
  if (day === 1) return 'вчера'
  return `${day} дн назад`
}

export default function NotificationsPanel() {
  const { user } = useAuth()
  const { lang } = useLang()
  const rl = useRl()
  const navigate = useNavigate()

  const { notifications, unreadCount, loading, markRead, markAllRead, dismiss, dismissAll } = useNotifications(user?.id)

  const [expanded, setExpanded] = useState(null)  // id открытого уведомления
  const [panelOpen, setPanelOpen] = useState(false)

  function handleOpen(notif) {
    if (expanded === notif.id) {
      setExpanded(null)
      return
    }
    setExpanded(notif.id)
    if (!notif.is_read) markRead(notif.id)
  }

  function handleGo(notif) {
    dismiss(notif.id)
    setExpanded(null)
    if (notif.action_url) navigate(notif.action_url)
  }

  // Считаем только непрочитанные для бейджа
  const hasUnread = unreadCount > 0

  return (
    <div style={{ marginBottom: 4 }}>
      {/* Кнопка-заголовок панели */}
      <button
        onClick={() => {
          setPanelOpen(p => !p)
          if (!panelOpen && hasUnread) markAllRead()
        }}
        style={{
          width:'100%', padding:'12px 16px', borderRadius:14, cursor:'pointer',
          border:`1px solid ${hasUnread?'var(--accent)':'var(--border)'}`,
          background: hasUnread
            ? 'linear-gradient(135deg, var(--accent-soft), rgba(167,139,250,0.04))'
            : 'var(--bg2)',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          transition:'all 0.2s',
        }}
      >
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:18 }}>🔔</span>
          <div style={{ textAlign:'left' }}>
            <div style={{ fontSize:14, fontWeight:500, color:'var(--text)' }}>
              {rl('Уведомления','Notifications')}
            </div>
            <div style={{ fontSize:11, color:'var(--text3)', marginTop:1 }}>
              {loading ? rl('Загрузка...','Loading...')
               : notifications.length === 0 ? rl('Всё спокойно','All quiet')
               : hasUnread ? rl(`${unreadCount} новых`, `${unreadCount} new`)
               : rl(`${notifications.length} уведомлений`, `${notifications.length} notifications`)}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {hasUnread && (
            <div style={{
              minWidth:22, height:22, borderRadius:11, background:'var(--accent)',
              color:'#fff', fontSize:11, fontWeight:700,
              display:'flex', alignItems:'center', justifyContent:'center', padding:'0 6px',
            }}>{unreadCount > 99 ? '99+' : unreadCount}</div>
          )}
          <span style={{ color:'var(--text3)', fontSize:14, transition:'transform 0.2s',
            transform:panelOpen?'rotate(180deg)':'none' }}>▼</span>
        </div>
      </button>

      {/* Список уведомлений */}
      {panelOpen && (
        <div style={{ marginTop:6, display:'flex', flexDirection:'column', gap:4 }}>
          {/* Шапка с кнопкой "Очистить всё" */}
          {notifications.length > 0 && (
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:2 }}>
              <button onClick={dismissAll} style={{
                fontSize:11, color:'var(--text3)', background:'none', border:'none', cursor:'pointer',
                padding:'2px 6px',
              }}>
                {rl('Очистить всё','Clear all')}
              </button>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign:'center', padding:'24px', color:'var(--text3)', fontSize:13 }}>⟳</div>
          ) : notifications.length === 0 ? (
            <div style={{ textAlign:'center', padding:'28px 16px', color:'var(--text3)', fontSize:13, lineHeight:1.7,
              background:'var(--bg2)', borderRadius:12, border:'1px solid var(--border)' }}>
              🌿<br/>{rl('Уведомлений нет','No notifications')}
            </div>
          ) : (
            notifications.map(notif => {
              const isOpen = expanded === notif.id
              const icon = notif.emoji || TYPE_ICON[notif.type] || '🔔'
              const pColor = PRIORITY_COLOR[notif.priority] || 'var(--accent)'

              return (
                <div
                  key={notif.id}
                  style={{
                    borderRadius:12, overflow:'hidden',
                    border:`1px solid ${notif.is_read?'var(--border)':pColor+'50'}`,
                    background:notif.is_read?'var(--bg2)':'var(--bg2)',
                    transition:'all 0.2s',
                  }}
                >
                  {/* Строка уведомления */}
                  <div
                    onClick={() => handleOpen(notif)}
                    style={{
                      padding:'11px 14px', cursor:'pointer',
                      display:'flex', alignItems:'center', gap:10,
                      background:notif.is_read?'transparent':`${pColor}08`,
                    }}
                  >
                    {/* Индикатор непрочитанного */}
                    <div style={{
                      width:6, height:6, borderRadius:'50%', flexShrink:0,
                      background:notif.is_read?'transparent':pColor,
                      boxShadow:notif.is_read?'none':`0 0 6px ${pColor}`,
                    }} />

                    {/* Иконка */}
                    <span style={{ fontSize:18, flexShrink:0 }}>{icon}</span>

                    {/* Текст */}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{
                        fontSize:13, fontWeight:notif.is_read?400:500,
                        color:'var(--text)', whiteSpace:'nowrap',
                        overflow:'hidden', textOverflow:'ellipsis',
                      }}>
                        {notif.title}
                      </div>
                      <div style={{ fontSize:11, color:'var(--text3)', marginTop:1 }}>
                        {timeAgo(notif.created_at, lang)}
                      </div>
                    </div>

                    {/* Кнопки */}
                    <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                      <button
                        onClick={e => { e.stopPropagation(); dismiss(notif.id) }}
                        style={{ background:'none', border:'none', color:'var(--text3)',
                          cursor:'pointer', fontSize:16, padding:'0 2px', lineHeight:1 }}
                      >×</button>
                      <span style={{ color:'var(--text3)', fontSize:12,
                        transform:isOpen?'rotate(180deg)':'none', transition:'transform 0.2s', display:'block' }}>
                        ▼
                      </span>
                    </div>
                  </div>

                  {/* Раскрытый контент */}
                  {isOpen && (
                    <div style={{
                      padding:'0 14px 14px',
                      borderTop:`1px solid ${pColor}20`,
                    }}>
                      {/* Тело уведомления */}
                      {notif.body && (
                        <p style={{
                          fontSize:13, color:'var(--text2)', lineHeight:1.6,
                          margin:'10px 0 12px',
                        }}>
                          {notif.body}
                        </p>
                      )}

                      {/* Мета-инфо */}
                      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:12 }}>
                        {notif.source_type && (
                          <span style={{
                            fontSize:10, padding:'2px 8px', borderRadius:10,
                            background:`${pColor}15`, color:pColor, letterSpacing:'0.05em',
                          }}>
                            {({
                              sync:'Круг', medications:'Лекарства', calendar:'Календарь',
                              health:'Здоровье', friends:'Друзья', pregnancy:'Беременность',
                            })[notif.source_type] || notif.source_type}
                          </span>
                        )}
                        <span style={{ fontSize:10, color:'var(--text3)' }}>
                          {new Date(notif.created_at).toLocaleString(
                            lang === 'en' ? 'en-US' : 'ru-RU',
                            { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }
                          )}
                        </span>
                      </div>

                      {/* Кнопки действий */}
                      <div style={{ display:'flex', gap:8 }}>
                        {notif.action_url && (
                          <button
                            onClick={() => handleGo(notif)}
                            className="btn btn-primary btn-sm"
                            style={{ flex:1, padding:'9px 14px', fontSize:13 }}
                          >
                            {rl('Перейти','Go there')} →
                          </button>
                        )}
                        <button
                          onClick={() => dismiss(notif.id)}
                          className="btn btn-ghost btn-sm"
                          style={{ flex:notif.action_url?0:1, padding:'9px 14px', fontSize:13 }}
                        >
                          {rl('Закрыть','Dismiss')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
