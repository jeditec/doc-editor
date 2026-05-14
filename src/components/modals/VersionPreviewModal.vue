<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay show" @click.self="$emit('update:show', false)">
      <div class="modal" style="width: 600px; max-width: 90vw; max-height: 80vh; overflow-y: auto;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
          <h3>👁 Preview</h3>
          <button class="btn btn-sm" @click="$emit('update:show', false)" style="background: transparent; border: none; color: var(--text-dim); font-size: 1.2rem; cursor: pointer;">✕</button>
        </div>
        <pre style="white-space: pre-wrap; word-break: break-all; font-size: 0.85rem; color: var(--text); line-height: 1.6; margin: 0; overflow-x: hidden;">{{ content }}</pre>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
defineProps({ show: Boolean, content: { type: String, default: '' } })
defineEmits(['update:show'])
</script>
