// Edge function: analyze-cv
// Downloads a candidate's CV from storage, extracts text, and asks Lovable AI
// (Gemini 2.5 Flash) for a structured analysis (score, summary, skills, etc.)
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { extractText, getDocumentProxy } from "npm:unpdf@0.12.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function extractCvText(path: string): Promise<string> {
  const { data, error } = await admin.storage.from("cv-applications").download(path);
  if (error || !data) throw new Error(`Téléchargement CV: ${error?.message || "vide"}`);
  const buf = new Uint8Array(await data.arrayBuffer());
  const lower = path.toLowerCase();

  if (lower.endsWith(".pdf")) {
    try {
      const pdf = await getDocumentProxy(buf);
      const { text } = await extractText(pdf, { mergePages: true });
      return (Array.isArray(text) ? text.join("\n") : text).slice(0, 30000);
    } catch (e) {
      throw new Error(`Extraction PDF échouée: ${(e as Error).message}`);
    }
  }
  // DOC/DOCX: best-effort plain decode (Lovable AI can still glean some content)
  try {
    return new TextDecoder("utf-8", { fatal: false }).decode(buf).replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]/g, " ").slice(0, 30000);
  } catch {
    return "";
  }
}

async function callAI(cvText: string, job: { title: string; description?: string | null; requirements?: string | null }): Promise<any> {
  const systemPrompt = `Tu es un expert RH. Analyse le CV ci-dessous en fonction de l'offre d'emploi. Réponds STRICTEMENT en JSON valide avec ce schéma:
{
  "score": number (0-100, qualité globale du CV),
  "match_percentage": number (0-100, adéquation au poste),
  "summary": string (résumé en 2-3 phrases en français),
  "experience_years": number (années d'expérience pertinentes estimées),
  "skills": string[] (max 15 compétences clés détectées),
  "strengths": string[] (3-5 points forts en français),
  "weaknesses": string[] (2-4 points faibles ou manques en français),
  "recommendation": "fortement_recommande" | "recommande" | "a_considerer" | "non_recommande"
}
Aucun texte hors du JSON. Pas de markdown.`;

  const userPrompt = `OFFRE D'EMPLOI:
Titre: ${job.title}
Description: ${job.description || "(non fournie)"}
Pré-requis: ${job.requirements || "(non fournis)"}

CV DU CANDIDAT:
${cvText || "(extraction texte impossible)"}`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`AI gateway ${resp.status}: ${txt.slice(0, 300)}`);
  }
  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content || "{}";
  return JSON.parse(content);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Auth: allow internal calls (service role key) OR admin/hr/gestionnaire users
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (token !== SERVICE_ROLE) {
    const caller = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: u } = await caller.auth.getUser();
    if (!u?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: roles } = await caller.from("user_roles").select("role").eq("user_id", u.user.id);
    const allowed = ["admin", "hr", "gestionnaire"];
    if (!roles?.some((r: { role: string }) => allowed.includes(r.role))) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  }

  try {
    const { application_id } = await req.json();

    if (!application_id) {
      return new Response(JSON.stringify({ error: "application_id requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: app, error: appErr } = await admin
      .from("job_applications")
      .select("id, job_id, cv_path")
      .eq("id", application_id)
      .maybeSingle();
    if (appErr || !app) throw new Error("Candidature introuvable");

    await admin.from("job_applications").update({ ai_status: "processing", ai_error: null }).eq("id", application_id);

    const { data: job } = await admin
      .from("job_postings")
      .select("title, description, requirements")
      .eq("id", app.job_id)
      .maybeSingle();

    const cvText = await extractCvText(app.cv_path);
    const result = await callAI(cvText, {
      title: job?.title || "(offre inconnue)",
      description: job?.description,
      requirements: job?.requirements,
    });

    const clampInt = (v: any, min = 0, max = 100) => {
      const n = Math.round(Number(v));
      if (!isFinite(n)) return null;
      return Math.max(min, Math.min(max, n));
    };

    const update = {
      ai_status: "done",
      ai_score: clampInt(result.score),
      ai_match_percentage: clampInt(result.match_percentage),
      ai_summary: typeof result.summary === "string" ? result.summary.slice(0, 2000) : null,
      ai_experience_years: clampInt(result.experience_years, 0, 60),
      ai_skills: Array.isArray(result.skills) ? result.skills.slice(0, 20) : null,
      ai_strengths: Array.isArray(result.strengths) ? result.strengths.slice(0, 8) : null,
      ai_weaknesses: Array.isArray(result.weaknesses) ? result.weaknesses.slice(0, 8) : null,
      ai_recommendation: ["fortement_recommande","recommande","a_considerer","non_recommande"].includes(result.recommendation) ? result.recommendation : null,
      ai_analyzed_at: new Date().toISOString(),
      ai_error: null,
    };

    const { error: upErr } = await admin.from("job_applications").update(update).eq("id", application_id);
    if (upErr) throw upErr;

    return new Response(JSON.stringify({ ok: true, result: update }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = (e as Error).message || String(e);
    console.error("analyze-cv error:", msg);
    try {
      const { application_id } = await req.clone().json().catch(() => ({} as any));
      if (application_id) {
        await admin.from("job_applications").update({ ai_status: "error", ai_error: msg.slice(0, 500) }).eq("id", application_id);
      }
    } catch (_) { /* ignore */ }
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
