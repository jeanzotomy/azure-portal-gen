import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSession } from "@/hooks/use-auth-session";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, FileText, FileType2, RefreshCw } from "lucide-react";
import { InvoicePDFTemplate, type InvoicePDFData } from "@/components/InvoicePDFTemplate";
import { generateInvoicePDFBlob, generateInvoiceDocxBlob, sanitizeName } from "@/lib/invoice-generator";
import { saveAs } from "file-saver";
import { useExchangeRates, type Currency } from "@/hooks/use-exchange-rates";

interface SClient { id: string; client_name: string; nif: string | null; rccm: string | null; address_line: string | null; city: string | null; country: string | null; phone: string | null; email: string | null; contact_person: string | null; }
interface CatItem { id: string; name: string; description: string | null; default_unit_price: number; default_currency: Currency; default_unit: string; active: boolean; }
interface LineItem { catalog_id?: string | null; description: string; subtitle?: string; quantity: number; unit: string; unit_price: number; discount_rate?: number; }

const lineTotal = (it: LineItem) => {
  const gross = (it.quantity || 0) * (it.unit_price || 0);
  return gross * (1 - (it.discount_rate || 0) / 100);
};

const UNIT_OPTIONS = ["unité", "heure", "jour", "mois", "année", "forfait"] as const;
const DEFAULT_PAYMENT = { bank: "", iban: "", swift: "", mobile_money: "+224 626 441 150", reference: "" };

export default function ServiceInvoiceForm({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void; }) {
  const { user } = useAuthSession();
  const { toast } = useToast();
  const { rates, loading: ratesLoading, refresh: refreshRates, convert } = useExchangeRates();
  const [clients, setClients] = useState<SClient[]>([]);
  const [catalog, setCatalog] = useState<CatItem[]>([]);
  const [clientId, setClientId] = useState<string>("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [currency, setCurrency] = useState<Currency>("GNF");
  const [payment, setPayment] = useState({ ...DEFAULT_PAYMENT });
  const [items, setItems] = useState<LineItem[]>([{ description: "", quantity: 1, unit: "unité", unit_price: 0, discount_rate: 0 }]);
  const [discountRate, setDiscountRate] = useState(0);
  const [earlyPaymentDiscountRate, setEarlyPaymentDiscountRate] = useState(0);
  const [taxRate, setTaxRate] = useState(18);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const [{ data: cls }, { data: cat }] = await Promise.all([
        supabase.from("service_clients").select("*").order("client_name"),
        supabase.from("service_catalog").select("*").eq("active", true).order("name"),
      ]);
      setClients(cls ?? []);
      setCatalog(cat ?? []);
    })();
  }, [open]);

  const subtotal = items.reduce((s, i) => s + lineTotal(i), 0);
  const discountAmount = subtotal * (discountRate / 100);
  const taxBase = subtotal - discountAmount;
  const taxAmount = taxBase * (taxRate / 100);
  const totalBeforeEarly = taxBase + taxAmount;
  const earlyPaymentDiscountAmount = totalBeforeEarly * (earlyPaymentDiscountRate / 100);
  const total = totalBeforeEarly - earlyPaymentDiscountAmount;

  const selectedClient = clients.find((c) => c.id === clientId);

  const updateItem = (idx: number, patch: Partial<LineItem>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const pickFromCatalog = (idx: number, catId: string) => {
    const c = catalog.find((x) => x.id === catId);
    if (!c) return;
    // Convertit le prix par défaut depuis la devise du catalogue vers la devise courante de la facture
    const converted = convert(c.default_unit_price, c.default_currency, currency);
    updateItem(idx, {
      catalog_id: c.id,
      description: c.name,
      subtitle: c.description ?? "",
      unit: c.default_unit ?? "unité",
      unit_price: Math.round(converted),
    });
  };

  const addLine = () => setItems((p) => [...p, { description: "", quantity: 1, unit: "unité", unit_price: 0, discount_rate: 0 }]);
  const removeLine = (idx: number) => setItems((p) => p.filter((_, i) => i !== idx));

  // Conversion automatique des prix unitaires quand la devise change
  const prevCurrencyRef = useRef<Currency>(currency);
  useEffect(() => {
    const prev = prevCurrencyRef.current;
    if (prev !== currency) {
      setItems((prevItems) =>
        prevItems.map((it) => ({
          ...it,
          unit_price: Math.round(convert(it.unit_price, prev, currency)),
        }))
      );
      prevCurrencyRef.current = currency;
    }
  }, [currency, convert]);

  const buildPdfData = (invoiceNumber: string): InvoicePDFData => ({
    invoice_number: invoiceNumber,
    invoice_date: invoiceDate,
    due_date: dueDate || null,
    currency,
    client: {
      client_name: selectedClient?.client_name ?? "",
      contact_person: selectedClient?.contact_person ?? null,
      nif: selectedClient?.nif ?? null,
      rccm: selectedClient?.rccm ?? null,
      address_line: selectedClient?.address_line ?? null,
      city: selectedClient?.city ?? null,
      country: selectedClient?.country ?? null,
      phone: selectedClient?.phone ?? null,
      email: selectedClient?.email ?? null,
    },
    payment_details: payment,
    items: items.map((it, i) => ({ position: i + 1, description: it.description, subtitle: it.subtitle ?? null, quantity: it.quantity, unit: it.unit, unit_price: it.unit_price, discount_rate: it.discount_rate ?? 0, total: lineTotal(it) })),
    subtotal, discount_rate: discountRate, discount_amount: discountAmount, tax_rate: taxRate, tax_amount: taxAmount,
    early_payment_discount_rate: earlyPaymentDiscountRate, early_payment_discount_amount: earlyPaymentDiscountAmount,
    total, notes: notes || null,
  });

  const uploadToSharePoint = async (clientName: string, fileName: string, blob: Blob, contentType: string) => {
    try {
      const { data: cfg } = await supabase.from("sharepoint_config").select("site_id, drive_id").limit(1).maybeSingle();
      if (!cfg?.site_id) return null;
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;
      const folder = `Factures Clients/${sanitizeName(clientName)}`;
      const filePath = `${folder}/${fileName}`;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sharepoint-proxy?action=upload-file&siteId=${cfg.site_id}${cfg.drive_id ? `&driveId=${cfg.drive_id}` : ""}&filePath=${encodeURIComponent(filePath)}`;
      const res = await fetch(url, { method: "PUT", headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": contentType }, body: blob });
      if (!res.ok) return null;
      const d = await res.json();
      return { id: d.id as string, webUrl: d.webUrl as string };
    } catch { return null; }
  };

  const handleSave = async (status: "brouillon" | "emise") => {
    if (!user || !selectedClient) {
      toast({ title: "Client requis", variant: "destructive" });
      return;
    }
    if (!items.length || items.some((i) => !i.description.trim())) {
      toast({ title: "Lignes invalides", description: "Toutes les lignes doivent avoir une description.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { data: inv, error } = await supabase.from("service_invoices").insert({
        client_id: clientId, invoice_date: invoiceDate, due_date: dueDate || null, currency,
        payment_details: payment as never, subtotal, discount_rate: discountRate, discount_amount: discountAmount,
        tax_rate: taxRate, tax_amount: taxAmount,
        early_payment_discount_rate: earlyPaymentDiscountRate, early_payment_discount_amount: earlyPaymentDiscountAmount,
        total, notes: notes || null, status, created_by: user.id,
      }).select().single();
      if (error || !inv) throw new Error(error?.message ?? "Insert failed");

      const itemsPayload = items.map((it, i) => ({ invoice_id: inv.id, position: i + 1, catalog_id: it.catalog_id ?? null, description: it.description, subtitle: it.subtitle ?? null, quantity: it.quantity, unit: it.unit, unit_price: it.unit_price, discount_rate: it.discount_rate ?? 0, total: lineTotal(it) }));
      await supabase.from("service_invoice_items").insert(itemsPayload);

      // Generate PDF + DOCX
      await new Promise((r) => setTimeout(r, 100));
      const pdfBlob = pdfRef.current ? await generateInvoicePDFBlob(pdfRef.current) : null;
      const docxBlob = await generateInvoiceDocxBlob(buildPdfData(inv.invoice_number ?? ""));
      const safeNum = sanitizeName(inv.invoice_number ?? "facture");
      const safeClient = sanitizeName(selectedClient.client_name);

      // Upload to SharePoint
      const updates: import("@/integrations/supabase/types").TablesUpdate<"service_invoices"> = {};
      if (pdfBlob) {
        const up = await uploadToSharePoint(selectedClient.client_name, `${safeNum}_${safeClient}.pdf`, pdfBlob, "application/pdf");
        if (up) { updates.sharepoint_pdf_id = up.id; updates.sharepoint_url = up.webUrl; updates.pdf_generated_at = new Date().toISOString(); }
      }
      const up2 = await uploadToSharePoint(selectedClient.client_name, `${safeNum}_${safeClient}.docx`, docxBlob, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      if (up2) { updates.sharepoint_docx_id = up2.id; updates.docx_generated_at = new Date().toISOString(); if (!updates.sharepoint_url) updates.sharepoint_url = up2.webUrl; }

      if (Object.keys(updates).length) await supabase.from("service_invoices").update(updates).eq("id", inv.id);

      // Local download
      if (pdfBlob) saveAs(pdfBlob, `${safeNum}_${safeClient}.pdf`);
      saveAs(docxBlob, `${safeNum}_${safeClient}.docx`);

      toast({ title: "Facture créée", description: `${inv.invoice_number} • ${updates.sharepoint_url ? "Stockée dans SharePoint" : "Téléchargée localement"}` });
      onSaved();
      onOpenChange(false);
      // Reset
      setClientId(""); setDueDate(""); setItems([{ description: "", quantity: 1, unit: "unité", unit_price: 0, discount_rate: 0 }]); setNotes(""); setDiscountRate(0); setEarlyPaymentDiscountRate(0); setPayment({ ...DEFAULT_PAYMENT });
    } catch (e) {
      toast({ title: "Erreur", description: e instanceof Error ? e.message : "Erreur inconnue", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvelle facture</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 md:col-span-6">
            <label className="text-xs font-medium">Client *</label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un client..." /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.client_name}</SelectItem>)}
              </SelectContent>
            </Select>
            {selectedClient && (
              <Card className="mt-2"><CardContent className="p-3 text-xs space-y-0.5">
                {selectedClient.nif && <div>NIF : {selectedClient.nif}</div>}
                {selectedClient.rccm && <div>RCCM : {selectedClient.rccm}</div>}
                {selectedClient.email && <div>{selectedClient.email}</div>}
                {selectedClient.phone && <div>{selectedClient.phone}</div>}
              </CardContent></Card>
            )}
          </div>
          <div className="col-span-6 md:col-span-2">
            <label className="text-xs font-medium">Date</label>
            <Input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} />
          </div>
          <div className="col-span-6 md:col-span-2">
            <label className="text-xs font-medium">Échéance</label>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <div className="col-span-12 md:col-span-2">
            <label className="text-xs font-medium">Devise</label>
            <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="GNF">GNF</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Bandeau taux de change */}
        <div className="flex items-center justify-between gap-2 text-xs bg-muted/40 border rounded-md px-3 py-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold">Taux de change (live) :</span>
            {rates?.rates ? (
              <>
                <span>1 USD ≈ {new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(rates.rates.GNF ?? 0)} GNF</span>
                <span>1 EUR ≈ {new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(((rates.rates.GNF ?? 0) / (rates.rates.EUR ?? 1)))} GNF</span>
                <span className="text-muted-foreground">· Conversion auto à chaque changement de devise</span>
              </>
            ) : (
              <span className="text-muted-foreground">{ratesLoading ? "Chargement..." : "Taux indisponibles (mode secours)"}</span>
            )}
          </div>
          <Button size="sm" variant="ghost" onClick={() => void refreshRates(true)} disabled={ratesLoading}>
            <RefreshCw size={12} className={ratesLoading ? "animate-spin" : ""} />
          </Button>
        </div>

        <div className="border rounded-md p-3 space-y-2">
          <div className="text-xs font-semibold">Détails de paiement</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <Input placeholder="Banque" value={payment.bank} onChange={(e) => setPayment({ ...payment, bank: e.target.value })} />
            <Input placeholder="IBAN / Compte" value={payment.iban} onChange={(e) => setPayment({ ...payment, iban: e.target.value })} />
            <Input placeholder="SWIFT" value={payment.swift} onChange={(e) => setPayment({ ...payment, swift: e.target.value })} />
            <Input placeholder="Mobile Money" value={payment.mobile_money} onChange={(e) => setPayment({ ...payment, mobile_money: e.target.value })} />
            <Input placeholder="Référence" value={payment.reference} onChange={(e) => setPayment({ ...payment, reference: e.target.value })} />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Lignes de facture</div>
            <Button size="sm" variant="outline" onClick={addLine}><Plus size={14} className="mr-1" /> Ajouter</Button>
          </div>
          {items.map((it, idx) => (
            <Card key={idx}><CardContent className="p-3 space-y-2">
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-12 md:col-span-4">
                  <Select value={it.catalog_id ?? ""} onValueChange={(v) => pickFromCatalog(idx, v)}>
                    <SelectTrigger><SelectValue placeholder="Choisir du catalogue (optionnel)" /></SelectTrigger>
                    <SelectContent>
                      {catalog.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-12 md:col-span-8">
                  <Input placeholder="Description *" value={it.description} onChange={(e) => updateItem(idx, { description: e.target.value })} />
                </div>
                <div className="col-span-12">
                  <Input placeholder="Sous-titre / précisions (italique)" value={it.subtitle ?? ""} onChange={(e) => updateItem(idx, { subtitle: e.target.value })} />
                </div>
                <div className="col-span-3 md:col-span-1">
                  <Input type="number" min={0} placeholder="Qté" value={it.quantity} onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })} />
                </div>
                <div className="col-span-4 md:col-span-2">
                  <Select value={it.unit} onValueChange={(v) => updateItem(idx, { unit: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {UNIT_OPTIONS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-5 md:col-span-3">
                  <Input type="number" min={0} placeholder="Prix unitaire" value={it.unit_price} onChange={(e) => updateItem(idx, { unit_price: Number(e.target.value) })} />
                </div>
                <div className="col-span-6 md:col-span-2">
                  <div className="relative">
                    <Input type="number" min={0} max={100} placeholder="Remise" value={it.discount_rate ?? 0} onChange={(e) => updateItem(idx, { discount_rate: Number(e.target.value) })} />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground pointer-events-none">%</span>
                  </div>
                </div>
                <div className="col-span-12 md:col-span-3 flex items-center justify-end text-sm font-semibold">
                  Total : {new Intl.NumberFormat("fr-FR").format(lineTotal(it))} {currency}
                </div>
                <div className="col-span-12 md:col-span-1 flex items-center justify-end">
                  <Button size="icon" variant="ghost" onClick={() => removeLine(idx)} disabled={items.length === 1}><Trash2 size={14} className="text-destructive" /></Button>
                </div>
              </div>
            </CardContent></Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium">Notes & conditions</label>
            <Textarea rows={5} placeholder="Laisser vide pour utiliser le texte par défaut" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="space-y-2 bg-muted/30 p-3 rounded-md">
            <div className="grid grid-cols-2 gap-2 items-center">
              <label className="text-xs">Remise globale (%)</label>
              <Input type="number" min={0} max={100} value={discountRate} onChange={(e) => setDiscountRate(Number(e.target.value))} />
              <label className="text-xs">TVA (%)</label>
              <Input type="number" min={0} max={100} value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} />
              <label className="text-xs" title="Réduction accordée pour paiement anticipé, déduite après TVA">
                Escompte paiement (%)
              </label>
              <Input type="number" min={0} max={100} value={earlyPaymentDiscountRate} onChange={(e) => setEarlyPaymentDiscountRate(Number(e.target.value))} />
            </div>
            <div className="border-t pt-2 text-sm space-y-1">
              <div className="flex justify-between"><span>Sous-total</span><span>{new Intl.NumberFormat("fr-FR").format(subtotal)} {currency}</span></div>
              {discountRate > 0 && (
                <div className="flex justify-between text-destructive"><span>Remise globale ({discountRate}%)</span><span>— {new Intl.NumberFormat("fr-FR").format(discountAmount)} {currency}</span></div>
              )}
              <div className="flex justify-between"><span>TVA ({taxRate}%)</span><span>{new Intl.NumberFormat("fr-FR").format(taxAmount)} {currency}</span></div>
              {earlyPaymentDiscountRate > 0 && (
                <div className="flex justify-between text-destructive"><span>Escompte ({earlyPaymentDiscountRate}%)</span><span>— {new Intl.NumberFormat("fr-FR").format(earlyPaymentDiscountAmount)} {currency}</span></div>
              )}
              <div className="flex justify-between font-bold text-base border-t pt-1"><span>NET À PAYER</span><span>{new Intl.NumberFormat("fr-FR").format(total)} {currency}</span></div>
            </div>
          </div>
        </div>

        {/* Hidden PDF template for capture */}
        <div style={{ position: "fixed", left: "-10000px", top: 0 }}>
          {selectedClient && <InvoicePDFTemplate ref={pdfRef} data={buildPdfData("APERÇU")} />}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button variant="secondary" onClick={() => void handleSave("brouillon")} disabled={saving}>
            <FileType2 size={14} className="mr-1" /> Enregistrer brouillon
          </Button>
          <Button onClick={() => void handleSave("emise")} disabled={saving}>
            <FileText size={14} className="mr-1" /> {saving ? "Génération..." : "Émettre & Générer PDF + Word"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
