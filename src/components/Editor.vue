<template>
  <div style="display: flex; flex-direction: column; flex: 1; overflow: hidden;" id="editorContainer">
    <div class="toolbar">
      <div class="toolbar-left">
        <button class="toggle-sidebar" @click="$emit('toggle-sidebar')" title="Toggle sidebar">☰</button>
        <button class="btn btn-new-doc" @click="$emit('new-doc')" title="New document">＋ New Doc</button>
        <input
          type="text"
          class="title-input"
          id="titleInput"
          :value="currentDoc?.title"
          placeholder="Document title..."
          @input="$emit('update:title', $event.target.value)"
        />
        <div style="display: flex; gap: 4px; align-items: center;">
          <select class="category-select" id="categorySelect" :value="currentDoc?.category || ''" @change="$emit('update:category', $event.target.value)">
            <option value="">All</option>
            <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
          </select>
        </div>
        <select class="theme-select" :value="modelValue" @change="$emit('theme-change', $event.target.value)" style="max-width: 220px;">
          <optgroup label="── Dark ──">
            <option v-for="t in dark" :key="t.value" :value="t.value">{{ t.label }}</option>
          </optgroup>
          <optgroup label="── Light ──">
            <option v-for="t in light" :key="t.value" :value="t.value">{{ t.label }}</option>
          </optgroup>
        </select>
      </div>
      <div class="toolbar-right">
        <span class="save-status" id="saveStatus">🟢</span>
        <span class="meta-info" id="metaInfo">{{ formatDate }}</span>
        <span class="char-count" id="charCount">{{ currentDoc?.content?.length || 0 }} chars</span>
        <button class="btn btn-sm" @click="$emit('save-version')" title="Save version (Ctrl+Shift+S)">💾 Save version</button>
        <button class="btn btn-sm" @click="$emit('open-history')" id="historyBtn" title="Version history">📜 History</button>
      </div>
    </div>
    <div class="editor-area">
      <textarea
        class="editor-textarea"
        id="contentArea"
        :value="currentDoc?.content"
        placeholder="Start writing..."
        @input="$emit('update:content', $event.target.value)"
      ></textarea>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { THEMES } from '../composables/useThemes'

defineProps({
  currentDoc: { type: Object, default: null },
  categories: { type: Array, default: () => [] },
  modelValue: { type: String, default: '' },
})

defineEmits([
  'update:title', 'update:content', 'update:category',
  'save', 'save-version', 'open-history', 'new-doc',
  'toggle-sidebar', 'theme-change',
])

const dark = THEMES.dark
const light = THEMES.light

const formatDate = computed(() => {
  if (!props.currentDoc) return ''
  return new Date(props.currentDoc.updated_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })
})
</script>
