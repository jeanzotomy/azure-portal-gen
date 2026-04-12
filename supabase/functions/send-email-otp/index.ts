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
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the user is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { purpose } = await req.json();

    if (!purpose || purpose !== "mfa") {
      return new Response(JSON.stringify({ error: "Invalid purpose" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the user from the auth token
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user?.email) {
      return new Response(JSON.stringify({ error: "Could not identify user" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const email = user.email;

    // Rate limiting: max 3 OTPs per email per 10 minutes
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("sms_otp_codes")
      .select("*", { count: "exact", head: true })
      .eq("phone", `email:${email}`)
      .gte("created_at", tenMinAgo);

    if ((count ?? 0) >= 3) {
      return new Response(JSON.stringify({ error: "Too many attempts. Please wait 10 minutes." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate 6-digit code
    const code = String(Math.floor(100000 + Math.random() * 900000));

    // Store in DB (reuse sms_otp_codes table, use "email:<addr>" as phone field)
    const { error: insertError } = await supabaseAdmin.from("sms_otp_codes").insert({
      phone: `email:${email}`,
      code,
      purpose,
      user_id: user.id,
    });

    if (insertError) throw insertError;

    // Send email via Supabase Auth admin - generate a magic link just to trigger the email hook,
    // but actually we'll use a simpler approach: use the built-in email sending
    // We'll use Supabase's admin API to send a custom email via the auth system
    // Actually, let's use a simple approach: generate link and extract token
    
    // Simple approach: use the Resend/email queue if available, or fall back to magic link
    // For now, use generateLink to send a recovery-style email with our code
    // Better: just include the code in a direct response and let the frontend show it
    // But that defeats the purpose... Let's use the email queue system already in place

    // Enqueue email via the existing pgmq system
    const payload = {
      to: email,
      subject: "CloudMature - Code de vérification MFA",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #1a1a2e;">Code de vérification CloudMature</h2>
          <p>Votre code de vérification est :</p>
          <div style="background: #f0f0f5; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1a1a2e;">${code}</span>
          </div>
          <p style="color: #666; font-size: 14px;">Ce code est valide pendant 5 minutes.</p>
          <p style="color: #999; font-size: 12px;">Si vous n'avez pas demandé ce code, ignorez cet email.</p>
        </div>
      `,
    };

    await supabaseAdmin.rpc("enqueue_email", {
      queue_name: "transactional_emails",
      payload: payload,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("send-email-otp error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
