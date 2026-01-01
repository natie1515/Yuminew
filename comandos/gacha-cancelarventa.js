import {
  withDbLock,
  loadEconomyDb,
  saveEconomyDb,
  getUser,
  setMarketEntry,
  gachaDecor,
  safeUserTag,
  replyText
} from '../biblioteca/economia.js'

import { getWaifuById } from '../biblioteca/waifuCatalog.js'

const handler = async (m, { conn, args }) => {
  const userJid = m?.sender
  const waifuId = String(args?.[0] || '').trim()

  await withDbLock('global', async () => {
    const db = loadEconomyDb()
    const user = getUser(db, userJid)
    const userTag = safeUserTag(conn, m)

    if (!waifuId) {
      const text = gachaDecor({
        title: 'Uso: cancelarventa <id>',
        lines: [`> Ej: *${m.usedPrefix || '.'}cancelarventa w010*`],
        userTag
      })
      saveEconomyDb(db)
      return await replyText(conn, m, text)
    }

    const entry = db.market?.[waifuId]
    if (!entry) {
      const text = gachaDecor({
        title: 'Esa waifu no está en venta.',
        lines: [`> Ver mercado: *${m.usedPrefix || '.'}market*`],
        userTag
      })
      saveEconomyDb(db)
      return await replyText(conn, m, text)
    }

    if (entry.seller !== userJid) {
      const text = gachaDecor({
        title: 'No puedes cancelar esa venta.',
        lines: [`> Solo el vendedor puede cancelarla.`],
        userTag
      })
      saveEconomyDb(db)
      return await replyText(conn, m, text)
    }

    if (!Array.isArray(user.waifus) || !user.waifus.includes(waifuId)) {
      const text = gachaDecor({
        title: 'No tienes esa waifu.',
        lines: [`> Si la perdiste, revisa tu inventario: *${m.usedPrefix || '.'}waifus*`],
        userTag
      })
      setMarketEntry(db, waifuId, null)
      saveEconomyDb(db)
      return await replyText(conn, m, text)
    }

    setMarketEntry(db, waifuId, null)
    const w = getWaifuById(waifuId)
    const text = gachaDecor({
      title: 'Venta cancelada',
      lines: [`> ${w ? `*${w.name}*` : `ID *${waifuId}*`} ya no está en el mercado.`],
      userTag
    })
    saveEconomyDb(db)
    await replyText(conn, m, text)
  })
}

handler.command = ['removesale', 'removerventa', 'cancelarventa', 'unsell']
handler.tags = ['gacha']
handler.help = ['cancelarventa <id>']

export default handler
