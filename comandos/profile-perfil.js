import {
  withDbLock,
  loadEconomyDb,
  saveEconomyDb,
  getUser,
  normalizeUserJid,
  resolveUserJid,
  getNameSafe,
  jidToNum,
  totalWealth,
  formatMoney,
  economyDecor,
  computeUserExp,
  levelFromExp,
  expForNextLevel
} from '../biblioteca/economia.js'

import { WAIFUS } from '../biblioteca/waifuCatalog.js'

function pickTargetJid(m) {
  const mentioned = Array.isArray(m?.mentionedJid) ? m.mentionedJid : []
  const byMention = mentioned?.[0] || ''
  const byQuote = m?.quoted?.sender || m?.quoted?.participant || ''
  return byMention || byQuote || m?.sender || ''
}

function computeRankByMoney(db, jid) {
  const entries = Object.entries(db?.users || {})
    .map(([k, u]) => ({
      jid: k,
      total: Math.floor(Number(u?.wallet || 0) + Number(u?.bank || 0))
    }))
    .sort((a, b) => b.total - a.total)

  const idx = entries.findIndex((x) => String(x.jid) === String(jid))
  return { rank: idx >= 0 ? idx + 1 : 0, totalUsers: entries.length }
}

function computeHaremValue(user) {
  const ids = Array.isArray(user?.waifus) ? user.waifus : []
  if (!ids.length) return { count: 0, value: 0 }
  const map = new Map((Array.isArray(WAIFUS) ? WAIFUS : []).map((w) => [String(w.id), w]))
  let value = 0
  for (const id of ids) {
    const w = map.get(String(id))
    if (!w) continue
    value += Math.floor(Number(w.value) || 0)
  }
  return { count: ids.length, value }
}

function favNameFromCatalog(favId = '') {
  const id = String(favId || '').trim()
  if (!id) return ''
  const w = (Array.isArray(WAIFUS) ? WAIFUS : []).find((x) => String(x?.id) === id)
  return w?.name ? String(w.name) : id
}

const handler = async (m, { conn }) => {
  const rawTarget = pickTargetJid(m)
  const targetJid = await resolveUserJid(conn, rawTarget)

  await withDbLock('global', async () => {
    const db = loadEconomyDb()

    const targetKey = normalizeUserJid(targetJid)
    const user = getUser(db, targetKey)

    const name = await getNameSafe(conn, targetKey)
    const num = jidToNum(targetKey)

    const birth = user.birth ? String(user.birth) : 'Sin especificar (usa .setbirth)'
    const genre = user.genre ? String(user.genre) : 'Sin especificar (usa .setgenre)'
    const desc = user.description ? String(user.description) : 'Sin descripción (usa .setdesc)'

    const wallet = Math.floor(Number(user.wallet || 0))
    const bank = Math.floor(Number(user.bank || 0))
    const total = totalWealth(user)

    const exp = computeUserExp(user)
    const level = levelFromExp(exp)
    const next = expForNextLevel(level)
    const need = Math.max(0, next - exp)

    const { rank, totalUsers } = computeRankByMoney(db, targetKey)
    const harem = computeHaremValue(user)
    const favId = String(user.favWaifu || '').trim()
    const favName = favId ? favNameFromCatalog(favId) : ''

    const lines = [
      `*「✦」 Perfil ◢ ${name} ◤*`,
      `${desc}`,
      '',
      `❀ Número » *${num}*`,
      `❀ Cumpleaños » *${birth}*`,
      `⚥ Género » *${genre}*`,
      user.marry ? `♡ Casado con » *${await getNameSafe(conn, user.marry)}*` : `♡ Casado con » *Nadie*`,
      '',
      `✰ Nivel » *${level}*`,
      `ⴵ EXP » *${exp}* (faltan *${need}*)`,
      '',
      `⛁ Wallet » *${formatMoney(wallet)}*`,
      `⛁ Banco » *${formatMoney(bank)}*`,
      `⛁ Total » *${formatMoney(total)}*`,
      rank ? `# Puesto dinero » *#${rank}* / ${totalUsers}` : '',
      '',
      `ꕥ Harem » *${harem.count}*`,
      `♤ Valor total » *¥${harem.value.toLocaleString()}*`,
      favId ? `♡ Favorita » *${favName}* (ID *${favId}*)` : ''
    ].filter(Boolean)

    const caption = economyDecor({
      title: 'Perfil',
      lines
    })

    saveEconomyDb(db)

    const pp = await conn.profilePictureUrl(targetKey, 'image').catch(() => null)
    if (pp) {
      try {
        await conn.sendMessage(
          m.chat,
          { image: { url: pp }, caption, mentions: [targetKey] },
          { quoted: m }
        )
        return
      } catch {}
    }

    await conn.sendMessage(m.chat, { text: caption, mentions: [targetKey] }, { quoted: m })
  })
}

handler.help = ['perfil', 'profile', 'miperfil']
handler.tags = ['perfil']
handler.command = ['perfil', 'profile', 'miperfil', 'miPerfil']

export default handler
