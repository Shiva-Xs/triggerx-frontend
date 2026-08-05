// Decides whether this client should run the WebGL hero at all.
//
// The hero is a 186k-triangle PBR scene with clearcoat, an IBL environment,
// two video textures and a per-frame canvas texture. On a hardware GPU that is
// a comfortable 60fps. On a CPU rasterizer (SwiftShader / llvmpipe — what you
// get in headless Chrome, VMs, and machines with GPU acceleration disabled) a
// single frame costs hundreds of milliseconds, which locks the main thread and
// makes the whole page unusable. Those clients get the poster instead.

let cached = null;

export function detectSceneSupport() {
  if (cached) return cached;
  if (typeof window === 'undefined') return { ok: false, reason: 'ssr' };

  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    return (cached = { ok: false, reason: 'reduced-motion' });
  }

  let gl = null;
  try {
    const canvas = document.createElement('canvas');
    gl = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true })
      || canvas.getContext('webgl', { failIfMajorPerformanceCaveat: true });
  } catch {
    gl = null;
  }
  if (!gl) return (cached = { ok: false, reason: 'no-webgl' });

  let renderer = '';
  try {
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    if (info) renderer = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL) || '');
    if (!renderer) renderer = String(gl.getParameter(gl.RENDERER) || '');
  } catch {
    renderer = '';
  }
  try {
    gl.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    /* nothing to clean up */
  }

  const software = /swiftshader|llvmpipe|softpipe|software|basic render|generic renderer/i.test(renderer);
  if (software) return (cached = { ok: false, reason: 'software-renderer' });

  return (cached = { ok: true, reason: null });
}
