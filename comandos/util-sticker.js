import { exec } from 'child_process'
import fs from 'fs'
import util from 'util'
import { downloadContentFromMessage } from '@whiskeysockets/baileys'

const execAsync = util.promisify(exec)

let handler = async (m, { conn, args, usedPrefix, command }) => {
  const from = m?.chat || m?.key?.remoteJid
  if (!from) return

  const opt = (args?.[0] || '').toLowerCase()

  const styles = {
    crop: 'Recorte centrado 512x512',
    circle: 'Círculo (recorte redondo)',
    bw: 'Blanco y negro',
    invert: 'Invertir colores',
    blur: 'Desenfoque',
    pixel: 'Pixelado',
    sepia: 'Sepia',
    neon: 'Bordes tipo neón'
  }

  const listText =
    `「✦」𝗟𝗶𝘀𝘁𝗮 𝗱𝗲 𝗲𝘀𝘁𝗶𝗹𝗼𝘀 (${usedPrefix + command} <estilo>)\n\n` +
    Object.keys(styles).map(k => `• ${usedPrefix + command} ${k} — ${styles[k]}`).join('\n') +
    `\n\n• ${usedPrefix + command} list`

  if (opt === 'list') {
    return await conn.sendMessage(from, { text: listText }, { quoted: m })
  }

  const ctx = m?.message?.extendedTextMessage?.contextInfo
  const quotedMsg = ctx?.quotedMessage?.message || ctx?.quotedMessage || null

  const imageMessage = m?.message?.imageMessage || quotedMsg?.imageMessage || null
  const videoMessage = m?.message?.videoMessage || quotedMsg?.videoMessage || null

  if (!imageMessage && !videoMessage) {
    return await conn.sendMessage(
      from,
      { text: `Responde a una imagen o video\nEj: ${usedPrefix + command}` },
      { quoted: m }
    )
  }

  const msg = imageMessage || videoMessage
  const dlType = imageMessage ? 'image' : 'video'

  const stream = await downloadContentFromMessage(msg, dlType)
  let buffer = Buffer.from([])
  for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk])

  const ts = Date.now()
  const input = `./temp_${ts}.${imageMessage ? 'jpg' : 'mp4'}`
  const output = `./temp_${ts}.webp`

  await fs.promises.writeFile(input, buffer)

  const style = opt || 'crop'

  const baseCoverCrop =
    'fps=15,scale=512:512:force_original_aspect_ratio=increase,crop=512:512'

  const geqCircle =
    "geq=lum='p(X,Y)':a='if(lte(hypot(X-256,Y-256),256),255,0)'"

  const vf =
    style === 'circle'
      ? `${baseCoverCrop},format=rgba,${geqCircle}`
      : baseCoverCrop

  const ffmpegCmd = imageMessage
    ? `ffmpeg -y -i "${input}" -vf "${vf}" "${output}"`
    : `ffmpeg -y -i "${input}" -t 8 -vf "${vf}" "${output}"`

  const packname = globalThis.nombrebot || 'YumiBot'
  const author = packname

  try {
    await execAsync(ffmpegCmd)

    // ✅ FORMA CORRECTA (METADATA SÍ FUNCIONA)
    await conn.sendMessage(
      from,
      {
        sticker: { url: output },
        packname,
        author
      },
      { quoted: m }
    )
  } catch (e) {
    await conn.sendMessage(from, { text: 'Error creando sticker' }, { quoted: m })
  } finally {
    if (fs.existsSync(input)) fs.unlinkSync(input)
    if (fs.existsSync(output)) fs.unlinkSync(output)
  }
}

handler.help = ['sticker']
handler.tags = ['sticker']
handler.command = ['sticker', 's']

export default handler
