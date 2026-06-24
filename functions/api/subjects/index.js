import { handleOptions, err, json, authenticate, generateId } from '../../_utils.js';

export async function onRequestGet({ request, env }) {
  const userId = await authenticate(request, env);
  if (!userId) return err('未登录或登录已过期', 401);

  const { results } = await env.DB.prepare(
    'SELECT * FROM subjects WHERE user_id = ? ORDER BY sort_order ASC'
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

  const maxRow = await env.DB.prepare(
    'SELECT MAX(sort_order) as max_order FROM subjects WHERE user_id = ?'
  ).bind(userId).first();
  const sort_order = (maxRow?.max_order ?? 0) + 1;

  const id = generateId();
  const created_at = new Date().toISOString();
  await env.DB.prepare(
    'INSERT INTO subjects (id, user_id, subject_name, subject_dir, subject_content, created_at, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(id, userId, subject_name, subject_dir, subject_content, created_at, sort_order).run();

  return json({ id, subject_name, subject_dir, subject_content, created_at, sort_order }, 201);
}

export async function onRequestOptions() {
  return handleOptions();
}
