// Edge function: training-learning-path
// Analyses a learner's progress on a given training and returns an adaptive
// recommendation (level + next module hint + rationale) powered by Lovable AI.
// verify_jwt is left to its default (false) — we validate the JWT in code so the
// function can also be invoked via supabase.functions.invoke from the browser.

import { createClient } from "npm:@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  assignedId?: string;
  trainingId?: string;
}

interface Recommendation {
  recommendedLevel: "revision" | "standard" | "avance";
  nextModuleIndex: number | null;
  nextModuleTitle: string | null;
  rationale: string;
  strengths: string[];
  weaknesses: string[];
}

const FALLBACK = (modules: { title: string }[], score: number | null): Recommendation => {
  const level: Recommendation["recommendedLevel"] =
    score == null ? "standard" : score >= 90 ? "avance" : score >= 60 ? "standard" : "revision";
  return {
    recommendedLevel: level,
    nextModuleIndex: modules.length ? 0 : null,
    nextModuleTitle: modules[0]?.title ?? null,
    rationale:
      level === "avance"
        ? "Excellents résultats : passez directement aux modules avancés."
        : level === "standard"
        ? "Bonne maîtrise. Poursuivez le parcours standard."
        : "Quelques notions à consolider avant d'aller plus loin.",
    strengths: [],
    weaknesses: [],
  };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing Authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate JWT
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

    const body = (await req.json().catch(() => ({}))) as RequestBody;
    if (!body.assignedId && !body.trainingId) {
      return new Response(JSON.stringify({ error: "assignedId or trainingId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Resolve assignment for this user
    let assignedQuery = admin
      .from("onboarding_assigned_trainings")
      .select(
        "id, training_id, course_page, quiz_score, quiz_passed, total_seconds, module_times, completed_at, process:onboarding_processes!inner(user_id)",
      )
      .eq("process.user_id", userId)
      .limit(1);

    if (body.assignedId) assignedQuery = assignedQuery.eq("id", body.assignedId);
    else assignedQuery = assignedQuery.eq("training_id", body.trainingId!);

    const { data: assignedRow, error: aErr } = await assignedQuery.maybeSingle();
    if (aErr) throw aErr;
    if (!assignedRow) {
      return new Response(JSON.stringify({ error: "No assignment found for this learner" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch training content
    const { data: training, error: tErr } = await admin
      .from("trainings")
      .select("title, content, passing_score")
      .eq("id", assignedRow.training_id)
      .maybeSingle();
    if (tErr) throw tErr;

    const modules: { title: string; idx: number }[] = Array.isArray((training?.content as any)?.modules)
      ? ((training!.content as any).modules as any[]).map((m, i) => ({ title: m.title ?? `Module ${i + 1}`, idx: i }))
      : [];

    const score = (assignedRow.quiz_score as number | null) ?? null;
    const totalSec = (assignedRow.total_seconds as number | null) ?? 0;

    // If no Lovable AI key, return deterministic fallback
    if (!LOVABLE_API_KEY) {
      const reco = FALLBACK(modules, score);
      await persistProgress(admin, userId, assignedRow.training_id, reco.recommendedLevel);
      return new Response(JSON.stringify(reco), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Build a compact prompt for the AI
    const prompt = `Tu es un coach pédagogique. Analyse les performances d'un apprenant et recommande la suite la plus utile.

Formation: "${training?.title ?? "?"}"
Modules (${modules.length}): ${modules.map((m) => `${m.idx + 1}. ${m.title}`).join(" | ")}
Score quiz: ${score == null ? "non passé" : score + "%"} (seuil ${training?.passing_score ?? 70}%)
Quiz réussi: ${assignedRow.quiz_passed ? "oui" : "non"}
Temps total passé: ${Math.round(totalSec / 60)} min
Page courante: ${assignedRow.course_page ?? 0}

Renvoie STRICTEMENT un JSON avec cette forme:
{
  "recommendedLevel": "revision" | "standard" | "avance",
  "nextModuleIndex": <int 0-based ou null>,
  "rationale": "phrase courte en français (max 240 caractères)",
  "strengths": ["..."],
  "weaknesses": ["..."]
}
Pas de texte hors JSON.`;

    let reco: Recommendation = FALLBACK(modules, score);

    try {
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": LOVABLE_API_KEY,
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "Tu réponds uniquement en JSON valide." },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes IA, réessayez dans un instant." }), {
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

      if (aiRes.ok) {
        const json = await aiRes.json();
        const text = json?.choices?.[0]?.message?.content ?? "{}";
        const parsed = JSON.parse(text);
        const level = ["revision", "standard", "avance"].includes(parsed.recommendedLevel)
          ? parsed.recommendedLevel
          : reco.recommendedLevel;
        const idx =
          typeof parsed.nextModuleIndex === "number" && parsed.nextModuleIndex >= 0 && parsed.nextModuleIndex < modules.length
            ? parsed.nextModuleIndex
            : reco.nextModuleIndex;
        reco = {
          recommendedLevel: level,
          nextModuleIndex: idx,
          nextModuleTitle: idx != null ? modules[idx]?.title ?? null : null,
          rationale: typeof parsed.rationale === "string" ? parsed.rationale.slice(0, 280) : reco.rationale,
          strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 4).map(String) : [],
          weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses.slice(0, 4).map(String) : [],
        };
      }
    } catch (_e) {
      // Keep fallback
    }

    await persistProgress(admin, userId, assignedRow.training_id, reco.recommendedLevel);

    return new Response(JSON.stringify(reco), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[training-learning-path]", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function persistProgress(
  admin: ReturnType<typeof createClient>,
  userId: string,
  trainingId: string,
  level: "revision" | "standard" | "avance",
) {
  try {
    await admin
      .from("learner_progress_state")
      .upsert(
        {
          user_id: userId,
          training_id: trainingId,
          adaptive_level: level,
          last_evaluated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,training_id" },
      );
  } catch (e) {
    console.warn("persistProgress failed", (e as Error).message);
  }
}
