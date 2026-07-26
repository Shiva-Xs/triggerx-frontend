import { useState, useEffect } from 'react';

export default function GrainLayer({ zIndex = 9999, opacity = 0.46 }) {
  const [dataUrl, setDataUrl] = useState(null);
  useEffect(() => {
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
    setDataUrl(canvas.toDataURL('image/png'));
  }, []);
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
