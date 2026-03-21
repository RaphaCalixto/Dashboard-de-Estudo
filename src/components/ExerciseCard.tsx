import { useState } from "react";
import { Pencil, Trash2, Clock, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExerciseEditor } from "./ExerciseEditor";
import type { ExerciseNote } from "@/lib/studyStore";

interface ExerciseCardProps {
  exercise: ExerciseNote;
  showMathTools?: boolean;
  onUpdate: (data: Partial<ExerciseNote>) => void;
  onDelete: () => void;
}

export function ExerciseCard({ exercise, showMathTools, onUpdate, onDelete }: ExerciseCardProps) {
  const [editing, setEditing] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);
  const [showResolution, setShowResolution] = useState(false);

  if (editing) {
    return (
      <ExerciseEditor
        exercise={exercise}
        showMathTools={showMathTools}
        onSave={(data) => { onUpdate(data); setEditing(false); }}
        onCancel={() => setEditing(false)}
        onDelete={() => { onDelete(); setEditing(false); }}
      />
    );
  }

  const date = new Date(exercise.updatedAt || exercise.createdAt);
  const resultColor = exercise.result === 'correct' ? 'text-green-600' : exercise.result === 'incorrect' ? 'text-destructive' : '';
  const resultBorder = exercise.result === 'correct' ? 'border-green-200' : exercise.result === 'incorrect' ? 'border-red-200' : 'border-border';

  return (
    <div className={`group rounded-xl border ${resultBorder} bg-card p-4 transition-shadow hover:shadow-md`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {exercise.result === 'correct' && <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />}
            {exercise.result === 'incorrect' && <XCircle className="h-4 w-4 text-destructive shrink-0" />}
            {exercise.title && (
              <h3 className="font-semibold text-foreground truncate">{exercise.title}</h3>
            )}
          </div>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{exercise.question}</p>
        </div>
        <div className="flex shrink-0 gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {exercise.images.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {exercise.images.map((img, i) => (
            <img key={i} src={img} alt={`Anexo ${i + 1}`} className="h-28 w-auto rounded-lg border border-border object-cover" />
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {exercise.resolution && (
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setShowResolution(!showResolution)}>
            {showResolution ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {showResolution ? "Ocultar resolução" : "Ver resolução"}
          </Button>
        )}
        {exercise.answer && (
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => setShowAnswer(!showAnswer)}>
            {showAnswer ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {showAnswer ? "Ocultar resposta" : "Ver resposta"}
          </Button>
        )}
        {!exercise.result && (
          <div className="flex gap-1 ml-auto">
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-xs text-green-600 hover:bg-green-50"
              onClick={() => onUpdate({ result: 'correct' })}
            >
              <CheckCircle2 className="h-3 w-3" /> Acertei
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-xs text-destructive hover:bg-red-50"
              onClick={() => onUpdate({ result: 'incorrect' })}
            >
              <XCircle className="h-3 w-3" /> Errei
            </Button>
          </div>
        )}
        {exercise.result && (
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 text-xs ml-auto"
            onClick={() => onUpdate({ result: null })}
          >
            Resetar resultado
          </Button>
        )}
      </div>

      {showResolution && exercise.resolution && (
        <div className="mt-3 rounded-lg bg-muted p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">Resolução:</p>
          <p className="whitespace-pre-wrap text-sm text-foreground">{exercise.resolution}</p>
        </div>
      )}

      {showAnswer && exercise.answer && (
        <div className="mt-2 rounded-lg bg-primary/5 border border-primary/10 p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">Resposta:</p>
          <p className="text-sm font-medium text-foreground">{exercise.answer}</p>
        </div>
      )}

      <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        {date.toLocaleDateString("pt-BR")} às {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
      </div>
    </div>
  );
}
