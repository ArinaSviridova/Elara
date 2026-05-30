import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang, useRl } from '../context/LangContext'

// Клинические тесты — все вопросы и валидированные шкалы
const TESTS = {
  phq9: {
    name: 'PHQ-9', full: 'Patient Health Questionnaire',
    desc: 'Депрессия — скрининг',
    ref: 'https://pubmed.ncbi.nlm.nih.gov/11556941/',
    refName: 'PubMed 11556941',
    for: 'all',
    scale: ['Никогда', 'Несколько дней', 'Более половины дней', 'Почти каждый день'],
    questions: [
      'Сниженный интерес или удовольствие от обычных занятий',
      'Подавленное, депрессивное или безнадёжное настроение',
      'Трудности со сном или, напротив, слишком много сна',
      'Усталость или отсутствие энергии',
      'Плохой аппетит или переедание',
      'Негативное отношение к себе — ощущение неудачника, вина',
      'Трудности с концентрацией (чтение, просмотр ТВ)',
      'Заторможенность или, напротив, суетливость, что заметно другим',
      'Мысли о том, что лучше бы умер(ла) или о причинении себе вреда',
    ],
    interpret: (score) => {
      if (score <= 4) return { level: 'low', text: 'Сейчас шкала не показывает выраженной депрессивной симптоматики. Нервная система не обязана быть фейерверком, но тревожного сигнала тут мало.', color: '#4ade80' }
      if (score <= 9) return { level: 'mild', text: 'Есть лёгкая просадка. Не надо драматично назначать себе судьбу, но сон, энергия и интерес к жизни заслуживают внимания.', color: '#facc15' }
      if (score <= 14) return { level: 'moderate', text: 'Симптомы уже мешают жить. Это тот момент, где поддержка специалиста звучит не как слабость, а как нормальный взрослый ход.', color: '#fb923c' }
      if (score <= 19) return { level: 'moderately_severe', text: 'Нагрузка высокая. Лучше не тащить это в одиночку: нужен разговор со специалистом и понятный план помощи.', color: '#f87171' }
      return { level: 'severe', text: 'Симптомы тяжёлые. Это не «плохой характер» и не «ленишься». Нужна помощь специалиста как можно скорее.', color: '#dc2626' }
    },
    tagIfPositive: '🧠 Депрессия',
  },
  gad7: {
    name: 'GAD-7', full: 'Generalized Anxiety Disorder',
    desc: 'Тревожность — скрининг',
    ref: 'https://pubmed.ncbi.nlm.nih.gov/16717171/',
    refName: 'PubMed 16717171',
    for: 'all',
    scale: ['Никогда', 'Несколько дней', 'Более половины дней', 'Почти каждый день'],
    questions: [
      'Чувство нервозности, тревоги или напряжения',
      'Неспособность прекратить или контролировать беспокойство',
      'Чрезмерное беспокойство о разных вещах',
      'Трудности с расслаблением',
      'Такое беспокойство, что трудно усидеть на месте',
      'Легко раздражаешься или становишься вспыльчивым(ой)',
      'Чувство страха, как будто что-то ужасное может случиться',
    ],
    interpret: (score) => {
      if (score <= 4) return { level: 'low', text: 'Минимальная тревожность', color: '#4ade80' }
      if (score <= 9) return { level: 'mild', text: 'Лёгкая тревожность', color: '#facc15' }
      if (score <= 14) return { level: 'moderate', text: 'Умеренная тревожность — рекомендуем специалиста', color: '#fb923c' }
      return { level: 'severe', text: 'Тяжёлая тревожность — нужна помощь', color: '#f87171' }
    },
    tagIfPositive: '🌪 Тревожное расстройство',
  },
  asrs: {
    name: 'ASRS v1.1', full: 'Adult ADHD Self-Report Scale (ВОЗ)',
    desc: 'СДВГ — скрининг для взрослых',
    ref: 'https://pubmed.ncbi.nlm.nih.gov/15841682/',
    refName: 'PubMed 15841682',
    for: 'all',
    scale: ['Никогда', 'Редко', 'Иногда', 'Часто', 'Очень часто'],
    questions: [
      'Как часто тебе трудно завершить финальную часть проекта после самого сложного?',
      'Как часто тебе трудно упорядочить дела, требующие организации?',
      'Как часто проблемы с запоминанием встреч или обязательств?',
      'Когда нужно долго сидеть и думать, как часто откладываешь или избегаешь?',
      'Как часто ёрзаешь или двигаешь руками/ногами когда долго сидишь?',
      'Как часто чувствуешь гиперактивность изнутри, как будто работает мотор?',
    ],
    interpret: (score) => {
      // Первые 4 вопроса: ≥2 = положительный; последние 2: ≥1 = положительный
      if (score >= 14) return { level: 'high', text: 'Высокая вероятность СДВГ — рекомендуем специалиста', color: '#fb923c' }
      if (score >= 9) return { level: 'moderate', text: 'Умеренные признаки — стоит обсудить с врачом', color: '#facc15' }
      return { level: 'low', text: 'Признаки СДВГ минимальны', color: '#4ade80' }
    },
    tagIfPositive: '🧠 СДВГ (синдром дефицита внимания)',
  },
  psst: {
    name: 'PSST', full: 'Premenstrual Symptoms Screening Tool',
    desc: 'ПМС и ПМДР — различение',
    ref: 'https://pubmed.ncbi.nlm.nih.gov/12423550/',
    refName: 'PubMed 12423550',
    for: 'cycle',
    scale: ['Нет', 'Лёгкое', 'Умеренное', 'Тяжёлое'],
    questions: [
      'Гнев, раздражительность за 1-2 недели до месячных',
      'Тревога, напряжение, «на взводе»',
      'Плаксивость, повышенная чувствительность',
      'Подавленное настроение, безнадёжность',
      'Снижение интереса к работе и занятиям',
      'Трудности с концентрацией',
      'Усталость, нехватка энергии',
      'Переедание или тяга к определённым продуктам',
      'Нарушения сна (бессонница или сонливость)',
      'Чувство потери контроля над ситуацией',
      'Физические симптомы: болезненность груди, вздутие, головная боль, боль в суставах',
    ],
    interpret: (score) => {
      if (score <= 10) return { level: 'none', text: 'ПМС не выражен', color: '#4ade80' }
      if (score <= 18) return { level: 'pms', text: 'ПМС умеренной степени', color: '#facc15' }
      return { level: 'pmdd', text: 'Признаки ПМДР — рекомендуем гинеколога/психиатра', color: '#f87171' }
    },
    tagIfPositive: '🧠 Биполярное расстройство', // используем как маркер ПМДР
  },
  psqi: {
    name: 'PSQI', full: 'Pittsburgh Sleep Quality Index',
    desc: 'Качество сна',
    ref: 'https://pubmed.ncbi.nlm.nih.gov/2748771/',
    refName: 'PubMed 2748771',
    for: 'all',
    scale: ['Не было', 'Менее 1 раза в неделю', '1-2 раза', '3+ раза'],
    questions: [
      'Не мог(ла) заснуть в течение 30 минут',
      'Просыпался(ась) ночью или рано утром',
      'Приходилось вставать ночью в туалет',
      'Не мог(ла) нормально дышать',
      'Кашель или громкий храп',
      'Ощущение холода',
      'Ощущение жара',
      'Плохие сны',
      'Боль',
      'Дневная сонливость — мешает делам',
    ],
    interpret: (score) => {
      if (score <= 5) return { level: 'good', text: 'Хорошее качество сна', color: '#4ade80' }
      if (score <= 10) return { level: 'moderate', text: 'Умеренные нарушения сна', color: '#facc15' }
      return { level: 'poor', text: 'Серьёзные нарушения сна — стоит разобраться', color: '#f87171' }
    },
  },
  adam: {
    name: 'ADAM', full: 'Androgen Deficiency in Aging Males',
    desc: 'Дефицит тестостерона (для мужчин)',
    ref: 'https://pubmed.ncbi.nlm.nih.gov/10985204/',
    refName: 'PubMed 10985204',
    for: 'male',
    scale: ['Нет', 'Да'],
    questions: [
      'Снижение полового влечения (либидо)?',
      'Нехватка энергии?',
      'Снижение силы или выносливости?',
      'Уменьшение роста?',
      'Снижение «радости жизни»?',
      'Грустный или раздражительный?',
      'Эрекции стали менее крепкими?',
      'Недавно ухудшилась способность заниматься спортом?',
      'После ужина часто засыпаешь?',
      'Снижение рабочей производительности?',
    ],
    interpret: (score) => {
      // ADAM: вопрос 1 или 7 положительный ИЛИ 3+ других — позитивный тест
      if (score >= 3) return { level: 'positive', text: 'Признаки дефицита тестостерона — рекомендуем сдать анализы', color: '#fb923c' }
      return { level: 'negative', text: 'Признаки дефицита минимальны', color: '#4ade80' }
    },
  },
  fsfi: {
    name: 'FSFI', full: 'Female Sexual Function Index',
    desc: 'Женская сексуальная функция',
    ref: 'https://pubmed.ncbi.nlm.nih.gov/10782451/',
    refName: 'PubMed 10782451',
    for: 'cycle',
    scale: ['Практически никогда', 'Редко', 'Иногда', 'Часто', 'Почти всегда'],
    questions: [
      'Как часто ты испытывала сексуальное желание за последние 4 недели?',
      'Как оцениваешь уровень своего сексуального желания?',
      'Как часто ты испытывала возбуждение во время сексуальной активности?',
      'Как оцениваешь уровень своего возбуждения?',
      'Как уверена была в своём возбуждении?',
      'Как часто ты испытывала достаточную естественную смазку?',
      'Было ли трудно достичь оргазма?',
      'Была ли удовлетворена качеством оргазма?',
      'Испытывала ли боль или дискомфорт во время секса?',
    ],
    interpret: (score) => {
      if (score >= 26) return { level: 'normal', text: 'В целом всё выглядит спокойно. Не идеальная печать на справке, а просто хороший знак по шкале.', color: '#4ade80' }
      if (score >= 19) return { level: 'mild', text: 'Есть небольшие просадки. Не катастрофа, но тело явно просит внимания, а не режима «само пройдёт».', color: '#facc15' }
      return { level: 'risk', text: 'Есть заметные зоны напряжения в сексуальной функции. Лучше разобрать это спокойно: боль, желание, возбуждение, лекарства, стресс и отношения.', color: '#fb923c' }
    },
  },
  iief5: {
    name: 'IIEF-5', full: 'International Index of Erectile Function',
    desc: 'Мужская сексуальная функция',
    ref: 'https://pubmed.ncbi.nlm.nih.gov/10637462/',
    refName: 'PubMed 10637462',
    for: 'male',
    scale: ['Практически никогда', 'Редко', 'Иногда', 'Часто', 'Почти всегда'],
    questions: [
      'Насколько уверен в способности получить и сохранить эрекцию?',
      'Как часто эрекция была достаточно твёрдой для проникновения?',
      'Как часто удавалось сохранить эрекцию после проникновения?',
      'Насколько трудно было сохранить эрекцию до окончания полового акта?',
      'Насколько удовлетворён сексуальными отношениями в целом?',
    ],
    interpret: (score) => {
      if (score >= 22) return { level: 'normal', text: 'По шкале всё выглядит стабильно. Это не повод строить памятник гормонам, но знак хороший.', color: '#4ade80' }
      if (score >= 17) return { level: 'mild', text: 'Есть лёгкие сложности. Часто тут замешаны сон, стресс, алкоголь, лекарства или сосудистые факторы.', color: '#facc15' }
      if (score >= 12) return { level: 'moderate', text: 'Сложности уже заметные. Это стоит обсудить с урологом, без героического молчания и интернет-диагнозов.', color: '#fb923c' }
      return { level: 'severe', text: 'Симптомы выраженные. Тут лучше не гадать, а идти к врачу и проверить сосудистые, гормональные и лекарственные факторы.', color: '#f87171' }
    },
  },

  big5: {
    name: 'Big Five', full: 'Five Factor Personality Model (IPIP)',
    desc: 'Тест личности',
    ref: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6300285/',
    refName: 'PMC6300285',
    for: 'all',
    scale: ['Совсем не согласна', 'Скорее нет', 'Нейтрально', 'Скорее да', 'Полностью согласна'],
    questions: [
      // Открытость
      'Мне нравится пробовать новые, нестандартные вещи',
      'Я часто думаю о глубоких вопросах и идеях',
      // Добросовестность
      'Я выполняю свои планы и доделываю начатое',
      'Я организованна и пунктуальна',
      // Экстраверсия
      'Я чувствую себя в центре внимания',
      'Общение с людьми заряжает меня энергией',
      // Доброжелательность
      'Я чувствую боль других людей',
      'Мне легко доверять незнакомым',
      // Нейротизм
      'Я легко расстраиваюсь из-за мелочей',
      'У меня бывают резкие перепады настроения',
    ],
    interpret: (answers) => {
      const [o1, o2, c1, c2, e1, e2, a1, a2, n1, n2] = answers
      const openness = (o1 + o2) / 8
      const conscientiousness = (c1 + c2) / 8
      const extraversion = (e1 + e2) / 8
      const agreeableness = (a1 + a2) / 8
      const neuroticism = (n1 + n2) / 8
      const tags = []
      if (extraversion > 0.6) tags.push('☀️ Экстраверт')
      else if (extraversion < 0.4) tags.push('🌙 Интроверт')
      else tags.push('⚖️ Амбиверт')
      if (conscientiousness > 0.6) tags.push('💎 Перфекционистка')
      if (openness > 0.6) tags.push('🎨 Творческая')
      if (neuroticism > 0.6) tags.push('🌸 Чувствительная')
      else if (neuroticism < 0.3) tags.push('🧠 Рациональная')
      if (agreeableness > 0.65) tags.push('💜 Эмпат')
      return { tags, openness, conscientiousness, extraversion, agreeableness, neuroticism }
    },
  },

  // ══════════════════════════════════════════════════════════════════
  // НОВЫЕ ТЕСТЫ НА ОСНОВЕ ИССЛЕДОВАНИЙ
  // ══════════════════════════════════════════════════════════════════

  // Шкала тревоги Бека (BAI) — клинический стандарт
  bai: {
    name: 'BAI', full: 'Beck Anxiety Inventory',
    desc: 'Клиническая оценка тревоги',
    ref: 'https://pubmed.ncbi.nlm.nih.gov/3812169/', refName: 'PubMed 3812169',
    for: 'all',
    scale: ['Совсем нет', 'Немного', 'Умеренно — было неприятно', 'Сильно — с трудом переносила'],
    questions: [
      'Онемение или покалывание',
      'Приливы жара',
      'Дрожание ног',
      'Неспособность расслабиться',
      'Страх, что произойдёт худшее',
      'Головокружение или дурнота',
      'Учащённое сердцебиение',
      'Неустойчивость, шаткость',
      'Испуганность, ужас',
      'Нервозность',
      'Ощущение удушья',
      'Дрожание рук',
      'Шаткость, неустойчивость',
      'Страх потери контроля',
      'Трудность дыхания',
      'Страх смерти',
      'Испуг',
      'Расстройство желудка',
      'Обмороки, головокружение',
      'Покраснение лица',
      'Потливость (не от жары)',
    ],
    interpret: (score) => {
      if (score <= 7) return { level: 'minimal', text: 'Минимальная тревога', color: '#4ade80' }
      if (score <= 15) return { level: 'mild', text: 'Лёгкая тревога', color: '#facc15' }
      if (score <= 25) return { level: 'moderate', text: 'Умеренная тревога — стоит обсудить с врачом', color: '#fb923c' }
      return { level: 'severe', text: 'Выраженная тревога — рекомендуем консультацию специалиста', color: '#f87171' }
    },
  },

  // Шкала депрессии Бека (BDI-II)
  bdi2: {
    name: 'BDI-II', full: 'Beck Depression Inventory',
    desc: 'Глубина депрессивной симптоматики',
    ref: 'https://pubmed.ncbi.nlm.nih.gov/9080920/', refName: 'PubMed 9080920',
    for: 'all',
    scale: ['0 — нет', '1 — слабо', '2 — умеренно', '3 — сильно'],
    questions: [
      'Я чувствую грусть',
      'Мне кажется, в будущем меня ничего хорошего не ждёт',
      'Я считаю себя неудачником(цей)',
      'Я не получаю удовольствия от того, что раньше приносило радость',
      'Я виню себя больше обычного',
      'Я ожидаю, что меня накажут',
      'Я разочарован(а) в себе',
      'Я критикую и обвиняю себя',
      'У меня бывают мысли о самоубийстве, но я их не реализую',
      'Я чаще плачу, чем обычно',
      'Я стал(а) более раздражительным(ой)',
      'Я потерял(а) интерес к другим людям',
      'Мне труднее принимать решения',
      'Я считаю, что выгляжу хуже, чем раньше',
      'Мне сложнее работать',
      'Мне труднее спать',
      'Я устаю быстрее обычного',
      'Аппетит у меня хуже обычного',
      'Я потерял(а) больше 4 кг за последнее время',
      'Я беспокоюсь о своём здоровье больше обычного',
      'Я стал(а) менее заинтересован(а) в сексе',
    ],
    interpret: (score) => {
      if (score <= 13) return { level: 'minimal', text: 'Минимальная депрессия', color: '#4ade80' }
      if (score <= 19) return { level: 'mild', text: 'Лёгкая депрессия', color: '#facc15' }
      if (score <= 28) return { level: 'moderate', text: 'Умеренная депрессия', color: '#fb923c' }
      return { level: 'severe', text: 'Тяжёлая депрессия — рекомендуем обратиться к специалисту', color: '#f87171' }
    },
  },

  // Опросник хронического стресса (PSS-10)
  pss10: {
    name: 'PSS-10', full: 'Perceived Stress Scale',
    desc: 'Уровень воспринимаемого стресса',
    ref: 'https://pubmed.ncbi.nlm.nih.gov/6668417/', refName: 'PubMed 6668417',
    for: 'all',
    scale: ['Никогда', 'Почти никогда', 'Иногда', 'Довольно часто', 'Очень часто'],
    questions: [
      'Как часто тебя расстраивало что-то неожиданное?',
      'Как часто казалось, что не можешь контролировать важные вещи в жизни?',
      'Как часто ты чувствовала нервозность и стресс?',
      'Как часто ты уверенно справлялась с личными проблемами?', // reverse
      'Как часто казалось, что дела идут так, как тебе хочется?', // reverse
      'Как часто тебе казалось, что не справляешься со всем, что нужно сделать?',
      'Как часто ты умела контролировать раздражение?', // reverse
      'Как часто ты чувствовала, что держишь ситуацию под контролем?', // reverse
      'Как часто тебя злило то, что выходило за пределы твоего контроля?',
      'Как часто казалось, что трудностей накопилось столько, что невозможно с ними справиться?',
    ],
    reverseItems: [3, 4, 6, 7], // 0-indexed
    interpret: (score) => {
      if (score <= 13) return { level: 'low', text: 'Низкий уровень стресса', color: '#4ade80' }
      if (score <= 26) return { level: 'moderate', text: 'Умеренный стресс — обрати внимание на отдых', color: '#facc15' }
      return { level: 'high', text: 'Высокий уровень стресса — стоит обсудить с психологом', color: '#f87171' }
    },
  },

  // Расстройства пищевого поведения — EAT-26
  eat26: {
    name: 'EAT-26', full: 'Eating Attitudes Test',
    desc: 'Скрининг нарушений пищевого поведения',
    ref: 'https://pubmed.ncbi.nlm.nih.gov/34384543/', refName: 'PubMed 34384543',
    for: 'all',
    scale: ['Никогда', 'Редко', 'Иногда', 'Часто', 'Как правило', 'Всегда'],
    questions: [
      'Я боюсь иметь избыточный вес',
      'Я избегаю есть, когда голоден/голодна',
      'Я думаю об еде постоянно',
      'Меня захватывают приступы переедания',
      'Я режу еду на мелкие кусочки',
      'Я знаю калорийность пищи, которую ем',
      'Особенно избегаю богатых углеводами продуктов',
      'Я ощущаю, что другие хотят, чтобы я больше ела',
      'После еды меня рвёт',
      'После еды я чувствую себя виноватой',
      'Я думаю о том, чтобы сжечь калории',
      'Окружающие думают, что я слишком худа',
      'Я думаю о жире в своём теле',
      'Мне требуется больше времени чем другим на еду',
      'Я избегаю сахара',
      'Я ем диетические продукты',
      'Еда контролирует мою жизнь',
      'Я контролирую себя в еде',
      'Я чувствую, что другие давят на меня, чтобы я ела',
      'Я трачу много времени думая о еде',
      'После сладкого чувствую себя некомфортно',
      'Я веду себя диетически',
      'Мне нравится ощущение пустого желудка',
      'После обычной еды я чувствую позыв рвоты',
      'Мне нравится пробовать новые сытные блюда',
      'После еды у меня возникает желание рвоты',
    ],
    interpret: (score) => {
      if (score <= 20) return { level: 'normal', text: 'Нет признаков нарушений пищевого поведения', color: '#4ade80' }
      return { level: 'risk', text: 'Возможны нарушения пищевого поведения — рекомендуем консультацию специалиста. Обратись за помощью: Alliance for Eating Disorders Awareness (1-866-662-1235)', color: '#f87171' }
    },
  },

  // Качество жизни (WHO-5)
  who5: {
    name: 'WHO-5', full: 'WHO Well-Being Index',
    desc: 'Общее психологическое благополучие',
    ref: 'https://pubmed.ncbi.nlm.nih.gov/17003219/', refName: 'PubMed 17003219',
    for: 'all',
    scale: ['Никогда', 'Редко', 'Меньше половины времени', 'Больше половины времени', 'Большую часть времени', 'Всегда'],
    questions: [
      'Я чувствовала себя радостной и в хорошем расположении духа',
      'Я чувствовала себя спокойной и расслабленной',
      'Я чувствовала себя активной и энергичной',
      'Я просыпалась бодрой и отдохнувшей',
      'Мои ежедневные дела были наполнены смыслом',
    ],
    interpret: (score) => {
      const pct = score * 4 // конвертируем в 0-100
      if (pct >= 70) return { level: 'good', text: 'Хорошее психологическое благополучие', color: '#4ade80' }
      if (pct >= 50) return { level: 'moderate', text: 'Умеренное благополучие — обрати внимание на себя', color: '#facc15' }
      return { level: 'low', text: 'Низкое благополучие — рекомендуем поговорить со специалистом', color: '#f87171' }
    },
  },

  // Синдром хронической усталости / Выгорание (MBI-GS краткая версия)
  burnout: {
    name: 'Выгорание', full: 'Burnout Self-Assessment',
    desc: 'Эмоциональное выгорание и истощение',
    ref: 'https://pubmed.ncbi.nlm.nih.gov/10547947/', refName: 'PubMed 10547947',
    for: 'all',
    scale: ['Никогда', 'Несколько раз в год', 'Ежемесячно', 'Несколько раз в месяц', 'Раз в неделю', 'Несколько раз в неделю', 'Каждый день'],
    questions: [
      'Я чувствую себя эмоционально истощённой от работы/учёбы',
      'Я чувствую себя измотанной к концу рабочего дня',
      'Я чувствую усталость, когда встаю утром и снова предстоит рабочий день',
      'Работа с людьми весь день — это большое напряжение для меня',
      'Я чувствую, что выгораю от своей работы',
      'Я чувствую разочарование от своей работы',
      'Мне кажется, что я слишком много работаю',
      'Работа с людьми напрямую создаёт слишком много стресса',
      'Я чувствую, что достигла своего предела',
    ],
    interpret: (score) => {
      const avg = score / 9
      if (avg <= 1.5) return { level: 'low', text: 'Признаков выгорания нет', color: '#4ade80' }
      if (avg <= 3) return { level: 'mild', text: 'Лёгкое выгорание — важен отдых', color: '#facc15' }
      if (avg <= 4.5) return { level: 'moderate', text: 'Умеренное выгорание — обрати внимание на баланс', color: '#fb923c' }
      return { level: 'severe', text: 'Выраженное выгорание — рекомендуем поддержку специалиста', color: '#f87171' }
    },
  },

  // Качество сна (ESS — сонливость)
  ess: {
    name: 'ESS', full: 'Epworth Sleepiness Scale',
    desc: 'Дневная сонливость и качество сна',
    ref: 'https://pubmed.ncbi.nlm.nih.gov/1798888/', refName: 'PubMed 1798888',
    for: 'all',
    scale: ['Никогда не засну', 'Маловероятно', 'Возможно засну', 'Скорее всего засну'],
    questions: [
      'Сидя и читая',
      'Смотря телевизор',
      'Сидя в общественном месте (театр, собрание)',
      'Как пассажир в машине без перерыва более часа',
      'Лёжа отдыхая днём при наличии возможности',
      'Сидя и разговаривая с кем-то',
      'Сидя спокойно после обеда без алкоголя',
      'В машине, стоя в пробке несколько минут',
    ],
    interpret: (score) => {
      if (score <= 7) return { level: 'normal', text: 'Нормальный уровень сонливости', color: '#4ade80' }
      if (score <= 10) return { level: 'mild', text: 'Лёгкая сонливость', color: '#facc15' }
      if (score <= 15) return { level: 'moderate', text: 'Умеренная сонливость — стоит проверить качество сна', color: '#fb923c' }
      return { level: 'severe', text: 'Выраженная сонливость — рекомендуем консультацию сомнолога', color: '#f87171' }
    },
  },

}

function buildResultGuidance(testKey, result, rl) {
  const score = result?.score
  const guidance = {
    default: {
      focus: [
        rl('смотри не только на цифру, а на то, насколько симптомы мешают учёбе, работе, отношениям и повседневной жизни','look not only at the score but also at how much symptoms interfere with daily life, work, study, and relationships'),
        rl('обращай внимание на повторяемость симптомов, а не на один плохой день','pay attention to repeated patterns, not a single bad day'),
        rl('если картина ухудшается со временем, лучше обсудить это с врачом','if the pattern is getting worse over time, discuss it with a clinician'),
      ],
      next: rl('Повтори тест позже или обсуди результат со специалистом, если симптомы держатся.', 'Repeat the test later or discuss the result with a specialist if symptoms persist.'),
    },
    phq9: {
      focus: [
        rl('следи за сном, энергией, потерей интереса и чувством вины - именно они чаще всего отражают клиническую значимость','pay attention to sleep, energy, loss of interest, and guilt - these often reflect clinical significance'),
        rl('если появились мысли о самоповреждении или смерти, это повод обращаться за помощью сразу, а не ждать','if thoughts of self-harm or death appear, seek help immediately rather than waiting'),
        rl('важно отмечать, мешают ли симптомы вставать, есть, работать и общаться','notice whether symptoms make it hard to get up, eat, work, or socialize'),
      ],
      next: rl('Если состояние держится 2 недели и больше, имеет смысл обсудить его с психиатром или психотерапевтом.', 'If symptoms last 2 weeks or longer, consider talking to a psychiatrist or therapist.'),
    },
    gad7: {
      focus: [
        rl('обрати внимание на телесные проявления тревоги: напряжение, дрожь, тахикардию, проблемы со сном','watch for physical anxiety signs: tension, trembling, fast heartbeat, and sleep problems'),
        rl('важный маркер - трудно ли отключить тревожные мысли и расслабиться','an important marker is whether anxious thoughts are hard to switch off and relaxation is difficult'),
        rl('если тревога влияет на концентрацию и избегание дел, это уже не просто стрессовый фон','if anxiety affects concentration or leads to avoidance, it is more than just background stress'),
      ],
      next: rl('Полезно отследить, в какие периоды тревога усиливается: цикл, недосып, конфликты, кофеин.', 'It may help to track when anxiety worsens: cycle, sleep deprivation, conflict, or caffeine.'),
    },
    asrs: {
      focus: [
        rl('важно не только отвлечение, но и то, насколько оно мешает завершать задачи и удерживать структуру дня','not just distractibility matters, but how much it disrupts finishing tasks and maintaining structure'),
        rl('при СДВГ часто страдают организация, память на договорённости и запуск дел','ADHD often affects organization, remembering commitments, and task initiation'),
        rl('полезно сравнить симптомы с детством: были ли они давно, а не только последние месяцы','compare symptoms with childhood: were they present long-term, not only in recent months'),
      ],
      next: rl('Если признаки устойчивые, имеет смысл обсудить их со специалистом по СДВГ и собрать примеры из повседневной жизни.', 'If signs are persistent, discuss them with an ADHD specialist and bring real-life examples.'),
    },
    psst: {
      focus: [
        rl('обращай внимание, появляются ли симптомы именно во второй половине цикла и ослабевают ли после начала месячных','check whether symptoms appear specifically in the second half of the cycle and ease after bleeding starts'),
        rl('самые важные маркеры - раздражительность, тревога, слёзы, упадок энергии и снижение контроля','key markers include irritability, anxiety, tearfulness, low energy, and reduced control'),
        rl('если это сильно бьёт по отношениям и работе, стоит думать уже не о «характере», а о ПМДР/ПМС','if it strongly affects relationships and work, it may be PMDD/PMS rather than personality'),
      ],
      next: rl('Полезно вести дневник по циклу 2-3 месяца, чтобы увидеть чёткую фазовую закономерность.', 'Keeping a cycle diary for 2-3 months can help show a clear phase-based pattern.'),
    },
    fsfi: {
      focus: [
        rl('оцени не только желание, но и возбуждение, смазку, боль, оргазм и удовлетворённость - это разные домены','assess not only desire but also arousal, lubrication, pain, orgasm, and satisfaction - these are different domains'),
        rl('важно учитывать лекарства, стресс, усталость, гормональные изменения и контекст отношений','consider medications, stress, fatigue, hormonal changes, and relationship context'),
        rl('если проблема связана прежде всего с болью, сухостью или резким падением желания, это полезно отдельно отметить врачу','if the main issue is pain, dryness, or a sharp drop in desire, mention that specifically to a clinician'),
      ],
      next: rl('При сомнениях полезно записать, что именно беспокоит больше всего: боль, сухость, отсутствие желания, трудность оргазма или напряжение.', 'If unsure, note what bothers you most: pain, dryness, low desire, orgasm difficulty, or tension.'),
    },
    iief5: {
      focus: [
        rl('смотри на стабильность эрекции, уверенность, сохранение эрекции и общую удовлетворённость','look at erection consistency, confidence, maintenance, and overall satisfaction'),
        rl('важно учитывать сон, стресс, алкоголь, курение, сосудистые риски и приём препаратов','consider sleep, stress, alcohol, smoking, vascular risks, and medications'),
        rl('если изменения появились внезапно, это полезно отметить отдельно','if changes appeared suddenly, note that separately'),
      ],
      next: rl('Если симптомы устойчивые, стоит обсудить не только урологию, но и сердечно-сосудистые факторы.', 'If symptoms persist, discuss not only urology but also cardiovascular factors.'),
    },
    adam: {
      focus: [
        rl('важные маркеры - снижение либидо, энергии, силы, настроения и качества эрекций','important markers are lower libido, energy, strength, mood, and erection quality'),
        rl('недосып, стресс и лишний вес тоже могут давать похожую картину','sleep deprivation, stress, and excess weight can produce a similar picture'),
        rl('для подтверждения нужны анализы, а не только анкета','blood tests are needed for confirmation, not just a questionnaire'),
      ],
      next: rl('Обычно обсуждают утренний общий тестостерон, SHBG, ЛГ и сопутствующие факторы.', 'Typical follow-up includes morning total testosterone, SHBG, LH, and related factors.'),
    },
    mdq: {
      focus: [
        rl('обрати внимание, были ли периоды необычно высокой энергии, сниженной потребности во сне, импульсивных трат или рискованного поведения','note whether there were periods of unusually high energy, reduced need for sleep, impulsive spending, or risky behavior'),
        rl('важно отличать краткие эмоциональные всплески от эпизодов, которые держатся днями','it is important to distinguish brief emotional spikes from episodes lasting days'),
        rl('если такие периоды реально выбиваются из привычного состояния, это важно обсудить с психиатром','if such periods clearly differ from your baseline, discuss them with a psychiatrist'),
      ],
      next: rl('Для точной оценки врачу полезно видеть примеры: сон, траты, идеи, конфликты, скачки активности.', 'Examples involving sleep, spending, ideas, conflicts, and activity surges are useful for a clinician.'),
    },
  }

  return guidance[testKey] || guidance.default
}

export default function ClinicalTestsPage() {
  const { user, profile, updateProfile } = useAuth()
  const { lang } = useLang()
  const navigate = useNavigate()
  const rl = useRl()

  const [activeTest, setActiveTest] = useState(null)
  const [answers, setAnswers] = useState([])
  const [step, setStep] = useState(0)
  const [result, setResult] = useState(null)
  const [saving, setSaving] = useState(false)
  const [completedTests, setCompletedTests] = useState({})
  const [draftTests, setDraftTests] = useState({})

  useEffect(() => {
    if (!user?.id) return
    try {
      const raw = localStorage.getItem(`elara_test_results_${user.id}`)
      setCompletedTests(raw ? JSON.parse(raw) : {})
    } catch {
      setCompletedTests({})
    }
    try {
      const rawDrafts = localStorage.getItem(`elara_test_drafts_${user.id}`)
      setDraftTests(rawDrafts ? JSON.parse(rawDrafts) : {})
    } catch {
      setDraftTests({})
    }
  }, [user?.id])

  function saveCompletedTest(testKey, payload) {
    if (!user?.id) return
    const next = {
      ...completedTests,
      [testKey]: {
        ...payload,
        completedAt: new Date().toISOString(),
      },
    }
    setCompletedTests(next)
    localStorage.setItem(`elara_test_results_${user.id}`, JSON.stringify(next))
  }


  function saveDraftTest(testKey, draft) {
    if (!user?.id || !testKey) return
    const next = {
      ...draftTests,
      [testKey]: {
        ...draft,
        updatedAt: new Date().toISOString(),
      },
    }
    setDraftTests(next)
    localStorage.setItem(`elara_test_drafts_${user.id}`, JSON.stringify(next))
  }

  function clearDraftTest(testKey) {
    if (!user?.id || !testKey) return
    const next = { ...draftTests }
    delete next[testKey]
    setDraftTests(next)
    localStorage.setItem(`elara_test_drafts_${user.id}`, JSON.stringify(next))
  }

  const isMale = ['male','trans_male'].includes(profile?.gender)
  const hasCycle = !['no_period','menopause'].includes(profile?.body_mode)

  function startTest(testKey, mode = 'auto') {
    const test = TESTS[testKey]
    const draft = draftTests[testKey]
    setActiveTest(testKey)
    setResult(null)

    if (mode !== 'restart' && draft?.answers?.length === test.questions.length) {
      setAnswers(draft.answers)
      setStep(Math.min(draft.step ?? 0, test.questions.length - 1))
      return
    }

    const emptyAnswers = new Array(test.questions.length).fill(null)
    setAnswers(emptyAnswers)
    setStep(0)
    saveDraftTest(testKey, { answers: emptyAnswers, step: 0 })
  }

  function goBackQuestion() {
    if (!activeTest) return
    if (step > 0) {
      const nextStep = step - 1
      setStep(nextStep)
      saveDraftTest(activeTest, { answers, step: nextStep })
    }
  }

  function leaveActiveTest() {
    if (activeTest && result === null) saveDraftTest(activeTest, { answers, step })
    setActiveTest(null)
    setResult(null)
  }

  function answerQuestion(val) {
    const newAnswers = [...answers]
    newAnswers[step] = val
    setAnswers(newAnswers)

    if (step < TESTS[activeTest].questions.length - 1) {
      const nextStep = step + 1
      setStep(nextStep)
      saveDraftTest(activeTest, { answers: newAnswers, step: nextStep })
    } else {
      saveDraftTest(activeTest, { answers: newAnswers, step })
      finishTest(newAnswers)
    }
  }

  async function finishTest(finalAnswers) {
    const test = TESTS[activeTest]
    let res
    if (activeTest === 'big5') {
      res = test.interpret(finalAnswers)
    } else {
      const score = finalAnswers.reduce((sum, a) => sum + (a || 0), 0)
      res = test.interpret(score)
      res.score = score
    }
    setResult(res)
    saveCompletedTest(activeTest, {
      level: res.level || null,
      text: res.text || null,
      score: res.score ?? null,
      tags: res.tags || null,
    })
    clearDraftTest(activeTest)

    // Применяем к профилю
    if (activeTest === 'big5' && res.tags) {
      const currentTags = profile?.personality_tags || []
      const newTags = [...new Set([...currentTags, ...res.tags])]
      await updateProfile({ personality_tags: newTags })
    }
    // Для медицинских тестов — добавляем болезнь в health если позитивный
    if (test.tagIfPositive && res.level !== 'low' && res.level !== 'none' && res.level !== 'negative' && res.level !== 'good') {
      const health = profile?.health || {}
      const diseases = health.diseases || []
      if (!diseases.includes(test.tagIfPositive)) {
        await updateProfile({ health: { ...health, diseases: [...diseases, test.tagIfPositive + ' ✨ AI'] } })
      }
    }
  }

  // Список доступных тестов
  const availableTests = Object.entries(TESTS).filter(([key, test]) => {
    if (test.for === 'male' && !isMale) return false
    if (test.for === 'cycle' && !hasCycle) return false
    return true
  })

  // Экран прохождения теста
  if (activeTest && result === null) {
    const test = TESTS[activeTest]
    const q = test.questions[step]
    const progress = (step / test.questions.length) * 100
    return (
      <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', padding:'24px 20px', gap:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button onClick={leaveActiveTest} style={{ background:'none', border:'none', color:'var(--text2)', cursor:'pointer', fontSize:20 }}>‹</button>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:500 }}>{test.name}</div>
            <div style={{ fontSize:11, color:'var(--text3)' }}>{step+1}/{test.questions.length}</div>
          </div>
        </div>

        {/* Прогресс */}
        <div style={{ height:4, background:'var(--bg3)', borderRadius:2 }}>
          <div style={{ height:'100%', width:`${progress}%`, background:'var(--accent)', borderRadius:2, transition:'width 0.3s' }} />
        </div>

        <div style={{ display:'flex', gap:8 }}>
          <button type="button" onClick={goBackQuestion} disabled={step === 0} className="btn btn-ghost" style={{ flex:1, opacity:step === 0 ? 0.45 : 1 }}>
            ← {rl('Предыдущий вопрос','Previous question')}
          </button>
          <button type="button" onClick={leaveActiveTest} className="btn btn-ghost" style={{ flex:1 }}>
            {rl('Сохранить и выйти','Save and exit')}
          </button>
        </div>

        {/* Вопрос */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', gap:20 }}>
          <p style={{ fontSize:17, lineHeight:1.7, fontFamily:'Cormorant Garamond, serif', textAlign:'center', color:'var(--text)', margin:0 }}>
            {q}
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {test.scale.map((label, i) => (
              <button key={i} onClick={() => answerQuestion(i)} style={{
                padding:'14px 16px', borderRadius:10, fontSize:14, cursor:'pointer', textAlign:'left',
                border:`1px solid ${answers[step] === i ? 'var(--accent)' : 'var(--border)'}`,
                background:answers[step] === i ? 'var(--accent-soft)' : 'var(--bg2)',
                color:answers[step] === i ? 'var(--accent)' : 'var(--text)',
                transition:'all 0.15s',
              }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Результат теста
  if (result) {
    const test = TESTS[activeTest]
    return (
      <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', padding:'24px 20px', gap:16 }}>
        <div style={{ textAlign:'center', padding:'20px 0' }}>
          <div style={{ fontSize:48 }}>✦</div>
          <h3 style={{ fontSize:22, fontFamily:'Cormorant Garamond, serif', marginTop:10 }}>
            {rl('Результат','Result')}: {test.name}
          </h3>
        </div>

        {/* Результат */}
        <div style={{ padding:'16px', borderRadius:12, background:`${result.color || '#4ade80'}15`, border:`1px solid ${result.color || '#4ade80'}30` }}>
          {result.text && <p style={{ fontSize:14, color:'var(--text)', lineHeight:1.6, margin:0, fontWeight:600 }}>{result.text}</p>}
          {result.score !== undefined && <div style={{ fontSize:12, color:'var(--text3)', marginTop:6 }}>{rl('Баллов','Score')}: {result.score}</div>}
          <div style={{ fontSize:12, color:'var(--text2)', marginTop:10, lineHeight:1.6 }}>
            {rl('Это предварительная интерпретация. Она помогает понять направление, но не ставит диагноз.', 'This is a preliminary interpretation. It helps show a direction, but it is not a diagnosis.')}
          </div>
        </div>

        {(() => {
          const guidance = buildResultGuidance(activeTest, result, rl)
          return (
            <div className="card" style={{ padding:'14px 16px' }}>
              <div style={{ fontSize:13, fontWeight:600, marginBottom:8 }}>{rl('На что обратить внимание','What to pay attention to')}</div>
              <ul style={{ margin:'0 0 12px 18px', padding:0, color:'var(--text2)', fontSize:13, lineHeight:1.65 }}>
                {guidance.focus.map((item, i) => <li key={i} style={{ marginBottom:6 }}>{item}</li>)}
              </ul>
              <div style={{ fontSize:12, color:'var(--text3)', lineHeight:1.6 }}>
                <strong style={{ color:'var(--text2)' }}>{rl('Дальше: ','Next: ')}</strong>{guidance.next}
              </div>
            </div>
          )
        })()}

        {/* Big5 результат */}
        {activeTest === 'big5' && result.tags && (
          <div>
            <div style={{ fontSize:12, color:'var(--text3)', marginBottom:8 }}>
              ✨ {rl('Добавлено в профиль:','Added to your profile:')}
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:7 }}>
              {result.tags.map(tag => (
                <span key={tag} style={{ padding:'5px 12px', borderRadius:20, background:'var(--accent-soft)', border:'1px solid var(--accent)', color:'var(--accent)', fontSize:12 }}>
                  {tag} ✨
                </span>
              ))}
            </div>
          </div>
        )}

        {test.tagIfPositive && result.level !== 'low' && result.level !== 'none' && (
          <div style={{ fontSize:12, color:'var(--text3)', lineHeight:1.6 }}>
            ✨ {rl('AI добавил маркер в профиль здоровья. Вы можете отредактировать его вручную.','AI added a marker to your health profile. You can edit it manually.')}
          </div>
        )}

        <div style={{ background:'rgba(248,113,113,0.08)', borderRadius:10, padding:'12px 14px', fontSize:12, color:'var(--text2)', lineHeight:1.6, border:'1px solid rgba(248,113,113,0.2)' }}>
          ⚠️ {rl('Результаты носят информационный характер. Не являются диагнозом. Обсудите с врачом.','Results are informational only. Not a diagnosis. Discuss with a doctor.')}
        </div>

        <a href={test.ref} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:'var(--accent)', display:'flex', alignItems:'center', gap:4 }}>
          🔗 {test.refName} — {rl('научный источник','scientific source')}
        </a>

        <div style={{ display:'flex', gap:8 }}>
          <button onClick={leaveActiveTest} className="btn btn-ghost" style={{ flex:1 }}>
            {rl('К тестам','Back to tests')}
          </button>
          <button onClick={() => navigate(-1)} className="btn btn-primary" style={{ flex:1 }}>
            {rl('Готово','Done')}
          </button>
        </div>
      </div>
    )
  }

  // Список тестов
  return (
    <div className="page-enter" style={{ flex:1, display:'flex', flexDirection:'column', padding:'20px 16px', gap:14, overflowY:'auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <button onClick={() => navigate(-1)} style={{ background:'none', border:'none', color:'var(--text2)', cursor:'pointer', fontSize:20 }}>‹</button>
        <h2 style={{ fontSize:22 }}>🧪 {rl('Клинические тесты','Clinical Tests')}</h2>
      <p style={{ fontSize:12, color:'var(--text3)', margin:0, lineHeight:1.5 }}>
        {rl('Валидированные психологические и медицинские шкалы. Не заменяют диагноз — помогают подготовиться к разговору с врачом.',
            'Validated psychological and medical scales. Not a diagnosis — help prepare for discussion with a doctor.')}
      </p>
      </div>

      <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.6, margin:0 }}>
        {rl(
          'Научно валидированные опросники — те же, что используют врачи. AI автоматически применит результаты к твоему профилю. Ты всегда можешь изменить их вручную.',
          'Scientifically validated questionnaires — the same doctors use. AI will automatically apply results to your profile. You can always edit them manually.'
        )}
      </p>

      {availableTests.map(([key, test]) => {
        const completed = completedTests[key]
        const draft = draftTests[key]
        const hasDraft = Boolean(draft && !completed)

        return (
          <div key={key} className="card" style={{ padding:'14px 16px' }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:8, gap:10 }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                  <span style={{ fontSize:14, fontWeight:500 }}>{test.name}</span>
                  {completed && (
                    <span style={{
                      fontSize:10, padding:'3px 8px', borderRadius:999,
                      background:'rgba(74,222,128,0.12)', color:'#4ade80', border:'1px solid rgba(74,222,128,0.35)'
                    }}>
                      ✓ {rl('Пройдено','Completed')}
                    </span>
                  )}
                </div>
                <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>{test.full}</div>
                {completed?.completedAt && (
                  <div style={{ fontSize:10, color:'var(--text3)', marginTop:4 }}>
                    {rl('Последний раз:','Last time:')} {new Date(completed.completedAt).toLocaleDateString(lang === 'en' ? 'en-US' : 'ru-RU')}
                    {completed.score !== null && completed.score !== undefined ? ` · ${rl('баллов','score')}: ${completed.score}` : ''}
                  </div>
                )}
                {hasDraft && (
                  <div style={{ fontSize:10, color:'#facc15', marginTop:4 }}>
                    {rl('Черновик:','Draft:')} {Math.min((draft.step || 0) + 1, test.questions.length)}/{test.questions.length}
                  </div>
                )}
              </div>
              <span style={{ fontSize:10, padding:'3px 8px', borderRadius:20, background:'var(--bg3)', color:'var(--text3)', border:'1px solid var(--border)', flexShrink:0 }}>
                {test.questions.length} {rl('вопр.','q.')}
              </span>
            </div>
            <p style={{ fontSize:12, color:'var(--text2)', margin:'0 0 10px', lineHeight:1.5 }}>{test.desc}</p>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10 }}>
              <a href={test.ref} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:'var(--accent)', display:'flex', alignItems:'center', gap:4, minWidth:0 }}>
                🔗 {test.refName}
              </a>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', justifyContent:'flex-end' }}>
              {hasDraft && (
                <button onClick={() => startTest(key, 'resume')} className="btn btn-primary" style={{ width:'auto', padding:'6px 14px', fontSize:12, whiteSpace:'nowrap' }}>
                  {rl('Продолжить','Continue')} →
                </button>
              )}
              {hasDraft && (
                <button onClick={() => { clearDraftTest(key); startTest(key, 'restart') }} className="btn btn-ghost" style={{ width:'auto', padding:'6px 14px', fontSize:12, whiteSpace:'nowrap' }}>
                  {rl('Начать заново','Start over')}
                </button>
              )}
              {!hasDraft && (
                <button onClick={() => startTest(key, 'restart')} className={completed ? 'btn btn-primary' : 'btn btn-ghost'} style={{ width:'auto', padding:'6px 16px', fontSize:12, whiteSpace:'nowrap' }}>
                  {completed ? rl('Пройти ещё раз','Retake') : rl('Пройти','Start')} →
                </button>
              )}
            </div>
            </div>
          </div>
        )
      })}

      <div style={{ padding:'12px', background:'rgba(248,113,113,0.06)', borderRadius:10, fontSize:11, color:'var(--text3)', lineHeight:1.6, border:'1px solid rgba(248,113,113,0.15)' }}>
        ⚠️ {rl('Тесты не заменяют диагностику врача. Это скрининговые инструменты первичной оценки.','Tests do not replace medical diagnosis. These are primary screening tools.')}
      </div>
    </div>
  )
}
