// Netlify Function: token-exchange
// Exchanges an OAuth2 authorization code for an access token.
// This runs on the server — the code_verifier never leaves the backend.

import type { Context } from '@netlify/functions';

export default async (req: Request, _context: Context) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { code, code_verifier, redirect_uri, client_id } = await req.json() as {
      code: string;
      code_verifier: string;
      redirect_uri: string;
      client_id: string;
    };

    if (!code || !code_verifier || !redirect_uri || !client_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id,
      code,
      code_verifier,
      redirect_uri,
    });

    const tokenResp = await fetch('https://auth.deriv.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!tokenResp.ok) {
      const errorText = await tokenResp.text();
      return new Response(JSON.stringify({ error: 'Token exchange failed', detail: errorText }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const tokenData = await tokenResp.json();

    return new Response(JSON.stringify(tokenData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error', detail: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const config = {
  path: '/.netlify/functions/token-exchange',
};
