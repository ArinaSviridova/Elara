import { useState, useEffect } from 'react'
import { getAchievement } from '../lib/achievements'
import { useLang } from '../context/LangContext'

// Глобальный эмиттер для показа тостов
let toastCallback = null
export function showAchievementToast(key) {
  if (toastCallback) toastCallback(key)
}

export default function AchievementToast() {
  const { lang } = useLang()
  const [visible, setVisible] = useState(false)
  const [queue, setQueue] = useState([])
  const [current, setCurrent] = useState(null)

  useEffect(() => {
    toastCallback = (key) => {
      setQueue(q => [...q, key])
    }
    return () => { toastCallback = null }
  }, [])

  useEffect(() => {
    if (!visible && queue.length > 0) {
      const [next, ...rest] = queue
      setQueue(rest)
      const ach = getAchievement(next)
      if (ach) {
        setCurrent(ach)
        setVisible(true)
        setTimeout(() => setVisible(false), 3500)
      }
    }
  }, [queue, visible])

  if (!visible || !current) return null

  return (
    <div style={{
      position: 'fixed', top: 60, left: '50%', transform: 'translateX(-50%)',
      zIndex: 9999, maxWidth: 320, width: 'calc(100vw - 32px)',
      background: `linear-gradient(135deg, var(--bg2), ${current.color}18)`,
      border: `1px solid ${current.color}60`,
      borderRadius: 16, padding: '14px 18px',
      display: 'flex', gap: 12, alignItems: 'center',
      boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${current.color}20`,
      animation: 'slideDown 0.3s ease',
    }}>
      <style>{`
        @keyframes slideDown {
          from { opacity:0; transform:translateX(-50%) translateY(-20px); }
          to   { opacity:1; transform:translateX(-50%) translateY(0); }
        }
      `}</style>
      <div style={{ fontSize: 36 }}>{current.emoji}</div>
      <div>
        <div style={{ fontSize: 11, color: current.color, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>
          🏆 {lang === 'en' ? 'Achievement unlocked!' : 'Достижение получено!'}
        </div>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
          {lang === 'en' ? current.titleEn : current.titleRu}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
          {lang === 'en' ? current.descEn : current.descRu}
        </div>
      </div>
    </div>
  )
}
