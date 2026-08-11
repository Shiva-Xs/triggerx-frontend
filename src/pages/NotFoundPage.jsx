import { useEffect } from 'react';
import { Link } from 'react-router-dom';

const C = {
  bg:   '#010106',
  ind:  '#4F5BD5',
  t1:   'rgba(255,255,255,0.92)',
  t2:   'rgba(255,255,255,0.60)',
  t3:   'rgba(255,255,255,0.35)',
  br:   'rgba(79,91,213,0.20)',
  mono: "'JetBrains Mono',monospace",
  body: "'Space Grotesk',sans-serif",
  disp: "'Bebas Neue',cursive",
};

const S = {
  page:  { background: C.bg, minHeight: '100vh', fontFamily: C.body, color: C.t1,
           display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
           gap: 24, padding: '0 24px', textAlign: 'center', overflowX: 'hidden' },
  aurora:{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
           background: 'radial-gradient(ellipse 70% 50% at 50% -10%,rgba(79,91,213,0.16) 0%,transparent 55%)' },
  code:  { fontFamily: C.disp, fontSize: 'clamp(72px,16vw,160px)', lineHeight: 1, letterSpacing: '0.02em',
           color: C.ind, textShadow: '0 0 24px rgba(79,91,213,0.35)', zIndex: 1 },
  label: { fontFamily: C.mono, fontSize: 10, fontWeight: 600, letterSpacing: '0.22em',
           textTransform: 'uppercase', color: C.t3, zIndex: 1 },
  title: { fontFamily: C.disp, fontSize: 'clamp(28px,6vw,44px)', letterSpacing: '0.04em', margin: 0, zIndex: 1 },
  desc:  { fontSize: 14, lineHeight: 1.7, color: C.t2, maxWidth: 440, margin: 0, zIndex: 1 },
  link:  { fontFamily: C.mono, fontSize: 10, fontWeight: 600, letterSpacing: '0.18em',
           textTransform: 'uppercase', color: C.ind, textDecoration: 'none',
           border: `1px solid ${C.br}`, padding: '10px 22px', zIndex: 1 },
};

export default function NotFoundPage() {
  // Matches the pattern in AuthPage/DashboardPage. This is what actually keeps
  // junk URLs out of the index: Cloudflare Pages answers unmatched paths with
  // index.html at HTTP 200, so without this every typo'd or scraped URL was a
  // 200 that client-side redirected to "/" — a duplicate of the homepage from a
  // crawler's point of view.
  useEffect(() => {
    let meta = document.querySelector('meta[name="robots"]');
    let created = false;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'robots';
      document.head.appendChild(meta);
      created = true;
    }
    const prevContent = meta.getAttribute('content');
    meta.setAttribute('content', 'noindex, nofollow');
    return () => {
      if (created) meta.remove();
      else if (prevContent) meta.setAttribute('content', prevContent);
      else meta.setAttribute('content', 'index, follow');
    };
  }, []);

  useEffect(() => {
    const prev = document.title;
    document.title = 'Page not found | TriggerX';
    return () => { document.title = prev; };
  }, []);

  return (
    <div style={S.page}>
      <div style={S.aurora} />
      <div style={S.code}>404</div>
      <div style={S.label}>Signal lost</div>
      <h1 style={S.title}>This page doesn&apos;t exist</h1>
      <p style={S.desc}>
        The link you followed is broken or the page has moved. Your alerts are unaffected.
      </p>
      <Link to="/" style={S.link}>Back to TriggerX &rarr;</Link>
    </div>
  );
}
