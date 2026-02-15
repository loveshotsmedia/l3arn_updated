/**
 * Tool Proxy Edge Function
 *
 * Locked-down proxy that forwards authenticated requests
 * to specific FastAPI tool endpoints. Only whitelisted
 * tool names are proxied.
 *
 * Keeps logic thin — just validates auth, checks allowlist, and proxies.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const API_BASE_URL = Deno.env.get("API_BASE_URL") ?? "http://localhost:8000";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

// Only these tool names can be proxied
const ALLOWED_TOOLS = new Set(["example_tool"]);

serve(async (req: Request) => {
    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { "Content-Type": "application/json" },
        });
    }

    try {
        // Verify the user is authenticated via Supabase
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            });
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            global: { headers: { Authorization: authHeader } },
        });

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return new Response(JSON.stringify({ error: "Invalid token" }), {
                status: 401,
                headers: { "Content-Type": "application/json" },
            });
        }

        // Parse request body
        const body = await req.json();
        const toolName: string = body.tool_name ?? "";

        // Allowlist check
        if (!ALLOWED_TOOLS.has(toolName)) {
            return new Response(
                JSON.stringify({ error: `Tool '${toolName}' is not allowed` }),
                { status: 403, headers: { "Content-Type": "application/json" } },
            );
        }

        // Proxy to FastAPI
        const proxyResponse = await fetch(`${API_BASE_URL}/api/v1/tools/${toolName}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: authHeader,
                "X-Forwarded-For": req.headers.get("X-Forwarded-For") ?? "unknown",
            },
            body: JSON.stringify(body.payload ?? {}),
        });

        const result = await proxyResponse.json();

        return new Response(JSON.stringify(result), {
            status: proxyResponse.status,
            headers: { "Content-Type": "application/json" },
        });
    } catch (err) {
        console.error("Tool proxy error:", err);
        return new Response(
            JSON.stringify({ error: "Proxy error" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
        );
    }
});
