import {
  withDbLock,
  loadEconomyDb,
  saveEconomyDb,
  getUser,
  gachaDecor,
  safeUserTag,
  normalizeUserJid,
  replyText
} from '../biblioteca/economia.js'

import { getWaifuById, rarityMeta } from '../biblioteca/waifuCatalog.js'

function fmt(n) {
  const x = Math.floor(Number(n) || 0)
  return String(x).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

const handler = async (m, { conn, usedPrefix }) => {
  const userJid = normalizeUserJid(m?.sender)

  await withDbLock('global', async () => {
    const db = loadEconomyDb()
    const user = getUser(db, userJid)
    const userTag = safeUserTag(conn, m)

    const inv = Array.isArray(user.waifus) ? user.waifus : []
    if (!inv.length) {
      const t = gachaDecor({
        title: 'Tu colección está vacía.',
        lines: [`> Tira con *${usedPrefix || '.'}rw* y reclama con *${usedPrefix || '.'}c*.`],
        userTag
      })
      saveEconomyDb(db)
      return replyText(conn, m, t)
    }

    const counts = { C: 0, R: 0, SR: 0, UR: 0, LR: 0 }
    let totalValue = 0

    for (const id of inv) {
      const w = getWaifuById(id)
      const r = String(w?.rarity || 'C').toUpperCase()
      if (counts[r] !== undefined) counts[r] += 1
      const meta = rarityMeta(r)
      totalValue += Number(w?.value) || Number(meta?.value) || 0
    }

    const lines = []
    for (const code of ['LR', 'UR', 'SR', 'R', 'C']) {
      const meta = rarityMeta(code)
      lines.push(`> ✰ ${meta.name} (${code}) » *${counts[code] || 0}*`)
    }

    lines.push('', `> ♡ Valor total estimado » *¥${fmt(totalValue)}*`, `> Personajes totales » *${inv.length}*`)
    lines.push('', `✐ Inventario: *${usedPrefix || '.'}waifus*`, `✐ Top: *${usedPrefix || '.'}topwaifus*`)

    const t = gachaDecor({
      title: 'Tu colección (Gacha)',
      lines,
      userTag
    })

    saveEconomyDb(db)
    return replyText(conn, m, t)
  })
}

handler.command = ['coleccion', 'gachacoleccion', 'collection', 'gacha']
handler.tags = ['gacha']
handler.help = ['coleccion']

export default handler
