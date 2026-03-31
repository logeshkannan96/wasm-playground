<template>
  <div ref="containerRef" class="output-pane">
    <template v-if="segments.length === 0">
      <span class="placeholder">Run your code to see output here...</span>
    </template>
    <template v-else>
      <span
        v-for="seg in segments"
        :key="seg.id"
        :class="['segment', seg.kind]"
        >{{ seg.text }}</span
      >
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import type { OutputSegment } from '../composables/useOutputLog'

const props = defineProps<{
  segments: OutputSegment[]
}>()

const containerRef = ref<HTMLElement | null>(null)

// Auto-scroll to bottom whenever new output arrives
watch(
  () => props.segments.length,
  async () => {
    await nextTick()
    if (containerRef.value) {
      containerRef.value.scrollTop = containerRef.value.scrollHeight
    }
  }
)

// Also scroll when last segment text grows (streaming chars)
watch(
  () => props.segments[props.segments.length - 1]?.text,
  async () => {
    await nextTick()
    if (containerRef.value) {
      containerRef.value.scrollTop = containerRef.value.scrollHeight
    }
  }
)
</script>

<style scoped>
.output-pane {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  background: #1a1a2e;
  font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
  font-size: 13px;
  line-height: 1.6;
  padding: 12px 16px;
  box-sizing: border-box;
  white-space: pre-wrap;
  word-break: break-all;
}

.placeholder {
  color: #555;
  font-style: italic;
}

.segment.stdout {
  color: #e0e0e0;
}

.segment.stderr {
  color: #ff6b6b;
}

.segment.system {
  color: #ffd93d;
}
</style>
