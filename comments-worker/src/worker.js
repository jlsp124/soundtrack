const FALLBACK_ORIGINS = new Set([
  "https://jlsp124.github.io",
  "http://127.0.0.1:5500"
]);

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const RATE_LIMIT_TTL_SECONDS = 20;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const allowedOrigins = getAllowedOrigins(env);

    if (origin && !allowedOrigins.has(origin)) {
      return jsonResponse({ ok: false, error: "Origin not allowed" }, 403, origin, allowedOrigins);
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(origin, allowedOrigins)
      });
    }

    if (url.pathname === "/api/comments" && request.method === "GET") {
      return handleGetComments(request, env, origin, allowedOrigins);
    }

    if (url.pathname === "/api/comments" && request.method === "POST") {
      return handlePostComment(request, env, origin, allowedOrigins);
    }

    return jsonResponse({ ok: false, error: "Not found" }, 404, origin, allowedOrigins);
  }
};

async function handleGetComments(request, env, origin, allowedOrigins) {
  const url = new URL(request.url);
  const rawLimit = Number.parseInt(url.searchParams.get("limit") || `${DEFAULT_LIMIT}`, 10);
  const limit = clamp(Number.isFinite(rawLimit) ? rawLimit : DEFAULT_LIMIT, 1, MAX_LIMIT);

  const result = await env.DB
    .prepare(
      "SELECT id, name, message, created_at FROM comments ORDER BY id DESC LIMIT ?"
    )
    .bind(limit)
    .all();

  return jsonResponse(
    {
      ok: true,
      comments: Array.isArray(result.results) ? result.results : []
    },
    200,
    origin,
    allowedOrigins
  );
}

async function handlePostComment(request, env, origin, allowedOrigins) {
  let payload;

  try {
    payload = await request.json();
  } catch (_error) {
    return jsonResponse({ ok: false, error: "Invalid JSON body" }, 400, origin, allowedOrigins);
  }

  const rawName = typeof payload.name === "string" ? payload.name : "";
  const rawMessage = typeof payload.message === "string" ? payload.message : "";
  const rawHp = typeof payload.hp === "string" ? payload.hp : "";

  const name = sanitizeText(rawName, 30);
  const message = sanitizeText(rawMessage, 500);
  const hp = rawHp.trim();

  // Honeypot silently succeeds and does not store.
  if (hp !== "") {
    return jsonResponse({ ok: true }, 200, origin, allowedOrigins);
  }

  if (message.length < 3 || message.length > 500) {
    return jsonResponse(
      { ok: false, error: "Comment must be between 3 and 500 characters." },
      400,
      origin,
      allowedOrigins
    );
  }

  if (name.length > 30) {
    return jsonResponse(
      { ok: false, error: "Name must be 30 characters or fewer." },
      400,
      origin,
      allowedOrigins
    );
  }

  const ip = getClientIp(request);
  const allowed = await applyRateLimit(env, ip);
  if (!allowed) {
    return jsonResponse(
      { ok: false, error: "Too many requests. Please wait and try again." },
      429,
      origin,
      allowedOrigins
    );
  }

  const insert = await env.DB
    .prepare("INSERT INTO comments (name, message) VALUES (?, ?)")
    .bind(name || null, message)
    .run();

  const id = Number(insert.meta?.last_row_id || 0);
  const saved = await env.DB
    .prepare("SELECT id, name, message, created_at FROM comments WHERE id = ?")
    .bind(id)
    .first();

  return jsonResponse(
    {
      ok: true,
      comment: saved || {
        id,
        name: name || null,
        message
      }
    },
    201,
    origin,
    allowedOrigins
  );
}

function getAllowedOrigins(env) {
  const fromEnv = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (fromEnv.length === 0) return FALLBACK_ORIGINS;
  return new Set(fromEnv);
}

function corsHeaders(origin, allowedOrigins) {
  const headers = {
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin"
  };

  if (origin && allowedOrigins.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

function jsonResponse(payload, status, origin, allowedOrigins) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(origin, allowedOrigins)
    }
  });
}

async function applyRateLimit(env, ip) {
  if (!env.RATE_LIMIT) {
    return true;
  }

  const key = `rl:${ip || "unknown"}`;
  const existing = await env.RATE_LIMIT.get(key);
  if (existing) {
    return false;
  }

  await env.RATE_LIMIT.put(key, "1", {
    expirationTtl: RATE_LIMIT_TTL_SECONDS
  });

  return true;
}

function getClientIp(request) {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function sanitizeText(value, maxLength) {
  return value.replace(/\u0000/g, "").trim().slice(0, maxLength);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
