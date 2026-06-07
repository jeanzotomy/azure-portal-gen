// Génère une formation complète (contenu structuré + QCM) via Lovable AI Gateway (Gemini 2.5 Flash)
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface Body {
  topic: string;
  level?: 'debutant' | 'intermediaire' | 'avance';
  duration_minutes?: number;
  num_questions?: number;
  language?: 'fr' | 'en';
  audience?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    // Auth check: only HR/Admin/Gestionnaire
    const authHeader = req.headers.get('Authorization') || '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const body = (await req.json()) as Body;
    if (!body?.topic || typeof body.topic !== 'string' || body.topic.trim().length < 3) {
      return new Response(JSON.stringify({ error: 'topic requis (min 3 caractères)' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const level = body.level || 'intermediaire';
    const duration = Math.min(Math.max(body.duration_minutes || 30, 10), 180);
    const numQ = Math.min(Math.max(body.num_questions || 5, 3), 15);
    const lang = body.language || 'fr';
    const audience = body.audience || 'nouveaux collaborateurs en onboarding';

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY manquante' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const sys = lang === 'fr'
      ? `Tu es un concepteur pédagogique expert. Tu produis des formations e-learning concises, structurées et engageantes, avec un QCM d'évaluation rigoureux. Réponds STRICTEMENT en JSON valide, en français, sans markdown.`
      : `You are an expert instructional designer. Produce concise, well-structured e-learning courses with a rigorous multiple-choice quiz. Reply STRICTLY in valid JSON, no markdown.`;

    const userPrompt = `Génère une formation sur le sujet suivant :
Sujet: ${body.topic.trim()}
Niveau: ${level}
Durée cible: ${duration} minutes
Audience: ${audience}
Nombre de questions QCM: ${numQ}

Retourne UN OBJET JSON STRICT avec cette forme exacte :
{
  "title": "Titre court et clair",
  "description": "Résumé d'1-2 phrases",
  "category": "Catégorie courte (ex: Sécurité, RGPD, DevOps, Soft skills, Onboarding)",
  "duration_minutes": ${duration},
  "content": {
    "objectives": ["objectif 1", "objectif 2", "objectif 3"],
    "modules": [
      { "title": "Module 1 - ...", "summary": "synthèse 2-3 phrases", "key_points": ["point 1","point 2","point 3","point 4"] },
      { "title": "Module 2 - ...", "summary": "...", "key_points": ["...","...","...","..."] },
      { "title": "Module 3 - ...", "summary": "...", "key_points": ["...","...","...","..."] }
    ],
    "resources": ["ressource 1 (optionnel)", "ressource 2 (optionnel)"]
  },
  "quiz": {
    "passing_score": 70,
    "questions": [
      {
        "question": "Énoncé de la question 1 ?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correct_index": 0,
        "explanation": "Pourquoi cette réponse est correcte (1 phrase)"
      }
    ]
  }
}
Contraintes :
- Exactement ${numQ} questions, chacune avec 4 options et 1 seul correct_index (0-3).
- 3 à 5 modules selon la durée.
- Pas de texte hors du JSON.`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'system', content: sys }, { role: 'user', content: userPrompt }],
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: 'Quota IA atteint, réessayez plus tard' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: 'Crédits IA insuffisants — ajoutez des crédits dans Lovable Cloud' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      return new Response(JSON.stringify({ error: 'AI error', detail: t }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const aiJson = await aiRes.json();
    const raw = aiJson?.choices?.[0]?.message?.content || '{}';
    let parsed: any;
    try { parsed = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { parsed = null; }
    if (!parsed || !parsed.title || !parsed.quiz?.questions?.length) {
      return new Response(JSON.stringify({ error: 'Réponse IA invalide', raw }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ training: parsed }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
