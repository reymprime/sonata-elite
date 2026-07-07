// ============================================================
// CLOUD SYNC (optional) — anonymous Firebase Auth + Firestore.
// Written defensively, exactly like the original: if the config
// below is still the placeholder, or any network call fails,
// the app keeps working on localStorage/IndexedDB alone.
// Cloud sync is an enhancement, never a dependency.
//
// Firebase is loaded from the gstatic CDN at runtime (dynamic
// import), so it adds zero weight to the Vite bundle and the
// app still boots fully offline.
// ============================================================

// TODO: replace with your real config from
// Firebase Console -> Project Settings -> General -> Your apps -> Web app
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID'
};

let cloudApi = null;   // populated once Firebase initializes successfully
let currentUser = null;
let listeners = { onTracks: null, onPlaylists: null };

export function isCloudReady() {
  return !!(cloudApi && currentUser);
}

// Wraps every write so a missing/broken cloud never throws into the UI.
export function syncToCloud(fn) {
  if (!cloudApi) return;
  try {
    const result = fn(cloudApi);
    if (result && typeof result.catch === 'function') {
      result.catch((err) => console.warn('Cloud sync skipped:', err && err.message));
    }
  } catch (err) {
    console.warn('Cloud sync skipped:', err && err.message);
  }
}

export async function initCloud({ onTracks, onPlaylists }) {
  listeners = { onTracks, onPlaylists };
  if (firebaseConfig.apiKey === 'YOUR_API_KEY') {
    console.info('Sonata cloud sync is off (placeholder Firebase config).');
    return;
  }

  try {
    const CDN = 'https://www.gstatic.com/firebasejs/12.15.0';
    const [{ initializeApp }, authMod, fsMod] = await Promise.all([
      import(/* @vite-ignore */ `${CDN}/firebase-app.js`),
      import(/* @vite-ignore */ `${CDN}/firebase-auth.js`),
      import(/* @vite-ignore */ `${CDN}/firebase-firestore.js`)
    ]);
    const { getAuth, onAuthStateChanged, signInAnonymously } = authMod;
    const {
      getFirestore, doc, setDoc, deleteDoc, collection, getDocs,
      onSnapshot, serverTimestamp, writeBatch, enableIndexedDbPersistence
    } = fsMod;

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    enableIndexedDbPersistence(db).catch((err) => {
      // Expected (and harmless) with multiple tabs open — falls back to memory cache.
      console.warn('Firestore offline persistence unavailable:', err.code);
    });

    function requireUid() {
      if (!currentUser) throw new Error('Cloud is still connecting — try again in a moment.');
      return currentUser.uid;
    }

    cloudApi = {
      saveTrack(track) {
        const uid = requireUid();
        return setDoc(doc(db, 'users', uid, 'tracks', track.id), { ...track, addedAt: serverTimestamp() }, { merge: true });
      },
      deleteTrack(trackId) {
        const uid = requireUid();
        return deleteDoc(doc(db, 'users', uid, 'tracks', trackId));
      },
      setTrackFavorite(trackId, favorite) {
        const uid = requireUid();
        return setDoc(doc(db, 'users', uid, 'tracks', trackId), { favorite }, { merge: true });
      },
      updateTrackTitle(trackId, title) {
        const uid = requireUid();
        return setDoc(doc(db, 'users', uid, 'tracks', trackId), { title }, { merge: true });
      },
      savePlaylist(playlist) {
        const uid = requireUid();
        return setDoc(doc(db, 'users', uid, 'playlists', playlist.id), {
          id: playlist.id,
          name: playlist.name,
          trackIds: playlist.tracks || [],
          updatedAt: serverTimestamp()
        }, { merge: true });
      },
      deletePlaylist(playlistId) {
        const uid = requireUid();
        return deleteDoc(doc(db, 'users', uid, 'playlists', playlistId));
      }
    };

    let unsubTracks = null;
    let unsubPlaylists = null;

    function watchUserData(uid) {
      if (unsubTracks) unsubTracks();
      if (unsubPlaylists) unsubPlaylists();
      unsubTracks = onSnapshot(
        collection(db, 'users', uid, 'tracks'),
        (snap) => listeners.onTracks && listeners.onTracks(snap.docs.map((d) => d.data())),
        (err) => console.error('Tracks listener error:', err)
      );
      unsubPlaylists = onSnapshot(
        collection(db, 'users', uid, 'playlists'),
        (snap) => listeners.onPlaylists && listeners.onPlaylists(snap.docs.map((d) => d.data())),
        (err) => console.error('Playlists listener error:', err)
      );
    }

    // One-time: if this user has never synced before and the browser has
    // local data (from the localStorage-only era), push it up.
    async function migrateLocalDataIfNeeded(uid) {
      const flagKey = `sonata_migrated_${uid}`;
      if (localStorage.getItem(flagKey)) return;
      try {
        const existing = await getDocs(collection(db, 'users', uid, 'tracks'));
        if (existing.empty) {
          const localTracks = JSON.parse(localStorage.getItem('sonata_library') || '[]');
          const localPlaylists = JSON.parse(localStorage.getItem('sonata_playlists') || '[]');
          if (localTracks.length || localPlaylists.length) {
            const batch = writeBatch(db);
            localTracks.forEach((t) => {
              batch.set(doc(db, 'users', uid, 'tracks', t.id), { ...t, addedAt: serverTimestamp() });
            });
            localPlaylists.forEach((p) => {
              batch.set(doc(db, 'users', uid, 'playlists', p.id), {
                id: p.id,
                name: p.name,
                trackIds: p.tracks || [],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              });
            });
            await batch.commit();
          }
        }
        localStorage.setItem(flagKey, '1');
      } catch (err) {
        console.warn('Local-to-cloud migration skipped:', err.message);
      }
    }

    onAuthStateChanged(auth, async (user) => {
      currentUser = user;
      if (user) {
        await migrateLocalDataIfNeeded(user.uid);
        watchUserData(user.uid);
      }
    });

    if (!auth.currentUser) {
      signInAnonymously(auth).catch((err) => {
        console.error('Anonymous sign-in failed (check your Firebase config):', err);
      });
    }
  } catch (err) {
    console.error('Firebase failed to initialize:', err);
  }
}
