import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, DollarSign, AlertCircle, CheckCircle2, Clock, Loader2, Trash2, Search, Receipt, Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";

type InvoiceStep = "idle" | "analyse" | "validation" | "upload" | "sauvegarde" | "done";

const STEPS: { key: InvoiceStep; label: string }[] = [
  { key: "analyse", label: "Analyse IA" },
  { key: "validation", label: "Validation" },
  { key: "upload", label: "Upload SharePoint" },
  { key: "sauvegarde", label: "Sauvegarde" },
];

interface ParsedInvoice {
  project_number: string | null;
  project_id: string | null;
  project_name: string | null;
  invoice_number: string | null;
  vendor: string | null;
  description: string | null;
  amount: number | null;
  tax_amount: number | null;
  total_amount: number | null;
  invoice_date: string | null;
  due_date: string | null;
  type: "facture" | "recu";
  confidence: string;
  file_name: string;
  project_budget?: number;
  project_paid?: number;
}

interface Invoice {
  id: string;
  project_id: string | null;
  invoice_number: string | null;
  vendor: string | null;
  description: string | null;
  amount: number;
  tax_amount: number;
  total_amount: number;
  invoice_date: string | null;
  due_date: string | null;
  type: string;
  status: string;
  file_name: string | null;
  sharepoint_url: string | null;
  created_at: string;
  projects?: { name: string; project_number: string; total_budget: number; total_paid: number } | null;
}

interface Project {
  id: string;
  name: string;
  project_number: string | null;
  total_budget: number;
  total_paid: number;
}

export default function InvoicesTab({ readOnly = false }: { readOnly?: boolean }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedInvoice | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filterProject, setFilterProject] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentStep, setCurrentStep] = useState<InvoiceStep>("idle");

  // Form state
  const [formProjectId, setFormProjectId] = useState("");
  const [formInvoiceNumber, setFormInvoiceNumber] = useState("");
  const [formVendor, setFormVendor] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formTaxAmount, setFormTaxAmount] = useState("");
  const [formTotalAmount, setFormTotalAmount] = useState("");
  const [formInvoiceDate, setFormInvoiceDate] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formType, setFormType] = useState<"facture" | "recu">("facture");

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("invoices")
      .select("*, projects(name, project_number, total_budget, total_paid)")
      .order("created_at", { ascending: false });
    setInvoices((data as unknown as Invoice[]) || []);
    setLoading(false);
  }, []);

  const loadProjects = useCallback(async () => {
    const { data } = await supabase.from("projects").select("id, name, project_number, total_budget, total_paid").order("name");
    setProjects((data as unknown as Project[]) || []);
  }, []);

  useEffect(() => { loadInvoices(); loadProjects(); }, [loadInvoices, loadProjects]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setParsing(true);
    setParsedData(null);
    setShowForm(false);
    setCurrentStep("analyse");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) {
        throw new Error("Configuration backend manquante.");
      }

      const res = await fetch(
        `${supabaseUrl}/functions/v1/parse-invoice`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: formData,
        }
      );

      if (!res.ok) {
        const errorText = await res.text();
        let errorMessage = "Parsing failed";

        try {
          const err = JSON.parse(errorText);
          errorMessage = err.error || err.details || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }

        throw new Error(errorMessage);
      }

      const parsed: ParsedInvoice = await res.json();
      setParsedData(parsed);

      if (parsed.project_id) setFormProjectId(parsed.project_id);
      else setFormProjectId("");
      setFormInvoiceNumber(parsed.invoice_number || "");
      setFormVendor(parsed.vendor || "");
      setFormDescription(parsed.description || "");
      setFormAmount(parsed.amount?.toString() || "0");
      setFormTaxAmount(parsed.tax_amount?.toString() || "0");
      setFormTotalAmount(parsed.total_amount?.toString() || "0");
      setFormInvoiceDate(parsed.invoice_date || "");
      setFormDueDate(parsed.due_date || "");
      setFormType(parsed.type || "facture");
      setShowForm(true);
      setCurrentStep("validation");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Une erreur est survenue pendant l'analyse.";
      toast({ title: "Erreur de lecture", description: message, variant: "destructive" });
      setCurrentStep("idle");
    } finally {
      input.value = "";
      setParsing(false);
    }
  };

  const handleSubmit = async () => {
    if (!formProjectId) {
      toast({ title: "Projet requis", description: "Veuillez sélectionner un projet.", variant: "destructive" });
      return;
    }

    setUploading(true);
    setCurrentStep("upload");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const project = projects.find(p => p.id === formProjectId);
      if (!project) throw new Error("Project not found");

      // 1. Upload file to SharePoint project folder
      let sharepointUrl = "";
      const { data: spConfig } = await supabase.from("sharepoint_config").select("site_id, drive_id").limit(1).maybeSingle();

      if (spConfig && selectedFile) {
        const spBaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const baseUrl = `${spBaseUrl}/functions/v1/sharepoint-proxy`;

        // Ensure project folder exists
        const folderParams = new URLSearchParams({
          action: "ensure-project-folder",
          siteId: spConfig.site_id,
          driveId: spConfig.drive_id || "",
          projectName: project.name,
          projectNumber: project.project_number || "",
        });

        const folderRes = await fetch(`${baseUrl}?${folderParams}`, {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (folderRes.ok) {
          const folder = await folderRes.json();
          const safeFolderName = (project.project_number ? `${project.project_number} - ${project.name}` : project.name)
            .replace(/[<>:"/\\|?*]/g, "_").substring(0, 200);

          // Upload file into the Factures subfolder
          const invoiceSubfolder = "Factures";
          // Ensure Factures subfolder
          const subfolderParams = new URLSearchParams({
            action: "create-folder",
            siteId: spConfig.site_id,
            driveId: spConfig.drive_id || "",
            folderName: invoiceSubfolder,
            parentId: folder.id,
          });
          await fetch(`${baseUrl}?${subfolderParams}`, {
            method: "POST",
            headers: { Authorization: `Bearer ${session.access_token}` },
          });

          // Upload file
          const filePath = `${safeFolderName}/${invoiceSubfolder}/${selectedFile.name}`;
          const uploadParams = new URLSearchParams({
            action: "upload-file",
            siteId: spConfig.site_id,
            driveId: spConfig.drive_id || "",
            filePath,
          });

          const uploadRes = await fetch(`${baseUrl}?${uploadParams}`, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": selectedFile.type || "application/octet-stream",
            },
            body: selectedFile,
          });

          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            sharepointUrl = uploadData.webUrl || "";
          }
        }
      }

      setCurrentStep("sauvegarde");
      // 2. Insert invoice record
      const { error } = await supabase.from("invoices").insert({
        project_id: formProjectId,
        user_id: session.user.id,
        invoice_number: formInvoiceNumber || null,
        vendor: formVendor || null,
        description: formDescription || null,
        amount: parseFloat(formAmount) || 0,
        tax_amount: parseFloat(formTaxAmount) || 0,
        total_amount: parseFloat(formTotalAmount) || 0,
        invoice_date: formInvoiceDate || null,
        due_date: formDueDate || null,
        type: formType,
        status: "validee",
        file_name: selectedFile?.name || null,
        sharepoint_url: sharepointUrl || null,
        parsed_data: parsedData as any,
      });

      if (error) throw error;

      setCurrentStep("done");
      toast({ title: "Facture ajoutée", description: "La facture a été enregistrée et le solde du projet mis à jour." });
      setTimeout(() => setCurrentStep("idle"), 2000);
      setShowForm(false);
      setParsedData(null);
      setSelectedFile(null);
      loadInvoices();
      loadProjects();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
      setCurrentStep("idle");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Supprimée" });
      loadInvoices();
      loadProjects();
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    if (filterProject !== "all" && inv.project_id !== filterProject) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        inv.invoice_number?.toLowerCase().includes(q) ||
        inv.vendor?.toLowerCase().includes(q) ||
        inv.description?.toLowerCase().includes(q) ||
        inv.file_name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const statusBadge = (status: string) => {
    switch (status) {
      case "validee": return <Badge className="bg-emerald-500/10 text-emerald-600"><CheckCircle2 size={12} className="mr-1" />Validée</Badge>;
      case "en_attente": return <Badge variant="outline"><Clock size={12} className="mr-1" />En attente</Badge>;
      case "non_conforme": return <Badge variant="destructive"><AlertCircle size={12} className="mr-1" />Non conforme</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Project balance cards
  const projectsWithInvoices = projects.filter(p =>
    invoices.some(inv => inv.project_id === p.id)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t("sharepoint.invoicesTab")}</h2>
          <p className="text-muted-foreground text-sm mt-1">Gérez les factures et reçus de paiement par projet.</p>
        </div>
        {!readOnly && (
          <label htmlFor="invoice-upload-input" className={parsing ? "pointer-events-none" : "cursor-pointer"}>
            <input
              id="invoice-upload-input"
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              className="sr-only"
              onChange={handleFileSelect}
              disabled={parsing}
            />
            <Button type="button" disabled={parsing} asChild>
              <span>
                {parsing ? <Loader2 size={16} className="animate-spin mr-2" /> : <Upload size={16} className="mr-2" />}
                {parsing ? "Analyse en cours..." : "Ajouter une facture"}
              </span>
            </Button>
          </label>
        )}
      </div>

      {/* Step progress bar */}
      {currentStep !== "idle" && (
        <div className="rounded-lg border bg-card p-4 space-y-3 animate-fade-up">
          <div className="flex items-center justify-between">
            {STEPS.map((step, i) => {
              const stepIndex = STEPS.findIndex(s => s.key === currentStep);
              const doneStepIndex = currentStep === "done" ? STEPS.length : stepIndex;
              const isActive = step.key === currentStep && currentStep !== "done";
              const isDone = i < doneStepIndex || currentStep === "done";

              return (
                <div key={step.key} className="flex flex-col items-center flex-1 relative">
                  {i > 0 && (
                    <div className={`absolute top-3.5 -left-1/2 w-full h-0.5 ${isDone ? "bg-primary" : "bg-muted"}`} />
                  )}
                  <div className={`relative z-10 flex items-center justify-center w-7 h-7 rounded-full border-2 text-xs font-bold transition-all ${
                    isDone
                      ? "bg-primary border-primary text-primary-foreground"
                      : isActive
                        ? "border-primary text-primary bg-background"
                        : "border-muted text-muted-foreground bg-background"
                  }`}>
                    {isDone ? <Check size={14} /> : isActive ? <Loader2 size={14} className="animate-spin" /> : i + 1}
                  </div>
                  <span className={`text-xs mt-1.5 font-medium ${isDone ? "text-primary" : isActive ? "text-foreground" : "text-muted-foreground"}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
          <Progress value={
            currentStep === "done" ? 100
            : currentStep === "sauvegarde" ? 75
            : currentStep === "upload" ? 50
            : currentStep === "validation" ? 25
            : currentStep === "analyse" ? 10
            : 0
          } className="h-1.5" />
        </div>
      )}

      {/* Project balance cards */}
      {projectsWithInvoices.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projectsWithInvoices.map(p => {
            const balance = (p.total_budget || 0) - (p.total_paid || 0);
            return (
              <Card key={p.id} className="border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Receipt size={14} />
                    {p.project_number} - {p.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Budget</span>
                    <span className="font-medium">{(p.total_budget || 0).toLocaleString("fr-CA", { style: "currency", currency: "CAD" })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Payé</span>
                    <span className="font-medium text-emerald-600">{(p.total_paid || 0).toLocaleString("fr-CA", { style: "currency", currency: "CAD" })}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-1">
                    <span className="text-muted-foreground font-medium">Solde</span>
                    <span className={`font-bold ${balance < 0 ? "text-destructive" : "text-primary"}`}>
                      {balance.toLocaleString("fr-CA", { style: "currency", currency: "CAD" })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Rechercher..." className="pl-9" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tous les projets" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les projets</SelectItem>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.project_number} - {p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Invoices list */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin" /></div>
      ) : filteredInvoices.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <FileText size={40} className="mx-auto mb-3 opacity-40" />
          <p>Aucune facture trouvée.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredInvoices.map(inv => (
            <Card key={inv.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${inv.type === "recu" ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"}`}>
                    {inv.type === "recu" ? <Receipt size={18} /> : <FileText size={18} />}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">
                      {inv.invoice_number || inv.file_name || "Sans numéro"}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {inv.vendor && <span>{inv.vendor} · </span>}
                      {inv.projects?.project_number} - {inv.projects?.name}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {statusBadge(inv.status)}
                  <div className="text-right">
                    <div className="font-bold text-sm">
                      {inv.total_amount.toLocaleString("fr-CA", { style: "currency", currency: "CAD" })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString("fr-CA") : ""}
                    </div>
                  </div>
                  {inv.sharepoint_url && (
                    <a href={inv.sharepoint_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" title="Voir sur SharePoint"><FileText size={14} /></Button>
                    </a>
                  )}
                  {!readOnly && (
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(inv.id)} className="text-destructive">
                      <Trash2 size={14} />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Invoice form panel */}
      {showForm && (
        <Card className="border-border shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign size={18} />
              {parsedData && !parsedData.project_id ? "⚠️ Facture non conforme — Projet non identifié" : "Confirmer la facture"}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Vérifiez les informations extraites puis validez l’enregistrement.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {parsedData && !parsedData.project_id && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>Le numéro de projet n'a pas pu être identifié automatiquement. Veuillez sélectionner le projet manuellement.</span>
              </div>
            )}

            {parsedData?.confidence && (
              <div className="inline-flex w-fit items-center gap-1 rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                <span className="font-medium">Confiance :</span>
                <span>{parsedData.confidence === "high" ? "Élevée" : parsedData.confidence === "medium" ? "Moyenne" : "Faible"}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Projet *</label>
                <Select value={formProjectId} onValueChange={setFormProjectId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un projet" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.project_number} - {p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <Select value={formType} onValueChange={(v: "facture" | "recu") => setFormType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="facture">Facture</SelectItem>
                      <SelectItem value="recu">Reçu de paiement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">N° Facture</label>
                  <Input value={formInvoiceNumber} onChange={e => setFormInvoiceNumber(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Fournisseur</label>
                <Input value={formVendor} onChange={e => setFormVendor(e.target.value)} />
              </div>

              <div>
                <label className="text-sm font-medium">Description</label>
                <Input value={formDescription} onChange={e => setFormDescription(e.target.value)} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium">Montant HT</label>
                  <Input type="number" step="0.01" value={formAmount} onChange={e => setFormAmount(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Taxes</label>
                  <Input type="number" step="0.01" value={formTaxAmount} onChange={e => setFormTaxAmount(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Total TTC</label>
                  <Input type="number" step="0.01" value={formTotalAmount} onChange={e => setFormTotalAmount(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Date facture</label>
                  <Input type="date" value={formInvoiceDate} onChange={e => setFormInvoiceDate(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium">Date échéance</label>
                  <Input type="date" value={formDueDate} onChange={e => setFormDueDate(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setParsedData(null);
                  setSelectedFile(null);
                  setCurrentStep("idle");
                }}
              >
                Annuler
              </Button>
              <Button type="button" onClick={handleSubmit} disabled={uploading}>
                {uploading ? <Loader2 size={16} className="mr-2 animate-spin" /> : <CheckCircle2 size={16} className="mr-2" />}
                {uploading ? "Enregistrement..." : "Valider et enregistrer"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
