export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { code, code_verifier, redirect_uri } = req.body;

  const response = await fetch('https://auth.deriv.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: '33DWjDfAYDVBCmG8ZuYY3',
      code,
      code_verifier,
      redirect_uri,
    }),
  });

  const data = await response.json();
  return response.ok ? res.status(200).json(data) : res.status(400).json(data);
}
