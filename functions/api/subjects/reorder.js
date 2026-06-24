import { handleOptions, err, json, authenticate } from '../../_utils.js';

export async function onRequestPut({ request, env }) {
  const userId = await authenticate(request, env);
  if (!userId) return err('未登录或登录已过期', 401);

  const { ids } = await request.json();
  if (!Array.isArray(ids) || ids.length === 0) return err('参数不完整');

  const stmts = ids.map((id, idx) =>
    env.DB.prepare('UPDATE subjects SET sort_order = ? WHERE id = ? AND user_id = ?')
      .bind(idx + 1, id, userId)
  );
  await env.DB.batch(stmts);

  return json({ success: true });
}

export async function onRequestOptions() {
  return handleOptions();
}
