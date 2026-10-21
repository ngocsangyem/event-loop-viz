<script setup lang="ts">
/**
 * An admonition (DESIGN.md · Admonition): raised fill, 2px left rule in its tone's hue, a mono
 * uppercase label led by the tone's glyph, then an Inter body in ink-2. Tones: `note` ※ (task
 * blue — the Why rail's explainer), `halt` ▲ (accent), `error` ⚠ (red — Unsupported API, 401),
 * `syntax` ↯ (red — SyntaxError), `success` ✓ (console green — interview one-liner), `turn` ❯
 * (accent — the tour's coach prompt). Slots: default (body), `actions` (link actions below it).
 */
import { computed } from 'vue'

type Tone = 'note' | 'halt' | 'error' | 'syntax' | 'success' | 'turn'

const props = withDefaults(
  defineProps<{
    tone?: Tone
    /** Mono label after the glyph, e.g. "UNSUPPORTED API · RUN BLOCKED". Defaults per tone. */
    label?: string
  }>(),
  { tone: 'note', label: undefined },
)

const TONES: Record<Tone, { glyph: string; label: string; hue: string }> = {
  note: { glyph: '※', label: 'NOTE', hue: 'var(--task)' },
  halt: { glyph: '▲', label: 'HALT', hue: 'var(--brand)' },
  error: { glyph: '⚠', label: 'ERROR', hue: 'var(--error)' },
  syntax: { glyph: '↯', label: 'SYNTAXERROR', hue: 'var(--error)' },
  success: { glyph: '✓', label: 'OK', hue: 'var(--console)' },
  turn: { glyph: '❯', label: 'YOUR TURN', hue: 'var(--brand)' },
}
const tone = computed(() => TONES[props.tone] ?? TONES.note)
const role = computed(() => (props.tone === 'error' || props.tone === 'syntax' ? 'alert' : 'note'))
</script>

<template>
  <aside class="adm" :style="{ '--hue': tone.hue }" :role="role">
    <p class="label"><span aria-hidden="true">{{ tone.glyph }}</span> {{ label ?? tone.label }}</p>
    <div class="body"><slot /></div>
    <div class="actions"><slot name="actions" /></div>
  </aside>
</template>

<style>
:host {
  display: block;
}
.adm {
  display: grid;
  gap: 4px;
  padding: 10px 12px;
  background: var(--color-bg-raised);
  box-shadow: inset 2px 0 0 var(--hue);
  font-family: var(--font-sans);
}
.label {
  margin: 0;
  font: 500 var(--text-label) / 16px var(--font-mono);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--hue);
}
.body {
  font-size: var(--text-body);
  line-height: 22px;
  color: var(--color-ink-2);
}
.body ::slotted(code) {
  font: 400 var(--text-item) / 18px var(--font-mono);
  color: var(--color-ink);
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
}
.actions:not(:has(*)) {
  display: none;
}
</style>
