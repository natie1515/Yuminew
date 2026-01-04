import axios from 'axios'
const {
  generateWAMessageFromContent,
  prepareWAMessageMedia
} = (await import("@whiskeysockets/baileys")).default

const handler = async (m, { conn }) => {
  try {
    // 🌎 Lista de subreddits en español / latinos
    const subs = [
      'SpanishMemes',
      'MemesESP',
      'MemesEnEspanol',
      'LatinoPeopleTwitter',
      'MexicoMemes'
    ]

    const sub = subs[Math.floor(Math.random() * subs.length)]

    // 🔥 API Meme
    const res = await axios.get(`https://meme-api.com/gimme/${sub}`)
    const data = res.data

    // ❌ Validaciones
    if (!data || !data.url) {
      return conn.sendMessage(m.chat, { text: '🌾 No se pudo obtener el meme.' }, { quoted: m })
    }

    // 🚫 Filtro NSFW
    if (data.nsfw || data.spoiler) {
      return handler(m, { conn }) // vuelve a intentar otro meme
    }

    const memeUrl = data.url

    // 🖼️ Prepara imagen
    const mediaMessage = await prepareWAMessageMedia(
      { image: { url: memeUrl } },
      { upload: conn.waUploadToServer }
    )

    // 👤 Fake contacto (estilo pro)
    const fkontak = {
      key: {
        participants: "0@s.whatsapp.net",
        remoteJid: "status@broadcast",
        fromMe: false,
        id: "Meme"
      },
      message: {
        contactMessage: {
          vcard: `BEGIN:VCARD
VERSION:3.0
N:Bot;Meme;;;
FN:${m.pushName}
item1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}
item1.X-ABLabel:Usuario
END:VCARD`
        }
      },
      participant: "0@s.whatsapp.net"
    }

    // 💬 Mensaje interactivo
    const interactiveMsg = generateWAMessageFromContent(
      m.chat,
      {
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2
            },
            interactiveMessage: {
              body: {
                text: `> ✿ *Meme en español* 😹\n> 🌎 Fuente: *${sub}*`
              },
              footer: {
                text: "☃️ Zona de Memes"
              },
              header: {
                title: "➭ Meme Random",
                hasMediaAttachment: true,
                imageMessage: mediaMessage.imageMessage
              },
              nativeFlowMessage: {
                buttons: [
                  {
                    name: "quick_reply",
                    buttonParamsJson: JSON.stringify({
                      display_text: "😂 Otro Meme",
                      id: ".meme"
                    })
                  },
                  {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                      display_text: "🖼️ Abrir Imagen",
                      url: memeUrl,
                      merchant_url: memeUrl
                    })
                  },
                  {
                    name: "cta_copy",
                    buttonParamsJson: JSON.stringify({
                      display_text: "🔗 Copiar Enlace",
                      id: "copy_meme",
                      copy_code: memeUrl
                    })
                  }
                ]
              },
              contextInfo: {
                mentionedJid: [m.sender],
                forwardingScore: 999,
                isForwarded: true,
                externalAdReply: {
                  title: "🌾 Meme Latino",
                  body: "Disfruta memes en español 😹",
                  thumbnailUrl: memeUrl,
                  sourceUrl: memeUrl,
                  mediaType: 1,
                  renderLargerThumbnail: true
                }
              }
            }
          }
        }
      },
      { quoted: fkontak }
    )

    await conn.relayMessage(m.chat, interactiveMsg.message, {})

  } catch (e) {
    console.error(e)
    await conn.sendMessage(
      m.chat,
      { text: '❌ Error técnico al generar el meme.' },
      { quoted: m }
    )
  }
}

handler.command = ['meme']
handler.help = ['meme']
handler.tags = ['fun']

export default handler
