import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.49.4/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { phone, code, purpose } = await req.json();

    if (!phone || !code || !purpose) {
      return new Response(JSON.stringify({ error: "Missing phone, code, or purpose" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find valid OTP
    const { data: otpRows, error: otpError } = await supabaseAdmin
      .from("sms_otp_codes")
      .select("*")
      .eq("phone", phone)
      .eq("code", code)
      .eq("purpose", purpose)
      .eq("used", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1);

    if (otpError) throw otpError;

    if (!otpRows || otpRows.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid or expired code" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark OTP as used
    await supabaseAdmin
      .from("sms_otp_codes")
      .update({ used: true })
      .eq("id", otpRows[0].id);

    if (purpose === "mfa") {
      // For MFA: verify auth header to know who the user is
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabaseUser = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );

      const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(
        authHeader.replace("Bearer ", "")
      );

      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userId = claimsData.claims.sub;

      // Verify phone matches user profile
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("phone")
        .eq("user_id", userId)
        .maybeSingle();

      const normalizedProfilePhone = profile?.phone?.replace(/[\s\-()]/g, "") || "";
      const normalizedInputPhone = phone.replace(/[\s\-()]/g, "");

      if (normalizedProfilePhone !== normalizedInputPhone) {
        return new Response(JSON.stringify({ error: "Phone number does not match profile" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get user roles for redirect info
      const { data: roles } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      const roleList = (roles || []).map((r: { role: string }) => r.role);
      const redirectTo = roleList.includes("admin") || roleList.includes("agent") ? "/admin" : "/portal";

      return new Response(JSON.stringify({ success: true, purpose: "mfa", verified: true, redirectTo }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (purpose === "login") {
      // Find or create user by phone
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find((u: { phone?: string }) => u.phone === phone);

      let userId: string;

      if (existingUser) {
        userId = existingUser.id;

        // Check if blocked
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("blocked")
          .eq("user_id", userId)
          .maybeSingle();

        if (profile?.blocked) {
          return new Response(JSON.stringify({ error: "Account blocked" }), {
            status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else {
        // Create user with phone
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          phone,
          phone_confirm: true,
        });

        if (createError) throw createError;
        userId = newUser.user.id;
      }

      // Generate a magic link / session
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: existingUser?.email || `${phone.replace("+", "")}@phone.local`,
      });

      if (linkError) throw linkError;

      // Get roles
      const { data: roles } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      const roleList = (roles || []).map((r: { role: string }) => r.role);
      const redirectTo = roleList.includes("admin") || roleList.includes("agent") ? "/admin" : "/portal";

      return new Response(JSON.stringify({
        success: true,
        purpose: "login",
        userId,
        redirectTo,
        hashed_token: linkData.properties?.hashed_token,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid purpose" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("verify-sms-otp error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
