import { useState, useCallback, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, BookOpen, Dumbbell, Search, FlaskConical, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { subjects } from "@/lib/subjects";
import { generateId, type StudyNote, type ExerciseNote, type SubTopicData } from "@/lib/studyStore";
import {
  fetchSubTopicData,
  insertTheoryNote,
  updateTheoryNoteDb,
  deleteNoteDb,
  insertExercise,
  updateExerciseDb,
  searchNotesDb,
} from "@/lib/supabaseStore";
import { allFormulas } from "@/lib/formulas";
import { NoteEditor } from "@/components/NoteEditor";
import { NoteCard } from "@/components/NoteCard";
import { ExerciseEditor } from "@/components/ExerciseEditor";
import { ExerciseCard } from "@/components/ExerciseCard";
import { FormulasList } from "@/components/FormulasList";
import { toast } from "sonner";

export default function SubjectPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const subject = subjects.find((s) => s.id === id);

  const [selectedSubtopic, setSelectedSubtopic] = useState<string | null>(null);
  const [addingTheory, setAddingTheory] = useState(false);
  const [addingExercise, setAddingExercise] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [subtopicData, setSubtopicData] = useState<SubTopicData | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    if (!subject || !selectedSubtopic) return;
    setLoading(true);
    try {
      const data = await fetchSubTopicData(subject.id, selectedSubtopic);
      setSubtopicData(data);
    } catch (err) {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [subject, selectedSubtopic]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Search
  useEffect(() => {
    if (!subject || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      try {
        const results = await searchNotesDb(subject.id, searchQuery);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [subject, searchQuery]);

  if (!subject) {
    navigate("/");
    return null;
  }

  const showMathTools = ["matematica", "fisica", "quimica", "logica"].includes(subject.id);
  const hasFormulas = allFormulas.some((f) => f.subjectId === subject.id);
  const Icon = subject.icon;
  const currentSubtopic = subject.subtopics.find((s) => s.id === selectedSubtopic);

  const handleAddTheory = async (title: string, content: string, images: string[]) => {
    if (!selectedSubtopic) return;
    const note: StudyNote = {
      id: generateId(),
      title,
      content,
      images,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await insertTheoryNote(subject.id, selectedSubtopic, note);
      setAddingTheory(false);
      await loadData();
    } catch (err) {
      toast.error("Erro ao salvar anotação");
    }
  };

  const handleAddExercise = async (data: Omit<ExerciseNote, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!selectedSubtopic) return;
    const exercise: ExerciseNote = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await insertExercise(subject.id, selectedSubtopic, exercise);
      setAddingExercise(false);
      await loadData();
    } catch (err) {
      toast.error("Erro ao salvar exercício");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className={`${subject.colorClass} px-4 py-6 sm:px-8`}>
        <div className="mx-auto max-w-5xl">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => selectedSubtopic ? setSelectedSubtopic(null) : navigate("/")}
            className="mb-3 text-white/80 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" /> {selectedSubtopic ? subject.name : "Voltar"}
          </Button>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-xl font-bold text-white sm:text-2xl">{subject.name}</h1>
                {currentSubtopic && (
                  <>
                    <ChevronRight className="h-4 w-4 text-white/60" />
                    <span className="text-white/90 font-medium text-lg">{currentSubtopic.name}</span>
                  </>
                )}
              </div>
              <p className="text-sm text-white/75">{subject.description}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-white/80 hover:text-white hover:bg-white/10"
              onClick={() => { setShowSearch(!showSearch); setSearchQuery(""); }}
            >
              <Search className="h-5 w-5" />
            </Button>
          </div>
          {showSearch && (
            <div className="mt-3">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar anotações e exercícios..."
                className="bg-white/10 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-white/30"
                autoFocus
              />
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-8">
        {/* Search results */}
        {searchQuery.trim() && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">
              {searchResults.length} resultado(s) para "{searchQuery}"
            </h2>
            {searchResults.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum resultado encontrado</p>
            )}
            <div className="space-y-3">
              {searchResults.map((r: any) => {
                const st = subject.subtopics.find((s) => s.id === r.subtopicId);
                return (
                  <div
                    key={r.item.id}
                    className="rounded-lg border border-border bg-card p-3 cursor-pointer hover:shadow-sm transition-shadow"
                    onClick={() => {
                      setSelectedSubtopic(r.subtopicId);
                      setSearchQuery("");
                      setShowSearch(false);
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">{st?.name}</Badge>
                      <Badge variant="secondary" className="text-xs">{r.type === 'theory' ? 'Teoria' : 'Exercício'}</Badge>
                    </div>
                    <p className="font-medium text-sm text-foreground">{r.item.title}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {'content' in r.item ? r.item.content : r.item.question}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Subtopics grid */}
        {!selectedSubtopic && !searchQuery.trim() && (
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground mb-4">Subtópicos</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {subject.subtopics.map((st) => (
                <button
                  key={st.id}
                  onClick={() => setSelectedSubtopic(st.id)}
                  className="rounded-xl border border-border bg-card p-4 text-left hover:shadow-md transition-all hover:border-primary/30 group"
                >
                  <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">{st.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Clique para ver anotações e exercícios</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Subtopic content */}
        {selectedSubtopic && !searchQuery.trim() && (
          <Tabs defaultValue="theory" className="w-full">
            <TabsList className="mb-6 w-full sm:w-auto">
              <TabsTrigger value="theory" className="gap-1.5">
                <BookOpen className="h-4 w-4" /> Teoria
              </TabsTrigger>
              <TabsTrigger value="exercises" className="gap-1.5">
                <Dumbbell className="h-4 w-4" /> Exercícios
              </TabsTrigger>
              {hasFormulas && (
                <TabsTrigger value="formulas" className="gap-1.5">
                  <FlaskConical className="h-4 w-4" /> Fórmulas
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="theory" className="space-y-4">
              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : (
                <>
                  {addingTheory ? (
                    <NoteEditor
                      showMathTools={showMathTools}
                      onSave={handleAddTheory}
                      onCancel={() => setAddingTheory(false)}
                    />
                  ) : (
                    <Button variant="outline" className="w-full border-dashed gap-2" onClick={() => setAddingTheory(true)}>
                      <Plus className="h-4 w-4" /> Nova anotação de teoria
                    </Button>
                  )}

                  {subtopicData?.theory.length === 0 && !addingTheory && (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                      <BookOpen className="h-12 w-12 mb-3 opacity-30" />
                      <p className="text-sm">Nenhuma anotação ainda</p>
                    </div>
                  )}

                  {subtopicData?.theory.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      showMathTools={showMathTools}
                      onUpdate={async (title, content, images) => {
                        try {
                          await updateTheoryNoteDb(note.id, { title, content, images });
                          await loadData();
                        } catch { toast.error("Erro ao atualizar"); }
                      }}
                      onDelete={async () => {
                        try {
                          await deleteNoteDb(note.id);
                          await loadData();
                        } catch { toast.error("Erro ao deletar"); }
                      }}
                    />
                  ))}
                </>
              )}
            </TabsContent>

            <TabsContent value="exercises" className="space-y-4">
              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : (
                <>
                  {addingExercise ? (
                    <ExerciseEditor
                      showMathTools={showMathTools}
                      onSave={handleAddExercise}
                      onCancel={() => setAddingExercise(false)}
                    />
                  ) : (
                    <Button variant="outline" className="w-full border-dashed gap-2" onClick={() => setAddingExercise(true)}>
                      <Plus className="h-4 w-4" /> Novo exercício
                    </Button>
                  )}

                  {subtopicData?.exercises.length === 0 && !addingExercise && (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                      <Dumbbell className="h-12 w-12 mb-3 opacity-30" />
                      <p className="text-sm">Nenhum exercício ainda</p>
                    </div>
                  )}

                  {subtopicData?.exercises.map((ex) => (
                    <ExerciseCard
                      key={ex.id}
                      exercise={ex}
                      showMathTools={showMathTools}
                      onUpdate={async (updates) => {
                        try {
                          await updateExerciseDb(ex.id, updates);
                          await loadData();
                        } catch { toast.error("Erro ao atualizar"); }
                      }}
                      onDelete={async () => {
                        try {
                          await deleteNoteDb(ex.id);
                          await loadData();
                        } catch { toast.error("Erro ao deletar"); }
                      }}
                    />
                  ))}
                </>
              )}
            </TabsContent>

            {hasFormulas && (
              <TabsContent value="formulas">
                <FormulasList subjectId={subject.id} />
              </TabsContent>
            )}
          </Tabs>
        )}
      </main>
    </div>
  );
}
