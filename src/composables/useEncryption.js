const USE_WEBCRYPTO = typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined'

function simpleEncrypt(plaintext, password) {
  const key = btoa(password).slice(0, 32)
  let out = ''
  for (let i = 0; i < plaintext.length; i++) {
    out += String.fromCharCode(plaintext.charCodeAt(i) ^ key.charCodeAt(i % key.length))
  }
  return btoa(out)
}

function simpleDecrypt(encoded, password) {
  const key = btoa(password).slice(0, 32)
  const plain = atob(encoded)
  let out = ''
  for (let i = 0; i < plain.length; i++) {
    out += String.fromCharCode(plain.charCodeAt(i) ^ key.charCodeAt(i % key.length))
  }
  return out
}

export function useEncryption() {
  async function deriveKey(password, salt) {
    const enc = new TextEncoder()
    const keyMaterial = await crypto.subtle.importKey(
      'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
    )
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
      keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
    )
  }

  async function encryptData(data, password) {
    if (!USE_WEBCRYPTO) {
      const json = JSON.stringify(data)
      const encoded = simpleEncrypt(json, password)
      const buf = new TextEncoder().encode('S' + encoded)
      return new Uint8Array(buf)
    }
    const enc = new TextEncoder()
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const key = await deriveKey(password, salt)
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(data)))
    const packed = new Uint8Array(1 + salt.length + iv.length + encrypted.byteLength)
    packed[0] = 0x45 // 'E'
    packed.set(salt, 1)
    packed.set(iv, 1 + salt.length)
    packed.set(new Uint8Array(encrypted), 1 + salt.length + iv.length)
    return packed
  }

  async function decryptData(packed, password) {
    if (!USE_WEBCRYPTO || packed[0] === 0x53) {
      const text = new TextDecoder().decode(packed)
      const encoded = text.slice(1)
      const json = simpleDecrypt(encoded, password)
      return JSON.parse(json)
    }
    const salt = packed.slice(1, 17)
    const iv = packed.slice(17, 29)
    const data = packed.slice(29)
    const key = await deriveKey(password, salt)
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data)
    const dec = new TextDecoder()
    return JSON.parse(dec.decode(decrypted))
  }

  async function executeExport(password) {
    const res = await fetch('/api/export')
    const docs = await res.json()
    const encrypted = await encryptData(docs, password)
    const blob = new Blob([encrypted], { type: 'application/octet-stream' })
    const exportUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = exportUrl
    const mode = USE_WEBCRYPTO ? 'AES-256' : 'XOR'
    a.download = `doc-editor-backup-${new Date().toISOString().split('T')[0]}.${mode}.enc`
    a.click()
    URL.revokeObjectURL(exportUrl)
    return docs.length
  }

  async function executeImport(password, file) {
    const buffer = await file.arrayBuffer()
    const packed = new Uint8Array(buffer)
    let docs
    try {
      docs = await decryptData(packed, password)
    } catch {
      throw new Error('Decryption failed — wrong password or invalid file')
    }
    const existing = await (await fetch('/api/documents')).json()
    let importedCount = 0
    for (const doc of docs) {
      const exists = existing.some(e => e.title === doc.title && e.content === doc.content)
      if (!exists) {
        await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: doc.title || 'Imported Document',
            content: doc.content || '',
            category: doc.category || null
          })
        })
        importedCount++
      }
    }
    return importedCount
  }

  return {
    USE_WEBCRYPTO,
    executeExport,
    executeImport,
  }
}
