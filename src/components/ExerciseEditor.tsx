import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ImagePlus, Save, X, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";
import { MathSymbolPicker } from "./MathSymbolPicker";
import { SimpleCalculator } from "./SimpleCalculator";
import type { ExerciseNote } from "@/lib/studyStore";

interface ExerciseEditorProps {
  exercise?: ExerciseNote;
  showMathTools?: boolean;
  onSave: (data: Omit<ExerciseNote, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export function ExerciseEditor({ exercise, showMathTools, onSave, onCancel, onDelete }: ExerciseEditorProps) {
  const [title, setTitle] = useState(exercise?.title || "");
  const [question, setQuestion] = useState(exercise?.question || "");
  const [resolution, setResolution] = useState(exercise?.resolution || "");
  const [answer, setAnswer] = useState(exercise?.answer || "");
  const [images, setImages] = useState<string[]>(exercise?.images || []);
  const [result, setResult] = useState<'correct' | 'incorrect' | null>(exercise?.result || null);
  const questionRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const insertSymbol = (symbol: string) => {
    const el = questionRef.current;
    if (!el) { setQuestion((c) => c + symbol); return; }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newContent = question.slice(0, start) + symbol + question.slice(end);
    setQuestion(newContent);
    setTimeout(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + symbol.length;
    }, 0);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setImages((prev) => [...prev, ev.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    onSave({ title, question, resolution, answer, images, result });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título do exercício..."
        className="font-semibold text-base"
      />

      <div className="flex flex-wrap items-center gap-2">
        {showMathTools && (
          <>
            <MathSymbolPicker onInsert={insertSymbol} />
            <SimpleCalculator />
          </>
        )}
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fileInputRef.current?.click()}>
          <ImagePlus className="h-4 w-4" />
          <span className="hidden sm:inline">Imagem</span>
        </Button>
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Enunciado / Questão</label>
        <Textarea
          ref={questionRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Escreva o enunciado do exercício..."
          className="min-h-[100px] resize-y text-sm"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Resolução passo a passo</label>
        <Textarea
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
          placeholder="Descreva os passos da resolução..."
          className="min-h-[80px] resize-y text-sm"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Resposta</label>
        <Input
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Resposta final..."
        />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Resultado:</span>
        <Button
          variant={result === 'correct' ? 'default' : 'outline'}
          size="sm"
          className={`gap-1 ${result === 'correct' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}`}
          onClick={() => setResult(result === 'correct' ? null : 'correct')}
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> Acertei
        </Button>
        <Button
          variant={result === 'incorrect' ? 'default' : 'outline'}
          size="sm"
          className={`gap-1 ${result === 'incorrect' ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' : ''}`}
          onClick={() => setResult(result === 'incorrect' ? null : 'incorrect')}
        >
          <XCircle className="h-3.5 w-3.5" /> Errei
        </Button>
      </div>

      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((img, i) => (
            <div key={i} className="group relative h-24 w-24 overflow-hidden rounded-lg border border-border">
              <img src={img} alt={`Anexo ${i + 1}`} className="h-full w-full object-cover" />
              <button
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" onClick={handleSave} disabled={!title.trim() && !question.trim()}>
          <Save className="h-4 w-4 mr-1.5" /> Salvar
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>
        {onDelete && (
          <Button variant="ghost" size="sm" className="ml-auto text-destructive hover:text-destructive" onClick={onDelete}>
            Excluir
          </Button>
        )}
      </div>
    </div>
  );
}
