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

// Replace common diacritics & smart quotes that StandardFonts can't render
function safe(s: string): string {
  if (!s) return "";
  return s
    .normalize("NFC")
    .replace(/[\u2018\u2019\u02BC]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2013|\u2014/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ");
}

function drawWrapped(page: any, text: string, x: number, y: number, opts: { font: any; size: number; maxWidth: number; lineHeight: number; color?: any }) {
  const { font, size, maxWidth, lineHeight, color = rgb(0, 0, 0) } = opts;
  const words = safe(text).split(/\s+/);
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

interface ContractInput {
  candidate_name: string;
  candidate_email: string;
  candidate_address?: string | null;
  candidate_id_number?: string | null;
  candidate_birth?: string | null;
  job_title: string;
  contract_type: string;        // CDI, CDD, Stage, Freelance
  start_date?: string | null;
  end_date?: string | null;
  duration?: string | null;
  trial_period?: string | null; // ex "3 mois"
  salary?: string | null;       // brut mensuel
  salary_currency?: string | null;
  benefits?: string | null;     // primes, transport...
  location?: string | null;
  weekly_hours?: string | null; // ex "40 heures"
  leave_days?: string | null;   // ex "30 jours ouvrables / an"
  notice_period?: string | null;// préavis
  department?: string | null;
  manager_name?: string | null;
  custom_clauses?: string | null;
}

async function buildContractPDF(input: ContractInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Contrat - ${input.candidate_name}`);
  pdf.setAuthor("CloudMature");
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const PAGE_W = 595, PAGE_H = 842, margin = 50, maxWidth = PAGE_W - margin * 2;
  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - 80;
  let pageIndex = 1;

  const drawHeader = (p: any) => {
    p.drawRectangle({ x: 0, y: PAGE_H - 62, width: PAGE_W, height: 62, color: rgb(0, 0.6, 0.8) });
    p.drawText("CloudMature SARL", { x: margin, y: PAGE_H - 32, font: bold, size: 18, color: rgb(1, 1, 1) });
    p.drawText("Contrat de travail - Republique de Guinee", { x: margin, y: PAGE_H - 50, font, size: 10, color: rgb(0.92, 0.97, 1) });
  };
  const drawFooter = (p: any, idx: number) => {
    p.drawLine({ start: { x: margin, y: 40 }, end: { x: PAGE_W - margin, y: 40 }, thickness: 0.4, color: rgb(0.7, 0.7, 0.7) });
    p.drawText(safe("CloudMature SARL - Conakry, Republique de Guinee - contact@cloudmature.com"),
      { x: margin, y: 28, font: italic, size: 8, color: rgb(0.4, 0.4, 0.4) });
    p.drawText(`Page ${idx}`, { x: PAGE_W - margin - 30, y: 28, font, size: 8, color: rgb(0.4, 0.4, 0.4) });
  };

  drawHeader(page);
  drawFooter(page, pageIndex);

  const ensureSpace = (needed = 80) => {
    if (y - needed < 60) {
      page = pdf.addPage([PAGE_W, PAGE_H]);
      pageIndex += 1;
      drawHeader(page);
      drawFooter(page, pageIndex);
      y = PAGE_H - 80;
    }
  };

  // Title
  ensureSpace(60);
  page.drawText(safe(`CONTRAT DE TRAVAIL A DUREE ${input.contract_type === "CDD" ? "DETERMINEE (CDD)" : input.contract_type === "CDI" ? "INDETERMINEE (CDI)" : input.contract_type.toUpperCase()}`),
    { x: margin, y, font: bold, size: 14, color: rgb(0, 0.4, 0.55) });
  y -= 18;
  page.drawText(safe("Conforme a la Loi L/2014/072/CNT du 10 janvier 2014 portant Code du travail de la Republique de Guinee"),
    { x: margin, y, font: italic, size: 9, color: rgb(0.35, 0.35, 0.35) });
  y -= 24;

  // Parties
  page.drawText("ENTRE LES SOUSSIGNES :", { x: margin, y, font: bold, size: 11 });
  y -= 16;
  y = drawWrapped(page,
    "CloudMature SARL, societe de droit guineen, ayant son siege social a Conakry, Republique de Guinee, immatriculee au RCCM, representee par son Representant legal dument habilite, ci-apres designee \"l'Employeur\",",
    margin, y, { font, size: 10, maxWidth, lineHeight: 13 });
  y -= 6;
  page.drawText("D'UNE PART,", { x: margin, y, font: bold, size: 10 }); y -= 16;

  page.drawText("ET :", { x: margin, y, font: bold, size: 11 }); y -= 16;
  const idLine = input.candidate_id_number ? `, titulaire de la piece d'identite n° ${input.candidate_id_number}` : "";
  const birthLine = input.candidate_birth ? `, ne(e) le ${input.candidate_birth}` : "";
  const addrLine = input.candidate_address ? `, demeurant a ${input.candidate_address}` : "";
  y = drawWrapped(page,
    `${input.candidate_name}${birthLine}${idLine}${addrLine}, joignable a l'adresse electronique ${input.candidate_email}, ci-apres designe(e) "le Salarie",`,
    margin, y, { font, size: 10, maxWidth, lineHeight: 13 });
  y -= 6;
  page.drawText("D'AUTRE PART,", { x: margin, y, font: bold, size: 10 }); y -= 14;
  y = drawWrapped(page, "Il a ete convenu et arrete ce qui suit :", margin, y,
    { font: italic, size: 10, maxWidth, lineHeight: 13 });
  y -= 8;

  const article = (title: string, content: string) => {
    ensureSpace(60);
    page.drawText(safe(title), { x: margin, y, font: bold, size: 11, color: rgb(0, 0.4, 0.55) });
    y -= 14;
    y = drawWrapped(page, content, margin, y, { font, size: 10, maxWidth, lineHeight: 13 });
    y -= 10;
  };

  const isCDD = input.contract_type === "CDD";
  const isStage = /stage/i.test(input.contract_type);

  article("Article 1 - Engagement et fonctions",
    `L'Employeur engage le Salarie en qualite de ${input.job_title}${input.department ? `, au sein du departement ${input.department}` : ""}${input.manager_name ? `, sous l'autorite hierarchique de ${input.manager_name}` : ""}. Le Salarie exercera les missions correspondant a sa qualification et toute mission connexe confiee par l'Employeur dans le respect des dispositions du Code du travail guineen.`);

  article("Article 2 - Date d'effet et duree",
    isCDD
      ? `Le present contrat est conclu pour une duree determinee de ${input.duration || "[a definir]"}, prenant effet le ${input.start_date || "[a definir]"} et expirant le ${input.end_date || "[a definir]"}, conformement aux articles 32 et suivants du Code du travail. Il pourra etre renouvele dans les limites legales.`
      : isStage
      ? `Le present contrat de stage prend effet le ${input.start_date || "[a definir]"} pour une duree de ${input.duration || "[a definir]"} et se termine le ${input.end_date || "[a definir]"}.`
      : `Le present contrat est conclu pour une duree indeterminee. Il prend effet a compter du ${input.start_date || "[a definir]"}.`);

  article("Article 3 - Periode d'essai",
    `Le Salarie est soumis a une periode d'essai de ${input.trial_period || (isCDD ? "15 jours" : "3 mois")}, conformement a l'article 14 du Code du travail. Pendant cette periode, chacune des parties pourra rompre le contrat sans indemnite, sous reserve de respecter le delai de prevenance legal.`);

  article("Article 4 - Lieu de travail",
    `Le Salarie exercera ses fonctions principalement a ${input.location || "Conakry, Republique de Guinee"}. Une mobilite geographique raisonnable, justifiee par les besoins de service, pourra etre demandee.`);

  article("Article 5 - Duree et organisation du travail",
    `La duree hebdomadaire de travail est fixee a ${input.weekly_hours || "40 heures"}, repartie selon le planning en vigueur dans l'entreprise, conformement aux articles 221.1 et suivants du Code du travail. Les heures supplementaires eventuelles seront remunerees ou recuperees conformement a la legislation en vigueur.`);

  article("Article 6 - Remuneration",
    `En contrepartie de son travail, le Salarie percevra une remuneration brute mensuelle de ${input.salary || "[a completer]"} ${input.salary_currency || "GNF"}, payable a terme echu, par virement bancaire ou Mobile Money, au plus tard le dernier jour ouvrable du mois. Cette remuneration respecte le Salaire Minimum Interprofessionnel Garanti (SMIG) en vigueur.${input.benefits ? ` Avantages complementaires : ${input.benefits}.` : ""} Les retenues legales (CNSS, impot sur les traitements et salaires) seront operees conformement a la reglementation guineenne.`);

  article("Article 7 - Conges payes",
    `Le Salarie beneficiera de conges payes a raison de ${input.leave_days || "2,5 jours ouvrables par mois de service effectif (soit 30 jours ouvrables par an)"}, conformement aux articles 224.1 et suivants du Code du travail. Les dates seront fixees d'un commun accord en tenant compte des necessites de service.`);

  article("Article 8 - Protection sociale",
    "Le Salarie est affilie a la Caisse Nationale de Securite Sociale (CNSS) selon les conditions prevues par la loi. L'Employeur s'acquitte des cotisations sociales obligatoires (vieillesse, maladie, accidents du travail, prestations familiales).");

  article("Article 9 - Obligations du Salarie",
    "Le Salarie s'engage a executer ses fonctions avec loyaute, diligence et professionnalisme, a respecter le reglement interieur de l'entreprise, les consignes d'hygiene, de sante et de securite, ainsi qu'a preserver les interets et l'image de l'Employeur.");

  article("Article 10 - Confidentialite et propriete intellectuelle",
    "Le Salarie s'engage, pendant l'execution du contrat et apres sa cessation, a respecter une stricte confidentialite sur l'ensemble des informations, donnees clients, savoir-faire, codes sources et documents auxquels il aura acces. Toute creation realisee dans le cadre des fonctions est la propriete exclusive de l'Employeur.");

  article("Article 11 - Non-concurrence et exclusivite",
    "Pendant toute la duree du contrat, le Salarie consacre l'exclusivite de son activite professionnelle a l'Employeur, sauf autorisation ecrite prealable. Toute activite concurrente est strictement interdite.");

  article("Article 12 - Rupture du contrat",
    isCDD
      ? "Le present contrat ne pourra etre rompu avant son terme que dans les cas limitativement prevus par le Code du travail (faute lourde, force majeure, accord des parties, inaptitude). Toute rupture anticipee abusive ouvre droit a indemnisation conformement aux articles 76 et suivants."
      : `Chacune des parties peut mettre fin au present contrat sous reserve de respecter un preavis de ${input.notice_period || "un (1) mois pour les employes et trois (3) mois pour les cadres"}, conformement aux articles 71 et suivants du Code du travail. Le licenciement devra reposer sur un motif legitime et respecter la procedure legale.`);

  article("Article 13 - Reglement interieur",
    "Le Salarie reconnait avoir pris connaissance du reglement interieur de CloudMature et s'engage a en respecter les dispositions, ainsi que toute note de service ulterieure.");

  if (input.custom_clauses && input.custom_clauses.trim()) {
    article("Article 14 - Clauses particulieres", input.custom_clauses);
  }

  article("Article 15 - Droit applicable et juridiction competente",
    "Le present contrat est regi par le droit guineen, en particulier la Loi L/2014/072/CNT portant Code du travail. Tout litige relatif a sa formation, son execution ou sa rupture sera, a defaut de reglement amiable, soumis a la competence exclusive du Tribunal du Travail de Conakry.");

  // Signatures
  ensureSpace(140);
  y -= 10;
  page.drawText(safe(`Fait a Conakry, le ${new Date().toLocaleDateString("fr-FR")}, en deux (2) exemplaires originaux.`),
    { x: margin, y, font, size: 10 });
  y -= 30;
  page.drawText("Pour l'Employeur", { x: margin, y, font: bold, size: 10 });
  page.drawText("Le Salarie", { x: 340, y, font: bold, size: 10 });
  y -= 12;
  page.drawText(safe("(nom, qualite, signature et cachet)"), { x: margin, y, font: italic, size: 8, color: rgb(0.4, 0.4, 0.4) });
  page.drawText(safe("(\"Lu et approuve - Bon pour accord\", signature)"), { x: 340, y, font: italic, size: 8, color: rgb(0.4, 0.4, 0.4) });
  y -= 60;
  page.drawLine({ start: { x: margin, y }, end: { x: margin + 200, y }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) });
  page.drawLine({ start: { x: 340, y }, end: { x: 340 + 200, y }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) });

  return await pdf.save();
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
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

    const input: ContractInput = {
      candidate_name: proc.candidate_name,
      candidate_email: proc.candidate_email,
      candidate_address: body.candidate_address || null,
      candidate_id_number: body.candidate_id_number || null,
      candidate_birth: body.candidate_birth || null,
      job_title: body.job_title || jobTitle,
      contract_type: body.contract_type || contractType,
      start_date: body.start_date || startDate,
      end_date: body.end_date || null,
      duration: body.duration || duration,
      trial_period: body.trial_period || null,
      salary: body.salary || salary,
      salary_currency: body.salary_currency || "GNF",
      benefits: body.benefits || null,
      location: body.location || location,
      weekly_hours: body.weekly_hours || null,
      leave_days: body.leave_days || null,
      notice_period: body.notice_period || null,
      department: body.department || null,
      manager_name: body.manager_name || null,
      custom_clauses: body.custom_clauses || null,
    };

    const pdfBytes = await buildContractPDF(input);
    const fileName = `Contrat-${sanitize(proc.candidate_name)}-${Date.now()}.pdf`;
    const storagePath = `${processId}/${fileName}`;

    const { error: stErr } = await admin.storage.from("onboarding-files").upload(storagePath, pdfBytes, {
      contentType: "application/pdf", upsert: true,
    });
    if (stErr) throw stErr;

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
