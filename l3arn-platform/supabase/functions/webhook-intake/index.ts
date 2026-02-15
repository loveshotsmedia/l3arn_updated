/**
 * Webhook Intake Edge Function
 *
 * Validates inbound webhook signatures, then writes the event
 * to the webhook_events table for async processing by the API.
 *
 * Keeps logic thin — heavy processing stays in FastAPI.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// Known webhook sources and their signature headers
const SIGNATURE_HEADERS: Record<string, string> = {
    stripe: "stripe-signature",
    github: "x-hub-signature-256",
    generic: "x-webhook-signature",
};

/**
 * Validate webhook signature.
 * In production, this should use the source-specific algorithm (e.g. HMAC-SHA256).
 * For the foundation, we do a presence check.
 */
function validateSignature(
    source: string,
    signature: string | null,
    _body: string,
): boolean {
    if (!signature) return false;

    // TODO: Implement per-source signature verification
    // For now, accept any non-empty signature
    return signature.length > 0;
}

serve(async (req: Request) => {
    // Only accept POST
    if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { "Content-Type": "application/json" },
        });
    }

    try {
        const body = await req.text();
        const url = new URL(req.url);

        // Source is passed as query param: ?source=stripe
        const source = url.searchParams.get("source") ?? "unknown";
        const eventType = url.searchParams.get("event_type") ?? "unknown";

        // Get signature header for this source
        const sigHeader = SIGNATURE_HEADERS[source] ?? SIGNATURE_HEADERS.generic;
        const signature = req.headers.get(sigHeader);

        const signatureValid = validateSignature(source, signature, body);

        // Parse payload
        let payload: Record<string, unknown>;
        try {
            payload = JSON.parse(body);
        } catch {
            payload = { raw: body };
        }

        // Extract headers for debugging
        const headers: Record<string, string> = {};
        req.headers.forEach((value, key) => {
            headers[key] = value;
        });

        // Write to webhook_events using service role
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        const { error: insertError } = await supabase
            .from("webhook_events")
            .insert({
                source,
                event_type: eventType,
                payload,
                headers,
                signature_valid: signatureValid,
                processed: false,
            });

        if (insertError) {
            console.error("Failed to insert webhook event:", insertError);
            return new Response(
                JSON.stringify({ error: "Failed to store event" }),
                { status: 500, headers: { "Content-Type": "application/json" } },
            );
        }

        return new Response(
            JSON.stringify({
                received: true,
                source,
                signature_valid: signatureValid,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
        );
    } catch (err) {
        console.error("Webhook intake error:", err);
        return new Response(
            JSON.stringify({ error: "Internal error" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
        );
    }
});
