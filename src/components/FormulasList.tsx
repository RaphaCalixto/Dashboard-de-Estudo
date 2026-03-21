import { useState } from "react";
import { Search, Copy, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { allFormulas, type SubjectFormulas } from "@/lib/formulas";

interface FormulasListProps {
  subjectId: string;
}

export function FormulasList({ subjectId }: FormulasListProps) {
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const subjectFormulas = allFormulas.find((f) => f.subjectId === subjectId);

  if (!subjectFormulas) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-sm">Nenhuma fórmula disponível para esta matéria</p>
      </div>
    );
  }

  const q = search.toLowerCase();
  const filtered = subjectFormulas.categories
    .map((cat) => ({
      ...cat,
      formulas: cat.formulas.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.formula.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q)
      ),
    }))
    .filter((cat) => cat.formulas.length > 0);

  const copyFormula = (id: string, formula: string) => {
    navigator.clipboard.writeText(formula);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar fórmula..."
          className="pl-9"
        />
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">Nenhuma fórmula encontrada</p>
      )}

      {filtered.map((category) => (
        <div key={category.id}>
          <h3 className="text-sm font-semibold text-foreground mb-2 px-1">{category.name}</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {category.formulas.map((f) => (
              <div
                key={f.id}
                className="rounded-lg border border-border bg-card p-3 hover:shadow-sm transition-shadow group cursor-pointer"
                onClick={() => copyFormula(f.id, f.formula)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground">{f.name}</p>
                    <p className="font-mono text-sm font-semibold text-foreground mt-0.5 break-all">{f.formula}</p>
                    <p className="text-xs text-muted-foreground mt-1">{f.description}</p>
                  </div>
                  <div className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {copiedId === f.id ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
