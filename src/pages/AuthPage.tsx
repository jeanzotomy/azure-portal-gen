import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Cloud, ArrowLeft } from "lucide-react";
import favicon from "@/assets/favicon.png";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/portal");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast({ title: "Inscription réussie!", description: "Vérifiez votre email pour confirmer votre compte." });
      }
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-secondary-foreground/60 hover:text-primary mb-8">
          <ArrowLeft size={16} /> Retour au site
        </Link>

        <div className="glass rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-8">
            <img src={favicon} alt="CloudMature" className="h-10 w-10" />
            <div>
              <h1 className="text-xl font-bold text-primary-foreground">Portail Client</h1>
              <p className="text-sm text-secondary-foreground/60">Cloud Mature</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <Input placeholder="Nom complet" required value={fullName} onChange={(e) => setFullName(e.target.value)}
                className="bg-secondary/30 border-border/30 text-primary-foreground placeholder:text-secondary-foreground/40" />
            )}
            <Input type="email" placeholder="Email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="bg-secondary/30 border-border/30 text-primary-foreground placeholder:text-secondary-foreground/40" />
            <Input type="password" placeholder="Mot de passe" required value={password} onChange={(e) => setPassword(e.target.value)}
              className="bg-secondary/30 border-border/30 text-primary-foreground placeholder:text-secondary-foreground/40" />
            <Button type="submit" className="w-full gradient-primary text-primary-foreground border-0" disabled={loading}>
              <Cloud size={16} className="mr-2" /> {loading ? "Chargement..." : isLogin ? "Se connecter" : "S'inscrire"}
            </Button>
          </form>

          <p className="text-center text-sm text-secondary-foreground/60 mt-6">
            {isLogin ? "Pas encore de compte?" : "Déjà un compte?"}{" "}
            <button onClick={() => setIsLogin(!isLogin)} className="text-primary hover:underline">
              {isLogin ? "S'inscrire" : "Se connecter"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
