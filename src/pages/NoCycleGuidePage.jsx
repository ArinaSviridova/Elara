import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang, useRl } from '../context/LangContext'

const SECTIONS = [
  {
    icon:'🧭',
    ru:'Зачем Elara, если нет месячных',
    en:'Why Elara if you do not have periods',
    pointsRu:[
      'Elara всё ещё работает как трекер самочувствия: энергия, настроение, боль, либидо, сон, стресс и социальная батарейка.',
      'Можно планировать встречи с партнёром, друзьями и группами по реальному ресурсу, а не по героическому “я справлюсь”, которое обычно врёт.',
      'Можно вести здоровье: препараты, анализы, прививки, симптомы, вес, спорт и питание.',
    ],
    pointsEn:[
      'Elara still works as a wellbeing tracker: energy, mood, pain, libido, sleep, stress, and social battery.',
      'You can plan with partners, friends, and groups using real capacity instead of the heroic “I will manage”, that tiny liar.',
      'You can track health: meds, labs, vaccines, symptoms, weight, sport, and nutrition.',
    ],
  },
  {
    icon:'👥',
    ru:'Круг и партнёр',
    en:'Circle and partner',
    pointsRu:[
      'Близкие могут видеть только то, что ты разрешишь: статус дня, доступность, настроение, спорт или общие планы.',
      'Партнёру можно отправлять короткие просьбы: еда, тишина, прогулка, перенос встречи, поддержка.',
      'Если у партнёра есть цикл, Elara помогает учитывать его/её календарь без допросов и бытовой телепатии.',
    ],
    pointsEn:[
      'Loved ones see only what you allow: day status, availability, mood, sport, or shared plans.',
      'You can send short requests to a partner: food, quiet time, walk, reschedule, support.',
      'If your partner has a cycle, Elara helps account for their calendar without interrogation or household telepathy.',
    ],
  },
  {
    icon:'🧠',
    ru:'AI без фаз цикла',
    en:'AI without cycle phases',
    pointsRu:[
      'AI должен опираться на твои реальные отметки: сон, энергия, настроение, боль, спорт, питание и задачи.',
      'Для профилей без цикла Elara не должна советовать фолликулярную фазу, овуляцию, ПМС или месячные.',
      'Советы должны быть разными: не только ванна и прогулка, потому что человек - не чайный пакетик.',
    ],
    pointsEn:[
      'AI should use your real logs: sleep, energy, mood, pain, sport, nutrition, and tasks.',
      'For no-cycle profiles, Elara should not mention follicular phase, ovulation, PMS, or periods.',
      'Advice should vary: not just bath and walk, because humans are not tea bags.',
    ],
  },
  {
    icon:'🩺',
    ru:'Что отслеживать',
    en:'What to track',
    pointsRu:[
      'Вес и график веса, если тебе это полезно и не триггерит.',
      'Спорт и восстановление: тип активности, длительность, интенсивность и ощущения.',
      'Аптечка, первая помощь, препараты и анализы - скучно, зато полезно, как налоговая, только добрее.',
    ],
    pointsEn:[
      'Weight and weight trend, if useful and not triggering.',
      'Sport and recovery: activity type, duration, intensity, and how it felt.',
      'Medical kit, first aid, meds, and labs - boring but useful, like taxes, except kinder.',
    ],
  },
]

export default function NoCycleGuidePage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { lang } = useLang()
  const rl = useRl()
  const isEn = lang === 'en'

  return (
    <div className="page-enter" style={{ flex:1, overflowY:'auto', padding:'22px 16px 32px', display:'flex', flexDirection:'column', gap:14 }}>
      <button onClick={() => navigate(-1)} style={{ alignSelf:'flex-start', background:'none', border:'none', color:'var(--text2)', cursor:'pointer', fontSize:13, padding:0 }}>
        ‹ {rl('Назад','Back')}
      </button>

      <section className="card" style={{ padding:'18px 16px', background:'linear-gradient(180deg, rgba(96,165,250,0.14), rgba(167,139,250,0.06))', border:'1px solid rgba(96,165,250,0.24)' }}>
        <div style={{ fontSize:34, marginBottom:8 }}>🧭</div>
        <h2 style={{ fontSize:26, margin:'0 0 8px' }}>{rl('Гайд без цикла', 'No-cycle guide')}</h2>
        <p style={{ margin:0, color:'var(--text2)', fontSize:14, lineHeight:1.65 }}>
          {rl(
            `Этот режим для мужчин и всех, у кого нет месячных или кто не хочет вести цикл. Elara не превращается в бесполезный календарик - она становится системой здоровья, поддержки и планирования. Потрясающе, приложение умеет быть не только про матку.`,
            `This mode is for men and anyone who does not have periods or does not want to track a cycle. Elara becomes a health, support, and planning system, not a useless calendar.`
          )}
        </p>
        {profile?.name && <div style={{ marginTop:12, fontSize:12, color:'var(--text3)' }}>{rl('Профиль:', 'Profile:')} {profile.name}</div>}
      </section>

      {SECTIONS.map(section => (
        <section key={section.ru} className="card" style={{ padding:'14px 16px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
            <span style={{ fontSize:22 }}>{section.icon}</span>
            <h3 style={{ fontSize:18, margin:0 }}>{isEn ? section.en : section.ru}</h3>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {(isEn ? section.pointsEn : section.pointsRu).map(point => (
              <div key={point} style={{ display:'flex', gap:8, color:'var(--text2)', fontSize:13, lineHeight:1.55 }}>
                <span style={{ color:'var(--accent)' }}>•</span>
                <span>{point}</span>
              </div>
            ))}
          </div>
        </section>
      ))}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        <button className="btn btn-primary" onClick={() => navigate('/today')}>{rl('На сегодня','Today')}</button>
        <button className="btn btn-ghost" onClick={() => navigate('/sync')}>{rl('Круг','Circle')}</button>
      </div>
    </div>
  )
}
