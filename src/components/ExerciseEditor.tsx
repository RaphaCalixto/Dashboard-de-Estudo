import { useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, CheckCircle2, ImagePlus, Minus, Plus, Save, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MathSymbolPicker } from "./MathSymbolPicker";
import { SimpleCalculator } from "./SimpleCalculator";
import type { ExerciseNote } from "@/lib/studyStore";
import { createInitialNoteHtml } from "@/lib/richNoteContent";
import { useInlineRichField } from "@/hooks/useInlineRichField";

interface ExerciseEditorProps {
  exercise?: ExerciseNote;
  showMathTools?: boolean;
  onSave: (data: Omit<ExerciseNote, "id" | "createdAt" | "updatedAt">) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

const IMAGE_MIN_WIDTH = 80;
const IMAGE_MAX_WIDTH = 1000;
const IMAGE_DEFAULT_WIDTH = 280;

export function ExerciseEditor({ exercise, showMathTools, onSave, onCancel, onDelete }: ExerciseEditorProps) {
  const [title, setTitle] = useState(exercise?.title || "");
  const [answer, setAnswer] = useState(exercise?.answer || "");
  const [result, setResult] = useState<"correct" | "incorrect" | null>(exercise?.result || null);
  const [activeField, setActiveField] = useState<"question" | "resolution">("question");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const questionInitialHtml = useMemo(
    () => createInitialNoteHtml(exercise?.question || "", exercise?.images || []),
    [exercise?.question, exercise?.images],
  );
  const resolutionInitialHtml = useMemo(
    () => createInitialNoteHtml(exercise?.resolution || "", []),
    [exercise?.resolution],
  );

  const questionField = useInlineRichField(questionInitialHtml);
  const resolutionField = useInlineRichField(resolutionInitialHtml);
  const currentField = activeField === "question" ? questionField : resolutionField;

  const insertSymbol = (symbol: string) => {
    currentField.insertTextAtCaret(symbol);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    const toDataUrl = (file: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

    const imageSources = await Promise.all(Array.from(files).map(toDataUrl));
    imageSources.forEach((src) => currentField.insertImageAtCaret(src));
    e.target.value = "";
  };

  const focusQuestion = () => {
    setActiveField("question");
    resolutionField.clearSelectedImage();
  };

  const focusResolution = () => {
    setActiveField("resolution");
    questionField.clearSelectedImage();
  };

  const handleSave = () => {
    const question = questionField.getSanitizedHtml();
    const resolution = resolutionField.getSanitizedHtml();
    const images = Array.from(new Set([...questionField.getImages(), ...resolutionField.getImages()]));

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
          <span className="hidden sm:inline">Imagem ({activeField === "question" ? "questão" : "resolução"})</span>
        </Button>
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
      </div>

      {currentField.selectedImageId && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-muted/30 p-2">
          <span className="text-xs text-muted-foreground mr-1">Imagem selecionada</span>
          <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => currentField.moveSelectedImage("up")}>
            <ArrowUp className="h-3.5 w-3.5" /> Subir
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => currentField.moveSelectedImage("down")}>
            <ArrowDown className="h-3.5 w-3.5" /> Descer
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => currentField.resizeSelectedImage((currentField.selectedImageWidth || IMAGE_DEFAULT_WIDTH) - 20)}
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => currentField.resizeSelectedImage((currentField.selectedImageWidth || IMAGE_DEFAULT_WIDTH) + 20)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <div className="flex items-center gap-2 min-w-[170px]">
            <input
              type="range"
              min={IMAGE_MIN_WIDTH}
              max={IMAGE_MAX_WIDTH}
              step={10}
              value={currentField.selectedImageWidth || IMAGE_DEFAULT_WIDTH}
              onChange={(e) => currentField.resizeSelectedImage(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <span className="text-xs text-muted-foreground w-12 text-right">{currentField.selectedImageWidth || IMAGE_DEFAULT_WIDTH}px</span>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={currentField.removeSelectedImage}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Enunciado / Questão</label>
        <div className="relative">
          {questionField.isEmpty && (
            <span className="pointer-events-none absolute left-3 top-2.5 text-sm text-muted-foreground">
              Escreva o enunciado do exercício...
            </span>
          )}
          <div
            ref={questionField.editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={questionField.syncEditorContent}
            onMouseUp={questionField.rememberSelection}
            onKeyUp={questionField.rememberSelection}
            onBlur={questionField.rememberSelection}
            onFocus={focusQuestion}
            onClick={(e) => {
              focusQuestion();
              questionField.handleEditorClick(e);
            }}
            className="note-editor min-h-[110px] rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Resolução passo a passo</label>
        <div className="relative">
          {resolutionField.isEmpty && (
            <span className="pointer-events-none absolute left-3 top-2.5 text-sm text-muted-foreground">
              Descreva os passos da resolução...
            </span>
          )}
          <div
            ref={resolutionField.editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={resolutionField.syncEditorContent}
            onMouseUp={resolutionField.rememberSelection}
            onKeyUp={resolutionField.rememberSelection}
            onBlur={resolutionField.rememberSelection}
            onFocus={focusResolution}
            onClick={(e) => {
              focusResolution();
              resolutionField.handleEditorClick(e);
            }}
            className="note-editor min-h-[90px] rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
        </div>
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
          variant={result === "correct" ? "default" : "outline"}
          size="sm"
          className={`gap-1 ${result === "correct" ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
          onClick={() => setResult(result === "correct" ? null : "correct")}
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> Acertei
        </Button>
        <Button
          variant={result === "incorrect" ? "default" : "outline"}
          size="sm"
          className={`gap-1 ${result === "incorrect" ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" : ""}`}
          onClick={() => setResult(result === "incorrect" ? null : "incorrect")}
        >
          <XCircle className="h-3.5 w-3.5" /> Errei
        </Button>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" onClick={handleSave} disabled={!title.trim() && questionField.isEmpty && resolutionField.isEmpty && !answer.trim()}>
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
