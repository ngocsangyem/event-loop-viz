import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Button } from './Button.vue'

// Heights come from the control tokens; cn() in Button.vue lets the size's padding/height beat the variant's.
export const buttonVariants = cva(
  'focus-visible:border-ring aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 border border-transparent bg-clip-padding font-mono text-xs leading-none font-medium uppercase tracking-[0.02em] aria-invalid:ring-1 transition-colors duration-(--motion-fast) ease-(--ease-out) [&_svg:not([class*=size-])]:size-4 group/button inline-flex shrink-0 items-center justify-center gap-[5px] whitespace-nowrap outline-none select-none disabled:pointer-events-none disabled:opacity-35 [&_svg]:pointer-events-none [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary px-3 text-primary-foreground',
        outline: 'border-border bg-transparent px-3 text-foreground hover:bg-accent aria-expanded:border-foreground aria-expanded:bg-accent aria-pressed:border-foreground aria-pressed:bg-accent',
        secondary: 'bg-transparent px-[9px] text-foreground hover:bg-accent aria-expanded:bg-accent',
        pressed: 'border-foreground bg-accent px-3 text-foreground',
        ghost: 'px-[9px] text-foreground-2 hover:bg-accent hover:text-foreground aria-expanded:bg-accent aria-expanded:text-foreground',
        destructive: 'border-destructive bg-transparent px-3 text-destructive hover:bg-error-soft',
        link: 'px-0 text-brand-text underline-offset-4 hover:underline',
      },
      size: {
        'default': 'h-(--control-md)',
        'xs': 'h-6 gap-1 text-xs [&_svg:not([class*=size-])]:size-3',
        'sm': 'h-(--control-sm) [&_svg:not([class*=size-])]:size-3.5',
        'lg': 'h-(--control-lg)',
        'touch': 'h-(--control-touch)',
        'icon': 'size-(--control-md) px-0',
        'icon-xs': 'size-6 px-0 [&_svg:not([class*=size-])]:size-3',
        'icon-sm': 'size-(--control-sm) px-0',
        'icon-lg': 'size-(--control-lg) px-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)
export type ButtonVariants = VariantProps<typeof buttonVariants>
