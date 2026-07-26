import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import GrainLayer from '../components/GrainLayer.jsx';
import './DashboardPage.css';

function Toast({ message, onDismiss }) {
  const [exiting, setExiting] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setExiting(true), 3600);
    const t2 = setTimeout(onDismiss, 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDismiss]);
  return createPortal(
    <div className={`db-toast ${exiting ? 'db-toast--exit' : ''}`} onClick={onDismiss}>
      <span className="db-toast-icon">⚠</span>
      <span className="db-toast-msg">{message}</span>
      <button className="db-toast-close" aria-label="Dismiss">✕</button>
    </div>,
    document.body
  );
}

const _bus = {
  ws: null,
  symbols: new Set(),
  listeners: new Map(),
  last: new Map(),
  reconnectTimer: null,
};

function _busConnect() {
  clearTimeout(_bus.reconnectTimer);
  if (_bus.ws) { try { _bus.ws.close(); } catch (_) {} _bus.ws = null; }
  if (_bus.symbols.size === 0) return;
  const streams = [..._bus.symbols].map(s => `${s.toLowerCase()}@miniTicker`).join('/');
  const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
  _bus.ws = ws;
  ws.onerror = () => {};
  ws.onclose = () => { if (_bus.ws === ws) _bus.ws = null; };
  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      const sym = (msg.stream || '').split('@')[0].toUpperCase();
      const val = parseFloat(msg.data?.c);
      if (!sym || !val) return;
      _bus.last.set(sym, val);
      _bus.listeners.get(sym)?.forEach(fn => fn(val));
    } catch (_) {}
  };
}

function _subscribe(symbol, cb) {
  if (!symbol) return () => {};
  const sym = symbol.toUpperCase();
  if (!_bus.listeners.has(sym)) _bus.listeners.set(sym, new Set());
  _bus.listeners.get(sym).add(cb);
  const isNew = !_bus.symbols.has(sym);
  _bus.symbols.add(sym);
  if (_bus.last.has(sym)) cb(_bus.last.get(sym));
  if (isNew) {
    clearTimeout(_bus.reconnectTimer);
    _bus.reconnectTimer = setTimeout(_busConnect, 100);
  }
  return () => {
    _bus.listeners.get(sym)?.delete(cb);
    if (_bus.listeners.get(sym)?.size === 0) {
      _bus.listeners.delete(sym);
      _bus.symbols.delete(sym);
      _bus.last.delete(sym);
      clearTimeout(_bus.reconnectTimer);
      _bus.reconnectTimer = setTimeout(_busConnect, 100);
    }
  };
}

function useLivePrice(symbol) {
  const [price, setPrice] = useState(null);
  const [flash, setFlash] = useState(null);
  const prevRef  = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const unsub = _subscribe(symbol, (next) => {
      if (prevRef.current !== null && next !== prevRef.current) {
        setFlash(next > prevRef.current ? 'up' : 'down');
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setFlash(null), 700);
      }
      prevRef.current = next;
      setPrice(next);
    });
    return () => { unsub(); clearTimeout(timerRef.current); };
  }, [symbol]);

  return { price, flash };
}

const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '');

let _navigate = null;

function authHeaders() {
  const token = localStorage.getItem('triggerx_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiFetch(path, opts = {}) {
  const r = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { ...authHeaders(), ...(opts.headers || {}) },
  });
  if (r.status === 401) {
    localStorage.removeItem('triggerx_token');
    localStorage.removeItem('triggerx_user');
    if (_navigate) _navigate('/', { replace: true });
    else window.location.replace('/');
    return;
  }
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    const e = new Error(d.message || 'Something went wrong. Please try again.');
    e.status = r.status;
    e.code   = d.error || null;
    throw e;
  }
  return r.status === 204 ? null : r.json();
}

const IconBTC = () => (
  <svg width="18" height="18" viewBox="0 0 32 32" fill="currentColor">
    <path d="M16 32C7.163 32 0 24.837 0 16S7.163 0 16 0s16 7.163 16 16-7.163 16-16 16zm7.189-17.98c.314-2.096-1.283-3.223-3.465-3.975l.708-2.84-1.728-.43-.69 2.765c-.454-.114-.92-.22-1.385-.326l.695-2.783L15.596 6l-.708 2.839c-.376-.086-.746-.17-1.104-.26v-.009l-2.384-.595-.46 1.846s1.283.294 1.255.312c.7.175.826.638.805 1.006l-.806 3.235c.048.012.11.03.18.057l-.183-.045-1.13 4.532c-.086.212-.303.531-.793.41.018.025-1.256-.313-1.256-.313l-.858 1.978 2.25.561c.418.105.828.215 1.231.318l-.715 2.872 1.727.43.708-2.84c.472.127.93.245 1.378.357l-.706 2.828 1.728.43.715-2.866c2.948.558 5.164.333 6.097-2.333.752-2.146-.037-3.385-1.588-4.192 1.13-.26 1.98-1.003 2.207-2.538zm-3.95 5.538c-.533 2.147-4.148.986-5.32.695l.95-3.805c1.172.293 4.929.872 4.37 3.11zm.535-5.569c-.487 1.953-3.495.96-4.47.717l.86-3.45c.975.243 4.118.695 3.61 2.733z"/>
  </svg>
);
const IconETH = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.944 17.97L4.58 13.62 11.943 24l7.37-10.38-7.372 4.35h.003z" opacity="0.60"/>
    <path d="M12.056 0L4.69 12.223l7.365 4.354 7.365-4.35L12.056 0z"/>
  </svg>
);
const StatBar = memo(function StatBar({ alertCounts }) {
  const btc = useLivePrice('BTCUSDT');
  const eth = useLivePrice('ETHUSDT');
  const quotaUsed = alertCounts.active != null ? alertCounts.active : null;

  const fmt = (p) =>
    p != null
      ? '$' + p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      : null;

  const Skel = () => <span className="db-skel db-skel--sm" />;

  const quotaPct = quotaUsed != null ? Math.min((quotaUsed / 50) * 100, 100) : 0;
  return (
      <div className="db-stat-card db-anim-1">

        <div className="db-sc-head">
          <span className="db-sc-eyebrow">MARKET STATS</span>
          <div className="db-sc-live-badge">
            <span className="db-live-dot" />
            <span className="db-sc-live-label">LIVE</span>
          </div>
        </div>

        <div className="db-sc-prices">
          <div className="db-sc-price-row">
            <div className="db-sc-coin">
              <div className="db-sc-coin-icon db-sc-coin-icon--btc"><IconBTC /></div>
              <div className="db-sc-coin-info">
                <span className="db-sc-coin-name">BITCOIN</span>
                <span className="db-sc-coin-pair">/ USDT</span>
              </div>
            </div>
            <span className={`db-sc-price-val db-flash--${btc.flash || 'none'}`}>
              {fmt(btc.price) ?? <Skel />}
            </span>
          </div>
          <div className="db-sc-price-row">
            <div className="db-sc-coin">
              <div className="db-sc-coin-icon db-sc-coin-icon--eth"><IconETH /></div>
              <div className="db-sc-coin-info">
                <span className="db-sc-coin-name">ETHEREUM</span>
                <span className="db-sc-coin-pair">/ USDT</span>
              </div>
            </div>
            <span className={`db-sc-price-val db-flash--${eth.flash || 'none'}`}>
              {fmt(eth.price) ?? <Skel />}
            </span>
          </div>
        </div>

        <div className="db-sc-sep" />

        <div className="db-sc-counts">
          <div className="db-sc-count">
            <span className={`db-sc-count-num db-sbi-val--indigo${alertCounts.active != null ? ' db-count-appear' : ''}`}>
              {alertCounts.active != null ? alertCounts.active : <Skel />}
            </span>
            <span className="db-sc-count-lbl">ACTIVE</span>
          </div>
          <div className="db-sc-count-divider" />
          <div className="db-sc-count">
            <span className={`db-sc-count-num db-sbi-val--green${alertCounts.triggered != null ? ' db-count-appear' : ''}`}>
              {alertCounts.triggered != null ? alertCounts.triggered : <Skel />}
            </span>
            <span className="db-sc-count-lbl">TRIGGERED</span>
          </div>
        </div>

        <div className="db-sc-quota">
          <div className="db-sc-quota-row">
            <span className="db-sc-quota-lbl">QUOTA</span>
            <span className="db-sc-quota-num db-sbi-val--amber">
              {quotaUsed != null ? <>{quotaUsed}<span className="db-sbi-denom"> / 50</span></> : <Skel />}
            </span>
          </div>
          <div className="db-sc-quota-track">
            <div className="db-sc-quota-fill" style={{width:`${quotaPct}%`}} />
          </div>
        </div>

      </div>
  );
});

const COIN_NAME_MAP = {
  bitcoin: 'BTC', btc: 'BTC',
  ethereum: 'ETH', eth: 'ETH',
  solana: 'SOL', sol: 'SOL',
  dogecoin: 'DOGE', doge: 'DOGE',
  binancecoin: 'BNB', bnb: 'BNB',
  ripple: 'XRP', xrp: 'XRP',
  cardano: 'ADA', ada: 'ADA',
  avalanche: 'AVAX', avax: 'AVAX',
  chainlink: 'LINK', link: 'LINK',
  polkadot: 'DOT', dot: 'DOT',
  shibainu: 'SHIB', shiba: 'SHIB', shib: 'SHIB',
  litecoin: 'LTC', ltc: 'LTC',
  polygon: 'MATIC', matic: 'MATIC',
  tron: 'TRX', trx: 'TRX',
  near: 'NEAR',
  cosmos: 'ATOM', atom: 'ATOM',
  pepe: 'PEPE',
  uniswap: 'UNI', uni: 'UNI',
  stellar: 'XLM', xlm: 'XLM',
  aptos: 'APT', apt: 'APT',
  arbitrum: 'ARB', arb: 'ARB',
  optimism: 'OP',
  sui: 'SUI',
  toncoin: 'TON', ton: 'TON',
  filecoin: 'FIL', fil: 'FIL',
  maker: 'MKR', mkr: 'MKR',
  aave: 'AAVE',
  injective: 'INJ', inj: 'INJ',
};

const COIN_DISPLAY_NAMES = {
  BTC: 'Bitcoin',       ETH: 'Ethereum',      SOL: 'Solana',         BNB: 'BNB Chain',
  XRP: 'Ripple',        DOGE: 'Dogecoin',     ADA: 'Cardano',        AVAX: 'Avalanche',
  LINK: 'Chainlink',    DOT: 'Polkadot',      SHIB: 'Shiba Inu',     LTC: 'Litecoin',
  MATIC: 'Polygon',     TRX: 'TRON',          NEAR: 'NEAR Protocol', ATOM: 'Cosmos',
  PEPE: 'Pepe',         UNI: 'Uniswap',       XLM: 'Stellar',        APT: 'Aptos',
  ARB: 'Arbitrum',      OP: 'Optimism',        SUI: 'Sui',            TON: 'Toncoin',
  FIL: 'Filecoin',      MKR: 'Maker',          AAVE: 'Aave',          INJ: 'Injective',
  WIF: 'dogwifhat',     BONK: 'Bonk',          JUP: 'Jupiter',        ORDI: 'Ordinals',
  SEI: 'Sei',           TIA: 'Celestia',       ALGO: 'Algorand',      FTM: 'Fantom',
  SAND: 'The Sandbox',  MANA: 'Decentraland',  AXS: 'Axie Infinity',  IMX: 'Immutable',
  RUNE: 'THORChain',    HBAR: 'Hedera',        VET: 'VeChain',        GALA: 'Gala',
  CHZ: 'Chiliz',        FLOW: 'Flow',          ENJ: 'Enjin Coin',     ROSE: 'Oasis',
  ONE: 'Harmony',       ZIL: 'Zilliqa',        WAVES: 'Waves',        HOT: 'Holo',
};

const QUOTE_CURRENCIES = ['USDT', 'BUSD', 'BNB', 'ETH', 'BTC'];

function getSymbolParts(symbol) {
  for (const q of QUOTE_CURRENCIES) {
    if (symbol.endsWith(q) && symbol.length > q.length) {
      return { base: symbol.slice(0, -q.length), quote: q };
    }
  }
  return { base: symbol, quote: '' };
}

function resolveQuery(q) {
  const lower = q.trim().toLowerCase().replace(/\s+/g, '');
  return COIN_NAME_MAP[lower] || q.trim().toUpperCase();
}

function SymbolSearch({ value, onChange }) {
  const [query,     setQuery]     = useState(value || '');
  const [results,   setResults]   = useState([]);
  const [open,      setOpen]      = useState(false);
  const [searching, setSearching] = useState(false);
  const [hiIdx,     setHiIdx]     = useState(-1);
  const debounce = useRef(null);
  const wrapRef  = useRef(null);

  useEffect(() => () => clearTimeout(debounce.current), []);

  useEffect(() => { setQuery(value || ''); }, [value]);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = useCallback((q) => {
    clearTimeout(debounce.current);
    if (q.length < 2) { setResults([]); setOpen(false); setSearching(false); return; }
    setSearching(true);
    debounce.current = setTimeout(async () => {
      try {
        const resolved = resolveQuery(q);
        const d = await apiFetch(`/api/v1/symbols/search?q=${encodeURIComponent(resolved)}`);
        setResults(d?.results || []);
        setOpen(true);
        setHiIdx(-1);
      } catch {
        setResults([]);
        setOpen(true);
      }
      setSearching(false);
    }, 220);
  }, []);

  const commit = useCallback((sym) => {
    setQuery(sym);
    onChange(sym);
    setOpen(false);
    setHiIdx(-1);
  }, [onChange]);

  const handleChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    if (!v) onChange('');
    search(v);
  };

  const handleKeyDown = (e) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHiIdx(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHiIdx(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = hiIdx >= 0 ? results[hiIdx] : results[0];
      if (target) commit(target);
    } else if (e.key === 'Escape') {
      setOpen(false);
      setHiIdx(-1);
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      setOpen(false);
      const v = query.trim().toUpperCase();
      if (v && v !== value) onChange(v);
    }, 150);
  };

  return (
    <div className="db-symbol-wrap" ref={wrapRef}>
      <div className="db-symbol-input-row">
        <input
          className="db-input"
          placeholder="BTCUSDT or 'bitcoin'"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          autoComplete="off"
          spellCheck={false}
        />
        {searching && <span className="db-sym-searching" aria-hidden="true">···</span>}
      </div>
      {open && (
        <div className="db-dropdown">
          {results.length === 0 ? (
            <div className="db-dropdown-empty">No results for &ldquo;{query}&rdquo;</div>
          ) : (
            results.slice(0, 8).map((s, i) => {
              const { base, quote } = getSymbolParts(s);
              const name = COIN_DISPLAY_NAMES[base] || null;
              return (
                <div
                  key={s}
                  className={`db-dropdown-item${i === hiIdx ? ' db-dropdown-item--active' : ''}`}
                  onMouseDown={() => commit(s)}
                >
                  <span className="db-dd-symbol">
                    <span className="db-dd-base">{base}</span>
                    {quote && <span className="db-dd-quote">/{quote}</span>}
                  </span>
                  {name && <span className="db-dd-name">{name}</span>}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

function FormMode({ onCreated, showToast }) {
  const [symbol, setSymbol] = useState('');
  const [price,  setPrice]  = useState('');
  const [cond,   setCond]   = useState('ABOVE');
  const [status, setStatus] = useState(null);
  const [errMsg, setErrMsg] = useState('');

  const clearTimer = useRef(null);
  useEffect(() => () => clearTimeout(clearTimer.current), []);

  const submit = async (e) => {
    e.preventDefault();
    if (!symbol || !price) {
      setStatus('err'); setErrMsg('Symbol and price are required.');
      clearTimeout(clearTimer.current);
      clearTimer.current = setTimeout(() => { setErrMsg(''); setStatus(null); }, 3000);
      return;
    }
    setStatus('loading'); setErrMsg('');
    try {
      await apiFetch('/api/v1/alerts', {
        method: 'POST',
        body: JSON.stringify({ symbol: symbol.toUpperCase(), targetPrice: parseFloat(price), condition: cond }),
      });
      onCreated();
      setSymbol(''); setPrice(''); setCond('ABOVE');
      setStatus('ok');
      clearTimeout(clearTimer.current);
      clearTimer.current = setTimeout(() => { setStatus(null); }, 1200);
    } catch (err) {
      const msg = err.code === 'UNSUPPORTED_SYMBOL'
        ? `'${symbol.toUpperCase()}' is not a supported symbol. Try the search dropdown.`
        : err.message || 'Something went wrong. Please try again.';
      setStatus('err'); setErrMsg(msg);
      clearTimeout(clearTimer.current);
      clearTimer.current = setTimeout(() => { setErrMsg(''); setStatus(null); }, 3500);
    }
  };

  return (
    <form className="db-form" onSubmit={submit}>
      <div className="db-form-row-2">
        <div className="db-form-field">
          <label className="db-label">SYMBOL</label>
          <SymbolSearch value={symbol} onChange={v => { setSymbol(v); setErrMsg(''); setStatus(null); }} />
        </div>
        <div className="db-form-field">
          <label className="db-label">TARGET PRICE</label>
          <input
            className="db-input"
            type="number"
            step="any"
            min="0.00000001"
            placeholder="80,000"
            value={price}
            onChange={e => { setPrice(e.target.value); setErrMsg(''); setStatus(null); }}
          />
        </div>
      </div>
      <div className="db-form-field">
        <label className="db-label">CONDITION</label>
        <div className="db-cond-row">
          {['ABOVE', 'BELOW', 'CROSSES'].map(c => (
            <button key={c} type="button" className={`db-cond-btn ${cond === c ? 'active' : ''}`}
              data-cond={c} onClick={() => setCond(c)}>{c}</button>
          ))}
        </div>
      </div>
      {errMsg && (
        <div className="db-form-msg db-form-msg--err">
          <span className="db-form-msg-icon">!</span>
          {errMsg}
        </div>
      )}
      <button
        className={`db-submit${status === 'ok' ? ' db-submit--ok' : ''}`}
        type="submit"
        disabled={status === 'loading'}
      >
        {status === 'loading' ? '···' : status === 'ok' ? '✓ ALERT CREATED' : 'CREATE ALERT →'}
      </button>
    </form>
  );
}

const COIN_RE = /\b(btc|eth|sol|doge|bnb|xrp|ada|avax|link|dot|shib|ltc|matic|pepe|trx|near|atom|bitcoin|ethereum|solana|dogecoin|ripple|cardano|avalanche|chainlink|polkadot|shiba|litecoin|polygon|tron)\b/i;
const DIR_RE  = /\b(above|below|over|under|drop(s|ping)?|fall(s|ing)?|rise[s]?|rising|go(es|ing)?|up|down|hit(s|ting)?|reach(es|ing)?|cross(es|ing)?|past|touch(es|ing)?|surpass(es|ing)?|exceed(s|ing)?)\b/i;

function AIMode({ onCreated }) {
  const [text,         setText]         = useState('');
  const [loading,      setLoading]      = useState(false);
  const [msg,          setMsg]          = useState('');
  const [status,       setStatus]       = useState(null);
  const [pendingAmbig, setPendingAmbig] = useState(null);
  const clearTimer = useRef(null);
  useEffect(() => () => clearTimeout(clearTimer.current), []);

  const submitText = async (inputText) => {
    setLoading(true); setMsg(''); setStatus(null);
    try {
      const d = await apiFetch('/api/v1/alerts/natural', {
        method: 'POST',
        body: JSON.stringify({ text: inputText }),
      });
      setMsg(`✓ ${d.symbol} ${d.condition} $${parseFloat(d.targetPrice).toLocaleString()}`);
      setStatus('ok');
      setText('');
      setPendingAmbig(null);
      onCreated();
      clearTimeout(clearTimer.current);
      clearTimer.current = setTimeout(() => { setMsg(''); setStatus(null); }, 3500);
    } catch (err) {
      const looksAmbiguous = COIN_RE.test(inputText) && /\d/.test(inputText) && !DIR_RE.test(inputText);
      if (looksAmbiguous) {
        setPendingAmbig(inputText);
      } else {
        const msg = err.code === 'AI_NOT_CONFIGURED'
          ? 'AI mode is currently unavailable. Use the form instead.'
          : err.message || 'Could not understand that. Try: "BTC above 80,000"';
        setMsg(msg);
        setStatus('err');
        clearTimeout(clearTimer.current);
        clearTimer.current = setTimeout(() => { setMsg(''); setStatus(null); }, 3500);
      }
    } finally {
      setLoading(false);
    }
  };

  const send = async (e) => {
    e.preventDefault();
    const input = text.trim();
    if (!input || loading) return;
    setPendingAmbig(null);
    await submitText(input);
  };

  const resolveDir = (dir) => {
    if (!pendingAmbig) return;
    const resolved = `${pendingAmbig} ${dir.toLowerCase()}`;
    setPendingAmbig(null);
    setText(resolved);
    submitText(resolved);
  };

  const coinLabel = pendingAmbig
    ? ((pendingAmbig.match(COIN_RE) || ['?'])[0].toUpperCase())
    : '';

  return (
    <div className="db-ai">
      <form className="db-ai-row" onSubmit={send}>
        <div className="db-ai-input-wrap">
          <span className="db-ai-prefix">_</span>
          <input
            className="db-ai-input"
            placeholder="e.g. BTC above 80,000"
            value={text}
            onChange={e => { setText(e.target.value); setPendingAmbig(null); }}
            disabled={loading}
            autoComplete="off"
          />
        </div>
        <button className="db-ai-btn" type="submit" disabled={loading || !text.trim()}>
          {loading ? '···' : 'CREATE →'}
        </button>
      </form>

      <div className="db-ai-bottom">
        {pendingAmbig ? (
          <div className="db-ai-dir-picker db-ai-anim-in">
            <div className="db-ai-dir-head">
              <span className="db-ai-dir-coin">{coinLabel}</span>
              <span className="db-ai-dir-which">: which direction?</span>
            </div>
            <div className="db-ai-dir-btns">
              <button type="button" className="db-ai-dir-btn db-ai-dir-btn--above" onClick={() => resolveDir('ABOVE')}>
                <span className="db-ai-dir-icon">▲</span>
                <span className="db-ai-dir-lbl">ABOVE</span>
                <span className="db-ai-dir-hint">goes higher</span>
              </button>
              <button type="button" className="db-ai-dir-btn db-ai-dir-btn--below" onClick={() => resolveDir('BELOW')}>
                <span className="db-ai-dir-icon">▼</span>
                <span className="db-ai-dir-lbl">BELOW</span>
                <span className="db-ai-dir-hint">drops lower</span>
              </button>
              <button type="button" className="db-ai-dir-btn db-ai-dir-btn--crosses" onClick={() => resolveDir('CROSSES')}>
                <span className="db-ai-dir-icon">↔</span>
                <span className="db-ai-dir-lbl">CROSSES</span>
                <span className="db-ai-dir-hint">either way</span>
              </button>
            </div>
          </div>
        ) : msg ? (
          <div className={`db-form-msg db-form-msg--${status} db-ai-anim-in`}>
            <span className="db-form-msg-icon">{status === 'ok' ? '✓' : '!'}</span>
            {msg}
          </div>
        ) : (
          <AISyntaxGuide onFill={(ex) => { setText(ex); setPendingAmbig(null); }} />
        )}
      </div>
    </div>
  );
}

const GUIDE_ROWS = [
  { icon: '▲', cls: 'above',   label: 'ABOVE',   ex: 'BTC above 85,000'  },
  { icon: '▼', cls: 'below',   label: 'BELOW',   ex: 'ETH below 3,200'   },
  { icon: '↔', cls: 'crosses', label: 'CROSSES', ex: 'SOL hits 180'       },
  { icon: '%',  cls: 'pct',     label: '% MOVE',  ex: 'BTC up 10%'         },
];
function AISyntaxGuide({ onFill }) {
  return (
    <div className="db-ai-guide db-ai-anim-in">
      <div className="db-ai-guide-head">WHAT YOU CAN SAY</div>
      <div className="db-ai-guide-grid">
        {GUIDE_ROWS.map(({ icon, cls, label, ex }) => (
          <button key={label} type="button"
            className={`db-ai-guide-row db-ai-guide-row--${cls}`}
            onClick={() => onFill(ex)}>
            <span className="db-ai-guide-icon">{icon}</span>
            <span className="db-ai-guide-label">{label}</span>
            <span className="db-ai-guide-sep">·</span>
            <span className="db-ai-guide-ex">{ex}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const IconTrash = () => (
  <svg width="12" height="13" viewBox="0 0 12 13" fill="none">
    <path d="M1 3h10M4 3V2h4v1M2 3l.7 8h6.6L10 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const fmtDate = (s) => {
  if (!s) return '—';
  const d = new Date(s);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' · ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
};

const AlertRow = memo(function AlertRow({ alert, onDelete, onDeleteError, isNew }) {
  const [deleting,   setDeleting]   = useState(false);
  const [confirming, setConfirming] = useState(false);
  const confirmTimer = useRef(null);

  useEffect(() => () => clearTimeout(confirmTimer.current), []);

  const armDelete = () => {
    setConfirming(true);
    clearTimeout(confirmTimer.current);
    confirmTimer.current = setTimeout(() => setConfirming(false), 3000);
  };

  const cancelDelete = () => {
    clearTimeout(confirmTimer.current);
    setConfirming(false);
  };

  const handleDelete = async () => {
    clearTimeout(confirmTimer.current);
    setConfirming(false);
    setDeleting(true);
    try {
      await apiFetch(`/api/v1/alerts/${alert.id}`, { method: 'DELETE' });
      onDelete(alert.id, alert.status);
    } catch {
      setDeleting(false);
      onDeleteError?.();
    }
  };

  const fmtPrice = (p) =>
    parseFloat(p).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 });

  const condKey     = alert.condition?.toLowerCase();
  const condIcon    = condKey === 'above' ? '▲' : condKey === 'below' ? '▼' : '↔';
  const isTriggered = alert.status === 'TRIGGERED';
  const isActive    = alert.status === 'ACTIVE';

  return (
    <div className={[
      'db-alert-card',
      `db-alert-card--${condKey}`,
      isTriggered ? 'db-alert-card--triggered' : '',
      isNew       ? 'db-alert-card--new-trigger' : '',
      deleting    ? 'db-alert-card--deleting'  : '',
    ].filter(Boolean).join(' ')}>

      <span className={`db-alert-card-bar db-alert-card-bar--${condKey}`} />

      {confirming ? (
        <div className="db-alert-card-confirm">
          <span className="db-alert-card-confirm-label">
            Delete <strong>{alert.symbol}</strong> {condIcon} ${fmtPrice(alert.targetPrice)}?
          </span>
          <div className="db-alert-card-confirm-actions">
            <button className="db-alert-confirm-no" onClick={cancelDelete}>CANCEL</button>
            <button className="db-alert-confirm-yes" onClick={handleDelete} disabled={deleting}>
              {deleting ? '···' : 'DELETE'}
            </button>
          </div>
        </div>
      ) : (
      <div className="db-alert-card-body">

        <div className="db-alert-card-row-main">
          <div className="db-alert-card-info">
            <span className="db-alert-card-symbol">
              {alert.symbol}<span className="db-alert-card-pair"> / USDT</span>
            </span>
            <span className={`db-alert-card-cond db-alert-card-cond--${condKey}`}>
              <span className="db-alert-card-cond-icon">{condIcon}</span>
              {alert.condition}
            </span>
          </div>
          <span className="db-alert-card-price">${fmtPrice(alert.targetPrice)}</span>
        </div>

        <div className="db-alert-card-row-meta">
          <span className="db-alert-card-date">{fmtDate(alert.createdAt)}</span>
          <div className="db-alert-card-actions">
            {isTriggered && alert.triggeredPrice && (
              <span className="db-alert-card-hit">✓ HIT ${fmtPrice(alert.triggeredPrice)}</span>
            )}
            {(isActive || isTriggered) && (
              <button className="db-alert-delete" onClick={armDelete} disabled={deleting} title="Delete">
                <IconTrash />
                <span className="db-alert-delete-label">DELETE</span>
              </button>
            )}
          </div>
        </div>

      </div>
      )}
    </div>
  );
});

const IconExpand = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4,1 1,1 1,4"/>
    <polyline points="10,1 13,1 13,4"/>
    <polyline points="10,13 13,13 13,10"/>
    <polyline points="4,13 1,13 1,10"/>
  </svg>
);
const IconClose = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <line x1="2" y1="2" x2="12" y2="12"/>
    <line x1="12" y1="2" x2="2" y2="12"/>
  </svg>
);

function AlertsList({ refreshTick, onCountsUpdate, showToast, isExpanded = false, onCollapse }) {
  const [tab,               setTab]               = useState('ACTIVE');
  const [alerts,             setAlerts]             = useState([]);
  const [loading,            setLoading]            = useState(true);
  const [counts,             setCounts]             = useState({ ACTIVE: null, TRIGGERED: null });
  const [clearingTriggered,  setClearingTriggered]  = useState(false);
  const seenIdsRef   = useRef(new Set());
  const [newIds, setNewIds] = useState(new Set());
  const newIdsTimer   = useRef(null);

  const onDeleteError = useCallback(() => showToast?.('Couldn\'t delete alert. Please try again.'), [showToast]);

  useEffect(() => () => clearTimeout(newIdsTimer.current), []);

  useEffect(() => {
    if (!isExpanded) return;
    const onKey = (e) => { if (e.key === 'Escape') onCollapse?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isExpanded, onCollapse]);

  const loadCounts = useCallback(async () => {
    try {
      const d = await apiFetch('/api/v1/alerts/counts');
      if (d) {
        setCounts({ ACTIVE: d.active, TRIGGERED: d.triggered });
        onCountsUpdate?.({ active: d.active, triggered: d.triggered });
      }
    } catch {  }
  }, [onCountsUpdate]);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const d = await apiFetch(`/api/v1/alerts${tab !== 'ALL' ? `?status=${tab}` : ''}`);
      const list = d || [];
      if (tab === 'TRIGGERED') {
        const fresh = list.filter(a => !seenIdsRef.current.has(a.id)).map(a => a.id);
        if (fresh.length) {
          setNewIds(new Set(fresh));
          fresh.forEach(id => seenIdsRef.current.add(id));
          clearTimeout(newIdsTimer.current);
          newIdsTimer.current = setTimeout(() => setNewIds(new Set()), 2200);
        }
      }
      list.forEach(a => seenIdsRef.current.add(a.id));
      setAlerts(list);
    } catch { if (!silent) setAlerts([]); }
    if (!silent) setLoading(false);
  }, [tab]);

  useEffect(() => {
    load();
    loadCounts();
    const id = setInterval(() => { load(true); loadCounts(); }, 15000);
    return () => clearInterval(id);
  }, [load, loadCounts, refreshTick]);

  const removeAlert = useCallback((id, status) => {
    setAlerts(a => a.filter(x => x.id !== id));
    const key = status === 'ACTIVE' ? 'active' : 'triggered';
    onCountsUpdate?.(prev => ({ ...prev, [key]: Math.max(0, (prev[key] ?? 1) - 1) }));
  }, [onCountsUpdate]);

  const clearAllTriggered = async () => {
    setClearingTriggered(false);
    setLoading(true);
    try {
      const triggered = await apiFetch('/api/v1/alerts?status=TRIGGERED');
      await Promise.all((triggered || []).map(a =>
        apiFetch(`/api/v1/alerts/${a.id}`, { method: 'DELETE' })
      ));
      onCountsUpdate?.(prev => ({ ...prev, triggered: 0 }));
      await load();
      loadCounts();
    } catch {
      setLoading(false);
      showToast?.('Couldn\'t clear alerts. Please try again.');
    }
  };

  const tabLabel = (t) => {
    if (t === 'ALL') {
      const total = (counts.ACTIVE ?? 0) + (counts.TRIGGERED ?? 0);
      return counts.ACTIVE != null ? `ALL (${total})` : 'ALL';
    }
    const n = counts[t];
    return n != null ? `${t} (${n})` : t;
  };

  const tabBar = (inModal = false) => (
    <div className="db-alerts-tabs">
      {['ACTIVE', 'TRIGGERED', 'ALL'].map(t => (
        <button key={t} className={`db-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
          {tabLabel(t)}
        </button>
      ))}
      {tab === 'TRIGGERED' && alerts.length > 0 && (
        <button className="db-tab-clear" onClick={() => setClearingTriggered(true)}>CLEAR ALL</button>
      )}
    </div>
  );

  return (
    <div className="db-alerts">
      {tabBar(false)}
      <div className="db-alerts-list">
        {loading ? (
          <div className="db-alerts-loading">
            {[1,2,3].map(i => <div key={i} className="db-alert-skel" />)}
          </div>
        ) : alerts.length === 0 ? (
          tab === 'ACTIVE' ? (
            <div className="db-empty-rich">
              <div className="db-empty-icon-wrap">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
                  <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
                </svg>
              </div>
              <div className="db-empty-title">NO ALERTS SET</div>
              <div className="db-empty-sub">
                Use the form above to set your first price alert.
              </div>
            </div>
          ) : (
            <div className="db-alerts-empty">
              <span>No {tab.toLowerCase()} alerts.</span>
            </div>
          )
        ) : (
          alerts.map(a => <AlertRow key={a.id} alert={a} onDelete={removeAlert} onDeleteError={onDeleteError} isNew={newIds.has(a.id)} />)
        )}
      </div>

      {isExpanded && createPortal(
        <div className="db-fv-overlay" onClick={() => onCollapse?.()}>
          <div className="db-fv-modal" onClick={e => e.stopPropagation()}>
            <div className="db-fv-header">
              <div className="db-fv-title">
                <span className="db-fv-title-brand">TRIGGERX</span>
                <span className="db-fv-title-sep">·</span>
                <span className="db-fv-title-sub">MY ALERTS</span>
              </div>
              {tabBar(true)}
              <button className="db-fv-close" onClick={() => onCollapse?.()} title="Close">
                <IconClose />
              </button>
            </div>
            <div className="db-fv-body">
              {loading ? (
                <div className="db-alerts-loading db-fv-loading">
                  {[1,2,3,4,5,6].map(i => <div key={i} className="db-alert-skel" />)}
                </div>
              ) : alerts.length === 0 ? (
                <div className="db-fv-empty">
                  <div className="db-empty-title">NO ALERTS</div>
                  <div className="db-empty-sub">No {tab.toLowerCase()} alerts found.</div>
                </div>
              ) : (
                <div className="db-fv-grid">
                  {alerts.map(a => <AlertRow key={a.id} alert={a} onDelete={removeAlert} onDeleteError={onDeleteError} isNew={newIds.has(a.id)} />)}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {clearingTriggered && (
        <div className="db-confirm-overlay" onClick={() => setClearingTriggered(false)}>
          <div className="db-confirm-box" onClick={e => e.stopPropagation()}>
            <div className="db-confirm-title">CLEAR TRIGGERED</div>
            <div className="db-confirm-body">
              Delete all {counts.TRIGGERED} triggered alert{counts.TRIGGERED !== 1 ? 's' : ''}?<br/>This cannot be undone.
            </div>
            <div className="db-confirm-btns">
              <button className="db-confirm-cancel" onClick={() => setClearingTriggered(false)}>CANCEL</button>
              <button className="db-confirm-ok" onClick={clearAllTriggered}>CLEAR ALL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const IconTelegram = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="db-int-svg">
    <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22 2L15 22l-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconChrome = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="db-int-svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/>
    <circle cx="12" cy="12" r="4"  stroke="currentColor" strokeWidth="1.8"/>
    <line x1="21.17" y1="8"    x2="12"    y2="8"    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="3.95"  y1="6.06" x2="8.54"  y2="14"   stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="10.88" y1="21.94" x2="15.46" y2="14"  stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

function TelegramConnectModal({ deepLink, onClose, onLinked }) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
  const [tab, setTab] = useState(isMobile ? 'web' : 'phone');

  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const d = await apiFetch('/api/v1/telegram/status');
        if (d.linked) onLinked();
      } catch {  }
    }, 3000);
    return () => clearInterval(id);
  }, [onLinked]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const modal = (
    <div className="tg-modal-overlay" onClick={onClose}>
      <div className="tg-modal" onClick={e => e.stopPropagation()}>
        <div className="tg-modal-header">
          <span className="tg-modal-title">CONNECT TELEGRAM</span>
          <button className="tg-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="tg-modal-tabs">
          <button className={`tg-tab${tab === 'phone' ? ' active' : ''}`} onClick={() => setTab('phone')}>
            📱 CONNECT ON PHONE
          </button>
          <button className={`tg-tab${tab === 'web' ? ' active' : ''}`} onClick={() => setTab('web')}>
            🌐 CONNECT ON WEB
          </button>
        </div>

        {tab === 'phone' ? (
          <div className="tg-modal-body">
            <div className="tg-qr-wrap">
              <QRCodeSVG value={deepLink} size={200} bgColor="#060614" fgColor="#e8eaff" level="H" />
            </div>
            <p className="tg-modal-hint">Scan with your phone camera to open Telegram and connect instantly.</p>
          </div>
        ) : (
          <div className="tg-modal-body">
            <p className="tg-modal-hint">Opens Telegram in your browser. Complete the linking step inside the bot.</p>
            <a href={deepLink} target="_blank" rel="noopener noreferrer" className="tg-modal-btn">
              OPEN IN TELEGRAM →
            </a>
          </div>
        )}

        <div className="tg-modal-footer">
          <div className="tg-modal-pulse" />
          <span className="tg-modal-waiting">WAITING FOR CONNECTION…</span>
        </div>
      </div>
    </div>
  );
  return createPortal(modal, document.body);
}

function TelegramCard() {
  const [linked,     setLinked]     = useState(null);
  const [status,     setStatus]     = useState('idle');
  const [errMsg,     setErrMsg]     = useState('');
  const [deepLink,   setDeepLink]   = useState('');
  const [showModal,  setShowModal]  = useState(false);
  const [botEnabled, setBotEnabled] = useState(true);
  const mobilePollRef    = useRef(null);
  const mobilePollTmoRef = useRef(null);

  useEffect(() => {
    apiFetch('/api/v1/telegram/status')
      .then(d => setLinked(d?.linked ?? false))
      .catch(() => { setBotEnabled(false); setLinked(false); });
    return () => {
      clearInterval(mobilePollRef.current);
      clearTimeout(mobilePollTmoRef.current);
    };
  }, []);

  const connect = async () => {
    setStatus('loading'); setErrMsg('');
    try {
      const d = await apiFetch('/api/v1/telegram/link-token', { method: 'POST' });
      setDeepLink(d.deepLink);
      const isMobile = window.innerWidth <= 768;
      if (isMobile) {
        window.open(d.deepLink, '_blank', 'noopener,noreferrer');
        setStatus('idle');
        mobilePollRef.current = setInterval(async () => {
          try {
            const s = await apiFetch('/api/v1/telegram/status');
            if (s.linked) { setLinked(true); clearInterval(mobilePollRef.current); }
          } catch {  }
        }, 3000);
        mobilePollTmoRef.current = setTimeout(() => clearInterval(mobilePollRef.current), 120000);
      } else {
        setShowModal(true);
        setStatus('idle');
      }
    } catch {
      setStatus('idle');
      setErrMsg('Couldn\'t connect. Please try again.');
    }
  };

  const unlink = async () => {
    setStatus('unlinking'); setErrMsg('');
    try {
      await apiFetch('/api/v1/telegram/unlink', { method: 'DELETE' });
      setLinked(false);
      setStatus('idle');
    } catch {
      setStatus('idle');
      setErrMsg('Unlink failed. Please try again.');
    }
  };

  const handleLinked = useCallback(() => {
    setLinked(true);
    setShowModal(false);
  }, []);

  const isLinked = linked === true;
  return (
    <>
      {showModal && (
        <TelegramConnectModal
          deepLink={deepLink}
          onClose={() => { setShowModal(false); setStatus('idle'); }}
          onLinked={handleLinked}
        />
      )}
      <div className="db-int-card db-int-card--telegram">
        <div className="db-int-header">
          <div className="db-int-icon-wrap"><IconTelegram /></div>
          <div className="db-int-meta">
            <div className="db-int-title">TELEGRAM</div>
            <div className="db-int-status">
              <span className={`db-int-dot db-int-dot--${isLinked ? 'on' : 'off'}`} />
              <span className="db-int-status-text">
                {linked === null ? '···' : isLinked ? 'LINKED' : 'NOT LINKED'}
              </span>
            </div>
          </div>
        </div>
        <p className="db-int-desc">Receive instant alert messages via the TriggerX Telegram bot.</p>
        {errMsg && <div className="db-int-err">{errMsg}</div>}
        {!botEnabled ? (
          <button className="db-int-btn" disabled style={{ opacity: 0.38, cursor: 'not-allowed' }}>
            UNAVAILABLE
          </button>
        ) : isLinked ? (
          <div className="db-int-row">
            <span className="db-int-connected">✓ CONNECTED</span>
            <button className="db-int-btn db-int-btn--danger" onClick={unlink} disabled={status === 'unlinking'}>
              {status === 'unlinking' ? '…' : 'UNLINK'}
            </button>
          </div>
        ) : (

          <button className="db-int-btn" onClick={connect} disabled={status === 'loading'}>
            {status === 'loading' ? '···' : 'CONNECT BOT →'}
          </button>
        )}
      </div>
    </>
  );
}

const EXT_ID  = 'lgmmlpgbellfimbecfgehdfdlambfimc';
const EXT_URL = 'https://chromewebstore.google.com/detail/' + EXT_ID + '?utm_source=item-share-cb';

function ExtensionCard() {
  const [installed, setInstalled] = useState(null);

  useEffect(() => {
    const img = new Image();
    img.onload  = () => setInstalled(true);
    img.onerror = () => setInstalled(false);
    img.src = `chrome-extension://${EXT_ID}/icons/icon16.png`;
  }, []);

  const statusText = installed === null ? '···' : installed ? 'INSTALLED' : 'BROWSER';
  const dotClass   = installed ? 'on' : 'off';

  return (
    <div className="db-int-card db-int-card--chrome">
      <div className="db-int-header">
        <div className="db-int-icon-wrap"><IconChrome /></div>
        <div className="db-int-meta">
          <div className="db-int-title">CHROME EXT</div>
          <div className="db-int-status">
            <span className={`db-int-dot db-int-dot--${dotClass}`} />
            <span className="db-int-status-text">{statusText}</span>
          </div>
        </div>
      </div>
      <p className="db-int-desc">Manage alerts from your browser toolbar while watching charts.</p>
      {installed ? (
        <div className="db-int-row">
          <span className="db-int-connected">✓ INSTALLED</span>
        </div>
      ) : (
        <a
          className="db-int-btn"
          href={EXT_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          INSTALL EXTENSION
        </a>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();

  useEffect(() => {
    _navigate = navigate;
    return () => { _navigate = null; };
  }, [navigate]);

  const [mode,           setMode]           = useState('form');
  const [refreshTick,    setRefreshTick]    = useState(0);
  const [alertCounts,    setAlertCounts]    = useState({ active: null, triggered: null });
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('triggerx_visited'));
  const [toastMsg,       setToastMsg]       = useState(null);
  const [alertsExpanded, setAlertsExpanded] = useState(false);

  const showToast = useCallback((msg) => setToastMsg(msg), []);
  const dismissToast = useCallback(() => setToastMsg(null), []);

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('triggerx_user')); }
    catch { return null; }
  }, []);

  useEffect(() => {
    if (!localStorage.getItem('triggerx_visited'))
      localStorage.setItem('triggerx_visited', 'seen');
  }, []);

  const dismissOnboarding = () => {
    localStorage.setItem('triggerx_visited', 'seen');
    setShowOnboarding(false);
  };

  const signOut = () => {
    localStorage.removeItem('triggerx_token');
    localStorage.removeItem('triggerx_user');
    navigate('/');
  };

  const onCreated = () => {
    setRefreshTick(t => t + 1);
    setAlertCounts(c => ({ ...c, active: (c.active ?? 0) + 1 }));
  };
  const onCountsUpdate = useCallback(
    (c) => setAlertCounts(typeof c === 'function' ? c : () => c), []);

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

  if (!localStorage.getItem('triggerx_token')) return <Navigate to="/auth" replace />;

  return (
    <div className="db-page">
      <GrainLayer zIndex={1} />

      {toastMsg && <Toast message={toastMsg} onDismiss={dismissToast} />}

      <nav className="db-nav">
        <button className="db-nav-logo" onClick={() => navigate('/')}>
          <span className="db-logo-trigger">TRIGGER</span>
          <span className="db-logo-x">X</span>
        </button>
        <div className="db-nav-right">
          {user?.email && <span className="db-nav-email">{user.email}</span>}
          <button className="db-nav-signout" onClick={signOut}>SIGN OUT</button>
        </div>
      </nav>

      {showOnboarding && (
        <div className="db-tip-strip">
          <span className="db-tip-dot" />
          <span className="db-tip-label">TRY AI MODE</span>
          <span className="db-tip-text">
            Type naturally: <strong>&ldquo;BTC above 90,000&rdquo;</strong> and we&apos;ll create the alert instantly.
          </span>
          <button className="db-tip-dismiss" onClick={dismissOnboarding} aria-label="Dismiss">×</button>
        </div>
      )}

      <main className="db-main">

        <div className="db-grid db-anim-2">

          <section className="db-panel db-panel--create">
            <div className="db-panel-head">
              <div>
                <div className="db-panel-title">Create Alert</div>
                <div className="db-panel-desc">Get notified the moment price hits your target.</div>
              </div>
              <div className="db-mode-toggle">
                <button className={`db-mode-btn ${mode === 'form' ? 'active' : ''}`} onClick={() => setMode('form')}>FORM</button>
                <button className={`db-mode-btn ${mode === 'ai' ? 'active' : ''}`} onClick={() => setMode('ai')}>AI</button>
              </div>
            </div>
            <div className="db-panel-body">
              <div className="db-create-body">
                {mode === 'form' ? <FormMode onCreated={onCreated} showToast={showToast} /> : <AIMode onCreated={onCreated} />}
              </div>
            </div>
          </section>

          <StatBar alertCounts={alertCounts} />

          <section className="db-panel db-panel--alerts db-anim-3">
            <div className="db-panel-head">
              <div>
                <div className="db-panel-title">My Alerts</div>
                <div className="db-panel-desc">Monitor and manage your price alerts.</div>
              </div>
              <button
                className="db-panel-expand-btn"
                onClick={() => setAlertsExpanded(true)}
                title="Full view"
              >
                <IconExpand />
                <span className="db-panel-expand-label">FULL VIEW</span>
              </button>
            </div>
            <AlertsList refreshTick={refreshTick} onCountsUpdate={onCountsUpdate} showToast={showToast} isExpanded={alertsExpanded} onCollapse={() => setAlertsExpanded(false)} />
          </section>

          <aside className="db-integrations-panel">
            <div className="db-sidebar-eyebrow">[ INTEGRATIONS ]</div>
            <TelegramCard />
            <ExtensionCard />
          </aside>

        </div>

      </main>

      <div className="db-bottom-bar">
        <span className="db-bottom-copy">© {new Date().getFullYear()} TRIGGERX · Open Source</span>
        <span className="db-bottom-links">
          <Link to="/privacy" state={{ from: '/dashboard' }} className="db-bottom-link">PRIVACY</Link>
          <span className="db-bottom-dot">·</span>
          <Link to="/terms" state={{ from: '/dashboard' }} className="db-bottom-link">TERMS</Link>
        </span>
      </div>

    </div>
  );
}
