<script setup lang="ts">
import type { SolidPaths, Tone } from './iso-kit'

withDefaults(
  defineProps<{
    paths: SolidPaths
    tone?: Tone
    crease?: Tone | 'none'
    halo?: boolean
    /** The one accent part the reader should watch. */
    lit?: boolean
    flat?: boolean
  }>(),
  { tone: 'hi', crease: 'faint', halo: false, lit: false, flat: false },
)
</script>

<!-- Markup and class names mirror the kit's SVG strings so scene.css styles both alike. -->
<template>
  <g
    class="iso-solid"
    :data-lit="lit ? '' : undefined"
    :data-seamless="paths.seamless ? '' : undefined"
  >
    <path v-if="halo" class="iso-halo" :d="paths.fill" />
    <path class="iso-fill" :d="paths.fill" />
    <template v-if="!flat">
      <template v-for="(d, shade) in paths.shades" :key="shade">
        <path v-if="d" class="iso-shade" :data-shade="shade" :d="d" />
      </template>
      <path class="iso-top" :d="paths.top" />
    </template>
    <path
      v-if="crease !== 'none' && paths.crease"
      class="iso-line iso-crease"
      :data-tone="crease"
      :d="paths.crease"
    />
    <path
      v-if="crease !== 'none' && paths.bevel"
      class="iso-line iso-bevel"
      :data-tone="crease"
      :d="paths.bevel"
    />
    <slot name="inner" />
    <path class="iso-line iso-edge" :data-tone="tone" :d="paths.outline" />
    <slot />
  </g>
</template>
