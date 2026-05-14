<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay show" @click.self="$emit('update:show', false)">
      <div class="modal" style="width: 600px; max-width: 90vw; max-height: 80vh; overflow-y: auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3>📜 Document History</h3>
          <button class="btn btn-sm" @click="$emit('update:show', false)">✕</button>
        </div>
        <div v-if="versions.length === 0" style="padding: 16px; text-align: center; color: var(--text-dim);">
          No version history yet.
        </div>
        <div v-else v-for="(v, i) in versions" :key="v.id"
          class="version-item" :id="`version-${v.id}`"
          :style="{ borderBottom: '1px solid var(--border)', padding: '12px', cursor: 'pointer', transition: 'background 0.15s' }"
          @click="$emit('compare', v.id)"
        >
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-bright);">{{ v.title }}</span>
            <span style="font-size: 0.7rem; color: var(--text-dim);">{{ formatDate(v.created_at) }}</span>
          </div>
          <div style="font-size: 0.75rem; color: var(--text-dim); margin-bottom: 8px;">
            {{ v.content.substring(0, 60).replace(/\n/g, ' ') || '(empty)' }}
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn btn-sm" @click.stop="$emit('restore', v.id)">
              {{ i === 0 ? '✓ Current' : '↻ Restore' }}
            </button>
            <button v-if="i !== 0" class="btn btn-sm" @click.stop="$emit('preview', v.content)">👁 Preview</button>
            <button class="btn btn-sm" @click.stop="$emit('compare', v.id)">⇄ Compare</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
defineProps({
  show: Boolean,
  versions: { type: Array, default: () => [] },
})
defineEmits(['update:show', 'restore', 'preview', 'compare'])

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}
</script>
