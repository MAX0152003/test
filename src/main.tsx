import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Check if this window is a Google OAuth callback popup
try {
  if (window.opener && (window.location.hash.includes('access_token=') || window.location.search.includes('access_token=') || window.location.hash.includes('error=') || window.location.search.includes('error='))) {
    let token = '';
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      token = params.get('access_token') || '';
    }
    if (!token) {
      const search = window.location.search;
      const params = new URLSearchParams(search);
      token = params.get('access_token') || '';
    }
    
    if (token) {
      window.opener.postMessage({ type: 'GOOGLE_OAUTH_SUCCESS', accessToken: token }, window.location.origin);
    } else {
      window.opener.postMessage({ type: 'GOOGLE_OAUTH_ERROR', error: 'Authentication failed' }, window.location.origin);
    }
    window.close();
  }
} catch (e) {
  console.warn('OAuth popup handling error:', e);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
