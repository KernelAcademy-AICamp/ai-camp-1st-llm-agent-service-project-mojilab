export interface Layer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  visible: boolean;
  locked: boolean;
  name: string;
  id: number;
  transform: {
    x: number;
    y: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
  };
  sceneId?: string; // 원본 이모티콘 Scene ID (새로 추가된 레이어는 없음)
  originalImageData?: string; // 초기 이미지 데이터 (base64)
  modified?: boolean; // 변경 여부 플래그
}

export interface LayerState {
  imageData: ImageData;
  visible: boolean;
  locked: boolean;
  name: string;
  transform: {
    x: number;
    y: number;
    rotation: number;
    scaleX: number;
    scaleY: number;
  };
}

export interface Selection {
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
  path?: Point[]; // For lasso selection
}

export interface Transform {
  active: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  originalImageData: ImageData | null;
}

export type ToolType =
  | 'brush'
  | 'eraser'
  | 'paint-bucket'
  | 'eyedropper'
  | 'text'
  | 'lasso'
  | 'move'
  | 'transform'
  | 'select-rect'
  | 'select-circle'
  | 'magic-wand'
  | 'line'
  | 'rect'
  | 'circle';

export type BrushStyle = 'normal' | 'soft' | 'hard' | 'spray';

export interface Point {
  x: number;
  y: number;
}

export interface LayerGroup {
  id: string;
  name: string;
  layerIds: string[];
  visible: boolean;
  collapsed: boolean;
}
