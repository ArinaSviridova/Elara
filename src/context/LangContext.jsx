import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { translations } from '../i18n/translations'

// Маппинг русских строк к ключам translations.js для полного перевода
const RU_TO_KEY = {
  "Сейчас: ": "ui_seychas",
  "прогноз": "ui_prognoz",
  "Обычные дни": "ui_obychnye_dni",
  "на основе": "ui_na_osnove",
  "цикл.": "ui_tsikl",
  "цикл": "ui_tsikl_1",
  "дн": "ui_dn",
  "Сегодня": "ui_segodnya",
  "Отметить": "ui_otmetit",
  "Удалить": "ui_udalit",
  "Нажми тип → первый день → последний день": "ui_nazhmi_tip_perv",
  "удаление": "ui_udalenie",
  "👆 Нажми на первый день": "ui_nazhmi_na_pervy",
  "Отмена": "ui_otmena",
  "Не удалось получить анализ. Попробуй позже.": "ui_ne_udalos_poluc",
  "Совет отправлен 🤍": "ui_sovet_otpravlen",
  "Дневник": "ui_dnevnik",
  "Дневник защищён паролем": "ui_dnevnik_zaschis",
  "Придумай пароль — только ты его знаешь": "ui_pridumay_parol_",
  "Пароль дневника": "ui_parol_dnevnika",
  "Неверный пароль": "ui_nevernyy_parol",
  "Открыть": "ui_otkryt",
  "Установить пароль": "ui_ustanovit_parol",
  "Карта дня": "ui_karta_dnya",
  "Читаю...": "ui_chitayu",
  "Получить поддержку и теги от AI": "ui_poluchit_podder",
  "AI предлагает теги — нажми чтобы добавить": "ui_ai_predlagaet_t",
  "Теги дня": "ui_tegi_dnya",
  "· идут партнёру вместо текста": "ui_idut_partnyoru_",
  "Выбрано:": "ui_vybrano",
  "очистить": "ui_ochistit",
  "Отправить совет партнёру": "ui_otpravit_sovet_",
  "Отправляю...": "ui_otpravlyayu",
  "Отправить": "ui_otpravit",
  "Добавь теги чтобы отправить": "ui_dobav_tegi_chto",
  "Сохранить": "ui_sohranit",
  "Группа с таким кодом не найдена": "ui_gruppa_s_takim_",
  "Это твоя собственная группа": "ui_eto_tvoya_sobst",
  "Ты уже в этой группе": "ui_ty_uzhe_v_etoy_",
  "Это твоя группа": "ui_eto_tvoya_grupp",
  "Уже в этой группе": "ui_uzhe_v_etoy_gru",
  "Код не найден — проверь правильность": "ui_kod_ne_nayden_p",
  "Уже добавлен": "ui_uzhe_dobavlen",
  "Назад": "ui_nazad",
  "Пригласить": "ui_priglasit",
  "Мой личный код": "ui_moy_lichnyy_kod",
  "Копировать": "ui_kopirovat",
  "Отправь этот код — человек введёт его и увидит тебя в своём круге": "ui_otprav_etot_kod",
  "Коды групп": "ui_kody_grupp",
  "Любой с этим кодом может присоединиться к группе": "ui_lyuboy_s_etim_k",
  "Создать новую группу": "ui_sozdat_novuyu_g",
  "Новая группа": "ui_novaya_gruppa",
  "Создай группу и поделись её кодом — все кто введут код окажутся в одной группе и смогут видеть общий календарь.": "ui_sozday_gruppu_i",
  "Название группы (например: Подруги, Пара)": "ui_nazvanie_gruppy",
  "Создать и получить код": "ui_sozdat_i_poluch",
  "Добавить по коду": "ui_dobavit_po_kodu",
  "Код (6 символов)": "ui_kod_6_simvolov",
  "Это может быть личный код или код группы — оба работают": "ui_eto_mozhet_byt_",
  "Кто это для тебя?": "ui_kto_eto_dlya_te",
  "Это кто?": "ui_eto_kto",
  "Группа подруг": "ui_gruppa_podrug",
  "Код от подруги/подруг — присоединяюсь к группе": "ui_kod_ot_podrugi_",
  "Цвет на календаре": "ui_tsvet_na_kalend",
  "Добавить": "ui_dobavit",
  "Код группы": "ui_kod_gruppy",
  "Участники": "ui_uchastniki",
  "Пока никого — поделись кодом!": "ui_poka_nikogo_pod",
  "Доступ": "ui_dostup",
  "Удалить группу": "ui_udalit_gruppu",
  "Приватность": "ui_privatnost",
  "На основе чего давать советы партнёру": "ui_na_osnove_chego",
  "Насколько точные советы получает партнёр": "ui_naskolko_tochny",
  "Итого": "ui_itogo",
  "Мой круг": "ui_moy_krug",
  "Синхронизация": "ui_sinhronizatsiya",
  "Поделиться кодом": "ui_podelitsya_kodo",
  "Группы": "ui_gruppy",
  "участн.": "ui_uchastn",
  "Участник": "ui_uchastnik",
  "Отдельные": "ui_otdelnye",
  "Цикл виден": "ui_tsikl_viden",
  "Цикл скрыт": "ui_tsikl_skryt",
  "Твой круг пока пуст": "ui_tvoy_krug_poka_",
  "Пригласи подруг или добавь партнёра": "ui_priglasi_podrug",
  "Настройки раздела": "ui_nastroyki_razde",
  "Выбери что хочешь отслеживать. Всё остаётся только твоим.": "ui_vyberi_chto_hoc",
  "Интимное": "ui_intimnoe",
  "Настройки": "ui_nastroyki",
  "Это пространство только твоё. Никто не увидит без твоего разрешения.": "ui_eto_prostranstv",
  "Уровень желания сегодня": "ui_uroven_zhelaniy",
  "Нет желания": "ui_net_zhelaniya",
  "Слабое": "ui_slaboe",
  "Среднее": "ui_srednee",
  "Высокое": "ui_vysokoe",
  "Очень высокое": "ui_ochen_vysokoe",
  "Мастурбация": "ui_masturbatsiya",
  "Тип": "ui_tip",
  "Секс": "ui_seks",
  "Тип (можно несколько)": "ui_tip_mozhno_nesk",
  "Партнёр": "ui_partnyor",
  "Контрацепция": "ui_kontratseptsiya",
  "Кто видит": "ui_kto_vidit",
  "Видит партнёр (только желание и тип)": "ui_vidit_partnyor_",
  "Видят подруги": "ui_vidyat_podrugi",
  "Тело": "ui_telo",
  "Месячные": "ui_mesyachnye",
  "Заболевания": "ui_zabolevaniya",
  "Здоровье": "ui_zdorove",
  "Таблетки": "ui_tabletki",
  "Физические данные": "ui_fizicheskie_dan",
  "Рост (см)": "ui_rost_sm",
  "Вес (кг)": "ui_ves_kg",
  "Дата рождения": "ui_data_rozhdeniya",
  "Возраст": "ui_vozrast",
  "лет": "ui_let",
  "Укажи как у тебя обычно протекают месячные — AI будет предупреждать если что-то выйдет за норму.": "ui_ukazhi_kak_u_te",
  "Обычная длина месячных (дней)": "ui_obychnaya_dlina",
  "дня": "ui_dnya",
  "дней": "ui_dney",
  "Используется для автозаполнения при постановке первого дня. Потом можно скорректировать вручную.": "ui_ispolzuetsya_dl",
  "Цвет": "ui_tsvet",
  "Консистенция": "ui_konsistentsiya",
  "Боль": "ui_bol",
  "Объём": "ui_obyom",
  "AI учитывает метод контрацепции при рекомендациях и анализе цикла.": "ui_ai_uchityvaet_m",
  "AI учитывает заболевания в советах и анализе. Информация хранится зашифрованно.": "ui_ai_uchityvaet_z",
  "Добавить своё заболевание...": "ui_dobavit_svoyo_z",
  "Не удалось получить рекомендацию": "ui_ne_udalos_poluc_1",
  "Не удалось": "ui_ne_udalos",
  "Время принять": "ui_vremya_prinyat",
  "Внеплановый": "ui_vneplanovyy",
  "Внеплановый приём": "ui_vneplanovyy_pri",
  "Другое (ввести вручную)": "ui_drugoe_vvesti_v",
  "Свой препарат": "ui_svoy_preparat",
  "Доза": "ui_doza",
  "Записать": "ui_zapisat",
  "Общий анализ": "ui_obschiy_analiz",
  "препаратов": "ui_preparatov",
  "Анализ...": "ui_analiz",
  "Редактировать": "ui_redaktirovat",
  "Новое лекарство": "ui_novoe_lekarstvo",
  "Название": "ui_nazvanie",
  "Анализирую препарат...": "ui_analiziruyu_pre",
  "AI-анализ препарата": "ui_ai_analiz_prepa",
  "Класс:": "ui_klass",
  "Назначение:": "ui_naznachenie",
  "Механизм:": "ui_mehanizm",
  "Рекомендация": "ui_rekomendatsiya",
  "Взаимодействия": "ui_vzaimodeystviya",
  "Доза (необязательно)": "ui_doza_neobyazate",
  "Дни приёма": "ui_dni_priyoma",
  "Каждый день": "ui_kazhdyy_den",
  "Выбрать дни": "ui_vybrat_dni",
  "Время приёма": "ui_vremya_priyoma",
  "Ещё": "ui_eschyo",
  "Лекарства не добавлены": "ui_lekarstva_ne_do",
  "Напомнить": "ui_napomnit",
  "Вид активности (можно несколько)": "ui_vid_aktivnosti_",
  "Интенсивность": "ui_intensivnost",
  "Длительность": "ui_dlitelnost",
  "мин": "ui_min",
  "Принял(а) сегодня": "ui_prinyal_a_segod",
  "Заметка": "ui_zametka",
  "Самочувствие после тренировки...": "ui_samochuvstvie_p",
  "Основано на:": "ui_osnovano_na",
  "Рекомендации": "ui_rekomendatsii",
  "Как ты сегодня?": "ui_kak_ty_segodnya",
  "Активность и спорт": "ui_aktivnost_i_spo",
  "Силовые тренировки": "ui_silovye_treniro",
  "Сила зависит от тестостерона и кортизола. Лучший результат — утром при пике гормонов.": "ui_sila_zavisit_ot",
  "Восстановление": "ui_vosstanovlenie",
  "Хронический стресс снижает тестостерон. Медитация и сон — часть тренировки.": "ui_hronicheskiy_st",
  "Кардио": "ui_kardio",
  "✦ Персональный совет": "ui_personalnyy_sov",
  "Гормоны сегодня?": "ui_gormony_segodny",
  "Зайди в Таблетки чтобы отметить приём.": "ui_zaydi_v_tabletk",
  "Открыть Sport & активность": "ui_otkryt_sport_ak",
  "Беременность": "ui_beremennost",
  "осталось": "ui_ostalos",
  "нед": "ui_ned",
  "неделя": "ui_nedelya",
  "Размер: ": "ui_razmer",
  "Плод": "ui_plod",
  "Скрининги": "ui_skriningi",
  "Витамины": "ui_vitaminy",
  "Показатели": "ui_pokazateli",
  "Давление": "ui_davlenie",
  "Шевелений в час": "ui_sheveleniy_v_ch",
  "Воды (мл)": "ui_vody_ml",
  "Симптомы": "ui_simptomy",
  "Эмоции": "ui_emotsii",
  "Заметки дня...": "ui_zametki_dnya",
  "✦ Совет на эту неделю": "ui_sovet_na_etu_ne",
  "Неделя": "ui_nedelya_1",
  "Первый триместр": "ui_pervyy_trimestr",
  "Закладываются все органы и системы. Самый важный период для правильного питания и отказа от вредных привычек.": "ui_zakladyvayutsya",
  "Второй триместр": "ui_vtoroy_trimestr",
  "Малыш активно растёт. Обычно самый комфортный период — тошнота уходит, живот ещё не мешает.": "ui_malysh_aktivno_",
  "Третий триместр": "ui_tretiy_trimestr",
  "Малыш набирает вес и готовится к рождению. Пора собирать сумку в роддом!": "ui_malysh_nabiraet",
  "Приблизительный график — уточни у своего врача.": "ui_priblizitelnyy_",
  "скоро": "ui_skoro",
  "Фолиевая кислота": "ui_folievaya_kislo",
  "400-800 мкг/день. Особенно важна в 1 триместре для нервной трубки.": "ui_400_800_mkg_den",
  "Железо": "ui_zhelezo",
  "60 мг/день при анемии. Лучше пить с витамином С, не с молоком.": "ui_60_mg_den_pri_a",
  "Витамин D": "ui_vitamin_d",
  "Принято сегодня": "ui_prinyato_segodn",
  "Все витамины и дозировки — только по согласованию с врачом. Информация носит ознакомительный характер.": "ui_vse_vitaminy_i_",
  "Мои витамины": "ui_moi_vitaminy",
  "Название витамина...": "ui_nazvanie_vitami",
  "Результат": "ui_rezultat",
  "Баллов": "ui_ballov",
  "Добавлено в профиль:": "ui_dobavleno_v_pro",
  "AI добавил маркер в профиль здоровья. Вы можете отредактировать его вручную.": "ui_ai_dobavil_mark",
  "Результаты носят информационный характер. Не являются диагнозом. Обсудите с врачом.": "ui_rezultaty_nosya",
  "научный источник": "ui_nauchnyy_istoch",
  "К тестам": "ui_k_testam",
  "Готово": "ui_gotovo",
  "Клинические тесты": "ui_klinicheskie_te",
  "вопр.": "ui_vopr",
  "Пройти": "ui_proyti",
  "Тесты не заменяют диагностику врача. Это скрининговые инструменты первичной оценки.": "ui_testy_ne_zameny",
  "Менструация": "ui_menstruatsiya",
  "Режим заботы": "ui_rezhim_zaboty",
  "Режим отдыха": "ui_rezhim_otdyha",
  "Фолликулярная": "ui_follikulyarnaya",
  "Режим: Архитектор": "ui_rezhim_arhitekt",
  "Овуляция": "ui_ovulyatsiya",
  "Режим: Дипломат": "ui_rezhim_diplomat",
  "Лютеиновая": "ui_lyuteinovaya",
  "Режим: Аудитор": "ui_rezhim_auditor",
  "Высокая энергия": "ui_vysokaya_energi",
  "Режим: Действие": "ui_rezhim_deystvie",
  "Средняя": "ui_srednyaya",
  "Режим: Работа": "ui_rezhim_rabota",
  "Нужен отдых": "ui_nuzhen_otdyh",
  "Режим: Восстановление": "ui_rezhim_vosstano",
  "Стресс": "ui_stress",
  "Режим: Поддержка": "ui_rezhim_podderzh",
  "У большинства сейчас пик энергии — отличный день для активных планов!": "ui_u_bolshinstva_s",
  "Спорт/тренировка": "ui_sport_trenirovk",
  "Вечеринка": "ui_vecherinka",
  "Поход": "ui_pohod",
  "Новый проект": "ui_novyy_proekt",
  "У большинства сейчас фаза отдыха — выберите уютный формат.": "ui_u_bolshinstva_s_1",
  "Кино дома": "ui_kino_doma",
  "Ужин": "ui_uzhin",
  "Спа": "ui_spa",
  "Тихая прогулка": "ui_tihaya_progulka",
  "Разные состояния — выберите что-то для всех.": "ui_raznye_sostoyan",
  "Кафе": "ui_kafe",
  "Кино": "ui_kino",
  "Настолки": "ui_nastolki",
  "Прогулка": "ui_progulka",
  "Круг": "ui_krug",
  "Моё состояние сегодня": "ui_moyo_sostoyanie",
  "⚡ На подъёме": "ui_na_podyome",
  "🔥 Рабочий режим": "ui_rabochiy_rezhim",
  "😴 Нужен отдых": "ui_nuzhen_otdyh_1",
  "💭 Много стресса": "ui_mnogo_stressa",
  "AI учитывает это в рекомендациях": "ui_ai_uchityvaet_e",
  "Отметь настроение на главном экране →": "ui_otmet_nastroeni",
  "Добавь людей в Круг чтобы видеть синхронизацию": "ui_dobav_lyudey_v_",
  "Пользователь": "ui_polzovatel",
  "Статус не указан": "ui_status_ne_ukaza",
  "Идеи для сегодня:": "ui_idei_dlya_segod",
  "Что означают состояния:": "ui_chto_oznachayut",
  "Пик энергии → Активные планы, спорт, вечеринки": "ui_pik_energii_akt",
  "Нужен отдых → Уютный формат, кино, тихий ужин": "ui_nuzhen_otdyh_uy",
  "Период/ПМС → Максимальная забота и понимание": "ui_period_pms_maks",
  "Как работает Elara": "ui_kak_rabotaet_el",
  "Важно": "ui_vazhno",
  "Шевеления": "ui_sheveleniya",
  "Приём врача": "ui_priyom_vracha",
  "УЗИ": "ui_uzi",
  "сегодня": "ui_segodnya_1",
  "Отмечено в этот день:": "ui_otmecheno_v_eto",
  "Один день": "ui_odin_den",
  "Добавить в этот день:": "ui_dobavit_v_etot_",
  "Интим": "ui_intim",
  "🧠 Мозг": "ui_mozg",
  "🏃 Спорт": "ui_sport",
  "🥗 Питание": "ui_pitanie",
  "⚠️ Окно риска гормональной мигрени": "ui_okno_riska_gorm",
  "Возможна мигрень через 2–3 дня": "ui_vozmozhna_migre",
  "Физиологическое падение эстрогена перед месячными — типичный триггер. Проверь аптечку, пей больше воды.": "ui_fiziologichesko",
  "Эстроген начинает снижаться. Если у тебя бывают мигрени — хорошее время для профилактики.": "ui_estrogen_nachin",
  "На основе": "ui_na_osnove_1",
  "Возможен скрытый дефицит железа": "ui_vozmozhen_skryt",
  "Рекомендуем обсудить с врачом анализ на ферритин (точнее, чем просто гемоглобин).": "ui_rekomenduem_obs",
  "Понятно, не показывать": "ui_ponyatno_ne_pok"
}
import { supabase } from '../lib/supabase'

const LangContext = createContext(null)

// Только русский — родной язык, всё остальное через AI
const NATIVE_LANGS = ['ru']

const TRANS_VERSION = 422 // инкрементировать при добавлении новых ключей

function getCached(lang) {
  try {
    const raw = localStorage.getItem(`elara_t_${lang}`)
    if (!raw) return null
    const { data, ts, v } = JSON.parse(raw)
    // Инвалидируем если старая версия или > 7 дней
    if (v !== TRANS_VERSION || Date.now() - ts > 7 * 86400000) return null
    return data
  } catch { return null }
}

function setCache(lang, data) {
  try { localStorage.setItem(`elara_t_${lang}`, JSON.stringify({ data, ts: Date.now(), v: TRANS_VERSION })) } catch {}
}

// Все строки из RU для перевода
function getRuStrings() {
  const ru = translations['ru']
  const flat = {}
  function walk(obj, prefix = '') {
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}.${k}` : k
      if (typeof v === 'string') {
        flat[key] = v
      } else if (Array.isArray(v)) {
        // Массивы (months, days) — сериализуем как JSON строку
        flat[key] = JSON.stringify(v)
      } else if (v && typeof v === 'object') {
        walk(v, key)
      }
    }
  }
  walk(ru)
  return flat
}

// Применяем переведённые строки обратно в объект
function applyTranslations(base, translated) {
  const result = JSON.parse(JSON.stringify(base))
  for (const [dotKey, val] of Object.entries(translated)) {
    const parts = dotKey.split('.')
    let obj = result
    for (let i = 0; i < parts.length - 1; i++) {
      if (!obj[parts[i]]) obj[parts[i]] = {}
      obj = obj[parts[i]]
    }
    // Если значение — JSON массив, десериализуем
    try {
      const parsed = JSON.parse(val)
      obj[parts[parts.length - 1]] = Array.isArray(parsed) ? parsed : val
    } catch {
      obj[parts[parts.length - 1]] = val
    }
  }
  return result
}

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('lang') || 'ru')
  const [t, setT] = useState(() => translations['ru'])
  const [translating, setTranslating] = useState(false)

  const applyLang = useCallback(async (l) => {
    setLangState(l)
    localStorage.setItem('lang', l)

    if (NATIVE_LANGS.includes(l)) {
      setT(translations['ru'])
      return
    }

    // Проверяем кеш
    const cached = getCached(l)
    if (cached) {
      setT(applyTranslations(translations['ru'], cached))
      return
    }

    // Запрашиваем AI-перевод
    setTranslating(true)
    try {
      const flatStrings = getRuStrings()
      
      // Переводим батчами по 60 строк для надёжности
      const entries = Object.entries(flatStrings)
      const BATCH = 60
      const allTranslated = {}
      
      for (let i = 0; i < entries.length; i += BATCH) {
        const batch = Object.fromEntries(entries.slice(i, i + BATCH))
        try {
          const { data } = await supabase.functions.invoke('ai-advisor', {
            body: { userId: 'system', requestType: 'translate_ui', targetLang: l, strings: batch }
          })
          if (data?.translated) Object.assign(allTranslated, data.translated)
        } catch (batchErr) {
          console.warn('Translation batch failed, skipping:', batchErr)
          // Оставляем русские строки для этого батча
          Object.assign(allTranslated, batch)
        }
      }

      setCache(l, allTranslated)
      setT(applyTranslations(translations['ru'], allTranslated))
    } catch (e) {
      console.error('Translation failed:', e)
      setT(translations['ru']) // Fallback to RU
    }
    setTranslating(false)
  }, [])

  // При старте применяем сохранённый язык
  useEffect(() => {
    if (lang !== 'ru') applyLang(lang)
  }, [])

  const setLang = (l) => applyLang(l)

  return (
    <LangContext.Provider value={{ lang, setLang, t, translating }}>
      {translating && (
        <div style={{ position:'fixed', bottom:80, left:'50%', transform:'translateX(-50%)', zIndex:1000, background:'var(--accent)', color:'#fff', fontSize:12, padding:'6px 14px', borderRadius:20, pointerEvents:'none' }}>
          Переводим... ✦
        </div>
      )}
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}

// Умная rl() - для всех языков ищет перевод в t, fallback на en
export function useRl() {
  const { lang, t } = useContext(LangContext)
  return (ru, en) => {
    if (lang === 'ru') return ru
    if (lang === 'en') return en
    if (!t) return en
    // 1. Прямой поиск в t по RU_TO_KEY маппингу
    const key = RU_TO_KEY[ru]
    if (key && t[key] && t[key] !== ru) return t[key]
    // 2. Попробуем найти напрямую в t (вдруг ключ совпадает)
    if (t[ru] && t[ru] !== ru) return t[ru]
    // 3. Fallback - возвращаем английский вместо русского для нерусских языков
    return en
  }
}

// Хук для перевода пользовательского текста (имена, заметки и пр.)
export async function translateUserText(text, targetLang, userId) {
  if (!text || targetLang === 'ru' || !targetLang) return text
  try {
    const { data } = await import('../lib/supabase').then(m => 
      m.supabase.functions.invoke('ai-advisor', {
        body: { userId: userId || 'anon', requestType: 'translate_text', text, targetLang }
      })
    )
    return data?.translated || text
  } catch {
    return text
  }
}
