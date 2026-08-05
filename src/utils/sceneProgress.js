// Tiny external store so the landing page can show scene-load progress without
// importing @react-three/drei. Importing drei from App.jsx pulled the whole
// ~1 MB three/r3f chunk into the entry graph and defeated the lazy() split.
// HeroScene (lazy chunk) writes here; App subscribes via useSyncExternalStore.

let snapshot = { progress: 0, firstFrame: false };
const subscribers = new Set();

export function subscribeScene(fn) {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}

export function getSceneSnapshot() {
  return snapshot;
}

export function reportScene(next) {
  const merged = { ...snapshot, ...next };
  if (merged.progress === snapshot.progress && merged.firstFrame === snapshot.firstFrame) return;
  snapshot = merged;
  subscribers.forEach((fn) => fn());
}
