// AI tutor for a training: answers candidate questions grounded in the module content.
// Streams the response as text/event-stream (OpenAI-style chunks).
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface Body {
  trainingId: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

function buildContext(t: any): string {
  if (!t) return '';
  const c = t.content ?? {};
  const parts: string[] = [];
  parts.push(`Titre: ${t.title}`);
  if (t.description) parts.push(`Description: ${t.description}`);
  if (c.introduction) parts.push(`Introduction:\n${c.introduction}`);
  if (Array.isArray(c.objectives)) parts.push(`Objectifs:\n- ${c.objectives.join('\n- ')}`);
  if (Array.isArray(c.modules)) {
    c.modules.forEach((m: any, i: number) => {
      parts.push(`Module ${i + 1}: ${m.title ?? ''}`);
      if (Array.isArray(m.sections)) {
        m.sections.forEach((s: any) => {
          parts.push(`  - ${s.heading ?? ''}\n    ${s.body ?? ''}`);
        });
      }
    });
  }
  if (c.conclusion) parts.push(`Conclusion:\n${c.conclusion}`);
  return parts.join('\n\n').slice(0, 12000);
}

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

    const body = (await req.json()) as Body;
    if (!body?.trainingId || !Array.isArray(body.messages)) {
      return new Response(JSON.stringify({ error: 'trainingId et messages requis' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: training } = await supabase
      .from('trainings')
      .select('title, description, content')
      .eq('id', body.trainingId)
      .maybeSingle();

    if (!training) {
      return new Response(JSON.stringify({ error: 'Formation introuvable' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!KEY) return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY manquante' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const context = buildContext(training);
    const system = `Tu es un tuteur pédagogique bienveillant qui aide un candidat à comprendre une formation d'onboarding. Réponds en FRANÇAIS, de façon claire et concise (max ~200 mots), en t'appuyant STRICTEMENT sur le contenu de la formation ci-dessous. Si la question sort du cadre de la formation, dis-le poliment et oriente la personne vers son responsable RH.\n\n--- CONTENU DE LA FORMATION ---\n${context}\n--- FIN DU CONTENU ---`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        stream: true,
        messages: [
          { role: 'system', content: system },
          ...body.messages.slice(-10),
        ],
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      const status = aiRes.status === 429 || aiRes.status === 402 ? aiRes.status : 500;
      const msg = aiRes.status === 429 ? 'Quota IA atteint' : aiRes.status === 402 ? 'Crédits IA insuffisants' : 'Erreur IA';
      return new Response(JSON.stringify({ error: msg, detail: t }), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(aiRes.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
