<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay show" @click.self="$emit('update:show', false)">
      <div class="modal" style="width: 800px; max-width: 90vw; max-height: 80vh; overflow-y: auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3>🔍 Compare Versions</h3>
          <button class="btn btn-sm" @click="$emit('update:show', false)" style="background: transparent; border: none; color: var(--text-dim); font-size: 1.2rem; cursor: pointer;">✕</button>
        </div>
        <div v-if="version1 && version2" style="margin-bottom: 8px;">
          <span style="font-size: 0.85rem; color: var(--text-dim);">{{ formatDate(version1.created_at) }}</span>
          <span style="margin: 0 8px;">⇄</span>
          <span style="font-size: 0.85rem; color: var(--text-dim);">{{ formatDate(version2.created_at) }}</span>
        </div>
        <div v-if="version1 && version2" style="font-family: Consolas, 'Andale Mono WT', monospace; white-space: pre-wrap; word-break: break-all; font-size: 0.85rem; color: var(--text); line-height: 1.4; margin: 0; overflow-x: hidden;">
          <template v-for="(line, idx) in diffLines" :key="idx">
            <div :style="{ background: line.type === 'removed' ? 'rgba(255,0,0,0.1)' : line.type === 'added' ? 'rgba(0,255,0,0.1)' : 'rgba(128,128,128,0.1)', margin: 0, padding: 0 }">
              {{ idx + 1 }} {{ line.text }}
            </div>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  show: Boolean,
  version1: Object,
  version2: Object,
})

const emit = defineEmits(['update:show', 'select'])

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

const diffLines = computed(() => {
  if (!props.version1 || !props.version2) return []
  const aLines = props.version1.content.split('\n')
  const bLines = props.version2.content.split('\n')
  const result = []
  let i = 0, j = 0
  while (i < aLines.length || j < bLines.length) {
    if (i < aLines.length && j < bLines.length && aLines[i] === bLines[j]) {
      result.push({ text: escapeHtml(aLines[i]), type: 'same' })
      i++; j++
    } else {
      if (i < aLines.length) {
        result.push({ text: escapeHtml(aLines[i]), type: 'removed' })
        i++
      }
      if (j < bLines.length) {
        result.push({ text: escapeHtml(bLines[j]), type: 'added' })
        j++
      }
    }
  }
  return result
})
</script>
