import { GraduationCap, Target, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { subjects } from "@/lib/subjects";
import { SubjectCard } from "@/components/SubjectCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function Index() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-4 py-12 sm:px-8">
        <div className="mx-auto max-w-5xl text-center relative">
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 gap-1.5 text-muted-foreground"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" /> Sair
          </Button>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
            <GraduationCap className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
            Meu Caderno de Estudos
          </h1>
          <p className="mt-2 text-muted-foreground max-w-md mx-auto">
            Olá, {user?.user_metadata?.display_name || user?.email}! Organize suas anotações em um só lugar.
          </p>
          <Button
            size="lg"
            className="mt-6 gap-2"
            onClick={() => navigate("/prova")}
          >
            <Target className="h-5 w-5" /> Modo Prova
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">Matérias</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((subject) => (
            <SubjectCard key={subject.id} subject={subject} />
          ))}
        </div>
      </main>
    </div>
  );
}
