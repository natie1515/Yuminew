import {
  withDbLock,
  loadEconomyDb,
  saveEconomyDb,
  getNameSafe,
  gachaDecor,
  safeUserTag,
  replyText
} from '../biblioteca/economia.js'

import { getWaifuById } from '../biblioteca/waifuCatalog.js'

const handler = async (m, { conn }) => {
  await withDbLock('global', async () => {
    const db = loadEconomyDb()
    const userTag = safeUserTag(conn, m)

    const users = db.users || {}
    const counts = new Map()

    for (const [jid, u] of Object.entries(users)) {
      const fav = String(u?.favWaifu || '').trim()
      if (!fav) continue
      counts.set(fav, (counts.get(fav) || 0) + 1)
    }

    const top = Array.from(counts.entries())
      .map(([id, n]) => ({ id, n }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 10)

    if (!top.length) {
      const t = gachaDecor({
        title: 'Aún no hay favoritas registradas.',
        lines: [`> Usa *.fav <id>* para marcar una waifu favorita.`],
        userTag
      })
      saveEconomyDb(db)
      return replyText(conn, m, t)
    }

    const lines = []
    for (let i = 0; i < top.length; i++) {
      const row = top[i]
      const w = getWaifuById(row.id)
      lines.push(`> ${(i + 1).toString().padStart(2, '0')}. *${w?.name || row.id}* (ID *${row.id}*) — ♡ *${row.n}* fav(s)`)
    }

    const t = gachaDecor({
      title: 'Top de Waifus Favoritas',
      lines,
      userTag
    })

    saveEconomyDb(db)
    return replyText(conn, m, t)
  })
}

handler.command = ['favoritetop', 'favtop']
handler.tags = ['gacha']
handler.help = ['favtop']

export default handler
