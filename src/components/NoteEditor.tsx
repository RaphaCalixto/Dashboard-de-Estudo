import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowDown,
  ArrowUp,
  Bold,
  Highlighter,
  FlipHorizontal,
  FlipVertical,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  Minus,
  Plus,
  RotateCcw,
  RotateCw,
  Save,
  Underline,
  X,
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MathSymbolPicker } from "./MathSymbolPicker";
import { SimpleCalculator } from "./SimpleCalculator";
import type { StudyNote } from "@/lib/studyStore";
import { cn } from "@/lib/utils";
import {
  createInitialNoteHtml,
  extractImagesFromNoteHtml,
  noteHtmlToPlainText,
  sanitizeNoteHtml,
} from "@/lib/richNoteContent";

interface NoteEditorProps {
  note?: StudyNote;
  showMathTools?: boolean;
  expanded?: boolean;
  onSave: (title: string, content: string, images: string[]) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

const IMAGE_MIN_WIDTH = 80;
const IMAGE_MAX_WIDTH = 1000;
const IMAGE_DEFAULT_WIDTH = 280;
const FONT_SIZE_MARKER = "7";
const NOTE_GRID_STORAGE_KEY = "note-editor:grid-enabled";
const NOTE_COLOR_STORAGE_KEY = "note-editor:color";

type NoteShape =
  | "line"
  | "arrow"
  | "rectangle"
  | "rounded-rectangle"
  | "square"
  | "circle"
  | "ellipse"
  | "triangle"
  | "diamond"
  | "pentagon"
  | "hexagon"
  | "octagon"
  | "star";

function safeLocalStorageGet(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeLocalStorageSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

export function NoteEditor({ note, showMathTools, expanded, onSave, onCancel, onDelete }: NoteEditorProps) {
  const [title, setTitle] = useState(note?.title || "");
  const [fontSize, setFontSize] = useState("16");
  const [fontSizePickerValue, setFontSizePickerValue] = useState("");
  const [gridEnabled, setGridEnabled] = useState(() => safeLocalStorageGet(NOTE_GRID_STORAGE_KEY) === "true");
  const [activeColor, setActiveColor] = useState(() => safeLocalStorageGet(NOTE_COLOR_STORAGE_KEY) || "#111827");
  const initialHtml = useMemo(
    () => createInitialNoteHtml(note?.content || "", note?.images || []),
    [note?.content, note?.images],
  );

  const [contentHtml, setContentHtml] = useState(initialHtml);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [selectedImageWidth, setSelectedImageWidth] = useState<number | null>(null);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [shapeRotation, setShapeRotation] = useState(0);
  const [shapeScale, setShapeScale] = useState(1);
  const [shapeFlipX, setShapeFlipX] = useState(false);
  const [shapeFlipY, setShapeFlipY] = useState(false);
  const [imageFlipX, setImageFlipX] = useState(false);
  const [imageFlipY, setImageFlipY] = useState(false);
  const [markerColor, setMarkerColor] = useState("#fde047");
  const [markerThickness, setMarkerThickness] = useState(8);
  const [underlineDecorColor, setUnderlineDecorColor] = useState("#111827");
  const [underlineDecorThickness, setUnderlineDecorThickness] = useState(2);
  const [fontWeight, setFontWeight] = useState("400");
  const editorRef = useRef<HTMLDivElement>(null);
  const editorSurfaceRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectionRef = useRef<Range | null>(null);
  const imageCounterRef = useRef(0);
  const shapeCounterRef = useRef(0);
  const pointerDragRef = useRef<{
    pointerId: number;
    container: HTMLElement;
    startX: number;
    startY: number;
    started: boolean;
  } | null>(null);
  const pointerResizeRef = useRef<{
    pointerId: number;
    kind: "image" | "shape";
    handle: "nw" | "ne" | "sw" | "se";
    startX: number;
    startY: number;
    startWidth?: number;
    startScale?: number;
  } | null>(null);
  const [overlayRect, setOverlayRect] = useState<{ left: number; top: number; width: number; height: number; kind: "image" | "shape" } | null>(
    null,
  );

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

  const createShapeId = useCallback(() => {
    shapeCounterRef.current += 1;
    return `note-shape-${Date.now()}-${shapeCounterRef.current}`;
  }, []);

  const getSelectedShapeContainer = useCallback(() => {
    const editor = editorRef.current;
    if (!editor || !selectedShapeId) return null;
    return editor.querySelector(`figure[data-note-shape-container][data-note-shape-id="${selectedShapeId}"]`) as HTMLElement | null;
  }, [selectedShapeId]);

  const applyShapeTransformStyles = useCallback((container: HTMLElement) => {
    const rotate = Number.parseFloat(container.dataset.noteShapeRotate || "0") || 0;
    const scale = Number.parseFloat(container.dataset.noteShapeScale || "1") || 1;
    const flipX = container.dataset.noteShapeFlipX === "true";
    const flipY = container.dataset.noteShapeFlipY === "true";

    const svg = container.querySelector("svg") as SVGSVGElement | null;
    if (!svg) return;

    svg.style.transformOrigin = "50% 50%";
    svg.style.overflow = "visible";
    const sx = (flipX ? -1 : 1) * scale;
    const sy = (flipY ? -1 : 1) * scale;
    svg.style.transform = `rotate(${rotate}deg) scale(${sx}, ${sy})`;
  }, []);

  const normalizeEditorImages = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.querySelectorAll("img").forEach((imageNode) => {
      const img = imageNode as HTMLImageElement;

      if (!img.dataset.noteImageId) {
        img.dataset.noteImageId = createImageId();
      }

      if (!img.dataset.noteFlipX) img.dataset.noteFlipX = "false";
      if (!img.dataset.noteFlipY) img.dataset.noteFlipY = "false";

      img.dataset.noteInlineImage = "true";
      img.style.width = `${clampImageWidth(getImageWidth(img))}px`;
      img.style.maxWidth = "100%";
      img.style.height = "auto";
      img.style.display = "block";
      img.style.borderRadius = "0.5rem";
      applyImageTransformStyles(img);

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

    editor.querySelectorAll("figure[data-note-shape-container]").forEach((figure) => {
      const container = figure as HTMLElement;
      container.contentEditable = "false";

      if (!container.dataset.noteShapeId) {
        const existing = container.getAttribute("data-note-shape-id");
        container.dataset.noteShapeId = existing || createShapeId();
      }
      container.setAttribute("data-note-shape-id", container.dataset.noteShapeId);

      if (!container.dataset.noteShapeRotate) container.dataset.noteShapeRotate = "0";
      if (!container.dataset.noteShapeScale) container.dataset.noteShapeScale = "1";
      if (!container.dataset.noteShapeFlipX) container.dataset.noteShapeFlipX = "false";
      if (!container.dataset.noteShapeFlipY) container.dataset.noteShapeFlipY = "false";

      const svg = container.querySelector("svg") as SVGSVGElement | null;
      if (svg && !svg.getAttribute("data-note-shape-id")) {
        svg.setAttribute("data-note-shape-id", container.dataset.noteShapeId);
      }
      applyShapeTransformStyles(container);
    });
  }, [applyImageTransformStyles, applyShapeTransformStyles, clampImageWidth, createImageId, createShapeId, getImageWidth]);

  const syncEditorContent = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    normalizeEditorImages();
    setContentHtml(sanitizeNoteHtml(editor.innerHTML));
  }, [normalizeEditorImages]);

  const setShapeTransform = useCallback((next: Partial<{ rotate: number; scale: number; flipX: boolean; flipY: boolean }>) => {
    const container = getSelectedShapeContainer();
    if (!container) return;

    const currentRotate = Number.parseFloat(container.dataset.noteShapeRotate || "0") || 0;
    const currentScale = Number.parseFloat(container.dataset.noteShapeScale || "1") || 1;
    const currentFlipX = container.dataset.noteShapeFlipX === "true";
    const currentFlipY = container.dataset.noteShapeFlipY === "true";

    const rotate = typeof next.rotate === "number" ? next.rotate : currentRotate;
    const scale = typeof next.scale === "number" ? next.scale : currentScale;
    const flipX = typeof next.flipX === "boolean" ? next.flipX : currentFlipX;
    const flipY = typeof next.flipY === "boolean" ? next.flipY : currentFlipY;

    container.dataset.noteShapeRotate = String(rotate);
    container.dataset.noteShapeScale = String(scale);
    container.dataset.noteShapeFlipX = String(flipX);
    container.dataset.noteShapeFlipY = String(flipY);
    applyShapeTransformStyles(container);
    syncEditorContent();
  }, [applyShapeTransformStyles, getSelectedShapeContainer, syncEditorContent]);

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

  const getSelectedImageContainer = useCallback(() => {
    const img = getSelectedImage();
    if (!img) return null;
    return (img.closest("figure[data-note-image-container]") as HTMLElement | null) || null;
  }, [getSelectedImage]);

  const applyImageTransformStyles = useCallback((img: HTMLImageElement) => {
    const flipX = img.dataset.noteFlipX === "true";
    const flipY = img.dataset.noteFlipY === "true";
    const sx = flipX ? -1 : 1;
    const sy = flipY ? -1 : 1;
    img.style.transformOrigin = "50% 50%";
    img.style.transform = `scale(${sx}, ${sy})`;
  }, []);

  const setImageFlip = useCallback((next: Partial<{ flipX: boolean; flipY: boolean }>) => {
    const img = getSelectedImage();
    if (!img) return;
    const currentFlipX = img.dataset.noteFlipX === "true";
    const currentFlipY = img.dataset.noteFlipY === "true";
    const flipX = typeof next.flipX === "boolean" ? next.flipX : currentFlipX;
    const flipY = typeof next.flipY === "boolean" ? next.flipY : currentFlipY;
    img.dataset.noteFlipX = String(flipX);
    img.dataset.noteFlipY = String(flipY);
    applyImageTransformStyles(img);
    syncEditorContent();
  }, [applyImageTransformStyles, getSelectedImage, syncEditorContent]);

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

  const wrapSelectionWithSpanStyle = useCallback((style: Record<string, string>) => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    if (range.collapsed) return;
    if (!editor.contains(range.commonAncestorContainer)) return;

    const span = document.createElement("span");
    Object.entries(style).forEach(([key, value]) => {
      span.style.setProperty(key, value);
    });
    span.appendChild(range.extractContents());
    range.insertNode(span);
    setCursorAfterNode(span);
    rememberSelection();
    syncEditorContent();
  }, [rememberSelection, setCursorAfterNode, syncEditorContent]);

  const insertSymbol = (symbol: string) => {
    insertNodeAtCaret(document.createTextNode(symbol));
    syncEditorContent();
  };

  const applyFormatCommand = useCallback((command: string, value?: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.focus();
    restoreSelection();
    if (command === "foreColor" || command === "hiliteColor" || command === "backColor") {
      document.execCommand("styleWithCSS", false, "true");
    }
    document.execCommand(command, false, value);
    rememberSelection();
    syncEditorContent();
  }, [rememberSelection, restoreSelection, syncEditorContent]);

  const applyColor = useCallback((color: string) => {
    setActiveColor(color);
    safeLocalStorageSet(NOTE_COLOR_STORAGE_KEY, color);
    applyFormatCommand("foreColor", color);
  }, [applyFormatCommand]);

  useEffect(() => {
    setUnderlineDecorColor(activeColor);
  }, [activeColor]);

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

  const handleFontSizeChange = useCallback((nextSize: string) => {
    if (!nextSize) return;
    applyFontSize(nextSize);
    setFontSizePickerValue("");
  }, [applyFontSize]);

  const handleEditorPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const editor = editorRef.current;
    if (!editor) return;

    const target = e.target as HTMLElement;
    const container = target.closest("figure[data-note-image-container], figure[data-note-shape-container]") as HTMLElement | null;
    if (!container || !editor.contains(container)) return;

    if (window.getSelection()?.type === "Range") return;

    pointerDragRef.current = {
      pointerId: e.pointerId,
      container,
      startX: e.clientX,
      startY: e.clientY,
      started: false,
    };
    editor.setPointerCapture(e.pointerId);
  };

  const handleEditorPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const editor = editorRef.current;
    const drag = pointerDragRef.current;
    if (!editor || !drag || drag.pointerId !== e.pointerId) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (!drag.started && Math.hypot(dx, dy) < 5) return;

    drag.started = true;
    e.preventDefault();

    const hover = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    if (!hover) return;

    const candidate = hover.closest("p, figure[data-note-image-container], figure[data-note-shape-container]") as HTMLElement | null;
    if (!candidate || !editor.contains(candidate)) return;
    if (candidate === drag.container) return;
    if (candidate.parentElement !== editor) return;

    const rect = candidate.getBoundingClientRect();
    const insertBefore = e.clientY < rect.top + rect.height / 2;
    const beforeNode = insertBefore ? candidate : candidate.nextSibling;
    if (beforeNode === drag.container) return;

    editor.insertBefore(drag.container, beforeNode);
    syncEditorContent();
  };

  const handleEditorPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const editor = editorRef.current;
    const drag = pointerDragRef.current;
    if (editor && drag && drag.pointerId === e.pointerId) {
      pointerDragRef.current = null;
      try {
        editor.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  const updateOverlayRect = useCallback(() => {
    const surface = editorSurfaceRef.current;
    const editor = editorRef.current;
    if (!surface || !editor) {
      setOverlayRect(null);
      return;
    }

    const surfaceRect = surface.getBoundingClientRect();
    const shapeContainer = selectedShapeId ? getSelectedShapeContainer() : null;
    const imageContainer = selectedImageId ? getSelectedImageContainer() : null;
    const container = shapeContainer || imageContainer;
    if (!container) {
      setOverlayRect(null);
      return;
    }

    const rect = container.getBoundingClientRect();
    const left = rect.left - surfaceRect.left + surface.scrollLeft;
    const top = rect.top - surfaceRect.top + surface.scrollTop;
    setOverlayRect({
      left,
      top,
      width: rect.width,
      height: rect.height,
      kind: shapeContainer ? "shape" : "image",
    });
  }, [getSelectedImageContainer, getSelectedShapeContainer, selectedImageId, selectedShapeId]);

  useEffect(() => {
    updateOverlayRect();
  }, [updateOverlayRect, contentHtml, selectedImageId, selectedShapeId]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const onScroll = () => updateOverlayRect();
    const onResize = () => updateOverlayRect();
    editor.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, { passive: true });
    return () => {
      editor.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize);
    };
  }, [updateOverlayRect]);

  const beginResize = (handle: "nw" | "ne" | "sw" | "se") => (e: React.PointerEvent) => {
    const editor = editorRef.current;
    if (!editor || !overlayRect) return;
    e.preventDefault();
    e.stopPropagation();

    if (overlayRect.kind === "image") {
      const img = getSelectedImage();
      if (!img) return;
      const startWidth = Number.parseInt(img.style.width || "", 10) || img.clientWidth || IMAGE_DEFAULT_WIDTH;
      pointerResizeRef.current = {
        pointerId: e.pointerId,
        kind: "image",
        handle,
        startX: e.clientX,
        startY: e.clientY,
        startWidth,
      };
      editor.setPointerCapture(e.pointerId);
      return;
    }

    const container = getSelectedShapeContainer();
    if (!container) return;
    const startScale = Number.parseFloat(container.dataset.noteShapeScale || "1") || 1;
    pointerResizeRef.current = {
      pointerId: e.pointerId,
      kind: "shape",
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startScale,
    };
    editor.setPointerCapture(e.pointerId);
  };

  const handleSurfacePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const editor = editorRef.current;
    const resize = pointerResizeRef.current;
    if (!editor || !resize || resize.pointerId !== e.pointerId) return;

    e.preventDefault();
    const dx = e.clientX - resize.startX;
    const direction = resize.handle === "ne" || resize.handle === "se" ? 1 : -1;
    const delta = dx * direction;

    if (resize.kind === "image") {
      const img = getSelectedImage();
      if (!img) return;
      const nextWidth = clampImageWidth((resize.startWidth || IMAGE_DEFAULT_WIDTH) + delta);
      img.style.width = `${nextWidth}px`;
      setSelectedImageWidth(nextWidth);
      syncEditorContent();
      updateOverlayRect();
      return;
    }

    const container = getSelectedShapeContainer();
    if (!container) return;
    const base = resize.startScale || 1;
    const nextScale = Math.max(0.5, Math.min(3, Math.round((base + delta / 260) * 100) / 100));
    setShapeScale(nextScale);
    setShapeTransform({ scale: nextScale });
    updateOverlayRect();
  };

  const handleSurfacePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const editor = editorRef.current;
    const resize = pointerResizeRef.current;
    if (editor && resize && resize.pointerId === e.pointerId) {
      pointerResizeRef.current = null;
      try {
        editor.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  const createShapeSvg = useCallback((shape: NoteShape, strokeColor: string) => {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("width", "180");
    svg.setAttribute("height", "120");
    svg.setAttribute("aria-label", "Forma geométrica");
    svg.style.display = "block";
    svg.style.maxWidth = "100%";

    const common = (el: SVGElement) => {
      el.setAttribute("fill", "none");
      el.setAttribute("stroke", strokeColor);
      el.setAttribute("stroke-width", "4");
      el.setAttribute("stroke-linecap", "round");
      el.setAttribute("stroke-linejoin", "round");
      return el;
    };

    const add = (el: SVGElement) => svg.appendChild(common(el));

    if (shape === "line") {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", "10");
      line.setAttribute("y1", "50");
      line.setAttribute("x2", "90");
      line.setAttribute("y2", "50");
      add(line);
      return svg;
    }

    if (shape === "arrow") {
      const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
      const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
      marker.setAttribute("id", "note-arrowhead");
      marker.setAttribute("markerWidth", "10");
      marker.setAttribute("markerHeight", "10");
      marker.setAttribute("refX", "8");
      marker.setAttribute("refY", "5");
      marker.setAttribute("orient", "auto");
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
      path.setAttribute("fill", strokeColor);
      marker.appendChild(path);
      defs.appendChild(marker);
      svg.appendChild(defs);

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", "10");
      line.setAttribute("y1", "50");
      line.setAttribute("x2", "86");
      line.setAttribute("y2", "50");
      common(line);
      line.setAttribute("marker-end", "url(#note-arrowhead)");
      svg.appendChild(line);
      return svg;
    }

    if (shape === "rectangle" || shape === "rounded-rectangle" || shape === "square") {
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      const size = shape === "square" ? 70 : 80;
      const height = shape === "square" ? 70 : 55;
      rect.setAttribute("x", String(Math.round((100 - size) / 2)));
      rect.setAttribute("y", String(Math.round((100 - height) / 2)));
      rect.setAttribute("width", String(size));
      rect.setAttribute("height", String(height));
      if (shape === "rounded-rectangle") {
        rect.setAttribute("rx", "10");
        rect.setAttribute("ry", "10");
      }
      add(rect);
      return svg;
    }

    if (shape === "circle" || shape === "ellipse") {
      if (shape === "circle") {
        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", "50");
        circle.setAttribute("cy", "50");
        circle.setAttribute("r", "32");
        add(circle);
      } else {
        const ellipse = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
        ellipse.setAttribute("cx", "50");
        ellipse.setAttribute("cy", "50");
        ellipse.setAttribute("rx", "36");
        ellipse.setAttribute("ry", "26");
        add(ellipse);
      }
      return svg;
    }

    const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    const pointsByShape: Record<Exclude<NoteShape, "line" | "arrow" | "rectangle" | "rounded-rectangle" | "square" | "circle" | "ellipse">, string> = {
      triangle: "50,15 88,80 12,80",
      diamond: "50,12 88,50 50,88 12,50",
      pentagon: "50,12 90,40 74,88 26,88 10,40",
      hexagon: "25,16 75,16 92,50 75,84 25,84 8,50",
      octagon: "30,12 70,12 88,30 88,70 70,88 30,88 12,70 12,30",
      star: "50,12 61,38 88,38 66,54 74,82 50,66 26,82 34,54 12,38 39,38",
    };
    polygon.setAttribute("points", pointsByShape[shape as keyof typeof pointsByShape]);
    add(polygon);
    return svg;
  }, []);

  const insertShapeAtCaret = useCallback((shape: NoteShape) => {
    const shapeId = createShapeId();
    const figure = document.createElement("figure");
    figure.setAttribute("data-note-shape-container", "true");
    figure.setAttribute("contenteditable", "false");
    figure.dataset.noteShapeId = shapeId;
    figure.setAttribute("data-note-shape-id", shapeId);
    figure.dataset.noteShapeRotate = "0";
    figure.dataset.noteShapeScale = "1";
    figure.dataset.noteShapeFlipX = "false";
    figure.dataset.noteShapeFlipY = "false";

    const svg = createShapeSvg(shape, activeColor);
    svg.setAttribute("data-note-shape-id", shapeId);
    figure.appendChild(svg);

    insertNodeAtCaret(figure);

    const spacer = document.createElement("p");
    spacer.innerHTML = "<br>";
    figure.parentElement?.insertBefore(spacer, figure.nextSibling);
    setCursorAfterNode(spacer);

    setSelectedImageId(null);
    setSelectedImageWidth(null);
    setSelectedShapeId(shapeId);
    setShapeRotation(0);
    setShapeScale(1);
    setShapeFlipX(false);
    setShapeFlipY(false);
    syncEditorContent();
  }, [activeColor, createShapeId, createShapeSvg, insertNodeAtCaret, setCursorAfterNode, syncEditorContent]);

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
    setSelectedShapeId(null);
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

  const updateSelectedShapeVisual = useCallback((shapeId: string | null) => {
    const editor = editorRef.current;
    if (!editor) return;

    editor.querySelectorAll("figure[data-note-shape-container]").forEach((node) => {
      const figure = node as HTMLElement;
      if (shapeId && figure.dataset.noteShapeId === shapeId) {
        figure.setAttribute("data-note-shape-selected", "true");
      } else {
        figure.removeAttribute("data-note-shape-selected");
      }
    });
  }, []);

  const removeSelectedShape = () => {
    const editor = editorRef.current;
    if (!editor || !selectedShapeId) return;

    const container =
      (editor.querySelector(`figure[data-note-shape-container][data-note-shape-id="${selectedShapeId}"]`) as HTMLElement | null) ||
      (editor.querySelector(`figure[data-note-shape-container][data-note-shape-selected="true"]`) as HTMLElement | null);
    if (!container) return;

    container.remove();
    setSelectedShapeId(null);
    syncEditorContent();
  };

  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const clickedImage = target.closest("img[data-note-image-id]") as HTMLImageElement | null;
    const clickedShape = target.closest("figure[data-note-shape-container]") as HTMLElement | null;

    if (clickedImage?.dataset.noteImageId) {
      setSelectedImageId(clickedImage.dataset.noteImageId);
      setSelectedImageWidth(getImageWidth(clickedImage));
      setSelectedShapeId(null);
      return;
    }

    if (clickedShape?.dataset.noteShapeId) {
      setSelectedShapeId(clickedShape.dataset.noteShapeId);
      setSelectedImageId(null);
      setSelectedImageWidth(null);
      return;
    }

    setSelectedImageId(null);
    setSelectedImageWidth(null);
    setSelectedShapeId(null);
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
    setSelectedShapeId(null);
    setImageFlipX(false);
    setImageFlipY(false);

    if (editorRef.current) {
      editorRef.current.innerHTML = initialHtml || "<p><br></p>";
      normalizeEditorImages();
    }
  }, [initialHtml, normalizeEditorImages]);

  useEffect(() => {
    updateSelectedImageVisual(selectedImageId);
  }, [selectedImageId, updateSelectedImageVisual]);

  useEffect(() => {
    if (!selectedImageId) return;
    const img = getSelectedImage();
    if (!img) return;
    const flipX = img.dataset.noteFlipX === "true";
    const flipY = img.dataset.noteFlipY === "true";
    setImageFlipX(flipX);
    setImageFlipY(flipY);
    applyImageTransformStyles(img);
  }, [applyImageTransformStyles, getSelectedImage, selectedImageId]);

  useEffect(() => {
    updateSelectedShapeVisual(selectedShapeId);
  }, [selectedShapeId, updateSelectedShapeVisual]);

  useEffect(() => {
    if (!selectedShapeId) return;
    const container = getSelectedShapeContainer();
    if (!container) return;

    const rotate = Number.parseFloat(container.dataset.noteShapeRotate || "0") || 0;
    const scale = Number.parseFloat(container.dataset.noteShapeScale || "1") || 1;
    const flipX = container.dataset.noteShapeFlipX === "true";
    const flipY = container.dataset.noteShapeFlipY === "true";

    setShapeRotation(rotate);
    setShapeScale(scale);
    setShapeFlipX(flipX);
    setShapeFlipY(flipY);
    applyShapeTransformStyles(container);
  }, [applyShapeTransformStyles, getSelectedShapeContainer, selectedShapeId]);

  useEffect(() => {
    safeLocalStorageSet(NOTE_GRID_STORAGE_KEY, String(gridEnabled));
  }, [gridEnabled]);

  return (
    <div
      className={cn(
        "space-y-3",
        expanded ? "rounded-lg border border-border bg-card p-3 sm:p-4" : "rounded-xl border border-border bg-card p-4",
      )}
    >
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título / Assunto..."
        className="font-semibold text-base"
      />

      <div
        className={cn(
          "sticky z-20 -mx-1 space-y-2 rounded-lg border border-border/70 bg-card/95 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-card/80",
          expanded ? "top-0" : "top-2",
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">{"Formata\u00e7\u00e3o"}</span>
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
            value={fontSizePickerValue}
            onChange={(e) => handleFontSizeChange(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            aria-label="Tamanho do texto"
          >
            <option value="">{`Tam. (${fontSize})`}</option>
            <option value="12">12</option>
            <option value="14">14</option>
            <option value="16">16</option>
            <option value="18">18</option>
            <option value="22">22</option>
            <option value="28">28</option>
          </select>

          <select
            value={fontWeight}
            onChange={(e) => {
              const next = e.target.value;
              setFontWeight(next);
              wrapSelectionWithSpanStyle({ "font-weight": next });
            }}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            aria-label="Grossura do texto"
          >
            <option value="400">Peso (400)</option>
            <option value="500">Peso (500)</option>
            <option value="600">Peso (600)</option>
            <option value="700">Peso (700)</option>
            <option value="800">Peso (800)</option>
          </select>

          <div className="flex items-center gap-2 rounded-md border border-input bg-background px-2 py-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                wrapSelectionWithSpanStyle({
                  "box-shadow": `inset 0 -${markerThickness}px 0 ${markerColor}`,
                  "border-radius": "2px",
                });
              }}
              aria-label="Marca texto"
            >
              <Highlighter className="h-3.5 w-3.5" />
            </Button>
            <input
              type="color"
              value={markerColor}
              onChange={(e) => setMarkerColor(e.target.value)}
              className="h-7 w-7 cursor-pointer rounded-md border border-input bg-background p-0"
              aria-label="Cor do marca texto"
            />
            <select
              value={String(markerThickness)}
              onChange={(e) => setMarkerThickness(Number(e.target.value))}
              className="h-7 rounded-md border border-input bg-background px-2 text-xs"
              aria-label="Grossura do marca texto"
            >
              <option value="4">4px</option>
              <option value="6">6px</option>
              <option value="8">8px</option>
              <option value="10">10px</option>
              <option value="12">12px</option>
              <option value="16">16px</option>
            </select>
          </div>

          <div className="flex items-center gap-2 rounded-md border border-input bg-background px-2 py-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                wrapSelectionWithSpanStyle({
                  "text-decoration-line": "underline",
                  "text-decoration-color": underlineDecorColor,
                  "text-decoration-thickness": `${underlineDecorThickness}px`,
                  "text-underline-offset": "2px",
                });
              }}
              aria-label="Sublinhado destacado"
            >
              <Underline className="h-3.5 w-3.5" />
            </Button>
            <input
              type="color"
              value={underlineDecorColor}
              onChange={(e) => setUnderlineDecorColor(e.target.value)}
              className="h-7 w-7 cursor-pointer rounded-md border border-input bg-background p-0"
              aria-label="Cor do sublinhado destacado"
            />
            <select
              value={String(underlineDecorThickness)}
              onChange={(e) => setUnderlineDecorThickness(Number(e.target.value))}
              className="h-7 rounded-md border border-input bg-background px-2 text-xs"
              aria-label="Grossura do sublinhado destacado"
            >
              <option value="1">1px</option>
              <option value="2">2px</option>
              <option value="3">3px</option>
              <option value="4">4px</option>
              <option value="6">6px</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Label htmlFor="note-font-color" className="text-xs text-muted-foreground">Cor</Label>
            <input
              id="note-font-color"
              type="color"
              value={activeColor}
              onChange={(e) => applyColor(e.target.value)}
              className="h-8 w-8 cursor-pointer rounded-md border border-input bg-background p-0"
              aria-label="Cor da fonte"
            />
          </div>

          <select
            value=""
            onChange={(e) => {
              const value = e.target.value as NoteShape;
              if (!value) return;
              insertShapeAtCaret(value);
              e.target.value = "";
            }}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
            aria-label="Inserir forma geométrica"
          >
            <option value="">Forma</option>
            <option value="line">Linha</option>
            <option value="arrow">Seta</option>
            <option value="rectangle">Retângulo</option>
            <option value="rounded-rectangle">Retângulo arred.</option>
            <option value="square">Quadrado</option>
            <option value="circle">Círculo</option>
            <option value="ellipse">Elipse</option>
            <option value="triangle">Triângulo</option>
            <option value="diamond">Losango</option>
            <option value="pentagon">Pentágono</option>
            <option value="hexagon">Hexágono</option>
            <option value="octagon">Octógono</option>
            <option value="star">Estrela</option>
          </select>

          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2 py-1">
            <Switch
              id="note-grid"
              checked={gridEnabled}
              onCheckedChange={setGridEnabled}
              aria-label="Ativar grid"
            />
            <Label htmlFor="note-grid" className="text-xs font-medium text-foreground/80 cursor-pointer">Grid</Label>
          </div>

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

        {selectedShapeId && (
          <div className="flex flex-col gap-2 rounded-lg border border-border/70 bg-muted/30 p-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground mr-1">Forma selecionada</span>

              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  const next = (shapeRotation - 15 + 360) % 360;
                  setShapeRotation(next);
                  setShapeTransform({ rotate: next });
                }}
                aria-label="Girar -15°"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  const next = (shapeRotation + 15) % 360;
                  setShapeRotation(next);
                  setShapeTransform({ rotate: next });
                }}
                aria-label="Girar +15°"
              >
                <RotateCw className="h-3.5 w-3.5" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  const next = !shapeFlipX;
                  setShapeFlipX(next);
                  setShapeTransform({ flipX: next });
                }}
                aria-label="Espelhar horizontal"
              >
                <FlipHorizontal className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  const next = !shapeFlipY;
                  setShapeFlipY(next);
                  setShapeTransform({ flipY: next });
                }}
                aria-label="Espelhar vertical"
              >
                <FlipVertical className="h-3.5 w-3.5" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  const next = Math.max(0.5, Math.round((shapeScale - 0.1) * 100) / 100);
                  setShapeScale(next);
                  setShapeTransform({ scale: next });
                }}
                aria-label="Diminuir tamanho"
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  const next = Math.min(3, Math.round((shapeScale + 0.1) * 100) / 100);
                  setShapeScale(next);
                  setShapeTransform({ scale: next });
                }}
                aria-label="Aumentar tamanho"
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>

              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive ml-auto"
                onClick={removeSelectedShape}
                aria-label="Remover forma"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 min-w-[240px] flex-1">
                <span className="text-xs text-muted-foreground w-14">Giro</span>
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={1}
                  value={shapeRotation}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setShapeRotation(next);
                    setShapeTransform({ rotate: next });
                  }}
                  className="w-full accent-primary"
                />
                <span className="text-xs text-muted-foreground w-12 text-right">{Math.round(shapeRotation)}°</span>
              </div>

              <div className="flex items-center gap-2 min-w-[240px] flex-1">
                <span className="text-xs text-muted-foreground w-14">Tamanho</span>
                <input
                  type="range"
                  min={0.5}
                  max={3}
                  step={0.05}
                  value={shapeScale}
                  onChange={(e) => {
                    const next = Math.round(Number(e.target.value) * 100) / 100;
                    setShapeScale(next);
                    setShapeTransform({ scale: next });
                  }}
                  className="w-full accent-primary"
                />
                <span className="text-xs text-muted-foreground w-12 text-right">{Math.round(shapeScale * 100)}%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div
        ref={editorSurfaceRef}
        className="relative"
        onPointerMove={handleSurfacePointerMove}
        onPointerUp={handleSurfacePointerUp}
      >
        {isEditorEmpty && (
          <span className="pointer-events-none absolute left-3 top-2.5 text-sm text-slate-400">
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
          onPointerDown={handleEditorPointerDown}
          onPointerMove={(e) => {
            handleEditorPointerMove(e);
            handleSurfacePointerMove(e);
          }}
          onPointerUp={(e) => {
            handleEditorPointerUp(e);
            handleSurfacePointerUp(e);
          }}
          onKeyDown={(e) => {
            if (e.key !== "Delete" && e.key !== "Backspace") return;
            if (selectedImageId) {
              e.preventDefault();
              removeSelectedImage();
              return;
            }
            if (selectedShapeId) {
              e.preventDefault();
              removeSelectedShape();
            }
          }}
          className={cn(
            "note-editor rounded-md border border-input bg-white px-3 py-2 text-sm text-slate-900 caret-slate-900 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            expanded ? "min-h-[65vh] sm:min-h-[70vh]" : "min-h-[170px]",
            gridEnabled && "note-grid",
          )}
        />

        {overlayRect && (
          <div
            className="pointer-events-none absolute"
            style={{
              left: overlayRect.left,
              top: overlayRect.top,
              width: overlayRect.width,
              height: overlayRect.height,
            }}
          >
            <div className="pointer-events-auto absolute -left-1 -top-1 note-block-overlay-handle" onPointerDown={beginResize("nw")} />
            <div className="pointer-events-auto absolute -right-1 -top-1 note-block-overlay-handle" onPointerDown={beginResize("ne")} />
            <div className="pointer-events-auto absolute -left-1 -bottom-1 note-block-overlay-handle" onPointerDown={beginResize("sw")} />
            <div className="pointer-events-auto absolute -right-1 -bottom-1 note-block-overlay-handle" onPointerDown={beginResize("se")} />

            {overlayRect.kind === "shape" && (
              <div className="pointer-events-auto absolute -top-10 left-0 flex items-center gap-1 rounded-md border border-border bg-background/95 px-2 py-1 shadow-sm">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    const next = (shapeRotation - 15 + 360) % 360;
                    setShapeRotation(next);
                    setShapeTransform({ rotate: next });
                  }}
                  aria-label="Girar -15°"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    const next = (shapeRotation + 15) % 360;
                    setShapeRotation(next);
                    setShapeTransform({ rotate: next });
                  }}
                  aria-label="Girar +15°"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    const next = !shapeFlipX;
                    setShapeFlipX(next);
                    setShapeTransform({ flipX: next });
                  }}
                  aria-label="Espelhar horizontal"
                >
                  <FlipHorizontal className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    const next = !shapeFlipY;
                    setShapeFlipY(next);
                    setShapeTransform({ flipY: next });
                  }}
                  aria-label="Espelhar vertical"
                >
                  <FlipVertical className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}

            {overlayRect.kind === "image" && (
              <div className="pointer-events-auto absolute -top-10 left-0 flex items-center gap-1 rounded-md border border-border bg-background/95 px-2 py-1 shadow-sm">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    const next = !imageFlipX;
                    setImageFlipX(next);
                    setImageFlip({ flipX: next });
                  }}
                  aria-label="Espelhar horizontal"
                >
                  <FlipHorizontal className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    const next = !imageFlipY;
                    setImageFlipY(next);
                    setImageFlip({ flipY: next });
                  }}
                  aria-label="Espelhar vertical"
                >
                  <FlipVertical className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
        )}
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
