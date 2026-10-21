/** The printed Run shortcut: ⌘↵ on Apple platforms, Ctrl↵ elsewhere (the editor binds Mod-Enter). */
export function runHotkeyLabel(platform: string = typeof navigator === 'undefined' ? '' : navigator.platform): string {
  return /Mac|iPhone|iPad|iPod/i.test(platform) ? '⌘↵' : 'Ctrl↵'
}
