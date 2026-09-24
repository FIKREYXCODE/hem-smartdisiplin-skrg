const allowedOrigins = new Set([
  "https://fikreyxcode.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

export function corsHeaders(request?: Request) {
  const origin = request?.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.has(origin) ? origin : "https://fikreyxcode.github.io",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function apiJson(data: unknown, request?: Request, init: ResponseInit = {}) {
  return Response.json(data, { ...init, headers: { ...corsHeaders(request), ...init.headers } });
}

export function apiOptions(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}
