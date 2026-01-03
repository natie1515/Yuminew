import { exec } from 'child_process'
import fs from 'fs'
import util from 'util'
import { downloadContentFromMessage } from '@whiskeysockets/baileys'
import { Sticker } from 'wa-sticker-formatter'

const execAsync = util.promisify(exec)

let handler = async (m, { conn, args }) => {
  const from = m.chat
  const opt = (args[0] || '').toLowerCase()

  const ctx = m.message?.extendedTextMessage?.contextInfo
  const quoted = ctx?.quotedMessage || m.message

  const imageMessage = quoted?.imageMessage
  const videoMessage = quoted?.videoMessage

  if (!imageMessage && !videoMessage) return

  // ⏳ reloj de arena (creando)
  await conn.sendMessage(from, {
    react: { text: '⏳', key: m.key }
  })

  const stream = await downloadContentFromMessage(
    imageMessage || videoMessage,
    imageMessage ? 'image' : 'video'
  )

  let buffer = Buffer.from([])
  for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk])

  const ts = Date.now()
  const input = `./temp_${ts}.${imageMessage ? 'jpg' : 'mp4'}`
  const output = `./temp_${ts}.webp`

  await fs.promises.writeFile(input, buffer)

  const vf =
    'fps=15,scale=512:512:force_original_aspect_ratio=increase,crop=512:512'

  const ffmpegCmd = imageMessage
    ? `ffmpeg -y -i "${input}" -vf "${vf}" "${output}"`
    : `ffmpeg -y -i "${input}" -t 8 -vf "${vf}" "${output}"`

  try {
    await execAsync(ffmpegCmd)

    // 🔥 crear sticker con metadata REAL
    const sticker = new Sticker(output, {
      pack: globalThis.nombrebot || 'Sticker Bot',
      author: globalThis.nombrebot || 'Sticker Bot',
      type: 'full',
      quality: 100
    })

    const stickerBuffer = await sticker.toBuffer()

    // 📦 enviar sticker
    await conn.sendMessage(
      from,
      { sticker: stickerBuffer },
      { quoted: m }
    )

    // ✔️ flecha verde (listo)
    await conn.sendMessage(from, {
      react: { text: '✔️', key: m.key }
    })

  } catch (e) {
    // ❌ error
    await conn.sendMessage(from, {
      react: { text: '❌', key: m.key }
    })
  } finally {
    if (fs.existsSync(input)) fs.unlinkSync(input)
    if (fs.existsSync(output)) fs.unlinkSync(output)
  }
}

handler.help = ['sticker']
handler.tags = ['sticker']
handler.command = ['sticker', 's']

export default handler
export default handler
