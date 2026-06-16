import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { supabase } from '../lib/supabase'
import { earnAchievement, hasAchievement } from '../lib/achievements'
import { showAchievementToast } from '../components/AchievementToast'

const FIRST_AID_SECTIONS = [
  {
    key: 'assessment', emoji: '🧭', ru: 'Первые 60 секунд', en: 'First 60 seconds',
    introRu: 'Базовый алгоритм для любой экстренной ситуации: безопасность, сознание, дыхание, сильное кровотечение, вызов помощи. Обычная первая помощь для дома, улицы, поездок, спорта и любых бытовых ситуаций.',
    introEn: 'A basic sequence for any emergency: safety, responsiveness, breathing, severe bleeding, and calling for help.',
    stepsRu: [
      'Убедись, что место безопасно для тебя: дорога, ток, огонь, газ, агрессия, вода, животные, острые предметы.',
      'Обратись к человеку громко и спокойно: “Вы меня слышите? Что случилось?”',
      'Если не отвечает - позови конкретного человека помочь и звони в экстренную службу 112/911 или местный номер.',
      'Проверь нормальное дыхание не дольше 10 секунд: смотри на грудную клетку, слушай и ощущай дыхание.',
      'Быстро ищи сильное кровотечение, признаки удушья, судорог, анафилаксии, инсульта, боли в груди или травмы головы/шеи.',
    ],
    stepsEn: [
      'Make sure the scene is safe: traffic, electricity, fire, gas, violence, water, animals, sharp objects.',
      'Speak loudly and calmly: “Can you hear me? What happened?”',
      'If there is no response, ask a specific person to help and call local emergency services.',
      'Check normal breathing for no more than 10 seconds: look, listen and feel.',
      'Quickly check for severe bleeding, choking, seizure, anaphylaxis, stroke, chest pain, or head/neck injury.',
    ],
    dangerRu: ['Не рискуй собой.', 'Не давай еду, воду или таблетки человеку в спутанном сознании.', 'Не двигай человека без необходимости при подозрении на травму шеи/спины.'],
    dangerEn: ['Do not put yourself at risk.', 'Do not give food, water or pills to someone confused or not fully alert.', 'Do not move someone with suspected neck/spine injury unless necessary.'],
  },
  {
    key: 'unconscious_breathing', emoji: '😴', ru: 'Без сознания, но дышит', en: 'Unconscious but breathing',
    introRu: 'Если человек без сознания, но нормально дышит, главная задача - сохранить дыхательные пути открытыми и вызвать помощь.',
    introEn: 'If a person is unconscious but breathing normally, keep the airway open and get help.',
    stepsRu: [
      'Позови помощь и вызови экстренную службу, если человек не приходит в сознание быстро или причина не ясна.',
      'Проверь дыхание. Если дыхание нормальное - аккуратно поверни на бок в восстановительное положение, если нет подозрения на травму позвоночника.',
      'Ослабь тесную одежду у шеи и груди.',
      'Проверяй дыхание до приезда помощи.',
      'Если дыхание стало ненормальным или пропало - начинай СЛР и используй автоматический наружный дефибриллятор, если он доступен.',
    ],
    stepsEn: [
      'Call for help and contact emergency services if they do not wake quickly or the cause is unclear.',
      'Check breathing. If normal, gently place in the recovery position unless spinal injury is suspected.',
      'Loosen tight clothing around neck and chest.',
      'Keep checking breathing until help arrives.',
      'If breathing becomes abnormal or stops, start CPR and use an AED if available.',
    ],
    dangerRu: ['Не оставляй человека одного.', 'Не вливай воду в рот.', 'Не тряси и не бей по лицу.'],
    dangerEn: ['Do not leave them alone.', 'Do not pour water into the mouth.', 'Do not shake or slap the face.'],
  },
  {
    key: 'cpr', emoji: '❤️', ru: 'Нет нормального дыхания: СЛР / дефибриллятор', en: 'No normal breathing: CPR / AED',
    introRu: 'Нет сознания и нормального дыхания - это сценарий СЛР. Приложение не заменяет курс, но порядок действий должен быть под рукой.',
    introEn: 'Unconscious and not breathing normally means CPR. The app does not replace training, but the sequence should be accessible.',
    stepsRu: [
      'Позови помощь и звони в экстренную службу.',
      'Попроси конкретного человека принести автоматический наружный дефибриллятор, если он доступен.',
      'Начни компрессии грудной клетки: центр груди, глубоко и быстро, 100-120 в минуту.',
      'Если обучен(а), делай 30 компрессий и 2 вдоха. Если не обучен(а) - делай только компрессии до приезда помощи.',
      'Включи дефибриллятор и следуй голосовым командам устройства. Не трогай человека во время анализа и разряда.',
    ],
    stepsEn: [
      'Call for help and contact emergency services.',
      'Ask a specific person to bring an AED/defibrillator if available.',
      'Start chest compressions: center of chest, hard and fast, 100-120 per minute.',
      'If trained, use 30 compressions and 2 breaths. If not trained, do hands-only CPR until help arrives.',
      'Turn on the AED and follow voice prompts. Do not touch the person during analysis or shock.',
    ],
    dangerRu: ['Не трать время на долгий поиск пульса.', 'Не прекращай компрессии без причины.', 'Не бойся дефибриллятора: устройство само подсказывает действия.'],
    dangerEn: ['Do not spend time searching for a pulse.', 'Do not stop compressions without reason.', 'Do not fear the AED: it gives instructions.'],
  },
  {
    key: 'choking', emoji: '🫁', ru: 'Удушье / подавился', en: 'Choking',
    introRu: 'Если человек не может говорить, кашлять или дышать - действовать нужно сразу. Если кашель эффективный - поощряй кашлять и наблюдай.',
    introEn: 'If a person cannot speak, cough or breathe, act immediately. If coughing is effective, encourage coughing and monitor.',
    stepsRu: [
      'Спроси: “Вы подавились?” Если человек кивает и не может говорить - это тяжёлое удушье.',
      'Попроси кого-то вызвать скорую.',
      'Сделай 5 ударов основанием ладони между лопатками.',
      'Если не помогло - сделай 5 абдоминальных толчков выше пупка и ниже грудины.',
      'Чередуй 5 ударов и 5 толчков до выхода предмета, потери сознания или приезда помощи. Если человек потерял сознание - начинай СЛР.',
    ],
    stepsEn: [
      'Ask: “Are you choking?” If they nod and cannot speak, this is severe choking.',
      'Ask someone to call emergency services.',
      'Give 5 back blows between the shoulder blades.',
      'If unsuccessful, give 5 abdominal thrusts above the navel and below the breastbone.',
      'Alternate 5 back blows and 5 thrusts until the object comes out, the person becomes unconscious, or help arrives. If unconscious, start CPR.',
    ],
    dangerRu: ['Не лезь пальцами вслепую в рот.', 'Не бей по спине, если человек нормально кашляет.', 'Не давай пить, пока дыхательные пути не свободны.'],
    dangerEn: ['Do not blindly sweep the mouth with fingers.', 'Do not give back blows if the person is coughing effectively.', 'Do not give drinks until the airway is clear.'],
  },
  {
    key: 'bleeding', emoji: '🩸', ru: 'Сильное кровотечение', en: 'Severe bleeding',
    introRu: 'Главная цель - прямое давление на рану и вызов помощи. Красиво паникуем потом, сейчас давим.',
    introEn: 'The goal is direct pressure on the wound and calling for help.',
    stepsRu: [
      'Надень перчатки или используй барьер, если возможно.',
      'Прижми рану чистой салфеткой, тканью или бинтом и держи постоянное давление.',
      'Если повязка промокла - не снимай первый слой, добавь новый сверху.',
      'Если кровотечение из конечности не останавливается прямым давлением и угрожает жизни - используй турникет/жгут, если умеешь.',
      'Вызывай скорую при пульсирующем кровотечении, большой потере крови, слабости, бледности, травме головы/шеи/живота или невозможности остановить кровь.',
    ],
    stepsEn: [
      'Put on gloves or use a barrier if possible.',
      'Press the wound with clean gauze, cloth or bandage and maintain pressure.',
      'If soaked, do not remove the first layer; add another layer on top.',
      'If life-threatening limb bleeding does not stop with pressure, use a tourniquet if trained.',
      'Call emergency services for spurting bleeding, heavy blood loss, weakness, pallor, head/neck/abdomen injury, or bleeding that cannot be controlled.',
    ],
    dangerRu: ['Не промывай глубокую сильно кровящую рану вместо давления.', 'Не вытаскивай глубоко застрявший предмет.', 'Не трогай кровь без защиты, если есть возможность защититься.'],
    dangerEn: ['Do not rinse a deep heavily bleeding wound instead of applying pressure.', 'Do not remove deeply embedded objects.', 'Do not touch blood without protection if protection is available.'],
  },
  {
    key: 'burns', emoji: '🔥', ru: 'Ожоги', en: 'Burns',
    introRu: 'При термическом ожоге охлаждение прохладной проточной водой помогает уменьшить повреждение. Без масла, льда и бабушкиной алхимии.',
    introEn: 'For thermal burns, cool running water helps reduce injury. No oil, ice or kitchen witchcraft.',
    stepsRu: [
      'Убери источник тепла и останови воздействие.',
      'Охлаждай ожог прохладной проточной водой 20 минут, как можно раньше.',
      'Сними кольца/браслеты рядом с ожогом до отёка, если это легко и не травмирует кожу.',
      'Накрой чистой неприлипающей повязкой или пищевой плёнкой без тугого давления.',
      'К врачу/скорую: лицо, кисти, гениталии, суставы, большой ожог, химический/электрический ожог, ребёнок, беременность, признаки шока.',
    ],
    stepsEn: [
      'Remove the heat source and stop exposure.',
      'Cool the burn with cool running water for 20 minutes as early as possible.',
      'Remove rings/bracelets near the burn before swelling if easy and safe.',
      'Cover with a clean non-stick dressing or plastic wrap without tight pressure.',
      'Seek urgent care for face, hands, genitals, joints, large burns, chemical/electrical burns, children, pregnancy, or shock signs.',
    ],
    dangerRu: ['Не прикладывай лёд.', 'Не мажь маслом, зубной пастой или жирным кремом.', 'Не вскрывай пузыри и не отрывай прилипшую одежду.'],
    dangerEn: ['Do not apply ice.', 'Do not apply oil, toothpaste or greasy cream.', 'Do not pop blisters or pull off stuck clothing.'],
  },
  {
    key: 'fainting', emoji: '🌫️', ru: 'Обморок', en: 'Fainting',
    introRu: 'Обморок бывает из-за жары, обезвоживания, боли, стресса, голода, резкого вставания и кучи других бытовых причин. Тело иногда выключает питание как старый ноутбук.',
    introEn: 'Fainting may happen from heat, dehydration, pain, stress, hunger, standing up quickly and many everyday triggers.',
    stepsRu: [
      'Уложи человека на спину.',
      'Если нет травмы и человек дышит - приподними ноги примерно на 30 см.',
      'Ослабь тесную одежду, обеспечь воздух, убери толпу вокруг.',
      'Не поднимай резко. Дай полежать и восстановиться.',
      'Вызывай скорую, если человек не очнулся примерно за минуту, есть боль в груди, одышка, судороги, травма головы, беременность, диабет, повторный обморок или необычное восстановление.',
    ],
    stepsEn: [
      'Lay the person on their back.',
      'If there is no injury and they are breathing, raise legs about 30 cm.',
      'Loosen tight clothing, provide air, keep crowd away.',
      'Do not lift abruptly. Let them rest and recover.',
      'Call emergency services if they do not wake within about a minute, or if chest pain, breathing trouble, seizure, head injury, pregnancy, diabetes, repeated fainting, or abnormal recovery occurs.',
    ],
    dangerRu: ['Не поднимай резко.', 'Не хлопай по лицу.', 'Не давай пить, пока человек полностью не пришёл в сознание.'],
    dangerEn: ['Do not lift abruptly.', 'Do not slap the face.', 'Do not give drinks until fully alert.'],
  },
  {
    key: 'seizure', emoji: '⚡', ru: 'Судороги', en: 'Seizure',
    introRu: 'Задача - защитить от травм и засечь время. В рот ничего не класть. Вообще ничего. Даже если кто-то уверенно говорит про “ложечку”.',
    introEn: 'Protect from injury and time the seizure. Put nothing in the mouth. Nothing.',
    stepsRu: [
      'Убери опасные предметы вокруг.',
      'Подложи что-то мягкое под голову.',
      'Засеки время начала приступа.',
      'После судорог поверни человека на бок, если он дышит.',
      'Вызывай скорую, если судороги дольше 5 минут, повторяются, это первый приступ, есть травма, беременность, диабет, человек не приходит в себя или дыхание нарушено.',
    ],
    stepsEn: [
      'Move dangerous objects away.',
      'Cushion the head.',
      'Time the seizure.',
      'After convulsions, turn the person on the side if breathing.',
      'Call emergency services if seizure lasts over 5 minutes, repeats, is first known seizure, injury occurs, pregnancy/diabetes is present, recovery is poor, or breathing is abnormal.',
    ],
    dangerRu: ['Не удерживай силой.', 'Не разжимай рот.', 'Не давай пить или таблетки сразу после приступа.'],
    dangerEn: ['Do not restrain forcefully.', 'Do not force the mouth open.', 'Do not give drinks or pills right after the seizure.'],
  },
  {
    key: 'allergy', emoji: '⚠️', ru: 'Анафилаксия / сильная аллергия', en: 'Anaphylaxis / severe allergy',
    introRu: 'Опасные признаки: отёк губ/языка/горла, хрипы, одышка, слабость, падение давления, крапивница после контакта с аллергеном.',
    introEn: 'Danger signs: lip/tongue/throat swelling, wheezing, breathing trouble, weakness, low blood pressure, hives after allergen exposure.',
    stepsRu: [
      'Немедленно вызывай скорую.',
      'Если у человека есть автоинъектор адреналина - помоги использовать его по инструкции устройства.',
      'Уложи человека. Если тяжело дышать - полусидя. Если беременность - на левый бок.',
      'Следи за дыханием. Будь готов(а) к СЛР, если человек перестал нормально дышать.',
      'Антигистаминные могут быть дополнением, но не заменяют адреналин при анафилаксии.',
    ],
    stepsEn: [
      'Call emergency services immediately.',
      'If the person has an epinephrine autoinjector, help use it according to the device instructions.',
      'Lay them down. If breathing is difficult, let them sit partly upright. If pregnant, left side.',
      'Monitor breathing. Be ready for CPR if normal breathing stops.',
      'Antihistamines may be additional help, but do not replace epinephrine in anaphylaxis.',
    ],
    dangerRu: ['Не жди, “вдруг само пройдёт”.', 'Не ставь человека резко на ноги.', 'Не заменяй вызов скорой таблеткой при проблемах с дыханием.'],
    dangerEn: ['Do not wait to see if it passes.', 'Do not make them stand suddenly.', 'Do not replace emergency help with a tablet when breathing is affected.'],
  },
  {
    key: 'stroke', emoji: '🧠', ru: 'Инсульт: лицо, руки, речь, время', en: 'Stroke: FAST',
    introRu: 'При инсульте главная первая помощь - быстро распознать и вызвать скорую. Тут нет домашней магии, только время.',
    introEn: 'For stroke, first aid is early recognition and calling emergency services. Time matters.',
    stepsRu: [
      'Лицо: попроси улыбнуться - одна сторона лица опускается?',
      'Руки: попроси поднять обе руки - одна слабее или опускается?',
      'Речь: речь невнятная, странная, человек не понимает простые фразы?',
      'Время: если есть хотя бы один признак - сразу вызывай скорую.',
      'Запомни время начала симптомов или когда человека последний раз видели нормальным.',
    ],
    stepsEn: [
      'Face: ask them to smile - is one side drooping?',
      'Arms: ask them to raise both arms - is one weak or drifting down?',
      'Speech: is speech slurred, strange, or are simple phrases not understood?',
      'Time: if any sign is present, call emergency services immediately.',
      'Remember the time symptoms began or when they were last seen well.',
    ],
    dangerRu: ['Не давай аспирин “на всякий случай”.', 'Не вези самостоятельно, если доступна скорая.', 'Не жди, пока “отпустит”.'],
    dangerEn: ['Do not give aspirin “just in case”.', 'Do not drive them yourself if emergency services are available.', 'Do not wait for it to pass.'],
  },
  {
    key: 'chest_pain', emoji: '💔', ru: 'Боль в груди / подозрение на инфаркт', en: 'Chest pain / possible heart attack',
    introRu: 'Боль, давление или жжение в груди, одышка, холодный пот, тошнота, боль в руке/челюсти/спине - повод вызывать скорую. Не геройствуем, это не тот квест.',
    introEn: 'Chest pain, pressure or burning, shortness of breath, cold sweat, nausea, arm/jaw/back pain - call emergency services.',
    stepsRu: [
      'Усадь человека в удобное положение и ограничь нагрузку.',
      'Вызови скорую.',
      'Ослабь тесную одежду, обеспечь спокойствие.',
      'Если человек принимает назначенные сердечные лекарства, помоги ему принять их по его инструкции.',
      'Если человек потерял сознание и не дышит нормально - начинай СЛР и используй AED.',
    ],
    stepsEn: [
      'Help the person sit comfortably and reduce exertion.',
      'Call emergency services.',
      'Loosen tight clothing and keep them calm.',
      'If they have prescribed heart medication, help them take it according to their instructions.',
      'If they become unconscious and are not breathing normally, start CPR and use an AED.',
    ],
    dangerRu: ['Не заставляй ходить.', 'Не жди часами.', 'Не давай чужие лекарства.'],
    dangerEn: ['Do not make them walk around.', 'Do not wait for hours.', 'Do not give someone else’s medication.'],
  },
  {
    key: 'head_injury', emoji: '🪨', ru: 'Травма головы / падение', en: 'Head injury / fall',
    introRu: 'После удара головой важно заметить красные флаги: потеря сознания, рвота, спутанность, сильная сонливость, судороги, слабость, кровь/жидкость из уха или носа.',
    introEn: 'After a head injury, watch for red flags: loss of consciousness, vomiting, confusion, severe drowsiness, seizure, weakness, blood/fluid from ear or nose.',
    stepsRu: [
      'Останови активность и посади/уложи человека.',
      'Если есть сильное кровотечение - аккуратно прижми вокруг раны, не дави на очевидную деформацию черепа.',
      'Приложи холод через ткань к месту удара на 15-20 минут.',
      'Наблюдай за состоянием, речью, координацией и сознанием.',
      'Вызывай скорую при потере сознания, повторной рвоте, судорогах, ухудшении, сильной головной боли, подозрении на травму шеи/спины или при приёме антикоагулянтов.',
    ],
    stepsEn: [
      'Stop activity and help the person sit or lie down.',
      'If severe bleeding is present, gently apply pressure around the wound, not on an obvious skull deformity.',
      'Apply a cold pack wrapped in cloth for 15-20 minutes.',
      'Monitor consciousness, speech, coordination and symptoms.',
      'Call emergency services for loss of consciousness, repeated vomiting, seizure, worsening condition, severe headache, suspected neck/spine injury or anticoagulant use.',
    ],
    dangerRu: ['Не оставляй человека одного при красных флагах.', 'Не давай алкоголь или седативные.', 'Не двигай шею при подозрении на травму позвоночника.'],
    dangerEn: ['Do not leave them alone if red flags are present.', 'Do not give alcohol or sedatives.', 'Do not move the neck if spinal injury is suspected.'],
  },
  {
    key: 'fracture_sprain', emoji: '🦴', ru: 'Перелом / вывих / растяжение', en: 'Fracture / dislocation / sprain',
    introRu: 'Если есть деформация, сильная боль, невозможность опоры, онемение или рана над костью - лучше считать это серьёзной травмой.',
    introEn: 'If there is deformity, severe pain, inability to bear weight, numbness or a wound over bone, treat it as serious.',
    stepsRu: [
      'Останови движение и не пытайся “вправить”.',
      'Зафиксируй конечность в том положении, в котором она находится.',
      'Приложи холод через ткань на 15-20 минут.',
      'Приподними конечность, если это возможно без боли.',
      'Обратись за медицинской помощью при деформации, сильной боли, онемении, нарушении кровообращения, открытой ране или невозможности пользоваться конечностью.',
    ],
    stepsEn: [
      'Stop movement and do not try to “put it back”.',
      'Immobilize the limb in the position found.',
      'Apply cold wrapped in cloth for 15-20 minutes.',
      'Elevate the limb if possible without pain.',
      'Seek medical care for deformity, severe pain, numbness, poor circulation, open wound, or inability to use the limb.',
    ],
    dangerRu: ['Не вправляй сустав или кость самостоятельно.', 'Не грей свежую травму.', 'Не массируй область сильной боли/деформации.'],
    dangerEn: ['Do not reduce a joint or bone yourself.', 'Do not heat a fresh injury.', 'Do not massage an area with severe pain/deformity.'],
  },
  {
    key: 'poisoning', emoji: '☠️', ru: 'Отравление / химикаты', en: 'Poisoning / chemicals',
    introRu: 'При подозрении на отравление важны вещество, количество, время и состояние человека. Самодеятельность тут особенно любит портить финал.',
    introEn: 'For poisoning, substance, amount, time and symptoms matter. Improvising can make things worse.',
    stepsRu: [
      'Убери человека от источника опасности, если это безопасно для тебя.',
      'Позвони в скорую или токсикологический центр, если он доступен в стране.',
      'Сохрани упаковку, фото вещества или список лекарств.',
      'Если химикат на коже - сними загрязнённую одежду и промывай кожу водой.',
      'Если человек без сознания или плохо дышит - вызывай скорую немедленно, контролируй дыхание, будь готов(а) к СЛР.',
    ],
    stepsEn: [
      'Move the person away from danger if safe for you.',
      'Call emergency services or poison control if available in your country.',
      'Keep the package, a photo of the substance, or medication list.',
      'If a chemical is on skin, remove contaminated clothing and rinse skin with water.',
      'If unconscious or breathing poorly, call emergency services immediately, monitor breathing, and be ready for CPR.',
    ],
    dangerRu: ['Не вызывай рвоту без указания специалиста.', 'Не давай молоко/алкоголь/“нейтрализаторы”.', 'Не нюхай неизвестные пары близко.'],
    dangerEn: ['Do not induce vomiting unless told by a professional.', 'Do not give milk/alcohol/“neutralizers”.', 'Do not sniff unknown fumes closely.'],
  },
  {
    key: 'heat_cold', emoji: '🌡️', ru: 'Перегрев / переохлаждение', en: 'Heat illness / hypothermia',
    introRu: 'Температурные проблемы бывают на улице, в спортзале, дома и в поездках. Организм, к сожалению, не читает прогноз погоды внимательно.',
    introEn: 'Temperature emergencies can happen outdoors, at the gym, at home or while traveling.',
    stepsRu: [
      'При перегреве: переведи в тень/прохладу, сними лишнюю одежду, охлаждай кожу водой/вентилятором, давай пить маленькими глотками, если человек в сознании.',
      'Срочно вызывай помощь при спутанности, потере сознания, судорогах, очень горячей коже или ухудшении.',
      'При переохлаждении: перенеси в тепло, сними мокрую одежду, укрой сухими слоями.',
      'Согревай постепенно, особенно корпус. Дай тёплое питьё, если человек полностью в сознании.',
      'Вызывай скорую при спутанности, сильной сонливости, замедленном дыхании, нарушении сознания или подозрении на обморожение.',
    ],
    stepsEn: [
      'For heat illness: move to shade/cool area, remove excess clothing, cool skin with water/fan, give small sips if fully alert.',
      'Call emergency help urgently for confusion, unconsciousness, seizure, very hot skin or worsening condition.',
      'For hypothermia: move to warmth, remove wet clothing, cover with dry layers.',
      'Warm gradually, especially the core. Give warm drinks if fully alert.',
      'Call emergency services for confusion, severe drowsiness, slow breathing, altered consciousness or suspected frostbite.',
    ],
    dangerRu: ['Не давай пить человеку в спутанном сознании.', 'Не используй очень горячую ванну при переохлаждении.', 'Не игнорируй спутанность сознания при жаре.'],
    dangerEn: ['Do not give drinks to someone confused.', 'Do not use a very hot bath for hypothermia.', 'Do not ignore confusion during heat exposure.'],
  },
]

const TEST_QUESTIONS = [
  {
    qRu: 'Человек без сознания и не дышит нормально. Что делать?',
    qEn: 'A person is unconscious and not breathing normally. What should you do?',
    optionsRu: ['Дать воды', 'Звонок в скорую, СЛР, дефибриллятор если доступен', 'Похлопать по лицу'],
    optionsEn: ['Give water', 'Call emergency services, start CPR, use AED if available', 'Slap the face'],
    answer: 1,
  },
  {
    qRu: 'Человек подавился и не может говорить. Первый алгоритм:',
    qEn: 'A person is choking and cannot speak. First sequence:',
    optionsRu: ['5 ударов по спине, затем 5 абдоминальных толчков', 'Дать запить водой', 'Пальцами вслепую доставать предмет'],
    optionsEn: ['5 back blows, then 5 abdominal thrusts', 'Give water', 'Blind finger sweep'],
    answer: 0,
  },
  {
    qRu: 'При сильном кровотечении первым делом нужно:',
    qEn: 'For severe bleeding, first action is:',
    optionsRu: ['Прижать рану и держать давление', 'Промывать рану вместо давления', 'Снять промокшую повязку и смотреть'],
    optionsEn: ['Apply direct pressure and keep pressure', 'Rinse instead of pressure', 'Remove soaked dressing to look'],
    answer: 0,
  },
  {
    qRu: 'При ожоге в первые минуты лучше:',
    qEn: 'For a burn in the first minutes, best action is:',
    optionsRu: ['Лёд на кожу', 'Масло/зубная паста', 'Прохладная проточная вода около 20 минут'],
    optionsEn: ['Ice on skin', 'Oil/toothpaste', 'Cool running water for about 20 minutes'],
    answer: 2,
  },
  {
    qRu: 'При судорогах нельзя:',
    qEn: 'During a seizure, do not:',
    optionsRu: ['Убрать опасные предметы', 'Засечь время', 'Класть что-то в рот'],
    optionsEn: ['Move hazards away', 'Time it', 'Put something in the mouth'],
    answer: 2,
  },
  {
    qRu: 'При подозрении на инсульт нужно проверить:',
    qEn: 'FAST for stroke means checking:',
    optionsRu: ['Лицо, руки, речь, время вызвать скорую', 'Температуру, пульс, аппетит', 'Только давление'],
    optionsEn: ['Face, arms, speech, time to call emergency', 'Temperature, pulse, appetite', 'Blood pressure only'],
    answer: 0,
  },
]

const SOURCES = [
  { label: 'American Heart Association / American Red Cross 2024 First Aid Guidelines', url: 'https://cpr.heart.org/en/resuscitation-science/2024-first-aid-guidelines' },
  { label: 'Red Cross: First Aid Steps', url: 'https://www.redcross.org/take-a-class/first-aid/performing-first-aid/first-aid-steps' },
  { label: 'Mayo Clinic: First Aid', url: 'https://www.mayoclinic.org/first-aid' },
  { label: 'Mayo Clinic: Choking First Aid', url: 'https://www.mayoclinic.org/first-aid/first-aid-choking/basics/art-20056637' },
  { label: 'Mayo Clinic: Burns First Aid', url: 'https://www.mayoclinic.org/first-aid/first-aid-burns/basics/art-20056649' },
  { label: 'Mayo Clinic: Fainting First Aid', url: 'https://www.mayoclinic.org/first-aid/first-aid-fainting/basics/art-20056606' },
  { label: 'ILCOR 2020 First Aid CoSTR', url: 'https://pubmed.ncbi.nlm.nih.gov/33098920/' },
]


export default function FirstAidPage() {
  const navigate = useNavigate()
  const { user, profile, updateProfile } = useAuth()
  const { lang } = useLang()
  const rl = (ru, en) => (lang === 'en' ? en : ru)
  const [open, setOpen] = useState('assessment')
  const [answers, setAnswers] = useState({})
  const [detailMode, setDetailMode] = useState(() => {
    try { return localStorage.getItem('elara_first_aid_detail_mode') || 'short' } catch { return 'short' }
  })

  const saveDetailMode = (mode) => {
    setDetailMode(mode)
    try { localStorage.setItem('elara_first_aid_detail_mode', mode) } catch {}
  }

  useEffect(() => {
    if (!profile || !user?.id || hasAchievement(profile, 'first_aid_started')) return
    earnAchievement(supabase, profile, 'first_aid_started', updateProfile).then(ok => {
      if (ok) showAchievementToast('first_aid_started')
    }).catch(() => {})
  }, [profile?.id, user?.id])

  const score = useMemo(() => TEST_QUESTIONS.reduce((sum, q, idx) => sum + (answers[idx] === q.answer ? 1 : 0), 0), [answers])
  const complete = Object.keys(answers).length === TEST_QUESTIONS.length

  return (
    <div className="page-enter" style={{ flex:1, overflowY:'auto', padding:'18px 16px 28px', display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <button onClick={() => navigate('/today')} className="btn btn-ghost" style={{ width:'auto', padding:'8px 11px' }}>‹</button>
        <div>
          <h2 style={{ fontSize:25, margin:0 }}>🆘 {rl('Первая помощь', 'First aid')}</h2>
          <p style={{ margin:'4px 0 0', color:'var(--text3)', fontSize:12, lineHeight:1.45 }}>
            {rl('Короткие алгоритмы обычной первой помощи для дома, улицы, поездок, спорта и внезапного человеческого хаоса.', 'Short general first-aid algorithms for home, streets, travel, sport and ordinary human chaos.')}
          </p>
        </div>
      </div>

      <div className="card" style={{ padding:14, borderColor:'rgba(248,113,113,0.35)', background:'rgba(248,113,113,0.08)' }}>
        <div style={{ fontWeight:800, color:'#fecaca', marginBottom:5 }}>⚠️ {rl('Важно', 'Important')}</div>
        <p style={{ margin:0, color:'var(--text2)', fontSize:12, lineHeight:1.55 }}>
          {rl('При угрозе жизни вызывай экстренную службу. Это справочник первой помощи, не диагностика и не замена очному обучению СЛР.', 'For life-threatening situations, call emergency services. This is a first-aid reference, not diagnosis or a replacement for CPR training.')}
        </p>
      </div>

      <div className="card" style={{ padding:12, display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
        <div>
          <div style={{ fontSize:13, fontWeight:800 }}>{rl('Формат инструкций', 'Instruction format')}</div>
          <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>
            {detailMode === 'short'
              ? rl('Коротко: только самое срочное.', 'Short: only the urgent actions.')
              : rl('Подробно: весь алгоритм, запреты и пояснения.', 'Full: complete sequence, warnings and explanations.')}
          </div>
        </div>
        <div style={{ display:'flex', gap:6, flexShrink:0 }}>
          {['short','full'].map(mode => (
            <button key={mode} type="button" onClick={() => saveDetailMode(mode)} style={{
              padding:'7px 10px', borderRadius:999, fontSize:11, cursor:'pointer',
              border:`1px solid ${detailMode === mode ? 'var(--accent)' : 'var(--border)'}`,
              background: detailMode === mode ? 'var(--accent-soft)' : 'transparent',
              color: detailMode === mode ? 'var(--accent)' : 'var(--text2)',
              fontWeight: detailMode === mode ? 800 : 500,
            }}>
              {mode === 'short' ? rl('Кратко', 'Short') : rl('Полно', 'Full')}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
        {FIRST_AID_SECTIONS.map(section => (
          <button key={section.key} onClick={() => setOpen(section.key)} style={{
            padding:'8px 11px', borderRadius:999, border:`1px solid ${open === section.key ? 'var(--accent)' : 'var(--border)'}`,
            background: open === section.key ? 'var(--accent-soft)' : 'var(--bg2)', color: open === section.key ? 'var(--accent)' : 'var(--text2)',
            cursor:'pointer', fontSize:12,
          }}>
            {section.emoji} {lang === 'en' ? section.en : section.ru}
          </button>
        ))}
      </div>

      {FIRST_AID_SECTIONS.filter(s => s.key === open).map(section => (
        <section key={section.key} className="card" style={{ padding:16 }}>
          <h3 style={{ margin:'0 0 8px', fontSize:21 }}>{section.emoji} {lang === 'en' ? section.en : section.ru}</h3>
          <p style={{ margin:'0 0 12px', color:'var(--text2)', fontSize:13, lineHeight:1.6 }}>
            {detailMode === 'short'
              ? (lang === 'en' ? section.introEn : section.introRu).split('.')[0] + '.'
              : (lang === 'en' ? section.introEn : section.introRu)}
          </p>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {(detailMode === 'short'
              ? (lang === 'en' ? section.stepsEn : section.stepsRu).slice(0, 3)
              : (lang === 'en' ? section.stepsEn : section.stepsRu)
            ).map((step, idx) => (
              <div key={idx} style={{ display:'flex', gap:10, alignItems:'flex-start', padding:'9px 10px', borderRadius:12, background:'var(--bg2)', border:'1px solid var(--border)' }}>
                <span style={{ width:22, height:22, borderRadius:999, background:'var(--accent-soft)', color:'var(--accent)', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, flexShrink:0 }}>{idx + 1}</span>
                <span style={{ color:'var(--text2)', fontSize:13, lineHeight:1.5 }}>{step}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop:12, padding:12, borderRadius:14, background:'rgba(248,113,113,0.08)', border:'1px solid rgba(248,113,113,0.25)' }}>
            <div style={{ fontSize:12, fontWeight:800, color:'#fecaca', marginBottom:6 }}>{rl('Чего не делать', 'Do not')}</div>
            {(detailMode === 'short'
              ? (lang === 'en' ? section.dangerEn : section.dangerRu).slice(0, 1)
              : (lang === 'en' ? section.dangerEn : section.dangerRu)
            ).map((item, idx) => (
              <div key={idx} style={{ fontSize:12, color:'var(--text2)', lineHeight:1.6 }}>✕ {item}</div>
            ))}
          </div>
        </section>
      ))}

      <section className="card" style={{ padding:16 }}>
        <h3 style={{ margin:'0 0 8px', fontSize:20 }}>🧪 {rl('Мини-тест', 'Mini test')}</h3>
        <p style={{ margin:'0 0 12px', color:'var(--text3)', fontSize:12, lineHeight:1.5 }}>
          {rl('Проверка, что мозг не просто красиво пролистал карточки.', 'A check that your brain did not merely scroll prettily through the cards.')}
        </p>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {TEST_QUESTIONS.map((q, qi) => (
            <div key={qi} style={{ padding:12, borderRadius:14, background:'var(--bg2)', border:'1px solid var(--border)' }}>
              <div style={{ fontWeight:700, fontSize:13, marginBottom:8 }}>{qi + 1}. {lang === 'en' ? q.qEn : q.qRu}</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {(lang === 'en' ? q.optionsEn : q.optionsRu).map((option, oi) => {
                  const chosen = answers[qi] === oi
                  const answered = answers[qi] !== undefined
                  const correct = q.answer === oi
                  return (
                    <button key={oi} type="button" onClick={() => setAnswers(prev => ({ ...prev, [qi]: oi }))} style={{
                      textAlign:'left', padding:'8px 10px', borderRadius:10, cursor:'pointer', fontSize:12,
                      border:`1px solid ${chosen ? (correct ? '#4ade80' : '#fb7185') : 'var(--border)'}`,
                      background: chosen ? (correct ? 'rgba(74,222,128,0.12)' : 'rgba(251,113,133,0.12)') : 'var(--bg)',
                      color: chosen ? (correct ? '#86efac' : '#fecdd3') : 'var(--text2)',
                    }}>
                      {answered && correct ? '✓ ' : ''}{option}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop:12, padding:12, borderRadius:14, background:'var(--accent-soft)', border:'1px solid var(--accent)33', color:'var(--accent)', fontWeight:800, fontSize:13 }}>
          {complete ? rl(`Результат: ${score}/${TEST_QUESTIONS.length}`, `Score: ${score}/${TEST_QUESTIONS.length}`) : rl(`Отвечено: ${Object.keys(answers).length}/${TEST_QUESTIONS.length}`, `Answered: ${Object.keys(answers).length}/${TEST_QUESTIONS.length}`)}
        </div>
      </section>

      <section className="card" style={{ padding:14 }}>
        <h3 style={{ margin:'0 0 8px', fontSize:18 }}>🔬 {rl('Источники', 'Sources')}</h3>
        <div style={{ display:'flex', flexDirection:'column', gap:7 }}>
          {SOURCES.map(src => (
            <a key={src.url} href={src.url} target="_blank" rel="noopener noreferrer" style={{ color:'var(--accent)', fontSize:12, textDecoration:'none' }}>
              🔗 {src.label}
            </a>
          ))}
        </div>
      </section>
    </div>
  )
}
