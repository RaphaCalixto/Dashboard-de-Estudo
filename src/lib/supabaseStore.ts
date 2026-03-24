import { supabase } from "@/integrations/supabase/client";
import type { StudyNote, ExerciseNote, SubTopicData, ExamResult, ExamQuestion } from "./studyStore";

export interface ExamStudyMaterial {
  id: string;
  subtopicId: string;
  type: "theory" | "exercise";
  title: string;
  content: string;
  question: string;
  resolution: string;
  answer: string;
  updatedAt: string;
}

// ---- Notes (theory) ----

export async function fetchTheoryNotes(subjectId: string, subtopicId: string): Promise<StudyNote[]> {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("subject_id", subjectId)
    .eq("subtopic_id", subtopicId)
    .eq("type", "theory")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map((r: any) => ({
    id: r.id,
    title: r.title,
    content: r.content,
    images: r.images || [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function insertTheoryNote(subjectId: string, subtopicId: string, note: StudyNote) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("notes").insert({
    user_id: user.id,
    subject_id: subjectId,
    subtopic_id: subtopicId,
    type: "theory",
    title: note.title,
    content: note.content,
    images: note.images,
  });
  if (error) throw error;
}

export async function updateTheoryNoteDb(noteId: string, updates: Partial<StudyNote>) {
  const payload: any = { updated_at: new Date().toISOString() };
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.content !== undefined) payload.content = updates.content;
  if (updates.images !== undefined) payload.images = updates.images;

  const { error } = await supabase.from("notes").update(payload).eq("id", noteId);
  if (error) throw error;
}

export async function deleteNoteDb(noteId: string) {
  const { error } = await supabase.from("notes").delete().eq("id", noteId);
  if (error) throw error;
}

// ---- Exercises ----

export async function fetchExercises(subjectId: string, subtopicId: string): Promise<ExerciseNote[]> {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("subject_id", subjectId)
    .eq("subtopic_id", subtopicId)
    .eq("type", "exercise")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []).map((r: any) => ({
    id: r.id,
    title: r.title,
    question: r.question,
    resolution: r.resolution,
    answer: r.answer,
    images: r.images || [],
    result: r.result,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function insertExercise(subjectId: string, subtopicId: string, exercise: ExerciseNote) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("notes").insert({
    user_id: user.id,
    subject_id: subjectId,
    subtopic_id: subtopicId,
    type: "exercise",
    title: exercise.title,
    question: exercise.question,
    resolution: exercise.resolution,
    answer: exercise.answer,
    images: exercise.images,
    result: exercise.result,
  });
  if (error) throw error;
}

export async function updateExerciseDb(exerciseId: string, updates: Partial<ExerciseNote>) {
  const payload: any = { updated_at: new Date().toISOString() };
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.question !== undefined) payload.question = updates.question;
  if (updates.resolution !== undefined) payload.resolution = updates.resolution;
  if (updates.answer !== undefined) payload.answer = updates.answer;
  if (updates.images !== undefined) payload.images = updates.images;
  if (updates.result !== undefined) payload.result = updates.result;

  const { error } = await supabase.from("notes").update(payload).eq("id", exerciseId);
  if (error) throw error;
}

// ---- Subtopic data (combined) ----

export async function fetchSubTopicData(subjectId: string, subtopicId: string): Promise<SubTopicData> {
  const [theory, exercises] = await Promise.all([
    fetchTheoryNotes(subjectId, subtopicId),
    fetchExercises(subjectId, subtopicId),
  ]);
  return { theory, exercises };
}

export async function fetchExamStudyMaterials(subjectId: string, subtopicIds: string[]): Promise<ExamStudyMaterial[]> {
  let query = supabase
    .from("notes")
    .select("id, subtopic_id, type, title, content, question, resolution, answer, updated_at")
    .eq("subject_id", subjectId)
    .order("updated_at", { ascending: false })
    .limit(400);

  if (subtopicIds.length > 0) {
    query = query.in("subtopic_id", subtopicIds);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((row: any) => ({
    id: row.id,
    subtopicId: row.subtopic_id,
    type: row.type === "exercise" ? "exercise" : "theory",
    title: row.title || "",
    content: row.content || "",
    question: row.question || "",
    resolution: row.resolution || "",
    answer: row.answer || "",
    updatedAt: row.updated_at || "",
  }));
}

// ---- Search ----

export async function searchNotesDb(subjectId: string, query: string) {
  const q = `%${query}%`;
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("subject_id", subjectId)
    .or(`title.ilike.${q},content.ilike.${q},question.ilike.${q},answer.ilike.${q}`);

  if (error) throw error;
  return (data || []).map((r: any) => ({
    subtopicId: r.subtopic_id,
    type: r.type as "theory" | "exercise",
    item: r.type === "theory"
      ? { id: r.id, title: r.title, content: r.content, images: r.images || [], createdAt: r.created_at, updatedAt: r.updated_at }
      : { id: r.id, title: r.title, question: r.question, resolution: r.resolution, answer: r.answer, images: r.images || [], result: r.result, createdAt: r.created_at, updatedAt: r.updated_at },
  }));
}

// ---- Exercise stats ----

export async function getExerciseStatsDb(subjectId: string, subtopicId?: string) {
  let query = supabase
    .from("notes")
    .select("result")
    .eq("subject_id", subjectId)
    .eq("type", "exercise");

  if (subtopicId) query = query.eq("subtopic_id", subtopicId);

  const { data, error } = await query;
  if (error) throw error;

  const exercises = data || [];
  return {
    total: exercises.length,
    correct: exercises.filter((e: any) => e.result === "correct").length,
    incorrect: exercises.filter((e: any) => e.result === "incorrect").length,
    pending: exercises.filter((e: any) => e.result === null).length,
  };
}

// ---- Exam results ----

export async function fetchExamResults(): Promise<ExamResult[]> {
  const { data, error } = await supabase
    .from("exam_results")
    .select("*")
    .order("completed_at", { ascending: false });

  if (error) throw error;
  return (data || []).map((r: any) => ({
    id: r.id,
    subjectId: r.subject_id,
    subtopicIds: r.subtopic_ids || [],
    questions: r.questions as ExamQuestion[],
    timeLimit: r.time_limit,
    timeUsed: r.time_used,
    completedAt: r.completed_at,
  }));
}

export async function saveExamResultDb(result: ExamResult) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase.from("exam_results").insert({
    user_id: user.id,
    subject_id: result.subjectId,
    subtopic_ids: result.subtopicIds,
    questions: result.questions as any,
    time_limit: result.timeLimit,
    time_used: result.timeUsed,
  });
  if (error) throw error;
}
