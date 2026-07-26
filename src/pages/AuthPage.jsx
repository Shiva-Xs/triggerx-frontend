import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import GrainLayer from '../components/GrainLayer.jsx';
import './AuthPage.css';

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');
const FULL_API = `${API_BASE}/api/v1/auth`;

const fmtSecs = s => { s = Math.max(0, Math.floor(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

async function apiSend(email) {
  const r = await fetch(`${FULL_API}/otp/send`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
  const d = await r.json();
  if (!r.ok) { const e = new Error(d.message || 'Send failed'); e.status = r.status; e.retryAfter = parseInt(r.headers.get('Retry-After') || '3600', 10); throw e; }
  return d;
}

async function apiVerify(email, otp) {
  const r = await fetch(`${FULL_API}/otp/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, otp }) });
  const d = await r.json();
  if (!r.ok) { const e = new Error(d.message || 'Verify failed'); e.code = d.error; e.attemptsRemaining = d.attemptsRemaining; throw e; }
  return d;
}

function OtpBoxes({ onComplete, disabled, verified, shakeId, submitRef }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [popIdx, setPop]    = useState(-1);
  const refs = useRef([]);

  const progress = digits.filter(Boolean).length;

  useEffect(() => { if (popIdx < 0) return; const t = setTimeout(() => setPop(-1), 220); return () => clearTimeout(t); }, [popIdx]);

  useEffect(() => {
    if (!shakeId) return;
    const boxes = refs.current.filter(Boolean);
    boxes.forEach(b => { b.classList.remove('is-err'); void b.offsetWidth; b.classList.add('is-err'); });
    const t = setTimeout(() => boxes.forEach(b => b.classList.remove('is-err')), 400);
    return () => clearTimeout(t);
  }, [shakeId]);

  const handleChange = (i, e) => {
    const val = e.target.value.replace(/\D/g, '').slice(-1);
    if (!val && e.nativeEvent.inputType === 'deleteContentBackward') {
      const next = [...digits]; next[i] = ''; setDigits(next);
      if (i > 0) refs.current[i - 1]?.focus(); return;
    }
    if (!val) return;
    const next = [...digits]; next[i] = val; setDigits(next); setPop(i);
    if (i < 5) refs.current[i + 1]?.focus();
    if (i === 5 && next.join('').length === 6) setTimeout(() => onComplete(next.join('')), 180);
  };

  const handleKeyDown = (i, e) => {
    if (e.key === 'Backspace') { const n = [...digits]; n[i] = ''; setDigits(n); if (!digits[i] && i > 0) refs.current[i - 1]?.focus(); }
    if (e.key === 'ArrowLeft'  && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus();
  };

  const handlePaste = e => {
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (p.length === 6) { setDigits(p.split('')); refs.current[5]?.focus(); setTimeout(() => onComplete(p), 180); }
    e.preventDefault();
  };

  useEffect(() => {
    if (!submitRef) return;
    submitRef.current = () => {
      const code = digits.join('');
      if (code.length === 6 && !disabled && !verified) onComplete(code);
    };
  }, [digits, disabled, verified, onComplete, submitRef]);

  return (
    <>
      <div className="as-otp-row" onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input key={i} ref={el => refs.current[i] = el}
            className={['as-otp-box', d ? 'filled' : '', verified ? 'verified' : '', popIdx === i ? 'digit-pop' : ''].filter(Boolean).join(' ')}
            type="tel" maxLength={2} inputMode="numeric" value={d}
            disabled={disabled || verified}
            onChange={e => handleChange(i, e)}
            onKeyDown={e => handleKeyDown(i, e)}
            autoFocus={i === 0}
          />
        ))}
      </div>
      <div className="as-otp-progress-track">
        <div className="as-otp-progress-fill" style={{ width: `${(progress / 6) * 100}%` }} />
      </div>
    </>
  );
}

function LiveChart() {
  const rootRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const $ = a => root.querySelector(`[data-auth="${a}"]`);
    const svgEl = root.querySelector('.as-chart-svg');

    let W = 0, H = 0, PT = 0, PB = 0, PL = 0, PR = 0;
    const cx0 = () => PL, cx1 = () => W - PR, cy0 = () => PT, cy1 = () => H - PB;

    function setDims() {
      W = root.clientWidth; H = root.clientHeight;
      PT = Math.max(160, H * 0.26); PB = Math.max(90, H * 0.15); PL = 40; PR = 76;
      svgEl?.setAttribute('viewBox', `0 0 ${W} ${H}`);
      const cr = $('clip-rect');
      if (cr) { cr.setAttribute('x', PL); cr.setAttribute('y', PT - 4); cr.setAttribute('width', W - PL - PR + 4); cr.setAttribute('height', H - PT - PB + 8); }
    }

    let prices = [], timestamps = [], livePrice = 0, displayPrice = 0;
    let allHigh = -Infinity, allLow = Infinity, openPrice = 0;
    let animRaf = null, wsDelay = 1500, ws = null, prevPrice = 0, histLoaded = false;

    function seed() {
      let s = Date.now() % 99999;
      const rng = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
      let sp = 67000;
      for (let i = 0; i < 15; i++) { sp += (rng() > 0.48 ? 1 : -1) * (rng() * 18 + 3); prices.push(sp); }
      timestamps = Array.from({ length: 15 }, (_, i) => Date.now() - (15 - i) * 60000);
      livePrice = displayPrice = prices[prices.length - 1];
      openPrice = prices[0]; allHigh = Math.max(...prices); allLow = Math.min(...prices);
    }

    async function fetchHistory() {
      try {
        const data = await (await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=15')).json();
        if (!Array.isArray(data) || !data.length) throw 0;
        prices = data.map(k => parseFloat(k[4])); timestamps = data.map(k => +k[0]);
        livePrice = displayPrice = prices[prices.length - 1]; openPrice = prices[0];
        allHigh = Math.max(...prices); allLow = Math.min(...prices); histLoaded = true; draw();
      } catch (_) { seed(); draw(); }
    }

    function buildPath(pts) {
      if (pts.length < 2) return { d: '', last: [cx1(), (cy0() + cy1()) / 2] };
      const lo = Math.min(...pts), hi = Math.max(...pts), range = hi - lo || 1, pad = range * 0.07;
      const cw = cx1() - cx0(), ch = cy1() - cy0(), xs = cw / (pts.length - 1);
      const c = pts.map((p, i) => [cx0() + i * xs, cy1() - ((p - lo + pad) / (range + pad * 2)) * ch]);
      let d = `M ${c[0][0].toFixed(1)},${c[0][1].toFixed(1)}`;
      for (let i = 1; i < c.length; i++) { const [x0,y0] = c[i-1], [x1,y1] = c[i], mx = (x0+x1)/2; d += ` C ${mx.toFixed(1)},${y0.toFixed(1)} ${mx.toFixed(1)},${y1.toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`; }
      return { d, last: c[c.length - 1] };
    }

    const ns = 'http://www.w3.org/2000/svg';
    function drawGrid(pts) {
      const ge = $('grid-lines'), ye = $('y-labels'), xe = $('x-labels');
      if (!ge || pts.length < 2) return;
      ge.innerHTML = ''; ye.innerHTML = ''; xe.innerHTML = '';
      const lo = Math.min(...pts), hi = Math.max(...pts), range = hi - lo || 1, pad = range * 0.07;
      const loP = lo - pad, hiP = hi + pad;
      for (let i = 0; i <= 5; i++) {
        const t = i / 5, y = cy0() + t * (cy1() - cy0()), price = hiP - t * (hiP - loP);
        const ln = document.createElementNS(ns, 'line');
        ln.setAttribute('x1', cx0()); ln.setAttribute('y1', y.toFixed(1)); ln.setAttribute('x2', cx1()); ln.setAttribute('y2', y.toFixed(1));
        ln.setAttribute('stroke', i === 0 || i === 5 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.035)'); ln.setAttribute('stroke-width', '1');
        if (i > 0 && i < 5) ln.setAttribute('stroke-dasharray', '3,6');
        ge.appendChild(ln);
        const tx = document.createElementNS(ns, 'text');
        tx.setAttribute('x', (cx1() + 10).toFixed(1)); tx.setAttribute('y', (y + 3.5).toFixed(1));
        tx.setAttribute('fill', 'rgba(255,255,255,0.2)'); tx.setAttribute('font-family', 'Geist Mono, monospace'); tx.setAttribute('font-size', '9'); tx.setAttribute('letter-spacing', '0.02em');
        tx.textContent = price >= 1000 ? Math.round(price).toLocaleString('en-US') : price.toFixed(0);
        ye.appendChild(tx);
      }
      const bl = document.createElementNS(ns, 'line'); bl.setAttribute('x1', cx0()); bl.setAttribute('y1', cy1()); bl.setAttribute('x2', cx1()); bl.setAttribute('y2', cy1()); bl.setAttribute('stroke', 'rgba(255,255,255,0.06)'); bl.setAttribute('stroke-width', '1'); ge.appendChild(bl);
      if (timestamps.length) {
        const total = pts.length, cw = cx1() - cx0();
        [0, Math.floor(total * 0.25), Math.floor(total * 0.5), Math.floor(total * 0.75), total - 1].forEach(idx => {
          const x = cx0() + (idx / (total - 1)) * cw, isNow = idx === total - 1;
          const ts = timestamps[Math.min(idx, timestamps.length - 1)], d = new Date(ts);
          const label = isNow ? 'NOW' : d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
          const tk = document.createElementNS(ns, 'line'); tk.setAttribute('x1', x.toFixed(1)); tk.setAttribute('y1', cy1().toFixed(1)); tk.setAttribute('x2', x.toFixed(1)); tk.setAttribute('y2', (cy1() + 5).toFixed(1)); tk.setAttribute('stroke', 'rgba(255,255,255,0.1)'); tk.setAttribute('stroke-width', '1'); xe.appendChild(tk);
          const tl = document.createElementNS(ns, 'text'); tl.setAttribute('x', x.toFixed(1)); tl.setAttribute('y', (cy1() + 18).toFixed(1)); tl.setAttribute('fill', isNow ? 'rgba(0,229,160,0.55)' : 'rgba(255,255,255,0.18)'); tl.setAttribute('font-family', 'Geist Mono, monospace'); tl.setAttribute('font-size', '9'); tl.setAttribute('text-anchor', 'middle'); tl.setAttribute('letter-spacing', '0.07em'); tl.textContent = label; xe.appendChild(tl);
        });
      }
    }

    function draw() {
      if (!W) return;
      const arr = [...prices]; if (arr.length) arr[arr.length - 1] = livePrice;
      const { d, last } = buildPath(arr);
      const fill = d + ` L ${last[0].toFixed(1)},${cy1()} L ${cx0()},${cy1()} Z`;
      $('s-fill')?.setAttribute('d', fill); $('s-line')?.setAttribute('d', d);
      $('s-dot')?.setAttribute('cx', last[0]); $('s-dot')?.setAttribute('cy', last[1]);
      $('s-ring')?.setAttribute('cx', last[0]); $('s-ring')?.setAttribute('cy', last[1]);
      drawGrid(arr);
    }

    function animPrice(target) {
      const el = $('price-lbl'); if (!el) return;
      if (animRaf) cancelAnimationFrame(animRaf);
      const start = displayPrice, t0 = performance.now(), dur = 260;
      function step(now) {
        const t = Math.min((now - t0) / dur, 1), ease = 1 - Math.pow(1 - t, 3);
        displayPrice = start + (target - start) * ease;
        el.textContent = displayPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (t < 1) animRaf = requestAnimationFrame(step); else { displayPrice = target; el.textContent = target.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
      }
      animRaf = requestAnimationFrame(step);
    }

    function onPrice(price, h24, l24) {
      const changed = Math.abs(price - prevPrice) > 0.01;
      if (changed) animPrice(price);
      livePrice = price;
      if (price > allHigh) allHigh = price;
      if (allLow === Infinity || price < allLow) allLow = price;
      if (histLoaded && prices.length) prices[prices.length - 1] = price;
      const ref = openPrice || prices[0] || price, diff = price - ref, pct = ((diff / ref) * 100).toFixed(2);
      const ce = $('chg-lbl');
      if (ce) { ce.textContent = `${diff >= 0 ? '▲' : '▼'} ${Math.abs(pct)}%`; ce.className = `as-r-chg ${diff >= 0 ? 'up' : 'dn'}`; }
      const hEl = $('stat-high'), lEl = $('stat-low');
      if (hEl) hEl.textContent = '$' + (h24 || allHigh).toLocaleString('en-US', { maximumFractionDigits: 0 });
      if (lEl) lEl.textContent = '$' + (l24 || allLow).toLocaleString('en-US', { maximumFractionDigits: 0 });
      prevPrice = price; draw();
    }

    function setWs(state) {
      const el = $('ws-status'), lbl = $('ws-label'), dot = $('ws-dot');
      if (el) el.className = 'as-ws-status ' + state;
      if (lbl) lbl.textContent = { live: 'Connected', connecting: 'Connecting', error: 'Reconnecting' }[state] || state;
      if (dot) dot.className = 'as-ws-dot';
    }

    function connect() {
      setWs('connecting');
      try { ws = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@aggTrade/btcusdt@miniTicker'); } catch (_) { schedRecon(); return; }
      ws.onopen  = () => { wsDelay = 1500; setWs('live'); };
      ws.onmessage = ({ data }) => {
        try {
          const msg = JSON.parse(data);
          if (msg.e === 'aggTrade') { onPrice(parseFloat(msg.p), allHigh, allLow); }
          else if (msg.e === '24hrMiniTicker') {
            const h = parseFloat(msg.h), l = parseFloat(msg.l), v = parseFloat(msg.q) / 1e9;
            const hEl = $('stat-high'), lEl = $('stat-low'), vEl = $('stat-vol');
            if (hEl) hEl.textContent = '$' + h.toLocaleString('en-US', { maximumFractionDigits: 0 });
            if (lEl) lEl.textContent = '$' + l.toLocaleString('en-US', { maximumFractionDigits: 0 });
            if (vEl) vEl.textContent = '$' + v.toFixed(2) + 'B';
            if (!openPrice) openPrice = parseFloat(msg.o);
            allHigh = h; allLow = l;
          }
        } catch (_) {}
      };
      ws.onerror = () => setWs('error');
      ws.onclose = () => { setWs('error'); schedRecon(); };
    }
    function schedRecon() { setTimeout(() => { wsDelay = Math.min(wsDelay * 1.5, 30000); connect(); }, wsDelay); }

    setDims(); seed(); draw(); fetchHistory(); connect();
    const ro = window.ResizeObserver ? new ResizeObserver(() => { setDims(); draw(); }) : null;
    ro?.observe(root);

    return () => {
      ro?.disconnect();
      if (ws) { ws.onclose = null; ws.onerror = null; ws.close(); }
      if (animRaf) cancelAnimationFrame(animRaf);
    };
  }, []);

  return (
    <div className="as-chart-full" ref={rootRef}>
      <svg className="as-chart-svg" preserveAspectRatio="none">
        <defs>
          <linearGradient id="as-sfill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="rgba(92,143,255,0.22)" />
            <stop offset="100%" stopColor="rgba(79,91,213,0)"     />
          </linearGradient>
          <linearGradient id="as-sline" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="rgba(41,121,255,0.35)" />
            <stop offset="50%"  stopColor="rgba(79,91,213,0.85)"  />
            <stop offset="100%" stopColor="rgba(92,143,255,1.0)"  />
          </linearGradient>
          <clipPath id="as-chart-clip"><rect data-auth="clip-rect" /></clipPath>
        </defs>
        <g data-auth="grid-lines" /><g data-auth="y-labels" /><g data-auth="x-labels" />
        <g clipPath="url(#as-chart-clip)">
          <path data-auth="s-fill" fill="url(#as-sfill)" />
          <path data-auth="s-line" fill="none" stroke="url(#as-sline)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <circle data-auth="s-dot" r="3.5" fill="#7BA7FF">
          <animate attributeName="r" values="2.5;4;2.5" dur="2.4s" repeatCount="indefinite" />
        </circle>
        <circle data-auth="s-ring" r="6" fill="none" stroke="#4F5BD5" strokeWidth="0.7" opacity="0.22">
          <animate attributeName="r"       values="5;16;5"      dur="2.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.22;0;0.22" dur="2.4s" repeatCount="indefinite" />
        </circle>
      </svg>

      <div className="as-chart-infobar">
        <div className="as-cib-left">
          <div className="as-cib-eyebrow">
            <span className="as-r-pair">Bitcoin</span>
            <span className="as-r-pair-sub">· USDT</span>
            <span className="as-ws-status" data-auth="ws-status">
              <span className="as-ws-dot" data-auth="ws-dot" />
              <span data-auth="ws-label">Connecting</span>
            </span>
          </div>
          <div className="as-cib-price-row">
            <div className="as-r-price" data-auth="price-lbl"></div>
            <div className="as-r-chg" data-auth="chg-lbl"></div>
          </div>
        </div>
        <div className="as-cib-stats">
          {[['24h High','stat-high'],['24h Low','stat-low'],['Volume','stat-vol']].map(([label, attr]) => (
            <div key={label} className="as-cib-stat">
              <span className="as-r-stat-label">{label}</span>
              <span className="as-r-stat-val" data-auth={attr}>···</span>
            </div>
          ))}
          <div className="as-cib-stat">
            <span className="as-r-stat-label">Period</span>
            <span className="as-r-stat-val" style={{color:'rgba(79,91,213,0.7)'}}>15M · Live</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  const navigate = useNavigate();

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
    if (localStorage.getItem('triggerx_token')) navigate('/dashboard', { replace: true });
  }, [navigate]);

  const [phase,       setPhase]       = useState('email');
  const [email,       setEmail]       = useState('');
  const [emailWrapErr,setEmailWrapErr] = useState(false);
  const [emailMsg,    setEmailMsg]     = useState('');
  const [otpMsg,      setOtpMsg]       = useState('');
  const [otpMsgType,  setOtpMsgType]   = useState('');
  const [expiresIn,   setExpiresIn]    = useState(600);
  const [resendSecs,  setResendSecs]   = useState(30);
  const [resendAvail, setResendAvail]  = useState(false);
  const [verifyLoading,setVerifyLoading] = useState(false);
  const [otpVerified, setOtpVerified]  = useState(false);
  const [shakeId,     setShakeId]      = useState(0);
  const [btnText,     setBtnText]      = useState('Get Started · it\'s free');
  const [btnOk,       setBtnOk]        = useState(false);
  const [tcAccepted,      setTcAccepted]      = useState(false);
  const [tcModalOpen,     setTcModalOpen]     = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);

  const emailRef     = useRef(null);
  const otpSubmitRef = useRef(null);
  const [resendKey,     setResendKey]     = useState(0);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    if (phase !== 'otp') return;
    const id = setInterval(() => setExpiresIn(s => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'otp') return;
    setResendSecs(30); setResendAvail(false);
    const id = setInterval(() => setResendSecs(s => { if (s <= 1) { setResendAvail(true); clearInterval(id); return 0; } return s - 1; }), 1000);
    return () => clearInterval(id);
  }, [phase, resendKey]);

  useEffect(() => { const t = setTimeout(() => emailRef.current?.focus(), 300); return () => clearTimeout(t); }, []);

  const handleSend = useCallback(async () => {
    if (!tcAccepted) {
      setEmailMsg('✗  Please accept the Terms of Service to continue.'); return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailWrapErr(true); setEmailMsg('✗  Please enter a valid email address.'); return;
    }
    setEmailMsg(''); setEmailWrapErr(false);
    setPhase('otp');
    apiSend(email).then(data => {
      setExpiresIn(data.expiresInSeconds || 600);
    }).catch(err => {
      if (err.status === 429) setOtpMsg(`✗  Too many requests. Try again in ${fmtSecs(err.retryAfter)}.`);
      else setOtpMsg('✗  Couldn\'t send the code. Please try again.');
      setOtpMsgType('err');
    });
  }, [email, tcAccepted]);

  const handleVerify = useCallback(async (otp) => {
    setVerifyLoading(true); setOtpMsg('');
    try {
      const data = await apiVerify(email, otp);
      localStorage.setItem('triggerx_token', data.token);
      localStorage.setItem('triggerx_user', JSON.stringify({ id: data.userId, email: data.email }));
      setOtpVerified(true); setBtnOk(true); setBtnText('✓ Access Granted. Opening Dashboard');
      setTimeout(() => navigate('/dashboard'), 520);
    } catch (err) {
      setShakeId(id => id + 1);
      const rem = err.attemptsRemaining;
      if (err.code === 'INVALID_OTP')          setOtpMsg(rem != null ? `✗  Wrong code. ${rem} attempt${rem === 1 ? '' : 's'} left.` : '✗  Wrong or expired code.');
      else if (err.code === 'OTP_EXPIRED')     setOtpMsg('✗  Code expired. Request a new one.');
      else if (err.code === 'MAX_ATTEMPTS_REACHED') setOtpMsg('✗  Too many attempts. Request a new code.');
      else setOtpMsg('✗  Verification failed. Please try again.');
    } finally { setVerifyLoading(false); }
  }, [email, navigate]);

  const handleResend = useCallback(async () => {
    setOtpMsg(''); setResendAvail(false); setResendLoading(true);
    try {
      const data = await apiSend(email);
      setExpiresIn(data.expiresInSeconds || 600);
      setOtpMsg('✓  New code sent.'); setOtpMsgType('ok');
      setResendKey(k => k + 1);
      setTimeout(() => { setOtpMsg(''); setOtpMsgType(''); }, 3000);
    } catch {
      setOtpMsg('✗  Couldn\'t resend. Please try again.'); setOtpMsgType('err');
      setResendAvail(true);
    } finally {
      setResendLoading(false);
    }
  }, [email]);

  const goBack = () => { setPhase('email'); setOtpMsg(''); setOtpMsgType(''); setShakeId(0); };

  return (
    <div className="auth-split">
      <GrainLayer zIndex={5} />

      <div className="as-left">
        <div className="as-left-grid" />

        <div className="as-nav-row">
          <button className="as-home-btn" onClick={() => navigate('/')}>← HOME</button>
          <div className="as-wordmark">TRIGGER<span className="x">X</span></div>
        </div>

        <div className="as-spacer-top" />

        <div className="as-hero">
          <h1>PRICE ALERTS,<br /><span className="accent">INSTANTLY</span></h1>
        </div>

        <div className="as-form-divider" />

        <div className="as-steps-wrap">

          <div className={`as-step ${phase === 'email' ? 'active' : ''}`}>
            <div className="as-section-label">Identify Yourself</div>
            <p className="as-auth-hint">This is where your <strong>price alerts land</strong>.<br/>We'll send a one-time code to verify it's yours.</p>
            <div className={`as-email-wrap ${emailWrapErr ? 'is-err' : ''}`}>
              <span className="as-input-prefix">_</span>
              <input
                ref={emailRef} type="email" placeholder="enter your email"
                value={email} autoComplete="email"
                onChange={e => { setEmail(e.target.value); setEmailWrapErr(false); setEmailMsg(''); }}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
              />
            </div>
            {emailMsg && <div className="as-msg err">{emailMsg}</div>}
            <div className="as-tc-row">
              <button
                type="button"
                className={`as-tc-checkbox ${tcAccepted ? 'checked' : ''}`}
                onClick={() => setTcAccepted(v => !v)}
                aria-label="Accept Terms of Service"
              >
                {tcAccepted && (
                  <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                    <path d="M1 3.5L3.5 6L8 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
              <span className="as-tc-label">
                I agree to the{' '}
                <button type="button" className="as-tc-link" onClick={() => setTcModalOpen(true)}>Terms of Service</button>
                {' '}and{' '}
                <button type="button" className="as-tc-link" onClick={() => setPrivacyModalOpen(true)}>Privacy Policy</button>
              </span>
            </div>
            <button
              className="as-btn"
              onClick={handleSend}
              disabled={!tcAccepted}
            >{btnText}</button>
            <p className="as-no-pass">No password. Just a 6-digit code.</p>
          </div>

          <div className={`as-step ${phase === 'otp' ? 'active' : ''}`}>
            <div className="as-section-label">Enter Access Code</div>
            <div className="as-otp-header">
              <span className="as-field-label">Verification code</span>
              <span className="as-otp-sent-to">→ <strong>{email}</strong></span>
            </div>
            <OtpBoxes onComplete={handleVerify} disabled={verifyLoading} verified={otpVerified} shakeId={shakeId} submitRef={otpSubmitRef} />
            <div className={`as-msg ${otpMsgType}`}>{otpMsg}</div>
            <button
              className={`as-btn ${verifyLoading ? 'loading' : ''} ${btnOk ? 'ok' : ''}`}
              disabled={verifyLoading || otpVerified}
              onClick={() => otpSubmitRef.current?.()}
            >{btnOk ? btnText : 'Verify OTP'}</button>
            <div className="as-countdown-row" style={{ marginTop: '12px' }}>
              <span className="as-countdown-txt">Expires <span>{fmtSecs(expiresIn)}</span></span>
              {resendAvail
                ? <button className="as-resend-btn" onClick={handleResend} disabled={resendLoading}>{resendLoading ? 'Sending…' : 'Resend'}</button>
                : <span className="as-resend-wait">Resend in {resendSecs}s</span>
              }
            </div>
            <div className="as-back-row"><button onClick={goBack}>← Wrong email</button></div>
          </div>

        </div>

        <div className="as-spacer-bot" />

        <div className="as-left-footer">
          <div className="as-trust-item">
            <svg width="10" height="12" viewBox="0 0 10 12" fill="none"><rect x="1" y="5" width="8" height="6.5" rx="1" stroke="currentColor" strokeWidth="1.2"/><path d="M3 5V3.4a2 2 0 0 1 4 0V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
            SSL Secured
          </div>
          <div className="as-trust-item">
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" strokeWidth="1.2"/><path d="M3.5 5.5l1.5 1.5 2.5-2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            No Spam
          </div>
          <div className="as-trust-item">
            <svg width="10" height="11" viewBox="0 0 10 11" fill="none"><path d="M5 1l1.2 2.8h3l-2.4 1.7.9 2.8L5 6.8 2.3 8.3l.9-2.8L.8 3.8h3z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/></svg>
            Free Forever
          </div>
        </div>
      </div>

      {privacyModalOpen && (
        <div className="as-tc-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setPrivacyModalOpen(false); }}>
          <div className="as-tc-modal">
            <div className="as-tc-modal-header">
              <span className="as-tc-modal-title">Privacy Policy</span>
              <button className="as-tc-modal-close" onClick={() => setPrivacyModalOpen(false)}>&#x2715;</button>
            </div>
            <div className="as-tc-modal-body">
              <p className="as-tc-section-label">1. What We Collect</p>
              <p>We collect only your email address. It is used exclusively to send one-time sign-in codes and price alert notifications. We collect nothing else: no name, no payment information, no device fingerprint, no browsing data.</p>

              <p className="as-tc-section-label">2. How We Use It</p>
              <p>Your email is used for two purposes only: (a) sending a 6-digit OTP when you sign in, and (b) delivering alert emails when your configured price conditions are met.</p>

              <p className="as-tc-section-label">3. What We Do Not Do</p>
              <p>We do not sell, rent, share, or transfer your email address to any third party. We do not send marketing emails, newsletters, or promotional messages. We do not run analytics or tracking scripts. There are no ads on TriggerX.</p>

              <p className="as-tc-section-label">4. Telegram Integration</p>
              <p>Connecting Telegram is entirely optional. If you choose to link your account, your Telegram user ID is stored to route alert messages to your chat. You can unlink Telegram at any time from the dashboard.</p>

              <p className="as-tc-section-label">5. Data Storage</p>
              <p>Your email address and alert configurations are stored in a secured PostgreSQL database hosted on Azure. We use encrypted connections and apply standard access controls to protect your data.</p>

              <p className="as-tc-section-label">6. Browser Storage</p>
              <p>TriggerX stores your JWT session token in your browser&apos;s <code>localStorage</code> only. We use no cookies and no third-party tracking scripts.</p>

              <p className="as-tc-section-label">7. Retention</p>
              <p>Your data is retained for as long as your account is active. To request deletion, email us below. We will process the request within 7 days.</p>

              <p className="as-tc-section-label">8. Contact</p>
              <p>Questions or deletion requests: <a href="mailto:triggerx.notify@gmail.com">triggerx.notify@gmail.com</a></p>
            </div>
            <div className="as-tc-modal-footer">
              <button className="as-tc-agree-btn" onClick={() => setPrivacyModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {tcModalOpen && (
        <div className="as-tc-modal-overlay" onClick={e => { if (e.target === e.currentTarget) setTcModalOpen(false); }}>
          <div className="as-tc-modal">
            <div className="as-tc-modal-header">
              <span className="as-tc-modal-title">Terms of Service</span>
              <button className="as-tc-modal-close" onClick={() => setTcModalOpen(false)}>&#x2715;</button>
            </div>
            <div className="as-tc-modal-body">
              <p className="as-tc-section-label">1. Acceptance of Terms</p>
              <p>By using TriggerX, you agree to these Terms. If you do not agree, you must not use the Service.</p>

              <p className="as-tc-section-label">2. Description of Service</p>
              <p>TriggerX provides real-time cryptocurrency price alerts. Prices are sourced from the Binance Spot API. This is a notification service only, not a financial platform.</p>

              <p className="as-tc-section-label">3. No Financial Advice</p>
              <p>Nothing on TriggerX constitutes financial advice, investment advice, or a recommendation to buy or sell any asset. You are solely responsible for your own trading decisions. Cryptocurrency markets are highly volatile and involve significant risk.</p>

              <p className="as-tc-section-label">4. Alert Delivery</p>
              <p>We make reasonable efforts to deliver alerts when conditions are met. We do not guarantee that alerts will be delivered instantly or at all. Alert delivery may be affected by network outages, data delays, or rapid price movements.</p>

              <p className="as-tc-section-label">5. Eligibility</p>
              <p>You must be at least 18 years of age to use TriggerX.</p>

              <p className="as-tc-section-label">6. Acceptable Use</p>
              <p>You agree not to reverse-engineer, scrape, or abuse the TriggerX API, interfere with the Service, or use it for any unlawful purpose.</p>

              <p className="as-tc-section-label">7. Limitation of Liability</p>
              <p>TriggerX and its operators shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Service. Our total liability shall not exceed $10 USD.</p>

              <p className="as-tc-section-label">8. Governing Law</p>
              <p>These Terms are governed by the laws of India. Any disputes shall be subject to the jurisdiction of courts in India.</p>

              <p className="as-tc-section-label">9. Contact</p>
              <p>Questions? Email us at <a href="mailto:triggerx.notify@gmail.com">triggerx.notify@gmail.com</a></p>
            </div>
            <div className="as-tc-modal-footer">
              <button
                className="as-tc-agree-btn"
                onClick={() => { setTcAccepted(true); setTcModalOpen(false); setEmailMsg(''); }}
              >I Agree</button>
            </div>
          </div>
        </div>
      )}

      <div className="as-right">
        <div className="as-edge-fade" />
        <div className="as-r-watermark">BTC / USDT · Live</div>
        <LiveChart />
      </div>

    </div>
  );
}
