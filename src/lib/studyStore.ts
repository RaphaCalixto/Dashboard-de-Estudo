export interface StudyNote {
  id: string;
  title: string;
  content: string;
  images: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ExerciseNote {
  id: string;
  title: string;
  question: string;
  resolution: string;
  answer: string;
  images: string[];
  result: 'correct' | 'incorrect' | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubTopicData {
  theory: StudyNote[];
  exercises: ExerciseNote[];
}

export interface SubjectData {
  // key is subtopicId
  subtopics: Record<string, SubTopicData>;
}

const STORAGE_KEY = 'study-system-data-v2';

function getAll(): Record<string, SubjectData> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAll(data: Record<string, SubjectData>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function ensureSubtopic(all: Record<string, SubjectData>, subjectId: string, subtopicId: string): SubTopicData {
  if (!all[subjectId]) {
    all[subjectId] = { subtopics: {} };
  }
  if (!all[subjectId].subtopics[subtopicId]) {
    all[subjectId].subtopics[subtopicId] = { theory: [], exercises: [] };
  }
  return all[subjectId].subtopics[subtopicId];
}

export function getSubTopicData(subjectId: string, subtopicId: string): SubTopicData {
  const all = getAll();
  ensureSubtopic(all, subjectId, subtopicId);
  saveAll(all);
  return all[subjectId].subtopics[subtopicId];
}

// Theory notes
export function addTheoryNote(subjectId: string, subtopicId: string, note: StudyNote) {
  const all = getAll();
  const data = ensureSubtopic(all, subjectId, subtopicId);
  data.theory.push(note);
  saveAll(all);
}

export function updateTheoryNote(subjectId: string, subtopicId: string, noteId: string, updates: Partial<StudyNote>) {
  const all = getAll();
  const data = ensureSubtopic(all, subjectId, subtopicId);
  const note = data.theory.find((n) => n.id === noteId);
  if (note) {
    Object.assign(note, updates, { updatedAt: new Date().toISOString() });
  }
  saveAll(all);
}

export function deleteTheoryNote(subjectId: string, subtopicId: string, noteId: string) {
  const all = getAll();
  const data = ensureSubtopic(all, subjectId, subtopicId);
  data.theory = data.theory.filter((n) => n.id !== noteId);
  saveAll(all);
}

// Exercise notes
export function addExercise(subjectId: string, subtopicId: string, exercise: ExerciseNote) {
  const all = getAll();
  const data = ensureSubtopic(all, subjectId, subtopicId);
  data.exercises.push(exercise);
  saveAll(all);
}

export function updateExercise(subjectId: string, subtopicId: string, exerciseId: string, updates: Partial<ExerciseNote>) {
  const all = getAll();
  const data = ensureSubtopic(all, subjectId, subtopicId);
  const ex = data.exercises.find((e) => e.id === exerciseId);
  if (ex) {
    Object.assign(ex, updates, { updatedAt: new Date().toISOString() });
  }
  saveAll(all);
}

export function deleteExercise(subjectId: string, subtopicId: string, exerciseId: string) {
  const all = getAll();
  const data = ensureSubtopic(all, subjectId, subtopicId);
  data.exercises = data.exercises.filter((e) => e.id !== exerciseId);
  saveAll(all);
}

// Search across all notes
export function searchNotes(subjectId: string, query: string): { subtopicId: string; type: 'theory' | 'exercise'; item: StudyNote | ExerciseNote }[] {
  const all = getAll();
  const subject = all[subjectId];
  if (!subject) return [];
  const q = query.toLowerCase();
  const results: { subtopicId: string; type: 'theory' | 'exercise'; item: StudyNote | ExerciseNote }[] = [];
  
  for (const [subtopicId, data] of Object.entries(subject.subtopics)) {
    for (const note of data.theory) {
      if (note.title.toLowerCase().includes(q) || note.content.toLowerCase().includes(q)) {
        results.push({ subtopicId, type: 'theory', item: note });
      }
    }
    for (const ex of data.exercises) {
      if (ex.title.toLowerCase().includes(q) || ex.question.toLowerCase().includes(q) || ex.answer.toLowerCase().includes(q)) {
        results.push({ subtopicId, type: 'exercise', item: ex });
      }
    }
  }
  return results;
}

// Stats
export function getExerciseStats(subjectId: string, subtopicId?: string): { total: number; correct: number; incorrect: number; pending: number } {
  const all = getAll();
  const subject = all[subjectId];
  if (!subject) return { total: 0, correct: 0, incorrect: 0, pending: 0 };
  
  let exercises: ExerciseNote[] = [];
  if (subtopicId) {
    exercises = subject.subtopics[subtopicId]?.exercises || [];
  } else {
    for (const data of Object.values(subject.subtopics)) {
      exercises.push(...data.exercises);
    }
  }
  
  return {
    total: exercises.length,
    correct: exercises.filter((e) => e.result === 'correct').length,
    incorrect: exercises.filter((e) => e.result === 'incorrect').length,
    pending: exercises.filter((e) => e.result === null).length,
  };
}

// Exam store
export interface ExamQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  userAnswer: number | null;
}

export interface ExamResult {
  id: string;
  subjectId: string;
  subtopicIds: string[];
  questions: ExamQuestion[];
  timeLimit: number; // seconds
  timeUsed: number;
  completedAt: string;
}

const EXAM_KEY = 'study-system-exams';

export function getExamResults(): ExamResult[] {
  try {
    const raw = localStorage.getItem(EXAM_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveExamResult(result: ExamResult) {
  const results = getExamResults();
  results.unshift(result);
  localStorage.setItem(EXAM_KEY, JSON.stringify(results));
}

export function generateId() {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}
