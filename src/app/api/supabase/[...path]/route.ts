import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const allowedPrefixes = ["auth/v1", "rest/v1", "functions/v1", "storage/v1"];
const hopByHopHeaders = new Set(["host", "connection", "content-length", "transfer-encoding"]);

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const targetPath = path.join("/");
  if (!allowedPrefixes.some((prefix) => targetPath === prefix || targetPath.startsWith(`${prefix}/`))) {
    return new Response("Unsupported Supabase endpoint", { status: 404 });
  }

  const upstreamUrl = new URL(`${targetPath}${request.nextUrl.search}`, process.env.NEXT_PUBLIC_SUPABASE_URL!);
  const headers = new Headers(request.headers);
  hopByHopHeaders.forEach((header) => headers.delete(header));

  try {
    const upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      // Required when forwarding a streamed request body in Node's fetch implementation.
      duplex: "half",
    } as RequestInit);
    const responseHeaders = new Headers(upstream.headers);
    ["content-encoding", "content-length", "transfer-encoding"].forEach((header) => responseHeaders.delete(header));
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch (error) {
    console.error("Supabase proxy upstream request failed", error instanceof Error ? error.message : "Unknown network error");
    const message = "Unable to reach Supabase from the application server. Check the network, VPN, or firewall and try again.";
    return Response.json(
      {
        code: 502,
        error_code: "supabase_unreachable",
        error_description: message,
        msg: message,
        message,
      },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const OPTIONS = proxy;
