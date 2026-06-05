import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const body = await req.json()
    const { userId, requestType, targetUserId, targetUserIds, groupId, language, diaryTags, contextOverride } = body
    const lang = language || 'ru'
    const isRu = lang === 'ru' || lang === 'be' // белорусский использует русские промпты

    async function getContext(uid: string) {
      // Если фронт передал контекст напрямую — используем его (быстрее и персональнее)
      if (contextOverride && uid === (targetUserId || userId)) {
        const { data: profile } = await supabase
          .from('profiles').select('gender, body_mode, pregnancy_week, personality_tags, preferences').eq('id', uid).single()
        return {
          profile,
          cycleEntry: contextOverride.cyclePhase ? { type: contextOverride.cyclePhase } : null,
          moodEntry: contextOverride.mood ? { mood: contextOverride.mood, tags: contextOverride.diaryTags || [] } : null,
          diaryEntry: contextOverride.diaryTags?.length ? { tags: contextOverride.diaryTags } : null,
        }
      }
      const today = new Date().toISOString().slice(0, 10)
      const [{ data: profile }, { data: cycleEntry }, { data: moodEntry }, { data: diaryEntry }] = await Promise.all([
        supabase.from('profiles').select('gender, body_mode, pregnancy_week, personality_tags, preferences, orientation').eq('id', uid).single(),
        supabase.from('cycle_entries').select('type').eq('user_id', uid).eq('date', today).limit(1).maybeSingle(),
        supabase.from('mood_entries').select('mood, tags').eq('user_id', uid).eq('date', today).maybeSingle(),
        supabase.from('diary_entries').select('tags').eq('user_id', uid).eq('date', today).maybeSingle(),
      ])
      return { profile, cycleEntry, moodEntry, diaryEntry }
    }

    async function callOpenAI(system: string, user: string, temperature = 0.9) {
      const apiKey = Deno.env.get('OPENAI_API_KEY')
      if (!apiKey) {
        console.error('OPENAI_API_KEY is not set!')
        return isRu ? 'Ключ API не настроен' : 'API key not configured'
      }
      console.log('Calling OpenAI, model: gpt-4.1-mini, key prefix:', apiKey.slice(0,10))
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          max_tokens: 180,
          temperature,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user }
          ]
        })
      })
      const data = await res.json()
      console.log('OpenAI response status:', res.status, 'data:', JSON.stringify(data).slice(0, 200))
      if (!res.ok) {
        console.error('OpenAI error:', JSON.stringify(data))
        return isRu ? `Ошибка OpenAI: ${data?.error?.message || res.status}` : `OpenAI error: ${data?.error?.message || res.status}`
      }
      return data.choices?.[0]?.message?.content?.trim() || (isRu ? 'Позаботься о себе 🤍' : 'Take care of yourself 🤍')
    }

    // ── DIARY FULL ANALYSIS (читает текст, даёт поддержку + теги) ────
    if (requestType === 'diary_full_analysis') {
      const ctx = await getContext(userId)
      const cyclePart = ctx.cycleEntry?.type ? (isRu ? `Фаза цикла: ${ctx.cycleEntry.type}.` : `Cycle phase: ${ctx.cycleEntry.type}.`) : ''
      const existingTags = (diaryTags || []).join(', ')
      const diaryTextPart = body.diaryText ? (isRu ? `Запись в дневнике: "${body.diaryText}"` : `Diary entry: "${body.diaryText}"`) : ''
      const availableTags = (body.allAvailableTags || []).join(', ')

      const system = isRu
        ? `Ты тёплый AI-компаньон в приложении Elara. Читаешь личный дневник и отвечаешь СТРОГО в формате JSON:
{
  "advice": "2-3 тёплых предложения поддержки, как близкая подруга. Реагируй на эмоциональный тон, не пересказывай написанное. Без советов как изменить жизнь.",
  "suggestedTags": ["тег1", "тег2", "тег3", "тег4", "тег5"]
}
Для suggestedTags выбери 4-6 тегов из списка доступных которые лучше всего отражают настроение и события из текста. Выбирай ТОЛЬКО из предоставленного списка. Не добавляй теги уже выбранные пользователем.`
        : `You are a warm AI companion in Elara. You read a personal diary entry and respond STRICTLY in JSON format:
{
  "advice": "2-3 warm supportive sentences, like a close friend. React to the emotional tone, don't summarize. No life advice.",
  "suggestedTags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}
For suggestedTags pick 4-6 tags from the available list that best reflect the mood and events in the text. Choose ONLY from the provided list. Don't include already selected tags.`

      const prompt = [
        diaryTextPart,
        existingTags ? (isRu ? `Уже выбранные теги: ${existingTags}.` : `Already selected tags: ${existingTags}.`) : '',
        cyclePart,
        isRu ? `Доступные теги: ${availableTags}` : `Available tags: ${availableTags}`,
      ].filter(Boolean).join('\n')

      // Вызов OpenAI с просьбой вернуть JSON
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-mini',
          max_tokens: 400,
          temperature: 0.8,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: prompt }
          ]
        })
      })
      const aiData = await res.json()
      const raw = aiData.choices?.[0]?.message?.content?.trim() || '{}'
      let parsed: { advice?: string; suggestedTags?: string[] } = {}
      try { parsed = JSON.parse(raw) } catch { parsed = { advice: raw } }

      return new Response(JSON.stringify({
        advice: parsed.advice || (isRu ? 'Ты молодец 🤍' : 'You\'re doing great 🤍'),
        suggestedTags: parsed.suggestedTags || [],
      }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    // ── PARTNER DIARY PUSH (совет партнёру) ──────────────────
    if (requestType === 'partner_diary_push') {
      const tags = (diaryTags || []).join(', ')
      const ctx = await getContext(userId)
      const cyclePart = ctx.cycleEntry?.type ? (isRu ? `Фаза цикла: ${ctx.cycleEntry.type}.` : `Cycle phase: ${ctx.cycleEntry.type}.`) : ''
      const pregnancyPart = ctx.profile?.body_mode === 'pregnant' && ctx.profile?.pregnancy_week
        ? (isRu ? `Беременность ${ctx.profile.pregnancy_week} нед.` : `Pregnancy week ${ctx.profile.pregnancy_week}.`)
        : ''

      const system = isRu
        ? `Ты советник в приложении Elara. Даёшь партнёру/подруге короткий конкретный совет как поддержать близкого человека СЕГОДНЯ. Никогда не раскрываешь что человек писал или думал. Только анонимный контекст (фаза цикла, эмоциональный фон). 1-2 предложения. Тепло, конкретно, без пафоса.`
        : `You are an advisor in the Elara app. Give a partner/friend one short, concrete tip on how to support their loved one TODAY. Never reveal what the person wrote or thought. Only anonymous context. 1-2 sentences. Warm, specific, no moralizing.`

      const prompt = isRu
        ? `Эмоциональный фон близкого человека сегодня: ${tags}. ${cyclePart} ${pregnancyPart} Как лучше поддержать этого человека сегодня? Без упоминания деталей.`
        : `Partner's emotional context today: ${tags}. ${cyclePart} ${pregnancyPart} How to best support them today? No details.`

      const advice = await callOpenAI(system, prompt)

      // Отправляем push каждому получателю
      const recipientIds = targetUserIds || []
      for (const recipientId of recipientIds) {
        const { data: subs } = await supabase
          .from('push_subscriptions')
          .select('*')
          .eq('user_id', recipientId)

        for (const sub of (subs || [])) {
          try {
            await fetch('https://fcm.googleapis.com/fcm/send', {
              method: 'POST',
              headers: {
                'Authorization': `key=${Deno.env.get('FCM_KEY') || ''}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                to: sub.endpoint,
                notification: {
                  title: 'Elara 🤍',
                  body: advice,
                }
              })
            })
          } catch (e) { console.error('Push error:', e) }
        }
      }

      return new Response(JSON.stringify({ advice, sent: recipientIds.length }), {
        headers: { ...cors, 'Content-Type': 'application/json' }
      })
    }

    // ── MEDICATION TIP ────────────────────────────────────────
    if (requestType === 'medication_tip') {
      const medName = body.medicationName || ''
      const dosage = body.dosage || ''
      const intakeTimes = (body.intakeTimes || []).join(', ')
      const currentMeds = (body.currentMedications || []).join(', ')

      const systemRu = `Ты фармацевтический ассистент в Elara. Отвечай СТРОГО в JSON:
{"advice": "2-3 предложения: оптимальное время приёма относительно уже указанного времени, с едой или натощак, важные нюансы", "conflicts": "если есть конфликты с другими препаратами — опиши кратко, иначе пустая строка"}.
Учитывай указанные пользователем времена приёма. Всегда добавляй: «⚠️ Уточни у врача». JSON только.`

      const systemEn = `You are a pharmacy assistant in Elara. Reply STRICTLY in JSON:
{"advice": "2-3 sentences: optimal timing relative to the specified intake time, with/without food, key notes", "conflicts": "drug interactions if any, otherwise empty string"}.
Consider the user's specified intake times. Always add: "⚠️ Confirm with doctor". JSON only.`

      const promptRu = `Препарат: ${medName}${dosage ? `, доза: ${dosage}` : ''}${intakeTimes ? `, время приёма: ${intakeTimes}` : ''}${currentMeds ? `. Также принимает: ${currentMeds}` : ''}. Дай рекомендацию.`
      const promptEn = `Medication: ${medName}${dosage ? `, dosage: ${dosage}` : ''}${intakeTimes ? `, intake time: ${intakeTimes}` : ''}${currentMeds ? `. Also taking: ${currentMeds}` : ''}. Give recommendation.`

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4.1-mini', max_tokens: 300, temperature: 0.7,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: isRu ? systemRu : systemEn },
            { role: 'user', content: isRu ? promptRu : promptEn }
          ]
        })
      })
      const d = await res.json()
      const raw = d.choices?.[0]?.message?.content?.trim() || '{}'
      let parsed: any = {}
      try { parsed = JSON.parse(raw) } catch { parsed = { advice: raw } }

      return new Response(JSON.stringify({
        advice: parsed.advice || (isRu ? 'Уточни у врача' : 'Consult your doctor'),
        conflicts: parsed.conflicts || '',
      }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    // ── ALL MEDS ANALYSIS ────────────────────────────────────
    if (requestType === 'all_meds_analysis') {
      const meds = (body.medications || []) as Array<{name: string, dosage: string, times: string[]}>
      if (!meds.length) {
        return new Response(JSON.stringify({ advice: isRu ? 'Добавь лекарства чтобы получить анализ' : 'Add medications to get analysis' }), { headers: { ...cors, 'Content-Type': 'application/json' } })
      }
      const medList = meds.map(m => `${m.name}${m.dosage ? ' ' + m.dosage : ''} (${(m.times||[]).join(', ')})`).join('; ')

      const system = isRu
        ? `Ты фармацевтический ассистент. Анализируй список лекарств и давай КРАТКИЙ общий совет: есть ли конфликты между препаратами, оптимальное распределение по времени суток, на что обратить внимание при совместном приёме. 3-4 предложения. Всегда добавляй: «⚠️ Обязательно уточни у врача». Не ставь диагнозы.`
        : `You are a pharmacy assistant. Analyze the medication list and give a BRIEF overall tip: any drug interactions, optimal timing distribution, what to watch for when taking together. 3-4 sentences. Always add: "⚠️ Always confirm with your doctor". No diagnoses.`

      const prompt = isRu
        ? `Список препаратов: ${medList}. Дай общий анализ схемы приёма.`
        : `Medications: ${medList}. Give an overall analysis of the regimen.`

      const advice = await callOpenAI(system, prompt, 0.7)
      return new Response(JSON.stringify({ advice }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }
    // ── SELF ADVICE ──────────────────────────────────────────
    // База исследований которые AI учитывает при советах
    const RESEARCH_CONTEXT = `
Ключевые исследования заложены в алгоритм:
- Фазы цикла: PubMed 22295606 (физиология), PMC10905339 (алгоритмы FemTech)
- Гормональная мигрень: PMC10512516 (падение эстрогена — триггер), PMC3620011 (триптаны профилактика)
- НПВС блокируют овуляцию: PubMed 25883839 (диклофенак 93%, напроксен 75%)
- СДВГ и цикл: PMC10173679 (лютеиновая фаза снижает дофамин — симптомы хуже)
- Анемия при обильных: PubMed 37538011 (>80 мл за цикл → ферритин)
- Сон и тестостерон: PMC3522336 (5ч сна = -15% T за неделю)
- Спорт и психика: PMC1470658 (йога снижает кортизол), PMC6939957 (кортизол и нагрузки)
- ГАТ и психика: PMC10444622 (эстроген снижает тревогу), PMC12962056 (тестостерон и когниция)
- Экстренная контрацепция: PubMed 16483981 (сдвиг цикла ±7 дней)
- Эндометриоз диагностика: PubMed 32446709 (7-10 лет задержка диагноза)
- PHQ-9 депрессия: PubMed 11556941 | GAD-7 тревога: PubMed 16717171
- ASRS СДВГ: PubMed 15841682 | PSST ПМС/ПМДР: PubMed 12423550
- Big Five личность: PMC6300285 | PSQI сон: PubMed 2748771
`
    if (requestType === 'self_advice') {
      const ctx = await getContext(targetUserId || userId)
      const cyclePart = ctx.cycleEntry?.type ? (isRu ? `Фаза цикла: ${ctx.cycleEntry.type}.` : `Cycle phase: ${ctx.cycleEntry.type}.`) : ''
      const moodPart = ctx.moodEntry?.mood ? (isRu ? `Настроение: ${ctx.moodEntry.mood}.` : `Mood: ${ctx.moodEntry.mood}.`) : ''
      const tagsPart = (ctx.diaryEntry?.tags || ctx.moodEntry?.tags || []).length > 0
        ? (isRu ? `Теги дня: ${(ctx.diaryEntry?.tags || ctx.moodEntry?.tags || []).join(', ')}.` : `Day tags: ${(ctx.diaryEntry?.tags || ctx.moodEntry?.tags || []).join(', ')}.`)
        : ''
      const pregnancyPart = ctx.profile?.body_mode === 'pregnant'
        ? (isRu ? `Беременность ${ctx.profile.pregnancy_week || '?'} нед.` : `Pregnancy week ${ctx.profile.pregnancy_week || '?'}.`) : ''
      const bodyPart = ctx.profile?.body_mode && ctx.profile.body_mode !== 'has_period'
        ? (isRu ? `Режим тела: ${ctx.profile.body_mode}.` : `Body mode: ${ctx.profile.body_mode}.`) : ''
      const orientationPart = ctx.profile?.orientation && ctx.profile.orientation !== 'prefer_not'
        ? (isRu ? `Ориентация: ${ctx.profile.orientation}.` : `Orientation: ${ctx.profile.orientation}.`) : ''
      const genderPart = (() => {
        const g = ctx.profile?.gender || contextOverride?.gender || ''
        const addr = ctx.profile?.address_style || contextOverride?.addressStyle || 'auto'
        const pronouns = ctx.profile?.pronouns || contextOverride?.pronouns || ''
        if (!g || g === 'prefer_not') return ''
        // Строим явную инструкцию по обращению
        let addrInstruction = ''
        if (addr === 'male' || g === 'cis_man' || g === 'trans_man' || g === 'male') {
          addrInstruction = isRu ? 'Обращайся к пользователю в мужском роде (он/его/ему). НЕ используй женский род.' : 'Address the user as male (he/him). Do NOT use female pronouns.'
        } else if (addr === 'neutral' || g === 'nonbinary' || g === 'genderfluid' || g === 'agender') {
          addrInstruction = isRu ? 'Обращайся к пользователю нейтрально (они/их) или избегай родовых окончаний.' : 'Address the user in neutral/they/them. Avoid gendered language.'
        } else if (addr === 'female' || g === 'cis_woman' || g === 'trans_woman' || g === 'female') {
          addrInstruction = isRu ? 'Обращайся к пользователю в женском роде (она/её).' : 'Address the user as female (she/her).'
        }
        if (pronouns) addrInstruction += isRu ? ` Местоимения: ${pronouns}.` : ` Pronouns: ${pronouns}.`
        return addrInstruction
      })()
      const personalityPart = (ctx.profile?.personality_tags || []).length > 0
        ? (isRu ? `Характер: ${ctx.profile.personality_tags.join(', ')}.` : `Personality: ${ctx.profile.personality_tags.join(', ')}.`) : ''
      const carePart = (ctx.profile?.preferences?.care_prefs || contextOverride?.carePrefs || []).length > 0
        ? (isRu ? `Предпочтения самоухода: ${(ctx.profile?.preferences?.care_prefs || contextOverride?.carePrefs || []).join(', ')}.` : `Self-care prefs: ${(ctx.profile?.preferences?.care_prefs || contextOverride?.carePrefs || []).join(', ')}.`) : ''

      const randomSeed = Math.floor(Math.random() * 9999)
      const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)

      const system = isRu
        ? `Ты мудрый эмпатичный AI-компаньон в Elara. Seed: ${randomSeed}, день: ${dayOfYear}.

ПРИНЦИПЫ:
- Поддерживай человека, но НЕ занимай его сторону слепо
- Если жалуется на кого-то — сначала признай чувства, потом мягко предложи взгляд с другой стороны
- Никогда не осуждай других по одностороннему рассказу
- Помогай видеть ситуацию объёмно — отношения это всегда два человека
- Предлагай конкретные действия из её личных предпочтений
- Каждый совет уникален — НИКОГДА не повторяй предыдущие

2 предложения. Тепло и честно.`
        : `You are a wise empathetic AI companion in Elara. Seed: ${randomSeed}, day: ${dayOfYear}.

PRINCIPLES:
- Support the person but don't blindly take their side
- If they complain about someone — validate feelings first, then gently offer the other perspective
- Never judge others based on a one-sided account
- Help see situations from multiple angles — relationships always involve two people
- Suggest actions from their known personal preferences
- Every piece of advice is unique — NEVER repeat previous ones

2 sentences. Warm and honest.`

      const contextParts = [cyclePart, moodPart, tagsPart, bodyPart, orientationPart, genderPart, personalityPart, carePart, pregnancyPart].filter(Boolean)
      const prompt = contextParts.length > 0
        ? contextParts.join(' ')
        : (isRu ? `День ${dayOfYear}, seed ${randomSeed}. Дай свежий уникальный совет.` : `Day ${dayOfYear}, seed ${randomSeed}. Give a fresh unique tip.`)

      const advice = await callOpenAI(system, prompt, 1.0)
      return new Response(JSON.stringify({ advice }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    // ── PARTNER ADVICE ────────────────────────────────────────
    if (requestType === 'partner_advice') {
      const ctx = await getContext(targetUserId)
      const { data: membership } = await supabase
        .from('group_members').select('relation_type').eq('user_id', userId).limit(1).maybeSingle()
      const rel = membership?.relation_type || 'friend'
      const cyclePart = ctx.cycleEntry?.type ? (isRu ? `Фаза: ${ctx.cycleEntry.type}.` : `Phase: ${ctx.cycleEntry.type}.`) : ''
      const moodPart = ctx.moodEntry?.mood ? (isRu ? `Настроение: ${ctx.moodEntry.mood}.` : `Mood: ${ctx.moodEntry.mood}.`) : ''
      const tagsPart = (ctx.diaryEntry?.tags || []).length > 0
        ? (isRu ? `Теги: ${ctx.diaryEntry.tags.join(', ')}.` : `Tags: ${ctx.diaryEntry.tags.join(', ')}.`)
        : ''

      const system = isRu
        ? `Ты советник в Elara. Даёшь партнёру конкретный совет как поддержать близкого сегодня. 2 предложения. Никаких деталей дневника.`
        : `You advise partners in Elara. Give a concrete tip on how to support their loved one today. 2 sentences. No diary details.`
      const prompt = isRu
        ? `Тип связи: ${rel}. ${cyclePart} ${moodPart} ${tagsPart} Как поддержать?`
        : `Relation: ${rel}. ${cyclePart} ${moodPart} ${tagsPart} How to support?`

      const advice = await callOpenAI(system, prompt)
      return new Response(JSON.stringify({ advice }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    // ── GROUP ADVICE ──────────────────────────────────────────
    if (requestType === 'group_advice') {
      const { data: members } = await supabase
        .from('group_members').select('user_id').eq('group_id', groupId).eq('can_receive_ai_advice', true)
      if (!members?.length) {
        return new Response(JSON.stringify({ advice: isRu ? 'Нет данных для группового совета' : 'No data for group advice' }), {
          headers: { ...cors, 'Content-Type': 'application/json' }
        })
      }
      const today = new Date().toISOString().slice(0, 10)
      const memberIds = members.map(m => m.user_id)
      const [{ data: moods }, { data: cycles }] = await Promise.all([
        supabase.from('mood_entries').select('user_id, mood').in('user_id', memberIds).eq('date', today),
        supabase.from('cycle_entries').select('user_id, type').in('user_id', memberIds).eq('date', today),
      ])
      const summary = memberIds.map(id => {
        const mood = moods?.find(m => m.user_id === id)?.mood
        const phase = cycles?.find(c => c.user_id === id)?.type
        return `mood:${mood||'unknown'} phase:${phase||'none'}`
      }).join('; ')
      const system = isRu
        ? `Ты советник в Elara. Даёшь группе людей короткий совет как поддержать друг друга сегодня. 2-3 предложения.`
        : `You advise groups in Elara. Give a short tip on how to support each other today. 2-3 sentences.`
      const advice = await callOpenAI(system, isRu
        ? `Группа сегодня: ${summary}. Совет группе?`
        : `Group today: ${summary}. Advice for the group?`)
      return new Response(JSON.stringify({ advice }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    // ── PREGNANCY TIP ─────────────────────────────────────────
    if (requestType === 'pregnancy_tip') {
      const ctx = await getContext(userId)
      const week = ctx.profile?.pregnancy_week || '?'
      const moodPart = ctx.moodEntry?.mood ? (isRu ? `Настроение: ${ctx.moodEntry.mood}.` : `Mood: ${ctx.moodEntry.mood}.`) : ''
      const system = isRu
        ? `Ты тёплый помощник для беременных в Elara. Даёшь совет на текущей неделе — тепло и поддерживающе. 2-3 предложения. Всегда добавляй что за медицинскими вопросами к врачу.`
        : `You are a warm pregnancy companion in Elara. Give a tip for the current week — warmly and supportively. 2-3 sentences. Always add that medical questions go to a doctor.`
      const advice = await callOpenAI(system, isRu
        ? `Беременность ${week} нед. ${moodPart} Совет на эту неделю?`
        : `Pregnancy week ${week}. ${moodPart} Tip for this week?`)
      return new Response(JSON.stringify({ advice }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    // ── ACTIVITY INVITE ───────────────────────────────────────
    // ── GENERATE AVATAR (DALL-E) ─────────────────────────────
    // ── VALIDATE CONDITION (AI-проверка пользовательского ввода) ──
    if (requestType === 'validate_condition') {
      const input = body.input || ''
      const isRu = (body.language || 'ru') !== 'en'
      const sys = `You are a medical terminology validator. The user typed something in a health app.
Determine if it's a real medical condition/disease/syndrome.
Return JSON: {"isCondition": true/false, "normalized": "правильное название если заболевание", "message": "короткое объяснение если не заболевание (рус)", "variants": ["возможные варианты заболеваний если похоже"]}`
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-4.1-mini', max_tokens: 200, temperature: 0.2, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: sys }, { role: 'user', content: `Input: "${input}"` }] })
      })
      const d = await r.json()
      let parsed: any = { isCondition: true, normalized: input }
      try { parsed = JSON.parse(d.choices?.[0]?.message?.content?.trim() || '{}') } catch {}
      return new Response(JSON.stringify(parsed), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    if (requestType === 'describe_condition') {
      const conditionName = String(body.condition || body.input || '').trim()
      const targetLang = body.language || 'ru'
      const isRu = targetLang !== 'en'
      const sys = isRu
        ? 'Ты медицинский справочник в приложении для здоровья Elara. Дай краткое (3-4 предложения) справочное описание медицинского состояния на русском языке. Elara не ставит диагнозов. Заверши фразой: "Обсуди это состояние с врачом."'
        : 'You are a medical reference in Elara health app. Give a brief (3-4 sentences) reference description of the medical condition in English. Elara does not diagnose. End with: "Discuss this with your doctor."'
      const text = await callOpenAI(sys, conditionName, 0.3)
      return new Response(JSON.stringify({ description: text }), {
        headers: { ...cors, 'Content-Type': 'application/json' }
      })
    }

    if (requestType === 'generate_nutrition') {
      const { goal, lifestyle, diet, kcal, includeProducts, excludeProducts, allergies,
              budget, country, batchCook, servings, withPartner, partnerName,
              partnerKcal, partnerGoal, language: targetLang } = body
      const isNutrRu = (targetLang || 'ru') !== 'en'
      const openaiKey = Deno.env.get('OPENAI_API_KEY')
      if (!openaiKey) return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not set' }), { status: 500, headers: cors })
      const dayNames = isNutrRu
        ? ['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье']
        : ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
      const goalMap: Record<string,string> = {
        lose: isNutrRu?'похудеть':'lose weight', maintain: isNutrRu?'поддержать вес':'maintain weight',
        gain: isNutrRu?'набрать мышечную массу':'gain muscle', energy: isNutrRu?'больше энергии':'more energy',
        health: isNutrRu?'общее здоровье':'general health', hormones: isNutrRu?'поддержка гормонов':'hormone support',
      }
      const lsMap: Record<string,string> = {
        sedentary: isNutrRu?'сидячий':'sedentary', light: isNutrRu?'лёгкая активность':'light activity',
        moderate: isNutrRu?'умеренная активность':'moderate activity', active: isNutrRu?'активный':'active',
        very_active: isNutrRu?'очень активный':'very active',
      }
      const batchNote = batchCook
        ? (isNutrRu ? `ВАЖНО: Режим batch cooking. Готовим на ${servings||2} порции. Одно и то же блюдо повторяй ${servings||2} дня подряд. Ингредиенты в СЫРОМ/СУХОМ виде, умножь на ${servings||2}.`
          : `IMPORTANT: Batch cooking. Prepare for ${servings||2} servings. Repeat same dish for ${servings||2} days. Ingredients in RAW/DRY weight × ${servings||2}.`)
        : (isNutrRu ? 'ВАЖНО: Строго 1 порция на приём. Ингредиенты в СЫРОМ/СУХОМ виде.'
          : 'IMPORTANT: Strictly 1 serving each. All ingredients in RAW/DRY weight.')
      const partnerNote = withPartner && partnerName
        ? (isNutrRu ? `ПАРТНЁР: ${partnerName}, цель: ${goalMap[partnerGoal]||partnerGoal}. ${partnerKcal?`Ккал партнёра: ~${partnerKcal}.`:''}. Меню для ДВОИХ, продукты на двоих.`
          : `PARTNER: ${partnerName}, goal: ${partnerGoal}. ${partnerKcal?`Partner kcal: ~${partnerKcal}.`:''} Menu for TWO, ingredients for two.`)
        : ''
      const budgetNote = budget ? (isNutrRu ? `Бюджет: ${budget}/нед. Страна: ${country||'не указана'}.` : `Budget: ${budget}/week. Country: ${country||'N/A'}.`) : ''
      const sysP = isNutrRu
        ? 'Ты профессиональный диетолог. Составляй меню. Отвечай ТОЛЬКО валидным JSON без markdown.'
        : 'You are a dietitian. Create meal plans. Reply ONLY valid JSON, no markdown.'
      const uPrompt = `${isNutrRu?'Меню на 7 дней':'7-day meal plan'}:
${isNutrRu?'Цель':'Goal'}: ${goalMap[goal]||goal}
${isNutrRu?'Образ жизни':'Lifestyle'}: ${lsMap[lifestyle]||lifestyle}
${isNutrRu?'Питание':'Diet'}: ${diet}
${kcal?(isNutrRu?`Калории: ~${kcal} ккал/день`:`Calories: ~${kcal} kcal/day`):(isNutrRu?'Калории: авто':'Calories: auto')}
${includeProducts?(isNutrRu?`Включить: ${includeProducts}`:`Include: ${includeProducts}`):''}
${excludeProducts?(isNutrRu?`Исключить: ${excludeProducts}`:`Exclude: ${excludeProducts}`):''}
${allergies?(isNutrRu?`Аллергии: ${allergies}`:`Allergies: ${allergies}`):''}
${batchNote}
${partnerNote}
${budgetNote}
${isNutrRu?'JSON формат':'JSON format'}: {"title":"...","kcal_per_day":0,"partner_kcal_per_day":0,"protein_g":0,"fat_g":0,"carbs_g":0,"days":[{"day":"${dayNames[0]}","meals":[{"type":"breakfast","name":"...","kcal":0,"time":"8:00"},{"type":"lunch","name":"...","kcal":0,"time":"13:00"},{"type":"dinner","name":"...","kcal":0,"time":"19:00"},{"type":"snack","name":"...","kcal":0,"time":"16:00"}]},{"day":"${dayNames[1]}","meals":[...]},{"day":"${dayNames[2]}","meals":[...]},{"day":"${dayNames[3]}","meals":[...]},{"day":"${dayNames[4]}","meals":[...]},{"day":"${dayNames[5]}","meals":[...]},{"day":"${dayNames[6]}","meals":[...]}],"tips":["...","...","..."]}`
      const oRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 3500, temperature: 0.7,
          response_format: { type: 'json_object' },
          messages: [{ role: 'system', content: sysP }, { role: 'user', content: uPrompt }] })
      })
      const oData = await oRes.json()
      if (!oRes.ok) return new Response(JSON.stringify({ error: oData?.error?.message||'OpenAI error' }), { status: 500, headers: cors })
      const raw = oData.choices?.[0]?.message?.content?.trim() || ''
      let menu: any = {}
      try { menu = JSON.parse(raw) } catch { const m = raw.match(/\{[\s\S]*\}/); if (m) try { menu = JSON.parse(m[0]) } catch {} }
      return new Response(JSON.stringify({ menu, raw }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    if (requestType === 'get_recipe') {
      const mealName = String(body.mealName || '').trim()
      const targetLang = body.language || 'ru'
      const portions = parseInt(body.portions) || 1
      const isRecipeRu = targetLang !== 'en'
      const openaiKey = Deno.env.get('OPENAI_API_KEY')
      if (!openaiKey) return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not set' }), { status: 500, headers: cors })

      const portionNote = portions > 1
        ? (isRecipeRu ? `на ${portions} порции (batch cooking)` : `for ${portions} servings (batch cooking)`)
        : (isRecipeRu ? 'на 1 порцию' : 'for 1 serving')

      const sys = isRecipeRu
        ? `Ты шеф-повар. Пиши подробные рецепты. ВСЕ ингредиенты указывай в граммах в СЫРОМ/СУХОМ виде (до термической обработки). Например: "куриное филе — 150г (сырое)", "гречка — 80г (сухая)".`
        : `You are a chef. Write detailed recipes. ALL ingredients in RAW/DRY weight (before cooking). Example: "chicken breast — 150g (raw)", "buckwheat — 80g (dry)".`

      const prompt = isRecipeRu
        ? `Напиши подробный рецепт: "${mealName}" — ${portionNote}.

## Ингредиенты (${portionNote}, всё в сыром/сухом виде):
- ингредиент — XХг (сырое/сухое)

## Приготовление:
1. Шаг
2. Шаг

## Время: XX минут
## Калорийность: ~XXX ккал${portions>1?` (на ${portions} порции)`:''}
## Советы шефа:`
        : `Write a detailed recipe for: "${mealName}" — ${portionNote}.

## Ingredients (${portionNote}, all raw/dry weight):
- ingredient — XXg (raw/dry)

## Instructions:
1. Step
2. Step

## Time: XX minutes
## Calories: ~XXX kcal${portions>1?` (for ${portions} servings)`:''}
## Chef tips:`

      const oRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 900, temperature: 0.5,
          messages: [{ role: 'system', content: sys }, { role: 'user', content: prompt }] })
      })
      const oData = await oRes.json()
      const recipe = oData.choices?.[0]?.message?.content?.trim() || ''
      return new Response(JSON.stringify({ recipe }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    if (requestType === 'suggest_replacements') {
      const mealName = String(body.mealName || '').trim()
      const mealKcal = parseInt(body.mealKcal) || 400
      const diet = String(body.diet || 'omnivore')
      const targetLang = body.language || 'ru'
      const isRuSug = targetLang !== 'en'
      const openaiKey = Deno.env.get('OPENAI_API_KEY')
      if (!openaiKey) return new Response(JSON.stringify({ error: 'no key' }), { status: 500, headers: cors })

      const sys = isRuSug
        ? 'Ты диетолог. Предлагай замены блюд с похожей калорийностью. Отвечай ТОЛЬКО JSON.'
        : 'You are a dietitian. Suggest dish replacements with similar calories. Reply ONLY JSON.'

      const prompt = isRuSug
        ? `Предложи 5 альтернатив для блюда "${mealName}" (~${mealKcal} ккал). Тип питания: ${diet}. Калорийность каждого: ±100 ккал от ${mealKcal}.
JSON: {"suggestions":[{"name":"...","kcal":число,"note":"почему похоже"},...]}`
        : `Suggest 5 alternatives for "${mealName}" (~${mealKcal} kcal). Diet: ${diet}. Each ±100 kcal from ${mealKcal}.
JSON: {"suggestions":[{"name":"...","kcal":number,"note":"why similar"},...]}`

      const oRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openaiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gpt-4o-mini', max_tokens: 400, temperature: 0.7,
          response_format: { type: 'json_object' },
          messages: [{ role: 'system', content: sys }, { role: 'user', content: prompt }] })
      })
      const oData = await oRes.json()
      const raw = oData.choices?.[0]?.message?.content?.trim() || '{}'
      let result: any = {}
      try { result = JSON.parse(raw) } catch {}
      return new Response(JSON.stringify(result), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }






    // ── HEALTH CONDITION CONTEXT ──────────────────────────────
    if (requestType === 'health_condition_context') {
      const condition = String(body.condition || '').trim()
      const relatedAssignments = Array.isArray(body.relatedAssignments) ? body.relatedAssignments : []
      const source = body.source || 'manual'
      if (!condition) {
        return new Response(JSON.stringify({ error: 'condition is required' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
      }
      const system = isRu
        ? `Ты медицинский справочник внутри приложения Elara. Отвечай строго JSON без markdown.
Задача: дать краткую нейтральную справку о состоянии, которое пользователь добавил вручную или которое было распознано AI/из документа.
Не ставь диагноз. Не назначай лечение. Не придумывай, что это точно есть у пользователя.
Формат JSON:
{
  "title": "нормализованное название",
  "description": "5-7 предложений простым языком: что это может означать, какие симптомы/контекст часто важны, почему это может влиять на цикл/беременность/спорт/лекарства. Без паники.",
  "source": "кратко: общая медицинская справка AI, не диагноз",
  "questions": ["3-5 вопросов врачу"],
  "caveat": "короткое предупреждение, что нужна проверка формулировки и назначений врачом"
}`
        : `You are a medical reference helper inside Elara. Respond strict JSON without markdown.
Task: give a short neutral context note about a condition added manually or recognized by AI/document.
Do not diagnose. Do not prescribe treatment. Do not claim the user has it for sure.
JSON format:
{
  "title": "normalized name",
  "description": "5-7 plain-language sentences: what it may mean, what symptoms/context matter, why it can affect cycle/pregnancy planning/sport/medications. No panic.",
  "source": "briefly: general AI medical note, not a diagnosis",
  "questions": ["3-5 questions for a doctor"],
  "caveat": "short warning to verify wording and related prescriptions with a clinician"
}`
      const prompt = isRu
        ? `Состояние: ${condition}\nИсточник в приложении: ${source}\nСвязанные назначения/заметки: ${JSON.stringify(relatedAssignments).slice(0, 1200)}\nСделай безопасную справку для пользовательской карточки.`
        : `Condition: ${condition}\nSource in app: ${source}\nRelated assignments/notes: ${JSON.stringify(relatedAssignments).slice(0, 1200)}\nCreate a safe note for the user's condition card.`
      const text = await callOpenAI(system, prompt, 0.2)
      let parsed: any = {}
      try { parsed = JSON.parse(text) } catch {
        parsed = { title: condition, description: text, source: isRu ? 'общая медицинская справка AI, не диагноз' : 'general AI medical note, not a diagnosis', questions: [] }
      }
      return new Response(JSON.stringify(parsed), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    // ── MEDICAL SUMMARY (отчёт для врача) ──────────────────────
    if (requestType === 'medical_summary') {
      const lang = body.language || 'ru'
      const isRu = lang !== 'en'
      const periodDays = body.periodDays || 30
      const sections = body.sections || []
      const dp = body.dataPreview || {}
      
      const system = isRu
        ? `Ты медицинский AI-ассистент. Составь краткую сводку данных пользователя для показа врачу.
Требования:
- 3-5 предложений, чёткий медицинский язык.
- Только факты из переданных данных, без диагнозов и без додумывания.
- Суммируй ИСКЛЮЧИТЕЛЬНО включённые пользователем разделы. Не упоминай разделы, которых нет в сообщении или где значение null.
- Если раздел включён и значение равно 0, можно написать, что данных по нему не отмечено. Если раздел не включён - молчи о нём полностью.
- Лекарства считай только как активно принимаемые препараты. Препараты со статусом «Не принимаю» уже исключены и их нельзя считать или обсуждать как применявшиеся.
- Настроение считай по дням календаря/дневника, а не по количеству отдельных эмоций/тегов.
- Не называй количество отдельных календарных отметок количеством менструаций. Если есть cycleDaysCount и periodEpisodesCount, пиши: дней кровотечения и эпизодов кровотечения.
- Если likelySetupSingleDays > 0, мягко отметь, что часть одиночных отметок может быть тестовыми/ошибочными.
- Укажи, что стоит обсудить с врачом, только если это следует из включённых данных.
- Завершить: "⚠️ Данные информационные, не являются диагнозом."`
        : `You are a medical AI assistant. Create a brief data summary for the patient's doctor.
Requirements:
- 3-5 sentences, clear medical language.
- Facts only, no diagnoses and no assumptions.
- Summarize ONLY sections selected by the user. Do not mention missing/null sections.
- If a selected section has value 0, you may say no data was logged for it. If it was not selected, stay silent about it.
- Count medications only as actively taken medications. Medications marked “Not taking” have already been excluded and must not be counted or described as used.
- Count mood by calendar/diary days, not by every separate mood chip/tag.
- Do not call separate calendar marks separate periods. If cycleDaysCount and periodEpisodesCount are present, describe bleeding days and bleeding episodes.
- If likelySetupSingleDays > 0, mention that some single-day marks may be test/error entries.
- Mention what to discuss with a doctor only when supported by included data.
- End with: "⚠️ Informational only, not a diagnosis."`

      const summaryParts: string[] = []
      if (sections.includes('cycle')) {
        summaryParts.push(isRu
          ? `Цикл: дней кровотечения ${dp.cycleDaysCount ?? 0}, эпизодов кровотечения ${dp.periodEpisodesCount ?? 0}, одиночных отметок возможно из настройки ${dp.likelySetupSingleDays ?? 0}.`
          : `Cycle: bleeding days ${dp.cycleDaysCount ?? 0}, bleeding episodes ${dp.periodEpisodesCount ?? 0}, possible setup/noise single-day marks ${dp.likelySetupSingleDays ?? 0}.`)
      }
      if (sections.includes('symptoms')) summaryParts.push(isRu ? `Симптомы: ${dp.symptomsCount ?? 0}.` : `Symptoms: ${dp.symptomsCount ?? 0}.`)
      if (sections.includes('meds')) summaryParts.push(isRu
        ? `Активно принимаемые препараты: ${dp.activeMedsCount ?? 0}. Исключено как «Не принимаю»: ${dp.excludedNotTakingMedsCount ?? 0}.`
        : `Actively taken medications: ${dp.activeMedsCount ?? 0}. Excluded as “Not taking”: ${dp.excludedNotTakingMedsCount ?? 0}.`)
      if (sections.includes('mood')) summaryParts.push(isRu ? `Настроение/дневник: дней с записями ${dp.moodDaysCount ?? 0}.` : `Mood/diary: days with entries ${dp.moodDaysCount ?? 0}.`)

      const userMsg = isRu
        ? `Период: последние ${periodDays} дней. Включённые разделы: ${sections.join(', ')}. ${summaryParts.join(' ')} Составь сводку.`
        : `Period: last ${periodDays} days. Selected sections: ${sections.join(', ')}. ${summaryParts.join(' ')} Create summary.`

      try {
        const r = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'gpt-4.1-mini', max_tokens: 400, temperature: 0.4, messages: [{ role:'system', content:system }, { role:'user', content:userMsg }] })
        })
        const d = await r.json()
        const summary = d.choices?.[0]?.message?.content?.trim() || ''
        return new Response(JSON.stringify({ summary }), { headers: { ...cors, 'Content-Type': 'application/json' } })
      } catch(e) {
        return new Response(JSON.stringify({ summary: '', error: String(e) }), { headers: { ...cors, 'Content-Type': 'application/json' } })
      }
    }

    // ── MOVIE RECOMMENDATION ────────────────────────────────────
    if (requestType === 'movie_recommendation') {
      const movieMode = body.movieMode || 'any' // movie | tv | any
      const lang = body.lang || body.language || 'ru'
      const isRu = lang !== 'en'
      const groupMoods = body.groupMoods || []
      
      const moodContext = groupMoods.length > 0 
        ? `Group moods: ${groupMoods.join(', ')}.`
        : ''
      
      const typeHint = movieMode === 'movie' ? 'films only' 
        : movieMode === 'tv' ? 'TV series only' 
        : 'films or TV series'
      
      const imdbSource = movieMode === 'movie'
        ? 'https://www.imdb.com/chart/top/ (IMDb Top 250 Movies)'
        : movieMode === 'tv'
        ? 'https://www.imdb.com/chart/toptv/ (IMDb Top 250 TV Shows)'
        : 'https://www.imdb.com/chart/top/ and https://www.imdb.com/chart/toptv/'

      const system = `You are a movie recommendation assistant. Recommend 4 titles from ${imdbSource}.
Return ONLY valid JSON: {"movies": [{"title": "...", "year": 2023, "genre": "...", "type": "movie|tv", "rating": "8.5", "reason": "почему подходит (ru, 1-2 предложения)", "reason_en": "why it fits (en, 1-2 sentences)", "imdb_url": "https://www.imdb.com/title/ttXXXXXXX/"}]}

Rules:
- Recommend ONLY ${typeHint}
- Use real titles from IMDb Top lists
- ${moodContext}
- Low energy / PMS / periods / fatigue mood → recommend calm, cozy, uplifting titles (e.g. Studio Ghibli, light comedy, warm drama)
- High energy / happy mood → adventure, action, comedy, cult classics
- Anxious mood → avoid horror/thriller, recommend something safe and comforting
- Include real IMDb rating if you know it
- imdb_url must be a real IMDb title URL`

      try {
        const r = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gpt-4.1-mini', max_tokens: 800, temperature: 0.7,
            response_format: { type: 'json_object' },
            messages: [{ role: 'system', content: system }, { role: 'user', content: `Recommend 4 ${typeHint}. ${moodContext}` }]
          })
        })
        const d = await r.json()
        let parsed: any = { movies: [] }
        try { parsed = JSON.parse(d.choices?.[0]?.message?.content?.trim() || '{}') } catch {}
        return new Response(JSON.stringify(parsed), { headers: { ...cors, 'Content-Type': 'application/json' } })
      } catch(e) {
        return new Response(JSON.stringify({ movies: [], error: String(e) }), { headers: { ...cors, 'Content-Type': 'application/json' } })
      }
    }

    // ── ANALYZE DOCUMENT (OCR + AUTO-DETECT, MULTI-PAGE) ───────
    if (requestType === 'analyze_document') {
      const fileBase64 = body.fileBase64 || ''
      const mediaType = body.mediaType || 'image/jpeg'
      const documentPages = Array.isArray(body.documentPages) ? body.documentPages : []

      const normalizedPages = documentPages
        .filter((p: any) => p?.base64)
        .map((p: any, index: number) => ({
          pageNumber: p.pageNumber || index + 1,
          mediaType: p.mediaType || 'image/jpeg',
          base64: p.base64,
        }))

      if (!normalizedPages.length && fileBase64) {
        normalizedPages.push({ pageNumber: 1, mediaType, base64: fileBase64 })
      }

      if (!normalizedPages.length) {
        return new Response(JSON.stringify({ error: 'No file provided' }), { headers: { ...cors, 'Content-Type': 'application/json' } })
      }

      const systemPrompt = `You are an expert medical document analyzer for Elara, a wellness/self-tracking app.

CRITICAL SAFETY RULES:
1. Return ONLY valid JSON, no markdown, no explanation.
2. Read ALL pages in order. Do not analyze only the first page.
3. Read ONLY what is ACTUALLY written in the document. Do NOT invent or assume values, diagnoses, medications, dosages, doctors, or tests.
4. Translate everything to Russian in the response.
5. If you cannot read a value clearly, set it as null.
6. Do NOT diagnose. Do NOT recommend treatment. Extract written information only.
7. Add conditions only when they are explicitly written as diagnosis/condition/anamnesis/conclusion, not merely implied by one abnormal lab value.
8. For prescriptions, extract the doctor's written prescription as-is: medication, dosage, frequency, duration, route, notes. If something is missing, use null.
9. If a doctor/specialty/clinic is visible, extract it. If not visible, use null.

Return this JSON structure exactly:
{
  "detected_type": "тип документа на русском (например: Общий анализ крови, Биохимия, УЗИ, Выписка, Назначение врача, Направление, Рецепт)",
  "document_date": "дата документа если видна или null",
  "language_detected": "язык оригинала",
  "doctor": { "name": "ФИО врача или null", "specialty": "специальность или null", "clinic": "клиника или null" },
  "detected_tests": ["какие анализы/исследования представлены в документе"],
  "summary": "краткое описание документа в 2-4 предложениях, только по фактам",
  "biomarkers": [
    {"name": "название показателя", "value": "значение как написано", "unit": "единица", "status": "normal|low|high|abnormal|unknown", "reference": "референсные значения если указаны", "page": 1}
  ],
  "detected_conditions": [
    {"name": "название явно указанного заболевания/состояния", "evidence": "где именно это написано", "page": 1, "confidence": "high|medium|low"}
  ],
  "prescriptions": [
    {"name": "название препарата", "dosage": "дозировка", "frequency": "частота приёма", "duration": "сколько дней/недель принимать", "route": "форма/путь приёма", "instructions": "дополнительные указания", "page": 1}
  ],
  "recommendations": ["врачебные рекомендации, которые явно написаны в документе"],
  "tests_to_do": [
    {"name": "какой анализ/обследование назначено", "when": "когда/срок если указан", "notes": "комментарий если указан", "page": 1}
  ],
  "follow_up": "повторный визит/контроль если указан или null",
  "findings": "ключевые находки/заключение врача дословно переведённое",
  "advice": "1-2 осторожных предложения: что обсудить с врачом. Не назначай лечение и не меняй дозировки."
}

IMPORTANT:
- detected_conditions must include only explicit diagnoses/conditions written in the document.
- prescriptions must include only medications actually prescribed/written in the document.
- tests_to_do must include only tests/actions explicitly recommended or ordered.
- If there are no prescriptions/conditions/tests_to_do, return empty arrays.`

      const content: any[] = []
      for (const page of normalizedPages) {
        content.push({ type: 'text', text: `Page ${page.pageNumber}. Read this page carefully.` })
        content.push({ type: 'image_url', image_url: { url: `data:${page.mediaType};base64,${page.base64}`, detail: 'high' } })
      }
      content.push({ type: 'text', text: 'Analyze all pages in order and return the required JSON. Do not omit later pages.' })

      try {
        const r = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gpt-4o',
            max_tokens: 3500,
            temperature: 0.05,
            response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content }
            ]
          })
        })
        const d = await r.json()
        if (!r.ok) {
          return new Response(JSON.stringify({ error: d?.error?.message || 'OpenAI error', summary: 'Ошибка анализа документа.' }), { headers: { ...cors, 'Content-Type': 'application/json' } })
        }
        let parsed: any = {}
        try { parsed = JSON.parse(d.choices?.[0]?.message?.content?.trim() || '{}') } catch {}

        parsed.biomarkers = Array.isArray(parsed.biomarkers) ? parsed.biomarkers : []
        parsed.detected_conditions = Array.isArray(parsed.detected_conditions) ? parsed.detected_conditions : []
        parsed.prescriptions = Array.isArray(parsed.prescriptions) ? parsed.prescriptions : []
        parsed.recommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations : []
        parsed.tests_to_do = Array.isArray(parsed.tests_to_do) ? parsed.tests_to_do : []
        parsed.detected_tests = Array.isArray(parsed.detected_tests) ? parsed.detected_tests : []
        if (!parsed.doctor || typeof parsed.doctor !== 'object') parsed.doctor = { name: null, specialty: null, clinic: null }

        return new Response(JSON.stringify(parsed), { headers: { ...cors, 'Content-Type': 'application/json' } })
      } catch(e) {
        return new Response(JSON.stringify({ error: String(e), summary: 'Ошибка анализа документа.' }), { headers: { ...cors, 'Content-Type': 'application/json' } })
      }
    }
    // ── PARTNER MESSAGE ───────────────────────────────────────
    if (requestType === 'partner_message') {
      const tmpl = body.template || ''
      const isRu = (body.language||'ru') !== 'en'
      const sys = isRu
        ? 'Помоги сформулировать мягкое тёплое сообщение партнёру. Одно предложение от первого лица. Тон: мягкий, заботливый.'
        : 'Help write a gentle warm message to a partner. One sentence, first person. Tone: gentle, caring.'
      const r = await fetch('https://api.openai.com/v1/chat/completions',{method:'POST',headers:{'Authorization':`Bearer ${Deno.env.get('OPENAI_API_KEY')}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4.1-mini',max_tokens:100,temperature:0.7,messages:[{role:'system',content:sys},{role:'user',content:tmpl}]})})
      const d = await r.json()
      const msg = d.choices?.[0]?.message?.content?.trim()||''
      return new Response(JSON.stringify({message:msg}),{headers:{...cors,'Content-Type':'application/json'}})
    }

    if (requestType === 'generate_avatar') {
      const appearance = body.appearance || {}
      const traits = body.traits || ''
      const interests = body.interests || ''
      const gender = body.gender || 'female'
      const lang = body.lang || 'ru'

      // Строим промпт
      const hairDesc = [appearance.hair_style, appearance.hair_color, 'hair'].filter(Boolean).join(' ')
      const eyeDesc = appearance.eye_color ? `${appearance.eye_color} eyes` : ''
      const styleMap: Record<string,string> = {
        casual:'casual modern style', aesthetic:'soft aesthetic art style',
        boho:'boho artistic style', sporty:'sporty energetic style',
        elegant:'elegant sophisticated style', dark:'dark gothic art style',
        anime:'anime illustration style, manga art', fantasy:'fantasy digital art style',
      }
      const artStyle = styleMap[appearance.style] || 'digital art style'
      const genderDesc = gender === 'male' || gender === 'trans_male' ? 'young man' : 'young woman'
      const traitsDesc = traits ? `personality: ${traits}` : ''

      // Промпт без реалистичных людей (обходим content policy DALL-E)
      const prompt = `Artistic portrait illustration, avatar style. Character with ${hairDesc}${eyeDesc ? ', ' + eyeDesc : ''}. ${artStyle}. ${traitsDesc ? 'Character traits: ' + traitsDesc + '.' : ''} Colorful digital art, stylized character portrait, centered composition, clean background, no text, no watermark. Art for app profile avatar.`

      try {
        const dalleRes = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'dall-e-3',
            prompt: prompt,
            n: 1,
            size: '1024x1024',
            quality: 'standard',
          })
        })
        const dalleData = await dalleRes.json()
        const imageUrl = dalleData.data?.[0]?.url
        if (imageUrl) {
          return new Response(JSON.stringify({ imageUrl, prompt }), { headers: { ...cors, 'Content-Type': 'application/json' } })
        } else {
          return new Response(JSON.stringify({ prompt, error: dalleData.error?.message || 'No image generated' }), { headers: { ...cors, 'Content-Type': 'application/json' } })
        }
      } catch (e) {
        return new Response(JSON.stringify({ prompt, error: String(e) }), { headers: { ...cors, 'Content-Type': 'application/json' } })
      }
    }

    // ── GENERATE ORACLE CARD IMAGE (DALL-E) ──────────────────
    if (requestType === 'generate_oracle_card') {
      const cardTheme = body.theme || 'moon'
      const cardTitle = body.title || ''

      const prompt = `Metaphorical associative card illustration: ${cardTheme}. Symbolic, dreamlike, watercolor style, soft colors, minimalist composition. Abstract spiritual artwork, no text, no letters, square format, therapeutic art card.`

      try {
        const dalleRes = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'dall-e-3',
            prompt,
            n: 1,
            size: '1024x1024',
            quality: 'standard',
          })
        })
        const d = await dalleRes.json()
        const imageUrl = d.data?.[0]?.url
        return new Response(JSON.stringify({ imageUrl }), { headers: { ...cors, 'Content-Type': 'application/json' } })
      } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), { headers: { ...cors, 'Content-Type': 'application/json' } })
      }
    }

    // ── TRANSLATE USER INPUT ──────────────────────────────────
    if (requestType === 'translate_text') {
      const text = body.text || ''
      const targetLang = body.targetLang || 'en'
      const langNames: Record<string,string> = {
        be:'белорусский',uk:'украинский',kz:'казахский',pl:'польский',
        de:'немецкий',fr:'французский',es:'испанский',tr:'турецкий',en:'английский'
      }
      const langName = langNames[targetLang] || targetLang
      const systemPrompt = `Translate the following text to ${langName}. Return ONLY the translated text, nothing else.`
      const result = await callOpenAI(systemPrompt, text, 0.2)
      return new Response(JSON.stringify({ translated: result }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    // ── PUSH С D20 (DnD mode invitation) ───────────────────
    if (requestType === 'push_dice_invite') {
      const { data: senderProfile } = await supabase.from('profiles').select('name').eq('id', userId).single()
      const senderName = senderProfile?.name || 'Elara'
      const activity = body.activityType || ''
      const diceResult = body.diceResult || null
      const diceLabel = body.diceLabel || ''

      // Сохраняем push в таблицу push_invites
      await supabase.from('push_invites').insert({
        from_user_id: userId,
        to_user_id: body.targetUserId,
        activity_type: activity,
        dice_result: diceResult,
        dice_label: diceLabel,
        status: 'pending',
        created_at: new Date().toISOString(),
      }).catch(() => null)

      const msg = diceResult
        ? `🎲 ${senderName} бросил(а) D20 и выпало ${diceResult} (${diceLabel})! Предлагает: ${activity}`
        : `✨ ${senderName} предлагает: ${activity}`

      return new Response(JSON.stringify({ message: msg, sent: true }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    if (requestType === 'activity_invite') {
      const activity = body.activityType || ''
      const date = body.date || ''
      const time = body.time || ''
      const note = body.note || ''
      const { data: senderProfile } = await supabase.from('profiles').select('name').eq('id', userId).single()
      const senderName = senderProfile?.name || 'Твой человек'

      const message = isRu
        ? `${senderName} предлагает: ${activity}${date ? ` · ${new Date(date).toLocaleDateString('ru', {day:'numeric',month:'long'})}` : ''}${time ? ` в ${time}` : ''}${note ? `\n"${note}"` : ''} 🗓`
        : `${senderName} suggests: ${activity}${date ? ` · ${new Date(date).toLocaleDateString('en', {day:'numeric',month:'long'})}` : ''}${time ? ` at ${time}` : ''}${note ? `\n"${note}"` : ''} 🗓`

      const recipientIds = body.targetUserIds || []
      for (const recipientId of recipientIds) {
        const { data: subs } = await supabase.from('push_subscriptions').select('*').eq('user_id', recipientId)
        for (const sub of (subs || [])) {
          try {
            await fetch('https://fcm.googleapis.com/fcm/send', {
              method:'POST',
              headers:{'Authorization':`key=${Deno.env.get('FCM_KEY')||''}`,'Content-Type':'application/json'},
              body: JSON.stringify({ to: sub.endpoint, notification: { title: 'Elara 🗓', body: message } })
            })
          } catch {}
        }
      }
      return new Response(JSON.stringify({ ok: true, message }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    // ── MEDICATION PARSE (AI-парсер кастомных лекарств) ──────
    if (requestType === 'medication_parse') {
      const medName = body.medicationName || ''
      const systemRu = `Ты фармацевтический AI-ассистент. Пользователь ввёл название препарата который не нашёлся в базе.
Ответь СТРОГО JSON (только JSON, без markdown):
{
  "class": "фармакологический класс (например: НПВС, СИОЗС, β-блокатор)",
  "purpose": "основное назначение в 1 предложении",
  "mechanism": "механизм действия в 1-2 предложениях простым языком",
  "warning": "главное предупреждение (взаимодействия, противопоказания) — 1 предложение"
}
Всегда добавляй в warning: «⚠️ Уточни у врача перед применением».`

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method:'POST',
        headers:{'Authorization':`Bearer ${Deno.env.get('OPENAI_API_KEY')}`,'Content-Type':'application/json'},
        body: JSON.stringify({
          model:'gpt-4.1-mini', max_tokens:300, temperature:0.3,
          response_format:{ type:'json_object' },
          messages:[
            { role:'system', content: systemRu },
            { role:'user', content:`Препарат: ${medName}` }
          ]
        })
      })
      const d = await res.json()
      const raw = d.choices?.[0]?.message?.content?.trim() || '{}'
      let parsed = {}
      try { parsed = JSON.parse(raw) } catch {}
      return new Response(JSON.stringify({ parsed, ref:'PMC7577282' }), { headers:{...cors,'Content-Type':'application/json'} })
    }

    // ── SPORT ADVICE ─────────────────────────────────────────
    if (requestType === 'sport_advice') {
      const ctx = await getContext(targetUserId || userId)
      const phase = contextOverride?.cyclePhase || ''
      const mood = contextOverride?.todayMood || ''
      const extra = contextOverride?.extraContext || ''
      const isMale = ctx.profile?.gender === 'male' || ctx.profile?.gender === 'trans_male' || ctx.profile?.body_mode === 'no_period'

      const randomSeed = Math.floor(Math.random() * 9999)

      const systemRu = isMale
        ? `Ты AI-тренер в приложении Elara. Seed: ${randomSeed}. Даёшь персональную рекомендацию по тренировке. Учитываешь: настроение, стресс, биоритмы, ЗАБОЛЕВАНИЯ (не назначай нагрузки противопоказанные при болезни), добавки (протеин — отметь время приёма, BCAA — до/после, креатин — ежедневно). 2-3 предложения. Конкретно и практично.`
        : `Ты AI-тренер в приложении Elara. Seed: ${randomSeed}. Даёшь рекомендацию по спорту с учётом фазы менструального цикла: фолликулярная — HIIT и кардио (гликолиз), овуляция — внимание к связкам (релаксин!), лютеиновая — силовые в умеренном темпе (жиросжигание), ПМС/период — йога, МФР, лёгкое движение. 2-3 предложения.`

      const prompt = [phase && `Фаза: ${phase}`, mood && `Настроение: ${mood}`, extra && extra]
        .filter(Boolean).join('. ') || `Seed ${randomSeed}`

      const advice = await callOpenAI(systemRu, prompt, 0.9)
      return new Response(JSON.stringify({ advice }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    // ── TRANSLATE UI ────────────────────────────────────────
    // Переводит строки интерфейса на любой язык
    if (requestType === 'translate_ui') {
      const targetLang = body.targetLang || 'be'
      const strings = body.strings as Record<string, string>
      const langNames: Record<string, string> = {
        be: 'белорусский', uk: 'украинский', kz: 'казахский',
        pl: 'польский', de: 'немецкий', fr: 'французский',
        es: 'испанский', tr: 'турецкий', ar: 'арабский',
      }
      const langName = langNames[targetLang] || targetLang

      const stringsList = Object.entries(strings)
        .map(([k, v]) => `${k}: "${v}"`)
        .join('\n')

      const system = `You are a professional translator for a health tracking app UI (Elara - period & health tracker). Translate ALL strings from Russian to ${langName}.
RULES:
1) Return ONLY valid JSON object - no markdown, no explanation
2) Keep ALL keys exactly as given
3) Keep emojis and symbols (✓ ✦ ◯ 🩸 etc) unchanged
4) Arrays serialized as JSON strings - translate content, keep valid JSON array format: ["Jan","Feb",...]
5) Natural native-sounding ${langName} - not literal translation
6) Translate EVERY single key - do not skip any
7) Keep app name "Elara" untranslated
8) Medical/health terms must be accurate`

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4.1-mini', max_tokens: 4000, temperature: 0.2,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: `Translate to ${langName}:\n${stringsList}` }
          ]
        })
      })
      const d = await res.json()
      console.log('Translate response status:', res.status)
      const raw = d.choices?.[0]?.message?.content?.trim() || '{}'
      let translated: Record<string, string> = {}
      try { translated = JSON.parse(raw) } catch { translated = {} }
      // directMap: { "ru value" -> "translated value" } для быстрого rl() поиска
      const directMap: Record<string, string> = {}
      for (const [k, v] of Object.entries(strings)) {
        if (translated[k] && translated[k] !== v) directMap[String(v)] = translated[k]
      }
      return new Response(JSON.stringify({ translated, directMap }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    // ── AUTO DETECT LANGUAGE ────────────────────────────────
    // Определяет язык сообщения и отвечает на том же языке
    if (requestType === 'chat') {
      const userMessage = body.message || ''
      const userLang = body.detectedLang || 'ru'

      const system = `Ты тёплый AI-компаньон в приложении Elara для трекинга цикла.
Отвечай на том же языке на котором написан вопрос.
Ты помогаешь с вопросами о здоровье, цикле, отношениях, самочувствии.
Будь эмпатичной, мудрой и честной. Не занимай чью-то сторону слепо.
2-4 предложения.`

      const advice = await callOpenAI(system, userMessage, 0.9)
      return new Response(JSON.stringify({ advice }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Unknown requestType' }), { status: 400, headers: cors })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: cors })
  }
})