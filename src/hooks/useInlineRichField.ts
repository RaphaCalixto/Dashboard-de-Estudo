import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  extractImagesFromNoteHtml,
  noteHtmlToPlainText,
  sanitizeNoteHtml,
} from "@/lib/richNoteContent";

const IMAGE_MIN_WIDTH = 80;
const IMAGE_MAX_WIDTH = 1000;
const IMAGE_DEFAULT_WIDTH = 280;

function clampImageWidth(width: number) {
  return Math.max(IMAGE_MIN_WIDTH, Math.min(IMAGE_MAX_WIDTH, width));
}

export function useInlineRichField(initialHtml: string) {
  const [contentHtml, setContentHtml] = useState(initialHtml);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [selectedImageWidth, setSelectedImageWidth] = useState<number | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const selectionRef = useRef<Range | null>(null);
  const imageCounterRef = useRef(0);

  const getImageWidth = useCallback((img: HTMLImageElement) => {
    const parsed = Number.parseInt(img.style.width || "", 10);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
    if (img.clientWidth > 0) return img.clientWidth;
    return IMAGE_DEFAULT_WIDTH;
  }, []);

  const createImageId = useCallback(() => {
    imageCounterRef.current += 1;
    return `inline-image-${Date.now()}-${imageCounterRef.current}`;
  }, []);

  const moveCursorToEnd = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return false;

    editor.focus();
    const selection = window.getSelection();
    if (!selection) return false;

    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    selectionRef.current = range.cloneRange();
    return true;
  }, []);

  const rememberSelection = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return;
    selectionRef.current = range.cloneRange();
  }, []);

  const restoreSelection = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection) return false;

    if (selectionRef.current && editor.contains(selectionRef.current.commonAncestorContainer)) {
      selection.removeAllRanges();
      selection.addRange(selectionRef.current);
      return true;
    }

    return moveCursorToEnd();
  }, [moveCursorToEnd]);

  const normalizeEditorImages = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.querySelectorAll("img").forEach((imageNode) => {
      const img = imageNode as HTMLImageElement;

      if (!img.dataset.noteImageId) {
        img.dataset.noteImageId = createImageId();
      }

      img.dataset.noteInlineImage = "true";
      img.style.width = `${clampImageWidth(getImageWidth(img))}px`;
      img.style.maxWidth = "100%";
      img.style.height = "auto";
      img.style.display = "block";
      img.style.borderRadius = "0.5rem";

      if (img.parentElement?.tagName !== "FIGURE") {
        const figure = document.createElement("figure");
        figure.setAttribute("data-note-image-container", "true");
        figure.setAttribute("contenteditable", "false");
        img.replaceWith(figure);
        figure.appendChild(img);
      }
    });

    editor.querySelectorAll("figure[data-note-image-container]").forEach((figure) => {
      (figure as HTMLElement).contentEditable = "false";
    });
  }, [createImageId, getImageWidth]);

  const syncEditorContent = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    normalizeEditorImages();
    setContentHtml(sanitizeNoteHtml(editor.innerHTML));
  }, [normalizeEditorImages]);

  const updateSelectedImageVisual = useCallback((imageId: string | null) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.querySelectorAll("img[data-note-image-id]").forEach((imageNode) => {
      const img = imageNode as HTMLImageElement;
      if (imageId && img.dataset.noteImageId === imageId) {
        img.setAttribute("data-note-selected", "true");
      } else {
        img.removeAttribute("data-note-selected");
      }
    });

    if (!imageId) {
      setSelectedImageWidth(null);
      return;
    }

    const selected = editor.querySelector(`img[data-note-image-id="${imageId}"]`) as HTMLImageElement | null;
    if (!selected) {
      setSelectedImageId(null);
      setSelectedImageWidth(null);
      return;
    }

    setSelectedImageWidth(getImageWidth(selected));
  }, [getImageWidth]);

  const getSelectedImage = useCallback(() => {
    const editor = editorRef.current;
    if (!editor || !selectedImageId) return null;
    return editor.querySelector(`img[data-note-image-id="${selectedImageId}"]`) as HTMLImageElement | null;
  }, [selectedImageId]);

  const setCursorAfterNode = useCallback((node: Node) => {
    const selection = window.getSelection();
    if (!selection) return;

    const range = document.createRange();
    range.setStartAfter(node);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    selectionRef.current = range.cloneRange();
  }, []);

  const insertNodeAtCaret = useCallback((node: Node) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    restoreSelection();

    let selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      if (!moveCursorToEnd()) return;
      selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
    }

    let range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) {
      if (!moveCursorToEnd()) return;
      selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      range = selection.getRangeAt(0);
    }

    range.deleteContents();
    range.insertNode(node);
    setCursorAfterNode(node);
  }, [moveCursorToEnd, restoreSelection, setCursorAfterNode]);

  const insertTextAtCaret = useCallback((text: string) => {
    insertNodeAtCaret(document.createTextNode(text));
    syncEditorContent();
  }, [insertNodeAtCaret, syncEditorContent]);

  const insertImageAtCaret = useCallback((src: string) => {
    const figure = document.createElement("figure");
    figure.setAttribute("data-note-image-container", "true");
    figure.setAttribute("contenteditable", "false");

    const img = document.createElement("img");
    img.src = src;
    img.alt = "Imagem anexada";
    img.dataset.noteImageId = createImageId();
    img.dataset.noteInlineImage = "true";
    img.style.width = `${IMAGE_DEFAULT_WIDTH}px`;
    img.style.maxWidth = "100%";
    img.style.height = "auto";
    img.style.display = "block";
    img.style.borderRadius = "0.5rem";

    figure.appendChild(img);
    insertNodeAtCaret(figure);

    const spacer = document.createElement("p");
    spacer.innerHTML = "<br>";
    figure.parentElement?.insertBefore(spacer, figure.nextSibling);
    setCursorAfterNode(spacer);

    setSelectedImageId(img.dataset.noteImageId || null);
    syncEditorContent();
  }, [createImageId, insertNodeAtCaret, setCursorAfterNode, syncEditorContent]);

  const moveSelectedImage = useCallback((direction: "up" | "down") => {
    const img = getSelectedImage();
    if (!img) return;

    const container = (img.closest("figure[data-note-image-container]") as HTMLElement | null) || img;
    const parent = container.parentElement;
    if (!parent) return;

    if (direction === "up") {
      const previous = container.previousElementSibling;
      if (previous) parent.insertBefore(container, previous);
    } else {
      const next = container.nextElementSibling;
      if (next) parent.insertBefore(next, container);
    }

    syncEditorContent();
  }, [getSelectedImage, syncEditorContent]);

  const resizeSelectedImage = useCallback((nextWidth: number) => {
    const img = getSelectedImage();
    if (!img) return;

    const clampedWidth = clampImageWidth(nextWidth);
    img.style.width = `${clampedWidth}px`;
    setSelectedImageWidth(clampedWidth);
    syncEditorContent();
  }, [getSelectedImage, syncEditorContent]);

  const removeSelectedImage = useCallback(() => {
    const img = getSelectedImage();
    if (!img) return;

    const container = (img.closest("figure[data-note-image-container]") as HTMLElement | null) || img;
    container.remove();
    setSelectedImageId(null);
    setSelectedImageWidth(null);
    syncEditorContent();
  }, [getSelectedImage, syncEditorContent]);

  const clearSelectedImage = useCallback(() => {
    setSelectedImageId(null);
  }, []);

  const handleEditorClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const clickedImage = target.closest("img[data-note-image-id]") as HTMLImageElement | null;

    if (clickedImage?.dataset.noteImageId) {
      setSelectedImageId(clickedImage.dataset.noteImageId);
      setSelectedImageWidth(getImageWidth(clickedImage));
      return;
    }

    setSelectedImageId(null);
    rememberSelection();
  }, [getImageWidth, rememberSelection]);

  const getSanitizedHtml = useCallback(() => {
    const editor = editorRef.current;
    return sanitizeNoteHtml(editor ? editor.innerHTML : contentHtml);
  }, [contentHtml]);

  const getImages = useCallback(() => {
    return extractImagesFromNoteHtml(getSanitizedHtml());
  }, [getSanitizedHtml]);

  const plainTextContent = useMemo(() => noteHtmlToPlainText(contentHtml), [contentHtml]);
  const imageCount = useMemo(() => extractImagesFromNoteHtml(contentHtml).length, [contentHtml]);
  const isEmpty = !plainTextContent.trim() && imageCount === 0;

  useEffect(() => {
    setContentHtml(initialHtml);
    setSelectedImageId(null);
    setSelectedImageWidth(null);

    if (editorRef.current) {
      editorRef.current.innerHTML = initialHtml || "<p><br></p>";
      normalizeEditorImages();
    }
  }, [initialHtml, normalizeEditorImages]);

  useEffect(() => {
    updateSelectedImageVisual(selectedImageId);
  }, [selectedImageId, updateSelectedImageVisual]);

  return {
    editorRef,
    contentHtml,
    plainTextContent,
    imageCount,
    isEmpty,
    selectedImageId,
    selectedImageWidth,
    rememberSelection,
    syncEditorContent,
    handleEditorClick,
    insertTextAtCaret,
    insertImageAtCaret,
    moveSelectedImage,
    resizeSelectedImage,
    removeSelectedImage,
    clearSelectedImage,
    getSanitizedHtml,
    getImages,
  };
}
