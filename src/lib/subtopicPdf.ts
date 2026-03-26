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

function buildTheoryHtml(theory: StudyNote[]) {
  return theory
    .map((note, index) => {
      const contentHtml = renderRichOrPlainText(note.content);
      if (contentHtml) {
        return `<article class="entry">${contentHtml}</article>`;
      }

      const fallbackTitle = note.title.trim() || `Anotacao ${index + 1}`;
      return `<article class="entry"><p>${escapeHtml(fallbackTitle)}</p></article>`;
    })
    .join("");
}

function buildExercisesHtml(exercises: ExerciseNote[]) {
  return exercises
    .map((exercise, index) => {
      const questionHtml = renderRichOrPlainText(exercise.question);
      const resolutionHtml = renderRichOrPlainText(exercise.resolution);
      const answerHtml = renderRichOrPlainText(exercise.answer);

      const blocks = [questionHtml, resolutionHtml, answerHtml]
        .filter((html) => html.trim().length > 0)
        .map((html) => `<div class="entry-block">${html}</div>`)
        .join("");

      if (blocks) {
        return `<article class="entry">${blocks}</article>`;
      }

      const fallbackTitle = exercise.title.trim() || `Exercicio ${index + 1}`;
      return `<article class="entry"><p>${escapeHtml(fallbackTitle)}</p></article>`;
    })
    .join("");
}

export function openSubtopicPdfPrint({
  subjectName,
  subtopicName,
  theory,
  exercises,
}: DownloadSubtopicPdfParams) {
  const theoryHtml = buildTheoryHtml(theory);
  const exercisesHtml = buildExercisesHtml(exercises);
  const printableContent = `${theoryHtml}${exercisesHtml}`;

  const documentHtml = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(subjectName)} - ${escapeHtml(subtopicName)}</title>
    <style>
      @page { size: A4; margin: 12mm; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        color: #111827;
        font-family: "Inter", "Segoe UI", Arial, sans-serif;
        line-height: 1.45;
        font-size: 12px;
      }
      p { margin: 0; }
      .content {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .entry {
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        padding: 10px;
        break-inside: avoid;
      }
      .entry-block + .entry-block {
        margin-top: 8px;
      }
      .entry p + p {
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
    </style>
  </head>
  <body>
    <main class="content">
      ${printableContent || '<p class="empty">Sem conteudo para exportar.</p>'}
    </main>
  </body>
</html>`;

  const printWithWindow = () => {
    const windowRef = window.open("", "_blank", "width=1024,height=768");
    if (!windowRef) return false;

    try {
      windowRef.document.open();
      windowRef.document.write(documentHtml);
      windowRef.document.close();

      const triggerPrint = () => {
        windowRef.focus();
        windowRef.print();
      };

      if (windowRef.document.readyState === "complete") {
        setTimeout(triggerPrint, 120);
      } else {
        windowRef.onload = () => setTimeout(triggerPrint, 120);
      }

      return true;
    } catch {
      return false;
    }
  };

  const printWithIframe = () => {
    try {
      const iframe = document.createElement("iframe");
      iframe.setAttribute("aria-hidden", "true");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.style.opacity = "0";
      iframe.srcdoc = documentHtml;
      document.body.appendChild(iframe);

      iframe.onload = () => {
        const frameWindow = iframe.contentWindow;
        if (!frameWindow) {
          iframe.remove();
          return;
        }

        const cleanup = () => {
          setTimeout(() => iframe.remove(), 400);
        };

        frameWindow.onafterprint = cleanup;
        frameWindow.focus();
        frameWindow.print();
        setTimeout(cleanup, 12000);
      };

      return true;
    } catch {
      return false;
    }
  };

  if (printWithWindow()) return true;
  return printWithIframe();
}
