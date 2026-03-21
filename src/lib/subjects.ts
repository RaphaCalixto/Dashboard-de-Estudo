import { Calculator, BookOpen, Atom, FlaskConical, Leaf, Brain, PenTool, type LucideIcon } from "lucide-react";

export interface SubTopic {
  id: string;
  name: string;
}

export interface Subject {
  id: string;
  name: string;
  icon: LucideIcon;
  colorClass: string;
  description: string;
  subtopics: SubTopic[];
}

export const subjects: Subject[] = [
  {
    id: "matematica",
    name: "Matemática",
    icon: Calculator,
    colorClass: "subject-math",
    description: "Álgebra, Geometria, Cálculo",
    subtopics: [
      { id: "algebra", name: "Álgebra" },
      { id: "geometria", name: "Geometria" },
      { id: "funcoes", name: "Funções" },
      { id: "trigonometria", name: "Trigonometria" },
      { id: "estatistica", name: "Estatística" },
      { id: "porcentagem", name: "Porcentagem" },
      { id: "regra-de-tres", name: "Regra de Três" },
      { id: "juros", name: "Juros Simples e Compostos" },
      { id: "equacoes", name: "Equações" },
      { id: "razao-proporcao", name: "Razão e Proporção" },
    ],
  },
  {
    id: "portugues",
    name: "Português",
    icon: BookOpen,
    colorClass: "subject-portuguese",
    description: "Gramática, Literatura, Interpretação",
    subtopics: [
      { id: "gramatica", name: "Gramática" },
      { id: "literatura", name: "Literatura" },
      { id: "interpretacao", name: "Interpretação de Texto" },
      { id: "ortografia", name: "Ortografia" },
      { id: "sintaxe", name: "Sintaxe" },
      { id: "morfologia", name: "Morfologia" },
    ],
  },
  {
    id: "fisica",
    name: "Física",
    icon: Atom,
    colorClass: "subject-physics",
    description: "Mecânica, Óptica, Eletricidade",
    subtopics: [
      { id: "mecanica", name: "Mecânica" },
      { id: "optica", name: "Óptica" },
      { id: "eletricidade", name: "Eletricidade" },
      { id: "termodinamica", name: "Termodinâmica" },
      { id: "ondas", name: "Ondas" },
      { id: "cinematica", name: "Cinemática" },
      { id: "dinamica", name: "Dinâmica" },
    ],
  },
  {
    id: "quimica",
    name: "Química",
    icon: FlaskConical,
    colorClass: "subject-chemistry",
    description: "Orgânica, Inorgânica, Físico-Química",
    subtopics: [
      { id: "organica", name: "Orgânica" },
      { id: "inorganica", name: "Inorgânica" },
      { id: "fisico-quimica", name: "Físico-Química" },
      { id: "estequiometria", name: "Estequiometria" },
      { id: "solucoes", name: "Soluções" },
      { id: "eletroquimica", name: "Eletroquímica" },
    ],
  },
  {
    id: "biologia",
    name: "Biologia",
    icon: Leaf,
    colorClass: "subject-biology",
    description: "Genética, Ecologia, Citologia",
    subtopics: [
      { id: "genetica", name: "Genética" },
      { id: "ecologia", name: "Ecologia" },
      { id: "citologia", name: "Citologia" },
      { id: "fisiologia", name: "Fisiologia" },
      { id: "evolucao", name: "Evolução" },
      { id: "botanica", name: "Botânica" },
      { id: "zoologia", name: "Zoologia" },
    ],
  },
  {
    id: "logica",
    name: "Raciocínio Lógico",
    icon: Brain,
    colorClass: "subject-logic",
    description: "Proposições, Sequências, Lógica",
    subtopics: [
      { id: "proposicoes", name: "Lógica Proposicional" },
      { id: "sequencias", name: "Sequências Lógicas" },
      { id: "tabelas-graficos", name: "Tabelas e Gráficos" },
      { id: "raciocinio-analitico", name: "Raciocínio Analítico" },
      { id: "problemas-logicos", name: "Problemas Lógicos" },
    ],
  },
  {
    id: "redacao",
    name: "Redação",
    icon: PenTool,
    colorClass: "subject-writing",
    description: "Dissertação, Argumentação, Coesão",
    subtopics: [
      { id: "dissertacao", name: "Dissertação" },
      { id: "argumentacao", name: "Argumentação" },
      { id: "coesao", name: "Coesão e Coerência" },
      { id: "generos-textuais", name: "Gêneros Textuais" },
    ],
  },
];
