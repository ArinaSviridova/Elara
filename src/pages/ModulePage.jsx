import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLang, useRl } from '../context/LangContext'
import { useAuth } from '../context/AuthContext'

// ─── Данные по модулям с исследованиями ─────────────────────────────────
const MODULE_DATA = {
  cycle: {
    emoji: '🩸',
    titleRu: 'Цикл и месячные',
    titleEn: 'Cycle & Periods',
    color: '#f472b6',
    descRu: 'Менструальный цикл — это сложная гормональная система, управляемая эстрогеном, прогестероном, ФСГ и ЛГ. Средняя длина цикла — 21–35 дней, но у каждого человека своя норма.',
    descEn: 'The menstrual cycle is a complex hormonal system driven by estrogen, progesterone, FSH and LH. Average cycle length is 21–35 days, but each person has their own normal.',
    studies: [
      { title: 'Variability in menstrual cycle length', pubmed: '22295606', takeawayRu: 'Длина цикла значительно варьируется у разных людей и в разные периоды жизни. Цикл 21–35 дней считается нормальным.', takeawayEn: 'Cycle length varies significantly between people and throughout life. 21–35 days is considered normal.' },
      { title: 'Hormonal fluctuations across the cycle', pubmed: '10905339', takeawayRu: 'Эстроген, прогестерон и ЛГ имеют предсказуемые паттерны. Пик ЛГ предшествует овуляции на 24–36 часов.', takeawayEn: 'Estrogen, progesterone, and LH follow predictable patterns. LH peak precedes ovulation by 24–36 hours.' },
      { title: 'Period pain mechanisms', pubmed: '25883839', takeawayRu: 'Болезненные месячные (дисменорея) вызваны простагландинами. НПВС эффективны для снятия боли, но могут задержать овуляцию при регулярном приёме.', takeawayEn: 'Painful periods (dysmenorrhea) are caused by prostaglandins. NSAIDs are effective for pain but may delay ovulation with regular use.' },
    ],
    tips: [
      { emojiRu: '📅 Отмечай дни', textRu: 'Данных за 3+ цикла достаточно для точного прогноза', emojiEn: '📅 Track days', textEn: '3+ cycles of data is enough for accurate predictions' },
      { emojiRu: '🌡 СТМ', textRu: 'Базальная температура + слизь = дополнительная точность', emojiEn: '🌡 STM', textEn: 'Basal temperature + mucus = additional accuracy' },
      { emojiRu: '⚡ НПВС', textRu: 'Ибупрофен в середине цикла может задержать овуляцию', emojiEn: '⚡ NSAIDs', textEn: 'Ibuprofen mid-cycle may delay ovulation' },
    ],
  },
  ovulation: {
    emoji: '✨',
    titleRu: 'Овуляция',
    titleEn: 'Ovulation',
    color: '#a78bfa',
    descRu: 'Овуляция — выход яйцеклетки из фолликула. Обычно происходит за 12–16 дней до начала следующих месячных. Яйцеклетка жизнеспособна 12–24 часа, сперматозоиды — до 5 дней.',
    descEn: 'Ovulation is the release of an egg from a follicle. It typically occurs 12–16 days before the next period. The egg is viable for 12–24 hours; sperm can survive up to 5 days.',
    studies: [
      { title: 'Fertile window detection', pubmed: '33042944', takeawayRu: 'Фертильное окно — 5 дней до овуляции + день овуляции. ЛГ-тесты и температура повышают точность определения.', takeawayEn: 'The fertile window is the 5 days before ovulation plus ovulation day. LH tests and temperature tracking improve detection accuracy.' },
      { title: 'Cervical mucus and fertility', pubmed: '9021021', takeawayRu: 'Цервикальная слизь меняется в течение цикла. Яйцеобразная, прозрачная слизь указывает на фертильную фазу.', takeawayEn: 'Cervical mucus changes throughout the cycle. Egg-white, clear mucus indicates the fertile phase.' },
    ],
    tips: [
      { emojiRu: '🧪 ЛГ-тесты', textRu: 'Пик ЛГ = овуляция через 24–36 часов', emojiEn: '🧪 LH tests', textEn: 'LH peak = ovulation in 24–36 hours' },
      { emojiRu: '🌡 Температура', textRu: 'Подъём на 0.2–0.5°C после овуляции — подтверждение', emojiEn: '🌡 Temperature', textEn: 'Rise of 0.2–0.5°C after ovulation confirms it' },
    ],
  },
  mood: {
    emoji: '🌙',
    titleRu: 'Настроение',
    titleEn: 'Mood',
    color: '#818cf8',
    descRu: 'Настроение связано с гормональными фазами цикла. Эстроген повышает серотонин и дофамин. Падение прогестерона перед месячными может вызывать тревогу и раздражительность.',
    descEn: 'Mood is tied to hormonal cycle phases. Estrogen boosts serotonin and dopamine. A drop in progesterone before periods can cause anxiety and irritability.',
    studies: [
      { title: 'Hormones and mood across cycle phases', pubmed: '30870065', takeawayRu: 'Фолликулярная фаза (после месячных) часто связана с лучшим настроением, энергией и когнитивными функциями.', takeawayEn: 'The follicular phase (after periods) is often associated with better mood, energy, and cognitive function.' },
      { title: 'PMDD and premenstrual syndrome', pubmed: '29778986', takeawayRu: 'ПМДР затрагивает 3–8% людей с циклом. Отличается от ПМС тяжестью симптомов, влияющих на повседневную жизнь.', takeawayEn: 'PMDD affects 3–8% of people with cycles. It differs from PMS by symptom severity that impacts daily life.' },
    ],
    tips: [
      { emojiRu: '📊 Паттерны', textRu: 'Отмечай настроение 2–3 цикла — появятся паттерны', emojiEn: '📊 Patterns', textEn: 'Track mood for 2–3 cycles — patterns will emerge' },
      { emojiRu: '🏃 Движение', textRu: 'Физическая активность снижает ПМС симптомы на 20–40%', emojiEn: '🏃 Movement', textEn: 'Physical activity reduces PMS symptoms by 20–40%' },
    ],
  },
  sleep: {
    emoji: '😴',
    titleRu: 'Сон',
    titleEn: 'Sleep',
    color: '#60a5fa',
    descRu: 'Качество сна меняется на протяжении цикла. Прогестерон имеет седативный эффект, поэтому во второй половине цикла часто хочется больше спать. Перед месячными сон обычно хуже.',
    descEn: 'Sleep quality changes throughout the cycle. Progesterone has sedative effects, so the second half of the cycle often brings more sleepiness. Sleep quality typically worsens before periods.',
    studies: [
      { title: 'Sleep across the menstrual cycle', pubmed: '28869574', takeawayRu: 'В лютеиновой фазе увеличивается время засыпания и количество пробуждений. Субъективное качество сна снижается перед менструацией.', takeawayEn: 'Sleep onset and wake-after-sleep-onset increase in the luteal phase. Subjective sleep quality drops before menstruation.' },
    ],
    tips: [
      { emojiRu: '🌡 Температура', textRu: 'Прохладная спальня (18–20°C) улучшает фазы сна', emojiEn: '🌡 Temperature', textEn: 'Cool bedroom (64–68°F) improves sleep phases' },
      { emojiRu: '📱 Экраны', textRu: 'Синий свет за 2 часа до сна задерживает выработку мелатонина', emojiEn: '📱 Screens', textEn: 'Blue light 2h before bed delays melatonin production' },
    ],
  },
  stress: {
    emoji: '☁️',
    titleRu: 'Стресс и тревога',
    titleEn: 'Stress & Anxiety',
    color: '#94a3b8',
    descRu: 'Хронический стресс повышает кортизол, который подавляет выработку половых гормонов. Это может удлинять цикл, задерживать овуляцию и усиливать ПМС.',
    descEn: 'Chronic stress elevates cortisol, which suppresses sex hormone production. This can lengthen cycles, delay ovulation, and worsen PMS.',
    studies: [
      { title: 'Stress and menstrual function', pubmed: '14505503', takeawayRu: 'Психологический стресс связан с нарушениями цикла. Женщины с хроническим стрессом чаще имеют нерегулярные циклы.', takeawayEn: 'Psychological stress is associated with menstrual disruption. Women with chronic stress more often have irregular cycles.' },
    ],
    tips: [
      { emojiRu: '🧘 Дыхание', textRu: '4-7-8 дыхание активирует парасимпатику за 5 минут', emojiEn: '🧘 Breathing', textEn: '4-7-8 breathing activates parasympathetic system in 5 min' },
      { emojiRu: '🏃 Спорт', textRu: 'Умеренные аэробные нагрузки снижают кортизол', emojiEn: '🏃 Exercise', textEn: 'Moderate aerobic exercise reduces cortisol' },
    ],
  },
  meds: {
    emoji: '💊',
    titleRu: 'Лекарства',
    titleEn: 'Medications',
    color: '#4ade80',
    descRu: 'Многие препараты взаимодействуют с гормональным циклом. КОК (противозачаточные таблетки) подавляют овуляцию. НПВС могут задерживать овуляцию. Некоторые антидепрессанты влияют на либидо.',
    descEn: 'Many medications interact with the hormonal cycle. COCs (birth control pills) suppress ovulation. NSAIDs can delay ovulation. Some antidepressants affect libido.',
    studies: [
      { title: 'NSAIDs and ovulation', pubmed: '25883839', takeawayRu: 'Ибупрофен и диклофенак при регулярном приёме в период предполагаемой овуляции задерживают её у 75% пациентов.', takeawayEn: 'Ibuprofen and diclofenac taken regularly around expected ovulation delayed it in 75% of patients.' },
      { title: 'Antidepressants and sexual function', pubmed: '7577282', takeawayRu: 'СИОЗС-антидепрессанты снижают либидо у 30–40% пациентов. Бупропион и миртазапин имеют меньше сексуальных побочных эффектов.', takeawayEn: 'SSRI antidepressants reduce libido in 30–40% of patients. Bupropion and mirtazapine have fewer sexual side effects.' },
    ],
    tips: [
      { emojiRu: '⚡ НПВС', textRu: 'Избегай ибупрофена в 12–16 день цикла если планируешь беременность', emojiEn: '⚡ NSAIDs', textEn: 'Avoid ibuprofen on days 12–16 if trying to conceive' },
      { emojiRu: '🔄 Взаимодействия', textRu: 'AI-парсер Elara анализирует твои препараты и флагирует взаимодействия с циклом', emojiEn: '🔄 Interactions', textEn: 'Elara\'s AI parser analyzes your meds and flags cycle interactions' },
    ],
  },
  sport: {
    emoji: '🏃',
    titleRu: 'Спорт и движение',
    titleEn: 'Sport & Movement',
    color: '#f59e0b',
    descRu: 'Физическая активность нужно адаптировать под фазы цикла. В фолликулярной и овуляторной фазе — пик энергии и силы. В лютеиновой — тело тратит больше калорий в покое.',
    descEn: 'Physical activity should be adapted to cycle phases. Energy and strength peak in follicular and ovulatory phases. In the luteal phase, the body burns more calories at rest.',
    studies: [
      { title: 'Exercise performance across cycle phases', pubmed: '33619100', takeawayRu: 'Максимальная сила и выносливость выше в фолликулярной фазе. После овуляции увеличивается риск травм связок.', takeawayEn: 'Maximum strength and endurance are higher in the follicular phase. After ovulation, ligament injury risk increases.' },
    ],
    tips: [
      { emojiRu: '💪 Фолликулярная', textRu: 'Дни 1–13: силовые тренировки, HIIT — тело в пике', emojiEn: '💪 Follicular', textEn: 'Days 1–13: strength training, HIIT — body at peak' },
      { emojiRu: '🧘 Лютеиновая', textRu: 'Дни 15–28: йога, ходьба, плавание — тело нуждается в восстановлении', emojiEn: '🧘 Luteal', textEn: 'Days 15–28: yoga, walking, swimming — body needs recovery' },
    ],
  },
  libido: {
    emoji: '🌹',
    titleRu: 'Либидо',
    titleEn: 'Libido',
    color: '#f43f5e',
    descRu: 'Сексуальное желание меняется в течение цикла под влиянием эстрогена и тестостерона. Пик либидо обычно совпадает с периовуляторной фазой.',
    descEn: 'Sexual desire changes throughout the cycle under the influence of estrogen and testosterone. Libido typically peaks around the periovulatory phase.',
    studies: [
      { title: 'Female sexual desire and hormones', pubmed: '28401900', takeawayRu: 'Тестостерон и эстрадиол положительно коррелируют с сексуальным желанием. Пик — в периовуляторную фазу.', takeawayEn: 'Testosterone and estradiol positively correlate with sexual desire. Peak occurs in the periovulatory phase.' },
    ],
    tips: [
      { emojiRu: '📊 Отслеживай', textRu: 'Паттерны либидо в сочетании с циклом выявляют гормональные особенности', emojiEn: '📊 Track', textEn: 'Libido patterns combined with cycle data reveal hormonal features' },
    ],
  },
  intimacy: {
    emoji: '💜',
    titleRu: 'Секс и близость',
    titleEn: 'Sex & Intimacy',
    color: '#a855f7',
    descRu: 'Интимная близость включает физическую, эмоциональную и социальную составляющие. Качество сексуальной жизни связано с общим самочувствием, гормональным фоном и качеством отношений.',
    descEn: 'Intimacy includes physical, emotional, and social components. Sexual well-being is linked to overall health, hormonal balance, and relationship quality.',
    studies: [
      { title: 'Sexual wellbeing and health outcomes', pubmed: '24754934', takeawayRu: 'Сексуальное благополучие положительно связано с физическим и психическим здоровьем, качеством жизни.', takeawayEn: 'Sexual well-being is positively associated with physical and mental health, and quality of life.' },
    ],
    tips: [
      { emojiRu: '💬 Общение', textRu: 'Открытое обсуждение потребностей с партнёром — основа здоровой интимной жизни', emojiEn: '💬 Communication', textEn: 'Open discussion of needs with a partner is the foundation of healthy intimacy' },
    ],
  },
  pregnancy: {
    emoji: '🤰',
    titleRu: 'Беременность',
    titleEn: 'Pregnancy',
    color: '#fbbf24',
    descRu: 'Беременность — 40 недель (280 дней) от первого дня последних месячных. Делится на 3 триместра. В первые 12 недель формируются все органы и системы плода.',
    descEn: 'Pregnancy is 40 weeks (280 days) from the first day of the last period. Divided into 3 trimesters. In the first 12 weeks, all fetal organs and systems form.',
    studies: [
      { title: 'Prenatal care and outcomes', pubmed: '28892458', takeawayRu: 'Регулярное пренатальное наблюдение снижает риск осложнений на 40%. Начинать нужно до 10 недель.', takeawayEn: 'Regular prenatal care reduces complication risk by 40%. Should begin before 10 weeks.' },
    ],
    tips: [
      { emojiRu: '💊 Фолиевая', textRu: '400 мкг/день за 3 месяца до зачатия снижает риск дефектов нервной трубки на 70%', emojiEn: '💊 Folate', textEn: '400mcg/day for 3 months before conception reduces neural tube defects by 70%' },
    ],
  },
}

export default function ModulePage() {
  const { moduleKey } = useParams()
  const navigate = useNavigate()
  const { lang } = useLang()
  const rl = useRl()
  const { profile } = useAuth()
  const [expandedStudy, setExpandedStudy] = useState(null)

  const data = MODULE_DATA[moduleKey]

  if (!data) {
    return (
      <div className="page-enter" style={{ padding:24 }}>
        <button onClick={() => navigate(-1)} className="btn btn-ghost" style={{ width:'auto' }}>‹ {rl('Назад','Back')}</button>
        <p style={{ color:'var(--text3)', marginTop:20 }}>{rl('Раздел не найден','Section not found')}</p>
      </div>
    )
  }

  const title = lang === 'en' ? data.titleEn : data.titleRu
  const desc = lang === 'en' ? data.descEn : data.descRu

  return (
    <div className="page-enter" style={{ flex:1, overflowY:'auto', padding:'18px 16px 28px' }}>
      {/* Назад */}
      <button onClick={() => navigate('/today')} className="btn btn-ghost"
        style={{ width:'auto', padding:'8px 11px', marginBottom:16 }}>
        ‹ {rl('Сегодня','Today')}
      </button>

      {/* Заголовок */}
      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:40, marginBottom:8 }}>{data.emoji}</div>
        <h2 style={{ fontSize:26, margin:0, color: data.color }}>{title}</h2>
        <p style={{ fontSize:14, color:'var(--text2)', lineHeight:1.7, marginTop:10 }}>{desc}</p>
      </div>

      {/* Советы */}
      {data.tips && data.tips.length > 0 && (
        <div style={{ marginBottom:24 }}>
          <h3 style={{ fontSize:14, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>
            {rl('Практические советы', 'Practical tips')}
          </h3>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {data.tips.map((tip, i) => (
              <div key={i} className="card" style={{ padding:'12px 14px', display:'flex', gap:12, alignItems:'flex-start' }}>
                <span style={{ fontSize:20, flexShrink:0 }}>{lang === 'en' ? tip.emojiEn?.split(' ')[0] : tip.emojiRu?.split(' ')[0]}</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text)' }}>
                    {lang === 'en' ? tip.emojiEn?.split(' ').slice(1).join(' ') : tip.emojiRu?.split(' ').slice(1).join(' ')}
                  </div>
                  <div style={{ fontSize:12, color:'var(--text2)', marginTop:3, lineHeight:1.6 }}>
                    {lang === 'en' ? tip.textEn : tip.textRu}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Исследования */}
      {data.studies && data.studies.length > 0 && (
        <div>
          <h3 style={{ fontSize:14, fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>
            🔬 {rl('Научная база', 'Research base')}
          </h3>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {data.studies.map((study, i) => (
              <div key={i} className="card" style={{ padding:'12px 14px', cursor:'pointer' }}
                onClick={() => setExpandedStudy(expandedStudy === i ? null : i)}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', flex:1, marginRight:8 }}>
                    {study.title}
                  </div>
                  <span style={{ color:'var(--text3)', fontSize:12 }}>{expandedStudy === i ? '▲' : '▼'}</span>
                </div>
                {expandedStudy === i && (
                  <div style={{ marginTop:10 }}>
                    <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7, margin:0 }}>
                      {lang === 'en' ? study.takeawayEn : study.takeawayRu}
                    </p>
                    <a href={`https://pubmed.ncbi.nlm.nih.gov/${study.pubmed}/`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ display:'inline-block', marginTop:8, fontSize:11,
                        color:'var(--accent)', textDecoration:'none' }}>
                      📚 PubMed {study.pubmed} →
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Дисклеймер */}
      <div style={{ marginTop:24, padding:'10px 12px', borderRadius:10,
        background:'rgba(248,113,113,0.06)', border:'1px solid rgba(248,113,113,0.15)',
        fontSize:11, color:'var(--text3)', lineHeight:1.6 }}>
        ⚠️ {rl('Информация носит образовательный характер и не является медицинской рекомендацией.',
          'Information is educational and does not constitute medical advice.')}
      </div>
    </div>
  )
}
