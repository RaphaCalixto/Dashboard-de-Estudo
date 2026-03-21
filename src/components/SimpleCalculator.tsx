import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calculator } from "lucide-react";

const BUTTONS = [
  ["C", "(", ")", "÷"],
  ["7", "8", "9", "×"],
  ["4", "5", "6", "-"],
  ["1", "2", "3", "+"],
  ["0", ".", "⌫", "="],
];

export function SimpleCalculator() {
  const [display, setDisplay] = useState("0");
  const [expression, setExpression] = useState("");

  const handlePress = (btn: string) => {
    if (btn === "C") {
      setDisplay("0");
      setExpression("");
    } else if (btn === "⌫") {
      const newExpr = expression.slice(0, -1);
      setExpression(newExpr);
      setDisplay(newExpr || "0");
    } else if (btn === "=") {
      try {
        const sanitized = expression
          .replace(/×/g, "*")
          .replace(/÷/g, "/");
        const result = Function(`"use strict"; return (${sanitized})`)();
        const formatted = Number.isFinite(result) ? String(Math.round(result * 1e10) / 1e10) : "Erro";
        setDisplay(formatted);
        setExpression(formatted === "Erro" ? "" : formatted);
      } catch {
        setDisplay("Erro");
        setExpression("");
      }
    } else {
      const newExpr = expression === "0" && btn !== "." ? btn : expression + btn;
      setExpression(newExpr);
      setDisplay(newExpr);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5" title="Calculadora">
          <Calculator className="h-4 w-4" />
          <span className="hidden sm:inline">Calculadora</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="mb-2 rounded-lg bg-muted px-3 py-2 text-right font-mono text-lg text-foreground truncate">
          {display}
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {BUTTONS.flat().map((btn, i) => (
            <button
              key={i}
              onClick={() => handlePress(btn)}
              className={`flex h-10 items-center justify-center rounded-md text-sm font-medium transition-colors
                ${btn === "=" ? "bg-primary text-primary-foreground hover:bg-primary/90 col-span-1" : ""}
                ${btn === "C" ? "bg-destructive/10 text-destructive hover:bg-destructive/20" : ""}
                ${!["=", "C"].includes(btn) ? "bg-muted hover:bg-accent text-foreground" : ""}
              `}
            >
              {btn}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
