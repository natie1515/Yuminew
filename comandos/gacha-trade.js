import {
  withDbLock,
  loadEconomyDb,
  saveEconomyDb,
  getNameSafe,
  getUser,
  getWaifuState,
  normalizeUserJid,
  gachaDecor,
  safeUserTag,
  resolveUserJid,
  replyText
} from '../biblioteca/economia.js'

import { getWaifuById } from '../biblioteca/waifuCatalog.js'

function extractOtherUser(conn, m) {
  const mentioned =
    m?.mentionedJid ||
    m?.message?.extendedTextMessage?.contextInfo?.mentionedJid ||
    []
  if (Array.isArray(mentioned) && mentioned.length) return mentioned[0]

  const q =
    m?.quoted?.sender ||
    m?.quoted?.participant ||
    m?.msg?.contextInfo?.participant ||
    m?.message?.extendedTextMessage?.contextInfo?.participant ||
    null
  if (q) return q

  const text =
    m?.text ||
    m?.body ||
    m?.message?.conversation ||
    m?.message?.extendedTextMessage?.text ||
    ''
  const parsed = conn?.parseMention ? conn.parseMention(String(text)) : []
  if (Array.isArray(parsed) && parsed.length) return parsed[0]

  return ''
}

function parseIds(text = '') {
  const t = String(text || '')
  const parts = t.split('/').map((s) => s.trim()).filter(Boolean)
  if (parts.length < 2) return { a: '', b: '' }
  const a = parts[0].split(/\s+/)[0]
  const b = parts[1].split(/\s+/)[0]
  return { a, b }
}

const handler = async (m, { conn, text, usedPrefix }) => {
  const me = normalizeUserJid(m?.sender)
  const { a, b } = parseIds(text)

  let otherRaw = extractOtherUser(conn, m)
  otherRaw = await resolveUserJid(conn, otherRaw)
  const other = normalizeUserJid(otherRaw)

  await withDbLock('global', async () => {
    const db = loadEconomyDb()
    const meUser = getUser(db, me)
    const otherUser = other ? getUser(db, other) : null
    const userTag = safeUserTag(conn, m)

    if (!a || !b) {
      const t = gachaDecor({
        title: 'Uso:',
        lines: [
          `> *${usedPrefix || '.'}trade @usuario <tuID> / <suID>*`,
          `> Ej: *${usedPrefix || '.'}trade @alguien w001 / w020*`
        ],
        userTag
      })
      saveEconomyDb(db)
      return replyText(conn, m, t)
    }

    if (!other || !otherUser || other === me) {
      const t = gachaDecor({
        title: 'Debes mencionar a la otra persona.',
        lines: [`> Ej: *${usedPrefix || '.'}trade @usuario ${a} / ${b}*`],
        userTag
      })
      saveEconomyDb(db)
      return replyText(conn, m, t)
    }

    if (!meUser.waifus?.includes(a)) {
      const t = gachaDecor({
        title: 'No tienes tu personaje (ID A).',
        lines: [`> Revisa tu inventario: *${usedPrefix || '.'}waifus*`],
        userTag
      })
      saveEconomyDb(db)
      return replyText(conn, m, t)
    }

    if (!otherUser.waifus?.includes(b)) {
      const t = gachaDecor({
        title: 'El otro usuario no tiene su personaje (ID B).',
        lines: [`> Verifica el ID y el dueño.`],
        userTag
      })
      saveEconomyDb(db)
      return replyText(conn, m, t)
    }

    const stA = getWaifuState(db, a)
    const stB = getWaifuState(db, b)

    if (String(stA?.owner || '') !== String(me) || String(stB?.owner || '') !== String(other)) {
      const t = gachaDecor({
        title: 'Los dueños no coinciden.',
        lines: [`> El trade requiere que A sea tuyo y B sea del usuario mencionado.`],
        userTag
      })
      saveEconomyDb(db)
      return replyText(conn, m, t)
    }

    if (db.market?.[a]) delete db.market[a]
    if (db.market?.[b]) delete db.market[b]

    stA.owner = other
    stB.owner = me

    meUser.waifus = meUser.waifus.filter((x) => x !== a)
    otherUser.waifus = otherUser.waifus.filter((x) => x !== b)

    if (!meUser.waifus.includes(b)) meUser.waifus.push(b)
    if (!otherUser.waifus.includes(a)) otherUser.waifus.push(a)

    if (String(meUser.favWaifu || '') === a) meUser.favWaifu = ''
    if (String(otherUser.favWaifu || '') === b) otherUser.favWaifu = ''

    saveEconomyDb(db)

    const wa = getWaifuById(a)
    const wb = getWaifuById(b)
    const otherNameRaw = await getNameSafe(conn, other)
    const otherName = String(otherNameRaw || '').replace(/\s+/g, ' ').trim() || (other ? `+${other.split('@')[0]}` : 'usuario')
    const t = gachaDecor({
      title: 'Trade completado.',
      lines: [
        `> Intercambio con: ${otherName}.`,
        `> Tú entregaste: *${wa?.name || a}* (ID *${a}*)`,
        `> Tú recibiste: *${wb?.name || b}* (ID *${b}*)`,
        '',
        `> Nota: el mercado se limpia automáticamente durante un trade.`
      ],
      userTag
    })
    return replyText(conn, m, t)
  })
}

handler.command = ['trade', 'intercambiar']
handler.tags = ['gacha']
handler.help = ['trade @usuario <tuID> / <suID>']

export default handler
