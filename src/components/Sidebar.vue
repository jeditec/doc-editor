<template>
  <aside class="sidebar" :class="{ collapsed: !sidebarOpen }">
    <div class="sidebar-header">
      <h1>📝 Doc Editor</h1>
      <div class="search-box">
        <input type="text" id="searchInput" placeholder="Search documents..." @input="$emit('search')" />
      </div>
    </div>
    <div class="sidebar-actions">
      <div class="btn-flex">
        <button class="btn btn-sm" @click="$emit('export')">🔒 Export</button>
        <button class="btn btn-sm" @click="$emit('import')">🔓 Import</button>
      </div>
    </div>
    <CategoryFilters
      :categories="categories"
      :active-category="activeCategory"
      @filter-category="(cat) => $emit('filter-category', cat)"
      @delete-category="(cat) => $emit('delete-category', cat)"
      @add-category="$emit('add-category')"
    />
    <DocumentList
      :documents="documents"
      :active-category="activeCategory"
      :current-doc-id="currentDocId"
      @open-doc="(id) => $emit('open-doc', id)"
      @quick-delete="(id) => $emit('quick-delete', id)"
    />
  </aside>
</template>

<script setup>
defineProps({
  sidebarOpen: Boolean,
  categories: { type: Array, default: () => [] },
  activeCategory: { type: String, default: 'all' },
  documents: { type: Array, default: () => [] },
  currentDocId: Number,
})

defineEmits([
  'toggle-sidebar',
  'filter-category',
  'delete-category',
  'add-category',
  'export',
  'import',
  'open-doc',
  'quick-delete',
  'search',
])
</script>
