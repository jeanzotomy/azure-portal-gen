// Grades open-ended quiz answers using Lovable AI Gateway
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OpenQ {
  index: number;
  question: string;
  expected?: string;
  answer: string;
  max_points?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { questions } = (await req.json()) as { questions: OpenQ[] };
    if (!Array.isArray(questions) || !questions.length) {
      return new Response(JSON.stringify({ grades: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const prompt = `Tu es correcteur pédagogique. Évalue chaque réponse libre d'un candidat.
Réponds STRICTEMENT en JSON: {"grades":[{"index":number,"score":0-100,"feedback":"phrase courte en français"}]}.
Sois bienveillant mais rigoureux. score=100 si parfaitement correct, 70 si globalement bon, 40 si partiel, 0 si hors sujet.

Items à corriger:
${questions
  .map(
    (q) =>
      `#${q.index}\nQuestion: ${q.question}\nRéponse attendue (référence): ${q.expected || "(libre)"}\nRéponse du candidat: ${q.answer || "(vide)"}`,
  )
  .join("\n\n")}`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
    });
    if (!r.ok) throw new Error(`AI error ${r.status}`);
    const data = await r.json();
    const text = data.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = { grades: [] };
    }
    return new Response(JSON.stringify({ grades: parsed.grades || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
