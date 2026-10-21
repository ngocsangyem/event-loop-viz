import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

export { default as Badge } from './Badge.vue'

// A Tag is text only: no fill, border or height. `secondary`/`outline` stay as aliases of `muted`/`default`
// so older call sites keep their meaning.
export const badgeVariants = cva(
  'gap-1 font-mono text-[11.5px] leading-none font-medium uppercase tracking-[0.02em] [&>svg]:size-3! group/badge inline-flex w-fit shrink-0 items-center whitespace-nowrap focus-visible:outline-2 [&>svg]:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'text-foreground',
        muted: 'text-muted-foreground',
        now: 'text-brand-text',
        stack: 'text-stack',
        job: 'text-job',
        task: 'text-task',
        webapi: 'text-webapi',
        console: 'text-console',
        error: 'text-error',
        warn: 'text-warn',
        secondary: 'text-muted-foreground',
        outline: 'text-foreground',
        destructive: 'text-destructive',
        ghost: 'text-foreground-2',
        link: 'text-brand-text underline-offset-4 hover:underline',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)
export type BadgeVariants = VariantProps<typeof badgeVariants>
