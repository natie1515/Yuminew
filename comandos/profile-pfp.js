import { getNameSafe, resolveUserJid } from '../biblioteca/economia.js'

function pickTargetJid(m) {
  const mentioned = Array.isArray(m?.mentionedJid) ? m.mentionedJid : []
  const byMention = mentioned?.[0] || ''
  const byQuote = m?.quoted?.sender || m?.quoted?.participant || ''
  return byMention || byQuote || ''
}

const handler = async (m, { conn }) => {
  const raw = pickTargetJid(m)
  if (!raw) {
    await conn.sendMessage(m.chat, { text: '❀ Por favor, menciona al usuario o responde a su mensaje para ver su foto de perfil.' }, { quoted: m })
    return
  }

  const who = await resolveUserJid(conn, raw)
  const name = await getNameSafe(conn, who)
  const pp = await conn.profilePictureUrl(who, 'image').catch(() => null)
  if (!pp) {
    await conn.sendMessage(m.chat, { text: '🌾 No se pudo obtener su foto de perfil.' }, { quoted: m })
    return
  }

  await conn.sendMessage(m.chat, { image: { url: pp }, caption: `❀ *Foto de perfil obtenida*`, mentions: [who] }, { quoted: m })
}

handler.help = ['pfp', 'getpic']
handler.tags = ['perfil']
handler.command = ['pfp', 'getpic']

export default handler
