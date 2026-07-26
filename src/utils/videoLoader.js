function _makePersistedVideo(src) {
  const v = document.createElement('video');
  v.src = src;
  v.loop = true;
  v.muted = true;
  v.playsInline = true;
  v.preload = 'auto';
  v.load();
  const tryPlay = () => v.play().catch(() => {});
  v.addEventListener('canplay', tryPlay, { once: true });
  tryPlay();
  return v;
}

export const _screenVideo  = _makePersistedVideo('/screen.mp4');
export const _overlayVideo = _makePersistedVideo('/overlay.mp4');
