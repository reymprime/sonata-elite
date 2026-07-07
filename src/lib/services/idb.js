// ============================================================
// OFFLINE VAULT — device-imported audio stored in IndexedDB.
// Same DB name + store as the original build, so existing
// offline songs survive the migration untouched.
// ============================================================
let offlineDbPromise = null;

function openOfflineDB() {
  if (!offlineDbPromise) {
    offlineDbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open('SonataOfflineVault', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('audio');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return offlineDbPromise;
}

export function idbPutAudio(id, blob) {
  return openOfflineDB().then((db) => new Promise((res, rej) => {
    const tx = db.transaction('audio', 'readwrite');
    tx.objectStore('audio').put(blob, id);
    tx.oncomplete = res;
    tx.onerror = () => rej(tx.error);
  }));
}

export function idbGetAudio(id) {
  return openOfflineDB().then((db) => new Promise((res, rej) => {
    const req = db.transaction('audio', 'readonly').objectStore('audio').get(id);
    req.onsuccess = () => res(req.result || null);
    req.onerror = () => rej(req.error);
  }));
}

export function idbDeleteAudio(id) {
  return openOfflineDB().then((db) => new Promise((res, rej) => {
    const tx = db.transaction('audio', 'readwrite');
    tx.objectStore('audio').delete(id);
    tx.oncomplete = res;
    tx.onerror = () => rej(tx.error);
  }));
}
