const upstreamOrigin = "https://zrkiqlbghnzcxyofvfxo.supabase.co";
const allowedPrefixes = ["/auth/v1", "/rest/v1", "/functions/v1", "/storage/v1"];
const allowedOrigins = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
]);

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin");
  if (!origin || !allowedOrigins.has(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-supabase-api-version",
    "Vary": "Origin",
  };
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const cors = corsHeaders(request);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (!allowedPrefixes.some((prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`))) {
      return Response.json({ message: "Unsupported Supabase endpoint" }, { status: 404, headers: cors });
    }

    const upstream = new URL(`${url.pathname}${url.search}`, upstreamOrigin);
    const headers = new Headers(request.headers);
    ["host", "origin", "connection", "content-length"].forEach((header) => headers.delete(header));

    try {
      const response = await fetch(upstream, {
        method: request.method,
        headers,
        body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
        redirect: "manual",
      });
      const responseHeaders = new Headers(response.headers);
      ["content-encoding", "content-length", "transfer-encoding"].forEach((header) => responseHeaders.delete(header));
      Object.entries(cors).forEach(([name, value]) => responseHeaders.set(name, value));
      return new Response(response.body, { status: response.status, headers: responseHeaders });
    } catch {
      return Response.json({ message: "The proxy could not reach Supabase." }, { status: 502, headers: cors });
    }
  },
};
