<script setup lang="ts">
import { BookOpenIcon } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

/** What the simulator models; everything else in the Unsupported list throws. */
const SUPPORTED = [
  'Promise, async/await, generators, async generators, for await',
  'setTimeout, setInterval, clearTimeout, clearInterval',
  'queueMicrotask',
  'MessageChannel',
  'console.log / info / warn / error',
  'Date.now() and performance.now() (Virtual Clock)',
  'Math.random (seeded per Run)',
]
</script>

<template>
  <Popover>
    <PopoverTrigger as-child>
      <Button variant="ghost" size="sm">
        <BookOpenIcon />
        Supported APIs
      </Button>
    </PopoverTrigger>
    <PopoverContent align="start" class="w-80" data-testid="supported-apis">
      <ul class="list-disc space-y-1 pl-4 text-xs">
        <li v-for="item in SUPPORTED" :key="item">{{ item }}</li>
      </ul>
    </PopoverContent>
  </Popover>
</template>
