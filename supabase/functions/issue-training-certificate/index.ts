// Issue a training certificate PDF with QR verification code
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import QRCode from "https://esm.sh/qrcode@1.5.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function randomCode(): string {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 12; i++) out += a[Math.floor(Math.random() * a.length)];
  return `${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8, 12)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") || "";

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

    const { assigned_id } = await req.json();
    if (!assigned_id) return new Response(JSON.stringify({ error: "assigned_id required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

    // Validate the assignment belongs to this user & is completed/passed
    const { data: assigned, error: aerr } = await admin
      .from("onboarding_assigned_trainings")
      .select("id, training_id, completed_at, quiz_passed, quiz_score, process_id, training:trainings(title)")
      .eq("id", assigned_id)
      .maybeSingle();
    if (aerr || !assigned) throw new Error("Assignment not found");

    const { data: proc } = await admin
      .from("onboarding_processes")
      .select("user_id, candidate_name")
      .eq("id", assigned.process_id)
      .maybeSingle();
    if (!proc || proc.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (!assigned.completed_at) {
      return new Response(JSON.stringify({ error: "Training not completed" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    // Existing certificate?
    const { data: existing } = await admin
      .from("training_certificates")
      .select("*")
      .eq("user_id", user.id)
      .eq("training_id", assigned.training_id)
      .maybeSingle();

    if (existing?.pdf_path) {
      const { data: signed } = await admin.storage.from("certificates").createSignedUrl(existing.pdf_path, 60 * 60);
      return new Response(JSON.stringify({ certificate: existing, url: signed?.signedUrl }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    const { data: profile } = await admin.from("profiles").select("full_name").eq("user_id", user.id).maybeSingle();
    const candidateName = profile?.full_name || proc.candidate_name || "Apprenant";
    const trainingTitle = (assigned.training as any)?.title || "Formation";
    const score = assigned.quiz_score ?? null;

    const code = existing?.verification_code || randomCode();
    const origin = new URL(req.url).origin.replace(".supabase.co", ".lovable.app");
    // Better: use the app's public URL via env; fallback to request origin
    const APP_URL = Deno.env.get("APP_PUBLIC_URL") || "https://cloudmature.com";
    const verifyUrl = `${APP_URL}/verify/${code}`;

    // Build QR
    const qrPngDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 320 });
    const qrPngBytes = Uint8Array.from(atob(qrPngDataUrl.split(",")[1]), (c) => c.charCodeAt(0));

    // Build PDF (A4 landscape)
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([841.89, 595.28]);
    const { width, height } = page.getSize();
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontItalic = await pdf.embedFont(StandardFonts.HelveticaOblique);

    // Palette
    const navy = rgb(0, 0.235, 0.4);
    const cyan = rgb(0, 0.6, 0.8);
    const ink = rgb(0.1, 0.12, 0.18);
    const muted = rgb(0.4, 0.45, 0.55);
    const seal = rgb(0.78, 0.12, 0.16);
    const sealDark = rgb(0.6, 0.08, 0.12);
    const paper = rgb(0.995, 0.997, 1);

    // Background + double border
    page.drawRectangle({ x: 0, y: 0, width, height, color: paper });
    page.drawRectangle({ x: 20, y: 20, width: width - 40, height: height - 40, borderColor: navy, borderWidth: 2 });
    page.drawRectangle({ x: 28, y: 28, width: width - 56, height: height - 56, borderColor: cyan, borderWidth: 0.6 });

    // Decorative corner accents
    const corner = (cx: number, cy: number, dx: number, dy: number) => {
      page.drawLine({ start: { x: cx, y: cy }, end: { x: cx + dx * 22, y: cy }, thickness: 1.4, color: navy });
      page.drawLine({ start: { x: cx, y: cy }, end: { x: cx, y: cy + dy * 22 }, thickness: 1.4, color: navy });
    };
    corner(40, height - 40, 1, -1);
    corner(width - 40, height - 40, -1, -1);
    corner(40, 40, 1, 1);
    corner(width - 40, 40, -1, 1);

    // Top band
    page.drawRectangle({ x: 28, y: height - 110, width: width - 56, height: 60, color: navy });
    page.drawRectangle({ x: 28, y: height - 114, width: width - 56, height: 2, color: cyan });
    page.drawText("CLOUDMATURE", { x: 60, y: height - 78, size: 22, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText("Certificat de réussite", { x: 60, y: height - 100, size: 11, font, color: rgb(0.85, 0.92, 1) });

    // Title
    const title = "CERTIFICAT D'ACCOMPLISSEMENT";
    const titleSize = 28;
    const titleWidth = fontBold.widthOfTextAtSize(title, titleSize);
    page.drawText(title, { x: (width - titleWidth) / 2, y: height - 175, size: titleSize, font: fontBold, color: ink });

    // Title flourish underlines
    const flourishY = height - 188;
    page.drawLine({ start: { x: width / 2 - 140, y: flourishY }, end: { x: width / 2 - 30, y: flourishY }, thickness: 0.6, color: cyan });
    page.drawLine({ start: { x: width / 2 + 30, y: flourishY }, end: { x: width / 2 + 140, y: flourishY }, thickness: 0.6, color: cyan });
    page.drawCircle({ x: width / 2, y: flourishY, size: 2, color: cyan });

    // Subtitle
    const sub = "Ce certificat est décerné à";
    const subWidth = fontItalic.widthOfTextAtSize(sub, 13);
    page.drawText(sub, { x: (width - subWidth) / 2, y: height - 220, size: 13, font: fontItalic, color: muted });

    // Recipient name
    const nameSize = 30;
    const nameWidth = fontBold.widthOfTextAtSize(candidateName, nameSize);
    page.drawText(candidateName, { x: (width - nameWidth) / 2, y: height - 265, size: nameSize, font: fontBold, color: navy });
    page.drawLine({
      start: { x: (width - Math.max(nameWidth, 280)) / 2 - 10, y: height - 275 },
      end: { x: (width + Math.max(nameWidth, 280)) / 2 + 10, y: height - 275 },
      thickness: 1, color: cyan,
    });

    // Body
    const body1 = "pour avoir suivi et validé avec succès la formation";
    const body1Width = font.widthOfTextAtSize(body1, 13);
    page.drawText(body1, { x: (width - body1Width) / 2, y: height - 310, size: 13, font, color: ink });

    const tSize = 20;
    const tWidth = fontBold.widthOfTextAtSize(trainingTitle, tSize);
    page.drawText(trainingTitle, { x: (width - tWidth) / 2, y: height - 345, size: tSize, font: fontBold, color: ink });

    // Footer: date (left) — seal (center) — QR (right)
    const issued = new Date();
    const issuedStr = issued.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
    page.drawText(`Délivré le ${issuedStr}`, { x: 60, y: 90, size: 11, font, color: ink });
    page.drawText("Signature autorisée", { x: 60, y: 70, size: 10, font: fontItalic, color: muted });
    page.drawLine({ start: { x: 60, y: 60 }, end: { x: 220, y: 60 }, thickness: 0.6, color: ink });
    page.drawText("Directeur Formation – CloudMature", { x: 60, y: 48, size: 9, font, color: muted });

    // "CERTIFIED" seal stamp — drawn vectorially in PDF
    const sx = width / 2;
    const sy = 95;
    // Outer scalloped ring (24 small circles around)
    const scallops = 24;
    const rOuter = 52;
    for (let i = 0; i < scallops; i++) {
      const a = (i / scallops) * Math.PI * 2;
      page.drawCircle({ x: sx + Math.cos(a) * rOuter, y: sy + Math.sin(a) * rOuter, size: 3.2, color: seal });
    }
    page.drawCircle({ x: sx, y: sy, size: 48, color: seal });
    page.drawCircle({ x: sx, y: sy, size: 44, color: paper });
    // Dashed inner ring
    page.drawCircle({ x: sx, y: sy, size: 42, borderColor: seal, borderWidth: 0.8, color: undefined as any });
    page.drawCircle({ x: sx, y: sy, size: 38, borderColor: seal, borderWidth: 0.4, color: undefined as any });
    // Small star dots ring
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      page.drawCircle({ x: sx + Math.cos(a) * 33, y: sy + Math.sin(a) * 33, size: 0.9, color: seal });
    }
    // Central banner ribbon
    page.drawRectangle({ x: sx - 60, y: sy - 10, width: 120, height: 22, color: seal });
    // Ribbon tails (triangular notches via small dark rectangles)
    page.drawRectangle({ x: sx - 66, y: sy - 7, width: 8, height: 16, color: sealDark });
    page.drawRectangle({ x: sx + 58, y: sy - 7, width: 8, height: 16, color: sealDark });
    const certifiedText = "CERTIFIED";
    const cSize = 13;
    const cW = fontBold.widthOfTextAtSize(certifiedText, cSize);
    page.drawText(certifiedText, { x: sx - cW / 2, y: sy - 4, size: cSize, font: fontBold, color: rgb(1, 1, 1) });

    // QR block (right side) — kept fully inside inner cyan border (x: 28..width-28)
    const qrImg = await pdf.embedPng(qrPngBytes);
    const qrSize = 92;
    const qrRightMargin = 60;
    const qrX = width - qrRightMargin - qrSize;
    const qrY = 60;
    page.drawImage(qrImg, { x: qrX, y: qrY, width: qrSize, height: qrSize });
    // Label
    const label = "Vérifier l'authenticité";
    const labelW = fontBold.widthOfTextAtSize(label, 9);
    page.drawText(label, { x: qrX + (qrSize - labelW) / 2, y: qrY + qrSize + 6, size: 9, font: fontBold, color: ink });
    // Code under QR, centered
    const codeText = `Code : ${code}`;
    const codeW = fontBold.widthOfTextAtSize(codeText, 9);
    page.drawText(codeText, { x: qrX + (qrSize - codeW) / 2, y: qrY - 12, size: 9, font: fontBold, color: navy });

    const pdfBytes = await pdf.save();
    const path = `${user.id}/${code}.pdf`;
    const { error: upErr } = await admin.storage.from("certificates").upload(path, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (upErr) throw upErr;

    const { data: cert, error: insErr } = await admin
      .from("training_certificates")
      .upsert({
        user_id: user.id,
        training_id: assigned.training_id,
        assigned_id: assigned.id,
        verification_code: code,
        candidate_name: candidateName,
        training_title: trainingTitle,
        score,
        pdf_path: path,
      }, { onConflict: "user_id,training_id" })
      .select()
      .single();
    if (insErr) throw insErr;

    const { data: signed } = await admin.storage.from("certificates").createSignedUrl(path, 60 * 60);

    return new Response(JSON.stringify({ certificate: cert, url: signed?.signedUrl }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("issue-training-certificate error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
