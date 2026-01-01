import {
  withDbLock,
  loadEconomyDb,
  saveEconomyDb,
  getSubbotId,
  getUser,
  formatMoney,
  economyDecor,
  safeUserTag,
  msToHuman,
  setCooldown,
  withinDayWindow,
  streakResetNeeded,
  replyText
} from '../biblioteca/economia.js'

const DAY = 24 * 60 * 60 * 1000
const DAILY_BASE = 200000
const STREAK_CAP = 180

const handler = async (m, { conn }) => {
  const subbotId = getSubbotId(conn)
  const userJid = m?.sender

  await withDbLock(subbotId, async () => {
    const db = loadEconomyDb()
    const user = getUser(db, subbotId, userJid)

    const userTag = safeUserTag(conn, m)

    const remaining = user.daily?.lastClaimAt
      ? Math.max(0, user.daily.lastClaimAt + DAY - Date.now())
      : 0
    user.cooldowns = user.cooldowns || {}
    user.cooldowns.daily = Date.now() + remaining

    if (withinDayWindow(user.daily?.lastClaimAt)) {
      const text = economyDecor({
        title: `Ya has reclamado tu *Daily* de hoy.`,
        lines: [`✐ Puedes reclamarlo de nuevo en » *${msToHuman(remaining)}*`],
        userTag
      })
      saveEconomyDb(db)
      return await replyText(conn, m, text)
    }

    if (streakResetNeeded(user.daily?.lastClaimAt)) {
      user.daily.streak = 0
    }

    user.daily.streak = Math.min(STREAK_CAP, (user.daily.streak || 0) + 1)
    user.daily.lastClaimAt = Date.now()

    const bonus = Math.min(50000, user.daily.streak * 250) // pequeño bonus por racha
    const reward = DAILY_BASE + bonus
    user.wallet += reward

    setCooldown(user, 'daily', DAY)

    const nextReward =
      DAILY_BASE +
      Math.min(50000, Math.min(STREAK_CAP, user.daily.streak + 1) * 250)

    const title = `Has reclamado tu recompensa diaria de *${formatMoney(
      reward
    )}*! (Día *${user.daily.streak}*)`

    const text = economyDecor({
      title,
      lines: [
        `> Día *${Math.min(STREAK_CAP, user.daily.streak + 1)}* » *+${formatMoney(
          nextReward
        )}*`,
        user.daily.streak >= STREAK_CAP
          ? `> ☆ Alcanzaste el límite de días, ¡Sigue así!`
          : `> ☆ Mantén tu racha para más bonus.`
      ],
      userTag
    })

    saveEconomyDb(db)
    await replyText(conn, m, text)
  })
}

handler.command = ['daily', 'diario']
handler.tags = ['economy']
handler.help = ['daily']

export default handler
                                          
