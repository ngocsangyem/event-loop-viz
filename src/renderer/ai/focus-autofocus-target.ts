/**
 * Focuses the panel's `[data-autofocus]` target: the question box, or Add API key without a key.
 * The prompt marks its wrapper, so when the target is not itself focusable the input inside gets focus.
 */
export function focusAutofocusTarget(root: HTMLElement | null | undefined): void {
  const target = root?.querySelector<HTMLElement>('[data-autofocus]')
  const focusable = target?.matches('input, button') ? target : target?.querySelector<HTMLElement>('input')
  focusable?.focus()
}
