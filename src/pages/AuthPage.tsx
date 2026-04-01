import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isSupabaseConfigured, missingSupabaseEnv, supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SiteLogo } from "@/components/SiteLogo";

function getAuthErrorMessage(error: unknown) {
  const defaultMessage = "Erro na autenticacao.";
  const rawMessage = error instanceof Error ? error.message : String(error ?? "");
  const normalizedMessage = rawMessage.toLowerCase();

  if (normalizedMessage.includes("failed to fetch") || normalizedMessage.includes("networkerror")) {
    return "Falha de conexao com o servidor de autenticacao. Confira URL/chave do Supabase e tente novamente.";
  }

  return rawMessage || defaultMessage;
}

export default function AuthPage() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isSupabaseConfigured) {
      toast.error(`Configure ${missingSupabaseEnv.join(", ")} na Vercel para habilitar login.`);
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Login realizado com sucesso!");
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: displayName },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Verifique seu email para confirmar.");
      }
    } catch (error) {
      toast.error(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/subject-backgrounds/rotina-de-estudos.jpg')" }}
      />
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[1px]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-8 rounded-2xl border border-white/20 bg-background/85 p-6 shadow-2xl backdrop-blur-md sm:p-8">
          <div className="text-center">
            <SiteLogo className="mx-auto mb-4 h-20 w-20" />
            <h1 className="font-display text-2xl font-bold text-foreground">Meu Caderno de Estudos</h1>
            <p className="mt-1 text-sm text-muted-foreground">{isLogin ? "Entre na sua conta" : "Crie sua conta"}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isSupabaseConfigured && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                Configuracao incompleta no deploy. Corrija: {missingSupabaseEnv.join(", ")}.
              </div>
            )}

            {!isLogin && (
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Seu nome"
                  required={!isLogin}
                />
              </div>
            )}

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>

            <div>
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimo 6 caracteres"
                minLength={6}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading || !isSupabaseConfigured}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLogin ? "Entrar" : "Criar conta"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? "Nao tem conta?" : "Ja tem conta?"}{" "}
            <button onClick={() => setIsLogin(!isLogin)} className="font-medium text-primary hover:underline">
              {isLogin ? "Criar conta" : "Fazer login"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
