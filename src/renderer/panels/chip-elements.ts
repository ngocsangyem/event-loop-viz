/**
 * Every chip in the page by id. A row that is still leaving (under any list transition) keeps
 * its chip in the DOM for a moment, next to the chip's new home; it is not a place the chip is
 * in, so it is skipped. A second live chip with the same id would make flights ambiguous.
 */
export function chipElements(root: ParentNode = document): Map<string, HTMLElement> {
  const found = new Map<string, HTMLElement>()
  for (const el of root.querySelectorAll<HTMLElement>('[data-chip-id]')) {
    if (el.closest('[class*="-leave-active"]')) continue
    const id = el.dataset.chipId!
    if (found.has(id) && import.meta.env.DEV) console.warn(`Duplicate chip id in the DOM: ${id}`)
    found.set(id, el)
  }
  return found
}
