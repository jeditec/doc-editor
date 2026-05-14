<template>
  <div class="app" :class="{ 'sidebar-collapsed': !sidebarOpen }">
    <Sidebar
      :sidebar-open="sidebarOpen"
      @toggle-sidebar="toggleSidebar"
      @filter-category="filterCategory"
    />
    <main class="main">
      <WelcomeScreen v-if="!currentDoc" :theme.sync="currentTheme" @new-doc="handleNewDoc" />
      <Editor
        v-else
        :current-doc="currentDoc"
        @update:title="onTitleChange"
        @update:content="onContentChange"
        @update:category="onCategoryChange"
        @save="saveCurrentDoc"
        @save-version="saveVersion"
        @open-history="openVersionHistory"
        @new-doc="handleNewDoc"
        @theme-change="changeTheme"
      />
    </main>

    <!-- Modals -->
    <DeleteModal v-model:show="showDeleteModal" :doc-title="currentDoc?.title" @confirm="confirmDelete" />
    <CategoryModal
      v-model:show="showAddCategoryModal"
      @submit="handleAddCategory"
      :duplicate="categoryExists"
    />
    <DeleteCategoryModal
      v-model:show="showDeleteCategoryModal"
      :category="pendingDeleteCategory"
      @confirm="confirmDeleteCategory"
    />
    <VersionHistoryModal
      v-model:show="showVersionHistoryModal"
      :versions="versionHistory"
      @restore="handleRestoreVersion"
      @preview="openPreview"
      @compare="handleCompare"
    />
    <CompareModal
      v-model:show="showCompareModal"
      :version1="compareVersions[0]"
      :version2="compareVersions[1]"
      @select="handleSelectCompare"
    />
    <VersionPreviewModal v-model:show="showPreviewModal" :content="previewContent" />
    <ExportModal
      v-model:show="showExportModal"
      @export="handleExport"
    />
    <ImportModal
      v-model:show="showImportModal"
      @import="handleImport"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import Sidebar from './components/Sidebar.vue'
import WelcomeScreen from './components/WelcomeScreen.vue'
import Editor from './components/Editor.vue'
import DeleteModal from './components/modals/DeleteModal.vue'
import CategoryModal from './components/modals/CategoryModal.vue'
import DeleteCategoryModal from './components/modals/DeleteCategoryModal.vue'
import VersionHistoryModal from './components/modals/VersionHistoryModal.vue'
import CompareModal from './components/modals/CompareModal.vue'
import VersionPreviewModal from './components/modals/VersionPreviewModal.vue'
import ExportModal from './components/modals/ExportModal.vue'
import ImportModal from './components/modals/ImportModal.vue'

import { useDocuments } from './composables/useDocuments'
import { useCategories } from './composables/useCategories'
import { useThemes, THEMES } from './composables/useThemes'
import { useUndoRedo } from './composables/useUndoRedo'
import { useEncryption } from './composables/useEncryption'

// --- Composables ---
const {
  documents, currentDoc, versionHistory, saveInProgress, lastSavedState,
  fetchDocs, fetchDoc, createDoc, saveDoc, deleteDoc, saveVersion: saveDocVersion,
  loadVersions, restoreVersion,
} = useDocuments()

const {
  categories, activeCategory, pendingDeleteCategory, capitalize,
  fetchCategories, createCategory, deleteCategory, filterCategory,
} = useCategories()

const { currentTheme, changeTheme, initTheme } = useThemes()

const { undo, redo, pushUndo } = useUndoRedo()

const { executeExport, executeImport } = useEncryption()

// --- State ---
const sidebarOpen = ref(true)
const showDeleteModal = ref(false)
const showAddCategoryModal = ref(false)
const showDeleteCategoryModal = ref(false)
const showVersionHistoryModal = ref(false)
const showCompareModal = ref(false)
const showPreviewModal = ref(false)
const showExportModal = ref(false)
const showImportModal = ref(false)
const categoryExists = ref(false)

const previewContent = ref('')
const compareVersions = ref([])
const compareSelection = ref([])
let saveTimer = null
let searchDebounce = null

// --- Methods ---
function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value
}

function handleNewDoc() {
  const cat = activeCategory.value !== 'all' ? capitalize(activeCategory.value) : null
  createDoc(cat).then(doc => openDoc(doc.id))
}

function openDoc(id) {
  const doc = documents.value.find(d => d.id === id)
  if (!doc) return
  currentDoc.value = doc
  currentDoc.value.category = doc.category || ''
  // Update category select
  const select = document.getElementById('categorySelect')
  if (select) select.value = doc.category || ''
  lastSavedState.value = {
    title: doc.title,
    content: doc.content,
    category: doc.category || ''
  }
  nextTick(() => {
    const contentArea = document.getElementById('contentArea')
    if (contentArea) contentArea.focus()
  })
  localStorage.setItem('doc-editor-last-id', id)
}

function onTitleChange(title) {
  if (currentDoc.value) {
    currentDoc.value.title = title
    updateSaveStatus('unsaved')
  }
}

function onContentChange(content) {
  if (currentDoc.value) {
    currentDoc.value.content = content
    updateSaveStatus('unsaved')
    pushUndo(content)
  }
}

function onCategoryChange(category) {
  if (currentDoc.value) {
    currentDoc.value.category = category
    activeCategory.value = category
    filterCategory(category)
    updateSaveStatus('unsaved')
  }
}

function scheduleIdleSave() {
  clearTimeout(saveTimer)
  saveTimer = setTimeout(async () => {
    if (currentDoc.value) {
      await saveCurrentDoc(false)
    }
  }, 10000)
}

function updateSaveStatus(status) {
  const el = document.getElementById('saveStatus')
  if (el) {
    el.textContent = status === 'saved' ? '🟢' : status === 'saving' ? '⏳' : status === 'unsaved' ? '🟡' : '—'
    el.className = `save-status ${status}`
  }
}

async function saveCurrentDoc(createVersion = false) {
  if (!currentDoc.value || saveInProgress.value) return
  if (lastSavedState.value) {
    const isSame = lastSavedState.value.title === currentDoc.value.title &&
      lastSavedState.value.content === currentDoc.value.content &&
      lastSavedState.value.category === currentDoc.value.category
    if (isSame) {
      updateSaveStatus('saved')
      return
    }
  }
  if (!currentDoc.value.content.trim()) {
    updateSaveStatus('')
    return
  }
  updateSaveStatus('saving')
  try {
    const doc = await saveDoc(currentDoc.value.id, {
      title: currentDoc.value.title,
      content: currentDoc.value.content,
      category: currentDoc.value.category || ''
    }, createVersion)
    if (doc) {
      currentDoc.value = doc
      lastSavedState.value = {
        title: doc.title,
        content: doc.content,
        category: doc.category || ''
      }
      setTimeout(() => updateSaveStatus('saved'), 2000)
    }
  } catch (err) {
    console.error('Save failed:', err)
    updateSaveStatus('unsaved')
  }
}

async function handleAddCategory(name) {
  categoryExists.value = false
  const ok = await createCategory(name)
  if (ok) {
    showAddCategoryModal.value = false
  } else {
    categoryExists.value = true
  }
}

async function confirmDelete() {
  const id = currentDoc.value?.id
  if (!id) return
  await deleteDoc(id)
  currentDoc.value = null
}

async function quickDelete(id) {
  showDeleteModal.value = true
}

async function handleOpenDoc(id) {
  await openDoc(id)
}

// --- Categories ---
async function handleAddCategoryFromFilter(name) {
  showAddCategoryModal.value = true
}

async function handleDeleteCategory(cat) {
  pendingDeleteCategory.value = capitalize(cat)
  showDeleteCategoryModal.value = true
}

async function confirmDeleteCategory() {
  const cat = pendingDeleteCategory.value
  if (!cat) return
  try {
    await deleteCategory(capitalize(cat))
    activeCategory.value = 'all'
    if (currentDoc.value) {
      currentDoc.value.category = ''
      const select = document.getElementById('categorySelect')
      if (select) select.value = ''
    }
  } catch (err) {
    alert(err.message)
  }
  showDeleteCategoryModal.value = false
  pendingDeleteCategory.value = null
}

// --- Version History ---
async function openVersionHistory() {
  if (!currentDoc.value) return
  await loadVersions(currentDoc.value.id)
  showVersionHistoryModal.value = true
}

async function handleRestoreVersion(versionId) {
  if (currentDoc.value && confirm('Restore this version? Current changes will be lost.')) {
    await restoreVersion(currentDoc.value.id, versionId)
    showVersionHistoryModal.value = false
  }
}

function openPreview(content) {
  previewContent.value = content
  showPreviewModal.value = true
}

function handleCompare(versionId) {
  const idx = compareSelection.value.indexOf(versionId)
  if (idx !== -1) {
    compareSelection.value.splice(idx, 1)
    const el = document.getElementById(`version-${versionId}`)
    if (el) el.classList.remove('selected')
    showCompareModal.value = false
    return
  }
  if (compareSelection.value.length === 2) {
    compareSelection.value.forEach(i => {
      const e = document.getElementById(`version-${i}`)
      if (e) e.classList.remove('selected')
    })
    compareSelection.value = []
  }
  compareSelection.value.push(versionId)
  const el = document.getElementById(`version-${versionId}`)
  if (el) el.classList.add('selected')
  if (compareSelection.value.length === 2) {
    const v1 = versionHistory.value.find(v => v.id === compareSelection.value[0])
    const v2 = versionHistory.value.find(v => v.id === compareSelection.value[1])
    if (v1 && v2) {
      compareVersions.value = [v1, v2]
      showCompareModal.value = true
    }
  }
}

function handleSelectCompare(id) {
  handleCompare(id)
}

// --- Export/Import (password read from modal inputs directly) ---
async function handleExport() {
  const password = document.getElementById('exportPasswordInput')?.value
  if (!password) {
    const statusEl = document.getElementById('exportStatus')
    statusEl.textContent = '❌ Password required'
    statusEl.style.color = 'var(--danger)'
    return
  }
  const statusEl = document.getElementById('exportStatus')
  statusEl.textContent = '⏳ Preparing export...'
  statusEl.style.color = 'var(--accent)'
  try {
    const count = await executeExport(password)
    statusEl.textContent = `✅ Exported ${count} document(s)`
    statusEl.style.color = 'var(--success)'
    setTimeout(() => showExportModal.value = false, 1500)
  } catch (e) {
    statusEl.textContent = '❌ Export failed: ' + e.message
    statusEl.style.color = 'var(--danger)'
  }
}

async function handleImport(file) {
  if (!file) {
    const statusEl = document.getElementById('importStatus')
    statusEl.textContent = '❌ No file selected'
    statusEl.style.color = 'var(--danger)'
    return
  }
  const password = document.getElementById('importPasswordInput')?.value
  if (!password) {
    const statusEl = document.getElementById('importStatus')
    statusEl.textContent = '❌ Password required'
    statusEl.style.color = 'var(--danger)'
    return
  }
  const statusEl = document.getElementById('importStatus')
  statusEl.textContent = '⏳ Decrypting and importing...'
  statusEl.style.color = 'var(--accent)'
  try {
    const count = await executeImport(password, file)
    await fetchDocs()
    await fetchCategories()
    statusEl.textContent = `✅ Imported ${count} new document(s)`
    statusEl.style.color = 'var(--success)'
    setTimeout(() => showImportModal.value = false, 2000)
  } catch (err) {
    statusEl.textContent = '❌ Import failed: ' + err.message
    statusEl.style.color = 'var(--danger)'
  }
}

// --- Keyboard Shortcuts ---
function handleKeydown(e) {
  // Escape closes modals
  if (e.key === 'Escape') {
    if (showDeleteModal.value) showDeleteModal.value = false
    else if (showAddCategoryModal.value) showAddCategoryModal.value = false
    else if (showDeleteCategoryModal.value) showDeleteCategoryModal.value = false
    else if (showVersionHistoryModal.value) showVersionHistoryModal.value = false
    else if (showPreviewModal.value) showPreviewModal.value = false
    else if (showExportModal.value) showExportModal.value = false
    else if (showImportModal.value) showImportModal.value = false
  }

  // Ctrl+S = save
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    if (e.shiftKey) {
      saveDocVersion(currentDoc.value?.id)
    } else {
      saveCurrentDoc()
    }
  }

  // Ctrl+Z = undo
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
    e.preventDefault()
    const prev = undo()
    if (prev) {
      const el = document.getElementById('contentArea')
      if (el) el.value = prev
    }
  }

  // Ctrl+Shift+Z or Ctrl+Y = redo
  if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'y') && e.shiftKey) {
    e.preventDefault()
    const next = redo()
    if (next) {
      const el = document.getElementById('contentArea')
      if (el) el.value = next
    }
  }

  // Ctrl+N = new doc
  if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
    e.preventDefault()
    handleNewDoc()
  }

  // Ctrl+B = toggle sidebar
  if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
    e.preventDefault()
    toggleSidebar()
  }
}

// --- Search ---
function handleSearch() {
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(fetchDocs, 300)
}

// --- Init ---
onMounted(async () => {
  initTheme()
  await fetchCategories()
  await fetchDocs()

  // Restore last doc
  const savedLast = localStorage.getItem('doc-editor-last-id')
  if (savedLast) {
    const doc = documents.value.find(d => d.id === parseInt(savedLast))
    if (doc) {
      setTimeout(() => openDoc(doc.id), 200)
    } else if (documents.value.length === 0) {
      setTimeout(() => handleNewDoc(), 200)
    }
  } else if (documents.value.length === 0) {
    setTimeout(() => handleNewDoc(), 200)
  }

  document.addEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.app {
  display: flex;
  height: 100vh;
}
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.sidebar-collapsed .sidebar {
  margin-left: -320px;
}
</style>
