<script setup lang="ts">
import { inject, useTemplateRef } from 'vue'
import type { Player } from '../../player/player'
import type { SameView } from '../use-playback'
import { CHIP_TRAVEL_KEY } from './chip-travel-keys'
import { useChipTravel } from './use-chip-travel'

const props = defineProps<{
  player: Player | null
  position: number
  source: string
  sameView?: SameView
  /** Length of one flight in milliseconds. */
  travelMs: number
}>()

const state = inject(CHIP_TRAVEL_KEY)
if (!state) throw new Error('ChipTravelLayer needs CHIP_TRAVEL_KEY provided by an ancestor')

const overlay = useTemplateRef<HTMLElement>('overlay')
useChipTravel({
  player: () => props.player,
  position: () => props.position,
  source: () => props.source,
  sameView: () => props.sameView,
  travelMs: () => props.travelMs,
  overlay: () => overlay.value,
  state,
})
</script>

<template>
  <!-- Flying copies of chips live here; they never take clicks and are not read out. -->
  <div ref="overlay" class="pointer-events-none fixed inset-0 z-30" aria-hidden="true" />
</template>
