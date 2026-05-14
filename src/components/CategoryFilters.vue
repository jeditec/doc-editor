<template>
  <div class="category-filters" id="categoryFilters">
    <span
      class="cat-tag"
      :class="{ active: activeCategory === 'all' }"
      @click="$emit('filter-category', 'all')"
    >All</span>
    <template v-for="cat in sortedCategories" :key="cat">
      <span
        class="cat-tag"
        :class="{ active: activeCategory === cat }"
        @click="$emit('filter-category', cat)"
      >
        {{ cat }}
        <template v-if="cat.toLowerCase() !== 'general'">
          <button
            class="btn-icon cat-delete"
            @click.stop="$emit('delete-category', cat)"
            title="Delete category"
          >✕</button>
        </template>
      </span>
    </template>
    <button class="btn btn-sm" @click="$emit('add-category')" title="Add category">＋</button>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  categories: { type: Array, default: () => [] },
  activeCategory: { type: String, default: 'all' },
})

defineEmits(['filter-category', 'delete-category', 'add-category'])

const sortedCategories = computed(() => {
  return [...props.categories].sort((a, b) =>
    a.charAt(0).toUpperCase() + a.slice(1).toLowerCase()
      .localeCompare(b.charAt(0).toUpperCase() + b.slice(1).toLowerCase())
  )
})
</script>
