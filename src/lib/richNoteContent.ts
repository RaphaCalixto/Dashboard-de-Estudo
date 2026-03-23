const IMAGE_INITIAL_WIDTH = 280;
const IMAGE_MIN_WIDTH = 80;
const IMAGE_MAX_WIDTH = 1000;

const HTML_TAG_REGEX = /<\/?[a-z][\s\S]*>/i;

function escapeHtml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toWidth(value: string | null, fallback: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export function looksLikeHtml(content: string) {
  return HTML_TAG_REGEX.test(content);
}

export function plainTextToHtml(text: string) {
  if (!text.trim()) return "";
  return text
    .split("\n")
    .map((line) => (line.trim() ? `<p>${escapeHtml(line)}</p>` : "<p><br></p>"))
    .join("");
}

export function createInlineImageHtml(src: string, width = IMAGE_INITIAL_WIDTH) {
  const safeWidth = clamp(width, IMAGE_MIN_WIDTH, IMAGE_MAX_WIDTH);
  return `<figure data-note-image-container="true" contenteditable="false"><img src="${src}" alt="Imagem anexada" data-note-inline-image="true" style="width:${safeWidth}px;max-width:100%;height:auto;display:block;border-radius:0.5rem;" /></figure>`;
}

export function sanitizeNoteHtml(rawHtml: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(rawHtml || "", "text/html");

  doc.querySelectorAll("script,style,iframe,object,embed").forEach((el) => el.remove());

  doc.body.querySelectorAll("*").forEach((el) => {
    [...el.attributes].forEach((attr) => {
      const key = attr.name.toLowerCase();
      if (key.startsWith("on")) el.removeAttribute(attr.name);
    });
  });

  doc.body.querySelectorAll("img").forEach((img) => {
    const currentWidth = toWidth(img.style.width, toWidth(img.getAttribute("width"), IMAGE_INITIAL_WIDTH));
    const safeWidth = clamp(currentWidth, IMAGE_MIN_WIDTH, IMAGE_MAX_WIDTH);

    img.setAttribute("data-note-inline-image", "true");
    img.style.width = `${safeWidth}px`;
    img.style.maxWidth = "100%";
    img.style.height = "auto";
    img.style.display = "block";
    img.style.borderRadius = "0.5rem";

    if (img.parentElement?.tagName !== "FIGURE") {
      const figure = doc.createElement("figure");
      figure.setAttribute("data-note-image-container", "true");
      figure.setAttribute("contenteditable", "false");
      img.replaceWith(figure);
      figure.appendChild(img);
    }
  });

  doc.body.querySelectorAll("figure[data-note-image-container]").forEach((figure) => {
    figure.setAttribute("contenteditable", "false");
  });

  return doc.body.innerHTML.trim();
}

export function createInitialNoteHtml(content: string, images: string[]) {
  if (looksLikeHtml(content)) {
    return sanitizeNoteHtml(content);
  }
  const textPart = plainTextToHtml(content);
  const imagePart = (images || []).map((src) => createInlineImageHtml(src)).join("");
  return sanitizeNoteHtml(`${textPart}${imagePart}`);
}

export function extractImagesFromNoteHtml(html: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html || "", "text/html");
  return Array.from(doc.body.querySelectorAll("img"))
    .map((img) => img.getAttribute("src") || "")
    .filter(Boolean);
}

export function noteHtmlToPlainText(htmlOrText: string) {
  if (!htmlOrText.trim()) return "";
  if (!looksLikeHtml(htmlOrText)) return htmlOrText;
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlOrText, "text/html");
  return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
}
