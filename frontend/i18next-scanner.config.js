const fs = require("fs");
const path = require("path");

module.exports = {
  input: [
    "src/**/*.{js,jsx,ts,tsx}",   // Archivos a analizar
    "!src/locales/**"             // Evitar volver a leer traducciones
  ],

  output: "./",                   // Ruta base (no es donde guarda JSON)

  options: {
    debug: false,
    removeUnusedKeys: false,
    sort: true,                   // Ordena JSON automáticamente

    // Detecta funciones para extraer claves
    func: {
      list: ["t", "i18n.t"],
      extensions: [".js", ".jsx", ".ts", ".tsx"],
    },

    // Detecta uso en componentes <Trans>
    trans: {
      component: "Trans",
      i18nKey: "i18nKey",
      extensions: [".js", ".jsx", ".ts", ".tsx"],
      fallbackKey: function(ns, value) {
        return value;
      }
    },

    lngs: ["es", "en"],           // idiomas
    ns: ["translation"],          // namespace
    defaultLng: "es",
    defaultNs: "translation",

    resource: {
      loadPath: "src/locales/{{lng}}/{{ns}}.json",
      savePath: "src/locales/{{lng}}/{{ns}}.json",
      jsonIndent: 2,
      lineEnding: "\n"
    },

    interpolation: {
      prefix: "{{",
      suffix: "}}"
    }
  },

  // Se ejecuta al generar archivos — crea carpetas si faltan
  transform: function customTransform(file, enc, done) {
    this.parser.parseFuncFromString(file.contents.toString(enc));
    done();
  }
};
