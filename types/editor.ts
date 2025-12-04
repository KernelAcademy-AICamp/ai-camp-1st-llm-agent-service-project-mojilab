// Editor tool types
export type EditorTool = 'select' | 'text' | 'draw' | 'erase';

// Text object interface
export interface TextObject {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  fill: string;
  draggable: boolean;
}

// Drawing line interface
export interface DrawingLine {
  id: string;
  tool: 'draw' | 'erase';
  points: number[];
  stroke: string;
  strokeWidth: number;
  globalCompositeOperation?: string;
}

// Editor state interface
export interface EditorState {
  activeTool: EditorTool;

  // Text tool settings
  textFont: string;
  textSize: number;
  textColor: string;

  // Drawing tool settings
  brushSize: number;
  brushColor: string;

  // Eraser tool settings
  eraserSize: number;
}

// History state for undo/redo
export interface HistoryState {
  texts: TextObject[];
  lines: DrawingLine[];
}
