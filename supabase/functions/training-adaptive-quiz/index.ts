// Generates an adaptive "rattrapage" quiz: 3 new questions focused on the topics
// the candidate got wrong in their last attempt. Difficulty adjusts to past score.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface Body { assignedId: string; }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') || '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { assignedId } = (await req.json()) as Body;
    if (!assignedId) return new Response(JSON.stringify({ error: 'assignedId requis' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: assigned } = await supabase
      .from('onboarding_assigned_trainings')
      .select('quiz_answers, quiz_score, training_id, training:trainings(title, content, quiz, passing_score)')
      .eq('id', assignedId)
      .maybeSingle();

    if (!assigned?.training) {
      return new Response(JSON.stringify({ error: 'Affectation introuvable' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!KEY) return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY manquante' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const t: any = assigned.training;
    const allQ: any[] = Array.isArray(t.quiz?.questions) ? t.quiz.questions : [];
    const answers: Record<string, number> = (assigned.quiz_answers ?? {}) as any;
    const missedTopics: string[] = [];
    allQ.forEach((q, i) => {
      const ua = answers[String(i)];
      if (ua == null || ua !== q.correct_index) {
        missedTopics.push(q.question);
      }
    });

    const score = assigned.quiz_score ?? 0;
    // Difficulty: lower score → easier, higher score → harder
    const difficulty = score < 40 ? 'facile' : score < 60 ? 'moyen' : 'difficile';

    // Build a compact context
    const ctxParts: string[] = [`Titre: ${t.title}`];
    const c = t.content ?? {};
    if (Array.isArray(c.modules)) {
      c.modules.slice(0, 5).forEach((m: any) => {
        ctxParts.push(`Module: ${m.title ?? ''}`);
        (m.sections ?? []).slice(0, 3).forEach((s: any) => {
          ctxParts.push(`- ${s.heading ?? ''}: ${(s.body ?? '').slice(0, 400)}`);
        });
      });
    }
    const context = ctxParts.join('\n').slice(0, 8000);

    const sys = `Tu es un concepteur pédagogique. Génère STRICTEMENT du JSON valide (pas de markdown).`;
    const userPrompt = `Génère 3 questions de RATTRAPAGE adaptatives pour un candidat qui a obtenu ${score}% au QCM.
Difficulté visée: ${difficulty}.
Les questions doivent porter sur les SUJETS RATÉS suivants et tester la compréhension réelle (pas du par cœur) :
${missedTopics.slice(0, 8).map((q, i) => `${i + 1}. ${q}`).join('\n') || '(aucun sujet précis - couvrir l\'ensemble)'}

CONTENU DE RÉFÉRENCE :
${context}

Retourne UN OBJET JSON STRICT :
{
  "questions": [
    { "question": "...", "options": ["A","B","C","D"], "correct_index": 0, "explanation": "..." },
    { "question": "...", "options": ["A","B","C","D"], "correct_index": 0, "explanation": "..." },
    { "question": "...", "options": ["A","B","C","D"], "correct_index": 0, "explanation": "..." }
  ]
}
Contraintes : exactement 3 questions, 4 options chacune, 1 seul correct_index (0-3), questions DIFFÉRENTES de celles déjà posées.`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'system', content: sys }, { role: 'user', content: userPrompt }],
        response_format: { type: 'json_object' },
      }),
    });
    if (!aiRes.ok) {
      const txt = await aiRes.text();
      const status = aiRes.status === 429 || aiRes.status === 402 ? aiRes.status : 500;
      const msg = aiRes.status === 429 ? 'Quota IA atteint' : aiRes.status === 402 ? 'Crédits IA insuffisants' : 'Erreur IA';
      return new Response(JSON.stringify({ error: msg, detail: txt }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const aiJson = await aiRes.json();
    const raw = aiJson?.choices?.[0]?.message?.content || '{}';
    let parsed: any;
    try { parsed = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { parsed = null; }
    if (!parsed?.questions?.length) {
      return new Response(JSON.stringify({ error: 'Réponse IA invalide' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ questions: parsed.questions, difficulty, passing_score: t.passing_score ?? 70 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
