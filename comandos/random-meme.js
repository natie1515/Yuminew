import axios from 'axios'
const {
  generateWAMessageFromContent,
  prepareWAMessageMedia
} = (await import("@whiskeysockets/baileys")).default

const handler = async (m, { conn }) => {
  try {
    const subs = [
      'SpanishMemes',
      'MemesESP',
      'MemesEnEspanol',
      'MexicoMemes'
    ]

    let data
    let intentos = 0

    // 🔁 Reintento seguro (máx 5)
    while (!data && intentos < 5) {
      intentos++
      const sub = subs[Math.floor(Math.random() * subs.length)]
      const res = await axios.get(`https://meme-api.com/gimme/${sub}`)

      if (res.data && !res.data.nsfw && !res.data.spoiler) {
        data = res.data
      }
    }

    if (!data || !data.url) {
      return conn.sendMessage(m.chat, { text: '🌾 No encontré memes válidos.' }, { quoted: m })
    }

    const memeUrl = data.url

    const media = await prepareWAMessageMedia(
      { image: { url: memeUrl } },
      { upload: conn.waUploadToServer }
    )

    const msg = generateWAMessageFromContent(
      m.chat,
      {
        viewOnceMessage: {
          message: {
            interactiveMessage: {
              header: {
                title: '😹 Meme en Español',
                hasMediaAttachment: true,
                imageMessage: media.imageMessage
              },
              body: {
                text: 'Aquí tienes tu meme random 🔥'
              },
              footer: {
                text: 'YUMI CLUB'
              },
              nativeFlowMessage: {
                buttons: [
                  {
                    name: 'quick_reply',
                    buttonParamsJson: JSON.stringify({
                      display_text: '😂 Otro meme',
                      id: '.meme'
                    })
                  },
                  {
                    name: 'cta_url',
                    buttonParamsJson: JSON.stringify({
                      display_text: '🖼️ Ver imagen',
                      url: memeUrl
                    })
                  }
                ]
              }
            }
          }
        }
      },
      { quoted: m }
    )

    await conn.relayMessage(m.chat, msg.message, {})

  } catch (err) {
    console.error('❌ MEME ERROR:', err)
    await conn.sendMessage(
      m.chat,
      { text: '❌ Error técnico al generar el meme.' },
      { quoted: m }
    )
  }
}

handler.command = ['meme', 'memes']
handler.help = ['meme']
handler.tags = ['fun']

export default handlerexport default handler
