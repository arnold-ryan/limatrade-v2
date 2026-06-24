import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { exchangeCodeForToken, saveAccounts, setActiveAccount } from '../services/auth';
import { useStore } from '../store';

export default function Callback() {
  const navigate = useNavigate();
  const { setAccounts, setActiveAccount: storeSetActive, setAuthError } = useStore();
  const processed = useRef(false);
  const [status, setStatus] = useState('Completing login…');

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    const error = params.get('error');

    if (error) {
      setAuthError(`Login failed: ${params.get('error_description') ?? error}`);
      navigate('/login');
      return;
    }

    if (!code || !state) {
      setAuthError('Invalid callback — missing code or state.');
      navigate('/login');
      return;
    }

    (async () => {
      try {
        setStatus('Exchanging authorization code…');
        const accessToken = await exchangeCodeForToken(code, state);

        // Store as a single account entry (Bearer token)
        // The actual account ID will be populated after WebSocket authorize
        const account = {
          account: 'pending',   // filled in after WS auth
          token: accessToken,
          currency: 'USD',
        };

        saveAccounts([account]);
        setActiveAccount(account);
        setAccounts([account]);
        storeSetActive(account);

        window.history.replaceState({}, '', '/dashboard');
        navigate('/dashboard', { replace: true });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Login failed';
        setStatus(`Error: ${msg}`);
        setAuthError(msg);
        setTimeout(() => navigate('/login'), 3000);
      }
    })();
  }, [navigate, setAccounts, storeSetActive, setAuthError]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      background: 'var(--bg-primary)',
    }}>
      <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
      <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{status}</p>
    </div>
  );
}
