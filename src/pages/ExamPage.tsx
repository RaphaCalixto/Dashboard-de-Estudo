import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Clock, Play, CheckCircle2, XCircle, Trophy, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { subjects } from "@/lib/subjects";
import { generateId, type ExamQuestion, type ExamResult } from "@/lib/studyStore";
import { fetchExamResults, saveExamResultDb } from "@/lib/supabaseStore";
import { getCustomSubtopics, type CustomSubtopic } from "@/lib/customSubtopicsStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ExamPhase = 'setup' | 'loading' | 'running' | 'result';

export default function ExamPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<ExamPhase>('setup');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [numQuestions, setNumQuestions] = useState(10);
  const [timeLimit, setTimeLimit] = useState(30);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [examResult, setExamResult] = useState<ExamResult | null>(null);
  const [pastResults, setPastResults] = useState<ExamResult[]>([]);
  const [customTopics, setCustomTopics] = useState<CustomSubtopic[]>([]);

  // Load past results
  useEffect(() => {
    fetchExamResults().then(setPastResults).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedSubject) {
      setCustomTopics([]);
      return;
    }
    setCustomTopics(getCustomSubtopics(selectedSubject));
  }, [selectedSubject]);

  // Timer
  useEffect(() => {
    if (phase !== 'running' || timeLeft <= 0) return;
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          finishExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase, timeLeft]);

  const startExam = async () => {
    if (!selectedSubject) return;

    const subjectObj = subjects.find((s) => s.id === selectedSubject);
    const subjectName = subjectObj?.name || selectedSubject;
    const availableTopics = [
      ...(subjectObj?.subtopics || []),
      ...customTopics.map((topic) => ({ id: topic.id, name: topic.name })),
    ];

    const topicNames = selectedTopics
      .map((tid) => availableTopics.find((st) => st.id === tid)?.name)
      .filter(Boolean);

    setPhase('loading');

    try {
      const { data, error } = await supabase.functions.invoke('generate-exam', {
        body: {
          subject: subjectName,
          subtopics: topicNames,
          numQuestions,
        },
      });

      if (error) {
        throw new Error(error.message || 'Erro ao gerar prova');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const generatedQuestions = data.questions;
      if (!generatedQuestions?.length) {
        throw new Error('Nenhuma questão foi gerada');
      }

      const examQs: ExamQuestion[] = generatedQuestions.map((q: { question: string; options: string[]; correctIndex: number }) => ({
        id: generateId(),
        question: q.question,
        options: q.options,
        correctIndex: q.correctIndex,
        userAnswer: null,
      }));

      setQuestions(examQs);
      setCurrentQ(0);
      setTimeLeft(timeLimit * 60);
      setPhase('running');
    } catch (err) {
      console.error('Error generating exam:', err);
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar prova. Tente novamente.');
      setPhase('setup');
    }
  };

  const answerQuestion = (optionIdx: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => (i === currentQ ? { ...q, userAnswer: optionIdx } : q))
    );
  };

  const finishExam = useCallback(async () => {
    const result: ExamResult = {
      id: generateId(),
      subjectId: selectedSubject!,
      subtopicIds: selectedTopics,
      questions,
      timeLimit: timeLimit * 60,
      timeUsed: timeLimit * 60 - timeLeft,
      completedAt: new Date().toISOString(),
    };
    try {
      await saveExamResultDb(result);
      const updated = await fetchExamResults();
      setPastResults(updated);
    } catch {
      // fallback: still show result
    }
    setExamResult(result);
    setPhase('result');
  }, [questions, selectedSubject, selectedTopics, timeLimit, timeLeft]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const subjectObj = selectedSubject ? subjects.find((s) => s.id === selectedSubject) : null;
  const availableTopics = [
    ...(subjectObj?.subtopics || []),
    ...customTopics.map((topic) => ({ id: topic.id, name: topic.name })),
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-4 py-4 sm:px-8">
        <div className="mx-auto max-w-4xl flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Voltar
          </Button>
          <h1 className="font-display text-xl font-bold text-foreground">🎯 Modo Prova</h1>
          {phase === 'running' && (
            <div className={`ml-auto flex items-center gap-2 font-mono text-lg font-bold ${timeLeft < 60 ? 'text-destructive animate-pulse' : 'text-foreground'}`}>
              <Clock className="h-5 w-5" />
              {formatTime(timeLeft)}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-8">
        {/* Loading phase */}
        {phase === 'loading' && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium text-foreground">Gerando sua prova com IA...</p>
            <p className="text-sm text-muted-foreground">Isso pode levar alguns segundos</p>
          </div>
        )}

        {/* Setup phase */}
        {phase === 'setup' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-lg font-semibold mb-3">Escolha a matéria</h2>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {subjects.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setSelectedSubject(s.id); setSelectedTopics([]); }}
                    className={`rounded-xl border p-3 text-left transition-all ${selectedSubject === s.id ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'border-border hover:border-primary/30'}`}
                  >
                    <div className="flex items-center gap-2">
                      <s.icon className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium text-sm">{s.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {selectedSubject && subjectObj && (
              <div>
                <h2 className="font-display text-lg font-semibold mb-3">Selecione os assuntos (opcional)</h2>
                <div className="flex flex-wrap gap-2">
                  {availableTopics.map((st) => (
                    <Badge
                      key={st.id}
                      variant={selectedTopics.includes(st.id) ? "default" : "outline"}
                      className="cursor-pointer text-sm py-1.5 px-3"
                      onClick={() =>
                        setSelectedTopics((prev) =>
                          prev.includes(st.id) ? prev.filter((t) => t !== st.id) : [...prev, st.id]
                        )
                      }
                    >
                      {st.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {selectedSubject && (
              <div className="flex flex-wrap gap-6">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Nº de questões</label>
                  <select
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(Number(e.target.value))}
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {[5, 10, 15, 20].map((n) => (
                      <option key={n} value={n}>{n} questões</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Tempo limite</label>
                  <select
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(Number(e.target.value))}
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {[10, 15, 20, 30, 45, 60].map((n) => (
                      <option key={n} value={n}>{n} minutos</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {selectedSubject && (
              <Button size="lg" className="gap-2" onClick={startExam}>
                <Play className="h-5 w-5" /> Iniciar Prova
              </Button>
            )}

            {/* Past results */}
            {pastResults.length > 0 && (
              <div>
                <h2 className="font-display text-lg font-semibold mb-3 mt-8">Provas anteriores</h2>
                <div className="space-y-2">
                  {pastResults.slice(0, 10).map((r) => {
                    const s = subjects.find((s) => s.id === r.subjectId);
                    const correct = r.questions.filter((q) => q.userAnswer === q.correctIndex).length;
                    return (
                      <button
                        key={r.id}
                        className="w-full rounded-lg border border-border bg-card p-3 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
                        onClick={() => {
                          setExamResult(r);
                          setPhase('result');
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{s?.name || r.subjectId}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(r.completedAt).toLocaleDateString("pt-BR")} — {correct}/{r.questions.length} acertos
                          </p>
                        </div>
                        <Badge variant={correct / r.questions.length >= 0.7 ? "default" : "destructive"}>
                          {Math.round((correct / r.questions.length) * 100)}%
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Running phase */}
        {phase === 'running' && questions.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">
                Questão {currentQ + 1} de {questions.length}
              </span>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <p className="text-lg font-medium text-foreground mb-6">{questions[currentQ].question}</p>
              <div className="space-y-3">
                {questions[currentQ].options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => answerQuestion(i)}
                    className={`w-full rounded-lg border p-4 text-left text-sm transition-all ${
                      questions[currentQ].userAnswer === i
                        ? 'border-primary bg-primary/10 ring-2 ring-primary/20 font-medium'
                        : 'border-border hover:border-primary/30 hover:bg-muted/50'
                    }`}
                  >
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium mr-3">
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" disabled={currentQ === 0} onClick={() => setCurrentQ((p) => p - 1)}>
                Anterior
              </Button>
              {currentQ < questions.length - 1 ? (
                <Button onClick={() => setCurrentQ((p) => p + 1)}>Próxima</Button>
              ) : (
                <Button onClick={finishExam} className="bg-green-600 hover:bg-green-700 text-white">
                  Finalizar Prova
                </Button>
              )}
              <span className="ml-auto text-xs text-muted-foreground">
                {questions.filter((q) => q.userAnswer !== null).length}/{questions.length} respondidas
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {questions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentQ(i)}
                  className={`h-8 w-8 rounded-md text-xs font-medium transition-colors ${
                    i === currentQ
                      ? 'bg-primary text-primary-foreground'
                      : q.userAnswer !== null
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Result phase */}
        {phase === 'result' && examResult && (
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <Trophy className="h-16 w-16 mx-auto mb-4 text-secondary" />
              <h2 className="text-2xl font-bold text-foreground">Prova Finalizada!</h2>
              <div className="mt-4 flex items-center justify-center gap-6">
                <div>
                  <p className="text-3xl font-bold text-green-600">
                    {examResult.questions.filter((q) => q.userAnswer === q.correctIndex).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Acertos</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-destructive">
                    {examResult.questions.filter((q) => q.userAnswer !== null && q.userAnswer !== q.correctIndex).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Erros</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-muted-foreground">
                    {examResult.questions.filter((q) => q.userAnswer === null).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Sem resposta</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Tempo: {formatTime(examResult.timeUsed)} de {formatTime(examResult.timeLimit)}
              </p>
            </div>

            <h3 className="font-semibold text-foreground">Revisão das questões</h3>
            <div className="space-y-3">
              {examResult.questions.map((q, i) => {
                const isCorrect = q.userAnswer === q.correctIndex;
                const answered = q.userAnswer !== null;
                return (
                  <div key={q.id} className={`rounded-lg border p-4 ${answered ? (isCorrect ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50') : 'border-border bg-muted/30'}`}>
                    <div className="flex items-start gap-2">
                      {answered ? (
                        isCorrect ? <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" /> : <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                      ) : (
                        <span className="h-5 w-5 shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{i + 1}. {q.question}</p>
                        <div className="mt-2 space-y-1">
                          {q.options.map((opt, oi) => (
                            <p
                              key={oi}
                              className={`text-sm ${
                                oi === q.correctIndex
                                  ? 'text-green-700 font-medium'
                                  : oi === q.userAnswer && oi !== q.correctIndex
                                    ? 'text-destructive line-through'
                                    : 'text-muted-foreground'
                              }`}
                            >
                              {String.fromCharCode(65 + oi)}) {opt}
                              {oi === q.correctIndex && ' ✓'}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3">
              <Button onClick={() => { setPhase('setup'); setExamResult(null); }} className="gap-2">
                <RotateCcw className="h-4 w-4" /> Nova Prova
              </Button>
              <Button variant="outline" onClick={() => navigate("/")}>
                Voltar ao início
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
