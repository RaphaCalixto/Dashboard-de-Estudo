import type { ExerciseNote, StudyNote } from "./studyStore";
import { looksLikeHtml, sanitizeNoteHtml } from "./richNoteContent";

interface DownloadSubtopicPdfParams {
  subjectName: string;
  subtopicName: string;
  theory: StudyNote[];
  exercises: ExerciseNote[];
}

function escapeHtml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderRichOrPlainText(content: string) {
  const trimmed = (content || "").trim();
  if (!trimmed) return "";
  if (looksLikeHtml(trimmed)) return sanitizeNoteHtml(trimmed);
  return `<p>${escapeHtml(trimmed).replace(/\n/g, "<br/>")}</p>`;
}

function formatDate(dateIso: string) {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("pt-BR");
}

function buildTheoryHtml(theory: StudyNote[]) {
  if (!theory.length) {
    return `<p class="empty">Nenhuma anotacao de teoria neste subtopico.</p>`;
  }

  return theory
    .map((note, index) => {
      const title = note.title.trim() || `Anotacao ${index + 1}`;
      const contentHtml = renderRichOrPlainText(note.content);
      return `
        <article class="entry">
          <header class="entry-header">
            <h3>${escapeHtml(title)}</h3>
            <p>Atualizado em ${escapeHtml(formatDate(note.updatedAt || note.createdAt))}</p>
          </header>
          <div class="entry-content">${contentHtml || "<p>-</p>"}</div>
        </article>
      `;
    })
    .join("");
}

function buildExercisesHtml(exercises: ExerciseNote[]) {
  if (!exercises.length) {
    return `<p class="empty">Nenhum exercicio neste subtopico.</p>`;
  }

  return exercises
    .map((exercise, index) => {
      const title = exercise.title.trim() || `Exercicio ${index + 1}`;
      const questionHtml = renderRichOrPlainText(exercise.question);
      const resolutionHtml = renderRichOrPlainText(exercise.resolution);
      const answerHtml = renderRichOrPlainText(exercise.answer);
      const status =
        exercise.result === "correct"
          ? "Status: Acertado"
          : exercise.result === "incorrect"
            ? "Status: Errado"
            : "Status: Sem marcacao";

      return `
        <article class="entry">
          <header class="entry-header">
            <h3>${escapeHtml(title)}</h3>
            <p>${escapeHtml(status)} - Atualizado em ${escapeHtml(formatDate(exercise.updatedAt || exercise.createdAt))}</p>
          </header>
          <section class="entry-block">
            <h4>Enunciado</h4>
            <div>${questionHtml || "<p>-</p>"}</div>
          </section>
          <section class="entry-block">
            <h4>Resolucao</h4>
            <div>${resolutionHtml || "<p>-</p>"}</div>
          </section>
          <section class="entry-block">
            <h4>Resposta</h4>
            <div>${answerHtml || "<p>-</p>"}</div>
          </section>
        </article>
      `;
    })
    .join("");
}

function sanitizeFileNamePart(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}

export function openSubtopicPdfPrint({
  subjectName,
  subtopicName,
  theory,
  exercises,
}: DownloadSubtopicPdfParams) {
  const windowRef = window.open("", "_blank", "noopener,noreferrer,width=1024,height=768");
  if (!windowRef) return false;

  const theoryHtml = buildTheoryHtml(theory);
  const exercisesHtml = buildExercisesHtml(exercises);
  const generatedAt = new Date().toLocaleString("pt-BR");
  const suggestedFileName = `${sanitizeFileNamePart(subjectName)}-${sanitizeFileNamePart(subtopicName)}.pdf`;

  const documentHtml = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subjectName)} - ${escapeHtml(subtopicName)}</title>
    <style>
      @page { size: A4; margin: 14mm; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        color: #111827;
        font-family: "Inter", "Segoe UI", Arial, sans-serif;
        line-height: 1.45;
        font-size: 12px;
      }
      h1, h2, h3, h4, p { margin: 0; }
      .doc-header {
        border-bottom: 2px solid #d1d5db;
        padding-bottom: 10px;
        margin-bottom: 14px;
      }
      .doc-header h1 {
        font-size: 22px;
        font-weight: 700;
        margin-bottom: 4px;
      }
      .doc-header p {
        color: #4b5563;
      }
      .section {
        margin-top: 16px;
      }
      .section-title {
        font-size: 16px;
        font-weight: 700;
        margin-bottom: 10px;
      }
      .entry {
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        padding: 10px;
        margin-bottom: 10px;
        break-inside: avoid;
      }
      .entry-header {
        margin-bottom: 8px;
      }
      .entry-header h3 {
        font-size: 14px;
        font-weight: 700;
      }
      .entry-header p {
        color: #6b7280;
        font-size: 11px;
        margin-top: 2px;
      }
      .entry-block + .entry-block {
        margin-top: 8px;
      }
      .entry-block h4 {
        font-size: 12px;
        font-weight: 700;
        margin-bottom: 4px;
      }
      .entry-content p + p,
      .entry-block p + p {
        margin-top: 6px;
      }
      ul, ol {
        margin: 6px 0 0;
        padding-left: 18px;
      }
      li + li {
        margin-top: 4px;
      }
      figure {
        margin: 8px 0;
      }
      img {
        max-width: 100%;
        height: auto;
        border-radius: 6px;
      }
      .empty {
        border: 1px dashed #d1d5db;
        border-radius: 10px;
        padding: 10px;
        color: #6b7280;
      }
      .hint {
        margin-top: 12px;
        color: #6b7280;
        font-size: 11px;
      }
    </style>
  </head>
  <body>
    <header class="doc-header">
      <h1>${escapeHtml(subjectName)} - ${escapeHtml(subtopicName)}</h1>
      <p>Gerado em ${escapeHtml(generatedAt)}</p>
    </header>

    <section class="section">
      <h2 class="section-title">Teoria</h2>
      ${theoryHtml}
    </section>

    <section class="section">
      <h2 class="section-title">Exercicios</h2>
      ${exercisesHtml}
    </section>

    <p class="hint">Ao abrir a janela de impressao, selecione "Salvar como PDF". Nome sugerido: ${escapeHtml(suggestedFileName)}</p>
  </body>
</html>`;

  windowRef.document.open();
  windowRef.document.write(documentHtml);
  windowRef.document.close();

  windowRef.onload = () => {
    windowRef.focus();
    windowRef.print();
  };

  return true;
}
