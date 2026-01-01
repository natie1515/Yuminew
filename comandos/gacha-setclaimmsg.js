import {
  withDbLock,
  loadEconomyDb,
  saveEconomyDb,
  getUser,
  normalizeUserJid,
  gachaDecor,
  safeUserTag,
  replyText
} from '../biblioteca/economia.js'

const MAX_LEN = 260

const handler = async (m, { conn, text, usedPrefix }) => {
  const userJid = normalizeUserJid(m?.sender)
  const msg = String(text || '').trim()

  await withDbLock('global', async () => {
    const db = loadEconomyDb()
    const user = getUser(db, userJid)
    const userTag = safeUserTag(conn, m)

    if (!msg) {
      const t = gachaDecor({
        title: 'Personaliza tu mensaje de claim',
        lines: [
          `> Uso: *${usedPrefix || '.'}setclaimmsg <mensaje>*`,
          '',
          '> Variables disponibles:',
          '> {name} {id} {rarity} {source} {value} {user}',
          '',
          `> Ej: *${usedPrefix || '.'}setclaimmsg {user} reclamó a {name} ({rarity})*`,
          `> Restablecer: *${usedPrefix || '.'}delclaimmsg*`
        ],
        userTag
      })
      saveEconomyDb(db)
      return replyText(conn, m, t)
    }

    if (msg.length > MAX_LEN) {
      const t = gachaDecor({
        title: 'Mensaje demasiado largo.',
        lines: [`> Máximo: *${MAX_LEN}* caracteres.`],
        userTag
      })
      saveEconomyDb(db)
      return replyText(conn, m, t)
    }

    user.claimMsg = msg

    saveEconomyDb(db)
    const t = gachaDecor({
      title: 'Mensaje de claim guardado.',
      lines: [
        '> Se usará cuando reclames un personaje.',
        '',
        `> Vista previa:\n> ${msg}`
      ],
      userTag
    })
    return replyText(conn, m, t)
  })
}

handler.command = ['setclaimmsg', 'setclaim']
handler.tags = ['gacha']
handler.help = ['setclaimmsg <mensaje>']

export default handler
