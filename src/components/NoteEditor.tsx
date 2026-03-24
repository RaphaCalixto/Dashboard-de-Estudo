import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowDown, ArrowUp, Bold, ImagePlus, Italic, List, ListOrdered, Minus, Plus, Save, Underline, X } from "lucide-react";
import { MathSymbolPicker } from "./MathSymbolPicker";
import { SimpleCalculator } from "./SimpleCalculator";
import type { StudyNote } from "@/lib/studyStore";
import {
  createInitialNoteHtml,
  extractImagesFromNoteHtml,
  noteHtmlToPlainText,
  sanitizeNoteHtml,
} from "@/lib/richNoteContent";

interface NoteEditorProps {
  note?: StudyNote;
  showMathTools?: boolean;
  onSave: (title: string, content: string, images: string[]) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

const IMAGE_MIN_WIDTH = 80;
const IMAGE_MAX_WIDTH = 1000;
const IMAGE_DEFAULT_WIDTH = 280;
const FONT_SIZE_MARKER = "7";

export function NoteEditor({ note, showMathTools, onSave, onCancel, onDelete }: NoteEditorProps) {
  const [title, setTitle] = useState(note?.title || "");
  const [fontSize, setFontSize] = useState("16");
  const initialHtml = useMemo(
    () => createInitialNoteHtml(note?.content || "", note?.images || []),
    [note?.content, note?.images],
  );

  const [contentHtml, setContentHtml] = useState(initialHtml);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [selectedImageWidth, setSelectedImageWidth] = useState<number | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef<Range | null>(null);
  const imageCounterRef = useRef(0);

  const getImageWidth = useCallback((img: HTMLImageElement) => {
    const parsed = Number.parseInt(img.style.width || "", 10);
    if (!Number.isNaN(parsed) && parsed > 0) return parsed;
    if (img.clientWidth > 0) return img.clientWidth;
    return IMAGE_DEFAULT_WIDTH;
  }, []);

  const clampImageWidth = useCallback((width: number) => {
    return Math.max(IMAGE_MIN_WIDTH, Math.min(IMAGE_MAX_WIDTH, width));
  }, []);

  const createImageId = useCallback(() => {
    imageCounterRef.current += 1;
    return `note-image-${Date.now()}-${imageCounterRef.current}`;
  }, []);

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
  }, [clampImageWidth, createImageId, getImageWidth]);

  const syncEditorContent = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    normalizeEditorImages();
    setContentHtml(sanitizeNoteHtml(editor.innerHTML));
  }, [normalizeEditorImages]);

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
    if (!editor || !selection) return;

    if (selectionRef.current && editor.contains(selectionRef.current.commonAncestorContainer)) {
      selection.removeAllRanges();
      selection.addRange(selectionRef.current);
      return;
    }

    moveCursorToEnd();
  }, [moveCursorToEnd]);

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

  const insertSymbol = (symbol: string) => {
    insertNodeAtCaret(document.createTextNode(symbol));
    syncEditorContent();
  };

  const applyFormatCommand = useCallback((command: string, value?: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    restoreSelection();
    document.execCommand(command, false, value);
    rememberSelection();
    syncEditorContent();
  }, [rememberSelection, restoreSelection, syncEditorContent]);

  const applyFontSize = useCallback((nextSize: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    setFontSize(nextSize);
    editor.focus();
    restoreSelection();
    document.execCommand("fontSize", false, FONT_SIZE_MARKER);

    editor.querySelectorAll(`font[size="${FONT_SIZE_MARKER}"]`).forEach((fontNode) => {
      const span = document.createElement("span");
      span.style.fontSize = `${nextSize}px`;
      span.innerHTML = fontNode.innerHTML;
      fontNode.replaceWith(span);
    });

    rememberSelection();
    syncEditorContent();
  }, [rememberSelection, restoreSelection, syncEditorContent]);

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    const toDataUrl = (file: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

    const imageSources = await Promise.all(Array.from(files).map(toDataUrl));
    imageSources.forEach((src) => insertImageAtCaret(src));
    e.target.value = "";
  };

  const moveSelectedImage = (direction: "up" | "down") => {
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
  };

  const resizeSelectedImage = (nextWidth: number) => {
    const img = getSelectedImage();
    if (!img) return;

    const clampedWidth = clampImageWidth(nextWidth);
    img.style.width = `${clampedWidth}px`;
    setSelectedImageWidth(clampedWidth);
    syncEditorContent();
  };

  const removeSelectedImage = () => {
    const img = getSelectedImage();
    if (!img) return;

    const container = (img.closest("figure[data-note-image-container]") as HTMLElement | null) || img;
    container.remove();
    setSelectedImageId(null);
    setSelectedImageWidth(null);
    syncEditorContent();
  };

  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const clickedImage = target.closest("img[data-note-image-id]") as HTMLImageElement | null;

    if (clickedImage?.dataset.noteImageId) {
      setSelectedImageId(clickedImage.dataset.noteImageId);
      setSelectedImageWidth(getImageWidth(clickedImage));
      return;
    }

    setSelectedImageId(null);
    rememberSelection();
  };

  const handleSave = () => {
    const editor = editorRef.current;
    const rawContent = editor ? editor.innerHTML : contentHtml;
    const sanitized = sanitizeNoteHtml(rawContent);
    const images = extractImagesFromNoteHtml(sanitized);
    onSave(title, sanitized, images);
  };

  const plainTextContent = useMemo(() => noteHtmlToPlainText(contentHtml), [contentHtml]);
  const imageCount = useMemo(() => extractImagesFromNoteHtml(contentHtml).length, [contentHtml]);
  const isEditorEmpty = !plainTextContent.trim() && imageCount === 0;

  useEffect(() => {
    setTitle(note?.title || "");
  }, [note?.title]);

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

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título / Assunto..."
        className="font-semibold text-base"
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">FormataÃ§Ã£o</span>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => applyFormatCommand("bold")}>
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => applyFormatCommand("italic")}>
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => applyFormatCommand("underline")}>
          <Underline className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => applyFormatCommand("insertUnorderedList")}>
          <List className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => applyFormatCommand("insertOrderedList")}>
          <ListOrdered className="h-3.5 w-3.5" />
        </Button>
        <select
          value={fontSize}
          onChange={(e) => applyFontSize(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          aria-label="Tamanho do texto"
        >
          <option value="12">12</option>
          <option value="14">14</option>
          <option value="16">16</option>
          <option value="18">18</option>
          <option value="22">22</option>
          <option value="28">28</option>
        </select>

        {showMathTools && (
          <>
            <MathSymbolPicker onInsert={insertSymbol} />
            <SimpleCalculator />
          </>
        )}
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fileInputRef.current?.click()}>
          <ImagePlus className="h-4 w-4" />
          <span className="hidden sm:inline">Imagem</span>
        </Button>
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
      </div>

      {selectedImageId && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-muted/30 p-2">
          <span className="text-xs text-muted-foreground mr-1">Imagem selecionada</span>
          <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => moveSelectedImage("up")}>
            <ArrowUp className="h-3.5 w-3.5" /> Subir
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1" onClick={() => moveSelectedImage("down")}>
            <ArrowDown className="h-3.5 w-3.5" /> Descer
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => resizeSelectedImage((selectedImageWidth || IMAGE_DEFAULT_WIDTH) - 20)}
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => resizeSelectedImage((selectedImageWidth || IMAGE_DEFAULT_WIDTH) + 20)}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <div className="flex items-center gap-2 min-w-[170px]">
            <input
              type="range"
              min={IMAGE_MIN_WIDTH}
              max={IMAGE_MAX_WIDTH}
              step={10}
              value={selectedImageWidth || IMAGE_DEFAULT_WIDTH}
              onChange={(e) => resizeSelectedImage(Number(e.target.value))}
              className="w-full accent-primary"
            />
            <span className="text-xs text-muted-foreground w-12 text-right">{selectedImageWidth || IMAGE_DEFAULT_WIDTH}px</span>
          </div>
          <Button variant="outline" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={removeSelectedImage}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <div className="relative">
        {isEditorEmpty && (
          <span className="pointer-events-none absolute left-3 top-2.5 text-sm text-muted-foreground">
            Escreva suas anotações aqui...
          </span>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={syncEditorContent}
          onMouseUp={rememberSelection}
          onKeyUp={rememberSelection}
          onBlur={rememberSelection}
          onClick={handleEditorClick}
          className="note-editor min-h-[170px] rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!title.trim() && !plainTextContent.trim() && imageCount === 0}
        >
          <Save className="h-4 w-4 mr-1.5" /> Salvar
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        {onDelete && (
          <Button variant="ghost" size="sm" className="ml-auto text-destructive hover:text-destructive" onClick={onDelete}>
            Excluir
          </Button>
        )}
      </div>
    </div>
  );
}
