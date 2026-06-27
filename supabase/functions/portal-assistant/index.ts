// Edge function: portal-assistant
// Personal AI assistant for the client portal. Streams responses via SSE-compatible
// JSON chunks (we keep it simple: full response in one shot to avoid AI SDK plumbing).
// Reads the user's portal context (open tickets, unpaid invoices, training progress)
// so the assistant can give grounded answers.

import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI gateway not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing Authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid JWT" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;
    const userEmail = userData.user.email ?? "client";

    const body = (await req.json().catch(() => ({}))) as { messages?: ChatMessage[]; persist?: boolean };
    const messages = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Fetch user portal context via RPC
    let context: Record<string, unknown> = {};
    try {
      const { data: ctx } = await admin.rpc("get_portal_context" as any, undefined as any, {
        // call as the user
        head: false,
      } as any).maybeSingle?.() ?? { data: null };
      if (ctx) context = ctx as Record<string, unknown>;
    } catch (_e) {
      // Try userClient instead (RPC enforces auth.uid())
      try {
        const { data: ctx2 } = await (userClient as any).rpc("get_portal_context");
        if (ctx2) context = ctx2 as Record<string, unknown>;
      } catch (_e2) { /* ignore */ }
    }

    const systemPrompt = `Tu es l'Assistant Portail CloudMature pour ${userEmail}.
Tu réponds en français, brièvement (3-5 phrases max), avec un ton chaleureux et professionnel.
Tu peux aider sur : formations, factures, tickets de support, paiements, et navigation du portail.
N'invente jamais de chiffres ; appuie-toi uniquement sur le contexte ci-dessous.
Si on te demande quelque chose hors-périmètre, redirige poliment vers le formulaire de contact.

Contexte client en temps réel : ${JSON.stringify(context)}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez dans un instant." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiRes.ok) {
      const t = await aiRes.text().catch(() => "");
      return new Response(JSON.stringify({ error: "Gateway error", detail: t }), {
        status: aiRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const json = await aiRes.json();
    const reply: string = json?.choices?.[0]?.message?.content ?? "Désolé, aucune réponse générée.";

    // Persist user message + assistant reply
    if (body.persist !== false) {
      try {
        const lastUser = [...messages].reverse().find((m) => m.role === "user");
        const toInsert: any[] = [];
        if (lastUser) toInsert.push({ user_id: userId, role: "user", content: lastUser.content });
        toInsert.push({ user_id: userId, role: "assistant", content: reply });
        await admin.from("portal_assistant_messages").insert(toInsert);
      } catch (e) {
        console.warn("persist failed", (e as Error).message);
      }
    }

    return new Response(JSON.stringify({ reply, context }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[portal-assistant]", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
