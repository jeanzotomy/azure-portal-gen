import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getGraphToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) return cachedToken.value;
  const tenantId = Deno.env.get("AZURE_TENANT_ID")!;
  const clientId = Deno.env.get("AZURE_CLIENT_ID")!;
  const clientSecret = Deno.env.get("AZURE_CLIENT_SECRET")!;
  const params = new URLSearchParams({
    grant_type: "client_credentials", client_id: clientId,
    client_secret: clientSecret, scope: "https://graph.microsoft.com/.default",
  });
  const res = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: params.toString(),
  });
  if (!res.ok) throw new Error(`Azure AD token failed: ${await res.text()}`);
  const data = await res.json();
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.value;
}

const sanitize = (s: string) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/[<>:"/\\|?*]/g, "").replace(/\s+/g, "-").trim().substring(0, 80) || "anon";

async function ensureFolder(token: string, siteId: string, driveId: string, parentPath: string, folderName: string) {
  const createUrl = parentPath
    ? `${GRAPH_BASE}/sites/${siteId}/drives/${driveId}/root:/${parentPath}:/children`
    : `${GRAPH_BASE}/sites/${siteId}/drives/${driveId}/root/children`;
  const createRes = await fetch(createUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: folderName, folder: {}, "@microsoft.graph.conflictBehavior": "fail" }),
  });
  if (createRes.ok) return await createRes.json();
  if (createRes.status === 409) {
    const listRes = await fetch(createUrl, { headers: { Authorization: `Bearer ${token}` } });
    const listData = await listRes.json();
    const existing = (listData.value || []).find((it: any) => it.name === folderName && it.folder);
    if (existing) return existing;
  }
  throw new Error(`Folder ensure failed [${createRes.status}]`);
}

async function uploadToSharePoint(token: string, siteId: string, driveId: string, folderPath: string, fileName: string, bytes: Uint8Array, contentType: string) {
  const url = `${GRAPH_BASE}/sites/${siteId}/drives/${driveId}/root:/${folderPath}/${fileName}:/content`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": contentType },
    body: bytes,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`SP upload failed [${res.status}]: ${JSON.stringify(data)}`);
  return data;
}

function drawWrapped(page: any, text: string, x: number, y: number, opts: { font: any; size: number; maxWidth: number; lineHeight: number; color?: any }) {
  const { font, size, maxWidth, lineHeight, color = rgb(0, 0, 0) } = opts;
  const words = text.split(/\s+/);
  let line = "";
  let cy = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    const width = font.widthOfTextAtSize(test, size);
    if (width > maxWidth && line) {
      page.drawText(line, { x, y: cy, font, size, color });
      cy -= lineHeight;
      line = w;
    } else {
      line = test;
    }
  }
  if (line) { page.drawText(line, { x, y: cy, font, size, color }); cy -= lineHeight; }
  return cy;
}

async function buildContractPDF(input: {
  candidate_name: string; candidate_email: string; job_title: string;
  contract_type: string; start_date?: string | null; salary?: string | null;
  location?: string | null; duration?: string | null;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Contrat - ${input.candidate_name}`);
  pdf.setAuthor("CloudMature");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]); // A4
  const margin = 50;
  let y = 800;

  // Header
  page.drawRectangle({ x: 0, y: 780, width: 595, height: 62, color: rgb(0, 0.6, 0.8) });
  page.drawText("CloudMature", { x: margin, y: 810, font: bold, size: 22, color: rgb(1, 1, 1) });
  page.drawText("Contrat de travail", { x: margin, y: 790, font, size: 12, color: rgb(0.9, 0.95, 1) });

  y = 750;
  page.drawText("CONTRAT DE TRAVAIL", { x: margin, y, font: bold, size: 16 });
  y -= 12;
  page.drawText(`Type : ${input.contract_type}`, { x: margin, y: y - 10, font, size: 11, color: rgb(0.3, 0.3, 0.3) });
  y -= 35;

  page.drawText("ENTRE LES SOUSSIGNÉS :", { x: margin, y, font: bold, size: 11 });
  y -= 18;
  y = drawWrapped(page,
    "CloudMature SARL, dont le siège social est situé à Conakry, Guinée, représentée par son représentant légal, ci-après désignée \"l'Employeur\".",
    margin, y, { font, size: 10, maxWidth: 495, lineHeight: 14 });
  y -= 8;
  page.drawText("ET :", { x: margin, y, font: bold, size: 11 });
  y -= 16;
  y = drawWrapped(page,
    `${input.candidate_name}, joignable à ${input.candidate_email}, ci-après désigné(e) "le Salarié".`,
    margin, y, { font, size: 10, maxWidth: 495, lineHeight: 14 });
  y -= 16;

  const article = (title: string, content: string) => {
    if (y < 150) { page = pdf.addPage([595, 842]); y = 800; }
    page.drawText(title, { x: margin, y, font: bold, size: 11, color: rgb(0, 0.4, 0.55) });
    y -= 14;
    y = drawWrapped(page, content, margin, y, { font, size: 10, maxWidth: 495, lineHeight: 13 });
    y -= 10;
  };

  article("Article 1 — Engagement",
    `Le Salarié est engagé par l'Employeur en qualité de ${input.job_title}, sous contrat ${input.contract_type}.`);
  article("Article 2 — Date de prise de fonction",
    `Le présent contrat prend effet à compter du ${input.start_date || "[à définir]"}.`);
  if (input.duration) {
    article("Article 3 — Durée", `Durée du contrat : ${input.duration}.`);
  }
  article("Article 4 — Lieu de travail",
    `Le Salarié exercera ses fonctions à ${input.location || "Conakry, Guinée"}, sous réserve de mobilité raisonnable.`);
  article("Article 5 — Rémunération",
    `La rémunération brute mensuelle est fixée à ${input.salary || "[à compléter]"}, payable à terme échu.`);
  article("Article 6 — Période d'essai",
    "Le présent contrat est soumis à une période d'essai conforme aux dispositions légales applicables, renouvelable une fois.");
  article("Article 7 — Confidentialité",
    "Le Salarié s'engage à respecter la plus stricte confidentialité concernant l'ensemble des informations, données et documents auxquels il aura accès dans le cadre de ses fonctions.");
  article("Article 8 — Dispositions générales",
    "Tout différend relatif au présent contrat sera, à défaut de règlement amiable, soumis aux juridictions compétentes de Conakry.");

  if (y < 150) { page = pdf.addPage([595, 842]); y = 800; }
  y -= 30;
  page.drawText(`Fait à Conakry, le ${new Date().toLocaleDateString("fr-FR")}`, { x: margin, y, font, size: 10 });
  y -= 50;
  page.drawText("Pour l'Employeur :", { x: margin, y, font: bold, size: 10 });
  page.drawText("Le Salarié (signature) :", { x: 320, y, font: bold, size: 10 });
  y -= 8;
  page.drawLine({ start: { x: margin, y: y - 50 }, end: { x: margin + 180, y: y - 50 }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) });
  page.drawLine({ start: { x: 320, y: y - 50 }, end: { x: 320 + 180, y: y - 50 }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) });

  return await pdf.save();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    // Auth
    const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    if (!jwt) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: userData, error: uErr } = await admin.auth.getUser(jwt);
    if (uErr || !userData.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: roleRows } = await admin.from("user_roles").select("role").eq("user_id", userData.user.id);
    const roles = (roleRows || []).map((r) => r.role);
    if (!roles.includes("admin") && !roles.includes("gestionnaire") && !roles.includes("hr")) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const processId = body.process_id as string;
    if (!processId) throw new Error("process_id required");

    const { data: proc, error: procErr } = await admin.from("onboarding_processes").select("*").eq("id", processId).maybeSingle();
    if (procErr || !proc) throw new Error("Process not found");

    let jobTitle = "Collaborateur";
    let contractType = "CDI";
    let startDate: string | null = null;
    let salary: string | null = null;
    let location: string | null = null;
    let duration: string | null = null;
    if (proc.job_id) {
      const { data: job } = await admin.from("job_postings").select("title, contract_type, start_date, salary_range, location, contract_duration").eq("id", proc.job_id).maybeSingle();
      if (job) {
        jobTitle = job.title || jobTitle;
        contractType = job.contract_type || contractType;
        startDate = job.start_date || null;
        salary = job.salary_range || null;
        location = job.location || null;
        duration = job.contract_duration || null;
      }
    }

    // Allow overrides from body
    jobTitle = body.job_title || jobTitle;
    contractType = body.contract_type || contractType;
    startDate = body.start_date || startDate;
    salary = body.salary || salary;
    location = body.location || location;
    duration = body.duration || duration;

    const pdfBytes = await buildContractPDF({
      candidate_name: proc.candidate_name,
      candidate_email: proc.candidate_email,
      job_title: jobTitle, contract_type: contractType,
      start_date: startDate, salary, location, duration,
    });

    const fileName = `Contrat-${sanitize(proc.candidate_name)}-${Date.now()}.pdf`;
    const storagePath = `${processId}/${fileName}`;

    // Upload to Supabase storage
    const { error: stErr } = await admin.storage.from("onboarding-files").upload(storagePath, pdfBytes, {
      contentType: "application/pdf", upsert: true,
    });
    if (stErr) throw stErr;

    // Push to SharePoint candidate folder (best-effort)
    let spUrl: string | null = null;
    try {
      const { data: cfg } = await admin.from("sharepoint_config").select("site_id, drive_id").order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (cfg?.site_id && cfg?.drive_id && proc.job_id) {
        const token = await getGraphToken();
        const parts = (proc.candidate_name || "").trim().split(/\s+/);
        const firstName = sanitize(parts[0] || "");
        const lastName = sanitize(parts.slice(1).join(" ") || parts[0] || "");
        const folderName = `${firstName}-${lastName}-${String(proc.job_id).substring(0, 8)}`;
        await ensureFolder(token, cfg.site_id, cfg.drive_id, "", "Candidatures");
        await ensureFolder(token, cfg.site_id, cfg.drive_id, "Candidatures", folderName);
        const uploaded = await uploadToSharePoint(token, cfg.site_id, cfg.drive_id, `Candidatures/${folderName}`, fileName, pdfBytes, "application/pdf");
        spUrl = uploaded.webUrl || null;
      }
    } catch (e) {
      console.error("SharePoint sync failed:", e);
    }

    // Insert contract row
    const { data: contract, error: cErr } = await admin.from("onboarding_contracts").insert({
      process_id: processId,
      contract_file_name: fileName,
      contract_file_path: storagePath,
      uploaded_by: userData.user.id,
      notes: spUrl ? `SharePoint: ${spUrl}` : null,
    }).select().single();
    if (cErr) throw cErr;

    return new Response(JSON.stringify({ success: true, contract, sharepoint_url: spUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("generate-contract error:", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
