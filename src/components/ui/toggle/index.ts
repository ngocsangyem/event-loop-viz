import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Toggle } from './Toggle.vue'

// Mirrors the Button rules: pressed = hover-row fill, plus an ink border on the outline variant.
export const toggleVariants = cva(
  'text-foreground-2 hover:text-foreground aria-pressed:bg-accent aria-pressed:text-foreground aria-invalid:border-destructive data-[state=on]:bg-accent data-[state=on]:text-foreground gap-[5px] font-mono text-xs leading-none font-medium uppercase tracking-[0.02em] transition-colors duration-(--motion-fast) ease-(--ease-out) [&_svg:not([class*=size-])]:size-4 group/toggle hover:bg-accent inline-flex items-center justify-center whitespace-nowrap outline-none disabled:pointer-events-none disabled:opacity-35 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        outline: 'border-border hover:bg-accent border bg-transparent data-[state=on]:border-foreground aria-pressed:border-foreground',
      },
      size: {
        default: 'h-(--control-md) min-w-(--control-md) px-[9px]',
        sm: 'h-(--control-sm) min-w-(--control-sm) px-[9px] [&_svg:not([class*=size-])]:size-3.5',
        lg: 'h-(--control-lg) min-w-(--control-lg) px-3',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export type ToggleVariants = VariantProps<typeof toggleVariants>
