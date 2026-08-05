import { useState } from 'react';

// The grain tile is identical everywhere it is used, but every route mounts its
// own GrainLayer. Building it costs a 65k-iteration pixel loop plus a PNG
// encode of incompressible noise (~216 KB of base64), so it is generated once
// and shared for the life of the document.
let grainTile = null;

function getGrainTile() {
  if (grainTile) return grainTile;
  const SIZE = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  const id = ctx.createImageData(SIZE, SIZE);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = (Math.random() * 255) | 0;
    const a = (Math.random() * 20) | 0;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = a;
  }
  ctx.putImageData(id, 0, 0);
  grainTile = canvas.toDataURL('image/png');
  return grainTile;
}

export default function GrainLayer({ zIndex = 9999, opacity = 0.46 }) {
  // Lazy initialiser: built on the first mount only, then reused from the
  // module cache. Previously this ran in an effect, so every mount rendered
  // null once and then re-rendered with the tile.
  const [dataUrl] = useState(getGrainTile);
  if (!dataUrl) return null;
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex,
        pointerEvents: 'none',
        backgroundImage: `url(${dataUrl})`,
        backgroundSize: '256px 256px',
        backgroundRepeat: 'repeat',
        opacity,
        willChange: 'transform',
      }}
    />
  );
}
