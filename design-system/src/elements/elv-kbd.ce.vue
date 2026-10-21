<script setup lang="ts">
/**
 * A printed hotkey (DESIGN.md · Signature moves): mono, bracket style, no box — `[⇧←]`.
 * The key text goes in the default slot. Hotkeys are decoration for sighted keyboard users;
 * the control that owns the key carries it in its accessible name.
 */
</script>

<template>
  <kbd class="kbd">[<slot />]</kbd>
</template>

<style>
:host {
  display: inline;
}
.kbd {
  font: 400 var(--text-label) / 16px var(--font-mono);
  letter-spacing: var(--tracking-label);
  color: var(--color-ink-3);
  white-space: nowrap;
}
</style>
