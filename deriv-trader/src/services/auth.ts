// Deriv OAuth Authentication Service
// Uses new OAuth2 PKCE flow (auth.deriv.com) with alphanumeric client_id

const CLIENT_ID = import.meta.env.VITE_DERIV_APP_ID || '33DWjDfAYDVBCmG8ZuYY3';
const AUTH_URL = 'https://auth.deriv.com/oauth2/auth';
// WebSocket still uses numeric app_id for the WS connection (market data)
export const WS_APP_ID = import.meta.env.VITE_WS_APP_ID || '16929';

export interface DerivAccount {
  account: string;
  token: string;       // Bearer access token from OAuth2
  currency: string;
}

// ─── New OAuth2 PKCE flow ────────────────────────────────────────────────────

async function generatePKCE() {
  const array = crypto.getRandomValues(new Uint8Array(64));
  const codeVerifier = Array.from(array)
    .map(v => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'[v % 66])
    .join('');
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier));
  const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return { codeVerifier, codeChallenge };
}

export async function getLoginUrl(): Promise<string> {
  const { codeVerifier, codeChallenge } = await generatePKCE();
  const state = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  sessionStorage.setItem('pkce_code_verifier', codeVerifier);
  sessionStorage.setItem('oauth_state', state);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: CLIENT_ID,
    redirect_uri: window.location.origin + '/callback',
    scope: 'trade account_manage',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  return `${AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange the authorization code for an access token via Netlify Function.
 * The exchange MUST happen server-side (not in the browser).
 */
export async function exchangeCodeForToken(code: string, state: string): Promise<string> {
  const storedState = sessionStorage.getItem('oauth_state');
  const codeVerifier = sessionStorage.getItem('pkce_code_verifier');

  if (state !== storedState) throw new Error('State mismatch — possible CSRF attack');
  if (!codeVerifier) throw new Error('Missing code verifier');

  const resp = await fetch('/.netlify/functions/token-exchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      code_verifier: codeVerifier,
      redirect_uri: window.location.origin + '/callback',
      client_id: CLIENT_ID,
    }),
  });

  if (!resp.ok) throw new Error('Token exchange failed');
  const data = await resp.json() as { access_token: string };

  // Clean up PKCE values
  sessionStorage.removeItem('pkce_code_verifier');
  sessionStorage.removeItem('oauth_state');

  return data.access_token;
}

/** Parse accounts from OAuth callback URL (legacy format, kept as fallback) */
export function parseCallbackAccounts(search: string): DerivAccount[] {
  const params = new URLSearchParams(search);
  const accounts: DerivAccount[] = [];
  let i = 1;
  while (params.has(`acct${i}`)) {
    accounts.push({
      account: params.get(`acct${i}`) ?? '',
      token: params.get(`token${i}`) ?? '',
      currency: params.get(`cur${i}`) ?? 'USD',
    });
    i++;
  }
  return accounts;
}

// ─── Session storage ─────────────────────────────────────────────────────────

const ACCOUNTS_KEY = 'deriv_accounts';
const ACTIVE_KEY = 'deriv_active_account';

export function saveAccounts(accounts: DerivAccount[]) {
  sessionStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function loadAccounts(): DerivAccount[] {
  try {
    return JSON.parse(sessionStorage.getItem(ACCOUNTS_KEY) ?? '[]') as DerivAccount[];
  } catch {
    return [];
  }
}

export function setActiveAccount(account: DerivAccount) {
  sessionStorage.setItem(ACTIVE_KEY, JSON.stringify(account));
}

export function getActiveAccount(): DerivAccount | null {
  try {
    const raw = sessionStorage.getItem(ACTIVE_KEY);
    return raw ? (JSON.parse(raw) as DerivAccount) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  sessionStorage.removeItem(ACCOUNTS_KEY);
  sessionStorage.removeItem(ACTIVE_KEY);
}

export function isLoggedIn(): boolean {
  return getActiveAccount() !== null;
}
