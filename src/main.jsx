import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{
          background: '#04040a', color: 'rgba(255,255,255,0.6)',
          height: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: '16px',
          fontFamily: 'monospace', fontSize: '12px', letterSpacing: '0.1em',
        }}>
          <div style={{ color: 'rgba(255,59,92,0.8)', fontSize: '11px', letterSpacing: '0.18em' }}>
            SOMETHING WENT WRONG
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: 'none', border: '1px solid rgba(79,91,213,0.5)',
              color: 'rgba(79,91,213,0.9)', padding: '8px 20px',
              cursor: 'pointer', fontFamily: 'monospace', fontSize: '10px',
              letterSpacing: '0.18em', textTransform: 'uppercase',
            }}
          >
            RELOAD
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
