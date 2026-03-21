import { useState } from "react";
import { Pencil, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NoteEditor } from "./NoteEditor";
import type { StudyNote } from "@/lib/studyStore";

interface NoteCardProps {
  note: StudyNote;
  showMathTools?: boolean;
  onUpdate: (title: string, content: string, images: string[]) => void;
  onDelete: () => void;
}

export function NoteCard({ note, showMathTools, onUpdate, onDelete }: NoteCardProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <NoteEditor
        note={note}
        showMathTools={showMathTools}
        onSave={(title, content, images) => { onUpdate(title, content, images); setEditing(false); }}
        onCancel={() => setEditing(false)}
        onDelete={() => { onDelete(); setEditing(false); }}
      />
    );
  }

  const date = new Date(note.updatedAt || note.createdAt);

  return (
    <div className="group rounded-xl border border-border bg-card p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {note.title && (
            <h3 className="font-semibold text-foreground mb-1 truncate">{note.title}</h3>
          )}
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{note.content}</p>
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
      {note.images.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {note.images.map((img, i) => (
            <img key={i} src={img} alt={`Anexo ${i + 1}`} className="h-28 w-auto rounded-lg border border-border object-cover" />
          ))}
        </div>
      )}
      <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" />
        {date.toLocaleDateString("pt-BR")} às {date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
      </div>
    </div>
  );
}
