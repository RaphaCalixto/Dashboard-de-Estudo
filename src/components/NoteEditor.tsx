import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ImagePlus, Save, X } from "lucide-react";
import { MathSymbolPicker } from "./MathSymbolPicker";
import { SimpleCalculator } from "./SimpleCalculator";
import type { StudyNote } from "@/lib/studyStore";

interface NoteEditorProps {
  note?: StudyNote;
  showMathTools?: boolean;
  onSave: (title: string, content: string, images: string[]) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export function NoteEditor({ note, showMathTools, onSave, onCancel, onDelete }: NoteEditorProps) {
  const [title, setTitle] = useState(note?.title || "");
  const [content, setContent] = useState(note?.content || "");
  const [images, setImages] = useState<string[]>(note?.images || []);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const insertSymbol = (symbol: string) => {
    const el = textareaRef.current;
    if (!el) { setContent((c) => c + symbol); return; }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newContent = content.slice(0, start) + symbol + content.slice(end);
    setContent(newContent);
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

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título / Assunto..."
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

      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Escreva suas anotações aqui..."
        className="min-h-[150px] resize-y font-sans text-sm"
      />

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
        <Button size="sm" onClick={() => onSave(title, content, images)} disabled={!title.trim() && !content.trim() && images.length === 0}>
          <Save className="h-4 w-4 mr-1.5" /> Salvar
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        {onDelete && (
          <Button variant="ghost" size="sm" className="ml-auto text-destructive hover:text-destructive" onClick={onDelete}>
            Excluir
          </Button>
        )}
      </div>
    </div>
  );
}
