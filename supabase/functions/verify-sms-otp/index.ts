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
      // Normalize phone: strip non-digits for profile lookup, keep E.164 for exact match
      const phoneDigits = phone.replace(/\D/g, "");

      // Find user by phone in profiles table
      const { data: profiles } = await supabaseAdmin
        .from("profiles")
        .select("user_id, phone, blocked")
        .not("phone", "is", null);

      // Match phone: profile may store "5145597235" while input is "+15145597235"
      const matchedProfile = (profiles || []).find((p: { phone: string | null }) => {
        if (!p.phone) return false;
        const pDigits = p.phone.replace(/\D/g, "");
        return phoneDigits.endsWith(pDigits) || pDigits.endsWith(phoneDigits) || pDigits === phoneDigits;
      });

      if (!matchedProfile) {
        return new Response(JSON.stringify({ error: "No account found with this phone number" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (matchedProfile.blocked) {
        return new Response(JSON.stringify({ error: "Account blocked" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userId = matchedProfile.user_id;

      // Get user's real email from auth
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (userError || !userData?.user?.email) {
        return new Response(JSON.stringify({ error: "User account not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Set a temporary one-time password for session creation
      const tempPassword = crypto.randomUUID() + "-Tmp!";
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUser(userId, {
        password: tempPassword,
      });
      if (updateError) throw updateError;

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
        email: userData.user.email,
        tempPassword,
        redirectTo,
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
