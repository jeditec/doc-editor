import { ref } from 'vue'

export function useUndoRedo() {
  const undoStack = ref([])
  const redoStack = ref([])
  let undoTimer = null

  function pushUndo(content) {
    clearTimeout(undoTimer)
    undoStack.value.push(content)
    if (undoStack.value.length > 200) undoStack.value.shift()
    redoStack.value = []
    undoTimer = setTimeout(() => { undoStack.value = []; redoStack.value = [] }, 300000)
  }

  function undo() {
    if (undoStack.value.length === 0) return null
    redoStack.value.push(document.getElementById('contentArea')?.value || '')
    return undoStack.value.pop()
  }

  function redo() {
    if (redoStack.value.length === 0) return null
    undoStack.value.push(document.getElementById('contentArea')?.value || '')
    return redoStack.value.pop()
  }

  function clearUndo() {
    undoStack.value = []
    redoStack.value = []
  }

  return {
    undoStack,
    redoStack,
    pushUndo,
    undo,
    redo,
    clearUndo,
  }
}
