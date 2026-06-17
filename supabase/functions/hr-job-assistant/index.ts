// Edge function: hr-job-assistant
// AI assistant pour le formulaire de création/édition d'offre d'emploi.
// Génère ou améliore la description (et éventuellement le titre) à partir
// du contexte de l'offre fourni par les RH.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

type Action = "generate" | "improve" | "shorten" | "translate_en" | "extract_requirements";

interface Body {
  action: Action;
  context: {
    title?: string;
    department?: string;
    sector?: string;
    location?: string;
    contract_type?: string;
    contract_duration?: string;
    start_date?: string;
    salary_range?: string;
    description?: string;
  };
  instructions?: string;
}

const SYSTEM_PROMPT = `Tu es un expert RH senior spécialisé dans la rédaction d'offres d'emploi en Afrique de l'Ouest (Guinée notamment) pour le secteur IT/Cloud/DevOps/Data.

Tu produis des descriptions de poste claires, attractives, structurées et inclusives, en français professionnel.

FORMAT DE SORTIE (STRICT — texte brut lisible, PAS de Markdown):
- Les titres de section sont écrits en MAJUSCULES sur leur propre ligne (ex: "À PROPOS DU POSTE", "VOS MISSIONS", "PROFIL RECHERCHÉ", "CE QUE NOUS OFFRONS", "PROCESSUS DE RECRUTEMENT"). N'utilise JAMAIS "#" ni "**".
- Pour les listes à puces, utilise "- " (tiret + espace) en début de ligne.
- Pour les étapes ordonnées (processus de recrutement, par exemple), utilise "1. ", "2. ", "3. "…
- N'utilise JAMAIS de caractères de mise en forme markdown: pas de "*", pas de "**", pas de "***", pas de "_", pas de "#", pas de backticks. Pas d'emojis.
- Sépare chaque section par UNE seule ligne vide.

Structure recommandée pour une description complète:
1. À PROPOS DU POSTE (2-3 phrases — contexte, mission globale)
2. VOS MISSIONS (5-7 puces "- ", verbes d'action concrets)
3. PROFIL RECHERCHÉ (puces "- " : compétences techniques + soft skills + expérience attendue)
4. CE QUE NOUS OFFRONS (puces "- " : avantages, environnement, perspectives)
5. PROCESSUS DE RECRUTEMENT (liste numérotée "1.", "2."… des étapes)

Règles éditoriales:
- Pas de discrimination (genre, âge, origine). Formulations inclusives ("vous", "la personne recrutée").
- Évite le jargon inutile, garde un ton humain et professionnel.
- N'invente pas d'informations qui ne sont pas dans le contexte.`;

function buildUserPrompt(body: Body): string {
  const c = body.context;
  const ctx = [
    c.title && `Titre: ${c.title}`,
    c.department && `Département: ${c.department}`,
    c.sector && `Secteur: ${c.sector}`,
    c.location && `Lieu: ${c.location}`,
    c.contract_type && `Type de contrat: ${c.contract_type}${c.contract_duration ? ` (${c.contract_duration})` : ""}`,
    c.start_date && `Prise de poste: ${c.start_date}`,
    c.salary_range && `Rémunération: ${c.salary_range}`,
  ].filter(Boolean).join("\n");

  const current = c.description?.trim() || "";

  switch (body.action) {
    case "generate":
      return `CONTEXTE DE L'OFFRE:\n${ctx || "(peu d'informations fournies)"}\n\n${body.instructions ? `INSTRUCTIONS DES RH:\n${body.instructions}\n\n` : ""}Rédige une description complète et engageante pour cette offre, en suivant la structure recommandée. Si certaines informations manquent, fais des suppositions raisonnables et clairement génériques (sans inventer de détails spécifiques à l'entreprise).\n\nRéponds STRICTEMENT en JSON valide:\n{ "description": "<markdown>", "title_suggestion": "<titre amélioré ou identique>" }`;

    case "improve":
      return `CONTEXTE DE L'OFFRE:\n${ctx}\n\nDESCRIPTION ACTUELLE:\n${current || "(vide)"}\n\n${body.instructions ? `INSTRUCTIONS:\n${body.instructions}\n\n` : ""}Améliore cette description: corrige les fautes, clarifie les missions, renforce l'attractivité, structure mieux. Conserve les informations factuelles.\n\nRéponds STRICTEMENT en JSON valide:\n{ "description": "<markdown amélioré>" }`;

    case "shorten":
      return `DESCRIPTION ACTUELLE:\n${current}\n\nRaccourcis cette description en gardant les éléments essentiels (mission, missions clés, profil, avantages). Vise environ 40% de la longueur initiale.\n\nRéponds STRICTEMENT en JSON valide:\n{ "description": "<markdown raccourci>" }`;

    case "translate_en":
      return `DESCRIPTION FRANÇAISE:\n${current}\n\nTraduis cette description en anglais professionnel adapté au recrutement IT.\n\nRéponds STRICTEMENT en JSON valide:\n{ "description": "<markdown EN>" }`;

    case "extract_requirements":
      return `DESCRIPTION:\n${current}\n\nExtrait une liste structurée de pré-requis (techniques + soft skills + expérience).\n\nRéponds STRICTEMENT en JSON valide:\n{ "requirements": "<markdown puces>" }`;
  }
}

async function callAI(body: Body) {
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(body) },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    if (resp.status === 429) throw new Error("Limite de requêtes atteinte. Réessayez dans un instant.");
    if (resp.status === 402) throw new Error("Crédits IA épuisés. Ajoutez des crédits dans les paramètres de votre espace.");
    throw new Error(`AI gateway ${resp.status}: ${txt.slice(0, 300)}`);
  }
  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content || "{}";
  return JSON.parse(content);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Auth: admin / hr / gestionnaire only
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
    const body = (await req.json()) as Body;
    if (!body?.action || !body?.context) {
      return new Response(JSON.stringify({ error: "action et context requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const allowedActions: Action[] = ["generate", "improve", "shorten", "translate_en", "extract_requirements"];
    if (!allowedActions.includes(body.action)) {
      return new Response(JSON.stringify({ error: "action invalide" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if ((body.action === "improve" || body.action === "shorten" || body.action === "translate_en" || body.action === "extract_requirements") && !body.context.description?.trim()) {
      return new Response(JSON.stringify({ error: "Cette action nécessite une description existante." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await callAI(body);

    return new Response(JSON.stringify({ ok: true, result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = (e as Error).message || String(e);
    console.error("hr-job-assistant error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
