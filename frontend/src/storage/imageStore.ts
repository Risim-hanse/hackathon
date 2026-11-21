/**
 * The ONLY module that stores uploaded document images.
 * Images live in IndexedDB (local, private) — never in localStorage or a CDN.
 */

const DB_NAME = 'meditrack-images'
const STORE = 'images'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this browser.'))
      return
    }
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveImage(blob: Blob, key?: string): Promise<string> {
  const db = await openDb()
  const ref = key ?? `img-${Date.now()}-${Math.random().toString(36).slice(2)}`
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(blob, ref)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
  return ref
}

export async function getImage(ref: string): Promise<Blob | undefined> {
  const db = await openDb()
  const result = await new Promise<Blob | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const request = tx.objectStore(STORE).get(ref)
    request.onsuccess = () => resolve(request.result as Blob | undefined)
    request.onerror = () => reject(request.error)
  })
  db.close()
  return result
}

export async function getImageUrl(ref: string): Promise<string | null> {
  const blob = await getImage(ref)
  return blob ? URL.createObjectURL(blob) : null
}

export async function deleteImage(ref: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(ref)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}
