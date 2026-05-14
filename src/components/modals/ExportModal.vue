<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay show" @click.self="$emit('update:show', false)">
      <div class="modal">
        <h3>🔒 Export Encrypted Backup</h3>
        <p style="color: var(--text-dim); font-size: 0.82rem; margin-bottom: 12px;">
          Your documents will be encrypted with the password you provide.
        </p>
        <input
          type="password"
          id="exportPasswordInput"
          placeholder="Enter encryption password..."
          @keydown.enter="$emit('export')"
        />
        <p id="exportStatus" style="font-size: 0.82rem; margin-bottom: 8px; min-height: 1.2em;"></p>
        <div class="modal-actions">
          <button class="btn" @click="$emit('update:show', false)">Cancel</button>
          <button class="btn btn-accent" @click="$emit('export')">Export</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { nextTick, watch } from 'vue'

const props = defineProps({ show: Boolean })
const emit = defineEmits(['update:show', 'export'])

watch(() => props.show, (val) => {
  if (val) {
    nextTick(() => {
      const el = document.getElementById('exportPasswordInput')
      if (el) {
        el.value = ''
        el.focus()
      }
    })
  }
})
</script>
