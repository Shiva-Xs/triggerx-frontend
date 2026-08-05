import { lazy, Suspense, useEffect, useRef, useState, useCallback, useSyncExternalStore } from 'react';
import { Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import { subscribeScene, getSceneSnapshot } from './utils/sceneProgress';
import { detectSceneSupport } from './utils/sceneSupport';
import './App.css';

import GrainLayer from './components/GrainLayer.jsx';

function FooterParticles() {
  const canvasRef = useRef();
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ctx = el.getContext('2d');
    const resize = () => {
      el.width = el.offsetWidth;
      el.height = el.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    const dots = Array.from({ length: 28 }, () => ({
      x: Math.random() * el.width,
      y: el.height * (0.3 + Math.random() * 0.7),
      r: 0.8 + Math.random() * 1.4,
      speed: 0.12 + Math.random() * 0.22,
      opacity: 0.1 + Math.random() * 0.3,
      drift: (Math.random() - 0.5) * 0.18,
    }));
    let raf;
    let isVisible = false;
    const tick = () => {
      ctx.clearRect(0, 0, el.width, el.height);
      dots.forEach(d => {
        d.y -= d.speed;
        d.x += d.drift;
        d.opacity += (Math.random() - 0.5) * 0.012;
        d.opacity = Math.max(0.05, Math.min(0.45, d.opacity));
        if (d.y < -4) { d.y = el.height; d.x = Math.random() * el.width; }
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(79,91,213,${d.opacity})`;
        ctx.fill();
      });
      raf = isVisible ? requestAnimationFrame(tick) : null;
    };
    const io = new IntersectionObserver(([e]) => {
      isVisible = e.isIntersecting;
      if (isVisible && !raf) raf = requestAnimationFrame(tick);
    }, { threshold: 0 });
    io.observe(el);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); io.disconnect(); };
  }, []);
  return <canvas ref={canvasRef} className="footer-particles" aria-hidden="true" />;
}

const FEAT_ICONS = {
  realtime: <polyline points="2,12 6,6 10,14 14,8 18,14 22,12" />,
  precise: <><line x1="12" y1="2" x2="12" y2="8" /><line x1="12" y1="16" x2="12" y2="22" /><polyline points="9,5 12,2 15,5" /><polyline points="9,19 12,22 15,19" /></>,
  natural: <><polyline points="16,18 22,12 16,6" /><polyline points="8,6 2,12 8,18" /></>,
  relative: <><line x1="19" y1="5" x2="5" y2="19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></>,
  silent: <><circle cx="12" cy="12" r="10" /><polyline points="8,12 11,15 16,9" /></>,
  limitless: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
};
function FeatIcon({ fkey, size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {FEAT_ICONS[fkey]}
    </svg>
  );
}

const CHANNELS = [
  {
    key: 'email', color: 'sky', pillLabel: ['EMAIL', 'ALERTS'], tag: 'EMAIL',
    boxTitle: 'Your inbox, instantly.',
    mobileDesc: 'Alert fires the instant your condition is met.',
    desc: 'Alert fires the instant your condition is met. Subject line alone tells you what happened. No app, no login, no extra setup.',
    features: ['Alert fires within seconds', 'Full alert in subject line', 'One email per alert', 'No extra app or setup'],
  },
  {
    key: 'telegram', color: 'indigo', pillLabel: ['TELEGRAM', 'BOT'], tag: 'TELEGRAM',
    boxTitle: 'Your chat, your command.',
    mobileDesc: 'Manage everything from one chat thread.',
    desc: 'Link once to @TriggerX_AlertBot. Alerts arrive the instant they fire. Manage everything from one thread, by command or plain English.',
    features: ['/add: natural-language input', '/list: manage active alerts', '/history: last 10 past alerts', '/price BTC: check live price', '/deleteall: clear all alerts'],
  },
  {
    key: 'extension', color: 'violet', pillLabel: ['CHROME', 'EXTENSION'], tag: 'EXTENSION',
    boxTitle: 'Open tab, alert armed.',
    mobileDesc: 'Auto-reads the symbol from your open tab.',
    desc: 'Opens on Binance or TradingView. Auto-detects the symbol, pulls live price. Pick ABOVE / BELOW / CROSSES, set target, fire.',
    features: ['Auto-reads pair from tab', 'ABOVE, BELOW, CROSSES tap', '\u00b1% preset shortcuts', 'Manage all alerts from popup', '120s secure session sync'],
  },
];
const CHAN_ICONS = {
  email: <><rect x="2" y="4" width="20" height="16" rx="1" /><polyline points="2,4 12,13 22,4" /></>,
  telegram: <path d="M21,3 L1,11 L8,13 L18,6 L10,15 L18,21 Z" />,
  extension: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" /><line x1="22" y1="12" x2="16" y2="12" /><line x1="6" y1="3.5" x2="9" y2="8" /><line x1="7" y1="20.5" x2="10" y2="15.5" /></>,
};
function ChanIcon({ ckey, size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {CHAN_ICONS[ckey]}
    </svg>
  );
}
function ChanMockup({ ckey }) {
  switch (ckey) {
    case 'email': return (
      <div className="email-inbox-mock">
        <div className="email-inbox-bar"><span className="email-inbox-title">INBOX</span><span className="email-inbox-badge">1 NEW</span></div>
        <div className="email-inbox-row email-inbox-row--unread">
          <div className="email-unread-dot" />
          <div className="email-row-body"><div className="email-row-from">TriggerX Alert</div><div className="email-row-subject">▲ BTC crossed $69,400</div><div className="email-row-meta">just now · BTC/USDT · Binance</div></div>
          <div className="email-row-time">0:01</div>
        </div>
        <div className="email-inbox-row">
          <div className="email-unread-dot email-unread-dot--read" />
          <div className="email-row-body"><div className="email-row-from">TriggerX Alert</div><div className="email-row-subject">▼ ETH dropped below $3,200</div><div className="email-row-meta">2h ago · ETH/USDT</div></div>
          <div className="email-row-time">2:15</div>
        </div>
        <div className="email-inbox-row">
          <div className="email-unread-dot email-unread-dot--read" />
          <div className="email-row-body"><div className="email-row-from">TriggerX Alert</div><div className="email-row-subject">&#8855; SOL crossed $185.00</div><div className="email-row-meta">yesterday · SOL/USDT</div></div>
          <div className="email-row-time">y'day</div>
        </div>
        <div className="email-inbox-row email-inbox-row--blurred">
          <div className="email-unread-dot email-unread-dot--read" />
          <div className="email-row-body"><div className="email-row-from">TriggerX Alert</div><div className="email-row-subject">▲ AVAX hit $38.20</div><div className="email-row-meta">2d ago · AVAX/USDT</div></div>
          <div className="email-row-time">2d</div>
        </div>
        <div className="email-inbox-row email-inbox-row--blurred">
          <div className="email-unread-dot email-unread-dot--read" />
          <div className="email-row-body"><div className="email-row-from">TriggerX Alert</div><div className="email-row-subject">▼ BNB fell below $295</div><div className="email-row-meta">3d ago · BNB/USDT</div></div>
          <div className="email-row-time">3d</div>
        </div>
      </div>
    );
    case 'telegram': return (
      <div className="ch-chat-panel">
        <div className="ch-chat-header">
          <div className="ch-chat-avatar">TX</div>
          <div><div className="ch-chat-name">@TriggerX_AlertBot</div><div className="ch-chat-online">online</div></div>
        </div>
        <div className="ch-chat-body">
          <div className="chat-msg chat-msg--user">alert me if btc hits 90000</div>
          <div className="chat-msg chat-msg--bot">
            <span className="chat-msg-title">BTC above $90,000</span>
            <span className="chat-meta">Currently $95,420 &middot; 5.5% away</span>
            <div className="chat-btns"><span className="chat-btn chat-btn--primary">Create Alert</span><span className="chat-btn">Cancel</span></div>
          </div>
          <div className="chat-msg chat-msg--user">notify me if eth down 3%</div>
          <div className="chat-msg chat-msg--bot">
            <span className="chat-msg-title">ETH below $2,413</span>
            <span className="chat-meta">-3% from $2,488 &middot; Currently $2,488</span>
            <div className="chat-btns"><span className="chat-btn chat-btn--primary">Create Alert</span><span className="chat-btn">Cancel</span></div>
          </div>
          <div className="chat-msg chat-msg--user">sol above 200</div>
          <div className="chat-msg chat-msg--bot">
            <span className="chat-msg-title">SOL above $200.00</span>
            <span className="chat-meta">Currently $183.50 &middot; 9% away</span>
            <div className="chat-btns"><span className="chat-btn chat-btn--primary">Create Alert</span><span className="chat-btn">Cancel</span></div>
          </div>
        </div>
      </div>
    );
    case 'extension': return (
      <div className="ext-popup">
        <div className="ext-popup-topbar">
          <div className="ext-popup-wordmark"><span className="ext-popup-wm-bar" /><span className="ext-popup-wm-txt">TRIGGER<span className="ext-popup-wm-x">X</span></span></div>
          <span className="ext-popup-version">v1.0</span>
        </div>
        <div className="ext-popup-asset-card">
          <div className="ext-popup-asset-left">
            <div className="ext-popup-sym-row"><span className="ext-popup-sym-name">LTC</span><span className="ext-popup-sym-pair">/USDT</span></div>
            <div className="ext-popup-src">BINANCE SPOT</div>
          </div>
          <div className="ext-popup-asset-right"><div className="ext-popup-price-top">$55.56</div><div className="ext-popup-price-lbl">CURRENT</div></div>
        </div>
        <div className="ext-popup-divider" />
        <div className="ext-popup-label">CONDITION</div>
        <div className="ext-popup-cond-group">
          <div className="ext-popup-cond-btn"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="4,16 12,6 20,16" /></svg><span>ABOVE</span></div>
          <div className="ext-popup-cond-btn ext-popup-cond-btn--active"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="4,8 12,18 20,8" /></svg><span>BELOW</span></div>
          <div className="ext-popup-cond-btn"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="8,5 12,9 16,5" /><polyline points="8,19 12,15 16,19" /></svg><span>CROSSES</span></div>
        </div>
        <div className="ext-popup-label">TARGET PRICE</div>
        <div className="ext-popup-price-box">55.55</div>
        <div className="ext-popup-quick-row">
          <span className="ext-popup-quick-lbl">QUICK</span>
          <span className="ext-popup-quick-pct ext-popup-quick-dn">-5%</span>
          <span className="ext-popup-quick-pct ext-popup-quick-dn">-2.5%</span>
          <span className="ext-popup-quick-pct ext-popup-quick-up">+2.5%</span>
          <span className="ext-popup-quick-pct ext-popup-quick-up">+5%</span>
        </div>
        <button className="ext-popup-create-btn">+ CREATE ALERT</button>
        <div className="ext-popup-alerts-row">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
          <span className="ext-popup-alerts-lbl">ACTIVE ALERTS</span>
          <span className="ext-popup-alerts-badge">1</span>
          <span className="ext-popup-alerts-chevron">›</span>
        </div>
      </div>
    );
    default: return null;
  }
}

function SignalPipelineMini() {
  return (
    <div className="spipe">
      <div className="spipe-left">
        <svg className="spipe-wave" viewBox="0 0 48 24" fill="none">
          <polyline points="0,18 8,6 16,14 24,4 32,16 40,8 48,12"
            stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
        <span className="spipe-left-name">BINANCE</span>
        <span className="spipe-left-sub">WebSocket feed</span>
      </div>
      <div className="spipe-pipe">
        <div className="spipe-dot" />
        <div className="spipe-dot spipe-dot--d1" />
      </div>
      <div className="spipe-right">
        <span className="spipe-trigger">TRIGGERX</span>
        <span className="spipe-engine">ENGINE</span>
      </div>
    </div>
  );
}

const ArrowUp14 = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5,12 12,5 19,12" />
  </svg>
);
const ArrowDown14 = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><polyline points="19,12 12,19 5,12" />
  </svg>
);
function AlertPillsMini() {
  return (
    <div className="apills">
      <div className="apill apill--above">
        <ArrowUp14 />
        <span className="apill-lbl">ABOVE</span>
      </div>
      <div className="apill apill--below">
        <ArrowDown14 />
        <span className="apill-lbl">BELOW</span>
      </div>
      <div className="apill apill--crosses">
        <span className="apill-cross-icon"><ArrowUp14 /><ArrowDown14 /></span>
        <span className="apill-lbl">CROSSES</span>
      </div>
    </div>
  );
}

const NLP_CMDS = [
  'alert me when ETH drops below 2500',
  'notify me if BTC is up 10%',
  'ping when SOL crosses 150',
  'alert me when BNB falls below 400',
];
function NLPMini() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setInterval(() => {
      setVisible(false);
      setTimeout(() => { setIdx(i => (i + 1) % NLP_CMDS.length); setVisible(true); }, 220);
    }, 2800);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="btm-nlp">
      <div className="btm-nlp-row" style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.22s ease' }}>
        <span className="btm-nlp-cursor">›</span>
        <span className="btm-nlp-cmd">{NLP_CMDS[idx]}</span>
        <span className="btm-nlp-blink">_</span>
      </div>
      <div className="btm-nlp-ok">✓ alert armed</div>
    </div>
  );
}

const HeroScene     = lazy(() => import('./components/HeroScene'));
const AuthPage      = lazy(() => import('./pages/AuthPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const PrivacyPage   = lazy(() => import('./pages/LegalPages').then(m => ({ default: m.PrivacyPage })));
const TermsPage     = lazy(() => import('./pages/LegalPages').then(m => ({ default: m.TermsPage })));

// Hard ceiling on the branded loader. Whatever the scene is still doing, the
// page reveals itself by now — the loader must never be what defines LCP.
const LOADER_MAX_MS = 2200;

function SceneOverlay({ onReady }) {
  const { progress, firstFrame } = useSyncExternalStore(subscribeScene, getSceneSnapshot, getSceneSnapshot);
  const [timedOut, setTimedOut] = useState(false);
  const [done, setDone] = useState(false);
  const [fading, setFading] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), LOADER_MAX_MS);
    return () => clearTimeout(t);
  }, []);

  const isLoaded = firstFrame || timedOut;
  const pct = isLoaded ? 100 : Math.min(Math.round(progress), 99);

  useEffect(() => {
    if (isLoaded) {
      const tid = setTimeout(() => {
        setDone(true);
        setTimeout(() => { setFading(true); onReady && onReady(); }, 400);
        setTimeout(() => setGone(true), 1350);
      }, 100);
      return () => clearTimeout(tid);
    }
  }, [isLoaded, onReady]);

  useEffect(() => {
    if (gone) return;

    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.documentElement.style.overflow = '';
    };
  }, [gone]);

  if (gone) return null;
  return (
    <div
      className={`scene-loader${fading ? ' scene-loader--fading' : ''}`}
      style={{ pointerEvents: fading ? 'none' : 'auto' }}
    >

      <div className="scene-loader-scanlines" aria-hidden="true" />

      <div className="scene-loader-brand">
        <span className="scene-loader-trigger">TRIGGER</span>
        <span className={`scene-loader-x${done ? ' scene-loader-x--ready' : ''}`}>X</span>
      </div>

      <div className="scene-loader-bar-wrap">
        <div className="scene-loader-bar" style={{ width: `${pct}%` }} />
      </div>

      <div className="scene-loader-status">
        {done ? 'READY' : `${pct < 10 ? `0${pct}` : pct}%`}
      </div>
    </div>
  );
}

function LandingPage() {
  const navRef = useRef();
  // Clients that cannot run the hero at a sane frame rate (no WebGL, CPU
  // rasterizer, reduced-motion) never download the three.js chunk, the model,
  // the environment map or the videos — they get the poster and are ready at once.
  const [use3D] = useState(() => detectSceneSupport().ok);
  const [heroReady, setHeroReady] = useState(!use3D);
  const [activeChannel, setActiveChannel] = useState(0);

  useEffect(() => { document.title = 'TriggerX | Free Crypto Price Alerts'; }, []);

  const navigate = useNavigate();
  const startAuth = () => {
    if (localStorage.getItem('triggerx_token')) navigate('/dashboard', { replace: true });
    else navigate('/auth');
  };

  const handleHeroReady = useCallback(() => setHeroReady(true), []);

  useEffect(() => {
    const onScroll = () => navRef.current?.classList.toggle('nav--scrolled', window.scrollY > 60);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const animateCounter = (el) => {
      const target = parseInt(el.dataset.count, 10);
      const suffix = el.dataset.suffix || '';
      const dur = 1400;
      const start = performance.now();
      const tick = (now) => {
        const p = Math.min((now - start) / dur, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.floor(ease * target) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        if (e.target.classList.contains('reveal') && e.intersectionRatio >= 0.12) {
          e.target.classList.add('visible');
          io.unobserve(e.target);
        }
        if (e.target.dataset.count && e.intersectionRatio >= 0.6) {
          animateCounter(e.target);
          io.unobserve(e.target);
        }
      });
    }, { threshold: [0.12, 0.6] });

    const raf = requestAnimationFrame(() => {
      document.querySelectorAll('.reveal').forEach(el => io.observe(el));
      document.querySelectorAll('.microstat-val[data-count]').forEach(el => io.observe(el));
    });
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, []);

  return (
    <div className="app">
      <GrainLayer zIndex={1} />

      <nav className="nav" ref={navRef} id="navbar" aria-label="Main navigation">
        <div className="nav-inner">
          <a href="/" className="nav-logo">
            <span className="nav-logo-trigger">TRIGGER</span>
            <span className="nav-logo-x">X</span>
          </a>
          <div className="nav-right">
            <a href="https://github.com/Shiva-Xs/triggerx-backend" target="_blank" rel="noopener noreferrer" className="nav-github">
              GITHUB <span className="nav-arrow">↗</span>
            </a>
            <button className="nav-cta" onClick={startAuth}>GET STARTED</button>
          </div>
        </div>
      </nav>

      <main>

      <section className="hero" id="hero" data-ready={heroReady}>

        {use3D && <SceneOverlay onReady={handleHeroReady} />}

        <div className="hero-canvas-wrap">
          {use3D ? (
            <Suspense fallback={null}>
              <HeroScene onReady={handleHeroReady} />
            </Suspense>
          ) : (
            <>
              <picture>
                <source media="(max-width: 767px)" srcSet="/hero-poster-mobile.webp" width="645" height="1398" />
                <img
                  className="hero-poster"
                  src="/hero-poster.webp"
                  alt=""
                  aria-hidden="true"
                  width="1276"
                  height="720"
                  decoding="async"
                  fetchPriority="high"
                />
              </picture>
              <div className="hero-poster-vignette" aria-hidden="true" />
            </>
          )}
        </div>

        <div className="hero-vignette-left" />
        <div className="hero-vignette-right" />
        <div className="hero-vignette-bottom" />

        <div className="hero-content">

          <div className="hero-left">
            <h1 className="hero-headline">
              <span className="hero-line">MARKETS</span>
              <span className="hero-line hero-line--accent">NEVER SLEEP</span>
              <span className="hero-line">NEITHER DO WE</span>
            </h1>

            <p className="hero-subtitle">
              Set a price alert on any crypto available on Binance Spot. Get notified the instant the market hits your target.
            </p>

            <div className="hero-actions">
              <button
                className="btn-glow"
                id="hero-cta"
                onClick={startAuth}
              >
                GET STARTED <span>→</span>
              </button>
            </div>

          </div>

          <div className="hero-center-gap" />

          <div className="hero-right">
            <div className="hero-vstats">
              <div className="hero-vstat">
                <div className="hero-vstat-num">400<span className="hero-vstat-plus">+</span></div>
                <div className="hero-vstat-lbl">PAIRS</div>
              </div>
              <div className="hero-vstat-line" />
              <div className="hero-vstat">
                <div className="hero-vstat-num">&lt;2<span className="hero-vstat-unit">s</span></div>
                <div className="hero-vstat-lbl">LATENCY</div>
              </div>
              <div className="hero-vstat-line" />
              <div className="hero-vstat">
                <div className="hero-vstat-num">$0</div>
                <div className="hero-vstat-lbl">ALWAYS</div>
              </div>
            </div>
          </div>
        </div>

      </section>

      <section className="section features" id="features">
        <div className="container">
          <div className="section-label">02 / WHAT IT DOES</div>
          <h2 className="section-headline">Five things, done perfectly</h2>
          <p className="section-intro">Five capabilities. Zero bloat. All of them exactly right.</p>

          <div className="feat-bento">

            <div className="fbc fbc--hero fbc--indigo">
              <div className="fbc-head">
                <span className="fbc-num">01</span>
                <span className="fbc-icon"><FeatIcon fkey="realtime" size={18} /></span>
              </div>
              <h3 className="fbc-hero-title">LIVE PRICE MONITORING</h3>
              <p className="fbc-desc">Prices stream live from Binance over WebSocket. Every active USDT pair, from BTC to hundreds of altcoins, updates in under one second, continuously, 24/7. TriggerX watches them all so you never have to.</p>

              <div className="fbc-viz fbc-viz--hero"><SignalPipelineMini /></div>

              <div className="fbc-hero-stats">
                <div className="fbc-hero-stat">
                  <span className="fbc-hero-stat-val">400+</span>
                  <span className="fbc-hero-stat-lbl">PAIRS WATCHED</span>
                </div>
                <div className="fbc-hero-stat-sep" />
                <div className="fbc-hero-stat">
                  <span className="fbc-hero-stat-val">&lt;1s</span>
                  <span className="fbc-hero-stat-lbl">PRICE REFRESH</span>
                </div>
                <div className="fbc-hero-stat-sep" />
                <div className="fbc-hero-stat">
                  <span className="fbc-hero-stat-val">24/7</span>
                  <span className="fbc-hero-stat-lbl">ALWAYS ON</span>
                </div>
              </div>
            </div>

            <div className="fbc fbc--rc fbc--indigo">
              <div className="fbc-head">
                <span className="fbc-num">02</span>
                <span className="fbc-icon"><FeatIcon fkey="precise" size={20} /></span>
              </div>
              <h3 className="fbc-title">THREE ALERT CONDITIONS</h3>
              <p className="fbc-desc">Alert when a price goes above your target, drops below it, or crosses it from either direction. The crosses condition watches both sides so you don't need two separate alerts.</p>
              <div className="fbc-viz"><AlertPillsMini /></div>
            </div>

            <div className="fbc fbc--rc fbc--amber">
              <div className="fbc-head">
                <span className="fbc-num">03</span>
                <span className="fbc-icon"><FeatIcon fkey="natural" size={20} /></span>
              </div>
              <h3 className="fbc-title">SET ALERTS IN PLAIN ENGLISH</h3>
              <p className="fbc-desc">No forms. Just type it: "ETH below 2500" or "BTC up 10%". TriggerX parses the intent and arms the alert automatically.</p>
              <div className="fbc-viz"><NLPMini /></div>
            </div>

            <div className="fbc fbc--bl fbc--amber">
              <div className="fbc-head">
                <span className="fbc-num">04</span>
                <span className="fbc-icon"><FeatIcon fkey="relative" size={20} /></span>
              </div>
              <h3 className="fbc-title">PERCENTAGE-BASED ALERTS</h3>
              <p className="fbc-desc">Don't know the exact price? Just say the move. "Alert me when BTC is up 10%." TriggerX reads the live price, works out the target, and sets the alert for you. No math required.</p>
            </div>

            <div className="fbc fbc--br fbc--red">
              <div className="fbc-head">
                <span className="fbc-num">05</span>
                <span className="fbc-icon"><FeatIcon fkey="silent" size={20} /></span>
              </div>
              <h3 className="fbc-title">ONE ALERT, ONE NOTIFICATION</h3>
              <p className="fbc-desc">When your condition is met, you get notified once. No repeated pings, no duplicates. The alert deactivates cleanly after it fires and moves to your history.</p>
            </div>

          </div>
        </div>
      </section>

      <section className="section integrations" id="integrations">
        <div className="container">
          <div className="section-label">03 / WHERE IT FINDS YOU</div>
          <h2 className="section-headline section-headline--nowrap">Alerts reach you, no new app required</h2>
          <p className="section-intro">No new app to check. TriggerX fits into the tools you already use and gets out of your way the moment the alert fires.</p>

          <div className="feat-panel-wrap ch-panel-wrap">

            <div className="feat-pills">
              <div
                className={`feat-pill-indicator feat-rail--${CHANNELS[activeChannel].color}`}
                style={{ top: `calc(${activeChannel} * (100% / 3))`, height: 'calc(100% / 3)' }}
              />
              {CHANNELS.map((c, i) => (
                <button
                  key={c.key}
                  className={`feat-pill feat-pill--${c.color}${activeChannel === i ? ' feat-pill--active' : ''}`}
                  onClick={() => setActiveChannel(i)}
                >
                  <span className="feat-pill-icon"><ChanIcon ckey={c.key} size={26} /></span>
                  <span className="feat-pill-label">{c.pillLabel[0]}</span>
                </button>
              ))}
            </div>

            <div className={`feat-box feat-box--${CHANNELS[activeChannel].color}`}>
              {CHANNELS.map((c, i) => (
                <div key={c.key} className={`feat-box-content ch-box-content${activeChannel === i ? ' ch-box-content--active' : ''}`}>
                  <div className="ch-box-left">
                    <div className="ch-box-tag">{c.tag}</div>
                    <div className={`feat-box-icon feat-box-icon--${c.color}`}>
                      <ChanIcon ckey={c.key} size={56} />
                    </div>
                    <div className="feat-box-title">{c.boxTitle}</div>
                    <p className="feat-box-desc">{c.desc}</p>
                    <ul className="ch-box-feats">
                      {c.features.map((f, fi) => (
                        <li key={fi}>
                          <span className={`ch-glyph ch-glyph--${c.color}`}>◈</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="ch-box-right">
                    <div className="ch-mobile-label">
                      <span className={`ch-mobile-tag ch-mobile-tag--${c.color}`}>{c.tag}</span>
                      <div className="ch-mobile-title">{c.boxTitle}</div>
                      <p className="ch-mobile-desc">{c.mobileDesc}</p>
                    </div>
                    <ChanMockup ckey={c.key} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section how-it-works" id="how-it-works">
        <div className="container">
          <div className="section-label">04 / HOW IT WORKS</div>
          <h2 className="section-headline hiw-headline">Sixty seconds to your first alert</h2>

          <div className="timeline">

            {[
              { num: '01', label: 'AUTHENTICATE', title: 'SIGN IN WITH EMAIL', desc: "Enter your email, verify a one-time code. No account form, no password. You're in within seconds." },
              { num: '02', label: 'DEFINE TARGET', title: 'SET YOUR ALERT', desc: 'Pick any USDT pair, name a price level and direction, or describe it in plain English. TriggerX arms it instantly.' },
              { num: '03', label: 'MARKET WATCHED', title: 'WE WATCH 24/7', desc: 'TriggerX monitors the live Binance feed every second around the clock. No tab to keep open, no refresh needed.' },
              { num: '04', label: 'SIGNAL FIRES', title: 'DELIVERED INSTANTLY', desc: 'The moment your condition is met, a notification fires via Email or Telegram. One alert, then silence.' },
            ].map((s, i, arr) => (
              <div key={i}>
                <div className={`tl-item${i === arr.length - 1 ? ' tl-item--last' : ''}`}>
                  <div className="tl-track">
                    <div className="tl-node">{s.num}</div>
                  </div>
                  <div className="tl-content">
                    <div className="tl-label">{s.label}</div>
                    <h3 className="tl-headline">{s.title}</h3>
                    <p className="tl-desc">{s.desc}</p>
                  </div>
                </div>
                {i < arr.length - 1 && <div className="tl-gap" />}
              </div>
            ))}

          </div>

        </div>
      </section>

      <section className="section faq-section" id="faq">
        <div className="container">
          <div className="section-label">05 / STRAIGHT ANSWERS</div>
          <h2 className="section-headline">Common questions.</h2>

          <div className="faq-grid">
            {[
              { n: '01', q: 'How fast are alerts?', a: 'Prices stream live from Binance with no polling delay. When a price crosses your target the notification goes out within the same second. Telegram is nearly instant. Email typically arrives within a few seconds.' },
              { n: '02', q: 'Can I rely on TriggerX for critical trades?', a: 'TriggerX is designed to be fast and reliable, but no alert service can guarantee delivery 100% of the time. Network interruptions, exchange feed delays, or unexpected downtime can occasionally cause a notification to fire late or be missed. Always use exchange-native stop-losses or limit orders for risk that matters. TriggerX is built to inform, not to replace your trading safeguards.' },
              { n: '03', q: 'What coins are supported?', a: 'Every active USDT trading pair on Binance, hundreds of coins. The list updates automatically every few hours so new listings are picked up without any action from you.' },
              { n: '04', q: 'Is it free?', a: 'Completely free and open source. No credit card, no trial, no hidden tier. The code is on GitHub and will stay that way.' },
              { n: '05', q: 'Do I need to keep a tab open?', a: "No. TriggerX runs on our servers, not your browser. Set an alert, close everything. You'll get notified the moment the condition is met." },
              { n: '06', q: 'How many alerts can I set at once?', a: '50 active alerts per account. That covers every serious trading setup. If you need more, reach out.' },
            ].map(({ n, q, a }) => (
              <div key={n} className="faq-card">
                <div className="card-corner card-corner-tl" />
                <div className="card-corner card-corner-br" />
                <span className="faq-card-num">{n}</span>
                <h3 className="faq-card-q">{q}</h3>
                <p className="faq-card-a">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section principles-section">
        <div className="container">
          <div className="principles-marquee-wrap">
            <div className="principles-marquee-label">THE RULES WE BUILT THIS ON</div>
            <div className="principles-marquee-track" aria-hidden="true">
              <div className="principles-marquee-inner">
                {['PRIVATE', 'SILENT', 'HONEST', 'OPEN', 'CLEAN'].concat(['PRIVATE', 'SILENT', 'HONEST', 'OPEN', 'CLEAN']).map((w, i) => (
                  <span key={i} className="marquee-word">
                    {w}<span className="marquee-sep">·</span>
                  </span>
                ))}
              </div>
            </div>

            <div className="principles-desc-row">
              <div className="principle-desc-item"><strong>PRIVATE</strong>. Your data is never sold. To anyone. Ever.</div>
              <div className="principle-desc-item"><strong>SILENT</strong>. Alerts fire once. No repeat pings, no spam.</div>
              <div className="principle-desc-item"><strong>HONEST</strong>. Your email is for alerts only. Never marketing.</div>
              <div className="principle-desc-item"><strong>OPEN</strong>. <a href="https://github.com/Shiva-Xs/triggerx-backend" target="_blank" rel="noopener noreferrer" className="principle-link">Every line on GitHub.</a></div>
              <div className="principle-desc-item"><strong>CLEAN</strong>. Zero ads. Zero trackers. Zero analytics.</div>
            </div>

            <ul className="principles-list">
              <li><strong>PRIVATE</strong>. Your data is never sold. To anyone. Ever.</li>
              <li><strong>SILENT</strong>. Alerts fire once. No repeat pings, no spam.</li>
              <li><strong>HONEST</strong>. Your email is for alerts only. Never marketing.</li>
              <li><strong>OPEN</strong>. <a href="https://github.com/Shiva-Xs/triggerx-backend" target="_blank" rel="noopener noreferrer" className="principle-link">Every line on GitHub.</a></li>
              <li><strong>CLEAN</strong>. Zero ads. Zero trackers. Zero analytics.</li>
            </ul>
          </div>
        </div>
      </section>
      </main>

      <footer className="footer" id="footer" role="contentinfo" aria-label="Site footer">
        <FooterParticles />
        <div className="container">

          <div className="footer-main">

            <div className="footer-left">
              <div className="footer-logo">
                <span className="footer-logo-trigger">TRIGGER</span>
                <span className="footer-logo-x">X</span>
              </div>
              <p className="footer-tagline">The alert fires<br/>You decide what to do next.</p>
              <p className="footer-disclaimer-line">Alerts are best-effort and not guaranteed. Do not rely solely on TriggerX for trading decisions or risk management.</p>
            </div>

            <nav className="footer-right">
              <div className="footer-col-label">NAVIGATE</div>
              <a href="#features" className="footer-nav-link">Features</a>
              <a href="#integrations" className="footer-nav-link">Integrations</a>
              <a href="#how-it-works" className="footer-nav-link">How It Works</a>
              <a href="#faq" className="footer-nav-link">FAQ</a>
              <Link to="/privacy" state={{ from: '/' }} className="footer-nav-link">Privacy</Link>
              <Link to="/terms"   state={{ from: '/' }} className="footer-nav-link">Terms</Link>
              <a href="https://github.com/Shiva-Xs/triggerx-backend" target="_blank" rel="noopener noreferrer" className="footer-nav-link">GitHub ↗</a>
            </nav>

          </div>

          <div className="footer-bottom">
            <div className="footer-bottom-row">
              <span className="footer-bottom-text">© {new Date().getFullYear()} TRIGGERX</span>
              <span className="footer-bottom-text">NO ADS · NO TRACKING · OPEN SOURCE</span>
            </div>
          </div>

        </div>
      </footer>
    </div>
  );
}

export default function App() {

  useEffect(() => {
    const splash = document.getElementById('splash-loader');
    if (splash) splash.remove();
  }, []);

  return (
    <Routes>
      <Route path="/" element={
        <Suspense fallback={<div style={{ background: '#000', height: '100vh' }} />}>
          <LandingPage />
        </Suspense>
      } />
      <Route path="/auth" element={
        <Suspense fallback={<div style={{ background: '#0A0A0F', height: '100vh' }} />}>
          <AuthPage />
        </Suspense>
      } />
      <Route path="/dashboard" element={
        <Suspense fallback={<div style={{ background: '#0A0A0F', height: '100vh' }} />}>
          <DashboardPage />
        </Suspense>
      } />
      <Route path="/privacy" element={
        <Suspense fallback={<div style={{ background: '#010106', height: '100vh' }} />}>
          <PrivacyPage />
        </Suspense>
      } />
      <Route path="/terms" element={
        <Suspense fallback={<div style={{ background: '#010106', height: '100vh' }} />}>
          <TermsPage />
        </Suspense>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
