import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import GrainLayer from '../components/GrainLayer.jsx';

const C = {
  bg:    '#010106',
  ind:   '#4F5BD5',
  t1:    'rgba(255,255,255,0.92)',
  t2:    'rgba(255,255,255,0.60)',
  t3:    'rgba(255,255,255,0.35)',
  br:    'rgba(79,91,213,0.20)',
  mono:  "'JetBrains Mono',monospace",
  body:  "'Space Grotesk',sans-serif",
  disp:  "'Bebas Neue',cursive",
};

const S = {
  page:     { background: C.bg, minHeight: '100vh', fontFamily: C.body, lineHeight: 1.7, color: C.t1, overflowX: 'hidden' },
  aurora:   { position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
              background: 'radial-gradient(ellipse 70% 50% at 50% -10%,rgba(79,91,213,0.16) 0%,transparent 55%),' +
                          'radial-gradient(ellipse 40% 30% at 0% 60%,rgba(41,121,255,0.06) 0%,transparent 50%)' },
  nav:      { position: 'sticky', top: 0, zIndex: 200, height: 60,
              background: 'rgba(1,1,6,0.92)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
              borderBottom: `1px solid ${C.br}`, display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', padding: '0 clamp(20px,5vw,64px)' },
  logo:     { fontFamily: C.disp, fontSize: 20, letterSpacing: '0.08em', textDecoration: 'none', color: C.t1,
              display: 'flex', alignItems: 'baseline' },
  logoX:    { color: C.ind },
  back:     { fontFamily: C.mono, fontSize: 10, fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase',
              color: C.t3, background: 'none', border: `1px solid ${C.br}`, padding: '6px 14px', cursor: 'pointer',
              transition: 'color .15s, border-color .15s, background .15s', outline: 'none' },
  backHov:  { color: C.t1, borderColor: 'rgba(79,91,213,0.55)', background: 'rgba(79,91,213,0.07)' },
  wrap:     { position: 'relative', zIndex: 1, maxWidth: 760, margin: '0 auto',
              padding: 'clamp(40px,5vw,56px) clamp(20px,5vw,40px) 96px' },
  hero:     { marginBottom: 56 },
  chip:     { display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: C.mono, fontSize: 10,
              fontWeight: 700, letterSpacing: '0.20em', textTransform: 'uppercase', color: 'rgba(100,120,255,0.80)',
              background: 'rgba(79,91,213,0.10)', border: '1px solid rgba(79,91,213,0.28)',
              padding: '5px 14px', marginBottom: 20 },
  chipDot:  { width: 5, height: 5, borderRadius: '50%', background: C.ind, flexShrink: 0,
              boxShadow: '0 0 8px rgba(79,91,213,0.80)' },
  h1:       { fontFamily: C.disp, fontSize: 'clamp(40px,7vw,68px)', letterSpacing: '0.04em',
              lineHeight: 1, color: C.t1, marginBottom: 16 },
  h1x:      { color: C.ind },
  meta:     { fontFamily: C.mono, fontSize: 11, letterSpacing: '0.10em', color: C.t3 },
  divider:  { height: 1, marginTop: 28,
              background: 'linear-gradient(to right,rgba(79,91,213,0.60) 0%,rgba(79,91,213,0.14) 50%,transparent 100%)' },
  callout:  { background: 'rgba(79,91,213,0.08)', border: '1px solid rgba(79,91,213,0.28)',
              borderLeft: '3px solid rgba(79,91,213,0.80)', padding: '16px 20px',
              fontSize: 14, lineHeight: 1.7, color: 'rgba(255,255,255,0.75)', margin: '40px 0' },
  sec:      { marginBottom: 40 },
  secHead:  { display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14,
              paddingBottom: 12, borderBottom: '1px solid rgba(79,91,213,0.14)' },
  secNum:   { fontFamily: C.mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.16em',
              color: 'rgba(79,91,213,0.55)', flexShrink: 0 },
  secTitle: { fontFamily: C.body, fontSize: 16, fontWeight: 700, letterSpacing: '0.02em', color: C.t1, margin: 0 },
  p:        { fontSize: 14, lineHeight: 1.80, color: C.t2, marginBottom: 10 },
  pLast:    { fontSize: 14, lineHeight: 1.80, color: C.t2, marginBottom: 0 },
  a:        { color: 'rgba(120,140,255,0.85)' },
  ul:       { listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 10 },
  li:       { fontSize: 14, lineHeight: 1.7, color: C.t2, paddingLeft: 18, position: 'relative' },
  liMark:   { position: 'absolute', left: 0, color: 'rgba(79,91,213,0.55)', fontFamily: C.mono },
  warn:     { background: 'rgba(255,59,92,0.06)', border: '1px solid rgba(255,59,92,0.25)',
              borderLeft: '3px solid rgba(255,59,92,0.60)', padding: '14px 18px', marginTop: 12,
              fontSize: 13, color: 'rgba(255,150,150,0.80)', lineHeight: 1.7 },
  table:    { width: '100%', borderCollapse: 'collapse', marginBottom: 10 },
  th:       { fontFamily: C.mono, fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase',
              color: 'rgba(79,91,213,0.70)', padding: '8px 14px', textAlign: 'left',
              borderBottom: '1px solid rgba(79,91,213,0.28)', background: 'rgba(79,91,213,0.05)' },
  td:       { fontSize: 13, color: C.t2, padding: '10px 14px', verticalAlign: 'top',
              borderBottom: '1px solid rgba(79,91,213,0.08)' },
  tagY:     { display: 'inline-block', fontFamily: C.mono, fontSize: 9, fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase', padding: '2px 8px',
              color: 'rgba(56,200,120,0.85)', background: 'rgba(56,200,120,0.08)', border: '1px solid rgba(56,200,120,0.28)' },
  tagN:     { display: 'inline-block', fontFamily: C.mono, fontSize: 9, fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase', padding: '2px 8px',
              color: C.t3, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' },
  foot:     { position: 'relative', zIndex: 1, borderTop: `1px solid ${C.br}`,
              padding: '28px clamp(20px,5vw,64px)', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 },
  footCopy: { fontFamily: C.mono, fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase', color: C.t3 },
  footLinks:{ display: 'flex', gap: 24 },
  footLink: { fontFamily: C.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'rgba(79,91,213,0.65)', textDecoration: 'none' },
  footAct:  { fontFamily: C.mono, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase',
              color: 'rgba(100,120,255,0.90)', textDecoration: 'none' },
};

function Li({ children }) {
  return (
    <li style={S.li}>
      <span style={S.liMark} aria-hidden="true">&#8250;</span>
      {children}
    </li>
  );
}

function Sec({ num, title, children }) {
  return (
    <div style={S.sec}>
      <div style={S.secHead}>
        <span style={S.secNum}>{num}</span>
        <h2 style={S.secTitle}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

function LegalShell({ titleLine1, titleLine2, chipLabel, updated, active, children }) {
  const nav = useNavigate();
  const { state } = useLocation();
  const origin = state?.from ?? '/';
  const goBack = () => nav(origin);
  const [backHov, setBackHov] = useState(false);

  return (
    <div style={S.page}>
      <GrainLayer zIndex={0} opacity={0.28} />
      <div style={S.aurora} />

      <nav style={S.nav}>
        <Link to="/" style={S.logo}>TRIGGER<span style={S.logoX}>X</span></Link>
        <button
            style={{ ...S.back, ...(backHov ? S.backHov : {}) }}
            onMouseEnter={() => setBackHov(true)}
            onMouseLeave={() => setBackHov(false)}
            onClick={goBack}
          >
            &#8592; Back
          </button>
      </nav>

      <div style={S.wrap}>
        <div style={S.hero}>
          <div style={S.chip}><span style={S.chipDot} />{chipLabel}</div>
          <h1 style={S.h1}>{titleLine1}<br /><span style={S.h1x}>{titleLine2}</span></h1>
          <p style={S.meta}>Last updated: {updated} &nbsp;·&nbsp; Effective immediately</p>
          <div style={S.divider} />
        </div>
        {children}
      </div>

      <footer style={S.foot}>
        <span style={S.footCopy}>&copy; {new Date().getFullYear()} TRIGGERX &nbsp;·&nbsp; No ads &nbsp;·&nbsp; No tracking</span>
        <div style={S.footLinks}>
          <Link to="/privacy" state={{ from: origin }} style={active === 'privacy' ? S.footAct : S.footLink}>Privacy Policy</Link>
          <Link to="/terms"   state={{ from: origin }} style={active === 'terms'   ? S.footAct : S.footLink}>Terms of Service</Link>
        </div>
      </footer>
    </div>
  );
}

export function PrivacyPage() {
  useEffect(() => {
    document.title = 'Privacy Policy | TriggerX';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'TriggerX Privacy Policy. Learn what data we collect, how we use it, and how we protect your privacy. No ads, no tracking, no analytics.');
    
    let canonical = document.querySelector('link[rel="canonical"]');
    const origCanonical = canonical ? canonical.getAttribute('href') : 'https://www.triggerx.in/';
    if (canonical) canonical.setAttribute('href', 'https://www.triggerx.in/privacy');

    return () => {
      document.title = 'TriggerX | Free Crypto Price Alerts';
      if (meta) meta.setAttribute('content', 'TriggerX sends instant email and Telegram alerts the moment your Binance price target is hit. Set crypto price alerts for BTC, ETH, SOL and 400+ pairs - free, open source, no signup password needed. Get notified in seconds.');
      if (canonical) canonical.setAttribute('href', origCanonical);
    };
  }, []);
  return (
    <LegalShell titleLine1="PRIVACY" titleLine2="POLICY" chipLabel="Legal" updated="July 26, 2026" active="privacy">

      <div style={S.callout}>
        TriggerX is built on one principle: your data is yours. This policy explains exactly what we collect, why, and what we never do. No jargon, no surprises.
      </div>

      <Sec num="01" title="Who We Are">
        <p style={S.p}>TriggerX operates the website at <a href="https://www.triggerx.in" style={S.a}>www.triggerx.in</a> and the TriggerX Alerts Chrome Extension. Our service lets you set real-time cryptocurrency price alerts and receive notifications when your target levels are hit.</p>
        <p style={S.pLast}>Contact: <a href="mailto:triggerx.notify@gmail.com" style={S.a}>triggerx.notify@gmail.com</a></p>
      </Sec>

      <Sec num="02" title="What We Store">
        <p style={S.p}>We store only what is necessary to operate the service:</p>
        <table style={S.table}>
          <thead>
            <tr><th style={S.th}>Data</th><th style={S.th}>Why</th><th style={S.th}>Stored</th></tr>
          </thead>
          <tbody>
            <tr><td style={S.td}>Email address</td><td style={S.td}>Alert delivery &amp; OTP auth</td><td style={S.td}><span style={S.tagY}>Yes</span></td></tr>
            <tr><td style={S.td}>Alert configurations</td><td style={S.td}>To trigger your alerts</td><td style={S.td}><span style={S.tagY}>Yes</span></td></tr>
            <tr><td style={S.td}>Session token (JWT)</td><td style={S.td}>Keep you logged in</td><td style={S.td}><span style={S.tagY}>Browser only</span></td></tr>
            <tr><td style={S.td}>Telegram Chat ID</td><td style={S.td}>Send Telegram alerts (if connected)</td><td style={S.td}><span style={S.tagY}>Yes</span></td></tr>
            <tr><td style={S.td}>Passwords</td><td style={S.td}>N/A</td><td style={S.td}><span style={S.tagN}>Never</span></td></tr>
            <tr><td style={S.td}>Payment data</td><td style={S.td}>N/A</td><td style={S.td}><span style={S.tagN}>Never</span></td></tr>
            <tr><td style={{ ...S.td, borderBottom: 'none' }}>Browsing history</td><td style={{ ...S.td, borderBottom: 'none' }}>N/A</td><td style={{ ...S.td, borderBottom: 'none' }}><span style={S.tagN}>Never</span></td></tr>
          </tbody>
        </table>
      </Sec>

      <Sec num="03" title="Chrome Extension Data">
        <p style={S.p}>The TriggerX Chrome Extension reads the following data locally, in your browser only. None of this is sent to our servers:</p>
        <ul style={S.ul}>
          <Li><strong>Active tab URL</strong>: to detect which crypto asset you are viewing on supported exchanges (Binance, TradingView)</Li>
          <Li><strong>Page title</strong>: to extract the trading pair from TradingView chart tabs</Li>
          <Li><strong>localStorage on triggerx.in</strong>: to read your existing TriggerX session token and log you in automatically</Li>
        </ul>
        <p style={S.pLast}>The extension stores your JWT and email in <code style={{ fontFamily: C.mono, fontSize: 12, color: 'rgba(100,140,255,0.85)' }}>chrome.storage.local</code>. This data is cleared when you sign out.</p>
      </Sec>

      <Sec num="04" title="How We Use Your Data">
        <ul style={S.ul}>
          <Li>Send a one-time OTP to verify your email address</Li>
          <Li>Deliver price alert notifications via email and/or Telegram</Li>
          <Li>Maintain your session while you use the dashboard or extension</Li>
          <Li>Enforce per-account alert limits</Li>
        </ul>
        <p style={S.pLast}>We do not use your data for advertising, profiling, or analytics. We do not sell or share your data with any third parties for commercial purposes.</p>
      </Sec>

      <Sec num="05" title="Third-Party Services">
        <p style={S.p}>TriggerX uses the following third-party services to operate:</p>
        <ul style={S.ul}>
          <Li><strong>Binance Public API</strong>: live price data. No user data is sent to Binance</Li>
          <Li><strong>Telegram Bot API</strong>: alert delivery if you connect Telegram. Only your Chat ID is used</Li>
          <Li><strong>Azure Cloud</strong>: server hosting. Your data is stored on Azure infrastructure</Li>
        </ul>
      </Sec>

      <Sec num="06" title="Data Security">
        <p style={S.p}>All data is transmitted over HTTPS. Session tokens are JWT-based with expiry. We do not store passwords. Authentication is OTP-only.</p>
        <p style={S.pLast}>While we take reasonable measures to protect your data, no system is completely secure. We recommend not sharing your session token with anyone.</p>
      </Sec>

      <Sec num="07" title="Your Rights">
        <p style={S.pLast}>You can delete your account and all associated data by contacting us at <a href="mailto:triggerx.notify@gmail.com" style={S.a}>triggerx.notify@gmail.com</a>. We will process deletion requests within 7 days.</p>
      </Sec>

      <Sec num="08" title="Changes to This Policy">
        <p style={S.pLast}>We may update this policy occasionally. Continued use of TriggerX after changes are posted constitutes acceptance of the revised policy. The "Last updated" date at the top of this page will reflect any changes.</p>
      </Sec>

      <Sec num="09" title="Contact">
        <p style={S.pLast}>Questions about this Privacy Policy? Email us at <a href="mailto:triggerx.notify@gmail.com" style={S.a}>triggerx.notify@gmail.com</a>.</p>
      </Sec>

    </LegalShell>
  );
}

export function TermsPage() {
  useEffect(() => {
    document.title = 'Terms of Service | TriggerX';
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', 'TriggerX Terms of Service. Understand the rules, limitations, and disclaimers for using our free crypto price alert service.');

    let canonical = document.querySelector('link[rel="canonical"]');
    const origCanonical = canonical ? canonical.getAttribute('href') : 'https://www.triggerx.in/';
    if (canonical) canonical.setAttribute('href', 'https://www.triggerx.in/terms');

    return () => {
      document.title = 'TriggerX | Free Crypto Price Alerts';
      if (meta) meta.setAttribute('content', 'TriggerX sends instant email and Telegram alerts the moment your Binance price target is hit. Set crypto price alerts for BTC, ETH, SOL and 400+ pairs - free, open source, no signup password needed. Get notified in seconds.');
      if (canonical) canonical.setAttribute('href', origCanonical);
    };
  }, []);
  return (
    <LegalShell titleLine1="TERMS OF" titleLine2="SERVICE" chipLabel="Legal" updated="July 26, 2026" active="terms">

      <div style={S.callout}>
        Please read these Terms carefully. By accessing TriggerX or installing the Chrome Extension, you agree to be bound by them. If you do not agree, please do not use the Service.
      </div>

      <Sec num="01" title="Acceptance of Terms">
        <p style={S.p}>By using TriggerX, including the website at <a href="https://www.triggerx.in" style={S.a}>www.triggerx.in</a> and the TriggerX Alerts Chrome Extension, you agree to these Terms of Service and our <Link to="/privacy" style={S.a}>Privacy Policy</Link>.</p>
        <p style={S.pLast}>We reserve the right to update these Terms at any time. Continued use after changes are posted constitutes acceptance of the revised Terms.</p>
      </Sec>

      <Sec num="02" title="Description of Service">
        <p style={S.p}>TriggerX provides real-time cryptocurrency price alerts. You configure a price target; when the market crosses it, you receive a notification. Prices are sourced from the Binance Spot API.</p>
        <p style={S.pLast}>TriggerX is a notification service only. It is not a financial service, brokerage, investment advisor, or trading platform.</p>
      </Sec>

      <Sec num="03" title="No Financial Advice">
        <div style={S.warn}>
          Nothing on TriggerX constitutes financial advice, investment advice, or a recommendation to buy or sell any asset. Cryptocurrency markets are highly volatile and carry significant risk. You are solely responsible for your own trading decisions.
        </div>
      </Sec>

      <Sec num="04" title="Alert Delivery">
        <p style={S.p}>We make reasonable best-effort to deliver alerts when price conditions are met. We cannot guarantee:</p>
        <ul style={S.ul}>
          <Li>That alerts will always be delivered instantly or at all</Li>
          <Li>Accuracy or availability of Binance price data at all times</Li>
          <Li>Delivery in the event of network outages, server maintenance, or rapid price gaps</Li>
        </ul>
        <p style={S.pLast}>Do not rely solely on TriggerX for trading decisions or risk management.</p>
      </Sec>

      <Sec num="05" title="Eligibility">
        <p style={S.pLast}>You must be at least 18 years of age to use TriggerX. By using the Service, you represent that you meet this requirement.</p>
      </Sec>

      <Sec num="06" title="Acceptable Use">
        <p style={S.p}>You agree not to:</p>
        <ul style={S.ul}>
          <Li>Reverse-engineer, scrape, or abuse the TriggerX API or infrastructure</Li>
          <Li>Create alerts in bulk for the purpose of overloading the system</Li>
          <Li>Attempt to bypass alert limits or authentication</Li>
          <Li>Use the Service for any unlawful purpose</Li>
        </ul>
      </Sec>

      <Sec num="07" title="Limitation of Liability">
        <p style={S.p}>TriggerX and its operators shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service, including but not limited to trading losses, missed alerts, or data loss.</p>
        <p style={S.pLast}>Our total aggregate liability for any claim related to the Service shall not exceed <strong style={{ color: C.t1 }}>$10 USD</strong>. This cap reflects the fact that TriggerX is a free service with no paid tier.</p>
      </Sec>

      <Sec num="08" title="Disclaimer of Warranties">
        <p style={S.pLast}>The Service is provided "as is" and "as available" without any warranties of any kind, either express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.</p>
      </Sec>

      <Sec num="09" title="Service Modifications">
        <p style={S.pLast}>We reserve the right to modify, suspend, or discontinue the Service at any time with or without notice. We shall not be liable to you or any third party for any such changes.</p>
      </Sec>

      <Sec num="10" title="Governing Law">
        <p style={S.pLast}>These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in India.</p>
      </Sec>

      <Sec num="11" title="Contact">
        <p style={S.pLast}>Questions about these Terms? Email us at <a href="mailto:triggerx.notify@gmail.com" style={S.a}>triggerx.notify@gmail.com</a>.</p>
      </Sec>

    </LegalShell>
  );
}
