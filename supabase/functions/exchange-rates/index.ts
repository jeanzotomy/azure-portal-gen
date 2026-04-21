// Edge function: récupère les taux de change pour GNF, USD, EUR
// Source: open.er-api.com (gratuit, pas de clé)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const base = (url.searchParams.get('base') || 'USD').toUpperCase();

    const resp = await fetch(`https://open.er-api.com/v6/latest/${base}`);
    if (!resp.ok) throw new Error(`Provider responded ${resp.status}`);
    const data = await resp.json();

    if (data.result !== 'success') {
      throw new Error(data['error-type'] || 'Provider error');
    }

    const rates = data.rates || {};
    const out = {
      base,
      timestamp: data.time_last_update_unix,
      rates: {
        USD: rates.USD ?? (base === 'USD' ? 1 : null),
        EUR: rates.EUR ?? null,
        GNF: rates.GNF ?? null,
      },
    };

    return new Response(JSON.stringify(out), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
