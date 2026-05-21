import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'

export default function BottomNav() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { t } = useLang()

  const TABS = [
    { path: '/',        icon: '◯', label: t.cycle },
    { path: '/friends', icon: '✦', label: t.groups },
    { path: '/diary',   icon: '◈', label: t.diary },
    { path: '/profile', icon: '⊹', label: t.profile },
  ]

  if (profile?.body_mode === 'pregnant') {
    TABS.splice(2, 0, { path: '/pregnancy', icon: '🌸', label: t.lang === 'en' ? 'Baby' : 'Беременность' })
  }

  return (
    <nav style={{
      display: 'flex',
      borderTop: '1px solid var(--border)',
      background: 'var(--bg)',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {TABS.map(tab => {
        const active = pathname === tab.path
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 3, padding: '11px 0',
              background: 'none', border: 'none', cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 18, color: active ? 'var(--accent)' : 'var(--text3)', lineHeight: 1 }}>
              {tab.icon}
            </span>
            <span style={{
              fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase',
              color: active ? 'var(--accent)' : 'var(--text3)',
            }}>
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
