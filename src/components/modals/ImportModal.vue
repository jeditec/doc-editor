<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay show" @click.self="$emit('update:show', false)">
      <div class="modal">
        <h3>🔓 Import Encrypted Backup</h3>
        <p style="color: var(--text-dim); font-size: 0.82rem; margin-bottom: 12px;">
          Select an encrypted backup file and enter the password used to create it.
        </p>
        <input
          type="password"
          id="importPasswordInput"
          placeholder="Enter decryption password..."
          @keydown.enter="handleImport"
        />
        <div style="margin: 12px 0;">
          <label style="display: block; font-size: 0.82rem; color: var(--text-dim); margin-bottom: 6px;">Backup file (.enc)</label>
          <input
            type="file"
            id="importFileInput"
            accept=".enc"
            ref="fileInput"
            style="width: 100%; padding: 8px; background: var(--bg-input); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 0.82rem;"
          />
        </div>
        <p id="importStatus" style="font-size: 0.82rem; margin-bottom: 8px; min-height: 1.2em;"></p>
        <div class="modal-actions">
          <button class="btn" @click="$emit('update:show', false)">Cancel</button>
          <button class="btn btn-accent" @click="handleImport">Import</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'

defineProps({ show: Boolean })
const emit = defineEmits(['update:show', 'import'])
const fileInput = ref(null)

function handleImport() {
  const el = document.getElementById('importFileInput')
  emit('import', el?.files?.[0] || null)
}

watch(() => props.show, (val) => {
  if (val) {
    nextTick(() => {
      const el = document.getElementById('importPasswordInput')
      if (el) el.focus()
    })
  }
})
</script>
