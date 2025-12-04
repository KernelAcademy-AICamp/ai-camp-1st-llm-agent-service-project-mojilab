'use client';

import { forwardRef, useEffect, useRef, MutableRefObject } from 'react';
import { Layer, Selection, Transform, ToolType, BrushStyle, Point } from '@/types/image-editor';
import { useTheme } from '@/contexts/ThemeContext';

interface CanvasAreaProps {
  width: number;
  height: number;
  layers: Layer[];
  activeLayerIndex: number;
  currentTool: ToolType;
  brushSize: number;
  brushOpacity: number;
  brushStyle: BrushStyle;
  brushColor: string;
  selection: Selection | null;
  transform: Transform;
  zoom?: number;
  isDrawingRef: MutableRefObject<boolean>;
  lastPosRef: MutableRefObject<Point>;
  selectionStartRef: MutableRefObject<Point | null>;
  isSelectingRef: MutableRefObject<boolean>;
  shapeStartRef: MutableRefObject<Point | null>;
  isDrawingShapeRef: MutableRefObject<boolean>;
  moveStartRef: MutableRefObject<Point | null>;
  layerOffsetRef: MutableRefObject<{ x: number; y: number }>;
  onSelectionChange: (selection: Selection | null) => void;
  onTransformChange: (transform: Transform) => void;
  onSaveState: () => void;
  onLayerAdd?: (imageData?: ImageData, layerName?: string, insertIndex?: number, sceneId?: string) => Layer | null;
  onBrushColorChange?: (color: string) => void;
  onMarkLayerModified?: (layerIndex: number) => void;
  onSelectLayerAtPosition?: (x: number, y: number) => void;
}

const CanvasArea = forwardRef<HTMLDivElement, CanvasAreaProps>(
  (
    {
      width,
      height,
      layers,
      activeLayerIndex,
      currentTool,
      brushSize,
      brushOpacity,
      brushStyle,
      brushColor,
      selection,
      transform,
      zoom = 1,
      isDrawingRef,
      lastPosRef,
      selectionStartRef,
      isSelectingRef,
      shapeStartRef,
      isDrawingShapeRef,
      moveStartRef,
      layerOffsetRef,
      onSelectionChange,
      onTransformChange,
      onSaveState,
      onLayerAdd,
      onBrushColorChange,
      onMarkLayerModified,
      onSelectLayerAtPosition,
    },
    ref
  ) => {
    const { colors } = useTheme();
    const mainCanvasRef = useRef<HTMLCanvasElement>(null);
    const selectionCanvasRef = useRef<HTMLCanvasElement>(null);
    const lassoPointsRef = useRef<Point[]>([]);
    const copiedImageDataRef = useRef<ImageData | null>(null);
    const copiedSelectionRef = useRef<Selection | null>(null);
    const transformHandleRef = useRef<string | null>(null); // 'nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w', 'move'
    const transformStartRef = useRef<{ x: number; y: number; transform: Transform } | null>(null);

    const floodFill = (ctx: CanvasRenderingContext2D, x: number, y: number, fillColor: string) => {
      const imageData = ctx.getImageData(0, 0, width, height);
      const pixels = imageData.data;
      const targetColor = getPixelColor(pixels, x, y, width);
      const replacementColor = hexToRgb(fillColor);

      if (colorsMatch(targetColor, replacementColor)) return;

      const stack: Point[] = [{ x: Math.floor(x), y: Math.floor(y) }];
      const visited = new Set<string>();

      while (stack.length > 0) {
        const point = stack.pop()!;
        const key = `${point.x},${point.y}`;

        if (visited.has(key)) continue;
        if (point.x < 0 || point.x >= width || point.y < 0 || point.y >= height) continue;

        const currentColor = getPixelColor(pixels, point.x, point.y, width);
        if (!colorsMatch(currentColor, targetColor)) continue;

        visited.add(key);
        setPixelColor(pixels, point.x, point.y, width, replacementColor);

        stack.push({ x: point.x + 1, y: point.y });
        stack.push({ x: point.x - 1, y: point.y });
        stack.push({ x: point.x, y: point.y + 1 });
        stack.push({ x: point.x, y: point.y - 1 });
      }

      ctx.putImageData(imageData, 0, 0);
    };

    const getPixelColor = (pixels: Uint8ClampedArray, x: number, y: number, width: number) => {
      const index = (y * width + x) * 4;
      return { r: pixels[index], g: pixels[index + 1], b: pixels[index + 2], a: pixels[index + 3] };
    };

    const setPixelColor = (pixels: Uint8ClampedArray, x: number, y: number, width: number, color: { r: number; g: number; b: number }) => {
      const index = (y * width + x) * 4;
      pixels[index] = color.r;
      pixels[index + 1] = color.g;
      pixels[index + 2] = color.b;
      pixels[index + 3] = 255;
    };

    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 0, g: 0, b: 0 };
    };

    const colorsMatch = (a: { r: number; g: number; b: number; a: number }, b: { r: number; g: number; b: number }) => {
      return Math.abs(a.r - b.r) < 5 && Math.abs(a.g - b.g) < 5 && Math.abs(a.b - b.b) < 5;
    };

    // 마법봉 선택: 클릭한 색상과 유사한 색상의 연결된 영역을 선택
    const createMagicWandSelection = (ctx: CanvasRenderingContext2D, point: Point) => {
      const tolerance = 30; // 색상 허용 오차 (0-255)
      const imageData = ctx.getImageData(0, 0, width, height);
      const pixels = imageData.data;

      // 클릭한 픽셀의 색상
      const startX = Math.floor(point.x);
      const startY = Math.floor(point.y);
      const targetColor = getPixelColor(pixels, startX, startY, width);

      console.log('🎨 Target color:', targetColor);

      // Flood fill로 유사한 색상 영역 찾기
      const visited = new Set<string>();
      const selectedPixels: Point[] = [];
      const stack: Point[] = [{ x: startX, y: startY }];

      // 색상 유사도 체크 (tolerance 적용)
      const isSimilarColor = (color: { r: number; g: number; b: number; a: number }) => {
        return (
          Math.abs(color.r - targetColor.r) <= tolerance &&
          Math.abs(color.g - targetColor.g) <= tolerance &&
          Math.abs(color.b - targetColor.b) <= tolerance &&
          Math.abs(color.a - targetColor.a) <= tolerance
        );
      };

      // Flood fill 알고리즘
      while (stack.length > 0) {
        const p = stack.pop()!;
        const key = `${p.x},${p.y}`;

        if (visited.has(key)) continue;
        if (p.x < 0 || p.x >= width || p.y < 0 || p.y >= height) continue;

        const currentColor = getPixelColor(pixels, p.x, p.y, width);
        if (!isSimilarColor(currentColor)) continue;

        visited.add(key);
        selectedPixels.push(p);

        // 4방향 탐색
        stack.push({ x: p.x + 1, y: p.y });
        stack.push({ x: p.x - 1, y: p.y });
        stack.push({ x: p.x, y: p.y + 1 });
        stack.push({ x: p.x, y: p.y - 1 });
      }

      console.log(`🪄 Magic wand selected ${selectedPixels.length} pixels`);

      if (selectedPixels.length === 0) {
        console.log('⚠️ No pixels selected');
        return;
      }

      // 선택된 픽셀들의 경계 찾기
      let minX = selectedPixels[0].x;
      let maxX = selectedPixels[0].x;
      let minY = selectedPixels[0].y;
      let maxY = selectedPixels[0].y;

      for (const pixel of selectedPixels) {
        minX = Math.min(minX, pixel.x);
        maxX = Math.max(maxX, pixel.x);
        minY = Math.min(minY, pixel.y);
        maxY = Math.max(maxY, pixel.y);
      }

      // 선택 영역 생성 (path 방식으로 저장)
      const newSelection: Selection = {
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
        type: 'magic-wand',
        path: selectedPixels, // 실제 선택된 픽셀들
      };

      onSelectionChange(newSelection);

      // 선택 영역 시각화
      drawMagicWandSelection(selectedPixels, minX, minY, maxX, maxY);
    };

    // 마법봉 선택 영역 시각화
    const drawMagicWandSelection = (
      selectedPixels: Point[],
      minX: number,
      minY: number,
      maxX: number,
      maxY: number
    ) => {
      const canvas = selectionCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 선택된 픽셀들을 점으로 표시 (경계만)
      const pixelSet = new Set(selectedPixels.map(p => `${p.x},${p.y}`));

      // 경계 픽셀 찾기 (4방향 중 하나라도 선택 안된 픽셀이 있으면 경계)
      const boundaryPixels: Point[] = [];
      for (const pixel of selectedPixels) {
        const neighbors = [
          { x: pixel.x + 1, y: pixel.y },
          { x: pixel.x - 1, y: pixel.y },
          { x: pixel.x, y: pixel.y + 1 },
          { x: pixel.x, y: pixel.y - 1 },
        ];

        const isBoundary = neighbors.some(n => !pixelSet.has(`${n.x},${n.y}`));
        if (isBoundary) {
          boundaryPixels.push(pixel);
        }
      }

      // 경계 그리기 (점선)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      for (const pixel of boundaryPixels) {
        ctx.fillRect(pixel.x, pixel.y, 1, 1);
      }

      // 외곽선도 추가로 그리기
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(minX - 1, minY - 1, maxX - minX + 3, maxY - minY + 3);
      ctx.setLineDash([]);

      console.log(`✅ Drew magic wand selection: ${boundaryPixels.length} boundary pixels`);
    };

    const drawTransformHandles = () => {
      const canvas = selectionCanvasRef.current;
      if (!canvas || !transform.active) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const { x, y, width, height } = transform;
      const handleSize = 8;

      // Draw bounding box
      ctx.strokeStyle = '#0066ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(x, y, width, height);
      ctx.setLineDash([]);

      // Draw handles
      const handles = [
        { x: x, y: y }, // nw
        { x: x + width / 2, y: y }, // n
        { x: x + width, y: y }, // ne
        { x: x + width, y: y + height / 2 }, // e
        { x: x + width, y: y + height }, // se
        { x: x + width / 2, y: y + height }, // s
        { x: x, y: y + height }, // sw
        { x: x, y: y + height / 2 }, // w
      ];

      ctx.fillStyle = '#0066ff';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;

      for (const handle of handles) {
        ctx.fillRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
        ctx.strokeRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
      }

      console.log(`✅ Drew transform handles at (${x}, ${y}) ${width}x${height}`);
    };

    const getCanvasCoords = (e: MouseEvent | React.MouseEvent): Point => {
      const canvas = mainCanvasRef.current;
      if (!canvas) return { x: 0, y: 0 };

      const rect = canvas.getBoundingClientRect();
      // zoom을 고려한 좌표 계산
      return {
        x: (e.clientX - rect.left) / zoom,
        y: (e.clientY - rect.top) / zoom,
      };
    };

    const getTransformHandleAtPoint = (point: Point): string | null => {
      if (!transform.active) return null;

      const handleSize = 8;
      const { x, y, width, height } = transform;

      const handles = {
        nw: { x: x - handleSize / 2, y: y - handleSize / 2 },
        n: { x: x + width / 2 - handleSize / 2, y: y - handleSize / 2 },
        ne: { x: x + width - handleSize / 2, y: y - handleSize / 2 },
        e: { x: x + width - handleSize / 2, y: y + height / 2 - handleSize / 2 },
        se: { x: x + width - handleSize / 2, y: y + height - handleSize / 2 },
        s: { x: x + width / 2 - handleSize / 2, y: y + height - handleSize / 2 },
        sw: { x: x - handleSize / 2, y: y + height - handleSize / 2 },
        w: { x: x - handleSize / 2, y: y + height / 2 - handleSize / 2 },
      };

      for (const [key, handle] of Object.entries(handles)) {
        if (
          point.x >= handle.x &&
          point.x <= handle.x + handleSize &&
          point.y >= handle.y &&
          point.y <= handle.y + handleSize
        ) {
          return key;
        }
      }

      // Check if inside transform bounds for move
      if (point.x >= x && point.x <= x + width && point.y >= y && point.y <= y + height) {
        return 'move';
      }

      return null;
    };

    const getTransformCursor = (handle: string | null): string => {
      if (!handle) return 'default';

      const cursorMap: { [key: string]: string } = {
        nw: 'nw-resize',
        n: 'n-resize',
        ne: 'ne-resize',
        e: 'e-resize',
        se: 'se-resize',
        s: 's-resize',
        sw: 'sw-resize',
        w: 'w-resize',
        move: 'move',
      };

      return cursorMap[handle] || 'default';
    };

    const getCursorStyle = () => {
      // Transform mode takes priority
      if (transform.active && mainCanvasRef.current) {
        const rect = mainCanvasRef.current.getBoundingClientRect();
        // We need to get current mouse position to determine cursor
        // This is a simplified version - actual cursor will be set in mouse move handler
        return transformHandleRef.current ? getTransformCursor(transformHandleRef.current) : 'default';
      }

      if (currentTool === 'move') {
        // 이동 중일 때는 grabbing, 아닐 때는 grab
        return moveStartRef.current ? 'grabbing' : 'grab';
      }
      if (currentTool === 'eyedropper') return 'crosshair';
      if (currentTool === 'text') return 'text';
      if (currentTool.startsWith('select-') || currentTool === 'lasso') return 'crosshair';
      if (currentTool === 'magic-wand') return 'crosshair';
      if (currentTool === 'brush' || currentTool === 'eraser') return 'crosshair';
      if (currentTool === 'paint-bucket') return 'pointer';
      if (['line', 'rect', 'circle'].includes(currentTool)) return 'crosshair';
      return 'default';
    };

    // Point-in-polygon algorithm (ray casting)
    const isPointInPolygon = (point: Point, polygon: Point[]): boolean => {
      let inside = false;
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;

        const intersect = ((yi > point.y) !== (yj > point.y))
          && (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    };

    const isPointInSelection = (point: Point): boolean => {
      if (!selection) return true;

      if (selection.type === 'select-rect') {
        return (
          point.x >= selection.x &&
          point.x <= selection.x + selection.width &&
          point.y >= selection.y &&
          point.y <= selection.y + selection.height
        );
      } else if (selection.type === 'select-circle') {
        const centerX = selection.x + selection.width / 2;
        const centerY = selection.y + selection.height / 2;
        const radiusX = selection.width / 2;
        const radiusY = selection.height / 2;
        const dx = (point.x - centerX) / radiusX;
        const dy = (point.y - centerY) / radiusY;
        return dx * dx + dy * dy <= 1;
      } else if (selection.type === 'lasso' && selection.path && selection.path.length > 0) {
        return isPointInPolygon(point, selection.path);
      }

      return true;
    };

    const startDrawing = (e: React.MouseEvent) => {
      console.log(`🚀 startDrawing called, currentTool: ${currentTool}, transform.active: ${transform.active}`);
      const coords = getCanvasCoords(e);
      console.log(`📍 Mouse coords:`, coords);

      // Transform mode handling
      if (transform.active) {
        console.log(`🔷 Transform active! Bounds: x=${transform.x}, y=${transform.y}, w=${transform.width}, h=${transform.height}`);
        const handle = getTransformHandleAtPoint(coords);
        console.log(`🎯 Handle at point:`, handle);
        if (handle) {
          console.log('✅ Transform handle clicked:', handle);
          transformHandleRef.current = handle;
          transformStartRef.current = {
            x: coords.x,
            y: coords.y,
            transform: { ...transform },
          };
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }

      // Ctrl+클릭 시 해당 위치의 레이어를 선택
      if (e.ctrlKey || e.metaKey) {
        console.log('🎯 Ctrl+Click detected, selecting layer at position');
        if (onSelectLayerAtPosition) {
          onSelectLayerAtPosition(coords.x, coords.y);
        }
        return;
      }

      // 마법봉 툴 처리
      if (currentTool === 'magic-wand') {
        if (layers.length === 0 || activeLayerIndex >= layers.length) return;

        const layer = layers[activeLayerIndex];
        if (layer.locked) {
          console.log('🔒 Layer is locked');
          return;
        }

        console.log('🪄 Magic wand selection at:', coords);
        createMagicWandSelection(layer.ctx, coords);
        return;
      }

      // 선택 영역이 있고, 선택 도구가 아니고, 선택 영역 밖을 클릭하면 선택 해제
      if (
        selection &&
        !currentTool.startsWith('select-') &&
        currentTool !== 'lasso' &&
        !isPointInSelection(coords)
      ) {
        console.log('🔲 Selection exists, clearing and returning');
        clearSelection();
        return;
      }

      console.log(`✅ Setting isDrawingRef.current = true`);
      isDrawingRef.current = true;
      lastPosRef.current = coords;

      if (layers.length === 0 || activeLayerIndex >= layers.length) {
        console.log(`⚠️ No layers or invalid activeLayerIndex, returning`);
        return;
      }

      const layer = layers[activeLayerIndex];
      console.log(`📝 Active layer: ${layer.name}, locked: ${layer.locked}`);

      // Check if layer is locked
      if (layer.locked && !currentTool.startsWith('select-') && currentTool !== 'lasso') {
        console.log('🔒 Layer is locked, drawing disabled');
        isDrawingRef.current = false;
        return;
      }

      const ctx = layer.ctx;
      console.log(`🎨 Ready to draw with tool: ${currentTool}`);

      if (currentTool === 'brush' || currentTool === 'eraser') {
        ctx.save();

        // Apply selection clipping if selection exists
        if (selection) {
          ctx.beginPath();

          if (selection.type === 'select-rect') {
            ctx.rect(selection.x, selection.y, selection.width, selection.height);
          } else if (selection.type === 'select-circle') {
            const centerX = selection.x + selection.width / 2;
            const centerY = selection.y + selection.height / 2;
            ctx.ellipse(centerX, centerY, selection.width / 2, selection.height / 2, 0, 0, Math.PI * 2);
          } else if (selection.type === 'lasso' && selection.path && selection.path.length > 0) {
            ctx.moveTo(selection.path[0].x, selection.path[0].y);
            for (let i = 1; i < selection.path.length; i++) {
              ctx.lineTo(selection.path[i].x, selection.path[i].y);
            }
            ctx.closePath();
          }

          ctx.clip();
        }

        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);
      } else if (currentTool === 'paint-bucket') {
        floodFill(ctx, coords.x, coords.y, brushColor);
        if (onMarkLayerModified) {
          onMarkLayerModified(activeLayerIndex);
        }
        onSaveState();
        isDrawingRef.current = false;
      } else if (currentTool === 'eyedropper') {
        // 색 추출: 클릭한 위치의 픽셀 색상을 가져오기
        const imageData = ctx.getImageData(Math.floor(coords.x), Math.floor(coords.y), 1, 1);
        const pixel = imageData.data;
        const hexColor = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1)}`;

        if (onBrushColorChange) {
          onBrushColorChange(hexColor);
        }

        isDrawingRef.current = false;
      } else if (currentTool === 'text') {
        // 텍스트 입력
        const text = prompt('텍스트를 입력하세요:');
        if (text) {
          ctx.save();
          ctx.font = `${brushSize * 2}px Arial`;
          ctx.fillStyle = brushColor;
          ctx.globalAlpha = brushOpacity / 100;
          ctx.textBaseline = 'top';
          ctx.fillText(text, coords.x, coords.y);
          ctx.restore();
          if (onMarkLayerModified) {
            onMarkLayerModified(activeLayerIndex);
          }
          onSaveState();
        }
        isDrawingRef.current = false;
      } else if (currentTool === 'lasso') {
        lassoPointsRef.current = [coords];
        isSelectingRef.current = true;
      } else if (currentTool === 'move') {
        moveStartRef.current = coords;
        layerOffsetRef.current = { ...layer.transform };
      } else if (currentTool.startsWith('select-')) {
        isSelectingRef.current = true;
        selectionStartRef.current = coords;
        clearSelection();
      } else if (['line', 'rect', 'circle'].includes(currentTool)) {
        isDrawingShapeRef.current = true;
        shapeStartRef.current = coords;
      }
    };

    const draw = (e: React.MouseEvent) => {
      const coords = getCanvasCoords(e);

      // Handle transform resize/move
      if (transformHandleRef.current && transformStartRef.current) {
        const handle = transformHandleRef.current;
        const start = transformStartRef.current;
        const dx = coords.x - start.x;
        const dy = coords.y - start.y;

        let newX = start.transform.x;
        let newY = start.transform.y;
        let newWidth = start.transform.width;
        let newHeight = start.transform.height;

        if (handle === 'move') {
          newX = start.transform.x + dx;
          newY = start.transform.y + dy;
        } else if (handle === 'nw') {
          newX = start.transform.x + dx;
          newY = start.transform.y + dy;
          newWidth = start.transform.width - dx;
          newHeight = start.transform.height - dy;
        } else if (handle === 'n') {
          newY = start.transform.y + dy;
          newHeight = start.transform.height - dy;
        } else if (handle === 'ne') {
          newY = start.transform.y + dy;
          newWidth = start.transform.width + dx;
          newHeight = start.transform.height - dy;
        } else if (handle === 'e') {
          newWidth = start.transform.width + dx;
        } else if (handle === 'se') {
          newWidth = start.transform.width + dx;
          newHeight = start.transform.height + dy;
        } else if (handle === 's') {
          newHeight = start.transform.height + dy;
        } else if (handle === 'sw') {
          newX = start.transform.x + dx;
          newWidth = start.transform.width - dx;
          newHeight = start.transform.height + dy;
        } else if (handle === 'w') {
          newX = start.transform.x + dx;
          newWidth = start.transform.width - dx;
        }

        // Prevent negative dimensions
        if (newWidth < 10) {
          newWidth = 10;
          newX = start.transform.x + start.transform.width - 10;
        }
        if (newHeight < 10) {
          newHeight = 10;
          newY = start.transform.y + start.transform.height - 10;
        }

        onTransformChange({
          ...transform,
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
        });

        drawTransformHandles();
        return;
      }

      if (
        !isDrawingRef.current &&
        !isSelectingRef.current &&
        !isDrawingShapeRef.current
      )
        return;

      if (layers.length === 0 || activeLayerIndex >= layers.length) return;

      const layer = layers[activeLayerIndex];
      const ctx = layer.ctx;

      if (currentTool === 'brush') {
        ctx.strokeStyle = brushColor;
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = brushOpacity / 100;

        if (brushStyle === 'soft') {
          ctx.shadowBlur = brushSize / 2;
          ctx.shadowColor = brushColor;
        } else if (brushStyle === 'spray') {
          for (let i = 0; i < 10; i++) {
            const offsetX = (Math.random() - 0.5) * brushSize;
            const offsetY = (Math.random() - 0.5) * brushSize;
            ctx.fillStyle = brushColor;
            ctx.fillRect(coords.x + offsetX, coords.y + offsetY, 1, 1);
          }
        } else {
          ctx.shadowBlur = 0;
        }

        if (brushStyle !== 'spray') {
          ctx.lineTo(coords.x, coords.y);
          ctx.stroke();
        }
      } else if (currentTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.lineWidth = brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 1;

        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
      } else if (currentTool === 'move' && moveStartRef.current) {
        const dx = coords.x - moveStartRef.current.x;
        const dy = coords.y - moveStartRef.current.y;

        layer.transform.x = layerOffsetRef.current.x + dx;
        layer.transform.y = layerOffsetRef.current.y + dy;

        updateLayerTransform(layer);
      } else if (isSelectingRef.current) {
        if (currentTool === 'lasso') {
          lassoPointsRef.current.push(coords);
          drawLassoPreview();
        } else {
          drawSelectionPreview(coords);
        }
      } else if (isDrawingShapeRef.current) {
        drawShapePreview(coords);
      }

      lastPosRef.current = coords;
    };

    const stopDrawing = (e: React.MouseEvent) => {
      console.log(`🛑 stopDrawing called, isDrawingRef.current: ${isDrawingRef.current}, currentTool: ${currentTool}`);

      // Reset transform handle state
      if (transformHandleRef.current) {
        transformHandleRef.current = null;
        transformStartRef.current = null;
        return;
      }

      if (isDrawingRef.current) {
        // Restore context for brush/eraser (always saved in startDrawing)
        if (currentTool === 'brush' || currentTool === 'eraser') {
          if (layers.length > 0 && activeLayerIndex < layers.length) {
            const layer = layers[activeLayerIndex];
            layer.ctx.restore();
          }
        }

        // Mark layer as modified when drawing is done
        console.log(`🎨 Checking if should mark layer as modified: onMarkLayerModified=${!!onMarkLayerModified}, currentTool=${currentTool}, activeLayerIndex=${activeLayerIndex}`);

        if (onMarkLayerModified && (currentTool === 'brush' || currentTool === 'eraser' || currentTool === 'paint-bucket' || currentTool === 'text')) {
          console.log(`📝 Calling onMarkLayerModified(${activeLayerIndex})`);
          onMarkLayerModified(activeLayerIndex);
        } else {
          console.log(`⏭️ Not calling onMarkLayerModified: onMarkLayerModified=${!!onMarkLayerModified}, tool=${currentTool}`);
        }

        isDrawingRef.current = false;
        onSaveState();
      }

      if (isSelectingRef.current) {
        if (currentTool === 'lasso' && lassoPointsRef.current.length > 2) {
          createLassoSelection();
          isSelectingRef.current = false;
          lassoPointsRef.current = [];
        } else if (selectionStartRef.current) {
          const coords = getCanvasCoords(e);
          createSelection(coords);
          isSelectingRef.current = false;
        }
      }

      if (isDrawingShapeRef.current && shapeStartRef.current) {
        const coords = getCanvasCoords(e);
        drawFinalShape(coords);
        isDrawingShapeRef.current = false;
        clearShapePreview();

        // Mark layer as modified when shape drawing is done
        if (onMarkLayerModified) {
          onMarkLayerModified(activeLayerIndex);
        }

        onSaveState();
      }

      moveStartRef.current = null;
    };

    const drawSelectionPreview = (coords: Point) => {
      const canvas = selectionCanvasRef.current;
      if (!canvas || !selectionStartRef.current) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const x = Math.min(selectionStartRef.current.x, coords.x);
      const y = Math.min(selectionStartRef.current.y, coords.y);
      const w = Math.abs(coords.x - selectionStartRef.current.x);
      const h = Math.abs(coords.y - selectionStartRef.current.y);

      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);

      if (currentTool === 'select-rect') {
        ctx.strokeRect(x, y, w, h);
      } else if (currentTool === 'select-circle') {
        ctx.beginPath();
        const centerX = (selectionStartRef.current.x + coords.x) / 2;
        const centerY = (selectionStartRef.current.y + coords.y) / 2;
        const radiusX = w / 2;
        const radiusY = h / 2;
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.setLineDash([]);
    };

    const createSelection = (coords: Point) => {
      if (!selectionStartRef.current) return;

      const x = Math.min(selectionStartRef.current.x, coords.x);
      const y = Math.min(selectionStartRef.current.y, coords.y);
      const w = Math.abs(coords.x - selectionStartRef.current.x);
      const h = Math.abs(coords.y - selectionStartRef.current.y);

      onSelectionChange({
        x,
        y,
        width: w,
        height: h,
        type: currentTool,
      });

      // 선택 영역 표시 유지
      const canvas = selectionCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);

      if (currentTool === 'select-rect') {
        ctx.strokeRect(x, y, w, h);
      } else if (currentTool === 'select-circle') {
        ctx.beginPath();
        const centerX = x + w / 2;
        const centerY = y + h / 2;
        ctx.ellipse(centerX, centerY, w / 2, h / 2, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.setLineDash([]);
    };

    const clearSelection = () => {
      onSelectionChange(null);
      const canvas = selectionCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const drawLassoPreview = () => {
      const canvas = selectionCanvasRef.current;
      if (!canvas || lassoPointsRef.current.length < 2) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw outer black stroke for contrast
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 4;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(lassoPointsRef.current[0].x, lassoPointsRef.current[0].y);
      for (let i = 1; i < lassoPointsRef.current.length; i++) {
        ctx.lineTo(lassoPointsRef.current[i].x, lassoPointsRef.current[i].y);
      }
      ctx.stroke();

      // Draw inner white stroke for visibility
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.lineDashOffset = 0;
      ctx.beginPath();
      ctx.moveTo(lassoPointsRef.current[0].x, lassoPointsRef.current[0].y);
      for (let i = 1; i < lassoPointsRef.current.length; i++) {
        ctx.lineTo(lassoPointsRef.current[i].x, lassoPointsRef.current[i].y);
      }
      ctx.stroke();

      ctx.setLineDash([]);
    };

    const createLassoSelection = () => {
      const points = lassoPointsRef.current;
      if (points.length < 3) return;

      let minX = points[0].x, maxX = points[0].x;
      let minY = points[0].y, maxY = points[0].y;

      for (const point of points) {
        minX = Math.min(minX, point.x);
        maxX = Math.max(maxX, point.x);
        minY = Math.min(minY, point.y);
        maxY = Math.max(maxY, point.y);
      }

      onSelectionChange({
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        type: 'lasso',
        path: [...points], // Store the actual lasso path
      });

      // Draw final lasso selection with better visibility
      const canvas = selectionCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw outer black stroke
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 4;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.closePath();
      ctx.stroke();

      // Draw inner white stroke
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.closePath();
      ctx.stroke();

      ctx.setLineDash([]);
    };

    const drawShapePreview = (coords: Point) => {
      const canvas = mainCanvasRef.current;
      if (!canvas || !shapeStartRef.current) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = brushColor;
      ctx.fillStyle = brushColor;
      ctx.lineWidth = brushSize;
      ctx.globalAlpha = brushOpacity / 100;

      if (currentTool === 'line') {
        ctx.beginPath();
        ctx.moveTo(shapeStartRef.current.x, shapeStartRef.current.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
      } else if (currentTool === 'rect') {
        const x = Math.min(shapeStartRef.current.x, coords.x);
        const y = Math.min(shapeStartRef.current.y, coords.y);
        const w = Math.abs(coords.x - shapeStartRef.current.x);
        const h = Math.abs(coords.y - shapeStartRef.current.y);
        ctx.strokeRect(x, y, w, h);
      } else if (currentTool === 'circle') {
        const centerX = (shapeStartRef.current.x + coords.x) / 2;
        const centerY = (shapeStartRef.current.y + coords.y) / 2;
        const radiusX = Math.abs(coords.x - shapeStartRef.current.x) / 2;
        const radiusY = Math.abs(coords.y - shapeStartRef.current.y) / 2;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
    };

    const drawFinalShape = (coords: Point) => {
      if (layers.length === 0 || activeLayerIndex >= layers.length) return;
      if (!shapeStartRef.current) return;

      const layer = layers[activeLayerIndex];
      const ctx = layer.ctx;

      ctx.strokeStyle = brushColor;
      ctx.fillStyle = brushColor;
      ctx.lineWidth = brushSize;
      ctx.globalAlpha = brushOpacity / 100;

      if (currentTool === 'line') {
        ctx.beginPath();
        ctx.moveTo(shapeStartRef.current.x, shapeStartRef.current.y);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
      } else if (currentTool === 'rect') {
        const x = Math.min(shapeStartRef.current.x, coords.x);
        const y = Math.min(shapeStartRef.current.y, coords.y);
        const w = Math.abs(coords.x - shapeStartRef.current.x);
        const h = Math.abs(coords.y - shapeStartRef.current.y);
        ctx.strokeRect(x, y, w, h);
      } else if (currentTool === 'circle') {
        const centerX = (shapeStartRef.current.x + coords.x) / 2;
        const centerY = (shapeStartRef.current.y + coords.y) / 2;
        const radiusX = Math.abs(coords.x - shapeStartRef.current.x) / 2;
        const radiusY = Math.abs(coords.y - shapeStartRef.current.y) / 2;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
    };

    const clearShapePreview = () => {
      const canvas = mainCanvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const updateLayerTransform = (layer: Layer) => {
      layer.canvas.style.transform = `translate(${layer.transform.x}px, ${layer.transform.y}px)
                                     rotate(${layer.transform.rotation}deg)
                                     scale(${layer.transform.scaleX}, ${layer.transform.scaleY})`;
    };

    // Redraw transform handles when transform changes
    useEffect(() => {
      if (transform.active) {
        drawTransformHandles();
      }
    }, [transform]);

    // 레이어 캔버스들을 DOM에 추가
    // Keyboard event handler for copy/paste/deselect/transform
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        // Enter - Apply transform
        if (e.key === 'Enter' && transform.active) {
          console.log('✅ Applying transform');

          if (activeLayerIndex < 0 || activeLayerIndex >= layers.length) return;

          const layer = layers[activeLayerIndex];
          if (!transform.originalImageData) {
            console.warn('⚠️ No originalImageData in transform');
            return;
          }

          // Scale the original image data to the new dimensions
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = width;
          tempCanvas.height = height;
          const tempCtx = tempCanvas.getContext('2d');
          if (!tempCtx) return;

          // Draw original image data
          tempCtx.putImageData(transform.originalImageData, 0, 0);

          // Clear layer canvas and redraw with new dimensions
          layer.ctx.clearRect(0, 0, width, height);
          layer.ctx.drawImage(
            tempCanvas,
            0, 0, transform.originalImageData.width, transform.originalImageData.height,
            transform.x, transform.y, transform.width, transform.height
          );

          // Mark as modified
          if (onMarkLayerModified) {
            onMarkLayerModified(activeLayerIndex);
          }

          // Clear transform
          onTransformChange({
            active: false,
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            rotation: 0,
            originalImageData: null,
          });

          onSaveState();
          console.log('✅ Transform applied');
          e.preventDefault();
          return;
        }

        // Escape - Cancel transform
        if (e.key === 'Escape' && transform.active) {
          console.log('❌ Canceling transform');
          onTransformChange({
            active: false,
            x: 0,
            y: 0,
            width: 0,
            height: 0,
            rotation: 0,
            originalImageData: null,
          });
          e.preventDefault();
          return;
        }

        // Ctrl+C or Cmd+C
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
          if (!selection || activeLayerIndex < 0) return;

          const layer = layers[activeLayerIndex];
          if (!layer) return;

          const ctx = layer.ctx;
          const imageData = ctx.getImageData(
            selection.x,
            selection.y,
            selection.width,
            selection.height
          );

          // If lasso selection, mask out pixels outside the path
          if (selection.type === 'lasso' && selection.path && selection.path.length > 0) {
            const pixels = imageData.data;
            for (let y = 0; y < imageData.height; y++) {
              for (let x = 0; x < imageData.width; x++) {
                const absolutePoint = {
                  x: selection.x + x,
                  y: selection.y + y
                };

                // Check if point is inside lasso path
                if (!isPointInPolygon(absolutePoint, selection.path)) {
                  // Make pixel transparent if outside lasso path
                  const index = (y * imageData.width + x) * 4;
                  pixels[index + 3] = 0; // Set alpha to 0
                }
              }
            }
          }

          copiedImageDataRef.current = imageData;
          copiedSelectionRef.current = { ...selection };

          console.log('Copied selection:', selection.width, 'x', selection.height, 'type:', selection.type);
          e.preventDefault();
        }

        // Ctrl+V or Cmd+V - Create new layer with pasted content
        if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
          if (!copiedImageDataRef.current || !onLayerAdd) return;

          const copiedData = copiedImageDataRef.current;
          const copiedSelection = copiedSelectionRef.current;

          // Create full-size canvas with transparent background
          const fullCanvas = document.createElement('canvas');
          fullCanvas.width = width;
          fullCanvas.height = height;
          const fullCtx = fullCanvas.getContext('2d');
          if (!fullCtx) return;

          // Paste at exact same position as original
          let pasteX = copiedSelection ? copiedSelection.x : (width - copiedData.width) / 2;
          let pasteY = copiedSelection ? copiedSelection.y : (height - copiedData.height) / 2;

          // Put copied data at calculated position
          fullCtx.putImageData(copiedData, pasteX, pasteY);

          // Get the full canvas image data
          const fullImageData = fullCtx.getImageData(0, 0, width, height);

          // Create new layer with pasted content at the top of panel (배열의 맨 뒤)
          // 레이어 패널이 reverse로 표시하므로 배열 끝에 추가해야 패널 맨 위에 보임
          const newSceneId = `new_scene_${Date.now()}`;
          const newLayer = onLayerAdd(fullImageData, '붙여넣기', layers.length, newSceneId);

          console.log('Created paste layer with sceneId:', newSceneId);

          // Create selection at paste location (preserve lasso path if exists)
          const newSelection: Selection = {
            x: pasteX,
            y: pasteY,
            width: copiedData.width,
            height: copiedData.height,
            type: copiedSelection?.type || 'rect',
          };

          // Preserve lasso path if it exists
          if (copiedSelection?.path) {
            newSelection.path = copiedSelection.path;
          }

          onSelectionChange(newSelection);

          console.log('Pasted to new layer at:', pasteX, pasteY);
          e.preventDefault();
        }

        // Ctrl+D or Cmd+D - Deselect
        if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
          onSelectionChange(null);
          console.log('Selection cleared');
          e.preventDefault();
        }

        // Delete or Backspace - Delete selection area
        if ((e.key === 'Delete' || e.key === 'Backspace') && selection) {
          console.log('🗑️ Delete key pressed with selection');

          if (activeLayerIndex < 0 || activeLayerIndex >= layers.length) {
            console.log('⚠️ No active layer');
            return;
          }

          const layer = layers[activeLayerIndex];

          if (layer.locked) {
            console.log('🔒 Layer is locked, cannot delete');
            return;
          }

          const ctx = layer.ctx;

          // Save context state
          ctx.save();

          // Create clipping path from selection
          ctx.beginPath();

          if (selection.type === 'select-rect') {
            ctx.rect(selection.x, selection.y, selection.width, selection.height);
          } else if (selection.type === 'select-circle') {
            const centerX = selection.x + selection.width / 2;
            const centerY = selection.y + selection.height / 2;
            ctx.ellipse(centerX, centerY, selection.width / 2, selection.height / 2, 0, 0, Math.PI * 2);
          } else if (selection.type === 'lasso' && selection.path && selection.path.length > 0) {
            ctx.moveTo(selection.path[0].x, selection.path[0].y);
            for (let i = 1; i < selection.path.length; i++) {
              ctx.lineTo(selection.path[i].x, selection.path[i].y);
            }
            ctx.closePath();
          }

          ctx.clip();

          // Clear the selected area
          ctx.clearRect(0, 0, width, height);

          // Restore context
          ctx.restore();

          console.log('✅ Selection area deleted');

          // Mark layer as modified
          if (onMarkLayerModified) {
            onMarkLayerModified(activeLayerIndex);
          }

          // Save state for undo/redo
          onSaveState();

          // Clear selection
          onSelectionChange(null);

          e.preventDefault();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selection, layers, activeLayerIndex, width, height, onSelectionChange, onSaveState, onLayerAdd, onMarkLayerModified, transform, onTransformChange]);

    useEffect(() => {
      const container = ref as React.MutableRefObject<HTMLDivElement | null>;
      if (!container.current) return;

      const mainCanvas = container.current.querySelector('#main-canvas');
      if (!mainCanvas) return;

      // 기존에 추가된 레이어 캔버스 제거
      const existingLayers = container.current.querySelectorAll('canvas:not(#main-canvas):not(#selection-canvas)');
      existingLayers.forEach(canvas => canvas.remove());

      // 새로운 레이어 캔버스 추가
      layers.forEach((layer, index) => {
        layer.canvas.style.position = 'absolute';
        layer.canvas.style.top = '0';
        layer.canvas.style.left = '0';
        layer.canvas.style.pointerEvents = 'none';
        layer.canvas.style.opacity = layer.visible ? '1' : '0';
        layer.canvas.style.zIndex = String(index + 1);

        container.current!.insertBefore(layer.canvas, mainCanvas.nextSibling);
      });

      console.log(`${layers.length} layer canvases updated in DOM, visibility states:`,
        layers.map((l, i) => `Layer ${i}: ${l.visible ? 'visible' : 'hidden'}`));
    }, [layers, ref]);

    // 레이어 가시성이 변경될 때마다 opacity 업데이트
    useEffect(() => {
      layers.forEach((layer) => {
        layer.canvas.style.opacity = layer.visible ? '1' : '0';
      });
    }, [layers]);

    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'auto',
          position: 'relative',
        }}
      >
        <div
          ref={ref}
          id="canvas-container"
          style={{
            position: 'relative',
            width: `${width}px`,
            height: `${height}px`,
            background: colors.canvas,
            boxShadow: colors.canvas === '#ffffff' ? '0 0 20px rgba(0,0,0,0.1)' : '0 0 20px rgba(0,0,0,0.5)',
            border: `1px solid ${colors.border}`,
            transform: `scale(${zoom})`,
            transformOrigin: 'center',
            transition: 'transform 0.1s ease-out',
          }}
        >
          <canvas
            ref={mainCanvasRef}
            id="main-canvas"
            width={width}
            height={height}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              cursor: getCursorStyle(),
              zIndex: 1000,
            }}
          />
          <canvas
            ref={selectionCanvasRef}
            id="selection-canvas"
            width={width}
            height={height}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              pointerEvents: 'none',
              zIndex: 1001,
            }}
          />
        </div>
      </div>
    );
  }
);

CanvasArea.displayName = 'CanvasArea';

export default CanvasArea;
