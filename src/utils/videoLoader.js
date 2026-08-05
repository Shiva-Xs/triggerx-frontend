// Hero visor video textures.
//
// These used to be created (and .load()ed) at module scope, so importing the
// module anywhere started ~13 MB of video downloads before first paint. They
// are now created on demand, only once the WebGL hero has decided to mount.

let videos = null;

function makePersistedVideo(src) {
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

export function getHeroVideos() {
  if (!videos) {
    videos = {
      screen: makePersistedVideo('/screen.mp4'),
      overlay: makePersistedVideo('/overlay.mp4'),
    };
  }
  return videos;
}
