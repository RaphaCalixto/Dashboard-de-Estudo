import { generateId } from "@/lib/studyStore";

export interface CustomSubtopic {
  id: string;
  name: string;
  showFormulas: boolean;
  createdAt: string;
}

type Store = Record<string, CustomSubtopic[]>;

const STORAGE_KEY = "study-custom-subtopics-v1";

function readStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

export function getCustomSubtopics(subjectId: string): CustomSubtopic[] {
  const store = readStore();
  return store[subjectId] || [];
}

export function addCustomSubtopic(subjectId: string, name: string, showFormulas: boolean): CustomSubtopic {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error("Informe um nome para o subtópico");
  }

  const store = readStore();
  const items = store[subjectId] || [];
  const alreadyExists = items.some((item) => normalizeName(item.name) === normalizeName(trimmed));
  if (alreadyExists) {
    throw new Error("Já existe um subtópico com esse nome");
  }

  const baseSlug = slugify(trimmed) || "subtopico";
  const newSubtopic: CustomSubtopic = {
    id: `custom-${baseSlug}-${generateId().slice(-6)}`,
    name: trimmed,
    showFormulas,
    createdAt: new Date().toISOString(),
  };

  store[subjectId] = [newSubtopic, ...items];
  writeStore(store);
  return newSubtopic;
}

