/**
 * CI security audit — Vérifie l'isolation stricte des données via RLS.
 *
 * Échec (exit 1) si :
 *  1. Une table `public` n'a pas RLS activée.
 *  2. Une table sensible (présence d'une colonne `user_id`) n'a aucune policy
 *     scopée à `auth.uid()` ou `has_role()`.
 *  3. Une policy autorise un accès trop large (`USING (true)` ou
 *     `WITH CHECK (true)`) sur INSERT/UPDATE/DELETE pour le rôle anon/authenticated.
 *
 * Variables d'environnement requises : DATABASE_URL ou PG* standard.
 *
 * Exécution locale : `bun scripts/check-rls.ts`
 */

import { Client } from "pg";

// Tables explicitement publiques en lecture — exclues du contrôle "user_id".
const PUBLIC_READ_TABLES = new Set<string>([
  "service_catalog",
  "job_postings",
  "trainings",
  "departments",
  "sectors",
  "site_settings",
]);

// Tables système/internes (gérées par service_role) — pas d'exigence user_id.
const SERVICE_ROLE_ONLY_TABLES = new Set<string>([
  "email_send_log",
  "email_send_state",
  "email_unsubscribe_tokens",
  "suppressed_emails",
  "sms_otp_codes",
  "contact_email_otps",
  "application_tracking_otp",
  "webhook_events",
  "verify_attempts",
  "seo_snapshots",
  "api_tokens",
  "payment_provider_settings",
  "sharepoint_config",
  "training_groups",
  "training_group_members",
  "training_group_assignments",
  "contact_requests",
]);

type Row = Record<string, unknown>;

function fail(msg: string) {
  console.error(`❌ ${msg}`);
}
function pass(msg: string) {
  console.log(`✅ ${msg}`);
}

async function main() {
  const connectionString =
    process.env.DATABASE_URL ||
    (process.env.PGHOST
      ? `postgres://${process.env.PGUSER}:${process.env.PGPASSWORD}@${process.env.PGHOST}:${process.env.PGPORT ?? 5432}/${process.env.PGDATABASE}`
      : null);

  if (!connectionString) {
    console.warn("⚠️  DATABASE_URL (ou variables PG*) manquante — audit RLS ignoré.");
    console.warn("    Pour activer l'audit, ajoutez le secret GitHub SUPABASE_DB_URL.");
    process.exit(0);
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  let violations = 0;

  // 1) Toutes les tables `public` doivent avoir RLS activée.
  const { rows: tables } = await client.query<Row>(`
    SELECT c.relname AS tablename, c.relrowsecurity AS rls_enabled
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname
  `);

  for (const t of tables) {
    const name = String(t.tablename);
    if (!t.rls_enabled) {
      fail(`RLS désactivée sur public.${name}`);
      violations++;
    }
  }
  pass(`${tables.length} tables analysées pour l'activation RLS.`);

  // 2) Tables sensibles (colonne user_id) doivent avoir des policies scopées.
  const { rows: userIdTables } = await client.query<Row>(`
    SELECT table_name FROM information_schema.columns
    WHERE table_schema='public' AND column_name='user_id'
    GROUP BY table_name
  `);

  const { rows: policies } = await client.query<Row>(`
    SELECT tablename, policyname, cmd, roles, qual, with_check
    FROM pg_policies WHERE schemaname='public'
  `);

  const policiesByTable = new Map<string, Row[]>();
  for (const p of policies) {
    const t = String(p.tablename);
    if (!policiesByTable.has(t)) policiesByTable.set(t, []);
    policiesByTable.get(t)!.push(p);
  }

  for (const t of userIdTables) {
    const name = String(t.table_name);
    if (PUBLIC_READ_TABLES.has(name) || SERVICE_ROLE_ONLY_TABLES.has(name)) continue;
    const ps = policiesByTable.get(name) ?? [];
    if (ps.length === 0) {
      fail(`Table sensible public.${name} (colonne user_id) sans aucune policy.`);
      violations++;
      continue;
    }
    const scoped = ps.some((p) => {
      const q = `${p.qual ?? ""} ${p.with_check ?? ""}`;
      return /auth\.uid\(\)/.test(q) || /has_role\s*\(/.test(q);
    });
    if (!scoped) {
      fail(`Table public.${name} : aucune policy ne référence auth.uid() ou has_role().`);
      violations++;
    }
  }
  pass(`${userIdTables.length} tables avec user_id contrôlées.`);

  // 3) Policies trop permissives sur INSERT/UPDATE/DELETE pour anon/authenticated.
  for (const p of policies) {
    const cmd = String(p.cmd);
    if (cmd === "SELECT") continue;
    const rawRoles = p.roles;
    const roles: string[] = Array.isArray(rawRoles)
      ? (rawRoles as string[])
      : String(rawRoles ?? "")
          .replace(/^[{"]+|[}"]+$/g, "")
          .split(/[,\s]+/)
          .filter(Boolean);
    const reachable = roles.some((r) => r === "anon" || r === "authenticated" || r === "public");
    if (!reachable) continue;

    const qual = String(p.qual ?? "").trim();
    const check = String(p.with_check ?? "").trim();
    const looseQual = cmd !== "INSERT" && (qual === "" || qual === "true");
    const looseCheck = cmd !== "DELETE" && (check === "" || check === "true");

    // Permettre les INSERT publics intentionnels (contact_requests, job_applications)
    const policyName = String(p.policyname);
    const tableName = String(p.tablename);
    const intentionalPublicInsert =
      cmd === "INSERT" &&
      ((tableName === "contact_requests" && policyName === "Anyone can submit contact requests") ||
        (tableName === "job_applications" && policyName === "Anyone can submit applications"));

    if (intentionalPublicInsert) continue;

    if (looseQual || looseCheck) {
      fail(
        `Policy permissive sur public.${tableName} [${cmd}] "${policyName}" (roles=${roles.join(",")}, qual="${qual}", check="${check}").`,
      );
      violations++;
    }
  }
  pass(`${policies.length} policies analysées pour permissivité.`);

  await client.end();

  if (violations > 0) {
    console.error(`\n❌ Audit RLS échoué : ${violations} violation(s).`);
    process.exit(1);
  }
  console.log("\n✅ Audit RLS réussi — isolation stricte vérifiée.");
}

main().catch((err) => {
  console.error("Erreur d'audit:", err);
  process.exit(2);
});
