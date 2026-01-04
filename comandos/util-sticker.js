import { exec } from 'child_process'
import fs from 'fs'
import util from 'util'
import { downloadContentFromMessage } from '@whiskeysockets/baileys'
import { Sticker } from 'wa-sticker-formatter'

const execAsync = util.promisify(exec)

let handler = async (m, { conn, args, usedPrefix, command }) => {
  const from = m?.chat || m?.key?.remoteJid
  if (!from) return

  const opt = (args?.[0] || '').toLowerCase()

  const styles = {
    circle: 'Círculo (recorte redondo)',
    crop: 'Recorte centrado 512x512',
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
  const quotedMsg = ctx?.quotedMessage || null

  const imageMessage =
    m?.message?.imageMessage ||
    quotedMsg?.imageMessage ||
    null

  const videoMessage =
    m?.message?.videoMessage ||
    quotedMsg?.videoMessage ||
    null

  const isImage = !!imageMessage
  const isVideo = !!videoMessage

  if (!isImage && !isVideo) return

  await conn.sendMessage(from, {
    react: { text: '⏳', key: m.key }
  })

  const msg = isImage ? imageMessage : videoMessage
  const dlType = isImage ? 'image' : 'video'

  const stream = await downloadContentFromMessage(msg, dlType)
  let buffer = Buffer.from([])
  for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk])

  const ts = Date.now()
  const input = `./temp_${ts}.${isImage ? 'jpg' : 'mp4'}`
  const output = `./temp_${ts}.webp`

  await fs.promises.writeFile(input, buffer)

  // ✅ ÚNICO CAMBIO AQUÍ (transparent → white@0.0)
  const baseContain =
    'fps=15,' +
    'scale=512:512:force_original_aspect_ratio=decrease,' +
    'pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0.0,' +
    'format=rgba'

  const geqCircle = "geq=lum='p(X,Y)':a='if(lte(hypot(X-256,Y-256),256),255,0)'"

  const vf =
    opt === 'crop' ? baseContain :
    opt === 'circle' ? `${baseContain},${geqCircle}` :
    opt === 'bw' ? `${baseContain},hue=s=0` :
    opt === 'invert' ? `${baseContain},negate` :
    opt === 'blur' ? `${baseContain},gblur=sigma=6` :
    opt === 'pixel' ? `${baseContain},scale=128:128:flags=neighbor,scale=512:512:flags=neighbor` :
    opt === 'sepia' ? `${baseContain},colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131` :
    opt === 'neon' ? `${baseContain},edgedetect=low=0.08:high=0.2` :
    baseContain

  const ffmpegCmd = isVideo
    ? `ffmpeg -y -i "${input}" -t 8 -an -vf "${vf}" -loop 0 -pix_fmt yuva420p "${output}"`
    : `ffmpeg -y -i "${input}" -an -vf "${vf}" -loop 0 -pix_fmt yuva420p "${output}"`

  try {
    await execAsync(ffmpegCmd)

    const nombreBot = globalThis.nombrebot || 'Sticker Bot'
    const creador = m.pushName || 'Usuario'
    const fecha = new Date().toLocaleDateString('es-ES')

    const sticker = new Sticker(output, {
      pack: nombreBot,
      author: `${creador} • ${fecha}`,
      type: 'full',
      quality: 100
    })

    const stickerBuffer = await sticker.toBuffer()

    await conn.sendMessage(from, { sticker: stickerBuffer }, { quoted: m })

    await conn.sendMessage(from, {
      react: { text: '✔️', key: m.key }
    })

  } catch (e) {
    await conn.sendMessage(from, {
      react: { text: '❌', key: m.key }
    })
  } finally {
    if (fs.existsSync(input)) await fs.promises.unlink(input)
    if (fs.existsSync(output)) await fs.promises.unlink(output)
  }
}

handler.help = ['sticker']
handler.tags = ['sticker']
handler.command = ['sticker', 's']
handler.register = true

export default handler
