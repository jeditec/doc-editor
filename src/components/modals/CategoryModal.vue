<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay show" @click.self="$emit('update:show', false)">
      <div class="modal">
        <h3>➕ New Category</h3>
        <input
          type="text"
          id="newCategoryInput"
          placeholder="Category name..."
          @keydown.enter="submit"
        />
        <p v-if="duplicate" style="color: var(--danger); font-size: 0.82rem; margin-top: 4px; margin-bottom: 8px;">
          ⚠ This category already exists.
        </p>
        <div class="modal-actions">
          <button class="btn" @click="$emit('update:show', false)">Cancel</button>
          <button class="btn btn-accent" @click="submit">Add</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { onMounted, nextTick } from 'vue'

defineProps({ show: Boolean, duplicate: Boolean })
defineEmits(['update:show', 'submit'])

function submit() {
  const input = document.getElementById('newCategoryInput')
  emit('submit', input?.value || '')
}

onMounted(() => {
  nextTick(() => {
    const input = document.getElementById('newCategoryInput')
    if (input) input.focus()
  })
})
</script>
