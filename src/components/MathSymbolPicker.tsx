import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Sigma } from "lucide-react";

const SYMBOL_GROUPS = [
  {
    label: "Operações",
    symbols: ["±", "×", "÷", "·", "√", "∛", "∜", "²", "³", "⁴", "ⁿ", "₁", "₂", "₃"],
  },
  {
    label: "Relações",
    symbols: ["≠", "≈", "≤", "≥", "≪", "≫", "∝", "≡", "≅", "∼"],
  },
  {
    label: "Conjuntos",
    symbols: ["∈", "∉", "⊂", "⊃", "⊆", "⊇", "∪", "∩", "∅", "ℕ", "ℤ", "ℚ", "ℝ", "ℂ"],
  },
  {
    label: "Cálculo",
    symbols: ["∫", "∬", "∮", "∑", "∏", "∂", "∇", "∞", "lim", "dx", "dy"],
  },
  {
    label: "Lógica",
    symbols: ["∧", "∨", "¬", "⇒", "⇔", "∀", "∃", "∄", "⊤", "⊥"],
  },
  {
    label: "Gregos",
    symbols: ["α", "β", "γ", "δ", "ε", "θ", "λ", "μ", "π", "σ", "φ", "ω", "Δ", "Σ", "Ω"],
  },
  {
    label: "Geometria",
    symbols: ["°", "∠", "⊥", "∥", "△", "□", "○", "→", "↔"],
  },
];

interface MathSymbolPickerProps {
  onInsert: (symbol: string) => void;
}

export function MathSymbolPicker({ onInsert }: MathSymbolPickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5" title="Símbolos matemáticos">
          <Sigma className="h-4 w-4" />
          <span className="hidden sm:inline">Símbolos</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-h-80 overflow-y-auto p-3" align="start">
        {SYMBOL_GROUPS.map((group) => (
          <div key={group.label} className="mb-3 last:mb-0">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">{group.label}</p>
            <div className="flex flex-wrap gap-1">
              {group.symbols.map((s) => (
                <button
                  key={s}
                  onClick={() => { onInsert(s); }}
                  className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
