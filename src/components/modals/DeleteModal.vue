<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay show" @click.self="$emit('update:show', false)">
      <div class="modal">
        <h3>🗑️ Delete Document?</h3>
        <p style="color: var(--text-dim); font-size: 0.85rem; margin-bottom: 16px;">This action cannot be undone.</p>
        <div class="modal-actions">
          <button class="btn" @click="$emit('update:show', false)">Cancel</button>
          <button class="btn btn-danger" @click="$emit('confirm')">Delete</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
defineProps({ show: Boolean })
defineEmits(['update:show', 'confirm'])
</script>
