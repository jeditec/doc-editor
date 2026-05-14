import { ref } from 'vue'

export function useCategories() {
  const categories = ref([])
  const activeCategory = ref('all')
  const pendingDeleteCategory = ref(null)

  function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  }

  async function fetchCategories() {
    const res = await fetch('/api/categories')
    categories.value = await res.json()
  }

  async function createCategory(name) {
    const canonical = capitalize(name.trim())
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: canonical })
    })
    const data = await res.json()
    if (data.created === false) return false
    await fetchCategories()
    return true
  }

  async function deleteCategory(name) {
    const res = await fetch(`/api/categories/${encodeURIComponent(name)}`, { method: 'DELETE' })
    if (!res.ok) {
      const errData = await res.json()
      throw new Error(errData.error || 'Failed to delete category')
    }
    await fetchCategories()
  }

  function filterCategory(cat) {
    activeCategory.value = cat
  }

  return {
    categories,
    activeCategory,
    pendingDeleteCategory,
    capitalize,
    fetchCategories,
    createCategory,
    deleteCategory,
    filterCategory,
  }
}
