import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, BookOpen, ArrowLeft, Loader2, ChevronRight, LifeBuoy } from "lucide-react";

interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  tags: string[];
  rank?: number;
}

export default function PortalHelpPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Article[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState<{ title: string; body: string; tags: string[] } | null>(null);

  useEffect(() => {
    const h = setTimeout(async () => {
      setLoading(true);
      const { data, error } = await (supabase.rpc as any)("search_kb_articles", { _q: q, _lang: "fr", _limit: 30 });
      if (!error) setItems((data ?? []) as Article[]);
      setLoading(false);
    }, 250);
    return () => clearTimeout(h);
  }, [q]);

  const openArticle = async (slug: string) => {
    const { data } = await (supabase.from("kb_articles") as any)
      .select("title, body, tags")
      .eq("slug", slug)
      .maybeSingle();
    if (data) setActive(data as any);
  };

  return (
    <div className="container mx-auto px-3 sm:px-4 py-6 max-w-4xl space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate("/portal")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <LifeBuoy className="h-5 w-5 text-primary" /> Centre d'aide
          </h1>
          <p className="text-xs text-muted-foreground">Trouvez une réponse en libre-service avant d'ouvrir un ticket.</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher dans l'aide… (ex : facture, formation, certificat)"
          className="pl-9 h-11"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Articles ({items.length})</CardTitle></CardHeader>
          <CardContent className="p-0 max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="p-6 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
            ) : items.length === 0 ? (
              <div className="p-6 text-xs text-muted-foreground text-center">
                <BookOpen className="h-8 w-8 mx-auto opacity-30 mb-2" />
                {q ? "Aucun résultat. Essayez d'autres mots-clés." : "Aucun article disponible pour le moment."}
              </div>
            ) : (
              <ul className="divide-y">
                {items.map((a) => (
                  <li key={a.id}>
                    <button
                      onClick={() => openArticle(a.slug)}
                      className="w-full text-left px-3 py-2.5 hover:bg-muted/40 transition flex items-start gap-2"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{a.title}</div>
                        {a.excerpt && <div className="text-[11px] text-muted-foreground line-clamp-2">{a.excerpt}</div>}
                        {a.tags.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {a.tags.slice(0, 3).map((t) => (
                              <Badge key={t} variant="outline" className="text-[9px]">{t}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="p-5 min-h-[60vh]">
            {active ? (
              <article className="prose prose-sm max-w-none">
                <h2 className="text-xl font-bold mb-2">{active.title}</h2>
                {active.tags.length > 0 && (
                  <div className="flex gap-1 mb-3 flex-wrap">
                    {active.tags.map((t) => (
                      <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                    ))}
                  </div>
                )}
                <div className="whitespace-pre-wrap text-sm">{active.body}</div>
              </article>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground gap-3 py-10">
                <BookOpen className="h-12 w-12 opacity-30" />
                <p className="text-sm">Sélectionnez un article dans la liste de gauche.</p>
                <p className="text-xs">Vous ne trouvez pas votre réponse ? <a href="/portal?tab=support" className="text-primary hover:underline">Ouvrez un ticket</a>.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
