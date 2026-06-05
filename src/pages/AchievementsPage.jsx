import { useNavigate } from 'react-router-dom'
import { useLang, useRl } from '../context/LangContext'
import { useAuth } from '../context/AuthContext'
import { ACHIEVEMENTS, getEarnedAchievements, hasAchievement } from '../lib/achievements'

const CATEGORY_LABELS = {
  start:    { ru: '🚀 Старт',       en: '🚀 Start' },
  progress: { ru: '📈 Прогресс',   en: '📈 Progress' },
  nutrition:{ ru: '🥗 Питание',     en: '🥗 Nutrition' },
  safety:   { ru: '🆘 Безопасность', en: '🆘 Safety' },
  social:   { ru: '👥 Социальные', en: '👥 Social' },
  special:  { ru: '⭐ Особые',     en: '⭐ Special' },
}

export default function AchievementsPage() {
  const navigate = useNavigate()
  const { lang } = useLang()
  const rl = useRl()
  const { profile } = useAuth()

  const earned = getEarnedAchievements(profile)
  const earnedKeys = new Set(earned.map(a => a.key))
  const total = ACHIEVEMENTS.length
  const earnedCount = earned.length

  const categories = ['start', 'progress', 'nutrition', 'safety', 'social', 'special']

  return (
    <div className="page-enter" style={{ flex:1, overflowY:'auto', padding:'18px 16px 28px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
        <button onClick={() => navigate('/profile')} className="btn btn-ghost"
          style={{ width:'auto', padding:'8px 11px' }}>‹</button>
        <div>
          <h2 style={{ fontSize:24, margin:0 }}>🏆 {rl('Достижения', 'Achievements')}</h2>
          <p style={{ margin:'4px 0 0', fontSize:13, color:'var(--text3)' }}>
            {earnedCount} / {total} {rl('получено', 'earned')}
          </p>
        </div>
      </div>

      {/* Прогресс-бар */}
      <div style={{ height:6, background:'var(--bg3)', borderRadius:999, overflow:'hidden', marginBottom:24 }}>
        <div style={{ width:`${(earnedCount/total)*100}%`, height:'100%',
          background:'linear-gradient(90deg, var(--accent), #4ade80)', transition:'width 0.3s' }} />
      </div>

      {categories.map(cat => {
        const catAchievements = ACHIEVEMENTS.filter(a => a.category === cat)
        const label = lang === 'en' ? CATEGORY_LABELS[cat].en : CATEGORY_LABELS[cat].ru
        return (
          <div key={cat} style={{ marginBottom:24 }}>
            <div style={{ fontSize:12, fontWeight:700, color:'var(--text3)',
              textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:10 }}>
              {label}
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {catAchievements.map(ach => {
                const isEarned = earnedKeys.has(ach.key)
                const earnedData = earned.find(e => e.key === ach.key)
                return (
                  <div key={ach.key} className="card" style={{
                    padding:'12px 14px', display:'flex', gap:14, alignItems:'center',
                    opacity: isEarned ? 1 : 0.45,
                    border: isEarned ? `1px solid ${ach.color}40` : '1px solid var(--border)',
                    background: isEarned ? `${ach.color}08` : 'var(--bg2)',
                  }}>
                    <div style={{ fontSize:28, flexShrink:0,
                      filter: isEarned ? 'none' : 'grayscale(1)' }}>
                      {ach.emoji}
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:600,
                        color: isEarned ? ach.color : 'var(--text3)' }}>
                        {lang === 'en' ? ach.titleEn : ach.titleRu}
                      </div>
                      <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>
                        {lang === 'en' ? ach.descEn : ach.descRu}
                      </div>
                      {isEarned && earnedData?.earned_at && (
                        <div style={{ fontSize:10, color:'var(--text3)', marginTop:4 }}>
                          {new Date(earnedData.earned_at).toLocaleDateString(lang === 'en' ? 'en' : 'ru')}
                        </div>
                      )}
                    </div>
                    {isEarned && (
                      <div style={{ fontSize:18, color: ach.color }}>✓</div>
                    )}
                    {!isEarned && (
                      <div style={{ fontSize:16, color:'var(--text3)' }}>🔒</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
