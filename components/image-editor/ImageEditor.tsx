'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Layer, LayerState, Selection, Transform, ToolType, BrushStyle, Point, LayerGroup } from '@/types/image-editor';
import Toolbar from './Toolbar';
import CanvasArea from './CanvasArea';
import LayersPanel from './LayersPanel';
import TopBar from './TopBar';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { separateLineAndFill, traceToSVG, svgToCanvas, TRACE_PRESETS, recolorLayer } from '@/lib/imageTrace';

interface Scene {
  id: string;
  scene_number: number;
  title: string;
  image_url: string;
}

interface ImageEditorProps {
  initialWidth?: number;
  initialHeight?: number;
  scenes?: Scene[];
  seriesId?: string;
  onSave?: (imageData: string) => void;
}

function ImageEditorContent({
  initialWidth = 800,
  initialHeight = 600,
  scenes = [],
  seriesId,
  onSave,
}: ImageEditorProps) {
  const { colors } = useTheme();
  const [layers, setLayers] = useState<Layer[]>([]);
  const [groups, setGroups] = useState<LayerGroup[]>([]);
  const [activeLayerIndex, setActiveLayerIndex] = useState(0);
  const [selectedLayerIndices, setSelectedLayerIndices] = useState<number[]>([]);
  const [currentTool, setCurrentTool] = useState<ToolType>('brush');
  const [brushSize, setBrushSize] = useState(5);
  const [brushOpacity, setBrushOpacity] = useState(100);
  const [brushStyle, setBrushStyle] = useState<BrushStyle>('normal');
  const [brushColor, setBrushColor] = useState('#000000');
  const [history, setHistory] = useState<LayerState[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [transform, setTransform] = useState<Transform>({
    active: false,
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    rotation: 0,
    originalImageData: null,
  });
  const [zoom, setZoom] = useState(1);

  // 밈 추천 상태
  const [showMemeSuggestions, setShowMemeSuggestions] = useState(false);
  const [memeSuggestions, setMemeSuggestions] = useState<string[]>([]);
  const [isFetchingMemes, setIsFetchingMemes] = useState(false);

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<Point>({ x: 0, y: 0 });
  const selectionStartRef = useRef<Point | null>(null);
  const isSelectingRef = useRef(false);
  const shapeStartRef = useRef<Point | null>(null);
  const isDrawingShapeRef = useRef(false);
  const moveStartRef = useRef<Point | null>(null);
  const layerOffsetRef = useRef({ x: 0, y: 0 });

  // 로컬스토리지에 레이어 상태 저장
  const saveToLocalStorage = () => {
    if (!seriesId) return;

    try {
      const layersData = layers.map(layer => ({
        id: layer.id,
        name: layer.name,
        visible: layer.visible,
        locked: layer.locked,
        sceneId: layer.sceneId, // sceneId 저장
        modified: layer.modified, // modified 플래그 저장
        imageData: layer.canvas.toDataURL('image/png'),
        transform: layer.transform, // transform 정보 저장
      }));

      const editorState = {
        layers: layersData,
        groups: groups,
        activeLayerIndex,
        timestamp: Date.now(),
      };

      localStorage.setItem(`editor_${seriesId}`, JSON.stringify(editorState));
      console.log('💾 Saved to localStorage:', seriesId, `(${layers.length} layers)`);
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  };

  // 로컬스토리지에서 레이어 상태 복원
  const loadFromLocalStorage = async () => {
    if (!seriesId) return false;

    try {
      const savedData = localStorage.getItem(`editor_${seriesId}`);
      if (!savedData) return false;

      const editorState = JSON.parse(savedData);
      console.log('Loading from localStorage:', seriesId);

      // 레이어 복원
      const restoredLayers: Layer[] = [];

      for (const layerData of editorState.layers) {
        const img = new Image();

        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = layerData.imageData;
        });

        const canvas = document.createElement('canvas');
        canvas.width = initialWidth;
        canvas.height = initialHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          console.error('Failed to get canvas context for layer:', layerData.name);
          continue;
        }

        ctx.drawImage(img, 0, 0);

        restoredLayers.push({
          id: layerData.id,
          name: layerData.name,
          visible: layerData.visible,
          locked: layerData.locked || false,
          canvas: canvas,
          ctx: ctx,
          sceneId: layerData.sceneId, // sceneId 복원
          modified: layerData.modified || false, // modified 플래그 복원
          transform: layerData.transform || {
            x: 0,
            y: 0,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
          },
        });
      }

      setLayers(restoredLayers);
      setGroups(editorState.groups || []);
      setActiveLayerIndex(editorState.activeLayerIndex || 0);

      console.log('📂 Restored from localStorage:', restoredLayers.length, 'layers');
      console.log('🔍 Modified layers:', restoredLayers.filter(l => l.modified).length);
      return true;
    } catch (error) {
      console.error('Failed to load from localStorage:', error);
      return false;
    }
  };

  // 초기 레이어 생성 또는 scenes로부터 레이어 생성
  useEffect(() => {
    const initLayers = async () => {
      // 먼저 로컬스토리지에서 복원 시도
      const restored = await loadFromLocalStorage();

      if (!restored) {
        // 복원 실패 시 scenes에서 로드하거나 빈 레이어 생성
        if (scenes.length > 0 && layers.length === 0) {
          loadScenesAsLayers();
        } else if (scenes.length === 0 && layers.length === 0) {
          addLayer();
        }
      }
    };

    if (layers.length === 0) {
      initLayers();
    }
  }, [scenes]);

  // 레이어 변경 시 자동 저장 (3초 디바운스)
  useEffect(() => {
    if (layers.length === 0) return;

    const timer = setTimeout(() => {
      saveToLocalStorage();
    }, 3000);

    return () => clearTimeout(timer);
  }, [layers, groups, activeLayerIndex]);

  const loadScenesAsLayers = async () => {
    console.log('Loading scenes as layers:', scenes);
    const newLayers: Layer[] = [];

    for (const scene of scenes) {
      try {
        console.log(`Loading scene ${scene.scene_number}:`, scene.image_url);

        // 이미지 로드
        const img = new Image();
        img.crossOrigin = 'anonymous';

        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            console.log(`Image loaded: ${scene.scene_number}, size: ${img.width}x${img.height}`);
            resolve();
          };
          img.onerror = (e) => {
            console.error(`Image load error: ${scene.scene_number}`, e);
            reject(e);
          };
          img.src = scene.image_url;
        });

        // 레이어 생성
        const canvas = document.createElement('canvas');
        canvas.width = initialWidth;
        canvas.height = initialHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          console.error('Failed to get canvas context');
          continue;
        }

        // 이미지를 캔버스에 그리기 (비율 유지하며 중앙 배치)
        const scale = Math.min(
          initialWidth / img.width,
          initialHeight / img.height
        );
        const x = (initialWidth - img.width * scale) / 2;
        const y = (initialHeight - img.height * scale) / 2;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

        console.log(`Canvas drawn for scene ${scene.scene_number}`);

        // 초기 이미지 데이터 저장 (변경 감지용)
        const originalImageData = canvas.toDataURL('image/png');

        // 처음 8개(그룹 1)만 보이게, 나머지는 숨김
        const isFirstGroup = newLayers.length < 8;

        const layer: Layer = {
          canvas,
          ctx,
          visible: isFirstGroup, // 그룹 1만 visible
          locked: false,
          name: scene.title,
          id: Date.now() + scene.scene_number,
          sceneId: scene.id, // Scene ID 저장
          originalImageData: originalImageData, // 초기 이미지 저장
          modified: false, // 초기에는 변경 안됨
          transform: {
            x: 0,
            y: 0,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
          },
        };

        newLayers.push(layer);
      } catch (error) {
        console.error(`Failed to load scene ${scene.scene_number}:`, error);
      }
    }

    console.log(`Total layers created: ${newLayers.length}`);

    // 모든 레이어를 한 번에 업데이트
    if (newLayers.length > 0) {
      setLayers(newLayers);
      setActiveLayerIndex(0);

      // 32개 이모티콘을 4개 그룹으로 나누기 (각 8개씩)
      const groupSize = 8;
      const newGroups: LayerGroup[] = [];

      for (let i = 0; i < 4; i++) {
        const startIdx = i * groupSize;
        const endIdx = Math.min(startIdx + groupSize, newLayers.length);
        const groupLayers = newLayers.slice(startIdx, endIdx);

        if (groupLayers.length > 0) {
          const group: LayerGroup = {
            id: `group-${Date.now()}-${i}`,
            name: `그룹 ${i + 1} (${startIdx + 1}-${endIdx}번)`,
            layerIds: groupLayers.map(l => String(l.id)),
            visible: i === 0, // 첫 번째 그룹만 visible
            collapsed: i !== 0, // 첫 번째 그룹만 펼침
          };
          newGroups.push(group);
        }
      }

      setGroups(newGroups);
      console.log('Auto-created 4 groups (first group expanded):', newGroups);

      // 상태 저장 (약간의 지연 후)
      setTimeout(() => {
        console.log('Saving initial state');
        saveState();
      }, 200);
    }
  };

  const addLayer = (imageData?: ImageData, layerName?: string, insertIndex?: number, sceneId?: string): Layer | null => {
    const canvas = document.createElement('canvas');
    canvas.width = initialWidth;
    canvas.height = initialHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // If imageData is provided, paste it onto the new layer
    if (imageData) {
      ctx.putImageData(imageData, 0, 0);
    }

    // imageData가 있고 sceneId가 있으면 이미 수정된 것으로 간주 (붙여넣기 등)
    const isModified = !!(imageData && sceneId);

    const layer: Layer = {
      canvas,
      ctx,
      visible: true,
      locked: false,
      name: layerName || `레이어 ${layers.length + 1}`,
      id: Date.now(),
      sceneId: sceneId, // sceneId 부여
      modified: isModified, // imageData와 sceneId가 있으면 바로 modified=true
      transform: {
        x: 0,
        y: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      },
    };

    let newLayerIndex = 0;

    setLayers((prev) => {
      let newLayers;
      let newActiveIndex;

      console.log(`📍 addLayer: insertIndex=${insertIndex}, prev.length=${prev.length}, layerName="${layer.name}"`);

      if (insertIndex !== undefined && insertIndex >= 0 && insertIndex <= prev.length) {
        // 지정된 위치에 삽입
        newLayers = [...prev.slice(0, insertIndex), layer, ...prev.slice(insertIndex)];
        newActiveIndex = insertIndex;
        newLayerIndex = insertIndex;
        console.log(`✅ Inserted at index ${insertIndex}, new length=${newLayers.length}`);
      } else {
        // 맨 뒤에 추가
        newLayers = [...prev, layer];
        newActiveIndex = newLayers.length - 1;
        newLayerIndex = newLayers.length - 1;
        console.log(`✅ Added to end, new length=${newLayers.length}`);
      }

      console.log(`📋 Layer order after add: [${newLayers.map((l, i) => `${i}:${l.name}`).join(', ')}]`);

      setActiveLayerIndex(newActiveIndex);
      return newLayers;
    });

    // activeLayerIndex가 속한 그룹에 새 레이어 추가
    setTimeout(() => {
      if (activeLayerIndex >= 0 && layers.length > 0) {
        const activeLayerId = String(layers[activeLayerIndex]?.id);
        const activeLayerGroup = groups.find(g => g.layerIds.includes(activeLayerId));

        if (activeLayerGroup) {
          console.log('🔗 Adding new layer to group (panel top):', activeLayerGroup.name);
          setGroups(prev => prev.map(g => {
            if (g.id === activeLayerGroup.id) {
              // 패널에서 맨 위에 보이려면 배열의 맨 뒤에 추가 (reverse 표시이므로)
              return { ...g, layerIds: [...g.layerIds, String(layer.id)] };
            }
            return g;
          }));
        } else {
          console.log('⚠️ Active layer not in any group, new layer will be independent');
        }
      }
    }, 50);

    setTimeout(() => saveState(), 100);
    return layer;
  };

  // Wrapper for LayersPanel button
  const handleAddLayer = () => {
    // 새로운 sceneId 생성 (완전히 새로운 이모티콘으로 취급)
    const newSceneId = `new_scene_${Date.now()}`;

    // 레이어 패널에서 맨 위에 보이려면 배열의 맨 뒤(layers.length)에 추가
    // (패널이 reverse로 표시하므로)
    const insertPosition = layers.length;
    console.log('Adding new empty layer at top of panel (array end):', insertPosition, 'with new sceneId:', newSceneId);

    // 빈 레이어 추가 (imageData 없이)
    // addLayer 함수가 자동으로 activeLayerGroup에 추가함
    addLayer(undefined, `새 이모티콘 ${layers.length + 1}`, insertPosition, newSceneId);
  };

  const mergeLayers = () => {
    if (selectedLayerIndices.length < 2) {
      alert('병합하려면 2개 이상의 레이어를 선택해주세요.');
      return;
    }

    // 선택된 레이어들을 인덱스 순서대로 정렬
    const sortedIndices = [...selectedLayerIndices].sort((a, b) => a - b);
    const layersToMerge = sortedIndices.map(i => layers[i]);

    // 병합될 레이어 중 원본 이모티콘이 있는지 확인
    const originalLayer = layersToMerge.find(layer => layer.sceneId);
    const sceneId = originalLayer?.sceneId;

    // 새 캔버스 생성 및 병합
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = initialWidth;
    tempCanvas.height = initialHeight;
    const tempCtx = tempCanvas.getContext('2d');

    if (!tempCtx) return;

    // 선택된 레이어들을 순서대로 그리기
    layersToMerge.forEach((layer) => {
      if (layer.visible) {
        tempCtx.drawImage(layer.canvas, 0, 0);
      }
    });

    // 병합된 이미지 데이터 가져오기
    const mergedImageData = tempCtx.getImageData(0, 0, initialWidth, initialHeight);

    // 가장 낮은 인덱스 위치에 병합된 레이어 생성
    const lowestIndex = sortedIndices[0];
    const mergedLayerName = originalLayer?.name || `병합 레이어 ${Date.now()}`;

    // 기존 레이어들 삭제하고 병합된 레이어 추가
    setLayers((prev) => {
      const newLayers = prev.filter((_, i) => !sortedIndices.includes(i));

      // 병합된 레이어 생성
      const canvas = document.createElement('canvas');
      canvas.width = initialWidth;
      canvas.height = initialHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.putImageData(mergedImageData, 0, 0);
      }

      const mergedLayer: Layer = {
        id: Date.now(),
        name: mergedLayerName,
        visible: true,
        locked: false,
        canvas: canvas,
        ctx: ctx!, // ctx 추가
        sceneId: sceneId, // 원본 이모티콘의 sceneId 유지
        originalImageData: originalLayer?.originalImageData, // 원본 이미지 데이터 유지
        modified: true, // 병합했으므로 변경됨
        transform: {
          x: 0,
          y: 0,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
        },
      };

      // 삽입할 위치 계산 (삭제된 레이어들을 고려)
      let insertIndex = lowestIndex;
      for (let i = 0; i < lowestIndex; i++) {
        if (sortedIndices.includes(i)) {
          insertIndex--;
        }
      }

      newLayers.splice(insertIndex, 0, mergedLayer);
      setActiveLayerIndex(insertIndex);
      setSelectedLayerIndices([]);

      console.log(`Merged layers into scene ${sceneId}, marked as modified`);
      return newLayers;
    });

    // 그룹 정보 업데이트
    setGroups((prev) => prev.map(g => ({
      ...g,
      layerIds: g.layerIds.filter(id =>
        !layersToMerge.some(layer => String(layer.id) === id)
      )
    })).filter(g => g.layerIds.length > 0));

    setTimeout(() => saveState(), 100);
  };

  const deleteLayer = (index: number) => {
    if (layers.length <= 1) return;

    setLayers((prev) => {
      const newLayers = prev.filter((_, i) => i !== index);
      if (activeLayerIndex >= newLayers.length) {
        setActiveLayerIndex(newLayers.length - 1);
      }
      return newLayers;
    });

    setTimeout(() => saveState(), 100);
  };

  const toggleLayerVisibility = (index: number) => {
    console.log(`Toggling layer ${index} visibility`);
    setLayers((prev) => {
      const newLayers = prev.map((layer, i) => {
        if (i === index) {
          const newVisible = !layer.visible;
          console.log(`Layer ${index} visibility changed: ${layer.visible} -> ${newVisible}`);
          return {
            ...layer,
            visible: newVisible,
          };
        }
        return layer;
      });
      console.log('Updated layers:', newLayers.map((l, i) => `${i}: ${l.visible}`));
      return newLayers;
    });
  };

  const toggleLayerLock = (index: number) => {
    setLayers((prev) => {
      const newLayers = prev.map((layer, i) => {
        if (i === index) {
          return {
            ...layer,
            locked: !layer.locked,
          };
        }
        return layer;
      });
      return newLayers;
    });
  };

  const toggleGroupVisibility = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    const newVisible = !group.visible;

    // 그룹의 모든 레이어 가시성 변경
    setLayers((prev) => {
      return prev.map((layer) => {
        if (group.layerIds.includes(String(layer.id))) {
          return {
            ...layer,
            visible: newVisible,
          };
        }
        return layer;
      });
    });

    // 그룹 상태 업데이트
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, visible: newVisible } : g))
    );
  };

  const toggleGroupCollapsed = (groupId: string) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, collapsed: !g.collapsed } : g))
    );
  };

  const createGroupFromSelection = () => {
    if (selectedLayerIndices.length < 2) {
      alert('2개 이상의 레이어를 선택해주세요.');
      return;
    }

    const groupName = prompt('그룹 이름을 입력하세요:', `Group ${groups.length + 1}`);
    if (!groupName) return;

    const layerIds = selectedLayerIndices.map((index) => String(layers[index].id));

    const newGroup: LayerGroup = {
      id: `group-${Date.now()}`,
      name: groupName,
      layerIds,
      visible: true,
      collapsed: false,
    };

    setGroups((prev) => [...prev, newGroup]);
    setSelectedLayerIndices([]);
    console.log('Created new group:', newGroup);
  };

  const ungroupLayers = (groupId: string) => {
    const group = groups.find(g => g.id === groupId);
    console.log('Ungrouping:', groupId, 'Layers in group:', group?.layerIds);
    console.log('Current layers:', layers.map(l => ({ id: l.id, name: l.name })));

    setGroups((prev) => prev.filter((g) => g.id !== groupId));

    // 그룹 해제 후 레이어 상태 강제 업데이트 (리렌더링 트리거)
    setTimeout(() => {
      setLayers((prev) => [...prev]);
      console.log('After ungroup, layers:', layers.length);
    }, 0);
  };

  const addLayerToGroup = (layerIndex: number, groupId: string) => {
    const layerId = String(layers[layerIndex].id);

    // 이미 다른 그룹에 속해있는지 확인
    const existingGroup = groups.find(g => g.layerIds.includes(layerId));
    if (existingGroup) {
      // 기존 그룹에서 제거
      setGroups((prev) =>
        prev.map((g) =>
          g.id === existingGroup.id
            ? { ...g, layerIds: g.layerIds.filter(id => id !== layerId) }
            : g
        )
      );
    }

    // 새 그룹에 추가
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, layerIds: [...g.layerIds, layerId] }
          : g
      )
    );

    console.log(`Added layer ${layerId} to group ${groupId}`);
  };

  const toggleLayerSelection = (index: number, isMultiSelect: boolean) => {
    if (isMultiSelect) {
      setSelectedLayerIndices((prev) => {
        if (prev.includes(index)) {
          return prev.filter((i) => i !== index);
        } else {
          return [...prev, index];
        }
      });
    } else {
      setSelectedLayerIndices([index]);
      setActiveLayerIndex(index);
    }
  };

  const moveLayer = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    setLayers((prev) => {
      const newLayers = [...prev];
      const [movedLayer] = newLayers.splice(fromIndex, 1);
      newLayers.splice(toIndex, 0, movedLayer);

      // activeLayerIndex 업데이트
      if (activeLayerIndex === fromIndex) {
        setActiveLayerIndex(toIndex);
      } else if (fromIndex < activeLayerIndex && toIndex >= activeLayerIndex) {
        setActiveLayerIndex(activeLayerIndex - 1);
      } else if (fromIndex > activeLayerIndex && toIndex <= activeLayerIndex) {
        setActiveLayerIndex(activeLayerIndex + 1);
      }

      return newLayers;
    });

    setTimeout(() => saveState(), 100);
  };

  const saveState = () => {
    const state: LayerState[] = layers.map((layer) => ({
      imageData: layer.ctx.getImageData(0, 0, initialWidth, initialHeight),
      visible: layer.visible,
      locked: layer.locked,
      name: layer.name,
      transform: { ...layer.transform },
    }));

    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(state);
      if (newHistory.length > 50) {
        newHistory.shift();
        setHistoryIndex((idx) => idx);
      } else {
        setHistoryIndex(newHistory.length - 1);
      }
      return newHistory;
    });
  };

  // 레이어를 수정됨으로 표시하는 함수
  const markLayerAsModified = (layerIndex: number) => {
    console.log(`markLayerAsModified called with index: ${layerIndex}, activeLayerIndex: ${activeLayerIndex}, total layers: ${layers.length}`);

    if (layerIndex < 0 || layerIndex >= layers.length) {
      console.log('Invalid layer index, returning');
      return;
    }

    const layer = layers[layerIndex];
    console.log(`Layer at index ${layerIndex}: name="${layer.name}", sceneId="${layer.sceneId}", modified=${layer.modified}`);

    // sceneId가 있으면 modified로 표시
    if (layer.sceneId && !layer.modified) {
      console.log(`✅ Marking layer ${layer.name} (Scene ${layer.sceneId}) as modified`);
      setLayers(prev => prev.map((l, idx) =>
        idx === layerIndex ? { ...l, modified: true } : l
      ));
    } else if (layer.sceneId && layer.modified) {
      console.log(`⏭️ Already modified: ${layer.name}`);
    } else {
      console.log(`⏭️ No sceneId: ${layer.name}`);
    }
  };

  // 클릭한 좌표에서 레이어를 찾아서 선택하고 그룹을 펼치는 함수
  const selectLayerAtPosition = (x: number, y: number) => {
    console.log(`🔍 Selecting layer at position (${x}, ${y})`);

    // 위에서부터 (역순으로) 검사하여 클릭한 좌표에 픽셀이 있는 레이어 찾기
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];

      // 보이지 않는 레이어는 건너뛰기
      if (!layer.visible) continue;

      // 해당 좌표의 픽셀 데이터 가져오기
      const ctx = layer.ctx;
      const imageData = ctx.getImageData(x, y, 1, 1);
      const alpha = imageData.data[3]; // 알파 채널

      // 투명하지 않은 픽셀이 있으면 해당 레이어 선택
      if (alpha > 0) {
        console.log(`✅ Found layer at index ${i}: "${layer.name}"`);

        // 레이어 활성화
        setActiveLayerIndex(i);

        // 해당 레이어가 속한 그룹 찾기
        const layerId = String(layer.id);
        const layerGroup = groups.find(g => g.layerIds.includes(layerId));

        // 그룹이 닫혀있으면 펼치기
        if (layerGroup && layerGroup.collapsed) {
          console.log(`📂 Expanding group: ${layerGroup.name}`);
          setGroups(prev => prev.map(g =>
            g.id === layerGroup.id ? { ...g, collapsed: false } : g
          ));
        }

        return;
      }
    }

    console.log('⏭️ No layer found at this position');
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex((idx) => idx - 1);
      restoreState(history[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex((idx) => idx + 1);
      restoreState(history[historyIndex + 1]);
    }
  };

  const restoreState = (state: LayerState[]) => {
    // 새 레이어 배열 생성
    const newLayers: Layer[] = state.map((layerState, index) => {
      // 기존 레이어가 있으면 재사용, 없으면 새로 생성
      let canvas: HTMLCanvasElement;
      let ctx: CanvasRenderingContext2D;

      if (layers[index]) {
        canvas = layers[index].canvas;
        ctx = layers[index].ctx;
      } else {
        canvas = document.createElement('canvas');
        canvas.width = initialWidth;
        canvas.height = initialHeight;
        ctx = canvas.getContext('2d')!;
      }

      // 이미지 데이터 복원
      ctx.putImageData(layerState.imageData, 0, 0);

      return {
        id: layers[index]?.id || Date.now() + index,
        name: layerState.name,
        visible: layerState.visible,
        locked: layerState.locked,
        canvas,
        ctx,
        sceneId: layers[index]?.sceneId,
        modified: layers[index]?.modified || false,
        transform: { ...layerState.transform },
      };
    });

    setLayers(newLayers);
  };

  // Zoom 핸들러
  const handleZoomIn = useCallback(() => {
    setZoom((prev) => Math.min(prev + 0.1, 3)); // 최대 300%
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((prev) => Math.max(prev - 0.1, 0.1)); // 최소 10%
  }, []);

  const handleZoomReset = useCallback(() => {
    setZoom(1); // 100%로 리셋
  }, []);

  // Cmd + 스크롤 또는 Alt + 스크롤로 zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Cmd(Mac) / Ctrl(Windows) 또는 Alt 키가 눌린 상태에서 스크롤
      if (e.metaKey || e.ctrlKey || e.altKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        setZoom((prev) => Math.max(0.1, Math.min(3, prev + delta)));
      }
    };

    const container = canvasContainerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, []);

  // 올가미 선택 완료 시 선택 영역만 표시 (자동 잘라내기 X)
  // Ctrl+C로 복사, Ctrl+V로 새 레이어에 붙여넣기
  useEffect(() => {
    if (selection && selection.type === 'lasso' && currentTool === 'lasso') {
      console.log('✅ Lasso selection created - use Ctrl+C to copy, Ctrl+V to paste as new layer');
    }
  }, [selection, currentTool]);

  // 폴리곤 내부 점 판별 함수
  const isPointInPolygon = (point: Point, polygon: Point[]): boolean => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      const intersect = ((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  };

  // 키보드 단축키: Cmd+Z / Ctrl+Z (실행취소), Cmd+Shift+Z / Ctrl+Y (재실행)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 필드에서는 단축키 무시
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // Cmd+Z (Mac) 또는 Ctrl+Z (Windows) - 실행취소
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Cmd+Shift+Z (Mac) 또는 Ctrl+Y (Windows) - 재실행
      else if (
        ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') ||
        (e.ctrlKey && e.key === 'y')
      ) {
        e.preventDefault();
        redo();
      }
      // Cmd++ 또는 Cmd+= - 확대
      else if ((e.metaKey || e.ctrlKey) && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        handleZoomIn();
      }
      // Cmd+- - 축소
      else if ((e.metaKey || e.ctrlKey) && e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      }
      // Cmd+0 - 100%로 리셋
      else if ((e.metaKey || e.ctrlKey) && e.key === '0') {
        e.preventDefault();
        handleZoomReset();
      }
      // [ - 브러시 크기 감소
      else if (e.key === '[') {
        e.preventDefault();
        setBrushSize(prev => Math.max(1, prev - 1));
      }
      // ] - 브러시 크기 증가
      else if (e.key === ']') {
        e.preventDefault();
        setBrushSize(prev => Math.min(200, prev + 1));
      }
      // 툴 단축키 (modifier 키 없이, e.code 사용으로 한글 입력 모드에서도 작동)
      else if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        const toolMap: { [code: string]: ToolType } = {
          'KeyB': 'brush',
          'KeyE': 'eraser',
          'KeyG': 'paint-bucket',
          'KeyI': 'eyedropper',
          'KeyT': 'text',
          'KeyL': 'lasso',
          'KeyW': 'magic-wand',
          'KeyV': 'move',
          'KeyD': 'line',
        };

        if (toolMap[e.code]) {
          e.preventDefault();
          setCurrentTool(toolMap[e.code]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history, handleZoomIn, handleZoomOut, handleZoomReset, selection, layers, activeLayerIndex]);

  // 밈 문구 추천 요청
  const handleSuggestMeme = async () => {
    const activeLayer = layers[activeLayerIndex];
    if (!activeLayer) {
      alert('레이어를 먼저 선택해주세요.');
      return;
    }

    setIsFetchingMemes(true);
    setShowMemeSuggestions(true);
    setMemeSuggestions([]);

    try {
      // 현재 레이어 이미지를 base64로 변환
      const imageData = activeLayer.canvas.toDataURL('image/png');

      // Blob으로 변환 후 업로드 (또는 직접 base64 전송)
      // 여기서는 간단히 임시 blob URL 사용
      const blob = await (await fetch(imageData)).blob();
      const formData = new FormData();
      formData.append('file', blob, 'temp.png');

      // 임시로 Supabase에 업로드하거나, 직접 API에 전송
      // 여기서는 이미 저장된 이미지가 있다고 가정하고 scene image_url 사용
      let imageUrl = activeLayer.sceneId
        ? scenes.find(s => s.id === activeLayer.sceneId)?.image_url
        : null;

      if (!imageUrl) {
        // 레이어에 scene이 없으면 현재 캔버스 이미지를 임시로 사용
        // 실제로는 Supabase에 업로드하거나 다른 방법 필요
        alert('이 레이어는 이모티콘 이미지가 아닙니다. scene 레이어를 선택해주세요.');
        return;
      }

      const response = await fetch('/api/emoticons/suggest-meme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
      });

      if (!response.ok) {
        throw new Error('밈 추천 실패');
      }

      const data = await response.json();
      setMemeSuggestions(data.suggestions || []);
    } catch (error) {
      console.error('Meme suggestion error:', error);
      alert('밈 문구 추천에 실패했습니다. 다시 시도해주세요.');
      setShowMemeSuggestions(false);
    } finally {
      setIsFetchingMemes(false);
    }
  };

  // 밈 문구를 텍스트 레이어로 추가
  const addMemeTextLayer = (memeText: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = initialWidth;
    canvas.height = initialHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // 텍스트 스타일 설정
    const fontSize = Math.floor(initialHeight / 10); // 높이의 1/10 크기
    ctx.font = `bold ${fontSize}px "Pretendard", "Apple SD Gothic Neo", sans-serif`;
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // 흰색 배경의 텍스트 (가독성 향상)
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = fontSize / 8;
    ctx.strokeText(memeText, initialWidth / 2, initialHeight * 0.85); // 하단 15% 위치
    ctx.fillText(memeText, initialWidth / 2, initialHeight * 0.85);

    const newLayer: Layer = {
      id: Date.now(),
      name: `텍스트: ${memeText}`,
      visible: true,
      locked: false,
      canvas: canvas,
      ctx: ctx,
      sceneId: layers[activeLayerIndex]?.sceneId, // 현재 레이어의 sceneId 상속
      modified: true, // 새로 추가된 레이어는 modified
      originalImageData: undefined,
      transform: {
        x: 0,
        y: 0,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
      },
    };

    setLayers([...layers, newLayer]);
    setActiveLayerIndex(layers.length);
    saveState();
    setShowMemeSuggestions(false);

    // 자동으로 텍스트 레이어의 sceneId 상속으로 modified 플래그 설정됨
    console.log(`✅ Added meme text layer: "${memeText}"`);
  };

  // 트레이스 옵션 모달 상태
  const [showTraceModal, setShowTraceModal] = useState(false);
  const [traceThreshold, setTraceThreshold] = useState(200);
  const [tracePreset, setTracePreset] = useState<keyof typeof TRACE_PRESETS>('lineArt');
  const [isTracing, setIsTracing] = useState(false);

  // 선 분리 기능 (선만 추출)
  const handleSeparateLayers = async () => {
    const activeLayer = layers[activeLayerIndex];
    if (!activeLayer) {
      alert('레이어를 먼저 선택해주세요.');
      return;
    }

    setIsTracing(true);
    console.log('🎨 Extracting lines...');

    try {
      const { lineCanvas } = await separateLineAndFill(
        activeLayer.canvas,
        traceThreshold
      );

      // 선 레이어 추가 (새로운 sceneId로 새 이모티콘으로 생성)
      const newSceneId = `new_line_${Date.now()}`;
      const lineLayer: Layer = {
        id: Date.now(),
        name: `${activeLayer.name} - 선`,
        visible: true,
        locked: false,
        canvas: lineCanvas,
        ctx: lineCanvas.getContext('2d')!,
        sceneId: newSceneId, // 새로운 이모티콘으로 저장됨
        modified: true,
        transform: { ...activeLayer.transform },
      };

      // 원본 레이어가 속한 그룹 찾기
      const activeLayerId = String(activeLayer.id);
      const parentGroup = groups.find(g => g.layerIds.includes(activeLayerId));

      // 원본 레이어는 유지하고 선 레이어를 위에 추가
      const newLayerCount = layers.length + 1;
      setLayers(prev => {
        const newLayers = [...prev];
        newLayers.push(lineLayer);
        return newLayers;
      });

      // 원본 레이어와 같은 그룹에 새 레이어 추가
      if (parentGroup) {
        setGroups(prev => prev.map(g => {
          if (g.id === parentGroup.id) {
            return {
              ...g,
              layerIds: [...g.layerIds, String(lineLayer.id)]
            };
          }
          return g;
        }));
      }

      setActiveLayerIndex(newLayerCount - 1); // 새 레이어 선택
      saveState();

      // 완료 알림
      alert('✅ 선 추출 완료!');
      console.log('✅ Line extraction complete!');
    } catch (error) {
      console.error('Line extraction failed:', error);
      alert('선 분리에 실패했습니다.');
    } finally {
      setIsTracing(false);
    }
  };

  // 이미지 트레이스 (벡터화) 기능
  const handleImageTrace = async () => {
    const activeLayer = layers[activeLayerIndex];
    if (!activeLayer) {
      alert('레이어를 먼저 선택해주세요.');
      return;
    }

    setIsTracing(true);
    console.log(`🪄 Tracing image with preset: ${tracePreset}...`);

    try {
      // SVG로 벡터화
      const svgString = await traceToSVG(activeLayer.canvas, tracePreset);

      // SVG를 Canvas로 변환
      const tracedCanvas = await svgToCanvas(svgString, initialWidth, initialHeight);

      // 트레이스된 레이어 추가
      const tracedLayer: Layer = {
        id: Date.now(),
        name: `${activeLayer.name} - 트레이스`,
        visible: true,
        locked: false,
        canvas: tracedCanvas,
        ctx: tracedCanvas.getContext('2d')!,
        sceneId: activeLayer.sceneId,
        modified: true,
        transform: { ...activeLayer.transform },
      };

      // 원본 레이어 숨기고 바로 위에 새 레이어 삽입
      setLayers(prev => {
        const newLayers = [...prev];
        newLayers[activeLayerIndex] = { ...newLayers[activeLayerIndex], visible: false };
        // 원본 레이어 바로 뒤(위)에 삽입
        newLayers.splice(activeLayerIndex + 1, 0, tracedLayer);
        return newLayers;
      });

      setActiveLayerIndex(activeLayerIndex + 1); // 트레이스 레이어 선택
      saveState();

      console.log('✅ Image trace complete!');
      setShowTraceModal(false);
    } catch (error) {
      console.error('Image trace failed:', error);
      alert('이미지 트레이스에 실패했습니다.');
    } finally {
      setIsTracing(false);
    }
  };

  // 선 추출 바로 실행
  const openTraceModal = () => {
    if (!layers[activeLayerIndex]) {
      alert('레이어를 먼저 선택해주세요.');
      return;
    }
    // 모달 없이 바로 실행
    handleSeparateLayers();
  };

  // 레이어 색상 변경
  const handleRecolorLayer = () => {
    const activeLayer = layers[activeLayerIndex];
    if (!activeLayer) {
      alert('레이어를 먼저 선택해주세요.');
      return;
    }

    // 현재 브러시 색상으로 레이어 색상 변경
    recolorLayer(activeLayer.canvas, brushColor);

    // 레이어 업데이트 (리렌더링 트리거)
    setLayers(prev => prev.map((layer, idx) =>
      idx === activeLayerIndex
        ? { ...layer, modified: true }
        : layer
    ));

    saveState();
    console.log(`✅ Layer recolored to ${brushColor}`);
  };

  // 변경된 이모티콘만 찾아서 병합 후 저장
  const handleSave = async () => {
    if (!onSave) return;

    // 1. 변경된 이모티콘 찾기 (sceneId가 있고 modified=true인 레이어)
    const modifiedScenes = new Map<string, Layer[]>();

    layers.forEach((layer) => {
      if (layer.sceneId) {
        if (!modifiedScenes.has(layer.sceneId)) {
          modifiedScenes.set(layer.sceneId, []);
        }
        modifiedScenes.get(layer.sceneId)!.push(layer);
      }
    });

    // 2. 각 Scene별로 레이어들을 병합
    const modifiedImages: { sceneId: string; imageData: string; name: string }[] = [];

    for (const [sceneId, sceneLayers] of modifiedScenes.entries()) {
      // modified 플래그가 있는지 확인
      const hasModified = sceneLayers.some(layer => layer.modified);

      if (!hasModified) {
        console.log(`Scene ${sceneId} has no modifications, skipping`);
        continue;
      }

      // 해당 Scene의 모든 레이어를 병합
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = initialWidth;
      tempCanvas.height = initialHeight;
      const tempCtx = tempCanvas.getContext('2d');

      if (!tempCtx) continue;

      // 모든 레이어를 병합 (visible인 레이어만)
      console.log(`\n🖼️ Merging ${sceneLayers.length} layers for scene ${sceneId}:`);

      let hasVisibleLayers = false;

      sceneLayers.forEach((layer, idx) => {
        console.log(`  Layer ${idx}: "${layer.name}", visible=${layer.visible}, modified=${layer.modified}, size=${layer.canvas.width}x${layer.canvas.height}`);

        if (layer.visible) {
          console.log(`    ✅ Drawing visible layer ${idx} to merged canvas`);
          tempCtx.drawImage(layer.canvas, 0, 0);
          hasVisibleLayers = true;
        } else {
          console.log(`    ⏭️ Skipping invisible layer ${idx}`);
        }
      });

      if (!hasVisibleLayers) {
        console.log(`⚠️ Scene ${sceneId} (${sceneLayers[0].name}) has no visible layers, skipping`);
        continue;
      }

      const imageData = tempCanvas.toDataURL('image/png');
      const name = sceneLayers[0].name;

      console.log(`✅ Prepared scene ${sceneId} (${name}) for saving, imageData length: ${imageData.length}`);
      modifiedImages.push({ sceneId, imageData, name });
    }

    // 3. 변경된 이모티콘이 있으면 저장
    if (modifiedImages.length === 0) {
      alert('변경된 이모티콘이 없습니다.');
      return;
    }

    console.log(`💾 Saving ${modifiedImages.length} modified emoticons`);

    // onSave 콜백 호출 (app/editor/page.tsx에서 처리)
    if (onSave) {
      try {
        // 여러 이미지를 전달하기 위해 JSON으로 전달
        await onSave(JSON.stringify(modifiedImages));

        // 저장 성공 → modified 플래그 제거
        console.log('✅ Save successful, clearing modified flags');
        setLayers(prev => prev.map(layer => ({
          ...layer,
          modified: false,
        })));
      } catch (error) {
        console.error('❌ Save failed:', error);
        // 저장 실패 시 modified 플래그 유지
      }
    }
  };

  // 변경된 이모티콘 수 계산 (중복 sceneId 제거하여 고유한 장면 개수만 카운트)
  const modifiedCount = new Set(
    layers
      .filter(layer => layer.sceneId && layer.modified)
      .map(layer => layer.sceneId)
  ).size;

  return (
    <div style={{ display: 'flex', height: '100vh', background: colors.background, color: colors.text }}>
      <Toolbar currentTool={currentTool} onToolChange={setCurrentTool} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <TopBar
          brushSize={brushSize}
          brushOpacity={brushOpacity}
          brushStyle={brushStyle}
          brushColor={brushColor}
          currentTool={currentTool}
          transform={transform}
          zoom={zoom}
          modifiedCount={modifiedCount}
          onBrushSizeChange={setBrushSize}
          onBrushOpacityChange={setBrushOpacity}
          onBrushStyleChange={setBrushStyle}
          onBrushColorChange={setBrushColor}
          onUndo={undo}
          onRedo={redo}
          onSave={handleSave}
          onSuggestMeme={handleSuggestMeme}
          onSeparateLayers={openTraceModal}
          onRecolorLayer={handleRecolorLayer}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onZoomReset={handleZoomReset}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
        />

        <CanvasArea
          ref={canvasContainerRef}
          width={initialWidth}
          height={initialHeight}
          layers={layers}
          activeLayerIndex={activeLayerIndex}
          currentTool={currentTool}
          brushSize={brushSize}
          brushOpacity={brushOpacity}
          brushStyle={brushStyle}
          brushColor={brushColor}
          selection={selection}
          transform={transform}
          zoom={zoom}
          isDrawingRef={isDrawingRef}
          lastPosRef={lastPosRef}
          selectionStartRef={selectionStartRef}
          isSelectingRef={isSelectingRef}
          shapeStartRef={shapeStartRef}
          isDrawingShapeRef={isDrawingShapeRef}
          moveStartRef={moveStartRef}
          layerOffsetRef={layerOffsetRef}
          onSelectionChange={setSelection}
          onTransformChange={setTransform}
          onSaveState={saveState}
          onLayerAdd={addLayer}
          onBrushColorChange={setBrushColor}
          onMarkLayerModified={markLayerAsModified}
          onSelectLayerAtPosition={selectLayerAtPosition}
        />
      </div>

      <LayersPanel
        layers={layers}
        groups={groups}
        activeLayerIndex={activeLayerIndex}
        selectedLayerIndices={selectedLayerIndices}
        onLayerSelect={toggleLayerSelection}
        onLayerAdd={handleAddLayer}
        onLayerDelete={deleteLayer}
        onLayerToggleVisibility={toggleLayerVisibility}
        onLayerToggleLock={toggleLayerLock}
        onLayerMove={moveLayer}
        onMergeLayers={mergeLayers}
        onGroupToggleVisibility={toggleGroupVisibility}
        onGroupToggleCollapsed={toggleGroupCollapsed}
        onCreateGroup={createGroupFromSelection}
        onUngroup={ungroupLayers}
        onAddLayerToGroup={addLayerToGroup}
      />

      {/* 밈 추천 모달 */}
      {showMemeSuggestions && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowMemeSuggestions(false)}
        >
          <div
            style={{
              background: colors.panel,
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0, color: colors.text, fontSize: '20px', fontWeight: '600' }}>
              💬 밈 문구 추천
            </h2>

            {isFetchingMemes ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: colors.textSecondary }}>
                <div style={{ fontSize: '14px', marginBottom: '12px' }}>
                  AI가 이미지를 분석하고 있어요...
                </div>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>
                  2025년 최신 밈 문구를 찾는 중 🔍
                </div>
              </div>
            ) : memeSuggestions.length > 0 ? (
              <>
                <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '16px' }}>
                  문구를 클릭하면 텍스트 레이어로 추가됩니다
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {memeSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => addMemeTextLayer(suggestion)}
                      style={{
                        padding: '14px 18px',
                        background: colors.background,
                        border: `1px solid ${colors.border}`,
                        borderRadius: '8px',
                        color: colors.text,
                        cursor: 'pointer',
                        fontSize: '15px',
                        fontWeight: '500',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = colors.accent;
                        e.currentTarget.style.color = '#ffffff';
                        e.currentTarget.style.transform = 'translateX(4px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = colors.background;
                        e.currentTarget.style.color = colors.text;
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 0', color: colors.textSecondary }}>
                <div style={{ fontSize: '14px', marginBottom: '12px' }}>
                  추천 문구를 불러오는 데 실패했습니다 😢
                </div>
                <div style={{ fontSize: '12px', opacity: 0.7 }}>
                  다시 시도해주세요
                </div>
              </div>
            )}

            <button
              onClick={() => setShowMemeSuggestions(false)}
              style={{
                marginTop: '20px',
                width: '100%',
                padding: '12px',
                background: colors.background,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                color: colors.text,
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* 이미지 트레이스 모달 */}
      {showTraceModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowTraceModal(false)}
        >
          <div
            style={{
              background: colors.panel,
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '500px',
              width: '90%',
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0, color: colors.text, fontSize: '20px', fontWeight: '600' }}>
              ✏️ 선 추출
            </h2>

            <p style={{ color: colors.textSecondary, fontSize: '14px', marginBottom: '20px' }}>
              이미지에서 선만 추출해서 새 레이어로 만듭니다.
            </p>

            {/* 분리 버튼 */}
            <button
              onClick={handleSeparateLayers}
              disabled={isTracing}
              style={{
                width: '100%',
                padding: '14px',
                background: isTracing ? colors.background : 'linear-gradient(to right, #8b5cf6, #7c3aed)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                cursor: isTracing ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
              }}
            >
              {isTracing ? '처리 중...' : '선 추출하기'}
            </button>

            <button
              onClick={() => setShowTraceModal(false)}
              style={{
                marginTop: '12px',
                width: '100%',
                padding: '12px',
                background: colors.background,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                color: colors.text,
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ImageEditor(props: ImageEditorProps) {
  return (
    <ThemeProvider>
      <ImageEditorContent {...props} />
    </ThemeProvider>
  );
}
