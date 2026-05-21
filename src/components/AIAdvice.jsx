import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'

export default function AIAdvice({
  requestType = 'self_advice',
  targetUserId,
  groupId,
  label,
  cyclePhase,
  todayMood,
  diaryTags
}) {
  const { user, profile } = useAuth()
  const { lang } = useLang()
  const [advice, setAdvice] = useState('')
  const [loading, setLoading] = useState(false)
  const rl = (ru, en, be) => lang === 'en' ? en : (lang === 'be' ? (be || ru) : ru)

  async function fetchAdvice() {
    setLoading(true)
    setAdvice('')
    try {
      const today = new Date().toISOString().slice(0,10)

      // Загружаем актуальный контекст из БД
      const [{ data: diary }, { data: moodEntry }, { data: cycleEntry }] = await Promise.all([
        supabase.from('diary_entries').select('tags').eq('user_id', user.id).eq('date', today).maybeSingle(),
        supabase.from('mood_entries').select('mood').eq('user_id', user.id).eq('date', today).maybeSingle(),
        supabase.from('cycle_entries').select('type').eq('user_id', user.id).eq('date', today).limit(1).maybeSingle(),
      ])

      const { data, error } = await supabase.functions.invoke('ai-advisor', {
        body: {
          userId: user.id,
          requestType,
          targetUserId: targetUserId || user.id,
          groupId,
          language: lang,
          contextOverride: {
            cyclePhase: cyclePhase || cycleEntry?.type,
            mood: todayMood || moodEntry?.mood,
            diaryTags: diaryTags || diary?.tags || [],
            bodyMode: profile?.body_mode,
            gender: profile?.gender,
            pregnancyWeek: profile?.pregnancy_week,
            personalityTags: profile?.personality_tags || [],
            carePrefs: profile?.preferences?.care_prefs || [],
          }
        }
      })

      if (error) throw error
      setAdvice(data?.advice || rl('Позаботься о себе сегодня 🤍', 'Take care of yourself today 🤍', 'Паклапаціся пра сябе сёння 🤍'))
    } catch (e) {
      console.error('AI advice error:', e)
      setAdvice(rl('Не удалось получить совет. Попробуй позже.', 'Could not get advice. Try again later.', 'Не ўдалося атрымаць параду.'))
    }
    setLoading(false)
  }

  return (
    <div className="card" style={{ padding:'14px 16px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: advice ? 12 : 0 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:500, color:'var(--text)', display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ color:'var(--accent)' }}>✦</span>
            {label || rl('Совет на сегодня', "Today's advice", 'Парада на сёння')}
          </div>
          {!advice && !loading && (
            <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>
              {cyclePhase
                ? rl(`Фаза: ${cyclePhase}`, `Phase: ${cyclePhase}`, `Фаза: ${cyclePhase}`)
                : rl('Персональный — нажми чтобы получить', 'Personal — tap to get', 'Персанальны — націсні')}
            </div>
          )}
        </div>
        <button
          onClick={fetchAdvice}
          disabled={loading}
          style={{
            background:'var(--accent-soft)',
            border:'1px solid var(--border)',
            borderRadius:8,
            color:'var(--accent)',
            fontSize:12,
            padding:'7px 14px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            flexShrink:0,
            transition:'opacity 0.15s',
          }}
        >
          {loading
            ? rl('Думаю...', 'Thinking...', 'Думаю...')
            : advice
              ? '↻'
              : rl('Получить', 'Get', 'Атрымаць')}
        </button>
      </div>

      {advice && (
        <p style={{
          fontSize:15,
          color:'var(--text)',
          lineHeight:1.8,
          fontFamily:'Cormorant Garamond, serif',
          fontStyle:'italic',
          borderTop:'1px solid var(--border)',
          paddingTop:12,
          margin:0,
        }}>
          {advice}
        </p>
      )}
    </div>
  )
}
