import {
  withDbLock,
  loadEconomyDb,
  saveEconomyDb,
  getSubbotId,
  getUser,
  formatMoney,
  economyDecor,
  safeUserTag,
  getCooldown,
  setCooldown,
  msToHuman,
  pick,
  randInt,
  replyText
} from '../biblioteca/economia.js'

const CD = 30 * 60 * 1000

const JOBS = [
  'Programaste un bot para un servidor y te pagaron',
  'Diseñaste un banner para un subbot',
  'Moderaste el grupo sin dormir',
  'Arreglaste errores en la dashboard',
  'Hiciste un logo elegante para el grupo'
]

const handler = async (m, { conn }) => {
  const subbotId = getSubbotId(conn)
  const userJid = m?.sender

  await withDbLock(subbotId, async () => {
    const db = loadEconomyDb()
    const user = getUser(db, subbotId, userJid)
    const userTag = safeUserTag(conn, m)

    const remain = getCooldown(user, 'work')
    if (remain > 0) {
      const text = economyDecor({
        title: 'Aún no puedes usar work.',
        lines: [`> Vuelve en » *${msToHuman(remain)}*`],
        userTag
      })
      saveEconomyDb(db)
      return await replyText(conn, m, text)
    }

    const earned = randInt(20000, 80000)
    user.wallet += earned
    user.stats.work = (user.stats.work || 0) + 1

    setCooldown(user, 'work', CD)

    const text = economyDecor({
      title: `¡Work completado! +${formatMoney(earned)}`,
      lines: [`> ${pick(JOBS)} *${formatMoney(earned)}*.`],
      userTag
    })

    saveEconomyDb(db)
    await replyText(conn, m, text)
  })
}

handler.command = ['work', 'w', 'trabajar']
handler.tags = ['economy']
handler.help = ['work']

export default handler
