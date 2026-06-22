import { handleOptions, err, json, authenticate } from '../../_utils.js';

export async function onRequestPut({ request, env, params }) {
  const userId = await authenticate(request, env);
  if (!userId) return err('未登录或登录已过期', 401);

  const id = params.id;
  const { subject_content } = await request.json();
  if (!subject_content) return err('内容不能为空');

  const subject = await env.DB.prepare(
    'SELECT id FROM subjects WHERE id = ? AND user_id = ?'
  ).bind(id, userId).first();
  if (!subject) return err('题目不存在', 404);

  await env.DB.prepare(
    'UPDATE subjects SET subject_content = ? WHERE id = ? AND user_id = ?'
  ).bind(subject_content, id, userId).run();

  return json({ success: true });
}

export async function onRequestDelete({ request, env, params }) {
  const userId = await authenticate(request, env);
  if (!userId) return err('未登录或登录已过期', 401);

  const id = params.id;
  await env.DB.prepare(
    'DELETE FROM subjects WHERE id = ? AND user_id = ?'
  ).bind(id, userId).run();

  return json({ success: true });
}

export async function onRequestOptions() {
  return handleOptions();
}
