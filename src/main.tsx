import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Google Maps Platform Quota Defense (Tier 1)
if (typeof window !== 'undefined') {
  (window as unknown as {gm_authFailure?: () => void}).gm_authFailure = () => {
    window.dispatchEvent(new CustomEvent('gmp-quota-exceeded', {detail: 'gm_authFailure'}));
  };
  const origConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    origConsoleError.apply(console, args);
    const msg = args.map((a) => String(a)).join(' ');
    if (/OverQuotaMapError|QuotaExceededError|Google Maps JavaScript API error/i.test(msg)) {
      window.dispatchEvent(new CustomEvent('gmp-quota-exceeded', {detail: msg}));
    }
  };
}

createRoot(document.getElementById('root')!).render(<App />);
