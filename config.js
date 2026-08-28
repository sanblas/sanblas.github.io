/**
 * CONFIGURACIÓN DEL TRACKER
 *
 * Edita este archivo para añadir/cambiar destinos.
 * No hace falta tocar tracker.js.
 */

window.SERPOAN_CONFIG = {
  appsScriptUrl:
    "https://script.google.com/macros/s/AKfycbz3N01x7eP1km7SNnCwou0VAn26p82i8DQXoyOVweAVSTD4vuEGd4NnycdfGSgjF3wv/exec",

  fallbackUrl: "https://www.google.com/",

  destinations: [
    /*
    EJEMPLO URL NORMAL
    {
      camp: "TOUR26",
      lang: "ES",
      action: "info",
      type: "URL",
      url: "https://TU-DESTINO-ES"
    },

    {
      camp: "TOUR26",
      lang: "EN",
      action: "info",
      type: "URL",
      url: "https://TU-DESTINO-EN"
    },
    */

    /*
    WHATSAPP ES
    */
    {
      camp: "TOUR26",
      lang: "ES",
      action: "whatsapp",
      type: "WHATSAPP",
      url: "https://wa.me/34922097040",
      text:
        "Hola,\n" +
        "estoy interesado/a en la visita guiada de San Blas Reserva Ambiental.\n" +
        "¿Podrían darme más información?"
    },

    /*
    WHATSAPP EN
    */
    {
      camp: "TOUR26",
      lang: "EN",
      action: "whatsapp",
      type: "WHATSAPP",
      url: "https://wa.me/34922097040",
      text:
        "Hello,\n" +
        "I am interested in the guided tour at San Blas Reserva Ambiental.\n" +
        "Could you give me more information?"
    }
  ]
};
