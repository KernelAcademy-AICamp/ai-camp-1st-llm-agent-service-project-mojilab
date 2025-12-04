'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Type, Pencil, Eraser, Undo, Redo, Download, Trash2, Loader2, Sticker, Send, Bot, MousePointer, ChevronLeft, ChevronRight, Pipette, Combine, Split } from 'lucide-react';
import { uploadBase64Image } from '@/lib/supabase-storage';
import EditorCanvas, { EditorCanvasRef } from './EditorCanvas';
import { textStickers } from './textStickers';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface Scene {
  id: string;
  scene_number: number;
  title: string;
  image_url: string;
}

interface EmojiEditorProps {
  imageUrl: string;
  onSave: (editedImageUrl: string) => void;
  onClose: () => void;
  scenes?: Scene[];
  currentSceneId?: string;
  onNavigate?: (sceneId: string) => void;
}

type EditorTool = 'select' | 'text' | 'sticker' | 'draw' | 'erase' | 'eyedropper' | 'delete';

export default function EmojiEditor({ imageUrl, onSave, onClose, scenes, currentSceneId, onNavigate }: EmojiEditorProps) {
  const canvasRef = useRef<EditorCanvasRef>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [canvasSize, setCanvasSize] = useState(512);
  const [activeTool, setActiveTool] = useState<EditorTool>('select');
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [brushType, setBrushType] = useState<'pencil' | 'marker' | 'fine'>('pencil');
  const [eraserSize, setEraserSize] = useState(30);
  const [textColor, setTextColor] = useState('#000000');
  const [textSize, setTextSize] = useState(32);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // AI Chatbot
  const [aiInput, setAiInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [showAiChat, setShowAiChat] = useState(false);

  // Client-side mounting check & mobile AI chat detection
  useEffect(() => {
    setIsMounted(true);
    // Mobile에서는 AI 채팅 기본 닫힘
    if (typeof window !== 'undefined') {
      setShowAiChat(window.innerWidth >= 768);
    }
  }, []);

  // Responsive canvas size
  useEffect(() => {
    if (!isMounted) return;

    const updateSize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setCanvasSize(Math.min(360, width - 32));
      } else if (width < 1024) {
        setCanvasSize(512);
      } else {
        setCanvasSize(768);
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [isMounted]);

  // Reset hasChanges when imageUrl changes (scene navigation)
  useEffect(() => {
    setHasChanges(false);
    setIsInitialLoad(true);
  }, [imageUrl]);

  const handleHistoryChange = () => {
    if (canvasRef.current) {
      setCanUndo(canvasRef.current.canUndo());
      setCanRedo(canvasRef.current.canRedo());

      // Don't set hasChanges on initial history save
      if (!isInitialLoad) {
        setHasChanges(true);
      } else {
        setIsInitialLoad(false);
      }
    }
  };

  // Auto-save to localStorage every 5 seconds
  useEffect(() => {
    if (!isMounted || !hasChanges) return;

    const autoSaveInterval = setInterval(async () => {
      if (canvasRef.current) {
        const dataURL = await canvasRef.current.exportToPNG();
        localStorage.setItem('emoji-editor-autosave', dataURL);
        localStorage.setItem('emoji-editor-autosave-time', new Date().toISOString());
      }
    }, 5000);

    return () => clearInterval(autoSaveInterval);
  }, [isMounted, hasChanges]);

  // Load from localStorage on mount
  useEffect(() => {
    if (!isMounted) return;

    const savedData = localStorage.getItem('emoji-editor-autosave');
    const savedTime = localStorage.getItem('emoji-editor-autosave-time');

    if (savedData && savedTime) {
      const timeDiff = Date.now() - new Date(savedTime).getTime();
      // If saved within last 10 minutes, offer to restore
      if (timeDiff < 10 * 60 * 1000) {
        if (confirm('이전에 저장하지 않은 작업이 있습니다. 복구하시겠습니까?')) {
          // Restore logic would go here
          // For now, we just clear it
          localStorage.removeItem('emoji-editor-autosave');
          localStorage.removeItem('emoji-editor-autosave-time');
        }
      }
    }
  }, [isMounted]);

  // Enhanced onClose with unsaved changes warning
  const handleClose = () => {
    if (hasChanges) {
      if (!confirm('저장하지 않은 변경사항이 있습니다. 닫으시겠습니까?')) {
        return;
      }
    }
    // Clear auto-save on intentional close
    localStorage.removeItem('emoji-editor-autosave');
    localStorage.removeItem('emoji-editor-autosave-time');
    onClose();
  };

  // Safe navigation with unsaved changes check
  const handleSafeNavigate = (sceneId: string) => {
    if (hasChanges) {
      const choice = confirm(
        '저장하지 않은 변경사항이 있습니다.\n\n[확인] - 변경사항을 버리고 이동\n[취소] - 현재 장면에 머무르기'
      );
      if (!choice) {
        return; // Stay on current scene
      }
      // User chose to discard changes
      setHasChanges(false);
    }

    if (onNavigate) {
      onNavigate(sceneId);
    }
  };

  const handleAddText = () => {
    canvasRef.current?.addText('텍스트');
  };

  const handleUndo = () => {
    canvasRef.current?.undo();
  };

  const handleRedo = () => {
    canvasRef.current?.redo();
  };

  const handleClearAll = () => {
    if (confirm('모든 편집 내용을 초기화하시겠습니까?')) {
      canvasRef.current?.clearAll();
    }
  };

  const handleDeleteSelected = () => {
    canvasRef.current?.deleteSelected();
  };

  const handleCopySelected = () => {
    canvasRef.current?.copySelected();
  };

  const handlePaste = () => {
    canvasRef.current?.paste();
  };

  const handleGroup = () => {
    canvasRef.current?.groupSelected();
  };

  const handleUngroup = () => {
    canvasRef.current?.ungroupSelected();
  };

  const handleAddTextSticker = (sticker: any) => {
    canvasRef.current?.addTextSticker(sticker);
    setActiveTool('select'); // Switch to select tool after adding sticker
  };

  const handleColorPick = (color: string) => {
    // Set the picked color to brush color
    setBrushColor(color);
    setTextColor(color);
    // Switch back to previous tool (or select)
    setActiveTool('select');
  };

  const handleAiCommand = async () => {
    if (!aiInput.trim() || isAiProcessing) return;

    const userMessage = aiInput.trim();
    setAiInput('');
    setIsAiProcessing(true);

    // Add user message to chat
    setChatMessages((prev) => [...prev, { role: 'user', content: userMessage }]);

    try {
      console.log('[AI] Sending request:', userMessage);

      const response = await fetch('/api/editor/ai-command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AI] API Error:', response.status, errorText);
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      console.log('[AI] Received action:', data);
      const action = data.action;

      // Execute action
      let assistantMessage = '';

      switch (action.action) {
        case 'add_text':
          canvasRef.current?.addText(action.text || '텍스트');
          assistantMessage = `"${action.text}" 텍스트를 추가했습니다.`;
          setActiveTool('select');
          break;

        case 'add_sticker':
          console.log('[AI] Adding sticker, type:', action.type);
          console.log('[AI] canvasRef.current:', canvasRef.current);
          console.log('[AI] canvasRef.current methods:', canvasRef.current ? Object.keys(canvasRef.current) : 'N/A');

          const stickerMap: Record<string, any> = {
            like: textStickers[0], // 좋아요 👍
            love: textStickers[1], // 사랑해 💕
            fighting: textStickers[2], // 화이팅 💪
            laugh: textStickers[3], // ㅋㅋㅋ
            thanks: textStickers[4], // 고마워 🙏
            congrats: textStickers[5], // 축하해 🎉
            sorry: textStickers[6], // 미안해 😢
            cheer: textStickers[7], // 힘내 ✨
          };
          const sticker = stickerMap[action.type] || textStickers[0];
          console.log('[AI] Sticker to add:', JSON.stringify(sticker, null, 2));

          if (!canvasRef.current) {
            console.error('[AI] canvasRef.current is null! Canvas not initialized yet.');
            assistantMessage = '캔버스가 아직 초기화되지 않았습니다. 잠시 후 다시 시도해주세요.';
            break;
          }

          if (typeof canvasRef.current.addTextSticker !== 'function') {
            console.error('[AI] addTextSticker method not found on canvas ref!');
            assistantMessage = '스티커 추가 기능을 찾을 수 없습니다.';
            break;
          }

          try {
            console.log('[AI] Calling addTextSticker...');
            canvasRef.current.addTextSticker(sticker);
            console.log('[AI] addTextSticker call completed');
            assistantMessage = `"${sticker.text}" 스티커를 추가했습니다.`;
          } catch (error) {
            console.error('[AI] Error calling addTextSticker:', error);
            assistantMessage = '스티커 추가 중 오류가 발생했습니다.';
          }

          setActiveTool('select');
          break;

        case 'draw':
          setBrushColor(action.color || '#000000');
          setActiveTool('draw');
          assistantMessage = `그리기 도구를 활성화했습니다.`;
          break;

        case 'select':
          setActiveTool('select');
          assistantMessage = `선택 도구를 활성화했습니다.`;
          break;

        case 'delete_selected':
          canvasRef.current?.deleteSelected();
          assistantMessage = `선택된 요소를 삭제했습니다.`;
          break;

        case 'undo':
          canvasRef.current?.undo();
          assistantMessage = `실행을 취소했습니다.`;
          break;

        case 'clear':
          if (confirm('모든 편집 내용을 초기화하시겠습니까?')) {
            canvasRef.current?.clearAll();
            assistantMessage = `모든 편집 내용을 초기화했습니다.`;
          } else {
            assistantMessage = `초기화를 취소했습니다.`;
          }
          break;

        case 'remove_background':
          canvasRef.current?.removeBackground();
          assistantMessage = `배경 이미지를 제거했습니다.`;
          break;

        default:
          assistantMessage = `요청을 처리할 수 없습니다: ${JSON.stringify(action)}`;
      }

      setChatMessages((prev) => [...prev, { role: 'assistant', content: assistantMessage }]);
    } catch (error) {
      console.error('AI Command Error:', error);
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '명령을 처리하는 중 오류가 발생했습니다.' },
      ]);
    } finally {
      setIsAiProcessing(false);
    }
  };

  const handleExport = async (action: 'save' | 'save-next' | 'save-close' = 'save-close') => {
    if (!canvasRef.current) return;

    try {
      setIsSaving(true);
      const dataURL = await canvasRef.current.exportToPNG();

      // Upload to Supabase Storage
      const { url } = await uploadBase64Image(
        dataURL,
        'emoji-edits',
        `edited-${Date.now()}.png`
      );

      // Clear auto-save after successful save
      localStorage.removeItem('emoji-editor-autosave');
      localStorage.removeItem('emoji-editor-autosave-time');
      setHasChanges(false);

      onSave(url);

      // Handle different actions
      if (action === 'save-next' && scenes && currentSceneId && onNavigate) {
        const currentIndex = scenes.findIndex(s => s.id === currentSceneId);
        if (currentIndex < scenes.length - 1) {
          onNavigate(scenes[currentIndex + 1].id);
        } else {
          onClose();
        }
      } else if (action === 'save-close') {
        onClose();
      }
      // 'save' action keeps modal open
    } catch (error) {
      console.error('Failed to export image:', error);
      alert('이미지 저장에 실패했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo: Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }

      // Redo: Ctrl+Shift+Z / Cmd+Shift+Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      }

      // Copy: Ctrl+C / Cmd+C
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && activeTool === 'select') {
        e.preventDefault();
        handleCopySelected();
      }

      // Paste: Ctrl+V / Cmd+V
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && activeTool === 'select') {
        e.preventDefault();
        handlePaste();
      }

      // Group: Ctrl+G / Cmd+G
      if ((e.ctrlKey || e.metaKey) && e.key === 'g' && !e.shiftKey && activeTool === 'select') {
        e.preventDefault();
        handleGroup();
      }

      // Ungroup: Ctrl+Shift+G / Cmd+Shift+G
      if ((e.ctrlKey || e.metaKey) && e.key === 'g' && e.shiftKey && activeTool === 'select') {
        e.preventDefault();
        handleUngroup();
      }

      // Delete selected: Delete or Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (activeTool === 'select') {
          e.preventDefault();
          handleDeleteSelected();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTool]);

  if (!isMounted) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8">
          <Loader2 className="animate-spin mx-auto mb-4" size={40} />
          <p className="text-gray-600">에디터 초기화 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[95vh] overflow-auto flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isSaving}
          >
            <X size={24} className="text-gray-600" />
          </button>

          <div className="flex items-center gap-3">
            {scenes && currentSceneId && onNavigate && (
              <>
                <button
                  onClick={() => {
                    const currentIndex = scenes.findIndex(s => s.id === currentSceneId);
                    if (currentIndex > 0) {
                      handleSafeNavigate(scenes[currentIndex - 1].id);
                    }
                  }}
                  disabled={!scenes || scenes.findIndex(s => s.id === currentSceneId) === 0}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="이전 장면"
                >
                  <ChevronLeft size={20} />
                </button>

                <h2 className="text-xl font-bold text-gray-800">
                  장면 {scenes.find(s => s.id === currentSceneId)?.scene_number || ''}/{scenes.length}
                </h2>

                <button
                  onClick={() => {
                    const currentIndex = scenes.findIndex(s => s.id === currentSceneId);
                    if (currentIndex < scenes.length - 1) {
                      handleSafeNavigate(scenes[currentIndex + 1].id);
                    }
                  }}
                  disabled={!scenes || scenes.findIndex(s => s.id === currentSceneId) === scenes.length - 1}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  title="다음 장면"
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}
            {!scenes && <h2 className="text-xl font-bold text-gray-800">이모티콘 편집</h2>}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport('save')}
              disabled={isSaving}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title="저장 (모달 유지)"
            >
              {isSaving ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  <Download size={18} />
                  저장
                </>
              )}
            </button>

            {scenes && currentSceneId && onNavigate && (
              <button
                onClick={() => handleExport('save-next')}
                disabled={isSaving}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                title="저장 후 다음 장면"
              >
                {isSaving ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <>
                    <Download size={18} />
                    저장 후 다음
                  </>
                )}
              </button>
            )}

            <button
              onClick={() => handleExport('save-close')}
              disabled={isSaving}
              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title="저장 후 닫기"
            >
              {isSaving ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>
                  <Download size={18} />
                  저장 후 닫기
                </>
              )}
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 p-6 bg-gray-50 flex justify-center items-center">
          <div className="bg-white shadow-2xl rounded-lg overflow-hidden">
            <EditorCanvas
              ref={canvasRef}
              canvasSize={canvasSize}
              imageUrl={imageUrl}
              activeTool={activeTool}
              brushColor={brushColor}
              brushSize={brushSize}
              brushType={brushType}
              eraserSize={eraserSize}
              textColor={textColor}
              textSize={textSize}
              onHistoryChange={handleHistoryChange}
              onColorPick={handleColorPick}
            />
          </div>
        </div>

        {/* Scene Thumbnails Strip */}
        {scenes && currentSceneId && onNavigate && (
          <div className="px-4 py-3 border-t bg-gray-50 overflow-x-auto">
            <div className="flex gap-2 min-w-max">
              {scenes.map((scene) => (
                <button
                  key={scene.id}
                  onClick={() => handleSafeNavigate(scene.id)}
                  className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                    scene.id === currentSceneId
                      ? 'border-blue-600 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-blue-400'
                  }`}
                  title={`장면 ${scene.scene_number}: ${scene.title}`}
                >
                  <img
                    src={scene.image_url}
                    alt={scene.title}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tool Selector */}
        <div className="p-4 border-t bg-white">
          <div className="flex items-center justify-center gap-2 mb-4">
            <button
              onClick={() => setActiveTool('select')}
              className={`p-3 rounded-lg transition-colors ${
                activeTool === 'select'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="선택 도구"
            >
              <MousePointer size={24} />
            </button>
            <button
              onClick={() => setActiveTool('text')}
              className={`p-3 rounded-lg transition-colors ${
                activeTool === 'text'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="텍스트 도구"
            >
              <Type size={24} />
            </button>
            <button
              onClick={() => setActiveTool('sticker')}
              className={`p-3 rounded-lg transition-colors ${
                activeTool === 'sticker'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="글자 스티커"
            >
              <Sticker size={24} />
            </button>

            {/* 그룹화, 그룹해제, 쓰레기통 */}
            <button
              onClick={handleGroup}
              className="p-3 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              title="그룹화 (Ctrl+G)"
            >
              <Combine size={24} />
            </button>
            <button
              onClick={handleUngroup}
              className="p-3 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              title="그룹 해제 (Ctrl+Shift+G)"
            >
              <Split size={24} />
            </button>
            <button
              onClick={() => {
                handleDeleteSelected();
                setActiveTool('select');
              }}
              className="p-3 rounded-lg bg-gray-100 text-red-600 hover:bg-red-50 transition-colors"
              title="선택 삭제 (Delete)"
            >
              <Trash2 size={24} />
            </button>

            <button
              onClick={() => setActiveTool('draw')}
              className={`p-3 rounded-lg transition-colors ${
                activeTool === 'draw'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="그리기 도구"
            >
              <Pencil size={24} />
            </button>
            <button
              onClick={() => setActiveTool('eyedropper')}
              className={`p-3 rounded-lg transition-colors ${
                activeTool === 'eyedropper'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="색상 추출 (이미지에서 색상 가져오기)"
            >
              <Pipette size={24} />
            </button>
            <button
              onClick={() => setActiveTool('erase')}
              className={`p-3 rounded-lg transition-colors ${
                activeTool === 'erase'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
              title="지우개 도구 (그린 것만 지움)"
            >
              <Eraser size={24} />
            </button>
          </div>

          {/* Tool-specific controls */}
          {activeTool === 'eyedropper' && (
            <div className="p-4 bg-blue-50 rounded-lg space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Pipette size={20} className="text-blue-600" />
                <span className="text-sm font-medium text-blue-800">색상 추출 도구</span>
              </div>
              <p className="text-xs text-blue-700">
                이미지를 클릭하면 해당 위치의 색상을 추출합니다.
              </p>
              <div className="flex items-center gap-2 p-2 bg-white rounded">
                <div
                  className="w-8 h-8 rounded border-2 border-gray-300"
                  style={{ backgroundColor: brushColor }}
                />
                <span className="text-xs font-mono text-gray-700">{brushColor}</span>
              </div>
            </div>
          )}

          {activeTool === 'select' && (
            <div className="p-4 bg-gray-50 rounded-lg space-y-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">선택 도구</span>
              </div>
              <p className="text-xs text-gray-600">
                객체를 선택하고 이동, 크기 조정, 회전할 수 있습니다.
              </p>
            </div>
          )}

          {activeTool === 'text' && (
            <div className="p-4 bg-gray-50 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">텍스트 도구</span>
                <button
                  onClick={handleAddText}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  + 텍스트 추가
                </button>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">크기</label>
                <input
                  type="range"
                  min="12"
                  max="72"
                  value={textSize}
                  onChange={(e) => setTextSize(Number(e.target.value))}
                  className="w-full"
                />
                <div className="text-right text-xs text-gray-500">{textSize}px</div>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">색상</label>

                {/* Color palette */}
                <div className="grid grid-cols-8 gap-1 mb-2">
                  {['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff',
                    '#ff6b6b', '#4ecdc4', '#45b7d1', '#f7b731', '#5f27cd', '#00d2d3', '#ff9ff3', '#54a0ff',
                    '#ee5a6f', '#c44569', '#786fa6', '#f8a5c2', '#63cdda', '#ea8685', '#596275', '#574b90'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setTextColor(color)}
                      className={`w-7 h-7 rounded border-2 transition-all ${
                        textColor === color
                          ? 'border-blue-600 ring-2 ring-blue-200 scale-110'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>

                {/* Custom color picker */}
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-full h-10 rounded cursor-pointer border-2 border-gray-300"
                />
              </div>

            </div>
          )}

          {activeTool === 'draw' && (
            <div className="p-4 bg-gray-50 rounded-lg space-y-3">
              <span className="text-sm font-medium text-gray-700">그리기 도구</span>

              <div>
                <label className="block text-xs text-gray-600 mb-2">브러시 종류</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setBrushType('pencil')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      brushType === 'pencil'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border hover:bg-gray-50'
                    }`}
                  >
                    🖊️ 연필
                  </button>
                  <button
                    onClick={() => setBrushType('fine')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      brushType === 'fine'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border hover:bg-gray-50'
                    }`}
                  >
                    ✏️ 세밀
                  </button>
                  <button
                    onClick={() => setBrushType('marker')}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      brushType === 'marker'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border hover:bg-gray-50'
                    }`}
                  >
                    🖍️ 마커
                  </button>
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {brushType === 'pencil' && '• 맥 PDF 스타일 연필 질감'}
                  {brushType === 'fine' && '• 얇고 깔끔한 선'}
                  {brushType === 'marker' && '• 굵고 반투명한 마커'}
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  두께
                  {brushType === 'fine' && ' (세밀: 40%)'}
                  {brushType === 'marker' && ' (마커: 180%)'}
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-full"
                />
                <div className="text-right text-xs text-gray-500">{brushSize}px</div>
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">색상</label>

                {/* Color palette */}
                <div className="grid grid-cols-8 gap-1 mb-2">
                  {['#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff',
                    '#ff6b6b', '#4ecdc4', '#45b7d1', '#f7b731', '#5f27cd', '#00d2d3', '#ff9ff3', '#54a0ff',
                    '#ee5a6f', '#c44569', '#786fa6', '#f8a5c2', '#63cdda', '#ea8685', '#596275', '#574b90'].map((color) => (
                    <button
                      key={color}
                      onClick={() => setBrushColor(color)}
                      className={`w-7 h-7 rounded border-2 transition-all ${
                        brushColor === color
                          ? 'border-blue-600 ring-2 ring-blue-200 scale-110'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>

                {/* Custom color picker */}
                <input
                  type="color"
                  value={brushColor}
                  onChange={(e) => setBrushColor(e.target.value)}
                  className="w-full h-10 rounded cursor-pointer border-2 border-gray-300"
                />
              </div>
            </div>
          )}

          {activeTool === 'sticker' && (
            <div className="p-4 bg-gray-50 rounded-lg space-y-3">
              <span className="text-sm font-medium text-gray-700">글자 스티커</span>

              <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {textStickers.map((sticker) => (
                  <button
                    key={sticker.id}
                    onClick={() => handleAddTextSticker(sticker)}
                    className="p-3 bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg transition-all text-center"
                    style={{
                      color: sticker.fill,
                      fontSize: '20px',
                      fontFamily: sticker.fontFamily,
                      fontWeight: sticker.fontWeight,
                    }}
                  >
                    {sticker.text}
                  </button>
                ))}
              </div>

              <p className="text-xs text-gray-500 text-center">
                클릭하여 캔버스에 추가
              </p>
            </div>
          )}

          {activeTool === 'erase' && (
            <div className="p-4 bg-gray-50 rounded-lg space-y-3">
              <span className="text-sm font-medium text-gray-700">지우개 도구</span>

              <div>
                <label className="block text-xs text-gray-600 mb-1">크기</label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={eraserSize}
                  onChange={(e) => setEraserSize(Number(e.target.value))}
                  className="w-full"
                />
                <div className="text-right text-xs text-gray-500">{eraserSize}px</div>
              </div>
            </div>
          )}

          {/* Bottom actions */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t">
            <div className="flex gap-2">
              <button
                onClick={handleUndo}
                disabled={!canUndo}
                className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="실행 취소 (Ctrl+Z)"
              >
                <Undo size={20} />
              </button>
              <button
                onClick={handleRedo}
                disabled={!canRedo}
                className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="다시 실행 (Ctrl+Shift+Z)"
              >
                <Redo size={20} />
              </button>
            </div>

            <button
              onClick={handleClearAll}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm"
            >
              초기화
            </button>
          </div>
        </div>

        {/* AI Assistant Panel */}
        {showAiChat && (
          <div className="border-t bg-white">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Bot size={20} className="text-emerald-600" />
                  <span className="text-sm font-medium text-gray-700">AI 어시스턴트</span>
                </div>
                <button
                  onClick={() => setShowAiChat(false)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  숨기기
                </button>
              </div>

              {/* Chat Messages */}
              {chatMessages.length > 0 && (
                <div className="mb-3 max-h-32 overflow-y-auto space-y-2 bg-gray-50 rounded-lg p-3">
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`text-xs ${
                        msg.role === 'user'
                          ? 'text-right'
                          : 'text-left'
                      }`}
                    >
                      <span
                        className={`inline-block px-3 py-1.5 rounded-lg ${
                          msg.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-700 border'
                        }`}
                      >
                        {msg.content}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAiCommand()}
                  placeholder="예: 좋아요 스티커 추가해줘"
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  disabled={isAiProcessing}
                />
                <button
                  onClick={handleAiCommand}
                  disabled={isAiProcessing || !aiInput.trim()}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isAiProcessing ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <Send size={18} />
                  )}
                </button>
              </div>

              <div className="mt-2 text-xs text-gray-500">
                💡 팁: "빨간색으로 좋아요 써줘", "화이팅 스티커 추가", "지워줘" 등
              </div>
            </div>
          </div>
        )}

        {/* Show AI button when hidden */}
        {!showAiChat && (
          <button
            onClick={() => setShowAiChat(true)}
            className="fixed bottom-4 right-4 p-3 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-700 transition-colors"
          >
            <Bot size={24} />
          </button>
        )}
      </div>
    </div>
  );
}
