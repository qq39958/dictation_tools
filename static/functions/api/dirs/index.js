import { handleOptions, err, json, authenticate, generateId } from '../../_utils.js';

export async function onRequestGet({ request, env }) {
  const userId = await authenticate(request, env);
  if (!userId) return err('未登录或登录已过期', 401);

  const { results } = await env.DB.prepare(
    'SELECT name FROM dirs WHERE user_id = ? ORDER BY created_at ASC'
  ).bind(userId).all();
  return json(results.map(r => r.name));
}

export async function onRequestPost({ request, env }) {
  const userId = await authenticate(request, env);
  if (!userId) return err('未登录或登录已过期', 401);

  const { name } = await request.json();
  if (!name) return err('目录名称不能为空');

  const existing = await env.DB.prepare(
    'SELECT id FROM dirs WHERE user_id = ? AND name = ?'
  ).bind(userId, name).first();
  if (existing) return err('目录已存在');

  const id = generateId();
  const created_at = new Date().toISOString();
  await env.DB.prepare(
    'INSERT INTO dirs (id, user_id, name, created_at) VALUES (?, ?, ?, ?)'
  ).bind(id, userId, name, created_at).run();

  return json({ success: true }, 201);
}

export async function onRequestOptions() {
  return handleOptions();
}
