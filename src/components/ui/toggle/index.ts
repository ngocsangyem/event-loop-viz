import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Toggle } from './Toggle.vue'

export const toggleVariants = cva(
  'text-foreground-2 hover:text-foreground aria-pressed:bg-accent aria-pressed:text-foreground aria-invalid:border-destructive data-[state=on]:bg-accent data-[state=on]:text-foreground gap-1 font-mono text-xs font-medium uppercase tracking-[0.02em] transition-colors duration-(--motion-fast) [&_svg:not([class*=size-])]:size-4 group/toggle hover:bg-accent inline-flex items-center justify-center whitespace-nowrap outline-none focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        outline: 'border-border hover:bg-accent border bg-transparent data-[state=on]:border-foreground aria-pressed:border-foreground',
      },
      size: {
        default: 'h-8 min-w-8 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
        sm: 'h-7 min-w-7 rounded-[min(var(--radius-md),12px)] px-2.5 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*=size-])]:size-3.5',
        lg: 'h-9 min-w-9 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export type ToggleVariants = VariantProps<typeof toggleVariants>
