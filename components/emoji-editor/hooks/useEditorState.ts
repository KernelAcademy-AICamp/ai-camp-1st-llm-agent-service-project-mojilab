import { useState, useCallback } from 'react';
import { EditorState, EditorTool, TextObject, DrawingLine, HistoryState } from '@/types/editor';

const MAX_HISTORY = 5;

export function useEditorState() {
  // Editor tool and settings state
  const [state, setState] = useState<EditorState>({
    activeTool: 'select',
    textFont: 'Noto Sans KR',
    textSize: 32,
    textColor: '#000000',
    brushSize: 20,
    brushColor: '#000000',
    eraserSize: 30,
  });

  // Canvas objects
  const [texts, setTexts] = useState<TextObject[]>([]);
  const [lines, setLines] = useState<DrawingLine[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

  // History for undo/redo
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);

  // Save current state to history
  const saveToHistory = useCallback(() => {
    const currentState: HistoryState = {
      texts: [...texts],
      lines: [...lines],
    };

    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(currentState);

    // Keep only last MAX_HISTORY states
    if (newHistory.length > MAX_HISTORY) {
      newHistory.shift();
    } else {
      setHistoryStep(historyStep + 1);
    }

    setHistory(newHistory);
  }, [texts, lines, history, historyStep]);

  // Undo
  const undo = useCallback(() => {
    if (historyStep > 0) {
      const prevState = history[historyStep - 1];
      setTexts(prevState.texts);
      setLines(prevState.lines);
      setHistoryStep(historyStep - 1);
    }
  }, [history, historyStep]);

  // Redo
  const redo = useCallback(() => {
    if (historyStep < history.length - 1) {
      const nextState = history[historyStep + 1];
      setTexts(nextState.texts);
      setLines(nextState.lines);
      setHistoryStep(historyStep + 1);
    }
  }, [history, historyStep]);

  // Change tool
  const setActiveTool = useCallback((tool: EditorTool) => {
    setState((prev) => ({ ...prev, activeTool: tool }));
    setSelectedTextId(null); // Deselect text when changing tool
  }, []);

  // Add new text
  const addText = useCallback(() => {
    const newText: TextObject = {
      id: `text-${Date.now()}`,
      text: '텍스트',
      x: 200,
      y: 200,
      fontSize: state.textSize,
      fontFamily: state.textFont,
      fill: state.textColor,
      draggable: true,
    };

    setTexts((prev) => [...prev, newText]);
    setSelectedTextId(newText.id);
    saveToHistory();
  }, [state.textSize, state.textFont, state.textColor, saveToHistory]);

  // Update text
  const updateText = useCallback((id: string, updates: Partial<TextObject>) => {
    setTexts((prev) =>
      prev.map((text) => (text.id === id ? { ...text, ...updates } : text))
    );
  }, []);

  // Delete selected text
  const deleteSelectedText = useCallback(() => {
    if (selectedTextId) {
      setTexts((prev) => prev.filter((text) => text.id !== selectedTextId));
      setSelectedTextId(null);
      saveToHistory();
    }
  }, [selectedTextId, saveToHistory]);

  // Add drawing line
  const addLine = useCallback((line: DrawingLine) => {
    setLines((prev) => [...prev, line]);
  }, []);

  // Update last line (for drawing in progress)
  const updateLastLine = useCallback((points: number[]) => {
    setLines((prev) => {
      if (prev.length === 0) return prev;
      const newLines = [...prev];
      newLines[newLines.length - 1] = {
        ...newLines[newLines.length - 1],
        points,
      };
      return newLines;
    });
  }, []);

  // Clear all edits
  const clearAll = useCallback(() => {
    setTexts([]);
    setLines([]);
    setHistory([]);
    setHistoryStep(-1);
    setSelectedTextId(null);
  }, []);

  return {
    state,
    setState,
    texts,
    setTexts,
    lines,
    setLines,
    selectedTextId,
    setSelectedTextId,
    history,
    historyStep,
    setActiveTool,
    addText,
    updateText,
    deleteSelectedText,
    addLine,
    updateLastLine,
    saveToHistory,
    undo,
    redo,
    clearAll,
    canUndo: historyStep > 0,
    canRedo: historyStep < history.length - 1,
  };
}
