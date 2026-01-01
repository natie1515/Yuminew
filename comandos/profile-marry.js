import { jidNormalizedUser } from '@whiskeysockets/baileys'

import {
  withDbLock,
  loadEconomyDb,
  saveEconomyDb,
  getUser,
  resolveUserJid,
  getNameSafe,
  economyDecor,
  replyText
} from '../biblioteca/economia.js'

function normalizeJid(jid = '') {
  return jid ? jidNormalizedUser(jid) : ''
}

function getDecodeJid(conn) {
  return typeof conn?.decodeJid === 'function'
    ? conn.decodeJid.bind(conn)
    : (jid) => normalizeJid(jid)
}

async function resolveLidToPnJid(conn, chatJid, candidateJid) {
  const jid = normalizeJid(candidateJid)
  if (!jid || !jid.endsWith('@lid')) return jid

  if (!chatJid || !String(chatJid).endsWith('@g.us')) return jid
  if (typeof conn?.groupMetadata !== 'function') return jid

  try {
    const meta = await conn.groupMetadata(chatJid)
    const participants = Array.isArray(meta?.participants) ? meta.participants : []

    const found = participants.find(p => {
      const pid = normalizeJid(p?.id || '')
      const plid = normalizeJid(p?.lid || '')
      const pjid = normalizeJid(p?.jid || '')
      return pid === jid || plid === jid || pjid === jid
    })

    const mapped = normalizeJid(found?.jid || '')
    return mapped || jid
  } catch {
    return jid
  }
}

function getParticipantJid(p, decodeJid) {
  if (typeof p === 'string') return decodeJid(p)

  const raw = p?.jid || p?.id || p?.participant || ''
  return decodeJid(raw)
}

async function pickTargetJid(m, conn) {
  const decodeJid = getDecodeJid(conn)
  const chatJid =
    decodeJid(m?.chat || m?.key?.remoteJid || m?.from || '')

  const ctx =
    m?.message?.extendedTextMessage?.contextInfo ||
    m?.msg?.contextInfo ||
    {}

  const mentioned =
    m?.mentionedJid ||
    ctx?.mentionedJid ||
    ctx?.mentionedJidList ||
    []

  if (Array.isArray(mentioned) && mentioned.length) {
    const raw = decodeJid(mentioned[0])
    const fixed = await resolveLidToPnJid(conn, chatJid, raw)
    return decodeJid(fixed)
  }

  const text =
    m?.text ||
    m?.body ||
    m?.message?.conversation ||
    m?.message?.extendedTextMessage?.text ||
    ''

  if (conn?.parseMention) {
    const parsed = conn.parseMention(String(text))
    if (parsed?.length) {
      const raw = decodeJid(parsed[0])
      const fixed = await resolveLidToPnJid(conn, chatJid, raw)
      return decodeJid(fixed)
    }
  }

  const quotedCtx =
    m?.quoted?.msg?.contextInfo ||
    m?.quoted?.contextInfo ||
    {}

  const qRaw =
    getParticipantJid(m?.quoted?.participant, decodeJid) ||
    getParticipantJid(ctx?.participant, decodeJid) ||
    getParticipantJid(quotedCtx?.participant, decodeJid)

  if (qRaw) {
    const fixed = await resolveLidToPnJid(conn, chatJid, qRaw)
    return decodeJid(fixed)
  }

  return ''
}

const handler = async (m, { conn, command, usedPrefix }) => {
  const cmd = String(command || '').toLowerCase()

  const senderResolved = await resolveUserJid(conn, m?.sender)
  const me = normalizeJid(senderResolved)

  await withDbLock('global', async () => {
    const db = loadEconomyDb()
    const user = getUser(db, me)

    if (cmd === 'divorce') {
      const partner = String(user.marry || '')
      if (!partner) {
        saveEconomyDb(db)
        return replyText(
          conn,
          m,
          economyDecor({
            title: 'No estás casado',
            lines: [`> Puedes casarte con: *${usedPrefix || '.'}marry @usuario*`]
          })
        )
      }

      const partnerKey = normalizeJid(partner)
      const pUser = getUser(db, partnerKey)

      user.marry = ''
      if (String(pUser.marry || '') === me) pUser.marry = ''

      const pName = await getNameSafe(conn, partnerKey)
      saveEconomyDb(db)

      return replyText(
        conn,
        m,
        economyDecor({
          title: 'Divorcio completado',
          lines: [`✐ Te divorciaste de *${pName}*.`]
        })
      )
    }

    // IMPORTANTE: aquí ya devolvemos pn si existía (y no @lid)
    const rawTarget = await pickTargetJid(m, conn)
    const targetResolved = rawTarget ? await resolveUserJid(conn, rawTarget) : ''
    const target = normalizeJid(targetResolved)

    if (!target || target === me) {
      saveEconomyDb(db)
      return replyText(
        conn,
        m,
        economyDecor({
          title: 'Uso incorrecto',
          lines: [
            `> Debes mencionar o responder al usuario.`,
            `> Ej: *${usedPrefix || '.'}${cmd} @usuario*`
          ]
        })
      )
    }

    const other = getUser(db, target)

    if (user.marry) {
      const pName = await getNameSafe(conn, user.marry)
      saveEconomyDb(db)
      return replyText(
        conn,
        m,
        economyDecor({
          title: 'Ya estás casado',
          lines: [
            `> Actualmente estás casado con *${pName}*`,
            `> Usa *${usedPrefix || '.'}divorce* para divorciarte.`
          ]
        })
      )
    }

    if (other.marry) {
      const pName = await getNameSafe(conn, other.marry)
      saveEconomyDb(db)
      return replyText(
        conn,
        m,
        economyDecor({
          title: 'La otra persona ya está casada',
          lines: [`> Está casado con *${pName}*.`]
        })
      )
    }

    user.marry = target
    other.marry = me

    const myName = await getNameSafe(conn, me)
    const tName = await getNameSafe(conn, target)

    saveEconomyDb(db)
    return replyText(
      conn,
      m,
      economyDecor({
        title: '¡Boda registrada!',
        lines: [
          `♡ *${myName}* y *${tName}* ahora están casados.`,
          `> Ver perfil: *${usedPrefix || '.'}perfil*`
        ]
      })
    )
  })
}

handler.command = ['marry', 'casarse', 'divorce']
handler.tags = ['perfil']
handler.help = ['marry @usuario', 'divorce']

export default handler
