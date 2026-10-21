<script setup lang="ts">
/**
 * The Halt banner (DESIGN.md · Layout — desktop): a 44px strip, raised tone, 2px accent left rule.
 * Left to right: the mono label `▲ HALT · TASK BUDGET` in the accent, one Inter sentence (default
 * slot) saying why the Run stopped, then on the right an optional `TIMING-SENSITIVE` mono tag and
 * the `actions` slot (e.g. a RAISE BUDGET button). Announced politely via role=status.
 */
withDefaults(
  defineProps<{
    /** Label words after `HALT ·`, e.g. `TASK BUDGET`, `MICROTASK BUDGET`. */
    reason?: string
    /** The stop changes timing results; shows the TIMING-SENSITIVE tag. */
    timingSensitive?: boolean
  }>(),
  { reason: 'TASK BUDGET', timingSensitive: false },
)
</script>

<template>
  <div class="halt" role="status">
    <span class="label"><span aria-hidden="true">▲</span> HALT · {{ reason }}</span>
    <p class="sentence"><slot /></p>
    <span v-if="timingSensitive" class="tag">TIMING-SENSITIVE</span>
    <div class="actions"><slot name="actions" /></div>
  </div>
</template>

<style>
:host {
  display: block;
  min-width: 0;
}
.halt {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 44px;
  padding: 0 12px;
  background: var(--color-bg-raised);
  box-shadow: inset 2px 0 0 var(--brand);
  border-bottom: 1px solid var(--color-line-soft);
  color: var(--color-ink);
  font-family: var(--font-sans);
}
.label,
.tag {
  flex: none;
  font: 500 var(--text-label) / 16px var(--font-mono);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  white-space: nowrap;
}
.label {
  color: var(--brand-text);
}
.tag {
  font-size: var(--text-meta);
  font-weight: 400;
  color: var(--color-ink-3);
}
.sentence {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  font: 400 var(--text-body) / 20px var(--font-sans);
  color: var(--color-ink-2);
}
.actions {
  flex: none;
  display: flex;
  align-items: center;
}
</style>
