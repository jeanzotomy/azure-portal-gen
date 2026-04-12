import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: roleData } = await callerClient.from("user_roles").select("role").eq("user_id", caller.id).eq("role", "admin");
    if (!roleData || roleData.length === 0) {
      return new Response(JSON.stringify({ error: "Accès refusé — admin requis" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { action, users } = await req.json();

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    if (action === "invite") {
      // Single invite by email
      const { email, full_name, role } = users[0] || {};
      if (!email || typeof email !== "string") {
        return new Response(JSON.stringify({ error: "Email requis" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
        data: { full_name: full_name || "" },
      });

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Assign role if specified
      if (role && role !== "client" && data.user) {
        await adminClient.from("user_roles").insert({ user_id: data.user.id, role });
      }

      return new Response(JSON.stringify({ success: true, invited: 1 }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "bulk-invite") {
      // Bulk invite from array
      if (!Array.isArray(users) || users.length === 0) {
        return new Response(JSON.stringify({ error: "Liste d'utilisateurs vide" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (users.length > 50) {
        return new Response(JSON.stringify({ error: "Maximum 50 utilisateurs par import" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const results: { email: string; success: boolean; error?: string }[] = [];

      for (const u of users) {
        if (!u.email) {
          results.push({ email: u.email || "?", success: false, error: "Email manquant" });
          continue;
        }

        try {
          const { data, error } = await adminClient.auth.admin.inviteUserByEmail(u.email, {
            data: { full_name: u.full_name || "" },
          });

          if (error) {
            results.push({ email: u.email, success: false, error: error.message });
          } else {
            // Assign role
            if (u.role && u.role !== "client" && data.user) {
              await adminClient.from("user_roles").insert({ user_id: data.user.id, role: u.role });
            }
            results.push({ email: u.email, success: true });
          }
        } catch (err) {
          results.push({ email: u.email, success: false, error: (err as Error).message });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      return new Response(JSON.stringify({ success: true, invited: successCount, failed: failCount, details: results }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Action invalide" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
