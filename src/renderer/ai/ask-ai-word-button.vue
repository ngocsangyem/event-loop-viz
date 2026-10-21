<script setup lang="ts">
/**
 * An action printed as an underlined mono word (RETRY, JUMP TO STEP 20). Used inside prose and
 * admonitions, where a full Button would shout over the text it belongs to.
 */
</script>

<template>
  <button
    type="button"
    class="text-foreground hover:bg-accent -mx-1 px-1 font-mono text-xs leading-5 font-medium tracking-[0.02em] uppercase underline underline-offset-[3px] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
  >
    <slot />
  </button>
</template>
