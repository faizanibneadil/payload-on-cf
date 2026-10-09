export function stateLabel(state: string, detail?: string): string | null {
  switch (state) {
    case 'starting':
      return 'Python: starting…'
    case 'ready':
      return 'Python: jedi'
    case 'failed':
      return 'Python: unavailable' + (detail ? ' — ' + detail : '')
    default:
      return null
  }
}
