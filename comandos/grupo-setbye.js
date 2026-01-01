import { setByeMessage, getByeMessage } from '../biblioteca/settings.js'

const handler = async (m, ctx) => {
  const { conn, from, isGroup, text, isSubBot, usedPrefix, command } = ctx

  if (!isGroup) {
    await conn.sendMessage(from, { text: '「✦」Este comando solo funciona en grupos.' }, { quoted: m })
    return
  }

  const t = String(text || '').trim()

  if (!t) {
    const cur = getByeMessage(from, isSubBot ? String(conn?.subbotId || '').trim() : '')
    const msg =
`「✦」Uso: *${usedPrefix + command}* <mensaje>

✎ Placeholders:
- {mention}  {username}
- {group}    {desc}
- {bot}

» Actual:
${cur ? cur : '— (default) —'}

✧ Para borrar: *${usedPrefix + command} reset*`
    await conn.sendMessage(from, { text: msg }, { quoted: m })
    return
  }

  if (/^(reset|default|borrar|delete|del)$/i.test(t)) {
    setByeMessage(from, '', isSubBot ? String(conn?.subbotId || '').trim() : '')
    await conn.sendMessage(from, { text: '「✦」Despedida personalizada eliminada. Se usará la predeterminada.' }, { quoted: m })
    return
  }

  setByeMessage(from, t, isSubBot ? String(conn?.subbotId || '').trim() : '')
  await conn.sendMessage(from, { text: '「✦」Despedida personalizada guardada.' }, { quoted: m })
}

handler.help = ['setbye <mensaje>', 'setbye reset']
handler.tags = ['group']
handler.command = ['setbye']

handler.useradm = true

export default handler