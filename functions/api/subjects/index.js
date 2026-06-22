import { handleOptions, err, json, authenticate, generateId } from '../../_utils.js';

export async function onRequestGet({ request, env }) {
  const userId = await authenticate(request, env);
  if (!userId) return err('未登录或登录已过期', 401);

  const { results } = await env.DB.prepare(
    'SELECT * FROM subjects WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(userId).all();
  return json(results);
}

export async function onRequestPost({ request, env }) {
  const userId = await authenticate(request, env);
  if (!userId) return err('未登录或登录已过期', 401);

  const { subject_name, subject_dir, subject_content } = await request.json();
  if (!subject_name || !subject_dir || !subject_content) return err('参数不完整');

  const existing = await env.DB.prepare(
    'SELECT id FROM subjects WHERE user_id = ? AND subject_name = ? AND subject_dir = ?'
  ).bind(userId, subject_name, subject_dir).first();
  if (existing) return err(`题目 ${subject_name} 在目录 ${subject_dir} 中已存在`);

  const id = generateId();
  const created_at = new Date().toISOString();
  await env.DB.prepare(
    'INSERT INTO subjects (id, user_id, subject_name, subject_dir, subject_content, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(id, userId, subject_name, subject_dir, subject_content, created_at).run();

  return json({ id, subject_name, subject_dir, subject_content, created_at }, 201);
}

export async function onRequestOptions() {
  return handleOptions();
}
