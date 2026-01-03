import axios from 'axios'
const {
  proto,
  generateWAMessageFromContent
} = (await import("@whiskeysockets/baileys")).default

const handler = async (m, { conn }) => {
  try {
    const res = await axios.get('https://g-mini-ia.vercel.app/api/meme')
    const memeUrl = res.data?.url

    if (!memeUrl) {
      return conn.sendMessage(m.chat, { text: '🌾 No se pudo obtener el meme.' }, { quoted: m })
    }

    const fkontak = {
      key: {
        participants: "0@s.whatsapp.net",
        remoteJid: "status@broadcast",
        fromMe: false,
        id: "Halo"
      },
      message: {
        contactMessage: {
          vcard: `BEGIN:VCARD
VERSION:3.0
N:Bot;Meme;;;
FN:${m.pushName}
TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}
END:VCARD`
        }
      }
    }

    const msg = generateWAMessageFromContent(
      m.chat,
      {
        interactiveMessage: {
          header: {
            title: "➭ Meme Random",
            hasMediaAttachment: true,
            image: { url: memeUrl }
          },
          body: {
            text: "> ✿ Aquí tienes tu *meme*"
          },
          footer: {
            text: "☃️"
          },
          nativeFlowMessage: {
            buttons: [
              {
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                  display_text: "✐ Abrir Imagen",
                  url: memeUrl
                })
              },
              {
                name: "cta_copy",
                buttonParamsJson: JSON.stringify({
                  display_text: "⊹ Copiar Enlace",
                  copy_code: memeUrl
                })
              },
              {
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                  display_text: "Otro",
                  id: ".meme"
                })
              }
            ]
          }
        }
      },
      { quoted: fkontak }
    )

    await conn.relayMessage(m.chat, msg.message, {})

  } catch (e) {
    console.error(e)
    await conn.sendMessage(
      m.chat,
      { text: '❌ Error al generar el meme.' },
      { quoted: m }
    )
  }
}

handler.command = ['meme']
handler.help = ['meme']
handler.tags = ['fun']

export default handler
