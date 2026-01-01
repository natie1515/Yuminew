import {
  withDbLock,
  loadEconomyDb,
  saveEconomyDb,
  getUser,
  getWaifuState,
  normalizeUserJid,
  gachaDecor,
  safeUserTag,
  replyText
} from '../biblioteca/economia.js'

import { getWaifuById, rarityMeta } from '../biblioteca/waifuCatalog.js'
import { getWaifuImageUrl } from '../biblioteca/waifuImages.js'

const handler = async (m, { conn, text, usedPrefix, command }) => {
  const userJid = normalizeUserJid(m?.sender)
  const arg = String(text || '').trim()

  await withDbLock('global', async () => {
    const db = loadEconomyDb()
    const user = getUser(db, userJid)
    const userTag = safeUserTag(conn, m)

    if (!arg) {
      const favId = String(user.favWaifu || '').trim()
      if (!favId) {
        const t = gachaDecor({
          title: 'No tienes waifu favorita aún.',
          lines: [`> Ej: *${usedPrefix || '.'}${command} w005*`, `> Mira tu inv: *${usedPrefix || '.'}waifus*`],
          userTag
        })
        saveEconomyDb(db)
        return replyText(conn, m, t)
      }

      const w = getWaifuById(favId)
      const meta = rarityMeta(w?.rarity)
      const state = getWaifuState(db, favId)
      const listed = db.market?.[favId] ? '🛒 En mercado' : '—'
      const value = Number(w?.value) || Number(meta?.value) || 0
      const t = gachaDecor({
        title: 'Tu waifu favorita',
        lines: [
          `> ❏ ID » *${favId}*`,
          `> ❀ Nombre » *${w?.name || favId}*`,
          w ? `> ✰ Rareza » *${meta.name} (${w.rarity})*` : '',
          w ? `> ❐ Origen » *${w.source || w.anime}*` : '',
          `> ♡ Valor » *¥${value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}*`,
          `> ⌁ Estado » *${state?.owner ? 'Reclamada' : 'Libre'}*`,
          `> 🜸 Mercado » *${listed}*`
        ].filter(Boolean),
        userTag
      })

      saveEconomyDb(db)
      const imgUrl = await getWaifuImageUrl(w).catch(() => null)
      if (imgUrl) {
        try {
          await conn.sendMessage(m.chat, { image: { url: imgUrl }, caption: t }, { quoted: m })
          return
        } catch {}
      }
      return replyText(conn, m, t)
    }

    const id = arg.split(/\s+/)[0]
    if (!id) {
      const t = gachaDecor({
        title: 'Uso incorrecto.',
        lines: [`> Ej: *${usedPrefix || '.'}${command} w005*`],
        userTag
      })
      saveEconomyDb(db)
      return replyText(conn, m, t)
    }

    if (!user.waifus?.includes(id)) {
      const t = gachaDecor({
        title: 'No tienes esa waifu.',
        lines: [`> Revisa tu inv: *${usedPrefix || '.'}waifus*`],
        userTag
      })
      saveEconomyDb(db)
      return replyText(conn, m, t)
    }

    const w = getWaifuById(id)
    user.favWaifu = id


    saveEconomyDb(db)

    const t = gachaDecor({
      title: 'Favorita actualizada.',
      lines: [`> Ahora tu waifu favorita es *${w?.name || id}* (ID *${id}*)`, `> Ver: *${usedPrefix || '.'}${command}*`],
      userTag
    })
    await replyText(conn, m, t)
  })
}

handler.command = ['fav', 'favorita', 'setfav', 'setfavourite', 'setfavorite']
handler.tags = ['gacha']
handler.help = ['fav [id]']

export default handler
