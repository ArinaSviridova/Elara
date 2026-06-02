import { useState } from 'react'
import { useLang, useRl } from '../context/LangContext'
import { useNavigate } from 'react-router-dom'

export default function AboutPage() {
  const { lang } = useLang()
  const rl = useRl()
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(null)

  const toggle = (k) => setExpanded(p => p === k ? null : k)

  const Section = ({ id, emoji, title, children }) => (
    <div style={{ marginBottom:8 }}>
      <button onClick={() => toggle(id)} style={{
        width:'100%', padding:'14px 16px', borderRadius:12, cursor:'pointer', textAlign:'left',
        display:'flex', alignItems:'center', justifyContent:'space-between',
        background:'var(--bg2)', border:'1px solid var(--border)', color:'var(--text)',
      }}>
        <span style={{ fontWeight:500 }}>{emoji} {title}</span>
        <span style={{ color:'var(--text3)', fontSize:14 }}>{expanded===id?'▲':'▼'}</span>
      </button>
      {expanded === id && (
        <div style={{ padding:'14px 16px', background:'var(--bg3)', borderRadius:'0 0 12px 12px',
          border:'1px solid var(--border)', borderTop:'none', fontSize:13, color:'var(--text2)', lineHeight:1.7 }}>
          {children}
        </div>
      )}
    </div>
  )

  return (
    <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', padding:'20px 16px', gap:14, overflowY:'auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <button onClick={() => navigate(-1)} style={{ background:'none', border:'none', color:'var(--text2)', cursor:'pointer', fontSize:20 }}>‹</button>
        <h2 style={{ fontSize:22 }}>✦ Elara</h2>
      </div>

      {/* Главный блок */}
      <div style={{ padding:'20px', background:'var(--bg2)', borderRadius:16, border:'1px solid var(--border)', textAlign:'center' }}>
        <div style={{ fontSize:36, marginBottom:10 }}>✦</div>
        <div style={{ fontSize:20, fontFamily:'Cormorant Garamond, serif', marginBottom:8, color:'var(--text)' }}>
          {rl('Приватный календарь ритмов тела','Private body rhythm calendar')}
        </div>
        <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7, margin:0 }}>
          {rl(
            'Elara - это wellness-приложение для отслеживания самочувствия, цикла, лекарств, гормонов и общих окошек с близкими. Не медицинский сервис.',
            'Elara is a wellness app for tracking wellbeing, cycle, medications, hormones and shared plans with loved ones. Not a medical service.'
          )}
        </p>
      </div>

      {/* Что Elara делает */}
      <Section id="does" emoji="✓" title={rl('Что Elara делает', 'What Elara does')}>
        {[
          rl('Дневник самочувствия - энергия, настроение, боль, сон, либидо', 'Wellbeing journal - energy, mood, pain, sleep, libido'),
          rl('Календарь цикла и трекинг симптомов', 'Cycle calendar and symptom tracking'),
          rl('Напоминания о препаратах, которые ты добавил(а) сам(а)', 'Reminders for medications you added yourself'),
          rl('Общие окошки с близкими - когда всем норм', "Shared windows with loved ones - when everyone's okay"),
          rl('AI-сводки по личным данным для обсуждения с врачом', 'AI summaries of personal data for discussion with doctor'),
          rl('Загрузка и распознавание анализов (для себя, не диагноз)', 'Upload and recognize tests (for yourself, not diagnosis)'),
          rl('Статус дня без раскрытия медицинских данных близким', 'Day status without revealing medical data to others'),
        ].map((item, i) => (
          <div key={i} style={{ display:'flex', gap:8, marginBottom:6 }}>
            <span style={{ color:'#4ade80', flexShrink:0 }}>✓</span>
            <span>{item}</span>
          </div>
        ))}
      </Section>

      {/* Что Elara НЕ делает */}
      <Section id="doesnt" emoji="✗" title={rl('Что Elara не делает', 'What Elara does NOT do')}>
        <div style={{ padding:'10px 12px', background:'rgba(248,113,113,0.08)', borderRadius:8, marginBottom:12, fontSize:12, color:'#f87171' }}>
          {rl('Elara - wellness-приложение, не медицинский сервис. Не заменяет врача.',
              'Elara is a wellness app, not a medical service. Does not replace a doctor.')}
        </div>
        {[
          rl('Не ставит диагнозы', 'Does not diagnose'),
          rl('Не назначает лечение или дозировки', 'Does not prescribe treatment or dosages'),
          rl('AI не является медицинской рекомендацией', 'AI is not medical advice'),
          rl('Не интерпретирует анализы как врач', 'Does not interpret tests as a doctor'),
          rl('Не определяет беременность', 'Does not determine pregnancy'),
          rl('Не предсказывает риск заболеваний', 'Does not predict disease risk'),
        ].map((item, i) => (
          <div key={i} style={{ display:'flex', gap:8, marginBottom:6 }}>
            <span style={{ color:'#f87171', flexShrink:0 }}>✗</span>
            <span>{item}</span>
          </div>
        ))}
      </Section>

      {/* Приватность */}
      <Section id="privacy" emoji="🔒" title={rl('Приватность и безопасность', 'Privacy & safety')}>
        {[
          [rl('Row Level Security', 'Row Level Security'), rl('Данные каждого пользователя изолированы на уровне БД', "Each user's data is isolated at database level")],
          [rl('API ключи только на сервере', 'API keys server-side only'), rl('Никаких секретов на фронтенде', 'No secrets on frontend')],
          [rl('Гранулярный шаринг', 'Granular sharing'), rl('Друзья видят только то, что ты разрешил(а)', 'Friends see only what you allow')],
          [rl('PIN-блокировка', 'PIN lock'), rl('Двойной PIN: реальный и отвлекающий', 'Dual PIN: real and decoy')],
          [rl('Скрытые уведомления', 'Hidden notifications'), rl('Названия препаратов не видны на экране блокировки', 'Medication names hidden on lock screen')],
          [rl('Экспорт и удаление данных', 'Export & delete data'), rl('Полный контроль над своими данными', 'Full control over your data')],
          [rl('Журнал просмотров', 'View log'), rl('Ты видишь кто и что смотрел', 'You see who viewed what')],
        ].map(([k, v], i) => (
          <div key={i} style={{ marginBottom:8 }}>
            <span style={{ color:'var(--accent)', fontWeight:500 }}>{k}:</span> {v}
          </div>
        ))}
      </Section>

      {/* AI */}
      <Section id="ai" emoji="✦" title={rl('Как работает AI', 'How AI works')}>
        <p style={{ margin:'0 0 10px' }}>
          {rl(
            'Elara использует GPT-4 через Supabase Edge Functions. Все запросы обрабатываются на сервере - API-ключи никогда не попадают на устройство.',
            'Elara uses GPT-4 via Supabase Edge Functions. All requests processed server-side - API keys never reach your device.'
          )}
        </p>
        <p style={{ margin:0, padding:'10px 12px', background:'rgba(167,139,250,0.08)', borderRadius:8, fontSize:12, color:'var(--text2)' }}>
          {rl(
            '⚠️ AI анализирует твои записи и даёт наблюдения - это не медицинские рекомендации. Все выводы - для обсуждения с врачом.',
            '⚠️ AI analyzes your records and provides observations - not medical recommendations. All insights are for discussion with your doctor.'
          )}
        </p>
      </Section>

      {/* Позиционирование */}
      <Section id="position" emoji="🌍" title={rl('Для кого Elara', 'Who Elara is for')}>
        {[
          [rl('Люди с циклом', 'People with cycles'), rl('Отслеживание, анализ, подготовка к врачу', 'Tracking, analysis, doctor prep')],
          [rl('Гормональная терапия', 'Hormone therapy'), rl('ГАТ, ЗГТ, контрацепция - без гендерных предположений', 'HRT, GAHT, contraception - without gender assumptions')],
          [rl('Пары и подруги', 'Couples & friends'), rl('Синхронизация состояний, общие окошки', 'State sync, shared windows')],
          [rl('ЛГБТК+', 'LGBTQ+'), rl('Тело и гендер разделены - интерфейс без предположений', 'Body and gender separated - interface without assumptions')],
          [rl('Хронические состояния', 'Chronic conditions'), rl('СПКЯ, эндометриоз, мигрень, тревожность и другие', 'PCOS, endometriosis, migraine, anxiety and others')],
          [rl('Мужское здоровье', 'Male health'), rl('Энергия, сон, либидо, лекарства, общие окошки', 'Energy, sleep, libido, meds, shared windows')],
        ].map(([k, v], i) => (
          <div key={i} style={{ display:'flex', gap:10, marginBottom:8, padding:'8px 10px', background:'var(--bg2)', borderRadius:8 }}>
            <span style={{ fontWeight:500, color:'var(--accent)', minWidth:120 }}>{k}</span>
            <span style={{ color:'var(--text2)', fontSize:12 }}>{v}</span>
          </div>
        ))}
      </Section>

      {/* Наука */}
      <Section id="science" emoji="📚" title={rl('Научная база', 'Scientific basis')}>
        <p style={{ margin:'0 0 10px', fontSize:12 }}>
          {rl(
            'Советы и алгоритмы Elara опираются на рецензируемые исследования PubMed/PMC. Более 100 исследований в базе знаний.',
            "Elara's advice and algorithms are based on peer-reviewed PubMed/PMC research. 100+ studies in the knowledge base."
          )}
        </p>
        <button onClick={() => navigate('/research')} style={{
          padding:'8px 16px', borderRadius:8, border:'1px solid var(--accent)',
          background:'var(--accent-soft)', color:'var(--accent)', fontSize:12, cursor:'pointer',
        }}>
          {rl('Открыть базу исследований →', 'Open research database →')}
        </button>
      </Section>

      {/* Дисклеймер */}
      <div style={{ padding:'14px 16px', background:'rgba(248,113,113,0.06)', borderRadius:12, border:'1px solid rgba(248,113,113,0.2)', fontSize:12, color:'var(--text2)', lineHeight:1.7 }}>
        <strong style={{ color:'#f87171' }}>⚠️ {rl('Медицинский дисклеймер','Medical disclaimer')}</strong><br/>
        {rl(
          'Elara не является медицинским устройством и не проходила клинической сертификации. Информация в приложении не является медицинским советом, диагнозом или предписанием лечения. Всегда консультируйся с квалифицированным специалистом по вопросам здоровья.',
          'Elara is not a medical device and has not undergone clinical certification. Information in the app is not medical advice, diagnosis or treatment prescription. Always consult a qualified healthcare professional regarding health matters.'
        )}
      </div>

      <div style={{ textAlign:'center', padding:'10px 0', fontSize:11, color:'var(--text3)' }}>
        Elara · wellness, not medicine · v2.0
      </div>
    </div>
  )
}
