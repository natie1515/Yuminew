const handler = async (m) => {
  return m.reply(
    '「✦」El *comando* está desactivado actualmente.\n' +
    '「✦」Los memes no están disponibles por ahora.\n' +
    '> ✿ Intenta más tarde\n' +
    '> ✿ Gracias por tu comprensión'
  )
}

handler.command = ['meme']
handler.help = ['meme']
handler.tags = ['fun']

export default handler
