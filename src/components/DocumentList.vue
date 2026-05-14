<template>
  <div class="doc-list" id="docList">
    <div v-if="documents.length === 0 && activeCategory === 'all'" class="empty-state">
      No documents yet.<br>Create one with <b>+ New Doc</b>
    </div>
    <div v-else-if="documents.length === 0" class="empty-state">
      No documents in this category.
    </div>
    <div v-else v-for="doc in filteredDocs" :key="doc.id" class="doc-item"
      :class="{ active: doc.id === currentDocId }">
      <div class="doc-item-wrapper">
        <div class="doc-item-info" @click="$emit('open-doc', doc.id)">
          <div class="doc-item-title">{{ doc.title }}</div>
          <div class="doc-item-meta">
            <span>{{ formatDate(doc.updated_at) }}</span>
            <span class="doc-item-cat">{{ doc.category || 'Uncategorized' }}</span>
          </div>
          <div class="doc-item-preview">{{ doc.content.substring(0, 80).replace(/\n/g, ' ') }}</div>
        </div>
        <button class="doc-item-delete" @click.stop="$emit('quick-delete', doc.id)" title="Delete">🗑️</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  documents: { type: Array, default: () => [] },
  activeCategory: { type: String, default: 'all' },
  currentDocId: Number,
})

defineEmits(['open-doc', 'quick-delete'])

const filteredDocs = computed(() => {
  return props.documents.filter(doc => {
    const isUntitled = doc.title.trim() === 'Untitled Document' || doc.title.trim() === ''
    const isEmpty = doc.content.trim() === ''
    return !(isUntitled && isEmpty)
  })
})

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}
</script>
