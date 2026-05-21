import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSub } from '../context/SubscriptionContext'
import { useLang } from '../context/LangContext'

export default function TrialBanner() {
  const { isTrial, trialDaysLeft } = useSub()
  const { lang } = useLang()
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState(false)
  const rl = (ru, en) => lang === 'en' ? en : ru
  const days = trialDaysLeft()

  if (!isTrial || dismissed || days > 5) return null

  return (
    <div style={{
      background: days <= 1 ? 'rgba(248,113,113,0.15)' : 'var(--accent-soft)',
      borderBottom: `1px solid ${days <= 1 ? '#f87171' : 'var(--accent)'}33`,
      padding:'8px 16px',
      display:'flex', alignItems:'center', justifyContent:'space-between',
      fontSize:12,
    }}>
      <span style={{ color: days <= 1 ? '#f87171' : 'var(--accent)' }}>
        ⏱ {rl(`Пробный период: ${days} дн осталось`, `Trial: ${days} days left`)}
      </span>
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={() => navigate('/subscription')} style={{
          background:'var(--accent)', color:'var(--bg)', border:'none',
          borderRadius:6, fontSize:11, padding:'4px 10px', cursor:'pointer',
        }}>
          {rl('Выбрать план','Choose plan')}
        </button>
        <button onClick={() => setDismissed(true)} style={{
          background:'none', border:'none', color:'var(--text3)', cursor:'pointer', fontSize:14,
        }}>×</button>
      </div>
    </div>
  )
}
