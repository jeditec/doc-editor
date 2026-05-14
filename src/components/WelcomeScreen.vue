<template>
  <div class="welcome" id="welcome">
    <h2>Welcome to Doc Editor</h2>
    <p>A simple, local-first text editor. Your documents are saved in a SQLite database — no cloud, no tracking.</p>
    <div class="shortcut">
      Click <kbd>New Doc</kbd> to get started
    </div>
    <div style="margin-top: 24px;">
      <label style="font-size: 0.8rem; color: var(--text-dim); display: block; margin-bottom: 8px;">🎨 Theme</label>
      <select class="theme-select" :value="modelValue" @change="$emit('update:theme', $event.target.value)">
        <optgroup label="── Dark ──">
          <option v-for="t in dark" :key="t.value" :value="t.value">{{ t.label }}</option>
        </optgroup>
        <optgroup label="── Light ──">
          <option v-for="t in light" :key="t.value" :value="t.value">{{ t.label }}</option>
        </optgroup>
      </select>
    </div>
  </div>
</template>

<script setup>
import { THEMES } from '../composables/useThemes'

defineProps({
  modelValue: { type: String, default: '' },
})

defineEmits(['update:theme', 'new-doc'])

const dark = THEMES.dark
const light = THEMES.light
</script>
