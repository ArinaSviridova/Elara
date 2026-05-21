import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { userId, userName, userEmail, type, message, lang } = await req.json()

    const TG_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
    const TG_CHAT = Deno.env.get('TELEGRAM_CHAT_ID')

    if (TG_TOKEN && TG_CHAT) {
      const typeEmoji = { bug:'🐛', idea:'💡', payment:'💳', other:'💬' }[type] || '💬'
      const text = `${typeEmoji} <b>Обратная связь Elara</b>\n\n` +
        `👤 ${userName || 'Аноним'} (${userEmail || 'нет email'})\n` +
        `🆔 ${userId || 'нет id'}\n` +
        `📝 Тема: ${type}\n\n` +
        `${message}`

      await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TG_CHAT, text, parse_mode: 'HTML' }),
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: cors })
  }
})