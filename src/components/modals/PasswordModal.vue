<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay show" @click.self="$emit('update:show', false)">
      <div class="modal">
        <h3>{{ title }}</h3>
        <input
          type="password"
          id="passwordInput"
          class="title-input"
          placeholder="Enter password..."
          @keydown.enter="confirm"
        />
        <div class="modal-actions">
          <button class="btn" @click="$emit('update:show', false)">Cancel</button>
          <button class="btn btn-accent" @click="confirm">Confirm</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { watch, nextTick } from 'vue'

const props = defineProps({ show: Boolean, title: { type: String, default: 'Password Required' } })
const emit = defineEmits(['update:show', 'confirm'])

function confirm() {
  const el = document.getElementById('passwordInput')
  emit('confirm', el?.value || '')
}

watch(() => props.show, (val) => {
  if (val) {
    nextTick(() => {
      const el = document.getElementById('passwordInput')
      if (el) {
        el.value = ''
        el.focus()
      }
    })
  }
})
</script>
