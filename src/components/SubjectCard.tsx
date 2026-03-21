import { useNavigate } from "react-router-dom";
import type { Subject } from "@/lib/subjects";

export function SubjectCard({ subject }: { subject: Subject }) {
  const navigate = useNavigate();
  const Icon = subject.icon;

  return (
    <button
      onClick={() => navigate(`/materia/${subject.id}`)}
      className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 text-left transition-all hover:shadow-lg hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-ring"
    >
      <div className={`absolute top-0 left-0 h-1.5 w-full ${subject.colorClass}`} />
      <div className="flex items-start gap-4">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${subject.colorClass} text-white`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
            {subject.name}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{subject.description}</p>
          <p className="mt-2 text-xs font-medium text-muted-foreground">
            {subject.subtopics.length} subtópicos
          </p>
        </div>
      </div>
    </button>
  );
}
