import {
  withDbLock,
  loadEconomyDb,
  saveEconomyDb,
  getUser,
  normalizeUserJid,
  resolveUserJid,
  getNameSafe,
  jidToNum,
  computeUserExp,
  levelFromExp,
  expForNextLevel,
  economyDecor,
  replyText
} from '../biblioteca/economia.js'

function pickTargetJid(m) {
  const mentioned = Array.isArray(m?.mentionedJid) ? m.mentionedJid : []
  const byMention = mentioned?.[0] || ''
  const byQuote = m?.quoted?.sender || m?.quoted?.participant || ''
  return byMention || byQuote || m?.sender || ''
}

function parsePage(text = '') {
  const n = Math.floor(Number(String(text || '').trim()))
  return Number.isFinite(n) && n > 0 ? n : 1
}

const PAGE_SIZE = 10

const handler = async (m, { conn, command, text, usedPrefix }) => {
  const isBoard = ['leaderboard', 'lboard', 'top'].includes(String(command || '').toLowerCase())

  await withDbLock('global', async () => {
    const db = loadEconomyDb()

    if (isBoard) {
      const page = parsePage(text)
      const entries = Object.entries(db?.users || {})
        .map(([jid, u]) => ({
          jid: normalizeUserJid(jid),
          exp: computeUserExp(u),
          lv: levelFromExp(computeUserExp(u))
        }))
        .filter((x) => x.exp > 0)
        .sort((a, b) => b.exp - a.exp)

      if (!entries.length) {
        saveEconomyDb(db)
        return replyText(
          conn,
          m,
          economyDecor({
            title: 'Leaderboard vacío',
            lines: ['> Aún no hay progreso suficiente para mostrar ranking. Usa comandos de economía/gacha para sumar.']
          })
        )
      }

      const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE))
      const p = Math.min(totalPages, Math.max(1, page))
      const start = (p - 1) * PAGE_SIZE
      const slice = entries.slice(start, start + PAGE_SIZE)

      const lines = [`✐ Página » *${p}* / *${totalPages}*`, '']
      let idx = start + 1
      for (const e of slice) {
        const name = await getNameSafe(conn, e.jid)
        lines.push(`✰ #${idx} » *${name}*`)
        lines.push(`ⴵ Nivel » *${e.lv}*  •  EXP » *${e.exp}*`)
        lines.push('')
        idx += 1
      }

      const out = economyDecor({
        title: 'Top de niveles',
        lines: lines.filter(Boolean)
      })

      saveEconomyDb(db)
      return replyText(conn, m, out)
    }

    const rawTarget = pickTargetJid(m)
    const targetJid = await resolveUserJid(conn, rawTarget)
    const key = normalizeUserJid(targetJid)
    const u = getUser(db, key)

    const exp = computeUserExp(u)
    const lv = levelFromExp(exp)
    const next = expForNextLevel(lv)
    const need = Math.max(0, next - exp)
    const pct = next > 0 ? Math.min(100, Math.floor((exp / next) * 100)) : 0

    const name = await getNameSafe(conn, key)
    const num = jidToNum(key)

    const out = economyDecor({
      title: 'Nivel',
      lines: [
        `✐ Usuario » *${name}*`,
        `❀ Número » *${num}*`,
        '',
        `✰ Nivel actual » *${lv}*`,
        `ⴵ EXP » *${exp}*`,
        `❒ Progreso » *${pct}%*`,
        `🜸 Siguiente nivel en » *${need} EXP*`,
        '',
        `> Tip: usar comandos de *economía* y *gacha* suma EXP automáticamente.`
      ]
    })

    saveEconomyDb(db)
    return replyText(conn, m, out)
  })
}

handler.command = ['level', 'lvl', 'leaderboard', 'lboard', 'top']
handler.tags = ['perfil']
handler.help = ['level', 'leaderboard [página]']

export default handler
