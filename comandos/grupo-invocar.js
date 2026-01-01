const handler = async (m, { conn, text, args }) => {
  const chat = m.chat
  const isGroup = String(chat || '').endsWith('@g.us')

  if (!isGroup) {
    return conn.sendMessage(chat, { text: '「✦」Este comando solo funciona en grupos.' }, { quoted: m })
  }

  let meta = null
  try {
    meta = await conn.groupMetadata(chat)
  } catch {
    meta = null
  }

  const participants = meta?.participants || []
  const total = participants.length

  if (!total) {
    return conn.sendMessage(chat, { text: '「✦」No pude obtener la lista de miembros.' }, { quoted: m })
  }

  const anuncio = String(text || args?.join(' ') || '').trim() || 'Atención general a todos los miembros.'

  const fkontak = {
    key: {
      participant: '0@s.whatsapp.net',
      remoteJid: 'status@broadcast'
    },
    message: {
      contactMessage: {
        displayName: '➪ 𝗜𝗻𝘃𝗼𝗰𝗮𝗿',
        vcard: `BEGIN:VCARD
VERSION:3.0
N:;Meow;;;
FN:Meow
ORG:Meta AI
TEL;type=CELL;type=VOICE;waid=867051314767696:+51 987 654 321
END:VCARD`
      }
    }
  }

  const ids = participants.map(p => p.id).filter(Boolean)
  const listaMenciones = ids.map((jid, i) => `${i + 1}. @${jid.split('@')[0]}`).join('\n')

  const teks =
`> *❏ 𝖬𝖤𝖭𝖢𝖨𝖮𝖭 𝖦𝖤𝖭𝖤𝖱𝖠𝖫 ❍*

ᰔ \`Miembros:\` *${total}*
✩ \`Anuncio:\` *${anuncio}*

> ✎ *Usuarios:*
${listaMenciones}`

  await conn.sendMessage(
    chat,
    { text: teks, mentions: ids },
    { quoted: fkontak }
  )
}

handler.help = ['todos', 'invocar', 'tagall']
handler.tags = ['group']
handler.command = ['todos', 'invocar', 'tagall']
handler.useradm = true

export default handler