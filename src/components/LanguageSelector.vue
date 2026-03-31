<template>
  <div class="lang-selector">
    <button
      v-for="(meta, lang) in LANGUAGES"
      :key="lang"
      class="lang-tab"
      :class="{ active: modelValue === lang }"
      @click="emit('update:modelValue', lang as Language)"
    >
      <span class="lang-icon">{{ ICONS[lang as Language] }}</span>
      {{ meta.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { LANGUAGES } from '../types/runner'
import type { Language } from '../types/runner'

defineProps<{ modelValue: Language }>()
const emit = defineEmits<{ 'update:modelValue': [lang: Language] }>()

const ICONS: Record<Language, string> = {
  python: '🐍',
  ruby: '💎',
  lua: '🌙',
  c: '⚙',
  cpp: '⚡',
}
</script>

<style scoped>
.lang-selector {
  display: flex;
  gap: 4px;
  background: #0d1117;
  border-radius: 8px;
  padding: 3px;
}

.lang-tab {
  align-items: center;
  background: transparent;
  border: none;
  border-radius: 6px;
  color: #8b949e;
  cursor: pointer;
  display: flex;
  font-size: 13px;
  font-weight: 500;
  gap: 6px;
  padding: 5px 13px;
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
}

.lang-tab:hover {
  background: #21262d;
  color: #e0e0e0;
}

.lang-tab.active {
  background: #21262d;
  color: #e0e0e0;
  font-weight: 600;
}

.lang-icon {
  font-size: 14px;
}
</style>
