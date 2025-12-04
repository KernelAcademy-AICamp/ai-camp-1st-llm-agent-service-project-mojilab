'use client';

import { forwardRef, useEffect, useRef, useImperativeHandle } from 'react';
import { Canvas, Image, IText, PencilBrush, CircleBrush, SprayBrush, util, Group } from 'fabric';

interface EditorCanvasProps {
  canvasSize: number;
  imageUrl: string;
  activeTool: 'select' | 'text' | 'sticker' | 'draw' | 'erase' | 'eyedropper' | 'delete';
  brushColor: string;
  brushSize: number;
  brushType: 'pencil' | 'marker' | 'fine';
  eraserSize: number;
  textColor: string;
  textSize: number;
  onHistoryChange?: () => void;
  onColorPick?: (color: string) => void;
}

export interface EditorCanvasRef {
  getCanvas: () => Canvas | null;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearAll: () => void;
  addText: (text: string) => void;
  addTextSticker: (sticker: any) => void;
  addImage: (imageUrl: string) => void;
  deleteSelected: () => void;
  copySelected: () => void;
  paste: () => void;
  groupSelected: () => void;
  ungroupSelected: () => void;
  removeBackground: () => void;
  exportToPNG: () => Promise<string>;
  toDataURL: () => string;
}

const EditorCanvas = forwardRef<EditorCanvasRef, EditorCanvasProps>(
  (
    {
      canvasSize,
      imageUrl,
      activeTool,
      brushColor,
      brushSize,
      brushType,
      eraserSize,
      textColor,
      textSize,
      onHistoryChange,
      onColorPick,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const bgImageRef = useRef<HTMLImageElement>(null);
    const fabricCanvasRef = useRef<Canvas | null>(null);
    const historyRef = useRef<string[]>([]);
    const historyIndexRef = useRef(-1);
    const isInitialLoadRef = useRef(true);

    // Get color at point using temporary canvas
    const getColorAtPoint = (x: number, y: number): string | null => {
      if (!bgImageRef.current) return null;

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvasSize;
      tempCanvas.height = canvasSize;
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return null;

      // Draw background image
      ctx.drawImage(bgImageRef.current, 0, 0, canvasSize, canvasSize);

      // Get pixel data
      const pixel = ctx.getImageData(x, y, 1, 1).data;
      return `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1)}`;
    };

    // Initialize Fabric canvas with transparent background (ONLY on mount or size/image change)
    useEffect(() => {
      if (!canvasRef.current) return;

      console.log('[EditorCanvas] Initializing canvas, imageUrl:', imageUrl);

      const canvas = new Canvas(canvasRef.current, {
        width: canvasSize,
        height: canvasSize,
        selection: true,
        preserveObjectStacking: true,
      });

      // Make canvas truly transparent
      (canvas as any).backgroundColor = null;
      canvas.renderAll();

      fabricCanvasRef.current = canvas;

      // Save state on object changes
      canvas.on('object:added', saveHistory);
      canvas.on('object:modified', saveHistory);
      canvas.on('object:removed', saveHistory);

      return () => {
        canvas.dispose();
      };
    }, [canvasSize, imageUrl]);

    // Eyedropper handler (separate effect to handle activeTool changes)
    useEffect(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      const handleMouseDown = (e: any) => {
        if (activeTool === 'eyedropper' && bgImageRef.current && onColorPick) {
          const pointer = canvas.getPointer(e.e);
          const color = getColorAtPoint(pointer.x, pointer.y);
          if (color) {
            onColorPick(color);
          }
        }
      };

      canvas.on('mouse:down', handleMouseDown);

      return () => {
        canvas.off('mouse:down', handleMouseDown);
      };
    }, [activeTool, onColorPick]);

    // Update canvas settings when tool or brush changes (WITHOUT recreating canvas)
    useEffect(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      // Update selection mode
      canvas.selection = activeTool === 'select';

      // Update drawing mode
      canvas.isDrawingMode = activeTool === 'draw' || activeTool === 'erase';

      if (canvas.isDrawingMode) {
        if (activeTool === 'draw') {
          // Drawing with different brush types
          switch (brushType) {
            case 'pencil': {
              // Mac PDF pencil texture - SprayBrush with density 100
              const sprayBrush = new SprayBrush(canvas);
              sprayBrush.color = brushColor;
              sprayBrush.width = brushSize;
              sprayBrush.density = 100; // Maximum density for texture
              sprayBrush.dotWidth = 1;
              sprayBrush.dotWidthVariance = 1;
              sprayBrush.randomOpacity = false;
              canvas.freeDrawingBrush = sprayBrush;
              break;
            }
            case 'fine': {
              // Fine brush - thin PencilBrush
              const fineBrush = new PencilBrush(canvas);
              fineBrush.color = brushColor;
              fineBrush.width = Math.max(1, brushSize / 2); // Thinner than normal
              fineBrush.strokeLineCap = 'round';
              fineBrush.strokeLineJoin = 'round';
              canvas.freeDrawingBrush = fineBrush;
              break;
            }
            case 'marker': {
              // Smooth marker
              const pencilBrush = new PencilBrush(canvas);
              pencilBrush.color = brushColor;
              pencilBrush.width = brushSize;
              canvas.freeDrawingBrush = pencilBrush;
              break;
            }
          }
        } else if (activeTool === 'erase') {
          // Eraser: use CircleBrush for smoother, more effective erasing
          const eraserBrush = new CircleBrush(canvas);
          eraserBrush.width = eraserSize * 2; // Double the size for more effective erasing
          eraserBrush.color = 'rgba(255,255,255,0.5)'; // Semi-transparent white for visual feedback
          canvas.freeDrawingBrush = eraserBrush;
        }
      }

      canvas.renderAll();
    }, [activeTool, brushColor, brushSize, brushType, eraserSize]);

    // Apply destination-out to eraser paths (THIS IS THE KEY FIX!)
    useEffect(() => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      const handlePathCreated = (e: any) => {
        if (activeTool === 'erase' && e.path) {
          // Apply eraser composite operation to the created path object
          e.path.set({
            globalCompositeOperation: 'destination-out'
          });
          canvas.renderAll();
        }
      };

      canvas.on('path:created', handlePathCreated);

      return () => {
        canvas.off('path:created', handlePathCreated);
      };
    }, [activeTool]);

    // History management
    const saveHistory = () => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      // Skip initial history save
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
        return;
      }

      // Save only the objects
      const objects = canvas.getObjects();
      const json = JSON.stringify(objects.map(obj => obj.toJSON()));

      // Remove future history if we're not at the end
      if (historyIndexRef.current < historyRef.current.length - 1) {
        historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
      }

      historyRef.current.push(json);
      historyIndexRef.current++;

      // Limit history to 20 states
      if (historyRef.current.length > 20) {
        historyRef.current.shift();
        historyIndexRef.current--;
      }

      onHistoryChange?.();
    };

    const undo = () => {
      const canvas = fabricCanvasRef.current;
      if (!canvas || historyIndexRef.current <= 0) return;

      historyIndexRef.current--;
      const state = historyRef.current[historyIndexRef.current];

      // Clear and restore
      canvas.clear();

      const objects = JSON.parse(state);
      if (objects.length > 0) {
        util.enlivenObjects(objects).then((enlivenedObjects: any[]) => {
          enlivenedObjects.forEach((obj) => {
            canvas.add(obj);
          });
          canvas.renderAll();
        });
      } else {
        canvas.renderAll();
      }

      onHistoryChange?.();
    };

    const redo = () => {
      const canvas = fabricCanvasRef.current;
      if (!canvas || historyIndexRef.current >= historyRef.current.length - 1) return;

      historyIndexRef.current++;
      const state = historyRef.current[historyIndexRef.current];

      // Clear and restore
      canvas.clear();

      const objects = JSON.parse(state);
      if (objects.length > 0) {
        util.enlivenObjects(objects).then((enlivenedObjects: any[]) => {
          enlivenedObjects.forEach((obj) => {
            canvas.add(obj);
          });
          canvas.renderAll();
        });
      } else {
        canvas.renderAll();
      }

      onHistoryChange?.();
    };

    const canUndo = () => historyIndexRef.current > 0;
    const canRedo = () => historyIndexRef.current < historyRef.current.length - 1;

    const clearAll = () => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      canvas.clear();
      canvas.renderAll();
      saveHistory();
    };

    const addText = (text: string) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      const textObj = new IText(text, {
        left: canvasSize / 2,
        top: canvasSize / 6,
        fontSize: textSize,
        fill: textColor,
        fontFamily: 'Noto Sans KR, sans-serif',
      });

      canvas.add(textObj);
      canvas.setActiveObject(textObj);
      canvas.renderAll();
    };

    const addTextSticker = (sticker: any) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      const textObj = new IText(sticker.text, {
        left: canvasSize / 2,
        top: canvasSize / 6,
        fontSize: sticker.fontSize,
        fill: sticker.fill,
        fontFamily: sticker.fontFamily,
        fontWeight: sticker.fontWeight,
        stroke: sticker.stroke,
        strokeWidth: sticker.strokeWidth,
      });

      if (sticker.shadow) {
        textObj.set({
          shadow: {
            color: sticker.shadow.color,
            blur: sticker.shadow.blur,
            offsetX: sticker.shadow.offsetX,
            offsetY: sticker.shadow.offsetY,
          },
        });
      }

      canvas.add(textObj);
      canvas.setActiveObject(textObj);
      canvas.renderAll();
    };

    const addImage = (imageUrl: string) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      Image.fromURL(imageUrl, {
        crossOrigin: 'anonymous',
      }).then((img) => {
        // Scale image to fit canvas while maintaining aspect ratio
        const maxSize = canvasSize * 0.5; // Max 50% of canvas size
        const scale = Math.min(maxSize / (img.width || 1), maxSize / (img.height || 1));

        img.set({
          left: canvasSize / 2,
          top: canvasSize / 2,
          originX: 'center',
          originY: 'center',
          scaleX: scale,
          scaleY: scale,
        });

        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
      });
    };

    const toDataURL = (): string => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return '';

      // Temporarily show background image by rendering it on canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvasSize;
      tempCanvas.height = canvasSize;
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return '';

      // Draw background if exists
      if (bgImageRef.current && imageUrl) {
        ctx.drawImage(bgImageRef.current, 0, 0, canvasSize, canvasSize);
      } else {
        // Draw white background for transparent canvas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvasSize, canvasSize);
      }

      // Draw fabric canvas on top
      const fabricData = canvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier: 1,
      });

      const fabricImg = new window.Image();
      fabricImg.src = fabricData;

      ctx.drawImage(fabricImg, 0, 0);
      return tempCanvas.toDataURL('image/png');
    };

    const deleteSelected = () => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      const activeObjects = canvas.getActiveObjects();
      if (activeObjects.length) {
        activeObjects.forEach((obj) => canvas.remove(obj));
        canvas.discardActiveObject();
        canvas.renderAll();
      }
    };

    let clipboard: any = null;

    const copySelected = () => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      const activeObject = canvas.getActiveObject();
      if (activeObject) {
        activeObject.clone().then((cloned: any) => {
          clipboard = cloned;
        });
      }
    };

    const paste = () => {
      const canvas = fabricCanvasRef.current;
      if (!canvas || !clipboard) return;

      clipboard.clone().then((clonedObj: any) => {
        canvas.discardActiveObject();
        clonedObj.set({
          left: clonedObj.left + 10,
          top: clonedObj.top + 10,
          evented: true,
        });
        if (clonedObj.type === 'activeSelection') {
          clonedObj.canvas = canvas;
          clonedObj.forEachObject((obj: any) => {
            canvas.add(obj);
          });
          clonedObj.setCoords();
        } else {
          canvas.add(clonedObj);
        }
        clipboard.top += 10;
        clipboard.left += 10;
        canvas.setActiveObject(clonedObj);
        canvas.renderAll();
      });
    };

    const removeBackground = () => {
      // Background removal is not implemented in canvas editor
      // This is a placeholder for the feature
      console.log('removeBackground not implemented');
    };

    const groupSelected = () => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      const activeObjects = canvas.getActiveObjects();
      if (activeObjects.length > 1) {
        const group = new Group(activeObjects);
        canvas.discardActiveObject();
        activeObjects.forEach(obj => canvas.remove(obj));
        canvas.add(group);
        canvas.setActiveObject(group);
        canvas.renderAll();
      }
    };

    const ungroupSelected = () => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      const activeObject = canvas.getActiveObject();
      if (activeObject && activeObject.type === 'group') {
        const items = (activeObject as any).getObjects();
        (activeObject as any).destroy();
        canvas.remove(activeObject);

        items.forEach((item: any) => {
          canvas.add(item);
        });
        canvas.renderAll();
      }
    };

    const exportToPNG = async (): Promise<string> => {
      const canvas = fabricCanvasRef.current;
      const bgImage = bgImageRef.current;
      if (!canvas || !bgImage) return '';

      // Create temporary canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvasSize;
      tempCanvas.height = canvasSize;
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return '';

      // Draw background image
      ctx.drawImage(bgImage, 0, 0, canvasSize, canvasSize);

      // Draw fabric canvas on top
      const fabricData = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 1 });

      return new Promise<string>((resolve) => {
        const fabricImg = new window.Image();
        fabricImg.onload = () => {
          ctx.drawImage(fabricImg, 0, 0);
          resolve(tempCanvas.toDataURL('image/png', 1));
        };
        fabricImg.src = fabricData;
      });
    };

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      getCanvas: () => fabricCanvasRef.current,
      undo,
      redo,
      canUndo,
      canRedo,
      clearAll,
      addText,
      addTextSticker,
      addImage,
      deleteSelected,
      copySelected,
      paste,
      groupSelected,
      ungroupSelected,
      removeBackground,
      exportToPNG,
      toDataURL,
    }));

    return (
      <div className="relative" style={{ width: canvasSize, height: canvasSize }}>
        {/* Background image layer - separate from drawing canvas */}
        <img
          ref={bgImageRef}
          src={imageUrl}
          alt="Background"
          className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none"
          crossOrigin="anonymous"
        />
        {/* Drawing canvas layer - transparent background */}
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0"
          style={{
            cursor: activeTool === 'eyedropper' ? 'crosshair' : 'default',
            backgroundColor: 'transparent'
          }}
        />
      </div>
    );
  }
);

EditorCanvas.displayName = 'EditorCanvas';

export default EditorCanvas;
