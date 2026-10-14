import { common, createLowlight } from 'lowlight'

// "common" bundle me js, ts, css, json, python, bash waghera aa jate hain
export const lowlight = createLowlight(common)
lowlight.register('html', common.xml)
lowlight.register('js', common.javascript)
lowlight.register('ts', common.typescript)
