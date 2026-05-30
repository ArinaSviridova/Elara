import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { useUnreadCount } from '../lib/useNotifications'
import { getCalendarBottomTab } from '../lib/calendarMode'

export default function BottomNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { lang } = useLang()
  const { user } = useAuth()
  const unreadCount = useUnreadCount(user?.id)

  const rl = (ru, en, be) => lang === 'en' ? en : (lang === 'be' ? (be || ru) : ru)
  const calendarTab = getCalendarBottomTab(profile, lang)

  const TABS = [
    { path: '/today', icon: '✦', label: rl('Сегодня', 'Today', 'Сёння') },
    calendarTab,
    { path: '/health', icon: '🩺', label: rl('Здоровье', 'Health', 'Здароўе') },
    { path: '/friends', icon: '✦', label: rl('Круг', 'Circle', 'Круг') },
    { path: '/profile', icon: '⊹', label: rl('Профиль', 'Profile', 'Профіль') },
  ]

  const isActive = (tabPath) => {
    if (tabPath === '/today') return pathname === '/today' || pathname === '/'
    if (tabPath === '/calendar') return pathname === '/calendar' || pathname === '/pregnancy'
    return pathname === tabPath
  }

  return (
    <nav style={{
      display:'flex', borderTop:'1px solid var(--border)',
      background:'var(--bg)', paddingBottom:'env(safe-area-inset-bottom)',
    }}>
      {TABS.map(tab => {
        const active = isActive(tab.path)
        return (
          <button key={tab.path} type="button" onClick={() => navigate(tab.path)} style={{
            flex:1, padding:'10px 4px 8px', background:'none', border:'none',
            color: active ? 'var(--accent)' : 'var(--text3)', cursor:'pointer',
            display:'flex', flexDirection:'column', alignItems:'center', gap:2,
            fontSize:11, transition:'color 0.15s',
          }}>
            <span style={{ fontSize:20, lineHeight:1, position:'relative', display:'inline-block' }}>
              {tab.icon}
              {tab.path === '/today' && unreadCount > 0 && (
                <span style={{
                  position:'absolute', top:-5, right:-7,
                  minWidth:15, height:15, borderRadius:8,
                  background:'#f87171', color:'#fff',
                  fontSize:8, fontWeight:700,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  padding:'0 3px', lineHeight:1, zIndex:1,
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </span>
            <span>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
