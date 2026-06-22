// Shared utilities for Pages Functions

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

export function err(message, status = 400) {
  return json({ error: message }, status);
}

export function handleOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

export function generateId() {
  return crypto.randomUUID();
}

export async function generateToken(userId, secret) {
  const header = btoa(JSON.stringify({ alg: 'HS256' }));
  const payload = btoa(JSON.stringify({ uid: userId, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 }));
  const sigData = new TextEncoder().encode(`${header}.${payload}.${secret}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', sigData);
  const sig = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
  return `${header}.${payload}.${sig}`;
}

export async function verifyToken(token, secret) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, sig] = parts;
    const sigData = new TextEncoder().encode(`${header}.${payload}.${secret}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', sigData);
    const expectedSig = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)));
    if (sig !== expectedSig) return null;
    const { uid, exp } = JSON.parse(atob(payload));
    if (Date.now() > exp) return null;
    return uid;
  } catch {
    return null;
  }
}

export async function authenticate(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.replace('Bearer ', '');
  if (!token) return null;
  return await verifyToken(token, env.JWT_SECRET);
}
