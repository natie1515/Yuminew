const config = {
  nombrebot: 'Meow WaBot',
  moneda: '$ᴅᴏʟᴀʀᴇs',
  apikey: '', // Pon tu apikey aqui, consiguela en: https://api-adonix.ultraplus.click
  prefijo: '.',

  owner: [
    '559296077349@s.whatsapp.net',
    '526241922235@s.whatsapp.net',
    '51921826291@s.whatsapp.net'
  ],

  restrict: false
}

try {
  if (!globalThis.nombrebot) globalThis.nombrebot = config.nombrebot
  if (!globalThis.moneda) globalThis.moneda = config.moneda
  if (!globalThis.prefijo) globalThis.prefijo = config.prefijo
  if (!globalThis.apikey) globalThis.apikey = config.apikey
} catch {}

export default config
