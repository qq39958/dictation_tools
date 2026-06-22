import { handleOptions, err, json, hashPassword, generateToken } from '../_utils.js';

export async function onRequestPost({ request, env }) {
  const { email, password } = await request.json();
  if (!email || !password) return err('邮箱和密码不能为空');

  const user = await env.DB.prepare(
    'SELECT id, email, password_hash FROM users WHERE email = ?'
  ).bind(email).first();
  if (!user) return err('邮箱或密码错误', 401);

  const hash = await hashPassword(password);
  if (hash !== user.password_hash) return err('邮箱或密码错误', 401);

  const token = await generateToken(user.id, env.JWT_SECRET);
  return json({ token, email: user.email });
}

export async function onRequestOptions() {
  return handleOptions();
}
