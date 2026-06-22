import { handleOptions, err, json, authenticate } from '../../_utils.js';

export async function onRequestDelete({ request, env, params }) {
  const userId = await authenticate(request, env);
  if (!userId) return err('未登录或登录已过期', 401);

  const name = decodeURIComponent(params.name);
  await env.DB.prepare(
    'DELETE FROM subjects WHERE user_id = ? AND subject_dir = ?'
  ).bind(userId, name).run();
  await env.DB.prepare(
    'DELETE FROM dirs WHERE user_id = ? AND name = ?'
  ).bind(userId, name).run();

  return json({ success: true });
}

export async function onRequestOptions() {
  return handleOptions();
}
