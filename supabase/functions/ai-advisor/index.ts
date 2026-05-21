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
        supabase.from('profiles').select('gender, body_mode, pregnancy_week, personality_tags, preferences').eq('id', uid).single(),
        supabase.from('cycle_entries').select('type').eq('user_id', uid).eq('date', today).limit(1).maybeSingle(),
        supabase.from('mood_entries').select('mood, tags').eq('user_id', uid).eq('date', today).maybeSingle(),
        supabase.from('diary_entries').select('tags').eq('user_id', uid).eq('date', today).maybeSingle(),
      ])
      return { profile, cycleEntry, moodEntry, diaryEntry }
    }

    async function callOpenAI(system: string, user: string, temperature = 0.9) {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
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
      const currentMeds = (body.currentMedications || []).join(', ')

      const systemRu = `Ты фармацевтический ассистент в приложении Elara. Отвечай СТРОГО в формате JSON:
{"advice": "2-3 предложения: лучшее время приёма, с едой или натощак, важные нюансы", "conflicts": "если есть конфликты с другими препаратами — опиши кратко, иначе пустая строка"}.
Всегда добавляй в advice: «⚠️ Уточни у врача или фармацевта». Не ставь диагнозы. Отвечай только JSON.`

      const systemEn = `You are a pharmacy assistant in Elara. Reply STRICTLY in JSON:
{"advice": "2-3 sentences: best time, with food or not, key notes", "conflicts": "if conflicts with other meds - describe briefly, otherwise empty string"}.
Always add to advice: "⚠️ Confirm with doctor or pharmacist". No diagnoses. JSON only.`

      const promptRu = `Препарат: ${medName}${dosage ? `, доза: ${dosage}` : ''}${currentMeds ? `. Уже принимает: ${currentMeds}` : ''}. Дай рекомендацию по приёму и проверь конфликты.`
      const promptEn = `Medication: ${medName}${dosage ? `, dosage: ${dosage}` : ''}${currentMeds ? `. Currently taking: ${currentMeds}` : ''}. Give intake advice and check for conflicts.`

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
    if (requestType === 'self_advice') {
      const ctx = await getContext(targetUserId || userId)
      const cyclePart = ctx.cycleEntry?.type ? (isRu ? `Фаза цикла сегодня: ${ctx.cycleEntry.type}.` : `Cycle phase today: ${ctx.cycleEntry.type}.`) : ''
      const moodPart = ctx.moodEntry?.mood ? (isRu ? `Настроение: ${ctx.moodEntry.mood}.` : `Mood: ${ctx.moodEntry.mood}.`) : ''
      const tagsPart = (ctx.diaryEntry?.tags || ctx.moodEntry?.tags || []).length > 0
        ? (isRu ? `Теги дня: ${(ctx.diaryEntry?.tags || ctx.moodEntry?.tags || []).join(', ')}.` : `Day tags: ${(ctx.diaryEntry?.tags || ctx.moodEntry?.tags || []).join(', ')}.`)
        : ''
      const pregnancyPart = ctx.profile?.body_mode === 'pregnant'
        ? (isRu ? `Беременность ${ctx.profile.pregnancy_week || '?'} нед.` : `Pregnancy week ${ctx.profile.pregnancy_week || '?'}.`)
        : ''
      const bodyPart = ctx.profile?.body_mode && ctx.profile.body_mode !== 'has_period'
        ? (isRu ? `Режим тела: ${ctx.profile.body_mode}.` : `Body mode: ${ctx.profile.body_mode}.`)
        : ''
      const genderPart = ctx.profile?.gender && ctx.profile.gender !== 'prefer_not'
        ? (isRu ? `Идентичность: ${ctx.profile.gender}.` : `Identity: ${ctx.profile.gender}.`)
        : ''
      const personalityPart = (ctx.profile?.personality_tags || []).length > 0
        ? (isRu ? `Характер/предпочтения: ${ctx.profile.personality_tags.join(', ')}.` : `Personality: ${ctx.profile.personality_tags.join(', ')}.`)
        : ''

      // Добавляем случайность чтобы советы были разными каждый раз
      const randomSeed = Math.floor(Math.random() * 1000)
      const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)

      const system = isRu
        ? `Ты тёплый персональный AI-компаньон в Elara. Даёшь УНИКАЛЬНЫЙ совет по уходу за собой. Сегодня ${dayOfYear}-й день года, номер вариации ${randomSeed}. НИКОГДА не повторяй стандартные советы типа "выпей воды" или "ложись спать". Используй весь контекст (фазу цикла, настроение, теги, режим тела, идентичность, характер из personality_tags, предпочтения care_prefs) для максимально личного совета. Если знаешь предпочтения человека — предложи именно их. 2 предложения. Тепло, конкретно.`
        : `You are a warm personal AI companion in Elara. Give a UNIQUE self-care tip. Today is day ${dayOfYear}, variation ${randomSeed}. NEVER repeat generic tips like "drink water" or "get sleep". Use ALL context (cycle phase, mood, tags, body mode, identity, personality_tags, care_prefs) for maximum personalization. If you know their preferences — suggest those specifically. 2 sentences. Warm, specific.`

      const contextParts = [cyclePart, moodPart, tagsPart, bodyPart, genderPart, personalityPart, pregnancyPart].filter(Boolean)
      const prompt = contextParts.length > 0
        ? contextParts.join(' ') + ` Дай совет учитывающий именно этот контекст, не общий.`
        : (isRu ? `День ${dayOfYear}, вариация ${randomSeed}. Дай свежий неожиданный совет по уходу за собой.` : `Day ${dayOfYear}, variation ${randomSeed}. Give a fresh unexpected self-care tip.`)

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

    return new Response(JSON.stringify({ error: 'Unknown requestType' }), { status: 400, headers: cors })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: cors })
  }
})