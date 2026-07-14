import { useState } from"react";
import { supabase } from"@/integrations/supabase/client";
import { Button } from"@/components/ui/button";
import { Card } from"@/components/ui/card";
import { Sparkles, Loader2, Lightbulb, TrendingUp, AlertCircle } from"lucide-react";
import { toast } from"sonner";
import { Badge } from"@/components/ui/badge";

interface Recommendation {
 recommendedLevel:"revision"|"standard"|"avance";
 nextModuleIndex: number | null;
 nextModuleTitle: string | null;
 rationale: string;
 strengths: string[];
 weaknesses: string[];
}

const LEVEL_META: Record<Recommendation["recommendedLevel"], { label: string; color: string; emoji: string }> = {
 revision: { label:"Révision", color:"bg-rose-500/10 text-rose-700 border-rose-300", emoji:"📚"},
 standard: { label:"Parcours standard", color:"bg-blue-500/10 text-blue-700 border-blue-300", emoji:"🎯"},
 avance: { label:"Niveau avancé", color:"bg-emerald-500/10 text-emerald-700 border-emerald-300", emoji:"🚀"},
};

export function AdaptiveRecommendationBanner({
 assignedId,
 onJumpToModule,
}: {
 assignedId: string;
 onJumpToModule?: (moduleIndex: number) => void;
}) {
 const [loading, setLoading] = useState(false);
 const [reco, setReco] = useState<Recommendation | null>(null);

 const fetchReco = async () => {
 setLoading(true);
 try {
 const { data, error } = await supabase.functions.invoke("training-learning-path", {
 body: { assignedId },
 });
 if (error) throw error;
 setReco(data as Recommendation);
 } catch (e: any) {
 toast.error(e?.message ||"Recommandation indisponible");
 } finally {
 setLoading(false);
 }
 };

 if (!reco) {
 return (
 <Card className="p-3 sm:p-4 border-primary/30 bg-primary">
 <div className="flex items-center justify-between gap-3 flex-wrap">
 <div className="flex items-center gap-2 min-w-0">
 <Sparkles className="h-4 w-4 text-primary shrink-0"/>
 <div className="text-sm">
 <span className="font-semibold">Reprendre intelligemment</span>
 <span className="text-muted-foreground"> — l'IA analyse vos résultats pour recommander la suite.</span>
 </div>
 </div>
 <Button size="sm"onClick={fetchReco} disabled={loading} className="bg-gradient-primary-deep text-primary-foreground">
 {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1"/> : <Sparkles className="h-3.5 w-3.5 mr-1"/>}
 Analyser
 </Button>
 </div>
 </Card>
 );
 }

 const meta = LEVEL_META[reco.recommendedLevel];

 return (
 <Card className="p-4 border-primary/30 bg-primary space-y-3">
 <div className="flex items-start justify-between gap-3 flex-wrap">
 <div className="flex items-center gap-2">
 <Sparkles className="h-4 w-4 text-primary"/>
 <span className="font-semibold text-sm">Recommandation IA personnalisée</span>
 </div>
 <Badge variant="outline"className={meta.color}>
 {meta.emoji} {meta.label}
 </Badge>
 </div>
 <p className="text-sm text-muted-foreground leading-snug">{reco.rationale}</p>

 <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
 {reco.strengths.length > 0 && (
 <div className="text-xs space-y-1">
 <div className="font-semibold flex items-center gap-1 text-emerald-700">
 <TrendingUp className="h-3 w-3"/> Points forts
 </div>
 <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
 {reco.strengths.map((s, i) => (
 <li key={i}>{s}</li>
 ))}
 </ul>
 </div>
 )}
 {reco.weaknesses.length > 0 && (
 <div className="text-xs space-y-1">
 <div className="font-semibold flex items-center gap-1 text-rose-700">
 <AlertCircle className="h-3 w-3"/> À renforcer
 </div>
 <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
 {reco.weaknesses.map((s, i) => (
 <li key={i}>{s}</li>
 ))}
 </ul>
 </div>
 )}
 </div>

 {reco.nextModuleTitle && reco.nextModuleIndex != null && (
 <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t">
 <div className="text-xs flex items-center gap-1.5">
 <Lightbulb className="h-3.5 w-3.5 text-amber-500"/>
 <span>Module suggéré : <span className="font-semibold">{reco.nextModuleTitle}</span></span>
 </div>
 {onJumpToModule && (
 <Button size="sm"variant="outline"onClick={() => onJumpToModule(reco.nextModuleIndex!)}>
 Aller à ce module
 </Button>
 )}
 </div>
 )}

 <div className="text-right">
 <Button size="sm"variant="ghost"onClick={fetchReco} disabled={loading} className="h-7 text-xs">
 {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1"/> : <Sparkles className="h-3 w-3 mr-1"/>}
 Réanalyser
 </Button>
 </div>
 </Card>
 );
}
