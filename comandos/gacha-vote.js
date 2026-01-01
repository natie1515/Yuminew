import {
  withDbLock,
  loadEconomyDb,
  saveEconomyDb,
  getUser,
  getWaifuState,
  normalizeUserJid,
  gachaDecor,
  safeUserTag,
  getCooldown,
  setCooldown,
  msToHuman,
  replyText
} from '../biblioteca/economia.js'

import { getWaifuById, searchWaifus } from '../biblioteca/waifuCatalog.js'

const CD = 60 * 60 * 1000 
const BOOST_PER_VOTE = 2500

function resolveId(query = '') {
  const q = String(query || '').trim()
  if (!q) return ''
  const direct = getWaifuById(q)
  if (direct) return direct.id
  const hit = searchWaifus(q, 1)?.[0]
  return hit?.id || ''
}

const handler = async (m, { conn, text, usedPrefix, command }) => {
  const userJid = normalizeUserJid(m?.sender)
  const q = String(text || '').trim()
  const id = resolveId(q)

  await withDbLock('global', async () => {
    const db = loadEconomyDb()
    const user = getUser(db, userJid)
    const userTag = safeUserTag(conn, m)

    if (!id) {
      const t = gachaDecor({
        title: 'Uso:',
        lines: [
          `> *${usedPrefix || '.'}${command} <id|nombre>*`,
          `> Ej: *${usedPrefix || '.'}${command} w005*`
        ],
        userTag
      })
      saveEconomyDb(db)
      return replyText(conn, m, t)
    }

    const remain = getCooldown(user, 'vote')
    if (remain > 0) {
      const t = gachaDecor({
        title: 'Aún no puedes votar.',
        lines: [`> Vuelve en » *${msToHuman(remain)}*`],
        userTag
      })
      saveEconomyDb(db)
      return replyText(conn, m, t)
    }

    const w = getWaifuById(id)
    if (!w) {
      const t = gachaDecor({
        title: 'Personaje inválido.',
        lines: [`> No se encontró *${id}*.`],
        userTag
      })
      saveEconomyDb(db)
      return replyText(conn, m, t)
    }

    const st = getWaifuState(db, id)
    st.votes = Math.max(0, Math.floor(Number(st.votes || 0))) + 1
    st.voteBoost = Math.max(0, Math.floor(Number(st.voteBoost || 0))) + BOOST_PER_VOTE

    user.stats = user.stats || {}
    user.stats.vote = (user.stats.vote || 0) + 1

    setCooldown(user, 'vote', CD)

    saveEconomyDb(db)

    const t = gachaDecor({
      title: 'Voto registrado.',
      lines: [
        `> Votaste por *${w.name}* (ID *${id}*).`,
        `> Boost acumulado: *¥${st.voteBoost.toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, ',')}*`,
        `> Votos totales: *${st.votes}*`,
        '',
        `> Mira el top: *${usedPrefix || '.'}waifusboard*`
      ],
      userTag
    })
    return replyText(conn, m, t)
  })
}

handler.command = ['vote', 'votar']
handler.tags = ['gacha']
handler.help = ['vote <id|nombre>']

export default handler
