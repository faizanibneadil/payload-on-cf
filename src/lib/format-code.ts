export type FormatLanguage = 'html' | 'css' | 'javascript' | 'json'

const PARSER: Record<FormatLanguage, string> = {
  html: 'html',
  css: 'css',
  javascript: 'babel',
  json: 'json',
}

export const isFormattable = (language: string): language is FormatLanguage => language in PARSER

/** Prettier (standalone) browser me hi chalta hai — heavy hai isliye sirf use hone par dynamic import */
export async function formatCode(code: string, language: FormatLanguage): Promise<string> {
  const [prettier, babel, estree, html, postcss] = await Promise.all([
    import('prettier/standalone'),
    import('prettier/plugins/babel'),
    import('prettier/plugins/estree'),
    import('prettier/plugins/html'),
    import('prettier/plugins/postcss'),
  ])
  return prettier.format(code, {
    parser: PARSER[language],
    plugins: [html.default, postcss.default, babel.default, estree.default],
    tabWidth: 2,
    useTabs: false,
    semi: true,
    singleQuote: false,
    trailingComma: 'es5',
    printWidth: 80,
  })
}
