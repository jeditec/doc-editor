import { ref } from 'vue'

export function useDocuments() {
  const documents = ref([])
  const currentDoc = ref(null)
  const versionHistory = ref([])
  const saveInProgress = ref(false)
  let lastSavedState = null

  async function fetchDocs() {
    const params = new URLSearchParams()
    const search = document.getElementById('searchInput')?.value
    if (search) params.set('search', search)
    const res = await fetch(`/api/documents?${params}`)
    documents.value = await res.json()
  }

  async function fetchDoc(id) {
    const res = await fetch(`/api/documents/${id}`)
    return res.json()
  }

  async function createDoc(category = null) {
    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Untitled Document', content: '', category })
    })
    const doc = await res.json()
    await fetchDocs()
    return doc
  }

  async function saveDoc(docId, data, createVersion = false) {
    if (saveInProgress.value) return false

    saveInProgress.value = true

    const saveResult = await fetch(`/api/documents/${docId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, save_version: createVersion })
    })
    const doc = await saveResult.json()
    currentDoc.value = doc
    lastSavedState = { title: doc.title, content: doc.content, category: doc.category || '' }
    saveInProgress.value = false
    return doc
  }

  async function deleteDoc(id) {
    await fetch(`/api/documents/${id}`, { method: 'DELETE' })
    await fetchDocs()
  }

  async function saveVersion(docId) {
    await saveDoc(docId, {
      title: currentDoc.value.title,
      content: currentDoc.value.content,
      category: currentDoc.value.category
    }, true)
  }

  async function loadVersions(docId) {
    const res = await fetch(`/api/documents/${docId}/versions`)
    versionHistory.value = await res.json()
    return versionHistory.value
  }

  async function restoreVersion(docId, versionId) {
    const res = await fetch(`/api/documents/${docId}/restore/${versionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    })
    const doc = await res.json()
    currentDoc.value = doc
    await loadVersions(docId)
    await fetchDocs()
    return doc
  }

  return {
    documents,
    currentDoc,
    versionHistory,
    saveInProgress,
    lastSavedState,
    fetchDocs,
    fetchDoc,
    createDoc,
    saveDoc,
    deleteDoc,
    saveVersion,
    loadVersions,
    restoreVersion,
  }
}
