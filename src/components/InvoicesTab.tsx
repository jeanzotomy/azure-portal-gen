import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/i18n/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FormDialogHeader, formDialogContentClass } from "@/components/FormDialogHeader";
import { Upload, FileText, DollarSign, AlertCircle, CheckCircle2, Clock, Loader2, Trash2, Search, Receipt, Sparkles, Plus, Pencil } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type InvoiceStep = "idle" | "analyse" | "validation" | "upload" | "sauvegarde" | "done";

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
  budget: string | null;
  total_budget: number;
  total_paid: number;
  user_id: string;
}

export default function InvoicesTab({ readOnly = false }: { readOnly?: boolean }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedInvoice | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filterProject, setFilterProject] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentStep, setCurrentStep] = useState<InvoiceStep>("idle");

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
  const [formStatus, setFormStatus] = useState<"en_attente" | "validee">("en_attente");
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);

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
    const { data } = await supabase
      .from("projects")
      .select("id, name, project_number, budget, total_budget, total_paid, user_id")
      .order("name");
    setProjects((data as unknown as Project[]) || []);
  }, []);

  useEffect(() => {
    loadInvoices();
    loadProjects();
  }, [loadInvoices, loadProjects]);

  const resetForm = () => {
    setParsedData(null);
    setSelectedFile(null);
    setFormProjectId("");
    setFormInvoiceNumber("");
    setFormVendor("");
    setFormDescription("");
    setFormAmount("");
    setFormTaxAmount("");
    setFormTotalAmount("");
    setFormInvoiceDate("");
    setFormDueDate("");
    setFormType("facture");
    setFormStatus("en_attente");
    setCurrentStep("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openDialog = () => {
    resetForm();
    setEditingInvoiceId(null);
    setDialogOpen(true);
    setCurrentStep("validation");
  };

  const openEditDialog = (inv: Invoice) => {
    resetForm();
    setEditingInvoiceId(inv.id);
    setFormProjectId(inv.project_id || "");
    setFormInvoiceNumber(inv.invoice_number || "");
    setFormVendor(inv.vendor || "");
    setFormDescription(inv.description || "");
    setFormAmount((inv.amount || 0).toString());
    setFormTaxAmount((inv.tax_amount || 0).toString());
    setFormTotalAmount((inv.total_amount || 0).toString());
    setFormInvoiceDate(inv.invoice_date || "");
    setFormDueDate(inv.due_date || "");
    setFormType((inv.type as "facture" | "recu") || "facture");
    setFormStatus((inv.status as "en_attente" | "validee") || "en_attente");
    setDialogOpen(true);
    setCurrentStep("validation");
  };

  const applyParsedData = (parsed: ParsedInvoice) => {
    setParsedData(parsed);
    setFormProjectId(parsed.project_id || "");
    setFormInvoiceNumber(parsed.invoice_number || "");
    setFormVendor(parsed.vendor || "");
    setFormDescription(parsed.description || "");
    setFormAmount(parsed.amount?.toString() || "0");
    setFormTaxAmount(parsed.tax_amount?.toString() || "0");
    setFormTotalAmount(parsed.total_amount?.toString() || "0");
    setFormInvoiceDate(parsed.invoice_date || "");
    setFormDueDate(parsed.due_date || "");
    setFormType(parsed.type || "facture");
    setCurrentStep("validation");
  };

  const handleFileSelectInDialog = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleAutoAnalyze = async () => {
    if (!selectedFile) {
      toast({ title: "Fichier requis", description: "Veuillez d'abord choisir un fichier.", variant: "destructive" });
      return;
    }

    setParsing(true);
    setCurrentStep("analyse");

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) throw new Error("Configuration backend manquante.");

      const res = await fetch(`${supabaseUrl}/functions/v1/parse-invoice`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: formData,
      });

      if (!res.ok) {
        const errorText = await res.text();
        let errorMessage = "Analyse impossible";
        try {
          const err = JSON.parse(errorText);
          errorMessage = err.error || err.details || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const parsed: ParsedInvoice = await res.json();
      applyParsedData(parsed);
      toast({ title: "Analyse terminée", description: "Les champs ont été préremplis automatiquement." });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Une erreur est survenue pendant l'analyse.";
      toast({ title: "Analyse indisponible", description: `${message} Vous pouvez continuer manuellement.`, variant: "destructive" });
      setCurrentStep("validation");
    } finally {
      setParsing(false);
    }
  };

  const handleSubmit = async () => {
    if (!formProjectId) {
      toast({ title: "Champ requis", description: "Veuillez sélectionner un projet.", variant: "destructive" });
      return;
    }
    if (!formInvoiceNumber.trim()) {
      toast({ title: "Champ requis", description: "Le numéro de facture est obligatoire.", variant: "destructive" });
      return;
    }
    if (!formVendor.trim()) {
      toast({ title: "Champ requis", description: "Le fournisseur est obligatoire.", variant: "destructive" });
      return;
    }
    if (!formDescription.trim()) {
      toast({ title: "Champ requis", description: "La description est obligatoire.", variant: "destructive" });
      return;
    }
    if (!formAmount || parseFloat(formAmount) <= 0) {
      toast({ title: "Champ requis", description: "Le montant HT est obligatoire.", variant: "destructive" });
      return;
    }
    if (!formTaxAmount || parseFloat(formTaxAmount) < 0) {
      toast({ title: "Champ requis", description: "Le montant des taxes est obligatoire.", variant: "destructive" });
      return;
    }
    if (!formTotalAmount || parseFloat(formTotalAmount) <= 0) {
      toast({ title: "Champ requis", description: "Le total TTC est obligatoire.", variant: "destructive" });
      return;
    }
    if (!formInvoiceDate) {
      toast({ title: "Champ requis", description: "La date de facture est obligatoire.", variant: "destructive" });
      return;
    }
    if (!formDueDate) {
      toast({ title: "Champ requis", description: "La date d'échéance est obligatoire.", variant: "destructive" });
      return;
    }

    setUploading(true);
    setCurrentStep("upload");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const project = projects.find(p => p.id === formProjectId);
      if (!project) throw new Error("Project not found");

      let sharepointUrl = "";
      const { data: spConfig } = await supabase.from("sharepoint_config").select("site_id, drive_id").limit(1).maybeSingle();

      if (spConfig && selectedFile) {
        const spBaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const baseUrl = `${spBaseUrl}/functions/v1/sharepoint-proxy`;

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

          const invoiceSubfolder = "Factures";
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

            // Enregistrer le fichier dans project_files
            await supabase.from("project_files").insert({
              project_id: formProjectId,
              user_id: session.user.id,
              file_name: selectedFile.name,
              file_path: sharepointUrl || filePath,
              file_size: selectedFile.size,
              file_type: selectedFile.type || "application/octet-stream",
            });
          }
        }
      }

      setCurrentStep("sauvegarde");

      const invoiceData = {
        project_id: formProjectId,
        invoice_number: formInvoiceNumber || null,
        vendor: formVendor || null,
        description: formDescription || null,
        amount: parseFloat(formAmount) || 0,
        tax_amount: parseFloat(formTaxAmount) || 0,
        total_amount: parseFloat(formTotalAmount) || 0,
        invoice_date: formInvoiceDate || null,
        due_date: formDueDate || null,
        type: formType as "facture" | "recu",
        status: formStatus as "en_attente" | "validee",
        ...(selectedFile ? { file_name: selectedFile.name } : {}),
        ...(sharepointUrl ? { sharepoint_url: sharepointUrl } : {}),
      };

      let error;
      if (editingInvoiceId) {
        ({ error } = await supabase.from("invoices").update(invoiceData).eq("id", editingInvoiceId));
      } else {
        ({ error } = await supabase.from("invoices").insert({
          ...invoiceData,
          user_id: project.user_id,
          file_name: selectedFile?.name || null,
          sharepoint_url: sharepointUrl || null,
          parsed_data: parsedData as any,
        }));
      }

      if (error) throw error;

      setCurrentStep("done");

      const statusLabel = formStatus === "validee" ? "validée (solde projet mis à jour)" : "en attente de validation";
      toast({ title: editingInvoiceId ? "Facture modifiée" : "Facture ajoutée", description: `Statut : ${statusLabel}` });

      setTimeout(() => {
        setDialogOpen(false);
        resetForm();
      }, 1200);

      loadInvoices();
      loadProjects();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
      setCurrentStep("validation");
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

  const projectsWithInvoices = projects.filter(p =>
    invoices.some(inv => inv.project_id === p.id)
  );

  const stepProgress = currentStep === "done" ? 100
    : currentStep === "sauvegarde" ? 75
    : currentStep === "upload" ? 50
    : currentStep === "validation" ? 25
    : currentStep === "analyse" ? 10 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t("sharepoint.invoicesTab")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Gérez les factures et reçus de paiement par projet.</p>
        </div>
        {!readOnly && (
          <Button type="button" onClick={openDialog} className="gap-2">
            <Plus size={16} />
            Nouvelle facture
          </Button>
        )}
      </div>

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

      {/* Financial overview - reactive to filterProject */}
      {projects.length > 0 && (() => {
        const fmt = (n: number) => n.toLocaleString("fr-CA", { style: "currency", currency: "CAD" });
        const visibleProjects = filterProject === "all"
          ? projects
          : projects.filter(p => p.id === filterProject);
        const visibleInvoices = filterProject === "all"
          ? invoices
          : invoices.filter(i => i.project_id === filterProject);

        const totalBudget = visibleProjects.reduce((s, p) => s + (parseFloat(((p as any).budget || "0").replace(/[^\d.]/g, "")) || p.total_budget || 0), 0);
        const totalPaid = visibleProjects.reduce((s, p) => s + (p.total_paid || 0), 0);
        const totalSolde = totalBudget - totalPaid;
        const totalInv = visibleInvoices.length;
        const validees = visibleInvoices.filter(i => i.status === "validee").length;
        const enAttente = visibleInvoices.filter(i => i.status === "en_attente").length;
        const nonConformes = visibleInvoices.filter(i => i.status === "non_conforme").length;

        const barData = visibleProjects
          .map(p => {
            const bgt = parseFloat(((p as any).budget || "0").replace(/[^\d.]/g, "")) || p.total_budget || 0;
            const paid = p.total_paid || 0;
            return { name: p.project_number || p.name, budget: bgt, paid, solde: bgt - paid };
          })
          .filter(d => d.budget > 0 || d.paid > 0);

        return (
          <div className="space-y-4">
            {/* Summary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: filterProject === "all" ? "Budget total" : "Budget projet", value: fmt(totalBudget), sub: filterProject === "all" ? `${visibleProjects.length} projet(s)` : visibleProjects[0]?.project_number || "", color: "text-primary" },
                { label: "Total payé", value: fmt(totalPaid), sub: `${validees} facture(s) validée(s)`, color: "text-emerald-600" },
                { label: "Solde restant", value: fmt(totalSolde), sub: totalSolde < 0 ? "Dépassement!" : "Disponible", color: totalSolde < 0 ? "text-destructive" : "text-primary" },
                { label: "Factures", value: totalInv.toString(), sub: `${enAttente} en attente · ${nonConformes} non conf.`, color: "text-foreground" },
              ].map(s => (
                <Card key={s.label} className="border">
                  <CardContent className="p-4">
                    <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{s.label}</p>
                    <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Bar chart per project */}
            <Card className="border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  {filterProject === "all" ? "Répartition financière par projet" : `Consommation budgétaire — ${visibleProjects[0]?.project_number || ""}`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k $`} />
                    <Tooltip formatter={(value: number) => fmt(value)} />
                    <Legend />
                    <Bar dataKey="budget" name="Budget" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="paid" name="Payé" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="solde" name="Solde" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        );
      })()}

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
                    {inv.project_id && (() => {
                      const proj = projects.find(pp => pp.id === inv.project_id);
                      if (!proj) return null;
                      const bgt = parseFloat(((proj as any).budget || "0").replace(/[^\d.]/g, "")) || proj.total_budget || 0;
                      const paid = proj.total_paid || 0;
                      const solde = bgt - paid;
                      const fmt = (n: number) => n.toLocaleString("fr-CA", { style: "currency", currency: "CAD" });
                      return (
                        <div className="flex gap-3 text-[11px] mt-0.5">
                          <span className="text-muted-foreground">Budget: <span className="font-medium text-foreground">{fmt(bgt)}</span></span>
                          <span className="text-muted-foreground">Payé: <span className="font-medium text-emerald-600">{fmt(paid)}</span></span>
                          <span className="text-muted-foreground">Solde: <span className={`font-semibold ${solde < 0 ? "text-destructive" : "text-primary"}`}>{fmt(solde)}</span></span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {readOnly ? statusBadge(inv.status) : (
                    <Select value={inv.status} onValueChange={async (v: "en_attente" | "validee" | "non_conforme") => {
                      await supabase.from("invoices").update({ status: v }).eq("id", inv.id);
                      loadInvoices();
                      loadProjects();
                      toast({ title: "Statut mis à jour", description: v === "validee" ? "Facture validée — solde projet ajusté" : `Statut : ${v.replace("_", " ")}` });
                    }}>
                      <SelectTrigger className="w-[150px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en_attente">En attente</SelectItem>
                        <SelectItem value="validee">Validée</SelectItem>
                        <SelectItem value="non_conforme">Non conforme</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <div className="text-right">
                    <div className="font-bold text-sm">
                      {(inv.amount || 0).toLocaleString("fr-CA", { style: "currency", currency: "CAD" })}
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
                    <>
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(inv)} title="Modifier">
                        <Pencil size={14} />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(inv.id)} className="text-destructive">
                        <Trash2 size={14} />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ===== DIALOG D'AJOUT ===== */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        if (!open && !uploading) {
          setDialogOpen(false);
          resetForm();
        }
      }}>
        <DialogContent className={`max-w-2xl max-h-[90vh] overflow-y-auto ${formDialogContentClass}`} onPointerDownOutside={e => { if (uploading || parsing) e.preventDefault(); }}>
          <FormDialogHeader
            icon={DollarSign}
            title={editingInvoiceId ? "Modifier la facture" : parsedData && !parsedData.project_id ? "Facture à compléter" : "Nouvelle facture / reçu"}
            subtitle="Remplissez les champs de la facture ou du reçu."
            badges={[]}
          />
          <div className="p-4 sm:p-6 space-y-4">

          {/* Progress */}
          {currentStep !== "idle" && currentStep !== "validation" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 size={14} className="animate-spin" />
                {currentStep === "analyse" && "Analyse IA en cours..."}
                {currentStep === "upload" && "Upload vers SharePoint..."}
                {currentStep === "sauvegarde" && "Sauvegarde en cours..."}
                {currentStep === "done" && "✅ Terminé !"}
              </div>
              <Progress value={stepProgress} className="h-1.5" />
            </div>
          )}


          {parsedData && !parsedData.project_id && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>Le projet n'a pas été identifié. Sélectionnez-le manuellement.</span>
            </div>
          )}

          {/* Form fields */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Projet *</label>
                <Select value={formProjectId} onValueChange={setFormProjectId}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un projet" /></SelectTrigger>
                  <SelectContent>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.project_number} - {p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {formProjectId && (() => {
                const sp = projects.find(p => p.id === formProjectId);
                if (!sp) return null;
                const allocatedBudget = parseFloat(sp.budget || "0") || sp.total_budget || 0;
                const balance = allocatedBudget - (sp.total_paid || 0);
                return (
                  <div>
                    <label className="text-sm font-medium">Budget du projet</label>
                    <div className="flex items-center gap-2 h-9 rounded-md border bg-muted/50 px-3 text-sm">
                      <DollarSign size={14} className="text-muted-foreground" />
                      <span className="font-medium">{allocatedBudget.toLocaleString("fr-CA", { style: "currency", currency: "CAD" })}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">Payé : {(sp.total_paid || 0).toLocaleString("fr-CA", { style: "currency", currency: "CAD" })}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className={`text-xs font-semibold ${balance < 0 ? "text-destructive" : "text-emerald-600"}`}>
                        Solde : {balance.toLocaleString("fr-CA", { style: "currency", currency: "CAD" })}
                      </span>
                    </div>
                  </div>
                );
              })()}
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
                <label className="text-sm font-medium">Statut</label>
                <Select value={formStatus} onValueChange={(v: "en_attente" | "validee") => setFormStatus(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en_attente">En attente</SelectItem>
                    <SelectItem value="validee">Validée (payée)</SelectItem>
                  </SelectContent>
                </Select>
                {formStatus === "validee" && (
                  <p className="text-xs text-emerald-600 mt-1">Le solde du projet sera mis à jour automatiquement.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">N° Facture *</label>
                <Input value={formInvoiceNumber} onChange={e => setFormInvoiceNumber(e.target.value)} required />
              </div>
              <div>
                <label className="text-sm font-medium">Fournisseur *</label>
                <Input value={formVendor} onChange={e => setFormVendor(e.target.value)} required />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">Description *</label>
              <Input value={formDescription} onChange={e => setFormDescription(e.target.value)} required />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium">Montant HT *</label>
                <Input type="number" step="0.01" value={formAmount} onChange={e => setFormAmount(e.target.value)} required />
              </div>
              <div>
                <label className="text-sm font-medium">Taxes *</label>
                <Input type="number" step="0.01" value={formTaxAmount} onChange={e => setFormTaxAmount(e.target.value)} required />
              </div>
              <div>
                <label className="text-sm font-medium">Total TTC *</label>
                <Input type="number" step="0.01" value={formTotalAmount} onChange={e => setFormTotalAmount(e.target.value)} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Date facture *</label>
                <Input type="date" value={formInvoiceDate} onChange={e => setFormInvoiceDate(e.target.value)} required />
              </div>
              <div>
                <label className="text-sm font-medium">Date échéance *</label>
                <Input type="date" value={formDueDate} onChange={e => setFormDueDate(e.target.value)} required />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }} disabled={uploading}>
              Annuler
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={uploading || parsing}>
              {uploading ? <Loader2 size={16} className="mr-2 animate-spin" /> : <CheckCircle2 size={16} className="mr-2" />}
              {uploading ? "Enregistrement..." : editingInvoiceId ? "Sauvegarder" : "Valider et enregistrer"}
            </Button>
          </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
