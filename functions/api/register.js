import { handleOptions, err, json, hashPassword, generateId, generateToken } from '../_utils.js';

export async function onRequestPost({ request, env }) {
  const { email, password } = await request.json();
  if (!email || !password) return err('邮箱和密码不能为空');
  if (password.length < 6) return err('密码至少 6 位');

  const existing = await env.DB.prepare(
    'SELECT id FROM users WHERE email = ?'
  ).bind(email).first();
  if (existing) return err('该邮箱已注册');

  const id = generateId();
  const password_hash = await hashPassword(password);
  const created_at = new Date().toISOString();

  await env.DB.prepare(
    'INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)'
  ).bind(id, email, password_hash, created_at).run();

  const token = await generateToken(id, env.JWT_SECRET);
  return json({ token, email });
}

export async function onRequestOptions() {
  return handleOptions();
}
